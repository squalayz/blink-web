"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Zap, X, Eye } from "lucide-react";

const C = {
  bg: "#0a0a0f", surface: "#0d0d14", s2: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", match: "#30d158",
  hot: "#ff2d55", text: "#e8e8f0", muted: "#6b6b80",
  dim: "#2a2a3a", border: "rgba(255,255,255,0.07)",
};

interface CoHuntData {
  id: string;
  chain: string;
  status: string;
  started_at: string;
  user_a_tokens: string[];
  user_b_tokens: string[];
  shared_tokens: string[];
  partner: { id: string; name: string; avatar_url: string | null };
  isInviter: boolean;
}

export default function CoHuntCard({
  coHunt,
  onEnd,
  onAccept,
}: {
  coHunt: CoHuntData;
  onEnd: (id: string) => void;
  onAccept?: (id: string) => void;
}) {
  const [ending, setEnding] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const elapsed = coHunt.started_at
    ? Math.floor((Date.now() - new Date(coHunt.started_at).getTime()) / (1000 * 60 * 60))
    : 0;
  const elapsedStr = elapsed < 1 ? "just now" : `${elapsed}h ago`;

  const myTokens = coHunt.isInviter ? coHunt.user_a_tokens : coHunt.user_b_tokens;
  const partnerTokens = coHunt.isInviter ? coHunt.user_b_tokens : coHunt.user_a_tokens;
  const sharedTokens = coHunt.shared_tokens || [];

  const isInvite = coHunt.status === "invited" && !coHunt.isInviter;

  async function handleEnd() {
    setEnding(true);
    onEnd(coHunt.id);
  }

  async function handleAccept() {
    setAccepting(true);
    onAccept?.(coHunt.id);
  }

  const chainLabels: Record<string, string> = {
    base: "Base", solana: "Solana", ethereum: "Ethereum",
    bsc: "BSC", arbitrum: "Arbitrum",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: C.surface,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        borderTop: "none",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Gradient top border */}
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, ${C.indigo}, ${C.cyan})`,
        borderRadius: "16px 16px 0 0",
      }} />

      <div style={{ padding: "14px 16px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          {/* Partner avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            {coHunt.partner.avatar_url ? (
              <img
                src={coHunt.partner.avatar_url}
                alt={coHunt.partner.name}
                style={{ width: 38, height: 38, borderRadius: 10, objectFit: "cover" }}
              />
            ) : (
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: 700, color: "#fff",
              }}>
                {(coHunt.partner.name || "?")[0].toUpperCase()}
              </div>
            )}
            {/* Live dot */}
            {coHunt.status === "active" && (
              <div style={{
                position: "absolute", bottom: -2, right: -2,
                width: 10, height: 10, borderRadius: "50%",
                background: C.match,
                border: `2px solid ${C.surface}`,
                boxShadow: `0 0 6px ${C.match}`,
              }} />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
              {isInvite ? `${coHunt.partner.name} invited you` : `Co-Hunting ${chainLabels[coHunt.chain] || coHunt.chain} with ${coHunt.partner.name}`}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
              {coHunt.status === "active" && (
                <>
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: C.match,
                    animation: "cohunt-pulse 1.5s infinite",
                  }} />
                  <span style={{ color: C.match }}>Active</span>
                  <span>Started {elapsedStr}</span>
                </>
              )}
              {coHunt.status === "invited" && (
                <span style={{ color: C.indigo }}>Pending invite</span>
              )}
            </div>
          </div>

          {/* End button */}
          {coHunt.status === "active" && (
            <button
              onClick={handleEnd}
              disabled={ending}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "5px 7px",
                cursor: "pointer", color: C.muted,
                opacity: ending ? 0.4 : 1,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Accept button for invites */}
        {isInvite && (
          <button
            onClick={handleAccept}
            disabled={accepting}
            style={{
              width: "100%", padding: "10px 0",
              borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`,
              color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
              opacity: accepting ? 0.6 : 1,
              marginBottom: 10,
            }}
          >
            {accepting ? "Accepting..." : `Accept Co-Hunt on ${chainLabels[coHunt.chain] || coHunt.chain}`}
          </button>
        )}

        {/* Token lists (only show for active) */}
        {coHunt.status === "active" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {/* My tokens */}
            <div style={{ fontSize: 11, color: C.muted }}>
              <Eye size={10} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              Your agent: {(myTokens || []).length === 0 ? (
                <span style={{ color: C.dim }}>not watching yet</span>
              ) : (
                (myTokens || []).map((t, i) => (
                  <span key={t}>
                    {i > 0 && ", "}
                    <span style={{
                      color: sharedTokens.includes(t) ? C.hot : C.text,
                      fontWeight: sharedTokens.includes(t) ? 700 : 500,
                    }}>{t}</span>
                  </span>
                ))
              )}
            </div>

            {/* Partner tokens */}
            <div style={{ fontSize: 11, color: C.muted }}>
              <Users size={10} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              {coHunt.partner.name.split(" ")[0]}&apos;s agent: {(partnerTokens || []).length === 0 ? (
                <span style={{ color: C.dim }}>not watching yet</span>
              ) : (
                (partnerTokens || []).map((t, i) => (
                  <span key={t}>
                    {i > 0 && ", "}
                    <span style={{
                      color: sharedTokens.includes(t) ? C.hot : C.text,
                      fontWeight: sharedTokens.includes(t) ? 700 : 500,
                    }}>{t}</span>
                  </span>
                ))
              )}
            </div>

            {/* Shared token highlight */}
            {sharedTokens.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  marginTop: 4, padding: "8px 12px",
                  borderRadius: 10,
                  background: `${C.hot}10`,
                  border: `1px solid ${C.hot}25`,
                  boxShadow: `0 0 20px ${C.hot}08`,
                }}
              >
                {sharedTokens.map(t => (
                  <div key={t} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 12, fontWeight: 700, color: C.hot,
                  }}>
                    <Zap size={12} />
                    {t} — Both agents on this!
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes cohunt-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </motion.div>
  );
}
