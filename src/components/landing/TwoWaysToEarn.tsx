"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import CountUp from "react-countup";
import { useInView as useInViewIO } from "react-intersection-observer";

const BG = "#0a0a0f";
const SURFACE2 = "#1a1a24";
const GREEN = "#00FF88";
const GREEN2 = "#88FF00";
const WHITE = "#FFFFFF";
const MUTED = "#8a8a99";
const BORDER = "rgba(0,255,136,0.12)";

const BLINK_TOKEN_CONTRACT =
  process.env.NEXT_PUBLIC_BLINK_TOKEN_CONTRACT ||
  "0xe7BF94959b0bfa8CB9e61149de5BFb387B40761B";
const ETHERSCAN_URL = `https://etherscan.io/token/${BLINK_TOKEN_CONTRACT}`;

type Tier = { label: string; reward: string; rewardNum: number; rewardSuffix: string; color: string };

const TIERS: Tier[] = [
  { label: "Common", reward: "10 BLINK", rewardNum: 10, rewardSuffix: " BLINK", color: "#9aa3b2" },
  { label: "Uncommon", reward: "50 BLINK", rewardNum: 50, rewardSuffix: " BLINK", color: GREEN },
  { label: "Rare", reward: "250 BLINK", rewardNum: 250, rewardSuffix: " BLINK", color: GREEN2 },
  { label: "Legendary", reward: "1,500 BLINK", rewardNum: 1500, rewardSuffix: " BLINK", color: "#ffd166" },
  { label: "Mythic", reward: "10,000 BLINK", rewardNum: 10000, rewardSuffix: " BLINK", color: "#ff8ae0" },
];

const TREASURE_BULLETS = [
  "Drops contain ETH, NFTs, or other tokens",
  "GPS-verified. You actually have to be there.",
  "Anyone can drop. Anyone can find.",
];

const KEYFRAMES = `
@keyframes rotateBorder {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes checkDraw {
  from { stroke-dashoffset: 30; opacity: 0; }
  to { stroke-dashoffset: 0; opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .rotating-border { animation: none !important; }
  .check-draw { animation: none !important; stroke-dashoffset: 0 !important; opacity: 1 !important; }
}
`;

function AnimatedBorderCard({
  children,
  delay = 0,
  fromX = 0,
  inView,
}: {
  children: React.ReactNode;
  delay?: number;
  fromX?: number;
  inView: boolean;
}) {
  return (
    <motion.div
      initial={{ x: fromX, opacity: 0 }}
      animate={inView ? { x: 0, opacity: 1 } : {}}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay }}
      style={{ flex: "1 1 0", minWidth: "min(300px, 100%)", position: "relative", padding: 2 }}
    >
      {/* Rotating conic gradient border */}
      <div
        className="rotating-border"
        aria-hidden
        style={{
          position: "absolute",
          inset: -1,
          borderRadius: 22,
          background: `conic-gradient(from 0deg, ${GREEN}00 0%, ${GREEN}60 25%, ${GREEN}00 50%, ${GREEN2}30 75%, ${GREEN}00 100%)`,
          animation: "rotateBorder 4s linear infinite",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          background: SURFACE2,
          borderRadius: 20,
          padding: "36px 28px",
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}

function TierRow({ tier, index, inView }: { tier: Tier; index: number; inView: boolean }) {
  const [ref, tierVisible] = useInViewIO({ triggerOnce: true, threshold: 0.5 });

  return (
    <motion.div
      ref={ref}
      initial={{ x: -20, opacity: 0 }}
      animate={inView ? { x: 0, opacity: 1 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
      whileHover={{ x: 4 }}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 14px",
        borderRadius: 10,
        background: "rgba(0,255,136,0.03)",
        border: "1px solid rgba(0,255,136,0.06)",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        transition: "background 0.2s ease, border-color 0.2s ease",
      }}
    >
      {/* Shimmer on hover */}
      <motion.div
        initial={{ x: "-120%" }}
        whileHover={{ x: "220%" }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(115deg, transparent 0%, rgba(0,255,136,0.12) 45%, rgba(255,255,255,0.08) 50%, rgba(0,255,136,0.12) 55%, transparent 100%)",
          pointerEvents: "none",
        }}
      />
      <span style={{ fontSize: 13, color: tier.color, fontWeight: 700 }}>{tier.label}</span>
      <span style={{ fontSize: 14, fontWeight: 900, color: tier.color, fontFamily: "Space Grotesk, Inter, sans-serif" }}>
        {tierVisible ? (
          <CountUp
            end={tier.rewardNum}
            suffix={tier.rewardSuffix}
            separator=","
            duration={1.5}
            useEasing
          />
        ) : (
          `0${tier.rewardSuffix}`
        )}
      </span>
    </motion.div>
  );
}

function AnimatedCheck({ inView, delay }: { inView: boolean; delay: number }) {
  return (
    <motion.svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.3, delay }}
      style={{ flexShrink: 0 }}
    >
      <circle cx="8" cy="8" r="7" stroke={GREEN} strokeWidth="1.5" opacity={0.3} />
      <motion.path
        d="M 4.5 8 L 7 10.5 L 11.5 5.5"
        stroke={GREEN}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : {}}
        transition={{ duration: 0.5, delay: delay + 0.15, ease: "easeOut" }}
      />
    </motion.svg>
  );
}

export function TwoWaysToEarn() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      style={{
        padding: "100px clamp(14px, 4vw, 24px)",
        background: BG,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Ambient glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: 0,
          left: "20%",
          width: 500,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${GREEN}0A 0%, transparent 70%)`,
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
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
            Two Ways to Win
          </span>
          <h2
            style={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontSize: "clamp(32px, 5.5vw, 60px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              margin: 0,
              lineHeight: 1,
              color: WHITE,
            }}
          >
            Earn more than you expect.
          </h2>
        </motion.div>

        {/* Two cards */}
        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            alignItems: "stretch",
          }}
        >
          {/* Card 1: EARN $BLINK */}
          <AnimatedBorderCard delay={0.1} fromX={-80} inView={inView}>
            <div style={{ marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: GREEN,
                  fontWeight: 700,
                }}
              >
                Card Rewards
              </span>
            </div>
            <h3
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontSize: "clamp(28px, 4vw, 40px)",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                color: WHITE,
                margin: "0 0 8px",
                lineHeight: 1,
              }}
            >
              Earn $BLINK
            </h3>
            <p style={{ fontSize: 14, color: MUTED, marginBottom: 24, lineHeight: 1.55 }}>
              Every catch earns you $BLINK tokens, distributed by rarity.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TIERS.map((tier, i) => (
                <TierRow key={tier.label} tier={tier} index={i} inView={inView} />
              ))}
            </div>

            <div
              style={{
                marginTop: 24,
                padding: "12px 16px",
                background: "rgba(0,255,136,0.04)",
                borderRadius: 10,
                border: `1px solid ${BORDER}`,
              }}
            >
              <span style={{ fontSize: 12, color: MUTED }}>
                Real ERC-20 token on Ethereum ·{" "}
                <a
                  href={ETHERSCAN_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: GREEN, textDecoration: "none", fontWeight: 700 }}
                >
                  View contract
                </a>
              </span>
            </div>
          </AnimatedBorderCard>

          {/* Card 2: FIND REAL ETH */}
          <AnimatedBorderCard delay={0.25} fromX={80} inView={inView}>
            <div style={{ marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: "#ffd166",
                  fontWeight: 700,
                }}
              >
                Treasure Drops
              </span>
            </div>
            <h3
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontSize: "clamp(28px, 4vw, 40px)",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                color: WHITE,
                margin: "0 0 8px",
                lineHeight: 1,
              }}
            >
              Find Real ETH
            </h3>
            <p style={{ fontSize: 14, color: MUTED, marginBottom: 28, lineHeight: 1.55 }}>
              Hidden in the real world. GPS-locked. First to arrive wins.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {TREASURE_BULLETS.map((bullet, i) => (
                <motion.div
                  key={i}
                  initial={{ x: 20, opacity: 0 }}
                  animate={inView ? { x: 0, opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: i * 0.12 + 0.4 }}
                  style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
                >
                  <AnimatedCheck inView={inView} delay={i * 0.12 + 0.5} />
                  <span style={{ fontSize: 14, color: WHITE, lineHeight: 1.5, opacity: 0.9 }}>
                    {bullet}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Treasure drop visual */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={inView ? { scale: 1, opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.7 }}
              style={{
                marginTop: 32,
                padding: "20px",
                background: "rgba(255,209,102,0.05)",
                borderRadius: 14,
                border: "1px solid rgba(255,209,102,0.15)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "clamp(28px, 5vw, 40px)",
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontWeight: 900,
                  color: "#ffd166",
                  textShadow: "0 0 24px rgba(255,209,102,0.4)",
                  letterSpacing: "-0.03em",
                }}
              >
                ETH · NFTs · Tokens
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 6, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Real value. Real world.
              </div>
            </motion.div>

            <motion.a
              href="/drop"
              whileHover={{ scale: 1.02 }}
              style={{
                display: "inline-block",
                marginTop: 20,
                padding: "12px 22px",
                borderRadius: 999,
                border: "1px solid rgba(255,209,102,0.3)",
                background: "rgba(255,209,102,0.06)",
                color: "#ffd166",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Create a drop →
            </motion.a>
          </AnimatedBorderCard>
        </div>
      </div>
    </section>
  );
}
