"use client";

import { useState, useEffect, useCallback } from "react";

const C = {
  bg: "#0a0a0f", surface: "#0d0d14", s2: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", match: "#30d158",
  hot: "#ff2d55", gold: "#ffd700", text: "#e8e8f0", muted: "#6b6b80",
  dim: "#2a2a3a", border: "rgba(255,255,255,0.07)",
};

const QUICK_AMOUNTS = [25, 50, 100, 200];

interface HuntWalletBarProps {
  walletEth: number;
  walletAddress: string | null;
  quickAmount: number;
  onQuickAmountChange: (amount: number) => void;
  onRefresh: () => void;
}

export default function HuntWalletBar({
  walletEth,
  walletAddress,
  quickAmount,
  onQuickAmountChange,
  onRefresh,
}: HuntWalletBarProps) {
  const [ethPrice, setEthPrice] = useState(0);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch ETH price, cache 60s
  useEffect(() => {
    let cached = 0;
    let lastFetch = 0;
    const fetchPrice = async () => {
      if (Date.now() - lastFetch < 60000 && cached > 0) return;
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
        const data = await res.json();
        if (data?.ethereum?.usd) {
          cached = data.ethereum.usd;
          lastFetch = Date.now();
          setEthPrice(data.ethereum.usd);
        }
      } catch { /* silent */ }
    };
    fetchPrice();
    const iv = setInterval(fetchPrice, 60000);
    return () => clearInterval(iv);
  }, []);

  const handleCopy = useCallback(() => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [walletAddress]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    onRefresh();
    setTimeout(() => setRefreshing(false), 1000);
  }, [onRefresh]);

  const truncAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";

  const usdValue = ethPrice > 0 ? (walletEth * ethPrice) : 0;

  // No wallet state
  if (!walletAddress) {
    return (
      <div style={{
        background: "rgba(255,45,85,0.06)",
        border: "1px solid rgba(255,45,85,0.15)",
        borderRadius: 12, padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: 12, cursor: "pointer",
      }}
        onClick={() => { window.location.href = "/dashboard?tab=wallet"; }}
      >
        {/* Warning icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.hot} strokeWidth="2" strokeLinecap="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.hot }}>
          No wallet — generate one on Wallet tab
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.hot} strokeWidth="2" strokeLinecap="round" style={{ marginLeft: "auto" }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    );
  }

  return (
    <div style={{
      background: "rgba(13,13,20,0.95)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: "8px 14px",
      display: "flex", alignItems: "center", gap: 10,
      marginBottom: 12, overflowX: "auto",
      scrollbarWidth: "none",
    }}>
      {/* ETH balance */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {/* Base chain logo */}
        <svg width="14" height="14" viewBox="0 0 111 111" fill="#0052FF" style={{ flexShrink: 0 }}>
          <path d="M54.921 110.034C85.359 110.034 110.034 85.359 110.034 54.921C110.034 24.484 85.359 -0.191 54.921 -0.191C26.066 -0.191 2.258 22.515 0 51.169H72.943V58.674H0C2.258 87.327 26.066 110.034 54.921 110.034Z" />
        </svg>
        <span style={{
          fontSize: 13, fontWeight: 800, color: C.text,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {walletEth.toFixed(4)} ETH
        </span>
        {usdValue > 0 && (
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>
            ≈${usdValue.toFixed(0)}
          </span>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />

      {/* Quick amount pills */}
      {QUICK_AMOUNTS.map(amt => {
        const selected = quickAmount === amt;
        return (
          <button key={amt} onClick={() => onQuickAmountChange(amt)} style={{
            padding: "4px 10px", borderRadius: 6, cursor: "pointer",
            fontSize: 11, fontWeight: 700, fontFamily: "inherit",
            transition: "all 0.15s", flexShrink: 0, border: "none",
            background: selected ? "rgba(48,209,88,0.15)" : "rgba(255,255,255,0.05)",
            color: selected ? "#30d158" : "#6b6b80",
            outline: selected ? "1px solid rgba(48,209,88,0.3)" : "1px solid rgba(255,255,255,0.07)",
          }}>
            ${amt}
          </button>
        );
      })}

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />

      {/* Wallet address */}
      <span
        onClick={handleCopy}
        style={{
          fontSize: 10, color: copied ? C.match : C.muted,
          fontFamily: "'JetBrains Mono', monospace",
          cursor: "pointer", flexShrink: 0, transition: "color 0.15s",
        }}
      >
        {copied ? "Copied!" : truncAddr}
      </span>

      {/* Refresh button */}
      <button onClick={handleRefresh} style={{
        width: 24, height: 24, borderRadius: "50%",
        background: "transparent", border: "1px solid rgba(255,255,255,0.07)",
        color: C.muted, cursor: "pointer", display: "flex",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
        padding: 0,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          style={{ animation: refreshing ? "hunt-spin 0.8s linear infinite" : "none" }}>
          <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      </button>
    </div>
  );
}
