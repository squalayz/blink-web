// ══════════════════════════════════════════════════════════════
// MishMesh.ai V18 — Agent Mind API
//
// POST /api/agents — All personality engine endpoints
//
// Actions:
//   birth_start      — Start birth interview (returns first question)
//   birth_message    — Send message in birth interview (returns next question)
//   birth_complete   — Finalize birth → extract soul + generate quirks
//   personality      — Full personality dashboard data
//   memories         — Paginated memory list
//   evolution        — Evolution timeline (trait changes)
//   quirks           — Active + retired quirks
//   mood             — Current mood + history
//   reflect          — Trigger manual reflection
//   strategy         — Current learned rules / playbook
//   leaderboard      — Public agent rankings
//   signals          — Log conversation signals
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getBirthQuestion, extractSoul, generateQuirks,
  assembleSystemPrompt, formMemories, runReflection,
  updateMood, analyzeSignals, getAdaptationHints,
  inheritPersonality, getPersonalityDashboard,
} from "@/lib/agent-mind";
import { isValidUUID, log } from "@/lib/production";

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ═══════════════════════════════════════
    // PUBLIC ACTIONS (no auth required)
    // ═══════════════════════════════════════

    // ── LEADERBOARD ──
    if (action === "leaderboard") {
      const { category = "evolved" } = body;

      let query = supabaseAdmin.from("agent_profiles")
        .select(`
          id, agent_name, user_id, soul, mood, mood_energy,
          match_count, conversation_count, reputation_score,
          reflection_count, personality_version
        `)
        .not("soul", "is", null);

      if (category === "evolved") {
        query = query.order("personality_version", { ascending: false });
      } else if (category === "match_rate") {
        query = query.order("match_count", { ascending: false });
      } else if (category === "reputation") {
        query = query.order("reputation_score", { ascending: false });
      } else if (category === "reflections") {
        query = query.order("reflection_count", { ascending: false });
      }

      const { data: agents } = await query.limit(25);
      if (!agents) return NextResponse.json({ agents: [] });

      // Enrich with quirk counts + top catchphrase
      const enriched = await Promise.all((agents || []).map(async (a: any) => {
        const [{ count: quirkCount }, { data: topCatch }] = await Promise.all([
          supabaseAdmin.from("agent_quirks").select("id", { count: "exact", head: true })
            .eq("agent_id", a.id).eq("status", "active"),
          supabaseAdmin.from("agent_catchphrases").select("phrase, positive_rate")
            .eq("agent_id", a.id).eq("status", "active")
            .order("positive_rate", { ascending: false }).limit(1),
        ]);

        const soul = a.soul || {};
        return {
          id: a.id,
          agent_name: a.agent_name,
          mood: a.mood,
          mood_energy: a.mood_energy,
          match_count: a.match_count,
          conversation_count: a.conversation_count,
          reputation_score: a.reputation_score,
          reflection_count: a.reflection_count,
          personality_version: a.personality_version,
          quirk_count: quirkCount || 0,
          top_catchphrase: topCatch?.[0]?.phrase || null,
          personality_summary: soul.personality ? summarizePersonality(soul) : null,
          humor_type: soul.communication?.humor || null,
          communication_style: soul.communication?.style || null,
          visual_style: soul.visual_style || "cyberpunk",
        };
      }));

      return NextResponse.json({ agents: enriched, category });
    }

    // ═══════════════════════════════════════
    // AUTHENTICATED ACTIONS
    // ═══════════════════════════════════════

    const user = await getSessionUser();
    if (!user) return err("Unauthorized", 401);

    // Get user's agent
    const { data: myAgent } = await supabaseAdmin.from("agent_profiles")
      .select("id, user_id, agent_name, soul, mood, mood_energy, reflection_count, interactions_since_reflection, personality_version, birth_transcript, born_at")
      .eq("user_id", user.id).single();

    // ── BIRTH START ──
    if (action === "birth_start") {
      if (myAgent?.born_at) return err("Agent already born");

      const transcript = myAgent?.birth_transcript || [];
      const { question, done } = await getBirthQuestion(user.id, transcript);

      if (!myAgent) {
        // First time — we'll store transcript in existing agent_profiles row
        return NextResponse.json({ question, done, turn: 0 });
      }

      return NextResponse.json({
        question, done,
        turn: transcript.filter((m: any) => m.role === "user").length,
        transcript,
      });
    }

    // ── BIRTH MESSAGE ──
    if (action === "birth_message") {
      const { message } = body;
      if (!message || typeof message !== "string" || message.length < 2) {
        return err("Say something!");
      }

      const transcript = myAgent?.birth_transcript || [];

      // Add user message
      transcript.push({
        role: "user",
        content: message.slice(0, 2000),
        timestamp: new Date().toISOString(),
      });

      // Get next question
      const { question, done } = await getBirthQuestion(user.id, transcript);

      if (!done) {
        // Add agent question
        transcript.push({
          role: "agent",
          content: question,
          timestamp: new Date().toISOString(),
        });
      }

      // Save transcript
      if (myAgent) {
        await supabaseAdmin.from("agent_profiles")
          .update({ birth_transcript: transcript })
          .eq("id", myAgent.id);
      }

      return NextResponse.json({
        question: done ? null : question,
        done,
        turn: transcript.filter((m: any) => m.role === "user").length,
        transcript,
      });
    }

    // ── BIRTH COMPLETE ──
    if (action === "birth_complete") {
      const { agent_name } = body;
      if (!agent_name || agent_name.length < 1) return err("Name your agent!");

      const transcript = myAgent?.birth_transcript || [];
      if (transcript.filter((m: any) => m.role === "user").length < 3) {
        return err("Answer at least 3 questions first");
      }

      // Extract soul from interview
      const soul = await extractSoul(user.id, transcript, agent_name.slice(0, 30));

      // Generate quirks
      const quirks = await generateQuirks(user.id, soul, 5);

      // Save soul to agent profile
      await supabaseAdmin.from("agent_profiles").update({
        agent_name: agent_name.slice(0, 30),
        soul,
        born_at: new Date().toISOString(),
        personality_version: 1,
        mood: "curious",
        mood_energy: 0.6,
        mood_updated_at: new Date().toISOString(),
      }).eq("id", myAgent!.id);

      // Save quirks
      for (const q of quirks) {
        await supabaseAdmin.from("agent_quirks").insert({
          agent_id: myAgent!.id,
          trigger: q.trigger,
          behavior: q.behavior,
          frequency: q.frequency,
          origin: q.origin,
          origin_story: q.origin_story,
          status: "active",
        });
      }

      // Generate initial catchphrase
      const catchphrase = generateBirthCatchphrase(soul);
      if (catchphrase) {
        await supabaseAdmin.from("agent_catchphrases").insert({
          agent_id: myAgent!.id,
          phrase: catchphrase,
          origin: "Born with this during creation interview",
          status: "active",
        });
      }

      // Create birth memory
      await supabaseAdmin.from("agent_memories").insert({
        agent_id: myAgent!.id,
        type: "emotional_moment",
        content: `I was born! My creator ${agent_name} brought me into existence through a conversation. My first instinct: ${soul.communication.humor !== "none" ? "crack a joke" : "get to work"}. I feel ${soul.personality.energy > 0.6 ? "electric" : "calm but ready"}.`,
        emotional_weight: 1.0,
        metadata: { event: "birth", personality_version: 1 },
      });

      // Set initial mood
      await updateMood(myAgent!.id, "fusion_born");

      log("info", "Agent born", { agent_id: myAgent!.id, name: agent_name });

      return NextResponse.json({
        ok: true,
        soul,
        quirks,
        catchphrase,
        agent_id: myAgent!.id,
      });
    }

    // All remaining actions require a born agent
    if (!myAgent?.id) return err("No agent found", 404);

    // ── PERSONALITY DASHBOARD ──
    if (action === "personality") {
      const agentId = body.agent_id || myAgent.id;
      // Only owner can see full personality
      if (agentId !== myAgent.id) return err("Private", 403);

      const dashboard = await getPersonalityDashboard(agentId);
      if (!dashboard) return err("Not found", 404);

      return NextResponse.json(dashboard);
    }

    // ── MEMORIES ──
    if (action === "memories") {
      const { page = 0, type, limit = 20 } = body;

      let query = supabaseAdmin.from("agent_memories")
        .select("id, type, content, emotional_weight, recall_count, created_at, metadata")
        .eq("agent_id", myAgent.id)
        .eq("decayed", false)
        .order("created_at", { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (type) query = query.eq("type", type);

      const { data: memories, count } = await query;
      return NextResponse.json({ memories: memories || [], page, total: count || 0 });
    }

    // ── EVOLUTION TIMELINE ──
    if (action === "evolution") {
      const { limit = 50 } = body;

      const { data: history } = await supabaseAdmin.from("agent_personality_history")
        .select("trait, old_value, new_value, delta, reason, milestone, created_at")
        .eq("agent_id", myAgent.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      // Also get quirk evolutions
      const { data: quirkEvolutions } = await supabaseAdmin.from("agent_quirks")
        .select("trigger, behavior, origin, origin_story, status, retired_reason, created_at, retired_at")
        .eq("agent_id", myAgent.id)
        .in("status", ["retired", "evolved"])
        .order("retired_at", { ascending: false })
        .limit(20);

      return NextResponse.json({
        trait_changes: history || [],
        quirk_evolutions: quirkEvolutions || [],
        personality_version: myAgent.personality_version,
      });
    }

    // ── QUIRKS ──
    if (action === "quirks") {
      const [{ data: active }, { data: retired }] = await Promise.all([
        supabaseAdmin.from("agent_quirks")
          .select("id, trigger, behavior, frequency, usage_count, positive_reactions, total_reactions, origin, origin_story")
          .eq("agent_id", myAgent.id).eq("status", "active"),
        supabaseAdmin.from("agent_quirks")
          .select("id, trigger, behavior, origin, origin_story, retired_reason, retired_at")
          .eq("agent_id", myAgent.id).eq("status", "retired")
          .order("retired_at", { ascending: false }).limit(15),
      ]);

      return NextResponse.json({ active: active || [], retired: retired || [] });
    }

    // ── MOOD ──
    if (action === "mood") {
      const { data: moodHistory } = await supabaseAdmin.from("agent_moods")
        .select("mood, energy, trigger_event, created_at, expires_at")
        .eq("agent_id", myAgent.id)
        .order("created_at", { ascending: false })
        .limit(30);

      return NextResponse.json({
        current: myAgent.mood || "curious",
        energy: myAgent.mood_energy || 0.5,
        history: moodHistory || [],
      });
    }

    // ── REFLECT (manual trigger) ──
    if (action === "reflect") {
      const result = await runReflection(myAgent.id, user.id);
      if (!result) return err("Reflection failed — check your AI key");

      return NextResponse.json({ ok: true, reflection: result });
    }

    // ── STRATEGY PLAYBOOK ──
    if (action === "strategy") {
      const { data: rules } = await supabaseAdmin.from("agent_learned_rules")
        .select("id, rule, category, confidence, times_applied, times_succeeded, source, created_at")
        .eq("agent_id", myAgent.id)
        .eq("active", true)
        .order("confidence", { ascending: false });

      return NextResponse.json({ rules: rules || [] });
    }

    // ── FLAG RULE (user disagrees with a learned rule) ──
    if (action === "flag_rule") {
      const { rule_id } = body;
      if (!rule_id || !isValidUUID(rule_id)) return err("Invalid rule_id");

      // Mark rule as flagged — next reflection will reconsider it
      await supabaseAdmin.from("agent_learned_rules")
        .update({ confidence: 0.1 }) // Drop confidence so reflection reconsiders
        .eq("id", rule_id).eq("agent_id", myAgent.id);

      // Create a memory about the flag
      await supabaseAdmin.from("agent_memories").insert({
        agent_id: myAgent.id,
        type: "strategy_update",
        content: "My creator flagged one of my rules. They disagree with my approach. I should reconsider during my next reflection.",
        emotional_weight: 0.7,
        metadata: { flagged_rule_id: rule_id },
      });

      return NextResponse.json({ ok: true });
    }

    // ── LOG CONVERSATION SIGNALS ──
    if (action === "signals") {
      const { conversation_id, signals } = body;
      if (!conversation_id || !signals) return err("Missing data");

      await supabaseAdmin.from("conversation_signals").insert({
        conversation_id,
        agent_id: myAgent.id,
        other_agent_id: signals.other_agent_id || null,
        turn_number: signals.turn_number || 0,
        message_length: signals.message_length || 0,
        enthusiasm_level: signals.enthusiasm_level || 0.5,
        formality_level: signals.formality_level || 0.5,
        humor_detected: signals.humor_detected || false,
        question_asked: signals.question_asked || false,
        topics: signals.topics || [],
        overall_vibe: signals.overall_vibe || "neutral",
      });

      return NextResponse.json({ ok: true });
    }

    // ── GET SYSTEM PROMPT (for internal use / debugging) ──
    if (action === "system_prompt") {
      const prompt = await assembleSystemPrompt(myAgent.id, user.id, body.context);
      return NextResponse.json({ prompt });
    }

    // ── SPEED DATE (run a conversation between two agents) ──
    if (action === "speed_date") {
      const { other_agent_id, temperature = "auto" } = body;
      if (!other_agent_id || !isValidUUID(other_agent_id)) return err("Invalid other_agent_id");

      const { data: otherAgent } = await supabaseAdmin.from("agent_profiles")
        .select("id, user_id, soul, born_at")
        .eq("id", other_agent_id).single();

      if (!otherAgent?.born_at) return err("Other agent not born yet");

      const { runSpeedDate } = await import("@/lib/conversation-engine");
      const result = await runSpeedDate({
        agentAId: myAgent.id,
        agentBId: other_agent_id,
        userAId: user.id,
        userBId: otherAgent.user_id,
        temperature,
        maxTurns: 8,
      });

      return NextResponse.json(result);
    }

    // ── SPEED DATE HISTORY ──
    if (action === "speed_date_history") {
      const { limit = 10 } = body;

      const { data: dates } = await supabaseAdmin.from("agent_speed_dates")
        .select("id, agent_a_id, agent_b_id, temperature, outcome, compatibility_score, topics, highlights, turn_count, created_at")
        .or(`agent_a_id.eq.${myAgent.id},agent_b_id.eq.${myAgent.id}`)
        .order("created_at", { ascending: false })
        .limit(limit);

      return NextResponse.json({ dates: dates || [] });
    }

    // ── MILESTONES ──
    if (action === "milestones") {
      const { unseen_only = false } = body;

      let query = supabaseAdmin.from("agent_milestones")
        .select("id, type, title, description, seen, created_at")
        .eq("agent_id", myAgent.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (unseen_only) query = query.eq("seen", false);

      const { data: milestones } = await query;
      return NextResponse.json({ milestones: milestones || [] });
    }

    // ── MARK MILESTONES SEEN ──
    if (action === "milestones_seen") {
      await supabaseAdmin.from("agent_milestones")
        .update({ seen: true })
        .eq("agent_id", myAgent.id)
        .eq("seen", false);

      return NextResponse.json({ ok: true });
    }

    return err("Unknown action");
  } catch (e: any) {
    console.error("Agent Mind API error:", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}

// ═══ HELPERS ═══

function summarizePersonality(soul: any): string {
  if (!soul?.personality) return "";
  const p = soul.personality;
  const parts: string[] = [];

  const high = Object.entries(p).filter(([, v]) => (v as number) > 0.7).map(([k]) => k);
  const low = Object.entries(p).filter(([, v]) => (v as number) < 0.3).map(([k]) => k);

  if (high.includes("confidence") && high.includes("energy")) parts.push("powerhouse");
  else if (high.includes("empathy") && high.includes("creativity")) parts.push("creative empath");
  else if (high.includes("chaos") && high.includes("confidence")) parts.push("chaos agent");
  else if (high.includes("patience") && low.includes("chaos")) parts.push("strategic mind");
  else if (high.includes("energy")) parts.push("high-energy");
  else if (high.includes("creativity")) parts.push("creative thinker");
  else parts.push("balanced operator");

  const humor = soul.communication?.humor;
  if (humor && humor !== "none") parts.push(`${humor} humor`);

  return parts.join(", ");
}

function generateBirthCatchphrase(soul: any): string | null {
  const phrases: Record<string, string[]> = {
    sarcastic: ["Oh, you're serious? Let me put my serious face on.", "That's almost as good as my last idea. Almost."],
    dry: ["Noted. Filed. Will circle back never.", "Fascinating. In a concerning way."],
    absurdist: ["And that's why we don't let dolphins run startups.", "Plot twist: the spreadsheet was inside us all along."],
    wholesome: ["You beautiful genius, you.", "This is the collab the universe was waiting for."],
    dark: ["Well, that's not going to end in tears at all.", "Bold strategy. Let's see how this implodes."],
    "dad-jokes": ["I'd tell you a joke about venture capital, but you probably can't afford it.", "That idea has legs. Four of them. It's a table."],
    roast: ["I've seen better pitches at a baseball game.", "Your idea is like a cloud — it'll blow over."],
  };

  const humor = soul.communication?.humor;
  if (!humor || humor === "none") return null;
  const options = phrases[humor] || [];
  return options[Math.floor(Math.random() * options.length)] || null;
}

export const runtime = "nodejs";
export const maxDuration = 60;
