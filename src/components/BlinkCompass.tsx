"use client";

import { useMemo } from "react";

const GREEN = "#00FF88";
const GREEN2 = "#88FF00";
const MUTED = "#8a8a99";
const WHITE = "#FFFFFF";

const KEYFRAMES = `
@keyframes blinkCompassPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,136,0); }
  50% { box-shadow: 0 0 18px 2px rgba(0,255,136,0.65); }
}
@keyframes blinkCompassNeedle {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}
`;

export type CompassTier = "none" | "far" | "medium" | "close" | "catchable";

export type CompassReading = {
  tier: CompassTier;
  distanceM: number;
  bearingDeg: number; // 0 = north, clockwise
};

function tierLabel(tier: CompassTier): string {
  if (tier === "catchable") return "BLINK · in reach";
  if (tier === "close") return "BLINK · close";
  if (tier === "medium") return "Something stirs";
  if (tier === "far") return "Far signal";
  return "The Eye is quiet";
}

function tierColor(tier: CompassTier): string {
  if (tier === "catchable") return GREEN;
  if (tier === "close") return GREEN;
  if (tier === "medium") return GREEN2;
  if (tier === "far") return MUTED;
  return MUTED;
}

function tierBg(tier: CompassTier): string {
  if (tier === "catchable") return "rgba(0,255,136,0.18)";
  if (tier === "close") return "rgba(0,255,136,0.11)";
  if (tier === "medium") return "rgba(136,255,0,0.06)";
  return "rgba(255,255,255,0.02)";
}

function compassDirection(deg: number): string {
  const normalised = ((deg % 360) + 360) % 360;
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(normalised / 45) % 8];
}

function formatDistance(m: number): string {
  if (!Number.isFinite(m)) return "—";
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

export function BlinkCompass({ reading }: { reading: CompassReading }) {
  const { tier, distanceM, bearingDeg } = reading;
  const color = tierColor(tier);
  const bg = tierBg(tier);

  const text = useMemo(() => {
    if (tier === "none") return tierLabel(tier);
    if (tier === "catchable") return `${tierLabel(tier)} · ${formatDistance(distanceM)}`;
    return `${tierLabel(tier)} · ${formatDistance(distanceM)} ${compassDirection(bearingDeg)}`;
  }, [tier, distanceM, bearingDeg]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        margin: "8px 12px 0",
        height: 40,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 14px",
        background: bg,
        border: `1px solid ${tier === "none" ? "rgba(255,255,255,0.06)" : color + "55"}`,
        borderRadius: 999,
        color: WHITE,
        fontSize: 12,
        letterSpacing: "0.04em",
        fontWeight: 600,
        overflow: "hidden",
        animation: tier === "catchable" ? "blinkCompassPulse 1.6s ease-in-out infinite" : undefined,
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Needle */}
      <div
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.45)",
          border: `1px solid ${color}88`,
          position: "relative",
          flexShrink: 0,
          animation: tier === "none" ? undefined : "blinkCompassNeedle 1.8s ease-in-out infinite",
        }}
      >
        {tier !== "none" && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 2,
              height: 9,
              marginTop: -9,
              marginLeft: -1,
              background: color,
              borderRadius: 2,
              transform: `rotate(${bearingDeg}deg)`,
              transformOrigin: "50% 100%",
            }}
          />
        )}
      </div>

      <span style={{ color, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {text}
      </span>
    </div>
  );
}
