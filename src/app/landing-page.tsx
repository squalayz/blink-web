"use client";

// BlinkWorld marketing landing page — cinematic edition.
// Inline styles per repo convention; a single <style> tag carries
// keyframes, media queries, and hover states (class prefix: bw).
// CSS animations + vanilla canvas/rAF/IntersectionObserver (starfield,
// tilt, reveals, count-ups, carousel, waitlist form); the one library
// exception is the hero's scroll-parallax mountain backdrop, which uses
// framer-motion (dynamic-imported, LazyMotion subset). Everything pauses
// under prefers-reduced-motion and when the tab is hidden.

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import StarfieldCanvas from "@/components/marketing/StarfieldCanvas";
import CreatureMarquee from "@/components/marketing/CreatureMarquee";
import StatsStrip from "@/components/marketing/StatsStrip";

// Decorative scroll-parallax layer — client-only and loaded after hydration
// so framer-motion never blocks the initial bundle.
const HeroBackdrop = dynamic(() => import("@/components/marketing/HeroBackdrop"), {
  ssr: false,
});

const APP_STORE_URL = "https://apps.apple.com/app/id6774225621";

const GREEN = "#00FF88";
const GREEN_LIME = "#88FF00";
const GREEN_SOFT = "rgba(0,255,136,0.12)";
const BG = "#05060C";
const WHITE = "#FFFFFF";
const TEXT70 = "rgba(255,255,255,0.72)";
const TEXT50 = "rgba(255,255,255,0.5)";
const CARD_BORDER = "1px solid rgba(255,255,255,0.1)";
const GLASS_BG = "linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))";
const GLASS_SHADOW = "inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 50px rgba(0,0,0,0.35)";

const FONT_DISPLAY = "'Space Grotesk', 'Inter', -apple-system, sans-serif";
const FONT_BODY = "'Inter', -apple-system, system-ui, sans-serif";

const ART = "/brand/marketing";
const EXPLORERS = "/explorers";

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
      <ScrollProgress />
      <StarfieldCanvas />
      <HeroBackdrop />
      <Nav />
      <main style={{ position: "relative", zIndex: 2 }}>
        <Hero />
        <CreatureMarquee />
        <StatsStrip />
        <ExplorerStrip />
        <SectionDivider />
        <Features />
        <SectionDivider />
        <ScreenshotCarousel />
        <SectionDivider />
        <PrivacyFirst />
      </main>
      <Footer />
      <NoiseOverlay />
    </div>
  );
}

/* ─────────────────────────── Global chrome ─────────────────────────── */

// Thin green progress line pinned to the very top of the viewport.
function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      el.style.transform = `scaleX(${p.toFixed(4)})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 60,
        transformOrigin: "0 50%",
        transform: "scaleX(0)",
        background: `linear-gradient(90deg, ${GREEN}, ${GREEN_LIME})`,
        boxShadow: "0 0 12px rgba(0,255,136,0.6)",
        pointerEvents: "none",
      }}
    />
  );
}

// 2.5%-opacity SVG noise over everything — kills gradient banding and adds
// filmic texture. Pointer-events none, so it's invisible to interaction.
function NoiseOverlay() {
  return <div aria-hidden className="bwNoise" />;
}

// Soft glowing hairline between major sections.
function SectionDivider() {
  return (
    <div aria-hidden style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px" }}>
      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(0,255,136,0.28), transparent)",
          boxShadow: "0 0 18px rgba(0,255,136,0.18)",
        }}
      />
    </div>
  );
}

/* ─────────────────────────────── Navigation ─────────────────────────────── */

const NAV_SECTIONS = [
  { id: "creatures", label: "Creatures" },
  { id: "features", label: "Features" },
  { id: "screenshots", label: "Screenshots" },
  { id: "privacy-first", label: "Privacy" },
];

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the nav link for whichever section straddles mid-viewport.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const s of NAV_SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        backdropFilter: scrolled ? "blur(18px) saturate(1.3)" : "blur(6px)",
        WebkitBackdropFilter: scrolled ? "blur(18px) saturate(1.3)" : "blur(6px)",
        background: scrolled ? "rgba(5,6,12,0.72)" : "rgba(5,6,12,0.25)",
        borderBottom: scrolled
          ? "1px solid rgba(255,255,255,0.09)"
          : "1px solid rgba(255,255,255,0)",
        boxShadow: scrolled ? "0 12px 40px rgba(0,0,0,0.35)" : "none",
        transition:
          "background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease, backdrop-filter 0.35s ease",
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
          {NAV_SECTIONS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className={`bwNavLink${active === l.id ? " bwNavActive" : ""}`}
            >
              {l.label}
            </a>
          ))}
          <Link href="/support" className="bwNavLink">
            Support
          </Link>
          <a
            href={APP_STORE_URL}
            className="bwNavCta"
            aria-label="Download BlinkWorld on the App Store"
          >
            Download
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
        boxShadow: `0 0 ${size * 0.5}px rgba(0,255,136,0.45)`,
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
  const sectionRef = useRef<HTMLElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);

  // Mouse-tilt on the phone cluster: spring-smoothed via rAF lerp.
  // The floating explorers ride the same loop — each drifts opposite the
  // cursor by its data-depth for cheap parallax (bob animation lives on the
  // inner <img>, so the wrapper's translate never fights it).
  // Desktop pointers only; skipped entirely under prefers-reduced-motion.
  useEffect(() => {
    const section = sectionRef.current;
    const tilt = tiltRef.current;
    if (!section || !tilt) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const explorers = Array.from(section.querySelectorAll<HTMLElement>(".bwHeroExp"));

    let raf = 0;
    let tracking = false;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };

    const loop = () => {
      cur.x += (target.x - cur.x) * 0.075;
      cur.y += (target.y - cur.y) * 0.075;
      tilt.style.transform = `rotateY(${(cur.x * 9).toFixed(2)}deg) rotateX(${(-cur.y * 7).toFixed(2)}deg)`;
      for (const el of explorers) {
        const depth = Number(el.dataset.depth || 0);
        el.style.translate = `${(cur.x * depth).toFixed(1)}px ${(cur.y * depth * 0.75).toFixed(1)}px`;
      }
      const settled =
        !tracking && Math.abs(cur.x - target.x) < 0.002 && Math.abs(cur.y - target.y) < 0.002;
      if (settled || document.hidden) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onMove = (e: MouseEvent) => {
      const r = section.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      tracking = true;
      kick();
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      tracking = false;
      kick();
    };
    section.addEventListener("mousemove", onMove, { passive: true });
    section.addEventListener("mouseleave", onLeave);
    return () => {
      section.removeEventListener("mousemove", onMove);
      section.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      id="top"
      ref={sectionRef}
      style={{
        position: "relative",
        maxWidth: 1180,
        margin: "0 auto",
        padding: "clamp(56px, 9vw, 110px) 20px clamp(60px, 8vw, 100px)",
      }}
    >
      <FloatingOrbs />
      <HeroExplorers />
      <div className="bwHeroGrid">
        <div style={{ position: "relative", zIndex: 3 }}>
          <div
            className="bwRise"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 26,
              animationDelay: "0.02s",
            }}
          >
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
                border: `1px solid rgba(0,255,136,0.35)`,
                background: GREEN_SOFT,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 24px rgba(0,255,136,0.12)",
              }}
            >
              Now on the App Store
            </span>
          </div>

          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: "clamp(40px, 6.2vw, 74px)",
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            <KineticWord text="Turn" delay={0.08} />{" "}
            <KineticWord text="Every" delay={0.17} />{" "}
            <KineticWord text="Walk" delay={0.26} />
            <br />
            <KineticWord text="Into" delay={0.36} /> <KineticWord text="an" delay={0.43} />{" "}
            <span className="bwWord" style={{ animationDelay: "0.52s" }}>
              <span className="bwShimmer">Adventure</span>
            </span>
          </h1>

          <p
            className="bwRise"
            style={{
              margin: "22px 0 0",
              maxWidth: 540,
              color: TEXT70,
              fontSize: "clamp(16px, 1.6vw, 19px)",
              lineHeight: 1.65,
              animationDelay: "0.55s",
            }}
          >
            Hunt glowing orbs, catch 60+ creatures in AR, open treasure chests,
            and battle friends — all powered by your real steps.
          </p>

          <div
            className="bwRise"
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 18,
              marginTop: 34,
              animationDelay: "0.65s",
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
                boxShadow: "0 8px 28px rgba(0,0,0,0.5), 0 0 22px rgba(0,255,136,0.25)",
              }}
            />
            <a
              href={APP_STORE_URL}
              className="bwDownloadBtn"
              aria-label="Download BlinkWorld now on the App Store"
            >
              Download Now
            </a>
            <AppStoreBadge />
          </div>

          <div className="bwRise" style={{ animationDelay: "0.75s" }}>
            <WaitlistForm />
          </div>
        </div>

        <div
          className="bwHeroPhones bwRise"
          aria-hidden
          style={{
            position: "relative",
            zIndex: 2,
            animationDelay: "0.4s",
            perspective: 1100,
          }}
        >
          <div
            ref={tiltRef}
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              transformStyle: "preserve-3d",
              willChange: "transform",
              width: "100%",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 440,
                height: 440,
                borderRadius: "50%",
                background: "radial-gradient(closest-side, rgba(0,255,136,0.2), transparent 70%)",
                filter: "blur(12px)",
              }}
            />
            <PhoneFrame
              src={`${ART}/screens/02_catch_moment.webp`}
              alt=""
              width={196}
              className="bwPhoneBack"
              eager
            />
            <PhoneFrame
              src={`${ART}/screens/01_map_home.webp`}
              alt=""
              width={236}
              className="bwPhoneFront"
              eager
            />
            {/* soft reflection pool beneath the phones */}
            <div
              style={{
                position: "absolute",
                bottom: -46,
                left: "50%",
                transform: "translateX(-50%)",
                width: "72%",
                height: 60,
                borderRadius: "50%",
                background: "radial-gradient(closest-side, rgba(0,255,136,0.3), transparent 72%)",
                filter: "blur(18px)",
                opacity: 0.8,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// One word of the kinetic headline — staggered rise + blur-out entrance.
function KineticWord({ text, delay }: { text: string; delay: number }) {
  return (
    <span className="bwWord" style={{ animationDelay: `${delay}s` }}>
      {text}
    </span>
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
            filter: "drop-shadow(0 0 18px rgba(0,255,136,0.5))",
            animationDelay: `${o.delay}s`,
            animationDuration: `${o.dur}s`,
          }}
        />
      ))}
    </div>
  );
}

// Chibi explorer characters floating in the hero. Each wrapper carries a
// data-depth the mouse-parallax loop reads (translate on the wrapper); the
// idle bob runs on the inner <img> with per-character duration/delay so
// they never move in lockstep. Visibility/size per breakpoint lives in the
// bwExpL/R/P classes. L and R are a mirrored pair — same height, same
// vertical band, symmetric insets — so the hero reads balanced.
const HERO_EXPLORERS = [
  {
    // blonde girl — flanking the hero on the left, mid-height
    src: `${EXPLORERS}/explorer_blonde_girl.webp`,
    w: 381,
    h: 494,
    cls: "bwExpL",
    depth: -14,
    z: 3,
    dur: 7.4,
    delay: 0.5,
  },
  {
    // deep guy — mirrored on the right, beside the phone cluster
    src: `${EXPLORERS}/explorer_deep_guy.webp`,
    w: 232,
    h: 443,
    cls: "bwExpR",
    depth: -14,
    z: 3,
    dur: 6.4,
    delay: 0,
  },
  {
    // goggles guy — small, peeking out from behind the phones' glow
    src: `${EXPLORERS}/explorer_goggles_guy.webp`,
    w: 242,
    h: 444,
    cls: "bwExpP",
    depth: -7,
    z: 1,
    dur: 9,
    delay: 1.8,
  },
];

function HeroExplorers() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {HERO_EXPLORERS.map((e) => (
        <div
          key={e.src}
          className={`bwHeroExp ${e.cls}`}
          data-depth={e.depth}
          style={{ position: "absolute", zIndex: e.z, willChange: "translate" }}
        >
          {/* light pool beneath — they emit their own glow */}
          <span
            style={{
              position: "absolute",
              bottom: -14,
              left: "50%",
              transform: "translateX(-50%)",
              width: "130%",
              height: 30,
              borderRadius: "50%",
              background: "radial-gradient(closest-side, rgba(0,255,136,0.4), transparent 72%)",
              filter: "blur(10px)",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={e.src}
            alt=""
            width={e.w}
            height={e.h}
            loading="eager"
            decoding="async"
            className="bwExpBob"
            style={{
              height: "100%",
              width: "auto",
              position: "relative",
              display: "block",
              filter:
                "drop-shadow(0 0 22px rgba(0,255,136,0.35)) drop-shadow(0 14px 22px rgba(0,0,0,0.45))",
              animationDuration: `${e.dur}s`,
              animationDelay: `${e.delay}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Choose your Explorer ─────────────────────────── */

const EXPLORER_CARDS = [
  { src: `${EXPLORERS}/explorer_deep_guy.webp`, name: "Pathfinder", w: 232, h: 443 },
  { src: `${EXPLORERS}/explorer_blonde_girl.webp`, name: "Trailblazer", w: 381, h: 494 },
  { src: `${EXPLORERS}/explorer_tan_girl.webp`, name: "Wayfarer", w: 255, h: 443 },
  { src: `${EXPLORERS}/explorer_goggles_guy.webp`, name: "Skywatcher", w: 242, h: 444 },
  { src: `${EXPLORERS}/explorer_boy_cap.webp`, name: "City Runner", w: 325, h: 425 },
];

// Compact strip of glass pedestal cards — one per explorer preset.
function ExplorerStrip() {
  return (
    <section
      id="explorers"
      style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(36px, 5vw, 64px) 20px" }}
    >
      <SectionHeader
        kicker="Your avatar"
        title="Choose your Explorer"
        sub="Customize your explorer — hair, skin tone, gear and companions — and show up on the map as you."
      />
      <div className="bwExpRow" style={{ marginTop: 42 }}>
        {EXPLORER_CARDS.map((c, i) => (
          <Reveal key={c.name} delay={i * 80} className="bwExpCell">
            <div className="bwPedestal">
              <span className="bwPedestalFloor" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.src}
                alt={`${c.name} explorer character`}
                width={c.w}
                height={c.h}
                loading="lazy"
                decoding="async"
                className="bwPedestalArt"
              />
              <span className="bwPedestalName">{c.name}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// Official-style black App Store badge — links straight to the store listing.
function AppStoreBadge() {
  return (
    <a
      href={APP_STORE_URL}
      aria-label="Download BlinkWorld on the App Store"
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
          Download on the
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
    </a>
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
        className="bwWaitDone"
        style={{
          marginTop: 22,
          maxWidth: 460,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 20px",
          borderRadius: 999,
          border: `1px solid rgba(0,255,136,0.45)`,
          background: GREEN_SOFT,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 40px rgba(0,255,136,0.2)",
          color: WHITE,
          fontSize: 15,
          lineHeight: 1.5,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: GREEN,
            color: "#05060C",
            boxShadow: "0 0 20px rgba(0,255,136,0.6)",
          }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              className="bwCheckPath"
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span>
          <strong style={{ color: GREEN }}>You&rsquo;re on the list.</strong>{" "}
          We&rsquo;ll email you when big updates and new creatures drop.
        </span>
      </div>
    );
  }

  return (
    <form id="notify" onSubmit={submit} style={{ marginTop: 22, maxWidth: 460 }}>
      <label
        htmlFor="bw-email"
        style={{ display: "block", fontSize: 13, color: TEXT50, marginBottom: 9 }}
      >
        Want updates by email?
      </label>
      <div className="bwWaitCapsule">
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
        <MagneticButton type="submit" disabled={state === "loading"} className="bwWaitBtn">
          {state === "loading" ? "Joining…" : "Get updates"}
        </MagneticButton>
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
          : "Occasional updates only. No spam, ever."}
      </p>
    </form>
  );
}

// Button that leans a few px toward the cursor and springs back on leave.
// The spring is the CSS transition on the class; here we only set targets.
function MagneticButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);
  const { children, ...rest } = props;

  function onMove(e: React.MouseEvent<HTMLButtonElement>) {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const dx = ((e.clientX - (r.left + r.width / 2)) / r.width) * 9;
    const dy = ((e.clientY - (r.top + r.height / 2)) / r.height) * 7;
    el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
  }

  function onLeave() {
    const el = ref.current;
    if (el) el.style.transform = "translate(0px, 0px)";
  }

  return (
    <button ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} {...rest}>
      {children}
    </button>
  );
}

/* ──────────────────────────── Features (bento) ──────────────────────────── */

type Feature = {
  title: string;
  body: string;
  art: string;
  artMode: "scene" | "sticker";
  icon: React.ReactNode;
};

const FEATURES: Feature[] = [
  {
    title: "Live treasure map",
    body: "Your real neighborhood becomes a glowing night map. Orbs, treasure chests, and geodes appear on the streets around you — walk over and collect them.",
    art: `${ART}/alpine.webp`,
    artMode: "scene",
    icon: <MapPinIcon />,
  },
  {
    title: "Cinematic AR creature catching",
    body: "Point your camera and watch creatures step into your world. Time your catch, feel the flash, and add them to your collection.",
    art: `${ART}/explorer.webp`,
    artMode: "scene",
    icon: <ScanIcon />,
  },
  {
    title: "Pet companions that explore with you",
    body: "Choose a companion who walks beside you on the map, sniffs out nearby finds, and grows as your adventures stack up.",
    art: `${ART}/frostkit.webp`,
    artMode: "sticker",
    icon: <PawIcon />,
  },
  {
    title: "Apple Health step rewards",
    body: "Opt in to Apple Health and your everyday steps unlock bonus orbs, with fair daily caps. Every walk counts.",
    art: `${ART}/orb-emblem.webp`,
    artMode: "sticker",
    icon: <PulseIcon />,
  },
  {
    title: "Live World Feed of catches worldwide",
    body: "See rare catches light up from players around the planet, and send a Cheer when someone lands a Legendary.",
    art: `${ART}/city-catch.webp`,
    artMode: "scene",
    icon: <GlobeIcon />,
  },
  {
    title: "Friend battles & co-op Rifts",
    body: "Challenge friends to creature battles, or team up to close Rifts together and split the spoils.",
    art: `${ART}/emberling.webp`,
    artMode: "sticker",
    icon: <SwordsIcon />,
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
      <div className="bwBento" style={{ marginTop: 48 }}>
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 70} className={`bwB${i}`}>
            <BentoCard feature={f} large={i === 0} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// Glass bento card with a green glow that follows the cursor
// (CSS vars --mx/--my drive a radial-gradient in ::after).
function BentoCard({ feature: f, large }: { feature: Feature; large?: boolean }) {
  const ref = useRef<HTMLElement>(null);

  function onMove(e: React.MouseEvent<HTMLElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${(e.clientX - r.left).toFixed(0)}px`);
    el.style.setProperty("--my", `${(e.clientY - r.top).toFixed(0)}px`);
  }

  return (
    <article ref={ref} className="bwBentoCard" onMouseMove={onMove}>
      <div
        style={{
          height: large ? undefined : 160,
          flex: large ? "1 1 240px" : undefined,
          minHeight: large ? 240 : undefined,
          position: "relative",
          overflow: "hidden",
          background:
            f.artMode === "sticker"
              ? "radial-gradient(circle at 50% 60%, rgba(0,255,136,0.16), rgba(5,6,12,0) 72%)"
              : "#000",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={f.art}
          alt=""
          loading="lazy"
          decoding="async"
          className={f.artMode === "scene" ? "bwBentoScene" : undefined}
          style={
            f.artMode === "scene"
              ? {
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center 30%",
                  display: "block",
                  position: large ? "absolute" : undefined,
                  inset: large ? 0 : undefined,
                }
              : {
                  height: "82%",
                  width: "auto",
                  maxWidth: "70%",
                  objectFit: "contain",
                  display: "block",
                  margin: "14px auto 0",
                  filter: "drop-shadow(0 10px 26px rgba(0,255,136,0.3))",
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
      <div style={{ padding: large ? "22px 26px 28px" : "16px 20px 22px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="bwBentoIcon" aria-hidden>
            {f.icon}
          </span>
          <h3
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: large ? 22 : 18,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.015em",
            }}
          >
            {f.title}
          </h3>
        </div>
        <p
          style={{
            margin: "10px 0 0",
            color: TEXT70,
            fontSize: large ? 15.5 : 14,
            lineHeight: 1.65,
          }}
        >
          {f.body}
        </p>
      </div>
    </article>
  );
}

/* Feature icons — 18px stroke glyphs, brand green, no emoji. */

function MapPinIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-5.1 7-11a7 7 0 10-14 0c0 5.9 7 11 7 11z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <circle cx={12} cy={10} r={2.6} stroke="currentColor" strokeWidth={1.8} />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <circle cx={12} cy={12} r={3.2} stroke="currentColor" strokeWidth={1.8} />
    </svg>
  );
}

function PawIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx={7.2} cy={8.6} r={1.9} stroke="currentColor" strokeWidth={1.7} />
      <circle cx={16.8} cy={8.6} r={1.9} stroke="currentColor" strokeWidth={1.7} />
      <circle cx={12} cy={6.2} r={1.9} stroke="currentColor" strokeWidth={1.7} />
      <path
        d="M12 11.2c-2.9 0-5.4 2.3-5.4 4.8 0 1.6 1.2 2.6 2.7 2.6 1 0 1.8-.5 2.7-.5s1.7.5 2.7.5c1.5 0 2.7-1 2.7-2.6 0-2.5-2.5-4.8-5.4-4.8z"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 12h4l2.5-6 4 12L16 12h5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx={12} cy={12} r={8.5} stroke="currentColor" strokeWidth={1.7} />
      <path
        d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.3 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.3-3.6-8.5s1.2-6.1 3.6-8.5z"
        stroke="currentColor"
        strokeWidth={1.7}
      />
    </svg>
  );
}

function SwordsIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4l10.5 10.5M4 4h4M4 4v4M20 4L9.5 14.5M20 4h-4M20 4v4M7 17l-3 3M17 17l3 3M6 14l4 4M18 14l-4 4"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─────────────────────────── Screenshot carousel ────────────────────────── */

const SCREENS: { src: string; caption: string; kind: "app" | "world" }[] = [
  { kind: "app", src: `${ART}/screens/01_map_home.webp`, caption: "Your streets, reimagined as a treasure map" },
  { kind: "world", src: `${ART}/forest/forest_leap_catch.webp`, caption: "One leap between you and the glow" },
  { kind: "app", src: `${ART}/screens/02_catch_moment.webp`, caption: "The catch moment, in cinematic AR" },
  { kind: "world", src: `${ART}/forest/forest_boy_running.webp`, caption: "Chase the glow off the beaten path" },
  { kind: "app", src: `${ART}/screens/06_your_explorer.webp`, caption: "Shape your Explorer, wear your level" },
  { kind: "world", src: `${ART}/forest/forest_duo_walk.webp`, caption: "Every walk becomes an expedition" },
  { kind: "app", src: `${ART}/screens/07_chest_moment.webp`, caption: "A friend cracks a chest, the whole map cheers" },
];

// Tallest slide media (228px phone frame at 402x874 aspect, plus bezel padding).
// Every slide reserves this height so mixed aspect ratios never shift the layout.
const SLIDE_MEDIA_H = 512;

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
    // Slides have mixed widths (phone vs cinematic), so find the nearest one
    // to the current scroll position instead of dividing by a fixed width.
    const pos = track.scrollLeft + 20;
    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < Math.min(track.children.length, SCREENS.length); i++) {
      const dist = Math.abs((track.children[i] as HTMLElement).offsetLeft - pos);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    }
    setIndex(nearest);
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
              <div
                style={{
                  height: SLIDE_MEDIA_H,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  perspective: 900,
                }}
              >
                <TiltBox>
                  {s.kind === "world" ? (
                    <WorldFrame src={s.src} alt={s.caption} />
                  ) : (
                    <PhoneFrame src={s.src} alt={s.caption} width={228} />
                  )}
                </TiltBox>
              </div>
              <figcaption
                style={{
                  marginTop: 16,
                  fontSize: 13.5,
                  color: TEXT50,
                  textAlign: "center",
                  maxWidth: s.kind === "world" ? 300 : 228,
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
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
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
                boxShadow: index === i ? "0 0 10px rgba(0,255,136,0.6)" : "none",
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

function WorldFrame({ src, alt }: { src: string; alt: string }) {
  // Cinematic 2:3 theme art. The forest renders vary a few pixels in aspect,
  // so a fixed frame with object-fit: cover keeps them uniform without stretching.
  const width = 320;
  const height = 470;
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 26,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
        background: "#000",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 24px 70px rgba(0,0,0,0.6), 0 0 46px rgba(0,255,136,0.22)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
      />
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          padding: "4px 10px",
          borderRadius: 999,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: GREEN,
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(0,255,136,0.35)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        World
      </span>
    </div>
  );
}

// Pointer-tracked 3D tilt for carousel media — the frame leans toward the
// cursor (rotateX/rotateY via CSS vars) and eases back on leave. Desktop
// pointers only; inert under prefers-reduced-motion.
function TiltBox({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${(px * 10).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${(-py * 8).toFixed(2)}deg`);
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rx", "0deg");
  }

  return (
    <div ref={ref} className="bwTiltBox" onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
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

function PhoneFrame({
  src,
  alt,
  width,
  className,
  eager,
}: {
  src: string;
  alt: string;
  width: number;
  className?: string;
  eager?: boolean;
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
        boxShadow: "0 24px 70px rgba(0,0,0,0.6), 0 0 46px rgba(0,255,136,0.26)",
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
        loading={eager ? "eager" : "lazy"}
        decoding="async"
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
            {PRIVACY_POINTS.map((p, i) => (
              <Reveal key={p.title} delay={i * 70}>
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
                      border: `1px solid rgba(0,255,136,0.3)`,
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
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
              background: "radial-gradient(closest-side, rgba(0,255,136,0.16), transparent 70%)",
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
              filter: "drop-shadow(0 16px 40px rgba(0,255,136,0.25))",
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
        padding: "40px 20px 30px",
        overflow: "hidden",
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
          position: "relative",
          zIndex: 1,
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
      <p
        style={{
          maxWidth: 1180,
          margin: "18px auto 0",
          color: "rgba(255,255,255,0.32)",
          fontSize: 11.5,
          position: "relative",
          zIndex: 1,
        }}
      >
        Music: &ldquo;Voxel Revolution&rdquo; by Kevin MacLeod (
        <a
          href="https://incompetech.com"
          style={{ color: "inherit", textDecoration: "underline" }}
        >
          incompetech.com
        </a>
        ), licensed under CC BY 4.0
      </p>
      {/* boy-cap explorer leaning against the watermark, bottom-right */}
      <span
        aria-hidden
        className="bwFootExp"
        style={{
          position: "absolute",
          right: "5%",
          bottom: 6,
          zIndex: 1,
          pointerEvents: "none",
          transform: "rotate(-4deg)",
          display: "block",
          height: 112,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${EXPLORERS}/explorer_boy_cap.webp`}
          alt=""
          width={325}
          height={425}
          loading="lazy"
          decoding="async"
          className="bwExpBob"
          style={{
            height: "100%",
            width: "auto",
            display: "block",
            filter:
              "drop-shadow(0 0 18px rgba(0,255,136,0.3)) drop-shadow(0 10px 18px rgba(0,0,0,0.45))",
            animationDuration: "8.5s",
            animationDelay: "1.1s",
          }}
        />
      </span>
      {/* Giant dim watermark */}
      <div
        aria-hidden
        style={{
          marginTop: 26,
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: "clamp(64px, 13.5vw, 210px)",
          lineHeight: 0.86,
          letterSpacing: "0.04em",
          textAlign: "center",
          whiteSpace: "nowrap",
          color: "transparent",
          WebkitTextStroke: "1px rgba(255,255,255,0.06)",
          userSelect: "none",
          pointerEvents: "none",
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), transparent 92%)",
          WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), transparent 92%)",
          marginBottom: "-0.22em",
        }}
      >
        BLINKWORLD
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
    <Reveal>
      <div
        style={{
          textAlign: align,
          maxWidth: align === "center" ? 640 : 520,
          margin: align === "center" ? "0 auto" : 0,
        }}
      >
        <p className="bwKicker">
          <span>{kicker}</span>
          <span className="bwKickerLine" aria-hidden />
        </p>
        <h2
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: "clamp(28px, 4vw, 44px)",
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            margin: "12px 0 0",
          }}
        >
          {title}
        </h2>
        <p style={{ margin: "14px 0 0", color: TEXT70, fontSize: 16, lineHeight: 1.6 }}>{sub}</p>
      </div>
    </Reveal>
  );
}

// Rise + de-blur on first scroll into view, with optional stagger delay.
// Renders visible when IntersectionObserver is unavailable or motion is
// reduced.
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────── Styles ────────────────────────────────── */

const STYLE = `
.bwRoot { -webkit-font-smoothing: antialiased; }

@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}

/* filmic noise overlay */
.bwNoise {
  position: fixed;
  inset: 0;
  z-index: 40;
  pointer-events: none;
  opacity: 0.028;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 160px 160px;
}

/* ── nav ── */
.bwNavLink {
  position: relative;
  color: rgba(255,255,255,0.72);
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  padding: 4px 0;
  transition: color 0.2s ease;
}
.bwNavLink:hover { color: #fff; }
.bwNavLink::after {
  content: "";
  position: absolute;
  left: 0;
  right: 100%;
  bottom: -2px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, ${GREEN}, ${GREEN_LIME});
  transition: right 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.bwNavLink:hover::after { right: 0; }
.bwNavActive { color: ${GREEN}; }
.bwNavActive::after { right: 0; box-shadow: 0 0 10px rgba(0,255,136,0.6); }
.bwNavCta {
  position: relative;
  overflow: hidden;
  color: #05060C;
  background: linear-gradient(120deg, ${GREEN}, #4DFFA6);
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 700;
  padding: 9px 18px;
  border-radius: 999px;
  box-shadow: 0 2px 18px rgba(0,255,136,0.4), inset 0 1px 0 rgba(255,255,255,0.4);
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}
.bwNavCta::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: -80%;
  width: 50%;
  transform: skewX(-20deg);
  background: linear-gradient(105deg, transparent, rgba(255,255,255,0.55), transparent);
  transition: left 0.55s ease;
}
.bwNavCta:hover { transform: translateY(-1px); box-shadow: 0 4px 26px rgba(0,255,136,0.55), inset 0 1px 0 rgba(255,255,255,0.4); }
.bwNavCta:hover::after { left: 130%; }
@media (max-width: 760px) {
  .bwNavLink { display: none; }
}

/* ── hero ── */
.bwDownloadBtn {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 54px;
  padding: 0 32px;
  border-radius: 999px;
  background: linear-gradient(120deg, ${GREEN}, #4DFFA6);
  color: #05060C;
  font-family: ${FONT_DISPLAY};
  font-size: 16.5px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  box-shadow: 0 4px 28px rgba(0,255,136,0.45), inset 0 1px 0 rgba(255,255,255,0.45);
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}
.bwDownloadBtn::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: -80%;
  width: 50%;
  transform: skewX(-20deg);
  background: linear-gradient(105deg, transparent, rgba(255,255,255,0.6), transparent);
  transition: left 0.6s ease;
}
.bwDownloadBtn:hover { transform: translateY(-1px); box-shadow: 0 6px 36px rgba(0,255,136,0.6), inset 0 1px 0 rgba(255,255,255,0.45); }
.bwDownloadBtn:hover::after { left: 130%; }

.bwHeroGrid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 48px;
  align-items: center;
}
@media (max-width: 900px) {
  .bwHeroGrid { grid-template-columns: 1fr; gap: 72px; }
}

.bwHeroPhones { min-height: 420px; display: flex; justify-content: center; align-items: center; }
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

/* ── hero explorers ── */
.bwExpBob { animation: bwExpBob 8s ease-in-out infinite; }
@keyframes bwExpBob {
  0%, 100% { transform: translateY(0) rotate(-1.4deg); }
  50% { transform: translateY(-13px) rotate(1.4deg); }
}
/* Wide screens: the pair floats mid-height in the viewport margins beside
   the 1180px container — mirrored insets, same band — clear of the headline
   and waitlist form. The clamp pins them 24px outside the container edge,
   never drifting more than 170px out on ultrawide monitors (the root's
   overflow-x: hidden clips nothing at these widths). */
.bwExpL, .bwExpR { top: calc(50% - 96px); height: 142px; }
.bwExpL { left: clamp(-170px, calc((1180px - 100vw) / 2 + 24px), -20px); }
.bwExpR { right: clamp(-170px, calc((1180px - 100vw) / 2 + 24px), -20px); }
.bwExpP { left: 58%; bottom: 6%; height: 100px; }
@media (max-width: 1399px) {
  /* no margin left beside the container — drop the pair to the bottom
     corners, inside the hero's bottom padding, below text and form */
  .bwExpL, .bwExpR { top: auto; bottom: 0; height: 84px; }
  .bwExpL { left: 1.5%; }
  .bwExpR { right: 1.5%; }
}
@media (max-width: 900px) {
  /* stacked layout: phones sit at the bottom of the hero — flank them */
  .bwExpL, .bwExpR { bottom: 10%; height: 96px; }
  .bwExpL { left: 2%; }
  .bwExpR { right: 2%; }
  .bwExpP { display: none; }
}
@media (max-width: 480px) {
  .bwExpL, .bwExpR { bottom: 5%; height: 76px; }
  .bwExpL { left: 1%; }
  .bwExpR { right: 1%; }
}

/* ── choose-your-explorer pedestals ── */
.bwExpRow {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 18px;
}
.bwExpCell { flex: 0 1 188px; min-width: 148px; }
.bwPedestal {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 26px 16px 18px;
  border-radius: 20px;
  overflow: hidden;
  background: ${GLASS_BG};
  border: ${CARD_BORDER};
  box-shadow: ${GLASS_SHADOW};
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s ease, box-shadow 0.3s ease;
}
.bwPedestalFloor {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  width: 78%;
  height: 30px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(0,255,136,0.45), transparent 72%);
  filter: blur(10px);
  opacity: 0.65;
  transition: opacity 0.35s ease;
}
.bwPedestalArt {
  position: relative;
  height: 150px;
  width: auto;
  display: block;
  filter: drop-shadow(0 12px 24px rgba(0,255,136,0.26));
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.bwPedestalName {
  position: relative;
  font-family: ${FONT_DISPLAY};
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.72);
  transition: color 0.3s ease;
}
.bwPedestal:hover {
  transform: translateY(-8px) rotate(-1.5deg);
  border-color: rgba(0,255,136,0.45);
  box-shadow: ${GLASS_SHADOW}, 0 0 44px rgba(0,255,136,0.18);
}
.bwPedestal:hover .bwPedestalFloor { opacity: 1; }
.bwPedestal:hover .bwPedestalArt { transform: translateY(-5px) scale(1.04); }
.bwPedestal:hover .bwPedestalName { color: ${GREEN}; }
@media (max-width: 620px) {
  .bwExpCell { flex: 0 1 46%; min-width: 132px; }
  .bwPedestalArt { height: 122px; }
}

/* ── footer explorer cameo ── */
@media (max-width: 760px) {
  .bwFootExp { display: none; }
}

/* kinetic headline */
.bwWord {
  display: inline-block;
  animation: bwWordIn 0.85s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes bwWordIn {
  from { opacity: 0; transform: translateY(30px); filter: blur(10px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}
.bwShimmer {
  display: inline-block;
  background: linear-gradient(110deg, ${GREEN} 20%, ${GREEN_LIME} 38%, #EAFFF4 50%, ${GREEN} 62%, ${GREEN} 80%);
  background-size: 240% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 26px rgba(0,255,136,0.4));
  animation: bwSheen 4s linear 1.4s infinite;
}
@keyframes bwSheen {
  from { background-position: 120% 0; }
  to { background-position: -120% 0; }
}

.bwRise { animation: bwRiseIn 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes bwRiseIn {
  from { opacity: 0; transform: translateY(26px); filter: blur(6px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}

/* ── waitlist ── */
.bwWaitCapsule {
  display: flex;
  gap: 8px;
  padding: 7px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 34px rgba(0,0,0,0.35);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
.bwWaitCapsule:focus-within {
  border-color: rgba(0,255,136,0.55);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 3px rgba(0,255,136,0.14), 0 0 34px rgba(0,255,136,0.2);
}
.bwWaitInput {
  flex: 1;
  min-width: 0;
  height: 46px;
  padding: 0 18px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 15px;
  font-family: inherit;
  outline: none;
}
.bwWaitInput::placeholder { color: rgba(255,255,255,0.35); }
.bwWaitBtn {
  position: relative;
  overflow: hidden;
  height: 46px;
  padding: 0 24px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(120deg, ${GREEN}, #4DFFA6);
  color: #05060C;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 24px rgba(0,255,136,0.4), inset 0 1px 0 rgba(255,255,255,0.45);
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, opacity 0.2s ease;
}
.bwWaitBtn::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: -80%;
  width: 50%;
  transform: skewX(-20deg);
  background: linear-gradient(105deg, transparent, rgba(255,255,255,0.6), transparent);
  transition: left 0.6s ease;
}
.bwWaitBtn:hover { box-shadow: 0 6px 34px rgba(0,255,136,0.6), inset 0 1px 0 rgba(255,255,255,0.45); }
.bwWaitBtn:hover::after { left: 130%; }
.bwWaitBtn:disabled { opacity: 0.6; cursor: default; }
@media (max-width: 420px) {
  .bwWaitCapsule { flex-direction: column; border-radius: 26px; }
  .bwWaitBtn { width: 100%; }
}
.bwWaitDone { animation: bwPopIn 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
@keyframes bwPopIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
.bwCheckPath {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  animation: bwCheckDraw 0.5s ease 0.25s forwards;
}
@keyframes bwCheckDraw { to { stroke-dashoffset: 0; } }

/* ── bento features ── */
.bwBento {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 18px;
}
.bwB0 { grid-column: span 4; grid-row: span 2; }
.bwB1, .bwB2, .bwB3, .bwB4, .bwB5 { grid-column: span 2; }
@media (max-width: 980px) {
  .bwB0 { grid-column: span 6; grid-row: auto; }
  .bwB1, .bwB2, .bwB3, .bwB4, .bwB5 { grid-column: span 3; }
}
@media (max-width: 620px) {
  .bwB0, .bwB1, .bwB2, .bwB3, .bwB4, .bwB5 { grid-column: span 6; }
}
.bwBento > div, .bwBento article { height: 100%; }

.bwBentoCard {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 22px;
  overflow: hidden;
  background: ${GLASS_BG};
  border: ${CARD_BORDER};
  box-shadow: ${GLASS_SHADOW};
  height: 100%;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s ease, box-shadow 0.3s ease;
}
.bwBentoCard::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(280px circle at var(--mx, 50%) var(--my, 50%), rgba(0,255,136,0.13), transparent 65%);
  opacity: 0;
  transition: opacity 0.35s ease;
}
.bwBentoCard:hover {
  transform: translateY(-5px);
  border-color: rgba(0,255,136,0.4);
  box-shadow: ${GLASS_SHADOW}, 0 0 40px rgba(0,255,136,0.12);
}
.bwBentoCard:hover::after { opacity: 1; }
.bwBentoCard:hover .bwBentoScene { transform: scale(1.05); }
.bwBentoScene { transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1); }

.bwBentoIcon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${GREEN};
  background: rgba(0,255,136,0.1);
  border: 1px solid rgba(0,255,136,0.3);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}
.bwBentoCard:hover .bwBentoIcon {
  transform: scale(1.08);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 0 18px rgba(0,255,136,0.35);
}

/* ── carousel ── */
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
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.bwCarSlide:hover { transform: translateY(-6px); }
.bwCarTrack::after { content: ""; flex: 0 0 8px; }

.bwTiltBox {
  transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  transform-style: preserve-3d;
  transition: transform 0.28s ease-out;
  will-change: transform;
}

.bwCarArrow {
  position: absolute;
  top: 42%;
  z-index: 5;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(10,12,20,0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #fff;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 24px rgba(0,0,0,0.4);
  transition: border-color 0.2s ease, background 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease;
}
.bwCarArrow:hover {
  border-color: rgba(0,255,136,0.6);
  background: rgba(16,20,30,0.9);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 0 24px rgba(0,255,136,0.25);
}
.bwCarArrow:disabled { opacity: 0.3; cursor: default; }
.bwCarPrev { left: 10px; }
.bwCarNext { right: 10px; }
@media (min-width: 761px) {
  .bwCarArrow { display: flex; }
}

/* ── privacy panel ── */
.bwPrivacyPanel {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  padding: clamp(28px, 4.5vw, 56px);
  border-radius: 28px;
  border: ${CARD_BORDER};
  background: ${GLASS_BG};
  box-shadow: ${GLASS_SHADOW};
}
@media (max-width: 760px) {
  .bwPrivacyArt { order: -1; flex-basis: 100%; }
}

/* ── section header kicker ── */
.bwKicker {
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
  font-family: ${FONT_DISPLAY};
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${GREEN};
  margin: 0;
}
.bwKickerLine {
  height: 2px;
  width: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, ${GREEN}, transparent);
  transform: scaleX(0);
}
.bwShown .bwKickerLine {
  animation: bwSweepIn 0.9s 0.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes bwSweepIn { to { transform: scaleX(1); } }

/* ── scroll reveals ── */
.bwHidden {
  opacity: 0;
  transform: translateY(26px) scale(0.985);
  filter: blur(5px);
  transition: opacity 0.75s cubic-bezier(0.22, 1, 0.36, 1),
              transform 0.75s cubic-bezier(0.22, 1, 0.36, 1),
              filter 0.75s cubic-bezier(0.22, 1, 0.36, 1);
}
.bwHidden.bwShown { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }

@media (prefers-reduced-motion: reduce) {
  .bwFloat, .bwPhoneFront, .bwPhoneBack, .bwWord, .bwRise, .bwShimmer,
  .bwWaitDone, .bwCheckPath, .bwKickerLine, .bwNavCta::after, .bwWaitBtn::after,
  .bwDownloadBtn::after, .bwExpBob {
    animation: none !important;
    transition: none !important;
  }
  .bwPedestal, .bwPedestalArt, .bwPedestalFloor, .bwPedestalName { transition: none !important; }
  .bwPedestal:hover { transform: none; }
  .bwPedestal:hover .bwPedestalArt { transform: none; }
  .bwWord, .bwRise { opacity: 1; transform: none; filter: none; }
  .bwShimmer { background-position: 50% 0; }
  .bwKickerLine { transform: scaleX(1); }
  .bwCheckPath { stroke-dashoffset: 0; }
  .bwHidden { opacity: 1; transform: none; filter: none; transition: none; }
  .bwBentoCard, .bwBentoScene, .bwCarSlide, .bwBentoIcon { transition: none !important; }
  .bwBentoCard:hover .bwBentoScene { transform: none; }
  .bwTiltBox { transform: none !important; transition: none !important; }
}
`;
