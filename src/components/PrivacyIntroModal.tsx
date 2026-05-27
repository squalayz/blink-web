"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const C = {
  bg: "#0a0a0f",
  surface: "#0d0d14",
  card: "#1a1a24",
  primary: "#00FF88",
  text: "#FFFFFF",
  muted: "#8a8a99",
  border: "rgba(0,255,136,0.2)",
};

interface Props {
  // Force-show even if already seen (e.g. from "Privacy info" banner re-open).
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function PrivacyIntroModal({ forceOpen, onClose }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (forceOpen) {
      setOpen(true);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch("/api/me/privacy", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        if (!json.privacy_intro_seen) setOpen(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [forceOpen]);

  const close = async (markSeen = true) => {
    setOpen(false);
    onClose?.();
    if (!markSeen) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      await fetch("/api/me/privacy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ intro_seen: true }),
      });
    } catch {
      /* ignore */
    }
  };

  const goGhost = async () => {
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      await fetch("/api/me/privacy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ mode: "ghost", intro_seen: true }),
      });
    } finally {
      setBusy(false);
      close(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="blink-privacy-intro-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.78)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 18,
          padding: "24px 22px 20px",
          color: C.text,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(0,255,136,0.08)",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            margin: "0 auto 12px",
            background: "rgba(0,255,136,0.08)",
            border: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s-8-4.5-8-11.5V5l8-3 8 3v5.5C20 17.5 12 22 12 22z" />
          </svg>
        </div>
        <h2
          id="blink-privacy-intro-title"
          style={{
            margin: "0 0 8px",
            fontSize: 19,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            textAlign: "center",
          }}
        >
          A note before you hunt
        </h2>
        <p style={{ margin: "0 0 14px", color: C.muted, fontSize: 13, lineHeight: 1.55, textAlign: "center" }}>
          BLINK shows other hunters on the map so the world feels alive. Your
          location is <strong style={{ color: C.text }}>blurred</strong> by 100–300m
          and drifts every few minutes. We never share your exact GPS.
        </p>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0 0 18px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {[
            "Strangers see a fuzzy 300m zone, not a point.",
            "Friends get a tighter ~100m zone.",
            "Go invisible anytime with Ghost Mode.",
          ].map((line) => (
            <li
              key={line}
              style={{
                background: C.card,
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
                color: C.text,
                border: `1px solid rgba(255,255,255,0.04)`,
              }}
            >
              {line}
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={goGhost}
            disabled={busy}
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.text,
              fontSize: 13,
              fontWeight: 700,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            Go Ghost
          </button>
          <button
            onClick={() => close(true)}
            disabled={busy}
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 12,
              border: "none",
              background: C.primary,
              color: "#0a0a0f",
              fontSize: 13,
              fontWeight: 800,
              cursor: busy ? "default" : "pointer",
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
