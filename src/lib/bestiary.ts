// ════════════════════════════════════════════════════════════════════════════
// LEGACY BESTIARY ADAPTER
//
// Pre-CATCH-IDENTITY-CALIBRATION this file owned the canonical creature list.
// It now derives everything from CREATURE_REGISTRY (src/lib/creature-registry)
// so the rest of the app keeps compiling while the registry is the only
// source of truth.
// ════════════════════════════════════════════════════════════════════════════

import {
  ALL_CREATURES,
  TIER_COLORS,
  TIER_LABELS,
  type CreatureTier,
} from "./creature-registry";

export type Rarity = CreatureTier;

export type Creature = {
  id: number;
  name: string;
  rarity: Rarity;
  type: string;
  power: string;
  powerDesc: string;
  image: string;
  floating: string;
  lore: string;
};

const TYPE_HINT: Record<number, string> = {
  1: "Wisp",
  2: "Beast",
  3: "Fae",
  4: "Flame",
  5: "Beast",
  6: "Stone",
  7: "Echo",
  8: "Fae",
  9: "Mirror",
  10: "Wing",
  11: "Sentinel",
  12: "Bug",
  13: "Spirit",
  14: "Shadow",
  15: "Swarm",
  16: "Sentinel",
  17: "Mythic",
  18: "Witness",
  19: "Mythic",
  20: "Ancestral",
};

// Creatures that ship with the iOS app's own transparent cutout artwork
// (Assets.xcassets → /public/brand/app/creatures). Floating/ambient surfaces
// prefer these so the web shows the exact art the app renders; cards and
// NFT metadata are untouched.
const APP_CUTOUT_SLUGS = new Set([
  "sprite", "pixie", "emberling", "dustfox", "pebblekin", "speckle",
  "shimmer", "silkmoth", "cat", "cyclops", "aethermane", "oracle",
  "firsteye", "omen",
]);

function floatingArt(card: string, animated: string): string {
  const stem = card.split("/").pop() ?? "";
  const slug = stem.replace(/^\d+_/, "").replace(/\.\w+$/, "");
  return APP_CUTOUT_SLUGS.has(slug) ? `/brand/app/creatures/${slug}.webp` : animated;
}

export const BESTIARY: Creature[] = ALL_CREATURES.map((c) => ({
  id: c.id,
  name: c.name.toUpperCase(),
  rarity: c.tier,
  type: TYPE_HINT[c.id] ?? "Wild",
  power: c.powers.name,
  powerDesc: c.powers.description,
  image: c.visual.card,
  floating: floatingArt(c.visual.card, c.visual.animated),
  lore: c.lore,
}));

export const RARITY_COLOR: Record<Rarity, string> = TIER_COLORS;
export const RARITY_LABEL: Record<Rarity, string> = TIER_LABELS;

export const BLINK_GENESIS_CONTRACT = "0x85e7CB56fA10f26fEAe20449e71AD1503867799A";
export const BLINK_MINT_URL = "https://mintmyblink.com";
export const BLINK_OPENSEA_URL = `https://opensea.io/assets/ethereum/${BLINK_GENESIS_CONTRACT}`;
