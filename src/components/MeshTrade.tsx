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
// MeshTrade v3 — 3-Column Orbital Galaxy
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
  onConnectBrain?: () => void;
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

function lightenColor(hex: string): string {
  // Handle both hex (#abc123) and named CSS colors by falling back gracefully
  if (!hex.startsWith("#") || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, r + 80), lg = Math.min(255, g + 80), lb = Math.min(255, b + 80);
  return `rgb(${lr},${lg},${lb})`;
}

function fmtK(n: number): string {
  if (!n) return "$0";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + n.toFixed(0);
}

function fmtAge(ts: number): string {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts * 1000) / 1000);
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

function tokenOrbColor(t: Token): string {
  const p = t.priceChange1h || 0;
  if (p > 10) return C.match;
  if (p > 5) return C.lime;
  if (p > 0) return C.cyan;
  if (p > -5) return C.yellow;
  if (p > -10) return C.orange;
  return C.hot;
}

// ── Token logo with multi-source fallback ──────────────
function getTokenLogoUrl(token: { address: string; chainId: string; imageUrl: string | null }): string | null {
  if (token.imageUrl) return token.imageUrl;
  if (token.address && token.chainId) {
    return `https://dd.dexscreener.com/ds-data/tokens/${token.chainId}/${token.address.toLowerCase()}/header.png`;
  }
  return null;
}

function TokenLogo({ token, size }: { token: Token; size: number }) {
  const [imgSrc, setImgSrc] = useState<string | null>(() => getTokenLogoUrl(token));
  const [failed, setFailed] = useState(false);

  const color = (() => {
    const p = token.priceChange1h ?? 0;
    if (p > 10) return C.match;
    if (p > 5) return C.lime;
    if (p > 0) return C.cyan;
    if (p > -5) return C.yellow;
    if (p > -10) return C.orange;
    return C.hot;
  })();

  const initials = token.symbol.slice(0, 2).toUpperCase();
  const fontSize = size >= 36 ? 10 : size >= 26 ? 8 : 7;

  if (failed || !imgSrc) {
    return (
      <div style={{
        width: "100%", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `radial-gradient(circle at 35% 35%, ${lightenColor(color)}, ${color})`,
        borderRadius: "50%", flexShrink: 0,
      }}>
        <span style={{ fontSize, fontWeight: 900, color: "white", letterSpacing: "-0.02em" }}>
          {initials}
        </span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={token.symbol}
      style={{ width: "80%", height: "80%", borderRadius: "50%", objectFit: "cover", display: "block", pointerEvents: "none" }}
      onError={() => {
        const cdnUrl = `https://dd.dexscreener.com/ds-data/tokens/${token.chainId}/${token.address.toLowerCase()}/header.png`;
        if (imgSrc !== cdnUrl) {
          setImgSrc(cdnUrl);
        } else {
          setFailed(true);
        }
      }}
    />
  );
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
@keyframes mt-spin-cw {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes mt-spin-ccw {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}
@keyframes mt-agent-pulse {
  0%, 100% { box-shadow: 0 0 20px 6px rgba(99,102,241,0.4), 0 0 40px 12px rgba(6,182,212,0.15); }
  50% { box-shadow: 0 0 30px 10px rgba(99,102,241,0.6), 0 0 60px 20px rgba(6,182,212,0.25); }
}
@keyframes mt-analyze-ring {
  0% { transform: translate(-50%,-50%) scale(0.8); opacity: 0.8; }
  100% { transform: translate(-50%,-50%) scale(1.6); opacity: 0; }
}
@keyframes mt-card-in { from { opacity: 0; transform: translateY(6px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
@media (max-width: 640px) {
  .mt-layout { flex-direction: column !important; }
  .mt-brain { width: 100% !important; max-width: 100% !important; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.07) !important; }
  .mt-galaxy { min-height: 480px !important; height: 480px !important; }
  .mt-orbital-cols { display: none !important; }
  .mt-mobile-col-tabs { display: flex !important; }
  .mt-mobile-col-view { display: flex !important; flex-direction: column !important; flex: 1 !important; }
  .mt-brain-collapse { max-height: 0px !important; overflow: hidden !important; padding: 0 !important; }
  .mt-brain-collapse.mt-brain-open { max-height: 2000px !important; overflow: visible !important; padding: 20px !important; }
  .mt-agent-float { display: none !important; }
}
`;

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function MeshTrade({ user, agent, wallet, onConnectBrain, onFundWallet }: MeshTradeProps) {
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
  const [hoverCard, setHoverCard] = useState<{ token: Token; x: number; y: number } | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [agentColIdx, setAgentColIdx] = useState(0);
  const [agentTokenAddr, setAgentTokenAddr] = useState<string | null>(null);
  const [mobileColTab, setMobileColTab] = useState<"emerging" | "heating" | "pumping">("pumping");
  const [brainExpanded, setBrainExpanded] = useState(false);

  const settingsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tokenIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const triggerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const agentMoveRef = useRef<NodeJS.Timeout | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const galaxyRef = useRef<HTMLDivElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const checkedTokensRef = useRef<Set<string>>(new Set());

  const brainConnected = !!user?.ai_api_key_encrypted;
  const GAS_RESERVE = 0.002;

  // ── Computed ──
  const walletEth = wallet?.balance_eth ?? 0;
  const walletUsd = wallet?.balance_usd ?? 0;
  const inPositions = positions.reduce((s, p) => s + Math.abs(p.amount * p.entryPrice), 0);
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

  // ── Token categorization (same as MeshScope) ──
  const { pumpingTokens, emergingTokens, heatingTokens, columns } = useMemo(() => {
    const ft = searchQuery
      ? tokens.filter(t =>
          t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.address.toLowerCase().includes(searchQuery.toLowerCase()))
      : tokens;

    const pumping = [...ft].sort((a, b) => b.score - a.score).slice(0, Math.ceil(ft.length / 3));
    const pumpSet = new Set(pumping.map(t => t.address));
    const emerging = [...ft]
      .filter(t => !pumpSet.has(t.address))
      .sort((a, b) => b.pairCreatedAt - a.pairCreatedAt)
      .slice(0, Math.ceil(ft.length / 3));
    const emergeSet = new Set(emerging.map(t => t.address));
    const heating = ft.filter(t => !pumpSet.has(t.address) && !emergeSet.has(t.address));

    const cols = [
      { id: "emerging" as const, label: "EMERGING", tokens: emerging, color: "#06b6d4", desc: "New pairs < 2h" },
      { id: "heating" as const, label: "HEATING", tokens: heating, color: "#f59e0b", desc: "Building momentum" },
      { id: "pumping" as const, label: "PUMPING", tokens: pumping, color: "#30d158", desc: "Score 80+" },
    ];

    return { pumpingTokens: pumping, emergingTokens: emerging, heatingTokens: heating, columns: cols };
  }, [tokens, searchQuery]);

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

  // ── Agent movement between columns ──
  useEffect(() => {
    if (agentMoveRef.current) clearInterval(agentMoveRef.current);

    const moveAgent = () => {
      const allTokens = [...columns[0].tokens, ...columns[1].tokens, ...columns[2].tokens];
      if (allTokens.length === 0) return;

      if (!settings.unleashed || !brainConnected) {
        setAgentColIdx(0);
        setAgentTokenAddr(null);
        return;
      }

      // Find highest-scored token not checked in past 30s
      const now = Date.now();
      const unchecked = allTokens
        .filter(t => !checkedTokensRef.current.has(t.address))
        .sort((a, b) => b.score - a.score);

      let target = unchecked[0] || allTokens.sort((a, b) => b.score - a.score)[0];
      if (!target) return;

      // Reset checked set periodically
      if (checkedTokensRef.current.size > allTokens.length * 0.8) {
        checkedTokensRef.current.clear();
      }
      checkedTokensRef.current.add(target.address);

      // Find which column this token is in
      for (let ci = 0; ci < columns.length; ci++) {
        if (columns[ci].tokens.some(t => t.address === target.address)) {
          setAgentColIdx(ci);
          break;
        }
      }
      setAgentTokenAddr(target.address);

      // Log analyzing
      setLogEntries(prev => [
        { ts: now, status: "analyzing", message: `Analyzing ${target.symbol} (score: ${target.score})` },
        ...prev.slice(0, 49),
      ]);
    };

    moveAgent();
    agentMoveRef.current = setInterval(moveAgent, 4000);
    return () => {
      if (agentMoveRef.current) clearInterval(agentMoveRef.current);
    };
  }, [columns, settings.unleashed, brainConnected]);

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
        {/* Mobile toggle */}
        <div className="mt-brain-toggle" style={{ display: "none" }}>
          <button
            onClick={() => setBrainExpanded(!brainExpanded)}
            style={{
              width: "100%", padding: "10px 0", background: C.s2,
              border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.text, fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {brainExpanded ? "Hide Brain Panel" : "Show Brain Panel"}
          </button>
        </div>

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

        {/* CHANGE 1: Connect Brain CTA when no API key */}
        {!brainConnected && (
          <div style={{
            background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.2)",
            borderRadius: 12, padding: "14px 16px", marginTop: 12, textAlign: "center",
          }}>
            <div style={{ fontSize: 12, color: "#ff2d55", fontWeight: 700, marginBottom: 8 }}>AI Brain not connected</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
              Connect your API key to activate your agent and start trading.
            </div>
            <button onClick={() => onConnectBrain?.()} style={{
              width: "100%", padding: "10px 0",
              background: "linear-gradient(135deg,#6366f1,#a855f7)",
              border: "none", borderRadius: 10, color: "white",
              fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
            }}>Connect AI Brain</button>
          </div>
        )}

        {/* CHANGE 2: Wallet Card */}
        <div style={{
          background: C.s2, borderRadius: 12, padding: "12px 14px",
          border: `1px solid ${C.border}`, marginBottom: 12,
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: C.cyan, textTransform: "uppercase",
            letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 4,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" stroke="#0052FF" strokeWidth="2" />
              <text x="12" y="16" textAnchor="middle" fill="#0052FF" fontSize="12" fontWeight="700">B</text>
            </svg>
            Wallet · Base L2
          </div>
          <div style={{
            fontSize: 28, fontWeight: 900, color: C.text, letterSpacing: "-0.5px",
            fontFamily: "'JetBrains Mono',monospace", lineHeight: 1, marginBottom: 2,
          }}>
            {wallet?.balance_eth?.toFixed(4) ?? "0.0000"} ETH
          </div>
          {wallet?.balance_usd != null && (
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
              ${wallet.balance_usd.toFixed(2)} USD
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: C.muted }}>In Positions</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, fontFamily: "'JetBrains Mono',monospace" }}>
              ${inPositions.toFixed(2)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 10, color: C.muted }}>Available</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.match, fontFamily: "'JetBrains Mono',monospace" }}>
              {available.toFixed(4)} ETH
            </span>
          </div>
          {walletEth < 0.002 && (
            <div style={{
              fontSize: 10, color: "#f59e0b", padding: "6px 8px",
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: 6, marginBottom: 8, lineHeight: 1.4,
            }}>
              Low balance -- min 0.002 ETH to trade
            </div>
          )}
          <button onClick={() => onFundWallet?.()} style={{
            width: "100%", padding: "8px 0", borderRadius: 8,
            background: `linear-gradient(135deg,${C.indigo},${C.cyan})`,
            border: "none", color: "white", fontSize: 11, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>Fund Wallet</button>
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

  // ── Render orbital column tokens ──
  function renderOrbitalTokens(colTokens: Token[], colColor: string) {
    const positionAddrs = new Set(positions.map((p) => p.tokenAddress));

    return colTokens.map((t, i) => {
      const size = Math.max(18, Math.min(48, Math.log10(Math.max(t.marketCap || 1, 1)) / 10 * 36 + 18));
      const color = orbColor(t.priceChange1h);
      const orbitR = 20 + (i % 5) * 22;
      const speed = Math.max(8, 40 - (t.volume1h / 50000) * 32);
      const offsetHash = hashPos(t.address, 7);
      const offset = (offsetHash / 75) * speed;
      const dir = t.address.charCodeAt(0) % 2 === 0 ? "cw" : "ccw";
      const isPosition = positionAddrs.has(t.address);
      const isHot = t.score >= 85;
      const isNew = (Date.now() - t.pairCreatedAt) < 7200000;
      const isAnalyzing = agentTokenAddr === t.address;

      return (
        <div
          key={t.address}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 0,
            height: 0,
            animationName: dir === "cw" ? "mt-spin-cw" : "mt-spin-ccw",
            animationDuration: `${speed}s`,
            animationDelay: `${-offset}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedToken(t);
            setHoverCard(null);
          }}
        >
          <div
            style={{
              position: "absolute",
              left: orbitR,
              top: -size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              background: `radial-gradient(circle at 35% 35%, ${lightenColor(color)}, ${color})`,
              boxShadow: isPosition
                ? `0 0 16px 4px ${C.match}55`
                : `0 0 ${size / 3}px ${color}88`,
              border: isPosition ? `2px solid ${C.match}` : `1px solid ${color}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              animationName: dir === "cw" ? "mt-spin-ccw" : "mt-spin-cw",
              animationDuration: `${speed}s`,
              animationDelay: `${-offset}s`,
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1.3)";
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              hoverTimerRef.current = setTimeout(() => {
                setHoverCard({ token: t, x: rect.left + rect.width / 2, y: rect.top });
              }, 300);
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
              setHoverCard(null);
            }}
          >
            <TokenLogo token={t} size={size} />

            {/* Badges */}
            {(isHot || isNew) && (
              <div style={{
                position: "absolute", top: -6, right: -6,
                display: "flex", gap: 1, zIndex: 12,
              }}>
                {isHot && (
                  <span style={{
                    fontSize: 6, fontWeight: 800, color: "#fff",
                    background: C.hot, borderRadius: 4, padding: "0px 3px", lineHeight: 1.4,
                  }}>HOT</span>
                )}
                {isNew && (
                  <span style={{
                    fontSize: 6, fontWeight: 800, color: "#fff",
                    background: C.cyan, borderRadius: 4, padding: "0px 3px", lineHeight: 1.4,
                  }}>NEW</span>
                )}
              </div>
            )}
          </div>

          {/* Analyze ring */}
          {isAnalyzing && (
            <div style={{
              position: "absolute",
              left: orbitR + size / 2,
              top: 0,
              width: size + 16,
              height: size + 16,
              borderRadius: "50%",
              border: `2px solid ${C.indigo}`,
              transform: "translate(-50%, -50%)",
              animation: "mt-analyze-ring 1.5s ease-out infinite",
              pointerEvents: "none",
            }} />
          )}
        </div>
      );
    });
  }

  // ── Zone 2: Galaxy View (3-column orbital) ──
  function renderGalaxy() {
    const colCenters = [16.67, 50, 83.33]; // % positions for agent

    return (
      <div
        className="mt-galaxy"
        ref={galaxyRef}
        style={{
          flex: 1,
          background: C.bg,
          position: "relative",
          overflow: "hidden",
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

        {/* Mobile column tab switcher */}
        <div className="mt-mobile-col-tabs" style={{
          display: "none", padding: "0 12px 8px", gap: 4,
        }}>
          {columns.map(col => (
            <button
              key={col.id}
              onClick={() => setMobileColTab(col.id)}
              style={{
                flex: 1, padding: "6px 0", borderRadius: 6,
                border: mobileColTab === col.id ? `1px solid ${col.color}` : `1px solid ${C.border}`,
                background: mobileColTab === col.id ? col.color + "20" : "transparent",
                color: mobileColTab === col.id ? col.color : C.muted,
                fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                letterSpacing: "0.06em",
              }}
            >
              {col.label} ({col.tokens.length})
            </button>
          ))}
        </div>

        {/* 3-column orbital layout */}
        <div style={{ flex: 1, position: "relative" }}>
          {/* Stardust background */}
          <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
            {/* Small stars */}
            {Array.from({ length: 120 }, (_, i) => {
              const x = ((i * 7 + 13) * 31) % 100;
              const y = ((i * 11 + 7) * 23) % 100;
              const sz = 1 + (i % 2);
              const op = 0.05 + (((i * 17) % 30) / 100);
              return (
                <div key={`star-${i}`} style={{
                  position: "absolute",
                  left: `${x}%`, top: `${y}%`,
                  width: sz, height: sz, borderRadius: "50%",
                  background: "white", opacity: op,
                }} />
              );
            })}
            {/* Bright stars */}
            {Array.from({ length: 20 }, (_, i) => {
              const x = ((i * 37 + 19) * 53) % 100;
              const y = ((i * 43 + 29) * 41) % 100;
              const sz = 2 + (i % 2);
              const op = 0.4 + (((i * 13) % 20) / 100);
              return (
                <div key={`bstar-${i}`} style={{
                  position: "absolute",
                  left: `${x}%`, top: `${y}%`,
                  width: sz, height: sz, borderRadius: "50%",
                  background: "white", opacity: op,
                  boxShadow: "0 0 3px 1px rgba(255,255,255,0.3)",
                }} />
              );
            })}
            {/* Nebula blobs */}
            {[
              { x: 10, y: 20, sz: 180, color: C.indigo },
              { x: 70, y: 15, sz: 140, color: C.cyan },
              { x: 40, y: 60, sz: 200, color: "#a855f7" },
              { x: 85, y: 70, sz: 160, color: C.hot },
              { x: 20, y: 80, sz: 120, color: C.indigo },
              { x: 55, y: 30, sz: 150, color: C.cyan },
              { x: 90, y: 45, sz: 130, color: "#a855f7" },
              { x: 30, y: 45, sz: 170, color: C.hot },
            ].map((nb, i) => (
              <div key={`neb-${i}`} style={{
                position: "absolute",
                left: `${nb.x}%`, top: `${nb.y}%`,
                width: nb.sz, height: nb.sz, borderRadius: "50%",
                background: `radial-gradient(circle, ${nb.color}10, transparent 70%)`,
                opacity: 0.03 + (i % 4) * 0.01,
                transform: "translate(-50%, -50%)",
              }} />
            ))}
          </div>
          <div
            className="mt-orbital-cols"
            style={{
              display: "flex",
              flexDirection: "row",
              height: "100%",
            }}
          >
            {columns.map((col, ci) => (
              <div
                key={col.id}
                className="mt-orbital-col"
                style={{
                  flex: 1,
                  position: "relative",
                  overflow: "hidden",
                  borderRight: ci < 2 ? `1px solid ${C.border}` : "none",
                }}
              >
                {/* Column Header */}
                <div style={{
                  padding: "10px 12px 8px",
                  borderBottom: `1px solid ${C.border}`,
                  flexShrink: 0,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{
                      width: 3, height: 16, borderRadius: 2, background: col.color,
                    }} />
                    <span style={{
                      fontSize: 11, fontWeight: 800, color: col.color,
                      letterSpacing: "0.1em",
                    }}>{col.label}</span>
                    <span style={{
                      fontSize: 10, color: C.muted, fontWeight: 600,
                      fontFamily: "'JetBrains Mono',monospace",
                    }}>
                      {col.tokens.length}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: C.muted, paddingLeft: 9 }}>{col.desc}</div>
                </div>

                {/* Orbital Body */}
                <div style={{
                  position: "relative",
                  width: "100%",
                  height: "calc(100% - 52px)",
                  overflow: "hidden",
                }}>
                  {/* Center dot */}
                  <div style={{
                    position: "absolute", left: "50%", top: "50%",
                    width: 6, height: 6, borderRadius: "50%",
                    background: col.color, opacity: 0.4,
                    transform: "translate(-50%, -50%)",
                  }} />

                  {/* Orbit ring guides */}
                  {[0, 1, 2, 3, 4].map(ring => (
                    <div key={ring} style={{
                      position: "absolute", left: "50%", top: "50%",
                      width: (20 + ring * 22) * 2,
                      height: (20 + ring * 22) * 2,
                      borderRadius: "50%",
                      border: `1px solid rgba(255,255,255,0.03)`,
                      transform: "translate(-50%, -50%)",
                      pointerEvents: "none",
                    }} />
                  ))}

                  {/* Token orbs */}
                  {renderOrbitalTokens(col.tokens, col.color)}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: single column view controlled by mobileColTab */}
          <div
            className="mt-mobile-col-view"
            style={{ display: "none", flex: 1, flexDirection: "column", overflow: "hidden" }}
          >
            {(() => {
              const col = columns.find(c => c.id === mobileColTab) || columns[2];
              return (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  {/* Column Header */}
                  <div style={{
                    padding: "8px 12px 6px", borderBottom: `1px solid ${col.color}33`,
                    background: `linear-gradient(180deg, ${col.color}08, transparent)`,
                    flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 3, height: 14, borderRadius: 2, background: col.color }} />
                      <span style={{ fontSize: 11, fontWeight: 900, color: col.color, letterSpacing: "0.06em" }}>{col.label}</span>
                    </div>
                    <span style={{ fontSize: 10, color: C.muted }}>{col.tokens.length} tokens</span>
                  </div>

                  {/* Floating orbs container */}
                  <div style={{
                    flex: 1, position: "relative", overflow: "hidden",
                    minHeight: 300,
                  }}>
                    {/* Stardust — 40 stars on mobile */}
                    {Array.from({ length: 40 }, (_, i) => (
                      <div key={`mstar-${i}`} style={{
                        position: "absolute",
                        left: `${((i * 23 + 7) * 17) % 100}%`,
                        top: `${((i * 31 + 13) * 11) % 100}%`,
                        width: 1 + (i % 2), height: 1 + (i % 2),
                        borderRadius: "50%", background: "white",
                        opacity: 0.05 + ((i * 13) % 25) / 100,
                        pointerEvents: "none",
                      }} />
                    ))}

                    {/* Center glow dot */}
                    <div style={{
                      position: "absolute", left: "50%", top: "50%",
                      transform: "translate(-50%,-50%)",
                      width: 6, height: 6, borderRadius: "50%",
                      background: col.color, opacity: 0.3,
                      boxShadow: `0 0 20px 8px ${col.color}33`,
                      pointerEvents: "none",
                    }} />

                    {/* Orbiting token orbs */}
                    {col.tokens.slice(0, 20).map((t, i) => {
                      const color = orbColor(t.priceChange1h);
                      const size = Math.max(22, Math.min(42, Math.log10(Math.max(t.marketCap || 1, 1)) / 10 * 30 + 18));
                      const orbitR = 22 + (i % 5) * 28;
                      const speed = Math.max(10, 45 - (t.volume1h / 30000) * 35);
                      const offset = -(hashPos(t.address, 7) / 75) * speed;
                      const dir = t.address.charCodeAt(0) % 2 === 0 ? "mt-spin-cw" : "mt-spin-ccw";
                      const counterDir = dir === "mt-spin-cw" ? "mt-spin-ccw" : "mt-spin-cw";
                      return (
                        <div
                          key={t.address}
                          style={{
                            position: "absolute", left: "50%", top: "50%",
                            width: 0, height: 0,
                            animationName: dir,
                            animationDuration: `${speed}s`,
                            animationDelay: `${offset}s`,
                            animationTimingFunction: "linear",
                            animationIterationCount: "infinite",
                          }}
                          onClick={() => setSelectedToken(t)}
                        >
                          <div style={{
                            position: "absolute",
                            left: orbitR,
                            top: -size / 2,
                            width: size, height: size,
                            borderRadius: "50%",
                            background: `radial-gradient(circle at 35% 35%, ${lightenColor(color)}, ${color})`,
                            boxShadow: `0 0 ${size / 3}px ${color}88`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer",
                            overflow: "hidden",
                            animationName: counterDir,
                            animationDuration: `${speed}s`,
                            animationDelay: `${offset}s`,
                            animationTimingFunction: "linear",
                            animationIterationCount: "infinite",
                          }}>
                            <TokenLogo token={t} size={size} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom token name list — scrollable, compact */}
                  <div style={{
                    maxHeight: 120, overflowY: "auto", borderTop: `1px solid ${C.border}`,
                    flexShrink: 0,
                  }}>
                    {col.tokens.slice(0, 15).map(t => {
                      const c = orbColor(t.priceChange1h);
                      return (
                        <div key={t.address} onClick={() => setSelectedToken(t)} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "6px 12px", borderBottom: `1px solid ${C.border}`,
                          cursor: "pointer",
                        }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                            background: `radial-gradient(circle at 35% 35%, ${lightenColor(c)}, ${c})`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <TokenLogo token={t} size={20} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: C.text, flex: 1 }}>{t.symbol}</span>
                          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: t.priceChange1h >= 0 ? C.match : C.hot }}>
                            {t.priceChange1h >= 0 ? "+" : ""}{t.priceChange1h.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* CHANGE 4: Agent orb floating over columns */}
          <div className="mt-agent-float" style={{
            position: "absolute",
            left: `${colCenters[agentColIdx]}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 30,
            pointerEvents: "none",
            transition: "left 1.2s cubic-bezier(0.34,1.56,0.64,1), top 0.8s ease",
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: !brainConnected
                ? "radial-gradient(circle at 35% 35%, #3a3a50, #2a2a3a)"
                : "radial-gradient(circle at 35% 35%, #6366f1, #06b6d4, #4f46e5)",
              boxShadow: !brainConnected
                ? "0 0 12px 3px rgba(60,60,80,0.3)"
                : undefined,
              animation: brainConnected ? "mt-agent-pulse 2s ease-in-out infinite" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <span style={{
                fontSize: 8, color: "#fff", fontWeight: 800,
                letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.9,
              }}>AGENT</span>
            </div>
            <div style={{
              fontSize: 8, fontWeight: 700,
              color: brainConnected ? C.indigo : C.dim,
              letterSpacing: "0.08em",
              textAlign: "center",
              marginTop: 4,
            }}>
              {settings.unleashed ? "HUNTING" : "IDLE"}
            </div>
          </div>
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
          {tokens.length} tokens on Base
        </div>

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
            <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
              <TokenLogo token={t} size={44} />
            </div>
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
    <>
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
        </div>

        {/* Modal */}
        {renderModal()}
      </div>

      {/* Hover Card — outside main div to avoid overflow clipping */}
      {hoverCard && (() => {
        const hc = hoverCard;
        const color = tokenOrbColor(hc.token);
        return (
          <div
            style={{
              position: "fixed",
              left: Math.min(Math.max(hc.x - 150, 10), typeof window !== "undefined" ? window.innerWidth - 310 : 700),
              top: Math.max(hc.y - 280, 10),
              width: 300,
              background: "rgba(13,13,20,0.97)",
              border: `1px solid ${color}44`,
              borderRadius: 16,
              padding: 16,
              zIndex: 9999,
              backdropFilter: "blur(20px)",
              boxShadow: `0 8px 40px rgba(0,0,0,0.7), 0 0 24px ${color}22`,
              pointerEvents: "none",
              animation: "mt-card-in 0.15s ease",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: `radial-gradient(circle at 35% 35%, ${lightenColor(color)}, ${color})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, overflow: "hidden",
                boxShadow: `0 0 12px ${color}66`,
              }}>
                <TokenLogo token={hc.token} size={40} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: C.text, letterSpacing: "-0.3px" }}>
                  {hc.token.symbol}
                </div>
                <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {hc.token.name}
                </div>
              </div>
              <div style={{
                padding: "3px 8px", borderRadius: 10, fontSize: 10, fontWeight: 800,
                background: hc.token.score >= 80 ? "rgba(48,209,88,0.15)" : hc.token.score >= 60 ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)",
                color: hc.token.score >= 80 ? C.match : hc.token.score >= 60 ? C.yellow : C.muted,
              }}>
                {Math.round(hc.token.score)}
              </div>
            </div>

            {/* Price row */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20, fontWeight: 900, fontFamily: "'JetBrains Mono',monospace", color: C.text }}>
                {formatPrice(hc.token.price)}
              </span>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: hc.token.priceChange1h >= 0 ? C.match : C.hot,
              }}>
                {hc.token.priceChange1h >= 0 ? "+" : ""}{hc.token.priceChange1h.toFixed(2)}% 1h
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: hc.token.priceChange24h >= 0 ? C.match : C.hot,
                opacity: 0.7,
              }}>
                {hc.token.priceChange24h >= 0 ? "+" : ""}{hc.token.priceChange24h.toFixed(1)}% 24h
              </span>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {[
                { label: "MCap", value: fmtK(hc.token.marketCap) },
                { label: "Vol 1h", value: fmtK(hc.token.volume1h) },
                { label: "Liquidity", value: fmtK(hc.token.liquidity) },
                { label: "FDV", value: fmtK(hc.token.fdv) },
              ].map(s => (
                <div key={s.label} style={{ background: C.s2, borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: "'JetBrains Mono',monospace" }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Live buy/sell bar */}
            {(() => {
              const b = hc.token.txns1h?.buys || 0;
              const s = hc.token.txns1h?.sells || 0;
              const total = b + s || 1;
              const buyPct = Math.round((b / total) * 100);
              return (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: C.match, fontWeight: 700 }}>{b} buys</span>
                    <span style={{ fontSize: 10, color: C.muted }}>1h txns</span>
                    <span style={{ fontSize: 10, color: C.hot, fontWeight: 700 }}>{s} sells</span>
                  </div>
                  <div style={{ height: 6, background: C.dim, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${buyPct}%`,
                      background: buyPct >= 60 ? `linear-gradient(90deg,${C.match},#22c55e)` :
                                   buyPct >= 40 ? `linear-gradient(90deg,${C.yellow},#eab308)` :
                                   `linear-gradient(90deg,${C.hot},#dc2626)`,
                      borderRadius: 3, transition: "width 0.3s",
                    }} />
                  </div>
                  <div style={{ fontSize: 9, color: C.muted, marginTop: 3, textAlign: "center" }}>
                    {buyPct}% buy pressure
                  </div>
                </div>
              );
            })()}

            {/* Age */}
            {hc.token.pairCreatedAt > 0 && (
              <div style={{ marginTop: 10, fontSize: 10, color: C.muted, textAlign: "center" }}>
                Pair age: {fmtAge(hc.token.pairCreatedAt)} -- Click to point agent
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
}
