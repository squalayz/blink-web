// ══════════════════════════════════════════════════════════════
// MishMesh Hunt — Token Discovery API
// Fetches trending tokens per-chain from DexScreener public API
// No API key required
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

// DexScreener chain ID aliases
const CHAIN_ALIASES: Record<string, string> = {
  eth: "ethereum",
  arb: "arbitrum",
};

function normalizeChain(c: string): string {
  return CHAIN_ALIASES[c] || c;
}

// DexScreener network slug for the trending/new pools endpoint
const CHAIN_NETWORK: Record<string, string> = {
  base: "base",
  solana: "solana",
  ethereum: "ethereum",
  bsc: "bsc",
  arbitrum: "arbitrum",
};

function scoreToken(token: TokenResult, maxVol: number, maxTxns: number): number {
  const volScore = maxVol > 0 ? Math.min(token.volume1h / maxVol, 1) * 100 : 0;
  const liqCapped = Math.min(token.liquidity, 1_000_000);
  const liqScore = liqCapped > 0 ? (Math.log10(liqCapped) / 6) * 100 : 0;
  const pcScore = Math.min(Math.max(token.priceChange1h, 0) / 50, 1) * 100;
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

function mapPair(p: any): TokenResult | null {
  if (!p?.baseToken?.address || !p?.chainId) return null;
  const txns = p.txns?.h1 || { buys: 0, sells: 0 };
  const pc1h = parseFloat(p.priceChange?.h1 || "0");
  const pc6h = parseFloat(p.priceChange?.h6 || "0");
  const pc24h = parseFloat(p.priceChange?.h24 || "0");
  const curPrice = parseFloat(p.priceUsd || "0");
  return {
    address: p.baseToken.address,
    symbol: p.baseToken?.symbol || "???",
    name: p.baseToken?.name || p.baseToken?.symbol || "",
    chainId: p.chainId,
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
    pricePoints: buildPricePoints(curPrice, pc1h, pc6h, pc24h),
  };
}

// Fetch trending pairs for a specific chain using GeckoTerminal trending pools
async function fetchTrendingForChain(chain: string, perChain: number): Promise<any[]> {
  const results: any[] = [];

  try {
    // Strategy 1: DexScreener search for top volume pairs on this chain
    const searchRes = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${chain}`,
      { next: { revalidate: 30 } }
    );
    if (searchRes.ok) {
      const data = await searchRes.json();
      const pairs = (data?.pairs || [])
        .filter((p: any) => p.chainId === chain)
        .sort((a: any, b: any) => parseFloat(b.volume?.h24 || "0") - parseFloat(a.volume?.h24 || "0"))
        .slice(0, perChain);
      results.push(...pairs);
    }
  } catch { /* continue */ }

  // Strategy 2: GeckoTerminal trending pools for this chain (always returns chain-specific results)
  if (results.length < perChain) {
    try {
      const network = CHAIN_NETWORK[chain] || chain;
      const gtRes = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/${network}/trending_pools?page=1`,
        { next: { revalidate: 30 } }
      );
      if (gtRes.ok) {
        const gtData = await gtRes.json();
        const pools = gtData?.data || [];
        for (const pool of pools.slice(0, perChain)) {
          const attrs = pool.attributes || {};
          const baseToken = attrs.base_token_price_usd ? {
            address: pool.relationships?.base_token?.data?.id?.split("_")[1] || pool.id,
            symbol: attrs.name?.split(" / ")[0] || "???",
            name: attrs.name?.split(" / ")[0] || "",
          } : null;
          if (!baseToken) continue;

          results.push({
            baseToken,
            chainId: chain,
            priceUsd: attrs.base_token_price_usd,
            priceChange: {
              h1: attrs.price_change_percentage?.h1 || "0",
              h6: attrs.price_change_percentage?.h6 || "0",
              h24: attrs.price_change_percentage?.h24 || "0",
            },
            volume: {
              h1: String((attrs.volume_usd?.h24 || 0) / 24), // estimate 1h from 24h
              h24: attrs.volume_usd?.h24 || "0",
            },
            liquidity: { usd: attrs.reserve_in_usd || "0" },
            txns: {
              h1: {
                buys: Math.floor((attrs.transactions?.h1?.buys || attrs.transactions?.h24?.buys || 0)),
                sells: Math.floor((attrs.transactions?.h1?.sells || attrs.transactions?.h24?.sells || 0)),
              },
            },
            pairCreatedAt: attrs.pool_created_at ? new Date(attrs.pool_created_at).getTime() : 0,
            info: { imageUrl: null },
            url: `https://dexscreener.com/${chain}/${pool.relationships?.base_token?.data?.id?.split("_")[1] || ""}`,
          });
        }
      }
    } catch { /* continue */ }
  }

  return results;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chainsParam = searchParams.get("chains") || "base,solana,ethereum,bsc,arbitrum";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const query = searchParams.get("q") || "";
    const chains = chainsParam.split(",").map(normalizeChain).filter(c => ALLOWED_CHAINS.has(c));

    let rawPairs: any[] = [];

    if (query) {
      // ── Search mode: query across all chains ──
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
        { next: { revalidate: 15 } }
      );
      if (res.ok) {
        const data = await res.json();
        rawPairs = (data?.pairs || []).filter((p: any) => chains.includes(p.chainId));
      }
    } else {
      // ── Trending mode: fetch EACH chain independently in parallel ──
      // This guarantees Base tokens always show up when Base is selected
      const perChain = Math.ceil(limit / chains.length) + 5; // a few extra for dedup buffer

      const chainFetches = chains.map(async (chain) => {
        const pairs: any[] = [];

        // Primary: DexScreener boosted tokens filtered to this chain
        try {
          const boostRes = await fetch("https://api.dexscreener.com/token-boosts/top/v1", {
            next: { revalidate: 30 },
          });
          if (boostRes.ok) {
            const boostData = await boostRes.json();
            const boostedForChain = (Array.isArray(boostData) ? boostData : [])
              .filter((t: any) => t.chainId === chain)
              .slice(0, 15)
              .map((t: any) => t.tokenAddress);

            if (boostedForChain.length > 0) {
              const addrStr = boostedForChain.join(",");
              const pairRes = await fetch(
                `https://api.dexscreener.com/tokens/v1/${chain}/${addrStr}`,
                { next: { revalidate: 30 } }
              );
              if (pairRes.ok) {
                const pairData = await pairRes.json();
                const pairsArr = Array.isArray(pairData) ? pairData : pairData?.pairs || [];
                pairs.push(...pairsArr.filter((p: any) => p.chainId === chain));
              }
            }
          }
        } catch { /* continue to fallback */ }

        // Fallback: if we didn't get enough pairs, use GeckoTerminal trending for this chain
        if (pairs.length < 3) {
          const fallback = await fetchTrendingForChain(chain, perChain);
          pairs.push(...fallback.filter((p: any) => p.chainId === chain));
        }

        return pairs;
      });

      const allResults = await Promise.all(chainFetches);
      rawPairs = allResults.flat();
    }

    // Deduplicate by chain+address, enforce requested chains
    const seen = new Set<string>();
    const filtered = rawPairs
      .filter((p: any) => {
        if (!p?.baseToken?.address) return false;
        if (!chains.includes(p.chainId)) return false;
        const key = `${p.chainId}-${p.baseToken.address}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit);

    // Map, score, tag
    let tokens: TokenResult[] = filtered
      .map(mapPair)
      .filter((t): t is TokenResult => t !== null);

    const maxVol = Math.max(...tokens.map(t => t.volume1h), 1);
    const maxTxns = Math.max(...tokens.map(t => t.txns1h.buys + t.txns1h.sells), 1);

    tokens = tokens.map(t => {
      t.score = scoreToken(t, maxVol, maxTxns);
      t.tags = autoTag(t);
      return t;
    });

    tokens.sort((a, b) => b.score - a.score);

    return NextResponse.json({ tokens, ts: Date.now(), chains });
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
