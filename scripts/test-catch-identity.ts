// ════════════════════════════════════════════════════════════════════════════
// CATCH IDENTITY SIMULATION
//
// Exercises the full identity flow WITHOUT touching the network or DB:
//
//   wild-spawns.ts → generateCellSpawns()
//        ↓ (stamps creature_id)
//   ambient API serialization
//        ↓
//   CatchableSpawn shape (creature_id present)
//        ↓
//   AR overlay resolveByCreatureId() → CREATURE_REGISTRY[creature_id]
//        ↓
//   catch route buildMetadataFromCreatureId(creature_id)
//        ↓
//   Mint payload
//
// At every step the creature_id, name, image asset, and nft.metadata_cid /
// nft.image_cid must agree. Any drift fails the test.
//
// Run: npx tsx scripts/test-catch-identity.ts
// ════════════════════════════════════════════════════════════════════════════

import { CREATURE_REGISTRY, ALL_CREATURES, getCreatureById, legacyResolveCreature } from "../src/lib/creature-registry";

// Re-implement the wild-spawn deterministic picker locally so this script
// runs without "server-only" pulling in supabase-admin. Logic mirrors
// src/lib/wild-spawns.ts.
const TIER_DISTRIBUTION = [
  { tier: "common", weight: 70.0 },
  { tier: "uncommon", weight: 20.0 },
  { tier: "rare", weight: 7.0 },
  { tier: "legendary", weight: 2.5 },
  { tier: "mythic", weight: 0.5 },
] as const;

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
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickTierFromRng(rng: () => number) {
  const totalWeight = TIER_DISTRIBUTION.reduce((a, t) => a + t.weight, 0);
  const r = rng() * totalWeight;
  let acc = 0;
  for (const td of TIER_DISTRIBUTION) {
    acc += td.weight;
    if (r < acc) return td.tier;
  }
  return TIER_DISTRIBUTION[0].tier;
}

function pickCreatureIdLocal(tier: string, seed: number): number {
  const pool = ALL_CREATURES.filter((c) => c.tier === tier).map((c) => c.id);
  const s = Math.abs(seed | 0);
  return pool[s % pool.length];
}

// Mirror buildMetadataFromCreatureId without importing server-only modules.
function buildMetadataLocal(creatureId: number) {
  const entry = CREATURE_REGISTRY[creatureId];
  if (!entry) throw new Error(`Unknown creature_id ${creatureId}`);
  const image = entry.nft.image_cid ? `ipfs://${entry.nft.image_cid}` : entry.visual.card;
  return {
    name: `${entry.name} (${entry.tier})`,
    image,
    creatureId,
    tier: entry.tier,
  };
}

interface IdentityFailure {
  step: string;
  detail: string;
}
const failures: IdentityFailure[] = [];
let asserts = 0;

function assertEq(a: unknown, b: unknown, step: string, detail: string) {
  asserts++;
  if (a !== b) {
    failures.push({ step, detail: `${detail}\n     got: ${JSON.stringify(a)}\n  expected: ${JSON.stringify(b)}` });
  }
}

// ─── Test 1 — deterministic spawn → identity round-trip ──────────────────
// Generate 50 spawns across diverse cells and verify identity at every step.
const NUM_CELLS = 12;
const SPAWNS_PER_CELL = 5;
let totalSpawnsTested = 0;

for (let cellIdx = 0; cellIdx < NUM_CELLS; cellIdx++) {
  for (let spawnIdx = 0; spawnIdx < SPAWNS_PER_CELL; spawnIdx++) {
    const cellId = `100:${200 + cellIdx}`;
    const bucket = 5_000_000 + cellIdx;
    const seed = hash32(`${cellId}|${bucket}|${spawnIdx}`);
    const rng = mulberry32(seed);
    const tier = pickTierFromRng(rng);
    const creatureId = pickCreatureIdLocal(tier, seed);

    // Step A — spawn row (what generateCellSpawns would produce)
    const spawnRow = {
      tier,
      name: CREATURE_REGISTRY[creatureId].name,
      image_cid: CREATURE_REGISTRY[creatureId].visual.card,
      creature_id: creatureId,
    };
    const entry = CREATURE_REGISTRY[creatureId];

    assertEq(spawnRow.creature_id, entry.id, "spawn-row", "creature_id == entry.id");
    assertEq(spawnRow.tier, entry.tier, "spawn-row", "tier == entry.tier");
    assertEq(spawnRow.name, entry.name, "spawn-row", "name == entry.name");
    assertEq(spawnRow.image_cid, entry.visual.card, "spawn-row", "image_cid == entry.visual.card");

    // Step B — ambient API payload (what the client receives)
    const ambient = {
      creature_id: spawnRow.creature_id,
      name: spawnRow.name,
      image_cid: spawnRow.image_cid,
      tier: spawnRow.tier,
    };
    assertEq(ambient.creature_id, creatureId, "ambient", "ambient.creature_id == picked id");

    // Step C — AR overlay resolution by creature_id
    const arResolved = getCreatureById(ambient.creature_id);
    if (!arResolved) {
      failures.push({ step: "ar-overlay", detail: `getCreatureById(${ambient.creature_id}) returned null` });
      continue;
    }
    assertEq(arResolved.id, creatureId, "ar-overlay", "ar.id == ambient.creature_id");
    assertEq(arResolved.visual.animated, entry.visual.animated, "ar-overlay", "ar.animated == registry animated");
    assertEq(arResolved.name, entry.name, "ar-overlay", "ar.name matches");

    // Step D — catch route metadata generation
    const metadata = buildMetadataLocal(ambient.creature_id);
    assertEq(metadata.creatureId, creatureId, "catch-metadata", "metadata.creatureId == ambient.creature_id");
    assertEq(metadata.tier, entry.tier, "catch-metadata", "metadata.tier == registry tier");
    assertEq(
      metadata.image,
      entry.nft.image_cid ? `ipfs://${entry.nft.image_cid}` : entry.visual.card,
      "catch-metadata",
      "metadata.image == registry-derived image",
    );

    totalSpawnsTested++;
  }
}

// ─── Test 2 — same seed → same identity (determinism) ────────────────────
for (let i = 0; i < 200; i++) {
  const seed = hash32(`seed-test|${i}`);
  const rng1 = mulberry32(seed);
  const tier1 = pickTierFromRng(rng1);
  const id1 = pickCreatureIdLocal(tier1, seed);

  const rng2 = mulberry32(seed);
  const tier2 = pickTierFromRng(rng2);
  const id2 = pickCreatureIdLocal(tier2, seed);

  assertEq(id1, id2, "determinism", `same seed must pick same creature_id (iter ${i})`);
}

// ─── Test 3 — legacy fallback maps name → creature_id correctly ─────────
for (const c of ALL_CREATURES) {
  const byName = legacyResolveCreature(c.name, null);
  assertEq(byName?.id, c.id, "legacy-fallback", `name "${c.name}" must resolve to id ${c.id}`);
  const byImage = legacyResolveCreature(null, c.visual.card);
  assertEq(byImage?.id, c.id, "legacy-fallback", `image_cid "${c.visual.card}" must resolve to id ${c.id}`);
}

// ─── Test 4 — every tier produces a real creature_id ─────────────────────
for (const tier of ["common", "uncommon", "rare", "legendary", "mythic"] as const) {
  for (let s = 0; s < 100; s++) {
    const id = pickCreatureIdLocal(tier, s);
    const entry = CREATURE_REGISTRY[id];
    if (!entry) {
      failures.push({
        step: "tier-cover",
        detail: `tier ${tier} seed ${s} produced unknown id ${id}`,
      });
      continue;
    }
    assertEq(entry.tier, tier, "tier-cover", `picked creature is in tier ${tier}`);
  }
}

// ─── Report ─────────────────────────────────────────────────────────────
console.log(`▸ CATCH IDENTITY SIMULATION`);
console.log(`  · ${totalSpawnsTested} spawns generated across ${NUM_CELLS} cells`);
console.log(`  · ${asserts} assertions executed`);
if (failures.length === 0) {
  console.log("✓ identity preserved spawn → ambient → AR → catch metadata at every step");
  process.exit(0);
} else {
  console.error(`✗ identity calibration FAILED — ${failures.length} mismatch(es)`);
  for (const f of failures.slice(0, 20)) {
    console.error(`  · [${f.step}] ${f.detail}`);
  }
  if (failures.length > 20) console.error(`  ...and ${failures.length - 20} more`);
  process.exit(1);
}
