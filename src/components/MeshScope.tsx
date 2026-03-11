"use client";

import { useState, useEffect, useRef } from "react";
import { ChainBadge, TokenLogo } from "@/components/hunt-token-card";

const C = {
  bg: "#0a0a0f", surface: "#0d0d14", s2: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", match: "#30d158",
  hot: "#ff2d55", gold: "#ffd700", text: "#e8e8f0", muted: "#6b6b80",
  dim: "#2a2a3a", border: "rgba(255,255,255,0.07)",
};

const CHAINS = [
  { id: "all", label: "All" },
  { id: "base", label: "Base" },
  { id: "solana", label: "SOL" },
  { id: "ethereum", label: "ETH" },
  { id: "bsc", label: "BSC" },
  { id: "arbitrum", label: "ARB" },
];

interface Token {
  address: string;
  symbol: string;
  name: string;
  chainId: string;
  price: number;
  priceChange1h: number;
  priceChange24h: number;
  volume1h: number;
  volume24h: number;
  liquidity: number;
  fdv: number;
  marketCap: number;
  txns1h: { buys: number; sells: number };
  pairCreatedAt: number;
  imageUrl: string | null;
  url: string;
  score: number;
  tags: string[];
  pricePoints: number[];
}

interface MeshScopeProps {
  tokens: Token[];
  loading: boolean;
  walletEth: number;
  walletAddress: string | null;
  onTokenSelect: (token: Token) => void;
  quickAmount: number;
  chain: string;
  onChainChange: (chain: string) => void;
  query: string;
  onSearch: (q: string) => void;
}

// ── Helpers ──

function fmtPrice(p: number): string {
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(8)}`;
}

function formatBig(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function formatAge(ts: number): string {
  if (!ts) return "";
  const hrs = (Date.now() - ts) / (1000 * 60 * 60);
  if (hrs < 1) return `${Math.floor(hrs * 60)}m`;
  if (hrs < 24) return `${Math.floor(hrs)}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function getAIBrief(token: Token): string {
  const vol = token.volume24h || 0;
  const liq = token.liquidity || 0;
  const pc = token.priceChange1h || 0;
  const s = token.score || 0;
  if (s >= 90) return "Exceptional signals across all metrics.";
  if (pc > 50) return `Up ${pc.toFixed(0)}% -- accelerating fast.`;
  if (vol > 1000000) return `Over $${(vol / 1e6).toFixed(1)}M volume -- serious flow.`;
  if (liq > 500000) return `Deep liquidity ($${(liq / 1e3).toFixed(0)}K) -- safer entry.`;
  if (pc > 20 && vol > 100000) return "Volume + price combo -- early breakout.";
  if (s >= 75) return "Strong fundamentals. All signals up.";
  if (pc < -20) return "Sharp pullback -- watch volume.";
  return "Moderate signals. Monitor for confirmation.";
}

// ── Sparkline SVG ──
function Sparkline({ points, width = 280, height = 60, color = C.match }: { points: number[]; width?: number; height?: number; color?: string }) {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const pathD = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / range) * (height - 4) - 2;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", width: "100%", height }}>
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${pathD} L${width},${height} L0,${height} Z`} fill="url(#spark-grad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ── Compact Row ──
function HuntCompactRow({
  token, quickAmount, onSelect, isSelected, isNew, onQuickBuy, buyingAddr, buySuccess,
}: {
  token: Token;
  quickAmount: number;
  onSelect: () => void;
  isSelected: boolean;
  isNew: boolean;
  onQuickBuy: (token: Token) => void;
  buyingAddr: string | null;
  buySuccess: Record<string, boolean>;
}) {
  const score = token.score || 0;
  const pc = token.priceChange1h || 0;
  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 10px",
        background: isNew ? "rgba(48,209,88,0.08)" : isSelected ? "rgba(99,102,241,0.08)" : "transparent",
        borderLeft: isSelected ? "2px solid #6366f1" : "2px solid transparent",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        cursor: "pointer",
        transition: "all 0.15s",
        position: "relative",
        animation: isNew ? "hunt-new-flash 0.5s ease" : "none",
      }}
      onMouseEnter={e => { if (!isSelected && !isNew) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={e => { if (!isSelected && !isNew) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      {/* Logo */}
      <TokenLogo imageUrl={token.imageUrl} symbol={token.symbol} address={token.address} chainId={token.chainId} size={28} />

      {/* Symbol + name + chain */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: "-0.01em" }}>
            ${token.symbol}
          </span>
          <ChainBadge chainId={token.chainId} />
        </div>
        <div style={{ fontSize: 10, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 90 }}>
          {token.name}
        </div>
      </div>

      {/* Price + change */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 700,
          fontFamily: "'JetBrains Mono',monospace",
          color: C.text,
        }}>
          {fmtPrice(token.price)}
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: pc >= 0 ? C.match : C.hot,
        }}>
          {pc >= 0 ? "+" : ""}{pc.toFixed(1)}%
        </div>
      </div>

      {/* Score pill */}
      <div style={{
        fontSize: 9, fontWeight: 800,
        padding: "2px 5px", borderRadius: 4,
        background: score >= 80 ? "rgba(48,209,88,0.15)" : score >= 60 ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)",
        color: score >= 80 ? C.match : score >= 60 ? "#f59e0b" : C.muted,
        flexShrink: 0,
      }}>
        {score}
      </div>

      {/* AI signal dot */}
      <div style={{
        width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
        background: score >= 80 ? C.match : score >= 60 ? "#f59e0b" : C.muted,
        boxShadow: score >= 80 ? "0 0 6px #30d158" : "none",
        animation: score >= 80 ? "hunt-live-dot 2s infinite" : "none",
      }} title={getAIBrief(token)} />

      {/* Quick buy */}
      <button
        onClick={e => { e.stopPropagation(); onQuickBuy(token); }}
        disabled={!!buyingAddr}
        style={{
          padding: "4px 8px", borderRadius: 6, border: "none",
          background: buySuccess[token.address] ? "rgba(48,209,88,0.25)" : "rgba(48,209,88,0.15)",
          color: C.match,
          fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
          flexShrink: 0, whiteSpace: "nowrap",
          opacity: buyingAddr && buyingAddr !== token.address ? 0.4 : 1,
        }}
      >
        {buyingAddr === token.address ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "hunt-spin 0.8s linear infinite" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : buySuccess[token.address] ? "OK" : `$${quickAmount}`}
      </button>
    </div>
  );
}

// ── Detail Panel ──
function DetailPanel({
  token, onClose, quickAmount, walletEth, walletAddress, onQuickBuy, buyingAddr,
}: {
  token: Token;
  onClose: () => void;
  quickAmount: number;
  walletEth: number;
  walletAddress: string | null;
  onQuickBuy: (token: Token, amount?: number, slip?: number) => void;
  buyingAddr: string | null;
}) {
  const [tradeTab, setTradeTab] = useState<"buy" | "sell">("buy");
  const [tradeAmount, setTradeAmount] = useState(quickAmount);
  const [tradeSlippage, setTradeSlippage] = useState(1);
  const [strategy, setStrategy] = useState<"sniper" | "momentum" | "safe">("sniper");

  const score = token.score || 0;
  const pc1h = token.priceChange1h || 0;
  const pc24h = token.priceChange24h || 0;
  const buys = token.txns1h?.buys || 0;
  const sells = token.txns1h?.sells || 0;
  const total = buys + sells || 1;
  const buyPct = Math.round((buys / total) * 100);

  const ethPrice = 2000;
  const estTokens = tradeAmount / (token.price || 0.00001);

  return (
    <>
      {/* Backdrop on mobile */}
      <div className="mm-detail-backdrop" onClick={onClose} style={{
        display: "none", position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.5)", zIndex: 199,
      }} />

      <div className="mm-detail-panel" style={{
        position: "fixed", right: 0, top: 64, bottom: 0, width: 340, zIndex: 200,
        background: "rgba(10,10,15,0.98)", borderLeft: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(20px)", overflowY: "auto",
        transform: "translateX(0)", transition: "transform 0.25s ease",
        scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent",
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 12, zIndex: 2,
          background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8,
          width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Token header */}
        <div style={{ padding: "20px 16px 12px", display: "flex", alignItems: "center", gap: 12 }}>
          <TokenLogo imageUrl={token.imageUrl} symbol={token.symbol} address={token.address} chainId={token.chainId} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>${token.symbol}</span>
              <ChainBadge chainId={token.chainId} />
            </div>
            <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {token.name}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: C.text }}>
              {fmtPrice(token.price)}
            </div>
          </div>
        </div>

        {/* Change badges */}
        <div style={{ padding: "0 16px 12px", display: "flex", gap: 6 }}>
          {[
            { label: "1h", val: pc1h },
            { label: "24h", val: pc24h },
          ].map(b => (
            <span key={b.label} style={{
              padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
              background: b.val >= 0 ? "rgba(48,209,88,0.12)" : "rgba(255,45,85,0.12)",
              color: b.val >= 0 ? C.match : C.hot,
            }}>
              {b.label}: {b.val >= 0 ? "+" : ""}{b.val.toFixed(1)}%
            </span>
          ))}
          {token.pairCreatedAt > 0 && (
            <span style={{
              padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: "rgba(255,255,255,0.05)", color: C.muted,
            }}>
              Age: {formatAge(token.pairCreatedAt)}
            </span>
          )}
        </div>

        {/* Sparkline */}
        <div style={{ padding: "0 16px 12px" }}>
          <Sparkline
            points={token.pricePoints}
            height={80}
            color={pc1h >= 0 ? C.match : C.hot}
          />
        </div>

        {/* Stats grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1,
          margin: "0 16px 12px", borderRadius: 8, overflow: "hidden",
          background: "rgba(255,255,255,0.04)",
        }}>
          {[
            { label: "MCap", val: formatBig(token.marketCap) },
            { label: "FDV", val: formatBig(token.fdv) },
            { label: "Liquidity", val: formatBig(token.liquidity) },
            { label: "Vol 1h", val: formatBig(token.volume1h) },
            { label: "Vol 24h", val: formatBig(token.volume24h) },
            { label: "Score", val: String(score) },
          ].map(s => (
            <div key={s.label} style={{ padding: "8px 10px", background: "rgba(13,13,20,0.8)" }}>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: "'JetBrains Mono',monospace" }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Buy/Sell pressure bar */}
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginBottom: 4 }}>
            <span>Buys {buys}</span>
            <span>Sells {sells}</span>
          </div>
          <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", background: "rgba(255,255,255,0.06)" }}>
            <div style={{ width: `${buyPct}%`, background: C.match, borderRadius: "2px 0 0 2px" }} />
            <div style={{ flex: 1, background: C.hot, borderRadius: "0 2px 2px 0" }} />
          </div>
        </div>

        {/* AI Whisper */}
        <div style={{
          margin: "0 16px 12px", padding: "8px 12px", borderRadius: 8,
          background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)",
          display: "flex", alignItems: "flex-start", gap: 8,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.indigo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z" />
            <line x1="9" y1="21" x2="15" y2="21" />
          </svg>
          <span style={{ fontSize: 11, color: C.indigo, lineHeight: 1.4 }}>
            {getAIBrief(token)}
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 16px 12px" }} />

        {/* TRADE SECTION */}
        <div style={{ padding: "0 16px 16px" }}>
          {/* Buy/Sell tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            {(["buy", "sell"] as const).map(tab => (
              <button key={tab} onClick={() => setTradeTab(tab)} style={{
                flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                background: tradeTab === tab
                  ? tab === "buy" ? "rgba(48,209,88,0.15)" : "rgba(255,45,85,0.15)"
                  : "rgba(255,255,255,0.04)",
                color: tradeTab === tab
                  ? tab === "buy" ? C.match : C.hot
                  : C.muted,
              }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Amount pills */}
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>Amount (USD)</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {[25, 50, 100].map(amt => (
              <button key={amt} onClick={() => setTradeAmount(amt)} style={{
                flex: 1, padding: "7px 0", borderRadius: 6, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                background: tradeAmount === amt ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                color: tradeAmount === amt ? C.indigo : C.muted,
              }}>
                ${amt}
              </button>
            ))}
            <input
              type="number"
              placeholder="Custom"
              value={tradeAmount !== 25 && tradeAmount !== 50 && tradeAmount !== 100 ? tradeAmount : ""}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (v > 0) setTradeAmount(v);
              }}
              style={{
                flex: 1, padding: "7px 8px", borderRadius: 6, border: `1px solid ${C.border}`,
                background: "rgba(255,255,255,0.03)", color: C.text,
                fontSize: 11, fontFamily: "inherit", outline: "none", minWidth: 0,
              }}
            />
          </div>

          {/* Slippage */}
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>Slippage</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            {[0.5, 1, 3].map(s => (
              <button key={s} onClick={() => setTradeSlippage(s)} style={{
                flex: 1, padding: "6px 0", borderRadius: 6, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 10, fontWeight: 700,
                background: tradeSlippage === s ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.04)",
                color: tradeSlippage === s ? C.cyan : C.muted,
              }}>
                {s}%
              </button>
            ))}
          </div>

          {/* Quote */}
          <div style={{
            padding: "8px 10px", borderRadius: 6, marginBottom: 12,
            background: "rgba(255,255,255,0.03)", fontSize: 11, color: C.muted,
          }}>
            ~{estTokens > 1e6 ? `${(estTokens / 1e6).toFixed(1)}M` : estTokens > 1e3 ? `${(estTokens / 1e3).toFixed(0)}K` : estTokens.toFixed(0)} ${token.symbol}
            <span style={{ float: "right", fontSize: 10 }}>{(tradeAmount / ethPrice).toFixed(4)} ETH</span>
          </div>

          {/* Execute button */}
          <button
            onClick={() => onQuickBuy(token, tradeAmount, tradeSlippage)}
            disabled={!!buyingAddr}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 10, border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: 14, fontWeight: 800,
              background: tradeTab === "buy"
                ? "linear-gradient(135deg, #30d158, #06b6d4)"
                : "linear-gradient(135deg, #ff2d55, #f59e0b)",
              color: "white",
              opacity: buyingAddr ? 0.6 : 1,
            }}
          >
            {buyingAddr === token.address ? "Processing..." : `${tradeTab === "buy" ? "BUY" : "SELL"} $${token.symbol}`}
          </button>
          <div style={{ fontSize: 9, color: C.muted, textAlign: "center", marginTop: 4 }}>
            Fee: 3% included
          </div>
        </div>

        {/* Divider + Agent section */}
        <div style={{ padding: "0 16px", marginBottom: 4 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
          }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.06em" }}>OR LET AGENT HANDLE IT</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {([
              { id: "sniper" as const, label: "Sniper", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={strategy === "sniper" ? C.hot : C.muted} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/></svg>, color: C.hot },
              { id: "momentum" as const, label: "Momentum", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={strategy === "momentum" ? C.gold : C.muted} strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, color: C.gold },
              { id: "safe" as const, label: "Safe", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={strategy === "safe" ? C.match : C.muted} strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, color: C.match },
            ]).map(s => (
              <button key={s.id} onClick={() => setStrategy(s.id)} style={{
                flex: 1, padding: "7px 0", borderRadius: 8, cursor: "pointer",
                fontFamily: "inherit", fontSize: 10, fontWeight: 700,
                border: strategy === s.id ? `1px solid ${s.color}60` : `1px solid ${C.border}`,
                background: strategy === s.id ? `${s.color}15` : "transparent",
                color: strategy === s.id ? s.color : C.muted,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          <button style={{
            width: "100%", padding: "10px 0", borderRadius: 10,
            border: `1px solid ${C.indigo}40`, cursor: "pointer",
            fontFamily: "inherit", fontSize: 12, fontWeight: 700,
            background: "rgba(99,102,241,0.08)", color: C.indigo,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            Hunt This Token
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div style={{ height: 32 }} />
      </div>

      {/* Detail panel responsive CSS */}
      <style>{`
        .mm-detail-backdrop{display:none}
        .mm-detail-panel{right:0;top:64px;bottom:0;width:340px}
        @media(max-width:640px){
          .mm-detail-backdrop{display:block!important}
          .mm-detail-panel{
            top:auto!important;bottom:0!important;left:0!important;right:0!important;
            width:100%!important;max-height:85vh;
            border-left:none!important;border-top:1px solid rgba(255,255,255,0.07)!important;
            border-radius:16px 16px 0 0!important;
          }
        }
      `}</style>
    </>
  );
}

// ── Quick Buy Confirm Modal ──
function ConfirmBuyModal({
  token, amount, onConfirm, onCancel,
}: {
  token: Token;
  amount: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ethPrice = 2000;
  const amountEth = amount / ethPrice;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: 20,
    }} onClick={onCancel}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
        padding: "24px 20px", maxWidth: 320, width: "100%", textAlign: "center",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
          <TokenLogo imageUrl={token.imageUrl} symbol={token.symbol} address={token.address} chainId={token.chainId} size={32} />
          <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Buy ${token.symbol} with ~${amount}?</span>
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, fontFamily: "'JetBrains Mono',monospace" }}>
          ETH: {amountEth.toFixed(4)} -- Slippage: 1.5%
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onConfirm} style={{
            flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #30d158, #06b6d4)",
            color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            Confirm Buy
          </button>
          <button onClick={onCancel} style={{
            flex: 1, padding: "10px 0", borderRadius: 10,
            border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.04)",
            color: C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ══════════════════════════════════════════════════════════

export default function MeshScope({
  tokens, loading, walletEth, walletAddress, onTokenSelect, quickAmount,
  chain, onChainChange, query, onSearch,
}: MeshScopeProps) {
  const [mobileCol, setMobileCol] = useState<"emerging" | "heating" | "pumping">("pumping");
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [buyingAddr, setBuyingAddr] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState<Record<string, boolean>>({});
  const [confirmToken, setConfirmToken] = useState<Token | null>(null);
  const [confirmAmount, setConfirmAmount] = useState(0);

  // Track new tokens for flash animation
  const seenAddrs = useRef(new Set<string>());
  const [newAddrs, setNewAddrs] = useState(new Set<string>());

  useEffect(() => {
    const fresh = new Set<string>();
    tokens.forEach(t => {
      if (!seenAddrs.current.has(t.address)) {
        fresh.add(t.address);
        seenAddrs.current.add(t.address);
      }
    });
    if (fresh.size > 0) {
      setNewAddrs(fresh);
      const timer = setTimeout(() => setNewAddrs(new Set()), 3000);
      return () => clearTimeout(timer);
    }
  }, [tokens]);

  // ── Classify tokens into 3 columns ──
  // Sort all tokens by score descending
  const sorted = [...tokens].sort((a, b) => b.score - a.score);
  const total = sorted.length;

  // PUMPING = top third by score (highest momentum)
  const pumpingTokens = total > 0
    ? sorted.slice(0, Math.max(1, Math.ceil(total / 3)))
    : [];

  // EMERGING = newest tokens (by pairCreatedAt) OR bottom third if no age data
  const withAge = tokens.filter(t => t.pairCreatedAt > 0)
    .sort((a, b) => b.pairCreatedAt - a.pairCreatedAt); // newest first
  const emergingTokens = withAge.length > 0
    ? withAge.slice(0, Math.max(3, Math.ceil(total / 3)))
    : sorted.slice(Math.ceil(total * 2 / 3)); // fallback: bottom third

  // HEATING = middle third (everything not in pumping or emerging)
  const pumpingAddrs = new Set(pumpingTokens.map(t => t.address));
  const emergingAddrs = new Set(emergingTokens.map(t => t.address));
  const heatingTokens = sorted.filter(t =>
    !pumpingAddrs.has(t.address) && !emergingAddrs.has(t.address)
  );

  // ── Quick buy handler ──
  const handleQuickBuy = async (token: Token, amount?: number, slip?: number) => {
    if (!walletAddress) {
      window.location.href = "/dashboard?tab=brew";
      return;
    }
    if (walletEth < 0.001) {
      window.location.href = "/dashboard?tab=brew";
      return;
    }
    const usdAmt = amount || quickAmount;
    const ethAmount = usdAmt / 2000;
    const slippage = slip || 1.5;

    setBuyingAddr(token.address);
    try {
      const res = await fetch("/api/trading/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "buy",
          tokenAddress: token.address,
          tokenSymbol: token.symbol,
          amountEth: ethAmount,
          slippagePct: slippage,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setBuySuccess(prev => ({ ...prev, [token.address]: true }));
        setTimeout(() => setBuySuccess(prev => ({ ...prev, [token.address]: false })), 4000);
      }
    } catch { /* non-blocking */ }
    setBuyingAddr(null);
  };

  const handleQuickBuyFromRow = (token: Token) => {
    setConfirmToken(token);
    setConfirmAmount(quickAmount);
  };

  const confirmQuickBuy = () => {
    if (confirmToken) {
      handleQuickBuy(confirmToken, confirmAmount);
      setConfirmToken(null);
    }
  };

  // ── Column config ──
  const columns = [
    { id: "emerging" as const, label: "EMERGING", count: emergingTokens.length, tokens: emergingTokens, color: "#06b6d4", desc: "New pairs < 2h" },
    { id: "heating" as const, label: "HEATING", count: heatingTokens.length, tokens: heatingTokens, color: "#f59e0b", desc: "Score 60-79" },
    { id: "pumping" as const, label: "PUMPING", count: pumpingTokens.length, tokens: pumpingTokens, color: "#30d158", desc: "Score 80+" },
  ];

  return (
    <div style={{ background: C.bg }}>
      {/* ── Top Control Bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 14px", gap: 10,
        background: "rgba(10,10,15,0.95)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "sticky", top: 0, zIndex: 100,
        overflowX: "auto", flexWrap: "wrap",
      }}>
        {/* LEFT: Chain filter pills + search */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 auto", minWidth: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, flex: "0 1 180px",
            background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "5px 8px", minWidth: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text" placeholder="Search..."
              value={query} onChange={e => onSearch(e.target.value)}
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: C.text, fontSize: 11, fontFamily: "inherit", minWidth: 0,
              }}
            />
          </div>
          {/* Base-only badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
            padding: "4px 10px", borderRadius: 14,
            background: "rgba(0,82,255,0.15)", border: "1px solid rgba(0,82,255,0.3)",
          }}>
            <svg width="10" height="10" viewBox="0 0 111 111" fill="#0052FF"><path d="M54.921 110.034C85.359 110.034 110.034 85.359 110.034 54.921C110.034 24.484 85.359 -0.191 54.921 -0.191C26.066 -0.191 2.258 22.515 0 51.169H72.943V58.674H0C2.258 87.327 26.066 110.034 54.921 110.034Z"/></svg>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#0052FF" }}>Base</span>
          </div>
        </div>

        {/* RIGHT: LIVE indicator + wallet + quick amount pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "3px 8px", borderRadius: 20,
            background: "rgba(48,209,88,0.1)", border: "1px solid rgba(48,209,88,0.2)",
          }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.match, animation: "hunt-live-dot 1.5s infinite" }} />
            <span style={{ fontSize: 9, fontWeight: 800, color: C.match }}>LIVE 5s</span>
          </div>
          {walletEth > 0 && (
            <div style={{
              padding: "3px 8px", borderRadius: 14,
              background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)",
              fontSize: 10, fontWeight: 700, color: C.cyan,
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              {walletEth.toFixed(4)} ETH
            </div>
          )}
          <div className="mm-scope-quick-pills" style={{ display: "flex", gap: 3 }}>
            {[25, 50, 100].map(amt => (
              <button key={amt} onClick={() => {/* quickAmount is controlled by parent */}} style={{
                padding: "3px 7px", borderRadius: 6, border: "none", cursor: "default",
                fontFamily: "inherit", fontSize: 9, fontWeight: 700,
                background: quickAmount === amt ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                color: quickAmount === amt ? C.indigo : C.muted,
              }}>
                ${amt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Loading skeletons ── */}
      {loading && tokens.length === 0 && (
        <div style={{ display: "flex", gap: 1, height: "calc(100vh - 200px)" }}>
          {[0, 1, 2].map(col => (
            <div key={col} style={{ flex: 1, background: "rgba(13,13,20,0.5)", padding: 8 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.05)", borderRadius: 6, height: 52,
                  margin: "4px 0", animation: "hunt-skeleton 1.5s ease infinite",
                  animationDelay: `${(col * 5 + i) * 0.1}s`,
                }} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Desktop 3-column layout ── */}
      {(!loading || tokens.length > 0) && (
        <div className="mm-hunt-cols-desktop" style={{ display: "none" }}>
          <div style={{ display: "flex", gap: 0, height: "calc(100vh - 200px)", overflow: "hidden" }}>
            {columns.map((col, i) => (
              <div key={col.id} style={{
                flex: 1, display: "flex", flexDirection: "column",
                borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
                minWidth: 0,
              }}>
                {/* Column header */}
                <div style={{
                  padding: "10px 14px 8px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(13,13,20,0.8)", flexShrink: 0,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: col.color, letterSpacing: "0.08em" }}>
                      {col.label}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: `${col.color}15`, color: col.color,
                      padding: "2px 7px", borderRadius: 10,
                    }}>
                      {col.count}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{col.desc}</div>
                </div>

                {/* Scrollable token list */}
                <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
                  {col.tokens.length === 0 && (
                    <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 11, color: C.muted }}>
                      No tokens in this range yet
                    </div>
                  )}
                  {col.tokens.map(t => (
                    <HuntCompactRow
                      key={t.address}
                      token={t}
                      quickAmount={quickAmount}
                      onSelect={() => setSelectedToken(t)}
                      isSelected={selectedToken?.address === t.address}
                      isNew={newAddrs.has(t.address)}
                      onQuickBuy={handleQuickBuyFromRow}
                      buyingAddr={buyingAddr}
                      buySuccess={buySuccess}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Mobile layout (single column with tabs) ── */}
      {(!loading || tokens.length > 0) && (
        <div className="mm-hunt-cols-mobile" style={{ display: "block" }}>
          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {(["emerging", "heating", "pumping"] as const).map(col => {
              const colConfig = columns.find(c => c.id === col)!;
              return (
                <button key={col} onClick={() => setMobileCol(col)} style={{
                  flex: 1, padding: "10px 0",
                  background: "transparent", border: "none",
                  borderBottom: mobileCol === col ? `2px solid ${colConfig.color}` : "2px solid transparent",
                  color: mobileCol === col ? C.text : C.muted,
                  fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                  {col}
                  <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.7 }}>{colConfig.count}</span>
                </button>
              );
            })}
          </div>

          {/* Token rows */}
          <div style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
            {(mobileCol === "emerging" ? emergingTokens : mobileCol === "heating" ? heatingTokens : pumpingTokens).map(t => (
              <HuntCompactRow
                key={t.address}
                token={t}
                quickAmount={quickAmount}
                onSelect={() => setSelectedToken(t)}
                isSelected={selectedToken?.address === t.address}
                isNew={newAddrs.has(t.address)}
                onQuickBuy={handleQuickBuyFromRow}
                buyingAddr={buyingAddr}
                buySuccess={buySuccess}
              />
            ))}
            {(mobileCol === "emerging" ? emergingTokens : mobileCol === "heating" ? heatingTokens : pumpingTokens).length === 0 && (
              <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 11, color: C.muted }}>
                No tokens in this range yet
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Detail Slide Panel ── */}
      {selectedToken && (
        <DetailPanel
          token={selectedToken}
          onClose={() => setSelectedToken(null)}
          quickAmount={quickAmount}
          walletEth={walletEth}
          walletAddress={walletAddress}
          onQuickBuy={handleQuickBuy}
          buyingAddr={buyingAddr}
        />
      )}

      {/* ── Confirm Quick Buy Modal ── */}
      {confirmToken && (
        <ConfirmBuyModal
          token={confirmToken}
          amount={confirmAmount}
          onConfirm={confirmQuickBuy}
          onCancel={() => setConfirmToken(null)}
        />
      )}

      {/* ── Responsive CSS ── */}
      <style>{`
        .mm-hunt-cols-desktop{display:none}
        .mm-hunt-cols-mobile{display:block}
        .mm-scope-quick-pills{display:none}
        @media(min-width:641px){
          .mm-hunt-cols-desktop{display:block!important}
          .mm-hunt-cols-mobile{display:none!important}
          .mm-scope-quick-pills{display:flex!important}
        }
        @keyframes hunt-new-flash {
          0% { background: rgba(48,209,88,0.25); }
          100% { background: rgba(48,209,88,0.08); }
        }
        @keyframes hunt-live-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes hunt-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes hunt-skeleton {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.1; }
        }
      `}</style>
    </div>
  );
}
