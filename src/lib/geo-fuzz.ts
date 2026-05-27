// Privacy-preserving location obfuscation for BLINK social discovery.
//
// Real GPS never leaves the server. Each user gets a deterministic but slowly
// drifting offset based on (userId + 5-minute bucket), so neighbours can't
// triangulate by replaying queries while the public dot still wanders
// naturally over time.

const FIVE_MIN_MS = 5 * 60 * 1000;

function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFor(userId: string, atMs: number = Date.now()): string {
  const bucket = Math.floor(atMs / FIVE_MIN_MS);
  return `${userId}:${bucket}`;
}

export function obfuscate(
  lat: number,
  lng: number,
  radiusM: number,
  seed: string,
): { fuzzy_lat: number; fuzzy_lng: number } {
  const rnd = mulberry32(fnv1a(seed));
  const r = radiusM * Math.sqrt(rnd());
  const theta = rnd() * 2 * Math.PI;
  const dLat = (r * Math.cos(theta)) / 111000;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const dLng =
    (r * Math.sin(theta)) / (111000 * (Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat));
  return { fuzzy_lat: lat + dLat, fuzzy_lng: lng + dLng };
}

export type PresenceMode = "public" | "friends" | "ghost";
export type Relation = "self" | "squad" | "friend" | "stranger";

export function radiusForRelation(rel: Relation): number {
  if (rel === "self") return 0;
  if (rel === "squad") return 50;
  if (rel === "friend") return 100;
  return 300;
}

export function haversineM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371e3;
  const p = Math.PI / 180;
  const dLat = (lat2 - lat1) * p;
  const dLng = (lng2 - lng1) * p;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Bounding-box helper for cheap geo prefilter before haversine.
export function bboxFor(
  lat: number,
  lng: number,
  radiusM: number,
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const dLat = radiusM / 111000;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const dLng = radiusM / (111000 * (Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat));
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}
