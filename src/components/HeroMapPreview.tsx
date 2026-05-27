"use client";

/*
 * HeroMapPreview — Apple-keynote hero visual.
 *
 * A photoreal 3D Earth (NASA Blue Marble + neon-green Fresnel atmosphere)
 * sits at the dead center. Concentric BLINK signal rings ripple outward.
 * Creatures from across the world orbit at multiple radii, each with a
 * glowing neon name tag. On hover/tap a creature freezes mid-orbit and
 * reveals a small stat tooltip.
 *
 * The 3D globe (Earth3D.tsx) is loaded via dynamic import with ssr:false
 * so the server never tries to evaluate three.js. Everything else here is
 * pure CSS — transform/opacity only, smooth on older phones.
 *
 * Container contract: this component fills its parent absolutely. The parent
 * MUST have `aspect-ratio: 1 / 1` so the visual is perfectly square. All
 * radii are expressed as % of the container, which guarantees nothing ever
 * gets clipped on any viewport.
 */

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { BESTIARY, RARITY_COLOR, RARITY_LABEL } from "@/lib/bestiary";

// 3D Earth lives behind a dynamic import so SSR doesn't try to evaluate
// three.js / WebGL on the server.
const Earth3D = dynamic(() => import("./Earth3D"), { ssr: false });

const GREEN = "#00FF88";

// All radii are % of the container's smaller dimension (container is square).
// Outer-ring orbiter + avatar + label must stay under 50% to avoid clipping.
const RINGS = [
  { radiusPct: 22, dashed: false, opacity: 0.22 },
  { radiusPct: 30, dashed: true,  opacity: 0.28 },
  { radiusPct: 38, dashed: false, opacity: 0.35 },
];

type Orbiter = {
  id: number;
  ring: 0 | 1 | 2;
  offset: number;
  duration: number;
  reverse?: boolean;
};

const ORBITERS: Orbiter[] = [
  { id: 1,  ring: 0, offset: 0,   duration: 36 },
  { id: 16, ring: 0, offset: 135, duration: 36 },
  { id: 11, ring: 0, offset: 245, duration: 36 },
  { id: 19, ring: 1, offset: 30,  duration: 58, reverse: true },
  { id: 18, ring: 1, offset: 160, duration: 58, reverse: true },
  { id: 17, ring: 1, offset: 280, duration: 58, reverse: true },
  { id: 13, ring: 2, offset: 70,  duration: 88 },
  { id: 4,  ring: 2, offset: 250, duration: 88 },
];

// Fixed star positions so SSR + CSR match — random would hydrate-mismatch.
const STARS: Array<{ x: number; y: number; size: number; delay: number; dur: number }> = [
  { x: 6,  y: 12, size: 1.4, delay: 0.0, dur: 3.6 },
  { x: 14, y: 78, size: 1.2, delay: 1.2, dur: 4.2 },
  { x: 22, y: 30, size: 1.6, delay: 0.5, dur: 3.0 },
  { x: 30, y: 88, size: 1.0, delay: 2.1, dur: 5.0 },
  { x: 38, y: 8,  size: 1.4, delay: 1.7, dur: 4.4 },
  { x: 46, y: 70, size: 1.2, delay: 0.3, dur: 3.8 },
  { x: 54, y: 18, size: 1.0, delay: 2.5, dur: 4.0 },
  { x: 62, y: 90, size: 1.6, delay: 0.9, dur: 3.4 },
  { x: 70, y: 24, size: 1.2, delay: 1.5, dur: 4.6 },
  { x: 78, y: 82, size: 1.4, delay: 0.7, dur: 3.2 },
  { x: 86, y: 14, size: 1.0, delay: 2.3, dur: 4.8 },
  { x: 92, y: 60, size: 1.6, delay: 0.1, dur: 3.6 },
  { x: 4,  y: 50, size: 1.0, delay: 1.9, dur: 5.2 },
  { x: 18, y: 96, size: 1.2, delay: 0.8, dur: 3.6 },
  { x: 34, y: 56, size: 1.4, delay: 1.1, dur: 4.0 },
  { x: 50, y: 96, size: 1.2, delay: 2.0, dur: 3.8 },
  { x: 66, y: 4,  size: 1.0, delay: 1.4, dur: 4.4 },
  { x: 82, y: 38, size: 1.4, delay: 0.4, dur: 3.6 },
  { x: 96, y: 84, size: 1.2, delay: 1.8, dur: 4.2 },
  { x: 10, y: 38, size: 1.0, delay: 2.2, dur: 4.8 },
];

const KEYFRAMES = `
@keyframes hmAtmosphere {
  0%, 100% { opacity: 0.70; transform: translate(-50%, -50%) scale(1);    filter: blur(4px); }
  50%      { opacity: 1.0;  transform: translate(-50%, -50%) scale(1.04); filter: blur(5px); }
}
@keyframes hmFloat {
  0%, 100% { transform: translate(-50%, calc(-50% - 6px)) scale(1); }
  50%      { transform: translate(-50%, calc(-50% + 6px)) scale(1); }
}
@keyframes hmBreath {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.06); }
}
@keyframes hmGlowPulse {
  0%, 100% { opacity: 0.55; transform: translate(-50%, 20%) scale(1); }
  50%      { opacity: 1.0;  transform: translate(-50%, 20%) scale(1.18); }
}
@keyframes hmRingDrift     { from { transform: translate(-50%, -50%) rotate(0deg); }   to { transform: translate(-50%, -50%) rotate(360deg); } }
@keyframes hmRingDriftRev  { from { transform: translate(-50%, -50%) rotate(0deg); }   to { transform: translate(-50%, -50%) rotate(-360deg); } }
@keyframes hmOrbit {
  from { transform: translate(-50%, -50%) rotate(var(--start)) translateX(var(--radius)) rotate(calc(-1 * var(--start))); }
  to   { transform: translate(-50%, -50%) rotate(calc(var(--start) + 360deg)) translateX(var(--radius)) rotate(calc(-1 * (var(--start) + 360deg))); }
}
@keyframes hmOrbitRev {
  from { transform: translate(-50%, -50%) rotate(var(--start)) translateX(var(--radius)) rotate(calc(-1 * var(--start))); }
  to   { transform: translate(-50%, -50%) rotate(calc(var(--start) - 360deg)) translateX(var(--radius)) rotate(calc(-1 * (var(--start) - 360deg))); }
}
@keyframes hmSignalPulse {
  0%   { transform: translate(-50%, -50%) scale(0.55); opacity: 0.8; }
  100% { transform: translate(-50%, -50%) scale(2.6);  opacity: 0;   }
}
@keyframes hmTwinkle {
  0%, 100% { opacity: 0.3; transform: scale(0.7); }
  50%      { opacity: 1.0; transform: scale(1.2); }
}
@keyframes hmDotPulse {
  0%, 100% { transform: scale(1);   opacity: 0.95; }
  50%      { transform: scale(1.6); opacity: 0.45; }
}
@keyframes hmFadeIn        { from { opacity: 0; }                                       to { opacity: 1; } }
@keyframes hmFadeInScale   { from { opacity: 0; transform: translate(-50%, -50%) scale(0.6); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
@keyframes hmRingReveal {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.5) rotate(0deg); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1)   rotate(360deg); }
}
@keyframes hmTooltipIn {
  from { opacity: 0; transform: translate(-50%, -8px); }
  to   { opacity: 1; transform: translate(-50%, 0);    }
}
/* ─── Creature life animations ─── */
@keyframes hmCreatureFloat {
  0%, 100% { transform: translate(-50%, -50%) translateY(0px) rotate(-1deg); }
  25%      { transform: translate(-50%, -50%) translateY(-7px) rotate(1.5deg); }
  50%      { transform: translate(-50%, -50%) translateY(-4px) rotate(-0.5deg); }
  75%      { transform: translate(-50%, -50%) translateY(-9px) rotate(2deg); }
}
@keyframes hmCreatureBreathe {
  0%, 100% { transform: scale(1); }
  40%      { transform: scale(1.07); }
  70%      { transform: scale(0.97); }
}
@keyframes hmAuraPulse {
  0%, 100% { opacity: 0.5;  transform: translate(-50%, -50%) scale(0.9); }
  50%      { opacity: 1.0;  transform: translate(-50%, -50%) scale(1.15); }
}
@keyframes hmShimmer {
  from { transform: translateX(-120%); opacity: 0; }
  20%  { opacity: 1; }
  to   { transform: translateX(220%); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .hm-atmosphere,
  .hm-ring,
  .hm-orbiter,
  .hm-signal,
  .hm-star,
  .hm-live-dot,
  .hm-creature-img,
  .hm-creature-halo {
    animation: none !important;
  }
}
`;

export default function HeroMapPreview() {
  const [mounted, setMounted] = useState(false);
  // Orbiters get their own gate so 8 creature image fetches don't compete
  // with the Earth texture for first-paint bandwidth on slow mobile links.
  const [orbitersReady, setOrbitersReady] = useState(false);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    const t = window.setTimeout(() => setOrbitersReady(true), 350);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, []);

  // Close tap-tooltip when user clicks/taps outside any creature.
  useEffect(() => {
    if (active === null) return;
    const close = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !target.closest?.("[data-orbiter]")) setActive(null);
    };
    window.addEventListener("click", close, { passive: true });
    window.addEventListener("touchstart", close, { passive: true });
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("touchstart", close);
    };
  }, [active]);

  const orbiterData = useMemo(
    () =>
      ORBITERS.map((o, i) => {
        const c = BESTIARY.find((b) => b.id === o.id);
        return c ? { ...o, creature: c, index: i } : null;
      }).filter(Boolean) as Array<Orbiter & { creature: typeof BESTIARY[number]; index: number }>,
    []
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        zIndex: 0,
        // Establish a size container so `cqmin` units resolve to the
        // square's side. We use cqmin (not %) for orbit radii because
        // `translateX(N%)` resolves against the element's own width
        // and our orbiter wrappers are intentionally 0×0.
        containerType: "size",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Faint hex/grid background, masked to fade at edges */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0,255,136,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.06) 1px, transparent 1px)",
          backgroundSize: "10% 10%",
          maskImage:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.95), transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.95), transparent 75%)",
          opacity: 0.65,
          pointerEvents: "none",
        }}
      />

      {/* Ambient green glow + warm golden halo + violet/blue space depth */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, rgba(0,255,136,0.28), transparent 55%), radial-gradient(circle at 78% 88%, rgba(136,255,0,0.14), transparent 60%), radial-gradient(circle at 50% 50%, rgba(255,205,110,0.20), transparent 50%), radial-gradient(circle at 30% 70%, rgba(88,0,255,0.07), transparent 50%), radial-gradient(circle at 70% 20%, rgba(0,136,255,0.05), transparent 45%)",
          pointerEvents: "none",
        }}
      />

      {/* Twinkling stars (fixed positions, hydration-safe) */}
      {mounted && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {STARS.map((s, i) => (
            <span
              key={`star-${i}`}
              className="hm-star"
              style={{
                position: "absolute",
                top: `${s.y}%`,
                left: `${s.x}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                borderRadius: "50%",
                background: GREEN,
                boxShadow: `0 0 10px ${GREEN}`,
                opacity: 0.85,
                animation: `hmTwinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* Concentric BLINK signal rings (perfectly centered) */}
      {RINGS.map((r, i) => {
        const diameterPct = r.radiusPct * 2;
        return (
          <div
            key={`ring-${i}`}
            className="hm-ring"
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: `${diameterPct}%`,
              height: `${diameterPct}%`,
              borderRadius: "50%",
              border: `${r.dashed ? "1px dashed" : "1.5px solid"} rgba(0,255,136,${r.opacity})`,
              transform: "translate(-50%, -50%)",
              animation: mounted
                ? `${i % 2 === 0 ? "hmRingDrift" : "hmRingDriftRev"} ${60 + i * 25}s linear infinite, hmRingReveal ${0.9 + i * 0.15}s cubic-bezier(.2,.7,.2,1) ${0.15 + i * 0.1}s both`
                : "none",
              opacity: mounted ? 1 : 0,
              pointerEvents: "none",
            }}
          />
        );
      })}

      {/* Signal pulses radiating from the globe every ~4s */}
      {mounted &&
        [0, 1.6, 3.2].map((delay, i) => (
          <span
            key={`signal-${i}`}
            className="hm-signal"
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "30%",
              height: "30%",
              borderRadius: "50%",
              border: `2px solid rgba(0,255,136,0.75)`,
              transform: "translate(-50%, -50%) scale(0.55)",
              animation: `hmSignalPulse 4.8s ease-out ${delay}s infinite`,
              pointerEvents: "none",
            }}
          />
        ))}
      {mounted &&
        [0.8, 2.4, 4.0].map((delay, i) => (
          <span
            key={`signal-g2-${i}`}
            className="hm-signal"
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "30%",
              height: "30%",
              borderRadius: "50%",
              border: `2px solid rgba(136,255,0,0.65)`,
              transform: "translate(-50%, -50%) scale(0.55)",
              animation: `hmSignalPulse 4.8s ease-out ${delay}s infinite`,
              pointerEvents: "none",
            }}
          />
        ))}

      {/* Atmosphere halo behind the globe */}
      {mounted && (
        <div
          className="hm-atmosphere"
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "44%",
            height: "44%",
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(0,255,136,0.85) 0%, rgba(0,255,136,0.30) 38%, transparent 65%)`,
            transform: "translate(-50%, -50%)",
            animation: "hmAtmosphere 4.5s ease-in-out infinite",
            pointerEvents: "none",
            filter: "blur(4px)",
          }}
        />
      )}

      {/* === EARTH GLOBE (react-three-fiber) ===
          Container is sized a bit larger than the visual sphere so the
          Fresnel atmosphere has room to bleed. The Earth sphere fills
          ~75% of this canvas (camera fov 30 @ z=5), matching the prior
          28% CSS globe at the parent container's coordinate space. */}
      {mounted && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "46%",
            aspectRatio: "1 / 1",
            height: "auto",
            transform: "translate(-50%, -50%)",
            animation: "hmFadeIn 0.9s cubic-bezier(.2,.7,.2,1) 0.1s both",
            zIndex: 3,
            pointerEvents: "none",
          }}
        >
          <Earth3D />
        </div>
      )}

      {/* "YOU ARE HERE" label sitting below the globe */}
      {mounted && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "calc(50% + 17%)",
            left: "50%",
            transform: "translate(-50%, 0)",
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontSize: "clamp(8px, 1.6cqmin, 11px)",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "rgba(0,255,136,0.85)",
            fontWeight: 800,
            textShadow: "0 0 12px rgba(0,255,136,0.7)",
            whiteSpace: "nowrap",
            zIndex: 4,
            opacity: 0,
            animation: "hmFadeIn 0.6s ease-out 1.1s forwards",
            pointerEvents: "none",
          }}
        >
          Earth · You are here
        </div>
      )}

      {/* === ORBITING CREATURES === */}
      {orbitersReady &&
        orbiterData.map((o) => {
          const ring = RINGS[o.ring];
          const glow = RARITY_COLOR[o.creature.rarity];
          const isActive = active === o.creature.id;
          const orbitName = o.reverse ? "hmOrbitRev" : "hmOrbit";
          return (
            <div
              key={`orb-${o.creature.id}-${o.index}`}
              data-orbiter
              className="hm-orbiter"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 0,
                height: 0,
                animation: `${orbitName} ${o.duration}s linear infinite`,
                animationPlayState: isActive ? "paused" : "running",
                ["--start" as string]: `${o.offset}deg`,
                ["--radius" as string]: `${ring.radiusPct}cqmin`,
                zIndex: isActive ? 6 : 4,
                pointerEvents: "auto",
              } as React.CSSProperties}
            >
              {/* Inner wrapper holds the avatar + label, kept upright by the
                  counter-rotation in the orbit keyframe. */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 0,
                  height: 0,
                  pointerEvents: "auto",
                }}
              >
                {/* Avatar — transparent click area showing the full creature art */}
                {/* ── Creature entity — NO circle clip, full layered animation ── */}
                <button
                  type="button"
                  aria-label={`${o.creature.name} — ${RARITY_LABEL[o.creature.rarity]}`}
                  onMouseEnter={() => setActive(o.creature.id)}
                  onMouseLeave={() => setActive((cur) => (cur === o.creature.id ? null : cur))}
                  onFocus={() => setActive(o.creature.id)}
                  onBlur={() => setActive((cur) => (cur === o.creature.id ? null : cur))}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActive((cur) => (cur === o.creature.id ? null : o.creature.id));
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setActive((cur) => (cur === o.creature.id ? null : o.creature.id));
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "clamp(44px, 14cqmin, 76px)",
                    height: "clamp(44px, 14cqmin, 76px)",
                    transform: "translate(-50%, -50%)",
                    border: "none",
                    background: "transparent",
                    /* NO borderRadius — creatures show their full silhouette */
                    overflow: "visible",
                    cursor: "pointer",
                    padding: 0,
                    /* entrance + continuous float */
                    animation: `hmFadeInScale 0.7s cubic-bezier(.2,.7,.2,1) ${0.5 + o.index * 0.1}s both, hmCreatureFloat ${2.8 + (o.index % 4) * 0.6}s ease-in-out ${o.index * 0.35}s infinite`,
                    WebkitTapHighlightColor: "transparent",
                    filter: isActive
                      ? `drop-shadow(0 0 14px ${glow}) drop-shadow(0 0 28px ${glow}88) brightness(1.15)`
                      : `drop-shadow(0 0 8px ${glow}99) drop-shadow(0 0 16px ${glow}44)`,
                    transition: "filter 0.3s ease",
                    zIndex: isActive ? 2 : 1,
                  }}
                >
                  {/* Aura glow disc behind the creature */}
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "130%",
                      height: "130%",
                      borderRadius: "50%",
                      background: `radial-gradient(circle at 50% 60%, ${glow}30 0%, ${glow}00 70%)`,
                      animation: `hmAuraPulse ${2.2 + o.index * 0.3}s ease-in-out ${o.index * 0.2}s infinite`,
                      pointerEvents: "none",
                      zIndex: 0,
                    }}
                  />
                  {/* The actual creature image — no clip, full silhouette */}
                  <Image
                    src={o.creature.floating}
                    alt=""
                    width={160}
                    height={160}
                    sizes="160px"
                    className="hm-creature-img"
                    style={{
                      position: "relative",
                      zIndex: 1,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",   /* contain = full shape, no crop */
                      display: "block",
                      pointerEvents: "none",
                      /* subtle breathe scale */
                      animation: `hmCreatureBreathe ${3.5 + (o.index % 3) * 0.8}s ease-in-out ${o.index * 0.25}s infinite`,
                    }}
                  />
                  {/* Shimmer sweep on active */}
                  {isActive && (
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: "-20%",
                        background: `linear-gradient(115deg, transparent 30%, ${glow}22 48%, ${glow}44 52%, transparent 70%)`,
                        animation: "hmShimmer 0.8s ease-out both",
                        pointerEvents: "none",
                        zIndex: 3,
                      }}
                    />
                  )}
                </button>

                {/* Name tag — sits below the full creature silhouette */}
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: "clamp(46px, 15cqmin, 82px)",
                    left: 0,
                    transform: "translate(-50%, 0)",
                    fontFamily: "Space Grotesk, Inter, sans-serif",
                    fontSize: "clamp(7px, 1.5cqmin, 9px)",
                    fontWeight: 800,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: glow,
                    background: "rgba(10,10,15,0.75)",
                    border: `1px solid ${glow}40`,
                    borderRadius: 999,
                    padding: "2px 8px",
                    whiteSpace: "nowrap",
                    textShadow: `0 0 8px ${glow}88`,
                    boxShadow: `0 0 10px ${glow}22`,
                    pointerEvents: "none",
                    opacity: 0,
                    animation: `hmFadeIn 0.5s ease-out ${0.9 + o.index * 0.08}s forwards`,
                  }}
                >
                  {o.creature.name}
                </span>

                {/* Tooltip on hover/tap */}
                {isActive && (
                  <div
                    role="tooltip"
                    style={{
                      position: "absolute",
                      top: "clamp(-46px, -10cqmin, -36px)",
                      left: 0,
                      transform: "translate(-50%, 0)",
                      fontFamily: "Space Grotesk, Inter, sans-serif",
                      fontSize: "clamp(9px, 1.8cqmin, 11px)",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "#fff",
                      background: "rgba(10,10,15,0.92)",
                      border: `1px solid ${glow}`,
                      borderRadius: 8,
                      padding: "6px 10px",
                      whiteSpace: "nowrap",
                      boxShadow: `0 0 18px ${glow}77`,
                      pointerEvents: "none",
                      animation: "hmTooltipIn 0.18s ease-out both",
                      zIndex: 8,
                    }}
                  >
                    <span style={{ color: glow }}>
                      {RARITY_LABEL[o.creature.rarity]}
                    </span>
                    <span style={{ opacity: 0.4, margin: "0 6px" }}>·</span>
                    <span style={{ opacity: 0.9 }}>
                      {o.creature.type} / {o.creature.power}
                    </span>
                    <span style={{ opacity: 0.4, margin: "0 6px" }}>·</span>
                    <span style={{ opacity: 0.7 }}>1 of 1</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

      {/* Soft edge vignette, kept above everything to focus the eye */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, transparent 52%, rgba(10,10,15,0.55) 78%, rgba(10,10,15,0.92) 100%)",
          pointerEvents: "none",
          zIndex: 7,
        }}
      />
    </div>
  );
}
