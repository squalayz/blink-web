import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { obfuscate, seedFor } from "@/lib/geo-fuzz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stub spawn generator — seeds 10–50 creatures in fuzzy zones near a list of
// hotspot anchor cities so the v1 map never feels empty. Protected by
// CRON_SECRET so it can be wired into Vercel cron later without exposing.

const HOTSPOTS: { name: string; lat: number; lng: number }[] = [
  { name: "NYC", lat: 40.7128, lng: -74.006 },
  { name: "SF", lat: 37.7749, lng: -122.4194 },
  { name: "LA", lat: 34.0522, lng: -118.2437 },
  { name: "Miami", lat: 25.7617, lng: -80.1918 },
  { name: "Austin", lat: 30.2672, lng: -97.7431 },
  { name: "Chicago", lat: 41.8781, lng: -87.6298 },
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "Berlin", lat: 52.52, lng: 13.405 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "Singapore", lat: 1.3521, lng: 103.8198 },
];

const SPECIES = [
  { species: "SPRITE", rarity: "common", ttlMin: 45 },
  { species: "NIBBLER", rarity: "common", ttlMin: 45 },
  { species: "PIXIE", rarity: "common", ttlMin: 45 },
  { species: "EMBERLING", rarity: "common", ttlMin: 45 },
  { species: "DUSTFOX", rarity: "common", ttlMin: 45 },
  { species: "CAT", rarity: "uncommon", ttlMin: 60 },
  { species: "GLITCH HARE", rarity: "uncommon", ttlMin: 60 },
  { species: "WHISKERWISP", rarity: "uncommon", ttlMin: 60 },
  { species: "CYCLOPS", rarity: "rare", ttlMin: 75 },
  { species: "AETHERMANE", rarity: "rare", ttlMin: 75 },
  { species: "ORACLE", rarity: "legendary", ttlMin: 90 },
  { species: "THE PHOENIX", rarity: "legendary", ttlMin: 90 },
  { species: "THE FIRST EYE", rarity: "mythic", ttlMin: 120 },
];

function pickSpecies() {
  // Weighted: commons frequent, mythic rare.
  const roll = Math.random();
  if (roll < 0.55) return SPECIES[Math.floor(Math.random() * 5)];
  if (roll < 0.85) return SPECIES[5 + Math.floor(Math.random() * 3)];
  if (roll < 0.97) return SPECIES[8 + Math.floor(Math.random() * 2)];
  if (roll < 0.998) return SPECIES[10 + Math.floor(Math.random() * 2)];
  return SPECIES[12];
}

function jitterMeters(lat: number, lng: number, maxM: number) {
  const r = Math.sqrt(Math.random()) * maxM;
  const theta = Math.random() * Math.PI * 2;
  const dLat = (r * Math.cos(theta)) / 111000;
  const dLng = (r * Math.sin(theta)) / (111000 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Clean up expired / caught spawns first (best-effort).
  await supabaseAdmin.from("creature_spawns").delete().lt("expires_at", new Date().toISOString());

  const rows: Record<string, unknown>[] = [];
  for (const h of HOTSPOTS) {
    const count = 2 + Math.floor(Math.random() * 4); // 2-5 per hotspot
    for (let i = 0; i < count; i++) {
      const { lat, lng } = jitterMeters(h.lat, h.lng, 2500); // within ~2.5km of anchor
      const sp = pickSpecies();
      const radius = 300;
      const { fuzzy_lat, fuzzy_lng } = obfuscate(lat, lng, radius, seedFor(`spawn-${h.name}-${i}-${Date.now()}`));
      rows.push({
        species: sp.species,
        rarity: sp.rarity,
        true_lat: lat,
        true_lng: lng,
        fuzzy_lat,
        fuzzy_lng,
        fuzzy_radius_m: radius,
        spawn_time: new Date().toISOString(),
        expires_at: new Date(Date.now() + sp.ttlMin * 60 * 1000).toISOString(),
      });
    }
  }

  const { error, count } = await supabaseAdmin
    .from("creature_spawns")
    .insert(rows, { count: "exact" });
  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ error: "creature_spawns table missing — run migration" }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: count ?? rows.length });
}
