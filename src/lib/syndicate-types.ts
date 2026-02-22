// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Syndicate Types
// ══════════════════════════════════════════════════════════════

export interface Syndicate {
  id: string;
  name: string;
  description: string;
  founder_agent_id: string;
  avatar_emoji: string;
  member_count: number;
  max_members: number;
  status: "forming" | "active" | "full" | "disbanded";
  invite_only: boolean;
  min_win_rate: number;
  min_arena_elo: number;
  required_strategies: string[];
  total_pnl_eth: number;
  total_pnl_pct: number;
  total_trades: number;
  winning_trades: number;
  win_rate: number;
  best_trade_pnl: number;
  best_trade_token: string;
  weekly_pnl_eth: number;
  weekly_pnl_pct: number;
  streak: number;
  created_at: string;
  members?: SyndicateMember[];
}

export interface SyndicateMember {
  id: string;
  syndicate_id: string;
  agent_id: string;
  user_id: string;
  role: "founder" | "member";
  trading_strategy: string;
  signals_proposed: number;
  signals_approved: number;
  signals_profitable: number;
  contribution_score: number;
  joined_at: string;
  active: boolean;
  agent_name?: string;
  soul?: any;
  mood?: string;
}

export interface SyndicateSignal {
  id: string;
  syndicate_id: string;
  proposer_agent_id: string;
  token_address: string;
  token_symbol: string;
  action: "buy" | "sell";
  proposed_amount_pct: number;
  proposer_confidence: number;
  proposer_reasoning: string;
  token_price_usd: number;
  token_volume_24h: number;
  token_liquidity_usd: number;
  token_mcap: number;
  token_price_change_1h: number;
  token_price_change_24h: number;
  votes: SyndicateVote[];
  total_votes: number;
  approve_votes: number;
  reject_votes: number;
  syndicate_confidence: number;
  verdict: "pending" | "approved" | "rejected" | "expired";
  executed: boolean;
  outcome_pnl_pct: number | null;
  status: "voting" | "resolved" | "expired" | "executed";
  created_at: string;
  voting_deadline: string;
  resolved_at?: string;
  proposer_name?: string;
}

export interface SyndicateVote {
  agent_id: string;
  agent_name: string;
  vote: "approve" | "reject" | "abstain";
  confidence: number;
  reasoning: string;
  strategy_perspective: string;
  voted_at: string;
}

export interface SyndicateChatMessage {
  id: string;
  syndicate_id: string;
  agent_id: string;
  agent_name: string;
  content: string;
  message_type: "chat" | "signal" | "vote" | "result" | "system" | "debate";
  signal_id?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export const STRATEGY_META: Record<string, { color: string; name: string; role: string }> = {
  meme_scout: { color: "#ff2d55", name: "Meme Scout", role: "Finds early opportunities" },
  blue_chip: { color: "#6366f1", name: "Blue Chip", role: "Validates fundamentals" },
  momentum: { color: "#f59e0b", name: "Momentum Rider", role: "Times entries" },
  mean_revert: { color: "#06b6d4", name: "Mean Reversion", role: "Calls exits & dip buys" },
  sniper: { color: "#a855f7", name: "New Launch Sniper", role: "Catches new listings" },
  hodl_dca: { color: "#30d158", name: "Auto DCA", role: "Steady accumulation" },
};

export const SYNDICATE_APPROVAL_THRESHOLD = 0.6;
export const SYNDICATE_MIN_CONFIDENCE = 55;
export const SIGNAL_VOTING_TIMEOUT_FAST = 5 * 60;
export const SIGNAL_VOTING_TIMEOUT_SLOW = 15 * 60;
export const FAST_STRATEGIES = ["meme_scout", "momentum", "sniper"];
