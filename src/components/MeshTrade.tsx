"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  MouseEvent as ReactMouseEvent,
} from "react";

// ═══════════════════════════════════════════════════════════
// MeshTrade v2 — AI Agent Trading Galaxy
// ═══════════════════════════════════════════════════════════

const C = {
  bg: "#0a0a0f",
  surface: "#0d0d14",
  s2: "#1a1a24",
  indigo: "#6366f1",
  cyan: "#06b6d4",
  match: "#30d158",
  hot: "#ff2d55",
  gold: "#ffd700",
  text: "#e8e8f0",
  muted: "#6b6b80",
  dim: "#2a2a3a",
  border: "rgba(255,255,255,0.07)",
  lime: "#a3e635",
  orange: "#f97316",
  yellow: "#f59e0b",
  baseBg: "rgba(0,82,255,0.06)",
  baseBorder: "rgba(0,82,255,0.2)",
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

interface Position {
  tokenAddress: string;
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  amount: number;
  pnl: number;
  pnlPercent: number;
}

interface LogEntry {
  ts: number;
  status: "scanning" | "analyzing" | "bought" | "profit" | "loss" | "signal" | "hold" | "error" | "info";
  message: string;
}

interface Settings {
  aggression: number;
  maxTrade: number;
  stopLoss: number;
  takeProfit: number;
  unleashed: boolean;
}

type Mood = "HUNGRY" | "SCANNING" | "LOCKED IN" | "COOLING" | "DORMANT";

interface MeshTradeProps {
  user: any;
  agent: any;
  wallet: any;
  onFundWallet?: () => void;
}

// ── Helpers ──────────────────────────────────────────────

function hashPos(addr: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < addr.length; i++)
    h = ((h << 5) - h) + addr.charCodeAt(i);
  return ((h >>> 0) % 75) + 10;
}

function formatPrice(p: number): string {
  if (p === 0) return "$0.00";
  if (p < 0.01) return "$" + p.toFixed(6);
  if (p < 1) return "$" + p.toFixed(4);
  return "$" + p.toFixed(2);
}

function formatDollar(n: number): string {
  if (Math.abs(n) >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return "$" + (n / 1_000).toFixed(1) + "K";
  return "$" + n.toFixed(2);
}

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(0);
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return (
    String(d.getHours()).padStart(2, "0") +
    ":" +
    String(d.getMinutes()).padStart(2, "0") +
    ":" +
    String(d.getSeconds()).padStart(2, "0")
  );
}

function formatAge(ts: number): string {
  const mins = (Date.now() - ts) / 60000;
  if (mins < 60) return Math.round(mins) + "m";
  if (mins < 1440) return (mins / 60).toFixed(1) + "h";
  return (mins / 1440).toFixed(1) + "d";
}

function orbSize(mcap: number): number {
  return Math.max(14, Math.min(56, Math.log10(Math.max(mcap || 1, 1)) / 10 * 42 + 14));
}

function orbColor(change1h: number): string {
  if (change1h > 10) return C.match;
  if (change1h > 5) return C.lime;
  if (change1h > 0) return C.cyan;
  if (change1h > -5) return C.yellow;
  if (change1h > -10) return C.orange;
  return C.hot;
}

function orbGlow(change1h: number): string {
  if (change1h > 10) return `0 0 12px 4px ${C.match}55`;
  if (change1h < -10) return `0 0 12px 4px ${C.hot}55`;
  return "none";
}

function pulseDuration(pairCreatedAt: number): string {
  const ageHours = (Date.now() - pairCreatedAt) / 3600000;
  if (ageHours < 1) return "1.2s";
  if (ageHours < 6) return "2s";
  if (ageHours < 24) return "3s";
  return "4.5s";
}

const LOG_DOT_COLORS: Record<string, string> = {
  scanning: C.cyan,
  analyzing: C.gold,
  bought: C.match,
  profit: C.match,
  loss: C.hot,
  signal: C.indigo,
  hold: C.cyan,
  error: C.hot,
  info: C.muted,
};

const MOOD_CONFIG: Record<Mood, { color: string; label: string }> = {
  HUNGRY: { color: C.hot, label: "hunting aggressively" },
  SCANNING: { color: C.cyan, label: "looking for signals" },
  "LOCKED IN": { color: C.match, label: "in position" },
  COOLING: { color: C.muted, label: "after a loss" },
  DORMANT: { color: C.dim, label: "no brain connected" },
};

// ── Keyframes Style Tag ──────────────────────────────────

const KEYFRAMES = `
@keyframes mt-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
@keyframes mt-drift {
  0% { transform: translate(0, 0); }
  25% { transform: translate(6px, -4px); }
  50% { transform: translate(-3px, 7px); }
  75% { transform: translate(5px, 3px); }
  100% { transform: translate(0, 0); }
}
@keyframes mt-scan-line {
  0% { opacity: 0.15; }
  50% { opacity: 0.5; }
  100% { opacity: 0.15; }
}
@keyframes mt-ticker {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes mt-live-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
@keyframes mt-glow {
  0%, 100% { box-shadow: 0 0 12px 3px rgba(99,102,241,0.4); }
  50% { box-shadow: 0 0 24px 8px rgba(99,102,241,0.7); }
}
@keyframes mt-unleash-pulse {
  0%, 100% { box-shadow: 0 0 8px 2px rgba(255,45,85,0.3); border-color: rgba(255,45,85,0.6); }
  50% { box-shadow: 0 0 20px 6px rgba(255,45,85,0.6); border-color: rgba(255,45,85,1); }
}
@keyframes mt-modal-up {
  0% { transform: translateY(100%); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes mt-orb-pulse {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.12); opacity: 1; }
}
@keyframes mt-dash {
  0% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -20; }
}
@media (max-width: 640px) {
  .mt-layout { flex-direction: column !important; }
  .mt-brain { width: 100% !important; max-width: 100% !important; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.07) !important; }
  .mt-galaxy { min-height: 320px !important; height: 320px !important; }
  .mt-log { width: 100% !important; max-width: 100% !important; border-left: none !important; border-top: 1px solid rgba(255,255,255,0.07) !important; max-height: 320px !important; }
  .mt-wallet-bar { flex-wrap: wrap !important; }
}
`;

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function MeshTrade({ user, agent, wallet, onFundWallet }: MeshTradeProps) {
  // ── State ──
  const [tokens, setTokens] = useState<Token[]>([]);
  const [settings, setSettings] = useState<Settings>({
    aggression: 50,
    maxTrade: 50,
    stopLoss: 15,
    takeProfit: 50,
    unleashed: false,
  });
  const [mood, setMood] = useState<Mood>("DORMANT");
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [sessionStats, setSessionStats] = useState({ trades: 0, pnl: 0 });
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [hint, setHint] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredToken, setHoveredToken] = useState<Token | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [scanTargets, setScanTargets] = useState<number[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  const settingsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tokenIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const triggerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const galaxyRef = useRef<HTMLDivElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  const brainConnected = !!user?.ai_api_key_encrypted;
  const GAS_RESERVE = 0.002;

  // ── Computed ──
  const walletEth = wallet?.balance_eth ?? 0;
  const walletUsd = wallet?.balance_usd ?? 0;
  const inPositions = positions.reduce((s, p) => s + (p.amount * p.entryPrice), 0);
  const available = Math.max(0, walletEth - GAS_RESERVE);

  // ── Computed Mood ──
  const computeMood = useCallback(
    (pos: Position[], toks: Token[], unleashed: boolean): Mood => {
      if (!brainConnected || !unleashed) return "DORMANT";
      if (pos.length > 0) {
        const totalPnl = pos.reduce((s, p) => s + p.pnl, 0);
        if (totalPnl < -10) return "COOLING";
        return "LOCKED IN";
      }
      const highScore = toks.some((t) => t.score >= 80);
      if (highScore) return "HUNGRY";
      return "SCANNING";
    },
    [brainConnected]
  );

  // ── Fetch tokens ──
  const fetchTokens = useCallback(async () => {
    try {
      const q = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : "";
      const res = await fetch(`/api/hunt/tokens?chains=base${q}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        if (data.tokens) setTokens(data.tokens);
      }
    } catch {
      /* silent */
    }
  }, [searchQuery]);

  // ── Fetch agent state ──
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/meshtrade/state");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
        if (data.positions) setPositions(data.positions);
        if (data.logEntries && data.logEntries.length > 0) {
          const mapped: LogEntry[] = data.logEntries.map((e: any) => ({
            ts: new Date(e.created_at).getTime(),
            status: mapLogType(e.type),
            message: e.message,
          }));
          setLogEntries(mapped);
        }
        if (data.sessionStats) setSessionStats(data.sessionStats);
        if (data.watchlist) setWatchlist(data.watchlist);
      }
    } catch {
      /* silent */
    }
  }, []);

  // ── Map DB log type to UI status ──
  function mapLogType(type: string): LogEntry["status"] {
    const map: Record<string, LogEntry["status"]> = {
      scan: "scanning", signal: "signal", entry: "bought", hold: "hold",
      exit_win: "profit", exit_loss: "loss", point: "signal", reject: "info", error: "error",
    };
    return map[type] || "info";
  }

  // ── Save settings (debounced) ──
  const saveSettings = useCallback((s: Settings) => {
    if (settingsTimerRef.current) clearTimeout(settingsTimerRef.current);
    settingsTimerRef.current = setTimeout(async () => {
      try {
        await fetch("/api/meshtrade/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
        });
      } catch {
        /* silent */
      }
    }, 1000);
  }, []);

  // ── Update a setting ──
  const updateSetting = useCallback(
    (key: keyof Settings, value: number | boolean) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        saveSettings(next);
        return next;
      });
    },
    [saveSettings]
  );

  // ── Trigger trading cycle ──
  const triggerTrade = useCallback(async () => {
    if (!brainConnected || !settings.unleashed) return;
    try {
      const res = await fetch("/api/trading/trigger", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        let entry: LogEntry | null = null;
        if (data.action === "buy" || data.action === "entry") {
          entry = { ts: Date.now(), status: "bought", message: `Bought ${data.token || "token"} -- ${data.reasoning || ""}` };
        } else if (data.action === "sell" || data.action === "exit_win" || data.action === "exit_loss") {
          entry = { ts: Date.now(), status: data.action === "exit_loss" ? "loss" : "profit", message: `Sold ${data.token || "token"} -- ${data.reasoning || ""}` };
        } else if (data.action === "hold" || data.action === "skip") {
          entry = { ts: Date.now(), status: "hold", message: data.reasoning || `Analyzed tokens -- holding for better signal` };
        } else if (data.error) {
          entry = { ts: Date.now(), status: "error", message: data.error };
        }
        if (entry) {
          setLogEntries((prev) => [entry!, ...prev.slice(0, 49)]);
        }
        // Refresh state after trigger
        fetchState();
      }
    } catch (err: any) {
      setLogEntries((prev) => [
        { ts: Date.now(), status: "error", message: err.message || "Trigger failed" },
        ...prev.slice(0, 49),
      ]);
    }
  }, [brainConnected, settings.unleashed, fetchState]);

  // ── Unleash toggle ──
  const toggleUnleash = useCallback(() => {
    if (!brainConnected) return;
    if (settings.unleashed) {
      if (!confirm("Stop hunting?")) return;
    }
    const next = !settings.unleashed;
    updateSetting("unleashed", next);
    if (next) {
      // Trigger immediately on unleash
      setTimeout(() => triggerTrade(), 500);
    }
  }, [settings.unleashed, updateSetting, brainConnected, triggerTrade]);

  // ── Point agent action ──
  const pointAgent = useCallback(
    async (action: "point" | "buy_now" | "watch") => {
      if (!selectedToken) return;
      try {
        await fetch("/api/meshtrade/point", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            tokenAddress: selectedToken.address,
            symbol: selectedToken.symbol,
            hint: hint || undefined,
          }),
        });
        const actionLabel =
          action === "buy_now"
            ? "BUY order sent"
            : action === "point"
            ? "Agent pointed"
            : "Added to watchlist";
        setLogEntries((prev) => [
          {
            ts: Date.now(),
            status: action === "buy_now" ? "bought" : "signal",
            message: `${actionLabel}: ${selectedToken.symbol}`,
          },
          ...prev.slice(0, 49),
        ]);
        if (action === "watch") {
          setWatchlist((prev) => [...prev, selectedToken.address]);
        }
      } catch {
        /* silent */
      }
      setSelectedToken(null);
      setHint("");
    },
    [selectedToken, hint]
  );

  // ── Force sell ──
  const forceSell = useCallback(async (tokenAddress: string) => {
    try {
      await fetch("/api/meshtrade/point", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "force_sell", tokenAddress }),
      });
      setPositions((prev) => prev.filter((p) => p.tokenAddress !== tokenAddress));
    } catch {
      /* silent */
    }
  }, []);

  // ── Mood recalculation ──
  useEffect(() => {
    setMood(computeMood(positions, tokens, settings.unleashed));
  }, [positions, tokens, settings.unleashed, computeMood]);

  // ── Scan targets rotation ──
  useEffect(() => {
    if (mood !== "SCANNING" || tokens.length < 3) {
      setScanTargets([]);
      return;
    }
    const pick = () => {
      const sorted = [...tokens].sort((a, b) => b.score - a.score).slice(0, 10);
      const idxs: number[] = [];
      while (idxs.length < Math.min(3, sorted.length)) {
        const r = Math.floor(Math.random() * sorted.length);
        const realIdx = tokens.indexOf(sorted[r]);
        if (!idxs.includes(realIdx)) idxs.push(realIdx);
      }
      setScanTargets(idxs);
    };
    pick();
    const iv = setInterval(pick, 4000);
    return () => clearInterval(iv);
  }, [mood, tokens]);

  // ── Polling: tokens ──
  useEffect(() => {
    fetchTokens();
    tokenIntervalRef.current = setInterval(fetchTokens, 10000);
    return () => {
      if (tokenIntervalRef.current) clearInterval(tokenIntervalRef.current);
    };
  }, [fetchTokens]);

  // ── Polling: agent state ──
  useEffect(() => {
    fetchState();
    const ms = settings.unleashed ? 5000 : 15000;
    stateIntervalRef.current = setInterval(fetchState, ms);
    return () => {
      if (stateIntervalRef.current) clearInterval(stateIntervalRef.current);
    };
  }, [fetchState, settings.unleashed]);

  // ── Polling: trigger (every 60s when unleashed) ──
  useEffect(() => {
    if (triggerIntervalRef.current) clearInterval(triggerIntervalRef.current);
    if (settings.unleashed && brainConnected) {
      triggerIntervalRef.current = setInterval(triggerTrade, 60000);
    }
    return () => {
      if (triggerIntervalRef.current) clearInterval(triggerIntervalRef.current);
    };
  }, [settings.unleashed, brainConnected, triggerTrade]);

  // ── Filtered tokens ──
  const filteredTokens = useMemo(() => {
    if (!searchQuery) return tokens;
    const q = searchQuery.toLowerCase();
    return tokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q)
    );
  }, [tokens, searchQuery]);

  // ── Star field (80+ background dots) ──
  const stars = useMemo(() => {
    const s: { x: number; y: number; size: number; opacity: number }[] = [];
    for (let i = 0; i < 90; i++) {
      s.push({
        x: ((i * 7 + 13) * 97) % 100,
        y: ((i * 11 + 29) * 83) % 100,
        size: 1 + (i % 2),
        opacity: 0.1 + (((i * 31) % 4) / 10),
      });
    }
    return s;
  }, []);

  // ── Ticker tokens (top 5) ──
  const tickerTokens = useMemo(() => tokens.slice(0, 5), [tokens]);

  // ── Honest log display ──
  const displayLog = useMemo((): LogEntry[] => {
    if (!brainConnected) {
      return [{ ts: Date.now(), status: "info", message: "AI Brain not connected -- connect your API key in the Agent tab to activate MeshTrade" }];
    }
    if (logEntries.length > 0) return logEntries.slice(0, 50);
    if (settings.unleashed) {
      return [{ ts: Date.now(), status: "scanning", message: "Analyzing market... first scan running" }];
    }
    return [{ ts: Date.now(), status: "info", message: "Brain connected. Hit UNLEASH to start hunting." }];
  }, [brainConnected, logEntries, settings.unleashed]);

  // ═════════════════════════════════════════════════════════
  // SUB-RENDERS
  // ═════════════════════════════════════════════════════════

  // ── Wallet Bar ──
  function renderWalletBar() {
    const addr = wallet?.address || user?.wallet_address || "";
    const truncAddr = addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "No wallet";
    const lowBalance = walletEth < GAS_RESERVE;

    return (
      <div
        className="mt-wallet-bar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "8px 16px",
          background: C.baseBg,
          borderBottom: `1px solid ${C.baseBorder}`,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          flexShrink: 0,
          overflowX: "auto",
        }}
      >
        {/* Base logo */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" stroke="#0052FF" strokeWidth="2" />
          <text x="12" y="16" textAnchor="middle" fill="#0052FF" fontSize="12" fontWeight="700">B</text>
        </svg>
        <span style={{ color: C.muted }}>{truncAddr}</span>
        <span style={{ color: C.text, fontWeight: 700 }}>{walletEth.toFixed(4)} ETH</span>
        <span style={{ color: C.muted }}>{formatDollar(walletUsd)}</span>
        <span style={{ color: C.muted }}>In Positions: <span style={{ color: C.text }}>{formatDollar(inPositions)}</span></span>
        <span style={{ color: C.muted }}>Available: <span style={{ color: C.text }}>{available.toFixed(4)} ETH</span></span>
        {lowBalance && (
          <span style={{ color: C.orange, fontWeight: 600, fontSize: 10 }}>Low balance -- min 0.002 ETH needed</span>
        )}
        {onFundWallet && (
          <button
            onClick={onFundWallet}
            style={{
              marginLeft: "auto",
              padding: "4px 12px",
              borderRadius: 6,
              border: `1px solid ${C.indigo}44`,
              background: C.indigo + "20",
              color: C.indigo,
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Fund Wallet
          </button>
        )}
      </div>
    );
  }

  // ── Zone 1: Brain Panel ──
  function renderBrainPanel() {
    const moodCfg = MOOD_CONFIG[mood];
    const agentName = agent?.agent_name || "AGENT";
    const orbDim = !brainConnected;

    return (
      <div
        className="mt-brain"
        style={{
          width: 280,
          minWidth: 280,
          background: C.surface,
          borderRight: `1px solid ${C.border}`,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          overflowY: "auto",
        }}
      >
        {/* Plasma Orb */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: orbDim
                ? "radial-gradient(circle at 35% 35%, #3a3a50, #2a2a3a)"
                : "radial-gradient(circle at 35% 35%, #6366f1, #06b6d4, #4f46e5)",
              boxShadow: orbDim
                ? "0 0 12px 3px rgba(60,60,80,0.3)"
                : "0 0 30px 8px rgba(99,102,241,0.5), 0 0 60px 16px rgba(6,182,212,0.2)",
              animation: orbDim ? "none" : "mt-pulse 2.5s ease-in-out infinite",
            }}
          />
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.text,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {agentName}
          </div>

          {/* Mood Pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 20,
              background: moodCfg.color + "22",
              border: `1px solid ${moodCfg.color}44`,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: moodCfg.color,
                animation: mood !== "DORMANT" ? "mt-live-dot 1.5s infinite" : "none",
              }}
            />
            <span style={{ fontSize: 13, color: moodCfg.color, fontWeight: 600 }}>{mood}</span>
            <span style={{ fontSize: 10, color: C.muted }}>{moodCfg.label}</span>
          </div>
        </div>

        {/* Brain offline notice */}
        {!brainConnected && (
          <div style={{
            background: C.hot + "12",
            border: `1px solid ${C.hot}33`,
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 11,
            color: C.hot,
            lineHeight: 1.5,
            textAlign: "center",
          }}>
            AI Brain not connected -- connect your API key in the Agent tab to activate MeshTrade
          </div>
        )}

        {/* Sliders */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {renderSlider("AGGRESSION", 0, 100, settings.aggression, (v) =>
            updateSetting("aggression", v)
          )}
          {renderSlider("MAX TRADE", 5, 500, settings.maxTrade, (v) =>
            updateSetting("maxTrade", v), "$"
          )}
          {renderSlider("STOP LOSS", 5, 30, settings.stopLoss, (v) =>
            updateSetting("stopLoss", v), "", "%"
          )}
          {renderSlider("TAKE PROFIT", 10, 300, settings.takeProfit, (v) =>
            updateSetting("takeProfit", v), "", "%"
          )}
        </div>

        {/* Unleash Toggle */}
        <div style={{ position: "relative" }}>
          <button
            onClick={toggleUnleash}
            disabled={!brainConnected}
            title={!brainConnected ? "Connect AI brain first" : undefined}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 12,
              border: settings.unleashed
                ? `2px solid ${C.hot}`
                : `2px solid ${brainConnected ? C.indigo : C.dim}`,
              background: settings.unleashed
                ? C.hot + "20"
                : brainConnected ? C.indigo + "15" : C.dim + "15",
              color: settings.unleashed ? C.hot : brainConnected ? C.indigo : C.dim,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.12em",
              cursor: brainConnected ? "pointer" : "not-allowed",
              position: "relative",
              overflow: "hidden",
              opacity: brainConnected ? 1 : 0.5,
              animation: settings.unleashed
                ? "mt-unleash-pulse 1.5s ease-in-out infinite"
                : "none",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {settings.unleashed && (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: C.hot,
                    animation: "mt-live-dot 0.8s infinite",
                  }}
                />
              )}
              {settings.unleashed ? "HUNTING" : "UNLEASH AGENT"}
            </span>
          </button>
        </div>

        {/* Session Stats */}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{
            flex: 1,
            background: C.s2,
            borderRadius: 10,
            padding: "12px 10px",
            textAlign: "center",
            border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>
              {sessionStats.trades}
            </div>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, letterSpacing: "0.08em", marginTop: 2 }}>
              TRADES
            </div>
          </div>
          <div style={{
            flex: 1,
            background: C.s2,
            borderRadius: 10,
            padding: "12px 10px",
            textAlign: "center",
            border: `1px solid ${C.border}`,
          }}>
            <div style={{
              fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
              color: sessionStats.pnl >= 0 ? C.match : C.hot,
            }}>
              {sessionStats.pnl >= 0 ? "+" : ""}{formatDollar(sessionStats.pnl)}
            </div>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, letterSpacing: "0.08em", marginTop: 2 }}>
              PNL
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Slider helper ──
  function renderSlider(
    label: string,
    min: number,
    max: number,
    value: number,
    onChange: (v: number) => void,
    prefix?: string,
    suffix?: string
  ) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: "0.08em" }}>
            {label}
          </span>
          <span
            style={{
              fontSize: 12,
              color: C.text,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800,
            }}
          >
            {prefix || ""}
            {value}
            {suffix || ""}
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width: "100%",
            height: 4,
            appearance: "none",
            WebkitAppearance: "none",
            background: `linear-gradient(to right, ${C.indigo} 0%, ${C.indigo} ${((value - min) / (max - min)) * 100}%, ${C.dim} ${((value - min) / (max - min)) * 100}%, ${C.dim} 100%)`,
            borderRadius: 2,
            outline: "none",
            cursor: "pointer",
            accentColor: C.indigo,
          }}
        />
      </div>
    );
  }

  // ── Zone 2: Galaxy View ──
  function renderGalaxy() {
    const positionAddrs = new Set(positions.map((p) => p.tokenAddress));

    return (
      <div
        className="mt-galaxy"
        ref={galaxyRef}
        style={{
          flex: 1,
          background: C.bg,
          position: "relative",
          overflow: "hidden",
          minHeight: "calc(100vh - 160px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top Ticker */}
        <div
          style={{
            height: 32,
            background: C.surface,
            borderBottom: `1px solid ${C.border}`,
            overflow: "hidden",
            position: "relative",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 32,
              whiteSpace: "nowrap",
              animation: "mt-ticker 20s linear infinite",
              paddingTop: 7,
            }}
          >
            {[...tickerTokens, ...tickerTokens].map((t, i) => (
              <span
                key={`tick-${i}`}
                style={{
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  display: "inline-flex",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                <span style={{ color: C.text, fontWeight: 700 }}>{t.symbol}</span>
                <span style={{ color: C.muted }}>{formatPrice(t.price)}</span>
                <span
                  style={{
                    color: t.priceChange1h >= 0 ? C.match : C.hot,
                    fontWeight: 600,
                  }}
                >
                  {t.priceChange1h >= 0 ? "+" : ""}
                  {t.priceChange1h.toFixed(1)}%
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: "8px 12px", flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: C.s2,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              padding: "0 10px",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.muted}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search token or paste address..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: C.text,
                fontSize: 12,
                padding: "8px 8px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  background: "none",
                  border: "none",
                  color: C.muted,
                  cursor: "pointer",
                  fontSize: 14,
                  padding: 2,
                }}
              >
                x
              </button>
            )}
          </div>
        </div>

        {/* Star Field + Tokens */}
        <div style={{ flex: 1, position: "relative" }}>
          {/* Stars (static background dots) */}
          {stars.map((s, i) => (
            <div
              key={`star-${i}`}
              style={{
                position: "absolute",
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: s.size,
                height: s.size,
                borderRadius: "50%",
                background: "#ffffff",
                opacity: s.opacity,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Agent Orb */}
          <div
            style={{
              position: "absolute",
              left: "35%",
              top: "45%",
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: !brainConnected
                ? "radial-gradient(circle at 35% 35%, #3a3a50, #2a2a3a)"
                : "radial-gradient(circle at 35% 35%, #6366f1, #06b6d4, #4f46e5)",
              boxShadow: !brainConnected
                ? "0 0 12px 3px rgba(60,60,80,0.3)"
                : "0 0 30px 8px rgba(99,102,241,0.5), 0 0 60px 16px rgba(6,182,212,0.15)",
              animation: !brainConnected ? "none" : "mt-drift 12s ease-in-out infinite",
              zIndex: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              transform: "translate(-50%, -50%)",
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: "#fff",
                fontWeight: 800,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                opacity: 0.9,
              }}
            >
              AGENT
            </span>
          </div>
          {/* Agent label below */}
          <div style={{
            position: "absolute",
            left: "35%",
            top: "45%",
            transform: "translate(-50%, 40px)",
            fontSize: 9,
            fontWeight: 700,
            color: brainConnected ? C.indigo : C.dim,
            letterSpacing: "0.08em",
            pointerEvents: "none",
            zIndex: 20,
            textAlign: "center",
          }}>
            AGENT
          </div>

          {/* Scan Lines (dashed, animated) */}
          {mood === "SCANNING" &&
            scanTargets.map((idx) => {
              const t = filteredTokens[idx];
              if (!t) return null;
              const tx = hashPos(t.address, 17);
              const ty = hashPos(t.address, 53);
              return (
                <svg
                  key={`scan-${idx}`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    zIndex: 15,
                  }}
                >
                  <line
                    x1="35%"
                    y1="45%"
                    x2={`${tx}%`}
                    y2={`${ty}%`}
                    stroke={C.cyan}
                    strokeWidth="1"
                    strokeDasharray="6 4"
                    style={{ animation: "mt-dash 1s linear infinite, mt-scan-line 2s ease-in-out infinite" }}
                  />
                </svg>
              );
            })}

          {/* Lock Lines for open positions (thick solid glow) */}
          {filteredTokens.map((t) => {
            if (!positionAddrs.has(t.address)) return null;
            const tx = hashPos(t.address, 17);
            const ty = hashPos(t.address, 53);
            return (
              <svg
                key={`lock-${t.address}`}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 15,
                }}
              >
                <line
                  x1="35%"
                  y1="45%"
                  x2={`${tx}%`}
                  y2={`${ty}%`}
                  stroke={C.match}
                  strokeWidth="2.5"
                  opacity={0.8}
                  filter="url(#glow-green)"
                />
                <defs>
                  <filter id="glow-green">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
              </svg>
            );
          })}

          {/* Token Orbs */}
          {filteredTokens.map((t) => {
            const size = orbSize(t.marketCap);
            const color = orbColor(t.priceChange1h);
            const glow = orbGlow(t.priceChange1h);
            const x = hashPos(t.address, 17);
            const y = hashPos(t.address, 53);
            const isPosition = positionAddrs.has(t.address);
            const dur = pulseDuration(t.pairCreatedAt);
            const isHot = t.score >= 85;
            const isNew = (Date.now() - t.pairCreatedAt) < 7200000; // 2h
            const inWatchlist = watchlist.includes(t.address);
            const changeStr = (t.priceChange1h >= 0 ? "+" : "") + t.priceChange1h.toFixed(1) + "%";

            return (
              <div
                key={t.address}
                style={{
                  position: "absolute",
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: 10,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedToken(t)}
                onMouseEnter={(e: ReactMouseEvent) => {
                  setHoveredToken(t);
                  setHoverPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e: ReactMouseEvent) => {
                  setHoverPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHoveredToken(null)}
              >
                {/* Badges */}
                <div style={{
                  position: "absolute",
                  top: -8,
                  right: -10,
                  display: "flex",
                  gap: 2,
                  zIndex: 12,
                }}>
                  {isHot && (
                    <span style={{
                      fontSize: 7,
                      fontWeight: 800,
                      color: "#fff",
                      background: C.hot,
                      borderRadius: 6,
                      padding: "1px 4px",
                      lineHeight: 1.4,
                    }}>HOT</span>
                  )}
                  {isNew && (
                    <span style={{
                      fontSize: 7,
                      fontWeight: 800,
                      color: "#fff",
                      background: C.cyan,
                      borderRadius: 6,
                      padding: "1px 4px",
                      lineHeight: 1.4,
                    }}>NEW</span>
                  )}
                </div>

                {/* Orb */}
                <div
                  style={{
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    background: `radial-gradient(circle at 40% 35%, ${color}cc, ${color}66)`,
                    border: isPosition ? `2px solid ${C.match}` : inWatchlist ? `1.5px dashed ${C.gold}` : `1px solid ${color}44`,
                    boxShadow: isPosition
                      ? `0 0 16px 4px ${C.match}55`
                      : glow !== "none" ? glow : `0 0 ${size / 3}px ${size / 6}px ${color}33`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: `mt-orb-pulse ${dur} ease-in-out infinite`,
                    transition: "transform 0.15s ease, box-shadow 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "scale(1.3)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  }}
                >
                  <span
                    style={{
                      fontSize: Math.max(7, Math.min(9, size / 4)),
                      color: "#fff",
                      fontWeight: 800,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: size - 4,
                      textAlign: "center",
                      lineHeight: 1,
                      pointerEvents: "none",
                    }}
                  >
                    {t.symbol.length > 5 ? t.symbol.slice(0, 5) : t.symbol}
                  </span>
                </div>

                {/* Price change label below orb */}
                <span style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: color,
                  marginTop: 2,
                  fontFamily: "'JetBrains Mono', monospace",
                  pointerEvents: "none",
                }}>
                  {changeStr}
                </span>
              </div>
            );
          })}
        </div>

        {/* Token count indicator */}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 12,
            fontSize: 10,
            color: C.muted,
            fontFamily: "'JetBrains Mono', monospace",
            zIndex: 25,
          }}
        >
          {filteredTokens.length} tokens on Base
        </div>

        {/* Tooltip */}
        {hoveredToken && (
          <div
            style={{
              position: "fixed",
              left: hoverPos.x + 12,
              top: hoverPos.y - 10,
              background: C.s2,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "10px 14px",
              zIndex: 1000,
              pointerEvents: "none",
              minWidth: 200,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>
              {hoveredToken.symbol}
              <span style={{ fontSize: 10, color: C.muted, fontWeight: 400, marginLeft: 6 }}>{hoveredToken.name}</span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "auto auto",
                gap: "2px 12px",
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <span style={{ color: C.muted }}>Price</span>
              <span style={{ color: C.text }}>{formatPrice(hoveredToken.price)}</span>
              <span style={{ color: C.muted }}>1h</span>
              <span style={{ color: hoveredToken.priceChange1h >= 0 ? C.match : C.hot }}>
                {hoveredToken.priceChange1h >= 0 ? "+" : ""}{hoveredToken.priceChange1h.toFixed(1)}%
              </span>
              <span style={{ color: C.muted }}>24h</span>
              <span style={{ color: hoveredToken.priceChange24h >= 0 ? C.match : C.hot }}>
                {hoveredToken.priceChange24h >= 0 ? "+" : ""}{hoveredToken.priceChange24h.toFixed(1)}%
              </span>
              <span style={{ color: C.muted }}>MCap</span>
              <span style={{ color: C.text }}>{formatCompact(hoveredToken.marketCap)}</span>
              <span style={{ color: C.muted }}>Vol 1h</span>
              <span style={{ color: C.text }}>{formatCompact(hoveredToken.volume1h)}</span>
              <span style={{ color: C.muted }}>Age</span>
              <span style={{ color: C.text }}>{formatAge(hoveredToken.pairCreatedAt)}</span>
              <span style={{ color: C.muted }}>Score</span>
              <span
                style={{
                  color: hoveredToken.score >= 85 ? C.gold : hoveredToken.score >= 50 ? C.cyan : C.muted,
                  fontWeight: 700,
                }}
              >
                {hoveredToken.score}
                {hoveredToken.score >= 85 ? " HOT" : hoveredToken.score >= 70 ? " GOOD" : ""}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Zone 3: Hunt Log ──
  function renderLogPanel() {
    return (
      <div
        className="mt-log"
        style={{
          width: 260,
          minWidth: 260,
          background: C.surface,
          borderLeft: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px 10px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: brainConnected && settings.unleashed ? C.match : C.dim,
              animation: brainConnected && settings.unleashed ? "mt-live-dot 1.2s infinite" : "none",
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: C.text,
              letterSpacing: "0.1em",
            }}
          >
            AGENT LOG
          </span>
        </div>

        {/* Log entries */}
        <div
          ref={logRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 12px",
          }}
        >
          {displayLog.map((entry, i) => {
            const dotColor = LOG_DOT_COLORS[entry.status] || C.muted;
            const isBrainOffline = !brainConnected && entry.status === "info";
            return (
              <div
                key={`log-${i}`}
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "6px 0",
                  borderBottom: i < displayLog.length - 1 ? `1px solid ${C.border}` : "none",
                  alignItems: "flex-start",
                  borderLeft: `3px solid ${dotColor}`,
                  paddingLeft: 8,
                  marginBottom: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: C.muted,
                    fontFamily: "'JetBrains Mono', monospace",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {formatTime(entry.ts)}
                </span>
                <span style={{
                  fontSize: 11,
                  color: isBrainOffline ? C.hot : C.text,
                  lineHeight: 1.4,
                  opacity: isBrainOffline ? 0.8 : 1,
                }}>
                  {entry.message}
                </span>
              </div>
            );
          })}
        </div>

        {/* Open Positions */}
        {positions.length > 0 && (
          <div
            style={{
              borderTop: `1px solid ${C.border}`,
              padding: "10px 12px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.muted,
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              OPEN POSITIONS
            </div>
            {positions.map((p) => (
              <div
                key={p.tokenAddress}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "8px 0",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{p.symbol}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: p.pnl >= 0 ? C.match : C.hot,
                    }}
                  >
                    {p.pnl >= 0 ? "+" : ""}
                    {formatDollar(p.pnl)} ({p.pnlPercent >= 0 ? "+" : ""}
                    {p.pnlPercent.toFixed(1)}%)
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatPrice(p.entryPrice)} {"->"} {formatPrice(p.currentPrice)}
                  </span>
                  <button
                    onClick={() => forceSell(p.tokenAddress)}
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: C.hot,
                      background: C.hot + "15",
                      border: `1px solid ${C.hot}33`,
                      borderRadius: 4,
                      padding: "3px 8px",
                      cursor: "pointer",
                      letterSpacing: "0.05em",
                    }}
                  >
                    FORCE SELL
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Point Agent Modal ──
  function renderModal() {
    if (!selectedToken) return null;
    const t = selectedToken;
    const scoreColor = t.score >= 85 ? C.gold : t.score >= 70 ? C.match : t.score >= 50 ? C.cyan : C.muted;
    const wouldTrade = t.score >= (100 - settings.aggression) ? "YES" : t.score >= (100 - settings.aggression) * 0.8 ? "MAYBE" : "NO";
    const wouldTradeColor = wouldTrade === "YES" ? C.match : wouldTrade === "MAYBE" ? C.yellow : C.hot;
    const lowLiq = t.liquidity < 10000;
    const buyPressure = t.txns1h.buys + t.txns1h.sells > 0
      ? (t.txns1h.buys / (t.txns1h.buys + t.txns1h.sells)) * 100
      : 50;
    const suggestedPosition = Math.min(settings.maxTrade, settings.maxTrade * (t.score / 100));
    const isInWatchlist = watchlist.includes(t.address);
    const existingPosition = positions.find(p => p.tokenAddress === t.address);

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 9999,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedToken(null);
            setHint("");
          }
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            background: C.surface,
            borderRadius: "20px 20px 0 0",
            padding: 24,
            animation: "mt-modal-up 0.3s ease-out",
            maxHeight: "85vh",
            overflowY: "auto",
          }}
        >
          {/* Close */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
            <button
              onClick={() => {
                setSelectedToken(null);
                setHint("");
              }}
              style={{
                background: "none",
                border: "none",
                color: C.muted,
                fontSize: 20,
                cursor: "pointer",
                padding: "0 4px",
                lineHeight: 1,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Token Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            {t.imageUrl ? (
              <img
                src={t.imageUrl}
                alt=""
                style={{ width: 44, height: 44, borderRadius: "50%", background: C.s2 }}
              />
            ) : (
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${orbColor(t.priceChange1h)}88, ${orbColor(t.priceChange1h)}44)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#fff",
                }}
              >
                {t.symbol.slice(0, 2)}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{t.symbol}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: scoreColor,
                  background: scoreColor + "22", padding: "2px 8px", borderRadius: 8,
                }}>
                  Score: {t.score}
                </span>
                <span style={{ fontSize: 10, color: C.muted }}>{formatAge(t.pairCreatedAt)} old</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>{t.name}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>
                {formatPrice(t.price)}
              </div>
              <div style={{
                fontSize: 12, fontWeight: 600,
                color: t.priceChange1h >= 0 ? C.match : C.hot,
              }}>
                {t.priceChange1h >= 0 ? "+" : ""}{t.priceChange1h.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Watchlist / Position status pills */}
          {(isInWatchlist || existingPosition) && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {isInWatchlist && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: C.gold,
                  background: C.gold + "22", padding: "4px 10px", borderRadius: 8,
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                  In Watchlist
                  <button
                    onClick={() => setWatchlist(prev => prev.filter(a => a !== t.address))}
                    style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 10, padding: 0 }}
                  >
                    x
                  </button>
                </span>
              )}
              {existingPosition && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: existingPosition.pnl >= 0 ? C.match : C.hot,
                  background: (existingPosition.pnl >= 0 ? C.match : C.hot) + "22",
                  padding: "4px 10px", borderRadius: 8,
                }}>
                  Position: {existingPosition.pnl >= 0 ? "+" : ""}{formatDollar(existingPosition.pnl)} ({existingPosition.pnlPercent.toFixed(1)}%)
                </span>
              )}
            </div>
          )}

          {/* Quick Analysis */}
          <div style={{
            background: C.s2, borderRadius: 10, padding: 14, marginBottom: 14,
            border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 10 }}>
              QUICK ANALYSIS
            </div>

            {/* Score bar */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: C.muted }}>Agent Score</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor }}>{t.score}/100</span>
              </div>
              <div style={{ height: 6, background: C.dim, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${t.score}%`, height: "100%", background: scoreColor, borderRadius: 3 }} />
              </div>
            </div>

            {/* Would agent trade */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: C.muted }}>Would agent trade this?</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: wouldTradeColor }}>{wouldTrade}</span>
            </div>

            {/* Liquidity check */}
            {lowLiq && (
              <div style={{
                fontSize: 10, color: C.orange, fontWeight: 600,
                padding: "4px 8px", background: C.orange + "15", borderRadius: 6, marginBottom: 8,
              }}>
                LOW LIQUIDITY ({formatCompact(t.liquidity)}) -- risky
              </div>
            )}

            {/* Buy pressure bar */}
            <div style={{ marginBottom: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: C.muted }}>Buy Pressure</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: buyPressure > 60 ? C.match : buyPressure < 40 ? C.hot : C.muted }}>
                  {buyPressure.toFixed(0)}%
                </span>
              </div>
              <div style={{ height: 6, background: C.dim, borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  width: `${buyPressure}%`, height: "100%", borderRadius: 3,
                  background: buyPressure > 60 ? C.match : buyPressure < 40 ? C.hot : C.yellow,
                }} />
              </div>
            </div>
          </div>

          {/* Position size calculator */}
          <div style={{
            background: C.s2, borderRadius: 10, padding: 14, marginBottom: 14,
            border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>
              POSITION SIZE
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
              Suggested: <span style={{ color: C.text, fontWeight: 700 }}>{formatDollar(suggestedPosition)}</span>
              <span style={{ color: C.dim }}> (based on ${settings.maxTrade} max + score)</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 6,
              marginBottom: 16,
            }}
          >
            {[
              { label: "MCap", value: formatCompact(t.marketCap) },
              { label: "Vol 1h", value: formatCompact(t.volume1h) },
              { label: "Liquidity", value: formatCompact(t.liquidity) },
              { label: "24h", value: `${t.priceChange24h >= 0 ? "+" : ""}${t.priceChange24h.toFixed(1)}%`, color: t.priceChange24h >= 0 ? C.match : C.hot },
              { label: "Buys/Sells 1h", value: `${t.txns1h.buys}/${t.txns1h.sells}` },
              { label: "Age", value: formatAge(t.pairCreatedAt) },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  background: C.bg,
                  borderRadius: 8,
                  padding: "8px 10px",
                  border: `1px solid ${C.border}`,
                }}
              >
                <div style={{ fontSize: 9, color: C.muted, marginBottom: 2 }}>{item.label}</div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: item.color || C.text,
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Hint Input */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, letterSpacing: "0.05em" }}>
              GIVE AGENT A HINT
            </div>
            <input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g. buy on next dip, wait for volume..."
              style={{
                width: "100%",
                background: C.s2,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "10px 12px",
                color: C.text,
                fontSize: 12,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => pointAgent("point")}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 12,
                border: `2px solid ${C.indigo}`,
                background: `linear-gradient(135deg, ${C.indigo}20, ${C.indigo}10)`,
                color: C.indigo,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "0.1em",
                cursor: "pointer",
              }}
            >
              POINT AGENT HERE
            </button>
            <button
              onClick={() => pointAgent("buy_now")}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 12,
                border: `2px solid ${C.match}`,
                background: `linear-gradient(135deg, ${C.match}20, ${C.match}10)`,
                color: C.match,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "0.1em",
                cursor: "pointer",
              }}
            >
              BUY NOW
            </button>
            <button
              onClick={() => pointAgent("watch")}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 12,
                border: `1px solid ${C.border}`,
                background: "transparent",
                color: C.muted,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.08em",
                cursor: "pointer",
              }}
            >
              {isInWatchlist ? "Already in Watchlist" : "Add to Watchlist"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═════════════════════════════════════════════════════════

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Keyframe styles */}
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* Wallet Bar */}
      {renderWalletBar()}

      {/* Layout */}
      <div
        className="mt-layout"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
        }}
      >
        {renderBrainPanel()}
        {renderGalaxy()}
        {renderLogPanel()}
      </div>

      {/* Modal */}
      {renderModal()}
    </div>
  );
}
