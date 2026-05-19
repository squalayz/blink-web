// ════════════════════════════════════════════════════════════════════════════
// CREATURE REGISTRY VALIDATOR
//
// Runs before every build (npm run prebuild) so the registry can never drift
// out of shape. Checks:
//   1. Every entry has the required shape (id, name, tier, visual, nft).
//   2. IDs are unique and stable (1..N, no gaps that would re-stamp old rows).
//   3. Each tier has at least one creature so spawn picking never crashes.
//   4. For any entry with a pinned IPFS metadata_cid: GET the JSON from a
//      gateway and verify `image` matches the registered image_cid.
//
// Exit codes:
//   0  → registry is healthy
//   1  → registry malformed or IPFS verification failed
// ════════════════════════════════════════════════════════════════════════════

import {
  CREATURE_REGISTRY,
  CREATURE_IDS,
  ALL_CREATURES,
  creatureIdsForTier,
  type CreatureTier,
} from "../src/lib/creature-registry";

const GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
];

const TIERS: CreatureTier[] = [
  "common",
  "uncommon",
  "rare",
  "legendary",
  "mythic",
];

interface Failure {
  creatureId: number | null;
  message: string;
}

const failures: Failure[] = [];

function check(cond: boolean, creatureId: number | null, message: string) {
  if (!cond) failures.push({ creatureId, message });
}

// ─── 1. Shape + uniqueness ───────────────────────────────────────────────
const seenIds = new Set<number>();
for (const entry of ALL_CREATURES) {
  check(typeof entry.id === "number" && entry.id > 0, entry.id, "id must be a positive integer");
  check(!seenIds.has(entry.id), entry.id, `duplicate id ${entry.id}`);
  seenIds.add(entry.id);
  check(typeof entry.name === "string" && entry.name.length > 0, entry.id, "name required");
  check(
    !!entry.visual?.card && !!entry.visual?.animated && !!entry.visual?.pixel,
    entry.id,
    "visual.{card, animated, pixel} all required",
  );
  check(typeof entry.nft === "object", entry.id, "nft block required");
  check(typeof entry.powers?.name === "string", entry.id, "powers.name required");
}

// ─── 2. Tier coverage ────────────────────────────────────────────────────
for (const tier of TIERS) {
  const pool = creatureIdsForTier(tier);
  check(pool.length > 0, null, `tier "${tier}" has no creatures — spawn picker would crash`);
}

// ─── 3. ID monotonicity (1..N, no gaps) ──────────────────────────────────
const sortedIds = [...CREATURE_IDS].sort((a, b) => a - b);
for (let i = 0; i < sortedIds.length; i++) {
  check(
    sortedIds[i] === i + 1,
    sortedIds[i],
    `id ${sortedIds[i]} breaks 1..N monotonicity at index ${i + 1}`,
  );
}

// ─── 4. IPFS verification for pinned metadata ────────────────────────────
async function fetchIpfsJson(cid: string): Promise<Record<string, unknown> | null> {
  for (const gw of GATEWAYS) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${gw}${cid}`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        return (await res.json()) as Record<string, unknown>;
      }
    } catch {
      /* try next gateway */
    }
  }
  return null;
}

async function verifyIpfs() {
  const pinned = ALL_CREATURES.filter((c) => c.nft.metadata_cid);
  if (pinned.length === 0) {
    console.log("ℹ no pinned metadata_cids to verify (v1 uses data: URIs at catch-time)");
    return;
  }
  for (const c of pinned) {
    const cid = c.nft.metadata_cid as string;
    const json = await fetchIpfsJson(cid);
    if (!json) {
      failures.push({
        creatureId: c.id,
        message: `metadata_cid ${cid} unreachable on all gateways`,
      });
      continue;
    }
    const image = String(json.image ?? "");
    if (c.nft.image_cid && !image.includes(c.nft.image_cid)) {
      failures.push({
        creatureId: c.id,
        message: `metadata image "${image}" does not contain registered image_cid "${c.nft.image_cid}"`,
      });
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────
(async () => {
  await verifyIpfs();

  const total = Object.keys(CREATURE_REGISTRY).length;
  if (failures.length === 0) {
    console.log(`✓ CREATURE_REGISTRY valid — ${total} entries, ${TIERS.length} tiers`);
    for (const tier of TIERS) {
      const ids = creatureIdsForTier(tier);
      console.log(
        `  · ${tier.padEnd(9)} (${ids.length}): ${ids
          .map((id) => `${id}:${CREATURE_REGISTRY[id].name}`)
          .join(", ")}`,
      );
    }
    process.exit(0);
  } else {
    console.error(`✗ CREATURE_REGISTRY validation failed — ${failures.length} issue(s)`);
    for (const f of failures) {
      console.error(`  · ${f.creatureId == null ? "[--]" : `[id ${f.creatureId}]`} ${f.message}`);
    }
    process.exit(1);
  }
})();
