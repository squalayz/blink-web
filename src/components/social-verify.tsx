"use client";

import { useState, useEffect } from "react";

const C = {
  bg: "#0a0a0f", surface: "#0d0d14", s2: "#1a1a24",
  cold: "#6366f1", cyan: "#06b6d4", match: "#30d158",
  hot: "#ff2d55", gold: "#ffd700",
  text: "#e8e8f0", muted: "#6b6b80", dim: "#2a2a3a",
  border: "rgba(255,255,255,0.07)",
};

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#feda75" />
          <stop offset="25%" stopColor="#fa7e1e" />
          <stop offset="50%" stopColor="#d62976" />
          <stop offset="75%" stopColor="#962fbf" />
          <stop offset="100%" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-grad)" strokeWidth="2" />
      <circle cx="12" cy="12" r="5" stroke="url(#ig-grad)" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="url(#ig-grad)" />
    </svg>
  );
}

function XIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={C.text}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ color = C.match }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.cold} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "svSpin 1s linear infinite" }}>
      <style>{`@keyframes svSpin{to{transform:rotate(360deg)}}`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function ShieldCheck({ color = C.match }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

export interface SocialVerifyProps {
  platform: "instagram" | "x";
  currentHandle?: string;
  isVerified?: boolean;
  onVerified: (handle: string) => void;
}

type VerifyState = "idle" | "entering_handle" | "showing_code" | "checking" | "verified" | "error";

export default function SocialVerify({ platform, currentHandle, isVerified, onVerified }: SocialVerifyProps) {
  const [state, setState] = useState<VerifyState>(isVerified ? "verified" : "idle");
  const [handle, setHandle] = useState(currentHandle || "");
  const [code, setCode] = useState("");
  const [instructions, setInstructions] = useState("");
  const [tweetUrl, setTweetUrl] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [codeStartTime, setCodeStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (isVerified && state === "idle") setState("verified");
  }, [isVerified]);

  // Cosmetic timer
  useEffect(() => {
    if (state !== "showing_code" || !codeStartTime) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - codeStartTime) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [state, codeStartTime]);

  const platformName = platform === "instagram" ? "Instagram" : "X";
  const PlatformIcon = platform === "instagram" ? InstagramIcon : XIcon;

  async function getCode() {
    const cleanHandle = handle.replace(/^@/, "").trim();
    if (!cleanHandle) return;
    try {
      const res = await fetch("/api/verify/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, handle: cleanHandle }),
      });
      const data = await res.json();
      if (data.error) { setMessage(data.error); setState("error"); return; }
      setCode(data.code);
      setInstructions(data.instructions);
      setCodeStartTime(Date.now());
      setState("showing_code");
    } catch {
      setMessage("Network error. Try again.");
      setState("error");
    }
  }

  async function checkVerification() {
    setState("checking");
    const cleanHandle = handle.replace(/^@/, "").trim();
    try {
      const res = await fetch("/api/verify/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, handle: cleanHandle, tweetUrl: tweetUrl || undefined }),
      });
      const data = await res.json();
      if (data.verified) {
        setState("verified");
        setMessage(data.message);
        onVerified(cleanHandle);
      } else {
        setMessage(data.message || "Verification failed.");
        setState("error");
      }
    } catch {
      setMessage("Network error. Try again.");
      setState("error");
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const isVerifiedState = state === "verified";
  const borderColor = isVerifiedState ? C.match + "44" : state === "error" ? C.hot + "44" : C.border;
  const glowStyle = isVerifiedState ? `0 0 20px ${C.match}15` : "none";

  return (
    <div style={{
      background: C.surface,
      borderRadius: 12,
      padding: 16,
      border: `1px solid ${borderColor}`,
      boxShadow: glowStyle,
      transition: "all 0.3s ease",
    }}>
      {/* ── IDLE ── */}
      {state === "idle" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PlatformIcon size={22} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Verify {platformName}</div>
              <div style={{ fontSize: 10, color: C.muted }}>Verify your account to get a badge</div>
            </div>
          </div>
          <button onClick={() => setState("entering_handle")} style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: "transparent", color: C.cold, border: `1px solid ${C.cold}44`,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
          }}>Verify</button>
        </div>
      )}

      {/* ── ENTERING HANDLE ── */}
      {state === "entering_handle" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <PlatformIcon size={18} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Verify {platformName}</span>
          </div>
          <input
            value={handle}
            onChange={e => setHandle(e.target.value)}
            placeholder="@username"
            style={{
              width: "100%", background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "10px 12px", color: C.text, fontSize: 13, fontFamily: "inherit",
              boxSizing: "border-box", marginBottom: 10,
            }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={getCode} disabled={!handle.replace(/^@/, "").trim()} style={{
              padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: C.cold, color: "white", border: "none",
              cursor: handle.replace(/^@/, "").trim() ? "pointer" : "not-allowed",
              opacity: handle.replace(/^@/, "").trim() ? 1 : 0.4,
              fontFamily: "inherit",
            }}>Get Code</button>
            <button onClick={() => { setState("idle"); setMessage(""); }} style={{
              background: "transparent", border: "none", color: C.muted, fontSize: 12,
              cursor: "pointer", fontFamily: "inherit",
            }}>Back</button>
          </div>
        </div>
      )}

      {/* ── SHOWING CODE ── */}
      {state === "showing_code" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <PlatformIcon size={18} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Verify {platformName}</span>
          </div>
          {/* Code pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: C.s2, borderRadius: 8, padding: "10px 14px",
            border: `1px solid ${C.cold}33`, marginBottom: 12,
          }}>
            <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: C.cold, flex: 1, letterSpacing: "0.05em" }}>
              {code}
            </span>
            <button onClick={copyCode} style={{
              background: "transparent", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4, color: C.muted, fontSize: 11, fontFamily: "inherit",
            }}>
              {copied ? <CheckIcon color={C.match} /> : <CopyIcon />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          {/* Instructions */}
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>
            {instructions}
          </div>
          {/* For X: tweet URL input */}
          {platform === "x" && (
            <input
              value={tweetUrl}
              onChange={e => setTweetUrl(e.target.value)}
              placeholder="Paste tweet URL"
              style={{
                width: "100%", background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "10px 12px", color: C.text, fontSize: 12, fontFamily: "inherit",
                boxSizing: "border-box", marginBottom: 10,
              }}
            />
          )}
          {/* Timer */}
          {codeStartTime && elapsed < 300 && (
            <div style={{ fontSize: 10, color: C.dim, marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              Code active for {fmtTime(elapsed)}
            </div>
          )}
          <button onClick={checkVerification} style={{
            padding: "10px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: C.cold, color: "white", border: "none",
            cursor: "pointer", fontFamily: "inherit", width: "100%",
          }}>
            {platform === "x" ? "Verify Tweet" : "Check Now"}
          </button>
        </div>
      )}

      {/* ── CHECKING ── */}
      {state === "checking" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
          <SpinnerIcon />
          <span style={{ fontSize: 13, color: C.muted }}>Checking your {platformName} profile...</span>
        </div>
      )}

      {/* ── VERIFIED ── */}
      {state === "verified" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <PlatformIcon size={22} />
              <div style={{
                position: "absolute", bottom: -2, right: -2, width: 12, height: 12,
                borderRadius: "50%", background: C.match, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.match, display: "flex", alignItems: "center", gap: 6 }}>
                {platformName} Verified
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>@{currentHandle || handle.replace(/^@/, "")}</div>
            </div>
          </div>
          <ShieldCheck color={C.match} />
        </div>
      )}

      {/* ── ERROR ── */}
      {state === "error" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <PlatformIcon size={18} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.hot }}>Verification Failed</span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 12 }}>{message}</div>
          <button onClick={() => setState("showing_code")} style={{
            padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: "transparent", color: C.cold, border: `1px solid ${C.cold}44`,
            cursor: "pointer", fontFamily: "inherit",
          }}>Try Again</button>
        </div>
      )}
    </div>
  );
}
