// ════════════════════════════════════════════════════════════════════════════
// BLINK Phase 3 — Wallet NFT holdings
//
// Server-only. Reads PUBLIC on-chain ownership for the BLINK Genesis +
// Mythic contracts. We never request signatures, never sign transactions,
// and never touch private keys.
//
// Primary path: Alchemy SDK (fast, indexed, returns rich metadata).
// Fallback path: public-RPC `eth_getLogs` + `ownerOf` + `tokenURI`, used when
// `ALCHEMY_API_KEY` is missing OR Alchemy throws. The fallback keeps the
// gallery working in production even before the Alchemy key is wired in.
// ════════════════════════════════════════════════════════════════════════════

import "server-only";
import { Alchemy, Network, type OwnedNft } from "alchemy-sdk";
import { ethers } from "ethers";
import { BESTIARY, BLINK_GENESIS_CONTRACT, type Rarity } from "./bestiary";

export type TokenSnapshot = {
  tokenId: number;
  name: string;
  image: string;
  tier: Rarity;
  traits: { trait_type: string; value: string }[];
  contract: string;
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

const ETH_RPC_URL =
  process.env.ETH_RPC_URL || "https://ethereum-rpc.publicnode.com";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const ERC721_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
];

let alchemy: Alchemy | null = null;
function getAlchemy(): Alchemy | null {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) return null;
  if (!alchemy) {
    alchemy = new Alchemy({ apiKey: key, network: Network.ETH_MAINNET });
  }
  return alchemy;
}

let provider: ethers.JsonRpcProvider | null = null;
function getProvider(): ethers.JsonRpcProvider {
  if (!provider) provider = new ethers.JsonRpcProvider(ETH_RPC_URL);
  return provider;
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

function toSnapshot(
  nft: OwnedNft,
  contract: string,
  fallbackTier: Rarity = "common",
): TokenSnapshot {
  const rawTokenId = nft.tokenId ?? "0";
  const tokenId =
    rawTokenId.startsWith("0x") || rawTokenId.startsWith("0X")
      ? parseInt(rawTokenId, 16)
      : parseInt(rawTokenId, 10);
  const id = Number.isFinite(tokenId) ? tokenId : 0;

  // Map Genesis token IDs onto the static BESTIARY (Phase 2 source of truth).
  const isGenesis = contract.toLowerCase() === GENESIS_CONTRACT;
  const localCreature = isGenesis ? BESTIARY.find((c) => c.id === id) : undefined;

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
      "/cards/001_sprite.webp",
    tier: localCreature?.rarity ?? fallbackTier,
    traits,
    contract,
  };
}

async function fetchNftsViaAlchemy(
  wallet: string,
  contract: string,
): Promise<OwnedNft[] | null> {
  const a = getAlchemy();
  if (!a || !contract) return null;
  try {
    const res = await a.nft.getNftsForOwner(wallet, {
      contractAddresses: [contract],
      omitMetadata: false,
    });
    return res.ownedNfts ?? [];
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Public-RPC fallback. Scans recent Transfer logs `to == wallet`, then for each
// tokenId verifies current ownership via `ownerOf` (handles transfers out),
// and resolves metadata via `tokenURI`.
// ────────────────────────────────────────────────────────────────────────────

function ipfsToHttp(uri: string): string {
  if (!uri) return uri;
  if (uri.startsWith("ipfs://")) {
    const rest = uri.replace(/^ipfs:\/\//, "").replace(/^ipfs\//, "");
    return `https://gateway.pinata.cloud/ipfs/${rest}`;
  }
  return uri;
}

function addressTopic(addr: string): string {
  return "0x" + addr.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

async function getLogsChunked(
  p: ethers.JsonRpcProvider,
  contract: string,
  fromBlock: number,
  toBlock: number,
  walletTopic: string,
  chunkSize = 10_000,
): Promise<ethers.Log[]> {
  const out: ethers.Log[] = [];
  for (let start = fromBlock; start <= toBlock; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, toBlock);
    try {
      const logs = await p.getLogs({
        address: contract,
        topics: [TRANSFER_TOPIC, null, walletTopic],
        fromBlock: start,
        toBlock: end,
      });
      out.push(...logs);
    } catch {
      // RPC may cap range. Halve and retry the inner span. Bail to skip block on repeat error.
      if (chunkSize > 1000) {
        const half = Math.floor(chunkSize / 2);
        const sub = await getLogsChunked(p, contract, start, end, walletTopic, half).catch(
          () => [] as ethers.Log[],
        );
        out.push(...sub);
      }
    }
  }
  return out;
}

async function fetchNftsViaRpc(
  wallet: string,
  contract: string,
): Promise<TokenSnapshot[]> {
  if (!contract) return [];
  const p = getProvider();
  const latest = await p.getBlockNumber();
  // Scan last ~100k blocks (~14 days on mainnet). Both BLINK contracts were
  // deployed in May 2026, well inside this window.
  const fromBlock = Math.max(0, latest - 100_000);
  const walletTopic = addressTopic(wallet);
  const logs = await getLogsChunked(p, contract, fromBlock, latest, walletTopic);

  const tokenIds = new Set<bigint>();
  for (const log of logs) {
    const topic3 = log.topics[3];
    if (!topic3) continue;
    try {
      tokenIds.add(BigInt(topic3));
    } catch {
      /* skip malformed */
    }
  }

  if (tokenIds.size === 0) return [];

  const nft = new ethers.Contract(contract, ERC721_ABI, p);
  const candidates = Array.from(tokenIds);

  // Verify current ownership; tokens transferred out should not show up.
  const owned: bigint[] = [];
  await Promise.all(
    candidates.map(async (id) => {
      try {
        const owner: string = await nft.ownerOf(id);
        if (owner && owner.toLowerCase() === wallet.toLowerCase()) {
          owned.push(id);
        }
      } catch {
        /* burned / does not exist */
      }
    }),
  );

  // Resolve metadata per owned token.
  const snapshots = await Promise.all(
    owned.map(async (id): Promise<TokenSnapshot> => {
      const numericId = Number(id);
      const isGenesis = contract.toLowerCase() === GENESIS_CONTRACT;
      const localCreature = isGenesis
        ? BESTIARY.find((c) => c.id === numericId)
        : undefined;

      let name = localCreature?.name ?? `BLINK #${numericId}`;
      let image = localCreature?.image ?? "/cards/001_sprite.webp";
      let traits: { trait_type: string; value: string }[] = [];

      try {
        const rawUri: string = await nft.tokenURI(id);
        const url = ipfsToHttp(rawUri);
        if (url) {
          const res = await fetch(url, {
            signal: AbortSignal.timeout(8000),
            headers: { Accept: "application/json" },
          });
          if (res.ok) {
            const meta = (await res.json()) as {
              name?: string;
              image?: string;
              image_url?: string;
              attributes?: { trait_type?: unknown; value?: unknown }[];
            };
            if (!localCreature && typeof meta.name === "string" && meta.name.trim()) {
              name = meta.name;
            }
            const rawImg = meta.image || meta.image_url || "";
            if (!localCreature && rawImg) {
              image = ipfsToHttp(rawImg);
            }
            if (Array.isArray(meta.attributes)) {
              traits = meta.attributes
                .filter((t) => !!t && typeof t === "object")
                .map((t) => ({
                  trait_type: String(t.trait_type ?? ""),
                  value: String(t.value ?? ""),
                }));
            }
          }
        }
      } catch {
        /* leave fallbacks in place */
      }

      const tier: Rarity =
        localCreature?.rarity ?? (isGenesis ? "common" : "mythic");

      return {
        tokenId: numericId,
        name,
        image,
        tier,
        traits,
        contract,
      };
    }),
  );

  return snapshots.sort((a, b) => a.tokenId - b.tokenId);
}

async function fetchHoldingsForContract(
  wallet: string,
  contract: string,
  fallbackTier: Rarity,
): Promise<TokenSnapshot[]> {
  if (!contract) return [];

  // Try Alchemy first when configured.
  const viaAlchemy = await fetchNftsViaAlchemy(wallet, contract);
  if (viaAlchemy && viaAlchemy.length > 0) {
    return viaAlchemy.map((n) => toSnapshot(n, contract, fallbackTier));
  }

  // If Alchemy returned an empty (but successful) list AND a key was present,
  // trust it. Otherwise fall through to RPC.
  if (viaAlchemy !== null && process.env.ALCHEMY_API_KEY) {
    return [];
  }

  // Fallback: public RPC.
  try {
    return await fetchNftsViaRpc(wallet, contract);
  } catch {
    return [];
  }
}

export async function getBlinkHoldings(address: string): Promise<BlinkHoldings> {
  const wallet = normaliseAddress(address);
  if (!wallet) return { genesis: [], mythics: [], wallet: "" };

  const now = Date.now();
  const hit = cache.get(wallet);
  if (hit && hit.expires > now) return hit.value;

  const [genesis, mythics] = await Promise.all([
    fetchHoldingsForContract(wallet, GENESIS_CONTRACT, "common"),
    MYTHICS_CONTRACT
      ? fetchHoldingsForContract(wallet, MYTHICS_CONTRACT, "mythic")
      : Promise.resolve([] as TokenSnapshot[]),
  ]);

  const value: BlinkHoldings = { wallet, genesis, mythics };

  cache.set(wallet, { value, expires: now + CACHE_TTL_MS });
  return value;
}

export function invalidateHoldingsCache(address: string): void {
  cache.delete(normaliseAddress(address));
}

export function tokenIds(snapshots: TokenSnapshot[]): number[] {
  return snapshots.map((s) => s.tokenId).filter((id) => Number.isFinite(id));
}
