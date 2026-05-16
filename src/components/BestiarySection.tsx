"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  BESTIARY,
  type Creature,
  type Rarity,
  RARITY_COLOR,
  RARITY_LABEL,
  BLINK_MINT_URL,
  BLINK_OPENSEA_URL,
} from "@/lib/bestiary";
import { CreatureModal } from "./CreatureModal";
import { useBlinkHoldings } from "./YourBestiary";

const BG = "#0a0a0f";
const SURFACE = "#0d0d14";
const BORDER = "rgba(0,255,136,0.10)";
const GREEN = "#00FF88";
const GREEN2 = "#88FF00";
const WHITE = "#FFFFFF";
const MUTED = "#8a8a99";

type RarityFilter = "all" | Rarity;

const RARITY_FRAME: Record<Rarity, string> = {
  common: "linear-gradient(135deg, #9aa3b2 0%, #FFFFFF 50%, #9aa3b2 100%)",
  uncommon: "linear-gradient(135deg, #00FF88 0%, #88FF00 100%)",
  rare: "linear-gradient(135deg, #88FF00 0%, #00FF88 50%, #00CC66 100%)",
  legendary: "linear-gradient(135deg, #FFD773 0%, #FFA500 50%, #FFD773 100%)",
  mythic: "linear-gradient(135deg, #FF66CC 0%, #FF1493 50%, #FF66CC 100%)",
};

const FILTER_ORDER: RarityFilter[] = [
  "all",
  "common",
  "uncommon",
  "rare",
  "legendary",
  "mythic",
];

const AUTOROTATE_MS = 4000;

function modIndex(i: number, n: number): number {
  return ((i % n) + n) % n;
}

function signedOffset(i: number, active: number, n: number): number {
  const raw = modIndex(i - active, n);
  return raw > n / 2 ? raw - n : raw;
}

export function BestiarySection() {
  const [selected, setSelected] = useState<Creature | null>(null);
  const [filter, setFilter] = useState<RarityFilter>("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [paused, setPaused] = useState(false);

  const holdings = useBlinkHoldings();
  const ownedSet = useMemo(
    () =>
      holdings.state === "ready"
        ? new Set<number>([
            ...holdings.holdings.genesis,
            ...holdings.holdings.mythics,
          ])
        : new Set<number>(),
    [holdings],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return BESTIARY;
    return BESTIARY.filter((c) => c.rarity === filter);
  }, [filter]);

  const total = filtered.length;
  const safeActive = total > 0 ? modIndex(activeIndex, total) : 0;
  const activeCreature = total > 0 ? filtered[safeActive] : null;

  const rarityCounts = useMemo(() => {
    const counts: Record<Rarity, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      legendary: 0,
      mythic: 0,
    };
    for (const c of BESTIARY) counts[c.rarity]++;
    return counts;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [filter]);

  const next = useCallback(() => {
    setActiveIndex((i) => modIndex(i + 1, Math.max(total, 1)));
  }, [total]);

  const prev = useCallback(() => {
    setActiveIndex((i) => modIndex(i - 1, Math.max(total, 1)));
  }, [total]);

  const pauseFor = useCallback((ms = 6000) => {
    setPaused(true);
    window.setTimeout(() => setPaused(false), ms);
  }, []);

  useEffect(() => {
    if (reducedMotion || paused || total <= 1) return;
    const id = window.setInterval(() => {
      setActiveIndex((i) => modIndex(i + 1, total));
    }, AUTOROTATE_MS);
    return () => window.clearInterval(id);
  }, [reducedMotion, paused, total]);

  const carouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement !== el && !el.contains(document.activeElement)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
        pauseFor();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
        pauseFor();
      } else if (e.key === "Enter" || e.key === " ") {
        if (activeCreature) {
          e.preventDefault();
          setSelected(activeCreature);
        }
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [next, prev, pauseFor, activeCreature]);

  const dragState = useRef<{ startX: number; lastX: number; active: boolean }>({
    startX: 0,
    lastX: 0,
    active: false,
  });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = { startX: e.clientX, lastX: e.clientX, active: true };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    pauseFor();
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    dragState.current.lastX = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    const dx = dragState.current.lastX - dragState.current.startX;
    dragState.current.active = false;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (Math.abs(dx) > 40) {
      if (dx < 0) next();
      else prev();
    }
  };

  return (
    <section
      id="bestiary"
      style={{
        padding: "112px clamp(16px, 5vw, 24px) 96px",
        maxWidth: 1320,
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div className="blink-bestiary-pulse" />
        <div className="blink-bestiary-motes">
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className={`blink-mote blink-mote-${i % 7}`} />
          ))}
        </div>
      </div>

      <div
        style={{
          textAlign: "center",
          marginBottom: 48,
          position: "relative",
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontSize: 12,
            letterSpacing: "0.42em",
            color: GREEN,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Encounter the Bestiary
        </span>
        <h2
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontSize: "clamp(36px, 6.4vw, 68px)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            margin: "14px 0 16px",
            color: WHITE,
            lineHeight: 1.02,
          }}
        >
          20 SPIRITS. ONE WORLD.
        </h2>
        <p
          style={{
            color: MUTED,
            fontSize: 16,
            lineHeight: 1.6,
            maxWidth: 640,
            margin: "0 auto",
          }}
        >
          Each creature is 1-of-1, minted forever on Ethereum. Catch them in the
          wild, gift them to friends, or watch them appear on the map near you.
        </p>
      </div>

      <div
        ref={carouselRef}
        tabIndex={0}
        role="region"
        aria-label="Bestiary creature carousel"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="blink-carousel-shell"
        style={{
          position: "relative",
          height: "clamp(440px, 64vw, 560px)",
          margin: "0 auto",
          maxWidth: 1100,
          perspective: "1600px",
          outline: "none",
          touchAction: "pan-y",
          zIndex: 2,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformStyle: "preserve-3d",
          }}
        >
          {filtered.map((c, i) => {
            const offset = signedOffset(i, safeActive, total);
            const abs = Math.abs(offset);
            const isCenter = offset === 0;
            if (abs > 3) {
              return null;
            }
            const translateX = offset * 170;
            const rotateY = -offset * 28;
            const translateZ = -abs * 90;
            const scale = 1 - abs * 0.1;
            const opacity = abs === 0 ? 1 : abs === 1 ? 0.78 : abs === 2 ? 0.5 : 0.22;
            const z = 100 - abs;
            return (
              <CarouselCard
                key={c.id}
                creature={c}
                isCenter={isCenter}
                owned={ownedSet.has(c.id)}
                reducedMotion={reducedMotion}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: "clamp(220px, 32vw, 320px)",
                  height: "clamp(300px, 42vw, 420px)",
                  marginLeft: "calc(clamp(220px, 32vw, 320px) / -2)",
                  marginTop: "calc(clamp(300px, 42vw, 420px) / -2)",
                  transform: `translate3d(${translateX}px, 0, ${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease",
                  opacity,
                  zIndex: z,
                  pointerEvents: abs > 2 ? "none" : "auto",
                  cursor: isCenter ? "pointer" : "pointer",
                }}
                onClick={() => {
                  if (isCenter) {
                    setSelected(c);
                  } else {
                    setActiveIndex(modIndex(i, total));
                    pauseFor();
                  }
                }}
              />
            );
          })}
        </div>

        <button
          type="button"
          aria-label="Previous creature"
          onClick={(e) => {
            e.stopPropagation();
            prev();
            pauseFor();
          }}
          className="blink-carousel-arrow"
          style={{
            position: "absolute",
            left: "clamp(4px, 2vw, 24px)",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 200,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Next creature"
          onClick={(e) => {
            e.stopPropagation();
            next();
            pauseFor();
          }}
          className="blink-carousel-arrow"
          style={{
            position: "absolute",
            right: "clamp(4px, 2vw, 24px)",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 200,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,
          marginTop: 18,
          position: "relative",
          zIndex: 2,
        }}
      >
        {filtered.map((_, i) => {
          const isOn = i === safeActive;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Go to creature ${i + 1}`}
              onClick={() => {
                setActiveIndex(i);
                pauseFor();
              }}
              style={{
                width: isOn ? 24 : 8,
                height: 6,
                border: "none",
                borderRadius: 999,
                background: isOn ? GREEN : "rgba(255,255,255,0.18)",
                boxShadow: isOn ? `0 0 12px ${GREEN}88` : "none",
                padding: 0,
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            />
          );
        })}
      </div>

      <div
        style={{
          marginTop: 36,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 10,
          position: "relative",
          zIndex: 2,
        }}
      >
        {FILTER_ORDER.map((f) => {
          const isActive = filter === f;
          const label =
            f === "all" ? "All" : RARITY_LABEL[f];
          const count =
            f === "all" ? BESTIARY.length : rarityCounts[f];
          const color = f === "all" ? GREEN : RARITY_COLOR[f];
          return (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f);
                pauseFor();
              }}
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                padding: "8px 16px",
                borderRadius: 999,
                border: `1px solid ${isActive ? color : "rgba(255,255,255,0.12)"}`,
                background: isActive ? color : "transparent",
                color: isActive ? BG : MUTED,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                cursor: "pointer",
                boxShadow: isActive ? `0 0 18px ${color}55` : "none",
                transition: "all 0.2s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>{label}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  opacity: 0.75,
                  background: isActive ? "rgba(10,10,15,0.18)" : "rgba(255,255,255,0.06)",
                  color: isActive ? BG : color,
                  padding: "2px 6px",
                  borderRadius: 999,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 48,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 14,
          position: "relative",
          zIndex: 2,
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

      <style jsx global>{`
        .blink-carousel-arrow {
          width: 48px;
          height: 48px;
          border-radius: 999px;
          border: 1px solid rgba(0, 255, 136, 0.35);
          background: rgba(13, 13, 20, 0.75);
          color: #00ff88;
          backdrop-filter: blur(10px);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          box-shadow: 0 0 18px rgba(0, 255, 136, 0.25);
        }
        .blink-carousel-arrow:hover {
          background: rgba(0, 255, 136, 0.12);
          border-color: rgba(0, 255, 136, 0.7);
          box-shadow: 0 0 28px rgba(0, 255, 136, 0.55);
          transform: translateY(-50%) scale(1.05);
        }
        .blink-carousel-shell:focus-visible {
          box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.4) inset;
          border-radius: 16px;
        }

        .blink-bestiary-pulse {
          position: absolute;
          left: 50%;
          top: 52%;
          width: 900px;
          height: 900px;
          max-width: 120vw;
          max-height: 120vw;
          transform: translate(-50%, -50%);
          background: radial-gradient(
            circle at center,
            rgba(0, 255, 136, 0.16) 0%,
            rgba(0, 255, 136, 0.06) 28%,
            rgba(0, 255, 136, 0) 60%
          );
          filter: blur(10px);
          animation: blinkPulse 7s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes blinkPulse {
          0%,
          100% {
            opacity: 0.55;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.9;
            transform: translate(-50%, -50%) scale(1.08);
          }
        }

        .blink-bestiary-motes {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
        .blink-mote {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #00ff88;
          box-shadow: 0 0 12px rgba(0, 255, 136, 0.8);
          opacity: 0;
          animation: blinkMote 14s linear infinite;
        }
        .blink-mote-0 { left: 6%;  top: 84%; animation-delay: 0s;  }
        .blink-mote-1 { left: 22%; top: 92%; animation-delay: 2s;  }
        .blink-mote-2 { left: 38%; top: 88%; animation-delay: 4s;  }
        .blink-mote-3 { left: 54%; top: 94%; animation-delay: 6s;  width: 3px; height: 3px; }
        .blink-mote-4 { left: 70%; top: 90%; animation-delay: 8s;  }
        .blink-mote-5 { left: 86%; top: 86%; animation-delay: 10s; }
        .blink-mote-6 { left: 94%; top: 92%; animation-delay: 12s; width: 5px; height: 5px; }
        @keyframes blinkMote {
          0% {
            transform: translate3d(0, 0, 0);
            opacity: 0;
          }
          10% { opacity: 0.9; }
          80% { opacity: 0.7; }
          100% {
            transform: translate3d(-40px, -360px, 0);
            opacity: 0;
          }
        }

        @keyframes blinkShimmer {
          0% { background-position: -150% 0; }
          100% { background-position: 250% 0; }
        }
        @keyframes blinkFoil {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .blink-bestiary-pulse,
          .blink-mote,
          .blink-card-shimmer,
          .blink-card-foil {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}

type CardProps = {
  creature: Creature;
  isCenter: boolean;
  owned: boolean;
  reducedMotion: boolean;
  style: React.CSSProperties;
  onClick: () => void;
};

function CarouselCard({
  creature,
  isCenter,
  owned,
  reducedMotion,
  style,
  onClick,
}: CardProps) {
  const rarityColor = RARITY_COLOR[creature.rarity];
  const frame = RARITY_FRAME[creature.rarity];
  const showFoil =
    creature.rarity === "legendary" || creature.rarity === "mythic";

  const innerRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCenter || reducedMotion) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const ry = (px - 0.5) * 18;
    const rx = (0.5 - py) * 14;
    setTilt({ x: rx, y: ry });
  };

  const onMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const tiltTransform =
    isCenter && !reducedMotion
      ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
      : "";

  return (
    <div
      role="button"
      aria-label={`${creature.name}, ${RARITY_LABEL[creature.rarity]}, #${String(
        creature.id,
      ).padStart(3, "0")}`}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={style}
    >
      <div
        ref={innerRef}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 22,
          padding: 3,
          background: frame,
          boxShadow: isCenter
            ? `0 30px 60px rgba(0,0,0,0.55), 0 0 60px ${rarityColor}66, 0 0 24px ${rarityColor}55`
            : `0 14px 32px rgba(0,0,0,0.5)`,
          transform: tiltTransform,
          transformStyle: "preserve-3d",
          transition: "transform 0.18s ease, box-shadow 0.4s ease",
          filter: isCenter ? "none" : "saturate(0.85)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 19,
            background: "#0d0d14",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              flex: "0 0 62%",
              background: "#000",
              overflow: "hidden",
            }}
          >
            <Image
              src={creature.image}
              alt={creature.name}
              fill
              sizes="(max-width: 480px) 60vw, (max-width: 1024px) 40vw, 320px"
              style={{ objectFit: "cover" }}
              loading={isCenter ? "eager" : "lazy"}
              priority={false}
            />
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(circle at 50% 38%, transparent 55%, ${rarityColor}33 100%)`,
                mixBlendMode: "screen",
                pointerEvents: "none",
              }}
            />
            {showFoil ? (
              <div
                aria-hidden
                className="blink-card-foil"
                style={{
                  position: "absolute",
                  inset: "-40%",
                  background:
                    creature.rarity === "mythic"
                      ? "conic-gradient(from 0deg, transparent 0deg, rgba(255,102,204,0.32) 90deg, transparent 180deg, rgba(255,20,147,0.28) 270deg, transparent 360deg)"
                      : "conic-gradient(from 0deg, transparent 0deg, rgba(255,215,115,0.32) 90deg, transparent 180deg, rgba(255,165,0,0.28) 270deg, transparent 360deg)",
                  mixBlendMode: "screen",
                  pointerEvents: "none",
                  animation: reducedMotion ? "none" : "blinkFoil 8s linear infinite",
                }}
              />
            ) : null}
            <div
              aria-hidden
              className="blink-card-shimmer"
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.18) 48%, rgba(255,255,255,0.04) 55%, transparent 70%)",
                backgroundSize: "200% 100%",
                mixBlendMode: "screen",
                animation: reducedMotion ? "none" : "blinkShimmer 3.6s linear infinite",
                pointerEvents: "none",
              }}
            />
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                fontSize: 9,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontWeight: 800,
                color: BG,
                background: rarityColor,
                padding: "3px 8px",
                borderRadius: 999,
                boxShadow: `0 0 14px ${rarityColor}aa`,
              }}
            >
              {RARITY_LABEL[creature.rarity]}
            </div>
            {owned ? (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
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
                OWNED
              </div>
            ) : null}
          </div>

          <div
            style={{
              flex: 1,
              padding: "10px 14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              background:
                "linear-gradient(180deg, rgba(13,13,20,0.4) 0%, #0d0d14 30%, #0d0d14 100%)",
              position: "relative",
            }}
          >
            <div
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontSize: "clamp(15px, 1.6vw, 20px)",
                fontWeight: 900,
                letterSpacing: "-0.01em",
                color: WHITE,
                lineHeight: 1.1,
              }}
            >
              {creature.name}
            </div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                color: rarityColor,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              {creature.type} · {creature.power}
            </div>
            <div
              style={{
                fontSize: 11,
                lineHeight: 1.4,
                color: MUTED,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {creature.powerDesc}
            </div>
            <div
              style={{
                position: "absolute",
                right: 10,
                bottom: 8,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
                fontSize: 9,
                color: GREEN,
                letterSpacing: "0.12em",
                opacity: 0.85,
              }}
            >
              #{String(creature.id).padStart(3, "0")} / 020
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
