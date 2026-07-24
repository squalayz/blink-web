// POST /api/claim/admin/ignore — admin-only ignore/unignore toggle.
// Body: { id, ignored: boolean }. Ignored users stay listed (faded in the
// panel) but the payout API refuses to send them tokens and approve is
// blocked until unignored.

import { NextRequest, NextResponse } from "next/server";
import { blinkworldAdmin } from "@/lib/blinkworld-admin";
import { isAdminRequest } from "@/lib/claim-v3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const id = (body?.id || "").toString();
    const ignored = body?.ignored;

    if (!id || typeof ignored !== "boolean") {
      return NextResponse.json({ error: "Invalid id or ignored flag." }, { status: 400 });
    }

    const db = blinkworldAdmin();
    const { data, error } = await db
      .from("airdrop_registrations")
      .update({ ignored, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, ignored")
      .maybeSingle();
    if (error) {
      // most likely the ignored column migration hasn't been applied yet
      return NextResponse.json(
        {
          error:
            "Couldn't update the ignored flag — run supabase/migrations/20260723_airdrop_ignored_column.sql " +
            "on the BlinkWorld project if you haven't yet.",
        },
        { status: 503 },
      );
    }
    if (!data) return NextResponse.json({ error: "Registration not found." }, { status: 404 });

    return NextResponse.json({ ok: true, registration: data });
  } catch (e) {
    console.error("[claim/admin/ignore] error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
