"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Mode = "public" | "friends" | "ghost";

const C = {
  surface: "#0d0d14",
  card: "#1a1a24",
  primary: "#00FF88",
  gold: "#88FF00",
  text: "#FFFFFF",
  muted: "#8a8a99",
  border: "rgba(255,255,255,0.06)",
};

const OPTIONS: { mode: Mode; title: string; subtitle: string }[] = [
  {
    mode: "public",
    title: "Public",
    subtitle: "Other hunters see your blurred 300m zone. Default.",
  },
  {
    mode: "friends",
    title: "Friends only",
    subtitle: "Only friends see your ~100m zone. Strangers won't see you.",
  },
  {
    mode: "ghost",
    title: "Ghost mode",
    subtitle: "Fully invisible. You can still see others.",
  },
];

export default function PrivacyToggle() {
  const [mode, setMode] = useState<Mode>("public");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Mode | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const auth = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await auth();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/me/privacy", { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (!cancelled && res.ok) {
          if (json.presence_mode === "ghost" || json.presence_mode === "friends" || json.presence_mode === "public") {
            setMode(json.presence_mode);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  const apply = async (next: Mode) => {
    setSaving(next);
    setStatus(null);
    try {
      const token = await auth();
      if (!token) {
        setStatus("Not signed in");
        return;
      }
      const res = await fetch("/api/me/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mode: next }),
      });
      if (res.ok) {
        setMode(next);
        setStatus("Saved");
        setTimeout(() => setStatus(null), 1500);
      } else {
        const json = await res.json().catch(() => ({}));
        setStatus(json.error ?? "Failed to save");
      }
    } finally {
      setSaving(null);
    }
  };

  return (
    <section
      id="privacy"
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 16,
        color: C.text,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em", margin: 0 }}>
          Map presence
        </h2>
        {status && (
          <span style={{ fontSize: 11, color: status === "Saved" ? C.primary : "#fca5a5", marginLeft: 6 }}>
            {status}
          </span>
        )}
      </div>
      <p style={{ color: C.muted, fontSize: 12, margin: "0 0 12px", lineHeight: 1.5 }}>
        Your real GPS never leaves the server — we always blur. Pick how visible
        you are to other hunters.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {OPTIONS.map((opt) => {
          const active = mode === opt.mode;
          const busy = saving === opt.mode;
          return (
            <button
              key={opt.mode}
              onClick={() => apply(opt.mode)}
              disabled={loading || busy || active}
              style={{
                textAlign: "left",
                padding: "12px 14px",
                borderRadius: 12,
                border: `1px solid ${active ? C.primary : C.border}`,
                background: active ? "rgba(0,255,136,0.07)" : C.card,
                color: C.text,
                cursor: active ? "default" : busy ? "default" : "pointer",
                opacity: loading ? 0.6 : 1,
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: `2px solid ${active ? C.primary : C.muted}`,
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                {active && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 2,
                      borderRadius: "50%",
                      background: C.primary,
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {opt.title}
                  {busy ? " · saving…" : ""}
                </div>
                <div style={{ color: C.muted, fontSize: 11.5, marginTop: 2 }}>{opt.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
