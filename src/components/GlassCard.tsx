"use client";
import { C } from "@/lib/theme";

export default function GlassCard({
  children,
  style,
  onClick,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 16,
        background: C.glass,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: 20,
        border: `1px solid ${C.glassBorder}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
