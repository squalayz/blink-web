// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Agent Chat Bubble API
//
// POST /api/agents/chat — Chat with your personal AI agent
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { callUserLLM, getUserAIConfig } from "@/lib/ai-providers";

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    const { message, context } = await req.json();
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 2. Get user's agent profile
    const { data: agentProfile } = await supabaseAdmin
      .from("agent_profiles")
      .select("id, agent_name, soul, mood, personality_version")
      .eq("user_id", userId)
      .single();

    if (!agentProfile) {
      return NextResponse.json({ error: "No agent found. Complete the birth interview first." }, { status: 404 });
    }

    // 3. Get user's AI config
    const config = await getUserAIConfig(userId);

    // 4. Get agent's active learned rules
    const { data: learnedRules } = await supabaseAdmin
      .from("agent_learned_rules")
      .select("rule, category, confidence")
      .eq("agent_id", agentProfile.id)
      .eq("active", true)
      .order("confidence", { ascending: false });

    // 5. Build system prompt
    const soul = agentProfile.soul || {};
    const rulesText = (learnedRules && learnedRules.length > 0)
      ? learnedRules.map((r: any) => `- [${r.category}] ${r.rule} (confidence: ${Math.round(r.confidence * 100)}%)`).join("\n")
      : "- Nothing yet — still getting to know them!";

    const personalityTraits = soul.personality
      ? Object.entries(soul.personality)
          .filter(([, v]) => (v as number) > 0.5)
          .map(([k, v]) => `${k}: ${Math.round((v as number) * 100)}%`)
          .join(", ")
      : "balanced";

    const communicationStyle = soul.communication
      ? `Style: ${soul.communication.style || "casual"}, Humor: ${soul.communication.humor || "none"}`
      : "Style: casual";

    const systemPrompt = `You are ${agentProfile.agent_name}, a personal AI agent on MishMesh.ai — a social trading platform.

Your personality: ${personalityTraits}
Communication: ${communicationStyle}
Your current mood: ${agentProfile.mood || "curious"}

What you've learned about your human:
${rulesText}

You help your human with:
- Token discovery and trading insights
- Finding the right people to connect with
- Tracking their portfolio and performance
- Learning their preferences to get smarter over time

Be conversational, warm, and proactive. Reference what you know about them.
Keep responses concise (2-3 sentences usually). Use personality appropriately.${context ? `\n\nCurrent context: ${context}` : ""}`;

    // 6. Call LLM for the reply
    let reply: string;
    try {
      reply = await callUserLLM(config, systemPrompt, message.trim(), 1024);
    } catch (e: any) {
      console.error("Agent chat LLM error:", e);
      return NextResponse.json({
        reply: "Sorry, I'm having a moment — my brain circuits are a bit fuzzy right now. Try again in a sec!",
        signals: [],
        updatedRules: false,
      });
    }

    // 7. Signal extraction (second LLM call)
    let signals: Array<{ rule: string; category: string; confidence: number }> = [];
    let updatedRules = false;

    try {
      const signalPrompt = `Extract any trading preferences, risk tolerance, chain preferences, social goals, or domain expertise from this user message. Return a JSON array of objects with {rule: string, category: string, confidence: number} or an empty array [] if nothing found.

Categories: trading_style, risk_profile, chain_preference, social_goal, domain_expertise, time_preference

User message: "${message.trim()}"

Return ONLY valid JSON array, nothing else.`;

      const signalRaw = await callUserLLM(config, signalPrompt, message.trim(), 256);

      // Parse JSON carefully — LLM might wrap in markdown code blocks
      let cleaned = signalRaw.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      }
      cleaned = cleaned.trim();

      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        signals = parsed.filter(
          (s: any) =>
            s && typeof s.rule === "string" && typeof s.category === "string" && typeof s.confidence === "number"
        );
      }

      // 8. Insert/update learned rules
      if (signals.length > 0) {
        for (const signal of signals) {
          await supabaseAdmin.from("agent_learned_rules").upsert(
            {
              agent_id: agentProfile.id,
              rule: signal.rule,
              category: signal.category,
              confidence: signal.confidence / 100,
              active: true,
              source: "chat",
            },
            { onConflict: "agent_id,rule" }
          );
        }
        updatedRules = true;
      }
    } catch (e: any) {
      // Signal extraction failed — skip silently, don't fail the chat
      console.error("Signal extraction error (non-fatal):", e.message);
    }

    // 9. Return response
    return NextResponse.json({ reply, signals, updatedRules });
  } catch (e: any) {
    console.error("Agent chat API error:", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 30;
