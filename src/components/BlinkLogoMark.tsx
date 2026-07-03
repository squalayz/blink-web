"use client";

import { C } from "@/lib/theme";

// Web port of the iOS app's BlinkLogoMark (Views/BlinkLogoMark.swift):
// the official orb artwork over a breathing radial halo. The web build uses
// /brand/logo-orb-glow.png — a true-alpha cut of the same blink_logo art whose
// glow already fades smoothly to transparent, so it sits flush on ANY surface
// with zero square edge (the app achieves the same with a radial mask).
//
// The source PNG is 784x800 (glow slightly taller than wide), so it is always
// rendered with objectFit:"contain" inside a square frame — never "cover",
// never borderRadius-cropped.

export const LOGO_ORB_SRC = "/brand/logo-orb-glow.png";

const KEYFRAMES = `
@keyframes blinkMarkHalo {
  0%, 100% { transform: scale(0.9); opacity: 0.55; }
  50%      { transform: scale(1.08); opacity: 0.95; }
}
@keyframes blinkMarkBreathe {
  0%, 100% { transform: scale(0.99); }
  50%      { transform: scale(1.015); }
}
@media (prefers-reduced-motion: reduce) {
  .blink-mark-halo, .blink-mark-orb { animation: none !important; }
}
`;

export default function BlinkLogoMark({
  size = 160,
  animate = true,
  halo = true,
  style,
}: {
  size?: number;
  /** Breathing halo + orb scale loop (the app's 2.6s ease-in-out). */
  animate?: boolean;
  /** Render the radial halo behind the orb (off for tiny nav sizes). */
  halo?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...style,
      }}
    >
      <style>{KEYFRAMES}</style>
      {halo && (
        <span
          className="blink-mark-halo"
          style={{
            position: "absolute",
            inset: "-12%",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${C.primary}80 5%, ${C.primary}1f 55%, transparent 75%)`,
            filter: `blur(${Math.max(2, size * 0.04)}px)`,
            animation: animate ? "blinkMarkHalo 2.6s ease-in-out infinite" : "none",
            pointerEvents: "none",
          }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_ORB_SRC}
        alt=""
        className="blink-mark-orb"
        width={size}
        height={size}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          animation: animate ? "blinkMarkBreathe 2.6s ease-in-out infinite" : "none",
        }}
      />
    </span>
  );
}
