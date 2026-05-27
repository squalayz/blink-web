// GET /api/spawns/ambient?lat=X&lng=Y
//
// Returns the 5-12 deterministic wild creature spawns within the requester's
// ~1km cell and its 8 neighbors for the current 5-minute epoch. Generates on
// first hit per (cell, bucket) — subsequent calls are pure SELECTs.

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  rateLimitByUser,
  isValidLat,
  isValidLng,
} from "@/lib/api-auth";
import {
  currentEpochBucket,
  listActiveSpawnsForCells,
  neighborCellIds,
  upsertSpawnsForCells,
} from "@/lib/wild-spawns";
import { ipfsToGatewayUrl, TIER_COLOR } from "@/lib/spawn-pool";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth(req);
    if (authError) return authError;

    const rl = rateLimitByUser(user!.id, "spawns-ambient", 120, 60_000);
    if (rl) return rl;

    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    if (!isValidLat(lat) || !isValidLng(lng)) {
      return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
    }

    const cells = neighborCellIds(lat, lng);
    const bucket = currentEpochBucket();

    const upsert = await upsertSpawnsForCells(cells, bucket);
    if (upsert.error) {
      console.error("spawns ambient upsert failed", upsert.error);
      return NextResponse.json(
        { error: "Failed to seed spawns", details: upsert.error },
        { status: 500 },
      );
    }

    let rows = await listActiveSpawnsForCells(cells);

    // If the user has fewer than 3 active spawns nearby (e.g. most expired
    // mid-bucket under the Pokémon GO-style TTL system), seed the prior
    // bucket too so there are always at least a few creatures to hunt.
    if (!rows || rows.length < 3) {
      await upsertSpawnsForCells(cells, bucket - 1);
      rows = await listActiveSpawnsForCells(cells);
    }

    // Look up which (if any) of these spawns are Genesis Drops so the client
    // can render them with the special pulsing gold ring.
    let genesisSet = new Set<string>();
    const specialIds = rows
      .filter((r) => r.spawn_index === -1)
      .map((r) => r.id);
    if (specialIds.length > 0) {
      const { data: gens } = await supabaseAdmin
        .from("genesis_drops")
        .select("spawn_id")
        .in("spawn_id", specialIds);
      genesisSet = new Set(
        (gens ?? [])
          .map((g) => g.spawn_id as string | null)
          .filter((v): v is string => !!v),
      );
    }

    const spawns = rows.map((row) => ({
      id: row.id,
      lat: row.lat,
      lng: row.lng,
      tier: row.tier,
      tier_color: TIER_COLOR[row.tier],
      name: row.name,
      image_cid: row.image_cid,
      image_url: ipfsToGatewayUrl(row.image_cid),
      expires_at: row.expires_at,
      is_genesis: genesisSet.has(row.id),
      fuzzy_lat: row.lat + (Math.random() - 0.5) * 0.002,
      fuzzy_lng: row.lng + (Math.random() - 0.5) * 0.002,
      fuzzy_radius_m: 150,
    }));

    return NextResponse.json({ spawns, epoch_bucket: bucket });
  } catch (err: unknown) {
    console.error("spawns ambient unhandled", err);
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
