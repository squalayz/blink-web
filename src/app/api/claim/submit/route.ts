// ════════════════════════════════════════════════════════════════════════════
// POST /api/claim/submit — Airdrop Claim v3.
//
// Body: { eth_address }. Requires the httpOnly session cookie from
// /api/claim/lookup. Validates + checksums the address with viem, then
// upserts airdrop_registrations (the ONLY table this flow writes, besides
// the lookup-attempt log). Address is editable only while status='pending'.
// ════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getAddress } from "viem";
import { blinkworldAdmin } from "@/lib/blinkworld-admin";
import { getPlayerProfileId } from "@/lib/claim-v3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const profileId = getPlayerProfileId(req);
    if (!profileId) {
      return NextResponse.json(
        { error: "Session expired. Enter your Blink Code again." },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => null);
    const rawAddress = (body?.eth_address || "").toString().trim();

    let ethAddress: string;
    try {
      ethAddress = getAddress(rawAddress.toLowerCase());
    } catch {
      return NextResponse.json(
        { error: "That doesn't look like a valid Ethereum address (0x…)." },
        { status: 400 },
      );
    }

    const db = blinkworldAdmin();

    const { data: existing, error: existErr } = await db
      .from("airdrop_registrations")
      .select("id, status")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (existErr) throw existErr;

    if (existing && existing.status !== "pending") {
      return NextResponse.json(
        {
          error: `Your claim is already ${existing.status} — the address is locked. Contact support if it's wrong.`,
          status: existing.status,
        },
        { status: 409 },
      );
    }

    if (existing) {
      const { error } = await db
        .from("airdrop_registrations")
        .update({ eth_address: ethAddress, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .eq("status", "pending");
      if (error) throw error;
    } else {
      // Snapshot the public trainer code for the admin CSV; balances are
      // always re-read fresh from airdrop_export, never stored here.
      const { data: exportRow } = await db
        .from("airdrop_export")
        .select("trainer_code")
        .eq("profile_id", profileId)
        .maybeSingle();

      const { error } = await db.from("airdrop_registrations").insert({
        profile_id: profileId,
        trainer_code: exportRow?.trainer_code ?? null,
        eth_address: ethAddress,
        status: "pending",
      });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, status: "pending", eth_address: ethAddress });
  } catch (e) {
    console.error("[claim/submit] error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
