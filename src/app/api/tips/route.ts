import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const matchId = req.nextUrl.searchParams.get("match_id");

  let query = supabaseAdmin
    .from("tips")
    .select("*")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (matchId) query = query.eq("match_id", matchId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tips: data });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { match_id, receiver_id, amount_eth, tip_type } = body;

  if (!match_id || !receiver_id || !amount_eth) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validTypes = ["power_react", "tip", "super_tip"];
  if (tip_type && !validTypes.includes(tip_type)) {
    return NextResponse.json({ error: "Invalid tip_type" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("tips").insert({
    match_id,
    sender_id: user.id,
    receiver_id,
    amount_eth,
    tip_type: tip_type || "tip",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const label = tip_type === "power_react" ? "Power React!" : tip_type === "super_tip" ? "Super Tip!" : "Tip sent!";
  await supabaseAdmin.from("messages").insert({
    match_id,
    sender_id: user.id,
    text: label,
    message_type: "tip",
    metadata: { amount_eth, tip_type: tip_type || "tip" },
  });

  return NextResponse.json({ ok: true, tip: data });
}
