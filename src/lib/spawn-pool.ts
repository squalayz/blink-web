// ════════════════════════════════════════════════════════════════════════════
// BLINK Bestiary spawn pool (v1)
//
// When a user burns $BLINK in /spawn, the backend picks the next unused image
// from the corresponding tier's pre-generated pool and ownerMint()s a fresh
// Mythics-contract NFT to them with that metadata.
//
// v1 implementation: hardcoded arrays per tier, indexed by Date.now() % length.
// TODO: replace with a Supabase `spawn_pool` table that tracks per-row
// used_at / used_by so each image is only ever spawned once.
// ════════════════════════════════════════════════════════════════════════════

import "server-only";

export type BurnTier =
  | "common"
  | "uncommon"
  | "rare"
  | "legendary"
  | "mythic";

export const BURN_TIER_COSTS: Record<BurnTier, number> = {
  common: 50_000,
  uncommon: 250_000,
  rare: 1_000_000,
  legendary: 5_000_000,
  mythic: 20_000_000,
};

export const BURN_TIER_LABELS: Record<BurnTier, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  legendary: "Legendary",
  mythic: "Mythic",
};

export function isBurnTier(v: unknown): v is BurnTier {
  return (
    typeof v === "string" &&
    (v === "common" ||
      v === "uncommon" ||
      v === "rare" ||
      v === "legendary" ||
      v === "mythic")
  );
}

// IPFS image CIDs from the pre-generated test batch in
// ~/.openclaw/workspace/blink/spawn-pool/test-batch.
// Each tier reuses the same starting pool in v1 until real per-tier art lands.
// The metadata JSON is generated on the fly in /api/spawn/burn-mint.
const TIER_IMAGE_CIDS: Record<BurnTier, string[]> = {
  common: [
    "ipfs://QmczHa15NP5McLJHn55jagT2MC4Lqg99uAnqR4UXydG6pi",
  ],
  uncommon: [
    "ipfs://QmczHa15NP5McLJHn55jagT2MC4Lqg99uAnqR4UXydG6pi",
  ],
  rare: [
    "ipfs://QmczHa15NP5McLJHn55jagT2MC4Lqg99uAnqR4UXydG6pi",
  ],
  legendary: [
    "ipfs://QmczHa15NP5McLJHn55jagT2MC4Lqg99uAnqR4UXydG6pi",
  ],
  mythic: [
    "ipfs://QmczHa15NP5McLJHn55jagT2MC4Lqg99uAnqR4UXydG6pi",
  ],
};

const TIER_NAME_POOL: Record<BurnTier, string[]> = {
  common: ["Sparkling", "Mossy", "Pebble", "Drift", "Speck"],
  uncommon: ["Glimmer", "Ember", "Whisper", "Cinder", "Husk"],
  rare: ["Stormwing", "Voltkit", "Hexpaw", "Tideborn", "Sunshard"],
  legendary: ["Aetherclaw", "Sablefang", "Pyrelord", "Cryolith", "Halofox"],
  mythic: ["Voidsire", "Worldspark", "Oracle Prime", "Solrune", "Lastlight"],
};

export interface SpawnPoolPick {
  imageCid: string;
  name: string;
}

export function pickFromPool(tier: BurnTier): SpawnPoolPick {
  const images = TIER_IMAGE_CIDS[tier];
  const names = TIER_NAME_POOL[tier];
  const now = Date.now();
  const imageCid = images[now % images.length];
  const name = names[now % names.length];
  return { imageCid, name };
}

export function buildMetadata(opts: {
  tier: BurnTier;
  name: string;
  imageCid: string;
  burnTxHash: string;
}): Record<string, unknown> {
  return {
    name: `${opts.name} (${BURN_TIER_LABELS[opts.tier]})`,
    description: `A ${BURN_TIER_LABELS[opts.tier]} BLINK Bestiary creature summoned by burning $BLINK. Tier: ${opts.tier}.`,
    image: opts.imageCid,
    attributes: [
      { trait_type: "Tier", value: BURN_TIER_LABELS[opts.tier] },
      { trait_type: "Origin", value: "Burn-Mint" },
      { trait_type: "Burn Tx", value: opts.burnTxHash },
    ],
  };
}
