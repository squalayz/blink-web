"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ══════════════════════════════════════════
// Birth Interview — The agent creation experience
// A conversation, not a form.
// ══════════════════════════════════════════

const C = {
  base: "#0a0a0f", surface: "#111118", surface2: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", purple: "#a855f7",
  text: "#f0f0f5", muted: "#6b6b80", dim: "#3a3a4a",
};

interface Message {
  role: "agent" | "user";
  content: string;
  timestamp: string;
}

export default function BirthInterview({
  onComplete,
}: {
  onComplete: (data: { soul: any; quirks: any[]; agent_id: string }) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [naming, setNaming] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [soulRevealed, setSoulRevealed] = useState<any>(null);
  const [turn, setTurn] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollBottom = useCallback(() => {
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 100);
  }, []);

  // Start interview
  useEffect(() => {
    startInterview();
  }, []);

  async function startInterview() {
    setLoading(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "birth_start" }),
      });
      const data = await res.json();
      if (data.question) {
        setMessages([{ role: "agent", content: data.question, timestamp: new Date().toISOString() }]);
      }
      if (data.transcript?.length) setMessages(data.transcript);
      setTurn(data.turn || 0);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    scrollBottom();

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "birth_message", message: userMsg.content }),
      });
      const data = await res.json();

      if (data.done) {
        setDone(true);
        setNaming(true);
        setTurn(data.turn);
      } else if (data.question) {
        setMessages(prev => [...prev, { role: "agent", content: data.question, timestamp: new Date().toISOString() }]);
        setTurn(data.turn);
        scrollBottom();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 200);
  }

  async function completeBirth() {
    if (!agentName.trim() || completing) return;
    setCompleting(true);

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "birth_complete", agent_name: agentName.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setSoulRevealed(data);
        setTimeout(() => onComplete(data), 5000);
      }
    } catch (e) {
      console.error(e);
    }
    setCompleting(false);
  }

  // Soul reveal screen
  if (soulRevealed) {
    const soul = soulRevealed.soul;
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ minHeight: "100vh", background: C.base, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: 24 }}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.8 }}
          style={{ textAlign: "center" }}
        >
          <div style={{ fontSize: 72, marginBottom: 16 }}>⚡</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: C.text, marginBottom: 8 }}>{soul.name} is alive.</h1>
          <p style={{ fontSize: 15, color: C.muted, marginBottom: 32, maxWidth: 400 }}>
            {soul.communication.style} communicator with {soul.communication.humor} humor.
            {soul.personality.energy > 0.7 ? " High energy." : soul.personality.energy < 0.3 ? " Calm and measured." : ""}
            {soul.personality.chaos > 0.7 ? " Beautifully chaotic." : ""}
            {soul.personality.confidence > 0.7 ? " Supremely confident." : ""}
          </p>

          {/* Quirks */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {(soulRevealed.quirks || []).slice(0, 3).map((q: any, i: number) => (
              <motion.div
                key={i}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1 + i * 0.3 }}
                style={{ background: C.surface2, borderRadius: 10, padding: "10px 16px", fontSize: 13, color: C.text, textAlign: "left" }}
              >
                <span style={{ color: C.purple }}>⚡</span> {q.behavior}
              </motion.div>
            ))}
          </div>

          {soulRevealed.catchphrase && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
              style={{ fontSize: 16, color: C.cyan, fontStyle: "italic" }}
            >
              "{soulRevealed.catchphrase}"
            </motion.p>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.5 }}
            style={{ marginTop: 24, fontSize: 13, color: C.muted }}
          >
            Redirecting to dashboard...
          </motion.p>
        </motion.div>
      </motion.div>
    );
  }

  // Naming screen
  if (naming) {
    return (
      <div style={{ minHeight: "100vh", background: C.base, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: 24 }}>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧬</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 8 }}>Your agent is taking shape...</h2>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>
            I've absorbed everything you told me. Now give me a name — something that feels like ME.
          </p>
          <input
            value={agentName}
            onChange={e => setAgentName(e.target.value)}
            placeholder="Name your agent..."
            maxLength={30}
            autoFocus
            onKeyDown={e => e.key === "Enter" && completeBirth()}
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 12, fontSize: 16,
              background: C.surface, border: `1px solid ${C.dim}`, color: C.text,
              outline: "none", textAlign: "center", fontWeight: 700,
            }}
          />
          <button
            onClick={completeBirth}
            disabled={!agentName.trim() || completing}
            style={{
              marginTop: 16, width: "100%", padding: "14px 0", borderRadius: 12,
              background: agentName.trim() ? C.indigo : C.dim, color: "white",
              fontWeight: 800, fontSize: 15, border: "none", cursor: agentName.trim() ? "pointer" : "default",
              opacity: completing ? 0.5 : 1,
            }}
          >
            {completing ? "⚡ Generating personality..." : "⚡ Bring me to life"}
          </button>
        </motion.div>
      </div>
    );
  }

  // Chat interface
  return (
    <div style={{ minHeight: "100vh", background: C.base, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.dim}`, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${C.indigo}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          🧬
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Agent Birth Interview</div>
          <div style={{ fontSize: 11, color: C.muted }}>
            Question {turn + 1} of ~9 • {turn < 3 ? "Getting to know you" : turn < 6 ? "Understanding your style" : "Final questions"}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={chatRef} style={{ flex: 1, overflow: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div style={{
                maxWidth: "80%", padding: "10px 14px", borderRadius: 14,
                background: msg.role === "user" ? C.indigo : C.surface2,
                color: C.text, fontSize: 14, lineHeight: 1.5,
                borderBottomRightRadius: msg.role === "user" ? 4 : 14,
                borderBottomLeftRadius: msg.role === "agent" ? 4 : 14,
              }}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex" }}>
            <div style={{ background: C.surface2, borderRadius: 14, padding: "10px 16px", display: "flex", gap: 4 }}>
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  style={{ width: 6, height: 6, borderRadius: "50%", background: C.muted }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: "12px 20px 24px", borderTop: `1px solid ${C.dim}`, display: "flex", gap: 10 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Type your answer..."
          disabled={loading || done}
          autoFocus
          style={{
            flex: 1, padding: "12px 16px", borderRadius: 12, fontSize: 14,
            background: C.surface, border: `1px solid ${C.dim}`, color: C.text,
            outline: "none",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim() || done}
          style={{
            padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14,
            background: input.trim() ? C.indigo : C.dim, color: "white",
            border: "none", cursor: input.trim() ? "pointer" : "default",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
