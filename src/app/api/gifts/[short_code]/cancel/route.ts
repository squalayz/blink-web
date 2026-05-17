// POST /api/gifts/[short_code]/cancel — sender refund.
// Off-chain only (asset never left sender's custody — see gift-escrow.ts).

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, rateLimitByUser } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { short_code: string } }) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const rl = rateLimitByUser(user!.id, "gift-cancel", 20, 60_000);
  if (rl) return rl;

  const code = (params.short_code || "").trim().toLowerCase();
  if (!/^[a-z0-9]{6,12}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const { data: gift } = await supabaseAdmin
    .from("gifts")
    .select("id, sender_id, status, spawn_id")
    .eq("short_code", code)
    .maybeSingle();
  if (!gift) return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  if (gift.sender_id !== user!.id) {
    return NextResponse.json({ error: "Not your gift" }, { status: 403 });
  }
  if (!["pending", "spawned"].includes(gift.status)) {
    return NextResponse.json({ error: `Cannot cancel: status ${gift.status}` }, { status: 400 });
  }

  if (gift.spawn_id) {
    await supabaseAdmin
      .from("creature_spawns")
      .update({ expires_at: new Date().toISOString() })
      .eq("id", gift.spawn_id);
  }

  // Conditional update — refuse to clobber a row that another path has
  // already moved to 'claimed' or 'failed' between the SELECT above and now.
  // If 0 rows update we assume the catch path won the race.
  const { data: updated } = await supabaseAdmin
    .from("gifts")
    .update({ status: "refunded", refunded_at: new Date().toISOString() })
    .eq("id", gift.id)
    .in("status", ["pending", "spawned"])
    .select("id")
    .maybeSingle();

  if (!updated) {
    return NextResponse.json(
      { error: "Gift was already claimed — cannot cancel" },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
