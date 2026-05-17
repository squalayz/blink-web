"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";
import { CinematicLoad } from "@/components/CinematicLoad";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { BlinkTokenStrip } from "@/components/BlinkTokenStrip";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { TwoWaysToEarn } from "@/components/landing/TwoWaysToEarn";
import { MintFoundersCTA } from "@/components/landing/MintFoundersCTA";
import AuthModal from "@/components/AuthModal";

// Below-fold sections — code-split so the landing chunk stays lean.
const BestiarySection = dynamic(
  () => import("@/components/BestiarySection").then((m) => m.BestiarySection),
  { ssr: false },
);
const MythicsSection = dynamic(
  () => import("@/components/MythicsSection").then((m) => m.MythicsSection),
  { ssr: false },
);

const TG_GROUP = "https://t.me/+7Xj6CKZs9iVmMDhh";

const BLINK = {
  green: "#00FF88",
  green2: "#88FF00",
  bg: "#0a0a0f",
  surface: "#0d0d14",
  surface2: "#1a1a24",
  white: "#FFFFFF",
  muted: "#8a8a99",
  border: "rgba(0,255,136,0.10)",
};

// Poetic non-numeric ticker — replaces the old fake stat lines. No fabricated
// counts. Real telemetry can swap in once `/api/activity/live` ships.
const TICKER_ITEMS = [
  "The Eye opens over Lagos",
  "Sprites stirring in Tokyo",
  "A Cyclops blinks in Brooklyn",
  "The Council membership awakens",
  "Sightings every minute · Worldwide",
  "Phoenix tail trail · Lisbon",
  "Hushlings detected in Berlin",
  "The First Eye is always watching",
];

const KEYFRAMES = `
@keyframes blinkFadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes blinkTicker {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@keyframes blinkButtonGlow {
  0%, 100% { box-shadow: 0 0 24px rgba(0,255,136,0.5), 0 0 56px rgba(0,255,136,0.2); }
  50% { box-shadow: 0 0 40px rgba(0,255,136,0.85), 0 0 96px rgba(0,255,136,0.35); }
}
@keyframes blinkBlink {
  0%, 92%, 96%, 100% { transform: scaleY(1); }
  94% { transform: scaleY(0.02); }
}
`;

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");

  const handleEnter = () => {
    if (loading) return;
    if (user) {
      router.push("/map");
    } else {
      setAuthMode("signup");
      setAuthOpen(true);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.username) {
          setRedirecting(true);
          router.push("/map");
        }
      });
  }, [user, loading, router]);

  if (redirecting) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: BLINK.bg,
          color: BLINK.muted,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <span style={{ letterSpacing: "0.3em", fontSize: 12, textTransform: "uppercase" }}>
          The Eye is opening...
        </span>
      </div>
    );
  }

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
      <CinematicLoad />

      {/* ─── Top Nav ─── */}
      <nav
        className="blink-top-nav"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "14px clamp(14px, 4vw, 24px)",
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
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: BLINK.white,
            minWidth: 0,
          }}
        >
          <Image
            src="/blink-logo.webp"
            alt="BLINK"
            width={32}
            height={32}
            priority
            style={{
              objectFit: "contain",
              filter: "drop-shadow(0 0 8px rgba(0,255,136,0.7))",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontWeight: 800,
              fontSize: 20,
              letterSpacing: "0.04em",
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
            style={{
              fontSize: 13,
              color: BLINK.muted,
              textDecoration: "none",
              padding: "8px 14px",
              border: `1px solid ${BLINK.border}`,
              borderRadius: 999,
              fontWeight: 600,
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
            }}
          >
            The Council
          </a>
          {!loading && user ? (
            <button
              onClick={() => router.push("/wallet")}
              aria-label="Open wallet"
              style={{
                fontSize: 13,
                color: BLINK.green,
                background: "rgba(0,255,136,0.08)",
                border: `1px solid ${BLINK.green}55`,
                padding: "9px 14px",
                borderRadius: 999,
                fontWeight: 800,
                letterSpacing: "0.04em",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
              <span className="blink-top-nav-cta-long">My Wallet</span>
              <span className="blink-top-nav-cta-short">Wallet</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => { setAuthMode("signin"); setAuthOpen(true); }}
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
                <span className="blink-top-nav-cta-long">Enter the World</span>
                <span className="blink-top-nav-cta-short">Enter</span>
              </button>
            </>
          )}
        </div>

        <style jsx>{`
          .blink-top-nav-cta-short {
            display: none;
          }
          @media (max-width: 480px) {
            .blink-top-nav-council {
              display: none;
            }
          }
          @media (max-width: 360px) {
            .blink-top-nav-cta-long {
              display: none;
            }
            .blink-top-nav-cta-short {
              display: inline;
            }
          }
        `}</style>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <Hero />

      {/* ─── BESTIARY (moved up — the rarest 20 + clear "hundreds in the wild" story) ─── */}
      <RevealOnScroll>
        <BestiarySection />
      </RevealOnScroll>

      {/* ─── HOW IT WORKS (3 steps) ─── */}
      <RevealOnScroll>
        <HowItWorks />
      </RevealOnScroll>

      {/* ─── TWO WAYS TO EARN ─── */}
      <RevealOnScroll>
        <TwoWaysToEarn />
      </RevealOnScroll>

      {/* ─── $BLINK TOKEN STRIP — anchors the contract claim above ─── */}
      <RevealOnScroll>
        <BlinkTokenStrip />
      </RevealOnScroll>

      {/* ─── MINT YOUR FIRST BLINK — recruiter card ─── */}
      <RevealOnScroll>
        <MintFoundersCTA />
      </RevealOnScroll>

      {/* ─── THE MYTHICS ─── */}
      <RevealOnScroll>
        <MythicsSection />
      </RevealOnScroll>

      {/* ─── TELEGRAM ─── */}
      <RevealOnScroll>
        <style>{`
          @keyframes blinkTgPulse {
            0%, 100% {
              box-shadow:
                0 0 32px rgba(0,255,136,0.45),
                0 0 80px rgba(0,255,136,0.25),
                inset 0 0 24px rgba(0,255,136,0.10);
              border-color: rgba(0,255,136,0.55);
            }
            50% {
              box-shadow:
                0 0 64px rgba(0,255,136,0.80),
                0 0 140px rgba(0,255,136,0.45),
                inset 0 0 36px rgba(0,255,136,0.20);
              border-color: rgba(0,255,136,0.95);
            }
          }
          @keyframes blinkTgScan {
            0% { transform: translateX(-120%); }
            100% { transform: translateX(220%); }
          }
          .blink-tg-card { animation: blinkTgPulse 3.4s ease-in-out infinite; }
          .blink-tg-card:hover { transform: translateY(-2px); transition: transform .25s ease; }
          .blink-tg-scan {
            position: absolute; inset: 0;
            background: linear-gradient(115deg, transparent 0%, rgba(0,255,136,0.18) 45%, rgba(255,255,255,0.22) 50%, rgba(0,255,136,0.18) 55%, transparent 100%);
            mix-blend-mode: screen; pointer-events: none;
            animation: blinkTgScan 4.2s linear infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .blink-tg-card { animation: none; }
            .blink-tg-scan { display: none; }
          }
        `}</style>
        <section style={{ padding: "96px 24px", maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <a
            href={TG_GROUP}
            target="_blank"
            rel="noopener noreferrer"
            className="blink-tg-card"
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 18,
              padding: "22px 40px",
              borderRadius: 999,
              background: "linear-gradient(135deg, rgba(0,255,136,0.08), rgba(136,255,0,0.04))",
              border: `2px solid ${BLINK.green}`,
              color: BLINK.white,
              fontSize: "clamp(20px, 3.2vw, 32px)",
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontWeight: 900,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              textDecoration: "none",
              overflow: "hidden",
              isolation: "isolate",
            }}
          >
            {/* Telegram paper-plane SVG */}
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M21.5 3.5 2.5 10.8c-.9.3-.9 1.6 0 1.9l4.7 1.6 2 6.2c.2.7 1.1.9 1.6.3l2.5-2.6 4.6 3.4c.6.5 1.6.2 1.8-.6L22.5 4.7c.2-.8-.6-1.5-1-1.2Z" fill={BLINK.green} stroke={BLINK.green} strokeWidth="0.5" strokeLinejoin="round"/>
              <path d="m10.5 16.3 8.3-9.5-10.3 7" stroke="#0a0a0f" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <span>Telegram</span>
            <span className="blink-tg-scan" />
          </a>
        </section>
      </RevealOnScroll>

      {/* ─── THE EYE SPEAKS ─── */}
      <RevealOnScroll>
      <section
        style={{
          padding: "96px 24px",
          background: BLINK.surface,
          borderTop: `1px solid ${BLINK.border}`,
          borderBottom: `1px solid ${BLINK.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 980,
            margin: "0 auto",
            display: "grid",
            // min(...) lets the col shrink below 280 on tiny viewports so the
            // grid never blows past 100vw.
            gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
            gap: 36,
            alignItems: "center",
          }}
        >
          <div>
            <span
              style={{
                fontSize: 12,
                letterSpacing: "0.4em",
                color: BLINK.green,
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              The Eye Speaks
            </span>
            <h2
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontSize: "clamp(36px, 6vw, 56px)",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                margin: "12px 0 18px",
              }}
            >
              24/7. Worldwide.
            </h2>
            <p style={{ color: BLINK.muted, fontSize: 16, lineHeight: 1.6, marginBottom: 24 }}>
              Every spawn. Every catch. Every rare sighting. @TheEyeBlinkBot whispers them all in real time.
            </p>
            <a
              href={TG_GROUP}
              target="_blank"
              rel="noreferrer"
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                display: "inline-block",
                padding: "14px 28px",
                borderRadius: 999,
                background: `linear-gradient(135deg, ${BLINK.green}, ${BLINK.green2})`,
                color: BLINK.bg,
                textDecoration: "none",
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                boxShadow: "0 0 24px rgba(0,255,136,0.45)",
              }}
            >
              Join The Eye on Telegram
            </a>
          </div>

          {/* Mock TG message card */}
          <div
            style={{
              background: BLINK.surface2,
              border: `1px solid ${BLINK.border}`,
              borderRadius: 18,
              padding: 20,
              fontFamily: "ui-monospace, 'Menlo', monospace",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <div style={{ color: BLINK.green, fontWeight: 700, marginBottom: 6 }}>
              @TheEyeBlinkBot
            </div>
            <div style={{ color: BLINK.muted, fontSize: 11, marginBottom: 14 }}>
              The Eye · just now
            </div>
            <div style={{ color: BLINK.white }}>
              ── SIGHTING ──
              <br />
              <span style={{ color: BLINK.green }}>Cyclops</span> · Rare
              <br />
              Brooklyn, NY
              <br />
              <span style={{ color: BLINK.muted }}>Caught by</span> @watcher_x
              <br />
              <br />
              The Eye sees you. Now see back.
            </div>
          </div>
        </div>
      </section>

      </RevealOnScroll>

      {/* ─── FINAL CTA — mirrors the hero ─── */}
      <RevealOnScroll>
      <section
        style={{
          padding: "120px 24px",
          textAlign: "center",
          maxWidth: 820,
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontSize: "clamp(40px, 8vw, 80px)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            margin: 0,
            lineHeight: 1,
          }}
        >
          The world is full of creatures.
        </h2>
        <h2
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontSize: "clamp(40px, 8vw, 80px)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            margin: "8px 0 32px",
            lineHeight: 1,
            color: BLINK.green,
            textShadow: "0 0 32px rgba(0,255,136,0.5)",
          }}
        >
          Go catch one.
        </h2>
        <button
          onClick={handleEnter}
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            padding: "18px clamp(24px, 6vw, 40px)",
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
          Enter the World →
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
              src="/blink-logo.webp"
              alt="BLINK"
              width={28}
              height={28}
              style={{ objectFit: "contain" }}
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
              Your BLINKS live with your wallet — forever.
            </span>
          </div>
          <nav style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            {[
              { href: "/how-it-works", label: "How it works" },
              { href: "/council", label: "The Council" },
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
                  style={{
                    fontSize: 13,
                    color: BLINK.muted,
                    textDecoration: "none",
                  }}
                >
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.label}
                  href={l.href}
                  style={{
                    fontSize: 13,
                    color: BLINK.muted,
                    textDecoration: "none",
                  }}
                >
                  {l.label}
                </Link>
              )
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
          © BLINK · The Eye is always watching
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
