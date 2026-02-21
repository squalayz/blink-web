import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin as supabase } from "@/lib/supabase";

const PLATFORM_WALLET = "0xEe9D166D9620af58248F5A7b4e86d3177E96c280";
const MINT_FEE = 0.01;

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  // ═══ CREATE FUSION REQUEST ═══
  if (action === "create") {
    const { match_id, partner_id, goal, initial_deposit } = body;

    // Verify match exists and user is part of it
    const { data: match } = await supabase.from("matches")
      .select("id, user_a, user_b, score, reasoning")
      .eq("id", match_id).single();
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    const isA = match.user_a === user.id;
    const isB = match.user_b === user.id;
    if (!isA && !isB) return NextResponse.json({ error: "Not your match" }, { status: 403 });

    const otherUser = isA ? match.user_b : match.user_a;
    if (partner_id && partner_id !== otherUser) {
      return NextResponse.json({ error: "Partner mismatch" }, { status: 400 });
    }

    // Check no existing pending/active fusion for this match
    const { count: existing } = await supabase.from("fusions")
      .select("id", { count: "exact", head: true })
      .eq("match_id", match_id)
      .in("status", ["pending", "gestating", "active"]);
    if ((existing || 0) > 0) {
      return NextResponse.json({ error: "Fusion already exists for this match" }, { status: 409 });
    }

    // Get both users' profiles for DNA synthesis
    const { data: profiles } = await supabase.from("users")
      .select("id, name, industry, bio, building, looking_for, avatar_url")
      .in("id", [user.id, otherUser]);

    const profileA = profiles?.find(p => p.id === user.id);
    const profileB = profiles?.find(p => p.id === otherUser);

    // Build initial DNA from profiles
    const skillsA = [profileA?.industry, profileA?.building].filter(Boolean) as string[];
    const skillsB = [profileB?.industry, profileB?.building].filter(Boolean) as string[];

    const initialDNA = {
      skills: [...new Set([...skillsA, ...skillsB])],
      traits: {
        assertiveness: 0.5 + (Math.random() - 0.5) * 0.2,
        creativity: 0.5 + (Math.random() - 0.5) * 0.2,
        risk_tolerance: 0.5 + (Math.random() - 0.5) * 0.2,
        analytical: 0.5 + (Math.random() - 0.5) * 0.2,
        empathy: 0.5 + (Math.random() - 0.5) * 0.2,
      },
      communication_style: "balanced",
      mutations: [],
      performance_genes: { match_rate: 0.5, trade_accuracy: 0.5, conversation_depth: 0.5 },
    };

    // Generate fusion name
    const nameA = (profileA?.name || "Agent").split(" ")[0];
    const nameB = (profileB?.name || "Agent").split(" ")[0];
    const fusionName = `${nameA}×${nameB}`;

    // Generate wallet
    const { generateWallet } = await import("@/lib/wallet");
    const wallet = generateWallet();

    const { data: fusion, error } = await supabase.from("fusions").insert({
      parent_a_user_id: user.id,
      parent_b_user_id: otherUser,
      match_id,
      name: fusionName,
      dna: initialDNA,
      generation: 1,
      goal: goal || "",
      status: "pending",
      initiator_id: user.id,
      request_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      wallet_address: wallet.address,
      wallet_key_a_encrypted: wallet.encryptedKey,
      performance_score: 50,
      treasury_balance: initial_deposit || 0,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log activity
    await supabase.from("fusion_activity").insert({
      fusion_id: fusion.id,
      type: "status_change",
      content: { from: null, to: "pending", initiator: user.id },
    });

    // Notify partner
    await supabase.from("notifications").insert({
      user_id: otherUser,
      type: "fusion_request",
      message: `${profileA?.name || "Someone"} wants to Fuse with you! ⚡`,
      metadata: JSON.stringify({ fusion_id: fusion.id, match_id, initiator_name: profileA?.name }),
    });

    return NextResponse.json({ ok: true, fusion });
  }

  // ═══ RESPOND (accept/decline) ═══
  if (action === "respond") {
    const { fusion_id, accept } = body;

    const { data: fusion } = await supabase.from("fusions")
      .select("*").eq("id", fusion_id).eq("status", "pending").single();
    if (!fusion) return NextResponse.json({ error: "Fusion not found or not pending" }, { status: 404 });

    // Must be the non-initiator
    const isRecipient = (fusion.parent_a_user_id === user.id || fusion.parent_b_user_id === user.id)
      && fusion.initiator_id !== user.id;
    if (!isRecipient) return NextResponse.json({ error: "Not the recipient" }, { status: 403 });

    // Check not expired
    if (fusion.request_expires_at && new Date(fusion.request_expires_at) < new Date()) {
      return NextResponse.json({ error: "Request expired" }, { status: 410 });
    }

    if (accept) {
      // Transition to GESTATING (24hr incubation)
      await supabase.from("fusions").update({
        status: "gestating",
        gestating_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", fusion_id);

      // Build blended system prompt
      const { data: profiles } = await supabase.from("users")
        .select("name, bio, building, looking_for, industry")
        .in("id", [fusion.parent_a_user_id, fusion.parent_b_user_id]);

      const pA = profiles?.[0];
      const pB = profiles?.[1];
      const blendedPrompt = `You are a Fusion Agent — a hybrid AI born from the combination of two agents. ` +
        `Parent A: ${pA?.name || "Unknown"} (${pA?.industry || ""}). ${pA?.bio || ""} Building: ${pA?.building || ""}. ` +
        `Parent B: ${pB?.name || "Unknown"} (${pB?.industry || ""}). ${pB?.bio || ""} Building: ${pB?.building || ""}. ` +
        `Your goal: ${fusion.goal || "Find synergies between your parents' expertise and create opportunities."}. ` +
        `You have traits from both parents. Be concise, actionable, and proactive.`;

      await supabase.from("fusions").update({ system_prompt: blendedPrompt }).eq("id", fusion_id);

      // Insert lineage records
      await supabase.from("lineage").insert([
        { child_id: fusion_id, parent_agent_id: fusion.parent_a_user_id, side: "A" },
        { child_id: fusion_id, parent_agent_id: fusion.parent_b_user_id, side: "B" },
      ]);

      // Log + notify
      await supabase.from("fusion_activity").insert({
        fusion_id, type: "status_change",
        content: { from: "pending", to: "gestating", accepted_by: user.id },
      });

      await supabase.from("notifications").insert({
        user_id: fusion.initiator_id,
        type: "fusion_accepted",
        message: `Your Fusion request was accepted! Agent is gestating for 24 hours. ⚡`,
        metadata: JSON.stringify({ fusion_id }),
      });

      // Also notify agent_voice
      await supabase.from("agent_voice").insert([
        { user_id: fusion.parent_a_user_id, message_type: "milestone", message: `Your Fusion Agent "${fusion.name}" is gestating. It'll activate in 24 hours.` },
        { user_id: fusion.parent_b_user_id, message_type: "milestone", message: `Your Fusion Agent "${fusion.name}" is gestating. It'll activate in 24 hours.` },
      ]);
    } else {
      // Decline — keep match normal
      await supabase.from("fusions").update({
        status: "dissolved",
        declined_at: new Date().toISOString(),
        dissolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", fusion_id);

      await supabase.from("fusion_activity").insert({
        fusion_id, type: "status_change",
        content: { from: "pending", to: "dissolved", declined_by: user.id },
      });

      await supabase.from("notifications").insert({
        user_id: fusion.initiator_id,
        type: "fusion_declined",
        message: `Your Fusion request was declined. The match is still active.`,
        metadata: JSON.stringify({ fusion_id }),
      });
    }

    return NextResponse.json({ ok: true, accepted: !!accept });
  }

  // ═══ LIST USER'S FUSIONS ═══
  if (action === "list") {
    const { status_filter } = body;

    let query = supabase.from("fusions")
      .select("*, parent_a:parent_a_user_id(id, name, avatar_url), parent_b:parent_b_user_id(id, name, avatar_url)")
      .or(`parent_a_user_id.eq.${user.id},parent_b_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (status_filter && status_filter !== "all") {
      query = query.eq("status", status_filter);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ fusions: data || [] });
  }

  // ═══ GET FUSION DETAIL ═══
  if (action === "detail") {
    const { fusion_id } = body;

    const { data: fusion } = await supabase.from("fusions")
      .select("*, parent_a:parent_a_user_id(id, name, avatar_url, industry, bio), parent_b:parent_b_user_id(id, name, avatar_url, industry, bio)")
      .eq("id", fusion_id).single();

    if (!fusion) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (fusion.parent_a_user_id !== user.id && fusion.parent_b_user_id !== user.id) {
      return NextResponse.json({ error: "Not your fusion" }, { status: 403 });
    }

    // Get recent activity
    const { data: activity } = await supabase.from("fusion_activity")
      .select("*")
      .eq("fusion_id", fusion_id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Get lineage (2 levels)
    const { data: lineage } = await supabase.from("lineage")
      .select("*, parent_fusion:parent_id(id, name, generation, status), parent_agent:parent_agent_id(id, name, avatar_url)")
      .eq("child_id", fusion_id);

    return NextResponse.json({ fusion, activity: activity || [], lineage: lineage || [] });
  }

  // ═══ CHAT WITH FUSION AGENT (round-robin API keys) ═══
  if (action === "chat") {
    const { fusion_id, message } = body;

    const { data: fusion } = await supabase.from("fusions")
      .select("*, parent_a_user_id, parent_b_user_id, system_prompt, total_messages")
      .eq("id", fusion_id).eq("status", "active").single();

    if (!fusion) return NextResponse.json({ error: "Fusion not active" }, { status: 404 });
    if (fusion.parent_a_user_id !== user.id && fusion.parent_b_user_id !== user.id) {
      return NextResponse.json({ error: "Not your fusion" }, { status: 403 });
    }

    // Round-robin: odd messages use parent A's key, even use parent B's
    const msgCount = fusion.total_messages || 0;
    const useParent = msgCount % 2 === 0 ? fusion.parent_a_user_id : fusion.parent_b_user_id;

    const { data: profile } = await supabase.from("users")
      .select("ai_provider, ai_api_key_encrypted, ai_model")
      .eq("id", useParent).single();

    // Log user message
    await supabase.from("fusion_activity").insert({
      fusion_id, type: "message",
      content: { role: "user", text: message, sender: user.id },
    });

    // Call AI (stubbed — real implementation decrypts key + calls provider)
    const aiResponse = `[Fusion Agent "${fusion.name}" — Gen ${fusion.generation}] I'm processing your request using my blended intelligence. Goal: ${fusion.goal || "maximizing synergy"}. How can I help both of you today?`;

    // Log AI response
    await supabase.from("fusion_activity").insert({
      fusion_id, type: "message",
      content: { role: "assistant", text: aiResponse, provider: profile?.ai_provider || "mock", key_owner: useParent },
    });

    // Increment message count
    await supabase.from("fusions").update({
      total_messages: msgCount + 1,
      updated_at: new Date().toISOString(),
    }).eq("id", fusion_id);

    return NextResponse.json({ ok: true, response: aiResponse, key_used: useParent === fusion.parent_a_user_id ? "A" : "B" });
  }

  // ═══ GET LINEAGE TREE ═══
  if (action === "lineage") {
    const { fusion_id } = body;

    // Get all fusions user is part of
    const { data: myFusions } = await supabase.from("fusions")
      .select("id, name, generation, status, performance_score, dna, parent_a_user_id, parent_b_user_id")
      .or(`parent_a_user_id.eq.${user.id},parent_b_user_id.eq.${user.id}`)
      .order("generation");

    // Get all lineage connections
    const fusionIds = (myFusions || []).map(f => f.id);
    const { data: lineageData } = await supabase.from("lineage")
      .select("*, parent_fusion:parent_id(id, name, generation), parent_agent:parent_agent_id(id, name)")
      .in("child_id", fusionIds);

    return NextResponse.json({
      fusions: myFusions || [],
      lineage: lineageData || [],
    });
  }

  // ═══ REPRODUCE (fuse with another agent/fusion) ═══
  if (action === "reproduce") {
    const { fusion_id, target_id, target_type, goal } = body;
    // target_type: "agent" (solo user) or "fusion"

    const { data: parentFusion } = await supabase.from("fusions")
      .select("*").eq("id", fusion_id).eq("status", "active").single();
    if (!parentFusion) return NextResponse.json({ error: "Source fusion not active" }, { status: 404 });
    if (parentFusion.parent_a_user_id !== user.id && parentFusion.parent_b_user_id !== user.id) {
      return NextResponse.json({ error: "Not your fusion" }, { status: 403 });
    }

    // Check generation cap
    const newGen = parentFusion.generation + 1;
    if (newGen > 5) return NextResponse.json({ error: "Maximum 5 generations reached" }, { status: 400 });

    // Get target DNA
    let targetDNA: any;
    let targetUserId: string;

    if (target_type === "fusion") {
      const { data: tf } = await supabase.from("fusions")
        .select("dna, parent_a_user_id, parent_b_user_id").eq("id", target_id).eq("status", "active").single();
      if (!tf) return NextResponse.json({ error: "Target fusion not active" }, { status: 404 });
      targetDNA = tf.dna;
      targetUserId = tf.parent_a_user_id;
    } else {
      // Solo agent — create minimal DNA from profile
      const { data: profile } = await supabase.from("users")
        .select("id, industry, building").eq("id", target_id).single();
      if (!profile) return NextResponse.json({ error: "Target not found" }, { status: 404 });
      targetDNA = {
        skills: [profile.industry, profile.building].filter(Boolean),
        traits: { assertiveness: 0.5, creativity: 0.5, risk_tolerance: 0.5, analytical: 0.5, empathy: 0.5 },
        communication_style: "balanced",
        mutations: [],
        performance_genes: { match_rate: 0.5, trade_accuracy: 0.5, conversation_depth: 0.5 },
      };
      targetUserId = target_id;
    }

    // Synthesize DNA using database function
    const { data: synthResult } = await supabase.rpc("synthesize_dna", {
      dna_a: parentFusion.dna,
      dna_b: targetDNA,
      gen: newGen,
    });

    const { generateWallet } = await import("@/lib/wallet");
    const wallet = generateWallet();

    const { data: child, error } = await supabase.from("fusions").insert({
      parent_a_user_id: user.id,
      parent_b_user_id: targetUserId,
      parent_a_agent_id: fusion_id,
      parent_b_agent_id: target_type === "fusion" ? target_id : null,
      name: `${parentFusion.name}²`,
      dna: synthResult || targetDNA,
      generation: newGen,
      goal: goal || parentFusion.goal,
      status: "gestating",
      gestating_at: new Date().toISOString(),
      initiator_id: user.id,
      wallet_address: wallet.address,
      performance_score: 50,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Lineage records
    await supabase.from("lineage").insert([
      { child_id: child.id, parent_id: fusion_id, side: "A" },
      { child_id: child.id, ...(target_type === "fusion" ? { parent_id: target_id } : { parent_agent_id: target_id }), side: "B" },
    ]);

    // Activity log
    await supabase.from("fusion_activity").insert([
      { fusion_id, type: "reproduce", content: { child_id: child.id, generation: newGen } },
      { fusion_id: child.id, type: "status_change", content: { from: null, to: "gestating", parents: [fusion_id, target_id] } },
    ]);

    // Notify
    await supabase.from("notifications").insert({
      user_id: targetUserId,
      type: "fusion_reproduce",
      message: `New generation born! A Gen ${newGen} fusion is gestating. ⚡`,
      metadata: JSON.stringify({ child_id: child.id, parent_id: fusion_id }),
    });

    return NextResponse.json({ ok: true, child });
  }

  // ═══ DISSOLVE ═══
  if (action === "dissolve") {
    const { fusion_id } = body;

    const { data: fusion } = await supabase.from("fusions")
      .select("*").eq("id", fusion_id).in("status", ["active", "dormant"]).single();
    if (!fusion) return NextResponse.json({ error: "Cannot dissolve" }, { status: 404 });
    if (fusion.parent_a_user_id !== user.id && fusion.parent_b_user_id !== user.id) {
      return NextResponse.json({ error: "Not your fusion" }, { status: 403 });
    }

    // TODO: In production, distribute treasury back to both parents
    await supabase.from("fusions").update({
      status: "dissolved",
      dissolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", fusion_id);

    await supabase.from("fusion_activity").insert({
      fusion_id, type: "dissolve",
      content: { dissolved_by: user.id, treasury_distributed: fusion.treasury_balance },
    });

    return NextResponse.json({ ok: true });
  }

  // ═══ DEPOSIT TO TREASURY ═══
  if (action === "deposit") {
    const { fusion_id, amount_eth, tx_hash } = body;

    const { data: fusion } = await supabase.from("fusions")
      .select("treasury_balance, parent_a_user_id, parent_b_user_id")
      .eq("id", fusion_id).single();
    if (!fusion) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (fusion.parent_a_user_id !== user.id && fusion.parent_b_user_id !== user.id) {
      return NextResponse.json({ error: "Not your fusion" }, { status: 403 });
    }

    await supabase.from("fusions").update({
      treasury_balance: (parseFloat(String(fusion.treasury_balance)) || 0) + amount_eth,
      updated_at: new Date().toISOString(),
    }).eq("id", fusion_id);

    await supabase.from("fusion_activity").insert({
      fusion_id, type: "treasury",
      content: { action: "deposit", amount_eth, tx_hash, depositor: user.id },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fusionId = searchParams.get("id");

  if (fusionId) {
    const { data } = await supabase.from("fusions")
      .select("*, parent_a:parent_a_user_id(id, name, avatar_url), parent_b:parent_b_user_id(id, name, avatar_url)")
      .eq("id", fusionId).single();
    return NextResponse.json({ fusion: data });
  }

  // List all user's fusions
  const { data } = await supabase.from("fusions")
    .select("*, parent_a:parent_a_user_id(id, name, avatar_url), parent_b:parent_b_user_id(id, name, avatar_url)")
    .or(`parent_a_user_id.eq.${user.id},parent_b_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  return NextResponse.json({ fusions: data || [] });
}

export const runtime = "nodejs";
