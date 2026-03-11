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
// MeshTrade — AI Agent Trading Galaxy
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
  status: "scanning" | "analyzing" | "bought" | "profit" | "loss" | "signal";
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

function orbSize(mcap: number): number {
  return Math.max(16, Math.min(52, 10 + Math.log10(Math.max(1, mcap)) * 4));
}

function orbColor(change1h: number): string {
  if (change1h > 5) return C.match;
  if (change1h < -5) return C.hot;
  return C.gold;
}

function pulseDuration(vol: number): string {
  if (vol > 500000) return "1.2s";
  if (vol > 100000) return "2s";
  if (vol > 10000) return "3s";
  return "4.5s";
}

const LOG_DOT_COLORS: Record<string, string> = {
  scanning: C.cyan,
  analyzing: C.gold,
  bought: C.match,
  profit: C.match,
  loss: C.hot,
  signal: C.indigo,
};

const MOOD_CONFIG: Record<Mood, { color: string; label: string }> = {
  HUNGRY: { color: C.hot, label: "hunting aggressively" },
  SCANNING: { color: C.cyan, label: "looking for signals" },
  "LOCKED IN": { color: C.match, label: "in position" },
  COOLING: { color: C.muted, label: "after a loss" },
  DORMANT: { color: C.dim, label: "no brain connected" },
};

const DEFAULT_LOG: LogEntry[] = [
  { ts: Date.now() - 12000, status: "scanning", message: "Agent initialized -- scanning Base chain" },
  { ts: Date.now() - 8000, status: "scanning", message: "Monitoring 50 tokens across Base" },
  { ts: Date.now() - 3000, status: "signal", message: "Waiting for signal above threshold..." },
];

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
  0%, 100% { box-shadow: 0 0 8px 2px rgba(255,45,85,0.3); }
  50% { box-shadow: 0 0 20px 6px rgba(255,45,85,0.6); }
}
@keyframes mt-modal-up {
  0% { transform: translateY(100%); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes mt-star-twinkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.9; }
}
@keyframes mt-orb-pulse {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.12); opacity: 1; }
}
@media (max-width: 640px) {
  .mt-layout { flex-direction: column !important; }
  .mt-brain { width: 100% !important; max-width: 100% !important; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.07) !important; }
  .mt-galaxy { min-height: 360px !important; height: 360px !important; }
  .mt-log { width: 100% !important; max-width: 100% !important; border-left: none !important; border-top: 1px solid rgba(255,255,255,0.07) !important; max-height: 320px !important; }
}
`;

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function MeshTrade({ user, agent, wallet }: MeshTradeProps) {
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
  const [logEntries, setLogEntries] = useState<LogEntry[]>(DEFAULT_LOG);
  const [positions, setPositions] = useState<Position[]>([]);
  const [sessionStats, setSessionStats] = useState({ trades: 0, pnl: 0 });
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [hint, setHint] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredToken, setHoveredToken] = useState<Token | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [scanTargets, setScanTargets] = useState<number[]>([]);

  const settingsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tokenIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const galaxyRef = useRef<HTMLDivElement | null>(null);

  // ── Computed Mood ──
  const computeMood = useCallback(
    (pos: Position[], toks: Token[], unleashed: boolean): Mood => {
      if (!unleashed) return "DORMANT";
      if (pos.length > 0) {
        const totalPnl = pos.reduce((s, p) => s + p.pnl, 0);
        if (totalPnl < -10) return "COOLING";
        return "LOCKED IN";
      }
      const highScore = toks.some((t) => t.score >= 80);
      if (highScore) return "HUNGRY";
      return "SCANNING";
    },
    []
  );

  // ── Fetch tokens ──
  const fetchTokens = useCallback(async () => {
    try {
      const q = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : "";
      const res = await fetch(`/api/hunt/tokens?chains=base${q}&limit=50`);
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
        if (data.logEntries && data.logEntries.length > 0)
          setLogEntries(data.logEntries);
        if (data.sessionStats) setSessionStats(data.sessionStats);
      }
    } catch {
      /* silent — API may not exist yet */
    }
  }, []);

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

  // ── Unleash toggle ──
  const toggleUnleash = useCallback(() => {
    if (settings.unleashed) {
      if (!confirm("Stop hunting?")) return;
    }
    updateSetting("unleashed", !settings.unleashed);
  }, [settings.unleashed, updateSetting]);

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
      const idxs: number[] = [];
      while (idxs.length < Math.min(3, tokens.length)) {
        const r = Math.floor(Math.random() * tokens.length);
        if (!idxs.includes(r)) idxs.push(r);
      }
      setScanTargets(idxs);
    };
    pick();
    const iv = setInterval(pick, 4000);
    return () => clearInterval(iv);
  }, [mood, tokens.length]);

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

  // ── Star field (stable positions) ──
  const stars = useMemo(() => {
    const s: { x: number; y: number; size: number; delay: number }[] = [];
    for (let i = 0; i < 50; i++) {
      s.push({
        x: ((i * 7 + 13) * 97) % 100,
        y: ((i * 11 + 29) * 83) % 100,
        size: 1 + (i % 2),
        delay: (i * 0.3) % 5,
      });
    }
    return s;
  }, []);

  // ── Ticker tokens (top 5) ──
  const tickerTokens = useMemo(() => tokens.slice(0, 5), [tokens]);

  // ═════════════════════════════════════════════════════════
  // SUB-RENDERS
  // ═════════════════════════════════════════════════════════

  // ── Zone 1: Brain Panel ──
  function renderBrainPanel() {
    const moodCfg = MOOD_CONFIG[mood];
    const agentName = agent?.agent_name || "AGENT";

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
            className="mt-pulse"
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "radial-gradient(circle at 35% 35%, #6366f1, #06b6d4, #4f46e5)",
              boxShadow: `0 0 24px 6px rgba(99,102,241,0.4), 0 0 48px 12px rgba(6,182,212,0.2)`,
              animation: "mt-pulse 2.5s ease-in-out infinite",
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
              padding: "4px 12px",
              borderRadius: 20,
              background: moodCfg.color + "22",
              border: `1px solid ${moodCfg.color}44`,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: moodCfg.color,
                animation: mood !== "DORMANT" ? "mt-live-dot 1.5s infinite" : "none",
              }}
            />
            <span style={{ fontSize: 11, color: moodCfg.color, fontWeight: 600 }}>{mood}</span>
            <span style={{ fontSize: 10, color: C.muted }}>{moodCfg.label}</span>
          </div>
        </div>

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
        <button
          onClick={toggleUnleash}
          className={settings.unleashed ? "mt-unleash-active" : ""}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 12,
            border: settings.unleashed
              ? `2px solid ${C.hot}`
              : `2px solid ${C.indigo}`,
            background: settings.unleashed
              ? C.hot + "20"
              : C.indigo + "15",
            color: settings.unleashed ? C.hot : C.indigo,
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: "0.12em",
            cursor: "pointer",
            position: "relative",
            overflow: "hidden",
            animation: settings.unleashed
              ? "mt-unleash-pulse 1.5s ease-in-out infinite"
              : "mt-pulse 3s ease-in-out infinite",
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
            {settings.unleashed ? "AGENT HUNTING" : "UNLEASH AGENT"}
          </span>
        </button>

        {/* Session Stats */}
        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: C.muted,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          This session: {sessionStats.trades} trades,{" "}
          <span style={{ color: sessionStats.pnl >= 0 ? C.match : C.hot }}>
            {sessionStats.pnl >= 0 ? "+" : ""}
            {formatDollar(sessionStats.pnl)} PnL
          </span>
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
              fontSize: 11,
              color: C.text,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
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
          minHeight: 480,
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
          {/* Stars */}
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
                opacity: 0.4,
                animation: `mt-star-twinkle ${3 + s.delay}s ease-in-out infinite`,
                animationDelay: `${s.delay}s`,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Agent Orb (center) */}
          <div
            style={{
              position: "absolute",
              left: "45%",
              top: "40%",
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "radial-gradient(circle at 35% 35%, #6366f1, #06b6d4, #4f46e5)",
              boxShadow: `0 0 30px 8px rgba(99,102,241,0.4), 0 0 60px 16px rgba(6,182,212,0.15)`,
              animation: "mt-drift 12s ease-in-out infinite, mt-glow 3s ease-in-out infinite",
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
                fontSize: 8,
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

          {/* Scan Lines */}
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
                    x1="45%"
                    y1="40%"
                    x2={`${tx}%`}
                    y2={`${ty}%`}
                    stroke={C.cyan}
                    strokeWidth="1"
                    strokeDasharray="6 4"
                    style={{ animation: "mt-scan-line 2s ease-in-out infinite" }}
                  />
                </svg>
              );
            })}

          {/* Lock Lines for open positions */}
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
                  x1="45%"
                  y1="40%"
                  x2={`${tx}%`}
                  y2={`${ty}%`}
                  stroke={C.match}
                  strokeWidth="1.5"
                  opacity={0.7}
                />
              </svg>
            );
          })}

          {/* Token Orbs */}
          {filteredTokens.map((t) => {
            const size = orbSize(t.marketCap);
            const color = orbColor(t.priceChange1h);
            const x = hashPos(t.address, 17);
            const y = hashPos(t.address, 53);
            const isPosition = positionAddrs.has(t.address);
            const dur = pulseDuration(t.volume1h);

            return (
              <div
                key={t.address}
                onClick={() => setSelectedToken(t)}
                onMouseEnter={(e: ReactMouseEvent) => {
                  setHoveredToken(t);
                  setHoverPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e: ReactMouseEvent) => {
                  setHoverPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHoveredToken(null)}
                style={{
                  position: "absolute",
                  left: `${x}%`,
                  top: `${y}%`,
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  background: `radial-gradient(circle at 40% 35%, ${color}cc, ${color}66)`,
                  border: isPosition ? `2px solid ${C.match}` : `1px solid ${color}44`,
                  boxShadow: isPosition
                    ? `0 0 16px 4px ${C.match}55`
                    : `0 0 ${size / 3}px ${size / 6}px ${color}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 10,
                  animation: `mt-orb-pulse ${dur} ease-in-out infinite`,
                  transform: "translate(-50%, -50%)",
                  transition: "box-shadow 0.2s ease",
                }}
              >
                <span
                  style={{
                    fontSize: Math.max(7, Math.min(10, size / 4)),
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
                  {t.symbol.length > 5 ? t.symbol.slice(0, 4) : t.symbol}
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
              minWidth: 180,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
              {hoveredToken.symbol}
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
              <span
                style={{
                  color: hoveredToken.priceChange1h >= 0 ? C.match : C.hot,
                }}
              >
                {hoveredToken.priceChange1h >= 0 ? "+" : ""}
                {hoveredToken.priceChange1h.toFixed(1)}%
              </span>
              <span style={{ color: C.muted }}>MCap</span>
              <span style={{ color: C.text }}>{formatCompact(hoveredToken.marketCap)}</span>
              <span style={{ color: C.muted }}>Score</span>
              <span
                style={{
                  color:
                    hoveredToken.score >= 75
                      ? C.gold
                      : hoveredToken.score >= 50
                      ? C.cyan
                      : C.muted,
                }}
              >
                {hoveredToken.score}
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
              background: C.match,
              animation: "mt-live-dot 1.2s infinite",
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
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 12px",
          }}
        >
          {logEntries.map((entry, i) => (
            <div
              key={`log-${i}`}
              style={{
                display: "flex",
                gap: 8,
                padding: "6px 0",
                borderBottom: i < logEntries.length - 1 ? `1px solid ${C.border}` : "none",
                alignItems: "flex-start",
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
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: LOG_DOT_COLORS[entry.status] || C.muted,
                  flexShrink: 0,
                  marginTop: 4,
                }}
              />
              <span style={{ fontSize: 11, color: C.text, lineHeight: 1.4 }}>
                {entry.message}
              </span>
            </div>
          ))}
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
            maxHeight: "80vh",
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

          {/* Token Info */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            {t.imageUrl ? (
              <img
                src={t.imageUrl}
                alt=""
                style={{ width: 40, height: 40, borderRadius: "50%", background: C.s2 }}
              />
            ) : (
              <div
                style={{
                  width: 40,
                  height: 40,
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
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{t.symbol}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{t.name}</div>
            </div>
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 20,
            }}
          >
            {[
              { label: "Price", value: formatPrice(t.price) },
              {
                label: "1h Change",
                value: `${t.priceChange1h >= 0 ? "+" : ""}${t.priceChange1h.toFixed(1)}%`,
                color: t.priceChange1h >= 0 ? C.match : C.hot,
              },
              { label: "Market Cap", value: formatCompact(t.marketCap) },
              { label: "Volume 1h", value: formatCompact(t.volume1h) },
              { label: "Liquidity", value: formatCompact(t.liquidity) },
              {
                label: "Score",
                value: String(t.score),
                color: t.score >= 75 ? C.gold : t.score >= 50 ? C.cyan : C.muted,
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  background: C.s2,
                  borderRadius: 8,
                  padding: "10px 12px",
                  border: `1px solid ${C.border}`,
                }}
              >
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>{item.label}</div>
                <div
                  style={{
                    fontSize: 14,
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
                background: C.indigo + "20",
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
                background: C.match + "20",
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
              Add to Watchlist
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
        height: "100%",
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
