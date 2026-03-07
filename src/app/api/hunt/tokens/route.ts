// ══════════════════════════════════════════════════════════════
// MishMesh Hunt — Token Discovery API
// Fetches from DexScreener public API, scores & returns tokens
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";

interface TokenResult {
  address: string;
  symbol: string;
  name: string;
  chainId: string;
  price: number;
  priceChange1h: number;
  priceChange24h: number;
  volume1h: number;
  volume24h: number;
  liquidity: number;
  txns1h: { buys: number; sells: number };
  pairCreatedAt: number;
  imageUrl: string | null;
  url: string;
  score: number;
  tags: string[];
  pricePoints: number[];
}

const ALLOWED_CHAINS = new Set(["solana", "base", "ethereum", "bsc", "arbitrum"]);

function normalizeChain(c: string): string {
  if (c === "eth") return "ethereum";
  if (c === "arb") return "arbitrum";
  return c;
}

function scoreToken(
  token: TokenResult,
  maxVol: number,
  maxTxns: number,
): number {
  // Volume 1h: 30%
  const volScore = maxVol > 0 ? Math.min(token.volume1h / maxVol, 1) * 100 : 0;

  // Liquidity: 20% (log scale, cap at $1M)
  const liqCapped = Math.min(token.liquidity, 1_000_000);
  const liqScore = liqCapped > 0 ? (Math.log10(liqCapped) / 6) * 100 : 0;

  // Price change 1h: 25% (positive momentum)
  const pcScore = Math.min(Math.max(token.priceChange1h, 0) / 50, 1) * 100;

  // Tx count 1h: 25%
  const txTotal = token.txns1h.buys + token.txns1h.sells;
  const txScore = maxTxns > 0 ? Math.min(txTotal / maxTxns, 1) * 100 : 0;

  return Math.round(volScore * 0.3 + liqScore * 0.2 + pcScore * 0.25 + txScore * 0.25);
}

function autoTag(token: TokenResult): string[] {
  const tags: string[] = [];
  const age = Date.now() - (token.pairCreatedAt || 0);
  const volLiqRatio = token.liquidity > 0 ? token.volume1h / token.liquidity : 0;

  if (token.score >= 85) tags.push("Alpha Drop");
  if (token.score >= 75 && token.priceChange1h > 10) tags.push("Breakout Ready");
  if (age < 24 * 60 * 60 * 1000 && token.pairCreatedAt > 0) tags.push("New Runner");
  if (token.score >= 70 && volLiqRatio > 2) tags.push("Whale Flow");
  if (token.score < 40) tags.push("Cooling Off");

  return tags;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chainsParam = searchParams.get("chains") || "base,solana,ethereum,bsc";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const query = searchParams.get("q") || "";
    const chains = chainsParam.split(",").map(normalizeChain).filter(c => ALLOWED_CHAINS.has(c));

    let rawPairs: any[] = [];

    if (query) {
      // Search mode
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
        { next: { revalidate: 15 } },
      );
      if (res.ok) {
        const data = await res.json();
        rawPairs = data?.pairs || [];
      }
    } else {
      // Boosted/trending mode
      const boostRes = await fetch("https://api.dexscreener.com/token-boosts/top/v1", {
        next: { revalidate: 15 },
      });

      if (boostRes.ok) {
        const boostData = await boostRes.json();
        const boosted = (Array.isArray(boostData) ? boostData : [])
          .filter((t: any) => chains.includes(t.chainId))
          .slice(0, 30);

        // Group by chain for batch lookup
        const byChain = new Map<string, string[]>();
        for (const t of boosted) {
          const arr = byChain.get(t.chainId) || [];
          arr.push(t.tokenAddress);
          byChain.set(t.chainId, arr);
        }

        // Fetch pair data per chain
        const fetches = Array.from(byChain.entries()).map(async ([chainId, addrs]) => {
          try {
            const addrStr = addrs.slice(0, 10).join(",");
            const r = await fetch(
              `https://api.dexscreener.com/tokens/v1/${chainId}/${addrStr}`,
              { next: { revalidate: 15 } },
            );
            if (r.ok) {
              const d = await r.json();
              return Array.isArray(d) ? d : d?.pairs || [];
            }
          } catch { /* skip */ }
          return [];
        });

        const results = await Promise.all(fetches);
        rawPairs = results.flat();
      }
    }

    // Filter to requested chains & deduplicate by base token address
    const seen = new Set<string>();
    const filtered = rawPairs
      .filter((p: any) => {
        if (!p?.baseToken?.address) return false;
        const cid = p.chainId;
        if (chains.length > 0 && !chains.includes(cid)) return false;
        const key = `${cid}-${p.baseToken.address}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit);

    // Map to TokenResult
    let tokens: TokenResult[] = filtered.map((p: any) => {
      const txns = p.txns?.h1 || p.txns?.h24 || { buys: 0, sells: 0 };
      // Extract mini price points from priceChange for sparkline
      const pc1h = parseFloat(p.priceChange?.h1 || "0");
      const pc6h = parseFloat(p.priceChange?.h6 || "0");
      const pc24h = parseFloat(p.priceChange?.h24 || "0");
      const curPrice = parseFloat(p.priceUsd || "0");
      // Reconstruct approximate price points
      const pricePoints = buildPricePoints(curPrice, pc1h, pc6h, pc24h);

      return {
        address: p.baseToken?.address || "",
        symbol: p.baseToken?.symbol || "???",
        name: p.baseToken?.name || p.baseToken?.symbol || "",
        chainId: p.chainId || "base",
        price: curPrice,
        priceChange1h: pc1h,
        priceChange24h: pc24h,
        volume1h: parseFloat(p.volume?.h1 || "0"),
        volume24h: parseFloat(p.volume?.h24 || "0"),
        liquidity: parseFloat(p.liquidity?.usd || "0"),
        txns1h: { buys: txns.buys || 0, sells: txns.sells || 0 },
        pairCreatedAt: p.pairCreatedAt || 0,
        imageUrl: p.info?.imageUrl || null,
        url: p.url || `https://dexscreener.com/${p.chainId}/${p.pairAddress}`,
        score: 0,
        tags: [],
        pricePoints,
      };
    });

    // Score tokens
    const maxVol = Math.max(...tokens.map(t => t.volume1h), 1);
    const maxTxns = Math.max(...tokens.map(t => t.txns1h.buys + t.txns1h.sells), 1);

    tokens = tokens.map(t => {
      t.score = scoreToken(t, maxVol, maxTxns);
      t.tags = autoTag(t);
      return t;
    });

    // Sort by score descending
    tokens.sort((a, b) => b.score - a.score);

    return NextResponse.json({ tokens, ts: Date.now() });
  } catch (err: any) {
    console.error("Hunt API error:", err);
    return NextResponse.json({ error: "Failed to fetch tokens", tokens: [] }, { status: 500 });
  }
}

function buildPricePoints(current: number, pc1h: number, pc6h: number, pc24h: number): number[] {
  if (current <= 0) return [0, 0, 0, 0, 0, 0, 0];
  const p24h = current / (1 + pc24h / 100);
  const p6h = current / (1 + pc6h / 100);
  const p1h = current / (1 + pc1h / 100);
  // Interpolate 7 points
  return [
    p24h,
    p24h + (p6h - p24h) * 0.33,
    p24h + (p6h - p24h) * 0.67,
    p6h,
    p6h + (p1h - p6h) * 0.5,
    p1h,
    current,
  ];
}
