"use client";

// /claim — the BlinkWorld homepage experience with the airdrop claim built in.
// Reuses the landing page's chrome, sections, and animation system wholesale;
// adds a claim-focused hero, the ClaimFlow registration card, and the official
// $BLINK contract address. Metadata (og-claim card, noindex) lives in layout.tsx.

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import StarfieldCanvas from "@/components/marketing/StarfieldCanvas";
import CreatureMarquee from "@/components/marketing/CreatureMarquee";
import StatsStrip from "@/components/marketing/StatsStrip";
import ClaimFlow from "./claim-flow";
import {
  STYLE,
  ScrollProgress,
  NoiseOverlay,
  SectionDivider,
  Nav,
  LogoOrb,
  KineticWord,
  FloatingOrbs,
  HeroExplorers,
  AppStoreBadge,
  ExplorerStrip,
  Features,
  ScreenshotCarousel,
  PrivacyFirst,
  Footer,
  SectionHeader,
  Reveal,
  PhoneFrame,
  APP_STORE_URL,
  GREEN,
  GREEN_SOFT,
  BG,
  WHITE,
  TEXT70,
  TEXT50,
  CARD_BORDER,
  GLASS_BG,
  GLASS_SHADOW,
  FONT_DISPLAY,
  FONT_BODY,
  ART,
} from "../landing-page";

// Decorative scroll-parallax layer — client-only, loaded after hydration.
const HeroBackdrop = dynamic(() => import("@/components/marketing/HeroBackdrop"), {
  ssr: false,
});

// Official $BLINK token contract — Ethereum mainnet. The single source of
// truth shown on this page; anything else claiming to be $BLINK is a scam.
const BLINK_CONTRACT = "0xf1D3Fbe00aF8185add548E84d77075bc98f18cE0";
const ETHERSCAN_URL = `https://etherscan.io/token/${BLINK_CONTRACT}`;

const CLAIM_NAV = [
  { id: "claim", label: "Claim" },
  { id: "contract", label: "Contract" },
  { id: "features", label: "Features" },
  { id: "screenshots", label: "Screenshots" },
];

export default function ClaimLandingPage() {
  return (
    <div
      className="bwRoot"
      style={{
        minHeight: "100vh",
        background: BG,
        color: WHITE,
        fontFamily: FONT_BODY,
        overflowX: "hidden",
        position: "relative",
      }}
    >
      <style>{STYLE}</style>
      <style>{CLAIM_STYLE}</style>
      <ScrollProgress />
      <StarfieldCanvas />
      <HeroBackdrop />
      <Nav sections={CLAIM_NAV} />
      <main style={{ position: "relative", zIndex: 2 }}>
        <ClaimHero />
        <ClaimSection />
        <ContractSection />
        <CreatureMarquee />
        <StatsStrip />
        <ExplorerStrip />
        <SectionDivider />
        <Features />
        <SectionDivider />
        <ScreenshotCarousel />
        <SectionDivider />
        <PrivacyFirst />
      </main>
      <Footer />
      <NoiseOverlay />
    </div>
  );
}

/* ────────────────────────────────── Hero ────────────────────────────────── */

// Same cinematic hero as the homepage — kinetic headline, mouse-tilt phone
// cluster, floating orbs and explorers — with the claim CTA front and center.
function ClaimHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);

  // Mouse-tilt on the phone cluster + explorer parallax, identical to the
  // homepage hero. Desktop pointers only; inert under prefers-reduced-motion.
  useEffect(() => {
    const section = sectionRef.current;
    const tilt = tiltRef.current;
    if (!section || !tilt) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const explorers = Array.from(section.querySelectorAll<HTMLElement>(".bwHeroExp"));

    let raf = 0;
    let tracking = false;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };

    const loop = () => {
      cur.x += (target.x - cur.x) * 0.075;
      cur.y += (target.y - cur.y) * 0.075;
      tilt.style.transform = `rotateY(${(cur.x * 9).toFixed(2)}deg) rotateX(${(-cur.y * 7).toFixed(2)}deg)`;
      for (const el of explorers) {
        const depth = Number(el.dataset.depth || 0);
        el.style.translate = `${(cur.x * depth).toFixed(1)}px ${(cur.y * depth * 0.75).toFixed(1)}px`;
      }
      const settled =
        !tracking && Math.abs(cur.x - target.x) < 0.002 && Math.abs(cur.y - target.y) < 0.002;
      if (settled || document.hidden) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onMove = (e: MouseEvent) => {
      const r = section.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      tracking = true;
      kick();
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      tracking = false;
      kick();
    };
    section.addEventListener("mousemove", onMove, { passive: true });
    section.addEventListener("mouseleave", onLeave);
    return () => {
      section.removeEventListener("mousemove", onMove);
      section.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      id="top"
      ref={sectionRef}
      style={{
        position: "relative",
        maxWidth: 1180,
        margin: "0 auto",
        padding: "clamp(56px, 9vw, 110px) 20px clamp(60px, 8vw, 100px)",
      }}
    >
      <FloatingOrbs />
      <HeroExplorers />
      <div className="bwHeroGrid">
        <div style={{ position: "relative", zIndex: 3 }}>
          <div
            className="bwRise"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 26,
              animationDelay: "0.02s",
            }}
          >
            <LogoOrb size={58} />
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: GREEN,
                textTransform: "uppercase",
                padding: "7px 14px",
                borderRadius: 999,
                border: `1px solid rgba(0,255,136,0.35)`,
                background: GREEN_SOFT,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 24px rgba(0,255,136,0.12)",
              }}
            >
              Official $BLINK Airdrop
            </span>
          </div>

          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: "clamp(40px, 6.2vw, 74px)",
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            <KineticWord text="Your" delay={0.08} />{" "}
            <KineticWord text="Steps" delay={0.17} />
            <br />
            <KineticWord text="Earned" delay={0.28} />{" "}
            <span className="bwWord" style={{ animationDelay: "0.42s" }}>
              <span className="bwShimmer">$BLINK</span>
            </span>
          </h1>

          <p
            className="bwRise"
            style={{
              margin: "22px 0 0",
              maxWidth: 540,
              color: TEXT70,
              fontSize: "clamp(16px, 1.6vw, 19px)",
              lineHeight: 1.65,
              animationDelay: "0.55s",
            }}
          >
            Every orb you caught and every step you took in BlinkWorld counts.
            Enter your Blink Code, register your wallet, and claim your share
            of the $BLINK airdrop.
          </p>

          <div
            className="bwRise"
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 18,
              marginTop: 34,
              animationDelay: "0.65s",
            }}
          >
            <a href="#claim" className="bwDownloadBtn" aria-label="Claim your $BLINK tokens">
              Claim Your $BLINK
            </a>
            <a
              href={APP_STORE_URL}
              className="bwGhostBtn"
              aria-label="Download BlinkWorld on the App Store"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${ART}/app-icon.webp`}
                alt=""
                width={26}
                height={26}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              />
              Download the App
            </a>
            <AppStoreBadge />
          </div>

          <div className="bwRise" style={{ animationDelay: "0.75s" }}>
            <ContractChip />
          </div>
        </div>

        <div
          className="bwHeroPhones bwRise"
          aria-hidden
          style={{
            position: "relative",
            zIndex: 2,
            animationDelay: "0.4s",
            perspective: 1100,
          }}
        >
          <div
            ref={tiltRef}
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              transformStyle: "preserve-3d",
              willChange: "transform",
              width: "100%",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 440,
                height: 440,
                borderRadius: "50%",
                background: "radial-gradient(closest-side, rgba(0,255,136,0.2), transparent 70%)",
                filter: "blur(12px)",
              }}
            />
            <PhoneFrame
              src={`${ART}/screens/02_catch_moment.webp`}
              alt=""
              width={196}
              className="bwPhoneBack"
              eager
            />
            <PhoneFrame
              src={`${ART}/screens/01_map_home.webp`}
              alt=""
              width={236}
              className="bwPhoneFront"
              eager
            />
            {/* soft reflection pool beneath the phones */}
            <div
              style={{
                position: "absolute",
                bottom: -46,
                left: "50%",
                transform: "translateX(-50%)",
                width: "72%",
                height: 60,
                borderRadius: "50%",
                background: "radial-gradient(closest-side, rgba(0,255,136,0.3), transparent 72%)",
                filter: "blur(18px)",
                opacity: 0.8,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────── Contract address ──────────────────────────── */

// Copy-to-clipboard with a 2s "Copied" confirmation. Falls back to a hidden
// textarea for older mobile in-app browsers (Telegram/iMessage webviews).
function useCopyContract() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  async function copy() {
    try {
      await navigator.clipboard.writeText(BLINK_CONTRACT);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = BLINK_CONTRACT;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* clipboard unavailable — the address is selectable text */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => () => clearTimeout(timer.current), []);
  return { copied, copy };
}

function CopyIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x={9} y={9} width={11} height={11} rx={2.5} stroke="currentColor" strokeWidth={1.8} />
      <path
        d="M5 15H4.5A1.5 1.5 0 013 13.5v-9A1.5 1.5 0 014.5 3h9A1.5 1.5 0 0115 4.5V5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

// Compact contract pill under the hero CTAs.
function ContractChip() {
  const { copied, copy } = useCopyContract();
  return (
    <div style={{ marginTop: 22, maxWidth: 540 }}>
      <p style={{ margin: "0 0 9px", fontSize: 13, color: TEXT50 }}>
        Official $BLINK contract · Ethereum mainnet
      </p>
      <div className="bwContractChip">
        <span className="bwContractAddr">{BLINK_CONTRACT}</span>
        <button
          type="button"
          className="bwCopyBtn"
          onClick={copy}
          aria-label="Copy the official $BLINK contract address"
        >
          <CopyIcon />
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}

// Full-width glass panel with the contract front and center.
function ContractSection() {
  const { copied, copy } = useCopyContract();
  return (
    <section
      id="contract"
      style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(40px, 6vw, 80px) 20px" }}
    >
      <SectionHeader
        kicker="The token"
        title="The official $BLINK contract"
        sub="One contract, one token. Verify the address below before you trade — anything else calling itself $BLINK is a fake."
      />
      <Reveal>
        <div
          style={{
            marginTop: 42,
            maxWidth: 720,
            marginLeft: "auto",
            marginRight: "auto",
            padding: "clamp(24px, 4vw, 40px)",
            borderRadius: 28,
            border: CARD_BORDER,
            background: GLASS_BG,
            boxShadow: `${GLASS_SHADOW}, 0 0 60px rgba(0,255,136,0.08)`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 14px",
              borderRadius: 999,
              border: "1px solid rgba(0,255,136,0.35)",
              background: GREEN_SOFT,
              fontFamily: FONT_DISPLAY,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: GREEN,
            }}
          >
            $BLINK · Ethereum Mainnet · ERC-20
          </div>
          <div className="bwContractBig">{BLINK_CONTRACT}</div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 14,
              marginTop: 24,
            }}
          >
            <button
              type="button"
              className="bwCopyBtn bwCopyBtnLg"
              onClick={copy}
              aria-label="Copy the official $BLINK contract address"
            >
              <CopyIcon />
              {copied ? "Copied ✓" : "Copy contract address"}
            </button>
            <a
              href={ETHERSCAN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bwGhostBtn bwGhostBtnSm"
            >
              View on Etherscan ↗
            </a>
          </div>
          <p style={{ margin: "22px auto 0", maxWidth: 520, fontSize: 13, lineHeight: 1.6, color: TEXT50 }}>
            BlinkWorld will never DM you a different address, launch a &ldquo;v2&rdquo; without
            announcing it here, or ask you to send funds anywhere. Always double-check the full
            address — scammers rely on look-alikes.
          </p>
        </div>
      </Reveal>
    </section>
  );
}

/* ───────────────────────────── Claim section ────────────────────────────── */

function ClaimSection() {
  return (
    <section
      id="claim"
      style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(40px, 6vw, 80px) 20px" }}
    >
      <SectionHeader
        kicker="Airdrop"
        title="Claim your $BLINK"
        sub="Enter the private Blink Code from your app, reveal your lifetime Blink Balls, and register the wallet where your $BLINK should land."
      />
      <Reveal>
        <div style={{ marginTop: 42 }}>
          <ClaimFlow />
        </div>
      </Reveal>
    </section>
  );
}

/* ──────────────────────────────── Styles ────────────────────────────────── */

const CLAIM_STYLE = `
/* ghost secondary button — outline sibling of .bwDownloadBtn */
.bwGhostBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 54px;
  padding: 0 26px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #fff;
  font-family: ${FONT_DISPLAY};
  font-size: 15.5px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 34px rgba(0,0,0,0.35);
  transition: transform 0.15s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.bwGhostBtn:hover {
  transform: translateY(-1px);
  border-color: rgba(0,255,136,0.55);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 30px rgba(0,255,136,0.2);
}
.bwGhostBtnSm { height: 46px; padding: 0 22px; font-size: 14px; }

/* contract chip (hero) */
.bwContractChip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 7px 7px 16px;
  border-radius: 999px;
  border: 1px solid rgba(0,255,136,0.3);
  background: rgba(0,255,136,0.06);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 30px rgba(0,255,136,0.1);
}
.bwContractAddr {
  flex: 1;
  min-width: 0;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: ${GREEN};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bwCopyBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  flex-shrink: 0;
  height: 38px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(120deg, ${GREEN}, #4DFFA6);
  color: #05060C;
  font-family: ${FONT_DISPLAY};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 16px rgba(0,255,136,0.35), inset 0 1px 0 rgba(255,255,255,0.4);
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}
.bwCopyBtn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 24px rgba(0,255,136,0.5), inset 0 1px 0 rgba(255,255,255,0.4);
}
.bwCopyBtnLg { height: 48px; padding: 0 26px; font-size: 14.5px; }

/* contract section big address */
.bwContractBig {
  margin: 24px auto 0;
  max-width: 620px;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: clamp(13px, 2.4vw, 19px);
  font-weight: 600;
  letter-spacing: 0.02em;
  color: ${GREEN};
  word-break: break-all;
  line-height: 1.5;
  padding: 16px 20px;
  border-radius: 16px;
  border: 1px solid rgba(0,255,136,0.25);
  background: rgba(0,0,0,0.35);
  text-shadow: 0 0 18px rgba(0,255,136,0.35);
  user-select: all;
  -webkit-user-select: all;
}

@media (max-width: 480px) {
  .bwContractChip { flex-direction: column; align-items: stretch; border-radius: 20px; padding: 12px; gap: 10px; }
  .bwContractAddr { text-align: center; white-space: normal; word-break: break-all; font-size: 12px; }
  .bwGhostBtn { width: 100%; }
  .bwDownloadBtn { width: 100%; }
}
`;
