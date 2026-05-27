import { NextRequest, NextResponse } from "next/server";
import { requireUserWithEthAddress } from "@/lib/api-auth";
import { getBlinkHoldings } from "@/lib/wallet-nfts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const queryWallet = url.searchParams.get("wallet");

  // If a wallet is explicitly requested we let it through (read-only / public
  // information). Otherwise fall back to the authenticated user's custodial
  // ETH wallet.
  let wallet = queryWallet?.toLowerCase() ?? null;
  if (!wallet) {
    const resolved = await requireUserWithEthAddress(req);
    if (resolved.error) return resolved.error;
    wallet = resolved.address;
  }

  if (!/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const holdings = await getBlinkHoldings(wallet);
  return NextResponse.json({
    wallet,
    genesis: holdings.genesis,
    mythics: holdings.mythics,
    isHolder: holdings.genesis.length > 0 || holdings.mythics.length > 0,
  });
}
