"use client";
import { useState, useEffect } from "react";

const C = {
  bg:"#0a0a0f", surface:"#111118", s2:"#1a1a24",
  indigo:"#6366f1", cyan:"#06b6d4", match:"#30d158",
  gold:"#ffd700", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a", hot:"#ff2d55",
};

interface StreakData {
  current: number;
  longest: number;
  badge?: string;
  reward?: string;
  already_checked_in: boolean;
}

export default function StreakWidget() {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    checkIn();
  }, []);

  async function checkIn() {
    try {
      const res = await fetch("/api/match", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkin_streak" }),
      });
      const data = await res.json();
      if (data.streak !== undefined) {
        setStreak({
          current: data.streak,
          longest: data.longest || data.streak,
          badge: data.badge,
          reward: data.reward,
          already_checked_in: data.already_checked_in || false,
        });
        if (data.reward) { setCelebrating(true); setTimeout(() => setCelebrating(false), 3000); }
      }
    } catch (e) {}
  }

  if (!streak) return null;

  const isHot = streak.current >= 7;
  const color = isHot ? C.gold : streak.current >= 3 ? "#f97316" : C.muted;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 14px", borderRadius: 10,
      background: isHot ? `${C.gold}08` : C.s2,
      border: `1px solid ${isHot ? C.gold + "22" : C.dim}`,
      position: "relative", overflow: "hidden",
    }}>
      {/* Fire icon */}
      <span style={{
        fontSize: isHot ? 20 : 16,
        animation: isHot ? "streak-fire 0.5s infinite alternate" : "none",
      }}></span>

      {/* Counter */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 900, color, lineHeight: 1 }}>
          {streak.current}
        </div>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          day{streak.current !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Badge */}
      {streak.badge === "dedicated_builder" && (
        <span style={{ fontSize: 14, marginLeft: 2 }} title="Dedicated Builder — 30 day streak"></span>
      )}
      {streak.badge === "consistent" && (
        <span style={{ fontSize: 14, marginLeft: 2 }} title="Consistent — 7 day streak"></span>
      )}

      {/* Celebration overlay */}
      {celebrating && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: `${C.gold}15`, animation: "streak-celebrate 0.3s ease-out",
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.gold }}>
            {streak.reward === "free_boost" ? " Free Boost!" : " Badge Earned!"}
          </span>
        </div>
      )}

      <style>{`
        @keyframes streak-fire{from{transform:scale(1)}to{transform:scale(1.15) rotate(5deg)}}
        @keyframes streak-celebrate{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}
      `}</style>
    </div>
  );
}

// ── Streak display for public profiles ──
export function StreakBadge({ streak, badge }: { streak: number; badge?: string }) {
  if (streak < 1) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
      background: streak >= 7 ? `${C.gold}15` : `rgba(255,255,255,0.04)`,
      color: streak >= 7 ? C.gold : C.muted,
    }}>
       {streak}d
      {badge === "dedicated_builder" && " "}
    </span>
  );
}
