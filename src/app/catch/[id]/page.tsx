"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";
import {
  C,
  rarityColor,
  normalizeOrb,
  type Orb,
  type OrbRarity,
  type OrbCurrency,
} from "@/lib/theme";
import { usePrices } from "@/hooks/usePrices";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { OrbView } from "@/components/OrbAnimation";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

type Phase =
  | "APPROACH"
  | "CRACKING"
  | "EXPLODING"
  | "MEDIA"
  | "REVEAL"
  | "CONFIRMATION";

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function normaliseRarity(r: string | undefined): OrbRarity {
  if (!r) return "Common";
  const s = r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
  if (s === "Rare") return "Rare";
  if (s === "Legendary") return "Legendary";
  return "Common";
}

function normaliseCurrency(c: string | undefined): OrbCurrency {
  if (c === "ETH") return "ETH";
  if (c === "BTC") return "BTC";
  return "SOL";
}

function usdValue(amount: number, currency: OrbCurrency, rates: { sol: number; eth: number; btc: number }): number {
  const map: Record<OrbCurrency, number> = { SOL: rates.sol, ETH: rates.eth, BTC: rates.btc };
  return amount * (map[currency] ?? 0);
}

function truncateHash(h: string): string {
  if (!h || h.length <= 14) return h;
  return `${h.slice(0, 8)}...${h.slice(-6)}`;
}

/* ================================================================== */
/*  Keyframes                                                          */
/* ================================================================== */

const KEYFRAMES = `
  @keyframes orbBreathe {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.06); }
  }
  @keyframes orbScaleIn {
    0% { transform: scale(0.3); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes orbShake {
    0%   { transform: translateX(0) rotate(0deg); }
    8%   { transform: translateX(-8px) rotate(-2deg); }
    16%  { transform: translateX(8px) rotate(2deg); }
    24%  { transform: translateX(-8px) rotate(-3deg); }
    32%  { transform: translateX(8px) rotate(3deg); }
    40%  { transform: translateX(-8px) rotate(-4deg); }
    48%  { transform: translateX(8px) rotate(4deg); }
    56%  { transform: translateX(-8px) rotate(-3deg); }
    64%  { transform: translateX(8px) rotate(3deg); }
    72%  { transform: translateX(-8px) rotate(-2deg); }
    80%  { transform: translateX(8px) rotate(2deg); }
    88%  { transform: translateX(-4px) rotate(-1deg); }
    100% { transform: translateX(0) rotate(0deg); }
  }
  @keyframes crackGrow {
    from { stroke-dashoffset: 300; opacity: 0; }
    to   { stroke-dashoffset: 0;   opacity: 1; }
  }
  @keyframes flash {
    0%   { opacity: 0; }
    10%  { opacity: 0.95; }
    100% { opacity: 0; }
  }
  @keyframes screenShake {
    0%   { transform: translate(0,0); }
    15%  { transform: translate(-6px, 4px); }
    30%  { transform: translate(6px,-4px); }
    45%  { transform: translate(-5px, 5px); }
    60%  { transform: translate(5px,-3px); }
    75%  { transform: translate(-3px, 2px); }
    100% { transform: translate(0,0); }
  }
  @keyframes goldWave {
    0%   { transform: translate(-50%,-50%) scale(0.5); opacity: 0.7; }
    100% { transform: translate(-50%,-50%) scale(3); opacity: 0; }
  }
  @keyframes goldShimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  @keyframes countFadeIn {
    0%   { opacity: 0; transform: scale(0.6); }
    60%  { transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes slideUp {
    from { transform: translateY(40px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes dotPulse {
    0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
    40%           { opacity: 1;   transform: scale(1.2); }
  }
  @keyframes starTwinkle {
    0%, 100% { opacity: 0.1; transform: scale(1); }
    50%      { opacity: 0.7; transform: scale(1.6); }
  }
  @keyframes ringRotate {
    from { transform: translate(-50%,-50%) rotate(0deg); }
    to   { transform: translate(-50%,-50%) rotate(360deg); }
  }
  @keyframes ringRotateReverse {
    from { transform: translate(-50%,-50%) rotate(0deg); }
    to   { transform: translate(-50%,-50%) rotate(-360deg); }
  }
  @keyframes confirmCheck {
    from { transform: scale(0) rotate(-30deg); opacity: 0; }
    to   { transform: scale(1) rotate(0deg);   opacity: 1; }
  }
  @keyframes confettiDrift {
    0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
  @keyframes auroraShift {
    0%   { opacity: 0.3; transform: translateY(0) scaleX(1); }
    50%  { opacity: 0.6; transform: translateY(-20px) scaleX(1.1); }
    100% { opacity: 0.3; transform: translateY(0) scaleX(1); }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 30px var(--glow-color); }
    50% { box-shadow: 0 0 60px var(--glow-color), 0 0 100px var(--glow-color); }
  }
  @keyframes spinnerRotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes checkDraw {
    from { stroke-dashoffset: 60; }
    to { stroke-dashoffset: 0; }
  }
  @keyframes textShimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
`;

/* Generate particle flight keyframes dynamically */
function generateParticleKeyframes(count: number): string {
  let css = "";
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
    const dist = 120 + Math.random() * 140;
    const x = Math.round(Math.cos(angle) * dist);
    const y = Math.round(Math.sin(angle) * dist);
    css += `@keyframes particleFly${i} { to { transform: translate(${x}px,${y}px) scale(0); opacity: 0; } }\n`;
  }
  return css;
}

/* Generate fragment keyframes for shattering orb */
function generateFragmentKeyframes(count: number): string {
  let css = "";
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const dist = 80 + Math.random() * 180;
    const x = Math.round(Math.cos(angle) * dist);
    const y = Math.round(Math.sin(angle) * dist);
    const rot = Math.round(Math.random() * 360 - 180);
    css += `@keyframes fragmentFly${i} { to { transform: translate(${x}px,${y}px) rotate(${rot}deg) scale(0.2); opacity: 0; } }\n`;
  }
  return css;
}

const PARTICLE_COUNT = 36;
const FRAGMENT_COUNT = 12;

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function StarField() {
  const stars = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      s: 1 + Math.random() * 2,
      d: Math.random() * 3,
      dur: 2 + Math.random() * 3,
    })), []
  );

  return (
    <>
      {stars.map((st, i) => (
        <div key={i} style={{
          position: "absolute",
          width: st.s, height: st.s,
          borderRadius: "50%",
          background: "#fff",
          left: `${st.x}%`,
          top: `${st.y}%`,
          animation: `starTwinkle ${st.dur}s ${st.d}s ease-in-out infinite`,
          pointerEvents: "none",
          zIndex: 0,
        }} />
      ))}
    </>
  );
}

function Aurora({ color }: { color: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <div style={{
        position: "absolute",
        width: "120%",
        height: 300,
        left: "-10%",
        top: "15%",
        background: `radial-gradient(ellipse at center, ${color}18 0%, transparent 70%)`,
        animation: "auroraShift 8s ease-in-out infinite",
        filter: "blur(60px)",
      }} />
      <div style={{
        position: "absolute",
        width: "100%",
        height: 200,
        left: "0",
        top: "40%",
        background: `radial-gradient(ellipse at 60% 50%, ${C.primary}12 0%, transparent 65%)`,
        animation: "auroraShift 6s 2s ease-in-out infinite",
        filter: "blur(50px)",
      }} />
    </div>
  );
}

function OrbVisual({
  rarity,
  size,
  shaking,
  showCracks,
}: {
  rarity: OrbRarity;
  size: number;
  shaking: boolean;
  showCracks: boolean;
}) {
  const col = rarityColor(rarity);
  const gradMap: Record<OrbRarity, string> = {
    Common: "radial-gradient(circle at 35% 35%, #ffffff, #8a8a99 60%, #4b5563)",
    Rare: "radial-gradient(circle at 35% 35%, #88FF00, #00FF88 55%, #006633)",
    Legendary: "radial-gradient(circle at 35% 35%, #fde68a, #88FF00 55%, #00FF88)",
  };

  return (
    <div style={{
      position: "relative",
      width: size,
      height: size,
      animation: shaking ? "orbShake 0.36s linear 12" : "orbBreathe 2.4s ease-in-out infinite",
    }}>
      {/* Glow halo */}
      <div style={{
        position: "absolute",
        width: size * 1.8, height: size * 1.8,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${col}50 0%, ${col}20 40%, transparent 70%)`,
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        transition: "all 0.3s",
      }} />

      {/* Outer ring */}
      <div style={{
        position: "absolute",
        width: size * 1.3, height: size * 1.3,
        border: `2px solid ${col}44`,
        borderTop: `2px solid ${col}`,
        borderRadius: "50%",
        top: "50%", left: "50%",
        animation: "ringRotate 3s linear infinite",
        pointerEvents: "none", zIndex: 2,
      }} />

      {/* Inner ring */}
      <div style={{
        position: "absolute",
        width: size * 1.1, height: size * 1.1,
        border: `1px solid ${col}33`,
        borderBottom: `1px solid ${col}88`,
        borderRadius: "50%",
        top: "50%", left: "50%",
        animation: "ringRotateReverse 2s linear infinite",
        pointerEvents: "none", zIndex: 2,
      }} />

      {/* Sphere */}
      <div style={{
        width: "100%", height: "100%", borderRadius: "50%",
        background: gradMap[rarity],
        boxShadow: `0 0 ${size * 0.4}px ${col}99, inset 0 -${size * 0.08}px ${size * 0.2}px rgba(0,0,0,0.45)`,
        position: "relative", zIndex: 1,
      }} />

      {/* Crack lines overlay */}
      {showCracks && <CrackLines color={col} size={size} />}
    </div>
  );
}

function CrackLines({ color, size }: { color: string; size: number }) {
  const scale = size / 200;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{
        position: "absolute", top: 0, left: 0,
        zIndex: 10, pointerEvents: "none",
      }}
    >
      <style>{`.crack-line { stroke-dasharray: 300; animation: crackGrow 0.35s ease-out forwards; }`}</style>
      <line className="crack-line" x1="100" y1="100" x2="55"  y2="25"  stroke={color} strokeWidth={2.5 / scale} style={{ animationDelay: "0s" }} />
      <line className="crack-line" x1="100" y1="100" x2="155" y2="35"  stroke={color} strokeWidth={2 / scale}   style={{ animationDelay: "0.05s" }} />
      <line className="crack-line" x1="100" y1="100" x2="175" y2="105" stroke={color} strokeWidth={2.5 / scale} style={{ animationDelay: "0.1s" }} />
      <line className="crack-line" x1="100" y1="100" x2="145" y2="175" stroke={color} strokeWidth={2 / scale}   style={{ animationDelay: "0.08s" }} />
      <line className="crack-line" x1="100" y1="100" x2="45"  y2="165" stroke={color} strokeWidth={2.5 / scale} style={{ animationDelay: "0.12s" }} />
      <line className="crack-line" x1="100" y1="100" x2="20"  y2="85"  stroke={color} strokeWidth={2 / scale}   style={{ animationDelay: "0.06s" }} />
      <line className="crack-line" x1="100" y1="100" x2="75"  y2="190" stroke={color} strokeWidth={1.5 / scale} style={{ animationDelay: "0.15s" }} />
      <line className="crack-line" x1="100" y1="100" x2="180" y2="55"  stroke={color} strokeWidth={1.5 / scale} style={{ animationDelay: "0.04s" }} />
    </svg>
  );
}

function OrbFragments({ rarity, size }: { rarity: OrbRarity; size: number }) {
  const col = rarityColor(rarity);
  const gradMap: Record<OrbRarity, string> = {
    Common: "linear-gradient(135deg, #ffffff, #4b5563)",
    Rare: "linear-gradient(135deg, #88FF00, #00FF88)",
    Legendary: "linear-gradient(135deg, #fde68a, #00FF88)",
  };
  const fragments = useMemo(() =>
    Array.from({ length: FRAGMENT_COUNT }, (_, i) => ({
      i,
      w: 14 + Math.random() * 20,
      h: 10 + Math.random() * 18,
      delay: i * 0.02,
    })), []
  );

  return (
    <div style={{ position: "absolute", top: "50%", left: "50%", pointerEvents: "none", zIndex: 15 }}>
      {fragments.map(({ i, w, h, delay }) => (
        <div key={i} style={{
          position: "absolute",
          width: w, height: h,
          borderRadius: 3,
          background: gradMap[rarity],
          boxShadow: `0 0 8px ${col}88`,
          top: -h / 2, left: -w / 2,
          animation: `fragmentFly${i} 0.5s ${delay}s ease-out forwards`,
          opacity: 1,
        }} />
      ))}
    </div>
  );
}

function Particles({ color, count }: { color: string; count: number }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      i,
      size: 4 + Math.round(Math.random() * 8),
      delay: i * 0.015,
      dur: 0.6 + Math.random() * 0.5,
    })), [count]
  );

  return (
    <div style={{ position: "absolute", top: "50%", left: "50%", pointerEvents: "none", zIndex: 14 }}>
      {particles.map(({ i, size, delay, dur }) => (
        <div key={i} style={{
          position: "absolute",
          width: size, height: size,
          borderRadius: "50%",
          background: i % 4 === 0 ? "#fff" : i % 4 === 1 ? color : i % 4 === 2 ? C.primary : color,
          top: -size / 2, left: -size / 2,
          animation: `particleFly${i} ${dur}s ${delay}s ease-out forwards`,
          opacity: 1,
        }} />
      ))}
    </div>
  );
}

function GoldenParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 16 }, (_, i) => ({
      i,
      size: 3 + Math.random() * 6,
      delay: i * 0.03,
      dur: 0.7 + Math.random() * 0.5,
    })), []
  );

  return (
    <div style={{ position: "absolute", top: "50%", left: "50%", pointerEvents: "none", zIndex: 16 }}>
      {particles.map(({ i, size, delay, dur }) => {
        const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.5;
        const dist = 100 + Math.random() * 120;
        const x = Math.round(Math.cos(angle) * dist);
        const y = Math.round(Math.sin(angle) * dist);
        return (
          <div key={`gold-${i}`} style={{
            position: "absolute",
            width: size, height: size,
            borderRadius: "50%",
            background: C.gold,
            boxShadow: `0 0 6px ${C.gold}`,
            top: -size / 2, left: -size / 2,
            transition: `transform ${dur}s ease-out ${delay}s, opacity ${dur}s ease-out ${delay}s`,
            transform: `translate(${x}px, ${y}px) scale(0)`,
            opacity: 0,
          }} ref={(el) => {
            if (el) {
              requestAnimationFrame(() => {
                el.style.transform = `translate(${x}px, ${y}px) scale(0)`;
                el.style.opacity = "0";
              });
            }
          }} />
        );
      })}
    </div>
  );
}

function GoldWaves() {
  return (
    <div style={{ position: "absolute", top: "50%", left: "50%", pointerEvents: "none", zIndex: 13 }}>
      {[0, 0.2, 0.4].map((delay, i) => (
        <div key={i} style={{
          position: "absolute",
          width: 160, height: 160,
          borderRadius: "50%",
          border: `3px solid ${C.gold}99`,
          top: "50%", left: "50%",
          transform: "translate(-50%,-50%) scale(0.5)",
          animation: `goldWave 1.2s ${delay}s ease-out forwards`,
        }} />
      ))}
    </div>
  );
}

function Confetti({ color }: { color: string }) {
  const pieces = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      x: Math.random() * 100,
      w: 4 + Math.random() * 6,
      h: 8 + Math.random() * 12,
      delay: Math.random() * 2,
      dur: 2 + Math.random() * 3,
      color: [color, C.primary, C.gold, "#fff", "#00FF88"][i % 5],
    })), [color]
  );

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 20 }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          width: p.w, height: p.h,
          background: p.color,
          borderRadius: 2,
          left: `${p.x}%`,
          top: -20,
          animation: `confettiDrift ${p.dur}s ${p.delay}s linear forwards`,
          opacity: 0.9,
        }} />
      ))}
    </div>
  );
}

function LoadingSpinner({ color }: { color: string }) {
  return (
    <div style={{
      width: 28, height: 28,
      border: `3px solid ${color}33`,
      borderTop: `3px solid ${color}`,
      borderRadius: "50%",
      animation: "spinnerRotate 0.8s linear infinite",
      margin: "0 auto",
    }} />
  );
}

/* ================================================================== */
/*  Animated count-up hook                                             */
/* ================================================================== */

function useCountUp(target: number, duration: number, start: boolean): number {
  const [val, setVal] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!start) return;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      /* ease-out quad */
      const eased = 1 - (1 - progress) * (1 - progress);
      setVal(target * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        setVal(target);
      }
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, start]);

  return val;
}

/* ================================================================== */
/*  Main Page Component                                                */
/* ================================================================== */

export default function CrackPage() {
  const params = useParams();
  const router = useRouter();
  const { user, session } = useAuth();
  const prices = usePrices();
  const { isDesktop } = useIsDesktop();

  const [orb, setOrb] = useState<Orb | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("APPROACH");
  const [crackResult, setCrackResult] = useState<{
    tx_hash: string | null;
    explorer_url: string | null;
    amount: number;
    currency: string;
    chain: string | null;
  } | null>(null);
  const [crackError, setCrackError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [screenShaking, setScreenShaking] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCountUp, setShowCountUp] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const phaseRef = useRef<Phase>("APPROACH");
  const crackCalledRef = useRef(false);

  const rarity = normaliseRarity(orb?.rarity);
  const currency = normaliseCurrency(orb?.currency);
  const rarCol = rarityColor(rarity);
  const amount = orb?.amount ?? 0;
  const usd = usdValue(amount, currency, prices);

  const countUpValue = useCountUp(
    amount,
    1200,
    showCountUp
  );

  /* Fetch orb data */
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("orbs")
        .select("*")
        .eq("id", params.id as string)
        .single();
      if (data) setOrb(normalizeOrb(data));
      setLoading(false);
    }
    if (params.id) load();
  }, [params.id]);

  /* Fetch user profile for wallet address */
  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) setUserProfile(data);
    }
    loadProfile();
  }, [user?.id]);

  /* Crack API call */
  const callCrackAPI = useCallback(async () => {
    if (crackCalledRef.current || !session?.access_token || !orb) return;
    crackCalledRef.current = true;

    /* Get location */
    const loc = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

    if (!loc) {
      setCrackError("Location access is required to catch creatures. Please enable GPS and try again.");
      crackCalledRef.current = false;
      return;
    }

    try {
      const orbCurrency = (orb.currency || 'SOL').toUpperCase();
      let hunterWallet: string | null = null;
      if (orbCurrency === 'SOL') hunterWallet = userProfile?.sol_address ?? null;
      else if (orbCurrency === 'ETH') hunterWallet = userProfile?.eth_address ?? null;
      else if (orbCurrency === 'BTC') hunterWallet = userProfile?.btc_address ?? null;
      if (!hunterWallet) { setCrackError(`You need a ${orbCurrency} wallet to catch this creature.`); return; }

      const res = await fetch("/api/orbs/crack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          orb_id: orb.id,
          hunter_wallet: hunterWallet,
          lat: loc?.lat ?? null,
          lng: loc?.lng ?? null,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setCrackError(data.error ?? "Failed to catch creature.");
        return;
      }

      setCrackResult({
        tx_hash: data.tx_hash ?? null,
        explorer_url: data.explorer_url ?? null,
        amount: data.amount ?? amount,
        currency: data.currency ?? currency,
        chain: data.chain ?? null,
      });
    } catch {
      setCrackError("Network error. Please try again.");
    }
  }, [session, orb, userProfile, amount, currency]);

  /* Phase orchestration on tap */
  const handleTap = useCallback(() => {
    if (phaseRef.current !== "APPROACH") return;

    /* Phase 2: CRACKING */
    phaseRef.current = "CRACKING";
    setPhase("CRACKING");

    /* Fire off the API call during cracking animation */
    callCrackAPI();

    /* After shake animation (~1.5s) -> Phase 3: EXPLODING */
    setTimeout(() => {
      phaseRef.current = "EXPLODING";
      setPhase("EXPLODING");
      setScreenShaking(true);
      setTimeout(() => setScreenShaking(false), 500);

      /* After explosion clears (500ms) -> MEDIA or REVEAL */
      setTimeout(() => {
        const hasMedia = (orb?.message && orb.message.trim()) || orb?.media_url;
        if (hasMedia) {
          phaseRef.current = "MEDIA";
          setPhase("MEDIA");
        } else {
          phaseRef.current = "REVEAL";
          setPhase("REVEAL");
          setShowConfetti(true);
          setTimeout(() => setShowCountUp(true), 200);
        }
      }, 500);
    }, 1500);
  }, [callCrackAPI, orb]);

  /* Handle "Continue" from MEDIA -> REVEAL */
  const handleMediaContinue = useCallback(() => {
    phaseRef.current = "REVEAL";
    setPhase("REVEAL");
    setShowConfetti(true);
    setTimeout(() => setShowCountUp(true), 200);
  }, []);

  /* Handle "Collect / Continue" from REVEAL -> CONFIRMATION */
  const handleConfirm = useCallback(() => {
    phaseRef.current = "CONFIRMATION";
    setPhase("CONFIRMATION");

    /* Show confirmed as soon as we have a tx hash - no artificial delay */
    const checkConfirm = () => {
      if (crackResult?.tx_hash) {
        // Hash is back = tx is broadcast = show confirmed immediately
        setConfirmed(true);
      } else if (crackError) {
        setConfirmed(true); // show error state
      } else {
        setTimeout(checkConfirm, 200);
      }
    };
    checkConfirm();
  }, [crackResult, crackError]);

  const handleClose = useCallback(() => {
    router.push("/watch");
  }, [router]);

  /* Dynamic keyframes for particles/fragments */
  const dynamicKeyframes = useMemo(() => {
    return generateParticleKeyframes(PARTICLE_COUNT) + generateFragmentKeyframes(FRAGMENT_COUNT);
  }, []);

  /* Amount format */
  const formatAmount = (v: number) => {
    if (amount < 0.001) return v.toFixed(6);
    if (amount < 1) return v.toFixed(4);
    return v.toFixed(2);
  };

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div style={{
        position: "fixed", inset: 0,
        background: "#0a0a0f",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <LoadingSpinner color={C.primary} />
          <p style={{ color: C.muted, fontSize: 14, marginTop: 16 }}>Loading creature...</p>
        </div>
      </div>
    );
  }

  /* ---- Not found ---- */
  if (!orb) {
    return (
      <div style={{
        position: "fixed", inset: 0,
        background: "#0a0a0f",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        <div style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>Creature not found</div>
        <button onClick={handleClose} style={{
          background: "none", border: "none",
          color: C.primary, fontSize: 14, cursor: "pointer",
          textDecoration: "underline",
        }}>
          Back to Watch
        </button>
      </div>
    );
  }

  /* ---- Cinematic experience ---- */
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#0A0A0F",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, -apple-system, sans-serif",
      overflow: "hidden",
      animation: screenShaking ? "screenShake 0.4s ease-out" : "none",
    }}>
      <style>{KEYFRAMES}</style>
      <style>{dynamicKeyframes}</style>

      {/* Background elements */}
      <Aurora color={rarCol} />
      <StarField />

      {/* Close / back button - top left */}
      <button
        onClick={handleClose}
        style={{
          position: "absolute", top: 16, left: 16,
          width: 40, height: 40,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          zIndex: 100,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => { if (isDesktop) { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; } }}
        onMouseLeave={(e) => { if (isDesktop) { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; } }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M14 4L4 14M4 4L14 14" stroke={C.text} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* ================================================================ */}
      {/*  PHASE 1: APPROACH                                               */}
      {/* ================================================================ */}
      {phase === "APPROACH" && (
        <div
          onClick={handleTap}
          style={{
            textAlign: "center",
            position: "relative", zIndex: 10,
            cursor: "pointer",
            animation: "fadeIn 0.6s ease-out",
            display: "flex", flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ animation: "orbScaleIn 0.8s ease-out" }}>
            <OrbView rarity={rarity} isClaimable={true} size={140} />
          </div>

          <div style={{
            marginTop: 40,
            display: "inline-block",
            padding: "6px 18px", borderRadius: 20,
            background: `${rarCol}18`,
            border: `1px solid ${rarCol}44`,
            color: rarCol, fontSize: 11, fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}>
            {rarity.toUpperCase()}
          </div>

          <p style={{
            color: C.muted,
            fontSize: isDesktop ? 16 : 15,
            marginTop: 28,
            letterSpacing: "0.08em",
            animation: "dotPulse 2s ease-in-out infinite",
          }}>
            {isDesktop ? "Click to Witness" : "Tap to witness"}
          </p>
        </div>
      )}

      {/* ================================================================ */}
      {/*  PHASE 2: CRACKING                                               */}
      {/* ================================================================ */}
      {phase === "CRACKING" && (
        <div style={{
          textAlign: "center",
          position: "relative", zIndex: 10,
        }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <OrbVisual rarity={rarity} size={160} shaking={true} showCracks={true} />
          </div>

          <p style={{
            color: rarCol,
            fontSize: 13,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginTop: 36,
            animation: "dotPulse 0.6s ease-in-out infinite",
          }}>
            Witnessing...
          </p>
        </div>
      )}

      {/* ================================================================ */}
      {/*  PHASE 3: EXPLODING                                              */}
      {/* ================================================================ */}
      {phase === "EXPLODING" && (
        <div style={{ position: "relative", zIndex: 10 }}>
          {/* White flash */}
          <div style={{
            position: "fixed", inset: 0,
            background: "#ffffff",
            animation: "flash 0.3s ease-out forwards",
            pointerEvents: "none", zIndex: 25,
          }} />

          {/* Orb fragments */}
          <OrbFragments rarity={rarity} size={160} />

          {/* Particle explosion */}
          <Particles color={rarCol} count={PARTICLE_COUNT} />

          {/* Legendary extras */}
          {rarity === "Legendary" && (
            <>
              <GoldWaves />
              <GoldenParticles />
            </>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/*  PHASE: MEDIA                                                    */}
      {/* ================================================================ */}
      {phase === "MEDIA" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "#0a0a0f",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: 24,
        }}>
          <div style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            padding: "32px 24px",
            maxWidth: isDesktop ? 440 : 340,
            width: "100%",
            textAlign: "center",
            animation: "orbScaleIn 0.4s ease-out",
          }}>
            {/* Dropper name */}
            <p style={{
              color: C.muted, fontSize: 12,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}>
              From {orb?.dropper_username || "Anonymous"}
            </p>

            {/* Message text */}
            {orb?.message && orb.message.trim() && (
              <p style={{
                color: C.text, fontSize: 18, fontWeight: 600,
                lineHeight: 1.5,
                marginBottom: orb?.media_url ? 20 : 0,
                wordBreak: "break-word",
              }}>
                {orb.message}
              </p>
            )}

            {/* Video */}
            {orb?.media_url && (
              <video
                src={orb.media_url}
                autoPlay
                muted
                controls
                style={{
                  width: "100%",
                  borderRadius: 12,
                  maxHeight: 280,
                  objectFit: "contain",
                  background: "#000",
                }}
              />
            )}
          </div>

          <button
            onClick={handleMediaContinue}
            style={{
              background: "#00FF88",
              color: "#000",
              padding: "12px 32px",
              borderRadius: 8,
              marginTop: 24,
              fontSize: 16,
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { if (isDesktop) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 0 24px #00FF8888"; } }}
            onMouseLeave={(e) => { if (isDesktop) { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; } }}
          >
            Continue
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/*  PHASE 4: REVEAL                                                 */}
      {/* ================================================================ */}
      {phase === "REVEAL" && (
        <div style={{
          textAlign: "center",
          position: "relative", zIndex: 10,
          width: "100%", maxWidth: isDesktop ? 480 : 380,
          padding: "0 24px",
          boxSizing: "border-box",
        }}>
          {showConfetti && <Confetti color={rarCol} />}

          {/* Legendary banner */}
          {rarity === "Legendary" && (
            <p style={{
              color: C.gold,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              marginBottom: 12,
              textShadow: `0 0 20px ${C.gold}`,
              animation: "fadeIn 0.5s ease-out",
            }}>
              LEGENDARY FIND
            </p>
          )}

          {/* Value - animated count-up */}
          <div style={{ animation: "countFadeIn 0.6s ease-out" }}>
            <div style={{
              fontSize: 58,
              fontWeight: 900,
              lineHeight: 1,
              background: rarity === "Legendary"
                ? `linear-gradient(90deg, ${C.gold} 0%, #fff 40%, ${C.gold} 100%)`
                : `linear-gradient(90deg, ${rarCol} 0%, #fff 40%, ${rarCol} 100%)`,
              backgroundSize: "800px 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "goldShimmer 2.5s linear infinite",
            }}>
              {formatAmount(countUpValue)}
            </div>
            <div style={{
              color: rarCol,
              fontSize: 20,
              fontWeight: 700,
              marginTop: 6,
            }}>
              {currency}
            </div>
            <div style={{
              color: C.muted,
              fontSize: 14,
              marginTop: 4,
            }}>
              ~${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
          </div>

          {/* Streak multiplier (if applicable - show for Rare+) */}
          {rarity !== "Common" && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 16,
              padding: "5px 14px",
              borderRadius: 20,
              background: `${C.gold}18`,
              border: `1px solid ${C.gold}44`,
              animation: "slideUp 0.5s 0.3s ease-out both",
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L8.5 5.5L13 7L8.5 8.5L7 13L5.5 8.5L1 7L5.5 5.5L7 1Z" fill={C.gold} />
              </svg>
              <span style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: "0.05em" }}>
                {rarity === "Legendary" ? "LEGENDARY" : "RARE"} CATCH
              </span>
            </div>
          )}

          {/* Rarity badge */}
          <div style={{
            display: "inline-block",
            marginTop: rarity === "Common" ? 20 : 10,
            padding: "5px 16px",
            borderRadius: 20,
            background: `${rarCol}15`,
            border: `1px solid ${rarCol}44`,
            color: rarCol,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            animation: "slideUp 0.5s 0.4s ease-out both",
          }}>
            {rarity.toUpperCase()}
          </div>

          {/* Error display */}
          {crackError && (
            <div style={{
              marginTop: 16,
              padding: "10px 14px",
              borderRadius: 10,
              background: `${C.danger}18`,
              border: `1px solid ${C.danger}44`,
              color: C.danger,
              fontSize: 13,
              animation: "fadeIn 0.3s ease-out",
            }}>
              {crackError}
            </div>
          )}

          {/* Collect button */}
          <div style={{ marginTop: 32, animation: "slideUp 0.5s 0.6s ease-out both" }}>
            <button
              onClick={handleConfirm}
              style={{
                width: "100%",
                padding: "16px 0",
                borderRadius: 50,
                border: "none",
                background: crackError
                  ? "rgba(255,255,255,0.06)"
                  : `linear-gradient(135deg, ${rarCol}, ${rarCol}bb)`,
                color: crackError ? C.muted : "#fff",
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: "0.06em",
                cursor: crackError ? "not-allowed" : "pointer",
                boxShadow: crackError ? "none" : `0 0 30px ${rarCol}55, 0 4px 20px rgba(0,0,0,0.3)`,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { if (isDesktop && !crackError) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = `0 0 50px ${rarCol}77, 0 6px 28px rgba(0,0,0,0.4)`; } }}
              onMouseLeave={(e) => { if (isDesktop && !crackError) { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 0 30px ${rarCol}55, 0 4px 20px rgba(0,0,0,0.3)`; } }}
              disabled={!!crackError}
            >
              {crackError ? "Failed" : "Collect"}
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/*  PHASE 5: CONFIRMATION                                           */}
      {/* ================================================================ */}
      {phase === "CONFIRMATION" && (
        <div style={{
          textAlign: "center",
          position: "relative", zIndex: 10,
          width: "100%", maxWidth: isDesktop ? 480 : 380,
          padding: "0 24px",
          boxSizing: "border-box",
          animation: "fadeIn 0.4s ease-out",
        }}>
          {!confirmed ? (
            /* Sending state */
            <div style={{ textAlign: "center" }}>
              <LoadingSpinner color={rarCol} />
              <p style={{
                fontSize: 17,
                fontWeight: 700,
                marginTop: 20,
                background: `linear-gradient(90deg, ${C.text} 0%, ${C.text} 40%, ${rarCol} 50%, ${C.text} 60%, ${C.text} 100%)`,
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "textShimmer 2s linear infinite",
              }}>
                Sending to wallet...
              </p>
              <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", marginTop: 12 }}>
                {[0, 0.15, 0.3].map((d, i) => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: rarCol,
                    animation: `dotPulse 1.2s ${d}s ease-in-out infinite`,
                  }} />
                ))}
              </div>
            </div>
          ) : (
            /* Confirmed state */
            <div style={{ animation: "fadeIn 0.4s ease-out" }}>
              {/* Checkmark circle with draw-in effect */}
              <div style={{
                width: 80, height: 80,
                borderRadius: "50%",
                background: `rgba(0, 255, 136, 0.12)`,
                border: `2px solid #00FF88`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                animation: "confirmCheck 0.5s ease-out",
              }}>
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <path
                    d="M8 18L15 25L28 11"
                    stroke="#00FF88"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="60"
                    strokeDashoffset="60"
                    style={{ animation: "checkDraw 0.6s 0.3s ease-out forwards" }}
                  />
                </svg>
              </div>

              <p style={{
                color: C.text,
                fontSize: 22,
                fontWeight: 800,
                margin: "0 0 8px",
              }}>
                Confirmed
              </p>

              <p style={{
                color: C.muted,
                fontSize: 14,
                margin: "0 0 16px",
              }}>
                {amount} {currency} sent to your wallet
              </p>

              {/* Transaction hash + explorer link */}
              {crackResult?.tx_hash && (
                <a
                  href={crackResult.explorer_url ?? `https://solscan.io/tx/${crackResult.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 20,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: C.primary,
                    fontSize: 12,
                    fontFamily: "monospace",
                    marginBottom: 12,
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  View on Explorer
                </a>
              )}

              {/* Chain badge */}
              {crackResult?.chain && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  marginTop: 8,
                  marginBottom: 8,
                }}>
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 12px",
                    borderRadius: 16,
                    background: `${C.primary}18`,
                    border: `1px solid ${C.primary}44`,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <circle cx="6" cy="6" r="5" stroke={C.primary} strokeWidth="1.5" />
                      <circle cx="6" cy="6" r="2" fill={C.primary} />
                    </svg>
                    <span style={{
                      color: C.primary,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                    }}>
                      {crackResult.chain.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}

              {/* Continue Hunting button */}
              <div style={{ marginTop: 28 }}>
                <button
                  onClick={handleClose}
                  style={{
                    width: "100%",
                    padding: "16px 0",
                    borderRadius: 50,
                    border: "none",
                    background: `linear-gradient(135deg, ${C.primary}, #88FF00)`,
                    color: "#fff",
                    fontSize: 17,
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    cursor: "pointer",
                    boxShadow: `0 4px 24px ${C.primary}55`,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { if (isDesktop) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = `0 0 40px ${C.primary}77, 0 6px 28px rgba(0,0,0,0.4)`; } }}
                  onMouseLeave={(e) => { if (isDesktop) { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 4px 24px ${C.primary}55`; } }}
                >
                  Continue Watching
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
