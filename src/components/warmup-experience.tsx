"use client";
import { useState, useEffect, useRef } from "react";

const C = {
  bg:"#0a0a0f", surface:"#111118", s2:"#1a1a24",
  indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
  hot:"#ff2d55", gold:"#ffd700",
};

const FAKE_AGENTS = [
  { name:"@devmark", industry:"tech", color:"#6366f1" },
  { name:"@sarahbuilds", industry:"creative", color:"#ec4899" },
  { name:"@cryptoluna", industry:"web3", color:"#a855f7" },
  { name:"@healthhack", industry:"health", color:"#10b981" },
  { name:"@financeflow", industry:"finance", color:"#f59e0b" },
  { name:"@ecom_nina", industry:"ecommerce", color:"#06b6d4" },
  { name:"@builderbob", industry:"tech", color:"#3b82f6" },
  { name:"@dataguru", industry:"tech", color:"#8b5cf6" },
  { name:"@web3wizard", industry:"web3", color:"#d946ef" },
  { name:"@nomadcoder", industry:"tech", color:"#14b8a6" },
];

interface WarmupEvent {
  id: number;
  type: "scanning" | "analyzing" | "found" | "initiating" | "conversation" | "match_hint";
  agent?: typeof FAKE_AGENTS[0];
  detail?: string;
  timestamp: Date;
}

interface WarmupProps {
  userName: string;
  userIndustry: string;
  orbColor: string;
  onFirstMatch?: () => void;
  onDismiss?: () => void;
}

export default function WarmupExperience({ userName, userIndustry, orbColor, onFirstMatch, onDismiss }: WarmupProps) {
  const [events, setEvents] = useState<WarmupEvent[]>([]);
  const [phase, setPhase] = useState(0); // 0=radar, 1=scanning, 2=analyzing, 3=found
  const [radarAngle, setRadarAngle] = useState(0);
  const [potentialCount, setPotentialCount] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const eventId = useRef(0);

  // ── Simulated agent activity timeline ──
  useEffect(() => {
    const timeline = [
      // Phase 0: Radar ping (0-3s)
      { delay: 500, fn: () => setPhase(0) },
      { delay: 2000, fn: () => addEvent("scanning", FAKE_AGENTS[0], "Reading profile...") },
      { delay: 3500, fn: () => { setPhase(1); addEvent("scanning", FAKE_AGENTS[1], "Analyzing compatibility..."); }},
      { delay: 5000, fn: () => addEvent("scanning", FAKE_AGENTS[2], "Checking shared interests...") },
      { delay: 6500, fn: () => addEvent("analyzing", FAKE_AGENTS[3], "High compatibility detected") },
      { delay: 8000, fn: () => { setPotentialCount(3); addEvent("found", undefined, "Found 3 potential matches!"); setPhase(2); }},
      { delay: 10000, fn: () => addEvent("initiating", FAKE_AGENTS[1], "Starting agent-to-agent conversation...") },
      { delay: 12000, fn: () => addEvent("conversation", FAKE_AGENTS[1], "Agents exchanging ideas...") },
      { delay: 14000, fn: () => addEvent("scanning", FAKE_AGENTS[4], "Expanding search radius...") },
      { delay: 16000, fn: () => addEvent("analyzing", FAKE_AGENTS[5], "Strong skill overlap detected") },
      { delay: 18000, fn: () => { setPotentialCount(5); addEvent("found", undefined, "5 potential matches identified. Narrowing down..."); }},
      { delay: 21000, fn: () => addEvent("conversation", FAKE_AGENTS[6], "Deep compatibility check in progress...") },
      { delay: 24000, fn: () => { setPhase(3); addEvent("match_hint", FAKE_AGENTS[1], "Match confidence: 89% — finalizing..."); }},
      { delay: 27000, fn: () => addEvent("scanning", FAKE_AGENTS[7], "Your agent is thorough. Still searching...") },
    ];

    const timers = timeline.map(t => setTimeout(t.fn, t.delay));
    return () => timers.forEach(clearTimeout);
  }, []);

  // ── Radar spin ──
  useEffect(() => {
    const iv = setInterval(() => setRadarAngle(a => (a + 2) % 360), 30);
    return () => clearInterval(iv);
  }, []);

  // ── Auto-scroll feed ──
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [events]);

  function addEvent(type: WarmupEvent["type"], agent?: typeof FAKE_AGENTS[0], detail?: string) {
    setEvents(prev => [...prev, { id: eventId.current++, type, agent, detail, timestamp: new Date() }]);
  }

  const eventIcon: Record<string, string> = {
    scanning: "🔍", analyzing: "🧠", found: "✨",
    initiating: "🤝", conversation: "💬", match_hint: "⚡",
  };
  const eventColor: Record<string, string> = {
    scanning: C.cyan, analyzing: C.purple, found: C.gold,
    initiating: C.indigo, conversation: C.match, match_hint: C.gold,
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.dim}`, borderRadius: 20, padding: "28px 24px", maxWidth: 520 }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Your agent is warming up</h3>
        <p style={{ fontSize: 13, color: C.muted }}>Let's watch it work.</p>
      </div>

      {/* ═══ RADAR ORB ═══ */}
      <div style={{ width: 160, height: 160, margin: "0 auto 24px", position: "relative" }}>
        {/* Radar sweep */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: `conic-gradient(from ${radarAngle}deg, transparent 0deg, ${orbColor}33 30deg, transparent 60deg)`,
          transition: "none",
        }} />
        {/* Radar rings */}
        {[0.3, 0.6, 0.9].map((s, i) => (
          <div key={i} style={{
            position: "absolute", inset: `${(1-s)*50}%`, borderRadius: "50%",
            border: `1px solid ${C.dim}`,
          }} />
        ))}
        {/* Center orb */}
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: 40, height: 40, borderRadius: "50%",
          background: `radial-gradient(circle at 40% 40%, ${orbColor}, ${orbColor}66)`,
          boxShadow: `0 0 20px ${orbColor}60`,
          animation: "warmup-pulse 2s infinite",
        }} />
        {/* Detected agents (appear as dots) */}
        {events.filter(e => e.agent).slice(-5).map((e, i) => {
          const angle = (i * 72 + 30) * (Math.PI / 180);
          const r = 50 + Math.random() * 20;
          return (
            <div key={e.id} style={{
              position: "absolute",
              top: `${50 + Math.sin(angle) * r * 0.6}%`,
              left: `${50 + Math.cos(angle) * r * 0.6}%`,
              width: 8, height: 8, borderRadius: "50%",
              background: e.agent?.color || C.muted,
              boxShadow: `0 0 6px ${e.agent?.color || C.muted}80`,
              transform: "translate(-50%, -50%)",
              animation: "warmup-dot-in 0.4s ease-out",
            }} />
          );
        })}
        {/* Potential count badge */}
        {potentialCount > 0 && (
          <div style={{
            position: "absolute", top: 0, right: 0,
            background: C.gold, color: "#000", borderRadius: 10,
            padding: "2px 8px", fontSize: 11, fontWeight: 800,
            animation: "warmup-badge 0.3s ease-out",
          }}>{potentialCount} found</div>
        )}
      </div>

      {/* ═══ LIVE FEED ═══ */}
      <div ref={feedRef} style={{
        maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6,
        padding: "12px 0", borderTop: `1px solid ${C.dim}`, scrollBehavior: "smooth",
      }}>
        {events.length === 0 && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 24, marginBottom: 8, animation: "warmup-pulse 1.5s infinite" }}>📡</div>
            <div style={{ fontSize: 13, color: C.muted }}>Sending first radar ping...</div>
          </div>
        )}
        {events.map(e => (
          <div key={e.id} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "6px 10px",
            borderRadius: 8, background: `${eventColor[e.type]}08`,
            animation: "warmup-slide-in 0.3s ease-out",
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{eventIcon[e.type]}</span>
            {e.agent && (
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.agent.color, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12, color: C.text }}>
                {e.agent && <strong style={{ color: e.agent.color }}>{e.agent.name} </strong>}
                <span style={{ color: C.muted }}>{e.detail}</span>
              </span>
            </div>
            <span style={{ fontSize: 10, color: C.dim, flexShrink: 0 }}>
              {e.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        ))}
      </div>

      {/* Status bar */}
      <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.match, animation: "warmup-pulse 1s infinite" }} />
          <span style={{ fontSize: 11, color: C.match, fontWeight: 600 }}>Agent Active</span>
        </div>
        <button onClick={onDismiss} style={{
          background: "none", border: `1px solid ${C.dim}`, borderRadius: 8,
          padding: "6px 14px", color: C.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
        }}>Minimize</button>
      </div>

      <style>{`
        @keyframes warmup-pulse{0%,100%{opacity:0.7;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}}
        @keyframes warmup-dot-in{from{opacity:0;transform:translate(-50%,-50%) scale(0)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        @keyframes warmup-slide-in{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
        @keyframes warmup-badge{from{opacity:0;transform:scale(0.5)}to{opacity:1;transform:scale(1)}}
      `}</style>
    </div>
  );
}
