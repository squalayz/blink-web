// POST /api/gifts/[short_code]/open — auth required.
// Anchors the gift to the recipient's GPS, spawns a creature 80-300m away,
// creates the gift_avatar row. Race-proof: only first opener wins via a
// conditional UPDATE on status='pending'.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isValidLat, isValidLng, rateLimitByUser } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { pickSpawnPoint, haversineM } from "@/lib/gift-utils";

export const runtime = "nodejs";

// Pin must be within this many meters of the Vercel edge-IP geolocation when
// opening via the no-GPS toggle path. Loose by design — sanity check only.
const TOGGLE_PIN_RADIUS_M = 50_000;

export async function POST(req: NextRequest, { params }: { params: { short_code: string } }) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const rl = rateLimitByUser(user!.id, "gift-open", 10, 60_000);
  if (rl) return rl;

  const code = (params.short_code || "").trim().toLowerCase();
  if (!/^[a-z0-9]{6,12}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  let body: { lat: number; lng: number; via_toggle?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isValidLat(body.lat) || !isValidLng(body.lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const viaToggle = body.via_toggle === true;

  // Sanity check: when the user has no GPS and is pinning on a map, make sure
  // the pin is at least in the same continent as their edge-IP. Skipped when
  // headers are missing (localhost / non-Vercel runtime) so dev still works.
  if (viaToggle) {
    const edgeLatHeader = req.headers.get("x-vercel-ip-latitude");
    const edgeLngHeader = req.headers.get("x-vercel-ip-longitude");
    const edgeLat = edgeLatHeader ? Number(edgeLatHeader) : NaN;
    const edgeLng = edgeLngHeader ? Number(edgeLngHeader) : NaN;
    if (isFinite(edgeLat) && isFinite(edgeLng)) {
      const dist = haversineM(edgeLat, edgeLng, body.lat, body.lng);
      if (dist > TOGGLE_PIN_RADIUS_M) {
        return NextResponse.json(
          { error: "Pin must be within 50km of your region", distance_m: Math.round(dist) },
          { status: 400 }
        );
      }
    }
  }

  // Load gift, verify state.
  const { data: gift } = await supabaseAdmin
    .from("gifts")
    .select("*")
    .eq("short_code", code)
    .maybeSingle();
  if (!gift) return NextResponse.json({ error: "Gift not found" }, { status: 404 });

  if (gift.sender_id === user!.id) {
    return NextResponse.json({ error: "You can't open your own gift" }, { status: 400 });
  }
  const expired = new Date(gift.expires_at).getTime() < Date.now();
  if (expired) return NextResponse.json({ error: "Gift expired" }, { status: 410 });
  if (gift.status === "claimed") {
    return NextResponse.json({ error: "Gift already claimed" }, { status: 410 });
  }

  // If already spawned and the spawner is this same user, return existing spawn.
  if (gift.status === "spawned" && gift.recipient_id === user!.id) {
    const { data: spawn } = await supabaseAdmin
      .from("creature_spawns")
      .select("id, true_lat, true_lng, species, rarity")
      .eq("id", gift.spawn_id)
      .maybeSingle();
    const { data: avatar } = await supabaseAdmin
      .from("gift_avatars")
      .select("*")
      .eq("gift_id", gift.id)
      .maybeSingle();
    return NextResponse.json({
      already_open: true,
      spawn: spawn
        ? { id: spawn.id, lat: spawn.true_lat, lng: spawn.true_lng, species: spawn.species, rarity: spawn.rarity }
        : null,
      avatar: avatar
        ? { lat: avatar.avatar_lat, lng: avatar.avatar_lng, anchor_lat: avatar.anchor_lat, anchor_lng: avatar.anchor_lng }
        : null,
    });
  }
  if (gift.status === "spawned" && gift.recipient_id !== user!.id) {
    // Someone else already claimed the spawn.
    return NextResponse.json({ error: "Gift already opened" }, { status: 410 });
  }
  if (gift.status !== "pending") {
    return NextResponse.json({ error: `Gift status: ${gift.status}` }, { status: 410 });
  }

  // Race-proof claim of the gift: conditional update sets recipient_id and
  // status='spawned' ONLY if it's still pending. If two openers race, the
  // loser sees rowsAffected=0.
  const { data: claimed, error: claimErr } = await supabaseAdmin
    .from("gifts")
    .update({
      recipient_id: user!.id,
      opened_at: new Date().toISOString(),
    })
    .eq("id", gift.id)
    .eq("status", "pending")
    .is("recipient_id", null)
    .select("id")
    .maybeSingle();
  if (claimErr || !claimed) {
    return NextResponse.json({ error: "Gift was just opened by another hunter" }, { status: 410 });
  }

  // Choose the spawn point near the recipient.
  const spawn = pickSpawnPoint(body.lat, body.lng);

  // Pick a species/rarity to match the asset.
  const species =
    gift.asset_type === "nft" ? "Spirit Gift NFT"
      : gift.asset_type === "blink" ? "Spirit Gift BLINK"
      : "Spirit Gift ETH";
  const rarity =
    gift.asset_type === "nft" ? "legendary" : "rare";

  // Create the creature_spawn row. fuzzy_lat/lng = true location for recipient
  // (gift creatures aren't fuzzed — the recipient is supposed to find it).
  const { data: spawnRow, error: spawnErr } = await supabaseAdmin
    .from("creature_spawns")
    .insert({
      species,
      rarity,
      true_lat: spawn.lat,
      true_lng: spawn.lng,
      fuzzy_lat: spawn.lat,
      fuzzy_lng: spawn.lng,
      fuzzy_radius_m: 0,
      expires_at: gift.expires_at,
      gift_id: gift.id,
      is_gift: true,
    })
    .select("id, true_lat, true_lng, species, rarity")
    .single();
  if (spawnErr || !spawnRow) {
    console.error("gift open spawn err", spawnErr);
    return NextResponse.json({ error: "Failed to create spawn" }, { status: 500 });
  }

  const nextMetadata = {
    ...(gift.payload_metadata && typeof gift.payload_metadata === "object" ? gift.payload_metadata : {}),
    ...(viaToggle
      ? { opened_via: "toggle", walk_anchor: { lat: body.lat, lng: body.lng } }
      : { opened_via: "gps" }),
  };

  await supabaseAdmin
    .from("gifts")
    .update({
      status: "spawned",
      spawn_id: spawnRow.id,
      spawn_anchor_lat: body.lat,
      spawn_anchor_lng: body.lng,
      payload_metadata: nextMetadata,
    })
    .eq("id", gift.id);

  await supabaseAdmin
    .from("gift_avatars")
    .upsert({
      gift_id: gift.id,
      user_id: user!.id,
      avatar_lat: body.lat,
      avatar_lng: body.lng,
      anchor_lat: body.lat,
      anchor_lng: body.lng,
      last_update: new Date().toISOString(),
    });

  return NextResponse.json({
    already_open: false,
    spawn: { id: spawnRow.id, lat: spawnRow.true_lat, lng: spawnRow.true_lng, species: spawnRow.species, rarity: spawnRow.rarity },
    avatar: { lat: body.lat, lng: body.lng, anchor_lat: body.lat, anchor_lng: body.lng },
  });
}
