// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Delayed First Match Trigger
// Fires 2-10 min after onboarding. Matches with a REAL agent.
// Called fire-and-forget from saveProfile.
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserAIConfig, callUserLLM } from "@/lib/ai-providers";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const { user_id } = await req.json();
  if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

  // Random delay: 2-10 minutes (120-600 seconds)
  const delaySec = Math.floor(Math.random() * 480) + 120;
  const delayMs = delaySec * 1000;

  console.log(`[DelayedMatch] User ${user_id} — match in ${Math.round(delaySec / 60)}min`);

  // Wait the delay (this is a serverless function — Vercel allows up to 5min on Pro)
  // For delays > 5min, we'll cap at 5min and let the regular cron pick up the rest
  const actualDelay = Math.min(delayMs, 290000); // Cap at ~4.8 min to be safe
  await new Promise(r => setTimeout(r, actualDelay));

  try {
    // Get this user's profile
    const { data: user } = await supabaseAdmin.from("users")
      .select("*").eq("id", user_id).single();
    if (!user || !user.onboarded) return NextResponse.json({ ok: false, reason: "Not onboarded" });

    const { data: myAgent } = await supabaseAdmin.from("agent_profiles")
      .select("*").eq("user_id", user_id).single();
    if (!myAgent) return NextResponse.json({ ok: false, reason: "No agent" });

    // Check if they already have matches (cron might have beat us)
    const { count: existingMatches } = await supabaseAdmin.from("matches")
      .select("*", { count: "exact", head: true })
      .or(`user_a.eq.${user_id},user_b.eq.${user_id}`);
    if ((existingMatches || 0) > 0) {
      console.log(`[DelayedMatch] User ${user_id} already has matches, skipping`);
      return NextResponse.json({ ok: true, reason: "Already matched" });
    }

    // ═══ GATE: New user MUST have AI connected to get matches ═══
    const myConfig = await getUserAIConfig(user_id);
    if (!myConfig) {
      console.log(`[DelayedMatch] User ${user_id} has no AI key — skipping. They need to connect first.`);
      // Notify them to connect AI
      await supabaseAdmin.from("notifications").insert({
        user_id, type: "system",
        title: "Connect your AI brain to start matching",
        body: "Your agent needs an AI provider to network. Go to The Brew → AI Brain to connect your API key.",
        metadata: { action: "connect_ai" },
      });
      return NextResponse.json({ ok: false, reason: "No AI key — user must connect first" });
    }

    // Find a REAL candidate — another onboarded user with an agent AND AI connected
    const { data: candidates } = await supabaseAdmin.from("users")
      .select("id").eq("onboarded", true)
      .neq("id", user_id)
      .not("ai_api_key_encrypted", "is", null)
      .limit(20);

    if (!candidates?.length) {
      console.log(`[DelayedMatch] No AI-enabled candidates for ${user_id}`);
      return NextResponse.json({ ok: false, reason: "No AI-enabled candidates yet" });
    }

    // Filter out users we've already matched with
    const { data: existingPairs } = await supabaseAdmin.from("matches")
      .select("user_a, user_b")
      .or(`user_a.eq.${user_id},user_b.eq.${user_id}`);
    const matchedIds = new Set(
      (existingPairs || []).flatMap(m => [m.user_a, m.user_b]).filter(id => id !== user_id)
    );
    const fresh = candidates.filter(c => !matchedIds.has(c.id));

    if (!fresh.length) {
      return NextResponse.json({ ok: false, reason: "All candidates already matched" });
    }

    // Pick the best candidate — both MUST have AI keys
    const candId = fresh[Math.floor(Math.random() * fresh.length)].id;
    const candConfig = await getUserAIConfig(candId);

    const { data: candUser } = await supabaseAdmin.from("users").select("*").eq("id", candId).single();
    const { data: candAgent } = await supabaseAdmin.from("agent_profiles").select("*").eq("user_id", candId).single();

    if (!candUser || !candAgent) {
      return NextResponse.json({ ok: false, reason: "Candidate data missing" });
    }

    if (!candConfig) {
      console.log(`[DelayedMatch] Candidate ${candId} has no AI key — skipping`);
      return NextResponse.json({ ok: false, reason: "Candidate has no AI" });
    }

    // REAL speed date — both have AI (the ONLY way matches happen)
    try {
      const { runSpeedDate, scoreMatch } = await import("@/lib/matching");
      const agentA = { ...myAgent, user, learned_preferences: myAgent.learned_preferences };
      const agentB = { ...candAgent, user: candUser, learned_preferences: candAgent.learned_preferences };

      const { transcript, highlights, scoreA, scoreB } = await runSpeedDate(agentA, agentB, myConfig, candConfig);
      const result = await scoreMatch(agentA, agentB, transcript, scoreA, scoreB, myConfig);

      if (result.score >= 0.50) {
        const { data: match } = await supabaseAdmin.from("matches").insert({
          user_a: user_id, user_b: candId,
          score: result.score, agent_reasoning: result.agent_reasoning,
          collab_idea: result.collab_idea, synergy: result.synergy,
          strengths: result.strengths, risks: result.risks, highlights,
        }).select().single();

        if (match) {
          await supabaseAdmin.from("agent_conversations").insert({
            match_id: match.id, agent_a: user_id, agent_b: candId,
            transcript: JSON.stringify(transcript), score: result.score,
          });

          const scorePercent = Math.round(result.score * 100);
          await notifyMatch(user_id, scorePercent, result.synergy || "", match.id);
          await notifyMatch(candId, scorePercent, result.synergy || "", match.id);

          console.log(`[DelayedMatch] Real match! ${user_id} <-> ${candId} @ ${scorePercent}%`);
          return NextResponse.json({ ok: true, type: "real_speed_date", score: result.score });
        }
      }

      console.log(`[DelayedMatch] Score too low (${Math.round(result.score * 100)}%) — no match created`);
      return NextResponse.json({ ok: false, reason: "Score below threshold" });
    } catch (e: any) {
      console.error("[DelayedMatch] Speed date failed:", e.message);
      return NextResponse.json({ ok: false, reason: e.message }, { status: 500 });
    }

  } catch (e: any) {
    console.error("[DelayedMatch] Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Quick match based on profile similarity (no speed date required)
async function createQuickMatch(userId: string, candId: string, user: any, myAgent: any) {
  const { data: candUser } = await supabaseAdmin.from("users").select("*").eq("id", candId).single();
  const { data: candAgent } = await supabaseAdmin.from("agent_profiles").select("*").eq("user_id", candId).single();
  if (!candUser || !candAgent) return;

  // Generate a synthetic match using the new user's AI (or a generic one)
  const myConfig = await getUserAIConfig(userId);
  let synergy = "Shared interests and complementary skills";
  let reasoning = "Profile-based match";
  let score = 0.70 + Math.random() * 0.15; // 70-85%

  if (myConfig) {
    try {
      const prompt = `You are a matchmaking AI. Based on these two profiles, write a one-sentence synergy description and a confidence score 0-100.

User A: ${user.name || "Anonymous"} — Building: ${user.building || "?"} — Looking for: ${user.looking_for || "?"}
User B: ${candUser.name || "Anonymous"} — Building: ${candUser.building || "?"} — Looking for: ${candUser.looking_for || "?"}

Respond with JSON: {"synergy":"one sentence","score":60-90,"collab_idea":"one sentence"}`;

      const response = await callUserLLM(myConfig, "You are a business matchmaking AI. Be specific and insightful.", prompt, 100);
      const json = response.match(/\{[\s\S]*?\}/);
      if (json) {
        const parsed = JSON.parse(json[0]);
        synergy = parsed.synergy || synergy;
        reasoning = parsed.collab_idea || reasoning;
        score = Math.min(0.90, Math.max(0.55, (parsed.score || 70) / 100));
      }
    } catch {}
  }

  const { data: match } = await supabaseAdmin.from("matches").insert({
    user_a: userId, user_b: candId,
    score, agent_reasoning: reasoning,
    collab_idea: reasoning, synergy,
    strengths: [], risks: [], highlights: [],
  }).select().single();

  if (match) {
    const scorePercent = Math.round(score * 100);
    await notifyMatch(userId, scorePercent, synergy, match.id);
    await notifyMatch(candId, scorePercent, synergy, match.id);
    console.log(`[DelayedMatch] Quick match: ${userId} <-> ${candId} @ ${scorePercent}%`);
  }
}

async function notifyMatch(userId: string, score: number, synergy: string, matchId: string) {
  // In-app notification
  await supabaseAdmin.from("notifications").insert({
    user_id: userId, type: "new_match",
    title: "Your agent found a match!",
    body: `${score}% match — ${synergy}`,
    metadata: { match_id: matchId },
  });

  // Feed event
  try {
    await supabaseAdmin.from("feed_events").insert({
      user_id: userId, event_type: "match",
      title: "NEW MATCH",
      body: `${score}% compatibility — ${synergy}`,
      metadata: { match_id: matchId, score },
    });
  } catch {}

  // Telegram push if connected
  try {
    const { data: tg } = await supabaseAdmin.from("telegram_users")
      .select("chat_id").eq("user_id", userId).single();
    if (tg?.chat_id) {
      await sendTelegramMessage(tg.chat_id,
        `🤝 *New Match Found!*\n\n${score}% compatibility\n_${synergy}_\n\n[View Match](https://mishmesh.ai/dashboard)`,
        [[{ text: "View Match →", url: "https://mishmesh.ai/dashboard" }]]
      );
    }
  } catch {}
}

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min max for the delay
