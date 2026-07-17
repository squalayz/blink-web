// ════════════════════════════════════════════════════════════════════════════
// GET /api/claim/status — Airdrop Claim v3.
//
// Requires the httpOnly session cookie from /api/claim/lookup. Returns the
// player's registration (if any) plus the player-visible balance, so a
// returning visitor within the 20-minute window skips code entry.
// ════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { blinkworldAdmin } from "@/lib/blinkworld-admin";
import { getPlayerProfileId } from "@/lib/claim-v3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const profileId = getPlayerProfileId(req);
    if (!profileId) {
      return NextResponse.json({ ok: false, error: "No session" }, { status: 401 });
    }

    const db = blinkworldAdmin();
    const [{ data: reg }, { data: exportRow }, { data: paid, error: paidErr }] = await Promise.all([
      db
        .from("airdrop_registrations")
        .select("eth_address, status, created_at, updated_at")
        .eq("profile_id", profileId)
        .maybeSingle(),
      db
        .from("airdrop_export")
        .select("display_name, username, blink_lifetime")
        .eq("profile_id", profileId)
        .maybeSingle(),
      // total $BLINK received across all incremental payouts; table may not
      // exist yet (migration 20260716_airdrop_payout_history) — degrade to null
      db.from("airdrop_payouts").select("amount_wei").eq("profile_id", profileId),
    ]);

    const blinkReceivedWei =
      paidErr || !paid
        ? null
        : paid.reduce((s, p) => s + BigInt(p.amount_wei || "0"), 0n).toString();

    return NextResponse.json({
      ok: true,
      display_name: exportRow?.display_name || exportRow?.username || "Explorer",
      blink_lifetime: Number(exportRow?.blink_lifetime || 0),
      blink_received_wei: blinkReceivedWei,
      registration: reg
        ? { eth_address: reg.eth_address, status: reg.status, updated_at: reg.updated_at }
        : null,
    });
  } catch (e) {
    console.error("[claim/status] error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
