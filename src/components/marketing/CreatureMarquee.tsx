"use client";

// "Meet the Creatures" — dual-direction auto-scrolling marquee of clean
// companion-creature art (public/brand/app/creatures — transparent stickers,
// no trading-card frames). Rows drift opposite ways, pause on hover, and
// creatures lift with a rarity-tinted glow + name tag. The marquee only runs
// while on screen (IntersectionObserver) and freezes entirely under
// prefers-reduced-motion (rows become manually scrollable).

import { useEffect, useRef } from "react";
import Image from "next/image";

const GREEN = "#00FF88";
const FONT_DISPLAY = "'Space Grotesk', 'Inter', -apple-system, sans-serif";

type Tier = "common" | "uncommon" | "rare" | "legendary" | "mythic";

type Creature = { file: string; name: string; tier: Tier };

// Names + tiers mirror src/lib/creature-registry.ts (the subset with clean
// sticker art in public/brand/app/creatures).
const CREATURES: Creature[] = [
  { file: "sprite", name: "Sprite", tier: "common" },
  { file: "pixie", name: "Pixie", tier: "common" },
  { file: "emberling", name: "Emberling", tier: "common" },
  { file: "dustfox", name: "Dustfox", tier: "common" },
  { file: "pebblekin", name: "Pebblekin", tier: "common" },
  { file: "speckle", name: "Speckle", tier: "common" },
  { file: "shimmer", name: "Shimmer", tier: "common" },
  { file: "silkmoth", name: "Silkmoth", tier: "common" },
  { file: "cat", name: "Cat", tier: "uncommon" },
  { file: "cyclops", name: "Cyclops", tier: "rare" },
  { file: "aethermane", name: "Aethermane", tier: "rare" },
  { file: "oracle", name: "Oracle", tier: "legendary" },
  { file: "firsteye", name: "The First Eye", tier: "mythic" },
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
const ROW_A = CREATURES.filter((_, i) => i % 2 === 0);
const ROW_B = CREATURES.filter((_, i) => i % 2 === 1);

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

      <div style={{ marginTop: 44, display: "grid", gap: 10 }}>
        <MarqueeRow creatures={ROW_A} duration={52} />
        <MarqueeRow creatures={ROW_B} duration={66} reverse />
      </div>
    </section>
  );
}

function MarqueeRow({
  creatures,
  duration,
  reverse,
}: {
  creatures: Creature[];
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
            {creatures.map((c, i) => (
              <CreatureSticker key={`${copy}-${c.file}`} creature={c} bobDelay={i * 0.7} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CreatureSticker({ creature, bobDelay }: { creature: Creature; bobDelay: number }) {
  return (
    <figure
      className="bwCreature"
      style={{ ["--glow" as string]: TIER_GLOW[creature.tier] }}
    >
      {/* light pool the creature floats above */}
      <span className="bwCreatureFloor" aria-hidden />
      <span className="bwCreatureBob" style={{ animationDelay: `${bobDelay}s` }}>
        <Image
          src={`/brand/app/creatures/${creature.file}.webp`}
          alt={`${creature.name} — ${TIER_LABEL[creature.tier]} creature`}
          width={200}
          height={200}
          sizes="(max-width: 620px) 140px, 180px"
          draggable={false}
        />
      </span>
      <figcaption className="bwCreatureTag">
        <span style={{ color: "#fff", fontWeight: 700 }}>{creature.name}</span>
        <span style={{ color: TIER_TEXT[creature.tier], letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 10 }}>
          {TIER_LABEL[creature.tier]}
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
  gap: 30px;
  padding: 10px 15px;
}
@keyframes bwMarqScroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

/* Free-floating sticker — no card frame, just art + rarity glow. */
.bwCreature {
  position: relative;
  margin: 0;
  flex: 0 0 auto;
  width: clamp(140px, 15vw, 180px);
  padding-bottom: 34px;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.bwCreatureBob {
  display: block;
  animation: bwCreatureBob 6.5s ease-in-out infinite;
}
.bwCreature img {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
  -webkit-user-drag: none;
  filter: drop-shadow(0 14px 26px rgba(0,0,0,0.55)) drop-shadow(0 0 22px var(--glow));
  transition: filter 0.35s ease, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes bwCreatureBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-9px); }
}
.bwCreatureFloor {
  position: absolute;
  left: 50%;
  bottom: 22px;
  transform: translateX(-50%);
  width: 72%;
  height: 22px;
  border-radius: 50%;
  background: radial-gradient(closest-side, var(--glow), transparent 72%);
  filter: blur(9px);
  opacity: 0.55;
  transition: opacity 0.35s ease, width 0.35s ease;
}
.bwCreature:hover { transform: translateY(-8px); z-index: 2; }
.bwCreature:hover img {
  transform: scale(1.07);
  filter: drop-shadow(0 20px 34px rgba(0,0,0,0.6)) drop-shadow(0 0 34px var(--glow));
}
.bwCreature:hover .bwCreatureFloor { opacity: 0.95; width: 84%; }
.bwCreatureTag {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translate(-50%, 6px);
  display: flex;
  align-items: center;
  gap: 9px;
  white-space: nowrap;
  padding: 6px 12px;
  border-radius: 999px;
  font-family: 'Inter', -apple-system, system-ui, sans-serif;
  font-size: 12px;
  background: rgba(4,6,10,0.82);
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: none;
}
.bwCreature:hover .bwCreatureTag {
  opacity: 1;
  transform: translate(-50%, 0);
}

@media (prefers-reduced-motion: reduce) {
  .bwMarqTrack { animation: none !important; }
  .bwMarqRow { overflow-x: auto; -webkit-mask-image: none; mask-image: none; }
  .bwCreature, .bwCreatureTag, .bwCreature img, .bwCreatureFloor { transition: none !important; }
  .bwCreatureBob { animation: none !important; }
  .bwCreature:hover { transform: none; }
  .bwCreature:hover img { transform: none; }
  .bwCreatureTag { opacity: 1; transform: translate(-50%, 0); }
}
`;
