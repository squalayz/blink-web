// ════════════════════════════════════════════════════════════════════════════
// BLINK CREATURE REGISTRY — single source of truth for creature identity.
//
// Every wild_spawn / orb carries a `creature_id` (int) that points into this
// table. Visuals (AR overlay, map marker, success card), NFT metadata, and
// gameplay attributes (tier, power, lore) all resolve through here so the
// thing the user SEES is the thing they CATCH is the thing that gets MINTED.
//
// Identity calibration rule: NEVER pick visuals or NFT metadata by name or
// image-CID lookup. Always carry the integer creature_id end-to-end.
// ════════════════════════════════════════════════════════════════════════════

export type CreatureTier =
  | "common"
  | "uncommon"
  | "rare"
  | "legendary"
  | "mythic";

export interface CreatureRegistryEntry {
  /** Stable forever — used as the on-chain identity anchor. */
  id: number;
  /** Display name (canonical capitalization). */
  name: string;
  /** Tier — drives spawn weight, BLINK reward, fee tier. */
  tier: CreatureTier;
  visual: {
    /** Map marker / small UI (currently reuses card asset). */
    pixel: string;
    /** AR camera floating asset (transparent PNG/WebP). */
    animated: string;
    /** Catch-result / bestiary card asset. */
    card: string;
  };
  nft: {
    /**
     * Pre-pinned IPFS metadata CID. NULL ⇒ metadata is generated at
     * catch-time deterministically from this registry entry (option (b) in
     * the spec). When non-null, must point to JSON whose `image` field is
     * `ipfs://${image_cid}`.
     */
    metadata_cid: string | null;
    /**
     * Pre-pinned IPFS image CID for the NFT's `image` field. Empty string
     * means the on-chain `image` field uses the local asset path instead
     * (v1 default for non-mythic creatures).
     */
    image_cid: string;
  };
  powers: {
    name: string;
    description: string;
  };
  lore: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry. Indexed by creature_id (1..20). ORDER + IDS ARE FROZEN — never
// renumber. New creatures append with a new id.
// ─────────────────────────────────────────────────────────────────────────────

export const CREATURE_REGISTRY: Record<number, CreatureRegistryEntry> = {
  1: {
    id: 1,
    name: "Sprite",
    tier: "common",
    visual: {
      pixel: "/cards/001_sprite.webp",
      animated: "/floating-all/001_sprite.webp",
      card: "/cards/001_sprite.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Static", description: "Spawns next creature 10% closer." },
    lore: "The first one came at dusk.",
  },
  2: {
    id: 2,
    name: "Nibbler",
    tier: "common",
    visual: {
      pixel: "/cards/002_nibbler.webp",
      animated: "/floating-all/002_nibbler.webp",
      card: "/cards/002_nibbler.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Bite", description: "Reveals nearby spawns for 5 min." },
    lore: "Small. Sharp. Always hungry.",
  },
  3: {
    id: 3,
    name: "Pixie",
    tier: "common",
    visual: {
      pixel: "/cards/003_pixie.webp",
      animated: "/floating-all/003_pixie.webp",
      card: "/cards/003_pixie.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Glint", description: "Next 3 catches give +25%." },
    lore: "A tiny luminous figure with crackling wings.",
  },
  4: {
    id: 4,
    name: "Emberling",
    tier: "common",
    visual: {
      pixel: "/cards/004_emberling.webp",
      animated: "/floating-all/004_emberling.webp",
      card: "/cards/004_emberling.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Heat", description: "+50% during peak hours." },
    lore: "A spark wearing the shape of a creature.",
  },
  5: {
    id: 5,
    name: "Dustfox",
    tier: "common",
    visual: {
      pixel: "/cards/005_dustfox.webp",
      animated: "/floating-all/005_dustfox.webp",
      card: "/cards/005_dustfox.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Trace", description: "Summons free spawns nearby." },
    lore: "Appears where the chain has gone quiet.",
  },
  6: {
    id: 6,
    name: "Pebblekin",
    tier: "common",
    visual: {
      pixel: "/cards/006_pebblekin.webp",
      animated: "/floating-all/006_pebblekin.webp",
      card: "/cards/006_pebblekin.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Stack", description: "Owning 5+ grants +5% boost." },
    lore: "They gather in piles. The more you have, the more they whisper.",
  },
  7: {
    id: 7,
    name: "Speckle",
    tier: "common",
    visual: {
      pixel: "/cards/007_speckle.webp",
      animated: "/floating-all/007_speckle.webp",
      card: "/cards/007_speckle.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Trace", description: "Counts double toward streaks." },
    lore: "The smallest sighting. Often unwitnessed.",
  },
  8: {
    id: 8,
    name: "Hopspirit",
    tier: "common",
    visual: {
      pixel: "/cards/008_hopspirit.webp",
      animated: "/floating-all/008_hopspirit.webp",
      card: "/cards/008_hopspirit.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Twitch", description: "Speed catch gives bonus." },
    lore: "A rabbit-shaped echo.",
  },
  9: {
    id: 9,
    name: "Shimmer",
    tier: "common",
    visual: {
      pixel: "/cards/009_shimmer.webp",
      animated: "/floating-all/009_shimmer.webp",
      card: "/cards/009_shimmer.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Reflect", description: "Shows local watcher activity." },
    lore: "Mirror-skinned. Reflects what you cannot see.",
  },
  10: {
    id: 10,
    name: "Silkmoth",
    tier: "common",
    visual: {
      pixel: "/cards/010_silkmoth.webp",
      animated: "/floating-all/010_silkmoth.webp",
      card: "/cards/010_silkmoth.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Night", description: "2x at night (22-04 UTC)." },
    lore: "Drawn to phone screens after dark.",
  },
  11: {
    id: 11,
    name: "Cat",
    tier: "uncommon",
    visual: {
      pixel: "/cards/011_cat.webp",
      animated: "/floating-all/011_cat.webp",
      card: "/cards/011_cat.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Memory", description: "Unlocks BLINK lore on catch." },
    lore: "Older than the chain itself.",
  },
  12: {
    id: 12,
    name: "Glitch Hare",
    tier: "uncommon",
    visual: {
      pixel: "/cards/012_glitchhare.webp",
      animated: "/floating-all/012_glitchhare.webp",
      card: "/cards/012_glitchhare.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Fork", description: "50/50 gamble: bonus or penalty." },
    lore: "A hare that exists on two blocks at once.",
  },
  13: {
    id: 13,
    name: "Whiskerwisp",
    tier: "uncommon",
    visual: {
      pixel: "/cards/013_whiskerwisp.webp",
      animated: "/floating-all/013_whiskerwisp.webp",
      card: "/cards/013_whiskerwisp.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Sense", description: "Reveals rare spawns nearby." },
    lore: "Six-tailed fox spirit.",
  },
  14: {
    id: 14,
    name: "Hushling",
    tier: "uncommon",
    visual: {
      pixel: "/cards/014_hushling.webp",
      animated: "/floating-all/014_hushling.webp",
      card: "/cards/014_hushling.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Silent", description: "Inactivity grants bonus." },
    lore: "Voiceless. When near, your phone goes still.",
  },
  15: {
    id: 15,
    name: "Eyefly",
    tier: "uncommon",
    visual: {
      pixel: "/cards/015_eyefly.webp",
      animated: "/floating-all/015_eyefly.webp",
      card: "/cards/015_eyefly.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Pair", description: "30% chance second spawns." },
    lore: "A single eye with insect wings. Travels in pairs.",
  },
  16: {
    id: 16,
    name: "Cyclops",
    tier: "rare",
    visual: {
      pixel: "/cards/016_cyclops.webp",
      animated: "/floating-all/016_cyclops.webp",
      card: "/cards/016_cyclops.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Focus", description: "Permanent badge + bonus." },
    lore: "Sees only one thing. But sees it completely.",
  },
  17: {
    id: 17,
    name: "Aethermane",
    tier: "rare",
    visual: {
      pixel: "/cards/017_aethermane.webp",
      animated: "/floating-all/017_aethermane.webp",
      card: "/cards/017_aethermane.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Roar", description: "Council access for 7 days." },
    lore: "A lion-spirit with a mane of green lightning.",
  },
  18: {
    id: 18,
    name: "Oracle",
    tier: "legendary",
    visual: {
      pixel: "/cards/018_oracle.webp",
      animated: "/floating-all/018_oracle.webp",
      card: "/cards/018_oracle.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Omen", description: "Permanent badge + Council." },
    lore: "When you see it, the trade has already happened.",
  },
  19: {
    id: 19,
    name: "The Phoenix",
    tier: "legendary",
    visual: {
      pixel: "/cards/019_phoenix.webp",
      animated: "/floating-all/019_phoenix.webp",
      card: "/cards/019_phoenix.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Rebirth", description: "Phoenix Bearer status." },
    lore: "Born from green candles.",
  },
  20: {
    id: 20,
    name: "The First Eye",
    tier: "mythic",
    visual: {
      pixel: "/cards/020_firsteye.webp",
      animated: "/floating-all/020_firsteye.webp",
      card: "/cards/020_firsteye.webp",
    },
    nft: { metadata_cid: null, image_cid: "" },
    powers: { name: "Witness", description: "Council Founder · Eternal status." },
    lore: "The original. All others are echoes of it.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Derived indexes & accessors
// ─────────────────────────────────────────────────────────────────────────────

export const CREATURE_IDS: number[] = Object.keys(CREATURE_REGISTRY)
  .map(Number)
  .sort((a, b) => a - b);

export const ALL_CREATURES: CreatureRegistryEntry[] = CREATURE_IDS.map(
  (id) => CREATURE_REGISTRY[id],
);

const NAME_INDEX = new Map<string, CreatureRegistryEntry>();
for (const c of ALL_CREATURES) {
  NAME_INDEX.set(normaliseName(c.name), c);
}

const IMAGE_CID_INDEX = new Map<string, CreatureRegistryEntry>();
for (const c of ALL_CREATURES) {
  if (c.visual.card) IMAGE_CID_INDEX.set(c.visual.card, c);
  if (c.visual.animated) IMAGE_CID_INDEX.set(c.visual.animated, c);
}

function normaliseName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Strict lookup. Returns null if the id is unknown. */
export function getCreatureById(id: number | null | undefined): CreatureRegistryEntry | null {
  if (id == null) return null;
  return CREATURE_REGISTRY[id] ?? null;
}

/**
 * Legacy fallback for rows that predate creature_id stamping. Resolves by
 * (name, then image_cid). Returns null when nothing matches — callers should
 * log a warning when they hit this.
 */
export function legacyResolveCreature(
  name: string | null | undefined,
  imageCid: string | null | undefined,
): CreatureRegistryEntry | null {
  if (name) {
    const byName = NAME_INDEX.get(normaliseName(name));
    if (byName) return byName;
  }
  if (imageCid) {
    const byCid = IMAGE_CID_INDEX.get(imageCid);
    if (byCid) return byCid;
  }
  return null;
}

/** Pool of creature_ids by tier — used by the wild-spawns generator. */
export function creatureIdsForTier(tier: CreatureTier): number[] {
  return ALL_CREATURES.filter((c) => c.tier === tier).map((c) => c.id);
}

/** Deterministic creature_id pick for a (tier, seed) — wild-spawns generator. */
export function pickCreatureIdDeterministic(
  tier: CreatureTier,
  seed: number,
): number {
  const pool = creatureIdsForTier(tier);
  if (pool.length === 0) {
    throw new Error(`No creatures registered for tier ${tier}`);
  }
  const s = Math.abs(seed | 0);
  return pool[s % pool.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier display
// ─────────────────────────────────────────────────────────────────────────────

export const TIER_LABELS: Record<CreatureTier, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  legendary: "Legendary",
  mythic: "Mythic",
};

export const TIER_COLORS: Record<CreatureTier, string> = {
  common: "#9aa3b2",
  uncommon: "#00FF88",
  rare: "#88FF00",
  legendary: "#ffd166",
  mythic: "#ff8ae0",
};
