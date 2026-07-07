"use client";

// "Meet the Creatures" — dual-direction auto-scrolling marquee of the 20
// creature card arts (public/cards). Rows drift opposite ways, pause on
// hover, and cards lift with a rarity-tinted glow. The marquee only runs
// while on screen (IntersectionObserver) and freezes entirely under
// prefers-reduced-motion (rows become manually scrollable).

import { useEffect, useRef } from "react";

const GREEN = "#00FF88";
const FONT_DISPLAY = "'Space Grotesk', 'Inter', -apple-system, sans-serif";

type Tier = "common" | "uncommon" | "rare" | "legendary" | "mythic";

type Card = { file: string; name: string; tier: Tier };

// Names + tiers mirror src/lib/creature-registry.ts.
const CARDS: Card[] = [
  { file: "001_sprite", name: "Sprite", tier: "common" },
  { file: "002_nibbler", name: "Nibbler", tier: "common" },
  { file: "003_pixie", name: "Pixie", tier: "common" },
  { file: "004_emberling", name: "Emberling", tier: "common" },
  { file: "005_dustfox", name: "Dustfox", tier: "common" },
  { file: "006_pebblekin", name: "Pebblekin", tier: "common" },
  { file: "007_speckle", name: "Speckle", tier: "common" },
  { file: "008_hopspirit", name: "Hopspirit", tier: "common" },
  { file: "009_shimmer", name: "Shimmer", tier: "common" },
  { file: "010_silkmoth", name: "Silkmoth", tier: "common" },
  { file: "011_cat", name: "Cat", tier: "uncommon" },
  { file: "012_glitchhare", name: "Glitch Hare", tier: "uncommon" },
  { file: "013_whiskerwisp", name: "Whiskerwisp", tier: "uncommon" },
  { file: "014_hushling", name: "Hushling", tier: "uncommon" },
  { file: "015_eyefly", name: "Eyefly", tier: "uncommon" },
  { file: "016_cyclops", name: "Cyclops", tier: "rare" },
  { file: "017_aethermane", name: "Aethermane", tier: "rare" },
  { file: "018_oracle", name: "Oracle", tier: "legendary" },
  { file: "019_phoenix", name: "The Phoenix", tier: "legendary" },
  { file: "020_firsteye", name: "The First Eye", tier: "mythic" },
];

const TIER_LABEL: Record<Tier, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  legendary: "Legendary",
  mythic: "Mythic",
};

// Rarity glow tints — all within the green/white brand palette.
const TIER_GLOW: Record<Tier, string> = {
  common: "rgba(255,255,255,0.16)",
  uncommon: "rgba(0,255,136,0.3)",
  rare: "rgba(0,255,136,0.5)",
  legendary: "rgba(136,255,0,0.5)",
  mythic: "rgba(220,255,235,0.6)",
};

const TIER_TEXT: Record<Tier, string> = {
  common: "rgba(255,255,255,0.72)",
  uncommon: "#7DFFBE",
  rare: GREEN,
  legendary: "#B9FF66",
  mythic: "#EAFFF4",
};

// Interleave so both rows carry the full rarity spread.
const ROW_A = CARDS.filter((_, i) => i % 2 === 0);
const ROW_B = CARDS.filter((_, i) => i % 2 === 1);

export default function CreatureMarquee() {
  const sectionRef = useRef<HTMLElement>(null);

  // Run the drift only while the section is on screen.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      el?.classList.add("bwMarqLive");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle("bwMarqLive", entry.isIntersecting);
        }
      },
      { rootMargin: "120px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="creatures"
      ref={sectionRef}
      style={{ padding: "clamp(40px, 6vw, 80px) 0", position: "relative", overflow: "hidden" }}
    >
      <style>{MARQUEE_STYLE}</style>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px", textAlign: "center" }}>
        <p
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: GREEN,
            margin: 0,
          }}
        >
          The bestiary
        </p>
        <h2
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: "clamp(28px, 4vw, 44px)",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            margin: "12px 0 0",
          }}
        >
          Meet the{" "}
          <span className="bwMarqTitleGlow">Creatures</span>
        </h2>
        <p
          style={{
            margin: "14px auto 0",
            maxWidth: 560,
            color: "rgba(255,255,255,0.72)",
            fontSize: 16,
            lineHeight: 1.6,
          }}
        >
          From everyday Sprites to the one-of-a-kind First Eye — every creature
          you catch becomes a card in your collection.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 10,
            marginTop: 20,
          }}
        >
          {(Object.keys(TIER_LABEL) as Tier[]).map((t) => (
            <span
              key={t}
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: TIER_TEXT[t],
                padding: "5px 12px",
                borderRadius: 999,
                border: `1px solid ${TIER_GLOW[t]}`,
                background: "rgba(255,255,255,0.03)",
                boxShadow: `inset 0 0 14px ${TIER_GLOW[t].replace(/[\d.]+\)$/, "0.08)")}`,
              }}
            >
              {TIER_LABEL[t]}
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 44, display: "grid", gap: 22 }}>
        <MarqueeRow cards={ROW_A} duration={58} />
        <MarqueeRow cards={ROW_B} duration={72} reverse />
      </div>
    </section>
  );
}

function MarqueeRow({
  cards,
  duration,
  reverse,
}: {
  cards: Card[];
  duration: number;
  reverse?: boolean;
}) {
  return (
    <div className="bwMarqRow">
      <div
        className={`bwMarqTrack${reverse ? " bwMarqRev" : ""}`}
        style={{ animationDuration: `${duration}s` }}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="bwMarqGroup" aria-hidden={copy === 1}>
            {cards.map((c) => (
              <CreatureCard key={`${copy}-${c.file}`} card={c} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CreatureCard({ card }: { card: Card }) {
  return (
    <figure
      className="bwCreature"
      style={{ ["--glow" as string]: TIER_GLOW[card.tier] }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/cards/${card.file}.webp`}
        alt={`${card.name} — ${TIER_LABEL[card.tier]} creature card`}
        width={700}
        height={1044}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      <figcaption className="bwCreatureTag">
        <span style={{ color: "#fff", fontWeight: 700 }}>{card.name}</span>
        <span style={{ color: TIER_TEXT[card.tier], letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 10 }}>
          {TIER_LABEL[card.tier]}
        </span>
      </figcaption>
    </figure>
  );
}

const MARQUEE_STYLE = `
.bwMarqTitleGlow {
  color: ${GREEN};
  text-shadow: 0 0 34px rgba(0,255,136,0.5);
}

.bwMarqRow {
  overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
}
.bwMarqTrack {
  display: flex;
  width: max-content;
  animation: bwMarqScroll linear infinite;
  animation-play-state: paused;
  will-change: transform;
}
.bwMarqLive .bwMarqTrack { animation-play-state: running; }
.bwMarqRow:hover .bwMarqTrack,
.bwMarqRow:focus-within .bwMarqTrack { animation-play-state: paused !important; }
.bwMarqRev { animation-direction: reverse; }
.bwMarqGroup {
  display: flex;
  gap: 20px;
  padding: 14px 10px;
}
@keyframes bwMarqScroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.bwCreature {
  position: relative;
  margin: 0;
  flex: 0 0 auto;
  width: clamp(148px, 16vw, 200px);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  background: #000;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 0.35s ease, border-color 0.35s ease;
}
.bwCreature img {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
  -webkit-user-drag: none;
}
.bwCreature:hover {
  transform: translateY(-10px) rotate(-1.5deg) scale(1.04);
  border-color: var(--glow);
  box-shadow: 0 22px 50px rgba(0,0,0,0.6), 0 0 38px var(--glow);
  z-index: 2;
}
.bwCreatureTag {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 11px;
  border-radius: 10px;
  font-family: 'Inter', -apple-system, system-ui, sans-serif;
  font-size: 12px;
  background: rgba(4,6,10,0.82);
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: none;
}
.bwCreature:hover .bwCreatureTag {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .bwMarqTrack { animation: none !important; }
  .bwMarqRow { overflow-x: auto; -webkit-mask-image: none; mask-image: none; }
  .bwCreature, .bwCreatureTag { transition: none !important; }
  .bwCreatureTag { opacity: 1; transform: none; }
}
`;
