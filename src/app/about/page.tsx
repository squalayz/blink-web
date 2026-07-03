"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/providers";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { StatsBar } from "@/components/landing/StatsBar";
import { Hero } from "@/components/landing/Hero";
import AuthModal from "@/components/AuthModal";

// Below-fold token strip — code-split, kept in SSR HTML for SEO.
const BlinkTokenStrip = dynamic(
  () => import("@/components/BlinkTokenStrip").then((m) => m.BlinkTokenStrip),
  { ssr: true, loading: () => null },
);

const TG_GROUP = "https://t.me/blinkworldeth";

const BLINK = {
  green: "#00FF88",
  green2: "#88FF00",
  bg: "#0a0a0f",
  surface: "#0d0d14",
  surface2: "#1a1a24",
  white: "#FFFFFF",
  muted: "#8a8a99",
  border: "rgba(0,255,136,0.10)",
  softBorder: "rgba(255,255,255,0.08)",
};

const KEYFRAMES = `
@keyframes blinkOrbFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-14px); }
}
@keyframes blinkOrbHalo {
  0%, 100% { opacity: 0.45; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.12); }
}
@keyframes blinkButtonGlow {
  0%, 100% { box-shadow: 0 0 24px rgba(0,255,136,0.5), 0 0 56px rgba(0,255,136,0.2); }
  50% { box-shadow: 0 0 40px rgba(0,255,136,0.85), 0 0 96px rgba(0,255,136,0.35); }
}
@keyframes blinkPingDot {
  0% { transform: scale(1); opacity: 0.9; }
  70% { transform: scale(2.6); opacity: 0; }
  100% { transform: scale(2.6); opacity: 0; }
}
@keyframes blinkBarFill {
  from { width: 12%; }
  to { width: 76%; }
}
@media (prefers-reduced-motion: reduce) {
  .blink-orb-hero, .blink-orb-halo, .blink-ping { animation: none !important; }
}
.blink-feature-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(32px, 6vw, 72px);
  align-items: center;
}
.blink-feature-grid.blink-feature-flip > .blink-feature-copy { order: 2; }
.blink-feature-grid.blink-feature-flip > .blink-feature-visual { order: 1; }
@media (max-width: 820px) {
  .blink-feature-grid { grid-template-columns: minmax(0, 1fr); }
  .blink-feature-grid.blink-feature-flip > .blink-feature-copy { order: 1; }
  .blink-feature-grid.blink-feature-flip > .blink-feature-visual { order: 2; }
}
`;

/* ─────────────────────────────────────────────────────────────────────────────
   Small shared pieces
──────────────────────────────────────────────────────────────────────────── */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 12,
        letterSpacing: "0.38em",
        color: BLINK.green,
        textTransform: "uppercase",
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "min(320px, 86vw)",
        margin: "0 auto",
        borderRadius: 44,
        border: `1px solid ${BLINK.softBorder}`,
        background: "linear-gradient(180deg, #101018, #0a0a0f)",
        boxShadow:
          "0 40px 80px rgba(0,0,0,0.55), 0 0 60px rgba(0,255,136,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
        padding: 10,
      }}
    >
      <div
        style={{
          borderRadius: 36,
          overflow: "hidden",
          background: BLINK.bg,
          border: "1px solid rgba(255,255,255,0.04)",
          position: "relative",
        }}
      >
        {/* Notch */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 88,
            height: 22,
            borderRadius: 12,
            background: "#000",
            zIndex: 5,
          }}
        />
        {children}
      </div>
    </div>
  );
}

/* Stylized in-frame screens — illustrative UI, pure CSS/SVG. */

function MapScreen() {
  const dots = [
    { top: "26%", left: "24%", delay: "0s" },
    { top: "48%", left: "68%", delay: "0.9s" },
    { top: "64%", left: "38%", delay: "1.7s" },
  ];
  return (
    <div style={{ position: "relative", height: 480, background: "#0b0f0d" }}>
      {/* Street grid */}
      <svg aria-hidden width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
        <defs>
          <pattern id="lp-map-grid" width="46" height="46" patternUnits="userSpaceOnUse">
            <path d="M 46 0 L 0 0 0 46" fill="none" stroke="rgba(0,255,136,0.10)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lp-map-grid)" />
        <path d="M -20 150 C 90 120, 180 210, 360 170" stroke="rgba(0,255,136,0.22)" strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d="M 60 500 C 100 340, 240 320, 300 120" stroke="rgba(255,255,255,0.06)" strokeWidth="14" fill="none" strokeLinecap="round" />
      </svg>

      {/* Spawn pings */}
      {dots.map((d, i) => (
        <div key={i} style={{ position: "absolute", top: d.top, left: d.left }}>
          <span
            className="blink-ping"
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              border: `2px solid ${BLINK.green}`,
              animation: `blinkPingDot 2.6s ease-out infinite`,
              animationDelay: d.delay,
            }}
          />
          <span
            style={{
              display: "block",
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: BLINK.green,
              boxShadow: `0 0 14px ${BLINK.green}`,
            }}
          />
        </div>
      ))}

      {/* You-are-here */}
      <div
        style={{
          position: "absolute",
          top: "78%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: BLINK.white,
          border: `4px solid ${BLINK.green}`,
          boxShadow: "0 0 24px rgba(0,255,136,0.8)",
        }}
      />

      {/* Nearby card */}
      <div
        style={{
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 14,
          borderRadius: 18,
          padding: "14px 16px",
          background: "rgba(13,13,20,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: `1px solid ${BLINK.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase", color: BLINK.muted, fontWeight: 700 }}>
            Reward nearby
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: BLINK.white, marginTop: 3 }}>
            120 m — walk to collect
          </div>
        </div>
        <div
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            background: `linear-gradient(135deg, ${BLINK.green}, ${BLINK.green2})`,
            color: BLINK.bg,
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Go
        </div>
      </div>
    </div>
  );
}

function PointsScreen() {
  return (
    <div style={{ position: "relative", height: 480, background: BLINK.bg, padding: "56px 16px 16px" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 0%, rgba(0,255,136,0.12), transparent 55%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ textAlign: "center", position: "relative" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: BLINK.muted, fontWeight: 700 }}>
          Blink points
        </div>
        <div
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontSize: 58,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            marginTop: 8,
            background: `linear-gradient(135deg, ${BLINK.green}, ${BLINK.green2})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          12,480
        </div>
        <div style={{ fontSize: 12, color: BLINK.muted, marginTop: 4 }}>+320 today</div>
      </div>

      {/* Daily progress */}
      <div
        style={{
          marginTop: 26,
          borderRadius: 16,
          border: `1px solid ${BLINK.softBorder}`,
          background: "rgba(255,255,255,0.03)",
          padding: 16,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: BLINK.muted, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          <span>Daily goal</span>
          <span style={{ color: BLINK.green }}>76%</span>
        </div>
        <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: "76%",
              borderRadius: 999,
              background: `linear-gradient(90deg, ${BLINK.green}, ${BLINK.green2})`,
              boxShadow: `0 0 12px rgba(0,255,136,0.6)`,
              animation: "blinkBarFill 1.6s ease-out both",
            }}
          />
        </div>
      </div>

      {/* Earn rows */}
      {[
        { label: "Morning walk", value: "+180" },
        { label: "Creature caught", value: "+90" },
        { label: "Streak bonus", value: "+50" },
      ].map((r) => (
        <div
          key={r.label}
          style={{
            marginTop: 10,
            borderRadius: 14,
            border: `1px solid ${BLINK.softBorder}`,
            background: "rgba(255,255,255,0.02)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <span style={{ fontSize: 13, color: BLINK.white, fontWeight: 600 }}>{r.label}</span>
          <span style={{ fontSize: 13, color: BLINK.green, fontWeight: 800 }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function ClaimScreen() {
  return (
    <div style={{ position: "relative", height: 480, background: BLINK.bg, padding: "56px 16px 16px" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 20%, rgba(0,255,136,0.14), transparent 60%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ textAlign: "center", position: "relative" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: BLINK.muted, fontWeight: 700 }}>
          Claimable
        </div>
        <div
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontSize: 46,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: BLINK.white,
            marginTop: 8,
          }}
        >
          12 <span style={{ color: BLINK.green }}>$BLINK</span>
        </div>
        <div style={{ fontSize: 11, color: BLINK.muted, marginTop: 4 }}>1,000 points = 1 BLINK</div>
      </div>

      {/* Wallet buttons */}
      <div style={{ marginTop: 26, display: "grid", gap: 10, position: "relative" }}>
        {["MetaMask", "Coinbase Wallet"].map((w) => (
          <div
            key={w}
            style={{
              borderRadius: 14,
              border: `1px solid ${BLINK.border}`,
              background: "rgba(0,255,136,0.05)",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${BLINK.green}33, ${BLINK.green2}22)`,
                border: `1px solid ${BLINK.border}`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={BLINK.green} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: BLINK.white }}>{w}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: BLINK.green, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Connect
            </span>
          </div>
        ))}
      </div>

      {/* Claim button + tx pill */}
      <div
        style={{
          marginTop: 18,
          borderRadius: 999,
          padding: "15px 16px",
          textAlign: "center",
          background: `linear-gradient(135deg, ${BLINK.green}, ${BLINK.green2})`,
          color: BLINK.bg,
          fontSize: 13,
          fontWeight: 900,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          boxShadow: "0 0 24px rgba(0,255,136,0.45)",
          position: "relative",
        }}
      >
        Claim to my wallet
      </div>
      <div
        style={{
          marginTop: 12,
          textAlign: "center",
          fontSize: 11,
          color: BLINK.muted,
          fontFamily: "ui-monospace, Menlo, monospace",
          position: "relative",
        }}
      >
        tx 0x4f2a…9c1e — confirmed on Ethereum
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Feature section
──────────────────────────────────────────────────────────────────────────── */

function Feature({
  eyebrow,
  title,
  body,
  bullets,
  visual,
  flip,
  cta,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  visual: React.ReactNode;
  flip?: boolean;
  cta?: { label: string; onClick?: () => void; href?: string };
}) {
  return (
    <section style={{ padding: "clamp(64px, 10vw, 120px) 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div className={`blink-feature-grid${flip ? " blink-feature-flip" : ""}`}>
        <div className="blink-feature-copy">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2
            style={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontSize: "clamp(30px, 4.6vw, 46px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
              margin: "14px 0 16px",
              color: BLINK.white,
            }}
          >
            {title}
          </h2>
          <p style={{ color: BLINK.muted, fontSize: 16, lineHeight: 1.7, margin: "0 0 22px", maxWidth: 460 }}>{body}</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
            {bullets.map((b) => (
              <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: 10, color: BLINK.white, fontSize: 14, fontWeight: 600 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10" stroke={BLINK.green} strokeWidth="1.6" opacity="0.5" />
                  <path d="M8 12.5l2.6 2.6L16.5 9" stroke={BLINK.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {b}
              </li>
            ))}
          </ul>
          {cta &&
            (cta.href ? (
              <Link
                href={cta.href}
                style={{
                  display: "inline-block",
                  marginTop: 26,
                  padding: "13px 26px",
                  borderRadius: 999,
                  border: `1px solid ${BLINK.green}66`,
                  background: "rgba(0,255,136,0.07)",
                  color: BLINK.green,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {cta.label}
              </Link>
            ) : (
              <button
                onClick={cta.onClick}
                style={{
                  display: "inline-block",
                  marginTop: 26,
                  padding: "13px 26px",
                  borderRadius: 999,
                  border: `1px solid ${BLINK.green}66`,
                  background: "rgba(0,255,136,0.07)",
                  color: BLINK.green,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {cta.label}
              </button>
            ))}
        </div>
        <div className="blink-feature-visual">{visual}</div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Page
──────────────────────────────────────────────────────────────────────────── */

export default function AboutPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");

  // Unlike the retired homepage this page never auto-redirects signed-in
  // users — it's a reference page anyone can read.
  const handleEnter = () => {
    if (loading) return;
    if (user) {
      router.push("/map");
    } else {
      setAuthMode("signup");
      setAuthOpen(true);
    }
  };

  return (
    <main
      style={{
        background: BLINK.bg,
        color: BLINK.white,
        minHeight: "100vh",
        fontFamily: "Inter, -apple-system, sans-serif",
        overflowX: "hidden",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* ─── Top Nav ─── */}
      <nav
        className="blink-top-nav"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding:
            "calc(14px + max(env(safe-area-inset-top, 0px), var(--blink-top-inset, 0px))) clamp(14px, 4vw, 24px) 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          background: "rgba(10,10,15,0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${BLINK.border}`,
        }}
      >
        <Link
          href="/"
          className="blink-top-nav-brand"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: BLINK.white,
            minWidth: 0,
            flexShrink: 1,
            overflow: "hidden",
          }}
        >
          <Image
            src="/brand/logo-orb-glow.png"
            alt="BLINK"
            width={34}
            height={34}
            sizes="34px"
            priority
            fetchPriority="high"
            style={{
              objectFit: "contain",
              filter: "drop-shadow(0 0 8px rgba(0,255,136,0.5))",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontWeight: 800,
              fontSize: 20,
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
            }}
          >
            BLINK
          </span>
        </Link>

        <div
          className="blink-top-nav-actions"
          style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}
        >
          <a
            className="blink-top-nav-council"
            href={TG_GROUP}
            target="_blank"
            rel="noreferrer"
            aria-label="Join BLINK on Telegram"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: BLINK.green,
              textDecoration: "none",
              padding: "8px 14px",
              border: `1px solid ${BLINK.green}55`,
              background: "rgba(0,255,136,0.06)",
              borderRadius: 999,
              fontWeight: 700,
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M21.5 3.5 2.5 10.8c-.9.3-.9 1.6 0 1.9l4.7 1.6 2 6.2c.2.7 1.1.9 1.6.3l2.5-2.6 4.6 3.4c.6.5 1.6.2 1.8-.6L22.5 4.7c.2-.8-.6-1.5-1-1.2Z"
                fill={BLINK.green}
              />
            </svg>
            <span className="blink-top-nav-council-label">Telegram</span>
          </a>
          {!loading && user ? (
            <button
              onClick={() => router.push("/claim")}
              aria-label="Claim rewards"
              style={{
                fontSize: 13,
                color: BLINK.bg,
                background: `linear-gradient(135deg, ${BLINK.green}, ${BLINK.green2})`,
                border: "none",
                padding: "9px 16px",
                borderRadius: 999,
                fontWeight: 800,
                letterSpacing: "0.04em",
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: "0 0 18px rgba(0,255,136,0.4)",
              }}
            >
              Claim Rewards
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setAuthMode("signin");
                  setAuthOpen(true);
                }}
                style={{
                  fontSize: 13,
                  color: BLINK.muted,
                  background: "transparent",
                  border: `1px solid ${BLINK.border}`,
                  padding: "9px 14px",
                  borderRadius: 999,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Sign In
              </button>
              <button
                onClick={handleEnter}
                style={{
                  fontSize: 13,
                  color: BLINK.bg,
                  background: `linear-gradient(135deg, ${BLINK.green}, ${BLINK.green2})`,
                  border: "none",
                  padding: "9px 16px",
                  borderRadius: 999,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  boxShadow: "0 0 18px rgba(0,255,136,0.4)",
                  whiteSpace: "nowrap",
                }}
              >
                <span className="blink-top-nav-cta-long">Sign Up Free</span>
                <span className="blink-top-nav-cta-short">Sign Up</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ─── HERO — HD mountain key-art + floating orbs (app SignInView vibe) ─── */}
      <Hero />

      {/* ─── STATS STRIP ─── */}
      <StatsBar />

      {/* ─── FEATURE 1 — the map ─── */}
      <RevealOnScroll>
        <Feature
          eyebrow="Step outside"
          title="A living map of the world around you"
          body="Open BLINK and the streets light up. Rewards spawn around your real location — parks, corners, cafés. The only way to reach them is to move."
          bullets={[
            "Live map built on your real GPS position",
            "New spawns around you every day",
            "Works anywhere in the world",
          ]}
          visual={
            <PhoneFrame>
              <MapScreen />
            </PhoneFrame>
          }
          cta={{ label: "Open the map", onClick: handleEnter }}
        />
      </RevealOnScroll>

      {/* ─── FEATURE 2 — daily points ─── */}
      <RevealOnScroll>
        <Feature
          flip
          eyebrow="Earn daily"
          title="Every step stacks BLINK points"
          body="Catching rewards on your walk earns BLINK points. Show up daily and streak bonuses multiply what you make. Your balance only moves one direction: up."
          bullets={[
            "Points for every catch on the map",
            "Daily streak bonuses for consistency",
            "Track your balance in real time",
          ]}
          visual={
            <PhoneFrame>
              <PointsScreen />
            </PhoneFrame>
          }
        />
      </RevealOnScroll>

      {/* ─── FEATURE 3 — claim real $BLINK ─── */}
      <RevealOnScroll>
        <Feature
          eyebrow="Your daily airdrop"
          title="Claim real $BLINK to your own wallet"
          body="Points convert to $BLINK — a real ERC-20 token on Ethereum mainnet. Connect MetaMask or Coinbase Wallet and claim. No custodians, no IOUs: the tokens land in an address only you control."
          bullets={[
            "MetaMask and Coinbase Wallet supported",
            "On-chain claims you can verify on Etherscan",
            "1,000 points = 1 $BLINK",
          ]}
          visual={
            <PhoneFrame>
              <ClaimScreen />
            </PhoneFrame>
          }
          cta={{ label: "Claim rewards", href: "/claim" }}
        />
      </RevealOnScroll>

      {/* ─── HOW IT WORKS — 3 steps ─── */}
      <RevealOnScroll>
        <section style={{ padding: "clamp(64px, 9vw, 110px) 24px", background: BLINK.surface, borderTop: `1px solid ${BLINK.border}`, borderBottom: `1px solid ${BLINK.border}` }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
            <Eyebrow>How it works</Eyebrow>
            <h2
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontSize: "clamp(30px, 4.6vw, 46px)",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                margin: "14px 0 40px",
              }}
            >
              Three steps to your first claim
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(250px, 100%), 1fr))",
                gap: 18,
                textAlign: "left",
              }}
            >
              {[
                {
                  n: "01",
                  title: "Walk",
                  body: "Open the map and head toward the glowing spawns near you. Distance is the game — no walking, no rewards.",
                },
                {
                  n: "02",
                  title: "Earn",
                  body: "Collect rewards to stack BLINK points. Daily streaks and rare finds multiply your earnings.",
                },
                {
                  n: "03",
                  title: "Claim",
                  body: "Connect your wallet and convert points into real $BLINK on Ethereum. Verify every claim on Etherscan.",
                },
              ].map((s) => (
                <div
                  key={s.n}
                  style={{
                    borderRadius: 20,
                    border: `1px solid ${BLINK.softBorder}`,
                    background: "rgba(255,255,255,0.03)",
                    padding: "26px 24px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Space Grotesk, Inter, sans-serif",
                      fontSize: 13,
                      fontWeight: 800,
                      letterSpacing: "0.2em",
                      color: BLINK.green,
                    }}
                  >
                    {s.n}
                  </div>
                  <div
                    style={{
                      fontFamily: "Space Grotesk, Inter, sans-serif",
                      fontSize: 24,
                      fontWeight: 900,
                      letterSpacing: "-0.02em",
                      margin: "10px 0 8px",
                    }}
                  >
                    {s.title}
                  </div>
                  <p style={{ color: BLINK.muted, fontSize: 14, lineHeight: 1.65, margin: 0 }}>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealOnScroll>

      {/* ─── $BLINK TOKEN STRIP — real contract, real links ─── */}
      <RevealOnScroll>
        <BlinkTokenStrip />
      </RevealOnScroll>

      {/* ─── FINAL CTA ─── */}
      <RevealOnScroll>
        <section
          style={{
            padding: "clamp(96px, 14vh, 160px) 24px",
            textAlign: "center",
            maxWidth: 820,
            margin: "0 auto",
          }}
        >
          <h2
            style={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontSize: "clamp(38px, 7vw, 72px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              margin: 0,
              lineHeight: 1.04,
            }}
          >
            Your daily airdrop
            <br />
            <span
              style={{
                background: `linear-gradient(135deg, ${BLINK.green}, ${BLINK.green2})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              is already outside.
            </span>
          </h2>
          <button
            onClick={handleEnter}
            style={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              marginTop: 40,
              padding: "18px clamp(28px, 6vw, 44px)",
              borderRadius: 999,
              border: "none",
              background: `linear-gradient(135deg, ${BLINK.green}, ${BLINK.green2})`,
              color: BLINK.bg,
              fontSize: "clamp(14px, 2.4vw, 16px)",
              fontWeight: 900,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
              animation: "blinkButtonGlow 3s ease-in-out infinite",
              maxWidth: "100%",
            }}
          >
            Start Earning
          </button>
        </section>
      </RevealOnScroll>

      {/* ─── FOOTER ─── */}
      <footer
        style={{
          padding: "48px 24px 32px",
          borderTop: `1px solid ${BLINK.border}`,
          background: BLINK.bg,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Image
              src="/brand/logo-orb-glow.png"
              alt="BLINK"
              width={30}
              height={30}
              style={{ objectFit: "contain", filter: "drop-shadow(0 0 6px rgba(0,255,136,0.4))" }}
            />
            <span
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontWeight: 800,
                letterSpacing: "0.04em",
              }}
            >
              BLINK
            </span>
            <span style={{ color: BLINK.muted, fontSize: 13, marginLeft: 12 }}>
              Your rewards live in your wallet — forever.
            </span>
          </div>
          <nav style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            {[
              { href: "/how-it-works", label: "How it works" },
              { href: "/claim", label: "Claim" },
              { href: TG_GROUP, label: "Telegram", external: true },
              { href: "/terms", label: "Terms" },
              { href: "/privacy", label: "Privacy" },
            ].map((l) =>
              l.external ? (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 13, color: BLINK.muted, textDecoration: "none" }}
                >
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.label}
                  href={l.href}
                  style={{ fontSize: 13, color: BLINK.muted, textDecoration: "none" }}
                >
                  {l.label}
                </Link>
              ),
            )}
          </nav>
        </div>
        <div
          style={{
            maxWidth: 1100,
            margin: "32px auto 0",
            color: BLINK.muted,
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          © BLINK · Walk. Earn. Claim.
        </div>
      </footer>

      <AuthModal
        open={authOpen}
        initialMode={authMode}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => router.push("/map")}
      />
    </main>
  );
}
