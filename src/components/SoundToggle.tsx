"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { sounds, MUSIC_PLAYING_EVENT } from "@/lib/sounds";

const GREEN = "#00FF88";

// Routes where the sound toggle would collide with existing controls.
// On these routes the toggle is suppressed entirely — the map page exposes its
// own controls and the auth/onboarding screens are intentionally minimal.
const HIDDEN_ON_ROUTES = [
  "/map",
  "/auth/signin",
  "/auth/signup",
];

// Equalizer bars: rest scale when armed (sound on, music not yet started by a
// user gesture) and per-bar dance timing while music actually plays.
const BARS = [
  { rest: 0.45, dur: 0.52, delay: 0.0 },
  { rest: 0.7, dur: 0.74, delay: 0.12 },
  { rest: 0.95, dur: 0.6, delay: 0.24 },
  { rest: 0.62, dur: 0.82, delay: 0.06 },
  { rest: 0.4, dur: 0.56, delay: 0.18 },
];

const SPARK_COUNT = 7;

export default function SoundToggle() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [playing, setPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [popping, setPopping] = useState(false);
  // Incrementing key remounts the spark container so the burst replays.
  const [burst, setBurst] = useState(0);
  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    setEnabled(sounds.enabled);
    const onPlayingChanged = (e: Event) => {
      setPlaying(Boolean((e as CustomEvent<{ playing: boolean }>).detail?.playing));
    };
    window.addEventListener(MUSIC_PLAYING_EVENT, onPlayingChanged);
    return () => {
      window.removeEventListener(MUSIC_PLAYING_EVENT, onPlayingChanged);
      if (burstTimer.current) clearTimeout(burstTimer.current);
    };
  }, []);

  if (!mounted) return null;
  if (pathname && HIDDEN_ON_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  const toggle = () => {
    const next = !enabled;
    sounds.setEnabled(next);
    setEnabled(next);
    if (next) sounds.play("tick");
    setPopping(true);
    // One-shot spark burst (skipped for reduced-motion users).
    let reduced = false;
    try {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      /* no-op */
    }
    if (!reduced) {
      setBurst((b) => b + 1);
      if (burstTimer.current) clearTimeout(burstTimer.current);
      burstTimer.current = setTimeout(() => setBurst(0), 700);
    }
  };

  // "playing" = music audibly looping; "armed" = sound on but the browser is
  // still waiting for the first user gesture; "muted" = toggled off.
  const state = !enabled ? "muted" : playing ? "playing" : "armed";

  // The welcome page bottom-anchors all of its copy (form hint, terms, music
  // credit), so the only word-free spot is the hero art up top. Everywhere
  // else, sit high enough to clear the mobile bottom tab bar (~58px + safe
  // area) and bottom-edge CTAs/HUD controls on full-screen pages.
  const placement: CSSProperties =
    pathname === "/"
      ? { top: "calc(max(env(safe-area-inset-top, 0px), var(--blink-top-inset, 0px)) + 14px)", right: 18 }
      : { bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)", right: 18 };

  return (
    <>
      <style>{STYLE}</style>
      <button
        type="button"
        onClick={toggle}
        onAnimationEnd={(e) => {
          if (e.animationName === "bwSndPop") setPopping(false);
        }}
        aria-label={enabled ? "Mute sounds" : "Unmute sounds"}
        title={enabled ? "Sounds on" : "Sounds off"}
        className={"bwSndBtn" + (popping ? " bwSndPopping" : "")}
        data-state={state}
        style={{ position: "fixed", ...placement, zIndex: 1500 }}
      >
        <span className="bwSndHalo" aria-hidden />
        <span className="bwSndRing bwSndRingA" aria-hidden />
        <span className="bwSndRing bwSndRingB" aria-hidden />
        <span className="bwSndGlass" aria-hidden />
        <span className="bwSndBars" aria-hidden>
          {BARS.map((b, i) => (
            <span
              key={i}
              className="bwSndBar"
              style={
                {
                  "--rest": b.rest,
                  animationDuration: `${b.dur}s`,
                  animationDelay: `${b.delay}s`,
                } as CSSProperties
              }
            />
          ))}
        </span>
        <span className="bwSndSlash" aria-hidden />
        {burst > 0 && (
          <span className="bwSndSparks" aria-hidden key={burst}>
            {Array.from({ length: SPARK_COUNT }, (_, i) => {
              const angle = (i / SPARK_COUNT) * Math.PI * 2 - Math.PI / 2;
              const dist = 34 + (i % 3) * 8;
              return (
                <span
                  key={i}
                  className="bwSndSpark"
                  style={
                    {
                      "--dx": `${Math.cos(angle) * dist}px`,
                      "--dy": `${Math.sin(angle) * dist}px`,
                      animationDelay: `${(i % 3) * 0.04}s`,
                    } as CSSProperties
                  }
                />
              );
            })}
          </span>
        )}
      </button>
    </>
  );
}

const STYLE = `
.bwSndBtn {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 32% 26%, rgba(0,255,136,0.22), rgba(6,10,8,0.9) 64%);
  border: 1px solid rgba(0,255,136,0.45);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.3s ease, filter 0.3s ease;
  animation: bwSndGlowOn 2.2s ease-in-out infinite;
}
.bwSndBtn:hover { transform: scale(1.08) translateY(-2px); }
.bwSndBtn:active { transform: scale(0.9); }
.bwSndBtn.bwSndPopping { animation: bwSndPop 0.45s cubic-bezier(0.34, 1.8, 0.64, 1), bwSndGlowOn 2.2s ease-in-out infinite; }
.bwSndBtn:hover[data-state="playing"],
.bwSndBtn:hover[data-state="armed"] {
  box-shadow: 0 0 34px rgba(0,255,136,0.65), 0 0 72px rgba(0,255,136,0.28);
}
.bwSndBtn[data-state="muted"] {
  border-color: rgba(255,255,255,0.14);
  background: radial-gradient(circle at 32% 26%, rgba(0,255,136,0.05), rgba(10,10,12,0.88) 64%);
  filter: saturate(0.35);
  animation: bwSndBreathe 3.6s ease-in-out infinite;
}
.bwSndBtn:hover[data-state="muted"] {
  box-shadow: 0 0 22px rgba(0,255,136,0.3);
}

/* Glass highlight — a soft specular streak across the upper face of the orb. */
.bwSndGlass {
  position: absolute;
  inset: 2px;
  border-radius: 999px;
  background: linear-gradient(155deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 34%, transparent 55%);
  pointer-events: none;
}
.bwSndBtn[data-state="muted"] .bwSndGlass { opacity: 0.4; }

/* Slow rotating conic-gradient halo ring while music plays. */
.bwSndHalo {
  position: absolute;
  inset: -7px;
  border-radius: 999px;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(0,255,136,0.15) 70deg,
    ${GREEN} 140deg,
    rgba(255,255,255,0.95) 170deg,
    rgba(0,255,136,0.5) 220deg,
    transparent 320deg
  );
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3.5px), #000 calc(100% - 2.5px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 3.5px), #000 calc(100% - 2.5px));
  opacity: 0;
  transition: opacity 0.5s ease;
  pointer-events: none;
}
.bwSndBtn[data-state="playing"] .bwSndHalo {
  opacity: 1;
  animation: bwSndSpin 5s linear infinite;
}

/* Two staggered pulse rings emanating outward while music plays. */
.bwSndRing {
  position: absolute;
  inset: -1px;
  border-radius: 999px;
  border: 1.5px solid ${GREEN};
  opacity: 0;
  pointer-events: none;
}
.bwSndBtn[data-state="playing"] .bwSndRing { animation: bwSndPulse 2.6s ease-out infinite; }
.bwSndBtn[data-state="playing"] .bwSndRingB { animation-delay: 1.3s; }

/* Mini equalizer */
.bwSndBars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 18px;
  position: relative;
}
.bwSndBar {
  width: 3px;
  height: 18px;
  border-radius: 2px;
  background: linear-gradient(to top, ${GREEN} 10%, rgba(255,255,255,0.95));
  box-shadow: 0 0 7px rgba(0,255,136,0.7), 0 0 14px rgba(0,255,136,0.3);
  transform-origin: bottom;
  transform: scaleY(var(--rest, 0.6));
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease, box-shadow 0.3s ease;
}
.bwSndBtn[data-state="playing"] .bwSndBar {
  animation: bwSndDance cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite alternate;
}
.bwSndBtn[data-state="muted"] .bwSndBar {
  transform: scaleY(0.22);
  background: linear-gradient(to top, rgba(150,160,170,0.9), rgba(150,160,170,0.5));
  box-shadow: none;
}

/* Slash that morphs in over the frozen bars when muted. */
.bwSndSlash {
  position: absolute;
  width: 26px;
  height: 2px;
  border-radius: 2px;
  background: rgba(255,255,255,0.75);
  transform: rotate(-45deg) scaleX(0);
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}
.bwSndBtn[data-state="muted"] .bwSndSlash {
  transform: rotate(-45deg) scaleX(1);
}

/* One-shot spark burst on toggle press. */
.bwSndSparks {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  pointer-events: none;
}
.bwSndSpark {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  margin: -2px 0 0 -2px;
  border-radius: 999px;
  background: ${GREEN};
  box-shadow: 0 0 6px ${GREEN}, 0 0 12px rgba(0,255,136,0.6);
  opacity: 0;
  animation: bwSndSpark 0.6s cubic-bezier(0.16, 0.84, 0.44, 1) forwards;
}

@keyframes bwSndDance {
  from { transform: scaleY(0.16); }
  45% { transform: scaleY(0.82); }
  to { transform: scaleY(1.05); }
}
@keyframes bwSndGlowOn {
  0%, 100% { box-shadow: 0 0 14px rgba(0,255,136,0.4), 0 0 36px rgba(0,255,136,0.14); }
  50% { box-shadow: 0 0 24px rgba(0,255,136,0.62), 0 0 54px rgba(0,255,136,0.24); }
}
@keyframes bwSndBreathe {
  0%, 100% { box-shadow: 0 0 6px rgba(0,255,136,0.1); }
  50% { box-shadow: 0 0 16px rgba(0,255,136,0.26); }
}
@keyframes bwSndPulse {
  0% { transform: scale(1); opacity: 0.6; }
  70% { transform: scale(2.1); opacity: 0; }
  100% { transform: scale(2.1); opacity: 0; }
}
@keyframes bwSndSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes bwSndPop {
  0% { transform: scale(1); }
  35% { transform: scale(1.22); }
  65% { transform: scale(0.94); }
  100% { transform: scale(1); }
}
@keyframes bwSndSpark {
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(0.3); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .bwSndBtn, .bwSndBtn .bwSndBar, .bwSndBtn .bwSndRing,
  .bwSndBtn .bwSndHalo, .bwSndBtn .bwSndSpark { animation: none !important; }
  .bwSndBtn .bwSndHalo, .bwSndBtn .bwSndRing, .bwSndBtn .bwSndSparks { display: none; }
  .bwSndBtn[data-state="playing"] .bwSndBar { transform: scaleY(var(--rest, 0.6)); }
}
`;
