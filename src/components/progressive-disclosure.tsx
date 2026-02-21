"use client";
import { useState, useEffect } from "react";

const C = {
  bg:"#0a0a0f", surface:"#111118", s2:"#1a1a24",
  indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", gold:"#ffd700", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
};

const LEVELS = [
  { level: 0, name: "Newcomer", color: C.muted, icon: "🌱", req: "Just joined" },
  { level: 1, name: "Connected", color: C.indigo, icon: "", req: "Get your first match", unlocks: ["Matches tab", "Chat"] },
  { level: 2, name: "Funded", color: C.match, icon: "", req: "Fund your first trade", unlocks: ["Trading dashboard", "P&L tracking"] },
  { level: 3, name: "Networker", color: C.purple, icon: "", req: "Get 5+ matches", unlocks: ["Leaderboard rank", "Reputation score"] },
  { level: 4, name: "Builder", color: C.gold, icon: "", req: "Get 10+ matches", unlocks: ["NFT minting", "Match gallery"] },
  { level: 5, name: "Pro", color: C.cyan, icon: "", req: "Upgrade to Pro tier", unlocks: ["All features", "Priority matching"] },
];

// ── Level Up Celebration ──
export function LevelUpModal({ level, onDismiss }: { level: number; onDismiss: () => void }) {
  const lvl = LEVELS[level] || LEVELS[0];
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", animation: "pd-fade-in 0.3s",
    }} onClick={onDismiss}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.surface, border: `1px solid ${lvl.color}33`, borderRadius: 24,
        padding: "40px 36px", textAlign: "center", maxWidth: 380,
        animation: "pd-pop-in 0.5s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Celebration particles */}
        <div style={{ fontSize: 56, marginBottom: 12, animation: "pd-bounce 0.6s ease-out" }}>{lvl.icon}</div>
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: lvl.color, fontWeight: 700, marginBottom: 4 }}>Level Up!</div>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 4 }}>{lvl.name}</h2>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Level {lvl.level}</p>

        {lvl.unlocks && (
          <div style={{ background: `${lvl.color}0a`, border: `1px solid ${lvl.color}22`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: lvl.color, fontWeight: 700, marginBottom: 8 }}>🔓 Unlocked</div>
            {lvl.unlocks.map(u => (
              <div key={u} style={{ fontSize: 13, color: C.text, padding: "4px 0" }}>✦ {u}</div>
            ))}
          </div>
        )}

        <button onClick={onDismiss} style={{
          padding: "12px 32px", borderRadius: 10, border: "none",
          background: `linear-gradient(135deg, ${lvl.color}, ${lvl.color}aa)`,
          color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}>Continue</button>
      </div>

      <style>{`
        @keyframes pd-fade-in{from{opacity:0}to{opacity:1}}
        @keyframes pd-pop-in{from{opacity:0;transform:scale(0.8) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes pd-bounce{0%{transform:scale(0.3)}50%{transform:scale(1.2)}100%{transform:scale(1)}}
      `}</style>
    </div>
  );
}

// ── Locked Feature Gate ──
export function LockedFeature({ requiredLevel, currentLevel, featureName, children }: {
  requiredLevel: number; currentLevel: number; featureName: string; children: React.ReactNode;
}) {
  if (currentLevel >= requiredLevel) return <>{children}</>;

  const target = LEVELS[requiredLevel];
  return (
    <div style={{ position: "relative" }}>
      {/* Blurred preview */}
      <div style={{ filter: "blur(6px) grayscale(0.8)", pointerEvents: "none", opacity: 0.3 }}>
        {children}
      </div>
      {/* Lock overlay */}
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", background: "rgba(10,10,15,0.6)",
        borderRadius: 16, backdropFilter: "blur(2px)",
      }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}></div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{featureName}</div>
        <div style={{ fontSize: 12, color: C.muted }}>Unlocks at Level {requiredLevel}: {target?.name}</div>
        <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{target?.req}</div>
      </div>
    </div>
  );
}

// ── Level Progress Bar ──
export function LevelProgress({ currentLevel, matchCount, hasTrade, tier }: {
  currentLevel: number; matchCount: number; hasTrade: boolean; tier: string;
}) {
  const lvl = LEVELS[currentLevel] || LEVELS[0];
  const next = LEVELS[currentLevel + 1];

  // Calculate progress to next level
  let progress = 0;
  if (next) {
    if (next.level === 1) progress = matchCount > 0 ? 100 : 0;
    else if (next.level === 2) progress = hasTrade ? 100 : 0;
    else if (next.level === 3) progress = Math.min(100, (matchCount / 5) * 100);
    else if (next.level === 4) progress = Math.min(100, (matchCount / 10) * 100);
    else if (next.level === 5) progress = tier === "pro" || tier === "business" ? 100 : 0;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: C.s2, border: `1px solid ${C.dim}` }}>
      {/* Current level icon */}
      <div style={{
        width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        background: `${lvl.color}22`, border: `2px solid ${lvl.color}`,
        fontSize: 18,
      }}>{lvl.icon}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: lvl.color }}>{lvl.name}</span>
          {next && <span style={{ fontSize: 11, color: C.muted }}>→ {next.name}</span>}
        </div>
        {/* Progress bar */}
        {next && (
          <div style={{ height: 4, borderRadius: 2, background: C.dim, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${lvl.color}, ${next.color})`,
              width: `${progress}%`, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
            }} />
          </div>
        )}
        {next && <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{next.req}</div>}
      </div>
    </div>
  );
}
