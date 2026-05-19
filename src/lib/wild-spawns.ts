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

const MIN_SEPARATION_M = 70;
// Poisson-disc / dart-throwing: per placement we sample up to K candidate
// points and accept the first one that beats the separation target; if K
// candidates all fail we keep the best-of-K as a fallback. With K this high
// the scatter converges close to ideal blue-noise even when the cell is
// near-saturated with constraints from neighbouring buckets.
const POISSON_K = 96;
const LAT_METERS_PER_DEG = 111_320;

// Number of prior buckets whose spawns are still on-screen when a new bucket
// is being placed. With DESPAWN_MS=30 min and EPOCH_SECONDS=300 (5 min),
// 5 buckets remain active when bucket B begins. We use the raw intra-bucket
// placements of those prior buckets as additional Mitchell constraints so the
// new bucket actively avoids spots already taken by recently-spawned ones —
// without this lookback, the cell would accumulate ~50 independently-placed
// points and visibly clump along whichever radials happened to align.
const ACTIVE_PRIOR_BUCKETS = Math.floor(DESPAWN_MS / 1000 / EPOCH_SECONDS) - 1;

interface CellGeometry {
  centerLat: number;
  centerLng: number;
  lngMetersPerDeg: number;
  maxRadiusM: number;
}

function cellGeometry(cellId: string): CellGeometry {
  const origin = cellOrigin(cellId);
  const centerLat = origin.lat + CELL_DEG / 2;
  const centerLng = origin.lng + CELL_DEG / 2;
  const lngMetersPerDeg = LAT_METERS_PER_DEG * Math.cos((centerLat * Math.PI) / 180);
  // Inscribed-circle radius (minus a small buffer) so spawns stay inside the
  // cell — keeps each cell's spawns owned by its (cell, bucket, idx) key.
  const halfCellLatM = (CELL_DEG * LAT_METERS_PER_DEG) / 2;
  const halfCellLngM = (CELL_DEG * lngMetersPerDeg) / 2;
  const maxRadiusM = Math.max(50, Math.min(halfCellLatM, halfCellLngM) - 20);
  return { centerLat, centerLng, lngMetersPerDeg, maxRadiusM };
}

function countForCellBucket(cellId: string, bucket: number): number {
  const rng = mulberry32(hash32(`${cellId}|${bucket}|count`));
  return MIN_PER_CELL + Math.floor(rng() * (MAX_PER_CELL - MIN_PER_CELL + 1));
}

function nearestDistanceM(
  pt: { lat: number; lng: number },
  placed: { lat: number; lng: number }[],
): number {
  let best = Infinity;
  for (const p of placed) {
    const d = haversineMeters(pt.lat, pt.lng, p.lat, p.lng);
    if (d < best) best = d;
  }
  return best;
}

function placePositions(
  cellId: string,
  bucket: number,
  geom: CellGeometry,
  priorConstraints: { lat: number; lng: number }[],
): { lat: number; lng: number }[] {
  const { centerLat, centerLng, lngMetersPerDeg, maxRadiusM } = geom;
  const count = countForCellBucket(cellId, bucket);

  function candidatePoint(rng: () => number): { lat: number; lng: number } {
    const angle = rng() * Math.PI * 2;
    // sqrt(u) for uniform area distribution inside the inscribed disc.
    const radiusM = Math.sqrt(rng()) * maxRadiusM;
    const dN = Math.cos(angle) * radiusM;
    const dE = Math.sin(angle) * radiusM;
    return {
      lat: centerLat + dN / LAT_METERS_PER_DEG,
      lng: centerLng + dE / lngMetersPerDeg,
    };
  }

  const placed: { lat: number; lng: number }[] = [...priorConstraints];
  const out: { lat: number; lng: number }[] = [];
  for (let idx = 0; idx < count; idx++) {
    // Position-only seed so changes to placement RNG don't disturb tier/name
    // selection (which still seeds off `${cellId}|${bucket}|${idx}`).
    const seed = hash32(`${cellId}|${bucket}|pos|${idx}`);
    const rng = mulberry32(seed);
    let best: { lat: number; lng: number } | null = null;
    let bestDist = -1;
    for (let k = 0; k < POISSON_K; k++) {
      const cand = candidatePoint(rng);
      const d = placed.length === 0 ? maxRadiusM : nearestDistanceM(cand, placed);
      if (d > bestDist) {
        best = cand;
        bestDist = d;
      }
      if (bestDist >= MIN_SEPARATION_M) break;
    }
    const pos = best ?? candidatePoint(rng);
    placed.push(pos);
    out.push(pos);
  }
  return out;
}

export function generateCellSpawns(cellId: string, bucket: number): GeneratedSpawn[] {
  const geom = cellGeometry(cellId);

  // Raw intra-bucket placements for the prior buckets whose spawns are still
  // active. "Raw" means no further lookback, which keeps this deterministic
  // in one step. Stored bucket B-k positions (which used their own lookback)
  // differ from raw B-k by a few metres at most, so the constraint is
  // approximate but the resulting scatter is well-separated.
  const priorConstraints: { lat: number; lng: number }[] = [];
  for (let k = 1; k <= ACTIVE_PRIOR_BUCKETS; k++) {
    priorConstraints.push(...placePositions(cellId, bucket - k, geom, []));
  }

  const positions = placePositions(cellId, bucket, geom, priorConstraints);
  const count = positions.length;

  const spawnedAtMs = bucketStartMs(bucket);
  const spawnedAt = new Date(spawnedAtMs).toISOString();
  const expiresAt = new Date(spawnedAtMs + DESPAWN_MS).toISOString();

  const out: GeneratedSpawn[] = [];
  for (let idx = 0; idx < count; idx++) {
    const seed = hash32(`${cellId}|${bucket}|${idx}`);
    const rng = mulberry32(seed);
    const tier = pickTierFromRng(rng);
    const pick = pickFromPoolDeterministic(tier, seed);
    out.push({
      s2_cell_id: cellId,
      epoch_bucket: bucket,
      spawn_index: idx,
      lat: positions[idx].lat,
      lng: positions[idx].lng,
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
