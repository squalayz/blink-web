"use client";

import { useState, useEffect } from "react";

type Chain = "solana" | "ethereum" | "bitcoin";

interface WalletCardProps {
  chain: Chain;
  address: string;
  isPreferred?: boolean;
  onAddFunds?: () => void;
}

const CHAIN_CONFIG: Record<
  Chain,
  { name: string; symbol: string; currency: string; color: string; gradient: string }
> = {
  solana: {
    name: "Solana",
    symbol: "\u25CE",
    currency: "SOL",
    color: "#9945FF",
    gradient: "linear-gradient(135deg, #1a0533, #2d1060)",
  },
  ethereum: {
    name: "Ethereum",
    symbol: "\u2B21",
    currency: "ETH",
    color: "#627EEA",
    gradient: "linear-gradient(135deg, #0a1628, #1a2d5a)",
  },
  bitcoin: {
    name: "Bitcoin",
    symbol: "\u20BF",
    currency: "BTC",
    color: "#F7931A",
    gradient: "linear-gradient(135deg, #1a0d00, #3d1f00)",
  },
};

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function WalletCard({
  chain,
  address,
  isPreferred = false,
  onAddFunds,
}: WalletCardProps) {
  const config = CHAIN_CONFIG[chain];
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceUsd, setBalanceUsd] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingBalance(true);
    fetch(`/api/wallet/balance?address=${encodeURIComponent(address)}&chain=${chain}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.balance !== undefined) {
          setBalance(data.balance);
          setBalanceUsd(data.balanceUsd);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingBalance(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address, chain]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      style={{
        background: config.gradient,
        borderRadius: 16,
        border: `1px solid ${config.color}33`,
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Preferred badge */}
      {isPreferred && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: `${config.color}33`,
            color: config.color,
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: 12,
            letterSpacing: "0.03em",
          }}
        >
          Preferred
        </div>
      )}

      {/* Chain header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 28, color: config.color, lineHeight: 1 }}>
          {config.symbol}
        </span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#F9FAFB" }}>
            {config.name}
          </div>
          <div style={{ fontSize: 12, color: "#9CA3AF" }}>{config.currency}</div>
        </div>
      </div>

      {/* Balance */}
      <div style={{ marginBottom: 16 }}>
        {loadingBalance ? (
          <div style={{ color: "#9CA3AF", fontSize: 14 }}>Loading balance...</div>
        ) : (
          <>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#F9FAFB", letterSpacing: "-0.02em" }}>
              {balance !== null ? `${balance.toFixed(balance < 1 ? 6 : 4)} ${config.currency}` : "--"}
            </div>
            {balanceUsd !== null && (
              <div style={{ fontSize: 14, color: "#9CA3AF", marginTop: 2 }}>
                ${balanceUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </div>
            )}
          </>
        )}
      </div>

      {/* Address */}
      <button
        onClick={handleCopy}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8,
          padding: "6px 12px",
          color: "#9CA3AF",
          fontSize: 13,
          fontFamily: "monospace",
          cursor: "pointer",
          marginBottom: 16,
          transition: "background 0.2s",
        }}
      >
        {copied ? "Copied!" : truncateAddress(address)}
        {!copied && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        {onAddFunds && (
          <button
            onClick={onAddFunds}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 10,
              border: "none",
              background: config.color,
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Add Funds
          </button>
        )}
        <button
          style={{
            flex: 1,
            padding: "10px 0",
            borderRadius: 10,
            border: `1px solid ${config.color}44`,
            background: "transparent",
            color: "#9CA3AF",
            fontSize: 14,
            fontWeight: 600,
            cursor: "not-allowed",
            opacity: 0.6,
            fontFamily: "inherit",
          }}
          disabled
        >
          Send (soon)
        </button>
      </div>
    </div>
  );
}
