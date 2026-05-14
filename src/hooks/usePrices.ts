"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface PriceResult {
  sol: number;
  eth: number;
  btc: number;
  loading: boolean;
}

const FALLBACK = { sol: 170, eth: 3500, btc: 82000 };
const CACHE_TTL = 60_000;

let globalCache: { ts: number; sol: number; eth: number; btc: number } | null = null;

export function usePrices(): PriceResult {
  const [prices, setPrices] = useState(globalCache ?? FALLBACK);
  const [loading, setLoading] = useState(!globalCache);
  const fetchedRef = useRef(false);

  const doFetch = useCallback(async () => {
    if (globalCache && Date.now() - globalCache.ts < CACHE_TTL) {
      setPrices(globalCache);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana,ethereum,bitcoin&vs_currencies=usd",
        { signal: AbortSignal.timeout(5000) },
      );
      const data = await res.json();
      const result = {
        sol: data.solana?.usd ?? FALLBACK.sol,
        eth: data.ethereum?.usd ?? FALLBACK.eth,
        btc: data.bitcoin?.usd ?? FALLBACK.btc,
      };
      globalCache = { ...result, ts: Date.now() };
      setPrices(result);
    } catch {
      setPrices(globalCache ?? FALLBACK);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      doFetch();
    }
  }, [doFetch]);

  return { ...prices, loading };
}
