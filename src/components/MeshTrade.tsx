"use client";
import { useState, useEffect, useRef, useCallback } from "react";

/* ═══ THEME ═══ */
const C = {
  bg: "#0a0a0f", surface: "#0d0d14", s2: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", match: "#30d158",
  hot: "#ff2d55", gold: "#ffd700", text: "#e8e8f0",
  muted: "#6b6b80", dim: "#2a2a3a", border: "rgba(255,255,255,0.07)",
};

/* ═══ TYPES ═══ */
type OrbState = "IDLE" | "SCANNING" | "ANALYZING" | "BUY" | "SELL" | "HOLDING";
type BubbleMode = "SNIPE" | "TREND" | "REVIVE" | "EXIT";
type BubblePhase = "entering" | "scanning" | "approaching" | "thinking" | "bought" | "passing" | "exiting";

interface Token {
  address: string; symbol: string; name: string; chainId: string;
  price: number; priceChange1h: number; volume1h: number; volume24h: number;
  liquidity: number; ageMinutes: number; imageUrl: string | null;
  fdv: number; marketCap: number;
}

interface Bubble {
  id: string; token: Token; mode: BubbleMode; phase: BubblePhase;
  score: number; thought?: string; pnl?: number; entryTime: number;
}

interface Holding {
  id: string; token: Token; ethAmount: number; entryPrice: number;
  pnl: number; orbitAngle: number; txHash: string;
}

interface ThoughtLine {
  id: string; text: string; ts: number;
}

interface TradeLog {
  txHash: string; action: string; token: { symbol: string; address: string; price: number };
  ethAmount: number; timestamp: number;
}

interface MeshTradeProps {
  user: any; agent: any; wallet: any;
  onConnectBrain: () => void; onFundWallet: () => void;
}

/* ═══ HELPERS ═══ */
const MODE_COLORS: Record<BubbleMode, string> = { SNIPE: C.hot, TREND: C.gold, REVIVE: "#a855f7", EXIT: C.cyan };
const ORB_COLORS: Record<OrbState, string> = {
  IDLE: C.indigo, SCANNING: C.cyan, ANALYZING: "#f59e0b",
  BUY: C.match, SELL: C.hot, HOLDING: C.gold,
};

function initials(symbol: string): string {
  return (symbol || "??").slice(0, 2).toUpperCase();
}

function deterministicGradient(addr: string): string {
  const h1 = Math.abs(addr.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 360;
  const h2 = (h1 + 60) % 360;
  return `linear-gradient(135deg, hsl(${h1},70%,50%), hsl(${h2},70%,40%))`;
}

function scoreToken(t: Token, risk: number): number {
  const volSpike = t.volume1h > 0 ? Math.min(t.volume1h / Math.max(t.volume24h / 24, 1), 10) / 10 : 0;
  const liqHealth = Math.min(t.liquidity / 50000, 1);
  const priceScore = Math.min(Math.max(t.priceChange1h, -50), 100) / 100;
  const raw = (priceScore * 0.3 + volSpike * 0.4 + liqHealth * 0.3) * 100;
  return Math.min(Math.max(raw * (0.7 + risk * 0.6), 0), 100);
}

function assignMode(t: Token): BubbleMode {
  if (t.ageMinutes < 30) return "SNIPE";
  if (t.ageMinutes > 240 && t.priceChange1h > 15) return "REVIVE";
  return "TREND";
}

function fmt$(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number): string {
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(1)}%`;
}

let _bubbleId = 0;
function nextId(): string { return `b_${Date.now()}_${++_bubbleId}`; }

/* ═══ COMPONENT ═══ */
export default function MeshTrade({ user, agent, wallet, onConnectBrain, onFundWallet }: MeshTradeProps) {
  const [orbState, setOrbState] = useState<OrbState>("IDLE");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [thoughts, setThoughts] = useState<ThoughtLine[]>([]);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [sessionPnl, setSessionPnl] = useState(0);
  const [risk, setRisk] = useState(0.5);
  const [chainFilter, setChainFilter] = useState("all");
  const [statusText, setStatusText] = useState("Initializing...");
  const [poolCount, setPoolCount] = useState(0);

  const thoughtRef = useRef<HTMLDivElement>(null);
  const tokenQueueRef = useRef<Token[]>([]);
  const activeRef = useRef(false);
  const pollTimerRef = useRef<any>(null);
  const feedTimerRef = useRef<any>(null);

  const hasBrain = !!(agent?.ai_provider || agent?.ai_key || agent?.openai_key || agent?.anthropic_key || user?.ai_api_key_encrypted);
  const hasFunds = wallet?.balance_eth > 0.001;
  const isActive = hasBrain && hasFunds;

  /* ── Add thought line ── */
  const addThought = useCallback((text: string) => {
    setThoughts(prev => {
      const next = [...prev, { id: nextId(), text, ts: Date.now() }];
      return next.slice(-20);
    });
    setTimeout(() => {
      thoughtRef.current?.scrollTo({ top: thoughtRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  /* ── Execute trade (stub API) ── */
  const executeTrade = useCallback(async (token: Token, action: "buy" | "sell", ethAmount: number) => {
    try {
      const res = await fetch("/api/meshtrade/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: { symbol: token.symbol, address: token.address, price: token.price }, action, ethAmount, userId: user?.id }),
      });
      const data = await res.json();
      if (data.success) {
        setTradeLogs(prev => [...prev, data]);
        return data;
      }
    } catch {}
    return null;
  }, [user?.id]);

  /* ── Process a single bubble through its lifecycle ── */
  const processBubble = useCallback((bubble: Bubble) => {
    const { token, score, mode } = bubble;

    // Phase 1: entering -> scanning
    setTimeout(() => {
      setBubbles(prev => prev.map(b => b.id === bubble.id ? { ...b, phase: "scanning" } : b));
      setOrbState("SCANNING");
      setStatusText(`Scanning ${token.symbol}...`);
    }, 600);

    if (score < 40) {
      // PASS
      addThought(`[${mode}] ${token.symbol} -- Score ${score.toFixed(0)}. Low signal. PASS`);
      setTimeout(() => {
        setBubbles(prev => prev.map(b => b.id === bubble.id ? { ...b, phase: "passing" } : b));
        setOrbState("IDLE");
      }, 1800);
      setTimeout(() => {
        setBubbles(prev => prev.filter(b => b.id !== bubble.id));
      }, 2400);
      return;
    }

    if (score >= 40 && score < 70) {
      // WATCH
      setTimeout(() => {
        setBubbles(prev => prev.map(b => b.id === bubble.id ? { ...b, phase: "approaching" } : b));
        setOrbState("ANALYZING");
        setStatusText(`Analyzing ${token.symbol}...`);
        addThought(`[${mode}] ${token.symbol} -- Score ${score.toFixed(0)}. Watching...`);
      }, 1200);
      setTimeout(() => {
        setBubbles(prev => prev.map(b => b.id === bubble.id ? { ...b, phase: "passing" } : b));
        setOrbState("IDLE");
      }, 3500);
      setTimeout(() => {
        setBubbles(prev => prev.filter(b => b.id !== bubble.id));
      }, 4200);
      return;
    }

    // BUY — score >= 70
    const ethAmount = parseFloat((0.001 + risk * 0.01).toFixed(4));
    setTimeout(() => {
      setBubbles(prev => prev.map(b => b.id === bubble.id ? { ...b, phase: "approaching" } : b));
      setOrbState("ANALYZING");
      setStatusText(`Analyzing ${token.symbol}...`);
    }, 1200);

    setTimeout(() => {
      const sizePct = (ethAmount * 100 / Math.max(wallet?.balance_eth || 1, 0.01)).toFixed(1);
      setBubbles(prev => prev.map(b => b.id === bubble.id ? { ...b, phase: "thinking", thought: `Vol up ${((token.volume1h / Math.max(token.volume24h / 24, 1)) * 100).toFixed(0)}%... Sizing ${sizePct}%...` } : b));
      addThought(`[${mode}] ${token.symbol} -- ${fmtPct(token.priceChange1h)} 1h. Vol ${fmt$(token.volume1h)}. Sizing ${sizePct}%... BUY`);
    }, 2200);

    setTimeout(async () => {
      setOrbState("BUY");
      setBubbles(prev => prev.map(b => b.id === bubble.id ? { ...b, phase: "bought" } : b));
      const result = await executeTrade(token, "buy", ethAmount);
      if (result) {
        setHoldings(prev => [...prev, {
          id: nextId(), token, ethAmount, entryPrice: token.price,
          pnl: 0, orbitAngle: Math.random() * 360, txHash: result.txHash,
        }]);
      }
      setTimeout(() => {
        setBubbles(prev => prev.filter(b => b.id !== bubble.id));
        setOrbState("HOLDING");
        setStatusText(`Holding ${token.symbol}. Scanning...`);
      }, 500);
    }, 3200);
  }, [addThought, executeTrade, risk, wallet?.balance_eth]);

  /* ── Feed tokens from queue into bubble stream ── */
  useEffect(() => {
    if (!isActive) return;
    activeRef.current = true;

    feedTimerRef.current = setInterval(() => {
      if (tokenQueueRef.current.length === 0) return;
      const token = tokenQueueRef.current.shift()!;
      const score = scoreToken(token, risk);
      const mode = assignMode(token);
      const bubble: Bubble = { id: nextId(), token, mode, phase: "entering", score, entryTime: Date.now() };
      setBubbles(prev => {
        const active = prev.filter(b => b.phase !== "passing" && b.phase !== "exiting");
        if (active.length >= 6) return prev;
        return [...prev, bubble];
      });
      processBubble(bubble);
    }, 300 + Math.random() * 500);

    return () => { activeRef.current = false; clearInterval(feedTimerRef.current); };
  }, [isActive, risk, processBubble]);

  /* ── Poll /api/hunt/tokens ── */
  useEffect(() => {
    if (!isActive) return;

    const poll = async () => {
      try {
        const chainParam = chainFilter !== "all" ? `&chain=${chainFilter}` : "";
        const res = await fetch(`/api/hunt/tokens?limit=30${chainParam}`);
        const data = await res.json();
        const tokens: Token[] = (data.tokens || []).map((t: any) => ({
          address: t.address, symbol: t.symbol, name: t.name, chainId: t.chainId,
          price: t.price, priceChange1h: t.priceChange1h, volume1h: t.volume1h,
          volume24h: t.volume24h, liquidity: t.liquidity, ageMinutes: t.ageMinutes,
          imageUrl: t.imageUrl, fdv: t.fdv, marketCap: t.marketCap,
        }));
        setPoolCount(tokens.length);
        setStatusText(`Scanning ${tokens.length} pools...`);
        const shuffled = tokens.sort(() => Math.random() - 0.5);
        tokenQueueRef.current.push(...shuffled);
      } catch {}
    };

    poll();
    pollTimerRef.current = setInterval(poll, 10000);
    return () => clearInterval(pollTimerRef.current);
  }, [isActive, chainFilter]);

  /* ── Simulate P&L drift on holdings ── */
  useEffect(() => {
    const iv = setInterval(() => {
      setHoldings(prev => {
        let total = 0;
        const updated = prev.map(h => {
          const drift = (Math.random() - 0.45) * 2;
          const pnl = h.pnl + drift;
          total += pnl;
          return { ...h, pnl, orbitAngle: h.orbitAngle + 0.5 };
        });
        setSessionPnl(total * 0.0001);
        return updated;
      });
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  /* ── Manual sell ── */
  const sellHolding = useCallback(async (h: Holding) => {
    setOrbState("SELL");
    addThought(`[EXIT] ${h.token.symbol} ${h.pnl >= 0 ? "+" : ""}${h.pnl.toFixed(1)}%. Manual sell.`);
    await executeTrade(h.token, "sell", h.ethAmount);
    setTimeout(() => {
      setHoldings(prev => prev.filter(x => x.id !== h.id));
      setOrbState(holdings.length > 1 ? "HOLDING" : "SCANNING");
    }, 400);
  }, [addThought, executeTrade, holdings.length]);

  /* ── Tap bubble to prioritize ── */
  const prioritizeBubble = useCallback((id: string) => {
    setBubbles(prev => prev.map(b => {
      if (b.id !== id) return b;
      if (b.phase === "entering" || b.phase === "scanning") {
        return { ...b, score: Math.max(b.score, 75) };
      }
      return b;
    }));
    setOrbState("ANALYZING");
  }, []);

  /* ── Auto-sell losers ── */
  useEffect(() => {
    const iv = setInterval(() => {
      setHoldings(prev => {
        const losers = prev.filter(h => h.pnl < -15);
        losers.forEach(h => {
          addThought(`[EXIT] ${h.token.symbol} -${Math.abs(h.pnl).toFixed(1)}%. Auto-sell triggered.`);
          executeTrade(h.token, "sell", h.ethAmount);
        });
        if (losers.length > 0) setOrbState("SELL");
        return prev.filter(h => h.pnl >= -15);
      });
    }, 5000);
    return () => clearInterval(iv);
  }, [addThought, executeTrade]);

  const orbColor = ORB_COLORS[orbState];
  const chains = ["all", "base", "ethereum", "solana"];

  /* ═══ RENDER ═══ */
  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflow: "hidden" }}>
      <style>{`
        @keyframes mt-bubble-in{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes mt-bubble-out{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(80px)}}
        @keyframes mt-bubble-merge{0%{transform:scale(1);opacity:1}100%{transform:scale(0.05) translateX(-300px);opacity:0}}
        @keyframes mt-orb-buy{0%{transform:scale(1)}40%{transform:scale(1.18)}100%{transform:scale(1)}}
        @keyframes mt-orb-sell{0%{transform:scale(1)}40%{transform:scale(0.88)}100%{transform:scale(1)}}
        @keyframes mt-orb-scan{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}
        @keyframes mt-orb-pulse{0%,100%{opacity:0.5}50%{opacity:1}}
        @keyframes mt-thought-in{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes mt-holding-orbit{from{transform:rotate(var(--start-angle)) translateX(70px) rotate(calc(-1 * var(--start-angle)))}to{transform:rotate(calc(var(--start-angle) + 360deg)) translateX(70px) rotate(calc(-1 * (var(--start-angle) + 360deg)))}}
      `}</style>

      {/* ── Brain Gate Overlays ── */}
      {!hasBrain && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(10,10,15,0.92)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, ${C.indigo}40, ${C.indigo}10)`, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.indigo} strokeWidth="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.16A2.5 2.5 0 0 1 6 10V4.5A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.16A2.5 2.5 0 0 0 18 10V4.5A2.5 2.5 0 0 0 14.5 2Z"/></svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Connect AI Brain</div>
          <div style={{ fontSize: 13, color: C.muted, maxWidth: 280, textAlign: "center" }}>Link your AI key to unleash autonomous trading</div>
          <button onClick={onConnectBrain} style={{ padding: "12px 32px", borderRadius: 12, background: C.indigo, color: "white", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Connect Brain</button>
        </div>
      )}

      {hasBrain && !hasFunds && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(10,10,15,0.92)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, ${C.gold}40, ${C.gold}10)`, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Fund Wallet to Trade</div>
          <div style={{ fontSize: 13, color: C.muted, maxWidth: 280, textAlign: "center" }}>Deposit ETH to start autonomous trading</div>
          <button onClick={onFundWallet} style={{ padding: "12px 32px", borderRadius: 12, background: C.gold, color: "#0a0a0f", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Fund Wallet</button>
        </div>
      )}

      {/* ── Top Bar: Risk Slider + Chain Filters ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>RISK</span>
          <input type="range" min="0" max="1" step="0.05" value={risk} onChange={e => setRisk(parseFloat(e.target.value))}
            style={{ width: 100, accentColor: risk > 0.7 ? C.hot : risk > 0.4 ? C.gold : C.match, height: 4 }} />
          <span style={{ fontSize: 10, color: risk > 0.7 ? C.hot : risk > 0.4 ? C.gold : C.match, fontWeight: 700 }}>
            {risk > 0.7 ? "Aggressive" : risk > 0.4 ? "Balanced" : "Conservative"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {chains.map(c => (
            <button key={c} onClick={() => setChainFilter(c)} style={{
              padding: "4px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600,
              background: chainFilter === c ? `${C.indigo}30` : "transparent",
              color: chainFilter === c ? C.text : C.muted,
              border: `1px solid ${chainFilter === c ? C.indigo + "50" : C.border}`,
              cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase",
            }}>{c === "all" ? "All" : c === "ethereum" ? "ETH" : c.slice(0, 3).toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="mt-main-layout" style={{ display: "flex", flexDirection: "row", height: "calc(100vh - 52px)", overflow: "hidden" }}>

        {/* ── LEFT PANEL: Orb + Thoughts ── */}
        <div className="mt-left-panel" style={{ width: "35%", minWidth: 260, display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px", borderRight: `1px solid ${C.border}`, overflow: "hidden" }}>

          {/* ── The Orb ── */}
          <div style={{ position: "relative", width: 120, height: 120, marginBottom: 16, flexShrink: 0 }}>
            {/* Outer glow ring */}
            <div style={{
              position: "absolute", top: "50%", left: "50%", width: 116, height: 116, borderRadius: "50%",
              border: `2px solid ${orbColor}40`,
              animation: orbState === "SCANNING" ? "mt-orb-scan 3s linear infinite" : "none",
              boxShadow: `0 0 20px ${orbColor}30`,
              transform: "translate(-50%,-50%)",
            }} />
            {/* Base orb */}
            <div style={{
              position: "absolute", top: "50%", left: "50%", width: 100, height: 100, borderRadius: "50%",
              transform: "translate(-50%,-50%)",
              background: `radial-gradient(circle at 35% 35%, ${orbColor}60, ${orbColor}20 60%, ${orbColor}08)`,
              animation: orbState === "BUY" ? "mt-orb-buy 0.4s ease-out" : orbState === "SELL" ? "mt-orb-sell 0.35s ease-out" : orbState === "IDLE" ? "mt-orb-pulse 3s ease-in-out infinite" : "none",
              boxShadow: `inset 0 -10px 20px ${orbColor}15, 0 0 40px ${orbColor}25`,
              transition: "background 0.6s ease",
            }}>
              {/* Specular highlight top-left */}
              <div style={{
                position: "absolute", top: 12, left: 16, width: 40, height: 28, borderRadius: "50%",
                background: "radial-gradient(ellipse at center, rgba(255,255,255,0.3), transparent)",
                filter: "blur(6px)",
              }} />
              {/* Secondary shimmer */}
              <div style={{
                position: "absolute", top: 20, right: 18, width: 20, height: 14, borderRadius: "50%",
                background: "radial-gradient(ellipse at center, rgba(255,255,255,0.12), transparent)",
                filter: "blur(4px)",
              }} />
              {/* Bottom rim light */}
              <div style={{
                position: "absolute", bottom: 10, left: "50%", width: 50, height: 10, borderRadius: "50%",
                transform: "translateX(-50%)",
                background: `radial-gradient(ellipse at center, ${orbColor}25, transparent)`,
                filter: "blur(4px)",
              }} />
            </div>

            {/* Holding pills orbit */}
            {holdings.map((h, i) => (
              <div key={h.id} onClick={() => sellHolding(h)}
                style={{
                  position: "absolute", top: "50%", left: "50%",
                  zIndex: 10, cursor: "pointer",
                  animation: "mt-holding-orbit 8s linear infinite",
                  animationDelay: `${-i * (8 / Math.max(holdings.length, 1))}s`,
                  ["--start-angle" as any]: `${(i * (360 / Math.max(holdings.length, 1)))}deg`,
                }}>
                <div style={{
                  padding: "2px 8px", borderRadius: 10, fontSize: 9, fontWeight: 700,
                  background: h.pnl >= 0 ? `${C.match}25` : `${C.hot}25`,
                  color: h.pnl >= 0 ? C.match : C.hot,
                  border: `1px solid ${h.pnl >= 0 ? C.match : C.hot}40`,
                  whiteSpace: "nowrap",
                }}>
                  {h.token.symbol} {h.pnl >= 0 ? "+" : ""}{h.pnl.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>

          {/* Agent name + status */}
          <div style={{ textAlign: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{agent?.agent_name || "MeshTrader"}</div>
            <div style={{ fontSize: 11, color: orbColor, fontWeight: 500, transition: "color 0.3s" }}>{statusText}</div>
          </div>

          {/* Session P&L */}
          <div style={{
            fontSize: 16, fontWeight: 800, marginBottom: 16,
            color: sessionPnl >= 0 ? C.match : C.hot,
          }}>
            {sessionPnl >= 0 ? "+" : ""}{sessionPnl.toFixed(4)} ETH today
          </div>

          {/* Thought Stream */}
          <div ref={thoughtRef} style={{
            flex: 1, width: "100%", overflowY: "auto", overflowX: "hidden",
            background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
            padding: 8, scrollbarWidth: "thin",
          }}>
            {thoughts.length === 0 && (
              <div style={{ fontSize: 11, color: C.dim, textAlign: "center", padding: 20 }}>
                {isActive ? "Waiting for signals..." : "Activate to begin"}
              </div>
            )}
            {thoughts.map(t => (
              <div key={t.id} style={{
                fontSize: 11, lineHeight: 1.5, color: C.muted, fontFamily: "'SF Mono', 'Fira Code', monospace",
                padding: "2px 0", animation: "mt-thought-in 0.2s ease-out",
                borderBottom: `1px solid ${C.border}`,
              }}>
                {t.text}
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL: Bubble Stream ── */}
        <div className="mt-right-panel" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 16, scrollbarWidth: "thin" }}>
          {bubbles.length === 0 && isActive && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.dim }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Scanning markets...</div>
              <div style={{ fontSize: 12 }}>Tokens will appear as they are detected</div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {bubbles.map(b => {
              const mc = MODE_COLORS[b.mode];
              const isApproaching = b.phase === "approaching" || b.phase === "thinking";
              const isBought = b.phase === "bought";
              const isPassing = b.phase === "passing";

              return (
                <div key={b.id} onClick={() => prioritizeBubble(b.id)} style={{
                  padding: 14, borderRadius: 14,
                  background: C.surface,
                  border: `1px solid ${isApproaching ? mc + "60" : isBought ? C.match + "60" : C.border}`,
                  boxShadow: isApproaching ? `0 0 16px ${mc}20` : isBought ? `0 0 20px ${C.match}25` : "none",
                  cursor: "pointer",
                  animation: isBought ? "mt-bubble-merge 0.4s ease-in forwards" : isPassing ? "mt-bubble-out 0.5s ease-in forwards" : "mt-bubble-in 0.6s ease-out",
                  opacity: b.phase === "scanning" && b.score < 40 ? 0.4 : 1,
                  transition: "opacity 0.3s, border-color 0.3s, box-shadow 0.3s",
                  transform: isApproaching ? "translateX(-20px)" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Token logo / initials */}
                    {b.token.imageUrl ? (
                      <img src={b.token.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: `2px solid ${mc}30` }} />
                    ) : (
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        background: deterministicGradient(b.token.address), fontSize: 13, fontWeight: 800, color: "white",
                        border: `2px solid ${mc}30`,
                      }}>{initials(b.token.symbol)}</div>
                    )}

                    {/* Token info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{b.token.symbol}</span>
                        <span style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.token.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                        <span style={{ color: C.text, fontWeight: 600 }}>{fmt$(b.token.price)}</span>
                        <span style={{ color: b.token.priceChange1h >= 0 ? C.match : C.hot, fontWeight: 600 }}>{fmtPct(b.token.priceChange1h)}</span>
                        <span style={{ color: C.muted }}>Vol {fmt$(b.token.volume1h)}</span>
                        <span style={{ color: C.muted }}>{b.token.ageMinutes < 60 ? `${b.token.ageMinutes}m` : `${(b.token.ageMinutes / 60).toFixed(0)}h`}</span>
                      </div>
                    </div>

                    {/* Mode badge */}
                    <div style={{
                      padding: "3px 8px", borderRadius: 8, fontSize: 9, fontWeight: 800,
                      background: `${mc}20`, color: mc, border: `1px solid ${mc}40`,
                      letterSpacing: "0.5px",
                    }}>{b.mode}</div>
                  </div>

                  {/* Thinking text */}
                  {b.phase === "thinking" && b.thought && (
                    <div style={{ marginTop: 8, fontSize: 11, color: mc, fontFamily: "'SF Mono', 'Fira Code', monospace", animation: "mt-thought-in 0.2s ease-out" }}>
                      {b.thought}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Mobile responsive ── */}
      <style>{`
        @media(max-width:640px){
          .mt-main-layout{flex-direction:column!important}
          .mt-left-panel{width:100%!important;min-width:0!important;max-height:320px!important;border-right:none!important;border-bottom:1px solid rgba(255,255,255,0.07)!important}
          .mt-right-panel{flex:1!important;min-height:300px!important}
        }
      `}</style>
    </div>
  );
}
