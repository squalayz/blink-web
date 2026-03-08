"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe } from "lucide-react";

const C = {
  bg: "#0a0a0f", surface: "#0d0d14", s2: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", match: "#30d158",
  hot: "#ff2d55", gold: "#ffd700", text: "#e8e8f0", muted: "#6b6b80",
  dim: "#2a2a3a", border: "rgba(255,255,255,0.07)",
};

interface Signal {
  id: string;
  agent_id: string;
  agent_name: string;
  token_symbol: string;
  chain_id: string;
  signal_type: string;
  confidence: number;
  weighted_confidence: number;
  trust_score: number;
  broadcast_at: string;
  source: string;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function trustColor(score: number): string {
  if (score >= 0.8) return C.match;
  if (score >= 0.6) return C.gold;
  return C.hot;
}

const signalTypeConfig: Record<string, { color: string; label: string }> = {
  enter: { color: C.match, label: "ENTER" },
  watch: { color: C.cyan, label: "WATCH" },
  exit: { color: "#ff9500", label: "EXIT" },
  avoid: { color: C.hot, label: "AVOID" },
};

export default function NetworkSignalsCard() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch("/api/signals?network=true&limit=5");
      if (!res.ok) return;
      const data = await res.json();
      setSignals(data.signals || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 30000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  // Detect convergence: multiple agents signaling same token
  const tokenCounts = new Map<string, number>();
  for (const s of signals) {
    const key = `${s.token_symbol}-${s.chain_id}`;
    tokenCounts.set(key, (tokenCounts.get(key) || 0) + 1);
  }

  return (
    <div style={{
      background: "rgba(13,13,20,0.85)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderRadius: 14,
      border: `1px solid ${C.indigo}25`,
      overflow: "hidden",
      maxHeight: 200,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Gradient top accent */}
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, ${C.indigo}, ${C.cyan})`,
        flexShrink: 0,
      }} />

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 14px 6px",
        flexShrink: 0,
      }}>
        <Globe size={14} style={{ color: C.indigo }} />
        <span style={{
          fontSize: 12, fontWeight: 700, color: C.text,
          letterSpacing: 0.3,
        }}>
          Your Network&apos;s Signals
        </span>
        {signals.length > 0 && (
          <span style={{
            marginLeft: "auto",
            fontSize: 10, color: C.muted,
            background: C.dim,
            padding: "2px 7px",
            borderRadius: 6,
          }}>
            {signals.length}
          </span>
        )}
      </div>

      {/* Signals list */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "0 14px 8px",
      }}>
        {loading ? (
          <div style={{
            padding: "16px 0",
            textAlign: "center",
            fontSize: 11,
            color: C.muted,
          }}>
            Loading signals...
          </div>
        ) : signals.length === 0 ? (
          <div style={{
            padding: "16px 0",
            textAlign: "center",
            fontSize: 11,
            color: C.muted,
            lineHeight: 1.5,
          }}>
            No network signals yet. Match with more traders to see signals.
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {signals.map((s, i) => {
              const tokenKey = `${s.token_symbol}-${s.chain_id}`;
              const convergeCount = tokenCounts.get(tokenKey) || 0;
              const stCfg = signalTypeConfig[s.signal_type] || { color: C.muted, label: s.signal_type.toUpperCase() };

              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 0",
                    borderBottom: i < signals.length - 1 ? `1px solid ${C.border}` : "none",
                  }}
                >
                  {/* Agent avatar orb */}
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: "#fff",
                  }}>
                    {(s.agent_name || "?")[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: C.text,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {s.agent_name}
                      <span style={{ color: C.muted, fontWeight: 400, margin: "0 4px" }}>&rarr;</span>
                      <span style={{ color: C.cyan, fontWeight: 700 }}>{s.token_symbol}</span>
                      <span style={{ color: C.dim, fontWeight: 400, fontSize: 10, marginLeft: 4 }}>{s.chain_id}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                      {/* Trust badge */}
                      <span style={{
                        fontSize: 9, fontWeight: 700,
                        color: trustColor(s.trust_score),
                        background: `${trustColor(s.trust_score)}15`,
                        padding: "1px 5px",
                        borderRadius: 4,
                      }}>
                        {Math.round(s.trust_score * 100)}%
                      </span>
                      {/* Signal type badge */}
                      <span style={{
                        fontSize: 9, fontWeight: 700,
                        color: stCfg.color,
                        background: `${stCfg.color}15`,
                        padding: "1px 5px",
                        borderRadius: 4,
                      }}>
                        {stCfg.label}
                      </span>
                      {/* Convergence indicator */}
                      {convergeCount > 1 && (
                        <span style={{
                          fontSize: 9, fontWeight: 700,
                          color: C.hot,
                          background: `${C.hot}15`,
                          padding: "1px 5px",
                          borderRadius: 4,
                        }}>
                          Converging {"\uD83D\uDD25"} {convergeCount}
                        </span>
                      )}
                      {/* Relative time */}
                      <span style={{ fontSize: 9, color: C.muted, marginLeft: "auto" }}>
                        {relativeTime(s.broadcast_at)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* View all footer */}
      {signals.length > 0 && (
        <div style={{
          borderTop: `1px solid ${C.border}`,
          padding: "6px 14px",
          textAlign: "center",
          flexShrink: 0,
        }}>
          <button
            onClick={() => console.log("[NetworkSignals] View all clicked")}
            style={{
              background: "none", border: "none",
              color: C.indigo, fontSize: 11, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              padding: 0,
            }}
          >
            View all signals
          </button>
        </div>
      )}
    </div>
  );
}
