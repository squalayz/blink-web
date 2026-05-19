// POST /api/genesis-drops/[slug]/open
//
// PRIVACY: Anchors a Genesis Drop near the FIRST opener's location. Subsequent
// openers just receive the existing spawn coords. The opener's anchor lat/lng
// is NEVER returned to clients — only the spawn coords (which are placed
// uniformly within `proximity_radius_m` of the anchor) are exposed.
//
// Body: { lat: number, lng: number } — opener's current GPS.
// Auth: required.

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  rateLimitByUser,
  isValidLat,
  isValidLng,
} from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { randomPointWithinRadius } from "@/lib/genesis-drops";
import { cellIdOf } from "@/lib/wild-spawns";
import { ipfsToGatewayUrl, TIER_BLINK_REWARD, isBurnTier } from "@/lib/spawn-pool";
import { legacyResolveCreature } from "@/lib/creature-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OpenBody {
  lat?: unknown;
  lng?: unknown;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const { user, error: authError } = await requireAuth(req);
    if (authError) return authError;

    const rl = rateLimitByUser(user!.id, "genesis-drops-open", 30, 60_000);
    if (rl) return rl;

    const slug = (params.slug || "").trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(slug)) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    let body: OpenBody;
    try {
      body = (await req.json()) as OpenBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!isValidLat(lat) || !isValidLng(lng)) {
      return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
    }

    const { data: drop, error: loadErr } = await supabaseAdmin
      .from("genesis_drops")
      .select(
        "id, slug, name, description, tier, image_cid, metadata_cid, blink_reward, anchor_lat, anchor_lng, anchor_user_id, anchor_set_at, spawn_id, caught_by, caught_at, expires_at, waive_fee, proximity_radius_m",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (loadErr) {
      return NextResponse.json(
        { error: "DB read failed", details: loadErr.message },
        { status: 500 },
      );
    }
    if (!drop) {
      return NextResponse.json({ error: "Drop not found" }, { status: 404 });
    }
    if (new Date(drop.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Drop expired" }, { status: 410 });
    }
    if (drop.caught_by) {
      return NextResponse.json(
        { error: "Drop already claimed", caught: true },
        { status: 410 },
      );
    }

    const tier = isBurnTier(drop.tier) ? drop.tier : "mythic";
    const blinkReward =
      typeof drop.blink_reward === "number" && drop.blink_reward > 0
        ? drop.blink_reward
        : TIER_BLINK_REWARD[tier];

    // ── First opener path: anchor + create the wild_spawns row.
    if (drop.anchor_lat == null || drop.anchor_lng == null || !drop.spawn_id) {
      const radius = Math.max(50, Math.min(2000, drop.proximity_radius_m ?? 250));
      const spawnPos = randomPointWithinRadius(lat, lng, radius);

      // IDENTITY: best-effort map the Genesis Drop name to a registry entry
      // so the anchored spawn carries creature_id end-to-end. If the drop
      // refers to a creature outside the v1 registry, leave creature_id null
      // and let the catch-time legacy resolver handle it.
      const genesisCreature = legacyResolveCreature(drop.name, drop.image_cid);
      const spawnRow = {
        s2_cell_id: cellIdOf(spawnPos.lat, spawnPos.lng),
        epoch_bucket: -1,
        spawn_index: -1,
        lat: spawnPos.lat,
        lng: spawnPos.lng,
        tier,
        name: drop.name,
        image_cid: drop.image_cid,
        creature_id: genesisCreature?.id ?? null,
        spawned_at: new Date().toISOString(),
        expires_at: drop.expires_at,
      };

      const { data: spawn, error: spawnErr } = await supabaseAdmin
        .from("wild_spawns")
        .insert(spawnRow)
        .select("id, lat, lng, tier, name, image_cid, expires_at")
        .single();

      if (spawnErr || !spawn) {
        return NextResponse.json(
          {
            error: "Failed to anchor spawn",
            details: spawnErr?.message ?? "no row returned",
          },
          { status: 500 },
        );
      }

      // Anchor the drop. Conditional update on anchor_user_id IS NULL closes
      // the race if two opens land in the same millisecond — only one wins.
      const { data: anchored, error: anchorErr } = await supabaseAdmin
        .from("genesis_drops")
        .update({
          anchor_lat: lat,
          anchor_lng: lng,
          anchor_user_id: user!.id,
          anchor_set_at: new Date().toISOString(),
          spawn_id: spawn.id,
        })
        .eq("id", drop.id)
        .is("anchor_user_id", null)
        .select("id")
        .maybeSingle();

      if (anchorErr) {
        // Best-effort cleanup of the now-orphaned spawn row.
        await supabaseAdmin.from("wild_spawns").delete().eq("id", spawn.id);
        return NextResponse.json(
          { error: "Failed to anchor drop", details: anchorErr.message },
          { status: 500 },
        );
      }
      if (!anchored) {
        // Another opener anchored first in the race — discard our spawn and
        // fall through to "subsequent opener" behavior using the winner's
        // anchor.
        await supabaseAdmin.from("wild_spawns").delete().eq("id", spawn.id);
        const { data: winner } = await supabaseAdmin
          .from("genesis_drops")
          .select("spawn_id")
          .eq("id", drop.id)
          .maybeSingle();
        if (!winner?.spawn_id) {
          return NextResponse.json(
            { error: "Anchor race lost; retry shortly" },
            { status: 409 },
          );
        }
        const { data: existingSpawn } = await supabaseAdmin
          .from("wild_spawns")
          .select("id, lat, lng, tier, name, image_cid, expires_at")
          .eq("id", winner.spawn_id)
          .maybeSingle();
        if (!existingSpawn) {
          return NextResponse.json(
            { error: "Spawn missing after race" },
            { status: 500 },
          );
        }
        return NextResponse.json({
          spawnId: existingSpawn.id,
          lat: existingSpawn.lat,
          lng: existingSpawn.lng,
          name: existingSpawn.name,
          tier: existingSpawn.tier,
          image_cid: existingSpawn.image_cid,
          image_url: ipfsToGatewayUrl(existingSpawn.image_cid),
          blink_reward: blinkReward,
          expires_at: existingSpawn.expires_at,
          isFirstOpener: false,
        });
      }

      return NextResponse.json({
        spawnId: spawn.id,
        lat: spawn.lat,
        lng: spawn.lng,
        name: spawn.name,
        tier: spawn.tier,
        image_cid: spawn.image_cid,
        image_url: ipfsToGatewayUrl(spawn.image_cid),
        blink_reward: blinkReward,
        expires_at: spawn.expires_at,
        isFirstOpener: true,
      });
    }

    // ── Subsequent openers: just look up the spawn the anchor points to.
    const { data: existingSpawn, error: existingErr } = await supabaseAdmin
      .from("wild_spawns")
      .select("id, lat, lng, tier, name, image_cid, expires_at")
      .eq("id", drop.spawn_id)
      .maybeSingle();
    if (existingErr || !existingSpawn) {
      return NextResponse.json(
        { error: "Anchored spawn missing" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      spawnId: existingSpawn.id,
      lat: existingSpawn.lat,
      lng: existingSpawn.lng,
      name: existingSpawn.name,
      tier: existingSpawn.tier,
      image_cid: existingSpawn.image_cid,
      image_url: ipfsToGatewayUrl(existingSpawn.image_cid),
      blink_reward: blinkReward,
      expires_at: existingSpawn.expires_at,
      isFirstOpener: false,
    });
  } catch (err: unknown) {
    console.error("genesis-drops open unhandled", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Unexpected error: ${err.message}`
            : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
