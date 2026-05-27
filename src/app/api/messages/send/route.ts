import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, sanitizeText, rateLimitByUser } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  const rl = rateLimitByUser(user!.id, "dm", 60, 60_000);
  if (rl) return rl;

  let body: { recipient_id?: unknown; body?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (typeof body.recipient_id !== "string" || !body.recipient_id) {
    return NextResponse.json({ error: "recipient_id required" }, { status: 400 });
  }
  if (body.recipient_id === user!.id) {
    return NextResponse.json({ error: "Cannot DM yourself" }, { status: 400 });
  }
  const text = sanitizeText(body.body, 2000);
  if (!text) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  // Friends-only enforcement.
  const { data: friendship } = await supabaseAdmin
    .from("friendships")
    .select("id, status")
    .or(
      `and(requester_id.eq.${user!.id},recipient_id.eq.${body.recipient_id}),and(requester_id.eq.${body.recipient_id},recipient_id.eq.${user!.id})`,
    )
    .maybeSingle();
  if (!friendship || friendship.status !== "accepted") {
    return NextResponse.json({ error: "You can only message friends" }, { status: 403 });
  }

  // Block check — either side.
  const { data: blocks } = await supabaseAdmin
    .from("user_blocks")
    .select("blocker_id")
    .or(
      `and(blocker_id.eq.${user!.id},blocked_id.eq.${body.recipient_id}),and(blocker_id.eq.${body.recipient_id},blocked_id.eq.${user!.id})`,
    );
  if (blocks && blocks.length > 0) {
    return NextResponse.json({ error: "Unable to send" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("direct_messages")
    .insert({
      sender_id: user!.id,
      recipient_id: body.recipient_id,
      body: text,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "42P01") return NextResponse.json({ error: "direct_messages table missing" }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: data });
}
