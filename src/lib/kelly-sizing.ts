// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Kelly Criterion Position Sizing V3
// Sizes up when hot, sizes down when cold
// ══════════════════════════════════════════════════════════════

import { supabaseAdmin } from "./supabase-admin";
import type { MarketRegime } from "./market-regime";

export async function calculateKellySize(
  userId: string,
  confidence: number,
  maxPositionPct: number,
  regime: MarketRegime,
): Promise<{ positionPct: number; winRate: number; avgWin: number; avgLoss: number }> {

  // Get recent closed trades for win rate + avg win/loss
  const { data: trades } = await supabaseAdmin.from("trading_history")
    .select("pnl_eth, amount_eth")
    .eq("user_id", userId)
    .not("closed_at", "is", null)
    .neq("action", "skip")
    .order("closed_at", { ascending: false })
    .limit(30);

  const closed = (trades || []).filter(t => t.pnl_eth != null && t.amount_eth > 0);
  const winners = closed.filter(t => t.pnl_eth > 0);
  const losers = closed.filter(t => t.pnl_eth < 0);

  const winRate = closed.length > 0 ? (winners.length / closed.length) * 100 : 50;
  const avgWin = winners.length > 0
    ? winners.reduce((s, t) => s + (t.pnl_eth / t.amount_eth) * 100, 0) / winners.length
    : 10;
  const avgLoss = losers.length > 0
    ? Math.abs(losers.reduce((s, t) => s + (t.pnl_eth / t.amount_eth) * 100, 0) / losers.length)
    : 10;

  // Kelly fraction: f = (bp - q) / b
  const b = avgLoss > 0 ? avgWin / avgLoss : 1;
  const p = winRate / 100;
  const q = 1 - p;
  const kellyFraction = (b * p - q) / b;

  // Half-Kelly (standard risk reduction)
  const halfKelly = Math.max(0, kellyFraction * 0.5);

  // Scale by AI confidence
  const confidenceMultiplier = confidence / 100;

  // Scale by regime
  const regimeMultiplier =
    regime === 'bear_trending' ? 0.5
    : regime === 'high_volatility' ? 0.6
    : regime === 'bull_trending' ? 1.2
    : 1.0;

  let positionPct = halfKelly * confidenceMultiplier * regimeMultiplier * 100;

  // Clamp
  positionPct = Math.max(2, Math.min(maxPositionPct, positionPct));

  // If win rate below 40%, force minimum size
  if (winRate < 40 && closed.length >= 5) {
    positionPct = Math.min(positionPct, 5);
  }

  // If no history, use conservative default
  if (closed.length < 3) {
    positionPct = Math.min(positionPct, 8);
  }

  return { positionPct: Math.round(positionPct), winRate, avgWin, avgLoss };
}
