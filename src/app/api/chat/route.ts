import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/chat — send a message
export async function POST(req: NextRequest) {
  const _sessionUser = await getSessionUser();
  if (!_sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = _sessionUser.id;

  try {
    const { match_id, text } = await req.json();
    if (!match_id || !text?.trim()) {
      return NextResponse.json({ error: "match_id and text required" }, { status: 400 });
    }

    // Verify user is in this match and it's revealed
    const { data: match } = await supabaseAdmin
      .from("matches")
      .select("*")
      .eq("id", match_id)
      .eq("revealed", true)
      .single();

    if (!match) return NextResponse.json({ error: "Match not found or not yet accepted" }, { status: 404 });
    if (match.user_a !== userId && match.user_b !== userId) {
      return NextResponse.json({ error: "Not your match" }, { status: 403 });
    }

    const { data: message, error } = await supabaseAdmin
      .from("messages")
      .insert({
        match_id,
        sender_id: userId,
        text: text.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    // Notify other user
    const otherUserId = match.user_a === userId ? match.user_b : match.user_a;
    await supabaseAdmin.from("notifications").insert({
      user_id: otherUserId,
      type: "new_message",
      title: "New message",
      body: text.trim().slice(0, 100),
      metadata: { match_id },
    });

    return NextResponse.json({ message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/chat?match_id=xxx — get messages
export async function GET(req: NextRequest) {
  const _sessionUser = await getSessionUser();
  if (!_sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const matchId = req.nextUrl.searchParams.get("match_id");
  if (!matchId) return NextResponse.json({ error: "match_id required" }, { status: 400 });

  try {
    const { data: messages } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });

    return NextResponse.json({ messages: messages || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
