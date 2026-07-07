"use client";

// BlinkWorld marketing landing page — premium starfield edition.
// Inline styles per repo convention; a single <style> tag carries
// keyframes, media queries, and hover states (class prefix: bw).
// No animation libraries — CSS animations + a few lines of vanilla JS
// (IntersectionObserver reveals, carousel arrows, waitlist form).

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

const GREEN = "#4AE88A";
const GREEN_SOFT = "rgba(74,232,138,0.14)";
const BG = "#05060C";
const WHITE = "#FFFFFF";
const TEXT70 = "rgba(255,255,255,0.72)";
const TEXT50 = "rgba(255,255,255,0.5)";
const CARD_BORDER = "1px solid rgba(255,255,255,0.09)";

const FONT_DISPLAY = "'Space Grotesk', 'Inter', -apple-system, sans-serif";
const FONT_BODY = "'Inter', -apple-system, system-ui, sans-serif";

const ART = "/brand/marketing";

export default function LandingPage() {
  return (
    <div
      className="bwRoot"
      style={{
        minHeight: "100vh",
        background: BG,
        color: WHITE,
        fontFamily: FONT_BODY,
        overflowX: "hidden",
        position: "relative",
      }}
    >
      <style>{STYLE}</style>
      <Starfield />
      <Nav />
      <main style={{ position: "relative", zIndex: 2 }}>
        <Hero />
        <Features />
        <ScreenshotCarousel />
        <PrivacyFirst />
      </main>
      <Footer />
    </div>
  );
}

/* ─────────────────────────── Starfield backdrop ─────────────────────────── */

// Deterministic pseudo-random star positions (no Math.random — stable
// between server and client renders).
function starAt(i: number, salt: number) {
  const x = ((i * 73 + salt * 31) % 997) / 9.97; // 0..100
  const y = ((i * 137 + salt * 57) % 991) / 9.91;
  const size = 1 + ((i * 7 + salt) % 3) * 0.7;
  const delay = ((i * 53 + salt * 13) % 70) / 10;
  const dur = 3 + ((i * 29 + salt * 3) % 40) / 10;
  return { x, y, size, delay, dur };
}

function Starfield() {
  const stars = Array.from({ length: 110 }, (_, i) => starAt(i, 5));
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* soft green nebulas */}
      <div
        style={{
          position: "absolute",
          top: "-18%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 1100,
          height: 700,
          background: `radial-gradient(closest-side, rgba(74,232,138,0.12), transparent 70%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-25%",
          right: "-15%",
          width: 900,
          height: 700,
          background: `radial-gradient(closest-side, rgba(74,232,138,0.07), transparent 70%)`,
        }}
      />
      {stars.map((s, i) => (
        <span
          key={i}
          className="bwStar"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────── Navigation ─────────────────────────────── */

function Nav() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        background: "rgba(5,6,12,0.65)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <nav
        aria-label="Main"
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "0 20px",
          height: 68,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <a
          href="#top"
          style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: WHITE }}
        >
          <LogoOrb size={34} />
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: "0.09em",
            }}
          >
            BLINKWORLD
          </span>
        </a>
        <div className="bwNavLinks" style={{ display: "flex", alignItems: "center", gap: 26 }}>
          {[
            { href: "#features", label: "Features" },
            { href: "#screenshots", label: "Screenshots" },
            { href: "#privacy-first", label: "Privacy" },
          ].map((l) => (
            <a key={l.href} href={l.href} className="bwNavLink">
              {l.label}
            </a>
          ))}
          <Link href="/support" className="bwNavLink">
            Support
          </Link>
          <a href="#notify" className="bwNavCta">
            Get notified
          </a>
        </div>
      </nav>
    </header>
  );
}

// The logo art lives on a pure-black square — clip it to a circle and
// overscan slightly so no square edge ever shows.
function LogoOrb({ size }: { size: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        display: "inline-block",
        flexShrink: 0,
        background: "#000",
        boxShadow: `0 0 ${size * 0.5}px rgba(74,232,138,0.45)`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${ART}/blink-logo.webp`}
        alt=""
        width={size}
        height={size}
        style={{
          width: "116%",
          height: "116%",
          margin: "-8%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </span>
  );
}

/* ────────────────────────────────── Hero ────────────────────────────────── */

function Hero() {
  return (
    <section
      id="top"
      style={{
        position: "relative",
        maxWidth: 1180,
        margin: "0 auto",
        padding: "clamp(56px, 9vw, 110px) 20px clamp(60px, 8vw, 100px)",
      }}
    >
      <FloatingOrbs />
      <div className="bwHeroGrid">
        <div style={{ position: "relative", zIndex: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 26 }}>
            <LogoOrb size={58} />
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: GREEN,
                textTransform: "uppercase",
                padding: "7px 14px",
                borderRadius: 999,
                border: `1px solid rgba(74,232,138,0.35)`,
                background: GREEN_SOFT,
              }}
            >
              Coming soon to iPhone
            </span>
          </div>

          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: "clamp(40px, 6.2vw, 74px)",
              lineHeight: 1.04,
              letterSpacing: "-0.025em",
              margin: 0,
            }}
          >
            Turn Every Walk
            <br />
            Into an{" "}
            <span
              style={{
                color: GREEN,
                textShadow: "0 0 40px rgba(74,232,138,0.55)",
              }}
            >
              Adventure
            </span>
          </h1>

          <p
            style={{
              margin: "22px 0 0",
              maxWidth: 540,
              color: TEXT70,
              fontSize: "clamp(16px, 1.6vw, 19px)",
              lineHeight: 1.65,
            }}
          >
            Hunt glowing orbs, catch 60+ creatures in AR, open treasure chests,
            and battle friends — all powered by your real steps.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 18,
              marginTop: 34,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${ART}/app-icon.webp`}
              alt="BlinkWorld app icon"
              width={56}
              height={56}
              style={{
                width: 56,
                height: 56,
                borderRadius: 13,
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: "0 8px 28px rgba(0,0,0,0.5), 0 0 22px rgba(74,232,138,0.25)",
              }}
            />
            <AppStoreBadge />
          </div>

          <WaitlistForm />
        </div>

        <HeroPhones />
      </div>
    </section>
  );
}

// Floating glass-orb particles drifting behind the hero.
function FloatingOrbs() {
  const orbs = [
    { size: 88, left: "58%", top: "2%", delay: 0, dur: 9 },
    { size: 44, left: "38%", top: "70%", delay: 1.6, dur: 11 },
    { size: 30, left: "6%", top: "58%", delay: 3.1, dur: 8 },
    { size: 56, left: "86%", top: "62%", delay: 0.8, dur: 10 },
    { size: 24, left: "72%", top: "88%", delay: 2.4, dur: 12 },
  ];
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
      {orbs.map((o, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={`${ART}/orb.webp`}
          alt=""
          width={o.size}
          height={o.size}
          className="bwFloat"
          style={{
            position: "absolute",
            left: o.left,
            top: o.top,
            width: o.size,
            height: o.size,
            opacity: 0.5,
            filter: "drop-shadow(0 0 18px rgba(74,232,138,0.5))",
            animationDelay: `${o.delay}s`,
            animationDuration: `${o.dur}s`,
          }}
        />
      ))}
    </div>
  );
}

// Official-style black App Store badge, "Coming Soon" variant.
function AppStoreBadge() {
  return (
    <span
      aria-label="Coming soon on the App Store"
      style={{ display: "inline-block", lineHeight: 0 }}
    >
      <svg width={168} height={56} viewBox="0 0 120 40" role="img" aria-hidden focusable="false">
        <rect x="0.5" y="0.5" width="119" height="39" rx="6.5" fill="#000" stroke="#A6A6A6" />
        {/* Apple logo (App Store badge use only) */}
        <g transform="translate(11.5, 8.5) scale(0.045)" fill="#FFF">
          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
        </g>
        <text
          x="37"
          y="17"
          fill="#FFF"
          fontSize="8"
          fontFamily="-apple-system, 'Helvetica Neue', Arial, sans-serif"
        >
          Coming Soon on the
        </text>
        <text
          x="37"
          y="31.5"
          fill="#FFF"
          fontSize="13.5"
          fontWeight="600"
          fontFamily="-apple-system, 'Helvetica Neue', Arial, sans-serif"
        >
          App Store
        </text>
      </svg>
    </span>
  );
}

function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) {
      setState("error");
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div
        id="notify"
        role="status"
        style={{
          marginTop: 22,
          maxWidth: 460,
          padding: "16px 20px",
          borderRadius: 16,
          border: `1px solid rgba(74,232,138,0.4)`,
          background: GREEN_SOFT,
          color: WHITE,
          fontSize: 15,
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: GREEN }}>You&rsquo;re on the list.</strong>{" "}
        We&rsquo;ll email you the moment BlinkWorld lands on the App Store.
      </div>
    );
  }

  return (
    <form id="notify" onSubmit={submit} style={{ marginTop: 22, maxWidth: 460 }}>
      <label
        htmlFor="bw-email"
        style={{ display: "block", fontSize: 13, color: TEXT50, marginBottom: 9 }}
      >
        Get notified at launch
      </label>
      <div className="bwWaitRow">
        <input
          id="bw-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          className="bwWaitInput"
        />
        <button type="submit" disabled={state === "loading"} className="bwWaitBtn">
          {state === "loading" ? "Joining…" : "Notify me"}
        </button>
      </div>
      <p
        aria-live="polite"
        style={{
          margin: "8px 0 0",
          fontSize: 13,
          minHeight: 18,
          color: state === "error" ? "#FF8A8A" : TEXT50,
        }}
      >
        {state === "error"
          ? "That didn't work — check the email and try again."
          : "One email at launch. No spam, ever."}
      </p>
    </form>
  );
}

// Two tilted phone mockups with a soft green glow.
function HeroPhones() {
  return (
    <div
      className="bwHeroPhones"
      aria-hidden
      style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "center" }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(74,232,138,0.22), transparent 70%)",
          filter: "blur(10px)",
        }}
      />
      <PhoneFrame
        src={`${ART}/screens/02_catch_moment.webp`}
        alt=""
        width={196}
        className="bwPhoneBack"
      />
      <PhoneFrame
        src={`${ART}/screens/01_map_home.webp`}
        alt=""
        width={236}
        className="bwPhoneFront"
      />
    </div>
  );
}

function PhoneFrame({
  src,
  alt,
  width,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  className?: string;
}) {
  const radius = width * 0.155;
  return (
    <div
      className={className}
      style={{
        width,
        borderRadius: radius,
        padding: width * 0.032,
        background: "linear-gradient(160deg, #2A2C33, #101116)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow:
          "0 24px 70px rgba(0,0,0,0.6), 0 0 46px rgba(74,232,138,0.28)",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={Math.round(width * 2.174)}
        loading="lazy"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          borderRadius: radius * 0.72,
          background: "#000",
        }}
      />
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: width * 0.055,
          left: "50%",
          transform: "translateX(-50%)",
          width: width * 0.3,
          height: width * 0.078,
          borderRadius: 999,
          background: "#000",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      />
    </div>
  );
}

/* ──────────────────────────────── Features ──────────────────────────────── */

type Feature = {
  title: string;
  body: string;
  art: string;
  artMode: "scene" | "sticker";
};

const FEATURES: Feature[] = [
  {
    title: "Live treasure map",
    body: "Your real neighborhood becomes a glowing night map. Orbs, treasure chests, and geodes appear on the streets around you — walk over and collect them.",
    art: `${ART}/alpine.webp`,
    artMode: "scene",
  },
  {
    title: "Cinematic AR creature catching",
    body: "Point your camera and watch creatures step into your world. Time your catch, feel the flash, and add them to your collection.",
    art: `${ART}/explorer.webp`,
    artMode: "scene",
  },
  {
    title: "Pet companions that explore with you",
    body: "Choose a companion who walks beside you on the map, sniffs out nearby finds, and grows as your adventures stack up.",
    art: `${ART}/frostkit.webp`,
    artMode: "sticker",
  },
  {
    title: "Apple Health step rewards",
    body: "Opt in to Apple Health and your everyday steps unlock bonus orbs, with fair daily caps. Every walk counts.",
    art: `${ART}/orb-emblem.webp`,
    artMode: "sticker",
  },
  {
    title: "Live World Feed of catches worldwide",
    body: "See rare catches light up from players around the planet, and send a Cheer when someone lands a Legendary.",
    art: `${ART}/city-catch.webp`,
    artMode: "scene",
  },
  {
    title: "Friend battles & co-op Rifts",
    body: "Challenge friends to creature battles, or team up to close Rifts together and split the spoils.",
    art: `${ART}/emberling.webp`,
    artMode: "sticker",
  },
];

function Features() {
  return (
    <section
      id="features"
      style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(40px, 6vw, 80px) 20px" }}
    >
      <SectionHeader
        kicker="The game"
        title="A whole world hiding in plain sight"
        sub="BlinkWorld layers a living adventure over the streets you already walk."
      />
      <div className="bwFeatureGrid">
        {FEATURES.map((f) => (
          <Reveal key={f.title}>
            <article className="bwFeatureCard">
              <div
                style={{
                  height: 190,
                  position: "relative",
                  overflow: "hidden",
                  background:
                    f.artMode === "sticker"
                      ? "radial-gradient(circle at 50% 60%, rgba(74,232,138,0.18), rgba(5,6,12,0) 72%)"
                      : "#000",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.art}
                  alt=""
                  loading="lazy"
                  style={
                    f.artMode === "scene"
                      ? {
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center 30%",
                          display: "block",
                        }
                      : {
                          height: "82%",
                          width: "auto",
                          maxWidth: "70%",
                          objectFit: "contain",
                          display: "block",
                          margin: "18px auto 0",
                          filter: "drop-shadow(0 10px 26px rgba(74,232,138,0.3))",
                        }
                  }
                />
                {f.artMode === "scene" && (
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(180deg, rgba(5,6,12,0) 45%, rgba(9,10,16,0.96) 100%)",
                    }}
                  />
                )}
              </div>
              <div style={{ padding: "18px 22px 24px" }}>
                <h3
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 19,
                    fontWeight: 700,
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {f.title}
                </h3>
                <p style={{ margin: "10px 0 0", color: TEXT70, fontSize: 14.5, lineHeight: 1.65 }}>
                  {f.body}
                </p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────── Screenshot carousel ────────────────────────── */

const SCREENS = [
  { src: `${ART}/screens/01_map_home.webp`, caption: "Your streets, reimagined as a treasure map" },
  { src: `${ART}/screens/02_catch_moment.webp`, caption: "The catch moment, in cinematic AR" },
  { src: `${ART}/screens/03_live_world_feed.webp`, caption: "Watch catches light up worldwide" },
  { src: `${ART}/screens/04_battles_hub.webp`, caption: "Battle friends, team up for Rifts" },
  { src: `${ART}/screens/05_blink_card.webp`, caption: "Your explorer card, your story" },
];

function ScreenshotCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function scrollToSlide(i: number) {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(SCREENS.length - 1, i));
    const slide = track.children[clamped] as HTMLElement | undefined;
    if (slide) track.scrollTo({ left: slide.offsetLeft - 20, behavior: "smooth" });
  }

  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    const slideWidth = (track.children[0] as HTMLElement | undefined)?.offsetWidth ?? 1;
    setIndex(
      Math.max(0, Math.min(SCREENS.length - 1, Math.round(track.scrollLeft / (slideWidth + 24)))),
    );
  }

  return (
    <section id="screenshots" style={{ padding: "clamp(40px, 6vw, 80px) 0" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px" }}>
        <SectionHeader
          kicker="Screenshots"
          title="See it in motion"
          sub="Swipe through the world waiting outside your door."
        />
      </div>
      <div style={{ position: "relative", maxWidth: 1180, margin: "0 auto" }}>
        <button
          type="button"
          aria-label="Previous screenshot"
          className="bwCarArrow bwCarPrev"
          onClick={() => scrollToSlide(index - 1)}
          disabled={index <= 0}
        >
          <ChevronIcon flip />
        </button>
        <div ref={trackRef} className="bwCarTrack" onScroll={onScroll}>
          {SCREENS.map((s) => (
            <figure key={s.src} className="bwCarSlide">
              <PhoneFrame src={s.src} alt={s.caption} width={228} />
              <figcaption
                style={{
                  marginTop: 16,
                  fontSize: 13.5,
                  color: TEXT50,
                  textAlign: "center",
                  maxWidth: 228,
                }}
              >
                {s.caption}
              </figcaption>
            </figure>
          ))}
        </div>
        <button
          type="button"
          aria-label="Next screenshot"
          className="bwCarArrow bwCarNext"
          onClick={() => scrollToSlide(index + 1)}
          disabled={index >= SCREENS.length - 1}
        >
          <ChevronIcon />
        </button>
        <div
          style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}
        >
          {SCREENS.map((s, i) => (
            <button
              key={s.src}
              type="button"
              aria-label={`Go to screenshot ${i + 1}`}
              aria-current={index === i}
              onClick={() => scrollToSlide(i)}
              style={{
                width: index === i ? 22 : 8,
                height: 8,
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                background: index === i ? GREEN : "rgba(255,255,255,0.22)",
                transition: "all 0.25s ease",
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ChevronIcon({ flip }: { flip?: boolean }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        d="M9 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ───────────────────────────── Privacy-first ────────────────────────────── */

const PRIVACY_POINTS = [
  {
    title: "Locations are always blurred",
    body: "Anything shared publicly shows a wide area, never a street. Nobody can see where you're standing.",
  },
  {
    title: "Visibility is opt-in",
    body: "You decide what appears on the Live World Feed and who can find you. Nothing is shared by default.",
  },
  {
    title: "Block & report anywhere",
    body: "One tap blocks or reports any player, from any screen. Reports are reviewed and acted on.",
  },
  {
    title: "Delete your account in-app",
    body: "Profile, Settings, Delete Account. Permanent, immediate, no email required.",
  },
  {
    title: "No ads",
    body: "No ad networks, no trackers, no selling your data. The game is the whole product.",
  },
];

function PrivacyFirst() {
  return (
    <section
      id="privacy-first"
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "clamp(40px, 6vw, 80px) 20px clamp(60px, 8vw, 110px)",
      }}
    >
      <div className="bwPrivacyPanel">
        <div style={{ flex: "1 1 340px", minWidth: 0 }}>
          <SectionHeader
            kicker="Your data, your rules"
            title="Built privacy-first"
            sub="A game you play outside should never follow you home."
            align="left"
          />
          <div style={{ display: "grid", gap: 14, marginTop: 28 }}>
            {PRIVACY_POINTS.map((p) => (
              <Reveal key={p.title}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span
                    aria-hidden
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: GREEN_SOFT,
                      border: `1px solid rgba(74,232,138,0.3)`,
                      color: GREEN,
                    }}
                  >
                    <ShieldIcon />
                  </span>
                  <div>
                    <h3
                      style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, margin: 0 }}
                    >
                      {p.title}
                    </h3>
                    <p style={{ margin: "5px 0 0", color: TEXT70, fontSize: 14, lineHeight: 1.6 }}>
                      {p.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <p style={{ marginTop: 26, fontSize: 13.5, color: TEXT50 }}>
            The full story lives in our{" "}
            <Link href="/privacy" style={{ color: GREEN, fontWeight: 600, textDecoration: "none" }}>
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div
          className="bwPrivacyArt"
          aria-hidden
          style={{
            flex: "0 1 320px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 300,
              height: 300,
              borderRadius: "50%",
              background: "radial-gradient(closest-side, rgba(74,232,138,0.16), transparent 70%)",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/aureling.webp`}
            alt=""
            loading="lazy"
            className="bwFloat"
            style={{
              width: "min(300px, 80%)",
              height: "auto",
              position: "relative",
              filter: "drop-shadow(0 16px 40px rgba(74,232,138,0.25))",
              animationDuration: "10s",
            }}
          />
        </div>
      </div>
    </section>
  );
}

function ShieldIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ────────────────────────────────── Footer ──────────────────────────────── */

function Footer() {
  return (
    <footer
      style={{
        position: "relative",
        zIndex: 2,
        borderTop: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(5,6,12,0.7)",
        padding: "40px 20px 48px",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <LogoOrb size={30} />
          <span
            style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, letterSpacing: "0.09em" }}
          >
            BLINKWORLD
          </span>
        </div>
        <nav aria-label="Legal" style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
          {[
            { href: "/privacy", label: "Privacy Policy" },
            { href: "/terms", label: "Terms of Use" },
            { href: "/support", label: "Support" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{ color: TEXT70, textDecoration: "none", fontSize: 13.5, fontWeight: 600 }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p style={{ margin: 0, color: TEXT50, fontSize: 12.5 }}>&copy; 2026 BlinkWorld</p>
      </div>
    </footer>
  );
}

/* ─────────────────────────────── Utilities ──────────────────────────────── */

function SectionHeader({
  kicker,
  title,
  sub,
  align = "center",
}: {
  kicker: string;
  title: string;
  sub: string;
  align?: "center" | "left";
}) {
  return (
    <div
      style={{
        textAlign: align,
        maxWidth: align === "center" ? 640 : 520,
        margin: align === "center" ? "0 auto" : 0,
      }}
    >
      <p
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: GREEN,
          margin: 0,
        }}
      >
        {kicker}
      </p>
      <h2
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: "clamp(28px, 4vw, 44px)",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          margin: "12px 0 0",
        }}
      >
        {title}
      </h2>
      <p style={{ margin: "14px 0 0", color: TEXT70, fontSize: 16, lineHeight: 1.6 }}>{sub}</p>
    </div>
  );
}

// Fade-and-rise on first scroll into view. Renders visible when
// IntersectionObserver is unavailable.
function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    el.classList.add("bwHidden");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("bwShown");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref}>{children}</div>;
}

/* ──────────────────────────────── Styles ────────────────────────────────── */

const STYLE = `
.bwRoot { -webkit-font-smoothing: antialiased; }

.bwStar {
  position: absolute;
  border-radius: 50%;
  background: #fff;
  opacity: 0.5;
  animation: bwTwinkle 4s ease-in-out infinite;
}
@keyframes bwTwinkle {
  0%, 100% { opacity: 0.18; }
  50% { opacity: 0.75; }
}

.bwNavLink {
  color: rgba(255,255,255,0.72);
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: color 0.2s ease;
}
.bwNavLink:hover { color: #fff; }
.bwNavCta {
  color: #05060C;
  background: ${GREEN};
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 700;
  padding: 9px 18px;
  border-radius: 999px;
  box-shadow: 0 2px 18px rgba(74,232,138,0.4);
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}
.bwNavCta:hover { transform: translateY(-1px); box-shadow: 0 4px 26px rgba(74,232,138,0.55); }
@media (max-width: 760px) {
  .bwNavLink { display: none; }
}

.bwHeroGrid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 48px;
  align-items: center;
}
@media (max-width: 900px) {
  .bwHeroGrid { grid-template-columns: 1fr; gap: 64px; }
}

.bwHeroPhones { min-height: 420px; align-items: center; }
.bwPhoneFront {
  transform: rotate(6deg) translateY(-8px);
  z-index: 2;
  margin-left: -46px;
  animation: bwHover 8s ease-in-out infinite;
}
.bwPhoneBack {
  transform: rotate(-9deg) translateY(26px);
  opacity: 0.92;
  animation: bwHover 9s ease-in-out infinite reverse;
}
@keyframes bwHover {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -12px; }
}
@media (max-width: 480px) {
  .bwPhoneBack { display: none; }
  .bwPhoneFront { margin-left: 0; }
}

.bwFloat { animation: bwDrift 10s ease-in-out infinite; }
@keyframes bwDrift {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-22px) rotate(4deg); }
}

.bwWaitRow { display: flex; gap: 10px; }
.bwWaitInput {
  flex: 1;
  min-width: 0;
  height: 52px;
  padding: 0 18px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.06);
  color: #fff;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.bwWaitInput::placeholder { color: rgba(255,255,255,0.35); }
.bwWaitInput:focus {
  border-color: rgba(74,232,138,0.65);
  box-shadow: 0 0 0 3px rgba(74,232,138,0.18);
}
.bwWaitBtn {
  height: 52px;
  padding: 0 24px;
  border: none;
  border-radius: 14px;
  background: ${GREEN};
  color: #05060C;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 24px rgba(74,232,138,0.4);
  transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}
.bwWaitBtn:hover { transform: translateY(-1px); box-shadow: 0 6px 32px rgba(74,232,138,0.55); }
.bwWaitBtn:disabled { opacity: 0.6; cursor: default; transform: none; }
@media (max-width: 420px) {
  .bwWaitRow { flex-direction: column; }
}

.bwFeatureGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
  margin-top: 48px;
}
@media (max-width: 980px) { .bwFeatureGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) { .bwFeatureGrid { grid-template-columns: 1fr; } }

.bwFeatureCard {
  border-radius: 22px;
  overflow: hidden;
  background: rgba(255,255,255,0.035);
  border: ${CARD_BORDER};
  height: 100%;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}
.bwFeatureCard:hover {
  transform: translateY(-4px);
  border-color: rgba(74,232,138,0.4);
  box-shadow: 0 18px 50px rgba(0,0,0,0.45), 0 0 34px rgba(74,232,138,0.12);
}

.bwCarTrack {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 26px 20px 6px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.bwCarTrack::-webkit-scrollbar { display: none; }
.bwCarSlide {
  scroll-snap-align: center;
  flex: 0 0 auto;
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.bwCarTrack::after { content: ""; flex: 0 0 8px; }

.bwCarArrow {
  position: absolute;
  top: 42%;
  z-index: 5;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(10,12,20,0.82);
  color: #fff;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, opacity 0.2s ease;
}
.bwCarArrow:hover { border-color: rgba(74,232,138,0.6); background: rgba(16,20,30,0.95); }
.bwCarArrow:disabled { opacity: 0.3; cursor: default; }
.bwCarPrev { left: 10px; }
.bwCarNext { right: 10px; }
@media (min-width: 761px) {
  .bwCarArrow { display: flex; }
}

.bwPrivacyPanel {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  padding: clamp(28px, 4.5vw, 56px);
  border-radius: 28px;
  border: ${CARD_BORDER};
  background: linear-gradient(160deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015));
}
@media (max-width: 760px) {
  .bwPrivacyArt { order: -1; flex-basis: 100%; }
}

.bwHidden { opacity: 0; transform: translateY(22px); transition: opacity 0.6s ease, transform 0.6s ease; }
.bwHidden.bwShown { opacity: 1; transform: translateY(0); }

@media (prefers-reduced-motion: reduce) {
  .bwStar, .bwFloat, .bwPhoneFront, .bwPhoneBack { animation: none !important; }
  .bwHidden { opacity: 1; transform: none; transition: none; }
}
`;
