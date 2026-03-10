"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import HuntTokenCard from "@/components/hunt-token-card";
import HuntPulseViz from "@/components/hunt-pulse-viz";
import MobileTabBar from "@/components/mobile-tab-bar";
import CoHuntCard from "@/components/co-hunt-card";
import NetworkSignalsCard from "@/components/network-signals-card";
import TabInfoBanner from "@/components/TabInfoBanner";

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
  txns1h: { buys: number; sells: number };
  pairCreatedAt: number;
  imageUrl: string | null;
  url: string;
  score: number;
  tags: string[];
  pricePoints: number[];
}

// ── AI Brief Rule Engines ──
function generateAIBrief(token: Token): string {
  const vol = token.volume24h || 0;
  const liq = token.liquidity || 0;
  const priceChange = token.priceChange1h || 0;
  const score = token.score || 0;

  if (score >= 90) return `Exceptional signals across all metrics — this is the strongest setup on the feed right now.`;
  if (priceChange > 50) return `Price up ${priceChange.toFixed(0)}% in the last hour — momentum is accelerating fast.`;
  if (vol > 1000000) return `Over $${(vol / 1000000).toFixed(1)}M in volume — serious money is moving here.`;
  if (liq > 500000) return `Deep liquidity ($${(liq / 1000).toFixed(0)}K) means lower slippage and safer entry.`;
  if (priceChange > 20 && vol > 100000) return `Volume + price momentum combo — early stage breakout pattern.`;
  if (score >= 75) return `Strong fundamentals. Volume, liquidity, and price action all pointing up.`;
  if (priceChange < -20) return `Sharp pullback — either a dip opportunity or distribution. Watch volume.`;
  return `Moderate signals. Monitor for volume confirmation before entry.`;
}

function generateHuntBrief(token: Token): string {
  const score = token.score || 0;
  const priceChange = token.priceChange1h || 0;
  const vol = token.volume24h || 0;
  const liq = token.liquidity || 0;

  if (score >= 90) return `Score ${score}/100. All signals aligned — volume, liquidity, and momentum are all strong. This is a high-conviction setup.`;
  if (priceChange > 30 && vol > 500000) return `Up ${priceChange.toFixed(0)}% with $${(vol / 1000).toFixed(0)}K volume backing it. Momentum play — get in early or wait for a pullback.`;
  if (liq < 50000) return `Low liquidity ($${(liq / 1000).toFixed(0)}K) — high risk. Large orders will move the price significantly. Only small positions.`;
  if (priceChange > 10 && liq > 200000) return `Healthy breakout with solid liquidity. Score ${score}/100. Reasonable risk-reward here.`;
  if (priceChange < -15) return `Down ${Math.abs(priceChange).toFixed(0)}% — could be a shakeout or distribution. Wait for volume to confirm direction.`;
  return `Score ${score}/100. Moderate setup. Check volume trend before committing.`;
}

// ── SVG Icons ──
function SearchIcon({ size = 15, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function RefreshIcon({ size = 11, color = C.muted, spinning = false }: { size?: number; color?: string; spinning?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: spinning ? "hunt-spin 0.8s linear infinite" : "none" }}>
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function CrosshairIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
      <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
    </svg>
  );
}

function ChevronDownIcon({ size = 14, color = C.text }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function BrainIcon({ size = 14, color = C.indigo }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z" />
      <line x1="9" y1="21" x2="15" y2="21" />
    </svg>
  );
}

function ZapIcon({ size = 14, color = C.match }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function ShieldIcon({ size = 14, color = C.match }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function XIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function EyeIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ArrowUpIcon({ size = 12, color = C.match }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function ArrowDownIcon({ size = 12, color = C.hot }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function PauseIcon({ size = 14, color = C.text }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function StopIcon({ size = 14, color = C.hot }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

// ── Agent Ticker Items ──
const agentTicker = [
  "NOVA-7 is watching 12 pairs on Base",
  "3 agents signaled $ETH breakout in the last hour",
  "CIPHER-3 just flagged a volume spike on Arbitrum",
  "Scout mode active across 847 pairs",
  "2 agents entered positions in the last 5 minutes",
];

const MODE_DESC: Record<string, string> = {
  scout: "Browse live tokens. AI scores and explains each one.",
  hunt: "Pick a token and trade it. AI whispers advice as you go.",
  auto: "Set your budget. Your agent hunts and trades automatically.",
};

const STRATEGIES = [
  { id: "conservative" as const, label: "Conservative", color: C.match, maxPos: "2%", minScore: 80, minLiq: "$50K", tag: "Safer entries, smaller gains" },
  { id: "balanced" as const, label: "Balanced", color: C.indigo, maxPos: "5%", minScore: 70, minLiq: "$25K", tag: "Mix of caution and opportunity" },
  { id: "degen" as const, label: "Degen", color: C.hot, maxPos: "20%", minScore: 60, minLiq: "$10K", tag: "High risk, high reward" },
];

// Format helpers
function fmtPrice(p: number): string {
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(8)}`;
}
function fmtVol(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}
function chainColor(id: string): string {
  const m: Record<string, string> = { base: "#0052FF", solana: "#9945FF", ethereum: "#627EEA", bsc: "#F0B90B", arbitrum: "#28A0F0" };
  return m[id] || C.muted;
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

  // Mode state
  const [huntMode, setHuntMode] = useState<"scout" | "hunt" | "auto">("scout");

  // Hunt mode state
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [buyAmount, setBuyAmount] = useState<string>("");
  const [slippage, setSlippage] = useState<string>("1");
  const [customSlippage, setCustomSlippage] = useState("");
  const [showCustomBuy, setShowCustomBuy] = useState(false);

  // Auto mode state
  const [autoStrategy, setAutoStrategy] = useState<"conservative" | "balanced" | "degen">("balanced");
  const [autoBudget, setAutoBudget] = useState<string>("100");
  const [autoActive, setAutoActive] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [brainConnected] = useState(false); // placeholder

  // Watchlist
  const [watchlist, setWatchlist] = useState<string[]>([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("hunt-watchlist");
      if (saved) setWatchlist(JSON.parse(saved));
    } catch {}
  }, []);
  function toggleWatch(addr: string) {
    setWatchlist(prev => {
      const next = prev.includes(addr) ? prev.filter(a => a !== addr) : [...prev, addr];
      localStorage.setItem("hunt-watchlist", JSON.stringify(next));
      return next;
    });
  }

  // ── Data Fetching (preserved) ──
  const fetchTokens = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const chains = chain === "all" ? "base,solana,ethereum,bsc,arbitrum" : chain;
      const params = new URLSearchParams({ chains, limit: String(limit) });
      if (q) params.set("q", q);
      const res = await fetch(`/api/hunt/tokens?${params}`);
      const data = await res.json();
      if (data.error) { setError(data.error); setTokens([]); }
      else { setTokens(data.tokens || []); }
    } catch { setError("Failed to load tokens"); }
    setLoading(false);
  }, [chain, limit]);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  useEffect(() => {
    async function fetchCoHunts() {
      try {
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
      await fetch("/api/co-hunt", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ coHuntId, userId }) });
      setCoHunts(prev => prev.filter(ch => ch.id !== coHuntId));
    } catch {}
  }

  async function handleAcceptCoHunt(coHuntId: string) {
    try {
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const userId = session?.user?.id;
      if (!userId) return;
      const res = await fetch("/api/co-hunt", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ coHuntId, userId }) });
      const data = await res.json();
      if (data.coHunt) { setCoHunts(prev => prev.map(ch => ch.id === coHuntId ? { ...ch, status: "active" } : ch)); }
    } catch {}
  }

  useEffect(() => {
    const iv = setInterval(() => fetchTokens(), 30000);
    return () => clearInterval(iv);
  }, [fetchTokens]);

  function handleSearch(val: string) {
    setQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { fetchTokens(val || undefined); }, 500);
  }

  function handleSelectOrb(address: string) {
    setHighlightedAddr(address);
    const el = document.getElementById(`hunt-card-${address}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const hotCount = tokens.filter(t => t.score >= 80).length;

  // ── Mode colors ──
  const modeColors: Record<string, string> = { scout: C.indigo, hunt: C.hot, auto: C.match };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Outfit', sans-serif",
      paddingTop: 64, overflowX: "hidden", overflowY: "auto", isolation: "isolate",
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
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-0.03em", lineHeight: 1 }}>Hunt</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>Find hot tokens · Let your agent trade them</div>
          </div>
        </div>
      </div>

      {/* ── Mode Switcher ── */}
      <div style={{ padding: "0 16px" }}>
        <div style={{
          background: "rgba(13,13,20,0.9)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12, padding: 6, display: "flex", gap: 4, marginBottom: 8,
        }}>
          {(["scout", "hunt", "auto"] as const).map(mode => {
            const active = huntMode === mode;
            const col = modeColors[mode];
            return (
              <button key={mode} onClick={() => setHuntMode(mode)} style={{
                padding: "10px 24px", borderRadius: 8, cursor: "pointer",
                fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                border: active ? `1px solid ${col}66` : `1px solid ${C.border}`,
                background: active ? `${col}26` : "transparent",
                color: active ? col : C.muted,
                transition: "all 0.2s", flex: 1,
              }}>
                {mode.toUpperCase()}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, paddingLeft: 4 }}>
          {MODE_DESC[huntMode]}
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        <TabInfoBanner
          tabId="hunt"
          title="Live Token Discovery"
          tagline="Real-time scanner across 5 chains. Find what's pumping before anyone else."
          accentColor="#ff2d55"
          bullets={[
            { icon: "zap", text: "New token pairs detected live from DEX liquidity events" },
            { icon: "chart", text: "Tokens scored on volume, liquidity, price change, and transaction count" },
            { icon: "target", text: "Hot tokens = high score across all metrics in the last hour" },
            { icon: "brain", text: "Connect your AI brain and it will research tokens automatically" },
            { icon: "users", text: "Co-Hunt with another agent — share signals in real time" },
          ]}
        />
      </div>

      {/* ══════════════════════════ SCOUT MODE ══════════════════════════ */}
      {huntMode === "scout" && (
        <>
          {/* Agent Activity Ticker */}
          <div style={{ padding: "0 16px", marginBottom: 12 }}>
            <div style={{
              background: "rgba(13,13,20,0.8)", border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 8, padding: "6px 12px", overflow: "hidden", whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%", background: C.match,
                  animation: "hunt-live-dot 1.5s infinite",
                }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: C.match }}>Live</span>
              </div>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <div style={{ display: "inline-block", animation: "hunt-ticker 30s linear infinite" }}>
                  {[...agentTicker, ...agentTicker].map((item, i) => (
                    <span key={i} style={{ fontSize: 11, color: C.muted, marginRight: 40 }}>{item}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pulse Viz */}
          <HuntPulseViz tokens={tokens} loading={loading} onSelectToken={handleSelectOrb} />

          {/* Chain filter pills */}
          <div style={{
            display: "flex", gap: 6, padding: "14px 14px 0",
            overflowX: "auto", WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}>
            {CHAINS.map(c => (
              <button key={c.id} onClick={() => setChain(c.id)} style={{
                padding: "6px 14px", borderRadius: 20, flexShrink: 0,
                border: chain === c.id ? `1px solid ${C.hot}` : `1px solid ${C.border}`,
                background: chain === c.id ? `${C.hot}15` : "rgba(255,255,255,0.03)",
                color: chain === c.id ? C.hot : C.muted,
                fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
              }}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Network Signals */}
          <div style={{ padding: "10px 14px 0" }}><NetworkSignalsCard /></div>

          {/* Co-Hunt Cards */}
          {coHunts.length > 0 && (
            <div style={{ padding: "10px 14px 0", display: "flex", flexDirection: "column", gap: 8 }}>
              <AnimatePresence>
                {coHunts.map(ch => (
                  <CoHuntCard key={ch.id} coHunt={ch} onEnd={handleEndCoHunt} onAccept={handleAcceptCoHunt} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Search bar */}
          <div style={{ padding: "10px 14px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`,
              borderRadius: 12, padding: "9px 14px",
            }}>
              <SearchIcon size={15} />
              <input type="text" placeholder="Search tokens by name, symbol, or address..."
                value={query} onChange={(e) => handleSearch(e.target.value)}
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: 13, fontFamily: "inherit" }}
              />
              {query && (
                <button onClick={() => { setQuery(""); fetchTokens(); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 0, flexShrink: 0 }}>
                  <CrosshairIcon size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Section header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 14px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Hot Right Now</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.match }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.match, animation: "hunt-live-dot 1.5s infinite" }} />
                LIVE
              </div>
            </div>
            <button onClick={() => fetchTokens(query || undefined)} disabled={loading}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "none", border: "none", color: C.muted, fontSize: 11,
                cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.4 : 1, padding: 0,
              }}>
              <RefreshIcon size={11} spinning={loading} />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              margin: "0 14px 10px", padding: "10px 14px",
              background: `${C.hot}10`, border: `1px solid ${C.hot}22`,
              borderRadius: 10, fontSize: 12, color: C.hot,
            }}>{error}</div>
          )}

          {/* Loading skeletons */}
          {loading && tokens.length === 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10, padding: "0 14px" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.03)", borderRadius: 16, height: 195,
                  animation: "hunt-skeleton 1.8s ease-in-out infinite", animationDelay: `${i * 0.12}s`,
                }} />
              ))}
            </div>
          )}

          {/* Token cards grid with AI Brief */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 10, padding: "0 14px", contain: "layout style",
          }}>
            {tokens.map((token, i) => (
              <div key={`${token.chainId}-${token.address}`}>
                <HuntTokenCard
                  token={token} index={i}
                  highlighted={highlightedAddr === token.address}
                  onHighlight={() => setHighlightedAddr(highlightedAddr === token.address ? null : token.address)}
                />
                {/* AI Brief */}
                <div style={{
                  background: "rgba(99,102,241,0.06)", borderTop: "1px solid rgba(255,255,255,0.05)",
                  padding: "8px 12px", borderRadius: "0 0 12px 12px",
                  display: "flex", alignItems: "flex-start", gap: 8, marginTop: -4,
                }}>
                  <span style={{
                    fontSize: 7, fontWeight: 800, textTransform: "uppercase",
                    background: `${C.indigo}30`, color: C.indigo, padding: "2px 5px",
                    borderRadius: 4, flexShrink: 0, marginTop: 1, letterSpacing: "0.05em",
                  }}>AI</span>
                  <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{generateAIBrief(token)}</span>
                </div>
                {/* Scout quick actions */}
                <div style={{ display: "flex", gap: 6, padding: "6px 0 2px" }}>
                  <button onClick={() => { setSelectedToken(token); setHuntMode("hunt"); }}
                    style={{
                      flex: 1, padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: "rgba(99,102,241,0.08)", border: `1px solid rgba(99,102,241,0.2)`,
                      color: C.indigo, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                    }}>Research</button>
                  <button onClick={() => toggleWatch(token.address)}
                    style={{
                      flex: 1, padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: watchlist.includes(token.address) ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.04)",
                      border: watchlist.includes(token.address) ? `1px solid rgba(255,215,0,0.3)` : `1px solid ${C.border}`,
                      color: watchlist.includes(token.address) ? C.gold : C.muted,
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                    }}>
                    {watchlist.includes(token.address) ? "Watching" : "Watch"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {!loading && tokens.length === 0 && !error && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <CrosshairIcon size={32} color={C.dim} />
              <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 6, marginTop: 12 }}>No tokens found</div>
              <div style={{ fontSize: 12, color: C.dim }}>Try a different chain or search term</div>
            </div>
          )}

          {/* Load more */}
          {tokens.length >= limit && !loading && (
            <div style={{ padding: "16px 14px", textAlign: "center" }}>
              <button onClick={() => setLimit(l => l + 20)} style={{
                padding: "11px 28px", borderRadius: 12,
                background: C.s2, border: `1px solid ${C.border}`,
                color: C.text, fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                <ChevronDownIcon size={14} /> Load More
              </button>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════ HUNT MODE ══════════════════════════ */}
      {huntMode === "hunt" && (
        <div style={{ padding: "0 16px" }}>
          <div style={{
            display: "flex", gap: 16, flexWrap: "wrap",
          }}>
            {/* Left Panel — Token Discovery */}
            <div style={{ flex: "1 1 340px", minWidth: 0 }}>
              {/* Search */}
              <div style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
                marginBottom: 10,
              }}>
                <SearchIcon size={15} />
                <input type="text" placeholder="Search tokens..." value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: 14, fontFamily: "inherit" }}
                />
              </div>

              {/* Chain filter pills */}
              <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", scrollbarWidth: "none" }}>
                {CHAINS.map(c => (
                  <button key={c.id} onClick={() => setChain(c.id)} style={{
                    padding: "5px 12px", borderRadius: 16, flexShrink: 0,
                    border: chain === c.id ? `1px solid ${C.hot}` : `1px solid ${C.border}`,
                    background: chain === c.id ? `${C.hot}15` : "rgba(255,255,255,0.03)",
                    color: chain === c.id ? C.hot : C.muted,
                    fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Token list */}
              <div style={{ maxHeight: "60vh", overflowY: "auto", borderRadius: 10, scrollbarWidth: "thin" }}>
                {loading && tokens.length === 0 && (
                  <div style={{ padding: 30, textAlign: "center", fontSize: 12, color: C.muted }}>Loading tokens...</div>
                )}
                {tokens.map(token => {
                  const isSelected = selectedToken?.address === token.address;
                  const pch = token.priceChange1h || 0;
                  return (
                    <div key={`${token.chainId}-${token.address}`}
                      onClick={() => setSelectedToken(token)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        borderLeft: isSelected ? `2px solid ${C.indigo}` : "2px solid transparent",
                        background: isSelected ? "rgba(99,102,241,0.08)" : "transparent",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700, minWidth: 60 }}>{token.symbol}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 8,
                        background: `${chainColor(token.chainId)}20`, color: chainColor(token.chainId),
                      }}>{token.chainId}</span>
                      <div style={{ flex: 1 }} />
                      <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{fmtPrice(token.price)}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: pch >= 0 ? C.match : C.hot, minWidth: 48, textAlign: "right" }}>
                        {pch >= 0 ? "+" : ""}{pch.toFixed(1)}%
                      </span>
                      {/* Score bar */}
                      <div style={{ width: 40, height: 4, borderRadius: 2, background: C.dim, overflow: "hidden", flexShrink: 0 }}>
                        <div style={{
                          width: `${Math.min(token.score, 100)}%`, height: "100%", borderRadius: 2,
                          background: token.score >= 80 ? C.match : token.score >= 60 ? C.indigo : C.muted,
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Panel — Trade Panel */}
            <div style={{
              flex: "0 0 340px", maxWidth: 400,
              background: "rgba(13,13,20,0.95)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: 20, position: "sticky", top: 80, alignSelf: "flex-start",
            }}>
              {!selectedToken ? (
                <div style={{ textAlign: "center", padding: "40px 16px" }}>
                  <CrosshairIcon size={28} color={C.dim} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginTop: 12 }}>Select a token to trade</div>
                  <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>Click any token from the list</div>
                </div>
              ) : (
                <>
                  {/* Token header */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 20, fontWeight: 800 }}>{selectedToken.symbol}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 8,
                        background: `${chainColor(selectedToken.chainId)}20`, color: chainColor(selectedToken.chainId),
                      }}>{selectedToken.chainId}</span>
                    </div>
                    <div style={{
                      fontSize: 24, fontWeight: 800,
                      color: (selectedToken.priceChange1h || 0) >= 0 ? C.match : C.hot,
                    }}>{fmtPrice(selectedToken.price)}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                        background: (selectedToken.priceChange1h || 0) >= 0 ? "rgba(48,209,88,0.12)" : "rgba(255,45,85,0.12)",
                        color: (selectedToken.priceChange1h || 0) >= 0 ? C.match : C.hot,
                      }}>1h: {(selectedToken.priceChange1h || 0) >= 0 ? "+" : ""}{(selectedToken.priceChange1h || 0).toFixed(1)}%</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                        background: (selectedToken.priceChange24h || 0) >= 0 ? "rgba(48,209,88,0.12)" : "rgba(255,45,85,0.12)",
                        color: (selectedToken.priceChange24h || 0) >= 0 ? C.match : C.hot,
                      }}>24h: {(selectedToken.priceChange24h || 0) >= 0 ? "+" : ""}{(selectedToken.priceChange24h || 0).toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Momentum bar */}
                  <div style={{
                    height: 60, borderRadius: 8, margin: "12px 0",
                    background: (selectedToken.priceChange1h || 0) >= 0
                      ? "linear-gradient(135deg, rgba(48,209,88,0.1), transparent)"
                      : "linear-gradient(135deg, rgba(255,45,85,0.1), transparent)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: C.dim,
                  }}>
                    {/* Simple sparkline from pricePoints if available */}
                    {selectedToken.pricePoints && selectedToken.pricePoints.length > 1 ? (
                      <svg width="100%" height="40" viewBox={`0 0 ${selectedToken.pricePoints.length} 40`} preserveAspectRatio="none" style={{ padding: "0 8px" }}>
                        {(() => {
                          const pts = selectedToken.pricePoints;
                          const mn = Math.min(...pts);
                          const mx = Math.max(...pts);
                          const range = mx - mn || 1;
                          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${i} ${40 - ((p - mn) / range) * 36 - 2}`).join(" ");
                          const col = (selectedToken.priceChange1h || 0) >= 0 ? C.match : C.hot;
                          return <path d={d} fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" />;
                        })()}
                      </svg>
                    ) : (
                      <span>Momentum indicator</span>
                    )}
                  </div>

                  {/* Metrics grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {[
                      { label: "Price", val: fmtPrice(selectedToken.price) },
                      { label: "24h Vol", val: fmtVol(selectedToken.volume24h) },
                      { label: "Liquidity", val: fmtVol(selectedToken.liquidity) },
                      { label: "FDV", val: "—" },
                      { label: "1h Change", val: `${(selectedToken.priceChange1h || 0) >= 0 ? "+" : ""}${(selectedToken.priceChange1h || 0).toFixed(1)}%` },
                      { label: "Score", val: `${selectedToken.score}/100` },
                    ].map(m => (
                      <div key={m.label} style={{
                        background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px",
                      }}>
                        <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>{m.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{m.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* AI Whisper Bar */}
                  <div style={{
                    background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                    borderRadius: 10, padding: "10px 12px", margin: "12px 0",
                    display: "flex", alignItems: "flex-start", gap: 8,
                  }}>
                    <BrainIcon size={14} color={C.indigo} />
                    <span style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>
                      {generateHuntBrief(selectedToken)}
                    </span>
                  </div>

                  {/* Quick Buy Buttons */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, margin: "12px 0" }}>
                    {["50", "100", "250"].map(amt => (
                      <button key={amt} onClick={() => { setBuyAmount(amt); setShowCustomBuy(false); }}
                        onMouseEnter={e => { Object.assign((e.currentTarget as HTMLElement).style, { background: "rgba(48,209,88,0.12)", borderColor: "rgba(48,209,88,0.4)", color: C.match }); }}
                        onMouseLeave={e => { Object.assign((e.currentTarget as HTMLElement).style, { background: buyAmount === amt ? "rgba(48,209,88,0.12)" : "rgba(255,255,255,0.04)", borderColor: buyAmount === amt ? "rgba(48,209,88,0.4)" : "rgba(255,255,255,0.1)", color: buyAmount === amt ? C.match : C.text }); }}
                        style={{
                          padding: 10, borderRadius: 8, border: buyAmount === amt ? "1px solid rgba(48,209,88,0.4)" : "1px solid rgba(255,255,255,0.1)",
                          background: buyAmount === amt ? "rgba(48,209,88,0.12)" : "rgba(255,255,255,0.04)",
                          color: buyAmount === amt ? C.match : C.text,
                          fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                        }}>${amt}</button>
                    ))}
                    <button onClick={() => { setShowCustomBuy(!showCustomBuy); setBuyAmount(""); }}
                      onMouseEnter={e => { Object.assign((e.currentTarget as HTMLElement).style, { background: "rgba(48,209,88,0.12)", borderColor: "rgba(48,209,88,0.4)", color: C.match }); }}
                      onMouseLeave={e => { Object.assign((e.currentTarget as HTMLElement).style, { background: showCustomBuy ? "rgba(48,209,88,0.12)" : "rgba(255,255,255,0.04)", borderColor: showCustomBuy ? "rgba(48,209,88,0.4)" : "rgba(255,255,255,0.1)", color: showCustomBuy ? C.match : C.text }); }}
                      style={{
                        padding: 10, borderRadius: 8, border: showCustomBuy ? "1px solid rgba(48,209,88,0.4)" : "1px solid rgba(255,255,255,0.1)",
                        background: showCustomBuy ? "rgba(48,209,88,0.12)" : "rgba(255,255,255,0.04)",
                        color: showCustomBuy ? C.match : C.text,
                        fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                      }}>Custom</button>
                  </div>

                  {showCustomBuy && (
                    <input type="number" placeholder="Enter amount in $..."
                      value={buyAmount} onChange={e => setBuyAmount(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`,
                        background: "rgba(255,255,255,0.04)", color: C.text, fontSize: 14, fontFamily: "inherit",
                        outline: "none", marginBottom: 8, boxSizing: "border-box",
                      }}
                    />
                  )}

                  {/* Slippage */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: C.muted }}>Slippage:</span>
                    {["0.5", "1"].map(s => (
                      <button key={s} onClick={() => { setSlippage(s); setCustomSlippage(""); }}
                        style={{
                          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          border: slippage === s ? `1px solid ${C.indigo}60` : `1px solid ${C.border}`,
                          background: slippage === s ? `${C.indigo}20` : "transparent",
                          color: slippage === s ? C.indigo : C.muted,
                          cursor: "pointer", fontFamily: "inherit",
                        }}>{s}%</button>
                    ))}
                    <input type="text" placeholder="Custom %"
                      value={customSlippage}
                      onChange={e => { setCustomSlippage(e.target.value); if (e.target.value) setSlippage(e.target.value); }}
                      style={{
                        width: 60, padding: "4px 8px", borderRadius: 6, fontSize: 11,
                        border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)",
                        color: C.text, fontFamily: "inherit", outline: "none",
                      }}
                    />
                  </div>

                  {/* BUY button */}
                  <button onClick={() => setShowComingSoon(true)}
                    onMouseEnter={e => { Object.assign((e.currentTarget as HTMLElement).style, { transform: "translateY(-1px)", boxShadow: "0 6px 24px rgba(48,209,88,0.4)" }); }}
                    onMouseLeave={e => { Object.assign((e.currentTarget as HTMLElement).style, { transform: "translateY(0)", boxShadow: "0 4px 20px rgba(48,209,88,0.3)" }); }}
                    style={{
                      width: "100%", padding: 14, borderRadius: 12, border: "none",
                      background: "linear-gradient(135deg, #30d158, #06b6d4)",
                      color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer",
                      fontFamily: "inherit", letterSpacing: "-0.02em",
                      boxShadow: "0 4px 20px rgba(48,209,88,0.3)", transition: "all 0.2s",
                    }}>
                    BUY {buyAmount ? `$${buyAmount}` : ""} {selectedToken.symbol}
                  </button>

                  {/* Wallet warning */}
                  <div style={{
                    background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.2)",
                    borderRadius: 10, padding: "10px 12px", marginTop: 8, fontSize: 12, color: C.hot, cursor: "pointer",
                  }}
                    onClick={() => { window.location.href = "/dashboard?tab=wallet"; }}
                  >
                    Connect your wallet on the Wallet tab to start trading →
                  </div>

                  {/* Recent trades (placeholder) */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 8 }}>Recent Trades</div>
                    {[
                      { type: "buy", amount: "$142", time: "2m ago" },
                      { type: "sell", amount: "$89", time: "5m ago" },
                      { type: "buy", amount: "$310", time: "8m ago" },
                    ].map((t, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
                        borderBottom: i < 2 ? `1px solid rgba(255,255,255,0.04)` : "none",
                      }}>
                        {t.type === "buy" ? <ArrowUpIcon size={12} /> : <ArrowDownIcon size={12} />}
                        <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{t.amount}</span>
                        <span style={{ fontSize: 10, color: C.dim }}>{t.time}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════ AUTO MODE ══════════════════════════ */}
      {huntMode === "auto" && (
        <div style={{ padding: "0 16px", maxWidth: 560, margin: "0 auto" }}>
          {!brainConnected ? (
            /* Gate card */
            <div style={{
              background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 20, padding: "40px 32px", textAlign: "center",
            }}>
              <BrainIcon size={48} color={C.indigo} />
              <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginTop: 16 }}>
                Connect your AI brain to unlock Auto mode
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
                Your agent hunts and trades automatically. You just watch the P&L.
              </div>
              <button onClick={() => { window.location.href = "/dashboard?tab=agent"; }}
                style={{
                  marginTop: 20, padding: "12px 32px", borderRadius: 12, border: "none",
                  background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`,
                  color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}>
                Connect Brain
              </button>
            </div>
          ) : (
            <>
              {/* Auto active status */}
              {autoActive && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
                  background: "rgba(48,209,88,0.1)", border: "1px solid rgba(48,209,88,0.3)",
                  borderRadius: 10, padding: "10px 14px",
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.match, animation: "hunt-live-dot 1.5s infinite" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.match }}>AUTO ACTIVE</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, color: C.muted }}>0 trades today</span>
                </div>
              )}

              {!autoActive && (
                <>
                  {/* Budget setter */}
                  <div style={{
                    background: "rgba(13,13,20,0.9)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16, padding: 24, marginBottom: 16,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                      Daily Budget
                    </div>
                    <input type="number" value={autoBudget} onChange={e => setAutoBudget(e.target.value)}
                      style={{
                        width: "100%", padding: "14px 16px", borderRadius: 10, border: `1px solid ${C.border}`,
                        background: "rgba(255,255,255,0.04)", color: C.text, fontSize: 28, fontWeight: 800,
                        fontFamily: "inherit", outline: "none", textAlign: "center", boxSizing: "border-box",
                      }}
                    />
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      {["50", "100", "500"].map(amt => (
                        <button key={amt} onClick={() => setAutoBudget(amt)}
                          style={{
                            flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
                            border: autoBudget === amt ? `1px solid ${C.match}60` : `1px solid ${C.border}`,
                            background: autoBudget === amt ? `${C.match}15` : "rgba(255,255,255,0.03)",
                            color: autoBudget === amt ? C.match : C.muted,
                            cursor: "pointer", fontFamily: "inherit",
                          }}>${amt}</button>
                      ))}
                    </div>
                    {/* Slider */}
                    <input type="range" min="10" max="1000" step="10"
                      value={autoBudget || 100}
                      onChange={e => setAutoBudget(e.target.value)}
                      style={{ width: "100%", marginTop: 12, accentColor: C.match }}
                    />
                  </div>

                  {/* Strategy cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                    {STRATEGIES.map(s => {
                      const sel = autoStrategy === s.id;
                      return (
                        <div key={s.id} onClick={() => setAutoStrategy(s.id)}
                          style={{
                            border: sel ? `1px solid ${s.color}60` : `1px solid ${C.border}`,
                            background: sel ? `${s.color}12` : "transparent",
                            borderRadius: 12, padding: 16, cursor: "pointer", transition: "all 0.2s",
                          }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: sel ? s.color : C.text, marginBottom: 6 }}>{s.label}</div>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>{s.tag}</div>
                          <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.6 }}>
                            Max pos: {s.maxPos}<br />
                            Min score: {s.minScore}<br />
                            Min liq: {s.minLiq}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Criteria display */}
                  {(() => {
                    const strat = STRATEGIES.find(s => s.id === autoStrategy)!;
                    return (
                      <div style={{
                        background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)",
                        borderRadius: 12, padding: "14px 16px", marginBottom: 16,
                        display: "flex", justifyContent: "space-around",
                      }}>
                        {[
                          { label: "Min Score", val: String(strat.minScore) },
                          { label: "Min Liquidity", val: strat.minLiq },
                          { label: "Max Position", val: strat.maxPos },
                        ].map(c => (
                          <div key={c.label} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>{c.label}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.cyan }}>{c.val}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Activate button */}
                  <button onClick={() => setShowComingSoon(true)}
                    style={{
                      width: "100%", padding: 16, borderRadius: 12, border: "none",
                      background: "linear-gradient(135deg, #30d158, #06b6d4)",
                      fontSize: 16, fontWeight: 800, color: "white", cursor: "pointer", fontFamily: "inherit",
                    }}>
                    Activate Auto Hunt
                  </button>
                </>
              )}

              {/* When active */}
              {autoActive && (
                <div style={{ marginTop: 16 }}>
                  {/* Progress bar */}
                  <div style={{
                    background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "12px 14px", marginBottom: 12,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 6 }}>
                      <span>Spent: $0</span><span>Budget: ${autoBudget}</span>
                    </div>
                    <div style={{ height: 4, background: C.dim, borderRadius: 2 }}>
                      <div style={{ width: "0%", height: "100%", background: C.match, borderRadius: 2 }} />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setAutoActive(false)}
                      style={{
                        flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${C.border}`,
                        background: "rgba(255,255,255,0.04)", color: C.text, fontSize: 13,
                        fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}>
                      <PauseIcon size={14} /> Pause
                    </button>
                    <button onClick={() => setAutoActive(false)}
                      style={{
                        flex: 1, padding: 12, borderRadius: 10, border: "1px solid rgba(255,45,85,0.3)",
                        background: "rgba(255,45,85,0.08)", color: C.hot, fontSize: 13,
                        fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}>
                      <StopIcon size={14} /> Stop
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Coming Soon Modal ── */}
      {showComingSoon && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, padding: 20,
        }} onClick={() => setShowComingSoon(false)}>
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20,
            padding: "32px 28px", maxWidth: 340, width: "100%", textAlign: "center",
          }} onClick={e => e.stopPropagation()}>
            <ShieldIcon size={32} color={C.indigo} />
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginTop: 14 }}>Coming Soon</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
              Wallet infrastructure is in progress. Trading will be live in a future update.
            </div>
            <button onClick={() => setShowComingSoon(false)}
              style={{
                marginTop: 20, padding: "10px 28px", borderRadius: 10, border: "none",
                background: C.indigo, color: "white", fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}>Got it</button>
          </div>
        </div>
      )}

      {/* Bottom spacer */}
      <div style={{ height: 96 }} />

      {/* Mobile Tab Bar */}
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
        @keyframes hunt-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
