import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, rateLimitByUser, sanitizeText, isPositiveFinite, isValidLat, isValidLng } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  // 1. Auth check
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  // 2. Rate limit: 10 drops per minute
  const rlError = rateLimitByUser(user!.id, "drop", 10, 60_000);
  if (rlError) return rlError;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 3. Validate required fields
  const { type, currency, amount, latitude, longitude } = body;

  if (!type || !currency || amount == null || latitude == null || longitude == null) {
    return NextResponse.json(
      { error: "Missing required fields: type, currency, amount, latitude, longitude" },
      { status: 400 }
    );
  }

  if (!isPositiveFinite(amount)) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  if (!isValidLat(latitude as number) || !isValidLng(longitude as number)) {
    return NextResponse.json({ error: "Invalid GPS coordinates" }, { status: 400 });
  }

  const dropper_id = user!.id; // Use authenticated user
  const droppedAt = new Date().toISOString();

  // 4. Sanitize text fields
  const message = sanitizeText(body.message, 500);

  // 5. Insert into orbs table
  const { data: insertedOrb, error: insertError } = await supabaseAdmin
    .from("orbs")
    .insert({
      type,
      currency,
      amount,
      claim_fee_usd: typeof body.claim_fee_usd === "number" && isFinite(body.claim_fee_usd) ? body.claim_fee_usd : 0,
      message: message || null,
      lat: latitude,
      lng: longitude,
      dropper_id,
      dropper_name: sanitizeText(body.dropper_name, 50) || null,
      dropper_handle: sanitizeText(body.dropper_handle, 50) || null,
      dropper_pic: typeof body.dropper_pic === "string" ? body.dropper_pic.slice(0, 500) : null,
      rarity: body.rarity ?? "common",
      status: "pending",
      expires_at: body.expires_at ?? null,
      chain: body.chain ?? null,
      fee_wallet: body.fee_wallet ?? null,
      fee_percent: body.fee_percent ?? 0.1,
      dropper_wallet: typeof body.dropper_wallet === "string" ? body.dropper_wallet.slice(0, 100) : null,
      radius_meters: typeof body.radius_meters === "number" ? Math.min(Math.max(body.radius_meters, 10), 500) : 100,
      dropped_at: droppedAt,
    })
    .select()
    .single();

  if (insertError || !insertedOrb) {
    return NextResponse.json(
      { error: "Failed to create orb", details: insertError?.message },
      { status: 500 }
    );
  }

  // 6. Create wallet_lock
  await supabaseAdmin.from("wallet_locks").insert({
    user_id: dropper_id,
    orb_id: insertedOrb.id,
    amount,
    currency,
    status: "locked",
    created_at: droppedAt,
  });

  // 7. Insert activity
  await supabaseAdmin.from("activity").insert({
    user_id: dropper_id,
    type: "drop",
    title: "Orb Dropped",
    description: `You dropped an orb containing ${amount} ${currency}`,
    orb_id: insertedOrb.id,
    amount,
    currency,
    chain: body.chain ?? null,
    created_at: droppedAt,
  });

  return NextResponse.json({ success: true, orb: insertedOrb }, { status: 201 });
}
