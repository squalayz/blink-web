"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { sounds } from "@/lib/sounds";

const GREEN = "#00FF88";
const GRAY = "#5a5a6a";

// Routes where the sound toggle would collide with existing controls.
// On these routes the toggle is suppressed entirely — the map page exposes its
// own controls and the auth/onboarding screens are intentionally minimal.
const HIDDEN_ON_ROUTES = [
  "/map",
  "/auth/signin",
  "/auth/signup",
];

export default function SoundToggle() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    setEnabled(sounds.enabled);
  }, []);

  if (!mounted) return null;
  if (pathname && HIDDEN_ON_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  const toggle = () => {
    const next = !enabled;
    sounds.setEnabled(next);
    setEnabled(next);
    if (next) sounds.play("tick");
  };

  const color = enabled ? GREEN : GRAY;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={enabled ? "Mute sounds" : "Unmute sounds"}
      title={enabled ? "Sounds on" : "Sounds off"}
      style={{
        position: "fixed",
        bottom: 18,
        right: 18,
        zIndex: 1500,
        width: 38,
        height: 38,
        borderRadius: 999,
        background: "rgba(13,13,20,0.78)",
        border: `1px solid ${enabled ? "rgba(0,255,136,0.35)" : "rgba(255,255,255,0.10)"}`,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        color,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        boxShadow: enabled ? "0 0 14px rgba(0,255,136,0.25)" : "none",
        transition: "color 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {enabled ? (
          <>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </>
        ) : (
          <>
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </>
        )}
      </svg>
    </button>
  );
}
