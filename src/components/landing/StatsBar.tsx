"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import CountUp from "react-countup";
import { useInView as useInViewIO } from "react-intersection-observer";

const SURFACE2 = "#1a1a24";
const GREEN = "#00FF88";
const GREEN2 = "#88FF00";
const WHITE = "#FFFFFF";
const MUTED = "#8a8a99";
const BORDER = "rgba(0,255,136,0.10)";

const STATS = [
  { value: 51, suffix: "", label: "Explorers Worldwide" },
  { value: 20, suffix: "K+", label: "Creatures Spawned" },
  { value: 1, suffix: "", label: "Live on Ethereum" },
];

const KEYFRAMES = `
@keyframes beamTravel {
  0% { transform: translateX(-100%) scaleX(0.5); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateX(300%) scaleX(0.5); opacity: 0; }
}
@keyframes beamTravelV {
  0% { transform: translateY(-100%) scaleY(0.5); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(300%) scaleY(0.5); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .beam-h, .beam-v { animation: none !important; display: none; }
}
`;

function StatBox({ stat, index, sectionInView }: {
  stat: typeof STATS[0];
  index: number;
  sectionInView: boolean;
}) {
  const [ref, inView] = useInViewIO({ triggerOnce: true, threshold: 0.5 });
  const animDuration = 0.7 + index * 0.6;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={sectionInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.12 }}
      style={{
        flex: "1 1 0",
        minWidth: 160,
        position: "relative",
        padding: "28px 24px",
        textAlign: "center",
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      {/* Border beam — horizontal top */}
      <div
        className="beam-h"
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${GREEN}, transparent)`,
          animation: `beamTravel ${animDuration}s linear infinite`,
          animationDelay: `${index * 0.4}s`,
          zIndex: 1,
        }}
      />
      {/* Border beam — horizontal bottom */}
      <div
        className="beam-h"
        aria-hidden
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${GREEN2}80, transparent)`,
          animation: `beamTravel ${animDuration + 0.3}s linear infinite`,
          animationDelay: `${index * 0.4 + 0.5}s`,
          zIndex: 1,
        }}
      />

      {/* Value */}
      <div
        style={{
          fontFamily: "Space Grotesk, Inter, sans-serif",
          fontSize: "clamp(32px, 5vw, 52px)",
          fontWeight: 900,
          letterSpacing: "-0.03em",
          color: GREEN,
          lineHeight: 1,
          textShadow: "0 0 20px rgba(0,255,136,0.4)",
        }}
      >
        {inView ? (
          <CountUp
            end={stat.value}
            suffix={stat.suffix}
            duration={2}
            useEasing
          />
        ) : (
          `0${stat.suffix}`
        )}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: MUTED,
          fontWeight: 700,
          marginTop: 8,
        }}
      >
        {stat.label}
      </div>
    </motion.div>
  );
}

export function StatsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section
      style={{
        background: SURFACE2,
        borderTop: `1px solid ${BORDER}`,
        borderBottom: `1px solid ${BORDER}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Subtle grid */}
      <svg
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.02,
          pointerEvents: "none",
        }}
      >
        <defs>
          <pattern id="stats-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke={GREEN} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#stats-grid)" />
      </svg>

      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "stretch",
          position: "relative",
          zIndex: 1,
        }}
      >
        {STATS.map((stat, i) => (
          <StatBox key={stat.label} stat={stat} index={i} sectionInView={inView} />
        ))}
      </motion.div>
    </section>
  );
}
