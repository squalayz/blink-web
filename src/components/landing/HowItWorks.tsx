"use client";

/*
 * Phase-6 How It Works — 3 big cards (Watch, Hunt, Catch).
 * Sits directly below the hero so a stranger can peek at the loop
 * without scrolling far. Each card animates with a hover/tap pulse.
 */

const BG = "#0a0a0f";
const SURFACE = "#0d0d14";
const SURFACE2 = "#1a1a24";
const GREEN = "#00FF88";
const GREEN2 = "#88FF00";
const WHITE = "#FFFFFF";
const MUTED = "#8a8a99";
const BORDER = "rgba(0,255,136,0.10)";

type Step = {
  num: string;
  icon: string;
  title: string;
  copy: string;
};

const STEPS: Step[] = [
  {
    num: "1",
    icon: "👁",
    title: "WATCH",
    copy: "Creatures appear on a live map around you. Common, Rare, Legendary, Mythic.",
  },
  {
    num: "2",
    icon: "🏃",
    title: "HUNT",
    copy: "Walk to them. The closer you get, the brighter they glow.",
  },
  {
    num: "3",
    icon: "✨",
    title: "CATCH",
    copy: "Tap to catch. Keep the creature. Earn $BLINK. Sometimes win ETH.",
  },
];

const KEYFRAMES = `
@keyframes howItWorksFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@keyframes howItWorksPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,136,0); }
  50% { box-shadow: 0 0 32px 4px rgba(0,255,136,0.15); }
}
.how-card {
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}
.how-card:hover,
.how-card:focus-within {
  transform: translateY(-6px);
  border-color: rgba(0,255,136,0.55) !important;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 38px rgba(0,255,136,0.25) !important;
}
@media (prefers-reduced-motion: reduce) {
  .how-icon,
  .how-card,
  .how-card-pulse {
    animation: none !important;
    transition: none !important;
  }
}
`;

export function HowItWorks() {
  return (
    <section
      style={{
        padding: "96px 24px",
        background: SURFACE,
        borderTop: `1px solid ${BORDER}`,
        borderBottom: `1px solid ${BORDER}`,
        position: "relative",
      }}
    >
      <style>{KEYFRAMES}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span
            style={{
              fontSize: 12,
              letterSpacing: "0.4em",
              color: GREEN,
              textTransform: "uppercase",
              fontWeight: 800,
            }}
          >
            How it works
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
            Three steps. One world.
          </h2>
          <p
            style={{
              color: MUTED,
              fontSize: 15,
              lineHeight: 1.6,
              maxWidth: 580,
              margin: "16px auto 0",
            }}
          >
            Real-world catching game on Ethereum. No installs. Open the map in your browser and start hunting.
          </p>
        </div>

        <div
          className="how-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 22,
          }}
        >
          {STEPS.map((s, i) => (
            <div
              key={s.num}
              className="how-card"
              tabIndex={0}
              style={{
                background: SURFACE2,
                border: `1px solid ${BORDER}`,
                borderRadius: 22,
                padding: "32px 26px 30px",
                position: "relative",
                outline: "none",
                cursor: "default",
                overflow: "hidden",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(circle at 80% 0%, rgba(0,255,136,0.10), transparent 55%)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 18,
                }}
              >
                <span
                  style={{
                    fontFamily: "Space Grotesk, Inter, sans-serif",
                    fontWeight: 900,
                    fontSize: 14,
                    color: BG,
                    background: `linear-gradient(135deg, ${GREEN}, ${GREEN2})`,
                    width: 36,
                    height: 36,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    letterSpacing: "0.04em",
                    boxShadow: `0 0 18px rgba(0,255,136,0.55)`,
                  }}
                >
                  {s.num}
                </span>
                <span
                  className="how-icon"
                  aria-hidden
                  style={{
                    fontSize: 34,
                    animation: `howItWorksFloat ${3 + i * 0.4}s ease-in-out infinite`,
                    filter: "drop-shadow(0 0 16px rgba(0,255,136,0.45))",
                  }}
                >
                  {s.icon}
                </span>
              </div>
              <div
                style={{
                  position: "relative",
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontWeight: 900,
                  fontSize: 32,
                  letterSpacing: "-0.02em",
                  color: GREEN,
                  textShadow: "0 0 18px rgba(0,255,136,0.4)",
                  marginBottom: 12,
                }}
              >
                {s.title}
              </div>
              <p
                style={{
                  position: "relative",
                  color: WHITE,
                  opacity: 0.78,
                  fontSize: 15.5,
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {s.copy}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 720px) {
          .how-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </section>
  );
}
