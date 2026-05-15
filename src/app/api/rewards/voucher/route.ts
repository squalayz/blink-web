// ════════════════════════════════════════════════════════════════════════════
// BLINK Phase 5 — Reward voucher API
//
// Player catches a creature → POST {rarity, catchId} here. We validate the
// SIWE session, compute the reward, and return a signed EIP-712 voucher
// they can submit to BlinkRewards.claim() on mainnet.
//
// Phase 5 launch uses safe hardcoded defaults for catchesToday/streakDays/
// isFirstCatchOfDay. Wiring those to Supabase `catches` is a Phase 5b job —
// the contract enforces nonce uniqueness so duplicates can't double-claim.
// ════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { readSiweSession } from "@/lib/siwe-session";
import { signRewardVoucher } from "@/lib/blink-signer";
import {
  computeReward,
  DAILY_CATCH_CAP,
  BASE_REWARD_BY_RARITY,
  type Rarity,
} from "@/lib/blink-rewards-math";
import { keccak256, toBytes } from "viem";

function isRarity(s: unknown): s is Rarity {
  return typeof s === "string" && s in BASE_REWARD_BY_RARITY;
}

export async function POST(req: NextRequest) {
  const session = await readSiweSession(req);
  if (!session?.address) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { rarity?: string; catchId?: string; spawnId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const rarityRaw = typeof body.rarity === "string" ? body.rarity.toLowerCase() : "";
  const catchId = typeof body.catchId === "string" ? body.catchId : "";
  if (!isRarity(rarityRaw) || !catchId) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // Phase 5 launch defaults. Replace with Supabase queries in Phase 5b.
  const catchesToday = 0;
  const streakDays = 0;
  const isFirstCatchOfDay = true;
  const utcHour = new Date().getUTCHours();

  if (catchesToday >= DAILY_CATCH_CAP) {
    return NextResponse.json({ error: "daily cap reached" }, { status: 429 });
  }

  const amount = await computeReward({
    rarity: rarityRaw,
    wallet: session.address as `0x${string}`,
    catchesToday,
    streakDays,
    isFirstCatchOfDay,
    utcHour,
  });

  if (amount === 0n) {
    return NextResponse.json({ error: "no reward" }, { status: 400 });
  }

  const ref = keccak256(toBytes(`catch:${catchId}`));
  const voucher = await signRewardVoucher(
    session.address as `0x${string}`,
    amount,
    ref,
  );

  return NextResponse.json({
    rewardsContract: process.env.NEXT_PUBLIC_BLINK_REWARDS_CONTRACT,
    player: session.address,
    ...voucher,
  });
}
