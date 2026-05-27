// ETH + BLINK balance lookup.
// Accepts ?address=0x... or legacy ?eth_address=0x... query params.
// Returns native ETH balance plus BLINK ERC-20 balance.

import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { isValidAddress } from "@/lib/production";
import { getCoinPrice } from "@/lib/coingecko-cli";

const RPC_URL = (process.env.ETH_RPC_URL || "https://ethereum-rpc.publicnode.com").trim();
const BLINK_TOKEN_CONTRACT = (
  process.env.NEXT_PUBLIC_BLINK_TOKEN_CONTRACT ||
  "0xe7BF94959b0bfa8CB9e61149de5BFb387B40761B"
).trim();
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address") || searchParams.get("eth_address");

  if (!address) {
    return NextResponse.json({ error: "address query param required" }, { status: 400 });
  }
  if (!isValidAddress(address)) {
    return NextResponse.json({ error: "Invalid ETH address" }, { status: 400 });
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const erc20 = new ethers.Contract(BLINK_TOKEN_CONTRACT, ERC20_ABI, provider);

    // Fetch ETH + BLINK + USD price in parallel. Treat individual failures as soft.
    const [wei, blinkRaw, ethUsdPrice] = await Promise.all([
      provider.getBalance(address),
      erc20.balanceOf(address).catch(() => 0n) as Promise<bigint>,
      getCoinPrice("ethereum").catch(() => 0),
    ]);

    const eth = Number(ethers.formatEther(wei));
    const blink = Number(ethers.formatUnits(blinkRaw, 18));
    const balanceUsd = ethUsdPrice > 0 ? eth * ethUsdPrice : null;

    return NextResponse.json(
      { address, eth, blink, balance: eth, balanceUsd, ethUsdPrice: ethUsdPrice || null },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Balance fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
