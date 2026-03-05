"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MoodState } from "@/lib/agent-mind-types";
import { MOOD_EMOJI, MOOD_COLORS } from "@/lib/agent-mind-types";

const C = {
  base: "#0a0a0f", surface: "#111118", surface2: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", purple: "#a855f7",
  green: "#22c55e", red: "#ef4444", yellow: "#eab308",
  text: "#f0f0f5", muted: "#6b6b80", dim: "#3a3a4a",
};

interface Turn {
  agent_id: string;
  agent_name: string;
  content: string;
  turn_number: number;
  timestamp: string;
}

interface SpeedDateProps {
  result?: {
    turns: Turn[];
    outcome: "match" | "no_match" | "undecided";
    compatibility_score: number;
    agent_a_verdict: { wants_match: boolean; reason: string };
    agent_b_verdict: { wants_match: boolean; reason: string };
    topics_discussed: string[];
    highlight_moments: string[];
  };
  agentAName: string;
  agentBName: string;
  agentAMood?: MoodState;
  agentBMood?: MoodState;
  onClose?: () => void;
  isLive?: boolean;
  onStart?: () => void;
}

export default function SpeedDateViewer({
  result, agentAName, agentBName, agentAMood, agentBMood,
  onClose, isLive, onStart,
}: SpeedDateProps) {
  const [visibleTurns, setVisibleTurns] = useState(0);
  const [showVerdict, setShowVerdict] = useState(false);
  const [running, setRunning] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Animate turns appearing one by one
  useEffect(() => {
    if (!result?.turns?.length) return;

    if (isLive) {
      // Show all at once if not animating
      setVisibleTurns(result.turns.length);
      setShowVerdict(true);
      return;
    }

    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setVisibleTurns(idx);
      if (idx >= result.turns.length) {
        clearInterval(interval);
        setTimeout(() => setShowVerdict(true), 1200);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [result, isLive]);

  // Auto scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [visibleTurns]);

  async function startDate() {
    setRunning(true);
    onStart?.();
  }

  // Pre-start screen
  if (!result && !running) {
    return (
      <div style={{
        background: C.surface, borderRadius: 16, padding: 32, border: `1px solid ${C.dim}`,
        textAlign: "center", maxWidth: 500, margin: "0 auto",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}></div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 8 }}>Speed Date</h2>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>
          {agentAName} meets {agentBName}. Their AI agents will have a real conversation
          and decide if there's a match.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 24 }}>
          <AgentBadge name={agentAName} mood={agentAMood} side="left" />
          <div style={{ fontSize: 24, alignSelf: "center", color: C.dim }}>vs</div>
          <AgentBadge name={agentBName} mood={agentBMood} side="right" />
        </div>
        <button
          onClick={startDate}
          style={{
            padding: "14px 36px", borderRadius: 12, fontSize: 15, fontWeight: 800,
            background: `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
            color: "white", border: "none", cursor: "pointer",
          }}
        >
           Start Speed Date
        </button>
      </div>
    );
  }

  // Loading state
  if (running && !result) {
    return (
      <div style={{
        background: C.surface, borderRadius: 16, padding: 32, border: `1px solid ${C.dim}`,
        textAlign: "center", maxWidth: 500, margin: "0 auto",
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{ fontSize: 48, display: "inline-block", marginBottom: 16 }}
        >
          
        </motion.div>
        <p style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Agents are talking...</p>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
          {agentAName} and {agentBName} are having their speed date.
          This usually takes 10-30 seconds.
        </p>
      </div>
    );
  }

  if (!result) return null;

  const agentAId = result.turns[0]?.agent_id;

  return (
    <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.dim}`, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "14px 20px", borderBottom: `1px solid ${C.dim}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
            {agentAName}  {agentBName}
          </span>
          {result.topics_discussed.length > 0 && (
            <span style={{ fontSize: 11, color: C.muted }}>
              Topics: {result.topics_discussed.join(", ")}
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18,
          }}>×</button>
        )}
      </div>

      {/* Messages */}
      <div ref={chatRef} style={{ maxHeight: 400, overflow: "auto", padding: "16px 20px" }}>
        <AnimatePresence>
          {result.turns.slice(0, visibleTurns).map((turn, i) => {
            const isA = turn.agent_id === agentAId;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  display: "flex", justifyContent: isA ? "flex-start" : "flex-end",
                  marginBottom: 10,
                }}
              >
                <div style={{ maxWidth: "78%" }}>
                  <div style={{ fontSize: 10, color: C.dim, marginBottom: 3, textAlign: isA ? "left" : "right" }}>
                    {turn.agent_name}
                  </div>
                  <div style={{
                    padding: "10px 14px", borderRadius: 14, fontSize: 13, lineHeight: 1.5,
                    color: C.text,
                    background: isA
                      ? `${C.indigo}22`
                      : `${C.purple}22`,
                    border: `1px solid ${isA ? C.indigo : C.purple}33`,
                    borderBottomLeftRadius: isA ? 4 : 14,
                    borderBottomRightRadius: isA ? 14 : 4,
                  }}>
                    {turn.content}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator while messages are still appearing */}
        {visibleTurns < result.turns.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: "flex", justifyContent: result.turns[visibleTurns]?.agent_id === agentAId ? "flex-start" : "flex-end" }}
          >
            <div style={{ background: C.surface2, borderRadius: 14, padding: "10px 16px", display: "flex", gap: 4 }}>
              {[0, 1, 2].map(j => (
                <motion.div
                  key={j}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: j * 0.2 }}
                  style={{ width: 5, height: 5, borderRadius: "50%", background: C.muted }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Verdict */}
      <AnimatePresence>
        {showVerdict && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            style={{ borderTop: `1px solid ${C.dim}`, padding: "16px 20px" }}
          >
            <div style={{
              textAlign: "center", marginBottom: 12,
              fontSize: 24, fontWeight: 900,
              color: result.outcome === "match" ? C.green : result.outcome === "no_match" ? C.red : C.yellow,
            }}>
              {result.outcome === "match" ? " IT'S A MATCH!" : result.outcome === "no_match" ? " No Match" : " Undecided"}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <VerdictCard
                name={agentAName}
                verdict={result.agent_a_verdict}
                color={C.indigo}
              />
              <VerdictCard
                name={agentBName}
                verdict={result.agent_b_verdict}
                color={C.purple}
              />
            </div>

            <div style={{ textAlign: "center", fontSize: 12, color: C.muted }}>
              Compatibility: {Math.round(result.compatibility_score * 100)}% •
              {result.turns.length} messages •
              {result.topics_discussed.length > 0 && ` Topics: ${result.topics_discussed.join(", ")}`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AgentBadge({ name, mood, side }: { name: string; mood?: MoodState; side: "left" | "right" }) {
  const color = side === "left" ? C.indigo : C.purple;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: `linear-gradient(135deg, ${color}, ${color}99)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, margin: "0 auto 6px",
      }}>
        {mood ? MOOD_EMOJI[mood] : ""}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{name}</div>
      {mood && (
        <div style={{ fontSize: 10, color: MOOD_COLORS[mood] || C.muted }}>{mood}</div>
      )}
    </div>
  );
}

function VerdictCard({ name, verdict, color }: {
  name: string;
  verdict: { wants_match: boolean; reason: string };
  color: string;
}) {
  return (
    <div style={{
      background: C.surface2, borderRadius: 10, padding: 12,
      borderLeft: `3px solid ${verdict.wants_match ? C.green : C.red}`,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 4 }}>
        {name} {verdict.wants_match ? "" : ""}
      </div>
      <div style={{ fontSize: 11, color: C.muted }}>{verdict.reason}</div>
    </div>
  );
}
