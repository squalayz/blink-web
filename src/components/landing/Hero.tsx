"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/components/providers";
import AuthModal from "@/components/AuthModal";

const BG = "#050508";
const GREEN = "#00FF88";
const WHITE = "#FFFFFF";
const MUTED = "#8a8a99";
const BORDER = "rgba(0,255,136,0.14)";

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

// Floating B-orb accents. Uses the transparent PNG cutout so only the
// glowing orb shows over the photo. Animations touch transform/opacity only.
type OrbSpec = {
  size: number;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  anim: string;
  duration: number;
  delay: number;
  opacity: number;
};

const ORBS: OrbSpec[] = [
  { size: 96, top: "12%", left: "6%", anim: "orbBobA", duration: 7.5, delay: 0, opacity: 0.9 },
  { size: 56, top: "22%", right: "10%", anim: "orbBobB", duration: 9, delay: 1.2, opacity: 0.75 },
  { size: 40, top: "48%", left: "3%", anim: "orbBobC", duration: 8, delay: 2.4, opacity: 0.6 },
  { size: 72, bottom: "26%", right: "5%", anim: "orbBobA", duration: 10, delay: 0.8, opacity: 0.8 },
  { size: 34, top: "8%", right: "34%", anim: "orbBobB", duration: 11, delay: 3.2, opacity: 0.55 },
];

const KEYFRAMES = `
@keyframes orbBobA {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50%      { transform: translate3d(6px, -22px, 0) scale(1.04); }
}
@keyframes orbBobB {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50%      { transform: translate3d(-8px, -16px, 0) scale(1.06); }
}
@keyframes orbBobC {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50%      { transform: translate3d(4px, -26px, 0) scale(0.97); }
}
@keyframes orbGlowPulse {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50%      { opacity: 0.8;  transform: scale(1.18); }
}
@keyframes heroFadeUp {
  from { opacity: 0; transform: translateY(26px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes heroButtonGlow {
  0%, 100% { box-shadow: 0 0 24px rgba(0,255,136,0.5), 0 0 56px rgba(0,255,136,0.2); }
  50%      { box-shadow: 0 0 44px rgba(0,255,136,0.9), 0 0 100px rgba(0,255,136,0.4); }
}
@keyframes heroTicker {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.hero-fade-1 { animation: heroFadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
.hero-fade-2 { animation: heroFadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both; }
.hero-fade-3 { animation: heroFadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both; }
.hero-fade-4 { animation: heroFadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.55s both; }
.hero-cta-main:hover { transform: scale(1.04); }
.hero-cta-main:active { transform: scale(0.97); }
.hero-cta-ghost:hover { background: rgba(0,255,136,0.12); }
@media (prefers-reduced-motion: reduce) {
  .hero-orb, .hero-orb-glow, .hero-cta-main, .hero-ticker-track,
  .hero-fade-1, .hero-fade-2, .hero-fade-3, .hero-fade-4 {
    animation: none !important;
  }
  .hero-fade-1, .hero-fade-2, .hero-fade-3, .hero-fade-4 { opacity: 1; }
}
`;

export function Hero() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");

  const openAuth = (mode: "signup" | "signin") => {
    if (loading) return;
    if (user) {
      router.push("/map");
      return;
    }
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <section
      style={{
        position: "relative",
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        overflow: "hidden",
        background: BG,
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* ── Full-bleed cinematic backdrop ── */}
      <Image
        src="/brand/hero-mountain-hd.webp"
        alt=""
        aria-hidden
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        style={{
          objectFit: "cover",
          // 16:9 frame — adventurer left-of-center, peak center, chest right.
          // Bias slightly left so the adventurer survives portrait crops.
          objectPosition: "46% 32%",
          zIndex: 0,
        }}
      />

      {/* Dark overlay gradients for legibility: heavy at the bottom where
          the copy sits, light vignette up top under the sticky nav. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background: `
            linear-gradient(to top,
              ${BG} 0%,
              rgba(5,5,8,0.88) 18%,
              rgba(5,5,8,0.45) 42%,
              rgba(5,5,8,0.15) 65%,
              rgba(5,5,8,0.55) 100%),
            radial-gradient(ellipse at 50% 95%, rgba(0,255,136,0.10) 0%, transparent 55%)
          `,
          pointerEvents: "none",
        }}
      />

      {/* ── Floating B-orb accents ── */}
      {ORBS.map((orb, i) => {
        const { size, anim, duration, delay, opacity, ...pos } = orb;
        return (
          <div
            key={i}
            aria-hidden
            className="hero-orb"
            style={{
              position: "absolute",
              width: size,
              height: size,
              zIndex: 2,
              pointerEvents: "none",
              animation: `${anim} ${duration}s ease-in-out infinite`,
              animationDelay: `${delay}s`,
              willChange: "transform",
              ...pos,
            }}
          >
            <div
              className="hero-orb-glow"
              style={{
                position: "absolute",
                inset: "-40%",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(0,255,136,0.45) 0%, rgba(0,255,136,0) 70%)",
                animation: `orbGlowPulse ${duration * 0.6}s ease-in-out infinite`,
                animationDelay: `${delay}s`,
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-orb-transparent.png"
              alt=""
              loading={i < 2 ? "eager" : "lazy"}
              decoding="async"
              width={size}
              height={size}
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                opacity,
                display: "block",
              }}
            />
          </div>
        );
      })}

      {/* ── Copy + CTAs ── */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
          padding: "min(38vh, 380px) clamp(20px, 5vw, 60px) 120px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        <span
          className="hero-fade-1"
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontSize: 11,
            letterSpacing: "0.34em",
            textTransform: "uppercase",
            color: GREEN,
            fontWeight: 800,
            padding: "8px 18px",
            border: `1px solid ${BORDER}`,
            borderRadius: 999,
            background: "rgba(5,5,8,0.55)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            textShadow: "0 0 14px rgba(0,255,136,0.5)",
            marginBottom: 26,
          }}
        >
          Live · Real-World Catch Game · Ethereum
        </span>

        <h1
          className="hero-fade-2"
          style={{
            fontFamily: "Space Grotesk, ui-rounded, 'SF Pro Rounded', Inter, sans-serif",
            fontWeight: 900,
            fontSize: "clamp(58px, 12vw, 140px)",
            lineHeight: 0.95,
            // The app's splash wordmark: weight .black, wide tracking.
            letterSpacing: "0.14em",
            marginLeft: "0.14em",
            margin: "0 0 12px",
            color: WHITE,
            textShadow:
              "0 6px 50px rgba(0,0,0,0.85), 0 0 80px rgba(0,255,136,0.25)",
          }}
        >
          BLINK
        </h1>

        <p
          className="hero-fade-3"
          style={{
            fontFamily: "Space Grotesk, ui-rounded, 'SF Pro Rounded', Inter, sans-serif",
            fontSize: "clamp(13px, 2vw, 17px)",
            fontWeight: 900,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            margin: "0 0 18px",
            color: GREEN,
            textShadow: "0 0 28px rgba(0,255,136,0.55), 0 2px 24px rgba(0,0,0,0.8)",
          }}
        >
          The World Is Alive
        </p>

        <p
          className="hero-fade-3"
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontSize: "clamp(16px, 2.4vw, 24px)",
            fontWeight: 800,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            margin: "0 0 14px",
            color: WHITE,
            textShadow: "0 2px 24px rgba(0,0,0,0.8)",
          }}
        >
          Catch creatures. Earn $BLINK. Win real ETH.
        </p>

        <p
          className="hero-fade-3"
          style={{
            fontSize: "clamp(14px, 1.8vw, 17px)",
            color: WHITE,
            opacity: 0.85,
            margin: "0 0 36px",
            maxWidth: 560,
            lineHeight: 1.65,
            textShadow: "0 2px 18px rgba(0,0,0,0.8)",
          }}
        >
          Mystical creatures spawn on a real-world map around you, right now.
          Walk to them. Catch them. Fill your chest with $BLINK on every catch
          — and find real ETH drops hidden by other players.
        </p>

        <div
          className="hero-fade-4"
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            className="hero-cta-main"
            onClick={() => openAuth("signup")}
            style={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              padding: "18px 44px",
              borderRadius: 999,
              border: "none",
              // The app's "Continue" CTA: lime→green gradient, black label.
              background: "linear-gradient(90deg, #88FF00, #00FF88)",
              color: BG,
              fontSize: "clamp(14px, 1.8vw, 16px)",
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              animation: "heroButtonGlow 2.6s ease-in-out infinite",
              transition: "transform 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            {user ? "Enter the World →" : "Sign Up Free →"}
          </button>

          {!user && (
            <button
              type="button"
              className="hero-cta-ghost"
              onClick={() => openAuth("signin")}
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                padding: "17px 34px",
                borderRadius: 999,
                border: `1px solid ${GREEN}`,
                background: "rgba(5,5,8,0.5)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                color: GREEN,
                fontSize: "clamp(13px, 1.6vw, 15px)",
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "background 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* ── Ticker ── */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "14px 0",
          background: "rgba(5,5,8,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: `1px solid ${BORDER}`,
          overflow: "hidden",
          zIndex: 10,
        }}
      >
        <div
          className="hero-ticker-track"
          style={{
            display: "flex",
            gap: 44,
            whiteSpace: "nowrap",
            width: "max-content",
            animation: "heroTicker 55s linear infinite",
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
        </div>
      </div>

      <AuthModal
        open={authOpen}
        initialMode={authMode}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => router.push("/map")}
      />
    </section>
  );
}
