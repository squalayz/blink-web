"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useAccount } from "wagmi";
import {
  BESTIARY,
  BLINK_MINT_URL,
  RARITY_COLOR,
  RARITY_LABEL,
  type Creature,
} from "@/lib/bestiary";
import { CreatureModal } from "./CreatureModal";
import { sounds } from "@/lib/sounds";

const SURFACE2 = "#1a1a24";
const BORDER = "rgba(0,255,136,0.10)";
const BORDER_HOVER = "rgba(0,255,136,0.45)";
const GREEN = "#00FF88";
const WHITE = "#FFFFFF";
const MUTED = "#8a8a99";

type Holdings = {
  wallet: string;
  genesis: number[];
  mythics: number[];
};

type Variant = "full" | "compact";

export function useBlinkHoldings():
  | { state: "loading"; holdings: null }
  | { state: "error"; holdings: null }
  | { state: "ready"; holdings: Holdings } {
  const { address } = useAccount();
  const [data, setData] = useState<Holdings | null>(null);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setState("loading");
        const target = address ?? "";
        const url = target
          ? `/api/wallet/holdings?wallet=${encodeURIComponent(target)}`
          : "/api/wallet/holdings";
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error(`http ${res.status}`);
        const json = (await res.json()) as {
          wallet: string;
          genesis: { tokenId: number }[];
          mythics: { tokenId: number }[];
        };
        if (cancelled) return;
        setData({
          wallet: json.wallet,
          genesis: json.genesis.map((g) => g.tokenId),
          mythics: json.mythics.map((g) => g.tokenId),
        });
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (state === "loading") return { state, holdings: null };
  if (state === "error") return { state, holdings: null };
  return { state: "ready", holdings: data! };
}

export function YourBestiary({
  variant = "full",
  ownedIds,
}: {
  variant?: Variant;
  ownedIds?: number[];
}) {
  const [selected, setSelected] = useState<Creature | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const fallback = useBlinkHoldings();
  const revealedRef = useRef(false);

  const resolved = useMemo<number[] | null>(() => {
    if (ownedIds) return ownedIds;
    if (fallback.state === "ready") return fallback.holdings.genesis;
    return null;
  }, [ownedIds, fallback]);

  const owned: Creature[] = useMemo(() => {
    if (!resolved) return [];
    const set = new Set(resolved);
    return BESTIARY.filter((c) => set.has(c.id));
  }, [resolved]);

  useEffect(() => {
    if (variant === "compact") return;
    if (revealedRef.current) return;
    if (owned.length === 0) return;
    revealedRef.current = true;
    sounds.play("reveal");
  }, [variant, owned.length]);

  // Council membership = any Genesis or Mythic.
  const isCouncil = owned.length > 0;

  if (variant === "compact") {
    if (!resolved) {
      return null;
    }
    const gCount = resolved.length;
    const mCount =
      fallback.state === "ready" ? fallback.holdings.mythics.length : 0;
    if (gCount === 0 && mCount === 0) return null;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 10px",
          borderRadius: 999,
          border: `1px solid ${BORDER_HOVER}`,
          background: "rgba(0,255,136,0.08)",
          color: GREEN,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.04em",
        }}
      >
        <EyeDot />
        {gCount} Genesis · {mCount} Mythic
      </span>
    );
  }

  if (!resolved) {
    return (
      <section style={containerStyle}>
        <Header isCouncil={false} loading />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))",
            gap: 14,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                aspectRatio: "2 / 3",
                background: SURFACE2,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                opacity: 0.55,
                animation: "blinkSkeleton 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </div>
        <style>{SKELETON_CSS}</style>
      </section>
    );
  }

  if (resolved.length === 0) {
    return (
      <section style={containerStyle}>
        <Header isCouncil={false} />
        <div
          style={{
            border: `1px dashed ${BORDER_HOVER}`,
            borderRadius: 16,
            padding: "28px 22px",
            background: "rgba(0,255,136,0.04)",
            textAlign: "center",
          }}
        >
          <p style={{ color: WHITE, fontSize: 15, margin: "0 0 8px", fontWeight: 600 }}>
            Your wallet holds no BLINK creatures yet.
          </p>
          <p style={{ color: MUTED, fontSize: 13, margin: "0 0 14px" }}>
            Mint a Genesis to be remembered by the Bestiary.
          </p>
          <a
            href={BLINK_MINT_URL}
            target="_blank"
            rel="noreferrer"
            onMouseEnter={() => sounds.play("tick")}
            style={{
              display: "inline-block",
              padding: "10px 22px",
              borderRadius: 999,
              background: GREEN,
              color: "#0a0a0f",
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            Mint on mintmyblink.com
          </a>
        </div>
      </section>
    );
  }

  return (
    <section style={containerStyle}>
      <Header isCouncil={isCouncil} count={owned.length} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))",
          gap: 14,
        }}
      >
        {owned.map((c) => {
          const rarityColor = RARITY_COLOR[c.rarity];
          const hovered = hoveredId === c.id;
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
                border: `1px solid ${hovered ? BORDER_HOVER : BORDER}`,
                borderRadius: 12,
                overflow: "hidden",
                padding: 0,
                cursor: "pointer",
                fontFamily: "inherit",
                color: WHITE,
                textAlign: "left",
                transform: hovered ? "translateY(-4px)" : "translateY(0)",
                boxShadow: hovered
                  ? `0 12px 32px rgba(0,0,0,0.5), 0 0 22px ${rarityColor}55`
                  : "0 3px 10px rgba(0,0,0,0.3)",
                transition:
                  "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
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
                  sizes="160px"
                  style={{ objectFit: "cover" }}
                />
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 6,
                    left: 6,
                    fontSize: 8,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    fontWeight: 800,
                    color: "#0a0a0f",
                    background: rarityColor,
                    padding: "2px 6px",
                    borderRadius: 999,
                  }}
                >
                  {RARITY_LABEL[c.rarity]}
                </div>
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    fontSize: 8,
                    letterSpacing: "0.16em",
                    color: WHITE,
                    background: "rgba(0,0,0,0.6)",
                    padding: "2px 6px",
                    borderRadius: 999,
                    fontWeight: 700,
                  }}
                >
                  #{String(c.id).padStart(3, "0")}
                </div>
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    bottom: 6,
                    left: 6,
                    fontSize: 8,
                    letterSpacing: "0.18em",
                    color: "#0a0a0f",
                    background: GREEN,
                    padding: "2px 6px",
                    borderRadius: 999,
                    fontWeight: 800,
                  }}
                >
                  YOURS
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <CreatureModal creature={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function Header({
  isCouncil,
  count,
  loading,
}: {
  isCouncil: boolean;
  count?: number;
  loading?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 18,
        flexWrap: "wrap",
      }}
    >
      <div>
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.32em",
            color: GREEN,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Your Bestiary
        </span>
        <h2
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontSize: 22,
            fontWeight: 900,
            color: WHITE,
            margin: "4px 0 0",
            letterSpacing: "-0.02em",
          }}
        >
          {loading ? "Scanning your wallet…" : `Held by you${count ? ` · ${count}` : ""}`}
        </h2>
      </div>
      {isCouncil ? (
        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: 999,
            border: `1px solid ${BORDER_HOVER}`,
            color: GREEN,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            background: "rgba(0,255,136,0.08)",
          }}
        >
          <EyeDot />
          Council Member
        </span>
      ) : null}
    </div>
  );
}

function EyeDot() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: GREEN,
        boxShadow: `0 0 8px ${GREEN}`,
      }}
    />
  );
}

const containerStyle: React.CSSProperties = {
  width: "100%",
  padding: "20px 18px 22px",
  borderRadius: 18,
  background: "#0d0d14",
  border: `1px solid ${BORDER}`,
  marginBottom: 20,
  boxSizing: "border-box",
};

const SKELETON_CSS = `
@keyframes blinkSkeleton {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.75; }
}
`;
