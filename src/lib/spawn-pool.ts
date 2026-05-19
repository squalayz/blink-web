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

// Spawn pool delegates to CREATURE_REGISTRY so identity (creature_id, name,
// art, NFT metadata) flows through a single source of truth.
import {
  CREATURE_REGISTRY,
  creatureIdsForTier,
  pickCreatureIdDeterministic,
} from "./creature-registry";

export interface SpawnPoolPick {
  creatureId: number;
  imageCid: string;
  name: string;
}

export function pickFromPool(tier: BurnTier): SpawnPoolPick {
  const ids = creatureIdsForTier(tier);
  if (ids.length === 0) {
    throw new Error(`No creatures registered for tier ${tier}`);
  }
  const id = ids[Date.now() % ids.length];
  const entry = CREATURE_REGISTRY[id];
  return { creatureId: id, imageCid: entry.visual.card, name: entry.name };
}

/** Deterministic pick — same (tier, seed) always returns the same creature. */
export function pickFromPoolDeterministic(tier: BurnTier, seed: number): SpawnPoolPick {
  const id = pickCreatureIdDeterministic(tier, seed);
  const entry = CREATURE_REGISTRY[id];
  return { creatureId: id, imageCid: entry.visual.card, name: entry.name };
}

// Resolve a stored imageCid to a URL the client can load. The wild-spawns DB
// holds legacy IPFS CIDs alongside the new bestiary asset paths; route both
// shapes through here.
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
  creatureId?: number;
  burnTxHash?: string;
  catchOrigin?: "wild" | "burn-mint";
  cellId?: string;
}): Record<string, unknown> {
  const attributes: Array<Record<string, unknown>> = [
    { trait_type: "Tier", value: BURN_TIER_LABELS[opts.tier] },
    { trait_type: "Origin", value: opts.catchOrigin === "wild" ? "Wild Catch" : "Burn-Mint" },
  ];
  if (opts.creatureId != null) {
    attributes.push({ trait_type: "Creature ID", value: opts.creatureId });
  }
  if (opts.burnTxHash) attributes.push({ trait_type: "Burn Tx", value: opts.burnTxHash });
  if (opts.cellId) attributes.push({ trait_type: "Spawn Cell", value: opts.cellId });

  return {
    name: `${opts.name} (${BURN_TIER_LABELS[opts.tier]})`,
    description: `A ${BURN_TIER_LABELS[opts.tier]} BLINK Bestiary creature. Tier: ${opts.tier}.`,
    image: opts.imageCid,
    attributes,
  };
}

/**
 * Deterministic metadata-from-creature-id helper. The catch route MUST
 * resolve metadata through this when the spawn carries a creature_id, so the
 * NFT minted matches what was shown in AR.
 */
export function buildMetadataFromCreatureId(
  creatureId: number,
  opts: {
    burnTxHash?: string;
    catchOrigin?: "wild" | "burn-mint";
    cellId?: string;
  } = {},
): Record<string, unknown> {
  const entry = CREATURE_REGISTRY[creatureId];
  if (!entry) {
    throw new Error(`Unknown creature_id=${creatureId} — refusing to mint`);
  }
  const tier = entry.tier;
  const imageCid = entry.nft.image_cid
    ? `ipfs://${entry.nft.image_cid}`
    : entry.visual.card;
  return buildMetadata({
    tier,
    name: entry.name,
    imageCid,
    creatureId,
    burnTxHash: opts.burnTxHash,
    catchOrigin: opts.catchOrigin,
    cellId: opts.cellId,
  });
}
