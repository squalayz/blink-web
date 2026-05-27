import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, sanitizeText, rateLimitByUser } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  const rl = rateLimitByUser(user!.id, "report", 10, 60_000);
  if (rl) return rl;

  let body: { user_id?: unknown; reason?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (typeof body.user_id !== "string" || !body.user_id) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }
  const reason = sanitizeText(body.reason, 600);
  if (!reason) return NextResponse.json({ error: "reason required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("user_reports").insert({
    reporter_id: user!.id,
    reported_id: body.user_id,
    reason,
  });
  if (error) {
    if (error.code === "42P01") return NextResponse.json({ error: "user_reports table missing" }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
