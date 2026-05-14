"use client";
import { C } from "@/lib/theme";
import type { OrbRarity } from "@/lib/theme";

const RARITY_CONFIG: Record<OrbRarity, { color: string; size: number; pulseAnim: string; pulseDuration: string }> = {
  Common: { color: "#FFFFFF", size: 18, pulseAnim: "orbPulseCommon", pulseDuration: "2.4s" },
  Rare: { color: "#88FF00", size: 22, pulseAnim: "orbPulseRare", pulseDuration: "1.4s" },
  Legendary: { color: "#00FF88", size: 26, pulseAnim: "orbPulseLegendary", pulseDuration: "0.95s" },
};

export default function OrbMarker({
  rarity = "Common",
  size: overrideSize,
  claimed,
}: {
  rarity?: OrbRarity;
  size?: number;
  claimed?: boolean;
}) {
  const config = RARITY_CONFIG[rarity];
  const sz = overrideSize ?? config.size;

  return (
    <div
      style={{
        width: sz,
        height: sz,
        borderRadius: "50%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        filter: claimed ? "grayscale(0.8)" : undefined,
        opacity: claimed ? 0.45 : 1,
      }}
    >
      {/* Sonar ring */}
      {!claimed && (
        <div
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: `1.5px solid ${config.color}`,
            animation: `sonarRing 2s ease-out infinite`,
            opacity: 0.4,
          }}
        />
      )}
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          inset: -6,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${config.color}40 0%, transparent 70%)`,
          animation: claimed ? undefined : `${config.pulseAnim} ${config.pulseDuration} ease-in-out infinite`,
        }}
      />
      {/* Core */}
      <div
        style={{
          width: sz,
          height: sz,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 35%, ${config.color}ee, ${config.color}88 50%, ${config.color}44 100%)`,
          boxShadow: `0 0 ${sz / 2}px ${config.color}60, inset 0 -2px 4px rgba(0,0,0,0.3)`,
          animation: claimed ? undefined : `orbFloat 3s ease-in-out infinite`,
        }}
      />
      {/* Legendary fire crown */}
      {rarity === "Legendary" && !claimed && (
        <div
          style={{
            position: "absolute",
            top: -4,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "4px solid transparent",
            borderRight: "4px solid transparent",
            borderBottom: `6px solid ${C.gold}`,
            filter: `drop-shadow(0 0 4px ${C.gold})`,
          }}
        />
      )}
    </div>
  );
}
