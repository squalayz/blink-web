"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface RadarCreature {
  id: string;
  name: string;
  tier: string;
  tier_color: string;
  distanceM: number;
  bearingDeg: number; // 0=N, clockwise
  image_url?: string;
}

interface CreatureRadarProps {
  creatures: RadarCreature[];
  onCreatureSelect?: (id: string) => void;
}

const GREEN = "#00FF88";
const GREEN2 = "#88FF00";
const BG = "#0a0a0f";
const SURFACE = "#0d0d14";
const SURFACE2 = "#1a1a24";
const MUTED = "#8a8a99";

const RARITY_COLOR: Record<string, string> = {
  common: "#9aa3b2",
  uncommon: "#00FF88",
  rare: "#88FF00",
  legendary: "#ffd166",
  mythic: "#ff8ae0",
};

function getColor(tier: string, color: string) {
  return color || RARITY_COLOR[tier?.toLowerCase()] || GREEN;
}

// Distance band descriptors — deliberately vague so it's a hunt not a GPS
function distBand(m: number): { label: string; ring: number } {
  if (m <= 50)  return { label: "In reach",    ring: 0.95 };
  if (m <= 150) return { label: "Very close",  ring: 0.75 };
  if (m <= 300) return { label: "Close",       ring: 0.55 };
  if (m <= 500) return { label: "Nearby",      ring: 0.38 };
  if (m <= 800) return { label: "Far",         ring: 0.22 };
  return                { label: "Very far",   ring: 0.10 };
}

const KEYFRAMES = `
@keyframes radarSweep {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes radarPing {
  0%   { transform: scale(0.3); opacity: 0.8; }
  100% { transform: scale(2.4); opacity: 0; }
}
@keyframes radarBlink {
  0%,100% { opacity: 1; }
  50%     { opacity: 0.25; }
}
@keyframes radarArrow {
  0%,100% { filter: drop-shadow(0 0 4px var(--arrow-color)); }
  50%     { filter: drop-shadow(0 0 12px var(--arrow-color)); }
}
@media (prefers-reduced-motion: reduce) {
  .radar-sweep,.radar-ping,.radar-arrow { animation: none !important; }
}
`;

// Directional arrow pointing toward creature
function DirectionArrow({ bearingDeg, color, distanceM }: { bearingDeg: number; color: string; distanceM: number }) {
  const inRange = distanceM <= 50;
  return (
    <motion.div
      animate={{ rotate: bearingDeg }}
      transition={{ type: "spring", stiffness: 60, damping: 14 }}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        className="radar-arrow"
        style={{
          marginTop: 8,
          // @ts-ignore
          "--arrow-color": color,
          animation: inRange ? `radarArrow 0.7s ease-in-out infinite` : `radarArrow 2s ease-in-out infinite`,
        }}
      >
        <svg width="18" height="28" viewBox="0 0 18 28" fill="none">
          <path
            d="M9 2L16 20H9H2L9 2Z"
            fill={color}
            opacity={0.9}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
          <path
            d="M9 2L16 20H9H2L9 2Z"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </motion.div>
  );
}

export function CreatureRadar({ creatures, onCreatureSelect }: CreatureRadarProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const SIZE = 110;

  // Cycle through creatures automatically if multiple
  useEffect(() => {
    if (creatures.length <= 1) return;
    const iv = setInterval(() => {
      setSelectedIdx((i) => (i + 1) % creatures.length);
    }, 4000);
    return () => clearInterval(iv);
  }, [creatures.length]);

  if (creatures.length === 0) return null;

  const target = creatures[Math.min(selectedIdx, creatures.length - 1)];
  const color = getColor(target.tier, target.tier_color);
  const { label: distLabel, ring: ringPos } = distBand(target.distanceM);
  const inRange = target.distanceM <= 50;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          userSelect: "none",
        }}
      >
        {/* Radar disc */}
        <div
          onClick={() => {
            setExpanded((v) => !v);
            if (inRange && onCreatureSelect) onCreatureSelect(target.id);
          }}
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: "50%",
            background: `radial-gradient(circle at center, ${color}18 0%, ${BG} 70%)`,
            border: `2px solid ${color}44`,
            position: "relative",
            overflow: "hidden",
            cursor: "pointer",
            boxShadow: inRange
              ? `0 0 24px ${color}88, 0 0 48px ${color}44`
              : `0 0 12px ${color}33`,
            flexShrink: 0,
          }}
        >
          {/* Concentric rings */}
          {[0.33, 0.58, 0.83].map((r, i) => (
            <div key={i} style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: SIZE * r,
              height: SIZE * r,
              borderRadius: "50%",
              border: `1px solid ${color}${i === 0 ? "44" : i === 1 ? "28" : "18"}`,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }} />
          ))}

          {/* Radar sweep line */}
          <div
            className="radar-sweep"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "50%",
              height: 1,
              transformOrigin: "0% 50%",
              background: `linear-gradient(to right, ${color}cc, transparent)`,
              animation: `radarSweep ${inRange ? "1.2" : "2.4"}s linear infinite`,
              pointerEvents: "none",
            }}
          />

          {/* Ping ring at distance position */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: SIZE * ringPos,
            height: SIZE * ringPos,
            borderRadius: "50%",
            border: `2px solid ${color}`,
            transform: "translate(-50%, -50%)",
            animation: `radarPing 1.8s ease-out infinite`,
            pointerEvents: "none",
          }} />

          {/* Cross hair */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: `${color}22`, transform: "translateY(-50%)" }} />
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: `${color}22`, transform: "translateX(-50%)" }} />
          </div>

          {/* Direction arrow */}
          <DirectionArrow bearingDeg={target.bearingDeg} color={color} distanceM={target.distanceM} />

          {/* Center dot */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#fff",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 6px rgba(255,255,255,0.8)",
            zIndex: 2,
          }} />

          {/* In-range pulse */}
          {inRange && (
            <div style={{
              position: "absolute",
              inset: -2,
              borderRadius: "50%",
              border: `3px solid ${color}`,
              animation: `radarBlink 0.7s ease-in-out infinite`,
              pointerEvents: "none",
            }} />
          )}
        </div>

        {/* Info row below disc */}
        <div style={{ textAlign: "center", minWidth: 0, maxWidth: SIZE + 20 }}>
          <div style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontSize: 11,
            fontWeight: 900,
            color,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {target.name}
          </div>
          <div style={{
            fontSize: 10,
            color: MUTED,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 700,
            marginTop: 2,
          }}>
            {distLabel} · {target.distanceM < 1000 ? `${Math.round(target.distanceM)}m` : `${(target.distanceM / 1000).toFixed(1)}km`}
          </div>
        </div>

        {/* Multi-creature dots */}
        {creatures.length > 1 && (
          <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
            {creatures.slice(0, 5).map((c, i) => (
              <button
                key={c.id}
                onClick={() => setSelectedIdx(i)}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: i === selectedIdx ? getColor(c.tier, c.tier_color) : `${MUTED}66`,
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "background 0.2s ease",
                  boxShadow: i === selectedIdx ? `0 0 6px ${getColor(c.tier, c.tier_color)}` : "none",
                }}
              />
            ))}
            {creatures.length > 5 && (
              <span style={{ color: MUTED, fontSize: 9, fontWeight: 700, lineHeight: "7px" }}>
                +{creatures.length - 5}
              </span>
            )}
          </div>
        )}
      </motion.div>
    </>
  );
}
