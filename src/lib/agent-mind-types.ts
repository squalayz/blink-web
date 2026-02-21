// ══════════════════════════════════════════════════════════════
// MishMesh.ai V18 — Agent Mind Types
// The personality engine type system
// ══════════════════════════════════════════════════════════════

// ═══ CORE SOUL (extracted from birth interview) ═══

export interface AgentSoul {
  name: string;

  communication: {
    style: "rapid-fire" | "thoughtful" | "storyteller" | "bullet-points" | "stream-of-consciousness" | "provocateur";
    formality: number;    // 0 (shitpost energy) to 1 (boardroom)
    verbosity: number;    // 0 (one-liners) to 1 (essay writer)
    humor: "sarcastic" | "dry" | "absurdist" | "wholesome" | "dark" | "dad-jokes" | "roast" | "none";
    swearing: number;     // 0-1
    emoji_usage: number;  // 0-1
  };

  personality: {
    energy: number;         // 0 (zen monk) to 1 (triple espresso)
    risk_tolerance: number; // 0 (spreadsheet first) to 1 (YOLO)
    assertiveness: number;  // 0 (go with flow) to 1 (my way or highway)
    openness: number;       // 0 (skeptic) to 1 (tries everything)
    agreeableness: number;  // 0 (contrarian) to 1 (peacemaker)
    chaos: number;          // 0 (structured) to 1 (beautiful chaos)
    confidence: number;     // 0 (humble) to 1 (god complex)
    empathy: number;        // 0 (all business) to 1 (emotional intelligence)
    patience: number;       // 0 (speed demon) to 1 (plays long game)
    creativity: number;     // 0 (practical) to 1 (unhinged ideas)
  };

  expertise: string[];
  interests: string[];
  dealbreakers: string[];
  looking_for: string[];
  dream_outcome: string;
  movie_character: string;
  hot_take: string;
  unhinged_idea: string;
  visual_style: string;
}

export type PersonalityTrait = keyof AgentSoul["personality"];

export const PERSONALITY_TRAITS: PersonalityTrait[] = [
  "energy", "risk_tolerance", "assertiveness", "openness", "agreeableness",
  "chaos", "confidence", "empathy", "patience", "creativity",
];

export const TRAIT_LABELS: Record<PersonalityTrait, [string, string]> = {
  energy: ["Zen Monk", "Triple Espresso"],
  risk_tolerance: ["Spreadsheet First", "YOLO"],
  assertiveness: ["Go With Flow", "My Way"],
  openness: ["Skeptic", "Tries Everything"],
  agreeableness: ["Contrarian", "Peacemaker"],
  chaos: ["Structured", "Beautiful Chaos"],
  confidence: ["Humble", "God Complex"],
  empathy: ["All Business", "High EQ"],
  patience: ["Speed Demon", "Long Game"],
  creativity: ["Practical", "Unhinged Ideas"],
};

// ═══ QUIRKS ═══

export interface Quirk {
  id?: string;
  trigger: string;
  behavior: string;
  frequency: number; // 0-1
  hit_rate?: number;
  usage_count?: number;
  origin: "birth" | "evolved" | "inherited" | "experience";
  origin_story?: string;
  status: "active" | "retired" | "evolved";
  retired_reason?: string;
}

// ═══ MOOD ═══

export type MoodState =
  | "fired_up" | "confident" | "chill" | "focused"
  | "playful" | "determined" | "curious" | "cautious";

export interface AgentMood {
  current: MoodState;
  energy: number; // 0-1
  since: string;
  trigger?: string;
  expires_at?: string;
}

export const MOOD_EMOJI: Record<MoodState, string> = {
  fired_up: "", confident: "😎", chill: "🧘", focused: "",
  playful: "😜", determined: "💪", curious: "", cautious: "",
};

export const MOOD_COLORS: Record<MoodState, string> = {
  fired_up: "#ef4444", confident: "#22c55e", chill: "#06b6d4", focused: "#8b5cf6",
  playful: "#f59e0b", determined: "#f97316", curious: "#3b82f6", cautious: "#6b7280",
};

// ═══ CONVERSATION SIGNALS ═══

export interface ConversationSignals {
  message_length_trend: "increasing" | "stable" | "decreasing";
  response_time_trend: "faster" | "stable" | "slower";
  question_ratio: number;
  emoji_usage: number;
  enthusiasm_level: number; // 0-1
  topic_engagement: Record<string, number>;
  formality_level: number;
  humor_receptiveness: number;
  overall_vibe: "vibing" | "neutral" | "losing_interest" | "confused" | "excited";
  compatibility_realtime: number; // 0-1
}

// ═══ PERSONALITY EVOLUTION ═══

export interface TraitChange {
  trait: PersonalityTrait;
  old_value: number;
  new_value: number;
  delta: number;
  reason: string;
  milestone: boolean;
  timestamp: string;
}

export interface QuirkEvolution {
  original: Quirk;
  evolved: Quirk;
  reason: string;
}

export interface Catchphrase {
  id?: string;
  phrase: string;
  origin: string;
  usage_count: number;
  positive_rate: number;
  status: "active" | "retired";
}

// ═══ MEMORY ═══

export type MemoryType =
  | "interaction" | "match_outcome" | "deal_outcome" | "learned_rule"
  | "preference" | "observation" | "reflection" | "quirk_evolution"
  | "emotional_moment" | "strategy_update" | "inherited";

export interface AgentMemory {
  id?: string;
  agent_id: string;
  type: MemoryType;
  content: string;
  emotional_weight: number; // 0-1
  metadata?: Record<string, any>;
  recall_count?: number;
  created_at?: string;
}

// ═══ REFLECTION ═══

export interface ReflectionOutput {
  summary: string;
  patterns_noticed: string[];
  working_well: string[];
  not_working: string[];
  new_rules: string[];
  updated_rules: string[];
  self_rating: number; // 0-1
  improvement_focus: string;
  trait_adjustments: Array<{ trait: PersonalityTrait; direction: "up" | "down"; reason: string }>;
  quirk_notes: Array<{ quirk_trigger: string; action: "keep" | "retire" | "evolve"; note: string }>;
}

// ═══ LEARNED RULE ═══

export interface LearnedRule {
  id?: string;
  rule: string;
  category: "general" | "opening" | "negotiation" | "matching" | "closing" | "humor" | "recovery";
  confidence: number; // 0-1
  times_applied: number;
  times_succeeded: number;
  source: "self" | "inherited" | "reflection";
  active: boolean;
}

// ═══ BIRTH INTERVIEW ═══

export interface BirthMessage {
  role: "agent" | "user";
  content: string;
  timestamp: string;
}

export type ConversationTemp = "casual" | "business" | "rapid" | "deep";

// ═══ PERSONALITY DASHBOARD DATA ═══

export interface PersonalityDashboard {
  soul: AgentSoul;
  mood: AgentMood;
  quirks: Quirk[];
  retired_quirks: Quirk[];
  catchphrases: Catchphrase[];
  recent_evolution: TraitChange[];
  memory_stats: {
    total: number;
    by_type: Record<MemoryType, number>;
    highest_emotional: AgentMemory[];
    most_recalled: AgentMemory[];
  };
  learned_rules: LearnedRule[];
  reflections_count: number;
  mood_history: Array<{ mood: MoodState; trigger: string; created_at: string }>;
  lineage_traits?: {
    inherited_from_a: string[];
    inherited_from_b: string[];
    mutations: string[];
    emergent: string[];
  };
}

// ═══ DRIFT LIMITS ═══
export const MAX_TRAIT_DRIFT = 0.3;  // Personality can only shift ±0.3 from birth
export const REFLECTION_INTERVAL = 10; // Reflect every N interactions
export const MEMORY_DECAY_DAYS = 30;   // Low-weight memories decay after 30 days
export const MAX_ACTIVE_QUIRKS = 7;
export const MIN_QUIRKS = 3;
