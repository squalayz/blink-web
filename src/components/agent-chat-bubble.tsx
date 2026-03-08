"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";

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

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
}

const STARTER_PROMPTS = [
  "What's your best token call right now?",
  "Find me someone to work with",
  "How's my trading performance?",
  "What should I focus on today?",
  "Tell me about my agent",
];

const PLACEHOLDERS = [
  "Ask me anything...",
  "Tell me your risk tolerance...",
  "What tokens excite you?",
  "How's your portfolio?",
];

const PROACTIVE_MESSAGES = [
  "I spotted 3 high-score tokens on Base while you were away",
  "Your network is growing \u2014 2 new potential matches this week",
  "I found a potential match for you \u2014 checking their vibe now...",
];

const WELCOME_MSG =
  "Hey! I'm your agent. Ask me anything \u2014 I'm always learning from our conversations.";

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${ampm}`;
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
  const [welcomeSent, setWelcomeSent] = useState(false);
  const [lastInteraction, setLastInteraction] = useState<number>(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const proactiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fetch agent profile
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data?.user?.name) setAgentName(data.user.name + "'s Agent");
        }
      } catch {
        // fallback name
      }
    })();
  }, []);

  // Rotate placeholders
  useEffect(() => {
    const iv = setInterval(
      () => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length),
      3000,
    );
    return () => clearInterval(iv);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Welcome message on first open
  useEffect(() => {
    if (open && !welcomeSent && messages.length === 0) {
      setWelcomeSent(true);
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        content: WELCOME_MSG,
        timestamp: Date.now(),
      };
      setMessages([msg]);
    }
  }, [open, welcomeSent, messages.length]);

  // Proactive message after 30s of no interaction
  useEffect(() => {
    if (!open || proactiveSent) return;

    if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current);

    proactiveTimerRef.current = setTimeout(() => {
      if (!proactiveSent) {
        const randomMsg =
          PROACTIVE_MESSAGES[
            Math.floor(Math.random() * PROACTIVE_MESSAGES.length)
          ];
        const msg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "agent",
          content: randomMsg,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, msg]);
        setProactiveSent(true);
      }
    }, 30000);

    return () => {
      if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current);
    };
  }, [open, proactiveSent, lastInteraction]);

  // Clear unread when opening
  useEffect(() => {
    if (open) setUnreadCount(0);
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping) return;

      setLastInteraction(Date.now());
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);

      try {
        const res = await fetch("/api/agents/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text.trim() }),
        });
        const data = await res.json();
        const agentMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "agent",
          content: data.reply || "Hmm, I couldn't process that. Try again?",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, agentMsg]);
        if (!open) setUnreadCount((c) => c + 1);
      } catch {
        const errMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "agent",
          content: "Connection lost. I'll be back shortly.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, open],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Only show starter prompts if only the welcome message exists
  const showStarters =
    messages.length <= 1 && messages[0]?.role === "agent" && !isTyping;

  return (
    <>
      {/* Floating Orb Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => setOpen(true)}
            style={{
              position: "fixed",
              bottom: isMobile ? 90 : 32,
              right: isMobile ? 16 : 32,
              zIndex: 9999,
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "none",
              cursor: "pointer",
              background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 20px ${C.indigo}66, 0 0 40px ${C.indigo}33, 0 4px 16px rgba(0,0,0,0.4)`,
              animation: "orbPulse 3s ease-in-out infinite",
            }}
          >
            <MessageCircle size={24} color="#fff" strokeWidth={2} />

            {/* Unread badge */}
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: C.hot,
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `2px solid ${C.bg}`,
                }}
              >
                {unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,
              y: 40,
              scale: 0.95,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 40,
              scale: 0.95,
            }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            style={{
              position: "fixed",
              bottom: isMobile ? 0 : 32,
              right: isMobile ? 0 : 32,
              zIndex: 9999,
              width: isMobile ? "100vw" : 360,
              height: isMobile ? "70vh" : 520,
              borderRadius: isMobile ? "20px 20px 0 0" : 20,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              background: "rgba(13,13,20,0.96)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderTop: `3px solid transparent`,
              borderImage: `linear-gradient(90deg, ${C.indigo}, ${C.cyan}) 1`,
              boxShadow: `0 -4px 40px rgba(0,0,0,0.5), 0 0 60px ${C.indigo}15`,
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 16px 12px",
                borderBottom: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexShrink: 0,
              }}
            >
              {/* Agent orb */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`,
                  boxShadow: `0 0 12px ${C.indigo}55`,
                  flexShrink: 0,
                  animation: "orbPulse 3s ease-in-out infinite",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: C.text,
                    fontSize: 15,
                    fontWeight: 600,
                    lineHeight: 1.2,
                  }}
                >
                  {agentName}
                </div>
                <div
                  style={{
                    color: C.muted,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  Your AI &middot; Always learning
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginTop: 3,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: C.match,
                      display: "inline-block",
                      boxShadow: `0 0 6px ${C.match}88`,
                    }}
                  />
                  <span style={{ color: C.match, fontSize: 11, fontWeight: 500 }}>
                    Online
                  </span>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 6,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: C.muted,
                  transition: "color 0.2s, background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = C.text;
                  e.currentTarget.style.background = C.dim;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = C.muted;
                  e.currentTarget.style.background = "none";
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                scrollBehavior: "smooth",
              }}
            >
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    display: "flex",
                    justifyContent:
                      msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "10px 14px",
                      borderRadius:
                        msg.role === "user"
                          ? "16px 16px 4px 16px"
                          : "16px 16px 16px 4px",
                      background:
                        msg.role === "user" ? C.indigo : C.s2,
                      border:
                        msg.role === "agent"
                          ? `1px solid ${C.border}`
                          : "none",
                      color: C.text,
                      fontSize: 14,
                      lineHeight: 1.5,
                      wordBreak: "break-word",
                    }}
                  >
                    <div>{msg.content}</div>
                    <div
                      style={{
                        fontSize: 10,
                        color:
                          msg.role === "user"
                            ? "rgba(255,255,255,0.55)"
                            : C.muted,
                        marginTop: 4,
                        textAlign: msg.role === "user" ? "right" : "left",
                      }}
                    >
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ display: "flex", justifyContent: "flex-start" }}
                >
                  <div
                    style={{
                      padding: "12px 18px",
                      borderRadius: "16px 16px 16px 4px",
                      background: C.s2,
                      border: `1px solid ${C.border}`,
                      display: "flex",
                      gap: 4,
                      alignItems: "center",
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: C.muted,
                          display: "inline-block",
                          animation: `dotBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Starter prompts */}
              {showStarters && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 4,
                  }}
                >
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      style={{
                        background: "none",
                        border: `1px solid ${C.dim}`,
                        borderRadius: 20,
                        padding: "7px 14px",
                        color: C.text,
                        fontSize: 12,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        lineHeight: 1.3,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = C.indigo;
                        e.currentTarget.style.background = `${C.indigo}18`;
                        e.currentTarget.style.color = "#fff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = C.dim;
                        e.currentTarget.style.background = "none";
                        e.currentTarget.style.color = C.text;
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Input area */}
            <div
              style={{
                padding: "12px 16px",
                borderTop: `1px solid ${C.border}`,
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexShrink: 0,
                background: "rgba(10,10,15,0.6)",
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setLastInteraction(Date.now());
                }}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
                placeholder={PLACEHOLDERS[placeholderIdx]}
                style={{
                  flex: 1,
                  background: C.s2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "10px 14px",
                  color: C.text,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = `${C.indigo}66`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: "none",
                  background:
                    input.trim() && !isTyping
                      ? C.indigo
                      : C.dim,
                  cursor:
                    input.trim() && !isTyping
                      ? "pointer"
                      : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.2s, transform 0.15s",
                  flexShrink: 0,
                }}
                onMouseDown={(e) => {
                  if (input.trim() && !isTyping) {
                    e.currentTarget.style.transform = "scale(0.92)";
                  }
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <Send size={16} color={input.trim() && !isTyping ? "#fff" : C.muted} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global keyframe styles */}
      <style>{`
        @keyframes orbPulse {
          0%, 100% { box-shadow: 0 0 20px ${C.indigo}66, 0 0 40px ${C.indigo}33, 0 4px 16px rgba(0,0,0,0.4); transform: scale(1); }
          50% { box-shadow: 0 0 28px ${C.indigo}88, 0 0 56px ${C.indigo}44, 0 4px 20px rgba(0,0,0,0.5); transform: scale(1.04); }
        }
        @keyframes dotBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
