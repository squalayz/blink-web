"use client";

import { useState } from "react";

type Chain = "solana" | "ethereum" | "bitcoin";

interface ChainSelectorProps {
  selectedChain: Chain;
  onChange: (chain: Chain) => void;
  showLabels?: boolean;
}

// BLINK: ETH-only — Solana/Bitcoin pills hidden from UI. Underlying chain types preserved for future L2 work.
const CHAINS: { id: Chain; label: string; short: string; color: string }[] = [
  // { id: "solana", label: "Solana", short: "SOL", color: "#00FF88" }, // BLINK: ETH-only — disabled
  { id: "ethereum", label: "Ethereum", short: "ETH", color: "#00FF88" },
  // { id: "bitcoin", label: "Bitcoin", short: "BTC", color: "#88FF00" }, // BLINK: ETH-only — disabled
];

export default function ChainSelector({
  selectedChain,
  onChange,
  showLabels = false,
}: ChainSelectorProps) {
  const [hovered, setHovered] = useState<Chain | null>(null);

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        justifyContent: "center",
      }}
    >
      {CHAINS.map((c) => {
        const active = selectedChain === c.id;
        const isHovered = hovered === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            onMouseEnter={() => setHovered(c.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              padding: showLabels ? "8px 20px" : "8px 16px",
              borderRadius: 20,
              border: active ? `2px solid ${c.color}` : "2px solid #1a1a24",
              background: active ? `${c.color}20` : isHovered ? "rgba(255,255,255,0.03)" : "transparent",
              color: active ? c.color : "#8a8a99",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 6,
              outline: "none",
              fontFamily: "inherit",
            }}
          >
            {showLabels ? c.label : c.short}
          </button>
        );
      })}
    </div>
  );
}
