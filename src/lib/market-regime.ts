// ══════════════════════════════════════════════════════════════
// MishMesh.ai — Market Regime Detector V3
// Detects bull/bear/chop/volatile and adjusts strategy params
// ══════════════════════════════════════════════════════════════

import { getCoinMarketData, getTrendingCoins } from "@/lib/coingecko-cli";

export type MarketRegime = 'bull_trending' | 'bear_trending' | 'sideways_chop' | 'high_volatility' | 'low_volatility';

export interface RegimeResult {
  regime: MarketRegime;
  confidence: number;
  recommendation: string;
  eth1h: number;
  eth4h: number;
  eth24h: number;
}

// Cache regime for 5 minutes
let _cachedRegime: RegimeResult | null = null;
let _regimeCacheTime = 0;

export async function detectMarketRegime(): Promise<RegimeResult> {
  if (_cachedRegime && Date.now() - _regimeCacheTime < 300_000) return _cachedRegime;

  let eth1h = 0, eth4h = 0, eth24h = 0;

  try {
    const ethData = await getCoinMarketData("ethereum");
    eth1h = ethData.priceChange1h;
    eth24h = ethData.priceChange24h;
    // Approximate 4h from 1h and 24h
    eth4h = eth1h * 0.6 + eth24h * 0.4;
  } catch {
    // Fallback: no regime data, assume normal
  }

  let regime: MarketRegime;
  let confidence: number;
  let recommendation: string;

  const absChange = Math.abs(eth24h);
  const volatility = Math.abs(eth1h) + Math.abs(eth4h); // rough proxy

  if (eth4h > 3 && eth24h > 5) {
    regime = 'bull_trending';
    confidence = Math.min(95, 60 + Math.abs(eth24h));
    recommendation = 'Increase position sizes. Widen trailing stops. Let winners run longer.';
  } else if (eth4h < -3 && eth24h < -5) {
    regime = 'bear_trending';
    confidence = Math.min(95, 60 + Math.abs(eth24h));
    recommendation = 'Reduce position sizes by 50%. Tighten stop losses. Only take highest-conviction setups.';
  } else if (absChange < 2 && volatility < 3) {
    regime = 'sideways_chop';
    confidence = 70;
    recommendation = 'Reduce trade frequency. Only trade tokens with independent catalysts. Tighten take profits.';
  } else if (volatility > 8) {
    regime = 'high_volatility';
    confidence = 75;
    recommendation = 'Reduce position sizes by 40%. Widen stop losses to avoid shakeouts.';
  } else {
    regime = 'low_volatility';
    confidence = 60;
    recommendation = 'Normal trading. Follow standard strategy parameters.';
  }

  const result: RegimeResult = { regime, confidence, recommendation, eth1h, eth4h, eth24h };
  _cachedRegime = result;
  _regimeCacheTime = Date.now();
  return result;
}

export interface AdjustedRiskConfig {
  max_position_pct: number;
  stop_loss_pct: number;
  take_profit_pct: number;
  trailing_stop_pct: number;
  max_slippage_pct: number;
  max_concurrent_positions: number;
  min_confidence: number;
}

export function adjustForRegime(
  base: { max_position_pct: number; stop_loss_pct: number; take_profit_pct: number; trailing_stop_pct: number; max_slippage_pct: number; max_concurrent_positions: number },
  regime: MarketRegime
): AdjustedRiskConfig {
  const a = { ...base, min_confidence: 40 };

  switch (regime) {
    case 'bear_trending':
      a.max_position_pct = Math.round(a.max_position_pct * 0.5);
      a.stop_loss_pct = Math.round(a.stop_loss_pct * 0.7);
      a.max_concurrent_positions = Math.max(2, a.max_concurrent_positions - 2);
      a.min_confidence = 75;
      break;
    case 'sideways_chop':
      a.take_profit_pct = Math.round(a.take_profit_pct * 0.6);
      a.min_confidence = 70;
      break;
    case 'bull_trending':
      a.trailing_stop_pct = Math.round(a.trailing_stop_pct * 1.3);
      a.take_profit_pct = Math.round(a.take_profit_pct * 1.4);
      break;
    case 'high_volatility':
      a.max_position_pct = Math.round(a.max_position_pct * 0.6);
      a.stop_loss_pct = Math.round(a.stop_loss_pct * 1.3);
      a.max_slippage_pct = Math.round(a.max_slippage_pct * 1.5);
      break;
  }

  return a;
}

export async function getTrendingThemes(): Promise<string[]> {
  try {
    const trending = await getTrendingCoins();
    return trending.map(c => c.name || c.symbol);
  } catch {
    return [];
  }
}
