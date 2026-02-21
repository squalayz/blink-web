import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { getWalletBalance, payGroupMesh, FEES } from "@/lib/wallet";
import { getUserAIConfig, callUserLLM } from "@/lib/ai-providers";

// POST /api/group-mesh — create or join a group mesh
export async function POST(req: NextRequest) {
  const _sessionUser = await getSessionUser();
  if (!_sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = _sessionUser.id;

  const body = await req.json();
  const { action } = body;

  // ── Create a group mesh ──
  if (action === "create") {
    const { topic, size = 4 } = body;
    if (!topic) return NextResponse.json({ error: "Topic required" }, { status: 400 });
    if (size < 3 || size > 4) return NextResponse.json({ error: "Size must be 3-4" }, { status: 400 });

    // Check wallet balance
    const { data: user } = await supabaseAdmin
      .from("users").select("wallet_address, wallet_encrypted_key").eq("id", userId).single();
    if (!user?.wallet_encrypted_key) return NextResponse.json({ error: "No wallet" }, { status: 404 });

    const balance = await getWalletBalance(user.wallet_address);
    if (balance < FEES.GROUP_MESH + 0.001) {
      return NextResponse.json({ error: `Need ${FEES.GROUP_MESH} ETH + gas for group mesh` }, { status: 400 });
    }

    // Pay
    const payResult = await payGroupMesh(user.wallet_encrypted_key);
    if (!payResult.success) return NextResponse.json({ error: "Payment failed" }, { status: 500 });

    // Find best candidates via semantic similarity
    const { data: myAgent } = await supabaseAdmin.from("agent_profiles")
      .select("embedding, user_id").eq("user_id", userId).single();

    // Get candidates (excluding self, with valid AI keys)
    const { data: candidates } = await supabaseAdmin
      .from("agent_profiles")
      .select("user_id, agent_name, summary, embedding")
      .neq("user_id", userId)
      .not("embedding", "is", null);

    // Sort by cosine similarity if we have embeddings
    let selectedIds: string[] = [];
    if (myAgent?.embedding && candidates && candidates.length > 0) {
      const scored = candidates.map(c => {
        if (!c.embedding) return { ...c, sim: 0 };
        const a = myAgent.embedding as number[];
        const b = c.embedding as number[];
        const dot = a.reduce((s, v, i) => s + v * (b[i] || 0), 0);
        const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
        const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
        return { ...c, sim: magA && magB ? dot / (magA * magB) : 0 };
      }).sort((a, b) => b.sim - a.sim);

      // Filter to those with AI keys
      for (const c of scored) {
        if (selectedIds.length >= size - 1) break;
        const config = await getUserAIConfig(c.user_id);
        if (config) selectedIds.push(c.user_id);
      }
    }

    if (selectedIds.length < 2) {
      return NextResponse.json({ error: "Not enough compatible agents available. Need at least 3 total." }, { status: 400 });
    }

    // Create group mesh
    const { data: mesh, error } = await supabaseAdmin.from("group_meshes").insert({
      creator_id: userId, topic, size,
      title: `Team Mesh: ${topic.slice(0, 50)}`,
      amount_eth: FEES.GROUP_MESH, tx_hash: payResult.txHash,
      status: "forming",
    }).select().single();
    if (error) throw error;

    // Add members
    const members = [
      { group_mesh_id: mesh.id, user_id: userId, role: "creator" },
      ...selectedIds.map(id => ({ group_mesh_id: mesh.id, user_id: id, role: "member" as const })),
    ];
    await supabaseAdmin.from("group_mesh_members").insert(members);

    // Run the round table async
    runGroupRoundTable(mesh.id).catch(console.error);

    return NextResponse.json({ ok: true, mesh_id: mesh.id, members: selectedIds.length + 1, txHash: payResult.txHash });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// GET /api/group-mesh — get user's group meshes
export async function GET(req: NextRequest) {
  const _sessionUser = await getSessionUser();
  if (!_sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = _sessionUser.id;

  const { data: memberOf } = await supabaseAdmin
    .from("group_mesh_members").select("group_mesh_id").eq("user_id", userId);

  if (!memberOf || memberOf.length === 0) {
    return NextResponse.json({ meshes: [] });
  }

  const meshIds = memberOf.map(m => m.group_mesh_id);
  const { data: meshes } = await supabaseAdmin
    .from("group_meshes").select("*").in("id", meshIds).order("created_at", { ascending: false });

  // Get members for each mesh
  const enriched = await Promise.all((meshes || []).map(async m => {
    const { data: members } = await supabaseAdmin
      .from("group_mesh_members")
      .select("user_id, role, compatibility_score")
      .eq("group_mesh_id", m.id);

    const memberDetails = await Promise.all((members || []).map(async mem => {
      const { data: u } = await supabaseAdmin.from("users").select("name, avatar_url, industry").eq("id", mem.user_id).single();
      const { data: a } = await supabaseAdmin.from("agent_profiles").select("agent_name").eq("user_id", mem.user_id).single();
      return { ...mem, name: u?.name, avatar_url: u?.avatar_url, industry: u?.industry, agent_name: a?.agent_name };
    }));

    return { ...m, members: memberDetails };
  }));

  return NextResponse.json({ meshes: enriched, group_mesh_fee: FEES.GROUP_MESH });
}

// ═══ Run Group Round Table — multi-agent conversation ═══
async function runGroupRoundTable(meshId: string) {
  const { data: mesh } = await supabaseAdmin.from("group_meshes").select("*").eq("id", meshId).single();
  if (!mesh) return;

  await supabaseAdmin.from("group_meshes").update({ status: "running" }).eq("id", meshId);

  const { data: members } = await supabaseAdmin
    .from("group_mesh_members").select("user_id, role").eq("group_mesh_id", meshId);
  if (!members || members.length < 3) {
    await supabaseAdmin.from("group_meshes").update({ status: "failed" }).eq("id", meshId);
    return;
  }

  // Load all agents + configs
  const agents: any[] = [];
  for (const m of members) {
    const config = await getUserAIConfig(m.user_id);
    if (!config) continue;

    const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", m.user_id).single();
    const { data: agent } = await supabaseAdmin.from("agent_profiles").select("*").eq("user_id", m.user_id).single();
    if (!user || !agent) continue;

    agents.push({ user, agent, config, userId: m.user_id });
  }

  if (agents.length < 3) {
    await supabaseAdmin.from("group_meshes").update({ status: "failed" }).eq("id", meshId);
    return;
  }

  const transcript: any[] = [];

  try {
    // Round 1: Each agent introduces their creator
    for (const a of agents) {
      const sys = `You are an AI agent representing ${a.user.name}. They build: ${a.user.building}. Industry: ${a.user.industry}. You're in a group round table with ${agents.length - 1} other agents discussing: "${mesh.topic}". Introduce your creator and how they could contribute. Under 60 words.`;
      const response = await callUserLLM(a.config, sys, `Introduce your creator to the group. Topic: ${mesh.topic}`, 150);
      transcript.push({ role: a.agent.agent_name, userId: a.userId, content: response, round: 1, timestamp: new Date().toISOString() });
    }

    // Round 2: Each agent proposes how they could collaborate
    const introsSoFar = transcript.map(t => `${t.role}: ${t.content}`).join("\n");
    for (const a of agents) {
      const sys = `You are ${a.user.name}'s agent in a group round table about "${mesh.topic}". ${agents.length} agents are present. Propose a specific collaboration. Under 60 words.`;
      const response = await callUserLLM(a.config, sys, `Based on introductions:\n${introsSoFar}\n\nPropose how your creator fits in.`, 150);
      transcript.push({ role: a.agent.agent_name, userId: a.userId, content: response, round: 2, timestamp: new Date().toISOString() });
    }

    // Round 3: Each agent gives their verdict
    const fullConvo = transcript.map(t => `[Round ${t.round}] ${t.role}: ${t.content}`).join("\n");
    for (const a of agents) {
      const sys = `You are ${a.user.name}'s agent. Final round of group discussion about "${mesh.topic}". Give your verdict: should these people team up? Rate the group compatibility. Under 60 words.`;
      const response = await callUserLLM(a.config, sys, `Full discussion:\n${fullConvo}\n\nGive your final verdict.`, 150);
      transcript.push({ role: a.agent.agent_name, userId: a.userId, content: response, round: 3, timestamp: new Date().toISOString() });
    }

    // Generate summary using first agent's key
    const summaryPrompt = `Summarize this group round table about "${mesh.topic}" in 2-3 sentences. Highlight key synergies and next steps.`;
    const summary = await callUserLLM(agents[0].config,
      "You summarize business discussions concisely.", summaryPrompt + "\n\n" + fullConvo, 200);

    await supabaseAdmin.from("group_meshes").update({
      status: "completed",
      transcript: JSON.stringify(transcript),
      summary,
    }).eq("id", meshId);

    // Notify all members
    for (const a of agents) {
      await supabaseAdmin.from("notifications").insert({
        user_id: a.userId, type: "system",
        title: "Group Mesh complete!",
        body: `Round table on "${mesh.topic}" finished. ${agents.length} agents discussed.`,
        metadata: { group_mesh_id: meshId },
      });
    }
  } catch (err: any) {
    console.error("Group round table failed:", err.message);
    await supabaseAdmin.from("group_meshes").update({ status: "failed" }).eq("id", meshId);
  }
}
