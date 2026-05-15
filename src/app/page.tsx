"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";
import { BestiarySection } from "@/components/BestiarySection";
import { CinematicLoad } from "@/components/CinematicLoad";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { BlinkTokenStrip } from "@/components/BlinkTokenStrip";

const HeroEye = dynamic(() => import("@/components/HeroEye"), { ssr: false });
const FloatingCreatures = dynamic(() => import("@/components/FloatingCreatures").then(m => m.FloatingCreatures), { ssr: false });
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
          router.push("/watch");
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
      <FloatingCreatures />

      {/* ─── Top Nav ─── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/blink-logo.png"
            alt="BLINK"
            style={{
              width: 32,
              height: 32,
              objectFit: "contain",
              filter: "drop-shadow(0 0 8px rgba(0,255,136,0.7))",
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

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a
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
            }}
          >
            The Council
          </a>
          <button
            onClick={() => router.push("/watch")}
            style={{
              fontSize: 13,
              color: BLINK.bg,
              background: `linear-gradient(135deg, ${BLINK.green}, ${BLINK.green2})`,
              border: "none",
              padding: "9px 18px",
              borderRadius: 999,
              fontWeight: 800,
              letterSpacing: "0.04em",
              cursor: "pointer",
              boxShadow: "0 0 18px rgba(0,255,136,0.4)",
            }}
          >
            Enter The Eye
          </button>
        </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px 64px",
          position: "relative",
          textAlign: "center",
        }}
      >
        {/* Background grid + green ambient */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 30%, rgba(0,255,136,0.10), transparent 55%), radial-gradient(circle at 80% 80%, rgba(136,255,0,0.05), transparent 60%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ animation: "blinkFadeUp 0.9s ease-out 0.05s both", marginBottom: 32 }}>
          <HeroEye size={220} orbitRadius={170} creatureSize={72} />
        </div>

        <h1
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontWeight: 900,
            fontSize: "clamp(56px, 12vw, 128px)",
            lineHeight: 0.95,
            letterSpacing: "-0.04em",
            margin: 0,
            background: `linear-gradient(180deg, #FFFFFF 0%, ${BLINK.green} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "blinkFadeUp 0.9s ease-out 0.2s both",
          }}
        >
          Don&apos;t blink.
        </h1>
        <p
          style={{
            fontSize: "clamp(16px, 2.4vw, 22px)",
            color: BLINK.white,
            opacity: 0.85,
            margin: "20px 0 0",
            maxWidth: 620,
            lineHeight: 1.5,
            animation: "blinkFadeUp 0.9s ease-out 0.35s both",
          }}
        >
          The Eye is open. Catch what others can&apos;t see.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            marginTop: 36,
            justifyContent: "center",
            animation: "blinkFadeUp 0.9s ease-out 0.5s both",
          }}
        >
          <button
            onClick={() => router.push("/watch")}
            style={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              padding: "16px 32px",
              borderRadius: 999,
              border: "none",
              background: `linear-gradient(135deg, ${BLINK.green}, ${BLINK.green2})`,
              color: BLINK.bg,
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              animation: "blinkButtonGlow 3s ease-in-out infinite",
            }}
          >
            Enter The Eye
          </button>
          <a
            href={TG_GROUP}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              padding: "16px 32px",
              borderRadius: 999,
              border: `1px solid ${BLINK.green}`,
              background: "transparent",
              color: BLINK.green,
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Join The Council
          </a>
        </div>

        <p
          style={{
            fontSize: 12,
            color: BLINK.muted,
            marginTop: 28,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            animation: "blinkFadeUp 0.9s ease-out 0.65s both",
          }}
        >
          Sightings every minute · Worldwide
        </p>
      </section>

      {/* ─── LIVE TICKER ─── */}
      <section
        style={{
          background: BLINK.surface,
          borderTop: `1px solid ${BLINK.border}`,
          borderBottom: `1px solid ${BLINK.border}`,
          padding: "18px 0",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 48,
            whiteSpace: "nowrap",
            animation: "blinkTicker 50s linear infinite",
            width: "max-content",
          }}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span
              key={i}
              style={{
                fontSize: 13,
                color: BLINK.muted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              <span style={{ color: BLINK.green, marginRight: 14 }}>·</span>
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* ─── $BLINK TOKEN STRIP ─── */}
      <RevealOnScroll>
        <BlinkTokenStrip />
      </RevealOnScroll>

      {/* ─── BESTIARY ─── */}
      <RevealOnScroll>
        <BestiarySection />
      </RevealOnScroll>

      {/* ─── THE MYTHICS ─── */}
      <RevealOnScroll>
        <MythicsSection />
      </RevealOnScroll>

      {/* ─── HOW IT WORKS ─── */}
      <RevealOnScroll>
      <section
        style={{
          padding: "96px 24px",
          background: BLINK.surface,
          borderTop: `1px solid ${BLINK.border}`,
          borderBottom: `1px solid ${BLINK.border}`,
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span
              style={{
                fontSize: 12,
                letterSpacing: "0.4em",
                color: BLINK.green,
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              How it works
            </span>
            <h2
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontSize: "clamp(36px, 6vw, 56px)",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                margin: "12px 0 0",
              }}
            >
              Three steps. One Eye.
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {[
              {
                step: "01",
                title: "Watch",
                copy: "Open the map. Creatures spawn around you in real time. The Eye sees what you can't yet.",
              },
              {
                step: "02",
                title: "Approach",
                copy: "Walk closer — real-world or virtual. The closer you get, the stronger the signal.",
              },
              {
                step: "03",
                title: "Witness",
                copy: "Catch the creature. Add it to your collection. Earn rewards. $BLINK token coming.",
              },
            ].map((s) => (
              <div
                key={s.step}
                style={{
                  background: BLINK.surface2,
                  border: `1px solid ${BLINK.border}`,
                  borderRadius: 20,
                  padding: "32px 26px",
                }}
              >
                <div
                  style={{
                    fontFamily: "Space Grotesk, Inter, sans-serif",
                    fontWeight: 900,
                    fontSize: 14,
                    letterSpacing: "0.3em",
                    color: BLINK.green,
                  }}
                >
                  {s.step}
                </div>
                <div
                  style={{
                    fontFamily: "Space Grotesk, Inter, sans-serif",
                    fontWeight: 800,
                    fontSize: 30,
                    letterSpacing: "-0.02em",
                    marginTop: 14,
                  }}
                >
                  {s.title}
                </div>
                <p style={{ color: BLINK.muted, marginTop: 10, fontSize: 15, lineHeight: 1.6 }}>
                  {s.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      </RevealOnScroll>

      {/* ─── THE COUNCIL ─── */}
      <RevealOnScroll>
      <section style={{ padding: "96px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span
            style={{
              fontSize: 12,
              letterSpacing: "0.4em",
              color: BLINK.green,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            The Council
          </span>
          <h2
            style={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontSize: "clamp(36px, 6vw, 56px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              margin: "12px 0 8px",
            }}
          >
            Watchers who see more, earn more.
          </h2>
          <p style={{ color: BLINK.muted, fontSize: 15 }}>
            $BLINK rewards coming. Reputation already counts.
          </p>
        </div>

        <div
          style={{
            background: BLINK.surface2,
            border: `1px solid ${BLINK.border}`,
            borderRadius: 20,
            padding: "8px 8px",
            maxWidth: 720,
            margin: "0 auto",
          }}
        >
          {[
            { rank: 1, name: "the_oracle", caught: "—", region: "Tokyo" },
            { rank: 2, name: "watcher_x", caught: "—", region: "NYC" },
            { rank: 3, name: "blink_eyemate", caught: "—", region: "Lisbon" },
          ].map((row) => (
            <div
              key={row.rank}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr auto auto",
                alignItems: "center",
                gap: 16,
                padding: "16px 20px",
                borderBottom: `1px solid ${BLINK.border}`,
              }}
            >
              <span
                style={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontWeight: 900,
                  color: BLINK.green,
                  fontSize: 22,
                }}
              >
                {String(row.rank).padStart(2, "0")}
              </span>
              <span style={{ fontWeight: 700, fontSize: 16 }}>@{row.name}</span>
              <span style={{ fontSize: 12, color: BLINK.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {row.region}
              </span>
              <span style={{ fontSize: 12, color: BLINK.muted }}>{row.caught}</span>
            </div>
          ))}
          <div style={{ padding: 18, textAlign: "center" }}>
            <Link
              href="/council"
              style={{
                color: BLINK.green,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              See The Council →
            </Link>
          </div>
        </div>
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
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
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

      {/* ─── FINAL CTA ─── */}
      <RevealOnScroll>
      <section
        style={{
          padding: "120px 24px",
          textAlign: "center",
          maxWidth: 760,
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
          The Eye sees you.
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
          Now see back.
        </h2>
        <button
          onClick={() => router.push("/watch")}
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            padding: "18px 40px",
            borderRadius: 999,
            border: "none",
            background: `linear-gradient(135deg, ${BLINK.green}, ${BLINK.green2})`,
            color: BLINK.bg,
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor: "pointer",
            animation: "blinkButtonGlow 3s ease-in-out infinite",
          }}
        >
          Enter The Eye
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/blink-logo.png"
              alt="BLINK"
              style={{ width: 28, height: 28, objectFit: "contain" }}
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
              Don&apos;t blink. The Eye is open.
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
    </main>
  );
}
