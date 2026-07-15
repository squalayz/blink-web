// POST /api/claim/admin/update — admin-only status transitions.
// Body: { id, status: 'pending' | 'approved' | 'rejected' | 'sent' }.
// Stamps approved_at / sent_at when entering those states.

import { NextRequest, NextResponse } from "next/server";
import { blinkworldAdmin } from "@/lib/blinkworld-admin";
import { isAdminRequest } from "@/lib/claim-v3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES = ["pending", "approved", "rejected", "sent"] as const;

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const id = (body?.id || "").toString();
    const status = (body?.status || "").toString();

    if (!id || !VALID_STATUSES.includes(status as any)) {
      return NextResponse.json({ error: "Invalid id or status." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const patch: Record<string, string | null> = { status, updated_at: now };
    if (status === "approved") patch.approved_at = now;
    if (status === "sent") patch.sent_at = now;
    if (status === "pending") {
      patch.approved_at = null;
      patch.sent_at = null;
    }

    const db = blinkworldAdmin();
    const { data, error } = await db
      .from("airdrop_registrations")
      .update(patch)
      .eq("id", id)
      .select("id, status, approved_at, sent_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Registration not found." }, { status: 404 });

    return NextResponse.json({ ok: true, registration: data });
  } catch (e) {
    console.error("[claim/admin/update] error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
