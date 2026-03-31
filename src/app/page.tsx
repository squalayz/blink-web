"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/*  Colors                                                             */
/* ------------------------------------------------------------------ */
const C = {
  bg: "#0a0a0f",
  surface: "#0d0d14",
  card: "#1a1a24",
  primary: "#6366f1",
  accent: "#06b6d4",
  gold: "#F59E0B",
  text: "#f9fafb",
  muted: "#9ca3af",
  border: "#1F2028",
};

/* ------------------------------------------------------------------ */
/*  Global keyframes (injected once)                                   */
/* ------------------------------------------------------------------ */
const globalCSS = `
@keyframes auroraLeft{0%{transform:translateX(0)}50%{transform:translateX(-8%)}100%{transform:translateX(0)}}
@keyframes auroraRight{0%{transform:translateX(0)}50%{transform:translateX(8%)}100%{transform:translateX(0)}}
@keyframes starTwinkle{0%,100%{opacity:0.15}50%{opacity:0.7}}
@keyframes particleUp{0%{transform:translateY(0);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(-110vh);opacity:0}}
@keyframes marqueeL{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes marqueeR{0%{transform:translateX(-50%)}100%{transform:translateX(0)}}
@keyframes orbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
@keyframes orbGlow{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.15);opacity:0.7}}
@keyframes midRing{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes innerRing{0%{transform:rotate(0deg)}100%{transform:rotate(-360deg)}}
@keyframes orbPing{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.5);opacity:0}}
@keyframes orbitDot{0%{transform:rotate(0deg) translateX(var(--orbit-r))}100%{transform:rotate(360deg) translateX(var(--orbit-r))}}
@keyframes scrollBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}
@keyframes taskFloat{0%,100%{transform:rotate(2deg) translateY(0)}50%{transform:rotate(2deg) translateY(-12px)}}
@keyframes clipReveal{0%{clip-path:inset(0 100% 0 0)}100%{clip-path:inset(0 0% 0 0)}}
@keyframes pulsingDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.8)}}
@keyframes shakeBtn{0%,100%{transform:translateX(0)}10%,30%,50%,70%,90%{transform:translateX(-3px)}20%,40%,60%,80%{transform:translateX(3px)}}
html{scroll-behavior:smooth}
*{margin:0;padding:0;box-sizing:border-box}
body{background:${C.bg};color:${C.text};font-family:system-ui,-apple-system,sans-serif;overflow-x:hidden}
`;

/* ------------------------------------------------------------------ */
/*  MMLogo                                                             */
/* ------------------------------------------------------------------ */
function MMLogo({ size = 44 }: { size?: number }) {
  const h = Math.round(size * (70 / 120));
  return (
    <svg width={size} height={h} viewBox="0 0 120 70">
      <defs>
        <linearGradient id="lgL" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="lgR" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="lgM" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <circle cx="35" cy="35" r="24" fill="none" stroke="url(#lgL)" strokeWidth="5" />
      <circle cx="65" cy="35" r="24" fill="none" stroke="url(#lgR)" strokeWidth="5" />
      <path d="M50 15.4 A24 24 0 0 1 50 54.6 A24 24 0 0 1 50 15.4" fill="url(#lgM)" opacity="0.3" />
      <circle cx="35" cy="14" r="4" fill="url(#lgL)" />
      <circle cx="65" cy="14" r="4" fill="url(#lgR)" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Stars                                                              */
/* ------------------------------------------------------------------ */
function Stars() {
  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    x: (i * 13.7 + i * i * 0.3) % 100,
    y: (i * 11.3 + i * i * 0.7) % 100,
    size: 1 + (i % 3),
    delay: (i * 0.4) % 8,
    dur: 3 + (i % 5),
  }));
  return (
    <>
      {stars.map((s) => (
        <div
          key={s.id}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "#fff",
            opacity: 0.2,
            animation: `starTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite`,
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Particles (30 floating up)                                         */
/* ------------------------------------------------------------------ */
function Particles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: (i * 3.47) % 100,
    size: 2 + (i % 3),
    delay: (i * 0.6) % 10,
    dur: 8 + (i % 8),
    color: [C.primary, C.accent, C.gold][i % 3],
  }));
  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            bottom: "-2%",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: p.color,
            opacity: 0,
            animation: `particleUp ${p.dur}s ${p.delay}s linear infinite`,
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero Orb (CSS only)                                                */
/* ------------------------------------------------------------------ */
function HeroOrb() {
  const orbDots = [
    { r: 180, dur: 6, color: C.primary, size: 8 },
    { r: 180, dur: 8, color: C.accent, size: 6 },
    { r: 160, dur: 10, color: C.gold, size: 7 },
    { r: 160, dur: 7, color: "#06B6D4", size: 5 },
    { r: 140, dur: 9, color: "#EC4899", size: 6 },
    { r: 140, dur: 11, color: "#F97316", size: 5 },
  ];

  return (
    <div style={{ position: "relative", width: 320, height: 320, flexShrink: 0 }}>
      {/* Outer glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "160%",
          height: "160%",
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.primary}33 0%, transparent 70%)`,
          animation: "orbGlow 3s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Mid ring */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "130%",
          height: "130%",
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          border: `2px solid rgba(99,102,241,0.3)`,
          animation: "midRing 12s linear infinite",
          pointerEvents: "none",
        }}
      />

      {/* Inner ring */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "115%",
          height: "115%",
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          border: `1px solid rgba(6,182,212,0.4)`,
          animation: "innerRing 8s linear infinite",
          pointerEvents: "none",
        }}
      />

      {/* The orb itself */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 160,
          height: 160,
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #a5b4fc, #6366f1 40%, #4338ca 70%, #1e1b4b)",
          boxShadow: `0 0 60px 20px rgba(99,102,241,0.3)`,
          animation: "orbFloat 4s ease-in-out infinite",
        }}
      />

      {/* Orbiting dots */}
      {orbDots.map((d, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: d.size,
            height: d.size,
            marginLeft: -d.size / 2,
            marginTop: -d.size / 2,
            borderRadius: "50%",
            background: d.color,
            boxShadow: `0 0 8px ${d.color}`,
            ["--orbit-r" as string]: `${d.r}px`,
            animation: `orbitDot ${d.dur}s ${i * 0.5}s linear infinite`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Ping rings */}
      {[0, 0.83, 1.67].map((delay, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 160,
            height: 160,
            marginLeft: -80,
            marginTop: -80,
            borderRadius: "50%",
            border: `1px solid ${C.primary}`,
            opacity: 0,
            animation: `orbPing 1.2s ${delay}s ease-out infinite`,
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App Store Buttons                                                  */
/* ------------------------------------------------------------------ */
function AppStoreButtons() {
  const [shaking, setShaking] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);

  const handleClick = (store: string) => {
    setShaking(store);
    setTooltip(store);
    setTimeout(() => setShaking(null), 500);
    setTimeout(() => setTooltip(null), 2000);
  };

  const btnBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 18,
    padding: "22px 44px",
    borderRadius: 18,
    cursor: "pointer",
    textDecoration: "none",
    border: "none",
    position: "relative",
    transition: "transform 0.2s, box-shadow 0.2s",
  };

  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      {/* Apple */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => handleClick("apple")}
          style={{
            ...btnBase,
            background: "#fff",
            boxShadow: "0 0 30px rgba(255,255,255,0.25)",
            animation: shaking === "apple" ? "shakeBtn 0.5s ease" : "none",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="#000">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          <div>
            <div style={{ fontSize: 13, color: "#666", lineHeight: 1, textAlign: "left" as const }}>Download on the</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#000", lineHeight: 1.3, textAlign: "left" as const }}>App Store</div>
          </div>
        </button>
        <div style={{ textAlign: "center", marginTop: 6, fontSize: 11, color: C.muted, fontWeight: 600 }}>Coming Soon</div>
        {tooltip === "apple" && (
          <div style={{ position: "absolute", top: -36, left: "50%", transform: "translateX(-50%)", background: C.card, color: C.text, fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8, whiteSpace: "nowrap", border: `1px solid ${C.border}` }}>
            Coming soon!
          </div>
        )}
      </div>

      {/* Google */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => handleClick("google")}
          style={{
            ...btnBase,
            background: C.card,
            border: `1px solid ${C.border}`,
            boxShadow: `0 0 30px rgba(99,102,241,0.25)`,
            animation: shaking === "google" ? "shakeBtn 0.5s ease" : "none",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.018 13.298l-11.5 6.636c-.59.34-1.326-.085-1.326-.765V4.83c0-.68.737-1.105 1.326-.764l11.5 6.636c.59.34.59 1.19 0 1.53z" />
            <path fill="#34A853" d="M5.262 19.488L14.5 14l-3.598-3.598L5.262 19.488z" />
            <path fill="#FBBC04" d="M2.004 21.522c.148.56.674.96 1.283.75l6.515-3.76L5.262 14l-3.258 7.522z" />
            <path fill="#EA4335" d="M2.004 2.478C1.856 3.038 1.856 3.66 2.004 4.22L10.902 10 5.262 4.512 2.004 2.478z" />
          </svg>
          <div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1, textAlign: "left" as const }}>Get it on</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.text, lineHeight: 1.3, textAlign: "left" as const }}>Google Play</div>
          </div>
        </button>
        <div style={{ textAlign: "center", marginTop: 6, fontSize: 11, color: C.muted, fontWeight: 600 }}>Coming Soon</div>
        {tooltip === "google" && (
          <div style={{ position: "absolute", top: -36, left: "50%", transform: "translateX(-50%)", background: C.card, color: C.text, fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8, whiteSpace: "nowrap", border: `1px solid ${C.border}` }}>
            Coming soon!
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Waitlist Form                                                      */
/* ------------------------------------------------------------------ */
function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span style={{ color: C.accent, fontWeight: 700, fontSize: 16 }}>
          You are on the list. We will notify you at launch.
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <input
        type="email"
        required
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          flex: "1 1 240px",
          maxWidth: 320,
          padding: "14px 18px",
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          background: C.card,
          color: C.text,
          fontSize: 15,
          outline: "none",
        }}
      />
      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: "14px 28px",
          borderRadius: 10,
          background: C.primary,
          color: "#fff",
          fontWeight: 700,
          fontSize: 15,
          border: "none",
          cursor: submitting ? "not-allowed" : "pointer",
          opacity: submitting ? 0.7 : 1,
          boxShadow: "0 0 20px rgba(99,102,241,0.3)",
        }}
      >
        {submitting ? "Joining..." : "Notify Me"}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated counter                                                   */
/* ------------------------------------------------------------------ */
function AnimatedCounter({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1500;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, target]);

  return (
    <span ref={ref}>
      {prefix}
      {count}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Mini orb for orb types section                                     */
/* ------------------------------------------------------------------ */
function OrbTypeOrb({ color, glow, size = 120 }: { color: string; glow: boolean; size?: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto 20px" }}>
      {glow && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "180%",
            height: "180%",
            transform: "translate(-50%,-50%)",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${color}44 0%, transparent 70%)`,
            animation: "orbGlow 2.5s ease-in-out infinite",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 35%, ${color}ee, ${color} 50%, ${color}77 100%)`,
          boxShadow: glow ? `0 0 30px 10px ${color}44` : `0 0 15px 5px ${color}22`,
          animation: "orbFloat 4s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Live Ticker                                                        */
/* ------------------------------------------------------------------ */
function Ticker() {
  const row1 = [
    "Alex cracked an orb in Tokyo — earned <g>0.5 SOL</g>",
    "Maria dropped 10 orbs across Miami",
    "James cracked a Legendary orb in London — earned <g>0.08 ETH</g>",
    "Sofia dropped a BTC orb in Berlin",
    "Kenji cracked an orb in Seoul — earned <g>0.0004 BTC</g>",
  ];
  const row2 = [
    "Amara dropped 5 orbs across Lagos",
    "Chen cracked a Legendary in Shanghai — earned <g>2.1 SOL</g>",
    "Diego cracked an orb in Buenos Aires — earned <g>0.03 ETH</g>",
    "Priya dropped a Rare orb in Mumbai",
    "Luca cracked an orb in Rome — earned <g>0.01 ETH</g>",
  ];

  const renderItems = (items: string[]) =>
    items.map((item, i) => {
      const parts = item.split(/<g>(.*?)<\/g>/);
      return (
        <span
          key={i}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
            padding: "0 32px",
            fontSize: 14,
            color: C.muted,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: C.accent,
              flexShrink: 0,
              display: "inline-block",
            }}
          />
          {parts.map((part, j) =>
            j % 2 === 1 ? (
              <span key={j} style={{ color: C.accent, fontWeight: 700 }}>
                {part}
              </span>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
        </span>
      );
    });

  return (
    <div style={{ overflow: "hidden", width: "100%" }}>
      <div
        style={{
          display: "flex",
          width: "max-content",
          animation: "marqueeL 35s linear infinite",
          marginBottom: 12,
        }}
      >
        {renderItems(row1)}
        {renderItems(row1)}
      </div>
      <div
        style={{
          display: "flex",
          width: "max-content",
          animation: "marqueeR 28s linear infinite",
        }}
      >
        {renderItems(row2)}
        {renderItems(row2)}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  MAIN PAGE                                                          */
/* ================================================================== */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
    });
  }, [router]);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", overflowX: "hidden", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{globalCSS}</style>

      {/* ============================================================= */}
      {/*  1. FIXED NAVBAR                                               */}
      {/* ============================================================= */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          padding: "14px 32px",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          background: "rgba(10,10,15,0.8)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MMLogo size={38} />
          <span style={{ fontWeight: 700, fontSize: 18, color: "#fff" }}>MishMesh</span>
        </div>
      </motion.nav>

      {/* ============================================================= */}
      {/*  2. HERO                                                       */}
      {/* ============================================================= */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          paddingTop: 80,
          paddingBottom: 40,
        }}
      >
        {/* Aurora bands */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "-20%",
            width: "80vw",
            height: "60vh",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)",
            filter: "blur(80px)",
            animation: "auroraLeft 20s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "40%",
            right: "-15%",
            width: "70vw",
            height: "50vh",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(6,182,212,0.06) 0%, transparent 70%)",
            filter: "blur(80px)",
            animation: "auroraRight 25s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />

        <Stars />
        <Particles />

        {/* Hero content wrapper */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: "100%",
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 60,
          }}
        >
          {/* Left side content */}
          <div style={{ flex: "1 1 480px", maxWidth: 640 }}>
            {/* Coming Soon badge */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 18px",
                borderRadius: 100,
                border: `1px solid ${C.primary}`,
                marginBottom: 32,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: C.primary,
                  animation: "pulsingDot 2s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  color: C.primary,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                }}
              >
                Coming Soon
              </span>
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <h1
                style={{
                  fontSize: "clamp(48px, 8vw, 96px)",
                  fontWeight: 900,
                  color: C.text,
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                  animation: "clipReveal 0.8s 0.5s both",
                }}
              >
                The World Is
              </h1>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.65 }}
            >
              <h1
                style={{
                  fontSize: "clamp(48px, 8vw, 96px)",
                  fontWeight: 900,
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                  marginBottom: 24,
                  background: `linear-gradient(90deg, ${C.primary}, ${C.accent})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: "clipReveal 0.8s 0.65s both",
                }}
              >
                Your Trading Floor
              </h1>
            </motion.div>

            {/* Subhead */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              style={{
                color: C.muted,
                fontSize: "clamp(16px, 2.2vw, 20px)",
                maxWidth: 520,
                lineHeight: 1.7,
                marginBottom: 28,
              }}
            >
              Drop orbs. Hunt crypto. Trade with AI agents — anywhere on Earth.
            </motion.p>

            {/* App Store Buttons — primary CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
              style={{ marginBottom: 32 }}
            >
              <AppStoreButtons />
            </motion.div>

            {/* Chain pills */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}
            >
              {[
                { label: "BTC", color: "#F7931A" },
                { label: "ETH", color: "#627EEA" },
                { label: "SOL", color: "#6366f1" },
              ].map((ch) => (
                <span
                  key={ch.label}
                  style={{
                    display: "inline-block",
                    padding: "6px 16px",
                    borderRadius: 100,
                    border: `1px solid ${ch.color}55`,
                    color: ch.color,
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    background: `${ch.color}11`,
                  }}
                >
                  {ch.label}
                </span>
              ))}
            </motion.div>

            {/* Waitlist form */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.4 }}
            >
              <p style={{ color: C.muted, fontSize: 13, marginBottom: 10, fontWeight: 600 }}>Or join the waitlist</p>
              <WaitlistForm />
            </motion.div>
          </div>

          {/* Right side orb */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 1.6 }}
            style={{ flex: "0 0 auto", display: "flex", justifyContent: "center" }}
          >
            <HeroOrb />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            zIndex: 3,
          }}
        >
          <span style={{ color: C.muted, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>scroll</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={C.muted}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: "scrollBounce 2s ease-in-out infinite" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </section>

      {/* ============================================================= */}
      {/*  3. HOW IT WORKS                                               */}
      {/* ============================================================= */}
      <section style={{ padding: "120px 32px", maxWidth: 1200, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 64 }}
        >
          <h2 style={{ fontSize: 48, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>How it works</h2>
          <p style={{ marginTop: 16, color: C.muted, fontSize: 18 }}>Simple as walking outside.</p>
        </motion.div>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            {
              num: "01",
              title: "Drop an Orb",
              body: "Load crypto into a digital orb, pin it to any location on Earth.",
              icon: (
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="16" r="8" stroke={C.primary} strokeWidth="2" />
                  <path d="M20 24 L20 36" stroke={C.primary} strokeWidth="2" strokeDasharray="3 3" />
                  <circle cx="20" cy="38" r="2" fill={C.primary} opacity="0.5" />
                  <path d="M14 10 L20 4 L26 10" stroke={C.accent} strokeWidth="1.5" fill="none" opacity="0.6" />
                </svg>
              ),
            },
            {
              num: "02",
              title: "Hunt and Catch",
              body: "Players nearby race to find and crack your orb on the map.",
              icon: (
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <path d="M20 4 L20 36" stroke={C.primary} strokeWidth="1.5" opacity="0.3" />
                  <path d="M4 20 L36 20" stroke={C.primary} strokeWidth="1.5" opacity="0.3" />
                  <circle cx="20" cy="20" r="12" stroke={C.primary} strokeWidth="2" fill="none" />
                  <circle cx="20" cy="20" r="4" fill={C.accent} />
                  <circle cx="20" cy="20" r="7" stroke={C.accent} strokeWidth="1" fill="none" opacity="0.4" />
                </svg>
              ),
            },
            {
              num: "03",
              title: "AI Trades It",
              body: "Your AI agent automatically trades what you catch for max gains.",
              icon: (
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect x="8" y="10" width="24" height="20" rx="3" stroke={C.primary} strokeWidth="2" fill="none" />
                  <path d="M14 20 L18 24 L26 16" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="30" cy="12" r="4" fill={C.accent} opacity="0.6" />
                  <path d="M28 12 L32 12 M30 10 L30 14" stroke="#0a0a0f" strokeWidth="1" />
                </svg>
              ),
            },
          ].map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              style={{
                flex: "1 1 300px",
                maxWidth: 380,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: 32,
                transition: "border-color 0.3s, transform 0.3s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)";
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ marginBottom: 20 }}>{step.icon}</div>
              <span style={{ color: C.primary, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em" }}>{step.num}</span>
              <h3 style={{ fontSize: 26, fontWeight: 700, color: C.text, margin: "10px 0 14px" }}>{step.title}</h3>
              <p style={{ color: C.muted, lineHeight: 1.65, fontSize: 15 }}>{step.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============================================================= */}
      {/*  4. ORB TYPES                                                  */}
      {/* ============================================================= */}
      <section style={{ background: "#060609", padding: "120px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: "center", marginBottom: 64 }}
          >
            <h2 style={{ fontSize: 48, fontWeight: 800, color: C.text }}>Three tiers of treasure.</h2>
          </motion.div>

          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { label: "Common", color: "#C0C0C0", glow: false, reward: "$1 - $9", badge: null },
              { label: "Rare", color: "#3B82F6", glow: true, reward: "$10 - $99", badge: null },
              { label: "Legendary", color: C.gold, glow: true, reward: "$100+", badge: "LEGENDARY" },
            ].map((orb, i) => (
              <motion.div
                key={orb.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                style={{
                  flex: "1 1 260px",
                  maxWidth: 340,
                  background: C.surface,
                  border: `1px solid ${orb.color}33`,
                  borderRadius: 20,
                  padding: "40px 32px",
                  textAlign: "center",
                  position: "relative",
                }}
              >
                {orb.badge && (
                  <div
                    style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      padding: "4px 12px",
                      borderRadius: 6,
                      background: `${C.gold}22`,
                      color: C.gold,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {orb.badge}
                  </div>
                )}
                <OrbTypeOrb color={orb.color} glow={orb.glow} />
                <h3 style={{ fontSize: 24, fontWeight: 700, color: orb.color, marginBottom: 8 }}>{orb.label}</h3>
                <p style={{ color: C.muted, fontSize: 16 }}>{orb.reward}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================= */}
      {/*  5. LIVE TICKER                                                */}
      {/* ============================================================= */}
      <section style={{ background: "#0D0D14", padding: "48px 0", overflow: "hidden" }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p
            style={{
              textAlign: "center",
              color: C.muted,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              marginBottom: 24,
            }}
          >
            Happening right now, everywhere.
          </p>
          <Ticker />
        </motion.div>
      </section>

      {/* ============================================================= */}
      {/*  6. TASKS TEASER                                               */}
      {/* ============================================================= */}
      <section style={{ padding: "120px 32px", maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            gap: 60,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ flex: "1 1 340px" }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "5px 14px",
                borderRadius: 100,
                background: `${C.accent}1A`,
                color: C.accent,
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                marginBottom: 20,
              }}
            >
              Coming with Tasks
            </div>
            <h2
              style={{
                fontSize: "clamp(32px, 5vw, 48px)",
                fontWeight: 800,
                color: C.text,
                lineHeight: 1.15,
                marginBottom: 28,
              }}
            >
              Earn crypto by doing real things.
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                "Complete photo missions at real-world locations",
                "Verify local businesses and earn bounties",
                "Deliver items between GPS points for crypto",
                "Solve location-based puzzles to unlock orbs",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ color: C.accent, fontWeight: 700, fontSize: 18, flexShrink: 0, lineHeight: 1.5 }}>--</span>
                  <p style={{ color: C.muted, fontSize: 16, lineHeight: 1.6 }}>{item}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: floating task card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ flex: "1 1 300px", display: "flex", justifyContent: "center" }}
          >
            <div
              style={{
                width: 320,
                background: C.card,
                borderRadius: 20,
                padding: 28,
                border: `1px solid ${C.border}`,
                animation: "taskFloat 4s ease-in-out infinite",
                boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: `${C.accent}1A`,
                  color: C.accent,
                  fontSize: 11,
                  fontWeight: 700,
                  marginBottom: 14,
                }}
              >
                PHOTO TASK
              </div>
              <h4 style={{ color: C.text, fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
                Photograph the Golden Gate Bridge
              </h4>
              <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
                Walk to the viewpoint. Take a photo. Upload for verification. Earn your reward.
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: `1px solid ${C.border}`,
                  paddingTop: 14,
                }}
              >
                <span style={{ color: C.muted, fontSize: 12 }}>San Francisco, CA</span>
                <span style={{ color: C.accent, fontWeight: 700, fontSize: 15 }}>0.05 SOL</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================= */}
      {/*  7. ECONOMICS                                                  */}
      {/* ============================================================= */}
      <section style={{ background: "#060609", padding: "120px 32px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: "center", marginBottom: 56 }}
          >
            <h2 style={{ fontSize: 48, fontWeight: 800, color: C.text }}>Drop to earn.</h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 24,
              padding: "48px 40px",
              textAlign: "center",
            }}
          >
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              style={{ color: C.muted, fontSize: 18, lineHeight: 1.8, marginBottom: 8 }}
            >
              You drop 1 ETH into a Legendary orb.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.35 }}
              style={{ color: C.muted, fontSize: 18, lineHeight: 1.8, marginBottom: 8 }}
            >
              You set a $10 claim fee.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.5 }}
              style={{ color: C.muted, fontSize: 18, lineHeight: 1.8, marginBottom: 32 }}
            >
              100 hunters find it.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.65 }}
              style={{ fontSize: 28, fontWeight: 700, color: C.accent, marginBottom: 12 }}
            >
              You earn: $<AnimatedCounter target={800} />
              {" "}in fees.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.8 }}
              style={{ color: C.muted, fontSize: 16, marginBottom: 8 }}
            >
              Platform takes: $200 (20%).
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.95 }}
              style={{ color: C.muted, fontSize: 16, marginBottom: 40 }}
            >
              Your orb: still out there.
            </motion.p>

            {/* Stat pills */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 1.1 }}
              style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}
            >
              {[
                { label: "Dropper keeps", value: "80%" },
                { label: "Platform fee", value: "20%" },
                { label: "Orb persists", value: "Forever" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    padding: "12px 24px",
                    borderRadius: 12,
                    background: `${C.primary}11`,
                    border: `1px solid ${C.primary}33`,
                  }}
                >
                  <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>{s.value}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================= */}
      {/*  8. THREE CHAINS                                               */}
      {/* ============================================================= */}
      <section style={{ padding: "120px 32px", maxWidth: 1200, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 64 }}
        >
          <h2 style={{ fontSize: 48, fontWeight: 800, color: C.text }}>Real crypto. Three chains.</h2>
        </motion.div>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { name: "Bitcoin", symbol: "\u20BF", color: "#F7931A" },
            { name: "Ethereum", symbol: "\u039E", color: "#627EEA" },
            { name: "Solana", symbol: "\u25CE", color: "#6366f1" },
          ].map((ch, i) => (
            <motion.div
              key={ch.name}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              style={{
                flex: "1 1 280px",
                maxWidth: 360,
                background: C.surface,
                border: `1px solid ${ch.color}33`,
                borderRadius: 20,
                padding: 40,
                textAlign: "center",
                transition: "box-shadow 0.3s, border-color 0.3s",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 0 40px ${ch.color}22`;
                e.currentTarget.style.borderColor = `${ch.color}66`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = `${ch.color}33`;
              }}
            >
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 700,
                  color: ch.color,
                  marginBottom: 16,
                  lineHeight: 1,
                }}
              >
                {ch.symbol}
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 700, color: C.text }}>{ch.name}</h3>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============================================================= */}
      {/*  9. FINAL CTA                                                  */}
      {/* ============================================================= */}
      <section style={{ padding: "140px 32px", textAlign: "center" }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          style={{ maxWidth: 800, margin: "0 auto" }}
        >
          <h2 style={{ fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 900, color: "#fff", lineHeight: 1.1, marginBottom: 8 }}>
            The world is your trading floor.
          </h2>
          <h2
            style={{
              fontSize: "clamp(36px, 6vw, 56px)",
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: 48,
              background: `linear-gradient(90deg, ${C.primary}, ${C.accent})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Start hunting.
          </h2>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
            <AppStoreButtons />
          </div>

          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <WaitlistForm />
          </div>
        </motion.div>
      </section>

      {/* ============================================================= */}
      {/*  10. FOOTER                                                    */}
      {/* ============================================================= */}
      <footer
        style={{
          background: "#060609",
          borderTop: `1px solid ${C.border}`,
          padding: "32px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MMLogo size={28} />
          <span style={{ color: C.muted, fontSize: 14, fontWeight: 600 }}>MishMesh</span>
          <span style={{ color: C.muted, fontSize: 14 }}>2026</span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <Link href="/privacy" style={{ color: C.muted, fontSize: 14, textDecoration: "none" }}>Privacy</Link>
          <Link href="/terms" style={{ color: C.muted, fontSize: 14, textDecoration: "none" }}>Terms</Link>
        </div>
      </footer>
    </div>
  );
}
