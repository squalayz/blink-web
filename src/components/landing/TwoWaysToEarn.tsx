"use client";

/*
 * Phase-6 Two Ways to Earn — side-by-side cards.
 * Card 1: 💎 EARN $BLINK with the rarity reward tiers.
 * Card 2: 💰 FIND REAL ETH treasure drops.
 * Mainnet $BLINK contract is referenced (not touched). /drop is linked
 * even if Phase 6b builds it later.
 */

import Link from "next/link";

const BG = "#0a0a0f";
const SURFACE2 = "#1a1a24";
const GREEN = "#00FF88";
const GREEN2 = "#88FF00";
const WHITE = "#FFFFFF";
const MUTED = "#8a8a99";
const BORDER = "rgba(0,255,136,0.12)";
const BORDER_BRIGHT = "rgba(0,255,136,0.40)";

const BLINK_TOKEN_CONTRACT = "0xe7BF94959b0bfa8CB9e61149de5BFb387B40761B";
const ETHERSCAN_URL = `https://etherscan.io/token/${BLINK_TOKEN_CONTRACT}`;

type Tier = { label: string; reward: string; color: string; bright?: boolean };

const TIERS: Tier[] = [
  { label: "Common", reward: "10 BLINK", color: "#9aa3b2" },
  { label: "Uncommon", reward: "50 BLINK", color: "#00FF88" },
  { label: "Rare", reward: "250 BLINK", color: "#88FF00" },
  { label: "Legendary", reward: "1,500 BLINK", color: "#ffd166" },
  { label: "Mythic", reward: "10,000 BLINK", color: "#ff8ae0", bright: true },
];

const TREASURE_BULLETS = [
  "Drops contain ETH, NFTs, or other tokens",
  "GPS-verified. You actually have to be there.",
  "Anyone can drop. Anyone can find.",
];

const KEYFRAMES = `
@keyframes twoWaysShimmer {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
@keyframes twoWaysBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
@media (prefers-reduced-motion: reduce) {
  .two-ways-shimmer,
  .two-ways-bob {
    animation: none !important;
  }
}
`;

export function TwoWaysToEarn() {
  return (
    <section
      style={{
        padding: "96px 24px",
        maxWidth: 1180,
        margin: "0 auto",
      }}
    >
      <style>{KEYFRAMES}</style>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <span
          style={{
            fontSize: 12,
            letterSpacing: "0.4em",
            color: GREEN,
            textTransform: "uppercase",
            fontWeight: 800,
          }}
        >
          Two ways to earn
        </span>
        <h2
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontSize: "clamp(34px, 6vw, 56px)",
            fontWeight: 900,
            letterSpacing: "-0.035em",
            margin: "12px 0 0",
            color: WHITE,
          }}
        >
          You catch.{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${GREEN}, ${GREEN2})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            You get paid.
          </span>
        </h2>
      </div>

      <div
        className="two-ways-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 24,
        }}
      >
        {/* CARD 1 — EARN $BLINK */}
        <div
          style={{
            background: SURFACE2,
            border: `1px solid ${BORDER}`,
            borderRadius: 24,
            padding: "34px 30px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 80% 0%, rgba(0,255,136,0.12), transparent 55%)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 8,
            }}
          >
            <span
              className="two-ways-bob"
              aria-hidden
              style={{
                fontSize: 38,
                filter: "drop-shadow(0 0 18px rgba(0,255,136,0.55))",
                animation: "twoWaysBob 3.4s ease-in-out infinite",
              }}
            >
              💎
            </span>
            <div
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontWeight: 900,
                fontSize: 26,
                color: WHITE,
                letterSpacing: "-0.01em",
              }}
            >
              EARN <span style={{ color: GREEN }}>$BLINK</span>
            </div>
          </div>
          <p
            style={{
              position: "relative",
              color: WHITE,
              opacity: 0.8,
              fontSize: 15,
              lineHeight: 1.55,
              margin: "0 0 22px",
            }}
          >
            Every catch pays you in our token.
          </p>

          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 22,
            }}
          >
            {TIERS.map((t) => (
              <div
                key={t.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: t.bright
                    ? "linear-gradient(135deg, rgba(255,138,224,0.12), rgba(0,255,136,0.06))"
                    : "rgba(255,255,255,0.03)",
                  border: `1px solid ${t.bright ? "rgba(255,138,224,0.4)" : BORDER}`,
                  boxShadow: t.bright ? "0 0 26px rgba(255,138,224,0.25)" : "none",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    fontFamily: "Space Grotesk, Inter, sans-serif",
                    fontWeight: 800,
                    fontSize: 13,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: t.color,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: t.color,
                      boxShadow: `0 0 10px ${t.color}`,
                    }}
                  />
                  {t.label}
                </span>
                <span
                  style={{
                    fontFamily: "Space Grotesk, Inter, sans-serif",
                    fontWeight: t.bright ? 900 : 800,
                    fontSize: t.bright ? 16 : 14,
                    color: t.bright ? WHITE : WHITE,
                    letterSpacing: "0.04em",
                  }}
                >
                  {t.reward}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              position: "relative",
              padding: "14px 16px",
              borderRadius: 12,
              border: `1px solid ${BORDER}`,
              background: "rgba(0,255,136,0.04)",
              marginBottom: 22,
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: GREEN,
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              Bonuses
            </div>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                color: WHITE,
                opacity: 0.84,
                fontSize: 13.5,
                lineHeight: 1.7,
              }}
            >
              <li>· Genesis NFT holders earn 2x</li>
              <li>· Mythic holders earn 5x</li>
              <li>· Daily streaks stack rewards</li>
            </ul>
          </div>

          <a
            href={ETHERSCAN_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 22px",
              borderRadius: 999,
              border: `1px solid ${GREEN}`,
              color: GREEN,
              textDecoration: "none",
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            View BLINK contract on Etherscan →
          </a>
        </div>

        {/* CARD 2 — FIND REAL ETH */}
        <div
          style={{
            background: SURFACE2,
            border: `1px solid ${BORDER_BRIGHT}`,
            borderRadius: 24,
            padding: "34px 30px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 0 36px rgba(0,255,136,0.10)",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 20% 0%, rgba(255,215,0,0.10), transparent 55%), radial-gradient(circle at 80% 100%, rgba(0,255,136,0.10), transparent 50%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 8,
            }}
          >
            <span
              className="two-ways-bob"
              aria-hidden
              style={{
                fontSize: 38,
                filter: "drop-shadow(0 0 18px rgba(255,215,0,0.5))",
                animation: "twoWaysBob 3.6s ease-in-out 0.4s infinite",
              }}
            >
              💰
            </span>
            <div
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontWeight: 900,
                fontSize: 26,
                color: WHITE,
                letterSpacing: "-0.01em",
              }}
            >
              FIND <span style={{ color: GREEN }}>REAL ETH</span>
            </div>
          </div>
          <p
            style={{
              position: "relative",
              color: WHITE,
              opacity: 0.8,
              fontSize: 15,
              lineHeight: 1.55,
              margin: "0 0 22px",
            }}
          >
            Players hide treasures across the map. Walk there and keep what you find.
          </p>

          <ul
            style={{
              position: "relative",
              margin: "0 0 22px",
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {TREASURE_BULLETS.map((b) => (
              <li
                key={b}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${BORDER}`,
                  color: WHITE,
                  opacity: 0.9,
                  fontSize: 14.5,
                  lineHeight: 1.5,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    color: GREEN,
                    fontWeight: 900,
                    fontSize: 16,
                    lineHeight: 1.2,
                  }}
                >
                  ✓
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "14px 16px",
              borderRadius: 12,
              border: `1px solid ${BORDER}`,
              background: "rgba(255,215,0,0.04)",
              marginBottom: 22,
            }}
          >
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#ffd166",
                fontWeight: 800,
              }}
            >
              Sample drop
            </span>
            <div
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontSize: 18,
                fontWeight: 900,
                color: WHITE,
              }}
            >
              0.05 ETH · Brooklyn Bridge
            </div>
            <div style={{ fontSize: 12, color: MUTED, letterSpacing: "0.05em" }}>
              Dropped by @watcher_x · GPS verified
            </div>
          </div>

          <Link
            href="/drop"
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 22px",
              borderRadius: 999,
              background: `linear-gradient(135deg, ${GREEN}, ${GREEN2})`,
              color: BG,
              textDecoration: "none",
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontWeight: 900,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              boxShadow: "0 0 22px rgba(0,255,136,0.45)",
            }}
          >
            Hide a treasure →
          </Link>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 820px) {
          .two-ways-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
