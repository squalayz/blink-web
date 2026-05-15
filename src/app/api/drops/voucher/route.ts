// ════════════════════════════════════════════════════════════════════════════
// BLINK Phase 5 — Drop catch voucher API
//
// Player walks up to a deployed drop → POST {dropId, userLat, userLng} here.
// We validate the SIWE session, fetch the drop from BlinkDrops on mainnet,
// confirm it is active + non-expired + within CATCH_RADIUS_M of the user,
// and return a signed CatchVoucher they can submit to BlinkDrops.catch().
// ════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { readSiweSession } from "@/lib/siwe-session";
import { signCatchVoucher } from "@/lib/blink-signer";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const DROPS_ABI = [
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

const CATCH_RADIUS_M = 50;

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

export async function POST(req: NextRequest) {
  const session = await readSiweSession(req);
  if (!session?.address) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { dropId?: unknown; userLat?: unknown; userLng?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const dropId = body.dropId;
  const userLat = typeof body.userLat === "number" ? body.userLat : NaN;
  const userLng = typeof body.userLng === "number" ? body.userLng : NaN;
  if (
    dropId == null ||
    Number.isNaN(userLat) ||
    Number.isNaN(userLng) ||
    userLat < -90 ||
    userLat > 90 ||
    userLng < -180 ||
    userLng > 180
  ) {
    return NextResponse.json({ error: "missing or invalid fields" }, { status: 400 });
  }

  const dropsAddress = process.env.NEXT_PUBLIC_BLINK_DROPS_CONTRACT;
  if (!dropsAddress) {
    return NextResponse.json({ error: "drops contract not configured" }, { status: 500 });
  }

  const client = createPublicClient({ chain: mainnet, transport: http() });

  let drop: {
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
  try {
    drop = (await client.readContract({
      address: dropsAddress as `0x${string}`,
      abi: DROPS_ABI,
      functionName: "getDrop",
      args: [BigInt(dropId as string | number)],
    })) as typeof drop;
  } catch {
    return NextResponse.json({ error: "drop not found" }, { status: 404 });
  }

  if (drop.status !== 0) {
    return NextResponse.json({ error: "drop inactive" }, { status: 400 });
  }
  if (Number(drop.expiresAt) < Math.floor(Date.now() / 1000)) {
    return NextResponse.json({ error: "drop expired" }, { status: 400 });
  }

  const dropLat = Number(drop.lat) / 1_000_000;
  const dropLng = Number(drop.lng) / 1_000_000;
  const dist = haversine(userLat, userLng, dropLat, dropLng);
  if (dist > CATCH_RADIUS_M) {
    return NextResponse.json(
      { error: `too far (${Math.round(dist)}m)`, distance: dist },
      { status: 400 },
    );
  }

  const voucher = await signCatchVoucher(
    BigInt(dropId as string | number),
    session.address as `0x${string}`,
  );

  return NextResponse.json({
    dropsContract: dropsAddress,
    catcher: session.address,
    catchPrice: drop.catchPriceEth.toString(),
    ...voucher,
  });
}
