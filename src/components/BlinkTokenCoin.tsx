"use client";

// The $BLINK coin — the app's blink_token artwork (TreasureCaptureView)
// rendered the way the app renders orb art in circles (MiniOrbToken):
// the source is a glassy sphere on a solid-black square, so it is ALWAYS
// circle-clipped with the sphere overscanned to fill the clip edge-to-edge —
// never placed raw on a non-black surface.

const TOKEN_ART_OVERSCAN = 1.28; // canvas width / sphere diameter in blink_token

export default function BlinkTokenCoin({
  size = 22,
  glow = true,
  style,
}: {
  size?: number;
  glow?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        display: "inline-block",
        flexShrink: 0,
        background: "#0a0a0f",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: glow ? "0 0 12px rgba(0,255,136,0.35)" : "none",
        verticalAlign: "middle",
        ...style,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/app/blink-token.webp"
        alt=""
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: size * TOKEN_ART_OVERSCAN,
          height: size * TOKEN_ART_OVERSCAN,
          transform: "translate(-50%, -50%)",
          display: "block",
        }}
      />
    </span>
  );
}
