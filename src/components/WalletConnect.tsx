"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface WalletConnectProps {
  userId: string;
  chain?: "eth" | "sol" | "btc";
  initialAddress?: string | null;
  onConnect?: (address: string, chain: string) => void;
  onDisconnect?: () => void;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

const C = {
  card: "#1a1a24",
  primary: "#00FF88",
  accent: "#00FF88",
  text: "#FFFFFF",
  muted: "#8a8a99",
  border: "rgba(255,255,255,0.06)",
  surface: "#0d0d14",
};

function truncate(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function EthGlyph({ size = 14, color = C.accent }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2 5 12.2l7 4.1 7-4.1L12 2z" fill={color} fillOpacity="0.9" />
      <path d="M5 13.6 12 22l7-8.4-7 4.1-7-4.1z" fill={color} fillOpacity="0.55" />
    </svg>
  );
}

function ChainGlyph({ chain, size = 15 }: { chain: "sol" | "btc"; size?: number }) {
  if (chain === "sol") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M5 7h12l2 2H7L5 7z" /><path d="M5 15h12l2 2H7l-2-2z" /><path d="M19 11H7l-2 2h12l2-2z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" /><path d="M9.5 7.5h4a2 2 0 0 1 0 4h-4zm0 4h4.5a2 2 0 0 1 0 4H9.5zM10.5 6v1.5M13 6v1.5M10.5 16.5V18M13 16.5V18" />
    </svg>
  );
}

export default function WalletConnect({
  userId,
  chain = "eth",
  initialAddress = null,
  onConnect,
  onDisconnect,
}: WalletConnectProps) {
  const [address, setAddress] = useState<string | null>(initialAddress);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAddress(initialAddress);
  }, [initialAddress]);

  const connectETH = async () => {
    setError(null);
    if (typeof window === "undefined" || !window.ethereum) {
      setError("MetaMask not found. Please install it at metamask.io");
      return;
    }
    setConnecting(true);
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const addr = accounts[0];
      setAddress(addr);
      await supabase
        .from("users")
        .update({ wallet_eth: addr, wallet_connected_at: new Date().toISOString() })
        .eq("id", userId);
      onConnect?.(addr, "eth");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setError(msg);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    setAddress(null);
    await supabase
      .from("users")
      .update({ wallet_eth: null })
      .eq("id", userId);
    onDisconnect?.();
  };

  if (chain === "sol" || chain === "btc") {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          borderRadius: 10,
          background: C.card,
          border: `1px solid ${C.border}`,
          color: C.muted,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <ChainGlyph chain={chain} />
        {chain.toUpperCase()} — Coming Soon
      </div>
    );
  }

  if (address) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 10,
            background: `${C.accent}18`,
            border: `1px solid ${C.accent}40`,
            color: C.accent,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "monospace",
          }}
        >
          <EthGlyph />
          {truncate(address)}
        </div>
        <button
          onClick={disconnect}
          style={{
            background: "transparent",
            border: `1px solid ${C.border}`,
            color: C.muted,
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={connectETH}
        disabled={connecting}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 22px",
          borderRadius: 999,
          background: connecting ? `${C.primary}80` : C.primary,
          border: "none",
          color: "#000",
          fontSize: 14,
          fontWeight: 800,
          cursor: connecting ? "wait" : "pointer",
          transition: "opacity 0.15s",
          boxShadow: "0 0 14px rgba(0,255,136,0.4)",
        }}
      >
        <EthGlyph color="#000" />
        {connecting ? "Connecting..." : "Connect ETH Wallet"}
      </button>
      {error && (
        <p style={{ color: "#F87171", fontSize: 12, marginTop: 6 }}>{error}</p>
      )}
    </div>
  );
}
