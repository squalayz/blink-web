import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const matchId = req.nextUrl.searchParams.get("match_id");
  if (!matchId) return NextResponse.json({ error: "match_id required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("locked_photos")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ photos: data });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { match_id, receiver_id, photo_url, price_eth } = body;

  if (!match_id || !receiver_id || !photo_url) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("locked_photos").insert({
    match_id,
    sender_id: user.id,
    receiver_id,
    photo_url,
    price_eth: price_eth || 0.003,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("messages").insert({
    match_id,
    sender_id: user.id,
    text: "Sent a locked photo",
    message_type: "locked_photo",
    metadata: { photo_id: data.id, price_eth: price_eth || 0.003 },
  });

  return NextResponse.json({ ok: true, photo: data });
}
