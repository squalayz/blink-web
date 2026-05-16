// ════════════════════════════════════════════════════════════════════════════
// BLINK Bestiary spawn pool (v1)
//
// Used by both:
//   - /api/spawn/burn-mint  (BLINK-burn → mythics NFT)
//   - /api/spawns/ambient + /api/spawns/catch (wild spawns → catch-to-mint)
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

// BLINK reward (whole tokens, NOT wei) paid to the catcher on top of the NFT.
export const TIER_BLINK_REWARD: Record<BurnTier, number> = {
  common: 10_000,
  uncommon: 50_000,
  rare: 250_000,
  legendary: 1_000_000,
  mythic: 5_000_000,
};

// Tier distribution for wild spawns. Sum = 100.
export const TIER_DISTRIBUTION: Array<{ tier: BurnTier; weight: number }> = [
  { tier: "common", weight: 70.0 },
  { tier: "uncommon", weight: 20.0 },
  { tier: "rare", weight: 7.0 },
  { tier: "legendary", weight: 2.5 },
  { tier: "mythic", weight: 0.5 },
];

export const TIER_COLOR: Record<BurnTier, string> = {
  common: "#FFFFFF",
  uncommon: "#66E3FF",
  rare: "#6BB5FF",
  legendary: "#FFD773",
  mythic: "#FF66CC",
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

// Pre-generated test-batch CIDs. For v1 each tier shares a base pool of CIDs;
// the tier badge + reward is what differentiates them. Real per-tier art comes
// in v2.
const BASE_IMAGE_CIDS: string[] = [
  "ipfs://QmczHa15NP5McLJHn55jagT2MC4Lqg99uAnqR4UXydG6pi",
];

const TIER_IMAGE_CIDS: Record<BurnTier, string[]> = {
  common: BASE_IMAGE_CIDS,
  uncommon: BASE_IMAGE_CIDS,
  rare: BASE_IMAGE_CIDS,
  legendary: BASE_IMAGE_CIDS,
  mythic: BASE_IMAGE_CIDS,
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

// Deterministic pick used by the wild-spawns generator. Same (tier, seed)
// always returns the same (imageCid, name).
export function pickFromPoolDeterministic(tier: BurnTier, seed: number): SpawnPoolPick {
  const images = TIER_IMAGE_CIDS[tier];
  const names = TIER_NAME_POOL[tier];
  const s = Math.abs(seed | 0);
  return {
    imageCid: images[s % images.length],
    name: names[s % names.length],
  };
}

// Resolve ipfs:// → public gateway URL for client consumption.
export function ipfsToGatewayUrl(ipfsUri: string): string {
  if (!ipfsUri) return "";
  if (ipfsUri.startsWith("ipfs://")) {
    return `https://gateway.pinata.cloud/ipfs/${ipfsUri.slice(7)}`;
  }
  return ipfsUri;
}

export function buildMetadata(opts: {
  tier: BurnTier;
  name: string;
  imageCid: string;
  burnTxHash?: string;
  catchOrigin?: "wild" | "burn-mint";
  cellId?: string;
}): Record<string, unknown> {
  const attributes: Array<Record<string, unknown>> = [
    { trait_type: "Tier", value: BURN_TIER_LABELS[opts.tier] },
    { trait_type: "Origin", value: opts.catchOrigin === "wild" ? "Wild Catch" : "Burn-Mint" },
  ];
  if (opts.burnTxHash) attributes.push({ trait_type: "Burn Tx", value: opts.burnTxHash });
  if (opts.cellId) attributes.push({ trait_type: "Spawn Cell", value: opts.cellId });

  return {
    name: `${opts.name} (${BURN_TIER_LABELS[opts.tier]})`,
    description: `A ${BURN_TIER_LABELS[opts.tier]} BLINK Bestiary creature. Tier: ${opts.tier}.`,
    image: opts.imageCid,
    attributes,
  };
}
