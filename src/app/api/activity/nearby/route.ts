// GET /api/activity/nearby — recent catches + active Watchers around a point.
// Powers the "X Watchers nearby · Y recent catches" chip on /map.
//
// Privacy: every coordinate returned is fuzzed by a deterministic ±20m offset
// (per-user, 5-minute bucket) so the response can never reveal a real GPS
// position even if cached or scraped.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, isValidLat, isValidLng } from "@/lib/api-auth";
import { bboxFor, haversineM, obfuscate, seedFor } from "@/lib/geo-fuzz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WATCHER_STALE_MS = 5 * 60 * 1000; // 5 min
const RECENT_CATCH_MS = 10 * 60 * 1000; // 10 min
const FUZZ_RADIUS_M = 20;
const MAX_WATCHERS = 30;
const MAX_RECENT_CATCHES = 20;

type RecentCatch = {
  id: string;
  lat: number;
  lng: number;
  tier: string;
  name: string;
  caughtAt: string;
  catcherHandle: string;
};

type Watcher = {
  user_id: string;
  handle: string | null;
  lat: number;
  lng: number;
  lastSeenAt: string;
};

export async function GET(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusKm = Math.min(20, Math.max(0.1, Number(searchParams.get("radiusKm") || 2)));
  if (!isValidLat(lat) || !isValidLng(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }
  const radiusM = radiusKm * 1000;
  const box = bboxFor(lat, lng, radiusM);

  // ── Recent catches ────────────────────────────────────────────────────
  const recentSince = new Date(Date.now() - RECENT_CATCH_MS).toISOString();
  const recentCatches: RecentCatch[] = [];

  try {
    const { data: catches } = await supabaseAdmin
      .from("wild_spawns")
      .select("id, lat, lng, tier, name, caught_at, caught_by")
      .not("caught_at", "is", null)
      .gte("caught_at", recentSince)
      .gte("lat", box.minLat)
      .lte("lat", box.maxLat)
      .gte("lng", box.minLng)
      .lte("lng", box.maxLng)
      .order("caught_at", { ascending: false })
      .limit(MAX_RECENT_CATCHES * 2);

    const catcherIds = Array.from(
      new Set(((catches ?? []) as Array<{ caught_by: string | null }>).map((c) => c.caught_by).filter(Boolean) as string[]),
    );
    let handleMap = new Map<string, { handle: string | null }>();
    if (catcherIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("user_id, handle, display_name, presence_mode")
        .in("user_id", catcherIds);
      handleMap = new Map(
        (profs ?? []).map((p: Record<string, unknown>) => [
          p.user_id as string,
          {
            handle:
              p.presence_mode === "ghost"
                ? null
                : ((p.handle as string) ?? (p.display_name as string) ?? null),
          },
        ]),
      );
    }

    for (const row of (catches ?? []) as Array<{
      id: string;
      lat: number;
      lng: number;
      tier: string;
      name: string;
      caught_at: string;
      caught_by: string | null;
    }>) {
      const dist = haversineM(lat, lng, row.lat, row.lng);
      if (dist > radiusM) continue;
      const ownerHandle = row.caught_by ? handleMap.get(row.caught_by)?.handle ?? null : null;
      const seed = seedFor(row.id, new Date(row.caught_at).getTime());
      const { fuzzy_lat, fuzzy_lng } = obfuscate(row.lat, row.lng, FUZZ_RADIUS_M, seed);
      recentCatches.push({
        id: row.id,
        lat: fuzzy_lat,
        lng: fuzzy_lng,
        tier: row.tier,
        name: row.name,
        caughtAt: row.caught_at,
        catcherHandle: ownerHandle ?? "A Watcher",
      });
      if (recentCatches.length >= MAX_RECENT_CATCHES) break;
    }
  } catch {
    /* table missing or migration not applied — return empty */
  }

  // ── Active Watchers ───────────────────────────────────────────────────
  const watcherSince = new Date(Date.now() - WATCHER_STALE_MS).toISOString();
  const activeWatchers: Watcher[] = [];

  try {
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("user_id, handle, display_name, presence_mode, last_lat, last_lng, last_seen_at")
      .not("last_seen_at", "is", null)
      .gte("last_seen_at", watcherSince)
      .gte("last_lat", box.minLat)
      .lte("last_lat", box.maxLat)
      .gte("last_lng", box.minLng)
      .lte("last_lng", box.maxLng)
      .limit(MAX_WATCHERS * 3);

    for (const row of (profs ?? []) as Array<{
      user_id: string;
      handle: string | null;
      display_name: string | null;
      presence_mode: string | null;
      last_lat: number | null;
      last_lng: number | null;
      last_seen_at: string;
    }>) {
      if (!row.last_lat || !row.last_lng) continue;
      if (row.user_id === user!.id) continue;
      if (row.presence_mode === "ghost") continue;
      const dist = haversineM(lat, lng, row.last_lat, row.last_lng);
      if (dist > radiusM) continue;
      const seed = seedFor(row.user_id, Date.now());
      const { fuzzy_lat, fuzzy_lng } = obfuscate(row.last_lat, row.last_lng, FUZZ_RADIUS_M, seed);
      activeWatchers.push({
        user_id: row.user_id,
        handle: row.handle ?? row.display_name ?? null,
        lat: fuzzy_lat,
        lng: fuzzy_lng,
        lastSeenAt: row.last_seen_at,
      });
      if (activeWatchers.length >= MAX_WATCHERS) break;
    }
  } catch {
    /* columns missing — return empty */
  }

  return NextResponse.json({ recentCatches, activeWatchers });
}
