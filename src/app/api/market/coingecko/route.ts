import { NextResponse } from "next/server";
import { getTrendingCoins, getTopCoins } from "@/lib/coingecko-cli";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [trending, top20] = await Promise.all([
      getTrendingCoins(),
      getTopCoins(20),
    ]);

    return NextResponse.json(
      { trending, top20, ts: Date.now() },
      {
        headers: {
          "Cache-Control": "public, max-age=300",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("CoinGecko API error:", message);
    return NextResponse.json(
      { error: "Failed to fetch CoinGecko data", trending: [], top20: [] },
      { status: 500 }
    );
  }
}
