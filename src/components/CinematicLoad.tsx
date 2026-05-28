"use client";

import { useEffect, useState } from "react";

const GREEN = "#00FF88";

const STORAGE_KEY = "blink:landing-cinematic:v1";

export function CinematicLoad() {
  const [visible, setVisible] = useState<boolean>(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let already = false;
    try {
      already = window.sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      /* ignore */
    }

    if (reduced || already) return;

    setVisible(true);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }

    const fadeAt = window.setTimeout(() => setFadingOut(true), 1200);
    const removeAt = window.setTimeout(() => setVisible(false), 1800);
    return () => {
      window.clearTimeout(fadeAt);
      window.clearTimeout(removeAt);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        opacity: fadingOut ? 0 : 1,
        transition: "opacity 0.6s ease",
        pointerEvents: fadingOut ? "none" : "auto",
      }}
    >
      {/* Full-screen battle poster */}
      <img
        src="/splash_battle.jpg"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Dark cinematic overlay */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          pointerEvents: "none",
        }}
      />

      {/* BLINK wordmark + tagline */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontWeight: 900,
            fontSize: 80,
            letterSpacing: "0.04em",
            color: "#fff",
            lineHeight: 1,
            margin: 0,
            textShadow: `0 0 24px ${GREEN}cc, 0 0 56px ${GREEN}88, 0 0 112px ${GREEN}55`,
          }}
        >
          BLINK
        </div>
        <div
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontSize: 12,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            color: GREEN,
            fontWeight: 700,
            textShadow: `0 0 14px ${GREEN}aa`,
          }}
        >
          Every Blink, a Legend
        </div>
      </div>
    </div>
  );
}
