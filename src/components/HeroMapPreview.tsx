"use client";

/*
 * HeroMapPreview — animated "mini-map" hero visual.
 * A glowing "YOU ARE HERE" eye marker pulses at the center of a faint hex grid.
 * Around it, BLINK creatures drift in slow orbits with rarity-coloured glows.
 * CSS keyframes only — no three.js, no heavy libs.
 * Respects `prefers-reduced-motion` → animations collapse to a static composition.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import { BESTIARY, RARITY_COLOR } from "@/lib/bestiary";

const ORBITERS = [
  { id: 1, ring: 0, offset: 0,    duration: 36, size: 64 },  // Sprite
  { id: 16, ring: 0, offset: 120, duration: 36, size: 60 },  // Cyclops
  { id: 11, ring: 0, offset: 240, duration: 36, size: 60 },  // Cat
  { id: 19, ring: 1, offset: 30,  duration: 52, size: 72 },  // Phoenix
  { id: 18, ring: 1, offset: 150, duration: 52, size: 68 },  // Oracle
  { id: 17, ring: 1, offset: 270, duration: 52, size: 64 },  // Aethermane
  { id: 4, ring: 2, offset: 90,  duration: 70, size: 52 },   // Emberling
  { id: 13, ring: 2, offset: 270, duration: 70, size: 52 },  // Whiskerwisp
];

const RINGS = [
  { radiusPct: 26 },
  { radiusPct: 38 },
  { radiusPct: 48 },
];

const KEYFRAMES = `
@keyframes heroMapEyePulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    filter: drop-shadow(0 0 18px rgba(0,255,136,0.7)) drop-shadow(0 0 56px rgba(0,255,136,0.35));
  }
  50% {
    transform: translate(-50%, -50%) scale(1.08);
    filter: drop-shadow(0 0 36px rgba(0,255,136,1)) drop-shadow(0 0 120px rgba(0,255,136,0.55));
  }
}
@keyframes heroMapRingDrift {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}
@keyframes heroMapRingDriftRev {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(-360deg); }
}
@keyframes heroMapOrbit {
  from {
    transform: translate(-50%, -50%) rotate(var(--start, 0deg)) translateX(var(--radius, 100px)) rotate(calc(-1 * var(--start, 0deg)));
  }
  to {
    transform: translate(-50%, -50%) rotate(calc(var(--start, 0deg) + 360deg)) translateX(var(--radius, 100px)) rotate(calc(-1 * (var(--start, 0deg) + 360deg)));
  }
}
@keyframes heroMapBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@keyframes heroMapGlow {
  0%, 100% { opacity: 0.9; box-shadow: 0 0 16px var(--glow), 0 0 36px var(--glow); }
  50% { opacity: 1; box-shadow: 0 0 28px var(--glow), 0 0 70px var(--glow); }
}
@keyframes heroMapPing {
  0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0.7; }
  100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
}
@keyframes heroMapSpark {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translate(-50%, -120%) scale(1); opacity: 0; }
}
@keyframes heroMapBgDrift {
  0% { background-position: 0 0; }
  100% { background-position: 80px 80px; }
}
@keyframes heroMapFadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .hero-map-pulse,
  .hero-map-ring,
  .hero-map-orbiter,
  .hero-map-bob,
  .hero-map-glow,
  .hero-map-ping,
  .hero-map-spark,
  .hero-map-bg {
    animation: none !important;
  }
}
`;

export default function HeroMapPreview() {
  const [mounted, setMounted] = useState(false);

  // Lazy-mount images after first paint so the hero text becomes visible
  // without being blocked by image decoding.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Faint hex/grid background pattern */}
      <div
        className="hero-map-bg"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0,255,136,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.06) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.95), transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.95), transparent 75%)",
          animation: "heroMapBgDrift 30s linear infinite",
          opacity: 0.7,
        }}
      />

      {/* Soft green ambient glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 40%, rgba(0,255,136,0.18), transparent 55%), radial-gradient(circle at 80% 90%, rgba(136,255,0,0.07), transparent 60%)",
        }}
      />

      {/* Rotating outer rings */}
      <div
        className="hero-map-ring"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "clamp(360px, 70vmin, 720px)",
          height: "clamp(360px, 70vmin, 720px)",
          borderRadius: "50%",
          border: "1px dashed rgba(0,255,136,0.18)",
          animation: "heroMapRingDrift 80s linear infinite",
        }}
      />
      <div
        className="hero-map-ring"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "clamp(260px, 52vmin, 540px)",
          height: "clamp(260px, 52vmin, 540px)",
          borderRadius: "50%",
          border: "1px solid rgba(0,255,136,0.12)",
          animation: "heroMapRingDriftRev 60s linear infinite",
        }}
      />
      <div
        className="hero-map-ring"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "clamp(180px, 36vmin, 380px)",
          height: "clamp(180px, 36vmin, 380px)",
          borderRadius: "50%",
          border: "1px dashed rgba(0,255,136,0.10)",
          animation: "heroMapRingDrift 40s linear infinite",
        }}
      />

      {/* Pulsing "ping" circles emanating from the eye */}
      {mounted &&
        [0, 2.4, 4.8].map((delay) => (
          <span
            key={`ping-${delay}`}
            className="hero-map-ping"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "clamp(120px, 22vmin, 240px)",
              height: "clamp(120px, 22vmin, 240px)",
              borderRadius: "50%",
              border: "1px solid rgba(0,255,136,0.5)",
              animation: `heroMapPing 7s ease-out ${delay}s infinite`,
            }}
          />
        ))}

      {/* Central "YOU ARE HERE" eye marker */}
      {mounted && (
        <div
          className="hero-map-pulse"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "clamp(96px, 18vmin, 168px)",
            height: "clamp(96px, 18vmin, 168px)",
            transform: "translate(-50%, -50%)",
            animation: "heroMapEyePulse 3s ease-in-out infinite",
            zIndex: 3,
          }}
        >
          <Image
            src="/blink-logo.png"
            alt=""
            fill
            sizes="(max-width: 768px) 18vmin, 168px"
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
      )}

      {/* "YOU ARE HERE" label under the eye */}
      <div
        style={{
          position: "absolute",
          top: "calc(50% + clamp(60px, 11vmin, 102px))",
          left: "50%",
          transform: "translate(-50%, 0)",
          fontFamily: "Space Grotesk, Inter, sans-serif",
          fontSize: 10,
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color: "rgba(0,255,136,0.85)",
          fontWeight: 800,
          textShadow: "0 0 12px rgba(0,255,136,0.7)",
          whiteSpace: "nowrap",
        }}
      >
        You are here
      </div>

      {/* Orbiting creature markers */}
      {mounted &&
        ORBITERS.map((o, i) => {
          const creature = BESTIARY.find((c) => c.id === o.id);
          if (!creature) return null;
          const ring = RINGS[o.ring];
          const glow = RARITY_COLOR[creature.rarity];
          const radiusCalc = `calc(${ring.radiusPct}vmin)`;
          return (
            <div
              key={`orb-${o.id}-${i}`}
              className="hero-map-orbiter"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 0,
                height: 0,
                animation: `heroMapOrbit ${o.duration}s linear infinite`,
                // CSS vars consumed by the keyframe
                ["--start" as string]: `${o.offset}deg`,
                ["--radius" as string]: radiusCalc,
              } as React.CSSProperties}
            >
              <div
                className="hero-map-bob"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  animation: `heroMapBob ${4 + i * 0.4}s ease-in-out ${i * 0.5}s infinite`,
                }}
              >
                <div
                  className="hero-map-glow"
                  style={{
                    width: `clamp(${Math.round(o.size * 0.55)}px, ${o.size * 0.09}vmin, ${o.size}px)`,
                    height: `clamp(${Math.round(o.size * 0.55)}px, ${o.size * 0.09}vmin, ${o.size}px)`,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: `2px solid ${glow}`,
                    animation: `heroMapGlow ${3 + i * 0.3}s ease-in-out infinite`,
                    ["--glow" as string]: `${glow}aa`,
                  } as React.CSSProperties}
                >
                  <Image
                    src={creature.floating}
                    alt=""
                    width={120}
                    height={120}
                    sizes="120px"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
                {/* Tiny spark above each orbiter on a stagger */}
                <span
                  className="hero-map-spark"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: glow,
                    boxShadow: `0 0 8px ${glow}`,
                    animation: `heroMapSpark ${5 + i}s ease-out ${i * 0.7}s infinite`,
                  }}
                />
              </div>
            </div>
          );
        })}

      {/* Edge vignette to keep focus centered */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, transparent 40%, rgba(10,10,15,0.6) 75%, rgba(10,10,15,0.95) 100%)",
        }}
      />
    </div>
  );
}
