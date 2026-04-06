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
    headline: "The world is full of treasure.",
    subhead: "Go find it.",
    body: "MishMesh lets people drop real crypto and NFTs as Orbs anywhere on Earth. Walk to them. Crack them. Keep what\u2019s inside.",
    cta: "How does it work? \u2192",
  },
  {
    pill: { label: "HUNT MODE", color: "#6366f1" },
    icon: "crosshair",
    headline: "Hunt Orbs near you",
    cards: [
      { emoji: "\ud83d\uddfa", title: "Find orbs on the map", body: "Open the Hunt tab to see glowing orbs placed by other users around the world.", borderColor: "#6366f1" },
      { emoji: "\ud83d\udeb6", title: "Walk to the orb", body: "Get within 100 meters of the orb. The closer you get, the bigger the pulse.", borderColor: "#10b981" },
      { emoji: "\ud83d\udcb0", title: "Crack it open", body: "Pay the claim fee and the crypto inside transfers directly to your wallet.", borderColor: "#f59e0b" },
    ],
    cta: "What about dropping? \u2192",
  },
  {
    pill: { label: "DROP MODE", color: "#06b6d4" },
    icon: "arrow-down",
    headline: "Drop your own Orbs",
    cards: [
      { emoji: "\ud83d\udc8e", title: "Crypto Orb", body: "Drop SOL, ETH, or BTC. First one there wins it.", borderColor: "#9333ea" },
      { emoji: "\ud83d\uddbc", title: "NFT Orb", body: "Place an NFT at a location. Whoever finds it, keeps it.", borderColor: "#06b6d4" },
      { emoji: "\ud83d\udc7b", title: "Stealth Orb", body: "Invisible until hunters are 50m away. Ultimate ambush.", borderColor: "#f43f5e" },
    ],
    cta: "What about my wallet? \u2192",
  },
  {
    icon: "wallet",
    headline: "Real crypto. Real value.",
    body: "Connect your wallets. Everything you crack gets deposited directly.",
    badges: [
      { label: "SOL", color: "#9333ea", symbol: "S" },
      { label: "ETH", color: "#627eea", symbol: "\u039e" },
      { label: "BTC", color: "#f7931a", symbol: "\u20bf" },
    ],
    checks: [
      "Non-custodial \u2014 only you control your keys",
      "All transactions happen on-chain",
      "Cracked orb earnings deposit automatically",
    ],
    cta: "What else can I do? \u2192",
  },
  {
    icon: "sparkle",
    headline: "More than just hunting",
    subhead: "A full social crypto experience",
    gridCards: [
      { emoji: "\ud83d\udc64", title: "Your Profile", body: "Track stats, badges, and cities conquered.", borderColor: "#9333ea" },
      { emoji: "\ud83c\udfc6", title: "Leaderboards", body: "Compete worldwide. Top your city. Climb the global ranks.", borderColor: "#f59e0b" },
      { emoji: "\ud83d\udcac", title: "Messages", body: "When you crack someone\u2019s orb, a chat opens automatically.", borderColor: "#3b82f6" },
      { emoji: "\ud83c\udf10", title: "Hex Land", body: "Claim territory. Earn passive income from orb activity in your hexes.", borderColor: "#10b981" },
    ],
    cta: "I\u2019m ready! \ud83e\udd81",
  },
  {
    icon: "orb-cluster",
    headline: "Your city is waiting.",
    body: "Every orb someone drops is yours to find. Every orb you drop is a gift \u2013 or a trap.",
    statPills: [
      { label: "3 Wallets", bg: "#9333ea" },
      { label: "100m Range", bg: "#06b6d4" },
      { label: "30d Orb Life", bg: "#f59e0b" },
    ],
    cta: "Start Hunting \u2192",
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
          background: "radial-gradient(circle at 35% 35%, #818cf8, #4338ca 50%, #1e1b4b)",
          position: "absolute",
          top: 10,
          left: 10,
          animation: "owGlobePulse 3s ease-in-out infinite",
          boxShadow: "0 0 40px rgba(99,102,241,0.4), inset 0 0 30px rgba(255,255,255,0.08)",
        }}
      >
        {/* Latitude lines */}
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)" }} />
        <div style={{ position: "absolute", top: "25%", left: "10%", right: "10%", height: 1, background: "rgba(255,255,255,0.08)", borderRadius: 1 }} />
        <div style={{ position: "absolute", top: "50%", left: "5%", right: "5%", height: 1, background: "rgba(255,255,255,0.1)", borderRadius: 1 }} />
        <div style={{ position: "absolute", top: "75%", left: "10%", right: "10%", height: 1, background: "rgba(255,255,255,0.08)", borderRadius: 1 }} />
      </div>
      {/* Floating orb dots */}
      <div style={{ position: "absolute", top: 8, left: 60, width: 10, height: 10, borderRadius: "50%", background: "#06b6d4", boxShadow: "0 0 8px #06b6d4", animation: "owOrbFloat1 4s ease-in-out infinite" }} />
      <div style={{ position: "absolute", top: 50, right: 2, width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 8px #f59e0b", animation: "owOrbFloat2 3.5s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: 12, left: 14, width: 7, height: 7, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981", animation: "owOrbFloat3 4.5s ease-in-out infinite" }} />
      <div style={{ position: "absolute", top: 30, left: 0, width: 6, height: 6, borderRadius: "50%", background: "#f43f5e", boxShadow: "0 0 6px #f43f5e", animation: "owOrbFloat2 5s ease-in-out infinite" }} />
    </div>
  );
}

function CrosshairIcon() {
  return (
    <div style={{ width: 80, height: 80, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="24" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" opacity="0.4" />
        <circle cx="32" cy="32" r="14" stroke="#10b981" strokeWidth="2" />
        <circle cx="32" cy="32" r="4" fill="#10b981" />
        <line x1="32" y1="4" x2="32" y2="16" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
        <line x1="32" y1="48" x2="32" y2="60" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
        <line x1="4" y1="32" x2="16" y2="32" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
        <line x1="48" y1="32" x2="60" y2="32" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function ArrowDownIcon() {
  return (
    <div style={{ width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: "radial-gradient(circle at 40% 40%, #0891b2, #164e63)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 24px rgba(6,182,212,0.3)",
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
        background: "linear-gradient(135deg, #06b6d4, #0e7490)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 24px rgba(6,182,212,0.3)",
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
        background: "radial-gradient(circle at 40% 40%, #a78bfa, #6d28d9)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 24px rgba(139,92,246,0.3)",
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
    { color: "#9333ea", size: 18, delay: "0s" },
    { color: "#06b6d4", size: 16, delay: "-1.2s" },
    { color: "#f59e0b", size: 14, delay: "-2.4s" },
    { color: "#10b981", size: 15, delay: "-3.6s" },
    { color: "#ec4899", size: 13, delay: "-4.8s" },
  ];
  return (
    <div style={{ position: "relative", width: 160, height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Central glowing sphere */}
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, #c4b5fd, #6366f1 50%, #312e81)",
        boxShadow: "0 0 30px rgba(99,102,241,0.5), 0 0 60px rgba(99,102,241,0.2)",
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
        backgroundImage: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%)",
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
          <button onClick={goBack} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0, fontFamily: "inherit" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        ) : (
          <div />
        )}
        <button onClick={close} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 14, fontWeight: 500, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
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
          <h1 style={{ color: "#f9fafb", fontSize: 28, fontWeight: 800, textAlign: "center", margin: "0 0 6px", lineHeight: 1.2 }}>
            {screen.headline}
          </h1>

          {/* Subhead */}
          {screen.subhead && (
            <p style={{ color: "#9ca3af", fontSize: 18, fontWeight: 600, textAlign: "center", margin: "0 0 8px" }}>
              {screen.subhead}
            </p>
          )}

          {/* Body text */}
          {screen.body && (
            <p style={{ color: "#9ca3af", fontSize: 15, lineHeight: 1.6, textAlign: "center", margin: "8px auto 0", maxWidth: 340 }}>
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
                    <p style={{ margin: 0, color: "#f9fafb", fontSize: 14, fontWeight: 700 }}>{card.title}</p>
                    <p style={{ margin: "2px 0 0", color: "#9ca3af", fontSize: 13, lineHeight: 1.5 }}>{card.body}</p>
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
                  <p style={{ margin: 0, color: "#f9fafb", fontSize: 13, fontWeight: 700 }}>{card.title}</p>
                  <p style={{ margin: "4px 0 0", color: "#9ca3af", fontSize: 12, lineHeight: 1.4 }}>{card.body}</p>
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
                  <span style={{ color: "#f9fafb", fontSize: 13, fontWeight: 700 }}>{b.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Trust checks */}
          {screen.checks && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
              {screen.checks.map((check, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ color: "#10b981", fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>{"\u2705"}</span>
                  <span style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.5 }}>{check}</span>
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
                background: i === current ? "#6366f1" : i < current ? "#6366f155" : "rgba(255,255,255,0.15)",
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
              ? "linear-gradient(135deg, #6366f1, #06b6d4)"
              : "#6366f1",
            color: "#fff",
            fontSize: 17,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: "0 4px 24px rgba(99,102,241,0.4)",
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
          0%, 100% { box-shadow: 0 0 24px rgba(139,92,246,0.3); }
          50%      { box-shadow: 0 0 36px rgba(139,92,246,0.5); }
        }
        @keyframes owOrbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes owCenterPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(99,102,241,0.5), 0 0 60px rgba(99,102,241,0.2); }
          50%      { transform: scale(1.08); box-shadow: 0 0 40px rgba(99,102,241,0.6), 0 0 80px rgba(99,102,241,0.3); }
        }
      `}</style>
    </div>
  );
}
