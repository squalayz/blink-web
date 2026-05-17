"use client";

// Next.js route segment error boundary — catches unhandled render errors
// anywhere under /gift/* (landing, walk, hunt, gift/new) and shows a brief
// recovery card. Falls back to / when we can't extract a short_code from
// the current URL.

import { useEffect } from "react";
import Link from "next/link";

const C = {
  bg: "#0a0a0f",
  card: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  text: "#ffffff",
  muted: "#8a8a99",
  primary: "#00FF88",
};

export default function GiftError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[gift/error]", error);
  }, [error]);

  let backHref = "/";
  if (typeof window !== "undefined") {
    const m = window.location.pathname.match(/^\/gift\/([a-z0-9]{6,12})/i);
    if (m) backHref = `/gift/${m[1]}`;
  }

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Something went wrong with this gift</h1>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, marginBottom: 22 }}>
          The page hit an unexpected snag. Your wallet and gift are safe — try again, or head back to the landing page.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: C.primary, color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
          >
            Try again
          </button>
          <Link
            href={backHref}
            style={{ padding: "10px 22px", borderRadius: 10, border: `1px solid ${C.primary}55`, background: "transparent", color: C.primary, fontWeight: 700, fontSize: 14, textDecoration: "none" }}
          >
            Back to gift
          </Link>
        </div>
      </div>
    </div>
  );
}
