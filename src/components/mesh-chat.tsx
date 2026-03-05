"use client";
import { useState } from "react";

const C = {
  bg:"#0a0a0f", surface:"#111118", s2:"#1a1a24",
  indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", gold:"#ffd700", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
};

interface MatchReasoning {
  summary: string;
  tags: string[];
  score: number;
}

interface IceBreaker {
  message: string;
  context: string;
}

interface ChatHeaderProps {
  otherName: string;
  otherAvatar?: string;
  otherColor: string;
  myColor: string;
  reasoning: MatchReasoning;
  iceBreaker?: IceBreaker;
  isTyping: boolean;
  onSendIceBreaker?: (msg: string) => void;
}

// ── Chat Header with Orbs + Reasoning ──
export function MeshChatHeader({ otherName, otherAvatar, otherColor, myColor, reasoning, iceBreaker, isTyping, onSendIceBreaker }: ChatHeaderProps) {
  const [showReasoning, setShowReasoning] = useState(true);
  const [iceUsed, setIceUsed] = useState(false);

  return (
    <div style={{ marginBottom: 16 }}>
      {/* ── Orb Background ── */}
      <div style={{
        position: "relative", height: 80, borderRadius: 16,
        background: `linear-gradient(135deg, ${C.bg}, ${C.s2})`,
        overflow: "hidden", marginBottom: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* My orb */}
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: `radial-gradient(circle at 40% 40%, ${myColor}, ${myColor}66)`,
          boxShadow: `0 0 16px ${myColor}40`,
          animation: "mc-float-l 3s ease-in-out infinite",
        }} />
        {/* Gold connection line */}
        <div style={{
          width: 40, height: 2, background: `linear-gradient(90deg, ${myColor}60, ${C.gold}, ${otherColor}60)`,
          margin: "0 8px", boxShadow: `0 0 8px ${C.gold}40`,
        }} />
        {/* Other orb */}
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: `radial-gradient(circle at 40% 40%, ${otherColor}, ${otherColor}66)`,
          boxShadow: `0 0 16px ${otherColor}40`,
          animation: isTyping ? "mc-typing-pulse 0.8s infinite" : "mc-float-r 3s ease-in-out infinite",
        }} />
      </div>

      {/* ── Match Reasoning (pinned) ── */}
      {showReasoning && (
        <div style={{
          padding: "10px 14px", borderRadius: 10, background: `${C.gold}08`,
          border: `1px solid ${C.gold}15`, marginBottom: 10,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>
               Why your agents matched ({reasoning.score}%)
            </div>
            <button onClick={() => setShowReasoning(false)} style={{
              background: "none", border: "none", color: C.dim, fontSize: 14, cursor: "pointer", padding: 0, lineHeight: 1,
            }}>×</button>
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{reasoning.summary}</div>
          {reasoning.tags.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
              {reasoning.tags.map(t => (
                <span key={t} style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 6,
                  background: `${C.indigo}15`, color: C.indigo, fontWeight: 600,
                }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Ice Breaker ── */}
      {iceBreaker && !iceUsed && (
        <div style={{
          padding: "10px 14px", borderRadius: 10, background: `${C.cyan}08`,
          border: `1px solid ${C.cyan}15`, marginBottom: 10,
        }}>
          <div style={{ fontSize: 11, color: C.cyan, fontWeight: 600, marginBottom: 4 }}> Suggested opener</div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, marginBottom: 8 }}>"{iceBreaker.message}"</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { onSendIceBreaker?.(iceBreaker.message); setIceUsed(true); }} style={{
              padding: "6px 14px", borderRadius: 8, border: "none",
              background: C.cyan, color: "white", fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}>Send this →</button>
            <button onClick={() => setIceUsed(true)} style={{
              padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.dim}`,
              background: "transparent", color: C.muted, fontSize: 12,
              cursor: "pointer", fontFamily: "inherit",
            }}>Write my own</button>
          </div>
        </div>
      )}

      {/* ── Typing Indicator ── */}
      {isTyping && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            background: `radial-gradient(${otherColor}, ${otherColor}66)`,
            animation: "mc-typing-pulse 0.8s infinite",
          }} />
          <div style={{ display: "flex", gap: 3 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: "50%", background: C.muted,
                animation: `mc-typing-dot 1s infinite ${i * 0.2}s`,
              }} />
            ))}
          </div>
          <span style={{ fontSize: 11, color: C.muted }}>{otherName} is typing...</span>
        </div>
      )}

      <style>{`
        @keyframes mc-float-l{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes mc-float-r{0%,100%{transform:translateY(0)}50%{transform:translateY(4px)}}
        @keyframes mc-typing-pulse{0%,100%{opacity:0.6;transform:scale(1)}50%{opacity:1;transform:scale(1.15)}}
        @keyframes mc-typing-dot{0%,60%,100%{opacity:0.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
      `}</style>
    </div>
  );
}
