// ════════════════════════════════════════════════════════════════════════════
// BLINK Phase 5b — Player stats
//
// GET /api/me/stats returns the authenticated custodial wallet's catch totals
// and lifetime $BLINK earned. Feeds the "My BLINK" nav pill.
// ════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { requireUserWithEthAddress } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

export async function GET(req: NextRequest) {
  const resolved = await requireUserWithEthAddress(req);
  if (resolved.error) return resolved.error;

  const wallet = resolved.address;
  const since24hIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since30dIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const totalQ = supabaseAdmin
    .from("blink_catches")
    .select("*", { count: "exact", head: true })
    .eq("wallet", wallet);

  const todayQ = supabaseAdmin
    .from("blink_catches")
    .select("*", { count: "exact", head: true })
    .eq("wallet", wallet)
    .gte("caught_at", since24hIso);

  const recentQ = supabaseAdmin
    .from("blink_catches")
    .select("caught_at")
    .eq("wallet", wallet)
    .gte("caught_at", since30dIso);

  const claimedQ = supabaseAdmin
    .from("blink_catches")
    .select("reward_wei")
    .eq("wallet", wallet)
    .not("claimed_at", "is", null);

  const unclaimedQ = supabaseAdmin
    .from("blink_catches")
    .select("*", { count: "exact", head: true })
    .eq("wallet", wallet)
    .is("claimed_at", null);

  const [total, today, recent, claimed, unclaimed] = await Promise.all([
    totalQ,
    todayQ,
    recentQ,
    claimedQ,
    unclaimedQ,
  ]);

  const firstErr =
    total.error || today.error || recent.error || claimed.error || unclaimed.error;
  if (firstErr) {
    return NextResponse.json(
      { error: "stats query failed", detail: firstErr.message },
      { status: 500 },
    );
  }

  let lifetimeWei = 0n;
  for (const row of claimed.data ?? []) {
    const v = row.reward_wei;
    if (v == null) continue;
    try {
      lifetimeWei += BigInt(v as string | number);
    } catch {
      // skip non-numeric values rather than fail the request
    }
  }

  const streakDays = computeStreakDays(
    (recent.data ?? []).map((r) => r.caught_at as string),
  );

  return NextResponse.json({
    wallet,
    totalCatches: total.count ?? 0,
    catchesToday: today.count ?? 0,
    streakDays,
    lifetimeBlinkEarned: lifetimeWei.toString(),
    unclaimedCatches: unclaimed.count ?? 0,
  });
}
