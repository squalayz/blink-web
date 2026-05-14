import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, rateLimitByUser, isValidLat, isValidLng } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  const rlError = rateLimitByUser(user!.id, "launch", 5, 60_000);
  if (rlError) return rlError;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { latitude, longitude } = body;

  if (!isValidLat(latitude as number) || !isValidLng(longitude as number)) {
    return NextResponse.json({ error: "Invalid GPS coordinates" }, { status: 400 });
  }

  const now = new Date();
  const fundDeadline = new Date(now.getTime() + 10 * 60 * 1000); // +10 minutes

  const { data: insertedOrb, error: insertError } = await supabaseAdmin
    .from("orbs")
    .insert({
      type: "Crypto",
      currency: null,
      amount: null,
      claim_fee_usd: 0,
      message: null,
      lat: latitude,
      lng: longitude,
      dropper_id: user!.id,
      status: "unfunded",
      fund_deadline: fundDeadline.toISOString(),
      rarity: "Common",
      radius_meters: 100,
      dropped_at: now.toISOString(),
      fling_origin_lat: typeof body.fling_origin_lat === "number" ? body.fling_origin_lat : null,
      fling_origin_lng: typeof body.fling_origin_lng === "number" ? body.fling_origin_lng : null,
      fling_force: typeof body.fling_force === "number" ? body.fling_force : null,
      fling_direction: typeof body.fling_direction === "number" ? body.fling_direction : null,
    })
    .select()
    .single();

  if (insertError || !insertedOrb) {
    return NextResponse.json(
      { error: "Failed to create orb", details: insertError?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, orb: insertedOrb }, { status: 201 });
}
