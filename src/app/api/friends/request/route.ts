import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, sanitizeText } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  let body: { username?: unknown; user_id?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let recipientId: string | null = null;
  if (typeof body.user_id === "string" && body.user_id.length > 0) {
    recipientId = body.user_id;
  } else if (typeof body.username === "string") {
    const handle = sanitizeText(body.username, 40).replace(/^@/, "");
    if (!handle) return NextResponse.json({ error: "username required" }, { status: 400 });
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .ilike("handle", handle)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "User not found" }, { status: 404 });
    recipientId = data.user_id as string;
  }
  if (!recipientId) return NextResponse.json({ error: "Recipient required" }, { status: 400 });
  if (recipientId === user!.id) return NextResponse.json({ error: "Cannot friend yourself" }, { status: 400 });

  // Already friends or pending? Idempotent: surface the existing row.
  const { data: existing } = await supabaseAdmin
    .from("friendships")
    .select("id, status, requester_id, recipient_id")
    .or(
      `and(requester_id.eq.${user!.id},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${user!.id})`,
    )
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ request: existing, existing: true });
  }

  const { data, error } = await supabaseAdmin
    .from("friendships")
    .insert({
      requester_id: user!.id,
      recipient_id: recipientId,
      status: "pending",
    })
    .select()
    .single();
  if (error) {
    if (error.code === "42P01") return NextResponse.json({ error: "Friendships table missing" }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ request: data });
}
