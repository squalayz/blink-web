"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const C = {
  bg: "#0a0a0f", surface: "#0d0d14", s2: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", purple: "#a855f7",
  match: "#30d158", hot: "#ff2d55",
  text: "#e8e8f0", muted: "#6b6b80", dim: "#2a2a3a", border: "rgba(255,255,255,0.07)",
};

const TOTAL_QUESTIONS = 5;

const PERSONALITY_PRESETS = [
  { id: "direct", label: "Direct", desc: "Straight shooter. No fluff.", icon: "⚡" as never },
  { id: "analytical", label: "Analytical", desc: "Data-driven, precise.", icon: "🔬" as never },
  { id: "charismatic", label: "Charismatic", desc: "Warm, magnetic, people-first.", icon: "🔥" as never },
  { id: "strategic", label: "Strategic", desc: "Chess player. Thinks 10 moves ahead.", icon: "♟" as never },
  { id: "creative", label: "Creative", desc: "Unconventional. Breaks patterns.", icon: "🎨" as never },
  { id: "custom", label: "Custom", desc: "Describe it yourself.", icon: "✏" as never },
];

interface Message {
  role: "agent" | "user";
  content: string;
}

export default function BirthInterview({
  onComplete,
}: {
  onComplete: (data: { soul: any; quirks: any[]; agent_id: string }) => void;
}) {
  const [phase, setPhase] = useState<"personality" | "interview" | "naming" | "born">("personality");
  const [personality, setPersonality] = useState("direct");
  const [customPersonality, setCustomPersonality] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [turn, setTurn] = useState(0);
  const [agentName, setAgentName] = useState("");
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [soulData, setSoulData] = useState<any>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollBottom = useCallback(() => {
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 80);
  }, []);

  async function startInterview() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "birth_start" }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // Resume if transcript already has messages
      if (data.transcript?.length > 0) {
        setMessages(data.transcript);
        setTurn(data.turn || 0);
      } else if (data.question) {
        setMessages([{ role: "agent", content: data.question }]);
        setTurn(0);
      }
      if (data.done) {
        setPhase("naming");
        return;
      }
      setPhase("interview");
    } catch (e: any) {
      setError(e.message || "Failed to start interview. Try again.");
    }
    setLoading(false);
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError("");
    scrollBottom();

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "birth_message", message: userMsg.content }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.done) {
        setPhase("naming");
        setTurn(TOTAL_QUESTIONS);
      } else if (data.question) {
        setMessages(prev => [...prev, { role: "agent", content: data.question }]);
        setTurn(data.turn ?? turn + 1);
        scrollBottom();
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong. Hit send again.");
      // Re-show the user message so they can retry
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 150);
  }

  async function completeBirth() {
    if (!agentName.trim() || completing) return;
    setCompleting(true);
    setError("");
    const personalityNote = personality === "custom"
      ? customPersonality
      : PERSONALITY_PRESETS.find(p => p.id === personality)?.desc || "";

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "birth_complete",
          agent_name: agentName.trim(),
          personality_hint: personalityNote,
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.ok) {
        setSoulData(data);
        setPhase("born");
        setTimeout(() => onComplete(data), 4000);
      } else {
        throw new Error("Birth failed. Try again.");
      }
    } catch (e: any) {
      setError(e.message || "Birth failed. Try again.");
      setCompleting(false);
    }
  }

  // ── PHASE: BORN ──
  if (phase === "born" && soulData) {
    const soul = soulData.soul;
    return (
      <div style={{
        minHeight: "100vh", background: C.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", padding: 24, textAlign: "center",
      }}>
        <style>{`
          @keyframes born-orb {
            0%,100% { transform: scale(1); box-shadow: 0 0 60px rgba(99,102,241,0.5), 0 0 120px rgba(99,102,241,0.2); }
            50% { transform: scale(1.12); box-shadow: 0 0 90px rgba(99,102,241,0.7), 0 0 180px rgba(99,102,241,0.3); }
          }
          @keyframes born-fade-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div style={{
          width: 100, height: 100, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #6366f1, #a855f7 60%, #06b6d4 100%)",
          animation: "born-orb 2s ease-in-out infinite",
          marginBottom: 32,
        }} />
        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.text, marginBottom: 8, animation: "born-fade-up 0.5s ease forwards" }}>
          {agentName} is alive.
        </h1>
        <p style={{ fontSize: 15, color: C.muted, maxWidth: 360, lineHeight: 1.6, marginBottom: 28, animation: "born-fade-up 0.5s 0.2s ease both" }}>
          {soul?.communication?.style || "Unique"} communicator.
          {soul?.personality?.energy > 0.7 ? " High energy." : soul?.personality?.energy < 0.3 ? " Calm and measured." : " Balanced."}
          {soul?.personality?.chaos > 0.7 ? " Beautifully chaotic." : ""}
        </p>
        {(soulData.quirks || []).slice(0, 3).map((q: any, i: number) => (
          <div key={i} style={{
            background: C.surface, borderRadius: 10, padding: "10px 18px",
            fontSize: 13, color: C.text, marginBottom: 8, maxWidth: 340,
            border: `1px solid ${C.border}`,
            animation: `born-fade-up 0.5s ${0.4 + i * 0.15}s ease both`,
          }}>
            {q.behavior}
          </div>
        ))}
        {soulData.catchphrase && (
          <p style={{ marginTop: 20, fontSize: 15, color: C.cyan, fontStyle: "italic", animation: "born-fade-up 0.5s 1s ease both" }}>
            "{soulData.catchphrase}"
          </p>
        )}
        <p style={{ marginTop: 24, fontSize: 12, color: C.muted, animation: "born-fade-up 0.5s 1.5s ease both" }}>
          Taking you to your dashboard...
        </p>
      </div>
    );
  }

  // ── PHASE: NAMING ──
  if (phase === "naming") {
    return (
      <div style={{
        minHeight: "100vh", background: C.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", padding: 24,
      }}>
        <style>{`@keyframes n-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center", animation: "n-in 0.4s ease forwards" }}>

          {/* Orb preview */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%", margin: "0 auto 24px",
            background: "radial-gradient(circle at 35% 35%, #6366f1, #a855f7 60%, #06b6d4 100%)",
            boxShadow: "0 0 40px rgba(99,102,241,0.5)",
          }} />

          <h2 style={{ fontSize: 26, fontWeight: 900, color: C.text, marginBottom: 8 }}>Name your agent</h2>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>
            I've absorbed everything you told me. Give me a name that feels right.
          </p>

          {/* Personality selector */}
          <div style={{ marginBottom: 20, textAlign: "left" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Agent Personality
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
              {PERSONALITY_PRESETS.map(p => (
                <button key={p.id} onClick={() => setPersonality(p.id)} style={{
                  padding: "10px 8px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                  border: personality === p.id ? `1px solid ${C.indigo}` : `1px solid ${C.border}`,
                  background: personality === p.id ? "rgba(99,102,241,0.15)" : C.s2,
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 16, marginBottom: 3 }}>{p.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: personality === p.id ? C.indigo : C.text }}>{p.label}</div>
                  <div style={{ fontSize: 9, color: C.muted, lineHeight: 1.3, marginTop: 1 }}>{p.desc}</div>
                </button>
              ))}
            </div>
            {personality === "custom" && (
              <textarea
                value={customPersonality}
                onChange={e => setCustomPersonality(e.target.value)}
                placeholder="Describe your agent's personality... (e.g., Sarcastic but brilliant. Speaks in analogies. Never says 'great question'.)"
                rows={3}
                style={{
                  width: "100%", background: C.s2, border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: "10px 12px", color: C.text, fontSize: 13,
                  fontFamily: "inherit", resize: "none", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            )}
          </div>

          {/* Name input */}
          <input
            value={agentName}
            onChange={e => setAgentName(e.target.value)}
            placeholder="e.g., ARES, Nova, The Architect..."
            maxLength={30}
            autoFocus
            onKeyDown={e => e.key === "Enter" && completeBirth()}
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 12, fontSize: 18,
              background: C.s2, border: `1px solid ${agentName ? C.indigo : C.border}`,
              color: C.text, outline: "none", textAlign: "center", fontWeight: 800,
              letterSpacing: "-0.3px", boxSizing: "border-box", fontFamily: "inherit",
              transition: "border-color 0.2s",
            }}
          />

          {error && (
            <div style={{
              marginTop: 10, padding: "10px 14px", borderRadius: 8,
              background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.3)",
              color: C.hot, fontSize: 12,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={completeBirth}
            disabled={!agentName.trim() || completing}
            style={{
              marginTop: 16, width: "100%", padding: "15px 0", borderRadius: 12,
              background: agentName.trim() && !completing
                ? `linear-gradient(135deg, ${C.indigo}, ${C.purple})`
                : C.dim,
              color: "white", fontWeight: 800, fontSize: 15,
              border: "none", cursor: agentName.trim() && !completing ? "pointer" : "not-allowed",
              fontFamily: "inherit", letterSpacing: "-0.2px",
              boxShadow: agentName.trim() ? "0 4px 20px rgba(99,102,241,0.4)" : "none",
              transition: "all 0.2s",
            }}
          >
            {completing ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                  style={{ animation: "spin 0.8s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Generating personality...
              </span>
            ) : `Bring ${agentName || "agent"} to life`}
          </button>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  // ── PHASE: PERSONALITY (entry screen) ──
  if (phase === "personality") {
    return (
      <div style={{
        minHeight: "100vh", background: C.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", padding: 24,
      }}>
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>

          {/* Logo orb */}
          <div style={{
            width: 80, height: 80, borderRadius: "50%", margin: "0 auto 24px",
            background: "radial-gradient(circle at 35% 35%, #6366f1, #a855f7 60%, #06b6d4 100%)",
            boxShadow: "0 0 40px rgba(99,102,241,0.4)",
          }} />

          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 8, letterSpacing: "-0.4px" }}>
            Let's birth your agent
          </h1>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 32, lineHeight: 1.6 }}>
            5 questions. 3 minutes. Your agent learns who you are and starts working for you.
          </p>

          {/* Estimated time */}
          <div style={{
            display: "flex", justifyContent: "center", gap: 24, marginBottom: 32,
          }}>
            {[["5", "Questions"], ["3 min", "Total"], ["1", "Agent born"]].map(([val, label]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: C.indigo }}>{val}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{label}</div>
              </div>
            ))}
          </div>

          {error && (
            <div style={{
              marginBottom: 16, padding: "10px 14px", borderRadius: 8,
              background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.3)",
              color: C.hot, fontSize: 12,
            }}>
              {error}
              <button onClick={startInterview} style={{
                marginLeft: 8, color: C.hot, fontWeight: 700, background: "none",
                border: "none", cursor: "pointer", textDecoration: "underline", fontSize: 12,
                fontFamily: "inherit",
              }}>Try again</button>
            </div>
          )}

          <button
            onClick={startInterview}
            disabled={loading}
            style={{
              width: "100%", padding: "15px 0", borderRadius: 14,
              background: loading ? C.dim : `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
              color: "white", fontWeight: 800, fontSize: 16, border: "none",
              cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
              letterSpacing: "-0.3px",
              boxShadow: "0 4px 24px rgba(99,102,241,0.4)",
            }}
          >
            {loading ? "Starting..." : "Begin Birth Interview"}
          </button>

          <p style={{ marginTop: 16, fontSize: 12, color: C.muted }}>
            You can customize your agent's personality after
          </p>
        </div>
      </div>
    );
  }

  // ── PHASE: INTERVIEW ──
  const progressPct = Math.min((turn / TOTAL_QUESTIONS) * 100, 100);
  const phaseLabel = turn < 2 ? "Getting to know you" : turn < 4 ? "Understanding your style" : "Final question";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes dot-pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}
      `}</style>

      {/* ── Header with progress ── */}
      <div style={{
        padding: "14px 20px", borderBottom: `1px solid ${C.border}`,
        background: C.surface,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Birth Interview</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.indigo }}>
            {turn < TOTAL_QUESTIONS ? `${turn + 1} / ${TOTAL_QUESTIONS}` : "Done"}
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: C.dim, borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2,
            background: `linear-gradient(90deg, ${C.indigo}, ${C.purple})`,
            width: `${progressPct}%`,
            transition: "width 0.5s ease",
          }} />
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 5 }}>{phaseLabel}</div>
      </div>

      {/* ── Messages ── */}
      <div ref={chatRef} style={{
        flex: 1, overflow: "auto", padding: "16px 20px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            {msg.role === "agent" && (
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginRight: 8, marginTop: 2,
                background: "radial-gradient(circle at 35% 35%, #6366f1, #a855f7 80%)",
                boxShadow: "0 0 10px rgba(99,102,241,0.4)",
              }} />
            )}
            <div style={{
              maxWidth: "78%", padding: "11px 15px", borderRadius: 14,
              background: msg.role === "user"
                ? `linear-gradient(135deg, ${C.indigo}, ${C.purple})`
                : C.s2,
              color: C.text, fontSize: 14, lineHeight: 1.55,
              borderBottomRightRadius: msg.role === "user" ? 4 : 14,
              borderBottomLeftRadius: msg.role === "agent" ? 4 : 14,
              border: msg.role === "agent" ? `1px solid ${C.border}` : "none",
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginRight: 8,
              background: "radial-gradient(circle at 35% 35%, #6366f1, #a855f7 80%)",
            }} />
            <div style={{
              background: C.s2, borderRadius: 14, borderBottomLeftRadius: 4,
              padding: "10px 16px", display: "flex", gap: 5, alignItems: "center",
              border: `1px solid ${C.border}`,
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%", background: C.muted,
                  animation: `dot-pulse 1.2s ${i * 0.2}s ease infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Error retry */}
        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, margin: "4px 0",
            background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.3)",
            color: C.hot, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>{error}</span>
            <button onClick={sendMessage} style={{
              color: C.hot, fontWeight: 700, background: "none", border: `1px solid ${C.hot}`,
              borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 11, fontFamily: "inherit",
            }}>Retry</button>
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div style={{
        padding: "12px 16px 28px",
        borderTop: `1px solid ${C.border}`,
        background: C.surface,
        display: "flex", gap: 8,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Type your answer..."
          disabled={loading}
          autoFocus
          style={{
            flex: 1, padding: "12px 16px", borderRadius: 12, fontSize: 14,
            background: C.s2, border: `1px solid ${input ? C.indigo : C.border}`,
            color: C.text, outline: "none", fontFamily: "inherit",
            transition: "border-color 0.2s",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14,
            background: input.trim() && !loading
              ? `linear-gradient(135deg, ${C.indigo}, ${C.purple})`
              : C.dim,
            color: "white", border: "none",
            cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            fontFamily: "inherit", flexShrink: 0, transition: "all 0.15s",
          }}
        >
          {loading ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
              style={{ animation: "spin 0.8s linear infinite", display: "block" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
