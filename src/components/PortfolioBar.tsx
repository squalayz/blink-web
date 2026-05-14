"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";
import { C, type OrbCurrency } from "@/lib/theme";
import { useBalances } from "@/hooks/useBalances";
import { usePrices } from "@/hooks/usePrices";
import WalletModal from "@/components/WalletModal";

/* ------------------------------------------------------------------ */
/*  Chain dot definitions                                              */
/* ------------------------------------------------------------------ */
// BLINK: ETH-only — Solana/Bitcoin dots hidden. Underlying balance fetching still runs.
const CHAIN_DOTS: Array<{ chain: OrbCurrency; color: string }> = [
  // { chain: "SOL", color: C.primary },     // BLINK: ETH-only — disabled
  { chain: "ETH", color: C.primary },
  // { chain: "BTC", color: C.btcOrange },   // BLINK: ETH-only — disabled
];

/* ------------------------------------------------------------------ */
/*  Portfolio bar                                                      */
/* ------------------------------------------------------------------ */
export default function PortfolioBar() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    function checkWidth() { setIsWide(window.innerWidth >= 1024); }
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);
  const [addresses, setAddresses] = useState<{
    sol_address?: string | null;
    eth_address?: string | null;
    btc_address?: string | null;
  }>({});

  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("sol_address, eth_address, btc_address")
      .eq("id", user.id)
      .single();
    if (profile) setAddresses(profile);
  }, [user]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const { sol, eth, btc, loading } = useBalances(addresses);
  const prices = usePrices();

  // BLINK: ETH-only — only ETH chain counts toward visible totals.
  void sol; void btc;
  const activeChains: OrbCurrency[] = [];
  // if (addresses.sol_address) activeChains.push("SOL"); // BLINK: ETH-only — disabled
  if (addresses.eth_address) activeChains.push("ETH");
  // if (addresses.btc_address) activeChains.push("BTC"); // BLINK: ETH-only — disabled

  const totalUSD = eth * prices.eth;

  if (!user) return null;

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? "rgba(12,12,18,0.98)" : "rgba(10,10,15,0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: hovered ? `1px solid ${C.primary}20` : "1px solid rgba(255,255,255,0.06)",
          height: 48,
          cursor: "pointer",
          transition: "background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
          userSelect: "none",
          boxShadow: hovered ? `0 2px 16px ${C.primary}12` : "none",
        }}
      >
        <div style={{
          maxWidth: isWide ? 1200 : 480,
          margin: "0 auto",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
        }}>
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
