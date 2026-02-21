"use client";
import { useState } from "react";

const C = {
  bg:"#0a0a0f", surface:"#111118", s2:"#1a1a24",
  indigo:"#6366f1", cyan:"#06b6d4", match:"#30d158",
  text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a", hot:"#ff2d55", warn:"#f59e0b",
};

const PROVIDER_BILLING: Record<string, { name: string; url: string; icon: string }> = {
  openai: { name: "OpenAI", url: "https://platform.openai.com/account/billing", icon: "🟢" },
  anthropic: { name: "Anthropic", url: "https://console.anthropic.com/settings/billing", icon: "🟠" },
  google: { name: "Google AI", url: "https://console.cloud.google.com/billing", icon: "🔵" },
  groq: { name: "Groq", url: "https://console.groq.com/settings/billing", icon: "🔴" },
  openrouter: { name: "OpenRouter", url: "https://openrouter.ai/credits", icon: "🟣" },
};

interface KeyStatus {
  status: "healthy" | "failing" | "expired" | "unknown";
  provider: string;
  error?: string;
  lastCheck?: string;
}

// ── Dashboard Banner ──
export function ApiKeyBanner({ keyStatus, onUpdateKey }: { keyStatus: KeyStatus; onUpdateKey: () => void }) {
  if (keyStatus.status === "healthy" || keyStatus.status === "unknown") return null;

  const billing = PROVIDER_BILLING[keyStatus.provider] || PROVIDER_BILLING.openai;
  const isFailing = keyStatus.status === "failing";
  const color = isFailing ? C.warn : C.hot;

  return (
    <div style={{
      padding: "12px 16px", borderRadius: 12, marginBottom: 16,
      background: `${color}0a`, border: `1px solid ${color}33`,
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      animation: keyStatus.status === "expired" ? "akm-pulse 2s infinite" : "none",
    }}>
      <span style={{ fontSize: 18 }}></span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color }}>
          {isFailing ? "Your AI brain is struggling" : "Your AI brain is offline"}
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>
          {keyStatus.error || `${billing.name} API key ${isFailing ? "rate limited" : "expired or invalid"}`}
          {" · Agent is paused."}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <a href={billing.url} target="_blank" rel="noopener" style={{
          padding: "8px 14px", borderRadius: 8, background: "transparent",
          border: `1px solid ${color}44`, color, fontSize: 12, fontWeight: 600,
          textDecoration: "none", whiteSpace: "nowrap",
        }}>{billing.icon} Check {billing.name} billing →</a>
        <button onClick={onUpdateKey} style={{
          padding: "8px 14px", borderRadius: 8, border: "none",
          background: color, color: "white", fontSize: 12, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
        }}>Update Key</button>
      </div>

      <style>{`@keyframes akm-pulse{0%,100%{opacity:0.8}50%{opacity:1}}`}</style>
    </div>
  );
}

// ── Inline health check on settings page ──
export function ApiKeyHealth({ provider, status }: { provider: string; status: string }) {
  const indicators: Record<string, { color: string; label: string; icon: string }> = {
    healthy: { color: C.match, label: "Healthy", icon: "✓" },
    failing: { color: C.warn, label: "Issues", icon: "!" },
    expired: { color: C.hot, label: "Offline", icon: "✕" },
    unknown: { color: C.muted, label: "Unchecked", icon: "?" },
  };
  const ind = indicators[status] || indicators.unknown;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <div style={{
        width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        background: `${ind.color}22`, border: `1.5px solid ${ind.color}`,
        fontSize: 10, fontWeight: 800, color: ind.color,
      }}>{ind.icon}</div>
      <span style={{ fontSize: 12, color: ind.color, fontWeight: 600 }}>{ind.label}</span>
    </div>
  );
}

// ── Back Online Toast ──
export function BackOnlineToast({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div style={{
      position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
      padding: "10px 20px", borderRadius: 12, background: C.match,
      color: "white", fontSize: 13, fontWeight: 700, zIndex: 1200,
      boxShadow: `0 4px 20px ${C.match}40`,
      animation: "akm-toast 0.4s ease-out",
    }}>
       Your agent is back online!
      <style>{`@keyframes akm-toast{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  );
}
