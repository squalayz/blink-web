// ══════════════════════════════════════════════════════════════
// BLINK — CoinGecko CLI Wrapper with REST API Fallback
// Shells out to coingecko CLI binary if available, otherwise
// falls back to CoinGecko REST API (api.coingecko.com/api/v3)
// ══════════════════════════════════════════════════════════════

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// ── Interfaces ───────────────────────────────────────────────

export interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  priceChange7d: number;
  priceChange1h: number;
}

export interface TrendingCoin {
  id: string;
  symbol: string;
  name: string;
  rank: number;
  price: number;
  priceChange24h: number;
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface CategoryCoin {
  id: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
}

// ── Cache ────────────────────────────────────────────────────

const CACHE_TTL = 300_000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, ts: Date.now() });
}

// ── CLI Detection ────────────────────────────────────────────

const CLI_PATHS = ["/opt/homebrew/bin/coingecko", "/usr/local/bin/coingecko", "coingecko"];

let _cliBinary: string | null | undefined; // undefined = not checked yet

async function findCliBinary(): Promise<string | null> {
  if (_cliBinary !== undefined) return _cliBinary;
  for (const bin of CLI_PATHS) {
    try {
      await execFileAsync(bin, ["--version"], { timeout: 3000 });
      _cliBinary = bin;
      return _cliBinary;
    } catch {
      // not found at this path
    }
  }
  _cliBinary = null;
  return null;
}

async function execCli(args: string[]): Promise<string | null> {
  const bin = await findCliBinary();
  if (!bin) return null;
  try {
    const { stdout } = await execFileAsync(bin, args, { timeout: 15000 });
    return stdout;
  } catch {
    return null;
  }
}

// ── REST API helpers ─────────────────────────────────────────

const CG_BASE = "https://api.coingecko.com/api/v3";

async function cgFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${CG_BASE}${path}`, {
    signal: AbortSignal.timeout(10000),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`CoinGecko API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ── Exported Functions ───────────────────────────────────────

export async function getCoinPrice(coinId: string, currency = "usd"): Promise<number> {
  const cacheKey = `price:${coinId}:${currency}`;
  const cached = getCached<number>(cacheKey);
  if (cached !== null) return cached;

  // Try CLI
  const cliOut = await execCli(["price", coinId, "--vs", currency, "--json"]);
  if (cliOut) {
    try {
      const parsed = JSON.parse(cliOut);
      const price = parsed?.[coinId]?.[currency] ?? parsed?.price ?? 0;
      if (typeof price === "number" && price > 0) {
        setCache(cacheKey, price);
        return price;
      }
    } catch { /* fall through */ }
  }

  // REST fallback
  const data = await cgFetch<Record<string, Record<string, number>>>(
    `/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=${currency}`
  );
  const price = data?.[coinId]?.[currency] ?? 0;
  setCache(cacheKey, price);
  return price;
}

export async function getCoinMarketData(coinId: string): Promise<CoinMarketData> {
  const cacheKey = `market:${coinId}`;
  const cached = getCached<CoinMarketData>(cacheKey);
  if (cached) return cached;

  // Try CLI
  const cliOut = await execCli(["coin", coinId, "--json"]);
  if (cliOut) {
    try {
      const parsed = JSON.parse(cliOut);
      const result: CoinMarketData = {
        id: parsed.id ?? coinId,
        symbol: parsed.symbol ?? "",
        name: parsed.name ?? "",
        price: parsed.market_data?.current_price?.usd ?? parsed.price ?? 0,
        marketCap: parsed.market_data?.market_cap?.usd ?? parsed.market_cap ?? 0,
        volume24h: parsed.market_data?.total_volume?.usd ?? parsed.volume_24h ?? 0,
        priceChange24h: parsed.market_data?.price_change_percentage_24h ?? 0,
        priceChange7d: parsed.market_data?.price_change_percentage_7d ?? 0,
        priceChange1h: parsed.market_data?.price_change_percentage_1h_in_currency?.usd ?? 0,
      };
      setCache(cacheKey, result);
      return result;
    } catch { /* fall through */ }
  }

  // REST fallback
  const data = await cgFetch<any>(
    `/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&community_data=false&developer_data=false`
  );
  const md = data.market_data || {};
  const result: CoinMarketData = {
    id: data.id,
    symbol: data.symbol,
    name: data.name,
    price: md.current_price?.usd ?? 0,
    marketCap: md.market_cap?.usd ?? 0,
    volume24h: md.total_volume?.usd ?? 0,
    priceChange24h: md.price_change_percentage_24h ?? 0,
    priceChange7d: md.price_change_percentage_7d ?? 0,
    priceChange1h: md.price_change_percentage_1h_in_currency?.usd ?? 0,
  };
  setCache(cacheKey, result);
  return result;
}

export async function getTrendingCoins(): Promise<TrendingCoin[]> {
  const cacheKey = "trending";
  const cached = getCached<TrendingCoin[]>(cacheKey);
  if (cached) return cached;

  // Try CLI
  const cliOut = await execCli(["trending", "--json"]);
  if (cliOut) {
    try {
      const parsed = JSON.parse(cliOut);
      const coins = Array.isArray(parsed) ? parsed : parsed?.coins ?? [];
      const result: TrendingCoin[] = coins.map((c: any, i: number) => {
        const item = c.item ?? c;
        return {
          id: item.id ?? "",
          symbol: item.symbol ?? "",
          name: item.name ?? "",
          rank: item.score ?? i + 1,
          price: item.data?.price ?? item.price ?? 0,
          priceChange24h: item.data?.price_change_percentage_24h?.usd ?? item.price_change_24h ?? 0,
        };
      });
      setCache(cacheKey, result);
      return result;
    } catch { /* fall through */ }
  }

  // REST fallback
  const data = await cgFetch<any>("/search/trending");
  const coins = data?.coins ?? [];
  const result: TrendingCoin[] = coins.map((c: any, i: number) => {
    const item = c.item ?? c;
    return {
      id: item.id ?? "",
      symbol: item.symbol ?? "",
      name: item.name ?? "",
      rank: item.score ?? i + 1,
      price: item.data?.price ?? 0,
      priceChange24h: item.data?.price_change_percentage_24h?.usd ?? 0,
    };
  });
  setCache(cacheKey, result);
  return result;
}

export async function getTopCoins(limit = 20): Promise<CoinMarketData[]> {
  const cacheKey = `top:${limit}`;
  const cached = getCached<CoinMarketData[]>(cacheKey);
  if (cached) return cached;

  // Try CLI
  const cliOut = await execCli(["markets", "--per-page", String(limit), "--json"]);
  if (cliOut) {
    try {
      const parsed = JSON.parse(cliOut);
      const list = Array.isArray(parsed) ? parsed : [];
      if (list.length > 0) {
        const result: CoinMarketData[] = list.map((c: any) => ({
          id: c.id ?? "",
          symbol: c.symbol ?? "",
          name: c.name ?? "",
          price: c.current_price ?? 0,
          marketCap: c.market_cap ?? 0,
          volume24h: c.total_volume ?? 0,
          priceChange24h: c.price_change_percentage_24h ?? 0,
          priceChange7d: c.price_change_percentage_7d ?? 0,
          priceChange1h: c.price_change_percentage_1h_in_currency ?? 0,
        }));
        setCache(cacheKey, result);
        return result;
      }
    } catch { /* fall through */ }
  }

  // REST fallback
  const data = await cgFetch<any[]>(
    `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=1h,24h,7d`
  );
  const result: CoinMarketData[] = (data ?? []).map((c: any) => ({
    id: c.id ?? "",
    symbol: c.symbol ?? "",
    name: c.name ?? "",
    price: c.current_price ?? 0,
    marketCap: c.market_cap ?? 0,
    volume24h: c.total_volume ?? 0,
    priceChange24h: c.price_change_percentage_24h ?? 0,
    priceChange7d: c.price_change_percentage_7d_in_currency ?? 0,
    priceChange1h: c.price_change_percentage_1h_in_currency ?? 0,
  }));
  setCache(cacheKey, result);
  return result;
}

export async function getHistoricalData(coinId: string, days: number): Promise<PricePoint[]> {
  const cacheKey = `history:${coinId}:${days}`;
  const cached = getCached<PricePoint[]>(cacheKey);
  if (cached) return cached;

  // Try CLI
  const cliOut = await execCli(["history", coinId, "--days", String(days), "--json"]);
  if (cliOut) {
    try {
      const parsed = JSON.parse(cliOut);
      const prices = parsed?.prices ?? parsed;
      if (Array.isArray(prices) && prices.length > 0) {
        const result: PricePoint[] = prices.map((p: any) => ({
          timestamp: Array.isArray(p) ? p[0] : p.timestamp,
          price: Array.isArray(p) ? p[1] : p.price,
        }));
        setCache(cacheKey, result);
        return result;
      }
    } catch { /* fall through */ }
  }

  // REST fallback
  const data = await cgFetch<any>(
    `/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=${days}`
  );
  const result: PricePoint[] = (data?.prices ?? []).map((p: [number, number]) => ({
    timestamp: p[0],
    price: p[1],
  }));
  setCache(cacheKey, result);
  return result;
}

export async function getCoinsByCategory(category: string): Promise<CategoryCoin[]> {
  const cacheKey = `category:${category}`;
  const cached = getCached<CategoryCoin[]>(cacheKey);
  if (cached) return cached;

  // Try CLI
  const cliOut = await execCli(["category", category, "--json"]);
  if (cliOut) {
    try {
      const parsed = JSON.parse(cliOut);
      const list = Array.isArray(parsed) ? parsed : [];
      if (list.length > 0) {
        const result: CategoryCoin[] = list.map((c: any) => ({
          id: c.id ?? "",
          symbol: c.symbol ?? "",
          name: c.name ?? "",
          price: c.current_price ?? 0,
          priceChange24h: c.price_change_percentage_24h ?? 0,
          volume24h: c.total_volume ?? 0,
          marketCap: c.market_cap ?? 0,
        }));
        setCache(cacheKey, result);
        return result;
      }
    } catch { /* fall through */ }
  }

  // REST fallback
  const data = await cgFetch<any[]>(
    `/coins/markets?vs_currency=usd&category=${encodeURIComponent(category)}&order=market_cap_desc&per_page=100&page=1`
  );
  const result: CategoryCoin[] = (data ?? []).map((c: any) => ({
    id: c.id ?? "",
    symbol: c.symbol ?? "",
    name: c.name ?? "",
    price: c.current_price ?? 0,
    priceChange24h: c.price_change_percentage_24h ?? 0,
    volume24h: c.total_volume ?? 0,
    marketCap: c.market_cap ?? 0,
  }));
  setCache(cacheKey, result);
  return result;
}
