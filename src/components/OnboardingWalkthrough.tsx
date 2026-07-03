"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { C, FONT_DISPLAY } from "@/lib/theme";

/* ------------------------------------------------------------------ */
/*  Persistence                                                        */
/* ------------------------------------------------------------------ */
export const ONBOARDING_STORAGE_KEY = "onboarding_complete";
const STORAGE_KEY = ONBOARDING_STORAGE_KEY;

export function useOnboardingComplete(): boolean {
  const [done, setDone] = useState(true); // default true to avoid flash
  useEffect(() => {
    setDone(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);
  return done;
}

function markComplete() {
  localStorage.setItem(STORAGE_KEY, "true");
}

/* ------------------------------------------------------------------ */
/*  The app's post-sign-in walkthrough (ios-blink OnboardingView.swift)
    mirrored on web: four cinematic slides — the welcome portal, the
    AR treasure hunt (real key art of a hunter catching B-orbs), the
    earn economy, and a guided tour of the five tabs. Full-bleed app
    artwork with readability veils, eyebrow capsules, app page dots,
    Skip, and the lime→green capsule CTA.                              */
/* ------------------------------------------------------------------ */

const GOLD = "#ffd166";

interface Slide {
  /** Full-bleed backdrop art (from the app's Assets.xcassets). */
  backdrop?: string;
  eyebrow?: { label: string; color: string };
  headline: string;
  body: string;
  /** Welcome slide renders the brand mark + wordmark up top. */
  isWelcome?: boolean;
  /** Tabs slide renders the five-tab tour. */
  isTabs?: boolean;
  /** Earn slide renders the $BLINK token coin. */
  isEarn?: boolean;
  cta: string;
}

const SLIDES: Slide[] = [
  {
    backdrop: "/brand/app/splash-battle.webp",
    isWelcome: true,
    headline: "Step outside. Come alive.",
    body: "Hunt real-world treasure, earn Blink Orbs,\nand feel better with every step.",
    cta: "Get Started",
  },
  {
    backdrop: "/brand/app/man-catching-energy-orbs.webp",
    eyebrow: { label: "AR TREASURE HUNT", color: C.primary },
    headline: "Real treasure.\nReal streets.",
    body: "Chests, timed supply drops, ancient relics and mystery geodes hide on real streets — some guarded by creatures you must defeat. Walk up, raise your camera, and touch one: it bursts into Blink Orbs you grab out of the air. And somewhere out there, a golden jackpot.",
    cta: "Next",
  },
  {
    backdrop: "/brand/app/intro-purpose.webp",
    eyebrow: { label: "WALK · CATCH · EARN", color: GOLD },
    headline: "Every catch pays you",
    body: "Catches and walks fill your points balance. Claim converts points to real $BLINK on Ethereum mainnet — straight into the wallet built into your account.",
    isEarn: true,
    cta: "Next",
  },
  {
    eyebrow: { label: "AND THERE'S MORE", color: C.primary2 },
    headline: "Your world in five tabs",
    body: "Hunt the map, follow the live feed, claim your $BLINK, manage your wallet — here's where it all lives.",
    isTabs: true,
    cta: "Enter the World",
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
/*  Tab tour (the app's TabTourVisual, with the web's five tabs)       */
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

function TabTour({ active }: { active: boolean }) {
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setHighlight((h) => (h + 1) % 5), 1150);
    return () => clearInterval(t);
  }, [active]);

  const tabs: TabInfo[] = [
    {
      name: "Map",
      blurb: "Hunt creatures & ETH drops near you",
      tint: C.primary,
      icon: <MaskGlyph src="/brand/app/tabs/tab_map.png" color="currentColor" />,
    },
    {
      name: "Feed",
      blurb: "Live catches & sightings worldwide",
      tint: "#73ccff",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M2 8.4C2 6 4 4.2 6.5 4.2h5C14 4.2 16 6 16 8.4c0 2.4-2 4.2-4.5 4.2H8l-3.4 2.6c-.5.4-1.1 0-1.1-.6v-2.8C2.6 11 2 9.8 2 8.4Z" />
          <path d="M17.2 9.1c2.7.3 4.8 2.2 4.8 4.6 0 1.4-.7 2.6-1.7 3.4v2.4c0 .6-.7 1-1.2.6L16.4 18h-2c-1.9 0-3.6-1-4.3-2.5h1.4c3.2 0 5.8-2.3 5.8-5.3 0-.4 0-.8-.1-1.1Z" />
        </svg>
      ),
    },
    {
      name: "Claim",
      blurb: "Turn points into real $BLINK",
      tint: "#ff8099",
      icon: (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/brand/logo-orb-glow.png"
          alt=""
          style={{ width: 22, height: 22, objectFit: "contain", display: "block" }}
        />
      ),
    },
    {
      name: "Wallet",
      blurb: "Your $BLINK, ETH & creature NFTs",
      tint: C.primary2,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5V8H5a1 1 0 0 0 0 2h16v8.5A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5z" />
        </svg>
      ),
    },
    {
      name: "Profile",
      blurb: "Points, catches & your trainer stats",
      tint: GOLD,
      icon: <MaskGlyph src="/brand/app/tabs/tab_profile.png" color="currentColor" />,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9, width: "100%", maxWidth: 380, margin: "20px auto 0" }}>
      {tabs.map((tab, i) => {
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

export default function OnboardingWalkthrough({ onComplete }: { onComplete?: () => void }) {
  const [current, setCurrent] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const last = SLIDES.length - 1;

  const close = useCallback(() => {
    markComplete();
    onComplete?.();
  }, [onComplete]);

  function goTo(i: number) {
    setAnimKey((k) => k + 1);
    setCurrent(i);
  }

  function goNext() {
    if (current === last) close();
    else goTo(current + 1);
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
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.5) 70%, rgba(5,5,8,0.94) 100%)",
            }}
          />
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,255,136,0.04)", mixBlendMode: "overlay" }} />
        </div>
      )}
      {!slide.backdrop && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 70% 45% at 50% 0%, ${C.primary}2e 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Top bar — Skip only on the chapter slides (the app's welcome
          slide has no top bar; swipe to go back). */}
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
          justifyContent: slide.isWelcome ? "flex-start" : "flex-end",
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

          {slide.isEarn && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <span
                style={{
                  position: "relative",
                  width: 108,
                  height: 108,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: `2px solid ${GOLD}59`,
                  boxShadow: `0 0 28px ${GOLD}40, 0 0 56px ${C.primary}26`,
                  display: "block",
                  animation: "obBreathe 2.6s ease-in-out infinite",
                }}
              >
                {/* The app's blink_token coin art (TreasureCaptureView). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/app/blink-token.webp"
                  alt=""
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
              </span>
            </div>
          )}

          <h1
            style={{
              color: "#fff",
              fontSize: 30,
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
              color: "rgba(255,255,255,0.85)",
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

        <button
          onClick={goNext}
          style={{
            width: "100%",
            height: 56,
            borderRadius: 28,
            border: "none",
            background: `linear-gradient(90deg, ${C.primary}, ${C.primary2})`,
            color: "#000",
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: current === last ? "0.04em" : "0.12em",
            cursor: "pointer",
            fontFamily: FONT_DISPLAY,
            boxShadow: `0 0 22px ${C.primary}8c`,
            transition: "transform 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.02)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
        >
          {slide.cta}
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
