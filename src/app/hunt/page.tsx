"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, RefreshCw, ChevronDown, Crosshair } from "lucide-react";
import HuntTokenCard from "@/components/hunt-token-card";
import HuntPulseViz from "@/components/hunt-pulse-viz";
import MobileTabBar from "@/components/mobile-tab-bar";
import CoHuntCard from "@/components/co-hunt-card";
import NetworkSignalsCard from "@/components/network-signals-card";

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
  txns1h: { buys: number; sells: number };
  pairCreatedAt: number;
  imageUrl: string | null;
  url: string;
  score: number;
  tags: string[];
  pricePoints: number[];
}

export default function HuntPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chain, setChain] = useState("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(20);
  const [highlightedAddr, setHighlightedAddr] = useState<string | null>(null);
  const [coHunts, setCoHunts] = useState<any[]>([]);
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
    } catch {
      setError("Failed to load tokens");
    }
    setLoading(false);
  }, [chain, limit]);

  // Initial fetch + on chain/limit change
  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  // Fetch active co-hunts
  useEffect(() => {
    async function fetchCoHunts() {
      try {
        // Get userId from session/cookie — try common patterns
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        const userId = session?.user?.id;
        if (!userId) return;

        const res = await fetch(`/api/co-hunt?userId=${userId}`);
        const data = await res.json();
        if (data.coHunts) setCoHunts(data.coHunts);
      } catch {}
    }
    fetchCoHunts();
  }, []);

  async function handleEndCoHunt(coHuntId: string) {
    try {
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const userId = session?.user?.id;
      if (!userId) return;

      await fetch("/api/co-hunt", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coHuntId, userId }),
      });
      setCoHunts(prev => prev.filter(ch => ch.id !== coHuntId));
    } catch {}
  }

  async function handleAcceptCoHunt(coHuntId: string) {
    try {
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const userId = session?.user?.id;
      if (!userId) return;

      const res = await fetch("/api/co-hunt", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coHuntId, userId }),
      });
      const data = await res.json();
      if (data.coHunt) {
        setCoHunts(prev => prev.map(ch => ch.id === coHuntId ? { ...ch, status: "active" } : ch));
      }
    } catch {}
  }

  // Auto refresh every 30s
  useEffect(() => {
    const iv = setInterval(() => fetchTokens(), 30000);
    return () => clearInterval(iv);
  }, [fetchTokens]);

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
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Outfit', sans-serif",
      paddingTop: 64,
      overflowX: "hidden",
      overflowY: "auto",
      // GPU layer for the whole page — prevents composite layer thrashing
      isolation: "isolate",
    }}>

      {/* ── Page Header ── */}
      <div style={{ padding: "20px 16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `${C.hot}15`, border: `1px solid ${C.hot}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.hot} strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="3"/>
              <line x1="12" y1="2" x2="12" y2="5"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="5" y2="12"/>
              <line x1="19" y1="12" x2="22" y2="12"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-0.03em", lineHeight: 1 }}>Hunt</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>Find hot tokens · Let your agent trade them</div>
          </div>
        </div>
      </div>

      {/* ── Pulse Visualization ── */}
      <HuntPulseViz
        tokens={tokens}
        loading={loading}
        onSelectToken={handleSelectOrb}
      />

      {/* ── Chain filter pills ── */}
      <div style={{
        display: "flex", gap: 6, padding: "14px 14px 0",
        overflowX: "auto", WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none", msOverflowStyle: "none",
      }}>
        {CHAINS.map(c => (
          <button
            key={c.id}
            onClick={() => setChain(c.id)}
            style={{
              padding: "6px 14px", borderRadius: 20, flexShrink: 0,
              border: chain === c.id ? `1px solid ${C.hot}` : `1px solid ${C.border}`,
              background: chain === c.id ? `${C.hot}15` : "rgba(255,255,255,0.03)",
              color: chain === c.id ? C.hot : C.muted,
              fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
              cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* ── Network Signals ── */}
      <div style={{ padding: "10px 14px 0" }}>
        <NetworkSignalsCard />
      </div>

      {/* ── Co-Hunt Cards ── */}
      {coHunts.length > 0 && (
        <div style={{ padding: "10px 14px 0", display: "flex", flexDirection: "column", gap: 8 }}>
          <AnimatePresence>
            {coHunts.map(ch => (
              <CoHuntCard
                key={ch.id}
                coHunt={ch}
                onEnd={handleEndCoHunt}
                onAccept={handleAcceptCoHunt}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Search bar ── */}
      <div style={{ padding: "10px 14px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${C.border}`,
          borderRadius: 12, padding: "9px 14px",
        }}>
          <Search size={15} color={C.muted} style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search tokens by name, symbol, or address..."
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
              style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 0, flexShrink: 0 }}
            >
              <Crosshair size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Section header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "4px 14px 10px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Hot Right Now</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.match }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
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
            padding: 0,
          }}
        >
          <RefreshCw size={11} style={{ animation: loading ? "hunt-spin 0.8s linear infinite" : "none" }} />
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div style={{
          margin: "0 14px 10px", padding: "10px 14px",
          background: `${C.hot}10`, border: `1px solid ${C.hot}22`,
          borderRadius: 10, fontSize: 12, color: C.hot,
        }}>
          {error}
        </div>
      )}

      {/* ── Loading skeletons ── */}
      {loading && tokens.length === 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 10, padding: "0 14px",
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.03)",
              borderRadius: 16, height: 195,
              animation: "hunt-skeleton 1.8s ease-in-out infinite",
              animationDelay: `${i * 0.12}s`,
            }} />
          ))}
        </div>
      )}

      {/* ── Token cards grid ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 10, padding: "0 14px",
        // Prevent layout shift
        contain: "layout style",
      }}>
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
      </div>

      {/* ── Empty state ── */}
      {!loading && tokens.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <Crosshair size={32} color={C.dim} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 6 }}>No tokens found</div>
          <div style={{ fontSize: 12, color: C.dim }}>Try a different chain or search term</div>
        </div>
      )}

      {/* ── Load more ── */}
      {tokens.length >= limit && !loading && (
        <div style={{ padding: "16px 14px", textAlign: "center" }}>
          <button
            onClick={() => setLimit(l => l + 20)}
            style={{
              padding: "11px 28px", borderRadius: 12,
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

      {/* ── Bottom spacer — clears mobile tab bar cleanly ── */}
      <div style={{ height: 96 }} />

      {/* ── Mobile Tab Bar ── */}
      <MobileTabBar
        activeTab="hunt"
        onTabChange={(tab) => {
          if (tab === "hunt") return;
          const routes: Record<string, string> = {
            mesh: "/dashboard?tab=mesh",
            feed: "/dashboard?tab=feed",
            discover: "/dashboard?tab=discover",
            wallet: "/dashboard?tab=wallet",
            agent: "/dashboard?tab=agent",
          };
          window.location.href = routes[tab] || "/dashboard";
        }}
        hotCount={hotCount}
      />

      <style>{`
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
        /* hide scrollbar on chain pills */
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
