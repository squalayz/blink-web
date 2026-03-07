"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Bot, ExternalLink, TrendingUp, Droplets, ArrowUpDown, X } from "lucide-react";

const C = {
  bg: "#0a0a0f", surface: "#0d0d14", s2: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", match: "#30d158",
  hot: "#ff2d55", text: "#e8e8f0", muted: "#6b6b80",
  dim: "#2a2a3a", border: "rgba(255,255,255,0.07)",
};

interface Token {
  address: string;
  symbol: string;
  name: string;
  chainId: string;
  price: number;
  priceChange1h: number;
  volume1h: number;
  volume24h: number;
  liquidity: number;
  txns1h: { buys: number; sells: number };
  imageUrl: string | null;
  url: string;
  score: number;
  tags: string[];
  pricePoints: number[];
}

// ── Smart Token Logo ──
// Tries: provided imageUrl → DexScreener CDN → Trust Wallet → CoinGecko → initials avatar
function TokenLogo({ imageUrl, symbol, address, chainId, size = 40 }: {
  imageUrl: string | null;
  symbol: string;
  address: string;
  chainId: string;
  size?: number;
}) {
  // Build ordered fallback list
  const sources: string[] = [];
  if (imageUrl) sources.push(imageUrl);

  // Trust Wallet asset repo — works great for Base/ETH/BSC ERC20s
  if (chainId === "ethereum" || chainId === "base" || chainId === "bsc") {
    const chainMap: Record<string, string> = {
      ethereum: "ethereum",
      base: "base",
      bsc: "smartchain",
    };
    sources.push(
      `https://assets.trustwallet.com/blockchains/${chainMap[chainId]}/assets/${address}/logo.png`
    );
  }

  // DexScreener token image CDN
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

  // Color avatar based on symbol
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
      {/* Initials fallback visible underneath */}
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

function scoreColor(score: number): string {
  if (score >= 90) return "#ffffff";
  if (score >= 75) return C.match;
  if (score >= 60) return "#f59e0b";
  return C.hot;
}

function chainLabel(id: string): string {
  const m: Record<string, string> = { base: "Base", solana: "Solana", ethereum: "ETH", bsc: "BSC", arbitrum: "ARB" };
  return m[id] || id;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function tagIcon(tag: string): string {
  if (tag.includes("Alpha")) return "\u26A1";
  if (tag.includes("Breakout")) return "\uD83D\uDD25";
  if (tag.includes("New")) return "\uD83C\uDD95";
  if (tag.includes("Whale")) return "\uD83D\uDC0B";
  if (tag.includes("Cooling")) return "\u2744\uFE0F";
  return "";
}

// SVG Score Arc
function ScoreArc({ score, size = 52 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = scoreColor(score);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {/* Arc SVG — rotated so arc starts at top */}
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute", top: 0, left: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.dim} strokeWidth={3.5} />
        <motion.circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke={color} strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      {/* Score number — separate div so no rotation needed */}
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

// Sparkline
function Sparkline({ points, color, width = 120, height = 32 }: { points: number[]; color: string; width?: number; height?: number }) {
  if (!points.length || points.every(p => p === 0)) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);

  const pathD = points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / range) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sparkGrad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${pathD} L${width},${height} L0,${height} Z`} fill={`url(#sparkGrad-${color.replace("#", "")})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

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

  return (
    <>
      <motion.div
        id={`hunt-card-${token.address}`}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        onClick={onHighlight}
        style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: 16,
          border: `1px solid ${highlighted ? `${color}66` : C.border}`,
          boxShadow: highlighted ? `0 0 20px ${color}22` : `0 0 8px ${color}08`,
          padding: "16px",
          cursor: "pointer",
          position: "relative",
          overflow: "hidden",
          transition: "border-color 0.3s, box-shadow 0.3s",
        }}
      >
        {/* Header: Logo + Name + Score */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          {/* Token logo — smart multi-source with fallback */}
          <TokenLogo
            imageUrl={token.imageUrl}
            symbol={token.symbol}
            address={token.address}
            chainId={token.chainId}
            size={44}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: C.text,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {token.name}
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>
              ${token.symbol} · {chainLabel(token.chainId)}
            </div>
          </div>

          <ScoreArc score={token.score} />
        </div>

        {/* Sparkline */}
        <div style={{ marginBottom: 12 }}>
          <Sparkline points={token.pricePoints} color={token.priceChange1h >= 0 ? C.match : C.hot} />
        </div>

        {/* Stats row */}
        <div style={{
          display: "flex", gap: 12, fontSize: 11, color: C.muted, marginBottom: 10,
          flexWrap: "wrap",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <TrendingUp size={10} /> Vol 1h: {fmtNum(token.volume1h)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Droplets size={10} /> Liq: {fmtNum(token.liquidity)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <ArrowUpDown size={10} /> {token.txns1h.buys}/{token.txns1h.sells}
          </span>
        </div>

        {/* Price change badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: token.priceChange1h >= 0 ? C.match : C.hot,
          }}>
            {token.priceChange1h >= 0 ? "+" : ""}{token.priceChange1h.toFixed(1)}% 1h
          </span>
        </div>

        {/* Tags */}
        {token.tags.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {token.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 10, fontWeight: 600,
                padding: "3px 8px", borderRadius: 20,
                background: `${scoreColor(token.score)}12`,
                color: scoreColor(token.score),
                border: `1px solid ${scoreColor(token.score)}22`,
              }}>
                {tagIcon(tag)} {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={(e) => { e.stopPropagation(); }}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              padding: "8px 0", borderRadius: 10, border: `1px solid ${C.border}`,
              background: C.s2, color: C.muted, fontSize: 11, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <Eye size={12} /> Watch
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowSheet(true); }}
            style={{
              flex: 1.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              padding: "8px 0", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`,
              color: "white", fontSize: 11, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <Bot size={12} /> Hunt with Agent
          </button>
          <a
            href={token.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.border}`,
              background: C.s2, color: C.muted, textDecoration: "none",
            }}
          >
            <ExternalLink size={12} />
          </a>
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
              {/* Drag handle */}
              <div style={{
                width: 36, height: 4, borderRadius: 2,
                background: C.dim, margin: "0 auto 16px",
              }} />

              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                Hunt ${token.symbol}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
                {token.name} on {chainLabel(token.chainId)}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Auto Trade", desc: "Agent buys & manages position", icon: <Bot size={16} />, color: C.match },
                  { label: "Alert Me First", desc: "Notify before any action", icon: <Eye size={16} />, color: C.cyan },
                  { label: "Just Watch", desc: "Track without trading", icon: <TrendingUp size={16} />, color: C.muted },
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
                <X size={14} /> Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
