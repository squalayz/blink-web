"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { BESTIARY, RARITY_COLOR } from "@/lib/bestiary";

type ZLayer = "front" | "back";

type CreatureSlot = {
  id: number;
  angle: number;
  dist: number;
  size: number;
  zLayer: ZLayer;
  floatDelay: number;
};

const CREATURE_SLOTS: CreatureSlot[] = [
  { id: 20, angle: 15, dist: 185, size: 72, zLayer: "front", floatDelay: 0.0 },
  { id: 19, angle: 320, dist: 170, size: 80, zLayer: "front", floatDelay: 0.8 },
  { id: 17, angle: 95, dist: 160, size: 64, zLayer: "front", floatDelay: 1.4 },
  { id: 18, angle: 250, dist: 155, size: 60, zLayer: "back", floatDelay: 2.1 },
  { id: 16, angle: 170, dist: 150, size: 68, zLayer: "front", floatDelay: 0.5 },
  { id: 13, angle: 210, dist: 145, size: 52, zLayer: "back", floatDelay: 1.9 },
  { id: 11, angle: 55, dist: 175, size: 56, zLayer: "front", floatDelay: 1.1 },
  { id: 4, angle: 285, dist: 140, size: 48, zLayer: "back", floatDelay: 2.6 },
];

type Star = { x: number; y: number; s: number; d: number; r: number };

const STARS: Star[] = [
  { x: 4, y: 8, s: 1.2, d: 0.0, r: 3.8 },
  { x: 9, y: 62, s: 1.0, d: 1.3, r: 4.2 },
  { x: 15, y: 28, s: 1.5, d: 0.6, r: 3.1 },
  { x: 21, y: 85, s: 1.1, d: 2.1, r: 4.6 },
  { x: 27, y: 15, s: 1.3, d: 0.9, r: 3.4 },
  { x: 33, y: 72, s: 1.0, d: 1.7, r: 5.0 },
  { x: 39, y: 42, s: 1.4, d: 0.3, r: 3.7 },
  { x: 45, y: 91, s: 1.2, d: 2.4, r: 4.1 },
  { x: 51, y: 6, s: 1.0, d: 1.1, r: 3.9 },
  { x: 57, y: 55, s: 1.5, d: 0.7, r: 4.4 },
  { x: 63, y: 22, s: 1.1, d: 1.9, r: 3.2 },
  { x: 69, y: 78, s: 1.3, d: 0.4, r: 4.8 },
  { x: 75, y: 35, s: 1.0, d: 2.2, r: 3.6 },
  { x: 81, y: 68, s: 1.4, d: 0.8, r: 4.0 },
  { x: 87, y: 12, s: 1.2, d: 1.5, r: 3.3 },
  { x: 93, y: 50, s: 1.0, d: 2.7, r: 5.2 },
  { x: 7, y: 44, s: 1.1, d: 1.0, r: 4.5 },
  { x: 13, y: 90, s: 1.3, d: 0.2, r: 3.8 },
  { x: 19, y: 56, s: 1.5, d: 1.8, r: 4.3 },
  { x: 25, y: 33, s: 1.0, d: 2.5, r: 3.9 },
  { x: 31, y: 77, s: 1.2, d: 0.5, r: 4.7 },
  { x: 37, y: 19, s: 1.4, d: 1.4, r: 3.5 },
  { x: 43, y: 64, s: 1.1, d: 2.0, r: 4.9 },
  { x: 49, y: 88, s: 1.3, d: 0.1, r: 3.6 },
  { x: 55, y: 31, s: 1.0, d: 1.6, r: 4.2 },
  { x: 61, y: 96, s: 1.5, d: 2.3, r: 3.7 },
  { x: 67, y: 47, s: 1.2, d: 0.9, r: 5.1 },
  { x: 73, y: 82, s: 1.1, d: 1.2, r: 4.0 },
];

const KEYFRAMES = `
@keyframes wsTwinkle { 0%,100%{opacity:0.2;transform:scale(0.6)} 50%{opacity:1;transform:scale(1.3)} }
@keyframes earthRotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes earthAtmo { 0%,100%{opacity:0.6} 50%{opacity:1.0} }
@keyframes earthPulse { 0%{transform:translate(-50%,-50%) scale(0.95);opacity:0.8} 100%{transform:translate(-50%,-50%) scale(2.4);opacity:0} }
@keyframes wsFloat0 { 0%{transform:translate(-50%,-50%) translateY(0px) scale(1)} 100%{transform:translate(-50%,-50%) translateY(-12px) scale(1.03)} }
@keyframes wsFloat1 { 0%{transform:translate(-50%,-50%) translateY(-4px) scale(1.02)} 100%{transform:translate(-50%,-50%) translateY(10px) scale(0.98)} }
@keyframes wsFloat2 { 0%{transform:translate(-50%,-50%) translateY(0px) rotate(-2deg)} 100%{transform:translate(-50%,-50%) translateY(-14px) rotate(2deg)} }
@keyframes wsFloat3 { 0%{transform:translate(-50%,-50%) translateY(-6px) scale(0.97)} 100%{transform:translate(-50%,-50%) translateY(8px) scale(1.04)} }
`;

export function WorldScene() {
  const [mounted, setMounted] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      ref={stageRef}
      style={{
        width: "100%",
        height: "clamp(480px, 55vw, 580px)",
        position: "relative",
        overflow: "hidden",
        background: "#0a0a0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Stars */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        {STARS.map((star, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.s}px`,
              height: `${star.s}px`,
              borderRadius: "50%",
              background: "white",
              animation: `wsTwinkle ${star.r}s ease-in-out ${star.d}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Nebula */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          background:
            "radial-gradient(ellipse 70% 50% at 30% 60%, rgba(60,0,120,0.12), transparent 65%), radial-gradient(ellipse 50% 40% at 75% 30%, rgba(0,80,180,0.09), transparent 60%)",
        }}
      />

      {/* Center glow behind earth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          background:
            "radial-gradient(circle 220px at 50% 48%, rgba(0,255,136,0.12), transparent 70%)",
        }}
      />

      {/* Background creatures (behind earth) */}
      {CREATURE_SLOTS.map((slot, i) => {
        if (slot.zLayer !== "back") return null;
        return <CreatureBody key={slot.id} slot={slot} index={i} />;
      })}

      {/* Earth */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "48%",
          transform: "translate(-50%,-50%)",
          width: "clamp(200px, 28vw, 280px)",
          height: "clamp(200px, 28vw, 280px)",
          zIndex: 8,
        }}
      >
        {/* Layer 1 — body */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 38% 32%, #2d8a50 0%, #1a5c35 12%, #0e3d6b 28%, #083060 42%, #041830 65%, #010810 100%)",
            boxShadow:
              "0 0 60px rgba(0,255,136,0.35), 0 0 120px rgba(0,100,255,0.18), inset -20px -20px 40px rgba(0,0,0,0.7)",
          }}
        />

        {/* Layer 2 — continent shimmer */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "linear-gradient(125deg, rgba(45,138,80,0.25) 0%, transparent 35%, rgba(30,100,60,0.15) 55%, transparent 75%)",
            animation: "earthRotate 30s linear infinite",
          }}
        />

        {/* Layer 3 — atmosphere */}
        <div
          style={{
            position: "absolute",
            inset: -12,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at 50% 50%, transparent 48%, rgba(0,200,100,0.22) 62%, rgba(0,150,255,0.10) 75%, transparent 88%)",
            animation: "earthAtmo 4s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />

        {/* Layer 4 — specular highlight */}
        <div
          style={{
            position: "absolute",
            width: "45%",
            height: "45%",
            top: "8%",
            left: "12%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Layer 5 — signal pulses */}
        {[0, 1.2, 2.4].map((delay, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              border: "1.5px solid rgba(0,255,136,0.5)",
              transformOrigin: "center",
              animation: `earthPulse 3.6s ease-out ${delay}s infinite`,
              pointerEvents: "none",
            }}
          />
        ))}
      </div>

      {/* Foreground creatures (in front of earth) */}
      {CREATURE_SLOTS.map((slot, i) => {
        if (slot.zLayer !== "front") return null;
        return <CreatureBody key={slot.id} slot={slot} index={i} />;
      })}

      {/* Edge vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 20,
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 60%, rgba(10,10,15,0.7) 95%)",
        }}
      />
    </div>
  );
}

function CreatureBody({
  slot,
  index,
}: {
  slot: CreatureSlot;
  index: number;
}) {
  const creature = BESTIARY.find((c) => c.id === slot.id);
  if (!creature) return null;

  const rad = ((slot.angle - 90) * Math.PI) / 180;
  const dx = Math.cos(rad) * slot.dist;
  const dy = Math.sin(rad) * slot.dist;

  const variant = index % 4;
  const duration = 3.0 + slot.floatDelay * 0.3;
  const rarityColor = RARITY_COLOR[creature.rarity];
  const spritePath = creature.floating.replace("/floating-all/", "/sprites/");
  const glowPx = Math.round(slot.size / 6);

  return (
    <div
      style={{
        position: "absolute",
        left: `calc(50% + ${dx}px)`,
        top: `calc(48% + ${dy}px)`,
        width: `${slot.size}px`,
        height: `${slot.size}px`,
        transform: "translate(-50%,-50%)",
        zIndex: slot.zLayer === "front" ? 12 : 4,
        animation: `wsFloat${variant} ${duration}s ease-in-out ${slot.floatDelay}s infinite alternate`,
      }}
    >
      <Image
        src={spritePath}
        alt={creature.name}
        width={slot.size}
        height={slot.size}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          filter: `drop-shadow(0 0 ${glowPx}px ${rarityColor}cc) drop-shadow(0 4px 8px rgba(0,0,0,0.8))`,
        }}
        unoptimized
      />
      <div
        style={{
          position: "absolute",
          bottom: -20,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: rarityColor,
          background: "rgba(10,10,15,0.75)",
          borderRadius: 999,
          padding: "2px 8px",
          whiteSpace: "nowrap",
          textShadow: `0 0 8px ${rarityColor}88`,
        }}
      >
        {creature.name}
      </div>
    </div>
  );
}
