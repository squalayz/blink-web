"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";
import { C, FALLBACK_RATES, type OrbCurrency } from "@/lib/theme";
import WalletModal from "@/components/WalletModal";

/* ------------------------------------------------------------------ */
/*  Chain dot definitions                                              */
/* ------------------------------------------------------------------ */
const CHAIN_DOTS: Array<{ chain: OrbCurrency; color: string }> = [
  { chain: "SOL", color: C.primary },
  { chain: "ETH", color: C.ethBlue },
  { chain: "BTC", color: C.btcOrange },
];

/* ------------------------------------------------------------------ */
/*  Portfolio bar                                                      */
/* ------------------------------------------------------------------ */
export default function PortfolioBar() {
  const { user } = useAuth();
  const [totalUSD, setTotalUSD] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeChains, setActiveChains] = useState<OrbCurrency[]>([]);
  const [hovered, setHovered] = useState(false);

  const fetchTotal = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("sol_address, eth_address, btc_address")
        .eq("id", user.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      const chains: Array<{ chain: OrbCurrency; address: string }> = (
        [
          { chain: "SOL" as OrbCurrency, address: profile.sol_address ?? "" },
          { chain: "ETH" as OrbCurrency, address: profile.eth_address ?? "" },
          { chain: "BTC" as OrbCurrency, address: profile.btc_address ?? "" },
        ] as Array<{ chain: OrbCurrency; address: string }>
      ).filter((c) => Boolean(c.address));

      setActiveChains(chains.map((c) => c.chain));

      // Fetch balances in parallel with a short timeout
      const results = await Promise.allSettled(
        chains.map(async ({ chain, address }) => {
          try {
            let native = 0;
            if (chain === "SOL") {
              const res = await fetch("https://api.mainnet-beta.solana.com", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  jsonrpc: "2.0",
                  id: 1,
                  method: "getBalance",
                  params: [address],
                }),
                signal: AbortSignal.timeout(4000),
              });
              const d = await res.json();
              native = (d.result?.value ?? 0) / 1e9;
            } else if (chain === "ETH") {
              const res = await fetch("https://mainnet.base.org", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  jsonrpc: "2.0",
                  id: 1,
                  method: "eth_getBalance",
                  params: [address, "latest"],
                }),
                signal: AbortSignal.timeout(4000),
              });
              const d = await res.json();
              native = parseInt(d.result ?? "0x0", 16) / 1e18;
            } else {
              const res = await fetch(`https://mempool.space/api/address/${address}`, {
                signal: AbortSignal.timeout(4000),
              });
              const d = await res.json();
              const sats =
                (d.chain_stats?.funded_txo_sum ?? 0) -
                (d.chain_stats?.spent_txo_sum ?? 0);
              native = sats / 1e8;
            }
            return native * FALLBACK_RATES[chain];
          } catch {
            return 0;
          }
        })
      );

      const total = results.reduce(
        (sum, r) => sum + (r.status === "fulfilled" ? r.value : 0),
        0
      );
      setTotalUSD(total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTotal();
    const interval = setInterval(fetchTotal, 60_000);
    return () => clearInterval(interval);
  }, [fetchTotal]);

  if (!user) return null;

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: "rgba(10,10,15,0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          cursor: "pointer",
          transition: "background 0.2s, border-color 0.2s",
          userSelect: "none",
        }}
      >
        {/* Left: total value */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke={C.primary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          {loading ? (
            <span
              style={{
                display: "inline-block",
                width: 64,
                height: 10,
                borderRadius: 4,
                background: "#2a2a3a",
                animation: "pbPulse 1.4s ease-in-out infinite",
              }}
            />
          ) : (
            <span
              style={{
                color: C.text,
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "-0.2px",
              }}
            >
              $
              {totalUSD.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          )}
        </div>

        {/* Right: chain dots + chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {CHAIN_DOTS.map(({ chain, color }) => (
              <div
                key={chain}
                title={chain}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: activeChains.includes(chain) ? color : "#2a2a3a",
                  boxShadow: activeChains.includes(chain) ? `0 0 4px ${color}` : "none",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke={C.muted}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      <WalletModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      <style>{`
        @keyframes pbPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </>
  );
}
