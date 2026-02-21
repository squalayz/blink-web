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
    fetch("/api/auth/session")
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
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0a0a0f", color: "#f0f0f5"
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

  // Render landing page inline
  // In production, replace this with your full landing page component
  // or serve the static HTML from public/landing.html
  return <iframe src="/landing.html" style={{ width: "100%", height: "100vh", border: "none" }} />;
}

function MMLogo({ size = 44 }: { size?: number }) {
  const h = size * 0.5;
  return (
    <svg width={size} height={h} viewBox="0 0 120 60">
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
      <circle cx="35" cy="30" r="24" fill="none" stroke="url(#lgL)" strokeWidth="5" />
      <circle cx="65" cy="30" r="24" fill="none" stroke="url(#lgR)" strokeWidth="5" />
      <path d="M50 10.4 A24 24 0 0 1 50 49.6 A24 24 0 0 1 50 10.4" fill="url(#lgM)" opacity="0.3" />
      <circle cx="28" cy="30" r="5" fill="url(#lgL)" />
      <circle cx="72" cy="30" r="5" fill="url(#lgR)" />
    </svg>
  );
}
