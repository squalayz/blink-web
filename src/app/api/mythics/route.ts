// ════════════════════════════════════════════════════════════════════════════
// BLINK Phase 4 — /api/mythics
//
// Fetches the on-chain Mythics metadata for the BLINK Mythics contract on
// Ethereum mainnet. Reads `totalMinted()` then `tokenURI(i)` for each token,
// resolves IPFS metadata, and returns a slim JSON for the landing-page grid.
//
// We never sign transactions or touch private keys. All reads go through
// a public RPC; if Alchemy is configured we use it for higher rate limits.
// 5-minute in-memory cache.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createPublicClient, http, type Address } from "viem";
import { mainnet } from "viem/chains";

export const runtime = "nodejs";
export const revalidate = 300;
export const dynamic = "force-dynamic";

const MYTHICS_CONTRACT = (
  process.env.NEXT_PUBLIC_BLINK_MYTHICS_CONTRACT ||
  "0x4C3B668A628b47b7CC790FFf14BF4Aaff276E592"
) as Address;

const ABI = [
  {
    inputs: [],
    name: "totalMinted",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

function rpcUrl(): string {
  const key = process.env.ALCHEMY_API_KEY;
  if (key) return `https://eth-mainnet.g.alchemy.com/v2/${key}`;
  return "https://eth.llamarpc.com";
}

const client = createPublicClient({
  chain: mainnet,
  transport: http(rpcUrl()),
});

const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
];

function resolveIpfs(uri: string): string[] {
  if (!uri) return [];
  if (uri.startsWith("ipfs://")) {
    const tail = uri.replace("ipfs://", "");
    return IPFS_GATEWAYS.map((g) => g + tail);
  }
  return [uri];
}

async function fetchJson(urls: string[]): Promise<Record<string, unknown> | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { next: { revalidate: 300 } });
      if (res.ok) return (await res.json()) as Record<string, unknown>;
    } catch {
      /* try next gateway */
    }
  }
  return null;
}

type MythicCard = {
  tokenId: number;
  name: string;
  image: string;
  description: string;
  owner: string | null;
  attributes: { trait_type: string; value: string }[];
  openseaUrl: string;
};

type CacheShape = { value: MythicCard[]; expires: number };
let cache: CacheShape | null = null;
const TTL_MS = 5 * 60 * 1000;

async function readTotal(): Promise<number> {
  try {
    const minted = await client.readContract({
      address: MYTHICS_CONTRACT,
      abi: ABI,
      functionName: "totalMinted",
    });
    return Number(minted);
  } catch {
    try {
      const supply = await client.readContract({
        address: MYTHICS_CONTRACT,
        abi: ABI,
        functionName: "totalSupply",
      });
      return Number(supply);
    } catch {
      return 0;
    }
  }
}

async function readOne(tokenId: number): Promise<MythicCard | null> {
  try {
    const [uri, owner] = await Promise.all([
      client.readContract({
        address: MYTHICS_CONTRACT,
        abi: ABI,
        functionName: "tokenURI",
        args: [BigInt(tokenId)],
      }),
      client
        .readContract({
          address: MYTHICS_CONTRACT,
          abi: ABI,
          functionName: "ownerOf",
          args: [BigInt(tokenId)],
        })
        .catch(() => null),
    ]);

    const candidates = resolveIpfs(uri as string);
    const meta = (await fetchJson(candidates)) ?? {};
    const rawImage = (meta.image as string) || "";
    const imageCandidates = resolveIpfs(rawImage);

    const attrs = Array.isArray(meta.attributes)
      ? (meta.attributes as Array<{ trait_type?: string; value?: unknown }>)
          .map((a) => ({
            trait_type: String(a.trait_type ?? ""),
            value: String(a.value ?? ""),
          }))
          .filter((a) => a.trait_type)
      : [];

    return {
      tokenId,
      name: (meta.name as string) || `Mythic #${tokenId}`,
      image: imageCandidates[0] ?? "",
      description: (meta.description as string) || "",
      owner: (owner as string | null) ?? null,
      attributes: attrs,
      openseaUrl: `https://opensea.io/assets/ethereum/${MYTHICS_CONTRACT}/${tokenId}`,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const now = Date.now();
  if (cache && cache.expires > now) {
    return NextResponse.json({ mythics: cache.value });
  }

  const total = await readTotal();
  if (!total) {
    return NextResponse.json({ mythics: [] });
  }

  const ids = Array.from({ length: total }, (_, i) => i + 1);
  const cards = (await Promise.all(ids.map(readOne))).filter(
    (c): c is MythicCard => c !== null,
  );

  cache = { value: cards, expires: now + TTL_MS };
  return NextResponse.json({ mythics: cards });
}
