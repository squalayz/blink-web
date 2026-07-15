// GET /api/claim/admin/export — admin-only CSV download of all
// registrations joined with a FRESH airdrop_export read (airdrop_basis is
// the distribution amount source of truth; blink_lifetime is display-only).

import { NextRequest, NextResponse } from "next/server";
import { blinkworldAdmin } from "@/lib/blinkworld-admin";
import { isAdminRequest } from "@/lib/claim-v3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = Array.isArray(v) ? v.join("; ") : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = blinkworldAdmin();
    const { data: regs, error } = await db
      .from("airdrop_registrations")
      .select("id, profile_id, trainer_code, eth_address, status, created_at, updated_at, approved_at, sent_at")
      .order("created_at", { ascending: true });
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

    const header = [
      "profile_id", "display_name", "username", "trainer_code", "eth_address",
      "status", "blink_lifetime", "received_transfers", "airdrop_basis",
      "flagged", "flag_reasons", "account_created", "registered_at",
      "updated_at", "approved_at", "sent_at",
    ];
    const lines = [header.join(",")];
    for (const r of regs ?? []) {
      const x = exportById[r.profile_id] ?? {};
      lines.push(
        [
          r.profile_id,
          x.display_name,
          x.username,
          r.trainer_code ?? x.trainer_code,
          r.eth_address,
          r.status,
          x.blink_lifetime ?? 0,
          x.received_transfers ?? 0,
          x.airdrop_basis ?? 0,
          x.flagged ? "true" : "false",
          x.flag_reasons,
          x.account_created,
          r.created_at,
          r.updated_at,
          r.approved_at,
          r.sent_at,
        ]
          .map(csvCell)
          .join(","),
      );
    }

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(lines.join("\r\n") + "\r\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="blinkworld-airdrop-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[claim/admin/export] error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}
