"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  motion,
  useMotionValue,
  useSpring,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import CountUp from "react-countup";
import { useInView } from "react-intersection-observer";
import { useAuth } from "@/components/providers";
import AuthModal from "@/components/AuthModal";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Load the globe only client-side — never SSR
const HeroMapPreview = dynamic(() => import("../HeroMapPreview"), { ssr: false });

const BG = "#0a0a0f";
const GREEN = "#00FF88";
const GREEN2 = "#88FF00";
const WHITE = "#FFFFFF";
const MUTED = "#8a8a99";
const BORDER = "rgba(0,255,136,0.10)";
const MINT_URL = "https://mintmyblink.com";

const TICKER_ITEMS = [
  "The Eye opens over Tokyo",
  "Phoenix sighting in Brooklyn",
  "Council awakens worldwide",
  "Sprites stirring in Lagos",
  "A Cyclops blinks in Lisbon",
  "Hushlings detected in Berlin",
  "Mythic spotted near Kyoto",
  "The First Eye is always watching",
];

const KEYFRAMES = `
@keyframes auroraBreath {
  0%   { transform: rotate(0deg) scale(1);    opacity: 0.10; }
  33%  { transform: rotate(120deg) scale(1.15); opacity: 0.15; }
  66%  { transform: rotate(240deg) scale(0.95); opacity: 0.09; }
  100% { transform: rotate(360deg) scale(1);    opacity: 0.10; }
}
@keyframes auroraBreath2 {
  0%   { transform: rotate(0deg) scale(1.1);    opacity: 0.07; }
  50%  { transform: rotate(-180deg) scale(0.9); opacity: 0.13; }
  100% { transform: rotate(-360deg) scale(1.1); opacity: 0.07; }
}
@keyframes liveDotPulse {
  0%, 100% { transform: scale(1);   box-shadow: 0 0 6px rgba(0,255,136,0.9); }
  50%       { transform: scale(1.5); box-shadow: 0 0 14px rgba(0,255,136,1), 0 0 28px rgba(0,255,136,0.6); }
}
@keyframes buttonGlow {
  0%, 100% { box-shadow: 0 0 24px rgba(0,255,136,0.5), 0 0 56px rgba(0,255,136,0.2); }
  50%       { box-shadow: 0 0 44px rgba(0,255,136,0.9), 0 0 100px rgba(0,255,136,0.4); }
}
@keyframes globeFadeIn {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .hero-aurora, .hero-aurora-2, .hero-live-dot { animation: none !important; }
}
`;

const wordVariants: Variants = {
  hidden: { y: 52, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 },
  }),
};

export function Hero() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const globeRef = useRef<HTMLDivElement>(null);

  // Mouse orb
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const orbX = useSpring(rawX, { stiffness: 35, damping: 22 });
  const orbY = useSpring(rawY, { stiffness: 35, damping: 22 });

  // Scroll parallax on text (subtle upward drift)
  const { scrollY } = useScroll();
  const textY = useTransform(scrollY, [0, 500], [0, -60]);
  const textOpacity = useTransform(scrollY, [0, 350], [1, 0]);

  // Stats trigger
  const [statsRef, statsInView] = useInView({ triggerOnce: true, threshold: 0.3 });

  // Apple-style GSAP scroll: globe drifts + scales as you scroll into the page
  useGSAP(() => {
    if (!globeRef.current || !heroRef.current) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 640px)", () => {
      // Globe: slow drift right + subtle scale-up as user scrolls out of hero
      gsap.to(globeRef.current, {
        x: 40,
        scale: 1.06,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.4,
        },
      });
    });
    return () => mm.revert();
  }, { scope: heroRef });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      rawX.set(e.clientX - rect.left - rect.width / 2);
      rawY.set(e.clientY - rect.top - rect.height / 2);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [rawX, rawY]);

  const enterWorld = () => {
    if (loading) return;
    if (user) router.push("/map");
    else setAuthOpen(true);
  };

  return (
    <section
      ref={heroRef}
      style={{
        position: "relative",
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: BG,
        paddingBottom: 80, // room for ticker
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* ── SVG grid overlay ── */}
      <svg
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.025,
        }}
      >
        <defs>
          <pattern id="hero-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke={GREEN} strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>

      {/* ── Breathing aurora blobs ── */}
      <div
        className="hero-aurora"
        aria-hidden
        style={{
          position: "absolute",
          top: "8%",
          left: "50%",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle at center, ${GREEN}1A 0%, ${GREEN}00 70%)`,
          transform: "translateX(-50%)",
          filter: "blur(90px)",
          animation: "auroraBreath 14s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        className="hero-aurora-2"
        aria-hidden
        style={{
          position: "absolute",
          bottom: "15%",
          right: "-10%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle at center, ${GREEN2}14 0%, ${GREEN2}00 70%)`,
          filter: "blur(110px)",
          animation: "auroraBreath2 18s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ── Mouse-tracking orb ── */}
      <motion.div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle at center, ${GREEN}18 0%, ${GREEN}00 70%)`,
          filter: "blur(90px)",
          pointerEvents: "none",
          zIndex: 0,
          x: orbX,
          y: orbY,
          translateX: "-50%",
          translateY: "-50%",
        }}
      />

      {/* ══════════════════════════════════════════
          MAIN LAYOUT: Globe left | Text right (desktop)
          Globe faded behind text (mobile)
          ══════════════════════════════════════════ */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 1200,
          padding: "0 clamp(20px, 5vw, 60px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(0px, 4vw, 60px)",
          flexWrap: "wrap",
          boxSizing: "border-box",
        }}
      >
        {/* ── GLOBE ── */}
        <motion.div
          ref={globeRef}
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          style={{
            flex: "0 0 auto",
            width: "clamp(280px, 44vw, 560px)",
            aspectRatio: "1 / 1",
            position: "relative",
          }}
        >
          {/* Outer glow ring */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: "-10%",
              borderRadius: "50%",
              background: `radial-gradient(circle at center, ${GREEN}10 0%, transparent 65%)`,
              filter: "blur(30px)",
              animation: "auroraBreath 8s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
          <HeroMapPreview />
        </motion.div>

        {/* ── TEXT SIDE ── */}
        <motion.div
          style={{
            flex: "1 1 320px",
            maxWidth: 580,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            textAlign: "left",
            y: textY,
            opacity: textOpacity,
          }}
        >
          {/* Live badge */}
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontSize: 11,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: GREEN,
              fontWeight: 800,
              marginBottom: 24,
              padding: "7px 16px 7px 14px",
              border: `1px solid ${BORDER}`,
              borderRadius: 999,
              background: "rgba(0,255,136,0.04)",
              textShadow: "0 0 14px rgba(0,255,136,0.5)",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              className="hero-live-dot"
              aria-hidden
              style={{
                display: "inline-block",
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: GREEN,
                animation: "liveDotPulse 1.6s ease-in-out infinite",
                flexShrink: 0,
              }}
            />
            Live · Real-World Catch Game · Ethereum
          </motion.span>

          {/* Staggered headline */}
          <motion.h1
            initial="hidden"
            animate="visible"
            style={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontWeight: 900,
              fontSize: "clamp(42px, 7vw, 88px)",
              lineHeight: 0.95,
              letterSpacing: "-0.045em",
              margin: "0 0 28px",
              overflow: "visible",
            }}
          >
            {[
              { text: "CATCH CREATURES.", color: WHITE },
              { text: "EARN $BLINK.", gradient: true },
              { text: "WIN REAL ETH.", color: WHITE },
            ].map((line, li) => (
              <motion.span
                key={li}
                custom={li}
                variants={wordVariants}
                style={{
                  display: "block",
                  textShadow: "0 4px 40px rgba(0,0,0,0.7)",
                  ...(line.gradient
                    ? {
                        background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN2} 100%)`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }
                    : { color: line.color }),
                }}
              >
                {line.text}
              </motion.span>
            ))}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            style={{
              fontSize: "clamp(15px, 1.8vw, 18px)",
              color: WHITE,
              opacity: 0.82,
              margin: "0 0 32px",
              maxWidth: 500,
              lineHeight: 1.6,
            }}
          >
            Mystical creatures spawn on a real-world map around you, right now. Walk to them.
            Catch them. Earn $BLINK on every catch. Find real ETH drops hidden by other players.
          </motion.p>

          {/* Stats row */}
          <motion.div
            ref={statsRef}
            initial={{ opacity: 0, y: 16 }}
            animate={statsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "clamp(16px, 3vw, 32px)",
              marginBottom: 36,
              flexWrap: "wrap",
            }}
          >
            {[
              { end: 51, suffix: "+", label: "Explorers" },
              { end: 20, suffix: "K+", label: "Creatures" },
              { end: 1, suffix: "", label: "Live on Eth" },
            ].map((stat, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span
                  style={{
                    fontFamily: "Space Grotesk, Inter, sans-serif",
                    fontSize: "clamp(20px, 2.5vw, 28px)",
                    fontWeight: 900,
                    color: GREEN,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                    textShadow: "0 0 20px rgba(0,255,136,0.4)",
                  }}
                >
                  {statsInView ? (
                    <CountUp end={stat.end} suffix={stat.suffix} duration={2} useEasing />
                  ) : (
                    `0${stat.suffix}`
                  )}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: MUTED,
                    fontWeight: 700,
                  }}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
            style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}
          >
            <motion.button
              type="button"
              onClick={enterWorld}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                padding: "18px 40px",
                borderRadius: 999,
                border: "none",
                background: `linear-gradient(135deg, ${GREEN}, ${GREEN2})`,
                color: BG,
                fontSize: "clamp(14px, 1.8vw, 16px)",
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                animation: "buttonGlow 2.6s ease-in-out infinite",
                whiteSpace: "nowrap",
              }}
            >
              Enter the world →
            </motion.button>

            <motion.a
              href={MINT_URL}
              target="_blank"
              rel="noreferrer"
              whileHover={{ scale: 1.02 }}
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                padding: "12px 24px",
                borderRadius: 999,
                border: `1px solid ${GREEN}55`,
                background: "rgba(0,255,136,0.05)",
                color: GREEN,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                whiteSpace: "nowrap",
              }}
            >
              Mint your first BLINK · 0.25 ETH
            </motion.a>
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: MUTED,
                fontWeight: 700,
              }}
            >
              1-of-1, on Ethereum forever
            </span>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Ticker ── */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "14px 0",
          background: "rgba(13,13,20,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: `1px solid ${BORDER}`,
          overflow: "hidden",
          zIndex: 10,
        }}
      >
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 55, ease: "linear", repeat: Infinity }}
          style={{
            display: "flex",
            gap: 44,
            whiteSpace: "nowrap",
            width: "max-content",
          }}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span
              key={i}
              style={{
                fontSize: 12,
                color: MUTED,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              <span style={{ color: GREEN, marginRight: 14 }}>·</span>
              {item}
            </span>
          ))}
        </motion.div>
      </div>

      <AuthModal
        open={authOpen}
        initialMode="signup"
        onClose={() => setAuthOpen(false)}
        onSuccess={() => router.push("/map")}
      />
    </section>
  );
}
