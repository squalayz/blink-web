"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const C = {
  bg: "#0a0a0f", surface: "#0d0d14", s2: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", match: "#30d158",
  hot: "#ff2d55", gold: "#ffd700", text: "#e8e8f0", muted: "#6b6b80",
  dim: "#2a2a3a", border: "rgba(255,255,255,0.07)",
};

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

// ── Chain colors & logos ──

const CHAIN_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  base:     { bg: "rgba(0,82,255,0.15)",   text: "#0052FF", label: "Base" },
  solana:   { bg: "rgba(153,69,255,0.15)", text: "#9945FF", label: "SOL" },
  ethereum: { bg: "rgba(98,126,234,0.15)", text: "#627EEA", label: "ETH" },
  bsc:      { bg: "rgba(243,186,47,0.15)", text: "#F3BA2F", label: "BSC" },
  arbitrum: { bg: "rgba(40,160,240,0.15)", text: "#28A0F0", label: "ARB" },
};

const CHAIN_LOGOS: Record<string, React.ReactNode> = {
  base: (
    <svg width="10" height="10" viewBox="0 0 111 111" fill="#0052FF">
      <path d="M54.921 110.034C85.359 110.034 110.034 85.359 110.034 54.921C110.034 24.484 85.359 -0.191 54.921 -0.191C26.066 -0.191 2.258 22.515 0 51.169H72.943V58.674H0C2.258 87.327 26.066 110.034 54.921 110.034Z"/>
    </svg>
  ),
  ethereum: (
    <svg width="10" height="10" viewBox="0 0 256 417" fill="#627EEA">
      <path d="M127.961 0L125.164 9.5V285.168L127.961 287.958L255.923 212.32L127.961 0Z" fillOpacity="0.6"/>
      <path d="M127.962 0L0 212.32L127.962 287.958V154.158V0Z"/>
      <path d="M127.961 312.187L126.386 314.107V412.301L127.961 416.996L255.991 236.5L127.961 312.187Z" fillOpacity="0.6"/>
      <path d="M127.962 416.996V312.187L0 236.5L127.962 416.996Z"/>
      <path d="M127.961 287.959L255.923 212.32L127.961 154.159V287.959Z" fillOpacity="0.2"/>
      <path d="M0 212.32L127.962 287.959V154.159L0 212.32Z" fillOpacity="0.6"/>
    </svg>
  ),
  solana: (
    <svg width="10" height="10" viewBox="0 0 397 311" fill="none">
      <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7zm0-164.8C67 70.7 70.3 69.3 73.8 69.3h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7zm330.3 82.6c-2.4-2.4-5.7-3.8-9.2-3.8H68.3c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" fill="#9945FF"/>
    </svg>
  ),
  bsc: (
    <svg width="10" height="10" viewBox="0 0 2000 2000" fill="#F3BA2F">
      <path d="M1000 0L618.7 381.3 874.9 637.5 1000 512.6l125.1 124.9 256.2-256.2L1000 0z"/>
      <path d="M380.4 619.1L0 999.5l380.4 380.4 256.2-256.2-124.2-124.2 124.2-124.2L380.4 619.1z"/>
      <path d="M1619.6 619.1l-256.2 256.2 124.2 124.2-124.2 124.2 256.2 256.2 380.4-380.4-380.4-380.4z"/>
      <path d="M874.9 1362.5L618.7 1618.7 1000 2000l381.3-381.3-256.2-256.2-125.2 0z"/>
      <path d="M743.8 999.5l-131.3 131.3 131.3 131.3 131.3-131.3-131.3-131.3zm512.4 0l-131.3 131.3 131.3 131.3 131.3-131.3-131.3-131.3zm-256.2 256.2l-131.3 131.3 131.3 131.3 131.3-131.3-131.3-131.3zm0-512.4l-131.3 131.3 131.3 131.3 131.3-131.3-131.3-131.3z"/>
    </svg>
  ),
  arbitrum: (
    <svg width="10" height="10" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#213147"/>
      <path d="M18.5 12l-3.5 6-3.5-6h-2l4.5 8 4.5-8h-2z" fill="#28A0F0"/>
      <path d="M13.5 12l3.5 6 3.5-6h2l-4.5 8-4.5-8h2z" fill="white" fillOpacity="0.6"/>
    </svg>
  ),
};

// ── Tag colors ──

const TAG_COLORS: Record<string, string> = {
  "Alpha Drop": "#ffd700",
  "Breakout Ready": "#30d158",
  "New Runner": "#06b6d4",
  "Whale Flow": "#a855f7",
  "Cooling Off": "#6b6b80",
};

// ── Formatters ──

function formatPrice(p: number): string {
  if (p === 0) return "$0.00";
  if (p >= 1000) return `$${p.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (p >= 1) return `$${p.toFixed(4)}`;
  if (p >= 0.01) return `$${p.toFixed(5)}`;
  if (p >= 0.0001) return `$${p.toFixed(6)}`;
  const str = p.toPrecision(4);
  return `$${str}`;
}

function formatBig(n: number): string {
  if (!n || n === 0) return "\u2014";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatAge(ts: number): string {
  if (!ts) return "\u2014";
  const ms = Date.now() - ts;
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

function scoreColor(score: number): string {
  if (score >= 90) return "#ffffff";
  if (score >= 75) return C.match;
  if (score >= 60) return "#f59e0b";
  return C.hot;
}

// ── AI Brief (rule engine) ──

function getAIBrief(token: Token): string {
  const score = token.score || 0;
  const pc1h = token.priceChange1h || 0;
  const pc24h = token.priceChange24h || 0;
  const liq = token.liquidity || 0;
  const vol = token.volume1h || 0;
  const total = token.txns1h.buys + token.txns1h.sells;
  const buyRatio = total > 0 ? token.txns1h.buys / total : 0.5;
  const cap = token.marketCap || 0;

  if (liq < 10000) return "Extremely thin liquidity \u2014 high slippage risk on any size.";
  if (liq < 50000 && pc1h > 30) return "Strong momentum but liquidity is thin. Small positions only.";
  if (score >= 92) return "Top-tier setup. Volume, liquidity, and momentum all firing.";
  if (buyRatio > 0.8 && vol > 100000) return `Aggressive buy pressure \u2014 ${Math.round(buyRatio * 100)}% of txns are buys. Momentum building.`;
  if (pc1h > 50) return `Explosive 1h move (+${pc1h.toFixed(0)}%). Either early or already extended \u2014 check liquidity.`;
  if (pc1h < -30) return `Down ${Math.abs(pc1h).toFixed(0)}% in 1h \u2014 potential shakeout or real distribution. Watch volume direction.`;
  if (pc24h > 100 && pc1h > 0) return `Up ${pc24h.toFixed(0)}% in 24h and still climbing. Sustained momentum.`;
  if (buyRatio < 0.35) return `Sell pressure dominates (${Math.round((1 - buyRatio) * 100)}% sells). Wait for reversal confirmation.`;
  if (cap > 0 && cap < 500000 && liq > 100000) return "Micro-cap with solid liquidity ratio. High risk, high reward profile.";
  if (score >= 75) return "Clean setup. All signals pointing in the right direction.";
  if (score >= 55) return "Moderate signals. Confirm volume trend before committing.";
  return "Low conviction setup. Wait for clearer signals.";
}

// ── Components ──

function TokenLogo({ imageUrl, symbol, address, chainId, size = 40 }: {
  imageUrl: string | null;
  symbol: string;
  address: string;
  chainId: string;
  size?: number;
}) {
  const sources: string[] = [];
  if (imageUrl) sources.push(imageUrl);
  if (chainId === "ethereum" || chainId === "base" || chainId === "bsc") {
    const chainMap: Record<string, string> = { ethereum: "ethereum", base: "base", bsc: "smartchain" };
    sources.push(`https://assets.trustwallet.com/blockchains/${chainMap[chainId]}/assets/${address}/logo.png`);
  }
  sources.push(`https://dd.dexscreener.com/ds-data/tokens/${chainId}/${address.toLowerCase()}.png`);

  const [srcIndex, setSrcIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const handleError = useCallback(() => {
    if (srcIndex + 1 < sources.length) {
      setSrcIndex(i => i + 1);
    } else {
      setFailed(true);
    }
  }, [srcIndex, sources.length]);

  const colors = [
    ["#6366f1", "#818cf8"], ["#06b6d4", "#22d3ee"], ["#a855f7", "#c084fc"],
    ["#ff2d55", "#ff6b8a"], ["#f59e0b", "#fbbf24"], ["#30d158", "#4ade80"],
  ];
  const colorIdx = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  const [g1, g2] = colors[colorIdx];
  const initials = symbol.slice(0, 2).toUpperCase();

  if (failed || sources.length === 0) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        background: `linear-gradient(135deg, ${g1}, ${g2})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 800, color: "white",
        letterSpacing: "-0.03em",
      }}>
        {initials}
      </div>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${g1}44, ${g2}22)`,
      overflow: "hidden", position: "relative",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 800, color: g1,
      }}>
        {initials}
      </div>
      <img
        key={sources[srcIndex]}
        src={sources[srcIndex]}
        alt={symbol}
        onError={handleError}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%", objectFit: "cover",
        }}
      />
    </div>
  );
}

function ChainBadge({ chainId }: { chainId: string }) {
  const chain = CHAIN_COLORS[chainId] || { bg: "rgba(255,255,255,0.05)", text: "#6b6b80", label: chainId };
  const logo = CHAIN_LOGOS[chainId];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 6px", borderRadius: 4,
      background: chain.bg, color: chain.text,
      fontSize: 9, fontWeight: 800, letterSpacing: "0.05em",
    }}>
      {logo}
      {chain.label}
    </span>
  );
}

function ScoreArc({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = scoreColor(score);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute", top: 0, left: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.dim} strokeWidth={3} />
        <motion.circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke={color} strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: Math.floor(size * 0.3), fontWeight: 800, color,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "-0.03em",
      }}>
        {score}
      </div>
    </div>
  );
}

function Sparkline({ points, color, width = "100%", height = 32 }: { points: number[]; color: string; width?: number | string; height?: number }) {
  if (!points.length || points.every(p => p === 0)) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const svgW = 200;
  const step = svgW / (points.length - 1);

  const pathD = points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / range) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  const gradId = `sg-${color.replace("#", "")}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${svgW} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${pathD} L${svgW},${height} L0,${height} Z`} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

// ── Stats grid cell ──

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "rgba(13,13,20,0.9)", padding: "8px 12px" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#6b6b80", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#e8e8f0", fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </div>
    </div>
  );
}

// ── Main Card ──

export default function HuntTokenCard({
  token,
  index,
  highlighted,
  onHighlight,
}: {
  token: Token;
  index: number;
  highlighted?: boolean;
  onHighlight?: () => void;
}) {
  const [showSheet, setShowSheet] = useState(false);
  const color = scoreColor(token.score);
  const sparkColor = token.priceChange1h >= 0 ? C.match : C.hot;
  const total = token.txns1h.buys + token.txns1h.sells;
  const buyPct = total > 0 ? token.txns1h.buys / total : 0.5;

  return (
    <>
      <motion.div
        id={`hunt-card-${token.address}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
        onClick={onHighlight}
        style={{
          background: "rgba(13,13,20,0.95)",
          border: highlighted ? `1px solid ${color}50` : "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, overflow: "hidden",
          boxShadow: highlighted ? `0 0 20px ${color}15` : "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
          cursor: "pointer",
          position: "relative",
        }}
      >
        {/* Left accent bar */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: scoreColor(token.score),
          borderRadius: "14px 0 0 14px",
        }} />

        {/* Header: Logo + Symbol + Chain + Score + Link */}
        <div style={{ padding: "14px 14px 0 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <TokenLogo imageUrl={token.imageUrl} symbol={token.symbol} address={token.address} chainId={token.chainId} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>${token.symbol}</span>
                <ChainBadge chainId={token.chainId} />
              </div>
              <div style={{
                fontSize: 11, color: C.muted, marginTop: 1,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {token.name}
              </div>
            </div>
            <ScoreArc score={token.score} size={48} />
            <a
              href={token.url} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 28, borderRadius: 6,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                color: "#6b6b80", textDecoration: "none", flexShrink: 0,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>

          {/* Price + change badges */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#e8e8f0", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.03em" }}>
              {formatPrice(token.price)}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: token.priceChange1h >= 0 ? "#30d158" : "#ff2d55",
                background: token.priceChange1h >= 0 ? "rgba(48,209,88,0.1)" : "rgba(255,45,85,0.1)",
                padding: "2px 8px", borderRadius: 4,
              }}>
                {token.priceChange1h >= 0 ? "+" : ""}{token.priceChange1h.toFixed(2)}% 1h
              </span>
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: token.priceChange24h >= 0 ? "#30d158" : "#ff2d55",
                background: token.priceChange24h >= 0 ? "rgba(48,209,88,0.08)" : "rgba(255,45,85,0.08)",
                padding: "2px 8px", borderRadius: 4,
              }}>
                {token.priceChange24h >= 0 ? "+" : ""}{token.priceChange24h.toFixed(2)}% 24h
              </span>
            </div>
          </div>
        </div>

        {/* Sparkline — full width */}
        <div style={{ padding: "8px 14px 0 14px" }}>
          <Sparkline points={token.pricePoints} color={sparkColor} height={32} />
        </div>

        {/* Stats grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1,
          background: "rgba(255,255,255,0.04)", borderRadius: 10,
          overflow: "hidden", margin: "12px 14px",
        }}>
          <StatCell label="MCap" value={formatBig(token.marketCap)} />
          <StatCell label="FDV" value={formatBig(token.fdv)} />
          <StatCell label="Liquidity" value={formatBig(token.liquidity)} />
          <StatCell label="Vol 1h" value={formatBig(token.volume1h)} />
          <StatCell label="Vol 24h" value={formatBig(token.volume24h)} />
          <StatCell label="Age" value={formatAge(token.pairCreatedAt)} />
        </div>

        {/* Buy/Sell pressure bar */}
        <div style={{ margin: "0 14px 10px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: "#30d158", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
              {token.txns1h.buys} buys
            </span>
            <span style={{ fontSize: 10, color: "#ff2d55", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
              {token.txns1h.sells} sells
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "rgba(255,45,85,0.3)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 2,
              width: `${buyPct * 100}%`,
              background: buyPct > 0.65 ? "#30d158" : buyPct > 0.5 ? "#f59e0b" : "#ff2d55",
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>

        {/* AI Brief */}
        <div style={{
          background: "rgba(99,102,241,0.06)", borderTop: "1px solid rgba(255,255,255,0.04)",
          padding: "8px 14px", display: "flex", alignItems: "flex-start", gap: 8,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.16A2.5 2.5 0 0 1 6 10V4.5A2.5 2.5 0 0 1 9.5 2Z"/>
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.16A2.5 2.5 0 0 0 18 10V4.5A2.5 2.5 0 0 0 14.5 2Z"/>
          </svg>
          <span style={{ fontSize: 11, color: "#6b6b80", lineHeight: 1.5 }}>{getAIBrief(token)}</span>
        </div>

        {/* Tags */}
        {token.tags.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "8px 14px 0 14px" }}>
            {token.tags.map(tag => {
              const tagColor = TAG_COLORS[tag] || "#6b6b80";
              return (
                <span key={tag} style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
                  padding: "3px 7px", borderRadius: 4, textTransform: "uppercase" as const,
                  background: `${tagColor}15`, color: tagColor, border: `1px solid ${tagColor}25`,
                }}>
                  {tag}
                </span>
              );
            })}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, padding: "12px 14px 14px 14px" }}>
          <button
            onClick={(e) => { e.stopPropagation(); }}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              padding: "9px 0", borderRadius: 8,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#6b6b80", fontSize: 11, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Watch
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowSheet(true); }}
            style={{
              flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              padding: "9px 0", borderRadius: 8, border: "none",
              background: "linear-gradient(135deg, #6366f1, #06b6d4)",
              color: "white", fontSize: 11, fontWeight: 800,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
            Hunt with Agent
          </button>
        </div>
      </motion.div>

      {/* Bottom sheet modal */}
      <AnimatePresence>
        {showSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSheet(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(0,0,0,0.6)",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
            }}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%", maxWidth: 480,
                background: C.surface,
                borderRadius: "20px 20px 0 0",
                padding: "20px 20px 40px",
                border: `1px solid ${C.border}`,
                borderBottom: "none",
              }}
            >
              <div style={{
                width: 36, height: 4, borderRadius: 2,
                background: C.dim, margin: "0 auto 16px",
              }} />

              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                Hunt ${token.symbol}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
                {token.name} on {CHAIN_COLORS[token.chainId]?.label || token.chainId}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  {
                    label: "Auto Trade", desc: "Agent buys & manages position", color: C.match,
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="3"/>
                      </svg>
                    ),
                  },
                  {
                    label: "Alert Me First", desc: "Notify before any action", color: C.cyan,
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                      </svg>
                    ),
                  },
                  {
                    label: "Just Watch", desc: "Track without trading", color: C.muted,
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    ),
                  },
                ].map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => setShowSheet(false)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "14px 16px", borderRadius: 12,
                      background: C.s2, border: `1px solid ${C.border}`,
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${opt.color}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: opt.color,
                    }}>
                      {opt.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowSheet(false)}
                style={{
                  width: "100%", marginTop: 12, padding: "12px 0",
                  background: "transparent", border: `1px solid ${C.border}`,
                  borderRadius: 12, color: C.muted, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Exported for use in hunt/page.tsx compact rows ──
export { ChainBadge, CHAIN_COLORS };
