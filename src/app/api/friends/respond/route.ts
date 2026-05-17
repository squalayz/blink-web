import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  let body: { request_id?: unknown; accept?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { request_id, accept } = body;
  if (typeof request_id !== "string" || typeof accept !== "boolean") {
    return NextResponse.json({ error: "request_id (uuid) and accept (bool) required" }, { status: 400 });
  }

  // Conditional update — read+update via a single SQL statement so two
  // simultaneous responds can't both succeed. The .eq('status', 'pending')
  // clause means the second writer matches 0 rows and we return 409.
  // We also constrain to the recipient_id so ownership and pending-ness
  // are enforced in the same statement.
  if (!accept) {
    const { data: declined, error } = await supabaseAdmin
      .from("friendships")
      .delete()
      .eq("id", request_id)
      .eq("recipient_id", user!.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!declined) {
      return NextResponse.json({ error: "Already responded" }, { status: 409 });
    }
    return NextResponse.json({ ok: true, action: "declined" });
  }

  const { data: accepted, error } = await supabaseAdmin
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", request_id)
    .eq("recipient_id", user!.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!accepted) {
    return NextResponse.json({ error: "Already responded" }, { status: 409 });
  }
  return NextResponse.json({ ok: true, action: "accepted" });
}
