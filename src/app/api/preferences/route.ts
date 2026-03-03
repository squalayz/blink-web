import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preferences: data || null });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    connection_types, interested_in, age_range_min, age_range_max,
    location_preference, dealbreakers, vibe, looking_for, industry,
    stage, what_i_bring, what_i_need, trading_style, trading_looking_for,
    preferred_strategies, min_reputation,
  } = body;

  const payload: Record<string, any> = { updated_at: new Date().toISOString() };
  if (connection_types !== undefined) payload.connection_types = connection_types;
  if (interested_in !== undefined) payload.interested_in = interested_in;
  if (age_range_min !== undefined) payload.age_range_min = age_range_min;
  if (age_range_max !== undefined) payload.age_range_max = age_range_max;
  if (location_preference !== undefined) payload.location_preference = location_preference;
  if (dealbreakers !== undefined) payload.dealbreakers = dealbreakers;
  if (vibe !== undefined) payload.vibe = vibe;
  if (looking_for !== undefined) payload.looking_for = looking_for;
  if (industry !== undefined) payload.industry = industry;
  if (stage !== undefined) payload.stage = stage;
  if (what_i_bring !== undefined) payload.what_i_bring = what_i_bring;
  if (what_i_need !== undefined) payload.what_i_need = what_i_need;
  if (trading_style !== undefined) payload.trading_style = trading_style;
  if (trading_looking_for !== undefined) payload.trading_looking_for = trading_looking_for;
  if (preferred_strategies !== undefined) payload.preferred_strategies = preferred_strategies;
  if (min_reputation !== undefined) payload.min_reputation = min_reputation;

  // Upsert — insert if not exists, update if exists
  const { data, error } = await supabaseAdmin
    .from("user_preferences")
    .upsert({ user_id: user.id, ...payload }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, preferences: data });
}
