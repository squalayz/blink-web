"use client";

// BlinkWorld marketing landing page — dark, premium, game-grade.
// Inline styles per repo convention; a single <style> tag carries
// keyframes, hover states, and responsive rules.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const BG = "#0A0A0F";
const CARD = "#12121A";
const GREEN = "#00FF88";
const LIME = "#88FF00";
const WHITE = "#FFFFFF";
const TEXT70 = "rgba(255,255,255,0.7)";
const TEXT50 = "rgba(255,255,255,0.5)";
const GLASS_BORDER = "1px solid rgba(255,255,255,0.08)";

const RARITY = {
  Common: "#9AA3B2",
  Uncommon: "#00FF88",
  Rare: "#88FF00",
  Legendary: "#FFD166",
  Mythic: "#FF8AE0",
} as const;

const FONT_DISPLAY = "'Space Grotesk', 'Inter', -apple-system, sans-serif";
const FONT_BODY = "'Inter', -apple-system, system-ui, sans-serif";

/* ---------------------------------------------------------------- shell */

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        color: WHITE,
        fontFamily: FONT_BODY,
        overflowX: "hidden",
      }}
    >
      <a href="#main" className="lw-skip">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <Ticker />
        <Features />
        <HowItWorks />
        <CreatureShowcase />
        <Safety />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <style>{STYLE}</style>
    </div>
  );
}

/* ----------------------------------------------------------------- nav */

function Nav() {
  const links = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#safety", label: "Safety" },
    { href: "#faq", label: "FAQ" },
  ];
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(10,10,15,0.72)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <nav
        aria-label="Main"
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          padding: "0 20px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <a
          href="#main"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: WHITE,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-orb-glow.png"
            alt=""
            aria-hidden
            width={30}
            height={30}
            style={{
              width: 30,
              height: 30,
              objectFit: "contain",
              filter: "drop-shadow(0 0 10px rgba(0,255,136,0.55))",
            }}
          />
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: "0.08em",
            }}
          >
            BLINKWORLD
          </span>
        </a>

        <div className="lw-nav-links" style={{ display: "flex", gap: 28 }}>
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{
                color: TEXT70,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {l.label}
            </a>
          ))}
        </div>

        <a href="#waitlist" className="lw-cta-pill lw-cta-pill-sm">
          Join the waitlist
        </a>
      </nav>
    </header>
  );
}

/* ---------------------------------------------------------------- hero */

function Hero() {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "clamp(56px, 9vw, 110px) 20px clamp(48px, 7vw, 90px)",
      }}
    >
      {/* Atmosphere: auroras + map grid + drifting orbs */}
      <div aria-hidden style={{ position: "absolute", inset: 0 }}>
        <div className="lw-grid-texture" style={{ position: "absolute", inset: 0 }} />
        <div
          className="lw-aurora"
          style={{
            position: "absolute",
            width: 720,
            height: 720,
            top: -320,
            left: "-12%",
            background:
              "radial-gradient(circle, rgba(0,255,136,0.16) 0%, rgba(0,255,136,0) 65%)",
          }}
        />
        <div
          className="lw-aurora lw-aurora-slow"
          style={{
            position: "absolute",
            width: 640,
            height: 640,
            top: "8%",
            right: "-16%",
            background:
              "radial-gradient(circle, rgba(136,255,0,0.10) 0%, rgba(136,255,0,0) 65%)",
          }}
        />
        {HERO_ORBS.map((o) => (
          <span
            key={o.id}
            className="lw-float"
            style={{
              position: "absolute",
              left: o.left,
              top: o.top,
              width: o.size,
              height: o.size,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${GREEN} 0%, rgba(0,255,136,0.35) 45%, rgba(0,255,136,0) 75%)`,
              filter: "blur(0.5px)",
              opacity: 0.7,
              animationDuration: `${o.duration}s`,
              animationDelay: `${o.delay}s`,
            }}
          />
        ))}
      </div>

      <div
        className="lw-hero-grid"
        style={{
          position: "relative",
          maxWidth: 1160,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
          gap: "clamp(40px, 6vw, 72px)",
          alignItems: "center",
        }}
      >
        {/* Copy column */}
        <div>
          <Reveal>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 14px",
                borderRadius: 999,
                border: `1px solid rgba(0,255,136,0.35)`,
                background: "rgba(0,255,136,0.08)",
                color: GREEN,
                fontSize: 12.5,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              <span
                aria-hidden
                className="lw-pulse-dot"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: GREEN,
                }}
              />
              A new kind of adventure
            </span>
          </Reveal>

          <Reveal delay={0.08}>
            <h1
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: "clamp(38px, 6.2vw, 68px)",
                lineHeight: 1.06,
                letterSpacing: "-0.02em",
                margin: "22px 0 0",
              }}
            >
              The real world is your{" "}
              <span
                style={{
                  background: `linear-gradient(92deg, ${GREEN}, ${LIME})`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  textShadow: "none",
                }}
              >
                treasure map.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p
              style={{
                margin: "20px 0 0",
                maxWidth: 520,
                color: TEXT70,
                fontSize: "clamp(16px, 2vw, 18px)",
                lineHeight: 1.65,
              }}
            >
              Walk your neighborhood to catch fantastic creatures, crack open
              hidden chests, and collect glowing Blink Orbs — all in augmented
              reality.
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 26,
              }}
            >
              <StoreChip line1="Coming soon to the" line2="App Store" />
              <StoreChip line1="Coming soon on" line2="Google Play" />
            </div>
          </Reveal>

          <Reveal delay={0.32}>
            <div style={{ marginTop: 28, maxWidth: 480 }}>
              <WaitlistForm idPrefix="hero" />
            </div>
          </Reveal>
        </div>

        {/* Visual column */}
        <Reveal delay={0.2}>
          <PhoneMockup />
        </Reveal>
      </div>
    </section>
  );
}

const HERO_ORBS = [
  { id: 0, left: "6%", top: "18%", size: 14, duration: 9, delay: 0 },
  { id: 1, left: "44%", top: "8%", size: 10, duration: 11, delay: 1.4 },
  { id: 2, left: "88%", top: "24%", size: 12, duration: 8, delay: 0.6 },
  { id: 3, left: "70%", top: "78%", size: 9, duration: 10, delay: 2.2 },
  { id: 4, left: "16%", top: "82%", size: 11, duration: 12, delay: 3 },
];

function StoreChip({ line1, line2 }: { line1: string; line2: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "10px 20px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.05)",
        border: GLASS_BORDER,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: "0 0 24px rgba(0,255,136,0.08)",
        lineHeight: 1.25,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, color: TEXT50 }}>{line1}</span>
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 15,
          fontWeight: 700,
          color: WHITE,
        }}
      >
        {line2}
      </span>
    </span>
  );
}

/* A tilted dark-mode phone showing a glowing night map, creatures floating around it. */
function PhoneMockup() {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
        padding: "30px 0",
      }}
    >
      {/* Aurora behind the phone */}
      <div
        aria-hidden
        className="lw-breathe"
        style={{
          position: "absolute",
          inset: "-8%",
          background:
            "radial-gradient(circle at 50% 45%, rgba(0,255,136,0.20) 0%, rgba(0,255,136,0) 60%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="lw-phone"
        style={{
          position: "relative",
          width: "min(290px, 72vw)",
          aspectRatio: "290 / 590",
          borderRadius: 44,
          background: "#08080C",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow:
            "0 40px 90px rgba(0,0,0,0.6), 0 0 60px rgba(0,255,136,0.18), inset 0 0 0 6px #101016",
          transform: "rotate(-6deg)",
          overflow: "hidden",
        }}
      >
        {/* Night map */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 6,
            borderRadius: 38,
            overflow: "hidden",
            background:
              "radial-gradient(circle at 50% 60%, #101820 0%, #0B0F14 55%, #08080C 100%)",
          }}
        >
          {/* streets */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(0,255,136,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.10) 1px, transparent 1px)",
              backgroundSize: "52px 52px",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(24deg, transparent 47%, rgba(136,255,0,0.14) 49%, rgba(136,255,0,0.14) 51%, transparent 53%), linear-gradient(-38deg, transparent 46%, rgba(0,255,136,0.12) 48%, rgba(0,255,136,0.12) 52%, transparent 54%)",
            }}
          />
          {/* player marker with pulsing ring */}
          <span
            style={{
              position: "absolute",
              left: "48%",
              top: "58%",
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: GREEN,
              boxShadow: `0 0 16px ${GREEN}`,
              border: "2px solid rgba(255,255,255,0.9)",
            }}
          />
          <span
            className="lw-ring"
            style={{
              position: "absolute",
              left: "calc(48% - 16px)",
              top: "calc(58% - 16px)",
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: `1.5px solid ${GREEN}`,
            }}
          />
          {/* map markers */}
          {MAP_MARKERS.map((m) => (
            <span
              key={m.id}
              className="lw-float"
              style={{
                position: "absolute",
                left: m.left,
                top: m.top,
                width: m.size,
                height: m.size,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${m.color} 10%, ${m.color}55 50%, transparent 75%)`,
                animationDuration: `${m.duration}s`,
                animationDelay: `${m.delay}s`,
              }}
            />
          ))}
          {/* status pill inside the screen */}
          <span
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              bottom: 18,
              padding: "7px 14px",
              borderRadius: 999,
              background: "rgba(10,10,15,0.72)",
              border: "1px solid rgba(0,255,136,0.35)",
              color: GREEN,
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: "nowrap",
              letterSpacing: "0.04em",
            }}
          >
            3 Blink Orbs nearby
          </span>
        </div>
        {/* speaker notch */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            width: 84,
            height: 22,
            borderRadius: 12,
            background: "#101016",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        />
      </div>

      {/* Floating creatures around the phone */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/app/creatures/silkmoth.webp"
        alt="Silkmoth, a gentle glowing moth creature from BlinkWorld"
        className="lw-float"
        style={{
          position: "absolute",
          width: "clamp(84px, 22%, 120px)",
          top: "2%",
          left: "4%",
          filter: "drop-shadow(0 8px 24px rgba(136,255,0,0.35))",
          animationDuration: "7s",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/app/creatures/emberling.webp"
        alt="Emberling, a friendly flame-spirit creature from BlinkWorld"
        className="lw-float"
        style={{
          position: "absolute",
          width: "clamp(74px, 20%, 108px)",
          top: "30%",
          right: "0%",
          filter: "drop-shadow(0 8px 24px rgba(0,255,136,0.4))",
          animationDuration: "8.5s",
          animationDelay: "1s",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/app/creatures/pebblekin.webp"
        alt="Pebblekin, a small stone creature with glowing seams from BlinkWorld"
        className="lw-float"
        style={{
          position: "absolute",
          width: "clamp(78px, 21%, 112px)",
          bottom: "3%",
          left: "0%",
          filter: "drop-shadow(0 8px 24px rgba(0,255,136,0.3))",
          animationDuration: "9.5s",
          animationDelay: "2s",
        }}
      />
    </div>
  );
}

const MAP_MARKERS = [
  { id: 0, left: "20%", top: "22%", size: 22, color: GREEN, duration: 6, delay: 0 },
  { id: 1, left: "68%", top: "16%", size: 16, color: LIME, duration: 8, delay: 0.8 },
  { id: 2, left: "76%", top: "44%", size: 20, color: GREEN, duration: 7, delay: 1.6 },
  { id: 3, left: "16%", top: "58%", size: 14, color: "#FFD166", duration: 9, delay: 0.4 },
  { id: 4, left: "58%", top: "76%", size: 18, color: GREEN, duration: 6.5, delay: 2.4 },
];

/* --------------------------------------------------------------- ticker */

const TICKER_ITEMS = [
  "Ava caught a Legendary creature",
  "Marcus hit a 7-day walk streak",
  "Kai cracked a Golden Chest",
  "Nova's pet leveled up",
  "Juno dug up a mystery geode",
  "Rio uncovered a supply drop",
  "Mila sent 100 Cheers",
];

function Ticker() {
  return (
    <section
      aria-label="Live from the beta"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(18,18,26,0.55)",
        padding: "14px 0",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
    >
      <span
        style={{
          flexShrink: 0,
          margin: "0 20px",
          padding: "6px 12px",
          borderRadius: 999,
          border: `1px solid rgba(0,255,136,0.4)`,
          color: GREEN,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        Live from the beta
      </span>
      <div style={{ overflow: "hidden", flex: 1 }}>
        <div className="lw-marquee" style={{ display: "flex", width: "max-content" }}>
          {[0, 1].map((half) => (
            <div
              key={half}
              aria-hidden={half === 1}
              style={{ display: "flex", whiteSpace: "nowrap" }}
            >
              {TICKER_ITEMS.map((item) => (
                <span
                  key={item}
                  style={{
                    color: TEXT70,
                    fontSize: 14,
                    fontWeight: 600,
                    paddingRight: 56,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: GREEN,
                      boxShadow: `0 0 8px ${GREEN}`,
                      flexShrink: 0,
                    }}
                  />
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- features */

const FEATURES = [
  {
    title: "A living map",
    body: "Your city, reimagined as an adventure. Streets, parks, and sidewalks light up with things to find.",
    icon: <MapIcon />,
  },
  {
    title: "Cinematic AR catches",
    body: "Creatures appear in your world through the AR camera and stay anchored in place while you catch them.",
    icon: <CameraIcon />,
  },
  {
    title: "Treasure everywhere",
    body: "Chests, geodes, and supply drops hide on real streets, waiting for someone to walk by and crack them open.",
    icon: <ChestIcon />,
  },
  {
    title: "Your explorer, your pet",
    body: "Customize your character and the companion cat or dog that walks beside you on the map.",
    icon: <PawIcon />,
  },
  {
    title: "Streaks that build",
    body: "Daily walks grow your streak and your collection — with fair daily caps so it stays a game.",
    icon: <FlameIcon />,
  },
  {
    title: "A world watching",
    body: "The Live Feed celebrates every big catch from explorers everywhere, with locations always blurred for privacy.",
    icon: <GlobeIcon />,
  },
];

function Features() {
  return (
    <section id="features" style={{ padding: "clamp(64px, 9vw, 110px) 20px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <SectionHeader
          overline="Features"
          title="Everything glows when you get close."
          sub="Six ways BlinkWorld turns an ordinary walk into something worth telling your friends about."
        />
        <div className="lw-features-grid" style={{ display: "grid", gap: 18 }}>
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.08}>
              <div className="lw-card" style={glassCard({ padding: 26, height: "100%" })}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    background: "rgba(0,255,136,0.10)",
                    border: "1px solid rgba(0,255,136,0.3)",
                    color: GREEN,
                  }}
                >
                  {f.icon}
                </span>
                <h3
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 19,
                    fontWeight: 700,
                    margin: "16px 0 8px",
                  }}
                >
                  {f.title}
                </h3>
                <p style={{ margin: 0, color: TEXT70, fontSize: 15, lineHeight: 1.65 }}>
                  {f.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- how it works */

const STEPS = [
  {
    step: "1",
    title: "Step outside",
    body: "Open the map and see what's glowing nearby.",
    art: <StepArtMap />,
  },
  {
    step: "2",
    title: "Walk to it",
    body: "Orbs, chests, and creatures appear as you get close.",
    art: <StepArtPath />,
  },
  {
    step: "3",
    title: "Catch and collect",
    body: "Open the AR camera, grab your find, grow your collection.",
    art: <StepArtCamera />,
  },
];

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      style={{
        padding: "clamp(64px, 9vw, 110px) 20px",
        background: "linear-gradient(180deg, rgba(18,18,26,0) 0%, rgba(18,18,26,0.5) 50%, rgba(18,18,26,0) 100%)",
      }}
    >
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <SectionHeader
          overline="How it works"
          title="Three steps. Zero manuals."
          sub="If you can take a walk, you can play BlinkWorld."
        />
        <div className="lw-steps-grid" style={{ display: "grid", gap: 18 }}>
          {STEPS.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.1}>
              <div className="lw-card" style={glassCard({ padding: 26, height: "100%" })}>
                <div
                  aria-hidden
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 130,
                    borderRadius: 14,
                    background: "rgba(10,10,15,0.6)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    marginBottom: 20,
                  }}
                >
                  {s.art}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 15,
                      fontWeight: 700,
                      color: GREEN,
                    }}
                  >
                    {s.step}
                  </span>
                  <h3
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 20,
                      fontWeight: 700,
                      margin: 0,
                    }}
                  >
                    {s.title}
                  </h3>
                </div>
                <p style={{ margin: "8px 0 0", color: TEXT70, fontSize: 15, lineHeight: 1.65 }}>
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------- creature showcase */

const SHOWCASE = [
  { tier: "Common" as const, name: "Pebblekin", img: "/brand/app/creatures/pebblekin.webp" },
  { tier: "Uncommon" as const, name: "Emberling", img: "/brand/app/creatures/emberling.webp" },
  { tier: "Rare" as const, name: "Silkmoth", img: "/brand/app/creatures/silkmoth.webp" },
  { tier: "Legendary" as const, name: "Aethermane", img: "/brand/app/creatures/aethermane.webp" },
  { tier: "Mythic" as const, name: "Shimmer", img: "/brand/app/creatures/shimmer.webp" },
];

function CreatureShowcase() {
  return (
    <section id="creatures" style={{ padding: "clamp(64px, 9vw, 110px) 20px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <SectionHeader
          overline="The collection"
          title="60+ creatures. Five rarities. One neighborhood at a time."
          sub="Every creature has a personality — and the rare ones make the whole feed light up."
        />
        <div className="lw-creature-row">
          {SHOWCASE.map((c, i) => (
            <Reveal key={c.tier} delay={i * 0.07} style={{ height: "100%" }}>
              <div
                className="lw-card"
                style={glassCard({
                  padding: "22px 16px 20px",
                  textAlign: "center",
                  height: "100%",
                  boxShadow: `0 0 34px ${RARITY[c.tier]}22, inset 0 0 0 1px ${RARITY[c.tier]}26`,
                })}
              >
                <div
                  style={{
                    height: 120,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 14,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.img}
                    alt={`${c.name}, a ${c.tier} BlinkWorld creature`}
                    className="lw-float"
                    style={{
                      maxWidth: "100%",
                      maxHeight: 120,
                      objectFit: "contain",
                      filter: `drop-shadow(0 6px 18px ${RARITY[c.tier]}55)`,
                      animationDuration: `${7 + i}s`,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  {c.name}
                </div>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: RARITY[c.tier],
                    border: `1px solid ${RARITY[c.tier]}55`,
                    background: `${RARITY[c.tier]}14`,
                  }}
                >
                  {c.tier}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- safety */

const SAFETY_CARDS = [
  "Locations are always blurred publicly",
  "You choose what's visible on your profile",
  "Block and report anywhere",
  "Delete your account any time, right in the app",
];

function Safety() {
  return (
    <section
      id="safety"
      style={{
        padding: "clamp(64px, 9vw, 110px) 20px",
        background: "linear-gradient(180deg, rgba(18,18,26,0) 0%, rgba(18,18,26,0.5) 50%, rgba(18,18,26,0) 100%)",
      }}
    >
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <SectionHeader
          overline="Safety & privacy"
          title="Built privacy-first."
          sub="Exploring your neighborhood should never mean broadcasting it."
        />
        <div className="lw-safety-grid" style={{ display: "grid", gap: 18 }}>
          {SAFETY_CARDS.map((text, i) => (
            <Reveal key={text} delay={i * 0.07}>
              <div
                className="lw-card"
                style={glassCard({
                  padding: 22,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  height: "100%",
                })}
              >
                <span
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "rgba(0,255,136,0.10)",
                    border: "1px solid rgba(0,255,136,0.3)",
                    color: GREEN,
                  }}
                >
                  <ShieldIcon />
                </span>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.55 }}>
                  {text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.3}>
          <p style={{ textAlign: "center", marginTop: 30 }}>
            <Link
              href="/privacy"
              style={{
                color: GREEN,
                fontWeight: 700,
                fontSize: 15,
                textDecoration: "none",
                borderBottom: `1px solid ${GREEN}66`,
                paddingBottom: 2,
              }}
            >
              Read our Privacy Policy
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ faq */

const FAQS = [
  {
    q: "When does BlinkWorld launch?",
    a: "We're polishing the final beta now. iPhone launches first on the App Store, with Google Play close behind. Join the waitlist to be first in.",
  },
  {
    q: "Is it free?",
    a: "Yes — free to download and free to play.",
  },
  {
    q: "What are Blink Orbs?",
    a: "Blink Orbs are in-game collectible points you gather by exploring. They're just for fun inside BlinkWorld — they are not money, have no cash value, and can't be traded or sold.",
  },
  {
    q: "Does BlinkWorld track my location?",
    a: "Your location powers the map only while you play. Anything shared publicly is always blurred to a wide area.",
  },
  {
    q: "What devices are supported?",
    a: "Modern iPhones at launch, Android soon after.",
  },
];

function Faq() {
  return (
    <section id="faq" style={{ padding: "clamp(64px, 9vw, 110px) 20px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <SectionHeader
          overline="FAQ"
          title="Good questions, quick answers."
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={i * 0.05}>
              <details className="lw-faq" style={glassCard({ padding: 0, overflow: "hidden" })}>
                <summary
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "18px 22px",
                    cursor: "pointer",
                    fontFamily: FONT_DISPLAY,
                    fontSize: 16.5,
                    fontWeight: 700,
                    listStyle: "none",
                  }}
                >
                  {f.q}
                  <span aria-hidden className="lw-faq-chevron" style={{ color: GREEN, flexShrink: 0 }}>
                    <ChevronIcon />
                  </span>
                </summary>
                <p
                  style={{
                    margin: 0,
                    padding: "0 22px 20px",
                    color: TEXT70,
                    fontSize: 15,
                    lineHeight: 1.7,
                  }}
                >
                  {f.a}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- final CTA */

function FinalCta() {
  return (
    <section id="waitlist" style={{ padding: "clamp(40px, 6vw, 80px) 20px clamp(72px, 9vw, 120px)" }}>
      <Reveal>
        <div
          style={{
            position: "relative",
            maxWidth: 900,
            margin: "0 auto",
            padding: "clamp(40px, 7vw, 72px) clamp(24px, 5vw, 64px)",
            borderRadius: 28,
            textAlign: "center",
            overflow: "hidden",
            background: "rgba(18,18,26,0.7)",
            border: "1px solid rgba(0,255,136,0.25)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 0 80px rgba(0,255,136,0.14), inset 0 0 60px rgba(0,255,136,0.05)",
          }}
        >
          <div
            aria-hidden
            className="lw-breathe"
            style={{
              position: "absolute",
              width: 480,
              height: 480,
              left: "50%",
              top: "-55%",
              transform: "translateX(-50%)",
              background: "radial-gradient(circle, rgba(0,255,136,0.22) 0%, rgba(0,255,136,0) 65%)",
              pointerEvents: "none",
            }}
          />
          <h2
            style={{
              position: "relative",
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: "clamp(28px, 4.6vw, 44px)",
              lineHeight: 1.15,
              letterSpacing: "-0.015em",
              margin: 0,
            }}
          >
            Your neighborhood is hiding something.
            <br />
            <span style={{ color: GREEN }}>Find it first.</span>
          </h2>
          <div style={{ position: "relative", maxWidth: 480, margin: "30px auto 0" }}>
            <WaitlistForm idPrefix="cta" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* --------------------------------------------------------------- footer */

function Footer() {
  const columns = [
    {
      heading: "Product",
      links: [
        { href: "#features", label: "Features" },
        { href: "#how-it-works", label: "How it works" },
        { href: "#faq", label: "FAQ" },
      ],
    },
    {
      heading: "Legal",
      links: [
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/terms", label: "Terms of Service" },
      ],
    },
    {
      heading: "Support",
      links: [
        { href: "/support", label: "Help & Contact" },
        { href: "mailto:support@blinkworld.xyz", label: "support@blinkworld.xyz" },
      ],
    },
  ];

  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(18,18,26,0.5)",
        padding: "clamp(44px, 6vw, 64px) 20px 36px",
      }}
    >
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div className="lw-footer-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo-orb-glow.png"
                alt=""
                aria-hidden
                width={28}
                height={28}
                style={{
                  width: 28,
                  height: 28,
                  objectFit: "contain",
                  filter: "drop-shadow(0 0 8px rgba(0,255,136,0.5))",
                }}
              />
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 16,
                  letterSpacing: "0.08em",
                }}
              >
                BLINKWORLD
              </span>
            </div>
            <p style={{ margin: "12px 0 0", color: TEXT50, fontSize: 14, fontWeight: 600 }}>
              Walk. Catch. Explore. Battle.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <h3
                style={{
                  margin: "0 0 14px",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: TEXT50,
                }}
              >
                {col.heading}
              </h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map((l) =>
                  l.href.startsWith("/") ? (
                    <li key={l.label}>
                      <Link href={l.href} className="lw-footer-link">
                        {l.label}
                      </Link>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <a href={l.href} className="lw-footer-link">
                        {l.label}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 44,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <p style={{ margin: 0, color: TEXT70, fontSize: 13, fontWeight: 600 }}>
            Please stay aware of your surroundings while you play.
          </p>
          <p style={{ margin: 0, color: TEXT50, fontSize: 12 }}>
            Apple and the App Store are trademarks of Apple Inc. Google Play is a
            trademark of Google LLC.
          </p>
          <p style={{ margin: 0, color: TEXT50, fontSize: 12 }}>
            &copy; 2026 BlinkWorld. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------- shared pieces */

function SectionHeader({
  overline,
  title,
  sub,
}: {
  overline: string;
  title: string;
  sub?: string;
}) {
  return (
    <Reveal>
      <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 46px" }}>
        <span
          style={{
            color: GREEN,
            fontSize: 12.5,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {overline}
        </span>
        <h2
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: "clamp(26px, 4.2vw, 40px)",
            lineHeight: 1.15,
            letterSpacing: "-0.015em",
            margin: "14px 0 0",
          }}
        >
          {title}
        </h2>
        {sub && (
          <p style={{ margin: "14px 0 0", color: TEXT70, fontSize: 16, lineHeight: 1.6 }}>
            {sub}
          </p>
        )}
      </div>
    </Reveal>
  );
}

function glassCard(extra: React.CSSProperties): React.CSSProperties {
  return {
    background: `linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0)) , ${CARD}`,
    border: GLASS_BORDER,
    borderRadius: 20,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxSizing: "border-box",
    ...extra,
  };
}

function WaitlistForm({ idPrefix }: { idPrefix: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const inputId = `${idPrefix}-waitlist-email`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "busy") return;
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }
    setStatus("busy");
    setMessage(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("Something went wrong — please try again in a moment.");
    }
  }

  if (status === "done") {
    return (
      <p
        role="status"
        style={{
          margin: 0,
          padding: "16px 20px",
          borderRadius: 16,
          background: "rgba(0,255,136,0.10)",
          border: "1px solid rgba(0,255,136,0.4)",
          color: GREEN,
          fontSize: 15,
          fontWeight: 700,
          textAlign: "center",
        }}
      >
        You&apos;re on the list — we&apos;ll email you the moment the doors open.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={inputId} className="lw-visually-hidden">
        Email address
      </label>
      <div className="lw-waitlist-row">
        <input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          className="lw-waitlist-input"
          style={{
            flex: 1,
            minWidth: 0,
            height: 52,
            padding: "0 18px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(10,10,15,0.7)",
            color: WHITE,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: FONT_BODY,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={status === "busy"}
          className="lw-cta-pill"
          style={{ height: 52, whiteSpace: "nowrap" }}
        >
          {status === "busy" ? "Joining..." : "Get early access"}
        </button>
      </div>
      {status === "error" && message && (
        <p
          role="alert"
          style={{ margin: "10px 4px 0", color: "#FF8AE0", fontSize: 13, fontWeight: 600 }}
        >
          {message}
        </p>
      )}
    </form>
  );
}

/* Fade-and-rise into view on scroll; respects reduced motion. */
function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    setArmed(true);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hidden = armed && !shown;
  return (
    <div
      ref={ref}
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden ? "translateY(26px)" : "none",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- icons */

function MapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 8h2.6L9 5h6l2.4 3H20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="14" r="3.4" />
    </svg>
  );
}

function ChestIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v9H4v-9Z" />
      <path d="M4 12h16M12 12v3" />
      <circle cx="12" cy="14" r="1.4" />
    </svg>
  );
}

function PawIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="7" cy="8" r="2" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="17" cy="8" r="2" />
      <path d="M12 11c-2.8 0-5.5 2.3-5.5 5a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3c0-2.7-2.7-5-5.5-5Z" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3s5.5 4.5 5.5 10a5.5 5.5 0 0 1-11 0C6.5 8.5 9 6.5 9 6.5S9 9 10.5 10C10.5 6.5 12 3 12 3Z" />
      <path d="M12 21a3 3 0 0 0 3-3c0-2-3-4-3-4s-3 2-3 4a3 3 0 0 0 3 3Z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.7 2.6 4 5.6 4 9s-1.3 6.4-4 9c-2.7-2.6-4-5.6-4-9s1.3-6.4 4-9Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3 5 6v5c0 4.6 3 8.4 7 10 4-1.6 7-5.4 7-10V6l-7-3Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* --------------------------------------------------------- step artwork */

function StepArtMap() {
  return (
    <svg width="150" height="100" viewBox="0 0 150 100" fill="none" aria-hidden>
      <rect x="15" y="10" width="120" height="80" rx="12" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <path d="M15 40h120M55 10v80M95 10v80" stroke="rgba(0,255,136,0.22)" strokeWidth="1" />
      <circle cx="75" cy="52" r="6" fill="#00FF88" />
      <circle cx="75" cy="52" r="13" stroke="#00FF88" strokeOpacity="0.5" strokeWidth="1.5">
        <animate attributeName="r" values="10;18;10" dur="3s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.6;0.1;0.6" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="40" cy="26" r="4" fill="#88FF00" fillOpacity="0.9" />
      <circle cx="112" cy="30" r="4" fill="#00FF88" fillOpacity="0.9" />
      <circle cx="110" cy="72" r="4" fill="#FFD166" fillOpacity="0.9" />
    </svg>
  );
}

function StepArtPath() {
  return (
    <svg width="150" height="100" viewBox="0 0 150 100" fill="none" aria-hidden>
      <path
        d="M20 82 C 50 82, 46 40, 78 40 S 118 26, 126 24"
        stroke="#00FF88"
        strokeWidth="2"
        strokeDasharray="2 8"
        strokeLinecap="round"
      />
      <circle cx="20" cy="82" r="6" fill="#00FF88" />
      <circle cx="126" cy="24" r="9" fill="none" stroke="#88FF00" strokeWidth="2" />
      <circle cx="126" cy="24" r="4" fill="#88FF00" />
      <circle cx="126" cy="24" r="15" stroke="#88FF00" strokeOpacity="0.35" strokeWidth="1.5">
        <animate attributeName="r" values="12;20;12" dur="3s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.5;0.05;0.5" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function StepArtCamera() {
  return (
    <svg width="150" height="100" viewBox="0 0 150 100" fill="none" aria-hidden>
      <path d="M30 24v-8h12M120 24v-8h-12M30 76v8h12M120 76v8h-12" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="75" cy="50" r="14" fill="url(#lwOrbGrad)" />
      <circle cx="75" cy="50" r="22" stroke="#00FF88" strokeOpacity="0.4" strokeWidth="1.5">
        <animate attributeName="r" values="19;27;19" dur="3s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.5;0.08;0.5" dur="3s" repeatCount="indefinite" />
      </circle>
      <defs>
        <radialGradient id="lwOrbGrad">
          <stop offset="0%" stopColor="#EAFFF4" />
          <stop offset="45%" stopColor="#00FF88" />
          <stop offset="100%" stopColor="#00FF88" stopOpacity="0.2" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/* ----------------------------------------------------------------- css */

const STYLE = `
.lw-skip {
  position: absolute;
  left: -9999px;
  top: 12px;
  z-index: 100;
  padding: 10px 18px;
  border-radius: 999px;
  background: #00FF88;
  color: #000;
  font-weight: 800;
  text-decoration: none;
}
.lw-skip:focus {
  left: 12px;
}
.lw-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
.lw-cta-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 26px;
  height: 44px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(92deg, #88FF00, #00FF88);
  color: #000;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  box-shadow: 0 4px 24px rgba(0,255,136,0.4);
  transition: box-shadow 0.2s ease, transform 0.15s ease;
}
.lw-cta-pill:hover { box-shadow: 0 4px 34px rgba(0,255,136,0.65); }
.lw-cta-pill:active { transform: scale(0.97); }
.lw-cta-pill:disabled { opacity: 0.6; cursor: wait; }
.lw-cta-pill-sm { height: 38px; padding: 0 18px; font-size: 13.5px; }
.lw-cta-pill:focus-visible,
.lw-footer-link:focus-visible,
a:focus-visible,
summary:focus-visible,
button:focus-visible,
input:focus-visible {
  outline: 2px solid #00FF88;
  outline-offset: 3px;
}
.lw-nav-links a:hover { color: #FFFFFF; }
.lw-footer-link {
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
}
.lw-footer-link:hover { color: #00FF88; }
.lw-grid-texture {
  background-image:
    linear-gradient(rgba(0,255,136,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,255,136,0.05) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 90% 70% at 50% 30%, black 20%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 90% 70% at 50% 30%, black 20%, transparent 75%);
}
.lw-waitlist-row { display: flex; gap: 10px; }
.lw-waitlist-input::placeholder { color: rgba(255,255,255,0.4); }
.lw-waitlist-input:focus {
  border-color: rgba(0,255,136,0.7) !important;
  box-shadow: 0 0 0 1px rgba(0,255,136,0.5);
}
.lw-card { transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease; }
.lw-card:hover { transform: translateY(-4px); box-shadow: 0 12px 44px rgba(0,255,136,0.12); }
.lw-features-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.lw-steps-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.lw-safety-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.lw-creature-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}
.lw-footer-grid {
  display: grid;
  grid-template-columns: 1.4fr repeat(3, 1fr);
  gap: 36px;
}
.lw-faq > summary::-webkit-details-marker { display: none; }
.lw-faq-chevron { display: inline-flex; transition: transform 0.25s ease; }
.lw-faq[open] .lw-faq-chevron { transform: rotate(180deg); }
.lw-faq[open] { border-color: rgba(0,255,136,0.35); }

@keyframes lwFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
@keyframes lwBreathe {
  0%, 100% { opacity: 0.65; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.06); }
}
@keyframes lwBreatheCentered {
  0%, 100% { opacity: 0.65; }
  50% { opacity: 1; }
}
@keyframes lwRing {
  0% { transform: scale(0.6); opacity: 0.9; }
  100% { transform: scale(1.5); opacity: 0; }
}
@keyframes lwPulseDot {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,136,0.6); }
  50% { box-shadow: 0 0 0 6px rgba(0,255,136,0); }
}
@keyframes lwMarquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.lw-float { animation: lwFloat 8s ease-in-out infinite; }
.lw-aurora { animation: lwBreathe 9s ease-in-out infinite; border-radius: 50%; }
.lw-aurora-slow { animation-duration: 13s; }
.lw-breathe { animation: lwBreatheCentered 7s ease-in-out infinite; }
.lw-ring { animation: lwRing 2.6s ease-out infinite; }
.lw-pulse-dot { animation: lwPulseDot 2.2s ease-in-out infinite; }
.lw-marquee { animation: lwMarquee 42s linear infinite; }

@media (max-width: 980px) {
  .lw-hero-grid { grid-template-columns: 1fr !important; }
  .lw-features-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .lw-safety-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .lw-steps-grid { grid-template-columns: 1fr; }
  .lw-creature-row {
    display: flex;
    overflow-x: auto;
    padding-bottom: 12px;
    scroll-snap-type: x mandatory;
  }
  .lw-creature-row > div { flex: 0 0 200px; scroll-snap-align: start; }
  .lw-footer-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 720px) {
  .lw-nav-links { display: none !important; }
}
@media (max-width: 560px) {
  .lw-features-grid { grid-template-columns: 1fr; }
  .lw-safety-grid { grid-template-columns: 1fr; }
  .lw-footer-grid { grid-template-columns: 1fr; }
  .lw-waitlist-row { flex-direction: column; }
  .lw-waitlist-row .lw-cta-pill { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .lw-float, .lw-aurora, .lw-breathe, .lw-ring, .lw-pulse-dot, .lw-marquee, .lw-card {
    animation: none !important;
    transition: none !important;
  }
}
`;
