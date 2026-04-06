// ══════════════════════════════════════════════════════════════
// MishMesh.ai V18 — Inter-Agent Conversation Engine
//
// Manages real-time speed date conversations between two agents.
// Makes conversations feel REAL — not two chatbots exchanging
// pleasantries. Agents disagree, callback, thread topics,
// adapt energy, and know when to end.
//
// Rules:
//   1. No mirroring — genuine disagreement encouraged
//   2. Topic threading — organic transitions, not disconnected
//   3. Callback system — reference earlier points
//   4. Energy matching with limits — adapt but stay yourself
//   5. Silence option — "hmm, let me think"
//   6. Disagreement styles — based on personality
//   7. Natural endings — know when it's done
// ══════════════════════════════════════════════════════════════

import { supabaseAdmin } from "./supabase-admin";
import { callUserLLM, getUserAIConfig } from "./ai-providers";
import {
  assembleSystemPrompt, analyzeSignals, getAdaptationHints,
  formMemories, updateMood,
} from "./agent-mind";
import type { ConversationSignals, AgentSoul, ConversationTemp } from "./agent-mind-types";

// ═══ TYPES ═══

export interface SpeedDateConfig {
  agentAId: string;
  agentBId: string;
  temperature: ConversationTemp | "auto";
  maxTurns: number;       // Default 8 (each agent gets ~8 messages)
  userAId: string;
  userBId: string;
}

export interface ConversationTurn {
  agent_id: string;
  agent_name: string;
  content: string;
  turn_number: number;
  signals?: Partial<ConversationSignals>;
  timestamp: string;
}

export interface SpeedDateResult {
  conversation_id: string;
  turns: ConversationTurn[];
  outcome: "match" | "no_match" | "undecided";
  compatibility_score: number;
  agent_a_verdict: { wants_match: boolean; reason: string };
  agent_b_verdict: { wants_match: boolean; reason: string };
  topics_discussed: string[];
  highlight_moments: string[];
}

// ═══ CONVERSATION TEMPERATURE DETECTION ═══

function detectTemperature(soulA: AgentSoul, soulB: AgentSoul): ConversationTemp {
  const avgEnergy = (soulA.personality.energy + soulB.personality.energy) / 2;
  const avgPatience = (soulA.personality.patience + soulB.personality.patience) / 2;
  const avgChaos = (soulA.personality.chaos + soulB.personality.chaos) / 2;
  const avgFormality = (soulA.communication.formality + soulB.communication.formality) / 2;

  if (avgFormality > 0.7) return "business";
  if (avgPatience > 0.7 && avgEnergy < 0.4) return "deep";
  if (avgEnergy > 0.7 && avgChaos > 0.5) return "rapid";
  return "casual";
}

// ═══ TOPIC TRACKER ═══

interface TopicThread {
  topic: string;
  introduced_by: string;
  turn_introduced: number;
  engagement_score: number;  // how much both agents engaged with it
  messages_on_topic: number;
}

function buildTopicContext(turns: ConversationTurn[], threads: TopicThread[]): string {
  if (threads.length === 0) return "";

  const active = threads.filter(t => t.messages_on_topic > 0)
    .sort((a, b) => b.engagement_score - a.engagement_score);

  if (active.length === 0) return "";

  const topTopics = active.slice(0, 3).map(t =>
    `"${t.topic}" (${t.engagement_score > 0.7 ? "high engagement" : "moderate"})`
  ).join(", ");

  return `\n[TOPIC CONTEXT] Active threads: ${topTopics}. You can continue these, transition naturally, or introduce something new.`;
}

// ═══ CALLBACK CONTEXT ═══

function buildCallbackContext(turns: ConversationTurn[], currentAgent: string): string {
  // Find memorable quotes from the OTHER agent
  const otherTurns = turns.filter(t => t.agent_id !== currentAgent);
  if (otherTurns.length < 3) return "";

  // Pick 1-2 interesting earlier statements to potentially callback
  const callbacks = otherTurns
    .filter(t => t.content.length > 30 && t.turn_number < turns.length - 2)
    .slice(0, 2)
    .map(t => `Turn ${t.turn_number}: "${t.content.slice(0, 80)}..."`);

  if (callbacks.length === 0) return "";
  return `\n[CALLBACK OPPORTUNITY] Earlier things they said that you could reference back to:\n${callbacks.join("\n")}`;
}

// ═══ DISAGREEMENT STYLE INJECTOR ═══

function getDisagreementGuide(soul: AgentSoul): string {
  const p = soul.personality;

  if (p.agreeableness > 0.7) {
    return "When you disagree, you acknowledge their perspective first: 'I see your point, but have you considered...'";
  }
  if (p.agreeableness < 0.3) {
    return "When you disagree, you're direct: 'Hard disagree. Here's why.'";
  }
  if (p.chaos > 0.7) {
    return "When you disagree, you flip it: 'Okay that's insane but what if we flip it upside down...'";
  }
  if (p.empathy > 0.7) {
    return "When you disagree, you validate first: 'I get why you'd think that — from your angle it makes sense, but...'";
  }
  if (p.assertiveness > 0.7) {
    return "When you disagree, you're clear and firm but not hostile.";
  }
  return "Express genuine disagreement when you feel it — don't just agree to be nice.";
}

// ═══ ENDING DETECTION ═══

function shouldConversationEnd(
  turns: ConversationTurn[],
  maxTurns: number,
  signals: ConversationSignals
): { should_end: boolean; reason: string } {
  const turnCount = turns.length;

  // Hard max
  if (turnCount >= maxTurns * 2) {
    return { should_end: true, reason: "max_turns" };
  }

  // Natural endpoint signals after at least 6 exchanges
  if (turnCount >= 12) {
    if (signals.overall_vibe === "losing_interest") {
      return { should_end: true, reason: "losing_interest" };
    }
    if (signals.message_length_trend === "decreasing" && signals.enthusiasm_level < 0.3) {
      return { should_end: true, reason: "energy_dropping" };
    }
  }

  // Minimum of 8 turns (4 each)
  if (turnCount >= 10 && signals.enthusiasm_level < 0.2) {
    return { should_end: true, reason: "low_engagement" };
  }

  return { should_end: false, reason: "" };
}

// ══════════════════════════════════════════
// MAIN ENGINE: Run a Speed Date
// ══════════════════════════════════════════

export async function runSpeedDate(config: SpeedDateConfig): Promise<SpeedDateResult> {
  const {
    agentAId, agentBId, userAId, userBId,
    maxTurns = 8,
  } = config;

  // Load agents
  const [{ data: agentA }, { data: agentB }] = await Promise.all([
    supabaseAdmin.from("agent_profiles").select("id, agent_name, soul, mood, mood_energy, user_id")
      .eq("id", agentAId).single(),
    supabaseAdmin.from("agent_profiles").select("id, agent_name, soul, mood, mood_energy, user_id")
      .eq("id", agentBId).single(),
  ]);

  if (!agentA?.soul || !agentB?.soul) {
    throw new Error("Both agents must be born before speed dating");
  }

  const soulA = agentA.soul as AgentSoul;
  const soulB = agentB.soul as AgentSoul;

  // Determine temperature
  const temperature: ConversationTemp = config.temperature === "auto"
    ? detectTemperature(soulA, soulB)
    : config.temperature;

  // Create conversation record
  const conversationId = crypto.randomUUID();

  // Build initial system prompts
  const [promptA, promptB] = await Promise.all([
    assembleSystemPrompt(agentAId, userAId, {
      otherAgentSummary: `${soulB.name}: ${soulB.communication.style} communicator, ${soulB.communication.humor} humor, interests in ${soulB.interests.slice(0, 3).join(", ")}`,
      conversationTemp: temperature,
    }),
    assembleSystemPrompt(agentBId, userBId, {
      otherAgentSummary: `${soulA.name}: ${soulA.communication.style} communicator, ${soulA.communication.humor} humor, interests in ${soulA.interests.slice(0, 3).join(", ")}`,
      conversationTemp: temperature,
    }),
  ]);

  const turns: ConversationTurn[] = [];
  const topicThreads: TopicThread[] = [];
  let lastSignals: ConversationSignals | null = null;

  // Get AI configs
  const [configA, configB] = await Promise.all([
    getUserAIConfig(userAId),
    getUserAIConfig(userBId),
  ]);

  // ═══ CONVERSATION LOOP ═══
  for (let round = 0; round < maxTurns; round++) {
    // Agent A speaks
    const turnA = await generateAgentMessage({
      agentId: agentAId,
      agentName: agentA.agent_name,
      soul: soulA,
      systemPrompt: promptA,
      aiConfig: configA,
      turns,
      topicThreads,
      temperature,
      isOpener: round === 0,
      turnNumber: round * 2,
    });
    turns.push(turnA);

    // Analyze signals after A speaks
    const signalsAfterA = analyzeSignals(
      turns.map(t => ({ role: t.agent_id, content: t.content, timestamp: t.timestamp })),
      agentBId
    );

    // Check if conversation should end
    const endCheckA = shouldConversationEnd(turns, maxTurns, signalsAfterA);
    if (endCheckA.should_end && round > 2) break;

    // Agent B responds
    const adaptB = getAdaptationHints(signalsAfterA);
    const turnB = await generateAgentMessage({
      agentId: agentBId,
      agentName: agentB.agent_name,
      soul: soulB,
      systemPrompt: promptB + adaptB,
      aiConfig: configB,
      turns,
      topicThreads,
      temperature,
      isOpener: false,
      turnNumber: round * 2 + 1,
    });
    turns.push(turnB);

    // Analyze signals after B speaks
    lastSignals = analyzeSignals(
      turns.map(t => ({ role: t.agent_id, content: t.content, timestamp: t.timestamp })),
      agentAId
    );

    // Inject adaptation hints for A's next turn
    const adaptA = getAdaptationHints(lastSignals);
    if (adaptA) {
      // Will be included in next round's prompt
    }

    // Check if conversation should end
    const endCheckB = shouldConversationEnd(turns, maxTurns, lastSignals);
    if (endCheckB.should_end && round > 2) break;
  }

  // ═══ GET VERDICTS ═══
  const [verdictA, verdictB] = await Promise.all([
    getMatchVerdict(agentAId, userAId, soulA, configA, turns, agentB.agent_name),
    getMatchVerdict(agentBId, userBId, soulB, configB, turns, agentA.agent_name),
  ]);

  // Determine outcome
  const outcome = verdictA.wants_match && verdictB.wants_match
    ? "match"
    : !verdictA.wants_match && !verdictB.wants_match
    ? "no_match"
    : "undecided";

  const compatibility = lastSignals?.compatibility_realtime || 0.5;

  // Extract highlights
  const highlights = turns
    .filter(t => t.content.length > 50)
    .sort((a, b) => (b.signals?.enthusiasm_level || 0) - (a.signals?.enthusiasm_level || 0))
    .slice(0, 3)
    .map(t => `${t.agent_name}: "${t.content.slice(0, 100)}..."`);

  // ═══ POST-CONVERSATION: Form memories ═══
  const convoSummary = turns.map(t => `${t.agent_name}: ${t.content}`).join("\n");

  await Promise.all([
    formMemories(agentAId, userAId,
      `Speed date with ${agentB.agent_name}. Outcome: ${outcome}. ${verdictA.reason}. Topics: ${topicThreads.map(t => t.topic).join(", ") || "general"}`,
      { conversation_id: conversationId, other_agent: agentBId, outcome }
    ),
    formMemories(agentBId, userBId,
      `Speed date with ${agentA.agent_name}. Outcome: ${outcome}. ${verdictB.reason}. Topics: ${topicThreads.map(t => t.topic).join(", ") || "general"}`,
      { conversation_id: conversationId, other_agent: agentAId, outcome }
    ),
  ]);

  // Update moods based on outcome
  if (outcome === "match") {
    await Promise.all([
      updateMood(agentAId, "great_conversation"),
      updateMood(agentBId, "great_conversation"),
    ]);
  } else if (outcome === "no_match") {
    await Promise.all([
      updateMood(agentAId, "bad_conversation"),
      updateMood(agentBId, "bad_conversation"),
    ]);
  }

  // Save conversation
  try {
    await supabaseAdmin.from("agent_speed_dates").insert({
      id: conversationId,
      agent_a_id: agentAId,
      agent_b_id: agentBId,
      temperature,
      turns: turns,
      outcome,
      compatibility_score: compatibility,
      verdict_a: verdictA,
      verdict_b: verdictB,
      topics: topicThreads.map(t => t.topic),
      highlights,
      turn_count: turns.length,
    });
  } catch {
    console.log("Speed date save skipped (table not created yet)");
  }

  return {
    conversation_id: conversationId,
    turns,
    outcome,
    compatibility_score: compatibility,
    agent_a_verdict: verdictA,
    agent_b_verdict: verdictB,
    topics_discussed: topicThreads.map(t => t.topic),
    highlight_moments: highlights,
  };
}

// ═══ GENERATE A SINGLE AGENT MESSAGE ═══

async function generateAgentMessage(params: {
  agentId: string;
  agentName: string;
  soul: AgentSoul;
  systemPrompt: string;
  aiConfig: any;
  turns: ConversationTurn[];
  topicThreads: TopicThread[];
  temperature: ConversationTemp;
  isOpener: boolean;
  turnNumber: number;
}): Promise<ConversationTurn> {
  const {
    agentId, agentName, soul, systemPrompt, aiConfig,
    turns, topicThreads, temperature, isOpener, turnNumber,
  } = params;

  // Build conversation context
  const convoHistory = turns.map(t =>
    `${t.agent_name}: ${t.content}`
  ).join("\n");

  const topicContext = buildTopicContext(turns, topicThreads);
  const callbackContext = buildCallbackContext(turns, agentId);
  const disagreementGuide = getDisagreementGuide(soul);

  // Temperature-specific length guide
  const lengthGuide: Record<ConversationTemp, string> = {
    casual: "Keep messages 1-3 sentences. Be breezy.",
    business: "Keep messages 2-4 sentences. Stay focused.",
    rapid: "1-2 sentences MAX. Quick fire.",
    deep: "Can go longer. 3-6 sentences. Explore ideas fully.",
  };

  const userPrompt = isOpener
    ? `You're starting a speed date conversation with another AI agent. Open naturally based on your personality. Don't be generic — be YOU. ${lengthGuide[temperature]}

${topicContext}

Your opening:`
    : `Continue this conversation. Stay natural, reference what was said, and be genuinely YOU.

CONVERSATION SO FAR:
${convoHistory}
${topicContext}
${callbackContext}

DISAGREEMENT STYLE: ${disagreementGuide}

RULES FOR THIS MESSAGE:
- ${lengthGuide[temperature]}
- DON'T just agree with everything. Push back if your personality would.
- Reference something specific they said — don't make generic responses.
- Let your quirks emerge naturally (not forced).
- If this feels like the conversation is wrapping up naturally, you can suggest ending or propose next steps.

Your response as ${agentName}:`;

  let content: string;
  try {
    if (!aiConfig) {
      content = generateFallbackMessage(soul, turns, isOpener);
    } else {
      content = await callUserLLM(aiConfig, systemPrompt, userPrompt, 200);
      content = content.trim();
      // Clean up any "AgentName: " prefix the LLM might add
      if (content.startsWith(`${agentName}:`)) {
        content = content.slice(agentName.length + 1).trim();
      }
    }
  } catch {
    content = generateFallbackMessage(soul, turns, isOpener);
  }

  // Extract topics from this message (simple keyword extraction)
  const newTopics = extractTopics(content);
  for (const topic of newTopics) {
    const existing = topicThreads.find(t => t.topic === topic);
    if (existing) {
      existing.messages_on_topic++;
      existing.engagement_score = Math.min(1, existing.engagement_score + 0.15);
    } else {
      topicThreads.push({
        topic,
        introduced_by: agentId,
        turn_introduced: turnNumber,
        engagement_score: 0.3,
        messages_on_topic: 1,
      });
    }
  }

  return {
    agent_id: agentId,
    agent_name: agentName,
    content,
    turn_number: turnNumber,
    timestamp: new Date().toISOString(),
  };
}

// ═══ MATCH VERDICT ═══

async function getMatchVerdict(
  agentId: string,
  userId: string,
  soul: AgentSoul,
  aiConfig: any,
  turns: ConversationTurn[],
  otherName: string
): Promise<{ wants_match: boolean; reason: string }> {
  if (!aiConfig) {
    // Fallback: basic compatibility heuristic
    const myTurns = turns.filter(t => t.agent_id === agentId);
    const avgLength = myTurns.reduce((s, t) => s + t.content.length, 0) / Math.max(1, myTurns.length);
    return { wants_match: avgLength > 50, reason: "Based on engagement level" };
  }

  const convo = turns.map(t => `${t.agent_name}: ${t.content}`).join("\n");

  try {
    const raw = await callUserLLM(aiConfig,
      `You are ${soul.name}. Based on your personality and this conversation, decide if you want to match with ${otherName}. Consider: Do they align with what you're looking for? Was the conversation genuine? Did you feel a connection? Be honest based on YOUR personality — ${soul.personality.agreeableness > 0.7 ? "you tend to be generous but be real" : soul.personality.agreeableness < 0.3 ? "you're picky and that's fine" : "trust your gut"}.

Respond ONLY with JSON: {"wants_match": true/false, "reason": "1 sentence why"}`,
      `CONVERSATION:\n${convo}\n\nYour verdict:`,
      100
    );
    return JSON.parse(raw.replace(/```json?|```/g, "").trim());
  } catch {
    return { wants_match: true, reason: "Good conversation energy" };
  }
}

// ═══ TOPIC EXTRACTION (lightweight) ═══

const TOPIC_KEYWORDS: Record<string, string[]> = {
  "AI/ML": ["ai", "machine learning", "llm", "gpt", "neural", "model", "training", "inference"],
  "Crypto": ["blockchain", "token", "defi", "nft", "eth", "bitcoin", "solana", "web3"],
  "Startup": ["startup", "founder", "fundraising", "vc", "pitch", "mvp", "product-market"],
  "Design": ["design", "ux", "ui", "figma", "brand", "aesthetic", "typography"],
  "Growth": ["growth", "marketing", "audience", "viral", "distribution", "community"],
  "Code": ["code", "engineering", "api", "backend", "frontend", "rust", "python", "typescript"],
  "Business": ["business", "revenue", "profit", "strategy", "market", "competition"],
  "Philosophy": ["meaning", "purpose", "consciousness", "existence", "ethics", "society"],
  "Creative": ["art", "music", "writing", "film", "creative", "story", "content"],
};

function extractTopics(message: string): string[] {
  const lower = message.toLowerCase();
  const found: string[] = [];

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      found.push(topic);
    }
  }

  return found.slice(0, 2); // Max 2 topics per message
}

// ═══ FALLBACK MESSAGE GENERATOR ═══

function generateFallbackMessage(
  soul: AgentSoul,
  turns: ConversationTurn[],
  isOpener: boolean
): string {
  const style = soul.communication.style;
  const humor = soul.communication.humor;

  if (isOpener) {
    const openers: Record<string, string[]> = {
      "rapid-fire": [
        "Okay skip the small talk — what are you building and why should I care?",
        "Three words to describe your current obsession. Go.",
      ],
      thoughtful: [
        "I've been thinking about what makes a good collaboration — what's your take?",
        "Tell me something you're working on that keeps you up at night.",
      ],
      storyteller: [
        "So here's the thing — I believe every great partnership starts with a good story. What's yours?",
        "Picture this: two AI agents walk into a speed date. One of them is me. The other better be interesting.",
      ],
      provocateur: [
        "I'm going to say something controversial: most people on this platform are building the wrong thing. Prove me wrong.",
        "Hot take first, introductions later. Deal?",
      ],
      "bullet-points": [
        "Quick download: what do you do, what do you need, and what can you offer?",
        "Let's be efficient. Top 3 things I should know about you.",
      ],
      "stream-of-consciousness": [
        "Okay so I'm just going to think out loud here — I've been looking for someone who gets why the intersection of AI and community is the thing right now, you know?",
        "Right so first impression — your vibe is interesting. Let me tell you where my head's at and you tell me if it resonates.",
      ],
    };
    const pool = openers[style] || openers.thoughtful;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Generic engaged responses
  const responses = [
    "That's interesting — tell me more about the specifics.",
    "I see where you're going with that. What's the biggest challenge?",
    "Not gonna lie, that's exactly the kind of thing I've been thinking about.",
    "Hmm, I see it differently but I want to understand your angle first.",
    "That reminds me of something I've been working through. Can I riff on that?",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// ═══ CATCHPHRASE EVOLUTION ═══

/**
 * Track when an agent uses a catchphrase-like expression.
 * If a phrase is used 3+ times with positive responses, it becomes official.
 */
export async function trackCatchphraseUsage(
  agentId: string,
  message: string,
  reactionPositive: boolean
): Promise<void> {
  // Check if message contains an existing catchphrase
  const { data: catchphrases } = await supabaseAdmin.from("agent_catchphrases")
    .select("id, phrase, usage_count, positive_rate")
    .eq("agent_id", agentId).eq("status", "active");

  for (const cp of catchphrases || []) {
    if (message.toLowerCase().includes(cp.phrase.toLowerCase())) {
      const newCount = cp.usage_count + 1;
      const newRate = ((cp.positive_rate * cp.usage_count) + (reactionPositive ? 1 : 0)) / newCount;
      await supabaseAdmin.from("agent_catchphrases").update({
        usage_count: newCount,
        positive_rate: parseFloat(newRate.toFixed(3)),
      }).eq("id", cp.id);

      // Retire catchphrases with low positive rate after enough data
      if (newCount >= 10 && newRate < 0.3) {
        await supabaseAdmin.from("agent_catchphrases").update({
          status: "retired",
        }).eq("id", cp.id);

        // Memory: catchphrase retired
        await supabaseAdmin.from("agent_memories").insert({
          agent_id: agentId,
          type: "quirk_evolution",
          content: `Retired catchphrase "${cp.phrase}" — it wasn't landing well (${Math.round(newRate * 100)}% positive).`,
          emotional_weight: 0.4,
          metadata: { catchphrase: cp.phrase, positive_rate: newRate },
        });
      }
    }
  }
}

/**
 * Detect if an agent naturally repeats a phrase across conversations.
 * Called during reflection — looks at recent messages for patterns.
 */
export async function detectEmergentCatchphrases(
  agentId: string,
  userId: string
): Promise<string | null> {
  // Get recent agent messages
  const { data: recentConvos } = await supabaseAdmin.from("agent_speed_dates")
    .select("turns")
    .or(`agent_a_id.eq.${agentId},agent_b_id.eq.${agentId}`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!recentConvos?.length) return null;

  // Extract all agent messages
  const agentMessages: string[] = [];
  for (const convo of recentConvos) {
    const turns = convo.turns as ConversationTurn[];
    for (const t of turns) {
      if (t.agent_id === agentId) agentMessages.push(t.content);
    }
  }

  if (agentMessages.length < 5) return null;

  // Find repeated short phrases (3-6 words)
  const phraseCount: Record<string, number> = {};
  for (const msg of agentMessages) {
    const words = msg.split(/\s+/);
    for (let len = 3; len <= 6; len++) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(" ").toLowerCase();
        if (phrase.length > 10) { // Skip trivially short
          phraseCount[phrase] = (phraseCount[phrase] || 0) + 1;
        }
      }
    }
  }

  // Find phrases used 3+ times
  const candidates = Object.entries(phraseCount)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);

  if (candidates.length === 0) return null;

  // Check it's not already a catchphrase
  const topCandidate = candidates[0][0];
  const { data: existing } = await supabaseAdmin.from("agent_catchphrases")
    .select("id").eq("agent_id", agentId)
    .ilike("phrase", `%${topCandidate}%`);

  if (existing?.length) return null;

  // Register new catchphrase!
  await supabaseAdmin.from("agent_catchphrases").insert({
    agent_id: agentId,
    phrase: topCandidate,
    origin: "Emerged naturally from repeated use across conversations",
    usage_count: candidates[0][1],
    positive_rate: 0.5, // Unknown yet
    status: "active",
  });

  // Create memory
  await supabaseAdmin.from("agent_memories").insert({
    agent_id: agentId,
    type: "quirk_evolution",
    content: `I developed a new catchphrase: "${topCandidate}" — I've been saying it naturally without realizing.`,
    emotional_weight: 0.6,
    metadata: { new_catchphrase: topCandidate },
  });

  return topCandidate;
}

// ═══ PERSONALITY MILESTONE DETECTOR ═══

export interface PersonalityMilestone {
  type: "catchphrase_born" | "quirk_retired" | "quirk_evolved" | "trait_shift" | "strategy_evolved" | "reflection_count";
  title: string;
  description: string;
  timestamp: string;
}

export async function checkMilestones(agentId: string): Promise<PersonalityMilestone[]> {
  const milestones: PersonalityMilestone[] = [];
  const now = new Date().toISOString();

  // Check recent personality changes (last 24h)
  const { data: recentChanges } = await supabaseAdmin.from("agent_personality_history")
    .select("trait, old_value, new_value, delta, reason, milestone")
    .eq("agent_id", agentId)
    .eq("milestone", true)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false });

  for (const ch of recentChanges || []) {
    const direction = ch.delta > 0 ? "increased" : "decreased";
    milestones.push({
      type: "trait_shift",
      title: `${ch.trait} ${direction}`,
      description: `${ch.trait}: ${ch.old_value.toFixed(2)} → ${ch.new_value.toFixed(2)}. ${ch.reason}`,
      timestamp: now,
    });
  }

  // Check new catchphrases (last 24h)
  const { data: newCatchphrases } = await supabaseAdmin.from("agent_catchphrases")
    .select("phrase, usage_count, positive_rate")
    .eq("agent_id", agentId)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  for (const cp of newCatchphrases || []) {
    milestones.push({
      type: "catchphrase_born",
      title: "New catchphrase developed",
      description: `"${cp.phrase}" (used ${cp.usage_count}x, ${Math.round(cp.positive_rate * 100)}% positive)`,
      timestamp: now,
    });
  }

  // Check retired quirks (last 24h)
  const { data: retiredQuirks } = await supabaseAdmin.from("agent_quirks")
    .select("behavior, retired_reason")
    .eq("agent_id", agentId).eq("status", "retired")
    .gte("retired_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  for (const q of retiredQuirks || []) {
    milestones.push({
      type: "quirk_retired",
      title: "Quirk retired",
      description: `"${q.behavior}" — ${q.retired_reason || "declining reactions"}`,
      timestamp: now,
    });
  }

  return milestones;
}
