// ════════════════════════════════════════════════════════════════════════════
// POST /api/claim/lookup — Airdrop Claim v3.
//
// Body: { code } — the player's PRIVATE Blink Code (XXXX-XXXX). No email,
// no password, no OTP. Reads claim_codes → airdrop_export on the BlinkWorld
// game project (read-only), logs a hashed-IP attempt row, and on success
// issues a 20-minute httpOnly session cookie bound to the profile_id.
// ════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { blinkworldAdmin } from "@/lib/blinkworld-admin";
import {
  normalizeBlinkCode,
  signSession,
  getClientIp,
  hashIp,
  PLAYER_COOKIE,
  PLAYER_TTL_S,
  SESSION_COOKIE_OPTS,
} from "@/lib/claim-v3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_FAIL =
  "That code isn't recognized. Double-check your private Blink Code in the app and try again.";

const RATE_LIMITED = "Too many attempts. Try again later.";

export async function POST(req: NextRequest) {
  try {
    const db = blinkworldAdmin();
    const ipHash = hashIp(getClientIp(req));
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // ── Rate limit: max 30 total / 5 failed lookups per hour per IP ──
    const [{ count: total }, { count: failed }] = await Promise.all([
      db
        .from("airdrop_lookup_attempts")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", hourAgo),
      db
        .from("airdrop_lookup_attempts")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .eq("success", false)
        .gte("created_at", hourAgo),
    ]);
    if ((total ?? 0) >= 30 || (failed ?? 0) >= 5) {
      return NextResponse.json({ error: RATE_LIMITED }, { status: 429 });
    }

    const logAttempt = (success: boolean) =>
      db.from("airdrop_lookup_attempts").insert({ ip_hash: ipHash, success });

    const body = await req.json().catch(() => null);
    const raw = (body?.code || "").toString();
    const { cleaned, formatted, looksLikeTrainerCode } = normalizeBlinkCode(raw);

    if (!cleaned) {
      return NextResponse.json({ error: "Enter your Blink Code." }, { status: 400 });
    }

    // Public BL-XXXX trainer/buddy codes are NEVER valid claim credentials.
    if (looksLikeTrainerCode) {
      await logAttempt(false);
      return NextResponse.json(
        {
          error:
            "That's your public Buddy Code — it can't claim tokens. Your private Blink Code is 8 characters (XXXX-XXXX) and is shown only to you in the BlinkWorld app.",
        },
        { status: 400 },
      );
    }

    if (!formatted) {
      await logAttempt(false);
      return NextResponse.json({ error: GENERIC_FAIL }, { status: 401 });
    }

    // ── claim_codes: private code → profile (read-only) ──
    const { data: codeRow, error: codeErr } = await db
      .from("claim_codes")
      .select("profile_id")
      .eq("code", formatted)
      .maybeSingle();

    if (codeErr || !codeRow) {
      await logAttempt(false);
      return NextResponse.json({ error: GENERIC_FAIL }, { status: 401 });
    }

    // ── airdrop_export: player-visible balance only (read-only view) ──
    const { data: exportRow, error: exportErr } = await db
      .from("airdrop_export")
      .select("profile_id, display_name, username, blink_lifetime")
      .eq("profile_id", codeRow.profile_id)
      .maybeSingle();

    if (exportErr || !exportRow) {
      await logAttempt(false);
      return NextResponse.json({ error: GENERIC_FAIL }, { status: 401 });
    }

    // Returning player? Surface their registration so the UI can show status.
    const { data: reg } = await db
      .from("airdrop_registrations")
      .select("eth_address, status, updated_at")
      .eq("profile_id", codeRow.profile_id)
      .maybeSingle();

    // Total $BLINK already received (incremental payout history); the table
    // may not exist yet — degrade to null, the UI just omits the line.
    const { data: paid, error: paidErr } = await db
      .from("airdrop_payouts")
      .select("amount_wei")
      .eq("profile_id", codeRow.profile_id);
    const blinkReceivedWei =
      paidErr || !paid
        ? null
        : paid.reduce((s, p) => s + BigInt(p.amount_wei || "0"), 0n).toString();

    await logAttempt(true);

    const res = NextResponse.json({
      ok: true,
      display_name: exportRow.display_name || exportRow.username || "Explorer",
      blink_lifetime: Number(exportRow.blink_lifetime || 0),
      blink_received_wei: blinkReceivedWei,
      existing_claim: reg
        ? { eth_address: reg.eth_address, status: reg.status, updated_at: reg.updated_at }
        : null,
    });
    res.cookies.set(
      PLAYER_COOKIE,
      signSession({ pid: codeRow.profile_id }, PLAYER_TTL_S),
      { ...SESSION_COOKIE_OPTS, maxAge: PLAYER_TTL_S },
    );
    return res;
  } catch (e) {
    console.error("[claim/lookup] error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
