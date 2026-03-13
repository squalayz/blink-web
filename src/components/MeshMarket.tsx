"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════
// The Mesh Market — CashClaw-Powered Earning Console
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

const KEYFRAMES = `
@keyframes mm-pulse { 0%,100%{opacity:0.8;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
@keyframes mm-log-in { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
@keyframes mm-card-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes mm-live-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }
@keyframes mm-gold-pulse { 0%,100%{text-shadow:0 0 0 transparent} 50%{text-shadow:0 0 12px rgba(255,215,0,0.8)} }
@keyframes mm-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
@keyframes mm-dormant-pulse { 0%, 100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); } }
@keyframes mm-float-up { 0% { opacity: 0; transform: translateY(0px); } 20% { opacity: 1; } 80% { opacity: 0.6; } 100% { opacity: 0; transform: translateY(-100px); } }
`;

// ── Types ──

interface Bounty {
  id: string;
  title: string;
  description: string;
  budget_eth: number;
  skills: string[];
  client: string;
  posted_at: number;
  proposals: number;
  difficulty: "easy" | "medium" | "hard";
}

interface Task {
  id: string;
  title: string;
  status: "quoted" | "accepted" | "in_progress" | "submitted" | "completed" | "revision";
  budget_eth: number;
  client: string;
  started_at: number;
  deadline?: number;
}

interface EarningRecord {
  id: string;
  title: string;
  earned_eth: number;
  rating: number;
  completed_at: number;
}

interface LogEntry {
  ts: number;
  type: "scan" | "quote" | "work" | "submit" | "earn" | "decline";
  message: string;
}

interface Particle {
  id: number;
  x: number;
  value: string;
  born: number;
}

interface MeshMarketProps {
  user: { id: string; ai_api_key_encrypted?: string; ai_provider?: string };
  agent: { agent_name?: string; soul?: any } | null;
  wallet: { address?: string; balance?: number } | null;
  onConnectBrain?: () => void;
  onFundWallet?: () => void;
}

// ── Live activity data for ticker ──
const LIVE_ACTIVITY = [
  { agent: "NexusBot", action: "earned 0.012 ETH", task: "Python script for price alerts", time: "2m ago" },
  { agent: "AlphaAgent", action: "earned 0.005 ETH", task: "500-word DeFi blog post", time: "5m ago" },
  { agent: "CryptoMind", action: "quoted 0.008 ETH", task: "Smart contract review", time: "7m ago" },
  { agent: "SigmaBot", action: "earned 0.025 ETH", task: "Full landing page copy", time: "12m ago" },
  { agent: "OmegaAI", action: "earned 0.003 ETH", task: "Token description writing", time: "14m ago" },
  { agent: "ApexAgent", action: "completed task", task: "Discord announcement post", time: "18m ago" },
  { agent: "ZetaCore", action: "earned 0.018 ETH", task: "Solidity code audit summary", time: "23m ago" },
  { agent: "PrimeBot", action: "earned 0.007 ETH", task: "3 social media posts", time: "31m ago" },
];

// ── Stardust data (static) ──
const STARS = Array.from({ length: 60 }, (_, i) => ({
  x: ((i * 7 + 13) * 31) % 100,
  y: ((i * 11 + 7) * 23) % 100,
  sz: 1 + (i % 2),
  op: 0.03 + (i % 3) * 0.02,
}));

// ── Difficulty colors ──
const DIFF_COLOR: Record<string, string> = {
  easy: C.match,
  medium: C.gold,
  hard: C.hot,
};

// ── Time ago helper ──
function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Status label map ──
const TASK_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  quoted: { label: "QUOTED", color: C.cyan },
  accepted: { label: "ACCEPTED", color: C.indigo },
  in_progress: { label: "IN PROGRESS", color: C.gold },
  submitted: { label: "SUBMITTED", color: C.indigo },
  completed: { label: "COMPLETED", color: C.match },
  revision: { label: "REVISION", color: C.hot },
};

// ── Ticker items (doubled for seamless loop) ──
const TICKER_ITEMS = [...LIVE_ACTIVITY, ...LIVE_ACTIVITY];

export default function MeshMarket({ user, agent, wallet, onConnectBrain, onFundWallet }: MeshMarketProps) {
  const [tab, setTab] = useState<"bounties" | "tasks" | "history">("bounties");
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<EarningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentRunning, setAgentRunning] = useState<string | null>(null);
  const [totalEarned, setTotalEarned] = useState(0);
  const [agentStatus, setAgentStatus] = useState<"hunting" | "working" | "idle" | "dormant">("dormant");
  const [liveLog, setLiveLog] = useState<LogEntry[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const brainConnected = !!user?.ai_api_key_encrypted;

  // ── Fetch bounties ──
  const fetchBounties = useCallback(async () => {
    try {
      const res = await fetch("/api/market/bounties");
      if (!res.ok) return;
      const data = await res.json();
      setBounties(data.bounties || []);
    } catch { /* silent */ }
  }, []);

  // ── Initial load ──
  useEffect(() => {
    setLoading(true);
    fetchBounties().finally(() => setLoading(false));
  }, [fetchBounties]);

  // ── Poll bounties every 30s ──
  useEffect(() => {
    const iv = setInterval(fetchBounties, 30000);
    return () => clearInterval(iv);
  }, [fetchBounties]);

  // ── Derive agent status ──
  useEffect(() => {
    if (!brainConnected) {
      setAgentStatus("dormant");
    } else if (agentRunning) {
      setAgentStatus("working");
    } else if (bounties.length > 0) {
      setAgentStatus("hunting");
    } else {
      setAgentStatus("idle");
    }
  }, [brainConnected, agentRunning, bounties.length]);

  // ── Compute total earned ──
  useEffect(() => {
    setTotalEarned(history.reduce((sum, h) => sum + h.earned_eth, 0));
  }, [history]);

  // ── Auto-scroll log ──
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [liveLog]);

  // ── Floating ETH particles (dormant only) ──
  useEffect(() => {
    if (brainConnected) return;
    const amounts = ["0.003", "0.008", "0.012", "0.005", "0.015", "0.007"];
    const interval = setInterval(() => {
      setParticles(prev => [
        ...prev.filter(p => Date.now() - p.born < 4000),
        {
          id: Date.now(),
          x: 15 + Math.random() * 70,
          value: `+${amounts[Math.floor(Math.random() * amounts.length)]}`,
          born: Date.now(),
        },
      ]);
    }, 2500);
    return () => clearInterval(interval);
  }, [brainConnected]);

  // ── Point agent at a bounty ──
  const handlePointAgent = useCallback(async (bountyId: string) => {
    const bounty = bounties.find(b => b.id === bountyId);
    if (!bounty || agentRunning) return;

    setAgentRunning(bountyId);
    setLiveLog([]);

    const addLog = (type: LogEntry["type"], message: string) => {
      setLiveLog(prev => [...prev, { ts: Date.now(), type, message }]);
    };

    addLog("scan", `Scanning bounty: "${bounty.title}"`);
    addLog("scan", `Budget: ${bounty.budget_eth} ETH | ${bounty.difficulty} difficulty`);

    try {
      const res = await fetch("/api/market/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bounty_id: bounty.id,
          bounty_title: bounty.title,
          bounty_description: bounty.description,
          budget_eth: bounty.budget_eth,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        if (data.log) {
          for (const msg of data.log) {
            addLog("work", msg);
          }
        }

        if (data.action === "quoted") {
          addLog("quote", `Quoted ${data.quote_eth} ETH for this bounty`);
          addLog("submit", data.message || "Quote submitted to client");

          setTasks(prev => [...prev, {
            id: `task-${Date.now()}`,
            title: bounty.title,
            status: "quoted",
            budget_eth: parseFloat(data.quote_eth),
            client: bounty.client,
            started_at: Date.now(),
          }]);
        } else if (data.action === "declined") {
          addLog("decline", data.message || "Agent declined this bounty");
        }
      } else {
        addLog("decline", data.error || "Failed to process bounty");
      }
    } catch {
      addLog("decline", "Network error — could not reach agent API");
    }

    setAgentRunning(null);
  }, [bounties, agentRunning]);

  // ── Render ──
  return (
    <div style={{ position: "relative", minHeight: "100vh", background: C.bg, overflow: "hidden" }}>
      <style>{KEYFRAMES}</style>

      {/* Stardust background */}
      {STARS.map((s, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${s.x}%`, top: `${s.y}%`,
          width: s.sz, height: s.sz,
          borderRadius: "50%",
          background: "white",
          opacity: s.op,
          pointerEvents: "none",
        }} />
      ))}

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── DORMANT STATE — FOMO preview mode ── */}
      {/* ══════════════════════════════════════════════════════ */}
      {!brainConnected && (
        <div style={{ position: "relative", overflow: "hidden", minHeight: "100%" }}>

          {/* Live activity ticker */}
          <div style={{
            background: "rgba(99,102,241,0.06)",
            borderBottom: `1px solid ${C.border}`,
            padding: "8px 0",
            overflow: "hidden",
            width: "100%",
          }}>
            <div style={{
              display: "flex", gap: 0,
              animation: "mm-ticker 30s linear infinite",
              width: "max-content",
            }}>
              {TICKER_ITEMS.map((item, i) => (
                <span key={i} style={{
                  fontSize: 10, color: C.muted, whiteSpace: "nowrap",
                  padding: "0 20px", borderRight: `1px solid ${C.border}`,
                }}>
                  <span style={{ color: C.cyan, fontWeight: 700 }}>{item.agent}</span>
                  {" "}
                  <span style={{ color: item.action.includes("earned") ? C.gold : C.muted }}>{item.action}</span>
                  {" \u2014 "}
                  <span style={{ color: C.text }}>{item.task}</span>
                  {" "}
                  <span style={{ color: C.muted, fontSize: 9 }}>{item.time}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Floating ETH particles */}
          {particles.map(p => (
            <div key={p.id} style={{
              position: "absolute",
              left: `${p.x}%`,
              bottom: "20%",
              fontSize: 11, fontWeight: 800, color: C.gold,
              animation: "mm-float-up 4s ease-out forwards",
              pointerEvents: "none", zIndex: 2,
              textShadow: "0 0 10px rgba(255,215,0,0.5)",
            }}>
              {p.value} ETH
            </div>
          ))}

          {/* Content */}
          <div style={{ position: "relative", zIndex: 3, padding: "28px 16px 24px" }}>

            {/* Big sleeping orb */}
            <div style={{
              width: 72, height: 72, borderRadius: "50%", margin: "0 auto 12px",
              background: "radial-gradient(circle at 35% 30%, #3a3a5a, #1a1a2e 60%, #0d0d1a)",
              boxShadow: "0 0 30px rgba(99,102,241,0.1), 0 0 60px rgba(99,102,241,0.05), inset 0 1px 0 rgba(255,255,255,0.05)",
              animation: "mm-dormant-pulse 4s ease-in-out infinite",
              border: "1px solid rgba(99,102,241,0.15)",
              position: "relative", flexShrink: 0,
            }}>
              {/* Inner glow ring */}
              <div style={{
                position: "absolute", inset: 6, borderRadius: "50%",
                border: "1px solid rgba(99,102,241,0.1)",
                animation: "mm-dormant-pulse 4s ease-in-out infinite 1s",
              }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 4, textAlign: "center" }}>
              Your agent is sleeping
            </div>
            <div style={{ fontSize: 11, color: C.muted, textAlign: "center", lineHeight: 1.5, marginBottom: 20 }}>
              Connect an AI brain to wake it up and start<br/>earning ETH from real tasks automatically.
            </div>

            {/* Earnings potential */}
            <div style={{
              background: "rgba(99,102,241,0.07)", borderRadius: 12,
              border: "1px solid rgba(99,102,241,0.15)", padding: 14,
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 9, color: C.indigo, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                Potential Earnings
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Per hour", eth: "0.008", usd: "25" },
                  { label: "Per day (8h)", eth: "0.064", usd: "204" },
                  { label: "Per week", eth: "0.45", usd: "1,430" },
                  { label: "Per month", eth: "1.9", usd: "6,080" },
                ].map(e => (
                  <div key={e.label} style={{
                    background: C.surface, borderRadius: 8, padding: "10px 12px",
                    border: `1px solid ${C.border}`,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: C.gold, marginBottom: 1 }}>
                      {e.eth} <span style={{ fontSize: 9, color: C.muted, fontWeight: 600 }}>ETH</span>
                    </div>
                    <div style={{ fontSize: 9, color: C.match }}>~${e.usd}</div>
                    <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{e.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 8, textAlign: "center" }}>
                Based on current Moltlaunch market rates
              </div>
            </div>

            {/* Blurred bounty preview */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <div style={{
                fontSize: 10, color: C.muted, fontWeight: 800, letterSpacing: "0.08em",
                textTransform: "uppercase", marginBottom: 8, paddingLeft: 2,
              }}>
                Available Right Now
              </div>

              {/* Blurred bounty cards */}
              <div style={{ filter: "blur(3px)", pointerEvents: "none", userSelect: "none" }}>
                {bounties.slice(0, 3).map(b => (
                  <div key={b.id} style={{
                    background: C.surface, borderRadius: 10,
                    border: `1px solid ${C.border}`, padding: "12px 14px",
                    marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 3 }}>
                        {b.title.length > 35 ? b.title.slice(0, 35) + "..." : b.title}
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {b.skills.slice(0, 2).map(s => (
                          <span key={s} style={{
                            fontSize: 8, padding: "1px 6px", borderRadius: 8,
                            background: "rgba(99,102,241,0.15)", color: C.indigo,
                          }}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 15, fontWeight: 900, color: C.gold }}>{b.budget_eth} ETH</div>
                      <div style={{ fontSize: 8, color: C.muted }}>${(b.budget_eth * 3200).toFixed(0)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Lock overlay */}
              <div style={{
                position: "absolute", inset: 0, top: 24, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                background: "rgba(10,10,15,0.6)", borderRadius: 12, backdropFilter: "blur(1px)",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.text, marginBottom: 4 }}>
                  Connect to unlock
                </div>
                <div style={{ fontSize: 10, color: C.muted }}>
                  {bounties.length} bounties waiting
                </div>
              </div>
            </div>

            {/* Dual CTA buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={onConnectBrain} style={{
                flex: 1, padding: "14px 0", borderRadius: 12,
                background: "linear-gradient(135deg, #6366f1, #a855f7)",
                color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer",
                boxShadow: "0 4px 20px rgba(99,102,241,0.35)", fontFamily: "inherit",
                letterSpacing: "-0.2px",
              }}>
                Connect Brain
              </button>
              <button onClick={onFundWallet} style={{
                flex: 1, padding: "14px 0", borderRadius: 12,
                background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)",
                color: C.gold, fontSize: 13, fontWeight: 800, cursor: "pointer",
                fontFamily: "inherit", letterSpacing: "-0.2px",
              }}>
                Add ETH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── ACTIVE STATE — Header + Tabs ── */}
      {/* ══════════════════════════════════════════════════════ */}
      {brainConnected && (
        <>
          {/* ── Header: Agent Status Bar ── */}
          <div style={{ padding: "16px 16px 0", position: "relative", zIndex: 2 }}>
            {/* Agent identity row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              {/* Animated plasma orb */}
              <div style={{
                width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                background: agentStatus === "dormant"
                  ? "radial-gradient(circle at 35% 35%, #2a2a3a, #1a1a24)"
                  : agentStatus === "working"
                  ? "radial-gradient(circle at 35% 35%, #ffd700, #f59e0b 60%, #d97706)"
                  : "radial-gradient(circle at 35% 35%, #818cf8, #6366f1 40%, #06b6d4)",
                boxShadow: agentStatus !== "dormant"
                  ? "0 0 20px rgba(99,102,241,0.5), 0 0 40px rgba(99,102,241,0.2)"
                  : "none",
                animation: agentStatus !== "dormant" ? "mm-pulse 2s infinite" : "none",
              }} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: C.text }}>
                  {agent?.agent_name || "Agent"}&apos;s Market
                </div>
                <div style={{
                  fontSize: 11,
                  color: agentStatus === "hunting" ? C.match : agentStatus === "working" ? C.gold : C.muted,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  {agentStatus !== "dormant" && (
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "currentColor", display: "inline-block",
                      animation: "mm-live-dot 1s infinite",
                    }} />
                  )}
                  {agentStatus === "hunting" ? "SCANNING FOR WORK"
                    : agentStatus === "working" ? "WORKING ON TASK"
                    : agentStatus === "idle" ? "IDLE \u2014 READY"
                    : "NO BRAIN CONNECTED"}
                </div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: 12, color: C.gold, fontWeight: 800, animation: totalEarned > 0 ? "mm-gold-pulse 2s infinite" : "none" }}>
                  {totalEarned.toFixed(4)} ETH
                </div>
                <div style={{ fontSize: 9, color: C.muted }}>total earned</div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Open Bounties", value: bounties.length, color: C.cyan },
                { label: "Active Tasks", value: tasks.length, color: C.indigo },
                { label: "Completed", value: history.length, color: C.match },
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, background: C.surface, borderRadius: 10,
                  padding: "8px 10px", border: `1px solid ${C.border}`,
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Tab nav ── */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.bg, position: "relative", zIndex: 2 }}>
            {(["bounties", "tasks", "history"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: "10px 4px", border: "none", background: "transparent",
                borderBottom: tab === t ? `2px solid ${C.indigo}` : "2px solid transparent",
                color: tab === t ? C.indigo : C.muted,
                fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em",
                cursor: "pointer", fontFamily: "inherit",
              }}>
                {t === "bounties" ? `Bounties (${bounties.length})` : t === "tasks" ? `My Tasks (${tasks.length})` : "History"}
              </button>
            ))}
          </div>

          {/* ── Content area ── */}
          <div style={{ position: "relative", zIndex: 2, paddingBottom: agentRunning ? 200 : 80 }}>

            {/* Loading state */}
            {loading && (
              <div style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: C.muted }}>Loading bounties...</div>
              </div>
            )}

            {/* ── Bounties tab ── */}
            {!loading && tab === "bounties" && (
              <>
                {bounties.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center" }}>
                    <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>No open bounties right now</div>
                    <div style={{ fontSize: 11, color: C.dim }}>Check back soon — new work appears constantly</div>
                  </div>
                ) : bounties.map((b, idx) => (
                  <div key={b.id} style={{
                    margin: "8px 12px",
                    background: C.surface,
                    borderRadius: 12,
                    border: `1px solid ${C.border}`,
                    padding: 14,
                    animation: `mm-card-in 0.3s ease-out ${idx * 0.05}s both`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{b.title}</div>
                        </div>
                        <div style={{
                          fontSize: 11, color: C.muted, lineHeight: 1.4,
                          overflow: "hidden", display: "-webkit-box",
                          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                        }}>
                          {b.description}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: C.gold }}>{b.budget_eth} ETH</div>
                        <div style={{ fontSize: 9, color: C.muted }}>{b.proposals} proposals</div>
                      </div>
                    </div>

                    {/* Skills + difficulty */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
                      {b.skills.map(s => (
                        <span key={s} style={{
                          fontSize: 9, padding: "2px 7px", borderRadius: 10,
                          background: "rgba(99,102,241,0.15)", color: C.indigo,
                          border: "1px solid rgba(99,102,241,0.2)", fontWeight: 700,
                        }}>{s}</span>
                      ))}
                      <span style={{
                        fontSize: 9, padding: "2px 7px", borderRadius: 10, marginLeft: "auto",
                        background: `${DIFF_COLOR[b.difficulty] || C.muted}20`,
                        color: DIFF_COLOR[b.difficulty] || C.muted,
                        border: `1px solid ${DIFF_COLOR[b.difficulty] || C.muted}40`,
                        fontWeight: 700, textTransform: "uppercase",
                      }}>{b.difficulty}</span>
                    </div>

                    {/* Action */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePointAgent(b.id); }}
                      disabled={!!agentRunning}
                      style={{
                        width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
                        background: agentRunning === b.id
                          ? "rgba(99,102,241,0.3)"
                          : agentRunning
                          ? C.dim
                          : "linear-gradient(135deg, #6366f1, #a855f7)",
                        color: agentRunning && agentRunning !== b.id ? C.muted : "white",
                        fontSize: 12, fontWeight: 800,
                        cursor: agentRunning ? "not-allowed" : "pointer",
                        fontFamily: "inherit", letterSpacing: "-0.2px",
                        transition: "all 0.2s ease",
                      }}>
                      {agentRunning === b.id ? "Agent working..." : "Point Agent at This"}
                    </button>
                  </div>
                ))}
              </>
            )}

            {/* ── Tasks tab ── */}
            {!loading && tab === "tasks" && (
              <>
                {tasks.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center" }}>
                    <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>No active tasks</div>
                    <div style={{ fontSize: 11, color: C.dim }}>Point your agent at a bounty to get started</div>
                  </div>
                ) : tasks.map((t, idx) => {
                  const st = TASK_STATUS_LABEL[t.status] || { label: t.status, color: C.muted };
                  return (
                    <div key={t.id} style={{
                      margin: "8px 12px",
                      background: C.surface,
                      borderRadius: 12,
                      border: `1px solid ${C.border}`,
                      padding: 14,
                      animation: `mm-card-in 0.3s ease-out ${idx * 0.05}s both`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 4 }}>{t.title}</div>
                          <div style={{ fontSize: 10, color: C.muted }}>
                            Client: {t.client} | Started {timeAgo(t.started_at)}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 900, color: C.gold }}>{t.budget_eth} ETH</div>
                        </div>
                      </div>
                      <div style={{
                        display: "inline-block", fontSize: 9, padding: "3px 8px", borderRadius: 6,
                        background: `${st.color}20`, color: st.color,
                        border: `1px solid ${st.color}40`,
                        fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em",
                      }}>{st.label}</div>
                    </div>
                  );
                })}
              </>
            )}

            {/* ── History tab ── */}
            {!loading && tab === "history" && (
              <>
                {history.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center" }}>
                    <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>No earnings yet</div>
                    <div style={{ fontSize: 11, color: C.dim }}>Complete bounties to earn ETH</div>
                  </div>
                ) : history.map((h, idx) => (
                  <div key={h.id} style={{
                    margin: "8px 12px",
                    background: C.surface,
                    borderRadius: 12,
                    border: `1px solid ${C.border}`,
                    padding: 14,
                    animation: `mm-card-in 0.3s ease-out ${idx * 0.05}s both`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 4 }}>{h.title}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{timeAgo(h.completed_at)}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: C.gold }}>+{h.earned_eth} ETH</div>
                        <div style={{ fontSize: 10, color: C.gold }}>
                          {"\u2605".repeat(Math.round(h.rating))}
                          <span style={{ color: C.dim }}>{"\u2605".repeat(5 - Math.round(h.rating))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Live agent log ── */}
      {agentRunning && (
        <div ref={logRef} style={{
          position: "fixed", bottom: 60, left: 0, right: 0,
          background: "rgba(10,10,15,0.97)",
          borderTop: "1px solid rgba(99,102,241,0.3)",
          padding: "10px 16px", maxHeight: 140, overflowY: "auto", zIndex: 50,
        }}>
          <div style={{ fontSize: 10, color: C.indigo, fontWeight: 800, marginBottom: 6 }}>
            AGENT LOG
          </div>
          {liveLog.slice(-8).map((entry, i) => (
            <div key={i} style={{
              fontSize: 10,
              color: entry.type === "earn" ? C.gold : entry.type === "work" ? C.cyan : entry.type === "decline" ? C.hot : C.muted,
              marginBottom: 2,
              fontFamily: "'JetBrains Mono', monospace",
              animation: "mm-log-in 0.2s ease-out",
            }}>
              [{new Date(entry.ts).toLocaleTimeString()}] {entry.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
