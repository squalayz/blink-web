"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { sounds, MUSIC_PLAYING_EVENT } from "@/lib/sounds";

const GREEN = "#4AE88A";

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
  { rest: 0.45, dur: 0.72, delay: 0.0 },
  { rest: 0.7, dur: 1.04, delay: 0.15 },
  { rest: 0.95, dur: 0.86, delay: 0.3 },
  { rest: 0.62, dur: 1.18, delay: 0.08 },
  { rest: 0.4, dur: 0.78, delay: 0.22 },
];

export default function SoundToggle() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [playing, setPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    setEnabled(sounds.enabled);
    const onPlayingChanged = (e: Event) => {
      setPlaying(Boolean((e as CustomEvent<{ playing: boolean }>).detail?.playing));
    };
    window.addEventListener(MUSIC_PLAYING_EVENT, onPlayingChanged);
    return () => window.removeEventListener(MUSIC_PLAYING_EVENT, onPlayingChanged);
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
        aria-label={enabled ? "Mute sounds" : "Unmute sounds"}
        title={enabled ? "Sounds on" : "Sounds off"}
        className="bwSndBtn"
        data-state={state}
        style={{ position: "fixed", ...placement, zIndex: 1500 }}
      >
        <span className="bwSndRipple" aria-hidden />
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
  background: radial-gradient(circle at 32% 28%, rgba(74,232,138,0.16), rgba(13,13,20,0.86) 62%);
  border: 1px solid rgba(74,232,138,0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.3s ease;
  animation: bwSndGlowOn 2.2s ease-in-out infinite;
}
.bwSndBtn:hover { transform: scale(1.1); }
.bwSndBtn:active { transform: scale(0.92); }
.bwSndBtn:hover[data-state="playing"],
.bwSndBtn:hover[data-state="armed"] {
  box-shadow: 0 0 30px rgba(74,232,138,0.55), 0 0 60px rgba(74,232,138,0.22);
}
.bwSndBtn[data-state="muted"] {
  border-color: rgba(255,255,255,0.14);
  background: radial-gradient(circle at 32% 28%, rgba(74,232,138,0.06), rgba(13,13,20,0.86) 62%);
  animation: bwSndBreathe 3.6s ease-in-out infinite;
}
.bwSndBtn:hover[data-state="muted"] {
  box-shadow: 0 0 22px rgba(74,232,138,0.3);
}

/* Occasional expanding ripple ring while music plays. */
.bwSndRipple {
  position: absolute;
  inset: -1px;
  border-radius: 999px;
  border: 1.5px solid ${GREEN};
  opacity: 0;
  pointer-events: none;
}
.bwSndBtn[data-state="playing"] .bwSndRipple {
  animation: bwSndRipple 3.4s ease-out infinite;
}

/* Mini equalizer */
.bwSndBars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 18px;
}
.bwSndBar {
  width: 3px;
  height: 18px;
  border-radius: 2px;
  background: linear-gradient(to top, ${GREEN}, rgba(74,232,138,0.55));
  box-shadow: 0 0 6px rgba(74,232,138,0.45);
  transform-origin: bottom;
  transform: scaleY(var(--rest, 0.6));
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease, box-shadow 0.3s ease;
}
.bwSndBtn[data-state="playing"] .bwSndBar {
  animation: bwSndDance ease-in-out infinite alternate;
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

@keyframes bwSndDance {
  from { transform: scaleY(0.2); }
  to { transform: scaleY(1); }
}
@keyframes bwSndGlowOn {
  0%, 100% { box-shadow: 0 0 14px rgba(74,232,138,0.35), 0 0 34px rgba(74,232,138,0.12); }
  50% { box-shadow: 0 0 22px rgba(74,232,138,0.55), 0 0 48px rgba(74,232,138,0.2); }
}
@keyframes bwSndBreathe {
  0%, 100% { box-shadow: 0 0 6px rgba(74,232,138,0.1); }
  50% { box-shadow: 0 0 16px rgba(74,232,138,0.28); }
}
@keyframes bwSndRipple {
  0% { transform: scale(1); opacity: 0.55; }
  38% { transform: scale(1.85); opacity: 0; }
  100% { transform: scale(1.85); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .bwSndBtn, .bwSndBtn .bwSndBar, .bwSndBtn .bwSndRipple { animation: none !important; }
  .bwSndBtn[data-state="playing"] .bwSndBar { transform: scaleY(var(--rest, 0.6)); }
}
`;
