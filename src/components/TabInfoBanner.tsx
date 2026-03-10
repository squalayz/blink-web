"use client";

import { useState, useEffect } from "react";

type IconName = "zap" | "target" | "brain" | "shield" | "link" | "chart" | "users" | "lock" | "signal" | "star";

interface TabInfoBannerProps {
  tabId: string;
  title: string;
  tagline: string;
  bullets: Array<{ icon: IconName; text: string }>;
  accentColor?: string;
  ctaText?: string;
  ctaAction?: () => void;
}

const ICONS: Record<IconName, JSX.Element> = {
  zap: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  target: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  brain: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.16A2.5 2.5 0 0 1 6 10V4.5A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.16A2.5 2.5 0 0 0 18 10V4.5A2.5 2.5 0 0 0 14.5 2Z"/></svg>,
  shield: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  link: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  chart: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  users: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  lock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  signal: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  star: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
};

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

export default function TabInfoBanner({ tabId, title, tagline, bullets, accentColor = "#6366f1", ctaText, ctaAction }: TabInfoBannerProps) {
  const storageKey = `mm_tab_seen_${tabId}`;
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(storageKey);
    setExpanded(!seen);
    setMounted(true);
  }, [storageKey]);

  if (!mounted) return null;

  const rgb = hexToRgb(accentColor);

  const dismiss = () => {
    localStorage.setItem(storageKey, "1");
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px",
          borderRadius: 20,
          background: `rgba(${rgb}, 0.08)`,
          border: `1px solid rgba(${rgb}, 0.2)`,
          color: accentColor,
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: 12,
          transition: "all 0.2s",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = `rgba(${rgb}, 0.14)`;
          e.currentTarget.style.borderColor = `rgba(${rgb}, 0.35)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = `rgba(${rgb}, 0.08)`;
          e.currentTarget.style.borderColor = `rgba(${rgb}, 0.2)`;
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        What is this?
      </button>
    );
  }

  return (
    <>
      <style>{`
        @keyframes tib-slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        style={{
          position: "relative",
          background: `linear-gradient(135deg, rgba(${rgb}, 0.08), transparent)`,
          border: `1px solid rgba(${rgb}, 0.2)`,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          animation: "tib-slide-down 0.35s ease",
          overflow: "hidden",
        }}
      >
        {/* Accent bar */}
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          borderRadius: "16px 0 0 16px",
          background: accentColor,
        }} />

        {/* Dismiss button */}
        <button
          onClick={dismiss}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
            border: "none",
            color: "#6b6b80",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontFamily: "inherit",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 8 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#e8e8f0" }}>{title}</div>
            <div style={{ fontSize: 12, color: "#6b6b80", marginTop: 3 }}>{tagline}</div>
          </div>
        </div>

        {/* Bullets grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 0,
          marginTop: 12,
          paddingLeft: 8,
        }}>
          {bullets.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0" }}>
              <span style={{ color: accentColor, flexShrink: 0, marginTop: 1 }}>{ICONS[b.icon]}</span>
              <span style={{ fontSize: 12, color: "#6b6b80", lineHeight: 1.5 }}>{b.text}</span>
            </div>
          ))}
        </div>

        {/* Footer buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingLeft: 8 }}>
          <div>
            {ctaText && ctaAction && (
              <button
                onClick={ctaAction}
                style={{
                  padding: "7px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: accentColor,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {ctaText}
              </button>
            )}
          </div>
          <button
            onClick={dismiss}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: "none",
              background: `rgba(${rgb}, 0.15)`,
              color: accentColor,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </>
  );
}
