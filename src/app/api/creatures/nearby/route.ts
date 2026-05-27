import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, isValidLat, isValidLng } from "@/lib/api-auth";
import { bboxFor, haversineM } from "@/lib/geo-fuzz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusM = Math.min(20000, Math.max(200, Number(searchParams.get("radius_m") || 5000)));
  if (!isValidLat(lat) || !isValidLng(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const box = bboxFor(lat, lng, radiusM);
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("wild_spawns")
    .select("id, name, tier, lat, lng, spawned_at, expires_at, caught_by, image_cid")
    .is("caught_by", null)
    .gt("expires_at", nowIso)
    .gte("lat", box.minLat)
    .lte("lat", box.maxLat)
    .gte("lng", box.minLng)
    .lte("lng", box.maxLng)
    .limit(200);

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ spawns: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const spawns = (data ?? [])
    .map((row) => ({
      id: row.id as string,
      species: row.name as string,
      rarity: row.tier as string,
      fuzzy_lat: row.lat as number,
      fuzzy_lng: row.lng as number,
      fuzzy_radius_m: 150,
      spawn_time: row.spawned_at as string,
      expires_at: row.expires_at as string,
      image_url: row.image_cid as string | null,
      distance_m: haversineM(lat, lng, row.lat as number, row.lng as number),
    }))
    .filter((s) => s.distance_m <= radiusM)
    .sort((a, b) => a.distance_m - b.distance_m);

  return NextResponse.json({ spawns });
}
