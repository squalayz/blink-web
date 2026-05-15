// ════════════════════════════════════════════════════════════════════════════
// BLINK Phase 5 — Active drops list API (public)
//
// Returns active, non-expired BlinkDrops within a geo radius. Used by the
// /map view. We poll the contract for total + each drop, cache 30s in-memory
// to keep mainnet RPC pressure reasonable.
// ════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const DROPS_ABI = [
  {
    name: "totalDrops",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getDrop",
    type: "function",
    stateMutability: "view",
    inputs: [{ type: "uint256", name: "id" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "kind", type: "uint8" },
          { name: "status", type: "uint8" },
          { name: "dropper", type: "address" },
          { name: "asset", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "tokenId", type: "uint256" },
          { name: "lat", type: "int64" },
          { name: "lng", type: "int64" },
          { name: "expiresAt", type: "uint64" },
          { name: "catchPriceEth", type: "uint128" },
          { name: "metadata", type: "bytes32" },
        ],
      },
    ],
  },
] as const;

type DropTuple = {
  kind: number;
  status: number;
  dropper: `0x${string}`;
  asset: `0x${string}`;
  amount: bigint;
  tokenId: bigint;
  lat: bigint;
  lng: bigint;
  expiresAt: bigint;
  catchPriceEth: bigint;
  metadata: `0x${string}`;
};

type ActiveDrop = {
  id: number;
  kind: number;
  dropper: string;
  asset: string;
  amount: string;
  tokenId: string;
  lat: number;
  lng: number;
  expiresAt: number;
  catchPriceEth: string;
  metadata: string;
};

let cache: { ts: number; data: ActiveDrop[] } | null = null;
const TTL = 30_000;

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p = Math.PI / 180;
  const a =
    0.5 -
    Math.cos((lat2 - lat1) * p) / 2 +
    (Math.cos(lat1 * p) *
      Math.cos(lat2 * p) *
      (1 - Math.cos((lon2 - lon1) * p))) /
      2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const radius = parseInt(searchParams.get("radius") || "5000");
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }

  const dropsAddress = process.env.NEXT_PUBLIC_BLINK_DROPS_CONTRACT;
  if (!dropsAddress) {
    return NextResponse.json({ drops: [] });
  }

  if (!cache || Date.now() - cache.ts > TTL) {
    try {
      const client = createPublicClient({ chain: mainnet, transport: http() });
      const total = (await client.readContract({
        address: dropsAddress as `0x${string}`,
        abi: DROPS_ABI,
        functionName: "totalDrops",
      })) as bigint;

      const now = Math.floor(Date.now() / 1000);
      const drops: ActiveDrop[] = [];
      for (let i = 0n; i < total; i++) {
        const d = (await client.readContract({
          address: dropsAddress as `0x${string}`,
          abi: DROPS_ABI,
          functionName: "getDrop",
          args: [i],
        })) as DropTuple;
        if (d.status === 0 && Number(d.expiresAt) > now) {
          drops.push({
            id: Number(i),
            kind: d.kind,
            dropper: d.dropper,
            asset: d.asset,
            amount: d.amount.toString(),
            tokenId: d.tokenId.toString(),
            lat: Number(d.lat) / 1_000_000,
            lng: Number(d.lng) / 1_000_000,
            expiresAt: Number(d.expiresAt),
            catchPriceEth: d.catchPriceEth.toString(),
            metadata: d.metadata,
          });
        }
      }
      cache = { ts: Date.now(), data: drops };
    } catch {
      if (!cache) {
        return NextResponse.json({ drops: [] });
      }
      // Use stale cache rather than 5xx — the map keeps rendering.
    }
  }

  const nearby = cache.data.filter(
    (d) => haversine(lat, lng, d.lat, d.lng) < radius,
  );
  return NextResponse.json({ drops: nearby });
}
