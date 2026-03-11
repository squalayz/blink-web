"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChainBadge } from "@/components/hunt-token-card";
import MobileTabBar from "@/components/mobile-tab-bar";
import TabInfoBanner from "@/components/TabInfoBanner";
import HuntWalletBar from "@/components/HuntWalletBar";
import HuntTradePanel from "@/components/HuntTradePanel";
import MeshScope from "@/components/MeshScope";

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


// ── SVG Icons ──

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


const MODE_DESC: Record<string, string> = {
  scout: "Live 3-column token scanner. AI highlights picks.",
  hunt: "Select a token and trade manually. AI guides you.",
  auto: "Set budget + strategy. Agent trades for you.",
};

const MODE_LABELS: Record<string, string> = {
  scout: "SCOPE",
  hunt: "TRADE",
  auto: "AUTO",
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
  const [chain, setChain] = useState("base");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(50);
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

  // Wallet & trading state
  const [walletEth, setWalletEth] = useState(0);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [quickAmount, setQuickAmount] = useState(50);
  const [tradeToast, setTradeToast] = useState<{ message: string; txHash: string } | null>(null);
  const [positions, setPositions] = useState<Array<{ symbol: string; address: string; totalBuy: number; totalSell: number; netEth: number }>>([]);

  // Live ticker prices
  const TRACKED_TOKENS = useRef([
    { symbol: "WETH", address: "0x4200000000000000000000000000000000000006", chain: "base" },
    { symbol: "AERO", address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631", chain: "base" },
    { symbol: "BRETT", address: "0x532f27101965dd16442E59d40670FaF5eBB142E4", chain: "base" },
    { symbol: "TOSHI", address: "0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4", chain: "base" },
    { symbol: "DEGEN", address: "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", chain: "base" },
  ]).current;
  const [tickerPrices, setTickerPrices] = useState<Record<string, { price: number; change: number }>>({});

  const fetchTickerPrices = useCallback(async () => {
    try {
      const addresses = TRACKED_TOKENS.map(t => t.address).join(",");
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/base/${addresses}`, { cache: "no-store" });
      const pairs = await res.json();
      const pairsArr = Array.isArray(pairs) ? pairs : pairs?.pairs || [];
      const priceMap: Record<string, { price: number; change: number }> = {};
      for (const tk of TRACKED_TOKENS) {
        const matching = pairsArr.filter((p: any) =>
          p.baseToken?.address?.toLowerCase() === tk.address.toLowerCase()
        );
        if (matching.length > 0) {
          const best = matching.sort((a: any, b: any) =>
            parseFloat(b.liquidity?.usd || "0") - parseFloat(a.liquidity?.usd || "0")
          )[0];
          priceMap[tk.symbol] = {
            price: parseFloat(best.priceUsd || "0"),
            change: parseFloat(best.priceChange?.h1 || "0"),
          };
        }
      }
      setTickerPrices(priceMap);
    } catch {}
  }, [TRACKED_TOKENS]);

  useEffect(() => {
    fetchTickerPrices();
    const iv = setInterval(fetchTickerPrices, 10000);
    return () => clearInterval(iv);
  }, [fetchTickerPrices]);

  // ── Wallet fetch ──
  const fetchWallet = useCallback(() => {
    fetch("/api/wallet").then(r => r.json()).then(data => {
      if (data.balance_eth != null) setWalletEth(data.balance_eth);
      if (data.wallet_address) setWalletAddress(data.wallet_address);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchWallet();
    const wiv = setInterval(fetchWallet, 15000);
    return () => clearInterval(wiv);
  }, [fetchWallet]);

  // ── Positions from trade_logs ──
  useEffect(() => {
    fetch("/api/trades?limit=100").then(r => r.json()).then(data => {
      if (!data.trades) return;
      const map: Record<string, { symbol: string; address: string; totalBuy: number; totalSell: number }> = {};
      for (const t of data.trades) {
        const key = t.token_symbol || "?";
        if (!map[key]) map[key] = { symbol: key, address: t.token_address || "", totalBuy: 0, totalSell: 0 };
        if (t.action === "buy") map[key].totalBuy += t.amount || 0;
        else if (t.action === "sell") map[key].totalSell += t.amount || 0;
      }
      const pos = Object.values(map)
        .map(p => ({ ...p, netEth: p.totalBuy - p.totalSell }))
        .filter(p => p.netEth > 0.0001);
      setPositions(pos);
    }).catch(() => {});
  }, [tradeToast]);

  function handleTradeComplete(result: Record<string, unknown>) {
    const msg = (result.message as string) || "Trade executed!";
    const hash = (result.txHash as string) || "";
    setTradeToast({ message: msg, txHash: hash });
    fetchWallet();
    setTimeout(() => setTradeToast(null), 5000);
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

  // Main list: poll every 10s in scout/hunt, 30s in auto
  const pollInterval = huntMode === 'auto' ? 30000 : 10000;
  useEffect(() => {
    const iv = setInterval(() => fetchTokens(), pollInterval);
    return () => clearInterval(iv);
  }, [fetchTokens, pollInterval]);

  // Fast single-token refresh for selected token in HUNT mode (5s)
  useEffect(() => {
    if (huntMode !== 'hunt' || !selectedToken) return;
    const fastPoll = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/hunt/tokens/single?chain=${selectedToken.chainId}&address=${selectedToken.address}`
        );
        const data = await res.json();
        if (data.token) {
          setSelectedToken(data.token);
          setTokens(prev => prev.map(t =>
            t.address === data.token.address ? { ...t, ...data.token, score: t.score, tags: t.tags } : t
          ));
        }
      } catch {}
    }, 5000);
    return () => clearInterval(fastPoll);
  }, [huntMode, selectedToken?.address, selectedToken?.chainId]);

  function handleSearch(val: string) {
    setQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { fetchTokens(val || undefined); }, 500);
  }

  const hotCount = tokens.filter(t => t.score >= 80).length;

  // ── Mode colors ──
  const modeColors: Record<string, string> = { scout: C.indigo, hunt: C.hot, auto: C.match };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Outfit', sans-serif",
      paddingTop: 64, overflowX: "hidden", isolation: "isolate",
    }}>

      {/* ── Desktop Tab Nav (hidden on mobile — mobile uses MobileTabBar) ── */}
      <div className="mm-hunt-desktop-nav" style={{ padding: "8px 16px 0", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
          {[
            { label: "Connect", href: "/dashboard?tab=mesh", icon: <svg width="13" height="13" viewBox="0 0 28 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="7" cy="13" r="5"/><circle cx="21" cy="13" r="5"/><path d="M12 13h4"/><path d="M7 8V5l3-3h8l3 3v3"/><path d="M12 8h4"/></svg> },
            { label: "MeshScope", href: "/hunt", active: true, icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg> },
            { label: "Feed", href: "/dashboard?tab=feed", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49" opacity="0.6"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49" opacity="0.6"/></svg> },
            { label: "Discover", href: "/dashboard?tab=discover", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="3"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" strokeLinecap="round"/><circle cx="17" cy="8" r="2.5" opacity="0.6"/></svg> },
            { label: "Wallet", href: "/dashboard?tab=brew", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="14" r="1.5" fill="currentColor" stroke="none"/></svg> },
            { label: "Agent", href: "/dashboard?tab=agent", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.16A2.5 2.5 0 0 1 6 10V4.5A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.16A2.5 2.5 0 0 0 18 10V4.5A2.5 2.5 0 0 0 14.5 2Z"/></svg> },
          ].map(t => (
            <a key={t.label} href={t.href} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: "22px 22px 0 0",
              background: t.active ? "linear-gradient(135deg, rgba(255,45,85,0.2), rgba(99,102,241,0.12))" : "rgba(255,255,255,0.03)",
              border: t.active ? `1px solid rgba(255,45,85,0.4)` : `1px solid rgba(255,255,255,0.06)`,
              borderBottom: t.active ? `1px solid ${C.bg}` : `1px solid rgba(255,255,255,0.06)`,
              color: t.active ? C.hot : C.muted,
              fontSize: 12, fontWeight: t.active ? 700 : 500,
              textDecoration: "none", whiteSpace: "nowrap",
              boxShadow: t.active ? "0 0 16px rgba(255,45,85,0.2)" : "none",
              transition: "all 0.2s",
            }}>
              {t.icon}{t.label}
            </a>
          ))}
        </div>
      </div>
      <style>{`.mm-hunt-desktop-nav{display:none}@media(min-width:641px){.mm-hunt-desktop-nav{display:block}}`}</style>

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

      {/* ── Live Price Ticker ── */}
      {Object.keys(tickerPrices).length > 0 && (
        <div style={{
          background: "rgba(13,13,20,0.9)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          padding: "6px 16px", overflow: "hidden", whiteSpace: "nowrap",
          fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
          marginBottom: 4,
        }}>
          <div style={{ display: "inline-block", animation: "hunt-ticker 40s linear infinite" }}>
            {[...TRACKED_TOKENS, ...TRACKED_TOKENS].map((tk, i) => {
              const data = tickerPrices[tk.symbol];
              if (!data) return null;
              const priceStr = data.price >= 1 ? `$${data.price.toFixed(2)}` : data.price >= 0.01 ? `$${data.price.toFixed(4)}` : `$${data.price.toPrecision(4)}`;
              return (
                <span key={`${tk.symbol}-${i}`} style={{ marginRight: 32 }}>
                  <span style={{ color: "#e8e8f0", fontWeight: 700 }}>{tk.symbol}</span>
                  {" "}
                  <span style={{ color: "#a0a0b0" }}>{priceStr}</span>
                  {" "}
                  <span style={{ color: data.change >= 0 ? "#30d158" : "#ff2d55", fontWeight: 700 }}>
                    {data.change >= 0 ? "+" : ""}{data.change.toFixed(1)}%
                  </span>
                  {i < TRACKED_TOKENS.length * 2 - 1 && (
                    <span style={{ color: "rgba(255,255,255,0.15)", margin: "0 12px" }}>&middot;</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

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
                {MODE_LABELS[mode]}
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

      {/* ══════════════════════════ SCOPE MODE ══════════════════════════ */}
      {huntMode === "scout" && (
        <MeshScope
          tokens={tokens}
          loading={loading}
          walletEth={walletEth}
          walletAddress={walletAddress}
          onTokenSelect={(token) => {
            setSelectedToken(token);
            setHuntMode("hunt");
          }}
          quickAmount={quickAmount}
          chain={chain}
          onChainChange={setChain}
          query={query}
          onSearch={handleSearch}
        />
      )}

      {/* ══════════════════════════ TRADE MODE ══════════════════════════ */}
      {huntMode === "hunt" && (
        <div style={{ display: "flex", height: "calc(100vh - 130px)", overflow: "hidden" }}>

          {/* ── LEFT: Token List ── */}
          <div style={{
            width: 260, flexShrink: 0, display: "flex", flexDirection: "column",
            borderRight: `1px solid ${C.border}`, background: "rgba(10,10,15,0.98)",
          }}>
            {/* Wallet summary */}
            <div style={{
              padding: "10px 14px", borderBottom: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 111 111" fill="#0052FF"><path d="M54.921 110.034C85.359 110.034 110.034 85.359 110.034 54.921C110.034 24.484 85.359 -0.191 54.921 -0.191C26.066 -0.191 2.258 22.515 0 51.169H72.943V58.674H0C2.258 87.327 26.066 110.034 54.921 110.034Z"/></svg>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: C.text }}>
                  {walletEth.toFixed(4)} ETH
                </span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {[25, 50, 100].map(amt => (
                  <button key={amt} onClick={() => setQuickAmount(amt)} style={{
                    padding: "3px 7px", borderRadius: 5, border: "none", cursor: "pointer",
                    fontSize: 9, fontWeight: 800, fontFamily: "inherit",
                    background: quickAmount === amt ? "rgba(48,209,88,0.2)" : "rgba(255,255,255,0.05)",
                    color: quickAmount === amt ? C.match : C.muted,
                  }}>${amt}</button>
                ))}
              </div>
            </div>
            {/* Search + chain */}
            <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "7px 10px",
                marginBottom: 6,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" placeholder="Search..." value={query}
                  onChange={e => handleSearch(e.target.value)}
                  style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: 12, fontFamily: "inherit" }}
                />
              </div>
              <div style={{ display: "flex", gap: 4, overflowX: "auto", scrollbarWidth: "none" }}>
                {CHAINS.map(c => (
                  <button key={c.id} onClick={() => setChain(c.id)} style={{
                    padding: "3px 9px", borderRadius: 12, flexShrink: 0, border: "none", cursor: "pointer",
                    background: chain === c.id ? `${C.hot}20` : "rgba(255,255,255,0.04)",
                    color: chain === c.id ? C.hot : C.muted,
                    fontSize: 10, fontWeight: 700, fontFamily: "inherit",
                  }}>{c.label}</button>
                ))}
              </div>
            </div>
            {/* Positions */}
            {positions.length > 0 && (
              <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Positions</div>
                {positions.map(pos => (
                  <div key={pos.symbol} onClick={() => { const t = tokens.find(tk => tk.symbol === pos.symbol); if (t) setSelectedToken(t); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", cursor: "pointer" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.match }}>${pos.symbol}</span>
                    <span style={{ fontSize: 10, color: C.muted, flex: 1 }}>{pos.netEth.toFixed(4)} ETH</span>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                ))}
              </div>
            )}
            {/* Token rows */}
            <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
              {loading && tokens.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", fontSize: 11, color: C.muted }}>Loading...</div>
              )}
              {tokens.map(token => {
                const isSelected = selectedToken?.address === token.address;
                const pch = token.priceChange1h || 0;
                const scoreColor = token.score >= 80 ? C.match : token.score >= 60 ? "#f59e0b" : C.muted;
                return (
                  <div key={`${token.chainId}-${token.address}`} onClick={() => setSelectedToken(token)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "9px 12px", cursor: "pointer",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      borderLeft: isSelected ? `2px solid ${C.indigo}` : "2px solid transparent",
                      background: isSelected ? "rgba(99,102,241,0.08)" : "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: C.text }}>${token.symbol}</span>
                        <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 4px", borderRadius: 3,
                          background: "rgba(0,82,255,0.15)", color: "#0052FF" }}>
                          {token.chainId === "ethereum" ? "ETH" : token.chainId === "arbitrum" ? "ARB" : token.chainId === "bsc" ? "BSC" : token.chainId === "solana" ? "SOL" : "Base"}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{token.name}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: C.text }}>{fmtPrice(token.price)}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: pch >= 0 ? C.match : C.hot }}>{pch >= 0 ? "+" : ""}{pch.toFixed(1)}%</div>
                    </div>
                    <div style={{ width: 5, height: 28, borderRadius: 3, background: C.dim, overflow: "hidden", flexShrink: 0 }}>
                      <div style={{ width: "100%", height: `${Math.min(token.score, 100)}%`, background: scoreColor, marginTop: "auto" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT: Trade Panel ── */}
          <div style={{ flex: 1, overflowY: "auto", background: C.bg }}>
            {selectedToken ? (
              <HuntTradePanel
                token={selectedToken}
                walletEth={walletEth}
                quickAmount={quickAmount}
                onTradeComplete={handleTradeComplete}
              />
            ) : (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                height: "100%", gap: 16, padding: 40,
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.hot} strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                    <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
                    <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
                  </svg>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>Select a token to trade</div>
                  <div style={{ fontSize: 12, color: C.muted }}>Click any token from the list on the left</div>
                </div>
              </div>
            )}
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

      {/* Trade success toast */}
      {tradeToast && (
        <div style={{
          position: "fixed", bottom: 96, left: "50%", transform: "translateX(-50%)",
          background: "rgba(48,209,88,0.1)", border: "1px solid rgba(48,209,88,0.3)",
          borderRadius: 12, padding: "12px 20px", zIndex: 200,
          fontSize: 13, fontWeight: 700, color: C.match,
          animation: "hunt-toast-up 0.3s ease",
          display: "flex", alignItems: "center", gap: 8, maxWidth: "90vw",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.match} strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tradeToast.message}
          </span>
          {tradeToast.txHash && (
            <a href={`https://basescan.org/tx/${tradeToast.txHash}`} target="_blank" rel="noopener noreferrer"
              style={{ color: C.cyan, fontSize: 11, textDecoration: "none", flexShrink: 0 }}>
              View
            </a>
          )}
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
        @keyframes hunt-toast-up {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
