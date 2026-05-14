"use client";

import { useState } from "react";
import Image from "next/image";
import {
  BESTIARY,
  type Creature,
  RARITY_COLOR,
  RARITY_LABEL,
  BLINK_MINT_URL,
  BLINK_OPENSEA_URL,
} from "@/lib/bestiary";
import { CreatureModal } from "./CreatureModal";
import { useBlinkHoldings } from "./YourBestiary";

const BG = "#0a0a0f";
const SURFACE = "#0d0d14";
const SURFACE2 = "#1a1a24";
const BORDER = "rgba(0,255,136,0.10)";
const BORDER_HOVER = "rgba(0,255,136,0.45)";
const GREEN = "#00FF88";
const GREEN2 = "#88FF00";
const WHITE = "#FFFFFF";
const MUTED = "#8a8a99";

export function BestiarySection() {
  const [selected, setSelected] = useState<Creature | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const holdings = useBlinkHoldings();
  const ownedSet =
    holdings.state === "ready"
      ? new Set([
          ...holdings.holdings.genesis,
          ...holdings.holdings.mythics,
        ])
      : new Set<number>();

  return (
    <section
      id="bestiary"
      style={{
        padding: "96px 24px",
        maxWidth: 1320,
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <span
          style={{
            fontSize: 12,
            letterSpacing: "0.4em",
            color: GREEN,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          The Bestiary
        </span>
        <h2
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontSize: "clamp(36px, 6vw, 60px)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            margin: "14px 0 14px",
            color: WHITE,
          }}
        >
          THE BESTIARY
        </h2>
        <p
          style={{
            color: MUTED,
            fontSize: 16,
            lineHeight: 1.6,
            maxWidth: 620,
            margin: "0 auto",
          }}
        >
          20 unique creatures. Each one 1-of-1. Minted forever on Ethereum.
        </p>
      </div>

      <div
        className="blink-bestiary-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 18,
        }}
      >
        {BESTIARY.map((c) => {
          const rarityColor = RARITY_COLOR[c.rarity];
          const isHovered = hoveredId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c)}
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(c.id)}
              onBlur={() => setHoveredId(null)}
              aria-label={`${c.name}, ${RARITY_LABEL[c.rarity]}`}
              style={{
                position: "relative",
                background: SURFACE2,
                border: `1px solid ${isHovered ? BORDER_HOVER : BORDER}`,
                borderRadius: 14,
                overflow: "hidden",
                padding: 0,
                cursor: "pointer",
                fontFamily: "inherit",
                color: WHITE,
                textAlign: "left",
                transform: isHovered ? "translateY(-6px)" : "translateY(0)",
                boxShadow: isHovered
                  ? `0 14px 38px rgba(0,0,0,0.5), 0 0 24px ${rarityColor}55`
                  : "0 4px 12px rgba(0,0,0,0.3)",
                transition: "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "2 / 3",
                  background: "#000",
                }}
              >
                <Image
                  src={c.image}
                  alt={c.name}
                  fill
                  sizes="(max-width: 480px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  style={{ objectFit: "cover" }}
                />
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    fontSize: 9,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    fontWeight: 800,
                    color: BG,
                    background: rarityColor,
                    padding: "3px 7px",
                    borderRadius: 999,
                    boxShadow: `0 0 12px ${rarityColor}88`,
                  }}
                >
                  {RARITY_LABEL[c.rarity]}
                </div>
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    color: WHITE,
                    background: "rgba(0,0,0,0.55)",
                    padding: "3px 7px",
                    borderRadius: 999,
                    fontWeight: 700,
                    backdropFilter: "blur(6px)",
                  }}
                >
                  #{String(c.id).padStart(3, "0")}
                </div>
                {ownedSet.has(c.id) ? (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      bottom: 8,
                      left: 8,
                      fontSize: 9,
                      letterSpacing: "0.22em",
                      color: BG,
                      background: GREEN,
                      padding: "3px 8px",
                      borderRadius: 999,
                      fontWeight: 900,
                      boxShadow: `0 0 14px ${GREEN}aa`,
                    }}
                  >
                    YOURS
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 56,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 14,
        }}
      >
        <a
          href={BLINK_MINT_URL}
          target="_blank"
          rel="noreferrer"
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            padding: "16px 30px",
            borderRadius: 999,
            background: `linear-gradient(135deg, ${GREEN}, ${GREEN2})`,
            color: BG,
            textDecoration: "none",
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            boxShadow: "0 0 28px rgba(0,255,136,0.5)",
          }}
        >
          Mint on mintmyblink.com
        </a>
        <a
          href={BLINK_OPENSEA_URL}
          target="_blank"
          rel="noreferrer"
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            padding: "16px 30px",
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
          View Collection on OpenSea
        </a>
        <span
          aria-disabled="true"
          title="Coming soon"
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            padding: "16px 30px",
            borderRadius: 999,
            border: `1px solid ${BORDER}`,
            background: SURFACE,
            color: MUTED,
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor: "not-allowed",
          }}
        >
          Read the Lore · Soon
        </span>
      </div>

      <CreatureModal creature={selected} onClose={() => setSelected(null)} />

      <style jsx>{`
        @media (max-width: 1024px) {
          .blink-bestiary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 14px !important;
          }
        }
        @media (max-width: 480px) {
          .blink-bestiary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }
        }
      `}</style>
    </section>
  );
}
