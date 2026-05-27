import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  let body: { user_id?: unknown; unblock?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (typeof body.user_id !== "string" || !body.user_id) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }
  if (body.user_id === user!.id) {
    return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
  }

  if (body.unblock === true) {
    const { error } = await supabaseAdmin
      .from("user_blocks")
      .delete()
      .eq("blocker_id", user!.id)
      .eq("blocked_id", body.user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "unblocked" });
  }

  // Insert block + tear down any existing friendship.
  const { error: insErr } = await supabaseAdmin
    .from("user_blocks")
    .upsert(
      { blocker_id: user!.id, blocked_id: body.user_id },
      { onConflict: "blocker_id,blocked_id" },
    );
  if (insErr) {
    if (insErr.code === "42P01") return NextResponse.json({ error: "user_blocks table missing" }, { status: 503 });
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  await supabaseAdmin
    .from("friendships")
    .delete()
    .or(
      `and(requester_id.eq.${user!.id},recipient_id.eq.${body.user_id}),and(requester_id.eq.${body.user_id},recipient_id.eq.${user!.id})`,
    );

  return NextResponse.json({ ok: true, action: "blocked" });
}
