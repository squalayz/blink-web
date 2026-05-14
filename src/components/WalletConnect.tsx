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
        <span style={{ fontSize: 16 }}>{chain === "sol" ? "◎" : "₿"}</span>
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
          <span style={{ fontSize: 14 }}>⬡</span>
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
          padding: "10px 20px",
          borderRadius: 10,
          background: connecting ? `${C.primary}80` : C.primary,
          border: "none",
          color: C.text,
          fontSize: 14,
          fontWeight: 600,
          cursor: connecting ? "wait" : "pointer",
          transition: "opacity 0.15s",
        }}
      >
        <span style={{ fontSize: 16 }}>⬡</span>
        {connecting ? "Connecting..." : "Connect ETH Wallet"}
      </button>
      {error && (
        <p style={{ color: "#F87171", fontSize: 12, marginTop: 6 }}>{error}</p>
      )}
    </div>
  );
}
