// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Anti-Churn Protection V3
// Prevents fee-destroying trade loops
// ══════════════════════════════════════════════════════════════

import { supabaseAdmin } from "./supabase";

const REBUY_COOLDOWN_MINUTES: Record<string, number> = {
  meme_scout: 30,
  momentum: 45,
  sniper: 20,
  blue_chip: 120,
  mean_revert: 60,
  hodl_dca: 1440,
};

const MAX_ROUND_TRIPS_PER_HOUR = 3;
const LOSS_STREAK_THRESHOLD = 3;
const LOSS_STREAK_COOLDOWN_MIN = 30;
const MIN_EXPECTED_GAIN_PCT = 3; // must exceed fees

export async function passesAntiChurn(
  userId: string,
  tokenAddress: string,
  strategy: string,
): Promise<{ pass: boolean; reason: string }> {

  // 1. Rebuy cooldown — can't buy a token you sold recently
  const cooldownMin = REBUY_COOLDOWN_MINUTES[strategy] || 30;
  const cooldownCutoff = new Date(Date.now() - cooldownMin * 60_000).toISOString();
  const { data: lastSell } = await supabaseAdmin.from("trading_history")
    .select("created_at")
    .eq("user_id", userId)
    .eq("token_address", tokenAddress)
    .eq("action", "sell")
    .gte("created_at", cooldownCutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastSell) {
    const minAgo = Math.round((Date.now() - new Date(lastSell.created_at).getTime()) / 60_000);
    return { pass: false, reason: `Rebuy cooldown: sold this token ${minAgo}min ago (need ${cooldownMin}min)` };
  }

  // 2. Round trip limit — max N buy+sell pairs per hour
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count: sellCount } = await supabaseAdmin.from("trading_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", "sell")
    .gte("created_at", oneHourAgo);

  if ((sellCount || 0) >= MAX_ROUND_TRIPS_PER_HOUR) {
    return { pass: false, reason: `Max ${MAX_ROUND_TRIPS_PER_HOUR} round trips per hour reached (${sellCount} sells in last hour)` };
  }

  // 3. Loss streak cooldown
  const { data: recentClosed } = await supabaseAdmin.from("trading_history")
    .select("pnl_eth, closed_at")
    .eq("user_id", userId)
    .not("closed_at", "is", null)
    .order("closed_at", { ascending: false })
    .limit(LOSS_STREAK_THRESHOLD);

  if (recentClosed && recentClosed.length >= LOSS_STREAK_THRESHOLD) {
    const allLosses = recentClosed.every(t => (t.pnl_eth || 0) < 0);
    if (allLosses) {
      const lastClose = recentClosed[0].closed_at;
      const minSinceLast = (Date.now() - new Date(lastClose).getTime()) / 60_000;
      if (minSinceLast < LOSS_STREAK_COOLDOWN_MIN) {
        return {
          pass: false,
          reason: `Loss streak cooldown: ${LOSS_STREAK_THRESHOLD} consecutive losses. Pausing ${Math.ceil(LOSS_STREAK_COOLDOWN_MIN - minSinceLast)}min to protect capital.`,
        };
      }
    }
  }

  return { pass: true, reason: "ok" };
}

export { MIN_EXPECTED_GAIN_PCT };
