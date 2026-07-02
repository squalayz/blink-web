"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";

const SURFACE = "#0d0d14";
const SURFACE2 = "#1a1a24";
const GREEN = "#00FF88";
const GREEN2 = "#88FF00";
const WHITE = "#FFFFFF";
const MUTED = "#8a8a99";
const BORDER = "rgba(0,255,136,0.10)";

type Step = { num: string; title: string; copy: string; icon: ReactNode };

const ICON_PROPS = {
  width: 40,
  height: 40,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: GREEN,
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  style: { filter: `drop-shadow(0 0 10px ${GREEN}80)` },
  "aria-hidden": true,
};

const STEPS: Step[] = [
  {
    num: "01",
    title: "WATCH",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    copy: "Creatures appear on a live map around you. Common, Rare, Legendary, Mythic.",
  },
  {
    num: "02",
    title: "HUNT",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    copy: "Walk to them. The closer you get, the brighter they glow.",
  },
  {
    num: "03",
    title: "CATCH",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3.5" fill={GREEN} stroke="none" />
        <path d="M3 12h5.5M15.5 12H21" />
      </svg>
    ),
    copy: "Tap to catch. Keep the creature. Earn $BLINK. Sometimes win ETH.",
  },
];

const KEYFRAMES = `
@keyframes howConnectorGrow {
  from { width: 0; opacity: 0; }
  to { width: 100%; opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .how-connector { animation: none !important; width: 100% !important; }
}
`;

function StepCard({ step, index, inView }: { step: Step; index: number; inView: boolean }) {
  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={inView ? { y: 0, opacity: 1 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: index * 0.15 }}
      whileHover={{
        rotateX: -6,
        rotateY: index === 0 ? 8 : index === 2 ? -8 : 0,
        scale: 1.02,
        transition: { duration: 0.25 },
      }}
      style={{
        flex: "1 1 0",
        minWidth: "min(260px, 100%)",
        background: SURFACE2,
        border: `1px solid ${BORDER}`,
        borderRadius: 20,
        padding: "36px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        cursor: "default",
        transformStyle: "preserve-3d",
        willChange: "transform",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow top-left corner */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -40,
          left: -40,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${GREEN}15 0%, ${GREEN}00 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Step number */}
      <span
        style={{
          fontFamily: "Space Grotesk, Inter, sans-serif",
          fontSize: 13,
          fontWeight: 900,
          letterSpacing: "0.25em",
          color: GREEN,
          textTransform: "uppercase",
          opacity: 0.7,
        }}
      >
        {step.num}
      </span>

      {/* Icon */}
      <span style={{ lineHeight: 1, display: "inline-flex" }}>{step.icon}</span>

      {/* Title */}
      <h3
        style={{
          fontFamily: "Space Grotesk, Inter, sans-serif",
          fontSize: "clamp(26px, 4vw, 36px)",
          fontWeight: 900,
          letterSpacing: "-0.03em",
          color: WHITE,
          margin: 0,
          lineHeight: 1,
        }}
      >
        {step.title}
      </h3>

      {/* Copy */}
      <p
        style={{
          fontSize: 15,
          color: MUTED,
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {step.copy}
      </p>

      {/* Bottom border beam */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${GREEN}60, transparent)`,
          opacity: 0,
          transition: "opacity 0.3s ease",
        }}
        className="card-beam"
      />
    </motion.div>
  );
}

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      style={{
        padding: "100px clamp(14px, 4vw, 24px)",
        background: SURFACE,
        borderTop: `1px solid ${BORDER}`,
        borderBottom: `1px solid ${BORDER}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Background ambient */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 80% 50% at 50% 100%, ${GREEN}08 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 64 }}
        >
          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.4em",
              color: GREEN,
              textTransform: "uppercase",
              fontWeight: 700,
              display: "block",
              marginBottom: 14,
            }}
          >
            The Loop
          </span>
          <h2
            style={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontSize: "clamp(36px, 6vw, 64px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              margin: 0,
              lineHeight: 1,
              background: `linear-gradient(135deg, ${WHITE} 40%, ${GREEN} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            HOW IT WORKS
          </h2>
        </motion.div>

        {/* Cards grid */}
        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            alignItems: "stretch",
            perspective: 1000,
          }}
        >
          {STEPS.map((step, i) => (
            <StepCard key={step.num} step={step} index={i} inView={inView} />
          ))}
        </div>

        {/* Animated connector line */}
        <div
          style={{
            position: "relative",
            height: 2,
            margin: "40px auto 0",
            maxWidth: 600,
            background: `${BORDER}`,
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.6 }}
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(90deg, ${GREEN}, ${GREEN2})`,
              transformOrigin: "left",
              borderRadius: 999,
              boxShadow: `0 0 12px ${GREEN}80`,
            }}
          />
        </div>

        {/* Bottom label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 1.4 }}
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 12,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: MUTED,
            fontWeight: 700,
          }}
        >
          No purchases required · Just walk
        </motion.p>
      </div>
    </section>
  );
}
