// POST /api/gifts/[short_code]/catch — recipient catches the gift creature.
// Verifies avatar is within CATCH_RADIUS_M of the spawn, then executes the
// on-chain transfer of the underlying asset from sender to recipient.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isValidLat, isValidLng, rateLimitByUser } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { haversineM } from "@/lib/geo-fuzz";
import {
  executeETHClaim,
  executeBlinkClaim,
  executeNFTClaim,
  loadRecipientAddress,
} from "@/lib/gift-escrow";
import type { GiftAssetPayload } from "@/lib/gift-utils";

export const runtime = "nodejs";

const CATCH_RADIUS_M = 50;

export async function POST(req: NextRequest, { params }: { params: { short_code: string } }) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const rl = rateLimitByUser(user!.id, "gift-catch", 10, 60_000);
  if (rl) return rl;

  const code = (params.short_code || "").trim().toLowerCase();
  if (!/^[a-z0-9]{6,12}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  let body: { avatar_lat: number; avatar_lng: number; via_toggle?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isValidLat(body.avatar_lat) || !isValidLng(body.avatar_lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const viaToggle = body.via_toggle === true;

  const { data: gift } = await supabaseAdmin
    .from("gifts")
    .select("*")
    .eq("short_code", code)
    .maybeSingle();
  if (!gift) return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  if (gift.recipient_id !== user!.id) {
    return NextResponse.json({ error: "Not your gift" }, { status: 403 });
  }
  if (gift.status !== "spawned") {
    return NextResponse.json({ error: `Gift status: ${gift.status}` }, { status: 410 });
  }
  if (new Date(gift.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Gift expired" }, { status: 410 });
  }
  if (!gift.spawn_id) {
    return NextResponse.json({ error: "No spawn for this gift" }, { status: 500 });
  }

  // Toggle catches are only valid if the open was also via toggle. This means
  // you can't bypass the proximity check by passing via_toggle on a GPS open.
  const metadata = (gift.payload_metadata && typeof gift.payload_metadata === "object" ? gift.payload_metadata : {}) as Record<string, unknown>;
  const openedViaToggle = metadata.opened_via === "toggle";
  if (viaToggle && !openedViaToggle) {
    return NextResponse.json({ error: "This gift wasn't opened in walk mode" }, { status: 400 });
  }
  if (!viaToggle && openedViaToggle) {
    return NextResponse.json({ error: "This gift was opened in walk mode — finish the walk" }, { status: 400 });
  }

  const { data: spawn } = await supabaseAdmin
    .from("creature_spawns")
    .select("true_lat, true_lng, caught_by")
    .eq("id", gift.spawn_id)
    .maybeSingle();
  if (!spawn) return NextResponse.json({ error: "Spawn missing" }, { status: 500 });
  if (spawn.caught_by) {
    return NextResponse.json({ error: "Already caught" }, { status: 410 });
  }

  if (!viaToggle) {
    // Server-side avatar truth check (real-GPS path only).
    const { data: avatar } = await supabaseAdmin
      .from("gift_avatars")
      .select("avatar_lat, avatar_lng")
      .eq("gift_id", gift.id)
      .maybeSingle();
    const avLat = avatar?.avatar_lat ?? body.avatar_lat;
    const avLng = avatar?.avatar_lng ?? body.avatar_lng;

    const dist = haversineM(avLat, avLng, spawn.true_lat, spawn.true_lng);
    if (dist > CATCH_RADIUS_M) {
      return NextResponse.json(
        { error: "Too far from creature", distance_m: Math.round(dist), needed_m: CATCH_RADIUS_M },
        { status: 400 }
      );
    }
  }

  // Atomic claim of the creature itself first — guards against double-catch.
  const { data: caught } = await supabaseAdmin
    .from("creature_spawns")
    .update({ caught_by: user!.id, caught_at: new Date().toISOString() })
    .eq("id", gift.spawn_id)
    .is("caught_by", null)
    .select("id")
    .maybeSingle();
  if (!caught) {
    return NextResponse.json({ error: "Already caught" }, { status: 410 });
  }

  // Recipient ETH address.
  const recipientAddr = await loadRecipientAddress(user!.id);
  if (!recipientAddr) {
    return NextResponse.json({ error: "Recipient has no ETH address on file" }, { status: 400 });
  }

  // Execute the on-chain transfer.
  const payload = gift.asset_payload as GiftAssetPayload;
  let result: { ok: boolean; txHash?: string; error?: string };
  if (gift.asset_type === "eth") {
    result = await executeETHClaim(gift.sender_id, recipientAddr, Number(payload.amount));
  } else if (gift.asset_type === "blink") {
    result = await executeBlinkClaim(gift.sender_id, recipientAddr, Number(payload.amount));
  } else if (gift.asset_type === "nft") {
    result = await executeNFTClaim(
      gift.sender_id,
      recipientAddr,
      String(payload.contract),
      String(payload.token_id)
    );
  } else {
    result = { ok: false, error: "Unknown asset_type" };
  }

  if (!result.ok) {
    // Mark failed. Unclaim the creature so it's clearly visible to the user.
    // tx_status='failed' lets the sweeper investigate broadcasts that never
    // confirmed (so it can optionally reset to 'spawned' for re-attempt).
    await supabaseAdmin
      .from("gifts")
      .update({
        status: "failed",
        tx_status: "failed",
        on_chain_claim_tx: result.txHash ?? null,
      })
      .eq("id", gift.id);
    return NextResponse.json({ error: result.error || "Transfer failed" }, { status: 500 });
  }

  const claimedMetadata = {
    ...metadata,
    claimed_via: viaToggle ? "toggle" : "gps",
  };

  await supabaseAdmin
    .from("gifts")
    .update({
      status: "claimed",
      claimed_at: new Date().toISOString(),
      on_chain_claim_tx: result.txHash,
      tx_status: "confirmed",
      payload_metadata: claimedMetadata,
    })
    .eq("id", gift.id);

  return NextResponse.json({
    ok: true,
    tx_hash: result.txHash,
    asset_type: gift.asset_type,
    asset_payload: payload,
  });
}
