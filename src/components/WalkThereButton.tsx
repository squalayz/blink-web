"use client";

// BLINK — the "Virtually Walk There" button.
// Glossy glass pill with a green glow ring + diagonal shimmer sweep. Used on
// the gift landing and hunt-error screens to telegraph the magical/dreamy
// path next to the chunky real-walk primary button.

import { useState } from "react";

const WALK_THERE_CSS = `
@keyframes walkThereGlow {
  0%, 100% { box-shadow: 0 0 0 1px rgba(0,255,136,0.55), 0 0 14px 2px rgba(0,255,136,0.32), inset 0 0 16px rgba(0,255,136,0.18); }
  50%      { box-shadow: 0 0 0 1px rgba(0,255,136,0.85), 0 0 26px 6px rgba(0,255,136,0.55), inset 0 0 22px rgba(0,255,136,0.28); }
}
@keyframes walkThereShimmer {
  0%   { transform: translateX(-160%) skewX(-18deg); opacity: 0; }
  8%   { opacity: 1; }
  18%  { transform: translateX(160%) skewX(-18deg); opacity: 0; }
  100% { transform: translateX(160%) skewX(-18deg); opacity: 0; }
}
@keyframes walkThereOrbFloat {
  0%, 100% { transform: translateY(0); filter: drop-shadow(0 0 6px rgba(0,255,136,0.7)); }
  50%      { transform: translateY(-1.5px); filter: drop-shadow(0 0 10px rgba(0,255,136,0.95)); }
}
.walk-there-btn { animation: walkThereGlow 3.4s ease-in-out infinite; }
.walk-there-btn:hover { transform: scale(1.02); }
.walk-there-btn:active { transform: scale(0.985); }
.walk-there-btn:hover .walk-there-shimmer { animation-duration: 2.6s; }
.walk-there-btn:hover .walk-there-orb { animation-duration: 1.4s; }
.walk-there-shimmer { animation: walkThereShimmer 5s ease-in-out infinite; }
.walk-there-orb { animation: walkThereOrbFloat 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .walk-there-btn { animation: none; box-shadow: 0 0 0 1px rgba(0,255,136,0.7), 0 0 16px 2px rgba(0,255,136,0.35), inset 0 0 14px rgba(0,255,136,0.18); }
  .walk-there-shimmer { animation: none; opacity: 0; }
  .walk-there-orb { animation: none; }
  .walk-there-btn:hover { transform: none; }
}
`;

export default function WalkThereButton({
  onClick,
  label = "Virtually Walk There",
  fullWidth = true,
}: {
  onClick: () => void;
  label?: string;
  fullWidth?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <>
      <style>{WALK_THERE_CSS}</style>
      <button
        type="button"
        onClick={onClick}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        className="walk-there-btn"
        style={{
          position: "relative",
          width: fullWidth ? "100%" : undefined,
          height: 56,
          padding: "0 22px 0 18px",
          borderRadius: 28,
          border: "1px solid rgba(0,255,136,0.55)",
          background:
            "linear-gradient(135deg, rgba(8,18,14,0.92) 0%, rgba(4,10,8,0.96) 50%, rgba(0,30,18,0.92) 100%)",
          color: "#FFFFFF",
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          cursor: "pointer",
          fontFamily: "inherit",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          overflow: "hidden",
          isolation: "isolate",
          transition: "transform 140ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          WebkitTapHighlightColor: "transparent",
          textShadow: "0 0 8px rgba(0,255,136,0.45)",
        }}
      >
        {/* Inner top-edge gloss — gives the "glass" reflection. */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: "1px 1px auto 1px",
            height: "45%",
            borderRadius: "28px 28px 40% 40% / 28px 28px 100% 100%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 70%, rgba(255,255,255,0) 100%)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
        {/* Diagonal shimmer sweep — repeats every 5s. */}
        <span
          aria-hidden
          className="walk-there-shimmer"
          style={{
            position: "absolute",
            top: "-40%",
            left: 0,
            width: "55%",
            height: "180%",
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(0,255,136,0.18) 30%, rgba(255,255,255,0.55) 50%, rgba(0,255,136,0.18) 70%, rgba(255,255,255,0) 100%)",
            filter: "blur(2px)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
        {/* Orb icon — small floating sphere on the left. */}
        <span
          aria-hidden
          className="walk-there-orb"
          style={{
            position: "relative",
            width: 18,
            height: 18,
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-orb-transparent.png"
            alt=""
            width={18}
            height={18}
            style={{
              width: 18,
              height: 18,
              display: "block",
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        </span>
        <span
          style={{
            position: "relative",
            zIndex: 3,
            opacity: pressed ? 0.9 : 1,
          }}
        >
          {label}
        </span>
      </button>
    </>
  );
}
