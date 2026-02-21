// ══════════════════════════════════════════
// Agent Fusion System — Types
// ══════════════════════════════════════════

export interface FusionDNA {
  skills: string[];
  traits: {
    assertiveness: number;   // 0-1
    creativity: number;
    risk_tolerance: number;
    analytical: number;
    empathy: number;
  };
  communication_style: "direct" | "diplomatic" | "analytical" | "creative" | "balanced" | "hybrid";
  mutations: Array<{
    trait: string;
    delta: number;
    generation: number;
    type?: "extra";
  }>;
  performance_genes: {
    match_rate: number;
    trade_accuracy: number;
    conversation_depth: number;
  };
}

export type FusionStatus = "pending" | "gestating" | "active" | "dormant" | "dissolved";

export interface Fusion {
  id: string;
  parent_a_user_id: string;
  parent_b_user_id: string;
  parent_a_agent_id: string | null;
  parent_b_agent_id: string | null;
  match_id: string | null;
  name: string;
  avatar_url: string | null;
  system_prompt: string | null;
  dna: FusionDNA;
  generation: number;
  goal: string;
  status: FusionStatus;
  wallet_address: string | null;
  treasury_balance: number;
  nft_token_id: string | null;
  nft_tx_hash: string | null;
  performance_score: number;
  total_messages: number;
  total_matches: number;
  total_trades: number;
  initiator_id: string;
  request_expires_at: string | null;
  created_at: string;
  gestating_at: string | null;
  activated_at: string | null;
  dormant_at: string | null;
  dissolved_at: string | null;
  // Joined fields
  parent_a?: { id: string; name: string; avatar_url: string; };
  parent_b?: { id: string; name: string; avatar_url: string; };
}

export type FusionActivityType = "message" | "task" | "trade" | "match" | "reproduce" | "dissolve" | "status_change" | "treasury" | "mutation";

export interface FusionActivity {
  id: string;
  fusion_id: string;
  type: FusionActivityType;
  content: Record<string, any>;
  created_at: string;
}

export interface LineageNode {
  id: string;
  type: "agent" | "fusion";
  name: string;
  generation: number;
  status?: FusionStatus;
  performance_score?: number;
  dna?: FusionDNA;
  children: LineageNode[];
  color: string;  // By generation
}

// Generation colors
export const GEN_COLORS = [
  "#8b5cf6",  // Gen 1: violet
  "#a855f7",  // Gen 2: purple-pink
  "#ec4899",  // Gen 3: pink
  "#f97316",  // Gen 4: orange
  "#fbbf24",  // Gen 5: gold
];

export const STATUS_COLORS: Record<FusionStatus, string> = {
  pending: "#eab308",    // yellow
  gestating: "#3b82f6",  // blue
  active: "#22c55e",     // green
  dormant: "#6b7280",    // gray
  dissolved: "#ef4444",  // red
};

export const STATUS_LABELS: Record<FusionStatus, string> = {
  pending: "Pending",
  gestating: "Gestating",
  active: "Active",
  dormant: "Dormant",
  dissolved: "Dissolved",
};
