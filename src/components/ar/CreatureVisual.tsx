"use client";

import { useEffect, useState } from "react";
import type { CatchableSpawn } from "@/components/HuntMap";
import { resolveByCreatureId } from "@/lib/bestiary-art";

// Visual states the AR finite-state machine drives the creature through.
// Kept aligned with ARCatchFsmState in ARCameraOverlay.tsx — the surface
// contract here is what a future Three.js / GLB-backed implementation must
// match to slot in without touching the rest of the catch experience.
export type CreatureVisualState =
  | "materializing"
  | "idle"
  | "aimed"
  | "thrown"
  | "captured"
  | "shaking"
  | "success"
  | "failed";

export interface CreatureVisualProps {
  spawn: CatchableSpawn;
  state: CreatureVisualState;
  /** Tier accent colour, hex (#RRGGBB). */
  accent: string;
  /** Device-orientation tilt offset in CSS pixels. */
  tilt: { x: number; y: number };
  /** 0–1 — proximity-driven scale + opacity multiplier (1 = in range). */
  proximity: number;
  /**
   * "catchable" (default) → centred card-frame-less visual driven by FSM state.
   * "world" → free-floating Pokémon-GO-style render anchored by bearing/scale;
   *           no halo, no swipe interaction, transparent backdrop.
   */
  mode?: "world" | "catchable";
  /**
   * World-mode screen anchor. xPct/yPct in 0–1 viewport coords.
   * Ignored when mode === "catchable".
   */
  worldPosition?: { xPct: number; yPct: number } | null;
  /** World-mode distance-based scale (0.3 far → 1.0 close). */
  worldScale?: number;
}

const CREATURE_CSS_ID = "ar-creature-visual-styles";
const CREATURE_CSS = `
@keyframes arCreatureMaterialize {
  0%   { opacity: 0; transform: scale(0.2) rotate(-12deg); filter: blur(8px) saturate(0); }
  60%  { opacity: 1; transform: scale(1.12) rotate(3deg); filter: blur(0) saturate(1.3); }
  100% { opacity: 1; transform: scale(1) rotate(0); filter: blur(0) saturate(1); }
}
@keyframes arCreatureFailEscape {
  0%   { opacity: 1; transform: scale(1); filter: brightness(1); }
  40%  { opacity: 1; transform: scale(1.3) translateY(-12px); filter: brightness(2); }
  100% { opacity: 0; transform: scale(0.4) translateY(-40px); filter: brightness(1); }
}
@keyframes arVortexSpin {
  from { transform: translate(-50%, -50%) rotate(0deg) scale(0.3); opacity: 0.95; }
  to   { transform: translate(-50%, -50%) rotate(540deg) scale(1.4); opacity: 0; }
}
@keyframes arHaloSpin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to   { transform: translate(-50%, -50%) rotate(360deg); }
}
@keyframes arBobBreathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-22px) scale(1.03); }
}
@keyframes arBlinkFlash {
  0%, 100% { filter: drop-shadow(0 0 22px var(--ar-accent)) drop-shadow(0 0 44px var(--ar-accent-soft)); }
  50%      { filter: drop-shadow(0 0 36px var(--ar-accent)) drop-shadow(0 0 70px var(--ar-accent-soft)) brightness(1.5) saturate(1.4); }
}
@media (prefers-reduced-motion: reduce) {
  .ar-bob-breathe { animation: none !important; }
  .ar-halo-spin   { animation: none !important; }
}
`;

function useCreatureCss(): void {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(CREATURE_CSS_ID)) return;
    const el = document.createElement("style");
    el.id = CREATURE_CSS_ID;
    el.textContent = CREATURE_CSS;
    document.head.appendChild(el);
  }, []);
}

// 2D creature renderer. v1 is a single bestiary PNG with CSS-driven life:
// breathing, bob, occasional blink, and state-driven scale/opacity. A v2
// GLB-backed version would replace this component file and nothing else.
export default function CreatureVisual({
  spawn,
  state,
  accent,
  tilt,
  proximity,
  mode = "catchable",
  worldPosition = null,
  worldScale,
}: CreatureVisualProps) {
  useCreatureCss();
  // IDENTITY: resolve animated asset from the registry by creature_id so the
  // AR camera shows the same creature that the catch route will mint.
  const art = resolveByCreatureId(spawn.creature_id, {
    name: spawn.name,
    tier: spawn.tier,
    imageCid: spawn.image_url,
  });
  const floatingSrc = art.floating || spawn.image_url || "";
  const [blink, setBlink] = useState(false);

  // Random ~4-7s blink/glance loop while the creature is interactable.
  useEffect(() => {
    if (state !== "idle" && state !== "aimed") return;
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const next = 4000 + Math.random() * 3000;
      timer = setTimeout(() => {
        if (!mounted) return;
        setBlink(true);
        setTimeout(() => mounted && setBlink(false), 180);
        schedule();
      }, next);
    };
    schedule();
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [state]);

  if (!floatingSrc) return null;

  // State → top-level visual modifiers (scale + opacity applied to inner).
  const captured = state === "captured" || state === "shaking" || state === "success";
  const failed = state === "failed";
  const isWorld = mode === "world";
  // World mode is a free-floating render: skip vortex + tier halo. A subtle
  // glow on the artwork itself provides the "creature alive at distance" cue.
  const showHalo = !isWorld && !captured && !failed && state !== "materializing";
  const showVortex = !isWorld && state === "materializing";

  // Proximity-driven shrink + fade so 'come closer' is visceral. We never go
  // below 0.55 scale / 0.35 opacity so the creature stays visible.
  const proxClamped = Math.max(0, Math.min(1, proximity));
  const proxScale = 0.55 + proxClamped * 0.45;
  const proxOpacity = 0.35 + proxClamped * 0.65;

  let innerScale = isWorld ? (worldScale ?? 1) : proxScale;
  let innerOpacity = isWorld ? 1 : proxOpacity;
  let innerAnimation: string | undefined;
  let innerTransition = "opacity 320ms, transform 480ms cubic-bezier(.2,.7,.3,1)";

  if (!isWorld && state === "materializing") {
    innerAnimation = "arCreatureMaterialize 600ms cubic-bezier(.18,1.2,.4,1) both";
    innerTransition = "none";
  } else if (captured) {
    innerScale = 0.02;
    innerOpacity = 0;
    innerTransition = "transform 220ms ease-in, opacity 220ms ease-in";
  } else if (failed) {
    innerAnimation = "arCreatureFailEscape 480ms ease-in forwards";
    innerTransition = "none";
  }

  // Position anchor: 50/50 by default, world mode overrides via bearing-derived
  // viewport percentages. Clamp to keep the creature renderable even if the
  // caller passes slightly out-of-FOV values (caller is responsible for the
  // compass-arrow fallback when truly off-screen).
  const anchorLeft =
    isWorld && worldPosition
      ? `${Math.max(0, Math.min(1, worldPosition.xPct)) * 100}%`
      : "50%";
  const anchorTop =
    isWorld && worldPosition
      ? `${Math.max(0, Math.min(1, worldPosition.yPct)) * 100}%`
      : "50%";

  return (
    <>
      {/* Materialize vortex — only during the 600ms reveal. */}
      {showVortex && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "min(70vw, 420px)",
            height: "min(70vw, 420px)",
            zIndex: 8,
            pointerEvents: "none",
            background: `conic-gradient(from 0deg, ${accent}00, ${accent}cc, ${accent}00 35%, ${accent}cc 50%, ${accent}00 70%)`,
            borderRadius: "50%",
            filter: "blur(14px)",
            animation: "arVortexSpin 600ms linear forwards",
          }}
        />
      )}

      {/* Tier halo — only while interactable, hidden during throw/captured. */}
      {showHalo && (
        <div
          aria-hidden
          className="ar-halo-spin"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "min(70vw, 420px)",
            height: "min(70vw, 420px)",
            zIndex: 9,
            borderRadius: "50%",
            background: `conic-gradient(from 0deg, ${accent}00, ${accent}55, ${accent}00 60%)`,
            filter: "blur(18px)",
            opacity: 0.55 * innerOpacity,
            animation: "arHaloSpin 8s linear infinite",
            pointerEvents: "none",
            transform: "translate(-50%, -50%)",
            transition: "opacity 240ms",
          }}
        />
      )}

      {/* Nested wrappers:
          1. outer: anchor (top/left 50%) + device-orientation tilt
          2. bob/breathe wrapper (idle/aimed only): pure CSS keyframe
          3. inner: state-driven scale + opacity + materialize/fail anims */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: anchorTop,
          left: anchorLeft,
          zIndex: 11,
          width: isWorld ? "min(45vw, 280px)" : "min(60vw, 360px)",
          maxHeight: "55vh",
          pointerEvents: "none",
          transform: `translate(-50%, -50%) translate(${tilt.x}px, ${tilt.y}px)`,
          transition: isWorld
            ? "top 320ms ease-out, left 320ms ease-out, transform 220ms cubic-bezier(.2,.7,.3,1)"
            : "transform 220ms cubic-bezier(.2,.7,.3,1)",
          willChange: "transform",
        }}
      >
        <div
          className={
            isWorld || state === "idle" || state === "aimed"
              ? "ar-bob-breathe"
              : undefined
          }
          style={{
            animation:
              isWorld || state === "idle" || state === "aimed"
                ? "arBobBreathe 3.4s ease-in-out infinite"
                : undefined,
            willChange: "transform",
          }}
        >
          <img
            src={floatingSrc}
            alt={spawn.name}
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              maxHeight: "55vh",
              objectFit: "contain",
              opacity: innerOpacity,
              transform: `scale(${innerScale})`,
              transformOrigin: "center center",
              transition: innerTransition,
              filter: blink
                ? `drop-shadow(0 0 36px ${accent}) drop-shadow(0 0 70px ${accent}88) brightness(1.5) saturate(1.4)`
                : `drop-shadow(0 0 22px ${accent}cc) drop-shadow(0 0 44px ${accent}66)`,
              animation: innerAnimation,
              willChange: "transform, opacity, filter",
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      </div>
    </>
  );
}
