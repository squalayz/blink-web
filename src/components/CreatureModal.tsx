"use client";

import { useEffect } from "react";
import Image from "next/image";
import {
  type Creature,
  RARITY_COLOR,
  RARITY_LABEL,
  BLINK_MINT_URL,
  BLINK_OPENSEA_URL,
} from "@/lib/bestiary";

type Props = {
  creature: Creature | null;
  onClose: () => void;
};

const PANEL_BG = "#0d0d14";
const PANEL_BORDER = "rgba(0,255,136,0.18)";
const TEXT = "#FFFFFF";
const MUTED = "#8a8a99";
const GREEN = "#00FF88";
const GREEN2 = "#88FF00";
const BG = "#0a0a0f";

export function CreatureModal({ creature, onClose }: Props) {
  useEffect(() => {
    if (!creature) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [creature, onClose]);

  if (!creature) return null;

  const rarityColor = RARITY_COLOR[creature.rarity];
  const rarityLabel = RARITY_LABEL[creature.rarity];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${creature.name} details`}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(5,5,9,0.82)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "blinkModalFade 0.2s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: PANEL_BG,
          border: `1px solid ${PANEL_BORDER}`,
          borderRadius: 22,
          maxWidth: 880,
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 0 80px rgba(0,255,136,0.18), 0 30px 90px rgba(0,0,0,0.6)",
          animation: "blinkModalIn 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.1)",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            zIndex: 2,
            width: 36,
            height: 36,
            borderRadius: 999,
            background: "rgba(0,0,0,0.55)",
            border: `1px solid ${PANEL_BORDER}`,
            color: TEXT,
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
            fontFamily: "Inter, sans-serif",
          }}
        >
          ×
        </button>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 0,
          }}
          className="blink-modal-grid"
        >
          <div
            style={{
              background: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 18,
              borderRight: `1px solid ${PANEL_BORDER}`,
            }}
            className="blink-modal-image"
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "2 / 3",
                maxHeight: "78vh",
                borderRadius: 14,
                overflow: "hidden",
                boxShadow: `0 0 36px ${rarityColor}33`,
              }}
            >
              <Image
                src={creature.image}
                alt={creature.name}
                fill
                sizes="(max-width: 768px) 100vw, 440px"
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
          </div>

          <div
            style={{
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
              fontFamily: "Inter, -apple-system, sans-serif",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: MUTED,
                  fontWeight: 700,
                }}
              >
                #{String(creature.id).padStart(3, "0")}
              </span>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  fontWeight: 800,
                  color: BG,
                  background: rarityColor,
                  padding: "5px 10px",
                  borderRadius: 999,
                }}
              >
                {rarityLabel}
              </span>
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: GREEN,
                  fontWeight: 700,
                }}
              >
                {creature.type}
              </span>
            </div>

            <h2
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontSize: "clamp(32px, 5vw, 46px)",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                margin: 0,
                lineHeight: 1,
                color: TEXT,
              }}
            >
              {creature.name}
            </h2>

            <p
              style={{
                color: MUTED,
                fontSize: 15,
                lineHeight: 1.6,
                margin: 0,
                fontStyle: "italic",
              }}
            >
              &ldquo;{creature.lore}&rdquo;
            </p>

            <div
              style={{
                background: "rgba(0,255,136,0.05)",
                border: `1px solid ${PANEL_BORDER}`,
                borderRadius: 14,
                padding: 18,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: GREEN,
                  fontWeight: 800,
                  marginBottom: 8,
                }}
              >
                Power · {creature.power}
              </div>
              <div style={{ color: TEXT, fontSize: 15, lineHeight: 1.5 }}>
                {creature.powerDesc}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              <a
                href={BLINK_MINT_URL}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  padding: "14px 22px",
                  borderRadius: 999,
                  background: `linear-gradient(135deg, ${GREEN}, ${GREEN2})`,
                  color: BG,
                  textDecoration: "none",
                  fontWeight: 800,
                  fontSize: 13,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  textAlign: "center",
                  boxShadow: "0 0 24px rgba(0,255,136,0.4)",
                }}
              >
                Mint on mintmyblink.com
              </a>
              <a
                href={`${BLINK_OPENSEA_URL}/${creature.id}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  padding: "14px 22px",
                  borderRadius: 999,
                  border: `1px solid ${GREEN}`,
                  background: "transparent",
                  color: GREEN,
                  textDecoration: "none",
                  fontWeight: 800,
                  fontSize: 13,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  textAlign: "center",
                }}
              >
                View on OpenSea
              </a>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes blinkModalFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes blinkModalIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (max-width: 768px) {
          .blink-modal-grid {
            grid-template-columns: 1fr !important;
          }
          .blink-modal-image {
            border-right: none !important;
            border-bottom: 1px solid ${PANEL_BORDER} !important;
          }
        }
      `}</style>
    </div>
  );
}
