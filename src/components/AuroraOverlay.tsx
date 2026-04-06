"use client";

export default function AuroraOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      {/* Blob 1: indigo + purple */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-15%",
          width: "150%",
          height: "35%",
          borderRadius: "50%",
          background:
            "linear-gradient(to right, rgba(99,102,241,0.12), rgba(6,182,212,0.08), transparent)",
          filter: "blur(60px)",
          animation: "auroraBlob1 12s ease-in-out infinite alternate",
        }}
      />
      {/* Blob 2: cyan + blue */}
      <div
        style={{
          position: "absolute",
          top: "-15%",
          right: "0",
          width: "120%",
          height: "25%",
          borderRadius: "50%",
          background:
            "linear-gradient(to left, rgba(6,182,212,0.08), rgba(99,102,241,0.06), transparent)",
          filter: "blur(50px)",
          animation: "auroraBlob2 16s ease-in-out infinite alternate",
        }}
      />
    </div>
  );
}
