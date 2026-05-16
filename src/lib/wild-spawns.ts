// ════════════════════════════════════════════════════════════════════════════
// Wild spawn generator — deterministic per (cell, epoch).
//
// Cell: 0.01° × 0.01° grid (~1km at equator). Cell ID = "{floor(lat*100)}:{floor(lng*100)}".
// Epoch bucket: floor(unix_seconds / 300) → new spawns every 5 minutes.
// Despawn: 30 min after spawn.
//
// Determinism: every client requesting the same (cell, bucket) sees identical
// spawn coords/tiers/names — social moments where two people see the same
// creature in the same alley. Random source is seeded from the (cell, bucket,
// index) triple.
// ════════════════════════════════════════════════════════════════════════════

import "server-only";
import {
  TIER_DISTRIBUTION,
  pickFromPoolDeterministic,
  type BurnTier,
} from "@/lib/spawn-pool";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const EPOCH_SECONDS = 300; // 5 min
export const DESPAWN_MS = 30 * 60_000; // 30 min
export const CELL_DEG = 0.01;
const MIN_PER_CELL = 5;
const MAX_PER_CELL = 12;

export interface WildSpawnRow {
  id: string;
  s2_cell_id: string;
  epoch_bucket: number;
  spawn_index: number;
  lat: number;
  lng: number;
  tier: BurnTier;
  name: string;
  image_cid: string;
  spawned_at: string;
  expires_at: string;
  caught_by: string | null;
  caught_at: string | null;
  mint_tx_hash: string | null;
  nft_token_id: string | null;
  blink_reward_tx_hash: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hash + seeded PRNG (mulberry32 — fast, deterministic, good enough for game).
// ─────────────────────────────────────────────────────────────────────────────

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
  return function rng(): number {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cell math
// ─────────────────────────────────────────────────────────────────────────────

export function cellIdOf(lat: number, lng: number): string {
  return `${Math.floor(lat / CELL_DEG)}:${Math.floor(lng / CELL_DEG)}`;
}

export function parseCellId(cellId: string): { latIdx: number; lngIdx: number } {
  const [a, b] = cellId.split(":");
  return { latIdx: Number(a), lngIdx: Number(b) };
}

export function cellOrigin(cellId: string): { lat: number; lng: number } {
  const { latIdx, lngIdx } = parseCellId(cellId);
  return { lat: latIdx * CELL_DEG, lng: lngIdx * CELL_DEG };
}

export function neighborCellIds(lat: number, lng: number): string[] {
  const { latIdx, lngIdx } = parseCellId(cellIdOf(lat, lng));
  const out: string[] = [];
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      out.push(`${latIdx + di}:${lngIdx + dj}`);
    }
  }
  return out;
}

export function currentEpochBucket(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000 / EPOCH_SECONDS);
}

export function bucketStartMs(bucket: number): number {
  return bucket * EPOCH_SECONDS * 1000;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic spawn generation
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneratedSpawn {
  s2_cell_id: string;
  epoch_bucket: number;
  spawn_index: number;
  lat: number;
  lng: number;
  tier: BurnTier;
  name: string;
  image_cid: string;
  spawned_at: string;
  expires_at: string;
}

function pickTierFromRng(rng: () => number): BurnTier {
  const totalWeight = TIER_DISTRIBUTION.reduce((a, t) => a + t.weight, 0);
  const r = rng() * totalWeight;
  let acc = 0;
  for (const td of TIER_DISTRIBUTION) {
    acc += td.weight;
    if (r < acc) return td.tier;
  }
  return TIER_DISTRIBUTION[0].tier;
}

export function generateCellSpawns(cellId: string, bucket: number): GeneratedSpawn[] {
  const origin = cellOrigin(cellId);
  const countRng = mulberry32(hash32(`${cellId}|${bucket}|count`));
  const count = MIN_PER_CELL + Math.floor(countRng() * (MAX_PER_CELL - MIN_PER_CELL + 1));

  const spawnedAtMs = bucketStartMs(bucket);
  const spawnedAt = new Date(spawnedAtMs).toISOString();
  const expiresAt = new Date(spawnedAtMs + DESPAWN_MS).toISOString();

  const out: GeneratedSpawn[] = [];
  for (let idx = 0; idx < count; idx++) {
    const seed = hash32(`${cellId}|${bucket}|${idx}`);
    const rng = mulberry32(seed);
    const tier = pickTierFromRng(rng);
    const latOffset = rng() * CELL_DEG;
    const lngOffset = rng() * CELL_DEG;
    const pick = pickFromPoolDeterministic(tier, seed);
    out.push({
      s2_cell_id: cellId,
      epoch_bucket: bucket,
      spawn_index: idx,
      lat: origin.lat + latOffset,
      lng: origin.lng + lngOffset,
      tier,
      name: pick.name,
      image_cid: pick.imageCid,
      spawned_at: spawnedAt,
      expires_at: expiresAt,
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Upsert + query
// ─────────────────────────────────────────────────────────────────────────────

export async function upsertSpawnsForCells(
  cellIds: string[],
  bucket: number,
): Promise<{ inserted: number; error?: string }> {
  const all: GeneratedSpawn[] = [];
  for (const cellId of cellIds) {
    all.push(...generateCellSpawns(cellId, bucket));
  }
  if (all.length === 0) return { inserted: 0 };
  // ON CONFLICT DO NOTHING via Supabase: use upsert with ignoreDuplicates.
  const { error } = await supabaseAdmin
    .from("wild_spawns")
    .upsert(all, { onConflict: "s2_cell_id,epoch_bucket,spawn_index", ignoreDuplicates: true });
  if (error) return { inserted: 0, error: error.message };
  return { inserted: all.length };
}

export async function listActiveSpawnsForCells(
  cellIds: string[],
): Promise<WildSpawnRow[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("wild_spawns")
    .select(
      "id, s2_cell_id, epoch_bucket, spawn_index, lat, lng, tier, name, image_cid, spawned_at, expires_at, caught_by, caught_at, mint_tx_hash, nft_token_id, blink_reward_tx_hash",
    )
    .in("s2_cell_id", cellIds)
    .is("caught_by", null)
    .gt("expires_at", nowIso)
    .limit(500);
  if (error) throw new Error(`wild_spawns query failed: ${error.message}`);
  return (data ?? []) as WildSpawnRow[];
}

// Haversine distance in meters.
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371e3;
  const p = Math.PI / 180;
  const a =
    0.5 -
    Math.cos((lat2 - lat1) * p) / 2 +
    Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lng2 - lng1) * p)) / 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
