"use client";

import { useEffect, useState } from "react";

const BG = "#0a0a0f";
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

    const fadeAt = window.setTimeout(() => setFadingOut(true), 720);
    const removeAt = window.setTimeout(() => setVisible(false), 1180);
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
        background: BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadingOut ? 0 : 1,
        transition: "opacity 0.42s ease",
        pointerEvents: fadingOut ? "none" : "auto",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 84,
          height: 84,
          animation: "blinkCinematicEye 0.9s ease-in-out 1 both",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `2px solid ${GREEN}`,
            boxShadow: `0 0 36px ${GREEN}aa, 0 0 80px ${GREEN}55`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "30%",
            borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, #fff 0%, ${GREEN} 60%, ${BG} 100%)`,
          }}
        />
      </div>
      <style>{`
        @keyframes blinkCinematicEye {
          0% { transform: scale(0.85); opacity: 0; }
          40% { transform: scale(1.05); opacity: 1; }
          75% { transform: scale(0.9); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
