"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const MYTHICS_CONTRACT =
  process.env.NEXT_PUBLIC_BLINK_MYTHICS_CONTRACT ||
  "0x4C3B668A628b47b7CC790FFf14BF4Aaff276E592";
const OPENSEA_COLLECTION = `https://opensea.io/assets/ethereum/${MYTHICS_CONTRACT}`;

const BG = "#0a0a0f";
const SURFACE = "#0d0d14";
const SURFACE2 = "#1a1a24";
const BORDER = "rgba(0,255,136,0.10)";
const BORDER_HOVER = "rgba(0,255,136,0.45)";
const GREEN = "#00FF88";
const WHITE = "#FFFFFF";
const MUTED = "#8a8a99";

type MythicCard = {
  tokenId: number;
  name: string;
  image: string;
  description: string;
  owner: string | null;
  attributes: { trait_type: string; value: string }[];
  openseaUrl: string;
};

function shortAddr(a: string | null): string {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function MythicsSection() {
  const [mythics, setMythics] = useState<MythicCard[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selected, setSelected] = useState<MythicCard | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/mythics", { signal: ctrl.signal });
        if (!res.ok) throw new Error(`http ${res.status}`);
        const json = (await res.json()) as { mythics: MythicCard[] };
        if (cancelled) return;
        setMythics(json.mythics ?? []);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, []);

  if (loadFailed || (mythics !== null && mythics.length === 0)) {
    return null;
  }

  return (
    <section
      id="mythics"
      style={{
        padding: "96px clamp(16px, 5vw, 24px)",
        maxWidth: 1320,
        margin: "0 auto",
        position: "relative",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <span
          style={{
            fontSize: 12,
            letterSpacing: "0.4em",
            color: GREEN,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Ascensions
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
          THE MYTHICS
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
          The Bestiary, awakened. Hand-curated 1-of-1 ascensions for council, holders, and partners.
        </p>
      </div>

      <div
        className="blink-mythics-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 18,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
        }}
      >
        {mythics === null
          ? [0, 1, 2, 3].map((i) => <MythicSkeleton key={i} index={i} />)
          : mythics.map((m) => (
              <MythicCardView
                key={m.tokenId}
                mythic={m}
                onSelect={() => setSelected(m)}
              />
            ))}
      </div>

      <div style={{ marginTop: 48, textAlign: "center" }}>
        <a
          href={OPENSEA_COLLECTION}
          target="_blank"
          rel="noreferrer"
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            padding: "14px 26px",
            borderRadius: 999,
            border: `1px solid ${GREEN}`,
            background: "transparent",
            color: GREEN,
            textDecoration: "none",
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            display: "inline-block",
          }}
        >
          View Collection on OpenSea
        </a>
      </div>

      {selected && (
        <MythicModal mythic={selected} onClose={() => setSelected(null)} />
      )}

      <style>{`
        @media (max-width: 1024px) {
          .blink-mythics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 480px) {
          .blink-mythics-grid {
            grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </section>
  );
}

function MythicSkeleton({ index }: { index: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: "relative",
        background: SURFACE2,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        overflow: "hidden",
        aspectRatio: "2 / 3",
        opacity: 0.55,
        animation: "blinkMythicShimmer 1.6s ease-in-out infinite",
        animationDelay: `${index * 0.08}s`,
      }}
    >
      <style>{`
        @keyframes blinkMythicShimmer {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.75; }
        }
      `}</style>
    </div>
  );
}

function MythicCardView({
  mythic,
  onSelect,
}: {
  mythic: MythicCard;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      aria-label={`${mythic.name}, Mythic #${mythic.tokenId}`}
      style={{
        position: "relative",
        background: SURFACE2,
        border: `1px solid ${hovered ? BORDER_HOVER : BORDER}`,
        borderRadius: 14,
        overflow: "hidden",
        padding: 0,
        cursor: "pointer",
        fontFamily: "inherit",
        color: WHITE,
        textAlign: "left",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 14px 38px rgba(0,0,0,0.5), 0 0 24px rgba(0,255,136,0.30)`
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
        {mythic.image ? (
          <Image
            src={mythic.image}
            alt={mythic.name}
            fill
            sizes="(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 25vw"
            style={{ objectFit: "cover" }}
            unoptimized
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, #1a1a24, #0a0a0f)",
            }}
          />
        )}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            fontSize: 9,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            fontWeight: 900,
            color: BG,
            background: GREEN,
            padding: "3px 8px",
            borderRadius: 999,
            boxShadow: `0 0 12px ${GREEN}88`,
          }}
        >
          Mythic
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
          #{String(mythic.tokenId).padStart(3, "0")}
        </div>
        <div
          style={{
            position: "absolute",
            inset: "auto 0 0 0",
            background:
              "linear-gradient(180deg, transparent, rgba(0,0,0,0.85))",
            padding: "26px 12px 12px",
          }}
        >
          <div
            style={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: "-0.01em",
              color: WHITE,
              marginBottom: 3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {mythic.name}
          </div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.1em",
              color: MUTED,
              fontFamily: "ui-monospace, Menlo, monospace",
            }}
          >
            {shortAddr(mythic.owner)}
          </div>
        </div>
      </div>
    </button>
  );
}

function MythicModal({
  mythic,
  onClose,
}: {
  mythic: MythicCard;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.78)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
          maxHeight: "92vh",
          overflowY: "auto",
          background: SURFACE,
          border: `1px solid ${BORDER_HOVER}`,
          borderRadius: 22,
          padding: 22,
          position: "relative",
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: 999,
            background: SURFACE2,
            border: "none",
            color: WHITE,
            fontSize: 16,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          ×
        </button>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)",
            gap: 22,
          }}
          className="blink-mythic-modal-grid"
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "2 / 3",
              background: "#000",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            {mythic.image && (
              <Image
                src={mythic.image}
                alt={mythic.name}
                fill
                sizes="(max-width: 720px) 90vw, 360px"
                style={{ objectFit: "cover" }}
                unoptimized
              />
            )}
          </div>

          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.32em",
                color: GREEN,
                textTransform: "uppercase",
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Mythic · #{String(mythic.tokenId).padStart(3, "0")}
            </div>
            <h3
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                margin: "0 0 12px",
                color: WHITE,
              }}
            >
              {mythic.name}
            </h3>
            {mythic.description && (
              <p
                style={{
                  color: MUTED,
                  fontSize: 14,
                  lineHeight: 1.6,
                  marginBottom: 16,
                }}
              >
                {mythic.description}
              </p>
            )}

            {mythic.attributes.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                  marginBottom: 18,
                }}
              >
                {mythic.attributes.slice(0, 6).map((t, i) => (
                  <div
                    key={`${t.trait_type}-${i}`}
                    style={{
                      background: SURFACE2,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 10,
                      padding: "8px 10px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: MUTED,
                        fontWeight: 700,
                      }}
                    >
                      {t.trait_type}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: WHITE,
                        marginTop: 3,
                        fontWeight: 600,
                      }}
                    >
                      {t.value}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: MUTED,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Owner
            </div>
            <div
              style={{
                color: WHITE,
                fontFamily: "ui-monospace, Menlo, monospace",
                fontSize: 13,
                marginBottom: 18,
                wordBreak: "break-all",
              }}
            >
              {mythic.owner ?? "—"}
            </div>

            <a
              href={mythic.openseaUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                padding: "12px 22px",
                borderRadius: 999,
                background: GREEN,
                color: BG,
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              View on OpenSea
            </a>
          </div>
        </div>

        <style>{`
          @media (max-width: 640px) {
            .blink-mythic-modal-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
