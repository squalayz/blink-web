import { NextRequest, NextResponse } from "next/server";
import { readSiweSession } from "@/lib/siwe-session";
import { getBlinkHoldings } from "@/lib/wallet-nfts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const queryWallet = url.searchParams.get("wallet");

  // If a wallet is explicitly requested we let it through (read-only / public
  // information). Otherwise fall back to the authenticated SIWE session.
  let wallet = queryWallet?.toLowerCase() ?? null;
  if (!wallet) {
    const session = await readSiweSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    wallet = session.address;
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
