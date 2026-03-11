"use client";

import { useState } from "react";
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
  { id: "solana", label: "Solana" },
  { id: "ethereum", label: "ETH" },
  { id: "bsc", label: "BSC" },
  { id: "arbitrum", label: "Arbitrum" },
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

// ── Classification ──
function classifyTokens(tokens: Token[]) {
  const NEW: Token[] = [];
  const HEATING: Token[] = [];
  const FIRE: Token[] = [];

  tokens.forEach(token => {
    const vol = token.volume1h || 0;
    const score = token.score || 0;
    const pc1h = token.priceChange1h || 0;

    if (score >= 70 && (vol > 100000 || pc1h > 20)) {
      FIRE.push(token);
    } else if (score >= 45 || vol > 20000 || pc1h > 5) {
      HEATING.push(token);
    } else {
      NEW.push(token);
    }
  });

  return { NEW, HEATING, FIRE };
}

// ── Format helpers ──
function fmtPrice(p: number): string {
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(8)}`;
}

function formatBig(v: number): string {
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

function generateAIBrief(token: Token): string {
  const vol = token.volume24h || 0;
  const liq = token.liquidity || 0;
  const priceChange = token.priceChange1h || 0;
  const score = token.score || 0;
  if (score >= 90) return "Exceptional signals across all metrics.";
  if (priceChange > 50) return `Up ${priceChange.toFixed(0)}% — accelerating fast.`;
  if (vol > 1000000) return `Over $${(vol / 1000000).toFixed(1)}M volume — serious flow.`;
  if (liq > 500000) return `Deep liquidity ($${(liq / 1000).toFixed(0)}K) — safer entry.`;
  if (priceChange > 20 && vol > 100000) return "Volume + price combo — early breakout.";
  if (score >= 75) return "Strong fundamentals. All signals up.";
  if (priceChange < -20) return "Sharp pullback — watch volume.";
  return "Moderate signals. Monitor for confirmation.";
}

// ── Column config ──
const colColors: Record<string, string> = { new: "#06b6d4", heating: "#f59e0b", fire: "#ff2d55" };
const colLabels: Record<string, string> = { fire: "On Fire", heating: "Heating Up", new: "New Pairs" };
const colDescs: Record<string, string> = { fire: "Full momentum", heating: "Building volume", new: "Fresh liquidity" };

export default function MeshScope({
  tokens, loading, walletEth, walletAddress, onTokenSelect, quickAmount,
  chain, onChainChange, query, onSearch,
}: MeshScopeProps) {
  const [agentMode, setAgentMode] = useState(false);
  const [activeCol, setActiveCol] = useState<"new" | "heating" | "fire">("fire");
  const [buyingToken, setBuyingToken] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState<Record<string, boolean>>({});

  const { NEW, HEATING, FIRE } = classifyTokens(tokens);

  const agentPicks = agentMode
    ? FIRE.slice(0, 2).concat(HEATING.slice(0, 1)).map(t => t.address)
    : [];

  const handleQuickBuy = async (token: Token) => {
    if (!walletAddress) {
      window.location.href = "/dashboard?tab=brew";
      return;
    }
    if (walletEth < 0.001) {
      window.location.href = "/dashboard?tab=brew";
      return;
    }
    setBuyingToken(token.address);
    try {
      const ethAmount = quickAmount / 2000;
      const res = await fetch("/api/trading/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "buy",
          tokenAddress: token.address,
          tokenSymbol: token.symbol,
          amountEth: ethAmount,
          slippagePct: 1.5,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setBuySuccess(prev => ({ ...prev, [token.address]: true }));
        setTimeout(() => setBuySuccess(prev => ({ ...prev, [token.address]: false })), 4000);
      } else {
        console.error("Buy failed:", data.error);
      }
    } catch { /* non-blocking */ }
    setBuyingToken(null);
  };

  function renderTokenRow(token: Token) {
    const isAgentPick = agentPicks.includes(token.address);
    const pc = token.priceChange1h || 0;
    return (
      <div
        key={`${token.chainId}-${token.address}`}
        onClick={() => onTokenSelect(token)}
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          display: "flex", flexDirection: "column", gap: 6,
          background: isAgentPick ? "rgba(99,102,241,0.05)" : "transparent",
          borderLeft: isAgentPick ? "2px solid #6366f1" : "2px solid transparent",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => { if (!isAgentPick) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
        onMouseLeave={e => { if (!isAgentPick) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        {/* ROW 1: logo + name + price + change */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TokenLogo imageUrl={token.imageUrl} symbol={token.symbol} address={token.address} chainId={token.chainId} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>${token.symbol}</span>
              <ChainBadge chainId={token.chainId} />
              {isAgentPick && (
                <span style={{
                  fontSize: 8, fontWeight: 900, padding: "1px 5px", borderRadius: 3,
                  background: "rgba(99,102,241,0.2)", color: "#6366f1",
                  border: "1px solid rgba(99,102,241,0.4)", letterSpacing: "0.08em",
                }}>AI PICK</span>
              )}
            </div>
            <div style={{ fontSize: 10, color: C.muted, display: "flex", gap: 6 }}>
              <span>{token.name.slice(0, 16)}</span>
              <span>{formatAge(token.pairCreatedAt)}</span>
              <span style={{ color: C.muted }}>Vol {formatBig(token.volume1h)}</span>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: C.text }}>
              {fmtPrice(token.price)}
            </div>
            <div style={{
              fontSize: 11, fontWeight: 700,
              color: pc >= 0 ? C.match : C.hot,
            }}>
              {pc >= 0 ? "+" : ""}{pc.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* ROW 2: action buttons + score bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={(e) => { e.stopPropagation(); handleQuickBuy(token); }}
            disabled={!!buyingToken}
            style={{
              padding: "5px 12px", borderRadius: 6, cursor: "pointer",
              background: buySuccess[token.address] ? "rgba(48,209,88,0.2)" : "rgba(48,209,88,0.12)",
              color: C.match,
              border: "1px solid rgba(48,209,88,0.3)",
              fontSize: 11, fontWeight: 800, fontFamily: "inherit",
              minWidth: 60, transition: "all 0.15s",
              opacity: buyingToken && buyingToken !== token.address ? 0.4 : 1,
            }}
          >
            {buyingToken === token.address ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "hunt-spin 0.8s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : buySuccess[token.address] ? "Bought" : `Buy $${quickAmount}`}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onTokenSelect(token); }}
            style={{
              padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(99,102,241,0.3)",
              background: "rgba(99,102,241,0.08)", color: "#6366f1",
              fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Hunt AI
          </button>

          <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 2, width: `${token.score}%`,
              background: token.score >= 75 ? C.match : token.score >= 50 ? "#f59e0b" : C.hot,
              transition: "width 0.5s ease",
            }} />
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, fontFamily: "'JetBrains Mono',monospace" }}>{token.score}</span>
        </div>

        {/* AI brief for agent picks */}
        {isAgentPick && (
          <div style={{ fontSize: 10, color: C.indigo, fontStyle: "italic", paddingLeft: 40 }}>
            {generateAIBrief(token)}
          </div>
        )}
      </div>
    );
  }

  function renderColumn(key: string, items: Token[]) {
    const color = colColors[key];
    return (
      <div style={{
        background: "rgba(13,13,20,0.5)",
        borderRight: "1px solid rgba(255,255,255,0.04)",
        overflowY: "auto",
        maxHeight: "calc(100vh - 280px)",
        minHeight: 200,
      }}>
        {/* Column header */}
        <div style={{
          padding: "10px 12px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: `${color}0F`,
          borderBottom: `1px solid ${color}26`,
          position: "sticky", top: 0, zIndex: 2,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {key === "new" && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            )}
            {key === "heating" && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M12 2c0 6-6 8-6 14a6 6 0 0 0 12 0c0-6-6-8-6-14z" /><path d="M12 12c0 3-2 4-2 6a2 2 0 0 0 4 0c0-2-2-3-2-6z" fill={color} /></svg>
            )}
            {key === "fire" && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M12 2c0 6-8 10-8 16a8 8 0 0 0 16 0c0-6-8-10-8-16z" /></svg>
            )}
            <span style={{ fontSize: 11, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {colLabels[key]}
            </span>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, color, background: `${color}18`,
            padding: "2px 8px", borderRadius: 10,
          }}>
            {items.length}
          </span>
        </div>

        {/* Agent mode banner */}
        {agentMode && (
          <div style={{
            padding: "6px 12px", fontSize: 10, color: C.indigo,
            background: "rgba(99,102,241,0.04)", borderBottom: "1px solid rgba(99,102,241,0.08)",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.indigo, animation: "hunt-live-dot 1.5s infinite" }} />
            Agent monitoring {items.length} tokens
          </div>
        )}

        {/* Token rows */}
        {items.length === 0 && !loading && (
          <div style={{ padding: "24px 16px", textAlign: "center", color: C.muted, fontSize: 12 }}>
            No tokens here yet — data refreshes every 10s
          </div>
        )}
        {items.map(t => renderTokenRow(t))}
      </div>
    );
  }

  return (
    <div style={{ background: C.bg }}>
      {/* ── Header bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(10,10,15,0.95)", position: "sticky", top: 0, zIndex: 10,
        flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", color: C.text }}>MeshScope</span>
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "2px 8px", borderRadius: 20,
            background: "rgba(48,209,88,0.1)", border: "1px solid rgba(48,209,88,0.2)",
          }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.match, animation: "hunt-live-dot 1.5s infinite" }} />
            <span style={{ fontSize: 9, fontWeight: 800, color: C.match }}>LIVE</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {walletEth > 0 && (
            <div style={{
              padding: "4px 10px", borderRadius: 20,
              background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)",
              fontSize: 11, fontWeight: 700, color: C.cyan,
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              {walletEth.toFixed(4)} ETH
            </div>
          )}
          <button onClick={() => setAgentMode(!agentMode)} style={{
            padding: "5px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
            border: agentMode ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.1)",
            background: agentMode ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
            color: agentMode ? C.indigo : C.muted,
            fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", gap: 5,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.16A2.5 2.5 0 0 1 6 10V4.5A2.5 2.5 0 0 1 9.5 2Z" />
              <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.16A2.5 2.5 0 0 0 18 10V4.5A2.5 2.5 0 0 0 14.5 2Z" />
            </svg>
            {agentMode ? "AI ON" : "AI OFF"}
          </button>
        </div>
      </div>

      {/* ── Search + Chain filter row ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.04)", flexWrap: "wrap",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, flex: "1 1 200px",
          background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "6px 10px", minWidth: 0,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text" placeholder="Search tokens..."
            value={query} onChange={e => onSearch(e.target.value)}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: C.text, fontSize: 12, fontFamily: "inherit", minWidth: 0,
            }}
          />
          {query && (
            <button onClick={() => onSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, overflowX: "auto", scrollbarWidth: "none", flexShrink: 0 }}>
          {CHAINS.map(c => (
            <button key={c.id} onClick={() => onChainChange(c.id)} style={{
              padding: "5px 10px", borderRadius: 16, flexShrink: 0, fontFamily: "inherit", cursor: "pointer",
              border: chain === c.id ? `1px solid ${C.hot}` : `1px solid ${C.border}`,
              background: chain === c.id ? `${C.hot}15` : "rgba(255,255,255,0.03)",
              color: chain === c.id ? C.hot : C.muted,
              fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
            }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Mobile column selector ── */}
      <div className="mm-scope-mobile-nav" style={{ display: "flex", gap: 6, padding: "10px 16px", overflowX: "auto", scrollbarWidth: "none" }}>
        {(["fire", "heating", "new"] as const).map(col => (
          <button key={col} onClick={() => setActiveCol(col)} style={{
            padding: "6px 14px", borderRadius: 20, flexShrink: 0, fontFamily: "inherit", cursor: "pointer",
            background: activeCol === col ? `${colColors[col]}20` : "rgba(255,255,255,0.04)",
            border: activeCol === col ? `1px solid ${colColors[col]}50` : "1px solid rgba(255,255,255,0.07)",
            color: activeCol === col ? colColors[col] : C.muted,
            fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            {colLabels[col]}
            <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>
              {col === "fire" ? FIRE.length : col === "heating" ? HEATING.length : NEW.length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Loading skeletons ── */}
      {loading && tokens.length === 0 && (
        <div className="mm-scope-columns" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1 }}>
          {[0, 1, 2].map(col => (
            <div key={col} style={{ background: "rgba(13,13,20,0.5)", padding: 8 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.05)", borderRadius: 6, height: 72,
                  margin: "4px 0", animation: "hunt-skeleton 1.5s ease infinite",
                  animationDelay: `${(col * 3 + i) * 0.1}s`,
                }} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Desktop 3-column grid ── */}
      {(!loading || tokens.length > 0) && (
        <div className="mm-scope-columns" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "rgba(255,255,255,0.02)" }}>
          {renderColumn("new", NEW)}
          {renderColumn("heating", HEATING)}
          {renderColumn("fire", FIRE)}
        </div>
      )}

      {/* ── Mobile single column ── */}
      {(!loading || tokens.length > 0) && (
        <div className="mm-scope-mobile-col">
          {activeCol === "fire" && renderColumn("fire", FIRE)}
          {activeCol === "heating" && renderColumn("heating", HEATING)}
          {activeCol === "new" && renderColumn("new", NEW)}
        </div>
      )}

      {/* ── Responsive CSS ── */}
      <style>{`
        .mm-scope-mobile-nav { display: flex; }
        .mm-scope-columns { display: none !important; }
        .mm-scope-mobile-col { display: block; }
        @media(min-width:768px) {
          .mm-scope-mobile-nav { display: none !important; }
          .mm-scope-columns { display: grid !important; }
          .mm-scope-mobile-col { display: none !important; }
        }
      `}</style>
    </div>
  );
}
