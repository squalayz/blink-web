"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  Persistence                                                        */
/* ------------------------------------------------------------------ */
const STORAGE_KEY = "onboarding_complete";

export function useOnboardingComplete(): boolean {
  const [done, setDone] = useState(true); // default true to avoid flash
  useEffect(() => {
    setDone(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);
  return done;
}

function markComplete() {
  localStorage.setItem(STORAGE_KEY, "true");
}

/* ------------------------------------------------------------------ */
/*  Screen data                                                        */
/* ------------------------------------------------------------------ */
interface FeatureCard {
  emoji: string;
  title: string;
  body: string;
  borderColor: string;
}

interface Screen {
  pill?: { label: string; color: string };
  icon: "globe" | "crosshair" | "arrow-down" | "wallet" | "sparkle" | "orb-cluster";
  headline: string;
  subhead?: string;
  body?: string;
  cards?: FeatureCard[];
  gridCards?: FeatureCard[];
  badges?: { label: string; color: string; symbol: string }[];
  checks?: string[];
  statPills?: { label: string; bg: string }[];
  cta: string;
}

const SCREENS: Screen[] = [
  {
    icon: "globe",
    headline: "The Eye is open.",
    subhead: "Don't blink.",
    body: "BLINK lets people spawn real crypto and NFTs as Creatures anywhere on Earth. Walk to them. Witness them. Keep what\u2019s inside.",
    cta: "How does it work? \u2192",
  },
  {
    pill: { label: "WATCH MODE", color: "#00FF88" },
    icon: "crosshair",
    headline: "Watch Creatures near you",
    cards: [
      { emoji: "", title: "See creatures on the map", body: "Open the Watch tab to see glowing creatures spawned by other users around the world.", borderColor: "#00FF88" },
      { emoji: "", title: "Walk to the creature", body: "Get within 100 meters. The closer you get, the bigger the pulse.", borderColor: "#88FF00" },
      { emoji: "", title: "Catch it", body: "Pay the claim fee and the crypto inside transfers directly to your wallet.", borderColor: "#00FF88" },
    ],
    cta: "What about spawning? \u2192",
  },
  {
    pill: { label: "SPAWN MODE", color: "#88FF00" },
    icon: "arrow-down",
    headline: "Spawn your own Creatures",
    cards: [
      { emoji: "", title: "Crypto Creature", body: "Spawn ETH. First one there wins it.", borderColor: "#00FF88" },
      { emoji: "", title: "NFT Creature", body: "Place an NFT at a location. Whoever finds it, keeps it.", borderColor: "#88FF00" },
      { emoji: "", title: "Stealth Creature", body: "Invisible until watchers are 50m away. Ultimate ambush.", borderColor: "#00FF88" },
    ],
    cta: "What about my wallet? \u2192",
  },
  {
    icon: "wallet",
    headline: "Real crypto. Real value.",
    body: "Connect your wallet. Everything you catch gets deposited directly.",
    badges: [
      // BLINK: ETH-only \u2014 SOL/BTC badges removed.
      { label: "ETH", color: "#00FF88", symbol: "\u039e" },
    ],
    checks: [
      "Non-custodial \u2014 only you control your keys",
      "All transactions happen on-chain",
      "Caught creature earnings deposit automatically",
    ],
    cta: "What else can I do? \u2192",
  },
  {
    icon: "sparkle",
    headline: "More than just watching",
    subhead: "A full social crypto experience",
    gridCards: [
      { emoji: "", title: "Your Profile", body: "Track stats, badges, and cities conquered.", borderColor: "#00FF88" },
      { emoji: "", title: "The Council", body: "Compete worldwide. Top your city. Climb the global ranks.", borderColor: "#88FF00" },
      { emoji: "", title: "Messages", body: "When you catch someone\u2019s creature, a chat opens automatically.", borderColor: "#00FF88" },
      { emoji: "", title: "Hex Land", body: "Claim territory. Earn passive income from creature activity in your hexes.", borderColor: "#88FF00" },
    ],
    cta: "I\u2019m ready!",
  },
  {
    icon: "orb-cluster",
    headline: "Your city is waiting.",
    body: "Every creature someone spawns is yours to find. Every creature you spawn is a gift \u2013 or a trap.",
    statPills: [
      { label: "3 Wallets", bg: "#00FF88" },
      { label: "100m Range", bg: "#88FF00" },
      { label: "30d Creature Life", bg: "#00FF88" },
    ],
    cta: "Start Watching \u2192",
  },
];

/* ------------------------------------------------------------------ */
/*  Icon renderers (pure CSS / SVG)                                    */
/* ------------------------------------------------------------------ */
function GlobeIcon() {
  return (
    <div style={{ position: "relative", width: 120, height: 120 }}>
      {/* Rotating sphere */}
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #00FF88, #00FF88 50%, #0a0a0f)",
          position: "absolute",
          top: 10,
          left: 10,
          animation: "owGlobePulse 3s ease-in-out infinite",
          boxShadow: "0 0 40px rgba(0,255,136,0.4), inset 0 0 30px rgba(255,255,255,0.08)",
        }}
      >
        {/* Latitude lines */}
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)" }} />
        <div style={{ position: "absolute", top: "25%", left: "10%", right: "10%", height: 1, background: "rgba(255,255,255,0.08)", borderRadius: 1 }} />
        <div style={{ position: "absolute", top: "50%", left: "5%", right: "5%", height: 1, background: "rgba(255,255,255,0.1)", borderRadius: 1 }} />
        <div style={{ position: "absolute", top: "75%", left: "10%", right: "10%", height: 1, background: "rgba(255,255,255,0.08)", borderRadius: 1 }} />
      </div>
      {/* Floating orb dots */}
      <div style={{ position: "absolute", top: 8, left: 60, width: 10, height: 10, borderRadius: "50%", background: "#00FF88", boxShadow: "0 0 8px #00FF88", animation: "owOrbFloat1 4s ease-in-out infinite" }} />
      <div style={{ position: "absolute", top: 50, right: 2, width: 8, height: 8, borderRadius: "50%", background: "#88FF00", boxShadow: "0 0 8px #88FF00", animation: "owOrbFloat2 3.5s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: 12, left: 14, width: 7, height: 7, borderRadius: "50%", background: "#00FF88", boxShadow: "0 0 8px #00FF88", animation: "owOrbFloat3 4.5s ease-in-out infinite" }} />
      <div style={{ position: "absolute", top: 30, left: 0, width: 6, height: 6, borderRadius: "50%", background: "#88FF00", boxShadow: "0 0 6px #88FF00", animation: "owOrbFloat2 5s ease-in-out infinite" }} />
    </div>
  );
}

function CrosshairIcon() {
  return (
    <div style={{ width: 80, height: 80, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="24" stroke="#00FF88" strokeWidth="2" strokeDasharray="4 4" opacity="0.4" />
        <circle cx="32" cy="32" r="14" stroke="#00FF88" strokeWidth="2" />
        <circle cx="32" cy="32" r="4" fill="#00FF88" />
        <line x1="32" y1="4" x2="32" y2="16" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" />
        <line x1="32" y1="48" x2="32" y2="60" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" />
        <line x1="4" y1="32" x2="16" y2="32" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" />
        <line x1="48" y1="32" x2="60" y2="32" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function ArrowDownIcon() {
  return (
    <div style={{ width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: "radial-gradient(circle at 40% 40%, #00FF88, #0d0d14)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 24px rgba(0,255,136,0.3)",
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </svg>
      </div>
    </div>
  );
}

function WalletIcon() {
  return (
    <div style={{ width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: "linear-gradient(135deg, #00FF88, #88FF00)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 24px rgba(0,255,136,0.3)",
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
        </svg>
      </div>
    </div>
  );
}

function SparkleIcon() {
  return (
    <div style={{ width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: "radial-gradient(circle at 40% 40%, #00FF88, #0d0d14)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 24px rgba(0,255,136,0.3)",
        animation: "owSparkleGlow 2s ease-in-out infinite",
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
        </svg>
      </div>
    </div>
  );
}

function OrbClusterIcon() {
  const orbs = [
    { color: "#00FF88", size: 18, delay: "0s" },
    { color: "#88FF00", size: 16, delay: "-1.2s" },
    { color: "#00FF88", size: 14, delay: "-2.4s" },
    { color: "#88FF00", size: 15, delay: "-3.6s" },
    { color: "#00FF88", size: 13, delay: "-4.8s" },
  ];
  return (
    <div style={{ position: "relative", width: 160, height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Central glowing sphere */}
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, #ffffff, #00FF88 50%, #0a0a0f)",
        boxShadow: "0 0 30px rgba(0,255,136,0.5), 0 0 60px rgba(0,255,136,0.2)",
        animation: "owCenterPulse 2.5s ease-in-out infinite",
      }} />
      {/* Orbiting orbs */}
      {orbs.map((orb, i) => (
        <div key={i} style={{
          position: "absolute",
          top: "50%", left: "50%",
          width: 0, height: 0,
          animation: `owOrbit 6s linear infinite`,
          animationDelay: orb.delay,
        }}>
          <div style={{
            width: orb.size, height: orb.size, borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, ${orb.color}cc, ${orb.color})`,
            boxShadow: `0 0 12px ${orb.color}88, 0 0 24px ${orb.color}44`,
            transform: "translate(-50%, -50%) translateX(58px)",
          }} />
        </div>
      ))}
    </div>
  );
}

function ScreenIcon({ icon }: { icon: Screen["icon"] }) {
  switch (icon) {
    case "globe": return <GlobeIcon />;
    case "crosshair": return <CrosshairIcon />;
    case "arrow-down": return <ArrowDownIcon />;
    case "wallet": return <WalletIcon />;
    case "sparkle": return <SparkleIcon />;
    case "orb-cluster": return <OrbClusterIcon />;
  }
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function OnboardingWalkthrough({ onComplete }: { onComplete?: () => void }) {
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState<"left" | "right">("right");
  const [animKey, setAnimKey] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const close = useCallback(() => {
    markComplete();
    onComplete?.();
  }, [onComplete]);

  function goNext() {
    if (current === SCREENS.length - 1) {
      close();
    } else {
      setDir("right");
      setAnimKey((k) => k + 1);
      setCurrent((c) => c + 1);
    }
  }

  function goBack() {
    if (current > 0) {
      setDir("left");
      setAnimKey((k) => k + 1);
      setCurrent((c) => c - 1);
    }
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goBack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const screen = SCREENS[current];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0a0a0f",
        backgroundImage: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,255,136,0.12) 0%, transparent 70%)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar: back + skip */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 0", flexShrink: 0 }}>
        {current > 0 ? (
          <button onClick={goBack} style={{ background: "none", border: "none", color: "#8a8a99", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0, fontFamily: "inherit" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        ) : (
          <div />
        )}
        <button onClick={close} style={{ background: "none", border: "none", color: "#8a8a99", fontSize: 14, fontWeight: 500, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
          Skip
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          key={animKey}
          style={{
            width: "100%",
            maxWidth: 420,
            padding: "24px 24px 32px",
            boxSizing: "border-box",
            animation: `owSlide${dir === "right" ? "Right" : "Left"} 300ms ease-out both`,
          }}
        >
          {/* Icon area */}
          <div style={{ display: "flex", justifyContent: "center", minHeight: 120, alignItems: "center", marginBottom: 16 }}>
            <ScreenIcon icon={screen.icon} />
          </div>

          {/* Pill label */}
          {screen.pill && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <span style={{
                display: "inline-block",
                padding: "4px 14px",
                borderRadius: 20,
                background: screen.pill.color + "22",
                color: screen.pill.color,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}>
                {screen.pill.label}
              </span>
            </div>
          )}

          {/* Headline */}
          <h1 style={{ color: "#FFFFFF", fontSize: 28, fontWeight: 800, textAlign: "center", margin: "0 0 6px", lineHeight: 1.2 }}>
            {screen.headline}
          </h1>

          {/* Subhead */}
          {screen.subhead && (
            <p style={{ color: "#8a8a99", fontSize: 18, fontWeight: 600, textAlign: "center", margin: "0 0 8px" }}>
              {screen.subhead}
            </p>
          )}

          {/* Body text */}
          {screen.body && (
            <p style={{ color: "#8a8a99", fontSize: 15, lineHeight: 1.6, textAlign: "center", margin: "8px auto 0", maxWidth: 340 }}>
              {screen.body}
            </p>
          )}

          {/* Feature cards (list) */}
          {screen.cards && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
              {screen.cards.map((card, i) => (
                <div key={i} style={{
                  display: "flex", gap: 12, padding: "12px 16px",
                  background: "#1a1a24", borderRadius: 12,
                  borderLeft: `3px solid ${card.borderColor}`,
                }}>
                  <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.4 }}>{card.emoji}</span>
                  <div>
                    <p style={{ margin: 0, color: "#FFFFFF", fontSize: 14, fontWeight: 700 }}>{card.title}</p>
                    <p style={{ margin: "2px 0 0", color: "#8a8a99", fontSize: 13, lineHeight: 1.5 }}>{card.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grid cards (2x2) */}
          {screen.gridCards && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 20 }}>
              {screen.gridCards.map((card, i) => (
                <div key={i} style={{
                  padding: "14px 12px",
                  background: "#1a1a24", borderRadius: 12,
                  borderLeft: `3px solid ${card.borderColor}`,
                }}>
                  <span style={{ fontSize: 22, display: "block", marginBottom: 6 }}>{card.emoji}</span>
                  <p style={{ margin: 0, color: "#FFFFFF", fontSize: 13, fontWeight: 700 }}>{card.title}</p>
                  <p style={{ margin: "4px 0 0", color: "#8a8a99", fontSize: 12, lineHeight: 1.4 }}>{card.body}</p>
                </div>
              ))}
            </div>
          )}

          {/* Currency badges */}
          {screen.badges && (
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 24 }}>
              {screen.badges.map((b, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: b.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 0 20px ${b.color}50`,
                    fontSize: 24, fontWeight: 800, color: "#fff",
                  }}>
                    {b.symbol}
                  </div>
                  <span style={{ color: "#FFFFFF", fontSize: 13, fontWeight: 700 }}>{b.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Trust checks */}
          {screen.checks && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
              {screen.checks.map((check, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ color: "#00FF88", fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>\u2022</span>
                  <span style={{ color: "#8a8a99", fontSize: 14, lineHeight: 1.5 }}>{check}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stat pills */}
          {screen.statPills && (
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 24 }}>
              {screen.statPills.map((pill, i) => (
                <span key={i} style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  borderRadius: 20,
                  background: pill.bg,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}>
                  {pill.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom area: dots + CTA — sticky so always visible */}
      <div style={{
        padding: "12px 24px 36px",
        maxWidth: 420,
        width: "100%",
        margin: "0 auto",
        boxSizing: "border-box",
        flexShrink: 0,
        background: "linear-gradient(to bottom, transparent, #0a0a0f 28px)",
        position: "sticky",
        bottom: 0,
      }}>
        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
          {SCREENS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === current ? 20 : 8,
                height: 8,
                borderRadius: 4,
                background: i === current ? "#00FF88" : i < current ? "#00FF8855" : "rgba(255,255,255,0.15)",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={goNext}
          style={{
            width: "100%",
            height: 56,
            borderRadius: 14,
            border: "none",
            background: current === SCREENS.length - 1
              ? "linear-gradient(135deg, #00FF88, #88FF00)"
              : "#00FF88",
            color: "#000",
            fontSize: 17,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: "0 4px 24px rgba(0,255,136,0.4)",
            transition: "transform 0.15s, box-shadow 0.15s",
            letterSpacing: "-0.01em",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
        >
          {screen.cta}
        </button>
      </div>

      <style>{`
        @keyframes owSlideRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes owSlideLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes owGlobePulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.04); }
        }
        @keyframes owOrbFloat1 {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(-6px, 8px); }
        }
        @keyframes owOrbFloat2 {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(5px, -7px); }
        }
        @keyframes owOrbFloat3 {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(7px, 5px); }
        }
        @keyframes owSparkleGlow {
          0%, 100% { box-shadow: 0 0 24px rgba(0,255,136,0.3); }
          50%      { box-shadow: 0 0 36px rgba(0,255,136,0.5); }
        }
        @keyframes owOrbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes owCenterPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(0,255,136,0.5), 0 0 60px rgba(0,255,136,0.2); }
          50%      { transform: scale(1.08); box-shadow: 0 0 40px rgba(0,255,136,0.6), 0 0 80px rgba(0,255,136,0.3); }
        }
      `}</style>
    </div>
  );
}
