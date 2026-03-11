import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chain = searchParams.get("chain") || "base";
  const address = searchParams.get("address");

  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  try {
    const res = await fetch(
      `https://api.dexscreener.com/tokens/v1/${chain}/${address}`,
      { cache: "no-store" }
    );
    if (!res.ok) return NextResponse.json({ error: "not found" }, { status: 404 });

    const pairs = await res.json();
    const pairsArr = Array.isArray(pairs) ? pairs : pairs?.pairs || [];
    if (!pairsArr.length) return NextResponse.json({ error: "no pairs" }, { status: 404 });

    const best = pairsArr.sort((a: any, b: any) =>
      parseFloat(b.liquidity?.usd || "0") - parseFloat(a.liquidity?.usd || "0")
    )[0];

    const txns = best.txns?.h1 || { buys: 0, sells: 0 };
    const pc1h = parseFloat(best.priceChange?.h1 || "0");
    const pc24h = parseFloat(best.priceChange?.h24 || "0");
    const curPrice = parseFloat(best.priceUsd || "0");

    const token = {
      address: best.baseToken.address,
      symbol: best.baseToken?.symbol || "???",
      name: best.baseToken?.name || best.baseToken?.symbol || "",
      chainId: best.chainId,
      price: curPrice,
      priceChange1h: pc1h,
      priceChange24h: pc24h,
      volume1h: parseFloat(best.volume?.h1 || "0"),
      volume24h: parseFloat(best.volume?.h24 || "0"),
      liquidity: parseFloat(best.liquidity?.usd || "0"),
      fdv: parseFloat(best.fdv || "0"),
      marketCap: parseFloat(best.marketCap || "0"),
      txns1h: { buys: txns.buys || 0, sells: txns.sells || 0 },
      pairCreatedAt: best.pairCreatedAt || 0,
      imageUrl: best.info?.imageUrl || null,
      url: best.url || `https://dexscreener.com/${best.chainId}/${best.pairAddress}`,
      score: 0,
      tags: [],
      pricePoints: [curPrice, curPrice],
    };

    return NextResponse.json({ token });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
