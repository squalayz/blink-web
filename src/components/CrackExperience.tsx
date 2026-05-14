"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/providers";
import {
  C,
  rarityColor,
  type Orb,
  type OrbRarity,
  type OrbCurrency,
} from "@/lib/theme";
import { usePrices } from "@/hooks/usePrices";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { distanceMeters } from "@/lib/geo";
import { sounds, type BlinkSound } from "@/lib/sounds";

function catchSoundFor(rarity: OrbRarity): BlinkSound {
  if (rarity === "Legendary") return "catchMythic";
  if (rarity === "Rare") return "catchRare";
  return "catchCommon";
}

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

type Phase =
  | "APPROACH"
  | "READY"
  | "CRACKING"
  | "EXPLODING"
  | "REVEAL"
  | "COLLECTING"
  | "DONE";

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

function usdValue(orb: Orb, rates: { sol: number; eth: number; btc: number }): number {
  const c = normaliseCurrency(orb.currency);
  const map: Record<OrbCurrency, number> = { SOL: rates.sol, ETH: rates.eth, BTC: rates.btc };
  return (orb.amount ?? 0) * (map[c] ?? 0);
}

function truncateHash(h: string): string {
  if (!h || h.length <= 14) return h;
  return `${h.slice(0, 8)}...${h.slice(-6)}`;
}

/* ================================================================== */
/*  Keyframes (injected once via a style tag)                         */
/* ================================================================== */

const KEYFRAMES = `
  @keyframes orbPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  @keyframes orbShake {
    0%   { transform: translateX(0) rotate(0deg); }
    10%  { transform: translateX(-8px) rotate(-3deg); }
    20%  { transform: translateX(8px) rotate(3deg); }
    30%  { transform: translateX(-10px) rotate(-4deg); }
    40%  { transform: translateX(10px) rotate(4deg); }
    50%  { transform: translateX(-12px) rotate(-5deg); }
    60%  { transform: translateX(12px) rotate(5deg); }
    70%  { transform: translateX(-8px) rotate(-3deg); }
    80%  { transform: translateX(8px) rotate(3deg); }
    90%  { transform: translateX(-4px) rotate(-1deg); }
    100% { transform: translateX(0) rotate(0deg); }
  }
  @keyframes crackGrow {
    from { stroke-dashoffset: 300; opacity: 0; }
    to   { stroke-dashoffset: 0;   opacity: 1; }
  }
  @keyframes flash {
    0%   { opacity: 0; }
    30%  { opacity: 0.92; }
    100% { opacity: 0; }
  }
  @keyframes particleFly0  { to { transform: translate(-120px,-140px) scale(0); opacity: 0; } }
  @keyframes particleFly1  { to { transform: translate( 140px,-120px) scale(0); opacity: 0; } }
  @keyframes particleFly2  { to { transform: translate(-160px,  60px) scale(0); opacity: 0; } }
  @keyframes particleFly3  { to { transform: translate( 160px,  80px) scale(0); opacity: 0; } }
  @keyframes particleFly4  { to { transform: translate( -80px, 170px) scale(0); opacity: 0; } }
  @keyframes particleFly5  { to { transform: translate(  90px, 160px) scale(0); opacity: 0; } }
  @keyframes particleFly6  { to { transform: translate(-180px, -30px) scale(0); opacity: 0; } }
  @keyframes particleFly7  { to { transform: translate( 180px, -50px) scale(0); opacity: 0; } }
  @keyframes particleFly8  { to { transform: translate( -50px,-180px) scale(0); opacity: 0; } }
  @keyframes particleFly9  { to { transform: translate(  60px, 190px) scale(0); opacity: 0; } }
  @keyframes particleFly10 { to { transform: translate(-140px, 140px) scale(0); opacity: 0; } }
  @keyframes particleFly11 { to { transform: translate( 130px,-150px) scale(0); opacity: 0; } }
  @keyframes goldWave {
    0%   { transform: scale(0.8); opacity: 0.6; }
    100% { transform: scale(2.8); opacity: 0; }
  }
  @keyframes goldShimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes dotPulse {
    0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
    40%           { opacity: 1;   transform: scale(1.2); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes starTwinkle {
    0%, 100% { opacity: 0.15; transform: scale(1); }
    50%      { opacity: 1;    transform: scale(1.8); }
  }
  @keyframes textShimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes ringRotate {
    from { transform: translate(-50%,-50%) rotate(0deg); }
    to   { transform: translate(-50%,-50%) rotate(360deg); }
  }
  @keyframes ringRotateReverse {
    from { transform: translate(-50%,-50%) rotate(0deg); }
    to   { transform: translate(-50%,-50%) rotate(-360deg); }
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
  @keyframes confirmCheck {
    from { transform: scale(0) rotate(-30deg); opacity: 0; }
    to   { transform: scale(1) rotate(0deg);   opacity: 1; }
  }
`;

/* ================================================================== */
/*  Orb Visual                                                         */
/* ================================================================== */

function OrbVisual({
  rarity, size, phase,
}: {
  rarity: OrbRarity;
  size: number;
  phase: Phase;
}) {
  const col = rarityColor(rarity);
  const gradMap: Record<OrbRarity, string> = {
    Common:    "radial-gradient(circle at 35% 35%, #ffffff, #8a8a99 60%, #1a1a24)",
    Rare:      "radial-gradient(circle at 35% 35%, #88FF00, #00FF88 55%, #0d0d14)",
    Legendary: "radial-gradient(circle at 35% 35%, #ffffff, #00FF88 55%, #0a0a0f)",
  };

  const shaking = phase === "CRACKING";
  const pulseLarge = phase === "READY";
  const orb_size = pulseLarge ? size * 1.15 : size;

  return (
    <div style={{ position: "relative", width: orb_size, height: orb_size, transition: "width 0.4s, height 0.4s" }}>
      {/* Outer glow halo */}
      <div style={{
        position: "absolute",
        width: orb_size * 1.6, height: orb_size * 1.6,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${col}40 0%, transparent 70%)`,
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        animation: "orbPulse 2s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* Sphere */}
      <div style={{
        width: "100%", height: "100%", borderRadius: "50%",
        background: gradMap[rarity],
        boxShadow: `0 0 ${orb_size * 0.35}px ${col}99, inset 0 -${orb_size * 0.08}px ${orb_size * 0.2}px rgba(0,0,0,0.45)`,
        animation: shaking
          ? "orbShake 0.15s ease-in-out infinite"
          : "orbPulse 2.2s ease-in-out infinite",
        position: "relative", zIndex: 1,
      }} />

      {/* Outer ring */}
      <div style={{
        position: "absolute",
        width: orb_size * 1.25, height: orb_size * 1.25,
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
        width: orb_size * 1.06, height: orb_size * 1.06,
        border: `1px solid ${col}33`,
        borderBottom: `1px solid ${col}88`,
        borderRadius: "50%",
        top: "50%", left: "50%",
        animation: "ringRotateReverse 2s linear infinite",
        pointerEvents: "none", zIndex: 2,
      }} />
    </div>
  );
}

/* ================================================================== */
/*  Crack SVG lines                                                    */
/* ================================================================== */

function CrackLines({ color }: { color: string }) {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 10, pointerEvents: "none" }}
    >
      <style>{`
        .crack-line { stroke-dasharray: 300; animation: crackGrow 0.3s ease-out forwards; }
      `}</style>
      <line className="crack-line" x1="100" y1="100" x2="60"  y2="30"  stroke={color} strokeWidth="2.5" style={{ animationDelay: "0s" }} />
      <line className="crack-line" x1="100" y1="100" x2="150" y2="40"  stroke={color} strokeWidth="2"   style={{ animationDelay: "0.05s" }} />
      <line className="crack-line" x1="100" y1="100" x2="170" y2="110" stroke={color} strokeWidth="2.5" style={{ animationDelay: "0.1s" }} />
      <line className="crack-line" x1="100" y1="100" x2="140" y2="170" stroke={color} strokeWidth="2"   style={{ animationDelay: "0.08s" }} />
      <line className="crack-line" x1="100" y1="100" x2="50"  y2="160" stroke={color} strokeWidth="2.5" style={{ animationDelay: "0.12s" }} />
      <line className="crack-line" x1="100" y1="100" x2="25"  y2="90"  stroke={color} strokeWidth="2"   style={{ animationDelay: "0.06s" }} />
      <line className="crack-line" x1="100" y1="100" x2="80"  y2="185" stroke={color} strokeWidth="1.5" style={{ animationDelay: "0.15s" }} />
      <line className="crack-line" x1="100" y1="100" x2="175" y2="60"  stroke={color} strokeWidth="1.5" style={{ animationDelay: "0.04s" }} />
    </svg>
  );
}

/* ================================================================== */
/*  Particles                                                          */
/* ================================================================== */

function Particles({ color }: { color: string }) {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    i,
    size: 6 + Math.round(Math.random() * 10),
    delay: i * 0.04,
    dur: 0.8 + Math.random() * 0.4,
  }));

  return (
    <div style={{ position: "absolute", top: "50%", left: "50%", pointerEvents: "none" }}>
      {particles.map(({ i, size, delay, dur }) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: size, height: size,
            borderRadius: "50%",
            background: i % 3 === 0 ? color : i % 3 === 1 ? C.accent : "#fff",
            top: -size / 2, left: -size / 2,
            animation: `particleFly${i} ${dur}s ${delay}s ease-out forwards`,
            opacity: 1,
          }}
        />
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Gold Energy Waves (Legendary only)                                */
/* ================================================================== */

function GoldWaves() {
  return (
    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }}>
      {[0, 0.2, 0.4].map((delay, i) => (
        <div key={i} style={{
          position: "absolute",
          width: 160, height: 160,
          borderRadius: "50%",
          border: `3px solid ${C.gold}99`,
          top: "50%", left: "50%",
          transform: "translate(-50%,-50%) scale(0.8)",
          animation: `goldWave 1.2s ${delay}s ease-out forwards`,
        }} />
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Star field                                                         */
/* ================================================================== */

function StarField() {
  const stars = Array.from({ length: 35 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    s: 1 + Math.random() * 2,
    d: Math.random() * 2,
    dur: 1.5 + Math.random() * 2,
  }));

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

/* ================================================================== */
/*  Loading dots                                                       */
/* ================================================================== */

function LoadingDots() {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", marginTop: 12 }}>
      {[0, 0.15, 0.3].map((d, i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: C.accent,
          animation: `dotPulse 1.2s ${d}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

export default function CrackExperience({
  orb,
  onClose,
  userId,
  userProfile,
}: {
  orb: Orb;
  onClose: () => void;
  userId: string;
  userProfile: any;
}) {
  const { session } = useAuth();
  const prices = usePrices();
  const { isDesktop } = useIsDesktop();

  const rarity = normaliseRarity(orb.rarity);
  const currency = normaliseCurrency(orb.currency);
  const rarityCol = rarityColor(rarity);
  const usd = usdValue(orb, prices);

  const [phase, setPhase] = useState<Phase>("APPROACH");
  const [geoError, setGeoError] = useState("");
  const [collectError, setCollectError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [shaking, setShaking] = useState(false);
  const phaseRef = useRef<Phase>("APPROACH");

  const setPhaseSync = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  /* Auto-advance APPROACH -> READY after 1s */
  useEffect(() => {
    const t = setTimeout(() => setPhaseSync("READY"), 1000);
    return () => clearTimeout(t);
  }, []);

  /* Handle CRACK button */
  const handleCrack = useCallback(() => {
    if (phaseRef.current !== "READY") return;
    setPhaseSync("CRACKING");

    /* After 1.5s of cracking -> EXPLODING */
    setTimeout(() => {
      setPhaseSync("EXPLODING");
      setShaking(true);
      setTimeout(() => setShaking(false), 700);

      /* After explosion -> REVEAL */
      setTimeout(() => {
        setPhaseSync("REVEAL");
      }, 800);
    }, 1500);
  }, []);

  /* Handle Collect */
  const handleCollect = useCallback(async () => {
    if (!session?.access_token) return;
    setPhaseSync("COLLECTING");
    setCollectError("");

    /* Geolocation check */
    const check = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    const orbLat = orb.latitude ?? (orb as any).lat ?? 0;
    const orbLng = orb.longitude ?? (orb as any).lng ?? 0;
    const radius = Math.min(orb.radius_meters ?? 100, 50);

    if (!check) {
      setGeoError("Location access is required to catch creatures. Please enable GPS and try again.");
      setPhaseSync("REVEAL");
      return;
    }

    const dist = distanceMeters(check.lat, check.lng, orbLat, orbLng);
    if (dist > radius) {
      setGeoError(`You are ${Math.round(dist)}m away. Get within ${radius}m to catch.`);
      setPhaseSync("REVEAL");
      return;
    }

    try {
      const res = await fetch("/api/orbs/crack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          orb_id: orb.id,
          hunter_id: userId,
          hunter_wallet:
            userProfile?.sol_address ??
            userProfile?.eth_address ??
            userProfile?.btc_address ??
            userProfile?.wallet_address ??
            null,
          lat: check?.lat ?? null,
          lng: check?.lng ?? null,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setCollectError(data.error ?? "Failed to collect. Try again.");
        setPhaseSync("REVEAL");
        return;
      }

      setTxHash(data.tx_hash ?? data.txHash ?? null);
      setConfirmed(true);
      setPhaseSync("DONE");
      sounds.play(catchSoundFor(rarity));
    } catch {
      setCollectError("Network error. Please try again.");
      setPhaseSync("REVEAL");
    }
  }, [session, orb, rarity, userId, userProfile]);

  /* Rarity label */
  const RARITY_LABELS: Record<OrbRarity, string> = {
    Common: "COMMON",
    Rare: "RARE",
    Legendary: "LEGENDARY",
  };

  /* Background radial gradient */
  const bgGradient = `radial-gradient(ellipse at 50% 50%, ${rarityCol}26 0%, ${C.bg} 65%)`;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: bgGradient,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        overflow: "hidden",
        animation: shaking ? "screenShake 0.4s ease-out" : "none",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Star field */}
      <StarField />

      {/* Close button — always visible */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 20, right: 20,
          background: `${C.card}cc`, border: `1px solid #2a2a3a`,
          color: C.text, borderRadius: 20, padding: "6px 14px",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
          zIndex: 100, backdropFilter: "blur(8px)",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => { if (isDesktop) { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; } }}
        onMouseLeave={(e) => { if (isDesktop) { e.currentTarget.style.background = `${C.card}cc`; } }}
      >
        Close
      </button>

      {/* ---- Phase: APPROACH ---- */}
      {phase === "APPROACH" && (
        <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease-out", position: "relative", zIndex: 10 }}>
          <p style={{ color: C.muted, fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 28 }}>
            Creature Sighted
          </p>
          <OrbVisual rarity={rarity} size={140} phase="APPROACH" />
          <div style={{
            marginTop: 28,
            display: "inline-block",
            padding: "5px 14px", borderRadius: 20,
            background: `${rarityCol}22`,
            border: `1px solid ${rarityCol}55`,
            color: rarityCol, fontSize: 12, fontWeight: 700,
            letterSpacing: "0.1em",
          }}>
            {RARITY_LABELS[rarity]}
          </div>
        </div>
      )}

      {/* ---- Phase: READY ---- */}
      {phase === "READY" && (
        <div style={{ textAlign: "center", animation: "fadeIn 0.3s ease-out", position: "relative", zIndex: 10 }}>
          <p style={{ color: C.muted, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 32 }}>
            Creature Sighted
          </p>
          <OrbVisual rarity={rarity} size={160} phase="READY" />
          <div style={{ marginTop: 36 }}>
            <button
              onClick={handleCrack}
              style={{
                padding: "18px 52px",
                borderRadius: 50,
                border: "none",
                background: `linear-gradient(135deg, ${rarityCol}, ${rarityCol}bb)`,
                color: "#fff",
                fontSize: 22, fontWeight: 900,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                cursor: "pointer",
                boxShadow: `0 0 40px ${rarityCol}88, 0 4px 24px rgba(0,0,0,0.4)`,
                transition: "box-shadow 0.2s, transform 0.1s",
              }}
              onMouseEnter={() => sounds.play("tick")}
              onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.96)"; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            >
              WITNESS
            </button>
          </div>
        </div>
      )}

      {/* ---- Phase: CRACKING ---- */}
      {phase === "CRACKING" && (
        <div style={{ textAlign: "center", position: "relative", zIndex: 10 }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <OrbVisual rarity={rarity} size={160} phase="CRACKING" />
            <CrackLines color={rarityCol} />
          </div>
          <p style={{
            color: rarityCol, fontSize: 14, letterSpacing: "0.2em",
            textTransform: "uppercase", marginTop: 32,
            animation: "dotPulse 0.6s ease-in-out infinite",
          }}>
            Witnessing...
          </p>
        </div>
      )}

      {/* ---- Phase: EXPLODING ---- */}
      {phase === "EXPLODING" && (
        <div style={{ position: "relative", zIndex: 10 }}>
          {/* White flash */}
          <div style={{
            position: "fixed", inset: 0,
            background: "#ffffff",
            animation: "flash 0.5s ease-out forwards",
            pointerEvents: "none", zIndex: 20,
          }} />
          {/* Particles */}
          <Particles color={rarityCol} />
          {rarity === "Legendary" && <GoldWaves />}
        </div>
      )}

      {/* ---- Phase: REVEAL ---- */}
      {phase === "REVEAL" && (
        <div style={{ textAlign: "center", position: "relative", zIndex: 10, width: "100%", maxWidth: isDesktop ? 480 : 400, padding: "0 24px", boxSizing: "border-box" }}>
          {/* Value display */}
          <div style={{ animation: "fadeIn 0.5s ease-out", marginBottom: 8 }}>
            {rarity === "Legendary" && (
              <p style={{
                color: C.gold, fontSize: 13, fontWeight: 800,
                letterSpacing: "0.22em", textTransform: "uppercase",
                marginBottom: 12,
                textShadow: `0 0 16px ${C.gold}`,
              }}>
                LEGENDARY FIND
              </p>
            )}
            <div style={{
              fontSize: 64, fontWeight: 900,
              background: `linear-gradient(90deg, ${rarityCol} 0%, #ffffff 40%, ${rarityCol} 100%)`,
              backgroundSize: "800px 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "goldShimmer 2.5s linear infinite",
              lineHeight: 1,
            }}>
              {(orb.amount ?? 0).toFixed(orb.amount < 1 ? 4 : 2)}
            </div>
            <div style={{ color: rarityCol, fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              {currency}
            </div>
            <div style={{ color: C.muted, fontSize: 15, marginTop: 6 }}>
              ${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
          </div>

          {/* Geo error */}
          {geoError && (
            <div style={{
              margin: "12px 0",
              padding: "10px 14px", borderRadius: 10,
              background: `${C.danger}22`, border: `1px solid ${C.danger}55`,
              color: C.danger, fontSize: 13,
            }}>
              {geoError}
            </div>
          )}

          {/* Collect error */}
          {collectError && (
            <div style={{
              margin: "12px 0",
              padding: "10px 14px", borderRadius: 10,
              background: `${C.danger}22`, border: `1px solid ${C.danger}55`,
              color: C.danger, fontSize: 13,
            }}>
              {collectError}
            </div>
          )}

          {/* Reward card */}
          <div style={{
            marginTop: 20,
            background: C.card,
            border: `1px solid #2a2a3a`,
            borderRadius: 20,
            padding: "20px 20px",
            animation: "slideUp 0.5s 0.2s ease-out both",
          }}>
            {/* Dropper info */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 700, color: "#fff",
                flexShrink: 0,
              }}>
                {(orb.dropper_handle ?? orb.dropper_username ?? "?")[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>
                  @{orb.dropper_handle ?? orb.dropper_username ?? "unknown"}
                </div>
                <div style={{ color: C.muted, fontSize: 12 }}>spawned this creature</div>
              </div>
            </div>

            {/* Message */}
            {orb.message && (
              <div style={{
                padding: "10px 14px",
                background: C.surface,
                borderRadius: 10,
                marginBottom: 14,
                border: `1px solid #2a2a3a`,
              }}>
                <p style={{ color: C.text, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  "{orb.message}"
                </p>
              </div>
            )}

            {/* Claim fee notice */}
            {(orb.claim_fee ?? (orb as any).claim_fee_usd ?? 0) > 0 && (
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0", borderTop: "1px solid #2a2a3a", marginBottom: 16,
              }}>
                <span style={{ color: C.muted, fontSize: 13 }}>Claim fee</span>
                <span style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>
                  ${(orb.claim_fee ?? (orb as any).claim_fee_usd ?? 0).toFixed(2)}
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleCollect}
                disabled={!!geoError}
                style={{
                  flex: 1, padding: "14px 0",
                  borderRadius: 14, border: "none",
                  background: geoError
                    ? "#2a2a3a"
                    : `linear-gradient(135deg, ${rarityCol}, ${rarityCol}aa)`,
                  color: geoError ? C.muted : "#fff",
                  fontSize: 16, fontWeight: 800,
                  cursor: geoError ? "not-allowed" : "pointer",
                  boxShadow: geoError ? "none" : `0 4px 20px ${rarityCol}66`,
                  letterSpacing: "0.04em",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { if (isDesktop && !geoError) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = `0 0 40px ${rarityCol}77, 0 6px 24px rgba(0,0,0,0.4)`; } }}
                onMouseLeave={(e) => { if (isDesktop && !geoError) { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 4px 20px ${rarityCol}66`; } }}
              >
                Collect
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: "I caught a BLINK creature!",
                      text: `I just caught a ${rarity} creature worth ${orb.amount} ${currency} ($${usd.toFixed(2)}) on BLINK!`,
                      url: window.location.origin,
                    }).catch(() => {});
                  } else {
                    const text = `I just caught a ${rarity} BLINK creature worth ${orb.amount} ${currency}!`;
                    navigator.clipboard.writeText(text).catch(() => {});
                  }
                }}
                style={{
                  padding: "14px 18px",
                  borderRadius: 14,
                  border: `1px solid #2a2a3a`,
                  background: C.surface,
                  color: C.muted,
                  fontSize: 14, fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { if (isDesktop) { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; } }}
                onMouseLeave={(e) => { if (isDesktop) { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = "#2a2a3a"; } }}
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Phase: COLLECTING ---- */}
      {phase === "COLLECTING" && (
        <div style={{ textAlign: "center", position: "relative", zIndex: 10, animation: "fadeIn 0.3s ease-out" }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.primary}44, ${C.accent}44)`,
            border: `2px solid ${C.primary}66`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
            animation: "orbPulse 1.4s ease-in-out infinite",
          }}>
            <div style={{ fontSize: 32 }}>&#9711;</div>
          </div>
          <p style={{
            fontSize: 18, fontWeight: 700, margin: 0,
            background: `linear-gradient(90deg, ${C.text} 0%, ${C.text} 40%, ${rarityCol} 50%, ${C.text} 60%, ${C.text} 100%)`,
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "textShimmer 2s linear infinite",
          }}>
            Sending to wallet...
          </p>
          <LoadingDots />
        </div>
      )}

      {/* ---- Phase: DONE (confirmed) ---- */}
      {phase === "DONE" && confirmed && (
        <div style={{ textAlign: "center", position: "relative", zIndex: 10, animation: "fadeIn 0.4s ease-out", padding: "0 24px" }}>
          {/* Green checkmark */}
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: `${C.accent}22`,
            border: `2px solid ${C.accent}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
            animation: "confirmCheck 0.5s ease-out",
          }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M8 18L15 25L28 11" stroke={C.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>
            Confirmed!
          </p>
          <p style={{ color: C.muted, fontSize: 14, margin: "0 0 20px" }}>
            {orb.amount} {currency} sent to your wallet
          </p>
          {txHash && (
            <div style={{
              display: "inline-block",
              padding: "6px 14px", borderRadius: 20,
              background: C.card,
              border: `1px solid #2a2a3a`,
              color: C.muted, fontSize: 12,
              fontFamily: "monospace",
            }}>
              tx: {truncateHash(txHash)}
            </div>
          )}
          <div style={{ marginTop: 32 }}>
            <button
              onClick={onClose}
              style={{
                padding: "14px 40px", borderRadius: 50,
                background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
                border: "none", color: C.text,
                fontSize: 16, fontWeight: 700,
                cursor: "pointer",
                boxShadow: `0 4px 24px ${C.primary}55`,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { if (isDesktop) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = `0 0 40px ${C.primary}77, 0 6px 28px rgba(0,0,0,0.4)`; } }}
              onMouseLeave={(e) => { if (isDesktop) { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 4px 24px ${C.primary}55`; } }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
