// BLINK Phase 4 — mock spawn generator + session-persistent storage.
//
// Real geo-spatial DB queries are deferred to Phase 5. For now we generate
// 6–12 mock spawns around the user, weighted by rarity (60/25/10/4/1), and
// persist them via sessionStorage keyed by an anchor location so a page
// refresh does not relocate the spawns under the user's feet.

import { BESTIARY, type Rarity } from "./bestiary";

const STORAGE_KEY = "blink:spawns:v1";
const ANCHOR_TOLERANCE_M = 250;
const SPAWN_TTL_MS = 60 * 60 * 1000;

export type SpawnRarity = Rarity;

export type BlinkSpawn = {
  id: string;
  creatureId: number;
  rarity: SpawnRarity;
  lat: number;
  lng: number;
  spawnedAt: number;
  expiresAt: number;
};

const RARITY_WEIGHTS: { rarity: SpawnRarity; weight: number }[] = [
  { rarity: "common", weight: 60 },
  { rarity: "uncommon", weight: 25 },
  { rarity: "rare", weight: 10 },
  { rarity: "legendary", weight: 4 },
  { rarity: "mythic", weight: 1 },
];

const TOTAL_WEIGHT = RARITY_WEIGHTS.reduce((s, r) => s + r.weight, 0);

function pickRarity(rng: () => number): SpawnRarity {
  let r = rng() * TOTAL_WEIGHT;
  for (const { rarity, weight } of RARITY_WEIGHTS) {
    if (r < weight) return rarity;
    r -= weight;
  }
  return "common";
}

function pickCreatureForRarity(rarity: SpawnRarity, rng: () => number): number {
  const pool = BESTIARY.filter((c) => c.rarity === rarity);
  if (pool.length === 0) return BESTIARY[0].id;
  return pool[Math.floor(rng() * pool.length)].id;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const p = Math.PI / 180;
  const a =
    0.5 -
    Math.cos((lat2 - lat1) * p) / 2 +
    Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lng2 - lng1) * p)) / 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Deterministic-ish PRNG seeded from the anchor lat/lng — so the same user
// at the same coarse location sees the same spawn set across reloads.
function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

function anchorSeed(lat: number, lng: number): number {
  return Math.round(lat * 1000) * 1009 + Math.round(lng * 1000) * 7919;
}

function offsetMeters(lat: number, lng: number, dMetersN: number, dMetersE: number) {
  const dLat = dMetersN / 111_111;
  const dLng = dMetersE / (111_111 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

function generateSpawns(lat: number, lng: number, now: number): BlinkSpawn[] {
  const rng = seededRng(anchorSeed(lat, lng));
  const count = 6 + Math.floor(rng() * 7); // 6–12
  const out: BlinkSpawn[] = [];
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = 50 + rng() * 1450; // 50–1500m
    const dN = Math.cos(angle) * radius;
    const dE = Math.sin(angle) * radius;
    const pos = offsetMeters(lat, lng, dN, dE);
    const rarity = pickRarity(rng);
    const creatureId = pickCreatureForRarity(rarity, rng);
    out.push({
      id: `spawn-${anchorSeed(lat, lng)}-${i}`,
      creatureId,
      rarity,
      lat: pos.lat,
      lng: pos.lng,
      spawnedAt: now,
      expiresAt: now + SPAWN_TTL_MS,
    });
  }
  return out;
}

type Stored = {
  anchorLat: number;
  anchorLng: number;
  spawns: BlinkSpawn[];
};

function readStored(): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Stored;
  } catch {
    return null;
  }
}

function writeStored(s: Stored): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota / disabled — ignore */
  }
}

// Returns a stable set of spawns near the user. The anchor is re-locked only
// when the user moves more than ~250m so casual GPS jitter does not regenerate.
export function getOrGenerateSpawns(lat: number, lng: number): BlinkSpawn[] {
  const now = Date.now();
  const stored = readStored();
  if (stored) {
    const drift = haversine(stored.anchorLat, stored.anchorLng, lat, lng);
    const alive = stored.spawns.filter((s) => s.expiresAt > now);
    if (drift < ANCHOR_TOLERANCE_M && alive.length >= 4) {
      if (alive.length !== stored.spawns.length) {
        writeStored({ ...stored, spawns: alive });
      }
      return alive;
    }
  }
  const fresh = generateSpawns(lat, lng, now);
  writeStored({ anchorLat: lat, anchorLng: lng, spawns: fresh });
  return fresh;
}

export function clearSpawns(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
