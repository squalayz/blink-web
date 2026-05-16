// ETH-only balance lookup.
// Accepts ?address=0x... or legacy ?eth_address=0x... query params.
// Returns native ETH balance as a number.

import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { isValidAddress } from "@/lib/production";

const RPC_URL = (process.env.ETH_RPC_URL || "https://ethereum-rpc.publicnode.com").trim();

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
    const wei = await provider.getBalance(address);
    const eth = Number(ethers.formatEther(wei));

    return NextResponse.json(
      { address, eth, balance: eth },
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
