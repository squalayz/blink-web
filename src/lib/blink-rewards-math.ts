// ════════════════════════════════════════════════════════════════════════════
// BLINK Phase 5 — Reward math (server-only)
//
// Computes how much $BLINK a player should be vouchered for catching a
// creature, given rarity + NFT holdings + streak + first-catch + witching
// hour. All math is bigint basis-points to keep it deterministic and
// auditable on-chain replays.
// ════════════════════════════════════════════════════════════════════════════

import "server-only";
import { getBlinkHoldings } from "@/lib/wallet-nfts";

export const BASE_REWARD_BY_RARITY = {
  common: 10n,
  uncommon: 50n,
  rare: 250n,
  legendary: 1500n,
  mythic: 10000n,
} as const;

export type Rarity = keyof typeof BASE_REWARD_BY_RARITY;

const ONE_BLINK = 10n ** 18n; // 1e18 wei per $BLINK

export const DAILY_CATCH_CAP = 50;

export interface CatchContext {
  rarity: Rarity;
  wallet: `0x${string}`;
  catchesToday: number;
  streakDays: number;
  isFirstCatchOfDay: boolean;
  utcHour: number; // 0-23
}

export async function computeReward(ctx: CatchContext): Promise<bigint> {
  if (ctx.catchesToday >= DAILY_CATCH_CAP) return 0n;

  const baseUnits = BASE_REWARD_BY_RARITY[ctx.rarity];
  if (!baseUnits) return 0n;

  // Multipliers expressed as basis points (10_000 = 1.0x).
  let multBP = 10_000n;

  // NFT holdings: mythic 5x stacks first (richest tier), genesis 2x otherwise.
  const holdings = await getBlinkHoldings(ctx.wallet).catch(() => ({
    genesis: [],
    mythics: [],
    wallet: "",
  }));
  if (holdings.mythics && holdings.mythics.length > 0) {
    multBP = multBP * 5n;
  } else if (holdings.genesis && holdings.genesis.length > 0) {
    multBP = multBP * 2n;
  }

  // Daily streak: +10% per day, max +100% (10 days).
  const streakBoostBP = BigInt(Math.min(ctx.streakDays * 1000, 10_000));
  multBP = (multBP * (10_000n + streakBoostBP)) / 10_000n;

  // First catch of the UTC day: 2x.
  if (ctx.isFirstCatchOfDay) multBP = multBP * 2n;

  // Witching hour (3-4am UTC): 3x.
  if (ctx.utcHour === 3) multBP = multBP * 3n;

  // Hard cap at 50x to keep the upside sane.
  if (multBP > 500_000n) multBP = 500_000n;

  return (baseUnits * ONE_BLINK * multBP) / 10_000n;
}
