"use client";
import { useState } from "react";

const C = {
  bg:"#0a0a0f", surface:"#111118", s2:"#1a1a24",
  indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", gold:"#ffd700", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
  hot:"#ff2d55", warn:"#f59e0b",
};

interface DormantMatch {
  id: string;
  other_name: string;
  other_avatar?: string;
  score: number;
  matched_at: string;
  collab_idea?: string;
  nudge_count: number;
  last_nudge_at?: string;
}

export function DormantMatchCard({ match, onRevive, onArchive }: {
  match: DormantMatch; onRevive: (id: string) => void; onArchive: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const daysSince = Math.floor((Date.now() - new Date(match.matched_at).getTime()) / 86400000);

  return (
    <div style={{
      background: C.s2, border: `1px solid ${C.dim}`, borderRadius: 14,
      padding: 16, marginBottom: 8, transition: "all 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Avatar / Orb */}
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.indigo}44, ${C.purple}44)`,
          border: `2px dashed ${C.dim}`, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, opacity: 0.6,
        }}>
          {match.other_avatar ? <img src={match.other_avatar} alt="" style={{ width:"100%", height:"100%", borderRadius:"50%", objectFit:"cover" }} /> : "💤"}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{match.other_name}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{match.score}% match · {daysSince}d ago · No messages</div>
        </div>

        <button onClick={() => setExpanded(!expanded)} style={{
          background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18,
          transform: expanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s",
        }}>▾</button>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, animation: "dmr-expand 0.2s ease-out" }}>
          {/* Agent collab idea */}
          {match.collab_idea && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, background: `${C.gold}0a`,
              border: `1px solid ${C.gold}22`, marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, color: C.gold, fontWeight: 600, marginBottom: 4 }}> Your agents brainstormed:</div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{match.collab_idea}</div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onRevive(match.id)} style={{
              flex: 2, padding: 10, borderRadius: 8, border: "none",
              background: `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
              color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Say hi 👋</button>
            <button onClick={() => onArchive(match.id)} style={{
              flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${C.dim}`,
              background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}>Archive</button>
          </div>
        </div>
      )}

      <style>{`@keyframes dmr-expand{from{opacity:0;max-height:0}to{opacity:1;max-height:200px}}`}</style>
    </div>
  );
}

// ── Nudge Banner (shown in dashboard) ──
export function DormantMatchBanner({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return null;
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "10px 16px", borderRadius: 12,
      background: `${C.warn}0a`, border: `1px solid ${C.warn}22`,
      display: "flex", alignItems: "center", gap: 10,
      cursor: "pointer", fontFamily: "inherit", marginBottom: 16,
    }}>
      <span style={{ fontSize: 16 }}>💤</span>
      <div style={{ flex: 1, textAlign: "left" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.warn }}>{count} dormant match{count > 1 ? "es" : ""}</div>
        <div style={{ fontSize: 11, color: C.muted }}>Your agents worked hard for these. Say hi?</div>
      </div>
      <span style={{ fontSize: 12, color: C.warn }}>→</span>
    </button>
  );
}
