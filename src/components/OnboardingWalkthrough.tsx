"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { C, FONT_DISPLAY } from "@/lib/theme";

/* ------------------------------------------------------------------ */
/*  Persistence — PER ACCOUNT, mirroring the app (RootView.swift).
    The app tracks walkthrough completion per user id on the device
    ("blink.walkthrough.v2.completedUserIds") so every new trainer who
    signs in sees the cinematic intro once — even on a device where
    someone else already finished it. Same here.                       */
/* ------------------------------------------------------------------ */

/** Legacy device-wide flag (pre-account-scoping). */
export const ONBOARDING_STORAGE_KEY = "onboarding_complete";
const COMPLETED_IDS_KEY = "blink.walkthrough.completedUserIds";

function completedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(COMPLETED_IDS_KEY) || "";
    return new Set(raw.split(",").filter(Boolean));
  } catch {
    return new Set();
  }
}

/** Has this trainer finished the walkthrough on this device? Migrates the
    legacy device-wide flag to the current trainer once (RootView's
    migrateLegacyWalkthrough) so existing players don't re-watch it. */
export function hasCompletedWalkthrough(userId: string): boolean {
  const ids = completedIds();
  if (ids.has(userId)) return true;
  try {
    if (localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true") {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      markWalkthroughComplete(userId);
      return true;
    }
  } catch {
    /* storage unavailable */
  }
  return false;
}

export function markWalkthroughComplete(userId: string) {
  try {
    const ids = completedIds();
    ids.add(userId);
    localStorage.setItem(COMPLETED_IDS_KEY, [...ids].sort().join(","));
  } catch {
    /* storage unavailable */
  }
}

/* ------------------------------------------------------------------ */
/*  The app's post-sign-in walkthrough (ios-blink OnboardingView.swift)
    mirrored on web: four cinematic slides — the living-portal welcome,
    the AR treasure hunt (real key art of a hunter catching B-orbs),
    the walk-to-earn Pulse economy, and a guided tour of the five tabs.
    Full-bleed app artwork with readability veils, eyebrow capsules,
    app page dots, Skip, drifting ember motes, and the app's CTAs.     */
/* ------------------------------------------------------------------ */

const GOLD = "#ffd166";

interface Slide {
  /** Full-bleed backdrop art (from the app's Assets.xcassets). */
  backdrop?: string;
  /** Readability veil stops (top → bottom), matching the app's veils. */
  veil?: string;
  eyebrow?: { label: string; color: string };
  headline: string;
  body: string;
  /** Welcome slide renders the brand mark + globe hero (WelcomeSlideView). */
  isWelcome?: boolean;
  /** Earn slide renders the WalkEarnBadge ring meter. */
  isEarn?: boolean;
  /** Tabs slide renders the five-tab tour. */
  isTabs?: boolean;
}

const SLIDES: Slide[] = [
  {
    backdrop: "/brand/app/splash-battle.webp",
    // WelcomeSlideView's heavier veil so the foreground UI stays crisp.
    veil: "linear-gradient(to bottom, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.35) 33%, rgba(0,0,0,0.55) 66%, rgba(0,0,0,0.88) 100%)",
    isWelcome: true,
    headline: "Step outside. Come alive.",
    body: "Hunt real-world treasure, earn Blink Orbs,\nand feel better with every step.",
  },
  {
    backdrop: "/brand/app/man-catching-energy-orbs.webp",
    // OnboardingView's HeroImageBackdrop veil — light in the middle so the
    // sunny art stays the hero, heavy at the bottom where the copy lives.
    veil: "linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.02) 33%, rgba(0,0,0,0.45) 66%, rgba(0,0,0,0.92) 100%)",
    eyebrow: { label: "AR TREASURE HUNT", color: C.primary },
    headline: "Real treasure.\nReal streets.",
    body: "Chests, timed supply drops, ancient relics and mystery geodes hide on real streets — some guarded by creatures you must defeat. Walk up, raise your camera, and touch one: it bursts into Blink Orbs you grab out of the air. And somewhere out there, a golden jackpot.",
  },
  {
    eyebrow: { label: "WALK · SWEAT · EARN", color: GOLD },
    headline: "Every step pays you",
    body: "Connect Apple Health and your whole day counts — steps, workouts and wandering real places fill your daily Pulse Ring. Close it for a bonus, keep a streak alive, and a multiplier boosts every Blink Orb you earn. Orbs are hard-won — that's the point.",
    isEarn: true,
  },
  {
    eyebrow: { label: "AND THERE'S MORE", color: C.primary2 },
    headline: "Your world in five tabs",
    body: "Catch rare creatures, duel friends and guardians for Blink Orbs, and share Echoes from your walks — here's where it all lives.",
    isTabs: true,
  },
];

/* ------------------------------------------------------------------ */
/*  Hero globe (the app's RealisticEarthView + orbiters, in CSS)       */
/*                                                                     */
/*  The app renders a SceneKit Earth (earth_day texture, drifting      */
/*  earth_clouds shell, day/night terminator, atmosphere rims) with    */
/*  four creatures on an elliptical orbit that pass BEHIND the planet. */
/*  Web port: the same textures scroll inside a circular sphere, the   */
/*  cloud shell is screen-blended, shading is inset box-shadow, and    */
/*  the orbiters are keyframed on the same rx/ry ellipse with z-index  */
/*  flips for occlusion.                                               */
/* ------------------------------------------------------------------ */

const ORBITERS = [
  { src: "/brand/app/creatures/sprite.webp", glow: "#00FF88", delay: 0 },
  { src: "/brand/app/creatures/cyclops.webp", glow: "#88FF00", delay: -2.25 },
  { src: "/brand/app/creatures/cat.webp", glow: "#9aa3b2", delay: -4.5 },
  { src: "/brand/app/creatures/oracle.webp", glow: "#ffd166", delay: -6.75 },
];

const GLOBE_SIZE = 240;

function HeroGlobe() {
  return (
    <div
      aria-hidden
      style={{
        position: "relative",
        width: GLOBE_SIZE + 120,
        height: GLOBE_SIZE + 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto",
      }}
    >
      {/* Atmospheric halos — cyan Rayleigh bloom + BLINK-green brand halo */}
      <span
        style={{
          position: "absolute",
          width: GLOBE_SIZE * 1.35,
          height: GLOBE_SIZE * 1.35,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(95,184,255,0) 40%, rgba(95,184,255,0.26) 58%, rgba(95,184,255,0) 72%)",
          filter: "blur(7px)",
        }}
      />
      <span
        style={{
          position: "absolute",
          width: GLOBE_SIZE * 1.55,
          height: GLOBE_SIZE * 1.55,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,255,136,0) 45%, rgba(0,255,136,0.16) 62%, rgba(0,255,136,0) 76%)",
          filter: "blur(12px)",
        }}
      />

      {/* Planet */}
      <span style={{ position: "relative", width: GLOBE_SIZE, height: GLOBE_SIZE, zIndex: 2, display: "block" }}>
        <span
          className="ob-earth-spin"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            display: "block",
            backgroundImage: "url(/brand/app/earth-day.webp)",
            backgroundSize: "auto 100%",
            backgroundRepeat: "repeat-x",
          }}
        />
        <span
          className="ob-cloud-spin"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            display: "block",
            backgroundImage: "url(/brand/app/earth-clouds.webp)",
            backgroundSize: "auto 100%",
            backgroundRepeat: "repeat-x",
            mixBlendMode: "screen",
            opacity: 0.6,
          }}
        />
        {/* Day/night terminator + specular highlight */}
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            display: "block",
            boxShadow:
              "inset -34px -24px 64px rgba(0,0,10,0.72), inset 9px 11px 30px rgba(255,255,255,0.15), inset 0 0 20px rgba(40,90,160,0.35)",
          }}
        />
        {/* Atmosphere rims hugging the limb */}
        <span
          style={{
            position: "absolute",
            inset: -2,
            borderRadius: "50%",
            display: "block",
            border: "2.5px solid rgba(191,230,255,0.4)",
            filter: "blur(2.5px)",
          }}
        />
        <span
          style={{
            position: "absolute",
            inset: -6,
            borderRadius: "50%",
            display: "block",
            border: "2px solid rgba(0,255,136,0.2)",
            filter: "blur(4px)",
          }}
        />
      </span>

      {/* Orbiting creatures — 9s elliptical orbit, dipping behind the planet */}
      {ORBITERS.map((o) => (
        <span
          key={o.src}
          className="ob-orbiter"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 46,
            height: 46,
            marginLeft: -23,
            marginTop: -23,
            display: "block",
            animationDelay: `${o.delay}s`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={o.src}
            alt=""
            width={46}
            height={46}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: "50%",
              filter: `drop-shadow(0 0 12px ${o.glow})`,
            }}
          />
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Star field (WelcomeSlideView's StarFieldView — 18 drifting stars)  */
/* ------------------------------------------------------------------ */

interface Star {
  left: number;
  top: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
}

function frac(s: number): number {
  return s - Math.floor(s);
}

// Deterministic scatter (the app randomizes once on appear).
const STARS: Star[] = Array.from({ length: 18 }, (_, i) => {
  const r = (i + 1) * 61.17;
  return {
    left: frac(r * 0.173) * 100,
    top: frac(r * 0.531) * 100,
    size: 1 + frac(r * 0.29) * 2,
    opacity: 0.15 + frac(r * 0.71) * 0.35,
    duration: 10 + frac(r * 0.83) * 8,
    delay: frac(r * 0.47) * 8,
  };
});

function StarField() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {STARS.map((s, i) => (
        <span
          key={i}
          className="ob-star"
          style={{
            position: "absolute",
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "#fff",
            opacity: s.opacity,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ember field (OnboardingView's EmberField — 16 green/gold motes)    */
/* ------------------------------------------------------------------ */

interface Mote {
  x: number;
  y: number;
  size: number;
  opacity: number;
  drift: number;
  sway: number;
  duration: number;
  delay: number;
  warm: boolean;
}

// The app's exact deterministic scatter: r = i * 73.31.
const MOTES: Mote[] = Array.from({ length: 16 }, (_, i) => {
  const r = i * 73.31;
  return {
    x: frac(r * 0.137) * 100,
    y: frac(r * 0.613) * 100,
    size: 2 + frac(r * 0.29) * 4,
    opacity: 0.1 + frac(r * 0.71) * 0.38,
    drift: 24 + frac(r * 0.51) * 48,
    sway: 6 + frac(r * 0.33) * 14,
    duration: 5 + frac(r * 0.83) * 6,
    delay: frac(r * 0.47) * 4,
    warm: frac(r * 0.91) > 0.55,
  };
});

function EmberField() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {MOTES.map((m, i) => (
        <span
          key={i}
          className="ob-mote"
          style={
            {
              position: "absolute",
              left: `${m.x}%`,
              top: `${m.y}%`,
              width: m.size,
              height: m.size,
              borderRadius: "50%",
              background: m.warm ? GOLD : C.primary,
              opacity: m.opacity,
              filter: "blur(0.8px)",
              animationDuration: `${m.duration}s`,
              animationDelay: `${m.delay}s`,
              "--drift": `${m.drift}px`,
              "--sway": `${m.sway}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Walk-to-Earn meter (OnboardingView's WalkEarnBadge)                */
/*                                                                     */
/*  A circular meter that gently fills as a walking figure strides at  */
/*  its heart, while soft gold BLINK coins rise and fade above it —    */
/*  mirroring the live map's reward meter and coin drops.              */
/* ------------------------------------------------------------------ */

const COINS = Array.from({ length: 7 }, (_, i) => {
  const seed = i * 47.13;
  return {
    startX: frac(seed * 0.13) * 54 - 27,
    size: 9 + frac(seed * 0.27) * 7,
    duration: 2.2 + frac(seed * 0.5) * 1.8,
    delay: frac(seed * 0.31) * 2.4,
  };
});

function WalkEarnBadge() {
  const R = 55.5; // (120 - 9) / 2 — ring radius at the stroke centerline
  const CIRC = 2 * Math.PI * R;
  return (
    <div
      aria-hidden
      style={{
        position: "relative",
        width: 188,
        height: 188,
        margin: "0 auto 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Soft gold aura */}
      <span
        style={{
          position: "absolute",
          width: 168,
          height: 168,
          borderRadius: "50%",
          background: `${GOLD}29`,
          filter: "blur(34px)",
        }}
      />

      {/* Gold coins drifting up out of the meter — the "earning" shimmer. */}
      {COINS.map((c, i) => (
        <span
          key={i}
          className="ob-coin"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: c.size,
            height: c.size,
            marginLeft: c.startX - c.size / 2,
            marginTop: -c.size / 2,
            borderRadius: "50%",
            background: `radial-gradient(circle at 36% 30%, #fff, ${GOLD}, ${GOLD}8c)`,
            border: "0.6px solid rgba(255,255,255,0.45)",
            boxShadow: `0 0 5px ${GOLD}99`,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}

      {/* Meter track + filling progress ring (mirrors the live map meter). */}
      <svg width={129} height={129} viewBox="0 0 129 129" style={{ position: "absolute", transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="obEarnRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={C.primary} />
            <stop offset="45%" stopColor={GOLD} />
            <stop offset="100%" stopColor={C.primary2} />
          </linearGradient>
        </defs>
        <circle cx="64.5" cy="64.5" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9" />
        <circle
          className="ob-ring-fill"
          cx="64.5"
          cy="64.5"
          r={R}
          fill="none"
          stroke="url(#obEarnRing)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          style={{ filter: `drop-shadow(0 0 12px ${GOLD}80)`, ["--circ" as string]: `${CIRC}px` }}
        />
      </svg>

      {/* Glass core + the walker. */}
      <span
        style={{
          position: "absolute",
          width: 84,
          height: 84,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      />
      <span className="ob-walker" style={{ position: "absolute", color: C.primary, filter: `drop-shadow(0 0 12px ${C.primary})` }}>
        {/* figure.walk */}
        <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="13.5" cy="3.4" r="2.1" />
          <path d="M12.9 6.2c.9-.2 1.8.2 2.2 1l1.2 2.4 2.4 1.4c.5.3.7 1 .4 1.5s-1 .7-1.5.4l-2.7-1.6a1.6 1.6 0 0 1-.6-.6l-.5-1-1 3.5 2 2.2c.2.2.3.4.35.7l.7 3.9c.1.6-.3 1.2-.9 1.3-.6.1-1.2-.3-1.3-.9l-.65-3.6-2.3-2.5-1 2.9-2.5 3.2c-.4.5-1.1.6-1.6.2-.5-.4-.6-1.1-.2-1.6l2.3-2.9 1.7-6-1.3.7-.9 2.6c-.2.6-.8.9-1.4.7-.6-.2-.9-.8-.7-1.4l1-3c.1-.4.4-.7.75-.85l3.4-1.7c.5-.25.9-.4 1.4-.5Z" />
        </svg>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab tour (the app's TabTourVisual — MainTabView's five tabs)       */
/* ------------------------------------------------------------------ */

interface TabInfo {
  name: string;
  blurb: string;
  tint: string;
  icon: React.ReactNode;
}

function MaskGlyph({ src, color, size = 20 }: { src: string; color: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        display: "block",
        backgroundColor: color,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

// The app's exact TabTourVisual rows (symbol, name, blurb, tint).
const TOUR_TABS: TabInfo[] = [
  {
    name: "Map",
    blurb: "Hunt chests, geodes & Blink Orbs",
    tint: C.primary,
    icon: <MaskGlyph src="/brand/app/tabs/tab_map.png" color="currentColor" />,
  },
  {
    name: "Feed",
    blurb: "Share reflections & see moments from nearby",
    tint: "#73ccff",
    icon: (
      // bubble.left.and.bubble.right.fill
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M2 8.4C2 6 4 4.2 6.5 4.2h5C14 4.2 16 6 16 8.4c0 2.4-2 4.2-4.5 4.2H8l-3.4 2.6c-.5.4-1.1 0-1.1-.6v-2.8C2.6 11 2 9.8 2 8.4Z" />
        <path d="M17.2 9.1c2.7.3 4.8 2.2 4.8 4.6 0 1.4-.7 2.6-1.7 3.4v2.4c0 .6-.7 1-1.2.6L16.4 18h-2c-1.9 0-3.6-1-4.3-2.5h1.4c3.2 0 5.8-2.3 5.8-5.3 0-.4 0-.8-.1-1.1Z" />
      </svg>
    ),
  },
  {
    name: "Battles",
    blurb: "Duel friends & win Blink Orbs",
    tint: "#ff8099",
    icon: (
      // bolt.fill
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M13.6 2.1c.5-.6 1.5-.2 1.4.6l-1 6.3h5c.65 0 1 .75.6 1.25L10.4 21.9c-.5.6-1.5.2-1.4-.6l1-6.3H5c-.65 0-1-.75-.6-1.25L13.6 2.1Z" />
      </svg>
    ),
  },
  {
    name: "Creatures",
    blurb: "Your full collection of caught cards",
    tint: C.primary2,
    icon: (
      // square.grid.2x2.fill
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="8" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
        <rect x="13" y="13" width="8" height="8" rx="2" />
      </svg>
    ),
  },
  {
    name: "Profile",
    blurb: "Blink Orbs, Pulse stats & trainer code",
    tint: GOLD,
    icon: <MaskGlyph src="/brand/app/tabs/tab_profile.png" color="currentColor" />,
  },
];

function TabTour({ active }: { active: boolean }) {
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setHighlight((h) => (h + 1) % TOUR_TABS.length), 1150);
    return () => clearInterval(t);
  }, [active]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9, width: "100%", maxWidth: 380, margin: "20px auto 0" }}>
      {TOUR_TABS.map((tab, i) => {
        const on = i === highlight;
        return (
          <div
            key={tab.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "9px 12px",
              borderRadius: 16,
              background: on ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
              border: `1.2px solid ${on ? tab.tint + "99" : "transparent"}`,
              boxShadow: on ? `0 0 14px ${tab.tint}66` : "none",
              transform: on ? "scale(1.03)" : "scale(1)",
              transition: "all 0.45s cubic-bezier(0.34, 1.2, 0.64, 1)",
            }}
          >
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                background: on ? tab.tint + "3d" : "rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: on ? tab.tint : "rgba(255,255,255,0.65)",
                flexShrink: 0,
                transition: "all 0.45s ease",
              }}
            >
              {tab.icon}
            </span>
            <span style={{ minWidth: 0, textAlign: "left" }}>
              <span style={{ display: "block", color: "#fff", fontSize: 15, fontWeight: 800, fontFamily: FONT_DISPLAY }}>
                {tab.name}
              </span>
              <span style={{ display: "block", color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {tab.blurb}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function OnboardingWalkthrough({
  mode = "firstRun",
  onComplete,
}: {
  /** firstRun: new-trainer intro — final CTA enables alerts and enters.
      replay: "How it works" — final CTA is just "Done". */
  mode?: "firstRun" | "replay";
  onComplete?: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const last = SLIDES.length - 1;

  function goTo(i: number) {
    setAnimKey((k) => k + 1);
    setCurrent(i);
  }

  async function goNext() {
    if (current !== last) {
      goTo(current + 1);
      return;
    }
    if (mode === "replay") {
      onComplete?.();
      return;
    }
    // The app's "Enable Alerts & Enter": request notification permission,
    // then finish. (The map screen asks for location itself, mirroring
    // onEnter's location.requestAuthorization.)
    if (requesting) return;
    setRequesting(true);
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        await Notification.requestPermission();
      }
    } catch {
      /* notifications unsupported */
    }
    setRequesting(false);
    onComplete?.();
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && current < last) goTo(current + 1);
      else if (diff < 0 && current > 0) goTo(current - 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const slide = SLIDES[current];
  const isLast = current === last;
  const cta = slide.isWelcome
    ? "Get Started"
    : isLast
      ? mode === "firstRun"
        ? "Enable Alerts & Enter"
        : "Done"
      : "Next";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: "hidden",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Full-bleed key art backdrop with the app's readability veil +
          slow Ken Burns drift. */}
      {slide.backdrop && (
        <div key={`bg-${current}`} aria-hidden style={{ position: "absolute", inset: 0, animation: "obFadeIn 0.8s ease-out both" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.backdrop}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              animation: "obKenBurns 14s ease-in-out infinite alternate",
            }}
          />
          <div style={{ position: "absolute", inset: 0, background: slide.veil }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,255,136,0.04)", mixBlendMode: "overlay" }} />
        </div>
      )}
      {!slide.backdrop && (
        // Chapter aura glow (OnboardingView's auraGlow).
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 70% 45% at 50% 0%, ${C.primary}2e 0%, transparent 70%)`,
          }}
        />
      )}
      {/* Welcome slide's breathing aurora corners (WelcomeSlideView). */}
      {slide.isWelcome && (
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <span
            className="ob-aurora-1"
            style={{
              position: "absolute",
              inset: 0,
              display: "block",
              background: "radial-gradient(circle at 0% 100%, rgba(0,255,136,0.07) 0%, transparent 62%)",
            }}
          />
          <span
            className="ob-aurora-2"
            style={{
              position: "absolute",
              inset: 0,
              display: "block",
              background: "radial-gradient(circle at 100% 0%, rgba(136,255,0,0.05) 0%, transparent 62%)",
            }}
          />
        </div>
      )}

      {/* Ambient particles: stars on the welcome slide, ember motes on
          the chapter slides — only the front-most slide runs them. */}
      {slide.isWelcome ? <StarField /> : <EmberField key={`embers-${current}`} />}

      {/* Top bar — Skip only on the middle chapter slides (the app's
          welcome slide has no top bar; the last slide hides it too). */}
      <div style={{ position: "relative", display: "flex", justifyContent: "flex-end", padding: "max(16px, env(safe-area-inset-top)) 20px 0", flexShrink: 0, zIndex: 2 }}>
        {current > 0 && current < last ? (
          <button
            onClick={() => goTo(last)}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
              padding: "6px 2px",
              fontFamily: FONT_DISPLAY,
              textShadow: "0 1px 6px rgba(0,0,0,0.8)",
            }}
          >
            Skip
          </button>
        ) : (
          <span style={{ height: 30 }} />
        )}
      </div>

      {/* Slide content */}
      <div
        key={animKey}
        style={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: slide.isWelcome ? "flex-start" : slide.backdrop ? "flex-end" : "center",
          padding: "8px 24px 12px",
          overflow: "auto",
          animation: "obSlideIn 380ms cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        {slide.isWelcome && (
          <>
            {/* Brand mark + wordmark, exactly like the app's welcome slide. */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingTop: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo-orb-glow.png"
                alt=""
                style={{ width: 84, height: 84, objectFit: "contain", animation: "obBreathe 2.6s ease-in-out infinite" }}
              />
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 34,
                  fontWeight: 900,
                  letterSpacing: "0.24em",
                  marginRight: "-0.24em",
                  color: "#fff",
                  textShadow: "0 0 22px rgba(0,255,136,0.5), 0 2px 10px rgba(0,0,0,0.7)",
                }}
              >
                BLINK
              </span>
            </div>
            {/* The living-portal Earth with orbiting creatures (ref: the
                app's welcome slide hero globe). */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0, width: "100%" }}>
              <HeroGlobe />
            </div>
          </>
        )}

        <div style={{ width: "100%", maxWidth: 440, textAlign: "center", paddingBottom: 6 }}>
          {slide.eyebrow && (
            <span
              style={{
                display: "inline-block",
                padding: "7px 14px",
                borderRadius: 999,
                background: "rgba(10,10,15,0.55)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: `1px solid ${slide.eyebrow.color}80`,
                color: slide.eyebrow.color,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.26em",
                marginLeft: "0.26em",
                fontFamily: FONT_DISPLAY,
                boxShadow: `0 0 10px ${slide.eyebrow.color}66`,
                marginBottom: 14,
              }}
            >
              {slide.eyebrow.label}
            </span>
          )}

          {slide.isEarn && <WalkEarnBadge />}

          <h1
            style={{
              color: "#fff",
              fontSize: slide.isWelcome ? 28 : 30,
              fontWeight: 900,
              fontFamily: FONT_DISPLAY,
              margin: "0 0 12px",
              lineHeight: 1.15,
              whiteSpace: "pre-line",
              textShadow: "0 3px 10px rgba(0,0,0,0.7)",
            }}
          >
            {slide.headline}
          </h1>
          <p
            style={{
              color: slide.isWelcome ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.85)",
              fontSize: 15,
              fontWeight: 500,
              lineHeight: 1.6,
              margin: "0 auto",
              maxWidth: 400,
              whiteSpace: "pre-line",
              textShadow: "0 2px 6px rgba(0,0,0,0.6)",
            }}
          >
            {slide.body}
          </p>

          {slide.isTabs && <TabTour active={current === 3} />}
        </div>
      </div>

      {/* Bottom: app page dots + capsule CTA. */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "4px 20px calc(24px + env(safe-area-inset-bottom, 0px))",
          maxWidth: 440,
          width: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* The app's page dots: active = 22×8 glowing green capsule.
            Welcome slide puts them BELOW the CTA (WelcomeSlideView);
            chapter slides put them above (chapterShell). */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 7,
            order: slide.isWelcome ? 2 : 0,
            marginBottom: slide.isWelcome ? 0 : 16,
            marginTop: slide.isWelcome ? 16 : 0,
          }}
        >
          {SLIDES.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === current ? 22 : 8,
                height: 8,
                borderRadius: 4,
                background: i === current ? C.primary : "rgba(255,255,255,0.2)",
                boxShadow: i === current ? `0 0 8px ${C.primary}99` : "none",
                transition: "all 0.35s cubic-bezier(0.34, 1.2, 0.64, 1)",
              }}
            />
          ))}
        </div>

        {/* Welcome CTA is solid #00FF88 (WelcomeSlideView); chapter CTAs
            are the lime→green gradient capsule (OnboardingView). */}
        <button
          onClick={goNext}
          disabled={requesting}
          style={{
            width: "100%",
            height: 56,
            borderRadius: 28,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            background: slide.isWelcome ? C.primary : `linear-gradient(90deg, ${C.primary}, ${C.primary2})`,
            color: "#000",
            fontSize: slide.isWelcome ? 17 : 16,
            fontWeight: 900,
            letterSpacing: isLast || slide.isWelcome ? "0.06em" : "0.125em",
            cursor: requesting ? "wait" : "pointer",
            fontFamily: FONT_DISPLAY,
            boxShadow: slide.isWelcome ? `0 6px 20px ${C.primary}59` : `0 0 22px ${C.primary}8c`,
            transition: "transform 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.02)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
        >
          {requesting && (
            <span
              aria-hidden
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: "2.5px solid rgba(0,0,0,0.25)",
                borderTopColor: "#000",
                animation: "obSpin 0.8s linear infinite",
              }}
            />
          )}
          {cta}
          {isLast && mode === "firstRun" && !requesting && (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          )}
        </button>
      </div>

      <style>{`
        @keyframes obSlideIn {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes obFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes obKenBurns {
          from { transform: scale(1.02); }
          to   { transform: scale(1.12) translateY(-8px); }
        }
        @keyframes obBreathe {
          0%, 100% { transform: scale(0.99); }
          50%      { transform: scale(1.03); }
        }
        @keyframes obSpin {
          to { transform: rotate(360deg); }
        }
        /* Welcome aurora — two breathing corner glows (8s / 11s loops). */
        @keyframes obAurora {
          0%, 100% { transform: scale(0.85); }
          50%      { transform: scale(1.15); }
        }
        .ob-aurora-1 { animation: obAurora 8s ease-in-out infinite; transform-origin: 0% 100%; }
        .ob-aurora-2 { animation: obAurora 11s ease-in-out infinite; transform-origin: 100% 0%; }
        /* Stars drift slowly upward and wrap (StarFieldView). */
        @keyframes obStarDrift {
          from { transform: translateY(0); }
          to   { transform: translateY(-30px); }
        }
        .ob-star { animation-name: obStarDrift; animation-timing-function: linear; animation-iteration-count: infinite; }
        /* Ember motes sway + drift (EmberField). */
        @keyframes obMote {
          0%, 100% { transform: translate(calc(var(--sway) * -1), var(--drift)); opacity: 0.3; }
          50%      { transform: translate(var(--sway), calc(var(--drift) * -1)); opacity: 1; }
        }
        .ob-mote { animation-name: obMote; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        /* WalkEarnBadge ring fill — 4% → 100% and back, 2.6s (the app's
           repeatForever autoreversing fill). */
        @keyframes obRingFill {
          from { stroke-dashoffset: calc(var(--circ) * 0.96); }
          to   { stroke-dashoffset: 0px; }
        }
        .ob-ring-fill { animation: obRingFill 2.6s ease-in-out infinite alternate; }
        /* The walker bobs ±3px (1.5s). */
        @keyframes obWalkerBob {
          0%, 100% { transform: translateY(3px); }
          50%      { transform: translateY(-3px); }
        }
        .ob-walker { animation: obWalkerBob 1.5s ease-in-out infinite; }
        /* Gold coins rise out of the meter and fade (CoinRiser). */
        @keyframes obCoinRise {
          0%   { transform: translateY(10px) scale(1); opacity: 0.95; }
          100% { transform: translateY(-86px) scale(0.55); opacity: 0; }
        }
        .ob-coin { animation-name: obCoinRise; animation-timing-function: ease-out; animation-iteration-count: infinite; }
        /* Earth textures are 1.5:1 — one full wrap at ${GLOBE_SIZE}px tall
           is ${GLOBE_SIZE * 1.5}px wide. Clouds drift a little faster,
           exactly like the app's independent cloud shell. */
        @keyframes obEarthSpin {
          from { background-position-x: 0px; }
          to   { background-position-x: -${GLOBE_SIZE * 1.5}px; }
        }
        .ob-earth-spin { animation: obEarthSpin 60s linear infinite; }
        .ob-cloud-spin { animation: obEarthSpin 44s linear infinite; }
        /* Elliptical orbit (the app's cos*138 / sin*52 path, 9s period).
           Depth via scale + opacity; z-index flips so creatures pass
           BEHIND the planet (globe sits at z-index 2). */
        @keyframes obOrbit {
          0%    { transform: translate(150px, 0px) scale(0.98);   opacity: 0.9;  z-index: 3; }
          12.5% { transform: translate(106px, 37px) scale(1.09);  opacity: 1;    z-index: 3; }
          25%   { transform: translate(0px, 52px) scale(1.14);    opacity: 1;    z-index: 3; }
          37.5% { transform: translate(-106px, 37px) scale(1.09); opacity: 1;    z-index: 3; }
          49.9% { transform: translate(-150px, 0px) scale(0.98);  opacity: 0.9;  z-index: 3; }
          50%   { transform: translate(-150px, 0px) scale(0.98);  opacity: 0.6;  z-index: 1; }
          62.5% { transform: translate(-106px, -37px) scale(0.87); opacity: 0.5; z-index: 1; }
          75%   { transform: translate(0px, -52px) scale(0.82);   opacity: 0.45; z-index: 1; }
          87.5% { transform: translate(106px, -37px) scale(0.87); opacity: 0.5;  z-index: 1; }
          99.9% { transform: translate(150px, 0px) scale(0.98);   opacity: 0.6;  z-index: 1; }
          100%  { transform: translate(150px, 0px) scale(0.98);   opacity: 0.9;  z-index: 3; }
        }
        .ob-orbiter { animation: obOrbit 9s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
