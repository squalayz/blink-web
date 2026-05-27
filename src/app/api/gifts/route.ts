// GET /api/gifts — sender's gift history (auth required).
// Returns most-recent-first. Used by /gifts page.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: qErr } = await supabaseAdmin
    .from("gifts")
    .select(
      "id, short_code, recipient_username, recipient_id, asset_type, asset_payload, mode, anonymous, message, status, expires_at, created_at, claimed_at, refunded_at, on_chain_claim_tx"
    )
    .eq("sender_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const nowMs = Date.now();
  const gifts = (data ?? []).map((g) => {
    const expired = new Date(g.expires_at).getTime() < nowMs;
    return {
      ...g,
      status: expired && g.status === "pending" ? "expired" : g.status,
    };
  });

  return NextResponse.json({ gifts });
}
