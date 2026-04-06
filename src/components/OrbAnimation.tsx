"use client";

import { useEffect, useRef } from "react";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

type OrbRarity = "Common" | "Rare" | "Legendary";

interface OrbViewProps {
  rarity: OrbRarity;
  isClaimable?: boolean;
  size: number;
}

/* ================================================================== */
/*  Keyframes (injected once)                                          */
/* ================================================================== */

const KEYFRAMES = `
@keyframes orbFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
@keyframes orbRingCommon {
  0% { transform: translate(-50%,-50%) rotate(0deg); }
  100% { transform: translate(-50%,-50%) rotate(360deg); }
}
@keyframes orbRingRare {
  0% { transform: translate(-50%,-50%) rotate(0deg); }
  100% { transform: translate(-50%,-50%) rotate(360deg); }
}
@keyframes orbRingLegendary {
  0% { transform: translate(-50%,-50%) rotate(0deg); }
  100% { transform: translate(-50%,-50%) rotate(360deg); }
}
@keyframes orbPulseCommon {
  0%, 100% { transform: scale(0.94); }
  50% { transform: scale(1.06); }
}
@keyframes orbPulseRare {
  0%, 100% { transform: scale(0.92); }
  50% { transform: scale(1.12); }
}
@keyframes orbPulseLegendary {
  0%, 100% { transform: scale(0.88); }
  50% { transform: scale(1.18); }
}
@keyframes orbSonar {
  0% { transform: translate(-50%,-50%) scale(0.5); opacity: 0.7; }
  100% { transform: translate(-50%,-50%) scale(2.5); opacity: 0; }
}
@keyframes orbBeam {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
@keyframes orbFireOrbit {
  0% { transform: rotate(0deg) translateX(var(--orbit-r)) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(var(--orbit-r)) rotate(-360deg); }
}
@keyframes orbClaimBadge {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.08); }
}
`;

/* ================================================================== */
/*  Gradient configs per rarity                                        */
/* ================================================================== */

const CORE_GRADIENT: Record<OrbRarity, string> = {
  Common: "radial-gradient(circle at 35% 35%, #ffffff, #888888 50%, #ffffff88)",
  Rare: "radial-gradient(circle at 35% 35%, #3B82F6, #9945FF 50%, #ffffff88)",
  Legendary: "radial-gradient(circle at 35% 35%, #F59E0B, #9945FF 50%, #14F195)",
};

const RING_SPEED: Record<OrbRarity, number> = { Common: 8, Rare: 5, Legendary: 3 };
const PULSE_ANIM: Record<OrbRarity, string> = {
  Common: "orbPulseCommon 3s ease-in-out infinite",
  Rare: "orbPulseRare 2.5s ease-in-out infinite",
  Legendary: "orbPulseLegendary 2s ease-in-out infinite",
};
const RING_ANIM_NAME: Record<OrbRarity, string> = {
  Common: "orbRingCommon",
  Rare: "orbRingRare",
  Legendary: "orbRingLegendary",
};

/* ================================================================== */
/*  OrbView Component                                                  */
/* ================================================================== */

export function OrbView({ rarity, isClaimable = false, size }: OrbViewProps) {
  const arcRef = useRef<HTMLDivElement>(null);

  // Rare electric arc flicker
  useEffect(() => {
    if (rarity !== "Rare" || !arcRef.current) return;
    let timeout: ReturnType<typeof setTimeout>;
    const flicker = () => {
      const el = arcRef.current;
      if (!el) return;
      el.style.opacity = "0.8";
      setTimeout(() => { if (el) el.style.opacity = "0"; }, 200);
      timeout = setTimeout(flicker, 3000 + Math.random() * 4000);
    };
    timeout = setTimeout(flicker, 1000 + Math.random() * 3000);
    return () => clearTimeout(timeout);
  }, [rarity]);

  const coreSize = isClaimable ? size * 1.3 : size;
  const ringSize = coreSize * 1.25;
  const ringBorderColor = rarity === "Legendary" ? "#F59E0B" : rarity === "Rare" ? "#3B82F6" : "#ffffff44";

  return (
    <div style={{
      position: "relative",
      width: coreSize,
      height: coreSize,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "orbFloat 3s ease-in-out infinite",
    }}>
      <style>{KEYFRAMES}</style>

      {/* Legendary aura circles */}
      {rarity === "Legendary" && (
        <>
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: coreSize * 1.8,
            height: coreSize * 1.8,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(249,158,11,0.15), transparent 70%)",
            filter: "blur(12px)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: coreSize * 2.2,
            height: coreSize * 2.2,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(153,69,255,0.1), transparent 70%)",
            filter: "blur(18px)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: coreSize * 2.6,
            height: coreSize * 2.6,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(20,241,149,0.08), transparent 70%)",
            filter: "blur(24px)",
            pointerEvents: "none",
          }} />
        </>
      )}

      {/* Claimable sonar rings */}
      {isClaimable && (
        <>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              position: "absolute",
              top: "50%", left: "50%",
              width: coreSize,
              height: coreSize,
              borderRadius: "50%",
              border: "2px solid #F59E0B",
              animation: `orbSonar 2.4s ease-out ${i * 0.8}s infinite`,
              pointerEvents: "none",
            }} />
          ))}
        </>
      )}

      {/* Claimable light beam */}
      {isClaimable && (
        <div style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 4,
          height: coreSize * 2,
          background: "linear-gradient(to top, #F59E0B88, #F59E0B00)",
          borderRadius: 2,
          animation: "orbBeam 2s ease-in-out infinite",
          pointerEvents: "none",
          marginTop: -(coreSize * 1.5),
        }} />
      )}

      {/* Rotating outer ring */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        width: ringSize,
        height: ringSize,
        borderRadius: "50%",
        border: `1.5px dashed ${ringBorderColor}`,
        animation: `${RING_ANIM_NAME[rarity]} ${RING_SPEED[rarity]}s linear infinite`,
        pointerEvents: "none",
      }} />

      {/* Pulse wrapper */}
      <div style={{
        animation: PULSE_ANIM[rarity],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {/* Core orb sphere */}
        <div style={{
          width: coreSize * 0.7,
          height: coreSize * 0.7,
          borderRadius: "50%",
          background: CORE_GRADIENT[rarity],
          boxShadow: isClaimable
            ? `0 0 ${coreSize * 0.4}px #F59E0B88, 0 0 ${coreSize * 0.7}px #F59E0B44`
            : `0 0 ${coreSize * 0.25}px ${rarity === "Legendary" ? "#F59E0B" : rarity === "Rare" ? "#3B82F6" : "#ffffff"}44`,
          position: "relative",
        }}>
          {/* Inner highlight */}
          <div style={{
            position: "absolute",
            top: "12%",
            left: "12%",
            width: "35%",
            height: "35%",
            borderRadius: "50%",
            background: "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.6), transparent)",
            filter: "blur(3px)",
            pointerEvents: "none",
          }} />
        </div>
      </div>

      {/* Rare electric arc */}
      {rarity === "Rare" && (
        <div
          ref={arcRef}
          style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: coreSize * 0.9,
            height: coreSize * 0.9,
            borderRadius: "50%",
            border: "1px solid #3B82F6",
            boxShadow: "0 0 12px #3B82F6, inset 0 0 8px #3B82F666",
            opacity: 0,
            transition: "opacity 0.15s ease-in-out",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Legendary fire crown particles */}
      {rarity === "Legendary" && (
        <>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{
              position: "absolute",
              top: "50%", left: "50%",
              width: 0, height: 0,
              // @ts-expect-error CSS custom property
              "--orbit-r": `${coreSize * 0.65 * 0.5}px`,
              animation: `orbFireOrbit ${3 + i * 0.3}s linear ${i * -0.5}s infinite`,
              pointerEvents: "none",
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: i % 2 === 0 ? "#F59E0B" : "#14F195",
                boxShadow: `0 0 6px ${i % 2 === 0 ? "#F59E0B" : "#14F195"}`,
                marginTop: -3,
                marginLeft: -3,
              }} />
            </div>
          ))}
        </>
      )}

      {/* Claimable badge */}
      {isClaimable && (
        <div style={{
          position: "absolute",
          top: -24,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "3px 10px",
          borderRadius: 8,
          background: "#F59E0B",
          color: "#000",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.1em",
          whiteSpace: "nowrap",
          animation: "orbClaimBadge 2s ease-in-out infinite",
        }}>
          CLAIMABLE
        </div>
      )}
    </div>
  );
}

export default OrbView;
