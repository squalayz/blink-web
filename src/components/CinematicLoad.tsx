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

      {/* The app SplashView's readability veil — heavier top/bottom so the
          wordmark pops over the busy art. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.25) 33%, rgba(0,0,0,0.55) 66%, rgba(0,0,0,0.85))",
          pointerEvents: "none",
        }}
      />
      {/* BLINK-green color wash ties the art to the brand palette. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,255,136,0.06)",
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />

      {/* Brand mark + wordmark + tagline — the app's staged splash reveal. */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-orb-glow.png"
          alt=""
          style={{
            width: 130,
            height: 130,
            objectFit: "contain",
            animation: "clMarkIn 0.9s ease-out both, clBreathe 2.6s ease-in-out 0.9s infinite",
          }}
        />
        <div
          style={{
            fontFamily: "ui-rounded, 'SF Pro Rounded', 'Space Grotesk', Inter, sans-serif",
            fontWeight: 900,
            fontSize: 58,
            letterSpacing: "0.18em",
            marginRight: "-0.18em",
            color: "#fff",
            lineHeight: 1,
            textShadow: `0 0 18px ${GREEN}d9, 0 2px 8px rgba(0,0,0,0.6)`,
            animation: "clTitleIn 0.95s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both",
          }}
        >
          BLINK
        </div>
        <div
          style={{
            fontFamily: "ui-rounded, 'SF Pro Rounded', 'Space Grotesk', Inter, sans-serif",
            fontSize: 12,
            letterSpacing: "0.5em",
            marginRight: "-0.5em",
            textTransform: "uppercase",
            color: GREEN,
            fontWeight: 800,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
            animation: "clTagIn 0.9s ease-out 0.6s both",
          }}
        >
          The World Is Alive
        </div>
      </div>

      <style>{`
        @keyframes clMarkIn {
          from { opacity: 0; transform: scale(0.82); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes clBreathe {
          0%, 100% { transform: scale(0.99); }
          50%      { transform: scale(1.02); }
        }
        @keyframes clTitleIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes clTagIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
