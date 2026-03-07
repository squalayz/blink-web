"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, RefreshCw, ChevronDown, Crosshair, Zap } from "lucide-react";
import HuntTokenCard from "@/components/hunt-token-card";
import HuntPulseViz from "@/components/hunt-pulse-viz";
import MobileTabBar from "@/components/mobile-tab-bar";

const C = {
  bg: "#0a0a0f", surface: "#0d0d14", s2: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", match: "#30d158",
  hot: "#ff2d55", text: "#e8e8f0", muted: "#6b6b80",
  dim: "#2a2a3a", border: "rgba(255,255,255,0.07)",
};

const CHAINS = [
  { id: "all", label: "All" },
  { id: "base", label: "Base" },
  { id: "solana", label: "Solana" },
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
  txns1h: { buys: number; sells: number };
  pairCreatedAt: number;
  imageUrl: string | null;
  url: string;
  score: number;
  tags: string[];
  pricePoints: number[];
}

// Fake agent activity messages
const AGENT_MSGS = [
  "entered DEGEN", "watching BRETT", "scanning PEPE", "spotted MOCHI",
  "tracking WIF", "analyzing BONK", "flagged TOSHI", "researching MOG",
];

export default function HuntPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chain, setChain] = useState("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(20);
  const [highlightedAddr, setHighlightedAddr] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [agentMsg, setAgentMsg] = useState({ agent: 3, msg: AGENT_MSGS[0], ts: "2s ago" });
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchTokens = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const chains = chain === "all" ? "base,solana,ethereum,bsc,arbitrum" : chain;
      const params = new URLSearchParams({ chains, limit: String(limit) });
      if (q) params.set("q", q);

      const res = await fetch(`/api/hunt/tokens?${params}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setTokens([]);
      } else {
        setTokens(data.tokens || []);
      }
      setLastRefresh(Date.now());
    } catch {
      setError("Failed to load tokens");
    }
    setLoading(false);
  }, [chain, limit]);

  // Initial fetch + on chain change
  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Auto refresh every 30s
  useEffect(() => {
    const iv = setInterval(() => fetchTokens(), 30000);
    return () => clearInterval(iv);
  }, [fetchTokens]);

  // Fake agent activity strip
  useEffect(() => {
    const iv = setInterval(() => {
      setAgentMsg({
        agent: Math.floor(Math.random() * 12) + 1,
        msg: AGENT_MSGS[Math.floor(Math.random() * AGENT_MSGS.length)],
        ts: `${Math.floor(Math.random() * 10) + 1}s ago`,
      });
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  // Search with debounce
  function handleSearch(val: string) {
    setQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchTokens(val || undefined);
    }, 500);
  }

  function handleSelectOrb(address: string) {
    setHighlightedAddr(address);
    const el = document.getElementById(`hunt-card-${address}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const hotCount = tokens.filter(t => t.score >= 80).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      color: C.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      paddingTop: 64, // navbar clearance
    }}>
      {/* Page header */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: `${C.hot}18`, border: `1px solid ${C.hot}33`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.hot} strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
              <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-0.03em" }}>Hunt</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>Find hot tokens · Let your agent trade them</div>
          </div>
        </div>
      </div>

      {/* Pulse Visualization */}
      <HuntPulseViz
        tokens={tokens}
        loading={loading}
        onSelectToken={handleSelectOrb}
      />

      {/* Chain filter pills */}
      <div style={{
        display: "flex", gap: 8, padding: "16px 16px 0",
        overflowX: "auto", WebkitOverflowScrolling: "touch",
      }}>
        {CHAINS.map(c => (
          <button
            key={c.id}
            onClick={() => setChain(c.id)}
            style={{
              padding: "7px 16px", borderRadius: 20,
              border: chain === c.id ? `1px solid ${C.hot}` : `1px solid ${C.border}`,
              background: chain === c.id ? `${C.hot}18` : "rgba(255,255,255,0.03)",
              color: chain === c.id ? C.hot : C.muted,
              fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
              cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.2s",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(12px)",
          border: `1px solid ${C.border}`,
          borderRadius: 14, padding: "10px 14px",
        }}>
          <Search size={16} color={C.muted} />
          <input
            type="text"
            placeholder="Ask your agent... search tokens"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: C.text, fontSize: 13, fontFamily: "inherit",
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(""); fetchTokens(); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: C.muted, padding: 0,
              }}
            >
              <Crosshair size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Section header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px 12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>
            Hot Right Now
          </span>
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 10, color: C.match,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: C.match,
              animation: "hunt-live-dot 1.5s infinite",
            }} />
            LIVE
          </div>
        </div>

        <button
          onClick={() => fetchTokens(query || undefined)}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "none", border: "none",
            color: C.muted, fontSize: 11, cursor: "pointer",
            fontFamily: "inherit", opacity: loading ? 0.4 : 1,
          }}
        >
          <RefreshCw size={12} style={{
            animation: loading ? "hunt-spin 0.8s linear infinite" : "none",
          }} />
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          margin: "0 16px 12px", padding: "12px 16px",
          background: `${C.hot}10`, border: `1px solid ${C.hot}22`,
          borderRadius: 12, fontSize: 12, color: C.hot,
        }}>
          {error}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && tokens.length === 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 10, padding: "0 14px",
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.03)",
              borderRadius: 16, height: 200,
              animation: "hunt-skeleton 1.5s ease-in-out infinite",
              animationDelay: `${i * 0.15}s`,
            }} />
          ))}
        </div>
      )}

      {/* Token cards grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 10, padding: "0 14px",
      }}>
        <AnimatePresence>
          {tokens.map((token, i) => (
            <HuntTokenCard
              key={`${token.chainId}-${token.address}`}
              token={token}
              index={i}
              highlighted={highlightedAddr === token.address}
              onHighlight={() => setHighlightedAddr(
                highlightedAddr === token.address ? null : token.address
              )}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {!loading && tokens.length === 0 && !error && (
        <div style={{
          textAlign: "center", padding: "60px 20px", color: C.dim,
        }}>
          <Crosshair size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No tokens found</div>
          <div style={{ fontSize: 12, color: C.muted }}>Try a different chain or search term</div>
        </div>
      )}

      {/* Load more */}
      {tokens.length >= limit && (
        <div style={{ padding: "20px 16px", textAlign: "center" }}>
          <button
            onClick={() => setLimit(l => l + 20)}
            style={{
              padding: "12px 32px", borderRadius: 12,
              background: C.s2, border: `1px solid ${C.border}`,
              color: C.text, fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <ChevronDown size={14} /> Load More
          </button>
        </div>
      )}

      {/* Bottom padding so last card isn't hidden behind tab bar + activity strip */}
      <div style={{ height: 140 }} />

      {/* Agent activity strip */}
      <motion.div
        key={agentMsg.msg + agentMsg.agent}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: "fixed", bottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 8px)", left: 16, right: 16,
          zIndex: 300,
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 8,
          fontSize: 11, color: C.muted,
          pointerEvents: "none",
        }}
      >
        <Zap size={10} color={C.cyan} />
        <span>
          <span style={{ color: C.cyan, fontWeight: 600 }}>Agent #{agentMsg.agent}</span>
          {" "}{agentMsg.msg}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 9, color: C.dim }}>
          {agentMsg.ts}
        </span>
      </motion.div>

      {/* Tab bar */}
      <MobileTabBar
        activeTab="hunt"
        onTabChange={(tab) => {
          if (tab === "hunt") return;
          const routes: Record<string, string> = {
            mesh: "/dashboard",
            matches: "/dashboard",
            chat: "/dashboard",
            wallet: "/dashboard",
            profile: "/dashboard",
          };
          window.location.href = routes[tab] || "/dashboard";
        }}
        hotCount={hotCount}
      />

      <style>{`
        @keyframes hunt-card-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.003); }
        }
        @keyframes hunt-live-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes hunt-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes hunt-skeleton {
          0%, 100% { opacity: 0.06; }
          50% { opacity: 0.12; }
        }
      `}</style>
    </div>
  );
}
