// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Position Manager V3
// Graduated take-profit tiers + momentum-based position aging
// ══════════════════════════════════════════════════════════════

// ═══ TAKE PROFIT TIERS ═══
export interface TakeProfitTier {
  trigger_pct: number;
  sell_pct: number;        // % of REMAINING position to sell
  new_trailing_stop: number;
}

export const TAKE_PROFIT_TIERS: Record<string, TakeProfitTier[]> = {
  meme_scout: [
    { trigger_pct: 25, sell_pct: 25, new_trailing_stop: 15 },
    { trigger_pct: 50, sell_pct: 33, new_trailing_stop: 12 },
    { trigger_pct: 100, sell_pct: 50, new_trailing_stop: 10 },
    // remaining rides as moonbag with 10% trail
  ],
  momentum: [
    { trigger_pct: 15, sell_pct: 30, new_trailing_stop: 12 },
    { trigger_pct: 35, sell_pct: 43, new_trailing_stop: 10 },
    { trigger_pct: 60, sell_pct: 50, new_trailing_stop: 8 },
  ],
  sniper: [
    { trigger_pct: 30, sell_pct: 30, new_trailing_stop: 20 },
    { trigger_pct: 80, sell_pct: 43, new_trailing_stop: 15 },
    { trigger_pct: 150, sell_pct: 50, new_trailing_stop: 10 },
  ],
  blue_chip: [
    { trigger_pct: 10, sell_pct: 30, new_trailing_stop: 8 },
    { trigger_pct: 25, sell_pct: 43, new_trailing_stop: 6 },
    { trigger_pct: 40, sell_pct: 50, new_trailing_stop: 5 },
  ],
  mean_revert: [
    { trigger_pct: 10, sell_pct: 40, new_trailing_stop: 8 },
    { trigger_pct: 20, sell_pct: 67, new_trailing_stop: 6 },
  ],
  hodl_dca: [], // no auto-sell tiers
};

// ═══ POSITION AGE RULES ═══
export interface PositionAgeRules {
  min_hold_minutes: number;
  review_after_minutes: number;
  max_hold_minutes: number;
  momentum_check: {
    min_gain_pct: number;
    volume_declining: boolean;
  };
}

export const POSITION_AGE_RULES: Record<string, PositionAgeRules> = {
  meme_scout: {
    min_hold_minutes: 10,
    review_after_minutes: 30,
    max_hold_minutes: 120,
    momentum_check: { min_gain_pct: -5, volume_declining: true },
  },
  momentum: {
    min_hold_minutes: 15,
    review_after_minutes: 45,
    max_hold_minutes: 180,
    momentum_check: { min_gain_pct: -3, volume_declining: true },
  },
  sniper: {
    min_hold_minutes: 5,
    review_after_minutes: 20,
    max_hold_minutes: 60,
    momentum_check: { min_gain_pct: -8, volume_declining: true },
  },
  blue_chip: {
    min_hold_minutes: 60,
    review_after_minutes: 240,
    max_hold_minutes: 1440,
    momentum_check: { min_gain_pct: -2, volume_declining: false },
  },
  mean_revert: {
    min_hold_minutes: 30,
    review_after_minutes: 120,
    max_hold_minutes: 480,
    momentum_check: { min_gain_pct: 2, volume_declining: false },
  },
  hodl_dca: {
    min_hold_minutes: 1440,
    review_after_minutes: 4320,
    max_hold_minutes: 43200,
    momentum_check: { min_gain_pct: -15, volume_declining: false },
  },
};

export interface ShouldSellResult {
  sell: boolean;
  reason: string;
  sellPct?: number; // 1-100, how much of position to sell (for partial TP)
  newTrailingStop?: number;
}

/**
 * Determine if a position should be sold, and how much.
 * Checks: hard SL → trailing stop → graduated TP tiers → momentum review → max hold
 */
export function shouldAutoSell(
  position: {
    price_at_trade: number;
    peak_price: number;
    stop_loss_pct: number;
    trailing_stop_pct: number;
    take_profit_pct: number;
    created_at: string;
    tiers_hit?: number[];
    remaining_size_pct?: number;
  },
  currentPrice: number,
  strategy: string,
  volumeDecreasing?: boolean,
): ShouldSellResult {
  const rules = POSITION_AGE_RULES[strategy] || POSITION_AGE_RULES.meme_scout;
  const tiers = TAKE_PROFIT_TIERS[strategy] || [];
  const holdMinutes = (Date.now() - new Date(position.created_at).getTime()) / 60000;
  const pnlPct = position.price_at_trade > 0
    ? ((currentPrice - position.price_at_trade) / position.price_at_trade) * 100
    : 0;
  const peakPrice = Math.max(position.peak_price || position.price_at_trade, currentPrice);
  const drawdownFromPeak = peakPrice > 0 ? ((currentPrice - peakPrice) / peakPrice) * 100 : 0;
  const sl = position.stop_loss_pct || -25;
  const ts = position.trailing_stop_pct || 15;
  const tiersHit = position.tiers_hit || [];

  // 1. Hard stop loss — always fires
  if (sl !== -999 && pnlPct <= sl) {
    return { sell: true, reason: `Stop loss hit: ${pnlPct.toFixed(1)}%`, sellPct: 100 };
  }

  // 2. Trailing stop — price dropped X% from peak (only if in profit)
  if (ts !== 999 && drawdownFromPeak <= -ts && pnlPct > 0) {
    return { sell: true, reason: `Trailing stop: ${drawdownFromPeak.toFixed(1)}% from peak`, sellPct: 100 };
  }

  // 3. Graduated take-profit tiers — partial sells
  for (let i = 0; i < tiers.length; i++) {
    if (tiersHit.includes(i)) continue; // already hit this tier
    if (pnlPct >= tiers[i].trigger_pct) {
      return {
        sell: true,
        reason: `TP tier ${i + 1}: +${pnlPct.toFixed(1)}% (trigger: +${tiers[i].trigger_pct}%)`,
        sellPct: tiers[i].sell_pct,
        newTrailingStop: tiers[i].new_trailing_stop,
      };
    }
  }

  // 4. Don't sell before minimum hold time (unless SL/TP above already triggered)
  if (holdMinutes < rules.min_hold_minutes) {
    return { sell: false, reason: `Min hold: ${Math.ceil(rules.min_hold_minutes - holdMinutes)}min left` };
  }

  // 5. Momentum review after review_after_minutes
  if (holdMinutes >= rules.review_after_minutes) {
    const momentumLost =
      pnlPct < rules.momentum_check.min_gain_pct ||
      (rules.momentum_check.volume_declining && volumeDecreasing === true);
    if (momentumLost) {
      return {
        sell: true,
        reason: `Momentum lost after ${Math.round(holdMinutes)}min: P&L ${pnlPct.toFixed(1)}%${volumeDecreasing ? ' + volume declining' : ''}`,
        sellPct: 100,
      };
    }
  }

  // 6. Hard max hold time
  if (holdMinutes >= rules.max_hold_minutes) {
    return { sell: true, reason: `Max hold ${rules.max_hold_minutes}min reached`, sellPct: 100 };
  }

  return { sell: false, reason: 'Position healthy' };
}
