"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const GREEN = "#00FF88";
const GREEN2 = "#88FF00";
const BG = "#0a0a0f";
const SURFACE = "#0d0d14";
const SURFACE2 = "#1a1a24";
const WHITE = "#FFFFFF";
const MUTED = "#8a8a99";
const BORDER = "rgba(0,255,136,0.18)";
const BORDER_DIM = "rgba(255,255,255,0.08)";
const RED = "#FF8099";

type Mode = "signup" | "signin";

export interface AuthModalProps {
  open: boolean;
  initialMode?: Mode;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ open, initialMode = "signup", onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usernameRef = useRef<HTMLInputElement | null>(null);

  // Reset whenever the modal opens or mode changes
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
      setLoading(false);
      setTimeout(() => usernameRef.current?.focus(), 50);
    }
  }, [open, initialMode]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (loading) return;

    const u = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(u)) {
      setError("Username: 3-30 chars, letters/numbers/underscores only.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (mode === "signup" && password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }
      if (!data.access_token || !data.refresh_token) {
        throw new Error("Server didn't return a session.");
      }
      // Hand the session to the Supabase client so /providers picks up `user`.
      const { error: setErr } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (setErr) throw setErr;

      // Clear inputs
      setUsername("");
      setPassword("");
      setConfirm("");
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.78)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: "blinkAuthFadeIn 0.18s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: 20,
          padding: "28px 24px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 32px rgba(0,255,136,0.12)",
          color: WHITE,
          fontFamily: "'Inter', system-ui, sans-serif",
          maxHeight: "calc(100dvh - 32px)",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-orb-transparent.png"
              alt=""
              aria-hidden
              width={28}
              height={28}
              style={{
                width: 28,
                height: 28,
                objectFit: "cover",
                borderRadius: "50%",
                flexShrink: 0,
                filter: "drop-shadow(0 0 8px rgba(0,255,136,0.6))",
              }}
            />
            <span
              style={{
                fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                fontWeight: 800,
                fontSize: 13,
                color: GREEN,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                textShadow: "0 0 12px rgba(0,255,136,0.45)",
                whiteSpace: "nowrap",
              }}
            >
              Enter the World
            </span>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: WHITE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            background: SURFACE2,
            borderRadius: 12,
            padding: 4,
            marginBottom: 22,
            border: `1px solid ${BORDER_DIM}`,
          }}
        >
          {(["signup", "signin"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 9,
                border: "none",
                background: mode === m ? `${GREEN}22` : "transparent",
                color: mode === m ? GREEN : MUTED,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {m === "signup" ? "Create Account" : "Sign In"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field
            label="Username"
            inputRef={usernameRef}
            value={username}
            onChange={(v) => setUsername(v.replace(/\s+/g, ""))}
            placeholder="watcher_x"
            autoComplete="username"
            type="text"
          />

          <Field
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="At least 8 characters"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            type={showPassword ? "text" : "password"}
            rightAdornment={
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: MUTED,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  padding: "4px 6px",
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            }
          />

          {mode === "signup" && (
            <Field
              label="Confirm Password"
              value={confirm}
              onChange={setConfirm}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              type={showPassword ? "text" : "password"}
            />
          )}

          {error && (
            <div
              style={{
                background: "rgba(255,128,153,0.10)",
                border: `1px solid ${RED}55`,
                color: RED,
                fontSize: 13,
                padding: "10px 12px",
                borderRadius: 10,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
              height: 56,
              padding: "0 20px",
              borderRadius: 16,
              border: "none",
              background: loading ? "rgba(0,255,136,0.45)" : `linear-gradient(90deg, ${GREEN2}, ${GREEN})`,
              color: "#000",
              fontSize: 17,
              fontWeight: 800,
              cursor: loading ? "wait" : "pointer",
              fontFamily: "ui-rounded, 'SF Pro Rounded', 'Space Grotesk', 'Inter', sans-serif",
              boxShadow: loading ? "none" : "0 6px 18px rgba(0,255,136,0.45)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
          >
            {loading ? "Working..." : mode === "signup" ? "Create Account" : "Sign In"}
          </button>

          <p
            style={{
              fontSize: 11,
              color: MUTED,
              textAlign: "center",
              margin: "6px 0 0",
              lineHeight: 1.55,
              letterSpacing: "0.02em",
            }}
          >
            We generate your ETH wallet on signup. Your private keys are
            encrypted at rest. Sign back in any time with your username and password.
          </p>
        </form>
      </div>
      <style>{`
        @keyframes blinkAuthFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .blink-auth-field:focus-within {
          border-color: rgba(0,255,136,0.7) !important;
          box-shadow: 0 0 0 0.5px rgba(0,255,136,0.7);
        }
        .blink-auth-field input { caret-color: ${GREEN}; font-weight: 600; }
        .blink-auth-field input::placeholder { color: rgba(255,255,255,0.5); }
      `}</style>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  type,
  inputRef,
  rightAdornment,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  type: string;
  inputRef?: React.MutableRefObject<HTMLInputElement | null>;
  rightAdornment?: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          color: MUTED,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <div
        className="blink-auth-field"
        style={{
          display: "flex",
          alignItems: "center",
          height: 56,
          boxSizing: "border-box",
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          padding: "0 16px",
          transition: "border-color 0.18s ease",
        }}
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          type={type}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            color: WHITE,
            fontSize: 15,
            fontFamily: "inherit",
            width: "100%",
            minWidth: 0,
          }}
        />
        {rightAdornment}
      </div>
    </label>
  );
}
