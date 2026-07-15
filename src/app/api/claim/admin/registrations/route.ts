// GET /api/claim/admin/registrations — admin-only list of airdrop
// registrations joined against a FRESH read of airdrop_export (balances,
// airdrop_basis, flags are never cached in airdrop_registrations).

import { NextRequest, NextResponse } from "next/server";
import { blinkworldAdmin } from "@/lib/blinkworld-admin";
import { isAdminRequest } from "@/lib/claim-v3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = blinkworldAdmin();
    const { data: regs, error } = await db
      .from("airdrop_registrations")
      .select("id, profile_id, trainer_code, eth_address, status, created_at, updated_at, approved_at, sent_at")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const ids = (regs ?? []).map((r) => r.profile_id);
    let exportById: Record<string, any> = {};
    if (ids.length > 0) {
      const { data: exportRows, error: exportErr } = await db
        .from("airdrop_export")
        .select("profile_id, display_name, username, trainer_code, account_created, blink_lifetime, received_transfers, airdrop_basis, flagged, flag_reasons")
        .in("profile_id", ids);
      if (exportErr) throw exportErr;
      exportById = Object.fromEntries((exportRows ?? []).map((r) => [r.profile_id, r]));
    }

    const rows = (regs ?? []).map((r) => {
      const x = exportById[r.profile_id] ?? {};
      return {
        ...r,
        display_name: x.display_name ?? null,
        username: x.username ?? null,
        trainer_code: r.trainer_code ?? x.trainer_code ?? null,
        account_created: x.account_created ?? null,
        blink_lifetime: Number(x.blink_lifetime ?? 0),
        received_transfers: Number(x.received_transfers ?? 0),
        airdrop_basis: Number(x.airdrop_basis ?? 0),
        flagged: Boolean(x.flagged),
        flag_reasons: x.flag_reasons ?? null,
      };
    });

    return NextResponse.json({ ok: true, registrations: rows });
  } catch (e) {
    console.error("[claim/admin/registrations] error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Failed to load registrations." }, { status: 500 });
  }
}
