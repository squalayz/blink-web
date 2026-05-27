"use client";

/*
 * Phase-6 "Mint Your First BLINK" — mid-page recruiter card.
 * Bold callout placed just before the Bestiary section.
 * MINT NOW → mintmyblink.com  ·  Browse → OpenSea
 */

import Image from "next/image";
import { BESTIARY, BLINK_MINT_URL, BLINK_OPENSEA_URL } from "@/lib/bestiary";

const BG = "#0a0a0f";
const SURFACE2 = "#1a1a24";
const GREEN = "#00FF88";
const GREEN2 = "#88FF00";
const WHITE = "#FFFFFF";
const MUTED = "#8a8a99";
const BORDER = "rgba(0,255,136,0.18)";

const KEYFRAMES = `
@keyframes mintRecruiterPulse {
  0%, 100% { box-shadow: 0 0 32px rgba(0,255,136,0.25); }
  50% { box-shadow: 0 0 60px rgba(0,255,136,0.45); }
}
@keyframes mintRecruiterFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes mintRecruiterGlow {
  0%, 100% { box-shadow: 0 0 16px rgba(0,255,136,0.4); }
  50% { box-shadow: 0 0 32px rgba(0,255,136,0.75); }
}
@media (prefers-reduced-motion: reduce) {
  .mint-recruiter-card,
  .mint-recruiter-portrait,
  .mint-recruiter-cta {
    animation: none !important;
  }
}
`;

const PORTRAITS = [
  BESTIARY.find((c) => c.id === 1),   // Sprite
  BESTIARY.find((c) => c.id === 16),  // Cyclops
  BESTIARY.find((c) => c.id === 18),  // Oracle
  BESTIARY.find((c) => c.id === 19),  // Phoenix
].filter(Boolean) as typeof BESTIARY;

export function MintFoundersCTA() {
  return (
    <section
      id="mint-founders"
      style={{
        padding: "72px clamp(14px, 4vw, 24px)",
        maxWidth: 1100,
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <style>{KEYFRAMES}</style>
      <div
        className="mint-recruiter-card"
        style={{
          position: "relative",
          background: `linear-gradient(135deg, ${SURFACE2}, rgba(0,255,136,0.06))`,
          border: `1px solid ${BORDER}`,
          borderRadius: 28,
          padding: "clamp(24px, 5vw, 44px) clamp(16px, 4vw, 36px)",
          overflow: "hidden",
          animation: "mintRecruiterPulse 4s ease-in-out infinite",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 20% 20%, rgba(0,255,136,0.18), transparent 55%), radial-gradient(circle at 80% 100%, rgba(136,255,0,0.10), transparent 60%)",
            pointerEvents: "none",
          }}
        />

        <div
          className="mint-recruiter-row"
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: 32,
            alignItems: "center",
          }}
        >
          <div>
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.4em",
                color: GREEN,
                textTransform: "uppercase",
                fontWeight: 800,
                textShadow: "0 0 12px rgba(0,255,136,0.45)",
              }}
            >
              Mint your first BLINK
            </span>
            <h2
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontSize: "clamp(30px, 5vw, 46px)",
                fontWeight: 900,
                letterSpacing: "-0.035em",
                margin: "10px 0 14px",
                color: WHITE,
                lineHeight: 1.05,
              }}
            >
              Be one of the{" "}
              <span
                style={{
                  background: `linear-gradient(135deg, ${GREEN}, ${GREEN2})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                20 Founders.
              </span>
            </h2>
            <p
              style={{
                color: WHITE,
                opacity: 0.82,
                fontSize: 15.5,
                lineHeight: 1.6,
                margin: "0 0 22px",
                maxWidth: 560,
              }}
            >
              The first 20 BLINK creatures — Sprite, Cyclops, Oracle, Phoenix, and 16 others —
              are minting now on Ethereum. Each is 1-of-1. Each is yours forever. Each comes
              with lifetime 2x earnings inside the game.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <a
                href={BLINK_MINT_URL}
                target="_blank"
                rel="noreferrer"
                className="mint-recruiter-cta"
                style={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  padding: "16px 32px",
                  borderRadius: 999,
                  background: `linear-gradient(135deg, ${GREEN}, ${GREEN2})`,
                  color: BG,
                  textDecoration: "none",
                  fontWeight: 900,
                  fontSize: 14,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  animation: "mintRecruiterGlow 2.6s ease-in-out infinite",
                }}
              >
                Mint now · 0.25 ETH
              </a>
              <a
                href={BLINK_OPENSEA_URL}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  padding: "16px 32px",
                  borderRadius: 999,
                  border: `1px solid ${GREEN}`,
                  background: "transparent",
                  color: GREEN,
                  textDecoration: "none",
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                Browse on OpenSea
              </a>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                flexWrap: "wrap",
                gap: 14,
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: MUTED,
                fontWeight: 700,
              }}
            >
              <span>1-of-1</span>
              <span style={{ color: GREEN }}>·</span>
              <span>Ethereum mainnet</span>
              <span style={{ color: GREEN }}>·</span>
              <span>Forever</span>
            </div>
          </div>

          {/* Right column — staggered floating portraits (desktop)
              flips to a clean inline 4-up row on mobile so cards never
              clip past the card edge. */}
          <div
            className="mint-recruiter-portraits"
            style={{
              position: "relative",
              minHeight: 240,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}
          >
            {PORTRAITS.map((p, i) => (
              <div
                key={p.id}
                className="mint-recruiter-portrait"
                style={{
                  position: "absolute",
                  width: 130,
                  height: 130,
                  borderRadius: 22,
                  overflow: "hidden",
                  border: `2px solid ${GREEN}`,
                  background: BG,
                  boxShadow: `0 14px 40px rgba(0,0,0,0.5), 0 0 28px rgba(0,255,136,0.4)`,
                  top: `${[10, 0, 30, 20][i]}%`,
                  left: `${[6, 30, 54, 78][i] - 28}%`,
                  transform: `rotate(${[-7, 4, -3, 6][i]}deg)`,
                  animation: `mintRecruiterFloat ${3.4 + i * 0.4}s ease-in-out ${i * 0.3}s infinite`,
                  zIndex: 5 - i,
                }}
              >
                <Image
                  src={p.image}
                  alt={p.name}
                  width={260}
                  height={260}
                  sizes="130px"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 820px) {
          .mint-recruiter-row {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          /* On mobile the floating overlap clips cards off the card edge.
             Switch to a flat inline 4-up grid that always fits the container. */
          .mint-recruiter-portraits {
            min-height: 0 !important;
            order: -1;
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: clamp(6px, 2vw, 12px);
            width: 100%;
            max-width: 100%;
          }
          .mint-recruiter-portraits :global(.mint-recruiter-portrait) {
            position: relative !important;
            top: auto !important;
            left: auto !important;
            width: 100% !important;
            height: auto !important;
            aspect-ratio: 1 / 1;
            transform: none !important;
            animation: none !important;
            border-radius: 14px !important;
          }
        }
      `}</style>
    </section>
  );
}
