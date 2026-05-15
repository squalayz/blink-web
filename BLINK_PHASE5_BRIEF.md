# BLINK Phase 5 — The Economy Goes Live

Two contracts are deployed on Ethereum mainnet. Backend voucher signing is the missing piece. This phase wires it.

## Already deployed (mainnet)

| Contract | Address | Purpose |
|---|---|---|
| **$BLINK** ERC-20 | `0xe7BF94959b0bfa8CB9e61149de5BFb387B40761B` | The token (2B supply, 10% tax) |
| **BlinkRewards** | `0x44F6C60880f42B1e8798E1Df4312A3b99F00c335` | EIP-712 voucher claims for catches |
| **BlinkDrops** | `0xd6d52aDC05e981800723e62BBdE012BA3045bFf9` | Geo-escrow for ETH/ERC20/NFT drops |

Initial pool: 100M $BLINK already funded in BlinkRewards. Both contracts excluded from BLINK tax + limits.

**Signer key:** `0x5a49E431C7D8bCa0ECcD43cd9C9385F1B66C55D0`
- Private key already in Vercel env: `BLINK_SIGNER_PRIVATE_KEY`
- Public addr also exposed: `NEXT_PUBLIC_BLINK_SIGNER_ADDRESS`
- Contract addresses in env: `NEXT_PUBLIC_BLINK_REWARDS_CONTRACT`, `NEXT_PUBLIC_BLINK_DROPS_CONTRACT`, `NEXT_PUBLIC_BLINK_TOKEN`

---

## Part A — Backend voucher signer infrastructure

### New file: `src/lib/blink-signer.ts`

Server-only helper that signs EIP-712 vouchers for both Rewards + Drops contracts. Uses `viem` (already in deps) for signing.

```ts
import "server-only";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, toBytes } from "viem";

const PK = process.env.BLINK_SIGNER_PRIVATE_KEY;
if (!PK) throw new Error("BLINK_SIGNER_PRIVATE_KEY missing");
const account = privateKeyToAccount(PK as `0x${string}`);

const CHAIN_ID = 1;

export async function signRewardVoucher(
  player: `0x${string}`,
  amountWei: bigint,
  ref: `0x${string}`,
  ttlSeconds = 600,
) {
  const nonce = `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex")}` as `0x${string}`;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + ttlSeconds);
  const signature = await account.signTypedData({
    domain: {
      name: "BlinkRewards",
      version: "1",
      chainId: CHAIN_ID,
      verifyingContract: process.env.NEXT_PUBLIC_BLINK_REWARDS_CONTRACT as `0x${string}`,
    },
    types: {
      Voucher: [
        { name: "player",   type: "address" },
        { name: "amount",   type: "uint256" },
        { name: "nonce",    type: "bytes32" },
        { name: "deadline", type: "uint256" },
        { name: "ref",      type: "bytes32" },
      ],
    },
    primaryType: "Voucher",
    message: { player, amount: amountWei, nonce, deadline, ref },
  });
  return { signature, nonce, deadline: Number(deadline), amount: amountWei.toString(), ref };
}

export async function signCatchVoucher(
  dropId: bigint,
  catcher: `0x${string}`,
  ttlSeconds = 300,
) {
  const nonce = `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex")}` as `0x${string}`;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + ttlSeconds);
  const signature = await account.signTypedData({
    domain: {
      name: "BlinkDrops",
      version: "1",
      chainId: CHAIN_ID,
      verifyingContract: process.env.NEXT_PUBLIC_BLINK_DROPS_CONTRACT as `0x${string}`,
    },
    types: {
      CatchVoucher: [
        { name: "dropId",   type: "uint256" },
        { name: "catcher",  type: "address" },
        { name: "deadline", type: "uint256" },
        { name: "nonce",    type: "bytes32" },
      ],
    },
    primaryType: "CatchVoucher",
    message: { dropId, catcher, deadline, nonce },
  });
  return { signature, nonce, deadline: Number(deadline), dropId: dropId.toString() };
}
```

### New file: `src/lib/blink-rewards-math.ts`

Computes how much $BLINK a player should get for catching a creature.

```ts
import { getBlinkHoldings } from "@/lib/wallet-nfts";

const BASE_REWARD_BY_RARITY = {
  common: 10n,
  uncommon: 50n,
  rare: 250n,
  legendary: 1500n,
  mythic: 10000n,
};

// All multipliers are basis-point integer math to keep things deterministic.
const ONE_BLINK = 10n ** 18n; // 1e18

export interface CatchContext {
  rarity: keyof typeof BASE_REWARD_BY_RARITY;
  wallet: `0x${string}`;
  catchesToday: number;
  streakDays: number;
  isFirstCatchOfDay: boolean;
  utcHour: number; // 0-23
}

export const DAILY_CATCH_CAP = 50;

export async function computeReward(ctx: CatchContext): Promise<bigint> {
  if (ctx.catchesToday >= DAILY_CATCH_CAP) return 0n;

  const baseUnits = BASE_REWARD_BY_RARITY[ctx.rarity];
  if (!baseUnits) return 0n;

  // Multipliers as integer BP (1.0 = 10_000)
  let multBP = 10_000n;

  // NFT multipliers
  const holdings = await getBlinkHoldings(ctx.wallet).catch(() => ({ genesis: [], mythic: [] }));
  if (holdings.mythic && holdings.mythic.length > 0) {
    multBP = multBP * 5n; // Mythic 5x stacks first (richest tier)
  } else if (holdings.genesis && holdings.genesis.length > 0) {
    multBP = multBP * 2n;
  }

  // Daily streak: +10% per day max +100%
  const streakBoostBP = BigInt(Math.min(ctx.streakDays * 1000, 10_000));
  multBP = (multBP * (10_000n + streakBoostBP)) / 10_000n;

  // First catch of day: 2x
  if (ctx.isFirstCatchOfDay) multBP = multBP * 2n;

  // Witching hour: 3-4am UTC = 3x
  if (ctx.utcHour === 3) multBP = multBP * 3n;

  // Cap at 50x total to prevent silly stacking
  if (multBP > 500_000n) multBP = 500_000n;

  const finalReward = (baseUnits * ONE_BLINK * multBP) / 10_000n;
  return finalReward;
}
```

### New API route: `src/app/api/rewards/voucher/route.ts`

Server-side, requires SIWE session. Validates the catch (rarity, daily cap, streak), computes reward, signs voucher.

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSiweSession } from "@/lib/siwe-session";
import { signRewardVoucher } from "@/lib/blink-signer";
import { computeReward, DAILY_CATCH_CAP } from "@/lib/blink-rewards-math";
import { parseUnits, keccak256, toBytes } from "viem";

export async function POST(req: NextRequest) {
  const session = await getSiweSession();
  if (!session?.address) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { rarity, catchId, spawnId } = body;
  if (!rarity || !catchId) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  // TODO: pull catchesToday + streakDays from Supabase (or compute from `catches` table)
  // For phase 5 launch, hardcode safe defaults — wire to DB in a follow-up.
  const catchesToday = 0;
  const streakDays = 0;
  const isFirstCatchOfDay = true;
  const utcHour = new Date().getUTCHours();

  if (catchesToday >= DAILY_CATCH_CAP) {
    return NextResponse.json({ error: "daily cap reached" }, { status: 429 });
  }

  const amount = await computeReward({
    rarity, wallet: session.address as `0x${string}`,
    catchesToday, streakDays, isFirstCatchOfDay, utcHour,
  });
  if (amount === 0n) return NextResponse.json({ error: "no reward" }, { status: 400 });

  const ref = keccak256(toBytes(`catch:${catchId}`));
  const voucher = await signRewardVoucher(session.address as `0x${string}`, amount, ref);

  return NextResponse.json({
    rewardsContract: process.env.NEXT_PUBLIC_BLINK_REWARDS_CONTRACT,
    player: session.address,
    ...voucher,
  });
}
```

### New API route: `src/app/api/drops/voucher/route.ts`

Server-side, requires SIWE session + GPS proof. Validates user is at the drop location, signs catch voucher.

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSiweSession } from "@/lib/siwe-session";
import { signCatchVoucher } from "@/lib/blink-signer";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const DROPS_ABI = [{
  name: "getDrop", type: "function", stateMutability: "view",
  inputs: [{ type: "uint256" }],
  outputs: [{ type: "tuple", components: [
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
  ]}],
}];

const CATCH_RADIUS_M = 50;

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p = Math.PI / 180;
  const a = 0.5 - Math.cos((lat2 - lat1) * p) / 2
    + Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lon2 - lon1) * p)) / 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function POST(req: NextRequest) {
  const session = await getSiweSession();
  if (!session?.address) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { dropId, userLat, userLng } = await req.json();
  if (dropId == null || userLat == null || userLng == null) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // Fetch drop from contract
  const client = createPublicClient({ chain: mainnet, transport: http() });
  const drop: any = await client.readContract({
    address: process.env.NEXT_PUBLIC_BLINK_DROPS_CONTRACT as `0x${string}`,
    abi: DROPS_ABI as any,
    functionName: "getDrop",
    args: [BigInt(dropId)],
  });

  if (drop.status !== 0) return NextResponse.json({ error: "drop inactive" }, { status: 400 });
  if (Number(drop.expiresAt) < Math.floor(Date.now()/1000)) {
    return NextResponse.json({ error: "drop expired" }, { status: 400 });
  }

  const dropLat = Number(drop.lat) / 1_000_000;
  const dropLng = Number(drop.lng) / 1_000_000;
  const dist = haversine(userLat, userLng, dropLat, dropLng);
  if (dist > CATCH_RADIUS_M) {
    return NextResponse.json({ error: `too far (${Math.round(dist)}m)`, distance: dist }, { status: 400 });
  }

  const voucher = await signCatchVoucher(BigInt(dropId), session.address as `0x${string}`);
  return NextResponse.json({
    dropsContract: process.env.NEXT_PUBLIC_BLINK_DROPS_CONTRACT,
    catcher: session.address,
    catchPrice: drop.catchPriceEth.toString(),
    ...voucher,
  });
}
```

### New API route: `src/app/api/drops/list/route.ts`

Public, returns active drops in a geo radius. Used by the map.

```ts
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

// Same ABI as voucher route — refactor to a shared file.
const DROPS_ABI = [
  { name: "totalDrops", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "getDrop", type: "function", stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "tuple", components: [
      { name: "kind", type: "uint8" }, { name: "status", type: "uint8" },
      { name: "dropper", type: "address" }, { name: "asset", type: "address" },
      { name: "amount", type: "uint256" }, { name: "tokenId", type: "uint256" },
      { name: "lat", type: "int64" }, { name: "lng", type: "int64" },
      { name: "expiresAt", type: "uint64" }, { name: "catchPriceEth", type: "uint128" },
      { name: "metadata", type: "bytes32" },
    ]}]},
];

let cache: { ts: number; data: any[] } | null = null;
const TTL = 30_000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const radius = parseInt(searchParams.get("radius") || "5000");
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }

  // Refresh cache if stale
  if (!cache || Date.now() - cache.ts > TTL) {
    const client = createPublicClient({ chain: mainnet, transport: http() });
    const total = await client.readContract({
      address: process.env.NEXT_PUBLIC_BLINK_DROPS_CONTRACT as `0x${string}`,
      abi: DROPS_ABI as any, functionName: "totalDrops",
    });
    const drops: any[] = [];
    for (let i = 0n; i < (total as bigint); i++) {
      const d = await client.readContract({
        address: process.env.NEXT_PUBLIC_BLINK_DROPS_CONTRACT as `0x${string}`,
        abi: DROPS_ABI as any, functionName: "getDrop", args: [i],
      });
      if ((d as any).status === 0 && Number((d as any).expiresAt) > Math.floor(Date.now()/1000)) {
        drops.push({ id: Number(i), ...(d as any),
          lat: Number((d as any).lat) / 1_000_000, lng: Number((d as any).lng) / 1_000_000 });
      }
    }
    cache = { ts: Date.now(), data: drops };
  }

  // Filter by radius
  function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3, p = Math.PI / 180;
    const a = 0.5 - Math.cos((lat2-lat1)*p)/2 + Math.cos(lat1*p)*Math.cos(lat2*p)*(1-Math.cos((lon2-lon1)*p))/2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  const nearby = cache.data.filter(d => haversine(lat, lng, d.lat, d.lng) < radius);
  return NextResponse.json({ drops: nearby });
}
```

---

## Part B — Frontend "Catch Reward" flow

When a player catches a BLINK (in the existing `/map` catch flow):

1. POST to `/api/rewards/voucher` with `{rarity, catchId}`
2. Show modal: "You caught a Rare BLINK! +500 BLINK ready to claim"
3. Button: "Claim 500 BLINK" → wagmi `writeContract` to BlinkRewards `claim(amount, nonce, deadline, ref, signature)`
4. On confirmation, show success animation, update YourBestiary

Build a small client-side helper:

### New file: `src/lib/blink-claim.ts`

```ts
import { writeContract } from "@wagmi/core";
import { wagmiConfig } from "./wagmi-config";

const REWARDS_ABI = [{
  name: "claim", type: "function", stateMutability: "nonpayable",
  inputs: [
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "bytes32" },
    { name: "deadline", type: "uint256" },
    { name: "ref", type: "bytes32" },
    { name: "signature", type: "bytes" },
  ],
  outputs: [],
}];

export async function claimReward(voucher: {
  amount: string; nonce: `0x${string}`; deadline: number; ref: `0x${string}`; signature: `0x${string}`;
}) {
  return writeContract(wagmiConfig, {
    address: process.env.NEXT_PUBLIC_BLINK_REWARDS_CONTRACT as `0x${string}`,
    abi: REWARDS_ABI as any,
    functionName: "claim",
    args: [
      BigInt(voucher.amount),
      voucher.nonce,
      BigInt(voucher.deadline),
      voucher.ref,
      voucher.signature,
    ],
  });
}
```

### Wire to the existing catch UI in `src/components/CrackExperience.tsx` (or wherever catches happen)

After a successful catch, request voucher → show claim button. Use `sounds.play("catchCommon"|"catchRare"|"catchMythic")` for tier feedback.

---

## Part C — Drop UI on website

A new `/drop` page where users create drops on the map.

### `src/app/drop/page.tsx`

- Map view with pin-drop on click
- Form: kind (ETH/ERC20/NFT), amount/token+amount/nft+tokenId, TTL, optional catchPrice
- Read-only fee preview ("5% / 0.05 ETH treasury fee")
- Approve flow for ERC20/NFT (wagmi `useWriteContract`)
- Confirm + drop tx
- Toast + redirect to /map

This is a Phase 5b deliverable — for the core launch, **the priority is Part A + B (claim reward flow)**. Drop UI can ship in a follow-up.

---

## Done means

1. `src/lib/blink-signer.ts` + `src/lib/blink-rewards-math.ts` exist and are server-only
2. `/api/rewards/voucher`, `/api/drops/voucher`, `/api/drops/list` all return correct shapes
3. `claimReward()` helper available client-side
4. Map catch flow ends with claim modal that successfully claims $BLINK on-chain
5. `npm run build` passes
6. Commit each piece separately
7. Write `BLINK_PHASE5_CHANGELOG.md`

## DO NOT

- Wire to actual Supabase `catches` table this phase — use safe hardcoded defaults (catchesToday=0, streakDays=0, etc). Real DB-driven state is Phase 5b.
- Touch the deployed contracts.
- Generate audio. Use existing sound system.
- Hardcode signer private key in any committed file. ALWAYS read from `process.env.BLINK_SIGNER_PRIVATE_KEY`.
- Skip the SIWE session check on either API route. UNAUTHENTICATED REQUESTS MUST BE REJECTED.

## Constraints (same as prior phases)

- Inline styles, BLINK palette, no Tailwind regressions
- No cyan/purple/emojis in UI
- Mobile breakpoints 480 / 768 / 1024
