"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface MapApproachVignetteProps {
  intensity: number;       // 0-1
  tierColor: string;
  creatureName: string;
  distanceM: number;
  onCatch?: () => void;    // shown at intensity=1
}

const KEYFRAMES = `
@keyframes vigEdgePulse {
  0%,100% { opacity: var(--vig-min); }
  50%      { opacity: var(--vig-max); }
}
@keyframes vigCrosshair {
  0%,100% { transform: translate(-50%,-50%) scale(1)   rotate(0deg); }
  50%      { transform: translate(-50%,-50%) scale(1.08) rotate(90deg); }
}
@keyframes vigTapPulse {
  0%,100% { opacity: 0.7; transform: translateX(-50%) scale(1); }
  50%      { opacity: 1;   transform: translateX(-50%) scale(1.04); }
}
`;

export function MapApproachVignette({ intensity, tierColor, creatureName, distanceM, onCatch }: MapApproachVignetteProps) {
  if (intensity <= 0.02) return null;

  const color = tierColor || "#00FF88";
  const glowSize = Math.round(20 + intensity * 80);
  const edgeOpacity = intensity * 0.75;
  const pulseSpeed = Math.max(0.4, 1.8 - intensity * 1.4);
  const showBadge = intensity > 0.3;
  const showCrosshair = intensity > 0.65;
  const inRange = intensity >= 0.95;

  const edgeStyle = (side: "top" | "bottom" | "left" | "right"): React.CSSProperties => {
    const isHoriz = side === "top" || side === "bottom";
    return {
      position: "absolute",
      [side]: 0,
      left: isHoriz ? 0 : undefined,
      right: isHoriz ? 0 : undefined,
      top: !isHoriz ? 0 : undefined,
      bottom: !isHoriz ? 0 : undefined,
      width: isHoriz ? "100%" : `${glowSize}px`,
      height: isHoriz ? `${glowSize}px` : "100%",
      background: isHoriz
        ? `linear-gradient(${side === "top" ? "to bottom" : "to top"}, ${color}${Math.round(edgeOpacity * 255).toString(16).padStart(2, "0")} 0%, transparent 100%)`
        : `linear-gradient(${side === "left" ? "to right" : "to left"}, ${color}${Math.round(edgeOpacity * 255).toString(16).padStart(2, "0")} 0%, transparent 100%)`,
      pointerEvents: "none",
      // @ts-ignore
      "--vig-min": Math.max(0.2, edgeOpacity - 0.2),
      "--vig-max": Math.min(1, edgeOpacity + 0.15),
      animation: `vigEdgePulse ${pulseSpeed}s ease-in-out infinite`,
    };
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        pointerEvents: inRange && onCatch ? "auto" : "none",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* 4 edge glows */}
      <div style={edgeStyle("top")} />
      <div style={edgeStyle("bottom")} />
      <div style={edgeStyle("left")} />
      <div style={edgeStyle("right")} />

      {/* Corner accents at high intensity */}
      {intensity > 0.5 && ["tl", "tr", "bl", "br"].map((corner) => (
        <div
          key={corner}
          style={{
            position: "absolute",
            top: corner.startsWith("t") ? 12 : undefined,
            bottom: corner.startsWith("b") ? 12 : undefined,
            left: corner.endsWith("l") ? 12 : undefined,
            right: corner.endsWith("r") ? 12 : undefined,
            width: 20,
            height: 20,
            borderTop: corner.startsWith("t") ? `2px solid ${color}` : "none",
            borderBottom: corner.startsWith("b") ? `2px solid ${color}` : "none",
            borderLeft: corner.endsWith("l") ? `2px solid ${color}` : "none",
            borderRight: corner.endsWith("r") ? `2px solid ${color}` : "none",
            opacity: intensity * 0.8,
            pointerEvents: "none",
            transition: "opacity 0.3s ease",
          }}
        />
      ))}

      {/* Creature name badge */}
      {showBadge && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: "absolute",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(10,10,15,0.85)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${color}55`,
            borderRadius: 999,
            padding: "6px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          <div style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 8px ${color}`,
            animation: `vigTapPulse ${pulseSpeed}s ease-in-out infinite`,
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontSize: 12,
            fontWeight: 800,
            color,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}>
            {creatureName}
          </span>
          <span style={{ color: "#8a8a99", fontSize: 11, fontWeight: 600 }}>
            {Math.round(distanceM)}m
          </span>
        </motion.div>
      )}

      {/* Crosshair at center */}
      {showCrosshair && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 56,
            height: 56,
            pointerEvents: "none",
            animation: "vigCrosshair 2s ease-in-out infinite",
            zIndex: 2,
          }}
        >
          {/* Arms */}
          {["top","bottom","left","right"].map((dir) => (
            <div key={dir} style={{
              position: "absolute",
              top: dir === "top" ? 0 : dir === "bottom" ? undefined : "50%",
              bottom: dir === "bottom" ? 0 : undefined,
              left: dir === "left" ? 0 : dir === "right" ? undefined : "50%",
              right: dir === "right" ? 0 : undefined,
              width: dir === "left" || dir === "right" ? 18 : 2,
              height: dir === "top" || dir === "bottom" ? 18 : 2,
              background: color,
              transform: (dir === "top" || dir === "bottom") ? "translateX(-50%)" : "translateY(-50%)",
              opacity: intensity,
              borderRadius: 1,
            }} />
          ))}
          {/* Center dot */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 10px ${color}`,
            opacity: intensity,
          }} />
        </div>
      )}

      {/* In-range tap prompt */}
      {inRange && onCatch && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onCatch}
          style={{
            position: "absolute",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "Space Grotesk, Inter, sans-serif",
            padding: "16px 40px",
            borderRadius: 999,
            border: "none",
            background: `linear-gradient(135deg, ${color}, ${color}bb)`,
            color: "#000",
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: `0 0 24px ${color}88, 0 0 48px ${color}44`,
            animation: `vigTapPulse 0.8s ease-in-out infinite`,
            whiteSpace: "nowrap",
            pointerEvents: "auto",
          }}
        >
          Tap to Catch
        </motion.button>
      )}
    </div>
  );
}
