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
  Features,
  ScreenshotCarousel,
  PrivacyFirst,
  Footer,
  SectionHeader,
  Reveal,
  PhoneFrame,
  APP_STORE_URL,
  GREEN,
  GREEN_LIME,
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

// Buy $BLINK directly in Phantom (in-wallet swap). Referral link — opens in a
// new tab so the claim flow the visitor may have in progress is never lost.
const PHANTOM_BUY_URL =
  "https://phantom.com/tokens/ethereum/0xf1d3fbe00af8185add548e84d77075bc98f18ce0?referralId=492luq1zrwu";

const CLAIM_NAV = [
  { id: "claim", label: "Claim" },
  { id: "contract", label: "Contract" },
  { id: "racing", label: "Racing" },
  { id: "styles", label: "Styles" },
  { id: "features", label: "Features" },
];

// New-feature art (sprites + kart pulled from the app, pre-optimized webp).
const STYLES_ART = "/brand/app/styles";

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
        <SectionDivider />
        <RacingSection />
        <SectionDivider />
        <FishingSection />
        <SectionDivider />
        <StyleShowcase />
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
              href={PHANTOM_BUY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bwBuyBtn"
              aria-label="Buy $BLINK on Phantom (opens in a new tab)"
            >
              <PhantomGhostIcon />
              <span>Buy $BLINK</span>
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

// Minimal Phantom-style ghost glyph — single currentColor stroke/fill so it
// stays inside the black/green/white palette.
function PhantomGhostIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3a8 8 0 00-8 8v9l2.6-2 2.4 2 3-2 3 2 2.4-2 2.6 2v-9a8 8 0 00-8-8z"
        fill="currentColor"
        opacity={0.9}
      />
      <circle cx={9.2} cy={10.4} r={1.35} fill="#05060C" />
      <circle cx={14.8} cy={10.4} r={1.35} fill="#05060C" />
    </svg>
  );
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
            <a
              href={PHANTOM_BUY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bwBuyBtn bwBuyBtnSm"
              aria-label="Buy $BLINK on Phantom (opens in a new tab)"
            >
              <PhantomGhostIcon />
              <span>Buy on Phantom</span>
            </a>
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

      {/* Buy & Boost — gold-glow highlight reinforcing that purchases grow rewards */}
      <Reveal delay={120}>
        <div className="bwBoostCard">
          <Sparks count={6} />
          <div className="bwBoostHead">
            <span className="bwBoostIcon" aria-hidden>
              <IconChartUp />
            </span>
            <span className="bwBoostPill">Hold more · Earn more</span>
          </div>
          <h3 className="bwBoostTitle">Buy &amp; boost your rewards</h3>
          <p className="bwBoostBody">
            Your purchases don&rsquo;t just sit there — they&rsquo;re tracked. The more $BLINK
            you buy and hold in your registered wallet, the bigger your reward share grows as
            BlinkWorld grows. Early believers earn the most.
          </p>
          <a
            href={PHANTOM_BUY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bwBuyBtn bwBuyBtnSm"
            aria-label="Buy $BLINK on Phantom (opens in a new tab)"
          >
            <PhantomGhostIcon />
            <span>Buy $BLINK on Phantom</span>
          </a>
        </div>
      </Reveal>
    </section>
  );
}

/* ───────────────────────────── Claim section ────────────────────────────── */

// Minimal stroke icons for the how-it-works steps — currentColor so each
// card's accent tints them.
function IconWallet() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x={3} y={6} width={18} height={14} rx={3.5} stroke="currentColor" strokeWidth={1.9} />
      <path d="M3 9.5h18" stroke="currentColor" strokeWidth={1.9} />
      <circle cx={16.6} cy={14.8} r={1.5} fill="currentColor" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2.5L4.8 13.4h6L9.6 21.5l8.6-11.1h-6L13 2.5z"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinejoin="round"
        fill="rgba(255,255,255,0.06)"
      />
    </svg>
  );
}

function IconChartUp() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 17.5l5.6-5.6 3.6 3.6L20 7.8"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15.2 7.5H20v4.8" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The three key messages, as numbered step cards. Accents are rgb triplets so
// the CSS can derive borders/glows/text from one custom property per card.
const CLAIM_STEPS = [
  {
    num: "1",
    kicker: "One-time setup",
    title: "Register once",
    acc: "0,255,136",
    icon: <IconWallet />,
    body: (
      <>
        Enter your private Blink Code and lock in the wallet where your $BLINK should
        arrive. <strong>This is the only claim you&rsquo;ll ever make</strong> — one code,
        one wallet, set forever.
      </>
    ),
  },
  {
    num: "2",
    kicker: "Automatic rewards",
    title: "Play & earn on autopilot",
    acc: "77,216,255",
    icon: <IconBolt />,
    body: (
      <>
        From then on, <strong>$BLINK is sent straight to your wallet</strong> as you play
        and earn in the app. No coming back, no re-claiming — rewards simply arrive.
      </>
    ),
  },
  {
    num: "3",
    kicker: "Hold more · Earn more",
    title: "Buy & boost",
    acc: "255,194,77",
    icon: <IconChartUp />,
    body: (
      <>
        Purchases are tracked. <strong>The more $BLINK you buy and hold</strong> in your
        registered wallet, the bigger your rewards grow as BlinkWorld grows.
      </>
    ),
  },
];

// Glowing, gently pulsing "important message" banner. Accent-tinted animated
// gradient border; inert under prefers-reduced-motion via CLAIM_STYLE.
function GlowCallout({
  acc,
  color,
  icon,
  title,
  children,
  style,
}: {
  acc: string;
  color: string;
  icon: string;
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="bwCallout" style={{ ["--acc" as string]: acc, ...style }}>
      <span className="bwCalloutIcon" aria-hidden>
        {icon}
      </span>
      <p>
        <strong style={{ color }}>{title}</strong> {children}
      </p>
    </div>
  );
}

function ClaimSection() {
  return (
    <section
      id="claim"
      style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(40px, 6vw, 80px) 20px" }}
    >
      <SectionHeader
        kicker="Airdrop"
        title="Claim your $BLINK"
        sub="Enter the private Blink Code from your app, reveal your lifetime Blink Balls, and register the wallet where your $BLINK should land. It's a one-time setup — after that, rewards come to you."
      />

      {/* How claiming works — the three key messages as numbered step cards */}
      <Reveal>
        <p className="bwStepsKicker">How claiming works</p>
      </Reveal>
      <div className="bwStepsGrid">
        {CLAIM_STEPS.map((s, i) => (
          <Reveal key={s.num} delay={i * 120} className="bwStepCell">
            <div className="bwStepCard" style={{ ["--acc" as string]: s.acc }}>
              <div className="bwStepTop">
                <span className="bwStepNum">{s.num}</span>
                <span className="bwStepIcon">{s.icon}</span>
              </div>
              <span className="bwStepKicker">{s.kicker}</span>
              <h3 className="bwStepTitle">{s.title}</h3>
              <p className="bwStepBody">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={120}>
        <GlowCallout
          acc="0,255,136"
          color={GREEN}
          icon="⚡"
          title="One-time setup —"
          style={{ marginTop: 30 }}
        >
          claim once and you&rsquo;re set forever. $BLINK rewards are sent to your wallet
          automatically as you play — you never need to claim again.
        </GlowCallout>
      </Reveal>

      <Reveal>
        <div style={{ marginTop: 38 }}>
          <ClaimFlow />
        </div>
      </Reveal>
    </section>
  );
}

/* ─────────────────────────── Racing — USA Grand Prix ─────────────────────── */

// The 13 "Legends" marquee tracks from the app's StateCircuits roster —
// landmark + state, taglines verbatim from the in-app track data.
const LEGEND_TRACKS = [
  { landmark: "Times Square", state: "New York" },
  { landmark: "The Grand Canyon", state: "Arizona" },
  { landmark: "The Las Vegas Strip", state: "Nevada" },
  { landmark: "Rodeo Drive", state: "California" },
  { landmark: "Speedway, Indianapolis", state: "Indiana" },
  { landmark: "The Alamo", state: "Texas" },
  { landmark: "Waikiki Beach", state: "Hawaii" },
  { landmark: "The French Quarter", state: "Louisiana" },
  { landmark: "Broadway, Nashville", state: "Tennessee" },
  { landmark: "Bonneville Salt Flats", state: "Utah" },
  { landmark: "The Magnificent Mile", state: "Illinois" },
  { landmark: "Ocean Drive", state: "Florida" },
  { landmark: "Back Bay", state: "Massachusetts" },
];

// On-track item pickups, straight from the app's RaceItem roster.
const RACE_ITEMS = [
  "Storm Bolt",
  "Emberhawk",
  "Goo Bomb",
  "Ember Trail",
  "Stone Wall",
  "Aether Shield",
  "Blink Boost",
  "Tempest Rush",
];

// Animated neon circuit — a closed loop with a glowing "racing line" chasing
// around it (stroke-dashoffset animation, pure CSS, inert on reduced motion).
function NeonCircuit() {
  const d =
    "M 60 150 C 40 90, 110 40, 190 46 C 270 52, 330 30, 380 70 C 430 110, 400 160, 340 178 C 300 190, 300 236, 240 240 C 160 245, 130 210, 110 200 C 80 186, 76 172, 60 150 Z";
  return (
    <svg
      viewBox="0 0 440 280"
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <path d={d} fill="none" stroke="rgba(0,255,136,0.14)" strokeWidth={14} strokeLinecap="round" />
      <path d={d} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2} strokeDasharray="4 10" />
      <path
        className="bwCircuitLine"
        d={d}
        pathLength={100}
        fill="none"
        stroke={GREEN}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="16 84"
        style={{ filter: "drop-shadow(0 0 8px rgba(0,255,136,0.9))" }}
      />
    </svg>
  );
}

// Decorative rising sparks for the glow panels — a handful of CSS-animated
// dots, hidden entirely under prefers-reduced-motion.
function Sparks({ count = 9 }: { count?: number }) {
  return (
    <span aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => (
        <i
          key={i}
          className="bwSpark"
          style={{
            left: `${(i * 97) % 100}%`,
            width: i % 3 === 0 ? 4 : 3,
            height: i % 3 === 0 ? 4 : 3,
            animationDuration: `${5 + ((i * 1.7) % 6)}s`,
            animationDelay: `${(i * 1.13) % 5}s`,
          }}
        />
      ))}
    </span>
  );
}

function RacingSection() {
  return (
    <section
      id="racing"
      style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(40px, 6vw, 80px) 20px" }}
    >
      <div className="bwShimmerTitle">
        <SectionHeader
          kicker="New · USA Grand Prix"
          title="Race real streets in all 50 states"
          sub="Blink Races are live 1v1 kart duels on neon circuits built from America's actual roads — one iconic landmark track per state, identical every race, learnable, masterable."
        />
      </div>
      <Reveal>
        <div className="bwNeonPanel" style={{ marginTop: 46 }}>
          <Sparks />
          <div className="bwRaceGrid">
            <div>
              <span className="bwNewPill">In the app now</span>
              <h3 className="bwPanelTitle">
                3 laps. 1 rival. <span className="bwShimmer">Winner takes both.</span>
              </h3>
              <ul className="bwGlowList">
                <li>
                  <strong>50 landmark circuits</strong> — from Times Square to the Grand Canyon,
                  every state gets one signature loop stitched from its real streets.
                </li>
                <li>
                  <strong>A real-car-sized kart</strong> rolling between real buildings, with
                  paint jobs, underglow, trails, decals and your own racing number.
                </li>
                <li>
                  <strong>Wager your Blink Balls</strong> — stake 10 to 250 on a race and the
                  winner takes the whole pot, or race free for glory.
                </li>
                <li>
                  <strong>Challenge anyone</strong> — pick a friend or share a 5-letter race
                  code. No friend request needed.
                </li>
              </ul>
              <div className="bwItemChips" aria-label="On-track item pickups">
                {RACE_ITEMS.map((item) => (
                  <span key={item} className="bwItemChip">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="bwRaceArt" aria-hidden>
              <NeonCircuit />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${STYLES_ART}/kart.webp`}
                alt=""
                width={587}
                height={440}
                loading="lazy"
                decoding="async"
                className="bwKartArt"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${STYLES_ART}/style-racer.webp`}
                alt=""
                width={238}
                height={600}
                loading="lazy"
                decoding="async"
                className="bwRacerArt"
              />
            </div>
          </div>
        </div>
      </Reveal>
      {/* Legends track marquee — duplicated list for a seamless CSS loop */}
      <div className="bwTrackMarquee" aria-hidden>
        <div className="bwTrackTrack">
          {[...LEGEND_TRACKS, ...LEGEND_TRACKS].map((t, i) => (
            <span key={`${t.landmark}-${i}`} className="bwTrackChip">
              <span className="bwTrackDot" />
              {t.landmark}
              <em>{t.state}</em>
            </span>
          ))}
        </div>
      </div>
      <p style={{ margin: "18px auto 0", maxWidth: 560, textAlign: "center", fontSize: 12.5, color: TEXT50 }}>
        Blink Balls are in-game points with no cash value. Real locations never touch a race —
        you race a state's landmark circuit, not your street.
      </p>
    </section>
  );
}

/* ───────────────────────── Fishing — The Blink Pond ─────────────────────── */

const BAIT_TIERS = [
  { name: "Minnow", cost: 25, blurb: "Safe splash — pulls the little ones." },
  { name: "Shrimp", cost: 50, blurb: "A step braver. Uncommons come sniffing." },
  { name: "Squid", cost: 100, blurb: "Rare hunters can't resist it." },
  { name: "Golden Lure", cost: 250, blurb: "Legendary eyes open in the deep." },
  { name: "Abyss Chum", cost: 500, blurb: "Wakes what should stay asleep." },
];

const POND_FISH = [
  { src: "fish-puffgill.webp", w: 445, h: 420, dur: 7 },
  { src: "fish-finblade.webp", w: 776, h: 420, dur: 8.5 },
  { src: "fish-angler.webp", w: 494, h: 420, dur: 7.8 },
  { src: "fish-leviathan.webp", w: 362, h: 420, dur: 9 },
];

function FishingSection() {
  return (
    <section
      id="pond"
      style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(40px, 6vw, 80px) 20px" }}
    >
      <div className="bwShimmerTitle">
        <SectionHeader
          kicker="New · The Blink Pond"
          title="Bait it, fight it, land the jackpot"
          sub="BlinkWorld's fishing mini-game turns every cast into a wager: your bait is the stake, the fight is the game, and the rarer the catch, the bigger the pot."
        />
      </div>
      <Reveal>
        <div className="bwNeonPanel" style={{ marginTop: 46 }}>
          <Sparks count={7} />
          <div className="bwPondFish" aria-hidden>
            {POND_FISH.map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={f.src}
                src={`${STYLES_ART}/${f.src}`}
                alt=""
                width={f.w}
                height={f.h}
                loading="lazy"
                decoding="async"
                className="bwFishArt"
                style={{ animationDuration: `${f.dur}s`, animationDelay: `${i * 0.9}s` }}
              />
            ))}
          </div>
          <div className="bwBaitRow">
            {BAIT_TIERS.map((b, i) => (
              <Reveal key={b.name} delay={i * 70}>
                <div className="bwBaitCard">
                  <span className="bwBaitName">{b.name}</span>
                  <span className="bwBaitCost">{b.cost} Balls</span>
                  <span className="bwBaitBlurb">{b.blurb}</span>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="bwPondFacts">
            <span className="bwPondFact">3 free casts a day</span>
            <span className="bwPondFact">Win up to 8× your bait</span>
            <span className="bwPondFact">Night Tide 10pm–4am wakes the rare ones</span>
            <span className="bwPondFact">Six rarities, up to Primal</span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ─────────────────────── New looks — premium styles ─────────────────────── */

const STYLE_CARDS = [
  {
    src: "style-royal-girl.webp",
    w: 380,
    h: 600,
    name: "Royalty",
    blurb: "Crown, robe & medallion",
    unlock: "15,000 Blink Balls",
  },
  {
    src: "style-tycoon.webp",
    w: 280,
    h: 600,
    name: "Tycoon",
    blurb: "Fur coat & gold everything",
    unlock: "40,000 Blink Balls",
  },
  {
    src: "style-ninja.webp",
    w: 268,
    h: 600,
    name: "Ninja",
    blurb: "Masked shadow in green trim",
    unlock: "Level 12",
  },
  {
    src: "style-dino.webp",
    w: 333,
    h: 600,
    name: "Dino Suit",
    blurb: "Inflatable T-rex chaos",
    unlock: "6,000 Blink Balls",
  },
];

function StyleShowcase() {
  return (
    <section
      id="styles"
      style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(40px, 6vw, 80px) 20px" }}
    >
      <div className="bwShimmerTitle">
        <SectionHeader
          kicker="New looks"
          title="Nine styles. One legend — you."
          sub="The Explorer Studio just dropped its wildest fits yet. Earn Blink Balls out in the world, then spend them on a whole new you — every style in any skin tone, guy or girl."
        />
      </div>
      <div className="bwStyleRow" style={{ marginTop: 46 }}>
        {STYLE_CARDS.map((c, i) => (
          <Reveal key={c.name} delay={i * 90} className="bwStyleCell">
            <div className="bwStyleCard">
              <span className="bwStyleHalo" aria-hidden />
              <Sparks count={5} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${STYLES_ART}/${c.src}`}
                alt={`${c.name} explorer style`}
                width={c.w}
                height={c.h}
                loading="lazy"
                decoding="async"
                className="bwStyleArt"
              />
              <span className="bwStyleName">{c.name}</span>
              <span className="bwStyleBlurb">{c.blurb}</span>
              <span className="bwStyleUnlock">{c.unlock}</span>
            </div>
          </Reveal>
        ))}
      </div>
      <p style={{ margin: "26px auto 0", maxWidth: 560, textAlign: "center", fontSize: 14, color: TEXT70 }}>
        Plus Street, Racer, Mech, Boss and the original Explorer techwear — unlocked by
        levelling up or earned with Blink Balls.
      </p>
    </section>
  );
}

/* ──────────────────────────────── Styles ────────────────────────────────── */

const CLAIM_STYLE = `
/* ── Buy $BLINK (Phantom) — animated gradient ring + pulsing glow ── */
.bwBuyBtn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 54px;
  padding: 0 30px;
  border-radius: 999px;
  background: linear-gradient(120deg, ${GREEN}, #EAFFF4 28%, ${GREEN} 55%, ${GREEN_LIME} 78%, ${GREEN});
  background-size: 280% 100%;
  color: ${GREEN};
  font-family: ${FONT_DISPLAY};
  font-size: 16.5px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  animation: bwBorderFlow 5s linear infinite, bwBuyPulse 2.6s ease-in-out infinite;
  transition: transform 0.15s ease;
}
.bwBuyBtn::before {
  content: "";
  position: absolute;
  inset: 2px;
  border-radius: 999px;
  background:
    radial-gradient(120% 160% at 50% 0%, rgba(0,255,136,0.16), rgba(5,6,12,0) 55%),
    #070A10;
}
.bwBuyBtn > * { position: relative; z-index: 1; }
.bwBuyBtn > span { text-shadow: 0 0 16px rgba(0,255,136,0.55); }
.bwBuyBtn:hover { transform: translateY(-1px) scale(1.02); }
.bwBuyBtnSm { height: 48px; padding: 0 24px; font-size: 14.5px; }
@keyframes bwBorderFlow {
  from { background-position: 0% 0; }
  to { background-position: 280% 0; }
}
@keyframes bwBuyPulse {
  0%, 100% { box-shadow: 0 0 18px rgba(0,255,136,0.3), 0 0 46px rgba(0,255,136,0.14); }
  50% { box-shadow: 0 0 30px rgba(0,255,136,0.55), 0 0 72px rgba(0,255,136,0.26); }
}

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

/* ── How claiming works — numbered step cards (accent via --acc rgb triplet) ── */
.bwStepsKicker {
  margin: 44px 0 0;
  text-align: center;
  font-family: ${FONT_DISPLAY};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${TEXT50};
}
.bwStepsGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-top: 20px;
}
.bwStepCell { min-width: 0; }
.bwStepCell > .bwStepCard { height: 100%; }
.bwStepCard {
  --acc: 0,255,136;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 26px 24px 24px;
  border-radius: 24px;
  overflow: hidden;
  background:
    linear-gradient(#090B12, #090B12) padding-box,
    linear-gradient(150deg, rgba(var(--acc), 0.65), rgba(255,255,255,0.12) 45%, rgba(var(--acc), 0.4)) border-box;
  border: 1.5px solid transparent;
  animation: bwStepGlow 5.5s ease-in-out infinite;
}
.bwStepCard::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(120% 80% at 50% 0%, rgba(var(--acc), 0.1), transparent 60%);
}
@keyframes bwStepGlow {
  0%, 100% { box-shadow: 0 0 24px rgba(var(--acc), 0.1), inset 0 1px 0 rgba(255,255,255,0.06); }
  50% { box-shadow: 0 0 52px rgba(var(--acc), 0.24), inset 0 1px 0 rgba(255,255,255,0.06); }
}
.bwStepTop {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.bwStepNum {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 14px;
  border: 1px solid rgba(var(--acc), 0.45);
  background: rgba(var(--acc), 0.1);
  color: rgb(var(--acc));
  font-family: ${FONT_DISPLAY};
  font-size: 19px;
  font-weight: 700;
  box-shadow: 0 0 18px rgba(var(--acc), 0.25), inset 0 1px 0 rgba(255,255,255,0.1);
  text-shadow: 0 0 12px rgba(var(--acc), 0.6);
}
.bwStepIcon {
  display: inline-flex;
  color: rgb(var(--acc));
  filter: drop-shadow(0 0 10px rgba(var(--acc), 0.55));
}
.bwStepKicker {
  position: relative;
  margin-top: 6px;
  font-family: ${FONT_DISPLAY};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgb(var(--acc));
  text-shadow: 0 0 14px rgba(var(--acc), 0.4);
}
.bwStepTitle {
  position: relative;
  margin: 0;
  font-family: ${FONT_DISPLAY};
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #fff;
}
.bwStepBody {
  position: relative;
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: ${TEXT70};
}
.bwStepBody strong { color: #fff; font-weight: 600; }
@media (max-width: 860px) {
  .bwStepsGrid { grid-template-columns: 1fr; gap: 14px; }
}

/* ── glowing "important message" callout banner ── */
.bwCallout {
  --acc: 0,255,136;
  position: relative;
  display: flex;
  gap: 14px;
  align-items: flex-start;
  max-width: 720px;
  margin: 0 auto;
  padding: 17px 22px;
  border-radius: 20px;
  border: 1.5px solid transparent;
  overflow: hidden;
  background:
    linear-gradient(#07090F, #07090F) padding-box,
    linear-gradient(120deg, rgba(var(--acc), 0.8), rgba(255,255,255,0.2) 30%, rgba(var(--acc), 0.55) 60%, rgba(255,255,255,0.16) 82%, rgba(var(--acc), 0.8)) border-box;
  background-size: auto, 300% 100%;
  animation: bwPanelFlow 8s linear infinite, bwCalloutPulse 3.4s ease-in-out infinite;
}
.bwCallout::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(120% 100% at 50% 0%, rgba(var(--acc), 0.12), transparent 65%);
}
@keyframes bwCalloutPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(var(--acc), 0.14); }
  50% { box-shadow: 0 0 44px rgba(var(--acc), 0.3); }
}
.bwCalloutIcon {
  position: relative;
  font-size: 20px;
  line-height: 24px;
  filter: drop-shadow(0 0 10px rgba(var(--acc), 0.7));
}
.bwCallout p {
  position: relative;
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255,255,255,0.88);
}
.bwCallout strong { font-weight: 700; }

/* ── Buy & Boost — gold-glow highlight card ── */
.bwBoostCard {
  --acc: 255,194,77;
  position: relative;
  max-width: 720px;
  margin: 26px auto 0;
  padding: clamp(24px, 4vw, 36px);
  border-radius: 26px;
  border: 1.5px solid transparent;
  overflow: hidden;
  text-align: center;
  background:
    linear-gradient(#0B0A07, #0B0A07) padding-box,
    linear-gradient(120deg, rgba(255,194,77,0.75), rgba(255,255,255,0.18) 30%, rgba(255,150,50,0.55) 60%, rgba(255,255,255,0.16) 82%, rgba(255,194,77,0.75)) border-box;
  background-size: auto, 300% 100%;
  animation: bwPanelFlow 9s linear infinite, bwCalloutPulse 3.8s ease-in-out infinite;
}
.bwBoostCard::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(110% 90% at 50% 0%, rgba(255,194,77,0.12), transparent 62%);
}
.bwBoostCard .bwSpark {
  background: #FFC24D;
  box-shadow: 0 0 8px rgba(255,194,77,0.9), 0 0 20px rgba(255,194,77,0.45);
}
.bwBoostHead {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.bwBoostIcon {
  display: inline-flex;
  color: #FFC24D;
  filter: drop-shadow(0 0 12px rgba(255,194,77,0.6));
}
.bwBoostPill {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255,194,77,0.45);
  background: rgba(255,194,77,0.08);
  color: #FFD166;
  font-family: ${FONT_DISPLAY};
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-shadow: 0 0 12px rgba(255,194,77,0.5);
}
.bwBoostTitle {
  position: relative;
  margin: 16px 0 0;
  font-family: ${FONT_DISPLAY};
  font-size: clamp(21px, 2.8vw, 26px);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #fff;
}
.bwBoostBody {
  position: relative;
  margin: 12px auto 0;
  max-width: 520px;
  font-size: 14.5px;
  line-height: 1.65;
  color: ${TEXT70};
}
.bwBoostCard .bwBuyBtn { position: relative; margin-top: 22px; }

/* ── shimmering section titles ── */
.bwShimmerTitle h2 {
  background: linear-gradient(110deg, #FFFFFF 30%, ${GREEN} 42%, #EAFFF4 50%, ${GREEN} 58%, #FFFFFF 70%);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: bwTitleSheen 7s linear infinite;
}
@keyframes bwTitleSheen {
  from { background-position: 140% 0; }
  to { background-position: -160% 0; }
}

/* ── neon glow panel — animated gradient frame + breathing glow ── */
.bwNeonPanel {
  position: relative;
  padding: clamp(26px, 4.5vw, 52px);
  border-radius: 30px;
  background:
    linear-gradient(${BG}, ${BG}) padding-box,
    linear-gradient(120deg, rgba(0,255,136,0.65), rgba(255,255,255,0.16) 30%, rgba(0,255,136,0.5) 55%, rgba(136,255,0,0.45) 80%, rgba(0,255,136,0.65)) border-box;
  background-size: auto, 300% 100%;
  border: 1.5px solid transparent;
  overflow: hidden;
  animation: bwPanelFlow 9s linear infinite, bwPanelBreathe 5s ease-in-out infinite;
}
.bwNeonPanel::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(90% 60% at 50% 0%, rgba(0,255,136,0.1), transparent 60%),
    ${GLASS_BG};
}
@keyframes bwPanelFlow {
  from { background-position: 0 0, 0% 0; }
  to { background-position: 0 0, 300% 0; }
}
@keyframes bwPanelBreathe {
  0%, 100% { box-shadow: 0 0 40px rgba(0,255,136,0.1), inset 0 1px 0 rgba(255,255,255,0.06); }
  50% { box-shadow: 0 0 80px rgba(0,255,136,0.22), inset 0 1px 0 rgba(255,255,255,0.06); }
}

/* rising spark particles */
.bwSpark {
  position: absolute;
  bottom: -6px;
  border-radius: 50%;
  background: ${GREEN};
  box-shadow: 0 0 8px rgba(0,255,136,0.9), 0 0 20px rgba(0,255,136,0.45);
  opacity: 0;
  animation: bwSparkRise linear infinite;
}
@keyframes bwSparkRise {
  0% { transform: translateY(0) scale(1); opacity: 0; }
  12% { opacity: 0.85; }
  70% { opacity: 0.5; }
  100% { transform: translateY(-380px) scale(0.4); opacity: 0; }
}

/* "new" pill with heartbeat dot */
.bwNewPill {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 6px 24px;
  border-radius: 999px;
  border: 1px solid rgba(0,255,136,0.4);
  background: ${GREEN_SOFT};
  color: ${GREEN};
  font-family: ${FONT_DISPLAY};
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.bwNewPill::before {
  content: "";
  position: absolute;
  left: 11px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${GREEN};
  box-shadow: 0 0 10px rgba(0,255,136,0.9);
  animation: bwDotPulse 1.6s ease-in-out infinite;
}
@keyframes bwDotPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.6); opacity: 0.55; }
}

/* ── racing panel ── */
.bwRaceGrid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 36px;
  align-items: center;
}
.bwPanelTitle {
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: clamp(24px, 3.2vw, 34px);
  letter-spacing: -0.02em;
  line-height: 1.15;
  margin: 18px 0 0;
}
.bwGlowList {
  margin: 20px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 13px;
  color: ${TEXT70};
  font-size: 15px;
  line-height: 1.6;
}
.bwGlowList strong { color: #fff; font-weight: 600; }
.bwGlowList li {
  position: relative;
  padding-left: 24px;
}
.bwGlowList li::before {
  content: "";
  position: absolute;
  left: 2px;
  top: 9px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${GREEN};
  box-shadow: 0 0 10px rgba(0,255,136,0.8);
}
.bwItemChips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
.bwItemChip {
  padding: 6px 13px;
  border-radius: 999px;
  border: 1px solid rgba(0,255,136,0.28);
  background: rgba(0,255,136,0.06);
  color: rgba(255,255,255,0.85);
  font-family: ${FONT_DISPLAY};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, color 0.2s ease;
}
.bwItemChip:hover {
  border-color: rgba(0,255,136,0.7);
  color: ${GREEN};
  box-shadow: 0 0 18px rgba(0,255,136,0.3);
  transform: translateY(-2px);
}
.bwRaceArt { position: relative; min-height: 300px; }
.bwCircuitLine { animation: bwCircuitChase 5s linear infinite; }
@keyframes bwCircuitChase {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -100; }
}
.bwKartArt {
  position: relative;
  z-index: 2;
  width: min(78%, 380px);
  height: auto;
  display: block;
  margin: 34px auto 0;
  filter: drop-shadow(0 18px 34px rgba(0,255,136,0.28));
  animation: bwHover 7s ease-in-out infinite;
}
.bwRacerArt {
  position: absolute;
  z-index: 3;
  right: 2%;
  bottom: -8px;
  height: 210px;
  width: auto;
  filter: drop-shadow(0 0 22px rgba(0,255,136,0.35)) drop-shadow(0 14px 22px rgba(0,0,0,0.45));
  animation: bwExpBob 8s ease-in-out infinite;
}
@media (max-width: 860px) {
  .bwRaceGrid { grid-template-columns: 1fr; gap: 10px; }
  .bwRaceArt { min-height: 260px; order: -1; }
  .bwRacerArt { height: 170px; right: 0; }
}

/* legends track marquee */
.bwTrackMarquee {
  margin-top: 26px;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
}
.bwTrackTrack {
  display: flex;
  gap: 12px;
  width: max-content;
  animation: bwTrackScroll 44s linear infinite;
}
@keyframes bwTrackScroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.bwTrackChip {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 9px 18px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  color: #fff;
  font-family: ${FONT_DISPLAY};
  font-size: 13.5px;
  font-weight: 600;
  white-space: nowrap;
}
.bwTrackChip em {
  font-style: normal;
  color: ${TEXT50};
  font-size: 12px;
  font-weight: 500;
}
.bwTrackDot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${GREEN};
  box-shadow: 0 0 8px rgba(0,255,136,0.8);
  flex-shrink: 0;
}

/* ── fishing panel ── */
.bwPondFish {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: clamp(10px, 3vw, 34px);
  flex-wrap: wrap;
  padding: 6px 0 10px;
}
.bwFishArt {
  height: clamp(84px, 12vw, 140px);
  width: auto;
  filter: drop-shadow(0 0 24px rgba(0,255,136,0.3)) drop-shadow(0 14px 24px rgba(0,0,0,0.5));
  animation: bwFishBob ease-in-out infinite;
}
@keyframes bwFishBob {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-16px) rotate(2.5deg); }
}
.bwBaitRow {
  position: relative;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-top: 26px;
}
.bwBaitRow > div { height: 100%; }
.bwBaitCard {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 16px 15px;
  border-radius: 18px;
  border: 1px solid rgba(0,255,136,0.18);
  background: rgba(0,255,136,0.045);
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.25s ease, box-shadow 0.25s ease;
}
.bwBaitCard:hover {
  transform: translateY(-5px);
  border-color: rgba(0,255,136,0.55);
  box-shadow: 0 0 30px rgba(0,255,136,0.18);
}
.bwBaitName {
  font-family: ${FONT_DISPLAY};
  font-size: 14.5px;
  font-weight: 700;
  color: #fff;
}
.bwBaitCost {
  font-family: ${FONT_DISPLAY};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${GREEN};
  text-shadow: 0 0 12px rgba(0,255,136,0.5);
}
.bwBaitBlurb { font-size: 12.5px; line-height: 1.5; color: ${TEXT50}; }
@media (max-width: 900px) {
  .bwBaitRow { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .bwBaitRow > div:last-child { grid-column: span 2; }
}
.bwPondFacts {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 24px;
}
.bwPondFact {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  color: ${TEXT70};
  font-size: 13px;
  font-weight: 600;
}

/* ── style showcase ── */
.bwStyleRow {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}
.bwStyleCell { min-width: 0; }
.bwStyleCell > .bwStyleCard { height: 100%; }
@media (max-width: 900px) {
  .bwStyleRow { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.bwStyleCard {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 30px 16px 22px;
  border-radius: 24px;
  overflow: hidden;
  background:
    linear-gradient(#090B12, #090B12) padding-box,
    linear-gradient(150deg, rgba(0,255,136,0.55), rgba(255,255,255,0.1) 40%, rgba(0,255,136,0.35)) border-box;
  border: 1.5px solid transparent;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease;
}
.bwStyleCard:hover {
  transform: translateY(-8px) rotate(-1deg);
  box-shadow: 0 0 50px rgba(0,255,136,0.22);
}
.bwStyleHalo {
  position: absolute;
  top: 12%;
  left: 50%;
  transform: translateX(-50%);
  width: 78%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(0,255,136,0.22), transparent 72%);
  filter: blur(14px);
  animation: bwHaloPulse 4.5s ease-in-out infinite;
}
@keyframes bwHaloPulse {
  0%, 100% { opacity: 0.55; transform: translateX(-50%) scale(1); }
  50% { opacity: 1; transform: translateX(-50%) scale(1.12); }
}
.bwStyleArt {
  position: relative;
  height: clamp(180px, 22vw, 250px);
  width: auto;
  max-width: 100%;
  object-fit: contain;
  filter: drop-shadow(0 14px 28px rgba(0,255,136,0.28));
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.bwStyleCard:hover .bwStyleArt { transform: translateY(-6px) scale(1.05); }
.bwStyleName {
  margin-top: 14px;
  font-family: ${FONT_DISPLAY};
  font-size: 17px;
  font-weight: 700;
  color: #fff;
}
.bwStyleBlurb { font-size: 12.5px; color: ${TEXT50}; text-align: center; }
.bwStyleUnlock {
  margin-top: 10px;
  padding: 5px 13px;
  border-radius: 999px;
  border: 1px solid rgba(0,255,136,0.35);
  background: ${GREEN_SOFT};
  font-family: ${FONT_DISPLAY};
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${GREEN};
  text-shadow: 0 0 12px rgba(0,255,136,0.4);
}

@media (max-width: 480px) {
  .bwContractChip { flex-direction: column; align-items: stretch; border-radius: 20px; padding: 12px; gap: 10px; }
  .bwContractAddr { text-align: center; white-space: normal; word-break: break-all; font-size: 12px; }
  .bwGhostBtn { width: 100%; }
  .bwDownloadBtn { width: 100%; }
  .bwBuyBtn { width: 100%; }
  .bwStyleArt { height: 150px; }
}

/* every claim-page animation goes inert under prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .bwBuyBtn, .bwNeonPanel, .bwCircuitLine, .bwKartArt, .bwRacerArt, .bwFishArt,
  .bwTrackTrack, .bwSpark, .bwNewPill::before, .bwStyleHalo,
  .bwStepCard, .bwCallout, .bwBoostCard,
  .bwShimmerTitle h2 {
    animation: none !important;
  }
  .bwStepCard { box-shadow: 0 0 24px rgba(var(--acc), 0.12); }
  .bwCallout, .bwBoostCard { box-shadow: 0 0 24px rgba(var(--acc), 0.16); }
  .bwSpark { display: none; }
  .bwShimmerTitle h2 { background-position: 50% 0; }
  .bwBuyBtn:hover, .bwItemChip:hover, .bwBaitCard:hover, .bwStyleCard:hover { transform: none; }
  .bwStyleCard:hover .bwStyleArt { transform: none; }
  .bwItemChip, .bwBaitCard, .bwStyleCard, .bwStyleArt { transition: none !important; }
}
`;
