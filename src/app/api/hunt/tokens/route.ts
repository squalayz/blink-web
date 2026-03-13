import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  fdv: number;
  marketCap: number;
  txns1h: { buys: number; sells: number };
  pairCreatedAt: number;
  imageUrl: string | null;
  url: string;
  score: number;
  tags: string[];
  pricePoints: number[];
  isNew: boolean;
  ageMinutes: number;
}

// Cache profile icons for a few seconds to avoid hammering the API
let profileIconCache: Record<string, string> = {};
let profileIconCacheTs = 0;

async function fetchProfileIcons(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now - profileIconCacheTs < 30000 && Object.keys(profileIconCache).length > 0) {
    return profileIconCache;
  }
  try {
    const res = await fetch("https://api.dexscreener.com/token-profiles/latest/v1", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : [];
      const map: Record<string, string> = {};
      for (const item of items) {
        if (item.tokenAddress && item.icon) {
          map[item.tokenAddress.toLowerCase()] = item.icon;
        }
      }
      profileIconCache = map;
      profileIconCacheTs = now;
      return map;
    }
  } catch { /* ignore */ }
  return profileIconCache;
}

const ALLOWED_CHAINS = new Set(["solana", "base", "ethereum", "bsc", "arbitrum"]);
const CHAIN_ALIASES: Record<string, string> = { eth: "ethereum", arb: "arbitrum" };
function normalizeChain(c: string): string { return CHAIN_ALIASES[c] || c; }

function buildPricePoints(current: number, pc1h: number, pc6h: number, pc24h: number): number[] {
  if (current <= 0) return [0,0,0,0,0,0,0];
  const p24h = current / (1 + pc24h / 100);
  const p6h = current / (1 + pc6h / 100);
  const p1h = current / (1 + pc1h / 100);
  return [p24h, p24h+(p6h-p24h)*0.33, p24h+(p6h-p24h)*0.67, p6h, p6h+(p1h-p6h)*0.5, p1h, current];
}

function scoreToken(t: TokenResult, maxVol: number, maxTxns: number): number {
  const volScore = maxVol > 0 ? Math.min(t.volume1h / maxVol, 1) * 30 : 0;
  const liqCapped = Math.min(t.liquidity, 1_000_000);
  const liqScore = liqCapped > 0 ? (Math.log10(liqCapped) / 6) * 20 : 0;
  const pcScore = Math.min(Math.max(t.priceChange1h, 0) / 50, 1) * 25;
  const txTotal = t.txns1h.buys + t.txns1h.sells;
  const txScore = maxTxns > 0 ? Math.min(txTotal / maxTxns, 1) * 25 : 0;
  return Math.round(volScore + liqScore + pcScore + txScore);
}

function autoTag(t: TokenResult): string[] {
  const tags: string[] = [];
  const volLiqRatio = t.liquidity > 0 ? t.volume1h / t.liquidity : 0;
  if (t.ageMinutes < 60) tags.push("JUST LAUNCHED");
  else if (t.ageMinutes < 360) tags.push("NEW");
  if (t.score >= 80) tags.push("HOT");
  if (t.priceChange1h > 20) tags.push("PUMPING");
  if (volLiqRatio > 3) tags.push("WHALE");
  if (t.txns1h.buys > t.txns1h.sells * 1.5) tags.push("BUYING PRESSURE");
  return tags;
}

function mapDexPair(p: any): TokenResult | null {
  if (!p?.baseToken?.address || !p?.chainId) return null;
  const txns = p.txns?.h1 || { buys: 0, sells: 0 };
  const pc1h = parseFloat(p.priceChange?.h1 || "0");
  const pc6h = parseFloat(p.priceChange?.h6 || "0");
  const pc24h = parseFloat(p.priceChange?.h24 || "0");
  const curPrice = parseFloat(p.priceUsd || "0");
  const pairCreatedAt = p.pairCreatedAt || 0;
  const ageMinutes = pairCreatedAt > 0 ? Math.floor((Date.now() - pairCreatedAt) / 60000) : 99999;
  return {
    address: p.baseToken.address,
    symbol: p.baseToken?.symbol || "???",
    name: p.baseToken?.name || p.baseToken?.symbol || "",
    chainId: p.chainId,
    price: curPrice,
    priceChange1h: pc1h,
    priceChange24h: pc24h,
    volume1h: parseFloat(p.volume?.h1 || "0") || parseFloat(p.volume?.h24 || "0") / 24,
    volume24h: parseFloat(p.volume?.h24 || "0"),
    liquidity: parseFloat(p.liquidity?.usd || "0"),
    fdv: parseFloat(p.fdv || "0"),
    marketCap: parseFloat(p.marketCap || "0"),
    txns1h: { buys: txns.buys || 0, sells: txns.sells || 0 },
    pairCreatedAt,
    imageUrl: p.info?.imageUrl || p.info?.header || p.baseToken?.logoURI || null,
    url: p.url || `https://dexscreener.com/${p.chainId}/${p.pairAddress}`,
    score: 0,
    tags: [],
    pricePoints: buildPricePoints(curPrice, pc1h, pc6h, pc24h),
    isNew: ageMinutes < 1440,
    ageMinutes,
  };
}

async function fetchNewPairs(chain: string, limit: number): Promise<any[]> {
  const results: any[] = [];

  try {
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${chain}/new_pools?page=1`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      const pools = data?.data || [];
      for (const pool of pools.slice(0, limit)) {
        const attrs = pool.attributes || {};
        const baseSymbol = attrs.name?.split(" / ")[0] || "???";
        const relId = pool.relationships?.base_token?.data?.id || "";
        const addr = relId.includes("_") ? relId.split("_").slice(1).join("_") : relId;
        if (!addr) continue;
        const createdAt = attrs.pool_created_at ? new Date(attrs.pool_created_at).getTime() : 0;
        results.push({
          baseToken: { address: addr, symbol: baseSymbol, name: attrs.name?.split(" / ")[0] || "" },
          chainId: chain,
          priceUsd: attrs.base_token_price_usd || "0",
          priceChange: {
            h1: attrs.price_change_percentage?.h1 || "0",
            h6: attrs.price_change_percentage?.h6 || "0",
            h24: attrs.price_change_percentage?.h24 || "0",
          },
          volume: {
            h1: String(Number(attrs.volume_usd?.h1 || 0)),
            h24: attrs.volume_usd?.h24 || "0",
          },
          liquidity: { usd: attrs.reserve_in_usd || "0" },
          txns: {
            h1: {
              buys: Number(attrs.transactions?.h1?.buys || attrs.transactions?.h24?.buys || 0),
              sells: Number(attrs.transactions?.h1?.sells || attrs.transactions?.h24?.sells || 0),
            },
          },
          pairCreatedAt: createdAt,
          info: { imageUrl: null },
          url: `https://dexscreener.com/${chain}/${addr}`,
        });
      }
    }
  } catch { /* continue */ }

  return results;
}

async function fetchGainers(chain: string, limit: number): Promise<any[]> {
  const results: any[] = [];

  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${chain}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      const pairs = (data?.pairs || [])
        .filter((p: any) => p.chainId === chain && parseFloat(p.liquidity?.usd || "0") > 5000)
        .sort((a: any, b: any) => parseFloat(b.priceChange?.h1 || "0") - parseFloat(a.priceChange?.h1 || "0"))
        .slice(0, limit);
      results.push(...pairs);
    }
  } catch { /* continue */ }

  try {
    const res = await fetch("https://api.dexscreener.com/token-boosts/top/v1", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const boosted = (Array.isArray(data) ? data : [])
        .filter((t: any) => t.chainId === chain)
        .slice(0, 10)
        .map((t: any) => t.tokenAddress);

      if (boosted.length > 0) {
        const pairRes = await fetch(
          `https://api.dexscreener.com/tokens/v1/${chain}/${boosted.join(",")}`,
          { cache: "no-store" }
        );
        if (pairRes.ok) {
          const pairData = await pairRes.json();
          const pairs = Array.isArray(pairData) ? pairData : (pairData?.pairs || []);
          results.push(...pairs.filter((p: any) => p.chainId === chain));
        }
      }
    }
  } catch { /* continue */ }

  try {
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${chain}/trending_pools?page=1`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      for (const pool of (data?.data || []).slice(0, 15)) {
        const attrs = pool.attributes || {};
        const relId = pool.relationships?.base_token?.data?.id || "";
        const addr = relId.includes("_") ? relId.split("_").slice(1).join("_") : relId;
        if (!addr) continue;
        results.push({
          baseToken: { address: addr, symbol: attrs.name?.split(" / ")[0] || "???", name: attrs.name?.split(" / ")[0] || "" },
          chainId: chain,
          priceUsd: attrs.base_token_price_usd || "0",
          priceChange: { h1: attrs.price_change_percentage?.h1 || "0", h6: attrs.price_change_percentage?.h6 || "0", h24: attrs.price_change_percentage?.h24 || "0" },
          volume: { h1: String(Number(attrs.volume_usd?.h1 || 0)), h24: attrs.volume_usd?.h24 || "0" },
          liquidity: { usd: attrs.reserve_in_usd || "0" },
          txns: { h1: { buys: Number(attrs.transactions?.h1?.buys || 0), sells: Number(attrs.transactions?.h1?.sells || 0) } },
          pairCreatedAt: attrs.pool_created_at ? new Date(attrs.pool_created_at).getTime() : 0,
          info: { imageUrl: null },
          url: `https://dexscreener.com/${chain}/${addr}`,
        });
      }
    }
  } catch { /* continue */ }

  return results;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chainsParam = searchParams.get("chains") || "base,solana,ethereum,bsc,arbitrum";
    const limit = Math.min(parseInt(searchParams.get("limit") || "60"), 120);
    const query = searchParams.get("q") || "";
    const chains = chainsParam.split(",").map(normalizeChain).filter(c => ALLOWED_CHAINS.has(c));

    let rawPairs: any[] = [];

    if (query) {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        rawPairs = (data?.pairs || []).filter((p: any) => chains.includes(p.chainId));
      }
    } else {
      const perChain = Math.ceil(limit / chains.length) + 10;

      const fetches = chains.map(async (chain) => {
        const [newPairs, gainers] = await Promise.all([
          fetchNewPairs(chain, perChain),
          fetchGainers(chain, perChain),
        ]);
        return [...newPairs, ...gainers];
      });

      const all = await Promise.all(fetches);
      rawPairs = all.flat();
    }

    const seen = new Set<string>();
    const filtered = rawPairs.filter((p: any) => {
      if (!p?.baseToken?.address) return false;
      if (!chains.includes(p.chainId)) return false;
      const liq = parseFloat(p.liquidity?.usd || p.reserve_in_usd || "0");
      const price = parseFloat(p.priceUsd || "0");
      if (liq < 500 && price <= 0) return false;
      const key = `${p.chainId}-${p.baseToken.address}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    let tokens: TokenResult[] = filtered
      .map(mapDexPair)
      .filter((t): t is TokenResult => t !== null)
      .filter(t => t.price > 0 || t.liquidity > 0);

    const maxVol = Math.max(...tokens.map(t => t.volume1h), 1);
    const maxTxns = Math.max(...tokens.map(t => t.txns1h.buys + t.txns1h.sells), 1);
    tokens = tokens.map(t => { t.score = scoreToken(t, maxVol, maxTxns); t.tags = autoTag(t); return t; });

    tokens.sort((a, b) => {
      const aBonus = a.ageMinutes < 360 ? 20 : 0;
      const bBonus = b.ageMinutes < 360 ? 20 : 0;
      return (b.score + bBonus) - (a.score + aBonus);
    });

    tokens = tokens.slice(0, limit);

    // Enrich with DexScreener profile icons where imageUrl is missing
    try {
      const iconMap = await fetchProfileIcons();
      tokens = tokens.map(t => {
        if (!t.imageUrl) {
          const icon = iconMap[t.address.toLowerCase()];
          if (icon) t.imageUrl = icon;
        }
        return t;
      });
    } catch { /* icons are non-critical */ }

    return NextResponse.json({ tokens, ts: Date.now(), chains });
  } catch (err: any) {
    console.error("Hunt API error:", err);
    return NextResponse.json({ error: "Failed to fetch tokens", tokens: [] }, { status: 500 });
  }
}
