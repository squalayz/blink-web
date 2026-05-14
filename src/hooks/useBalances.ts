"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface BalanceAddresses {
  sol_address?: string | null;
  eth_address?: string | null;
  btc_address?: string | null;
}

interface BalanceResult {
  sol: number;
  eth: number;
  btc: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const CACHE_TTL = 30_000;

async function fetchSolBalance(address: string): Promise<number> {
  const res = await fetch("https://api.mainnet-beta.solana.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getBalance",
      params: [address],
    }),
    signal: AbortSignal.timeout(5000),
  });
  const d = await res.json();
  return (d.result?.value ?? 0) / 1e9;
}

async function fetchEthBalance(address: string): Promise<number> {
  const res = await fetch("https://cloudflare-eth.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
    signal: AbortSignal.timeout(5000),
  });
  const d = await res.json();
  return parseInt(d.result ?? "0x0", 16) / 1e18;
}

async function fetchBtcBalance(address: string): Promise<number> {
  const res = await fetch(
    `https://mempool.space/api/address/${address}/utxo`,
    { signal: AbortSignal.timeout(5000) },
  );
  const utxos = await res.json();
  if (!Array.isArray(utxos)) return 0;
  const totalSats = utxos.reduce(
    (sum: number, u: { value: number }) => sum + (u.value ?? 0),
    0,
  );
  return totalSats / 1e8;
}

export function useBalances(addresses: BalanceAddresses): BalanceResult {
  const [sol, setSol] = useState(0);
  const [eth, setEth] = useState(0);
  const [btc, setBtc] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cacheRef = useRef<{ ts: number; sol: number; eth: number; btc: number } | null>(null);

  const doFetch = useCallback(
    async (force = false) => {
      if (
        !force &&
        cacheRef.current &&
        Date.now() - cacheRef.current.ts < CACHE_TTL
      ) {
        setSol(cacheRef.current.sol);
        setEth(cacheRef.current.eth);
        setBtc(cacheRef.current.btc);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [s, e, b] = await Promise.all([
          addresses.sol_address
            ? fetchSolBalance(addresses.sol_address).catch(() => 0)
            : Promise.resolve(0),
          addresses.eth_address
            ? fetchEthBalance(addresses.eth_address).catch(() => 0)
            : Promise.resolve(0),
          addresses.btc_address
            ? fetchBtcBalance(addresses.btc_address).catch(() => 0)
            : Promise.resolve(0),
        ]);

        setSol(s);
        setEth(e);
        setBtc(b);
        cacheRef.current = { ts: Date.now(), sol: s, eth: e, btc: b };
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to fetch balances");
      } finally {
        setLoading(false);
      }
    },
    [addresses.sol_address, addresses.eth_address, addresses.btc_address],
  );

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  const refresh = useCallback(() => doFetch(true), [doFetch]);

  return { sol, eth, btc, loading, error, refresh };
}
