import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: { user_id: string } }) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  const otherId = ctx.params.user_id;
  if (!otherId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("direct_messages")
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .or(
      `and(sender_id.eq.${user!.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user!.id})`,
    )
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) {
    if (error.code === "42P01") return NextResponse.json({ messages: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mark inbound as read (fire-and-forget).
  supabaseAdmin
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user!.id)
    .eq("sender_id", otherId)
    .is("read_at", null)
    .then(() => {});

  return NextResponse.json({ messages: data ?? [] });
}
