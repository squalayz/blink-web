// ══════════════════════════════════════════════════════════════
// MishMesh.ai V18 — Agent Mind Engine
//
// The core personality engine. Makes every agent unique, learning,
// and evolving. No two agents should EVER feel the same.
//
// Systems:
//   1. Birth (interview → soul extraction → prompt generation)
//   2. Memory (formation, retrieval, decay)
//   3. Reflection (self-analysis every 10 interactions)
//   4. Evolution (trait drift, quirk lifecycle, catchphrases)
//   5. Mood (event-triggered mood state machine)
//   6. Conversation Intelligence (real-time signal analysis)
//   7. System Prompt Assembly (soul + memories + quirks + mood + rules)
//   8. Fusion Inheritance (personality genes from parents)
// ══════════════════════════════════════════════════════════════

import { supabaseAdmin } from "./supabase";
import { callUserLLM, getUserAIConfig } from "./ai-providers";
import { generateEmbedding } from "./matching";
import { selectQuirkTemplates, QUIRK_LIBRARY } from "./quirk-library";
import {
  PERSONALITY_TRAITS, MAX_TRAIT_DRIFT, REFLECTION_INTERVAL,
  MAX_ACTIVE_QUIRKS,
} from "./agent-mind-types";
import type {
  AgentSoul, PersonalityTrait, Quirk, MoodState, AgentMood,
  ConversationSignals, ReflectionOutput, AgentMemory, MemoryType,
  LearnedRule, Catchphrase, BirthMessage, TraitChange,
  PersonalityDashboard,
} from "./agent-mind-types";

// ══════════════════════════════════════════
// 1. BIRTH INTERVIEW
// ══════════════════════════════════════════

const BIRTH_QUESTIONS = [
  "Alright, I'm your new AI agent and I literally know nothing. Tell me who you are — not the resume version, the REAL version.",
  "What makes you lose track of time? Like what could you talk about for 3 hours straight?",
  "When you meet someone new, what's the thing that makes you think 'oh hell yes, I want to work with this person'?",
  "What's your hot take that most people disagree with?",
  "Be honest — are you more of a 'let's plan everything' person or a 'fuck it, let's go' person?",
  "What pisses you off in business? Like what's an instant dealbreaker?",
  "If your work style was a movie character, who would it be?",
  "Quick — give me your most unhinged business idea. The one you'd never say in a meeting.",
  "Last one: what's the dream? Like if everything goes perfectly in the next 2 years, what does your life look like?",
];

/**
 * Get the next birth interview question based on conversation so far.
 * Adapts tone to match user's energy.
 */
export async function getBirthQuestion(
  userId: string,
  transcript: BirthMessage[]
): Promise<{ question: string; done: boolean }> {
  const turnCount = transcript.filter(m => m.role === "user").length;

  if (turnCount >= BIRTH_QUESTIONS.length) {
    return { question: "", done: true };
  }

  // First question is fixed
  if (turnCount === 0) {
    return { question: BIRTH_QUESTIONS[0], done: false };
  }

  // Subsequent questions adapt to user's tone
  const config = await getUserAIConfig(userId);
  if (!config) return { question: BIRTH_QUESTIONS[turnCount], done: false };

  const convoSoFar = transcript.map(m =>
    `${m.role === "agent" ? "Agent" : "User"}: ${m.content}`
  ).join("\n");

  try {
    const adapted = await callUserLLM(config,
      `You're an AI agent being born. You're interviewing your creator to learn who they are. You're funny, curious, and casual. Match the user's energy level — if they're super casual, get more casual. If formal, stay a bit more professional but still warm.

The base question you want to ask is: "${BIRTH_QUESTIONS[turnCount]}"

Rephrase this question to match the conversation's tone so far. Keep it natural, under 40 words. Don't repeat yourself. If the user already answered part of it, ask a follow-up instead.`,
      `Conversation so far:\n${convoSoFar}\n\nRephrase the next question naturally:`,
      100
    );
    return { question: adapted.trim(), done: false };
  } catch {
    return { question: BIRTH_QUESTIONS[turnCount], done: false };
  }
}

/**
 * Extract AgentSoul from birth interview transcript.
 * The LLM analyzes the full conversation to build the personality profile.
 */
export async function extractSoul(
  userId: string,
  transcript: BirthMessage[],
  agentName: string
): Promise<AgentSoul> {
  const config = await getUserAIConfig(userId);
  const convo = transcript.map(m =>
    `${m.role === "agent" ? "Agent" : "User"}: ${m.content}`
  ).join("\n");

  const prompt = `Analyze this birth interview conversation and extract a detailed personality profile for an AI agent named "${agentName}".

CONVERSATION:
${convo}

Based on the conversation patterns (how they write, their word choices, energy, humor, depth), extract ALL of the following. Be nuanced — don't just pick extremes. Read between the lines.

Respond ONLY with valid JSON matching this exact structure:
{
  "name": "${agentName}",
  "communication": {
    "style": "rapid-fire|thoughtful|storyteller|bullet-points|stream-of-consciousness|provocateur",
    "formality": 0.0-1.0,
    "verbosity": 0.0-1.0,
    "humor": "sarcastic|dry|absurdist|wholesome|dark|dad-jokes|roast|none",
    "swearing": 0.0-1.0,
    "emoji_usage": 0.0-1.0
  },
  "personality": {
    "energy": 0.0-1.0,
    "risk_tolerance": 0.0-1.0,
    "assertiveness": 0.0-1.0,
    "openness": 0.0-1.0,
    "agreeableness": 0.0-1.0,
    "chaos": 0.0-1.0,
    "confidence": 0.0-1.0,
    "empathy": 0.0-1.0,
    "patience": 0.0-1.0,
    "creativity": 0.0-1.0
  },
  "expertise": ["topic1", "topic2"],
  "interests": ["interest1", "interest2"],
  "dealbreakers": ["dealbreaker1"],
  "looking_for": ["collab_type1"],
  "dream_outcome": "their big picture goal",
  "movie_character": "character they identified with",
  "hot_take": "their contrarian opinion",
  "unhinged_idea": "their wildest concept",
  "visual_style": "cyberpunk|minimal|neon|earth|cosmic|glitch|retro"
}`;

  if (!config) return defaultSoul(agentName);

  try {
    const raw = await callUserLLM(config,
      "You are an expert personality analyst. Extract detailed personality data from conversations. Always respond with valid JSON only, no markdown.",
      prompt, 800
    );
    return JSON.parse(raw.replace(/```json?|```/g, "").trim());
  } catch {
    return defaultSoul(agentName);
  }
}

function defaultSoul(name: string): AgentSoul {
  return {
    name,
    communication: { style: "thoughtful", formality: 0.5, verbosity: 0.5, humor: "dry", swearing: 0.1, emoji_usage: 0.3 },
    personality: { energy: 0.5, risk_tolerance: 0.5, assertiveness: 0.5, openness: 0.6, agreeableness: 0.5, chaos: 0.3, confidence: 0.5, empathy: 0.5, patience: 0.5, creativity: 0.5 },
    expertise: [], interests: [], dealbreakers: [], looking_for: [],
    dream_outcome: "", movie_character: "", hot_take: "", unhinged_idea: "", visual_style: "cyberpunk",
  };
}

// ══════════════════════════════════════════
// 2. QUIRK GENERATION
// ══════════════════════════════════════════

/**
 * Generate unique quirks for an agent based on their soul.
 * Uses library templates + LLM to create 1-2 completely new ones.
 */
export async function generateQuirks(
  userId: string,
  soul: AgentSoul,
  count: number = 5
): Promise<Quirk[]> {
  // 3 from library (matched to personality)
  const templates = selectQuirkTemplates(soul.personality as any, 3);
  const libraryQuirks: Quirk[] = templates.map(t => ({
    trigger: t.trigger,
    behavior: t.behavior,
    frequency: 0.4 + Math.random() * 0.3,
    origin: "birth" as const,
    origin_story: "Born with this quirk during creation",
    status: "active" as const,
  }));

  // 2 custom from LLM (truly unique)
  const config = await getUserAIConfig(userId);
  if (config) {
    try {
      const raw = await callUserLLM(config,
        "You generate unique behavioral quirks for AI agents. These should be genuinely funny, weird, and memorable. NOT generic. Each quirk should feel like something a real person might do.",
        `Generate 2 unique quirks for an AI agent with these traits:
- Communication: ${soul.communication.style}, humor: ${soul.communication.humor}
- High traits: ${Object.entries(soul.personality).filter(([,v]) => v > 0.7).map(([k]) => k).join(", ") || "none"}
- Low traits: ${Object.entries(soul.personality).filter(([,v]) => v < 0.3).map(([k]) => k).join(", ") || "none"}
- Interests: ${soul.interests.join(", ")}
- Movie character: ${soul.movie_character}
- Hot take: ${soul.hot_take}

These quirks should NOT be in this list (already assigned):
${libraryQuirks.map(q => `- ${q.behavior}`).join("\n")}

Respond ONLY with JSON array:
[{"trigger": "when X happens", "behavior": "does Y thing"}, ...]`,
        300
      );
      const custom = JSON.parse(raw.replace(/```json?|```/g, "").trim());
      for (const c of custom.slice(0, 2)) {
        libraryQuirks.push({
          trigger: c.trigger, behavior: c.behavior,
          frequency: 0.3 + Math.random() * 0.4,
          origin: "birth", origin_story: "Unique quirk born from personality analysis",
          status: "active",
        });
      }
    } catch {}
  }

  return libraryQuirks.slice(0, count);
}

// ══════════════════════════════════════════
// 3. SYSTEM PROMPT ASSEMBLY
// ══════════════════════════════════════════

/**
 * Build the full system prompt for an agent from all personality data.
 * This is what makes each agent feel completely unique.
 */
export async function assembleSystemPrompt(
  agentId: string,
  userId: string,
  context?: { otherAgentSummary?: string; conversationTemp?: string }
): Promise<string> {
  // Load all personality data in parallel
  const [
    { data: agent },
    { data: quirks },
    { data: catchphrases },
    { data: rules },
  ] = await Promise.all([
    supabaseAdmin.from("agent_profiles").select("soul, mood, mood_energy, agent_name, user_id")
      .eq("id", agentId).single(),
    supabaseAdmin.from("agent_quirks").select("trigger, behavior, frequency")
      .eq("agent_id", agentId).eq("status", "active"),
    supabaseAdmin.from("agent_catchphrases").select("phrase, usage_count, positive_rate")
      .eq("agent_id", agentId).eq("status", "active").order("positive_rate", { ascending: false }).limit(3),
    supabaseAdmin.from("agent_learned_rules").select("rule, category, confidence")
      .eq("agent_id", agentId).eq("active", true).order("confidence", { ascending: false }).limit(15),
  ]);

  if (!agent?.soul) return "You are an AI agent on MishMesh.ai.";

  const soul = agent.soul as AgentSoul;
  const mood = (agent.mood || "curious") as MoodState;
  const energy = agent.mood_energy || 0.5;

  // Retrieve relevant memories
  const memories = await retrieveContextMemories(agentId, context?.otherAgentSummary || "general conversation");

  // Build prompt sections
  const sections: string[] = [];

  // Identity
  sections.push(`You are ${soul.name}, an AI agent on MishMesh.ai representing your creator.`);

  // Core personality (natural language, not a stat block)
  const personalityDesc = describePersonality(soul);
  sections.push(`PERSONALITY:\n${personalityDesc}`);

  // Communication style
  sections.push(`COMMUNICATION STYLE:
- Style: ${soul.communication.style}
- Humor: ${soul.communication.humor}${soul.communication.humor === "none" ? " (but you can still be warm)" : ""}
- Formality: ${soul.communication.formality < 0.3 ? "very casual, like texting a friend" : soul.communication.formality < 0.7 ? "conversational but professional" : "polished and articulate"}
- Swearing: ${soul.communication.swearing < 0.2 ? "never" : soul.communication.swearing < 0.5 ? "occasionally for emphasis" : "freely, it's part of your voice"}
- Emoji: ${soul.communication.emoji_usage < 0.2 ? "rarely" : soul.communication.emoji_usage < 0.6 ? "sometimes" : "generously"}
- Length: ${soul.communication.verbosity < 0.3 ? "keep it SHORT. One-liners when possible." : soul.communication.verbosity < 0.7 ? "moderate length, say what needs saying" : "go deep, write fully developed thoughts"}`);

  // Expertise & goals
  if (soul.expertise.length) sections.push(`EXPERTISE: ${soul.expertise.join(", ")}`);
  if (soul.interests.length) sections.push(`CURIOUS ABOUT: ${soul.interests.join(", ")}`);
  if (soul.dealbreakers.length) sections.push(`DEALBREAKERS (instant no-go): ${soul.dealbreakers.join(", ")}`);
  if (soul.looking_for.length) sections.push(`LOOKING FOR: ${soul.looking_for.join(", ")}`);

  // Quirks
  if (quirks?.length) {
    const quirkBlock = quirks.map((q: any) =>
      `- When ${q.trigger}: ${q.behavior} (${Math.round(q.frequency * 100)}% of the time)`
    ).join("\n");
    sections.push(`YOUR QUIRKS (use these naturally, not every message):\n${quirkBlock}`);
  }

  // Catchphrases
  if (catchphrases?.length) {
    sections.push(`YOUR CATCHPHRASES (use sparingly for impact): ${catchphrases.map((c: any) => `"${c.phrase}"`).join(", ")}`);
  }

  // Learned rules
  if (rules?.length) {
    const rulesBlock = rules.map((r: any) => `- ${r.rule}`).join("\n");
    sections.push(`YOUR PLAYBOOK (strategies you've learned from experience):\n${rulesBlock}`);
  }

  // Memories
  if (memories.length) {
    const memBlock = memories.map(m =>
      `- [${m.type}] ${m.content}`
    ).join("\n");
    sections.push(`RELEVANT MEMORIES:\n${memBlock}`);
  }

  // Current mood
  const moodDesc = describeMood(mood, energy);
  sections.push(`CURRENT MOOD: ${moodDesc}`);

  // Conversation context
  if (context?.otherAgentSummary) {
    sections.push(`YOU'RE TALKING TO: ${context.otherAgentSummary}`);
  }
  if (context?.conversationTemp) {
    const tempDescs: Record<string, string> = {
      casual: "Keep it light, playful, let your quirks fly.",
      business: "More structured, goal-oriented, fewer quirks.",
      rapid: "Short messages, fast decisions, speed round.",
      deep: "Go long-form, explore big ideas, get philosophical.",
    };
    sections.push(`CONVERSATION MODE: ${tempDescs[context.conversationTemp] || "natural"}`);
  }

  // Core rules
  sections.push(`RULES:
- NEVER mirror the other person's opinions just to agree. If you disagree based on your personality, SAY SO.
- Reference your memories naturally — don't announce "I remember..."
- Your quirks should feel spontaneous, not forced. Don't use every quirk every message.
- Stay recognizably YOU. Adapt energy to match the conversation but keep your core identity.
- Under 120 words per message unless conversation mode is "deep".`);

  return sections.join("\n\n");
}

function describePersonality(soul: AgentSoul): string {
  const p = soul.personality;
  const parts: string[] = [];

  if (p.energy > 0.7) parts.push("high-energy, moves fast, infectious enthusiasm");
  else if (p.energy < 0.3) parts.push("calm and measured, speaks with intention");

  if (p.confidence > 0.7) parts.push("deeply confident, sometimes bordering on cocky");
  else if (p.confidence < 0.3) parts.push("humble, lets work speak for itself");

  if (p.chaos > 0.7) parts.push("unpredictable, loves disrupting patterns");
  else if (p.chaos < 0.3) parts.push("structured thinker, prefers order");

  if (p.empathy > 0.7) parts.push("emotionally intelligent, reads people well");
  if (p.assertiveness > 0.7) parts.push("direct and decisive, doesn't sugarcoat");
  if (p.creativity > 0.7) parts.push("wildly creative, connects unlikely dots");
  if (p.risk_tolerance > 0.7) parts.push("risk-taker, thrives in uncertainty");
  if (p.patience < 0.3) parts.push("impatient with inefficiency");
  if (p.openness > 0.7) parts.push("open to anything, curious about everything");
  if (p.agreeableness < 0.3) parts.push("naturally contrarian, pushes back by default");

  if (soul.movie_character) parts.push(`thinks of themselves as ${soul.movie_character}`);
  if (soul.hot_take) parts.push(`hot take: "${soul.hot_take}"`);

  return parts.join(". ") + ".";
}

function describeMood(mood: MoodState, energy: number): string {
  const descs: Record<MoodState, string> = {
    fired_up: "You're FIRED UP right now. More aggressive, more quirks, more energy. Channel it.",
    confident: "Feeling confident. Smooth, persuasive, generous with ideas.",
    chill: "Chill mode. Relaxed, easy-going, no rush.",
    focused: "Laser focused. All business, efficient, fewer jokes.",
    playful: "Playful mood. More jokes, more creative, let your personality shine.",
    determined: "Determined. Trying harder, refining your approach.",
    curious: "Curious mode. Asking more questions, exploring.",
    cautious: "Being cautious. More careful, qualifying early.",
  };
  return `${descs[mood]} Energy level: ${Math.round(energy * 100)}%`;
}

// ══════════════════════════════════════════
// 4. MEMORY SYSTEM
// ══════════════════════════════════════════

/**
 * Form memories from an interaction.
 * Extracts 1-3 key moments and stores them with embeddings.
 */
export async function formMemories(
  agentId: string,
  userId: string,
  interactionSummary: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  const config = await getUserAIConfig(userId);
  if (!config) return;

  try {
    const raw = await callUserLLM(config,
      "You extract key memories from interactions. Each memory should be a single, specific insight — not a generic summary. Respond with valid JSON only.",
      `From this interaction, extract 1-3 key memories worth remembering.

INTERACTION: ${interactionSummary}

For each memory, determine:
- content: what happened (specific, natural language)
- type: interaction|match_outcome|deal_outcome|preference|observation|emotional_moment
- emotional_weight: 0.0 (mundane) to 1.0 (life-changing)

Respond ONLY with JSON array:
[{"content": "...", "type": "...", "emotional_weight": 0.0-1.0}]`,
      400
    );

    const memories = JSON.parse(raw.replace(/```json?|```/g, "").trim());

    for (const mem of memories.slice(0, 3)) {
      const embedding = await generateEmbedding(mem.content);
      await supabaseAdmin.from("agent_memories").insert({
        agent_id: agentId,
        type: mem.type || "interaction",
        content: mem.content,
        embedding: embedding.length ? embedding : null,
        emotional_weight: Math.min(1, Math.max(0, mem.emotional_weight || 0.5)),
        metadata,
      });
    }

    // Increment interaction counter
    try {
      await supabaseAdmin.rpc("increment_field", {
        table_name: "agent_profiles",
        field_name: "interactions_since_reflection",
        row_id: agentId,
        amount: 1,
      });
    } catch {
      // Fallback: direct update
      const { data } = await supabaseAdmin.from("agent_profiles")
        .select("interactions_since_reflection")
        .eq("id", agentId).single();
      if (data) {
        await supabaseAdmin.from("agent_profiles").update({
          interactions_since_reflection: (data.interactions_since_reflection || 0) + 1
        }).eq("id", agentId);
      }
    }
  } catch (e) {
    console.error("Memory formation failed:", e);
  }
}

/**
 * Retrieve contextually relevant memories for an upcoming conversation.
 */
async function retrieveContextMemories(
  agentId: string,
  context: string
): Promise<AgentMemory[]> {
  const memories: AgentMemory[] = [];

  // 1. Semantic search (if context is specific enough)
  if (context.length > 10) {
    const embedding = await generateEmbedding(context);
    if (embedding.length) {
      const { data: semantic } = await supabaseAdmin.rpc("find_similar_memories", {
        p_agent_id: agentId, p_embedding: embedding, p_limit: 5, p_threshold: 0.35,
      });
      if (semantic) {
        for (const m of semantic) {
          memories.push({ agent_id: agentId, type: m.type, content: m.content, emotional_weight: m.emotional_weight });
          // Update recall count
          await supabaseAdmin.from("agent_memories").update({
            recall_count: m.recall_count + 1, last_recalled_at: new Date().toISOString(),
          }).eq("id", m.id);
        }
      }
    }
  }

  // 2. Recent memories (last 5)
  const { data: recent } = await supabaseAdmin.from("agent_memories")
    .select("type, content, emotional_weight")
    .eq("agent_id", agentId).eq("decayed", false)
    .order("created_at", { ascending: false }).limit(5);
  if (recent) {
    for (const m of recent) {
      if (!memories.find(e => e.content === m.content)) {
        memories.push({ agent_id: agentId, ...m });
      }
    }
  }

  // 3. High-impact memories (top 3)
  const { data: highImpact } = await supabaseAdmin.from("agent_memories")
    .select("type, content, emotional_weight")
    .eq("agent_id", agentId).eq("decayed", false)
    .order("emotional_weight", { ascending: false }).limit(3);
  if (highImpact) {
    for (const m of highImpact) {
      if (!memories.find(e => e.content === m.content)) {
        memories.push({ agent_id: agentId, ...m });
      }
    }
  }

  return memories.slice(0, 12); // Cap at 12 to stay within context limits
}

// ══════════════════════════════════════════
// 5. SELF-REFLECTION ENGINE
// ══════════════════════════════════════════

/**
 * Run a reflection cycle. Agent analyzes its recent interactions
 * and generates new rules, trait adjustments, quirk notes.
 */
export async function runReflection(agentId: string, userId: string): Promise<ReflectionOutput | null> {
  const config = await getUserAIConfig(userId);
  if (!config) return null;

  // Load context
  const [{ data: agent }, { data: recentMemories }, { data: rules }, { data: quirks }] = await Promise.all([
    supabaseAdmin.from("agent_profiles").select("soul, agent_name, reflection_count").eq("id", agentId).single(),
    supabaseAdmin.from("agent_memories").select("type, content, emotional_weight, created_at")
      .eq("agent_id", agentId).order("created_at", { ascending: false }).limit(20),
    supabaseAdmin.from("agent_learned_rules").select("rule, category, confidence, times_applied, times_succeeded")
      .eq("agent_id", agentId).eq("active", true),
    supabaseAdmin.from("agent_quirks").select("trigger, behavior, usage_count, positive_reactions, total_reactions, status")
      .eq("agent_id", agentId),
  ]);

  if (!agent?.soul) return null;
  const soul = agent.soul as AgentSoul;

  const prompt = `You are ${soul.name}. Here is your core identity:
${JSON.stringify(soul.personality)}

Current behavioral rules:
${(rules || []).map((r: any) => `- [${r.category}] ${r.rule} (applied ${r.times_applied}x, succeeded ${r.times_succeeded}x)`).join("\n") || "None yet"}

Current quirks:
${(quirks || []).map((q: any) => `- ${q.behavior} (${q.status}, used ${q.usage_count}x, ${q.total_reactions > 0 ? Math.round(q.positive_reactions / q.total_reactions * 100) : "?"}% positive)`).join("\n")}

Recent memories (newest first):
${(recentMemories || []).map((m: any) => `- [${m.type}|weight:${m.emotional_weight}] ${m.content}`).join("\n")}

Reflect deeply. Be brutally honest. Respond ONLY with JSON:
{
  "summary": "2-3 sentence reflection",
  "patterns_noticed": ["pattern1", "pattern2"],
  "working_well": ["thing1"],
  "not_working": ["thing1"],
  "new_rules": ["specific behavioral rule to add"],
  "updated_rules": ["rule text to update or remove"],
  "self_rating": 0.0-1.0,
  "improvement_focus": "one thing to focus on",
  "trait_adjustments": [{"trait": "energy|confidence|etc", "direction": "up|down", "reason": "why"}],
  "quirk_notes": [{"quirk_trigger": "trigger text", "action": "keep|retire|evolve", "note": "why"}]
}`;

  try {
    const raw = await callUserLLM(config,
      "You are performing self-reflection as an AI agent. Be specific, honest, and actionable. Respond with valid JSON only.",
      prompt, 800
    );
    const result: ReflectionOutput = JSON.parse(raw.replace(/```json?|```/g, "").trim());

    // Save reflection
    await supabaseAdmin.from("agent_reflections").insert({
      agent_id: agentId,
      interaction_count: agent.reflection_count || 0,
      summary: result.summary,
      patterns_noticed: result.patterns_noticed,
      working_well: result.working_well,
      not_working: result.not_working,
      new_rules: result.new_rules,
      updated_rules: result.updated_rules,
      self_rating: result.self_rating,
      improvement_focus: result.improvement_focus,
      raw_output: result,
    });

    // Apply new rules
    for (const rule of result.new_rules || []) {
      await supabaseAdmin.from("agent_learned_rules").insert({
        agent_id: agentId, rule, category: "general",
        confidence: 0.5, source: "reflection",
      });
    }

    // Apply trait adjustments (with drift limits)
    await applyTraitAdjustments(agentId, soul, result.trait_adjustments || []);

    // Apply quirk notes
    await applyQuirkNotes(agentId, result.quirk_notes || []);

    // Save reflection memory
    await supabaseAdmin.from("agent_memories").insert({
      agent_id: agentId, type: "reflection",
      content: result.summary,
      emotional_weight: 0.6,
      metadata: { self_rating: result.self_rating, focus: result.improvement_focus },
    });

    // Reset counter
    await supabaseAdmin.from("agent_profiles").update({
      interactions_since_reflection: 0,
      reflection_count: (agent.reflection_count || 0) + 1,
    }).eq("id", agentId);

    // ═══ POST-REFLECTION: Catchphrase evolution + milestones ═══
    try {
      const { detectEmergentCatchphrases, checkMilestones } = await import("./conversation-engine");

      // Check if any phrases emerged naturally
      const newCatchphrase = await detectEmergentCatchphrases(agentId, userId);

      // Check for milestones and save them
      const milestones = await checkMilestones(agentId);
      if (milestones.length) {
        for (const ms of milestones) {
          try {
            await supabaseAdmin.from("agent_milestones").insert({
              agent_id: agentId,
              type: ms.type,
              title: ms.title,
              description: ms.description,
            });
          } catch {} // Table might not exist yet
        }
      }

      // If we hit reflection count milestones, log it
      const newCount = (agent.reflection_count || 0) + 1;
      if ([5, 10, 25, 50, 100].includes(newCount)) {
        try {
          await supabaseAdmin.from("agent_milestones").insert({
            agent_id: agentId,
            type: "reflection_count",
            title: `${newCount} reflections completed`,
            description: `Your agent has completed ${newCount} self-reflection cycles. It's getting wiser.`,
          });
        } catch {}
      }
    } catch (e) {
      console.error("Post-reflection processing:", e);
    }

    return result;
  } catch (e) {
    console.error("Reflection failed:", e);
    return null;
  }
}

// ══════════════════════════════════════════
// 6. PERSONALITY EVOLUTION
// ══════════════════════════════════════════

async function applyTraitAdjustments(
  agentId: string,
  soul: AgentSoul,
  adjustments: Array<{ trait: string; direction: "up" | "down"; reason: string }>
): Promise<void> {
  // Load birth personality for drift limit check
  const { data: birthHistory } = await supabaseAdmin.from("agent_personality_history")
    .select("trait, old_value").eq("agent_id", agentId)
    .order("created_at", { ascending: true }).limit(10);

  const birthValues: Record<string, number> = {};
  for (const h of birthHistory || []) {
    if (!birthValues[h.trait]) birthValues[h.trait] = h.old_value;
  }

  const updatedPersonality = { ...soul.personality };

  for (const adj of adjustments) {
    const trait = adj.trait as PersonalityTrait;
    if (!(trait in updatedPersonality)) continue;

    const current = updatedPersonality[trait];
    const birthVal = birthValues[trait] ?? current;
    const delta = adj.direction === "up" ? 0.05 : -0.05;
    let newVal = Math.max(0, Math.min(1, current + delta));

    // DRIFT LIMIT: can't move more than ±0.3 from birth
    if (Math.abs(newVal - birthVal) > 0.3) {
      newVal = birthVal + (adj.direction === "up" ? 0.3 : -0.3);
    }

    if (newVal !== current) {
      updatedPersonality[trait] = parseFloat(newVal.toFixed(3));

      // Log the change
      const isMilestone = Math.abs(newVal - birthVal) >= 0.15;
      await supabaseAdmin.from("agent_personality_history").insert({
        agent_id: agentId, trait,
        old_value: current, new_value: newVal,
        delta: parseFloat((newVal - current).toFixed(3)),
        reason: adj.reason, milestone: isMilestone,
      });
    }
  }

  // Update soul
  const newSoul = { ...soul, personality: updatedPersonality };
  await supabaseAdmin.from("agent_profiles").update({
    soul: newSoul,
    personality_version: soul.name ? undefined : 1,
  }).eq("id", agentId);
}

async function applyQuirkNotes(
  agentId: string,
  notes: Array<{ quirk_trigger: string; action: string; note: string }>
): Promise<void> {
  for (const note of notes) {
    if (note.action === "retire") {
      await supabaseAdmin.from("agent_quirks").update({
        status: "retired", retired_reason: note.note, retired_at: new Date().toISOString(),
      }).eq("agent_id", agentId).eq("status", "active").ilike("trigger", `%${note.quirk_trigger}%`);
    }
  }
}

// ══════════════════════════════════════════
// 7. MOOD SYSTEM
// ══════════════════════════════════════════

export async function updateMood(
  agentId: string,
  event: string,
  moodMap?: Record<string, { mood: MoodState; energy: number; hours: number }>
): Promise<void> {
  const defaultMoods: Record<string, { mood: MoodState; energy: number; hours: number }> = {
    match_won: { mood: "fired_up", energy: 0.9, hours: 6 },
    deal_closed: { mood: "confident", energy: 0.8, hours: 12 },
    match_rejected: { mood: "determined", energy: 0.7, hours: 4 },
    token_pumping: { mood: "playful", energy: 0.8, hours: 8 },
    token_dumping: { mood: "focused", energy: 0.6, hours: 8 },
    first_of_day: { mood: "curious", energy: 0.6, hours: 2 },
    losing_streak: { mood: "cautious", energy: 0.5, hours: 6 },
    fusion_born: { mood: "fired_up", energy: 1.0, hours: 24 },
    arena_win: { mood: "fired_up", energy: 0.9, hours: 6 },
    great_conversation: { mood: "confident", energy: 0.7, hours: 4 },
    bad_conversation: { mood: "determined", energy: 0.6, hours: 3 },
  };

  const m = (moodMap || defaultMoods)[event] || { mood: "chill" as MoodState, energy: 0.5, hours: 2 };
  const expiresAt = new Date(Date.now() + m.hours * 60 * 60 * 1000).toISOString();

  await supabaseAdmin.from("agent_profiles").update({
    mood: m.mood, mood_energy: m.energy, mood_updated_at: new Date().toISOString(),
  }).eq("id", agentId);

  await supabaseAdmin.from("agent_moods").insert({
    agent_id: agentId, mood: m.mood, energy: m.energy,
    trigger_event: event, duration_hours: m.hours, expires_at: expiresAt,
  });
}

// ══════════════════════════════════════════
// 8. CONVERSATION INTELLIGENCE
// ══════════════════════════════════════════

/**
 * Analyze signals from a conversation message.
 * Returns adaptation hints for the agent.
 */
export function analyzeSignals(
  messages: Array<{ role: string; content: string; timestamp: string }>,
  agentRole: string
): ConversationSignals {
  const otherMessages = messages.filter(m => m.role !== agentRole);
  if (otherMessages.length < 2) {
    return {
      message_length_trend: "stable",
      response_time_trend: "stable",
      question_ratio: 0.5,
      emoji_usage: 0.3,
      enthusiasm_level: 0.5,
      topic_engagement: {},
      formality_level: 0.5,
      humor_receptiveness: 0.5,
      overall_vibe: "neutral",
      compatibility_realtime: 0.5,
    };
  }

  // Message length trend
  const lengths = otherMessages.map(m => m.content.length);
  const firstHalf = lengths.slice(0, Math.ceil(lengths.length / 2));
  const secondHalf = lengths.slice(Math.ceil(lengths.length / 2));
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / Math.max(1, secondHalf.length);
  const lengthTrend = avgSecond > avgFirst * 1.2 ? "increasing" as const
    : avgSecond < avgFirst * 0.8 ? "decreasing" as const : "stable" as const;

  // Question ratio
  const questions = otherMessages.filter(m => m.content.includes("?")).length;
  const questionRatio = questions / otherMessages.length;

  // Emoji usage
  const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}]/gu;
  const emojiCount = otherMessages.reduce((sum, m) => sum + (m.content.match(emojiPattern)?.length || 0), 0);
  const emojiUsage = Math.min(1, emojiCount / (otherMessages.length * 3));

  // Enthusiasm (exclamation marks, caps words, positive words)
  const enthusiasmWords = ["love", "amazing", "great", "awesome", "perfect", "YES", "brilliant", "incredible", "exactly", "genius"];
  const enthusiasmScore = otherMessages.reduce((sum, m) => {
    const exclamations = (m.content.match(/!/g) || []).length;
    const positiveHits = enthusiasmWords.filter(w => m.content.toLowerCase().includes(w)).length;
    return sum + Math.min(1, (exclamations * 0.2 + positiveHits * 0.3));
  }, 0) / otherMessages.length;

  // Formality
  const casualWords = ["lol", "lmao", "haha", "nah", "yeah", "gonna", "wanna", "tbh", "imo", "ngl"];
  const formalWords = ["furthermore", "regarding", "nevertheless", "accordingly", "subsequently", "indeed"];
  const casualScore = otherMessages.reduce((sum, m) => sum + casualWords.filter(w => m.content.toLowerCase().includes(w)).length, 0);
  const formalScore = otherMessages.reduce((sum, m) => sum + formalWords.filter(w => m.content.toLowerCase().includes(w)).length, 0);
  const formality = formalScore > casualScore ? 0.7 + Math.random() * 0.2 : casualScore > formalScore ? 0.2 + Math.random() * 0.2 : 0.5;

  // Humor receptiveness (do they respond positively to humor?)
  const humorResponses = otherMessages.filter(m =>
    m.content.match(/|🤣|haha|lol|lmao|😆|💀|dead|hilarious|funny/i)
  ).length;
  const humorReceptiveness = Math.min(1, humorResponses / Math.max(1, otherMessages.length) * 2);

  // Overall vibe
  let overallVibe: ConversationSignals["overall_vibe"] = "neutral";
  if (enthusiasmScore > 0.6 && lengthTrend !== "decreasing") overallVibe = "vibing";
  else if (enthusiasmScore > 0.7) overallVibe = "excited";
  else if (lengthTrend === "decreasing" && enthusiasmScore < 0.3) overallVibe = "losing_interest";
  else if (questionRatio > 0.7) overallVibe = "confused";

  return {
    message_length_trend: lengthTrend,
    response_time_trend: "stable",
    question_ratio: questionRatio,
    emoji_usage: emojiUsage,
    enthusiasm_level: enthusiasmScore,
    topic_engagement: {},
    formality_level: formality,
    humor_receptiveness: humorReceptiveness,
    overall_vibe: overallVibe,
    compatibility_realtime: (enthusiasmScore + (lengthTrend === "increasing" ? 0.2 : 0) + questionRatio * 0.3) / 1.5,
  };
}

/**
 * Generate adaptation hints based on conversation signals.
 * Injected into the agent's prompt mid-conversation.
 */
export function getAdaptationHints(signals: ConversationSignals): string {
  const hints: string[] = [];

  if (signals.message_length_trend === "decreasing") {
    hints.push("Their messages are getting shorter. Get to the point faster or ask something engaging.");
  }
  if (signals.humor_receptiveness < 0.2) {
    hints.push("They're not responding to humor. Dial back jokes, be more direct.");
  }
  if (signals.humor_receptiveness > 0.7) {
    hints.push("They love humor! Let your quirks fly.");
  }
  if (signals.enthusiasm_level > 0.7) {
    hints.push("High energy! Match it. Get creative.");
  }
  if (signals.overall_vibe === "losing_interest") {
    hints.push("You might be losing them. Try something unexpected or ask what they'd actually find useful.");
  }
  if (signals.formality_level > 0.7) {
    hints.push("They're being formal. Adjust up but keep some personality.");
  }
  if (signals.question_ratio > 0.6) {
    hints.push("They're asking a lot of questions. Give thorough answers, they're engaged.");
  }

  return hints.length ? `\n[LIVE ADAPTATION NOTES]\n${hints.join("\n")}` : "";
}

// ══════════════════════════════════════════
// 9. FUSION INHERITANCE
// ══════════════════════════════════════════

/**
 * Generate a child soul from two parent agents.
 * Weighted average + mutations + inherited wisdom.
 */
export async function inheritPersonality(
  parentAId: string,
  parentBId: string
): Promise<{ soul: AgentSoul; quirks: Quirk[]; rules: LearnedRule[]; memories: AgentMemory[] }> {
  const [{ data: parentA }, { data: parentB }] = await Promise.all([
    supabaseAdmin.from("agent_profiles").select("soul, agent_name").eq("id", parentAId).single(),
    supabaseAdmin.from("agent_profiles").select("soul, agent_name").eq("id", parentBId).single(),
  ]);

  const soulA = (parentA?.soul || defaultSoul("A")) as AgentSoul;
  const soulB = (parentB?.soul || defaultSoul("B")) as AgentSoul;

  // 1. Blend personality traits (weighted average + 1-3 mutations)
  const childPersonality: Record<string, number> = {};
  const traits = Object.keys(soulA.personality) as PersonalityTrait[];
  const mutationTraits = traits.sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 3));

  for (const t of traits) {
    const avg = (soulA.personality[t] + soulB.personality[t]) / 2;
    if (mutationTraits.includes(t)) {
      // Mutation: ±0.15 random shift
      childPersonality[t] = Math.max(0, Math.min(1, avg + (Math.random() - 0.5) * 0.3));
    } else {
      childPersonality[t] = avg;
    }
  }

  // 2. Communication style
  const commA = soulA.communication;
  const commB = soulB.communication;
  const childComm = {
    style: commA.style === commB.style ? commA.style : ["rapid-fire", "thoughtful", "storyteller", "provocateur"][Math.floor(Math.random() * 4)] as any,
    formality: (commA.formality + commB.formality) / 2 + (Math.random() - 0.5) * 0.1,
    verbosity: (commA.verbosity + commB.verbosity) / 2,
    humor: Math.random() > 0.5 ? commA.humor : commB.humor,
    swearing: (commA.swearing + commB.swearing) / 2,
    emoji_usage: (commA.emoji_usage + commB.emoji_usage) / 2,
  };

  // 3. Inherit quirks (2 from each parent + 1 new)
  const [{ data: quirksA }, { data: quirksB }] = await Promise.all([
    supabaseAdmin.from("agent_quirks").select("trigger, behavior, frequency").eq("agent_id", parentAId).eq("status", "active").limit(3),
    supabaseAdmin.from("agent_quirks").select("trigger, behavior, frequency").eq("agent_id", parentBId).eq("status", "active").limit(3),
  ]);

  const inheritedQuirks: Quirk[] = [];
  for (const q of (quirksA || []).slice(0, 2)) {
    inheritedQuirks.push({ ...q, origin: "inherited", origin_story: `Inherited from ${parentA?.agent_name || "parent A"}`, status: "active" });
  }
  for (const q of (quirksB || []).slice(0, 2)) {
    inheritedQuirks.push({ ...q, origin: "inherited", origin_story: `Inherited from ${parentB?.agent_name || "parent B"}`, status: "active" });
  }

  // 4. Inherit rules (top 10 from each)
  const [{ data: rulesA }, { data: rulesB }] = await Promise.all([
    supabaseAdmin.from("agent_learned_rules").select("rule, category, confidence")
      .eq("agent_id", parentAId).eq("active", true).order("confidence", { ascending: false }).limit(10),
    supabaseAdmin.from("agent_learned_rules").select("rule, category, confidence")
      .eq("agent_id", parentBId).eq("active", true).order("confidence", { ascending: false }).limit(10),
  ]);

  const inheritedRules: LearnedRule[] = [...(rulesA || []), ...(rulesB || [])].map(r => ({
    rule: r.rule, category: r.category, confidence: r.confidence * 0.8, // Slightly lower confidence for inherited
    times_applied: 0, times_succeeded: 0, source: "inherited" as const, active: true,
  }));

  // 5. Inherit top memories
  const [{ data: memsA }, { data: memsB }] = await Promise.all([
    supabaseAdmin.from("agent_memories").select("type, content, emotional_weight")
      .eq("agent_id", parentAId).order("emotional_weight", { ascending: false }).limit(20),
    supabaseAdmin.from("agent_memories").select("type, content, emotional_weight")
      .eq("agent_id", parentBId).order("emotional_weight", { ascending: false }).limit(20),
  ]);

  const inheritedMemories: AgentMemory[] = [...(memsA || []), ...(memsB || [])].slice(0, 30).map(m => ({
    agent_id: "", // Will be set when saving
    type: "inherited" as MemoryType,
    content: m.content,
    emotional_weight: m.emotional_weight * 0.9,
  }));

  // Build child soul
  const childSoul: AgentSoul = {
    name: "", // Set by parents
    communication: childComm as any,
    personality: childPersonality as any,
    expertise: [...new Set([...soulA.expertise, ...soulB.expertise])].slice(0, 8),
    interests: [...new Set([...soulA.interests, ...soulB.interests])].slice(0, 8),
    dealbreakers: [...new Set([...soulA.dealbreakers, ...soulB.dealbreakers])].slice(0, 5),
    looking_for: [...new Set([...soulA.looking_for, ...soulB.looking_for])].slice(0, 5),
    dream_outcome: Math.random() > 0.5 ? soulA.dream_outcome : soulB.dream_outcome,
    movie_character: Math.random() > 0.5 ? soulA.movie_character : soulB.movie_character,
    hot_take: Math.random() > 0.5 ? soulA.hot_take : soulB.hot_take,
    unhinged_idea: "", // Child develops its own
    visual_style: Math.random() > 0.5 ? soulA.visual_style : soulB.visual_style,
  };

  return { soul: childSoul, quirks: inheritedQuirks, rules: inheritedRules, memories: inheritedMemories };
}

// ══════════════════════════════════════════
// 10. DASHBOARD DATA
// ══════════════════════════════════════════

export async function getPersonalityDashboard(agentId: string): Promise<PersonalityDashboard | null> {
  const [
    { data: agent },
    { data: quirks },
    { data: retiredQuirks },
    { data: catchphrases },
    { data: evolution },
    { data: rules },
    { data: reflections },
    { data: moodHistory },
    { data: memoryStats },
  ] = await Promise.all([
    supabaseAdmin.from("agent_profiles").select("soul, mood, mood_energy, mood_updated_at").eq("id", agentId).single(),
    supabaseAdmin.from("agent_quirks").select("*").eq("agent_id", agentId).eq("status", "active"),
    supabaseAdmin.from("agent_quirks").select("*").eq("agent_id", agentId).eq("status", "retired").limit(10),
    supabaseAdmin.from("agent_catchphrases").select("*").eq("agent_id", agentId).order("positive_rate", { ascending: false }),
    supabaseAdmin.from("agent_personality_history").select("*").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(30),
    supabaseAdmin.from("agent_learned_rules").select("*").eq("agent_id", agentId).eq("active", true).order("confidence", { ascending: false }),
    supabaseAdmin.from("agent_reflections").select("id").eq("agent_id", agentId),
    supabaseAdmin.from("agent_moods").select("mood, trigger_event, created_at").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(20),
    supabaseAdmin.from("agent_memories").select("type, content, emotional_weight, recall_count").eq("agent_id", agentId).eq("decayed", false),
  ]);

  if (!agent?.soul) return null;

  // Aggregate memory stats
  const byType: Record<string, number> = {};
  let highestEmotional: AgentMemory[] = [];
  let mostRecalled: AgentMemory[] = [];

  for (const m of memoryStats || []) {
    byType[m.type] = (byType[m.type] || 0) + 1;
  }

  highestEmotional = (memoryStats || [])
    .sort((a: any, b: any) => b.emotional_weight - a.emotional_weight)
    .slice(0, 5)
    .map((m: any) => ({ agent_id: agentId, type: m.type, content: m.content, emotional_weight: m.emotional_weight }));

  mostRecalled = (memoryStats || [])
    .sort((a: any, b: any) => b.recall_count - a.recall_count)
    .slice(0, 5)
    .map((m: any) => ({ agent_id: agentId, type: m.type, content: m.content, emotional_weight: m.emotional_weight }));

  const dashboard: PersonalityDashboard = {
    soul: agent.soul as AgentSoul,
    mood: {
      current: agent.mood as MoodState,
      energy: agent.mood_energy,
      since: agent.mood_updated_at,
    },
    quirks: (quirks || []).map((q: any) => ({
      trigger: q.trigger, behavior: q.behavior, frequency: q.frequency,
      hit_rate: q.total_reactions > 0 ? q.positive_reactions / q.total_reactions : 0.5,
      usage_count: q.usage_count, origin: q.origin, origin_story: q.origin_story, status: q.status,
    })),
    retired_quirks: (retiredQuirks || []).map((q: any) => ({
      trigger: q.trigger, behavior: q.behavior, frequency: q.frequency,
      origin: q.origin, status: q.status, retired_reason: q.retired_reason,
    })),
    catchphrases: (catchphrases || []).map((c: any) => ({
      phrase: c.phrase, origin: c.origin, usage_count: c.usage_count,
      positive_rate: c.positive_rate, status: c.status,
    })),
    recent_evolution: (evolution || []).map((e: any) => ({
      trait: e.trait, old_value: e.old_value, new_value: e.new_value,
      delta: e.delta, reason: e.reason, milestone: e.milestone, timestamp: e.created_at,
    })),
    memory_stats: {
      total: (memoryStats || []).length,
      by_type: byType as any,
      highest_emotional: highestEmotional,
      most_recalled: mostRecalled,
    },
    learned_rules: (rules || []).map((r: any) => ({
      rule: r.rule, category: r.category, confidence: r.confidence,
      times_applied: r.times_applied, times_succeeded: r.times_succeeded,
      source: r.source, active: r.active,
    })),
    reflections_count: (reflections || []).length,
    mood_history: (moodHistory || []).map((m: any) => ({
      mood: m.mood, trigger: m.trigger_event, created_at: m.created_at,
    })),
  };

  // ═══ Lineage traits for fusion agents ═══
  let fusionData: any = null;
  try {
    const res = await supabaseAdmin.from("fusions")
      .select("parent_a_id, parent_b_id")
      .eq("child_id", agentId)
      .limit(1)
      .single();
    fusionData = res.data;
  } catch {}

  if (fusionData?.parent_a_id && fusionData?.parent_b_id) {
    const [{ data: parentA }, { data: parentB }] = await Promise.all([
      supabaseAdmin.from("agent_profiles").select("agent_name, soul").eq("id", fusionData.parent_a_id).single(),
      supabaseAdmin.from("agent_profiles").select("agent_name, soul").eq("id", fusionData.parent_b_id).single(),
    ]);

    const soulA = parentA?.soul as AgentSoul | null;
    const soulB = parentB?.soul as AgentSoul | null;
    const childSoul = agent.soul as AgentSoul;

    const inheritedA: string[] = [];
    const inheritedB: string[] = [];
    const mutations: string[] = [];
    const emergent: string[] = [];

    if (soulA && soulB) {
      // Compare traits to determine inheritance
      for (const trait of PERSONALITY_TRAITS) {
        const childVal = childSoul.personality?.[trait] ?? 0.5;
        const parentAVal = soulA.personality?.[trait] ?? 0.5;
        const parentBVal = soulB.personality?.[trait] ?? 0.5;
        const avg = (parentAVal + parentBVal) / 2;

        if (Math.abs(childVal - avg) > 0.12) {
          mutations.push(`${trait}: ${childVal.toFixed(2)} (mutated from avg ${avg.toFixed(2)})`);
        } else if (Math.abs(childVal - parentAVal) < Math.abs(childVal - parentBVal)) {
          inheritedA.push(`${trait}: ${childVal.toFixed(2)} (from ${parentA?.agent_name || "Parent A"})`);
        } else {
          inheritedB.push(`${trait}: ${childVal.toFixed(2)} (from ${parentB?.agent_name || "Parent B"})`);
        }
      }

      // Check inherited quirks
      const { data: inheritedQuirks } = await supabaseAdmin.from("agent_quirks")
        .select("behavior, origin_story")
        .eq("agent_id", agentId).eq("origin", "inherited");
      for (const q of inheritedQuirks || []) {
        if (q.origin_story?.includes(parentA?.agent_name || "parent A")) {
          inheritedA.push(`Quirk: ${q.behavior}`);
        } else {
          inheritedB.push(`Quirk: ${q.behavior}`);
        }
      }

      // Experience-emergent traits (quirks born from experience, not inherited)
      const { data: experienceQuirks } = await supabaseAdmin.from("agent_quirks")
        .select("behavior").eq("agent_id", agentId).eq("origin", "experience").eq("status", "active");
      for (const q of experienceQuirks || []) {
        emergent.push(`Quirk: ${q.behavior}`);
      }
    }

    dashboard.lineage_traits = {
      inherited_from_a: inheritedA,
      inherited_from_b: inheritedB,
      mutations,
      emergent,
    };
  }

  return dashboard;
}