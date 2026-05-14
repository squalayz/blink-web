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

  if (type !== "nft" && !isPositiveFinite(amount)) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  if (!isValidLat(latitude as number) || !isValidLng(longitude as number)) {
    return NextResponse.json({ error: "Invalid GPS coordinates" }, { status: 400 });
  }

  const dropper_id = user!.id; // Use authenticated user
  const droppedAt = new Date().toISOString();

  // 4. Sanitize text fields
  const message = sanitizeText(body.message, 500);

  // 5. Build insert payload — only include fields that exist in the table
  const insertPayload: Record<string, unknown> = {
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
    expires_at: body.expires_at ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    chain: body.chain ?? null,
    fee_wallet: body.fee_wallet ?? null,
    fee_percent: body.fee_percent ?? 0.1,
    dropper_wallet: typeof body.dropper_wallet === "string" ? body.dropper_wallet.slice(0, 100) : null,
    radius_meters: typeof body.radius_meters === "number" ? Math.min(Math.max(body.radius_meters, 10), 500) : 100,
  };

  // NFT-specific fields
  if (type === "nft") {
    const nft_name = sanitizeText(body.nft_name, 50) || "";
    const nft_description = sanitizeText(body.nft_description, 200) || "";
    insertPayload.message = `[NFT] ${nft_name}: ${nft_description}`;
    if (typeof body.nft_image_url === "string") {
      insertPayload.media_url = body.nft_image_url.slice(0, 500);
    }
    insertPayload.media_type = "image";
    insertPayload.nft_mint_status = "pending";
    insertPayload.nft_reward = true;
    if (!isPositiveFinite(amount)) {
      insertPayload.amount = 0;
      insertPayload.amount_usd = 0;
    }
  }

  // Optional fields from drop page
  if (typeof body.amount_usd === "number" && isFinite(body.amount_usd as number)) insertPayload.amount_usd = body.amount_usd;
  if (type !== "nft" && body.media_url) insertPayload.media_url = body.media_url;
  if (type !== "nft" && body.media_type) insertPayload.media_type = body.media_type;
  if (typeof body.fling_origin_lat === "number") insertPayload.fling_origin_lat = body.fling_origin_lat;
  if (typeof body.fling_origin_lng === "number") insertPayload.fling_origin_lng = body.fling_origin_lng;
  if (typeof body.fling_force === "number") insertPayload.fling_force = body.fling_force;
  if (typeof body.fling_direction === "number") insertPayload.fling_direction = body.fling_direction;

  const { data: insertedOrb, error: insertError } = await supabaseAdmin
    .from("orbs")
    .insert(insertPayload)
    .select()
    .single();

  if (insertError || !insertedOrb) {
    return NextResponse.json(
      { error: "Failed to create orb", details: insertError?.message },
      { status: 500 }
    );
  }

  // 6. Create wallet_lock
  const { error: lockError } = await supabaseAdmin.from("wallet_locks").insert({
    user_id: dropper_id,
    orb_id: insertedOrb.id,
    amount,
    currency,
    status: "locked",
    created_at: droppedAt,
  });

  if (lockError) {
    console.error("Failed to create wallet_lock:", lockError.message);
  }

  // 7. Insert activity
  const { error: activityError } = await supabaseAdmin.from("activity").insert({
    user_id: dropper_id,
    type: "drop",
    title: "Orb Dropped",
    subtitle: `You dropped an orb containing ${amount} ${currency}`,
    amount_text: `${amount} ${currency}`,
    orb_id: insertedOrb.id,
    amount,
    currency,
    chain: body.chain ?? null,
    created_at: droppedAt,
  });

  if (activityError) {
    console.error("Failed to insert activity:", activityError.message);
  }

  return NextResponse.json({ success: true, orb: insertedOrb }, { status: 201 });
}
