"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// This page checks auth state:
// - Logged in → redirect to /dashboard
// - Not logged in → show landing page
//
// The full landing page HTML (mishmesh-landing.html) should be placed 
// at public/landing.html for the iframe fallback, OR converted to 
// React components in src/components/Landing.tsx

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if user has a session
    fetch("/api/auth/siwe/session")
      .then((r) => r.json())
      .then((session) => {
        if (session?.user) {
          router.push("/dashboard");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "#050508",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999,
      }}>
        <div style={{ textAlign: "center" }}>
          <MMLogo size={80} />
          <div style={{
            fontWeight: 800, fontSize: 28, marginTop: 16,
            background: "linear-gradient(135deg, #6366f1, #06b6d4)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>MishMesh</div>
        </div>
      </div>
    );
  }

  // Render landing page inline via iframe — full screen takeover
  return (
    <iframe
      src="/landing.html"
      title="MishMesh"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        border: "none",
        zIndex: 9999,
      }}
    />
  );
}

function MMLogo({ size = 44 }: { size?: number }) {
  const h = Math.round(size * (70 / 120));
  return (
    <svg width={size} height={h} viewBox="0 0 120 70">
      <defs>
        <linearGradient id="lgL" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="lgR" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id="lgM" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <circle cx="35" cy="35" r="24" fill="none" stroke="url(#lgL)" strokeWidth="5" />
      <circle cx="65" cy="35" r="24" fill="none" stroke="url(#lgR)" strokeWidth="5" />
      <path d="M50 15.4 A24 24 0 0 1 50 54.6 A24 24 0 0 1 50 15.4" fill="url(#lgM)" opacity="0.3" />
      <circle cx="28" cy="35" r="5" fill="url(#lgL)" />
      <circle cx="72" cy="35" r="5" fill="url(#lgR)" />
    </svg>
  );
}
