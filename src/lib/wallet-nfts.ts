// ════════════════════════════════════════════════════════════════════════════
// BLINK Phase 3 — Wallet NFT holdings (Alchemy)
//
// Server-only. Reads PUBLIC on-chain ownership for the BLINK Genesis +
// Mythic contracts via Alchemy. We never request signatures, never sign
// transactions, and never touch private keys.
//
// If ALCHEMY_API_KEY is missing the helpers return empty arrays so the rest
// of the app keeps working — wire the real key in .env.local to go live.
// ════════════════════════════════════════════════════════════════════════════

import "server-only";
import { Alchemy, Network, type OwnedNft } from "alchemy-sdk";
import { BESTIARY, BLINK_GENESIS_CONTRACT, type Rarity } from "./bestiary";

export type TokenSnapshot = {
  tokenId: number;
  name: string;
  image: string;
  tier: Rarity;
  traits: { trait_type: string; value: string }[];
};

export type BlinkHoldings = {
  genesis: TokenSnapshot[];
  mythics: TokenSnapshot[];
  wallet: string;
};

const GENESIS_CONTRACT = (
  process.env.NEXT_PUBLIC_BLINK_GENESIS_CONTRACT || BLINK_GENESIS_CONTRACT
).toLowerCase();

const MYTHICS_CONTRACT = (
  process.env.NEXT_PUBLIC_BLINK_MYTHICS_CONTRACT || ""
).toLowerCase();

let alchemy: Alchemy | null = null;
function getAlchemy(): Alchemy | null {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) return null;
  if (!alchemy) {
    alchemy = new Alchemy({ apiKey: key, network: Network.ETH_MAINNET });
  }
  return alchemy;
}

// ────────────────────────────────────────────────────────────────────────────
// 60-second in-memory cache keyed by wallet (lowercased).
// Cleared on process restart — that's fine, Alchemy free tier is generous.
// ────────────────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 60_000;
type CacheEntry = { value: BlinkHoldings; expires: number };
const cache = new Map<string, CacheEntry>();

function normaliseAddress(addr: string): string {
  return (addr || "").trim().toLowerCase();
}

function toSnapshot(nft: OwnedNft, fallbackTier: Rarity = "common"): TokenSnapshot {
  const rawTokenId = nft.tokenId ?? "0";
  const tokenId =
    rawTokenId.startsWith("0x") || rawTokenId.startsWith("0X")
      ? parseInt(rawTokenId, 16)
      : parseInt(rawTokenId, 10);
  const id = Number.isFinite(tokenId) ? tokenId : 0;

  // Map Genesis token IDs onto the static BESTIARY (Phase 2 source of truth).
  const localCreature = BESTIARY.find((c) => c.id === id);

  const rawAttrs = (nft.raw?.metadata as { attributes?: unknown } | undefined)
    ?.attributes;
  const traits = Array.isArray(rawAttrs)
    ? rawAttrs
        .filter((t): t is { trait_type?: unknown; value?: unknown } =>
          !!t && typeof t === "object",
        )
        .map((t) => ({
          trait_type: String(t.trait_type ?? ""),
          value: String(t.value ?? ""),
        }))
    : [];

  return {
    tokenId: id,
    name: localCreature?.name ?? nft.name ?? `BLINK #${id}`,
    image:
      localCreature?.image ??
      nft.image?.cachedUrl ??
      nft.image?.originalUrl ??
      "/cards/001_sprite.jpg",
    tier: localCreature?.rarity ?? fallbackTier,
    traits,
  };
}

async function fetchNfts(
  wallet: string,
  contract: string,
): Promise<OwnedNft[]> {
  const a = getAlchemy();
  if (!a || !contract) return [];
  try {
    const res = await a.nft.getNftsForOwner(wallet, {
      contractAddresses: [contract],
      omitMetadata: false,
    });
    return res.ownedNfts ?? [];
  } catch {
    // Alchemy can flap; degrade to empty so the UI keeps rendering.
    return [];
  }
}

export async function getBlinkHoldings(address: string): Promise<BlinkHoldings> {
  const wallet = normaliseAddress(address);
  if (!wallet) return { genesis: [], mythics: [], wallet: "" };

  const now = Date.now();
  const hit = cache.get(wallet);
  if (hit && hit.expires > now) return hit.value;

  const [rawGenesis, rawMythics] = await Promise.all([
    fetchNfts(wallet, GENESIS_CONTRACT),
    MYTHICS_CONTRACT ? fetchNfts(wallet, MYTHICS_CONTRACT) : Promise.resolve([]),
  ]);

  const value: BlinkHoldings = {
    wallet,
    genesis: rawGenesis.map((n) => toSnapshot(n, "common")),
    mythics: rawMythics.map((n) => toSnapshot(n, "mythic")),
  };

  cache.set(wallet, { value, expires: now + CACHE_TTL_MS });
  return value;
}

export function invalidateHoldingsCache(address: string): void {
  cache.delete(normaliseAddress(address));
}

export function tokenIds(snapshots: TokenSnapshot[]): number[] {
  return snapshots.map((s) => s.tokenId).filter((id) => Number.isFinite(id));
}
