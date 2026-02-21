"use client";

import Link from "next/link";

const C = {
  bg: "#0a0a0f", surface: "#12121a", text: "#e8e6e3", muted: "#8a8a8a",
  dim: "#555", border: "#1e1e2a", cold: "#00d4ff", cyan: "#00e5ff",
};

export default function LegalLayout({ title, lastUpdated, children }: { title: string; lastUpdated: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px 80px" }}>
        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <Link href="/" style={{ fontSize: 18, fontWeight: 800, color: C.cold, textDecoration: "none", letterSpacing: "-0.02em" }}>
            MishMesh<span style={{ color: C.text }}>.ai</span>
          </Link>
          <Link href="/auth/signin" style={{ fontSize: 12, color: C.muted, textDecoration: "none", padding: "6px 14px", border: `1px solid ${C.border}`, borderRadius: 6 }}>
            Back to App
          </Link>
        </div>

        {/* Header */}
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.02em" }}>{title}</h1>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 32 }}>Last updated: {lastUpdated}</div>

        {/* Content */}
        <div style={{ fontSize: 14, lineHeight: 1.75, color: C.muted }}>
          {children}
        </div>

        {/* Footer links */}
        <div style={{ marginTop: 60, paddingTop: 24, borderTop: `1px solid ${C.border}`, display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            { href: "/terms", label: "Terms of Service" },
            { href: "/privacy", label: "Privacy Policy" },
            { href: "/risk", label: "Risk Disclaimer" },
            { href: "/acceptable-use", label: "Acceptable Use" },
          ].map(l => (
            <Link key={l.href} href={l.href} style={{ fontSize: 11, color: C.dim, textDecoration: "none" }}>{l.label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// Reusable styled components for legal content
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: "#e8e6e3", marginBottom: 10 }}>{title}</h2>
      {children}
    </div>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p style={{ marginBottom: 12 }}>{children}</p>;
}
