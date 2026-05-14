"use client";

import { C } from "@/lib/theme";

export default function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
}: {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}) {
  return (
    <>
      <div
        style={{
          width,
          height,
          borderRadius,
          background: C.card,
          animation: "skeletonPulse 1.4s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </>
  );
}
