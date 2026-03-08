"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { X, Send, Minimize2 } from "lucide-react";

const C = {
  bg: "#0a0a0f", surface: "#0d0d14", s2: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", match: "#30d158",
  hot: "#ff2d55", gold: "#ffd700", text: "#e8e8f0",
  muted: "#6b6b80", dim: "#2a2a3a", border: "rgba(255,255,255,0.07)",
};

interface ChatMessage {
  id: string; role: "user" | "agent"; content: string; timestamp: number;
}

const STARTER_PROMPTS = [
  "What's pumping on Base right now?",
  "Find me someone to work with",
  "How's my trading performance?",
  "Find me someone I'd vibe with",
  "Tell me about my agent",
];

const PLACEHOLDERS = [
  "Ask me anything...", "Tell me your risk tolerance...",
  "What tokens excite you?", "Who are you trying to meet?",
];

const PROACTIVE = [
  "I spotted 3 high-score tokens on Base 🎯",
  "Your network is growing — 2 new potential matches",
  "I found someone you should meet. Want details?",
];

// ── Plasma Orb Canvas ──
function PlasmaOrb({
  size = 64, state = "idle", speaking = false
}: {
  size?: number; state?: "idle" | "thinking" | "speaking" | "alert"; speaking?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.36;

    function draw() {
      if (!ctx) return;
      tRef.current += state === "thinking" ? 0.04 : state === "speaking" ? 0.07 : 0.02;
      const t = tRef.current;

      ctx.clearRect(0, 0, size, size);

      // Outer glow ring
      const glowR = r + 6 + Math.sin(t * 1.3) * 3;
      const glowAlpha = state === "alert" ? 0.5 + Math.sin(t * 4) * 0.3 : 0.25 + Math.sin(t) * 0.1;
      const outerGlow = ctx.createRadialGradient(cx, cy, glowR * 0.5, cx, cy, glowR + 12);
      outerGlow.addColorStop(0, `rgba(99,102,241,${glowAlpha})`);
      outerGlow.addColorStop(0.5, `rgba(6,182,212,${glowAlpha * 0.5})`);
      outerGlow.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, glowR + 12, 0, Math.PI * 2);
      ctx.fillStyle = outerGlow;
      ctx.fill();

      // Rotating ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.8);
      ctx.strokeStyle = `rgba(99,102,241,${0.3 + Math.sin(t * 2) * 0.15})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, r + 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Counter-rotating ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-t * 0.5);
      ctx.strokeStyle = `rgba(6,182,212,${0.2 + Math.sin(t * 1.5) * 0.1})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, r + 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Core plasma blob — morph shape
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      const pts = 64;
      for (let i = 0; i <= pts; i++) {
        const angle = (i / pts) * Math.PI * 2;
        const wobble = 1
          + Math.sin(angle * 3 + t * 2.1) * 0.06
          + Math.sin(angle * 5 + t * 1.4) * 0.04
          + (state === "speaking" ? Math.sin(angle * 7 + t * 5) * 0.08 : 0)
          + (state === "thinking" ? Math.sin(angle * 4 + t * 3) * 0.06 : 0);
        const rad = r * wobble;
        const x = Math.cos(angle) * rad;
        const y = Math.sin(angle) * rad;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Core gradient — shifts with state
      const hue1 = state === "alert" ? "#ff2d55" : state === "thinking" ? "#a855f7" : "#6366f1";
      const hue2 = state === "speaking" ? "#30d158" : "#06b6d4";
      const coreGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r);
      coreGrad.addColorStop(0, "rgba(255,255,255,0.9)");
      coreGrad.addColorStop(0.2, hue1);
      coreGrad.addColorStop(0.6, hue2);
      coreGrad.addColorStop(1, "rgba(0,0,0,0.3)");
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Specular highlight
      const specGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 0, -r * 0.1, -r * 0.1, r * 0.7);
      specGrad.addColorStop(0, "rgba(255,255,255,0.4)");
      specGrad.addColorStop(0.4, "rgba(255,255,255,0.05)");
      specGrad.addColorStop(1, "transparent");
      ctx.fillStyle = specGrad;
      ctx.fill();
      ctx.restore();

      // Inner sparks when thinking
      if (state === "thinking" || state === "speaking") {
        for (let i = 0; i < 3; i++) {
          const angle = t * 2.5 + (i * Math.PI * 2) / 3;
          const sr = r * 0.6;
          const sx = cx + Math.cos(angle) * sr;
          const sy = cy + Math.sin(angle) * sr;
          const sparkAlpha = 0.4 + Math.sin(t * 4 + i) * 0.3;
          ctx.beginPath();
          ctx.arc(sx, sy, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${sparkAlpha})`;
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [size, state]);

  return <canvas ref={canvasRef} style={{ display: "block", borderRadius: "50%" }} />;
}

// ── Floating physics hook ──
function useFloatingPosition(isMobile: boolean, isOpen: boolean) {
  const baseX = isMobile ? window.innerWidth - 76 : window.innerWidth - 88;
  const baseY = isMobile ? window.innerHeight - 160 : window.innerHeight - 104;

  const x = useMotionValue(baseX);
  const y = useMotionValue(baseY);
  const springX = useSpring(x, { stiffness: 80, damping: 20 });
  const springY = useSpring(y, { stiffness: 80, damping: 20 });

  // Gentle idle float
  useEffect(() => {
    if (isOpen) return;
    let t = 0;
    const iv = setInterval(() => {
      t += 0.02;
      x.set(baseX + Math.sin(t * 0.7) * 6);
      y.set(baseY + Math.sin(t) * 8);
    }, 16);
    return () => clearInterval(iv);
  }, [isOpen, baseX, baseY, x, y]);

  return { x: springX, y: springY };
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours(), m = d.getMinutes().toString().padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
}

export default function AgentChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [agentName, setAgentName] = useState("Your Agent");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [proactiveSent, setProactiveSent] = useState(false);
  const [orbState, setOrbState] = useState<"idle" | "thinking" | "speaking" | "alert">("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [welcomeSent, setWelcomeSent] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { x, y } = useFloatingPosition(isMobile, open);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fetch agent name
  useEffect(() => {
    fetch("/api/auth/session").then(r => r.json()).then(d => {
      if (d?.user?.name) setAgentName(d.user.name.split(" ")[0] + "'s Agent");
    }).catch(() => {});
  }, []);

  // Rotate placeholders
  useEffect(() => {
    const iv = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 3500);
    return () => clearInterval(iv);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  // Welcome message
  useEffect(() => {
    if (open && !welcomeSent && messages.length === 0) {
      setWelcomeSent(true);
      setTimeout(() => {
        setMessages([{
          id: crypto.randomUUID(), role: "agent",
          content: "Hey 👋 I'm your agent. I trade, connect, and learn — all for you. What do you need?",
          timestamp: Date.now(),
        }]);
      }, 400);
    }
  }, [open, welcomeSent, messages.length]);

  // Proactive orb alert after 8s
  useEffect(() => {
    if (proactiveSent || open) return;
    const t = setTimeout(() => {
      setOrbState("alert");
      setUnreadCount(1);
      setProactiveSent(true);
      setTimeout(() => setOrbState("idle"), 4000);
    }, 8000);
    return () => clearTimeout(t);
  }, [proactiveSent, open]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;
    setInput("");
    setOrbState("thinking");

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      const reply = data.reply || "Let me look into that for you.";
      setOrbState("speaking");
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "agent", content: reply, timestamp: Date.now() }]);
      setTimeout(() => setOrbState("idle"), 2000);
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "agent", content: "Connection issue — try again in a moment.", timestamp: Date.now() }]);
      setOrbState("idle");
    }
    setIsTyping(false);
  }, [isTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleOrbClick = () => {
    if (isDragging) return;
    setOpen(true);
    setUnreadCount(0);
    setOrbState("idle");
  };

  const showStarters = messages.length <= 1 && messages[0]?.role === "agent" && !isTyping;

  const panelBottom = isMobile ? 0 : 104;
  const panelRight = isMobile ? 0 : 32;

  return (
    <>
      {/* ── Floating Plasma Orb ── */}
      <AnimatePresence>
        {!open && (
          <motion.div
            drag
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setTimeout(() => setIsDragging(false), 100)}
            style={{ x, y, position: "fixed", zIndex: 9999, cursor: isDragging ? "grabbing" : "grab" }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOrbClick}
          >
            {/* Outer atmospheric glow */}
            <div style={{
              position: "absolute", inset: -20,
              borderRadius: "50%",
              background: orbState === "alert"
                ? `radial-gradient(circle, rgba(255,45,85,0.25) 0%, transparent 70%)`
                : `radial-gradient(circle, rgba(99,102,241,0.2) 0%, rgba(6,182,212,0.1) 50%, transparent 70%)`,
              animation: orbState === "alert" ? "alertPulse 0.8s ease-in-out infinite" : "atmospherePulse 3s ease-in-out infinite",
              pointerEvents: "none",
            }} />

            {/* The orb itself */}
            <PlasmaOrb size={56} state={orbState} />

            {/* Unread badge */}
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                style={{
                  position: "absolute", top: -4, right: -4,
                  width: 20, height: 20, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C.hot}, #ff6b8a)`,
                  border: `2px solid ${C.bg}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800, color: "#fff",
                  boxShadow: `0 0 8px ${C.hot}88`,
                }}
              >
                {unreadCount}
              </motion.div>
            )}

            {/* "thinking" label when active */}
            {(orbState === "thinking" || orbState === "speaking") && (
              <motion.div
                initial={{ opacity: 0, y: 4, x: "-50%" }}
                animate={{ opacity: 1, y: 0, x: "-50%" }}
                style={{
                  position: "absolute", bottom: -24, left: "50%",
                  fontSize: 9, color: C.cyan, fontWeight: 600,
                  letterSpacing: "0.05em", whiteSpace: "nowrap",
                  textShadow: `0 0 8px ${C.cyan}`,
                }}
              >
                {orbState === "thinking" ? "thinking..." : "speaking..."}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              position: "fixed",
              bottom: panelBottom, right: panelRight,
              zIndex: 9999,
              width: isMobile ? "100vw" : 370,
              height: isMobile ? "72vh" : 540,
              borderRadius: isMobile ? "24px 24px 0 0" : 24,
              overflow: "hidden",
              display: "flex", flexDirection: "column",
              background: "rgba(10,10,16,0.97)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: `0 -8px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.2), 0 0 40px rgba(99,102,241,0.1)`,
            }}
          >
            {/* Gradient top border */}
            <div style={{
              height: 2, flexShrink: 0,
              background: `linear-gradient(90deg, ${C.indigo}, ${C.cyan}, ${C.indigo})`,
              backgroundSize: "200% 100%",
              animation: "borderFlow 3s linear infinite",
            }} />

            {/* Header */}
            <div style={{
              padding: "14px 16px 12px",
              display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
              borderBottom: `1px solid ${C.border}`,
            }}>
              {/* Live orb in header */}
              <div style={{ flexShrink: 0 }}>
                <PlasmaOrb size={38} state={isTyping ? "thinking" : orbState} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{agentName}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: isTyping ? C.cyan : C.match,
                    boxShadow: `0 0 6px ${isTyping ? C.cyan : C.match}`,
                    animation: "liveDot 1.5s ease-in-out infinite",
                  }} />
                  <span style={{ fontSize: 11, color: isTyping ? C.cyan : C.match, fontWeight: 500 }}>
                    {isTyping ? "thinking..." : "online · always learning"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: 7, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.muted, transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = C.dim; e.currentTarget.style.color = C.text; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = C.muted; }}
              >
                <Minimize2 size={15} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} style={{
              flex: 1, overflowY: "auto", padding: "16px 14px",
              display: "flex", flexDirection: "column", gap: 10,
              scrollBehavior: "smooth",
            }}>
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 8 }}
                >
                  {msg.role === "agent" && (
                    <div style={{ flexShrink: 0, marginTop: 2 }}>
                      <PlasmaOrb size={22} state="idle" />
                    </div>
                  )}
                  <div style={{
                    maxWidth: "78%",
                    padding: "10px 13px",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                    background: msg.role === "user"
                      ? `linear-gradient(135deg, ${C.indigo}, #5558e3)`
                      : "rgba(26,26,36,0.8)",
                    border: msg.role === "agent" ? `1px solid rgba(99,102,241,0.15)` : "none",
                    boxShadow: msg.role === "user" ? `0 2px 12px rgba(99,102,241,0.3)` : "none",
                    color: C.text, fontSize: 13.5, lineHeight: 1.55, wordBreak: "break-word",
                  }}>
                    {msg.content}
                    <div style={{
                      fontSize: 9.5, marginTop: 4,
                      color: msg.role === "user" ? "rgba(255,255,255,0.45)" : C.muted,
                      textAlign: msg.role === "user" ? "right" : "left",
                    }}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Typing */}
              {isTyping && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <PlasmaOrb size={22} state="thinking" />
                  <div style={{
                    padding: "10px 14px", borderRadius: "4px 16px 16px 16px",
                    background: "rgba(26,26,36,0.8)", border: `1px solid rgba(99,102,241,0.15)`,
                    display: "flex", gap: 4, alignItems: "center",
                  }}>
                    {[0,1,2].map(i => (
                      <span key={i} style={{
                        width: 5, height: 5, borderRadius: "50%", background: C.cyan,
                        display: "inline-block",
                        animation: `dotBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                      }} />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Starter prompts */}
              {showStarters && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 4, paddingLeft: 30 }}
                >
                  {STARTER_PROMPTS.map(p => (
                    <button key={p} onClick={() => sendMessage(p)} style={{
                      background: "rgba(99,102,241,0.08)",
                      border: `1px solid rgba(99,102,241,0.25)`,
                      borderRadius: 20, padding: "6px 12px",
                      color: C.text, fontSize: 11.5, cursor: "pointer",
                      transition: "all 0.15s", fontFamily: "inherit",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = `rgba(99,102,241,0.2)`; e.currentTarget.style.borderColor = C.indigo; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `rgba(99,102,241,0.08)`; e.currentTarget.style.borderColor = `rgba(99,102,241,0.25)`; }}
                    >
                      {p}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div style={{
              padding: "10px 12px 14px", borderTop: `1px solid ${C.border}`,
              display: "flex", gap: 8, alignItems: "center", flexShrink: 0,
              background: "rgba(6,6,10,0.8)",
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
                placeholder={PLACEHOLDERS[placeholderIdx]}
                style={{
                  flex: 1, background: "rgba(26,26,36,0.8)",
                  border: `1px solid ${C.border}`, borderRadius: 14,
                  padding: "9px 14px", color: C.text, fontSize: 13.5,
                  outline: "none", fontFamily: "inherit", transition: "border-color 0.2s",
                }}
                onFocus={e => e.currentTarget.style.borderColor = `rgba(99,102,241,0.5)`}
                onBlur={e => e.currentTarget.style.borderColor = C.border}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                style={{
                  width: 38, height: 38, borderRadius: 12, border: "none", flexShrink: 0,
                  background: input.trim() && !isTyping
                    ? `linear-gradient(135deg, ${C.indigo}, ${C.cyan})` : C.dim,
                  cursor: input.trim() && !isTyping ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                  boxShadow: input.trim() && !isTyping ? `0 0 12px rgba(99,102,241,0.4)` : "none",
                }}
              >
                <Send size={15} color={input.trim() && !isTyping ? "#fff" : C.muted} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes atmospherePulse {
          0%,100% { opacity:0.6; transform:scale(1); }
          50% { opacity:1; transform:scale(1.08); }
        }
        @keyframes alertPulse {
          0%,100% { opacity:0.4; transform:scale(1); }
          50% { opacity:0.9; transform:scale(1.15); }
        }
        @keyframes borderFlow {
          0% { background-position:0% 0%; }
          100% { background-position:200% 0%; }
        }
        @keyframes liveDot {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.4; transform:scale(0.7); }
        }
        @keyframes dotBounce {
          0%,60%,100% { transform:translateY(0); opacity:0.4; }
          30% { transform:translateY(-5px); opacity:1; }
        }
      `}</style>
    </>
  );
}
