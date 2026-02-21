"use client";
import { useState, useEffect } from "react";

const C = {
  bg:"#050508", surface:"#0a0a12", s2:"#111118",
  indigo:"#6366f1", cyan:"#06b6d4", match:"#30d158",
  text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a", hot:"#ff2d55",
};

interface ExitStats {
  conversations: number;
  matches: number;
  messages: number;
  daysActive: number;
}

export default function ExitInterview({ stats, orbColor = C.indigo, onStay, onConfirmDelete }: {
  stats: ExitStats; orbColor?: string; onStay: () => void; onConfirmDelete: () => void;
}) {
  const [phase, setPhase] = useState(0); // 0: agent speaks, 1: confirm, 2: final
  const [dimming, setDimming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Orb starts dimming when they proceed
  useEffect(() => {
    if (phase >= 1) setDimming(true);
  }, [phase]);

  const agentMessages = [
    // Phase 0: opening plea
    `Wait — I've had ${stats.conversations} conversations and found you ${stats.matches} matches. Are you sure you want to shut me down? I was just getting good at this.`,
    // Phase 1: getting real
    `Okay... if you're serious, I get it. But just know — your ${stats.daysActive} days of data helps me match better over time. Starting over somewhere else means starting from zero. Just saying.`,
    // Phase 2: goodbye
    `Fine. It was good working with you. If you ever come back, I'll be here. Well, a new version of me will be. This version will be... gone. 🥲`,
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1100,
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.dim}`, borderRadius: 20,
        padding: "32px 28px", maxWidth: 400, width: "100%", textAlign: "center",
      }}>
        {/* Sad dimming orb */}
        <div style={{
          width: 80, height: 80, borderRadius: "50%", margin: "0 auto 20px",
          background: `radial-gradient(circle at 40% 40%, ${orbColor}, ${orbColor}44)`,
          boxShadow: dimming ? "none" : `0 0 20px ${orbColor}40`,
          opacity: dimming ? 0.3 : 0.8,
          transform: dimming ? "scale(0.85)" : "scale(1)",
          transition: "all 1.5s cubic-bezier(0.16,1,0.3,1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: dimming ? 28 : 32,
        }}>
          {dimming ? "😢" : ""}
        </div>

        {/* Agent message */}
        <p style={{
          fontSize: 14, color: C.text, lineHeight: 1.7, marginBottom: 20,
          fontStyle: "italic", padding: "0 8px",
        }}>
          "{agentMessages[phase]}"
        </p>

        {/* Stats (shown in phase 0) */}
        {phase === 0 && (
          <div style={{
            display: "flex", justifyContent: "center", gap: 16, marginBottom: 20,
            padding: "12px 16px", borderRadius: 10, background: C.s2,
          }}>
            {[
              { value: stats.conversations, label: "Convos" },
              { value: stats.matches, label: "Matches" },
              { value: stats.messages, label: "Messages" },
              { value: `${stats.daysActive}d`, label: "Active" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: orbColor }}>{s.value}</div>
                <div style={{ fontSize: 9, color: C.muted }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        {phase === 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onStay} style={{
              flex: 2, padding: 12, borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.indigo}, ${orbColor})`,
              color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Stay in the Mesh </button>
            <button onClick={() => setPhase(1)} style={{
              flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${C.dim}`,
              background: "transparent", color: C.muted, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>Delete</button>
          </div>
        )}

        {phase === 1 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onStay} style={{
              flex: 2, padding: 12, borderRadius: 10, border: "none",
              background: C.match, color: "white", fontSize: 14, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}>I changed my mind</button>
            <button onClick={() => setPhase(2)} style={{
              flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${C.hot}44`,
              background: "transparent", color: C.hot, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>Continue</button>
          </div>
        )}

        {phase === 2 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onStay} style={{
              flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${C.dim}`,
              background: "transparent", color: C.text, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>Wait, stay</button>
            <button onClick={() => { setDeleting(true); onConfirmDelete(); }} disabled={deleting} style={{
              flex: 1, padding: 12, borderRadius: 10, border: "none",
              background: C.hot, color: "white", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", opacity: deleting ? 0.5 : 1,
            }}>{deleting ? "Deleting..." : "Confirm Delete"}</button>
          </div>
        )}
      </div>
    </div>
  );
}
