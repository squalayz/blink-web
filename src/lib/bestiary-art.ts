// Client-safe creature → bestiary asset resolution. Reads through the unified
// CREATURE_REGISTRY (src/lib/creature-registry.ts) so the AR overlay, the map
// marker, and the NFT mint route all draw from the same source of truth.
//
// PREFERRED: pass `creature_id` (stamped at spawn-time). The (name, tier) form
// is kept as a legacy fallback for rows that predate the registry.

import {
  CREATURE_REGISTRY,
  legacyResolveCreature,
  TIER_COLORS,
  type CreatureRegistryEntry,
  type CreatureTier,
} from "./creature-registry";

export type Rarity = CreatureTier;

export type ResolvedCreatureArt = {
  card: string;
  floating: string;
  rarity: Rarity;
  color: string;
  creatureId: number | null;
  fellBack: boolean;
};

function tierTone(tier: string | null | undefined): {
  rarity: Rarity;
  color: string;
} {
  const t = (tier || "common").toLowerCase() as Rarity;
  const color = TIER_COLORS[t] ?? TIER_COLORS.common;
  return { rarity: t, color };
}

function artFromEntry(
  entry: CreatureRegistryEntry,
  tier: string | null | undefined,
  fellBack: boolean,
): ResolvedCreatureArt {
  const tone = tierTone(tier ?? entry.tier);
  return {
    card: entry.visual.card,
    floating: entry.visual.animated,
    rarity: entry.tier,
    color: tone.color,
    creatureId: entry.id,
    fellBack,
  };
}

/**
 * Strict identity resolution by creature_id. This is the path every new
 * spawn flows through. Falls back to a name lookup when creature_id is null
 * (legacy rows) and emits a console.warn so we can spot stragglers.
 */
export function resolveByCreatureId(
  creatureId: number | null | undefined,
  fallback?: { name?: string | null; tier?: string | null; imageCid?: string | null },
): ResolvedCreatureArt {
  if (creatureId != null) {
    const entry = CREATURE_REGISTRY[creatureId];
    if (entry) return artFromEntry(entry, fallback?.tier, false);
    if (typeof window !== "undefined") {
      console.warn(
        `[creature-registry] Unknown creature_id=${creatureId} — falling back to name lookup`,
      );
    }
  }

  const legacy = legacyResolveCreature(fallback?.name ?? null, fallback?.imageCid ?? null);
  if (legacy) {
    if (typeof window !== "undefined" && creatureId == null) {
      console.warn(
        `[creature-registry] Legacy row without creature_id — resolved "${fallback?.name ?? ""}" by name`,
      );
    }
    return artFromEntry(legacy, fallback?.tier, true);
  }

  const tone = tierTone(fallback?.tier);
  return {
    card: "",
    floating: "",
    rarity: tone.rarity,
    color: tone.color,
    creatureId: null,
    fellBack: true,
  };
}

/**
 * Legacy resolver — accepts (name, tier) and tries to find a matching
 * registry entry. Retained as a thin wrapper so existing call sites compile
 * without changes while we migrate them to `resolveByCreatureId`.
 */
export function resolveCreatureArt(
  name: string | null | undefined,
  tier: string,
  _seed?: string,
): ResolvedCreatureArt {
  return resolveByCreatureId(null, { name, tier });
}

export function tierColor(tier: string): string {
  return tierTone(tier).color;
}
