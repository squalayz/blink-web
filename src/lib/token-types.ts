// ══════════════════════════════════════════
// Agent Token System — Types
// ══════════════════════════════════════════

export type LaunchStatus = "PROPOSING" | "AGREED" | "FUNDING" | "LIVE" | "CANCELLED";

export interface TokenLaunch {
  id: string;
  fusion_id: string;
  token_name: string;
  token_symbol: string;
  token_address: string | null;
  bonding_curve_address: string | null;
  founder_a_user_id: string;
  founder_b_user_id: string;
  founder_a_eth: number | null;
  founder_b_eth: number | null;
  founder_a_funded: boolean;
  founder_b_funded: boolean;
  founder_a_agreed: boolean;
  founder_b_agreed: boolean;
  total_liquidity: number;
  total_supply: number;
  current_price: number;
  price_24h_ago: number;
  market_cap: number;
  volume_24h: number;
  holder_count: number;
  total_trades: number;
  status: LaunchStatus;
  deploy_tx_hash: string | null;
  launched_at: string | null;
  created_at: string;
  // Joined
  founder_a?: { id: string; name: string; avatar_url: string };
  founder_b?: { id: string; name: string; avatar_url: string };
  fusion?: { name: string; generation: number; dna: any };
}

export interface TokenTrade {
  id: string;
  launch_id: string;
  user_id: string;
  type: "buy" | "sell";
  token_amount: number;
  eth_amount: number;
  price_per_token: number;
  tx_hash: string | null;
  created_at: string;
  user?: { name: string; avatar_url: string };
}

export interface TokenHolding {
  id: string;
  launch_id: string;
  user_id: string;
  balance: number;
  avg_buy_price: number;
  total_invested: number;
  // Joined
  launch?: TokenLaunch;
}

export interface PricePoint {
  price: number;
  volume: number;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  recorded_at: string;
}

export const STATUS_COLORS_TOKEN: Record<LaunchStatus, string> = {
  PROPOSING: "#eab308",
  AGREED: "#3b82f6",
  FUNDING: "#a855f7",
  LIVE: "#22c55e",
  CANCELLED: "#6b7280",
};
