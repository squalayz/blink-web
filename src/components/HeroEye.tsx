"use client";

/*
 * HeroEye — central pulsing BLINK eye with creatures orbiting around it.
 * Replaces the old MishMesh 3D earth globe.
 *
 * Inline styles only (no Tailwind) per project rules.
 */

const CREATURES = [
  { name: "Sprite", img: "/creatures/sprite.jpg", angle: 0 },
  { name: "Cyclops", img: "/creatures/cyclops.jpg", angle: 90 },
  { name: "Cat", img: "/creatures/cat.jpg", angle: 180 },
  { name: "Serpent", img: "/creatures/serpent.jpg", angle: 270 },
];

const KEYFRAMES = `
@keyframes heroEyePulse {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 24px rgba(0,255,136,0.55)) drop-shadow(0 0 56px rgba(0,255,136,0.25));
  }
  50% {
    transform: scale(1.05);
    filter: drop-shadow(0 0 48px rgba(0,255,136,0.95)) drop-shadow(0 0 120px rgba(0,255,136,0.45));
  }
}
@keyframes heroEyeRing {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}
@keyframes heroEyeRingRev {
  from { transform: translate(-50%, -50%) rotate(360deg); }
  to { transform: translate(-50%, -50%) rotate(0deg); }
}
@keyframes heroEyeOrbit {
  from { transform: translate(-50%, -50%) rotate(0deg) translateX(var(--orbit-r)) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg) translateX(var(--orbit-r)) rotate(-360deg); }
}
@keyframes heroCreatureFloat {
  0%, 100% { transform: translate(-50%, -50%) translateY(0); }
  50% { transform: translate(-50%, -50%) translateY(-6px); }
}
@keyframes heroCreatureGlow {
  0%, 100% { box-shadow: 0 0 18px rgba(0,255,136,0.55), 0 0 36px rgba(0,255,136,0.25); }
  50% { box-shadow: 0 0 28px rgba(0,255,136,0.85), 0 0 64px rgba(0,255,136,0.4); }
}
@keyframes heroParticle {
  0% { transform: translateY(0) scale(0); opacity: 0; }
  20% { opacity: 1; transform: translateY(-10px) scale(1); }
  100% { transform: translateY(-80px) scale(0.3); opacity: 0; }
}
`;

interface HeroEyeProps {
  size?: number;
  orbitRadius?: number;
  creatureSize?: number;
  showCreatures?: boolean;
}

export default function HeroEye({
  size = 220,
  orbitRadius = 150,
  creatureSize = 64,
  showCreatures = true,
}: HeroEyeProps) {
  const containerSize = orbitRadius * 2 + creatureSize + 40;

  return (
    <div
      style={{
        position: "relative",
        width: containerSize,
        height: containerSize,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Outer rotating ring */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: size * 1.6,
          height: size * 1.6,
          borderRadius: "50%",
          border: "1px dashed rgba(0,255,136,0.25)",
          animation: "heroEyeRing 20s linear infinite",
          pointerEvents: "none",
        }}
      />

      {/* Middle rotating ring (counter) */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: size * 1.3,
          height: size * 1.3,
          borderRadius: "50%",
          border: "1px solid rgba(0,255,136,0.18)",
          animation: "heroEyeRingRev 30s linear infinite",
          pointerEvents: "none",
        }}
      />

      {/* Inner pulsing glow halo */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: size * 1.8,
          height: size * 1.8,
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(0,255,136,0.25), rgba(0,255,136,0.08) 40%, transparent 70%)",
          filter: "blur(8px)",
          pointerEvents: "none",
        }}
      />

      {/* Central eye logo */}
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "heroEyePulse 3s ease-in-out infinite",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/blink-logo.webp"
          alt="BLINK"
          fetchPriority="high"
          decoding="async"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Orbiting creatures */}
      {showCreatures &&
        CREATURES.map((c, i) => (
          <div
            key={c.name}
            style={
              {
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 0,
                height: 0,
                ["--orbit-r" as string]: `${orbitRadius}px`,
                animation: `heroEyeOrbit ${28 + i * 2}s linear ${i * -7}s infinite`,
                pointerEvents: "none",
              } as React.CSSProperties
            }
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: creatureSize,
                height: creatureSize,
                borderRadius: "50%",
                overflow: "hidden",
                border: "2px solid rgba(0,255,136,0.6)",
                animation: `heroCreatureFloat ${3 + i * 0.4}s ease-in-out ${i * 0.3}s infinite, heroCreatureGlow ${2.5 + i * 0.2}s ease-in-out infinite`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.img}
                alt={c.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>
          </div>
        ))}
    </div>
  );
}
