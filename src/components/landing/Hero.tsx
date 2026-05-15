"use client";

/*
 * Phase-6 Hero — game-direct, motion-first.
 *
 * Three stacked headlines: CATCH CREATURES / EARN $BLINK / WIN REAL ETH.
 * Animated mini-map preview behind the copy (CSS keyframes only).
 * Primary CTA → /map if a wallet is connected, otherwise → /auth/signin.
 * Secondary CTA → mintmyblink.com (new tab).
 * Floor of hero: a poetic non-numeric ticker (same vibe as Phase 4).
 */

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";

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
@keyframes heroBlinkFadeUp {
  from { opacity: 0; transform: translateY(28px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes heroBlinkButtonGlow {
  0%, 100% { box-shadow: 0 0 24px rgba(0,255,136,0.55), 0 0 64px rgba(0,255,136,0.2); }
  50% { box-shadow: 0 0 44px rgba(0,255,136,0.95), 0 0 110px rgba(0,255,136,0.4); }
}
@keyframes heroBlinkTicker {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@media (prefers-reduced-motion: reduce) {
  .hero-fadeup,
  .hero-cta-primary,
  .hero-ticker-track {
    animation: none !important;
  }
}
`;

export function Hero() {
  const router = useRouter();
  const { isConnected } = useAccount();

  const enterWorld = () => {
    if (isConnected) {
      router.push("/map");
    } else {
      router.push("/auth/signin");
    }
  };

  return (
    <section
      style={{
        position: "relative",
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px 140px",
        textAlign: "center",
        overflow: "hidden",
        background: BG,
      }}
    >
      <style>{KEYFRAMES}</style>

      <HeroMapPreview />

      {/* All copy sits above the animated layer */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 940,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <span
          className="hero-fadeup"
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontSize: 11,
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: GREEN,
            fontWeight: 800,
            marginBottom: 22,
            padding: "6px 14px",
            border: `1px solid ${BORDER}`,
            borderRadius: 999,
            background: "rgba(0,255,136,0.04)",
            textShadow: "0 0 14px rgba(0,255,136,0.5)",
            animation: "heroBlinkFadeUp 0.7s ease-out 0.05s both",
          }}
        >
          Live · Real-World Catch Game · On Ethereum
        </span>

        <h1
          className="hero-fadeup"
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontWeight: 900,
            fontSize: "clamp(44px, 11vw, 128px)",
            lineHeight: 0.92,
            letterSpacing: "-0.045em",
            margin: 0,
            color: WHITE,
            textShadow: "0 4px 32px rgba(0,0,0,0.6)",
            animation: "heroBlinkFadeUp 0.8s ease-out 0.15s both",
          }}
        >
          <span style={{ display: "block" }}>CATCH CREATURES.</span>
          <span
            style={{
              display: "block",
              background: `linear-gradient(180deg, ${GREEN} 0%, ${GREEN2} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            EARN $BLINK.
          </span>
          <span style={{ display: "block" }}>WIN REAL ETH.</span>
        </h1>

        <p
          className="hero-fadeup"
          style={{
            fontSize: "clamp(15px, 2vw, 19px)",
            color: WHITE,
            opacity: 0.86,
            margin: "26px 0 0",
            maxWidth: 680,
            lineHeight: 1.55,
            animation: "heroBlinkFadeUp 0.8s ease-out 0.35s both",
          }}
        >
          Mystical BLINK creatures are spawning on a real-world map around you, right now.
          Walk to them. Catch them. Earn $BLINK rewards on every catch. Find drops of real ETH
          and NFTs hidden across the planet by other players.
        </p>

        <div
          className="hero-fadeup"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            marginTop: 36,
            animation: "heroBlinkFadeUp 0.8s ease-out 0.55s both",
            // Keep the CTA group above the bottom-right sound toggle on phones.
            paddingBottom: 8,
          }}
        >
          <button
            type="button"
            onClick={enterWorld}
            className="hero-cta-primary"
            style={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              padding: "18px 38px",
              borderRadius: 999,
              border: "none",
              background: `linear-gradient(135deg, ${GREEN}, ${GREEN2})`,
              color: BG,
              fontSize: "clamp(15px, 2.2vw, 17px)",
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              animation: "heroBlinkButtonGlow 2.6s ease-in-out infinite",
              minWidth: 280,
            }}
          >
            🌍 Enter the world →
          </button>

          <a
            href={MINT_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              padding: "12px 26px",
              borderRadius: 999,
              border: `1px solid ${GREEN}66`,
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
            }}
          >
            Mint your first BLINK · 0.25 ETH
          </a>
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: MUTED,
              fontWeight: 700,
            }}
          >
            (1-of-1, on Ethereum forever)
          </span>
        </div>
      </div>

      {/* Floor ticker — poetic non-numeric (Phase 4 vibe, lore intact) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "14px 0",
          background: "rgba(13,13,20,0.7)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderTop: `1px solid ${BORDER}`,
          overflow: "hidden",
          zIndex: 2,
        }}
      >
        <div
          className="hero-ticker-track"
          style={{
            display: "flex",
            gap: 44,
            whiteSpace: "nowrap",
            animation: "heroBlinkTicker 50s linear infinite",
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
        </div>
      </div>
    </section>
  );
}
