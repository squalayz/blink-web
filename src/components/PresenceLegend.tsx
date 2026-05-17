"use client";

import { useState, useEffect, useRef } from "react";

const C = {
  panel: "rgba(10,10,15,0.85)",
  border: "rgba(0,255,136,0.22)",
  chipBorder: "rgba(255,255,255,0.12)",
  text: "#FFFFFF",
  muted: "#cfd3dd",
  primary: "#00FF88",
  gold: "#88FF00",
};

interface Props {
  onOpenPrivacy?: () => void;
}

export default function PresenceLegend({ onOpenPrivacy }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside tap / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        left: 14,
        bottom: 168,
        zIndex: 16,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Hide map legend" : "Show map legend"}
        aria-expanded={open}
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: C.panel,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: `1px solid ${open ? C.border : C.chipBorder}`,
          color: open ? C.primary : C.muted,
          fontSize: 13,
          fontWeight: 800,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          fontFamily: "inherit",
          letterSpacing: 0,
          lineHeight: 1,
          boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
          transition: "border-color 0.15s ease, color 0.15s ease",
        }}
      >
        ?
      </button>

      {open && (
        <div
          role="region"
          aria-label="Map legend"
          style={{
            position: "absolute",
            left: 0,
            bottom: 38,
            background: C.panel,
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "10px 12px",
            color: C.text,
            fontSize: 11,
            boxShadow: "0 8px 22px rgba(0,0,0,0.45)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            minWidth: 152,
          }}
        >
          <Row dotColor={C.primary} ring label="Hunter (300m blur)" />
          <Row dotColor={C.gold} ring label="Friend (~100m blur)" />
          <Row dotColor="#ffffff" ring={false} dashed label="Wild creature zone" />
          <button
            onClick={() => {
              setOpen(false);
              onOpenPrivacy?.();
            }}
            style={{
              marginTop: 4,
              background: "transparent",
              border: "none",
              color: C.primary,
              fontSize: 11,
              fontWeight: 700,
              padding: 0,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            Privacy info
          </button>
        </div>
      )}
    </div>
  );
}

function Row({
  dotColor,
  label,
  ring,
  dashed,
}: {
  dotColor: string;
  label: string;
  ring: boolean;
  dashed?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: 18, height: 18 }}>
        {ring && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: dashed ? `1px dashed ${dotColor}aa` : `1px solid ${dotColor}55`,
              background: `${dotColor}18`,
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: dotColor,
            transform: "translate(-50%,-50%)",
            boxShadow: `0 0 6px ${dotColor}aa`,
          }}
        />
      </div>
      <span style={{ color: "#cfd3dd" }}>{label}</span>
    </div>
  );
}
