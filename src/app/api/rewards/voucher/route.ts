// ════════════════════════════════════════════════════════════════════════════
// BLINK Phase 5 — Reward voucher API
//
// Player catches a creature → POST {rarity, catchId} here. We validate the
// SIWE session, persist the catch in `blink_catches` (idempotent by ref),
// compute the reward from real player state, and return a signed EIP-712
// voucher they can submit to BlinkRewards.claim() on mainnet.
//
// Phase 5b: catchesToday / streakDays / isFirstCatchOfDay are driven by the
// Supabase `blink_catches` table. The contract enforces nonce uniqueness so
// duplicates can't double-claim on-chain either way.
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
import { supabaseAdmin } from "@/lib/supabase-admin";
import { keccak256, toBytes } from "viem";

function isRarity(s: unknown): s is Rarity {
  return typeof s === "string" && s in BASE_REWARD_BY_RARITY;
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

// Count consecutive UTC days ending today with ≥1 catch. Capped at 10
// because the streak multiplier saturates there.
function computeStreakDays(caughtAtIso: string[]): number {
  const days = new Set<string>();
  for (const iso of caughtAtIso) {
    days.add(iso.slice(0, 10));
  }
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - i,
    ));
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) streak++;
    else break;
  }
  return Math.min(streak, 10);
}

export async function POST(req: NextRequest) {
  const session = await readSiweSession(req);
  if (!session?.address) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    rarity?: string;
    catchId?: string;
    spawnId?: string;
    lat?: number;
    lng?: number;
  };
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

  const wallet = session.address.toLowerCase();
  const nowIso = new Date().toISOString();
  const since24hIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since30dIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 1) Upsert the catch row on ref so retries don't double-count.
  const upsertRow: Record<string, unknown> = {
    wallet,
    rarity: rarityRaw,
    ref: catchId,
    caught_at: nowIso,
  };
  if (typeof body.spawnId === "string") upsertRow.spawn_id = body.spawnId;
  if (isFiniteNumber(body.lat)) upsertRow.lat = body.lat;
  if (isFiniteNumber(body.lng)) upsertRow.lng = body.lng;

  const upsert = await supabaseAdmin
    .from("blink_catches")
    .upsert(upsertRow, { onConflict: "ref", ignoreDuplicates: false });
  if (upsert.error) {
    return NextResponse.json(
      { error: "catch persist failed", detail: upsert.error.message },
      { status: 500 },
    );
  }

  // 2) catchesToday = catches in the last 24 hours (post-upsert).
  const today = await supabaseAdmin
    .from("blink_catches")
    .select("*", { count: "exact", head: true })
    .eq("wallet", wallet)
    .gte("caught_at", since24hIso);
  if (today.error) {
    return NextResponse.json(
      { error: "stats query failed", detail: today.error.message },
      { status: 500 },
    );
  }
  const catchesToday = today.count ?? 0;

  // 3) Hard daily cap. Row stays for stats, no voucher.
  if (catchesToday > DAILY_CATCH_CAP) {
    return NextResponse.json(
      { error: "daily cap reached", catchesToday },
      { status: 429 },
    );
  }

  // 4) Streak: catches over the last 30 UTC days.
  const recent = await supabaseAdmin
    .from("blink_catches")
    .select("caught_at")
    .eq("wallet", wallet)
    .gte("caught_at", since30dIso);
  if (recent.error) {
    return NextResponse.json(
      { error: "streak query failed", detail: recent.error.message },
      { status: 500 },
    );
  }
  const streakDays = computeStreakDays(
    (recent.data ?? []).map((r) => r.caught_at as string),
  );

  const isFirstCatchOfDay = catchesToday === 1;
  const utcHour = new Date().getUTCHours();

  // 5) Real reward math.
  const amount = await computeReward({
    rarity: rarityRaw,
    wallet: wallet as `0x${string}`,
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
    wallet as `0x${string}`,
    amount,
    ref,
  );

  // 6) Persist voucher details on the catch row. Claim tx hash gets filled
  // later by the on-chain `Claimed` event listener.
  const update = await supabaseAdmin
    .from("blink_catches")
    .update({ voucher_nonce: voucher.nonce, reward_wei: amount.toString() })
    .eq("ref", catchId);
  if (update.error) {
    // Don't fail the request — the voucher is valid; we just lose the
    // back-pointer. Log it for visibility.
    console.warn("[blink-voucher] failed to update voucher_nonce/reward_wei", update.error.message);
  }

  return NextResponse.json({
    rewardsContract: process.env.NEXT_PUBLIC_BLINK_REWARDS_CONTRACT,
    player: session.address,
    ...voucher,
  });
}
