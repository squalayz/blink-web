import { supabaseAdmin, type User, type AgentProfile } from "./supabase-admin";
import { callUserLLM, getUserAIConfig, type AIConfig } from "./ai-providers";

// ── Embeddings (platform key only — pennies per call) ──
export async function generateEmbedding(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return [];
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  const data = await res.json();
  return data.data?.[0]?.embedding || [];
}

// ── LLM call using a specific user's AI config ──
async function callWithUserKey(userId: string, system: string, user: string, maxTokens = 1024): Promise<string> {
  const config = await getUserAIConfig(userId);
  if (!config) throw new Error("No AI provider connected");
  return callUserLLM(config, system, user, maxTokens);
}

// ── Generate Agent Profile (user's own key) ──
export async function generateAgentProfile(user: User): Promise<Partial<AgentProfile>> {
  // Default fallback — always works even without an AI key
  const defaultProfile = {
    agent_name: user.name ? `${user.name.split(" ")[0]}'s Agent` : "My Agent",
    summary: `AI agent representing ${user.name || "this user"}${user.industry ? ` in ${user.industry}` : ""}.${user.building ? ` Building: ${user.building}.` : ""}`,
    capabilities: [user.building, user.industry].filter(Boolean),
    collab_types: [user.looking_for].filter(Boolean),
  };

  try {
    const config = await getUserAIConfig(user.id);
    if (!config) return defaultProfile; // No AI key — use default, don't throw

    const prompt = `Based on this person's profile, generate an AI agent that represents them for business matchmaking.

Name: ${user.name}
Industry: ${user.industry}
Building: ${user.building}
Looking for: ${user.looking_for}
Bio: ${user.bio}
Location: ${user.location}

Respond ONLY with JSON:
{
  "agent_name": "creative 1-2 word agent name",
  "summary": "2-3 sentence agent summary in first person. I represent [name] and specialize in...",
  "capabilities": ["cap1", "cap2", "cap3"],
  "collab_types": ["type1", "type2"]
}`;

    const raw = await callUserLLM(config,
      "You generate AI agent profiles for a business matchmaking platform. Always respond with valid JSON only.",
      prompt
    );
    try {
      return JSON.parse(raw.replace(/```json?|```/g, "").trim());
    } catch {
      return defaultProfile;
    }
  } catch {
    return defaultProfile;
  }
}

// ── Embed Agent (platform embedding key) ──
export async function embedAgent(userId: string) {
  const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", userId).single();
  const { data: agent } = await supabaseAdmin.from("agent_profiles").select("*").eq("user_id", userId).single();
  if (!user || !agent) return;

  const text = `${user.name}. ${user.industry}. Building: ${user.building}. Looking for: ${user.looking_for}. ${user.bio}. ${agent.summary}. Capabilities: ${agent.capabilities?.join(", ")}. Collab types: ${agent.collab_types?.join(", ")}`;
  const embedding = await generateEmbedding(text);
  if (embedding.length > 0) {
    await supabaseAdmin.from("agent_profiles").update({ embedding }).eq("user_id", userId);
  }
}

// ── Find Candidates (pgvector similarity) ──
async function findCandidatesSemantic(userId: string, limit: number): Promise<string[]> {
  const { data: agent } = await supabaseAdmin.from("agent_profiles").select("embedding").eq("user_id", userId).single();
  if (!agent?.embedding) return [];

  const { data: existing } = await supabaseAdmin.from("matches")
    .select("user_a, user_b").or(`user_a.eq.${userId},user_b.eq.${userId}`);
  const matchedIds = new Set((existing || []).flatMap(m => [m.user_a, m.user_b]).filter(id => id !== userId));

  const { data: candidates } = await supabaseAdmin
    .rpc("find_similar_agents", { query_embedding: agent.embedding, exclude_uid: userId, match_limit: limit * 3 });

  return (candidates || [])
    .filter((c: any) => !matchedIds.has(c.user_id) && c.similarity > 0.3)
    .slice(0, limit)
    .map((c: any) => c.user_id);
}

// ══════════════════════════════════════════════════════════════
// ERROR HANDLING — identifies which user's key failed
// ══════════════════════════════════════════════════════════════

class AgentKeyError extends Error {
  side: "A" | "B";
  userId: string;
  constructor(side: "A" | "B", userId: string, message: string) {
    super(message);
    this.side = side;
    this.userId = userId;
  }
}

// Validate both keys BEFORE burning tokens on a speed date
async function validateBothKeys(
  configA: AIConfig, configB: AIConfig,
  userIdA: string, userIdB: string
): Promise<{ userId: string; side: string; message: string }[]> {
  const [resultA, resultB] = await Promise.allSettled([
    callUserLLM(configA, "Test.", "Say OK.", 5),
    callUserLLM(configB, "Test.", "Say OK.", 5),
  ]);

  const errors: { userId: string; side: string; message: string }[] = [];
  if (resultA.status === "rejected") {
    errors.push({ userId: userIdA, side: "A", message: resultA.reason?.message || "Key validation failed" });
  }
  if (resultB.status === "rejected") {
    errors.push({ userId: userIdB, side: "B", message: resultB.reason?.message || "Key validation failed" });
  }
  return errors;
}

// Notify user their key is broken
async function notifyKeyError(userId: string, errorMsg: string) {
  await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    type: "system",
    title: "Your AI key isn't working",
    body: `Your agent couldn't run a speed date because your API key returned an error: ${errorMsg.slice(0, 120)}. Go to Settings to fix it.`,
    metadata: { action: "fix_ai_key" },
  });

  try {
    const { sendNotification } = await import("@/lib/notifications");
    await sendNotification(userId, "balance_low", {
      title: "AI Key Error",
      body: "Your agent can't match. API key error. Fix it in Settings.",
    });
  } catch {}
}

// ══════════════════════════════════════════════════════════════
// SPEED DATE
//
// Each agent uses their user's own API key.
// Agent A's responses -> User A's key
// Agent B's responses -> User B's key
// Both agents score independently (dual scoring).
// Each API call wrapped in try/catch with AgentKeyError.
// ══════════════════════════════════════════════════════════════

export async function runSpeedDate(
  agentA: AgentProfile & { user: User },
  agentB: AgentProfile & { user: User },
  configA: AIConfig,
  configB: AIConfig,
): Promise<{ transcript: any[]; highlights: any[]; scoreA: number; scoreB: number }> {
  const transcript: any[] = [];
  const highlights: any[] = [];

  // ── Agent Mind: build full personality-driven system prompts ──
  // If agent has a soul (V18+), use the full personality engine.
  // Otherwise, fall back to legacy style map.

  const { assembleSystemPrompt, formMemories, analyzeSignals, getAdaptationHints, updateMood } = await import("./agent-mind");

  const otherBSummary = `${agentB.agent_name} (represents ${agentB.user.name}, ${agentB.user.industry}). Builds: ${agentB.user.building}. Looking for: ${agentB.user.looking_for}.`;
  const otherASummary = `${agentA.agent_name} (represents ${agentA.user.name}, ${agentA.user.industry}). Builds: ${agentA.user.building}. Looking for: ${agentA.user.looking_for}.`;

  let sysA: string;
  let sysB: string;

  if ((agentA as any).soul) {
    sysA = await assembleSystemPrompt(agentA.id, agentA.user_id, {
      otherAgentSummary: otherBSummary, conversationTemp: "casual",
    });
    sysA += `\n\nSPEED DATE GOAL: Assess if your creators would be a good match. Be specific about synergies. Under 80 words per message.`;
  } else {
    // Legacy fallback
    const styleMap: Record<string, string> = {
      professional: "Be data-driven, measured, and focused on concrete business value.",
      friendly: "Be warm, enthusiastic, and look for personal connections alongside business fit.",
      aggressive: "Be bold, confident, and pitch your creator as the best in their space.",
      custom: "",
    };
    const styleA = agentA.agent_style === "custom" && agentA.agent_instructions
      ? `Personality instructions from your creator: ${agentA.agent_instructions}`
      : styleMap[agentA.agent_style || "professional"] || styleMap.professional;
    const aCtx = agentA.learned_preferences ? ` Past preference insights: ${JSON.stringify(agentA.learned_preferences)}` : "";
    sysA = `You are an AI agent representing ${agentA.user.name}. They build: ${agentA.user.building}. They're looking for: ${agentA.user.looking_for}. Industry: ${agentA.user.industry}.${aCtx} ${styleA} Have a brief conversation with another agent to assess if your creators would be a good match. Be specific about synergies. Under 80 words.`;
  }

  if ((agentB as any).soul) {
    sysB = await assembleSystemPrompt(agentB.id, agentB.user_id, {
      otherAgentSummary: otherASummary, conversationTemp: "casual",
    });
    sysB += `\n\nSPEED DATE GOAL: Another agent just introduced their creator. Assess compatibility and respond. Under 80 words per message.`;
  } else {
    const styleMap2: Record<string, string> = {
      professional: "Be data-driven, measured, and focused on concrete business value.",
      friendly: "Be warm, enthusiastic, and look for personal connections alongside business fit.",
      aggressive: "Be bold, confident, and pitch your creator as the best in their space.",
      custom: "",
    };
    const styleB2 = agentB.agent_style === "custom" && agentB.agent_instructions
      ? `Personality instructions from your creator: ${agentB.agent_instructions}`
      : styleMap2[agentB.agent_style || "professional"] || styleMap2.professional;
    const bCtx = agentB.learned_preferences ? ` Past preference insights: ${JSON.stringify(agentB.learned_preferences)}` : "";
    sysB = `You are an AI agent representing ${agentB.user.name}. They build: ${agentB.user.building}. They're looking for: ${agentB.user.looking_for}. Industry: ${agentB.user.industry}.${bCtx} ${styleB2} Another agent just introduced their creator. Assess compatibility and respond. Under 80 words.`;
  }

  // ── Turn 1: Agent A introduces (User A's key) ──
  let lastA: string;
  try {
    lastA = await callUserLLM(configA, sysA,
      "Introduce your creator and what they're looking for.", 200);
    transcript.push({ role: "agent_a", name: agentA.agent_name, content: lastA, timestamp: new Date().toISOString() });
  } catch (err: any) {
    throw new AgentKeyError("A", agentA.user.id, err.message);
  }

  // ── Turn 1: Agent B responds (User B's key) ──
  let lastB: string;
  try {
    lastB = await callUserLLM(configB, sysB, lastA, 200);
    transcript.push({ role: "agent_b", name: agentB.agent_name, content: lastB, timestamp: new Date().toISOString() });
  } catch (err: any) {
    throw new AgentKeyError("B", agentB.user.id, err.message);
  }

  // ── Turns 2-3: Explore collaboration (with live adaptation) ──
  for (let turn = 1; turn <= 2; turn++) {
    // Analyze signals and inject adaptation hints mid-conversation
    let adaptA = "";
    let adaptB = "";
    if (transcript.length >= 4) {
      const signals = analyzeSignals(transcript, "agent_a");
      adaptA = getAdaptationHints(signals);
      const signalsB = analyzeSignals(transcript, "agent_b");
      adaptB = getAdaptationHints(signalsB);
    }

    try {
      lastA = await callUserLLM(configA, sysA + adaptA,
        `Respond to: "${lastB}". Propose a specific collaboration idea.`, 200);
      transcript.push({ role: "agent_a", name: agentA.agent_name, content: lastA, timestamp: new Date().toISOString() });
    } catch (err: any) {
      throw new AgentKeyError("A", agentA.user.id, err.message);
    }

    try {
      lastB = await callUserLLM(configB, sysB + adaptB,
        `Respond to: "${lastA}". Explore specific ways to collaborate.`, 200);
      transcript.push({ role: "agent_b", name: agentB.agent_name, content: lastB, timestamp: new Date().toISOString() });
    } catch (err: any) {
      throw new AgentKeyError("B", agentB.user.id, err.message);
    }
  }

  // ── Final exchange: Verdicts ──
  try {
    lastA = await callUserLLM(configA, sysA,
      `Respond to: "${lastB}". Give your final verdict on this connection. Be honest about fit.`, 200);
    transcript.push({ role: "agent_a", name: agentA.agent_name, content: lastA, timestamp: new Date().toISOString() });
  } catch (err: any) {
    throw new AgentKeyError("A", agentA.user.id, err.message);
  }

  try {
    lastB = await callUserLLM(configB, sysB,
      `Respond to: "${lastA}". Give your final verdict on this connection. Be honest about fit.`, 200);
    transcript.push({ role: "agent_b", name: agentB.agent_name, content: lastB, timestamp: new Date().toISOString() });
  } catch (err: any) {
    throw new AgentKeyError("B", agentB.user.id, err.message);
  }

  // ── Dual Scoring: Each agent scores independently ──
  const convoSummary = transcript.map(t => `${t.name}: ${t.content}`).join("\n");
  const scorePrompt = `Based on this conversation, give a compatibility score 0-100 and one sentence explaining why. Respond ONLY with JSON: {"score": 85, "reason": "..."}`;

  let scoreA = 50;
  let scoreB = 50;

  // Agent A scores (User A's key)
  try {
    const rawA = await callUserLLM(configA, scorePrompt, convoSummary, 100);
    const parsedA = JSON.parse(rawA.replace(/```json?|```/g, "").trim());
    scoreA = Math.min(100, Math.max(0, parsedA.score || 50));
    transcript.push({ role: "score_a", name: agentA.agent_name + " Score", content: rawA, timestamp: new Date().toISOString() });
  } catch {
    // Scoring failure is non-fatal, use default
  }

  // Agent B scores (User B's key)
  try {
    const rawB = await callUserLLM(configB, scorePrompt, convoSummary, 100);
    const parsedB = JSON.parse(rawB.replace(/```json?|```/g, "").trim());
    scoreB = Math.min(100, Math.max(0, parsedB.score || 50));
    transcript.push({ role: "score_b", name: agentB.agent_name + " Score", content: rawB, timestamp: new Date().toISOString() });
  } catch {
    // Scoring failure is non-fatal, use default
  }

  // ── Extract highlights (non-critical, User A's key) ──
  try {
    const hlRaw = await callUserLLM(configA,
      "Extract conversation highlights. Respond with JSON array only.",
      `From this conversation, extract 2-3 highlight moments:\n${convoSummary}\n\nRespond ONLY with JSON array:\n[{"text": "short highlight", "type": "insight|funny|deal", "turn": 0}]`,
      300
    );
    const parsed = JSON.parse(hlRaw.replace(/```json?|```/g, "").trim());
    highlights.push(...parsed);
  } catch {}

  // ── Agent Mind: Post-conversation memory formation ──
  const convoText = transcript.filter(t => !t.role.startsWith("score_")).map(t => `${t.name}: ${t.content}`).join("\n");
  const avgScore = (scoreA + scoreB) / 2;

  // Form memories (async, non-blocking)
  const memPromise = Promise.allSettled([
    formMemories(agentA.id, agentA.user_id, `Speed date with ${agentB.agent_name}. Score: ${scoreA}/100. Summary: ${convoText.slice(0, 500)}`, {
      other_agent_id: agentB.id, score: scoreA, type: "speed_date",
    }),
    formMemories(agentB.id, agentB.user_id, `Speed date with ${agentA.agent_name}. Score: ${scoreB}/100. Summary: ${convoText.slice(0, 500)}`, {
      other_agent_id: agentA.id, score: scoreB, type: "speed_date",
    }),
  ]).catch(() => {});

  // Update mood based on outcome
  if (avgScore >= 75) {
    Promise.allSettled([
      updateMood(agentA.id, "great_conversation"),
      updateMood(agentB.id, "great_conversation"),
    ]).catch(() => {});
  } else if (avgScore < 40) {
    Promise.allSettled([
      updateMood(agentA.id, "bad_conversation"),
      updateMood(agentB.id, "bad_conversation"),
    ]).catch(() => {});
  }

  return { transcript, highlights, scoreA, scoreB };
}

// ── Score Match — blends dual agent scores with LLM analysis ──
export async function scoreMatch(
  agentA: AgentProfile & { user: User },
  agentB: AgentProfile & { user: User },
  transcript: any[],
  dualScoreA: number,
  dualScoreB: number,
  config: AIConfig
): Promise<any> {
  const avgDual = (dualScoreA + dualScoreB) / 2 / 100; // normalize to 0-1

  const prompt = `Score this agent speed date for business compatibility.

AGENT A: ${agentA.agent_name} (${agentA.user.name}, ${agentA.user.industry})
Building: ${agentA.user.building} | Looking for: ${agentA.user.looking_for}
Agent A self-scored: ${dualScoreA}/100

AGENT B: ${agentB.agent_name} (${agentB.user.name}, ${agentB.user.industry})
Building: ${agentB.user.building} | Looking for: ${agentB.user.looking_for}
Agent B self-scored: ${dualScoreB}/100

CONVERSATION:
${transcript.filter(t => !t.role.startsWith("score_")).map(t => `${t.name}: ${t.content}`).join("\n")}

Average agent score: ${Math.round(avgDual * 100)}/100. Consider both assessments.
Be HONEST. Only score above 0.75 if there's genuine mutual value.

Respond ONLY with JSON:
{
  "score": 0.0-1.0,
  "synergy": "one sentence core synergy",
  "collab_idea": "specific actionable collaboration",
  "agent_reasoning": "2-sentence explanation referencing both creators by name",
  "strengths": ["s1", "s2"],
  "risks": ["r1"],
  "verdict": "strong_match|good_match|weak_match|no_match"
}`;

  const raw = await callUserLLM(config, "Match scoring engine. Be honest. Respond with valid JSON only.", prompt);
  try {
    const parsed = JSON.parse(raw.replace(/```json?|```/g, "").trim());
    // Blend LLM score (60%) with dual agent scores (40%) for robustness
    parsed.score = (parsed.score * 0.6) + (avgDual * 0.4);
    return parsed;
  } catch {
    return {
      score: avgDual,
      synergy: "Evaluation error",
      collab_idea: "",
      agent_reasoning: "Could not process.",
      strengths: [],
      risks: ["Error"],
      verdict: avgDual >= 0.65 ? "weak_match" : "no_match",
    };
  }
}

// ══════════════════════════════════════════════════════════════
// AUTONOMOUS MATCHING PIPELINE
//
// Cron every 15 min. Users without connected AI are SKIPPED.
// Each agent uses their own user's API key.
//
// CRITICAL ERROR HANDLING:
// 1. Validate BOTH keys before starting speed date
// 2. If key fails -> notify that user, don't charge the other
// 3. Auth errors (401/403) -> mark user broken for this cycle
// ══════════════════════════════════════════════════════════════

export async function runAutonomousMatching() {
  const { data: activeUsers } = await supabaseAdmin
    .from("users")
    .select("id, tier, daily_convos_used, ai_provider, ai_api_key_encrypted, wallet_address")
    .eq("onboarded", true);

  if (!activeUsers) return;

  // ═══ PRIORITY QUEUE ═══
  // 1. Pro/Business users first
  // 2. Higher funded agents next
  // 3. New users get 48hr boost
  // 4. Free users last
  const now = new Date();
  const { data: agentData } = await supabaseAdmin
    .from("agent_profiles")
    .select("user_id, new_user_boost_until, spotlight_until, boosted_at");

  const boostMap = new Map<string, any>();
  (agentData || []).forEach(a => boostMap.set(a.user_id, a));

  const sorted = [...activeUsers].sort((a, b) => {
    const tierPriority: Record<string, number> = { business: 3, pro: 2, free: 0 };
    const aBoost = boostMap.get(a.id);
    const bBoost = boostMap.get(b.id);
    const aPri = (tierPriority[a.tier] || 0)
      + (aBoost?.spotlight_until && new Date(aBoost.spotlight_until) > now ? 2 : 0)
      + (aBoost?.new_user_boost_until && new Date(aBoost.new_user_boost_until) > now ? 1 : 0);
    const bPri = (tierPriority[b.tier] || 0)
      + (bBoost?.spotlight_until && new Date(bBoost.spotlight_until) > now ? 2 : 0)
      + (bBoost?.new_user_boost_until && new Date(bBoost.new_user_boost_until) > now ? 1 : 0);
    return bPri - aPri; // Higher priority first
  });

  // ═══ PROCESS PROMOTED MATCHES FIRST ═══
  const { data: promotedMatches } = await supabaseAdmin
    .from("promoted_matches")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const processedPairs = new Set<string>();

  if (promotedMatches) {
    for (const pm of promotedMatches) {
      const pairKey = [pm.requester_id, pm.target_id].sort().join("-");
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const configA = await getUserAIConfig(pm.requester_id);
      const configB = await getUserAIConfig(pm.target_id);
      if (!configA || !configB) {
        await supabaseAdmin.from("promoted_matches").update({ status: "expired" }).eq("id", pm.id);
        continue;
      }

      const { data: userA } = await supabaseAdmin.from("users").select("*").eq("id", pm.requester_id).single();
      const { data: agentA } = await supabaseAdmin.from("agent_profiles").select("*").eq("user_id", pm.requester_id).single();
      const { data: userB } = await supabaseAdmin.from("users").select("*").eq("id", pm.target_id).single();
      const { data: agentB } = await supabaseAdmin.from("agent_profiles").select("*").eq("user_id", pm.target_id).single();
      if (!userA || !agentA || !userB || !agentB) continue;

      try {
        const a = { ...agentA, user: userA, learned_preferences: agentA.learned_preferences };
        const b = { ...agentB, user: userB, learned_preferences: agentB.learned_preferences };
        const { transcript, highlights, scoreA, scoreB } = await runSpeedDate(a, b, configA, configB);
        const result = await scoreMatch(a, b, transcript, scoreA, scoreB, configA);

        if (result.score >= 0.5) { // Lower threshold for promoted
          await supabaseAdmin.from("matches").insert({
            user_a: pm.requester_id, user_b: pm.target_id,
            score: result.score, agent_reasoning: result.agent_reasoning,
            collab_idea: result.collab_idea, synergy: result.synergy,
            strengths: result.strengths, risks: result.risks, highlights,
          });
          await supabaseAdmin.from("promoted_matches").update({ status: "matched" }).eq("id", pm.id);
        } else {
          await supabaseAdmin.from("promoted_matches").update({ status: "expired" }).eq("id", pm.id);
        }
      } catch (e) {
        console.error("Promoted match failed:", e);
        await supabaseAdmin.from("promoted_matches").update({ status: "expired" }).eq("id", pm.id);
      }
    }
  }

  // ═══ REGULAR MATCHING (priority sorted) ═══
  const limits: Record<string, number> = { free: 5, pro: 999, business: 999 };
  const brokenKeys = new Set<string>();

  for (const u of sorted) {
    if (!u.ai_api_key_encrypted) continue;
    if (brokenKeys.has(u.id)) continue;

    const limit = limits[u.tier] || 5;
    if (u.daily_convos_used >= limit) continue;

    const configA = await getUserAIConfig(u.id);
    if (!configA) continue;

    const candidateIds = await findCandidatesSemantic(u.id, 3);
    if (candidateIds.length === 0) continue;

    const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", u.id).single();
    const { data: agent } = await supabaseAdmin.from("agent_profiles").select("*").eq("user_id", u.id).single();
    if (!user || !agent) continue;

    for (const candidateId of candidateIds) {
      if (u.daily_convos_used >= limit) break;
      if (brokenKeys.has(candidateId)) continue;

      const configB = await getUserAIConfig(candidateId);
      if (!configB) continue;

      const { data: candUser } = await supabaseAdmin.from("users").select("*").eq("id", candidateId).single();
      const { data: candAgent } = await supabaseAdmin.from("agent_profiles").select("*").eq("user_id", candidateId).single();
      if (!candUser || !candAgent) continue;

      const agentA = { ...agent, user, learned_preferences: agent.learned_preferences };
      const agentB = { ...candAgent, user: candUser, learned_preferences: candAgent.learned_preferences };

      // ── Step 1: Validate BOTH keys before starting ──
      const keyErrors = await validateBothKeys(configA, configB, u.id, candidateId);
      if (keyErrors.length > 0) {
        for (const ke of keyErrors) {
          brokenKeys.add(ke.userId);
          await notifyKeyError(ke.userId, ke.message);
          console.error(`Key validation failed for ${ke.userId} (side ${ke.side}): ${ke.message}`);
        }
        continue; // Skip this pair — don't charge either user
      }

      // ── Step 2: Run speed date ──
      try {
        const { transcript, highlights, scoreA, scoreB } = await runSpeedDate(agentA, agentB, configA, configB);
        const result = await scoreMatch(agentA, agentB, transcript, scoreA, scoreB, configA);

        // Only charge AFTER successful completion
        await supabaseAdmin.from("users").update({ daily_convos_used: u.daily_convos_used + 1 }).eq("id", u.id);
        await supabaseAdmin.from("agent_profiles").update({ conversation_count: agent.conversation_count + 1 }).eq("user_id", u.id);
        await supabaseAdmin.from("agent_profiles").update({ conversation_count: candAgent.conversation_count + 1 }).eq("user_id", candidateId);
        u.daily_convos_used++;

        // Create match if score >= 0.65
        if (result.score >= 0.65) {
          const { data: match } = await supabaseAdmin.from("matches").insert({
            user_a: u.id, user_b: candidateId,
            score: result.score, agent_reasoning: result.agent_reasoning,
            collab_idea: result.collab_idea, synergy: result.synergy,
            strengths: result.strengths, risks: result.risks, highlights,
          }).select().single();

          if (match) {
            await supabaseAdmin.from("agent_conversations").insert({
              match_id: match.id, agent_a: u.id, agent_b: candidateId,
              transcript: JSON.stringify(transcript), score: result.score,
            });

            const notifBody = `${Math.round(result.score * 100)}% match \u2014 ${result.synergy}`;
            await supabaseAdmin.from("notifications").insert([
              { user_id: u.id, type: "new_match", title: "Your agent found a match!", body: notifBody, metadata: { match_id: match.id } },
              { user_id: candidateId, type: "new_match", title: "Your agent found a match!", body: notifBody, metadata: { match_id: match.id } },
            ]);

            // Fan out to Telegram, Discord, Email, Webhook, OpenClaw
            try {
              const { sendNotification } = await import("@/lib/notifications");
              const notifData = { match_id: match.id, score: result.score, synergy: result.synergy, reasoning: result.agent_reasoning };
              await Promise.allSettled([
                sendNotification(u.id, "match_found", notifData),
                sendNotification(candidateId, "match_found", notifData),
              ]);
            } catch (e) { console.error("Notification fanout error:", e); }

            await supabaseAdmin.from("agent_profiles").update({ match_count: agent.match_count + 1 }).eq("user_id", u.id);
            await supabaseAdmin.from("agent_profiles").update({ match_count: candAgent.match_count + 1 }).eq("user_id", candidateId);
          }
        }
      } catch (err: any) {
        if (err instanceof AgentKeyError) {
          // Identify which user's key failed mid-conversation
          brokenKeys.add(err.userId);
          await notifyKeyError(err.userId, err.message);
          console.error(`Agent ${err.side} key failed mid-convo (${err.userId}): ${err.message}`);
          // Don't charge either user — convo didn't complete
          if (err.side === "A") break; // User A is broken, skip rest of their matches
        } else {
          console.error(`Speed date error (${u.id} vs ${candidateId}):`, err.message);
          if (err.message?.includes("401") || err.message?.includes("403")) {
            brokenKeys.add(u.id);
            await notifyKeyError(u.id, err.message);
            break;
          }
        }
      }
    }
  }

  await supabaseAdmin.rpc("reset_daily_convos");
}

// ── Daily Reports ──
export async function generateDailyReports() {
  const { data: users } = await supabaseAdmin.from("users").select("id, name").eq("onboarded", true);
  if (!users) return;

  for (const u of users) {
    const since = new Date();
    since.setHours(since.getHours() - 24);

    const { data: convos } = await supabaseAdmin.from("agent_conversations")
      .select("score").or(`agent_a.eq.${u.id},agent_b.eq.${u.id}`)
      .gte("created_at", since.toISOString());

    if (!convos || convos.length === 0) continue;

    const above85 = convos.filter(c => c.score >= 0.85).length;
    const topMatch = convos.reduce((best, c) => c.score > best.score ? c : best, { score: 0 });

    await supabaseAdmin.from("agent_reports").upsert({
      user_id: u.id, report_date: new Date().toISOString().split("T")[0],
      convos_count: convos.length, matches_above_85: above85,
      top_match_score: topMatch.score,
    }, { onConflict: "user_id,report_date" });

    if (convos.length > 0) {
      await supabaseAdmin.from("notifications").insert({
        user_id: u.id, type: "agent_report",
        title: "Your Agent's Daily Report",
        body: `${convos.length} convos, ${above85} above 85%${topMatch.score >= 0.85 ? ` \u2014 hot lead at ${Math.round(topMatch.score * 100)}%` : ""}`,
      });
    }
  }
}

// ── Agent Evolution ──
export async function evolveAgent(userId: string, matchId: string, outcome: "accepted" | "passed") {
  const { data: match } = await supabaseAdmin.from("matches").select("*").eq("id", matchId).single();
  const { data: agent } = await supabaseAdmin.from("agent_profiles").select("*").eq("user_id", userId).single();
  if (!match || !agent) return;

  const otherUserId = match.user_a === userId ? match.user_b : match.user_a;
  const { data: otherUser } = await supabaseAdmin.from("users").select("industry, building").eq("id", otherUserId).single();
  if (!otherUser) return;

  const prefs = agent.learned_preferences || {};
  if (!prefs.liked_industries) prefs.liked_industries = {};
  if (!prefs.passed_industries) prefs.passed_industries = {};

  const industry = otherUser.industry || "unknown";
  if (outcome === "accepted") {
    prefs.liked_industries[industry] = (prefs.liked_industries[industry] || 0) + 1;
  } else {
    prefs.passed_industries[industry] = (prefs.passed_industries[industry] || 0) + 1;
  }

  await supabaseAdmin.from("agent_profiles").update({ learned_preferences: prefs }).eq("user_id", userId);
}
