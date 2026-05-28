import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, isValidLat, isValidLng } from "@/lib/api-auth";
import { bboxFor, haversineM } from "@/lib/geo-fuzz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CELL_DEG = 0.01;
const GRID_RADIUS = 2;
const BUCKET_SECONDS = 14400;
const CELL_SPAWN_RADIUS_M = 450;
const FUZZY_RADIUS_M = 150;

const TIERS = [
  "common",
  "common",
  "common",
  "common",
  "common",
  "uncommon",
  "uncommon",
  "rare",
  "legendary",
];

const CREATURES: Record<string, number[]> = {
  common: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  uncommon: [11, 12, 13, 14, 15],
  rare: [16, 17],
  legendary: [18, 19],
  mythic: [20],
};

const NAMES: Record<number, string> = {
  1: "Sprite",
  2: "Nibbler",
  3: "Pixie",
  4: "Emberling",
  5: "Dustfox",
  6: "Pebblekin",
  7: "Speckle",
  8: "Hopspirit",
  9: "Shimmer",
  10: "Silkmoth",
  11: "Cat",
  12: "Glitch Hare",
  13: "Whiskerwisp",
  14: "Hushling",
  15: "Eyefly",
  16: "Cyclops",
  17: "Aethermane",
  18: "Oracle",
  19: "The Phoenix",
  20: "The First Eye",
};

const CARDS: Record<number, string> = {
  1: "/cards/001_sprite.webp",
  2: "/cards/002_nibbler.webp",
  3: "/cards/003_pixie.webp",
  4: "/cards/004_emberling.webp",
  5: "/cards/005_dustfox.webp",
  6: "/cards/006_pebblekin.webp",
  7: "/cards/007_speckle.webp",
  8: "/cards/008_hopspirit.webp",
  9: "/cards/009_shimmer.webp",
  10: "/cards/010_silkmoth.webp",
  11: "/cards/011_cat.webp",
  12: "/cards/012_glitchhare.webp",
  13: "/cards/013_whiskerwisp.webp",
  14: "/cards/014_hushling.webp",
  15: "/cards/015_eyefly.webp",
  16: "/cards/016_cyclops.webp",
  17: "/cards/017_aethermane.webp",
  18: "/cards/018_oracle.webp",
  19: "/cards/019_phoenix.webp",
  20: "/cards/020_firsteye.webp",
};

const TIER_COLORS: Record<string, string> = {
  common: "#9aa3b2",
  uncommon: "#00FF88",
  rare: "#88FF00",
  legendary: "#ffd166",
  mythic: "#ff8ae0",
};

function hash32(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicId(cellId: string, bucket: number, idx: number): string {
  const base = `${cellId}|${bucket}|${idx}`;
  const a = hash32(base).toString(16).padStart(8, "0");
  const b = hash32(base + ":1").toString(16).padStart(8, "0");
  const c = hash32(base + ":2").toString(16).padStart(8, "0");
  const d = hash32(base + ":3").toString(16).padStart(8, "0");
  return `${a}-${b.slice(0, 4)}-${b.slice(4)}-${c.slice(0, 4)}-${c.slice(4)}${d}`;
}

export async function GET(req: NextRequest) {
  const { error: authError } = await requireAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusM = Math.min(
    20000,
    Math.max(200, Number(searchParams.get("radius_m") || 5000)),
  );
  if (!isValidLat(lat) || !isValidLng(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const nowMs = Date.now();
  const bucket = Math.floor(nowMs / 1000 / BUCKET_SECONDS);
  const spawnTime = new Date(bucket * BUCKET_SECONDS * 1000).toISOString();
  const expiresAt = new Date(
    (bucket + 1) * BUCKET_SECONDS * 1000,
  ).toISOString();

  const userLatIdx = Math.floor(lat / CELL_DEG);
  const userLngIdx = Math.floor(lng / CELL_DEG);

  type Spawn = {
    id: string;
    species: string;
    rarity: string;
    tier_color: string;
    fuzzy_lat: number;
    fuzzy_lng: number;
    fuzzy_radius_m: number;
    spawn_time: string;
    expires_at: string;
    image_url: string | null;
    distance_m: number;
  };

  const generated: Spawn[] = [];

  for (let dy = -GRID_RADIUS; dy <= GRID_RADIUS; dy++) {
    for (let dx = -GRID_RADIUS; dx <= GRID_RADIUS; dx++) {
      const latIdx = userLatIdx + dy;
      const lngIdx = userLngIdx + dx;
      const cellId = `${latIdx}:${lngIdx}`;
      const cellLat = latIdx * CELL_DEG;
      const cellLng = lngIdx * CELL_DEG;
      const cosLat = Math.cos((cellLat * Math.PI) / 180);
      const lngScale =
        111000 * (Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat);

      const rng = mulberry32(hash32(`${cellId}|${bucket}`));
      const count = 8 + Math.floor(rng() * 7);

      for (let idx = 0; idx < count; idx++) {
        const angle = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * CELL_SPAWN_RADIUS_M;
        const dLat = (r * Math.cos(angle)) / 111000;
        const dLng = (r * Math.sin(angle)) / lngScale;
        const cLat = cellLat + dLat;
        const cLng = cellLng + dLng;

        const tier = TIERS[Math.floor(rng() * TIERS.length)];
        const speciesIds = CREATURES[tier];
        const speciesId =
          speciesIds[Math.floor(rng() * speciesIds.length)];

        generated.push({
          id: deterministicId(cellId, bucket, idx),
          species: NAMES[speciesId],
          rarity: tier,
          tier_color: TIER_COLORS[tier],
          fuzzy_lat: cLat,
          fuzzy_lng: cLng,
          fuzzy_radius_m: FUZZY_RADIUS_M,
          spawn_time: spawnTime,
          expires_at: expiresAt,
          image_url: CARDS[speciesId],
          distance_m: haversineM(lat, lng, cLat, cLng),
        });
      }
    }
  }

  const box = bboxFor(lat, lng, radiusM);
  const caughtIds = new Set<string>();

  const { data: caughtRows, error: caughtErr } = await supabaseAdmin
    .from("wild_spawns")
    .select("id, caught_by")
    .not("caught_by", "is", null)
    .gte("lat", box.minLat)
    .lte("lat", box.maxLat)
    .gte("lng", box.minLng)
    .lte("lng", box.maxLng)
    .limit(500);

  if (caughtErr && caughtErr.code !== "42P01") {
    return NextResponse.json({ error: caughtErr.message }, { status: 500 });
  }
  for (const row of caughtRows ?? []) {
    if (row.caught_by) caughtIds.add(row.id as string);
  }

  const spawns = generated
    .filter((s) => !caughtIds.has(s.id) && s.distance_m <= radiusM)
    .sort((a, b) => a.distance_m - b.distance_m);

  return NextResponse.json({ spawns });
}
