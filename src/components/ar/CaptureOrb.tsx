"use client";

import { useEffect } from "react";

// Throw + shake state for the BLINK eye-orb. The FSM in ARCameraOverlay
// owns the higher-level catch state; this prop just tells the orb which
// visual phase to render.
export type CaptureOrbPhase =
  | "hidden"        // not on screen (idle / materializing / failed-after-escape)
  | "ready"         // sitting at the bottom, can be tapped/thrown
  | "throwing"      // mid-arc toward creature
  | "shaking"       // closed, doing the 3-shake Pokeball wiggle
  | "locked"        // success burst
  | "escaping";     // breaking open, creature popping back out

export interface CaptureOrbProps {
  phase: CaptureOrbPhase;
  /** Throw origin (pointer-up x) in viewport px. If null, defaults to centre. */
  originX?: number | null;
  /** Throw origin (pointer-up y) in viewport px. If null, defaults to bottom. */
  originY?: number | null;
  /** Whether to render the ready-state hint label (e.g. "swipe up" copy). */
  showReadyHint?: boolean;
  onTap?: () => void;
}

const ORB_SRC = "/brand/logo-orb-glow.png";
const ORB_CSS_ID = "ar-capture-orb-styles";
// Throw + shake animations. The arc is a CSS keyframe with a translate that
// goes bottom-of-screen → centre-of-screen, with a slight horizontal swing
// halfway through to feel like a parabolic toss. Shake mimics Pokeball
// capture cadence: left-right-left-pause-left-right.
const ORB_CSS = `
@keyframes arOrbAppear {
  0% { opacity: 0; transform: translate(-50%, 40px) scale(0.6); }
  100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
}
@keyframes arOrbThrow {
  0%   { transform: translate(-50%, 0) scale(1) rotate(0deg); offset-distance: 0%; }
  40%  { transform: translate(-50%, -40vh) scale(0.85) rotate(180deg); }
  70%  { transform: translate(-50%, -45vh) scale(0.7) rotate(310deg); }
  100% { transform: translate(-50%, -50vh) scale(0.55) rotate(360deg); }
}
@keyframes arOrbShake {
  0%, 100% { transform: translate(-50%, -50vh) rotate(0deg); }
  10% { transform: translate(-50%, -50vh) rotate(-12deg); }
  20% { transform: translate(-50%, -50vh) rotate(10deg); }
  30% { transform: translate(-50%, -50vh) rotate(-8deg); }
  40% { transform: translate(-50%, -50vh) rotate(0deg); }
  50% { transform: translate(-50%, -50vh) rotate(0deg); }
  60% { transform: translate(-50%, -50vh) rotate(-12deg); }
  70% { transform: translate(-50%, -50vh) rotate(10deg); }
  80% { transform: translate(-50%, -50vh) rotate(0deg); }
  90% { transform: translate(-50%, -50vh) rotate(-6deg); }
}
@keyframes arOrbLock {
  0%   { transform: translate(-50%, -50vh) scale(0.55); filter: brightness(1) drop-shadow(0 0 18px #00FF88cc); }
  40%  { transform: translate(-50%, -50vh) scale(0.8); filter: brightness(2) drop-shadow(0 0 60px #00FF88) drop-shadow(0 0 100px #FFFFFF); }
  100% { transform: translate(-50%, -50vh) scale(0.7); filter: brightness(1.3) drop-shadow(0 0 30px #00FF88) drop-shadow(0 0 60px #88FF00); }
}
@keyframes arOrbEscape {
  0%   { transform: translate(-50%, -50vh) scale(0.55) rotate(0); filter: brightness(1); }
  30%  { transform: translate(-50%, -50vh) scale(0.7) rotate(-18deg); filter: brightness(1.4); }
  60%  { transform: translate(-50%, -50vh) scale(0.95) rotate(0); filter: brightness(2); }
  100% { transform: translate(-50%, -50vh) scale(0.55) rotate(0); filter: brightness(1); opacity: 0; }
}
@keyframes arOrbSeam {
  0%, 100% { opacity: 0; transform: translate(-50%, -50vh) scaleY(0); }
  50%      { opacity: 1; transform: translate(-50%, -50vh) scaleY(1); }
}
@keyframes arOrbLockBurst {
  0%   { transform: translate(-50%, -50%) scale(0.2); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
}
@keyframes arWhiteFlash {
  0%   { opacity: 0; }
  20%  { opacity: 0.85; }
  100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .ar-orb-throw, .ar-orb-shake, .ar-orb-lock, .ar-orb-escape, .ar-orb-seam, .ar-orb-lock-burst, .ar-white-flash {
    animation: none !important;
  }
}
`;

function useOrbCss(): void {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(ORB_CSS_ID)) return;
    const el = document.createElement("style");
    el.id = ORB_CSS_ID;
    el.textContent = ORB_CSS;
    document.head.appendChild(el);
  }, []);
}

// Renders nothing when phase === 'hidden'. Otherwise plants the eye-orb at
// the bottom-centre (ready) or arcs it up to ~50vh (throwing / shaking /
// locked / escaping).
export default function CaptureOrb({
  phase,
  showReadyHint = false,
  onTap,
}: CaptureOrbProps) {
  useOrbCss();

  if (phase === "hidden") return null;

  // Phase → animation. Each plays once; the FSM transitions to the next
  // phase when the animation hits its expected duration (driven by setTimeout
  // in the parent — see ARCameraOverlay).
  let animation: string | undefined;
  let staticTransform = "translate(-50%, 0)";
  if (phase === "ready") {
    animation = "arOrbAppear 280ms ease-out both";
  } else if (phase === "throwing") {
    animation = "arOrbThrow 800ms cubic-bezier(.4,0,.6,1) forwards";
    staticTransform = "translate(-50%, -50vh) scale(0.55)";
  } else if (phase === "shaking") {
    animation = "arOrbShake 1200ms ease-in-out forwards";
    staticTransform = "translate(-50%, -50vh)";
  } else if (phase === "locked") {
    animation = "arOrbLock 560ms ease-out forwards";
    staticTransform = "translate(-50%, -50vh) scale(0.7)";
  } else if (phase === "escaping") {
    animation = "arOrbEscape 520ms ease-in forwards";
    staticTransform = "translate(-50%, -50vh) scale(0.55)";
  }

  const showLockBurst = phase === "locked";
  const showWhiteFlash = phase === "locked";
  const showSeam = phase === "locked" || phase === "escaping";

  return (
    <>
      {/* Eye-orb. Bottom-centre when 'ready', mid-screen during throw+. */}
      <div
        aria-hidden
        onClick={phase === "ready" ? onTap : undefined}
        style={{
          position: "absolute",
          left: "50%",
          bottom: "18vh",
          width: 96,
          height: 96,
          zIndex: 40,
          cursor: phase === "ready" && onTap ? "pointer" : "default",
          pointerEvents: phase === "ready" ? "auto" : "none",
          transform: staticTransform,
          animation,
          willChange: "transform, filter, opacity",
        }}
      >
        <img
          src={ORB_SRC}
          alt=""
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "contain",
            filter:
              "drop-shadow(0 0 24px rgba(0,255,136,0.8)) drop-shadow(0 8px 20px rgba(0,0,0,0.55))",
          }}
        />
        {/* The vertical 'seam' that splits when the orb opens. Pure CSS
            line scaled along Y for the split-second open during capture/escape. */}
        {showSeam && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "10%",
              left: "50%",
              width: 2,
              height: "80%",
              transform: "translateX(-50%)",
              background:
                "linear-gradient(180deg, transparent, #FFFFFF 25%, #00FF88 50%, #FFFFFF 75%, transparent)",
              animation: "arOrbSeam 480ms ease-in-out forwards",
              boxShadow: "0 0 18px #FFFFFF, 0 0 32px #00FF88",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Lock burst — 4 outward neon-green stars + soft ring. */}
      {showLockBurst && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 160,
            height: 160,
            transform: "translate(-50%, -50%)",
            zIndex: 41,
            pointerEvents: "none",
          }}
        >
          {[0, 90, 180, 270].map((deg) => (
            <div
              key={deg}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 12,
                height: 12,
                transform: `translate(-50%, -50%) rotate(${deg}deg)`,
                transformOrigin: "center",
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  background:
                    "conic-gradient(from 0deg, #00FF88, #FFFFFF, #88FF00, #00FF88)",
                  clipPath:
                    "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
                  animation: "arOrbLockBurst 520ms ease-out forwards",
                  filter: "drop-shadow(0 0 8px #00FF88)",
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Brief white flash that wipes the screen on lock. */}
      {showWhiteFlash && (
        <div
          aria-hidden
          className="ar-white-flash"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 42,
            background: "#FFFFFF",
            mixBlendMode: "screen",
            opacity: 0,
            pointerEvents: "none",
            animation: "arWhiteFlash 460ms ease-out forwards",
          }}
        />
      )}

      {/* Ready hint copy — sits just above the orb. */}
      {phase === "ready" && showReadyHint && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            bottom: "calc(18vh + 110px)",
            transform: "translateX(-50%)",
            zIndex: 41,
            color: "#00FF88",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            textShadow: "0 0 12px rgba(0,255,136,0.65)",
            pointerEvents: "none",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          }}
        >
          ↑ swipe up to throw
        </div>
      )}
    </>
  );
}
