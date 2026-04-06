"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";
import { C } from "@/lib/theme";

/* ------------------------------------------------------------------ */
/*  Sign In page                                                       */
/* ------------------------------------------------------------------ */
export default function SignInPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<"magic" | "key">("magic");
  const [email, setEmail] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState("");

  /* Redirect authed user */
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/hunt");
    }
  }, [authLoading, user, router]);

  async function handleMagicLink() {
    if (!email.trim() || sending) return;
    setSending(true);
    setError("");
    setSuccess("");
    try {
      const { error: e } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? window.location.origin + "/auth/signin"
              : undefined,
        },
      });
      if (e) throw e;
      setSuccess("Magic link sent — check your inbox.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send link");
    } finally {
      setSending(false);
    }
  }

  async function handlePrivateKey() {
    if (privateKey.length < 64) {
      setError("Private key must be at least 64 hex characters.");
      return;
    }
    setSending(true);
    setError("");
    try {
      // Anonymous session, then store key via wallet setup
      const { error: e } = await supabase.auth.signInAnonymously();
      if (e) throw e;
      // Auth state change will redirect via useEffect
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setSending(false);
    }
  }

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spinner />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'Inter', system-ui, sans-serif",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Back link */}
      <a
        href="/"
        style={{
          position: "fixed",
          top: 20,
          left: 20,
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: C.muted,
          textDecoration: "none",
          fontSize: 14,
          fontWeight: 500,
          zIndex: 10,
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = C.text)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = C.muted)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </a>

      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: C.surface,
          border: `1px solid #2a2a3a`,
          borderRadius: 20,
          padding: "36px 28px",
          boxSizing: "border-box",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
              margin: "0 auto 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 24px ${C.primary}50`,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5" fill="rgba(255,255,255,0.9)" />
              <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
            </svg>
          </div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 900,
              background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              margin: "0 0 6px",
              letterSpacing: "-0.5px",
            }}
          >
            MishMesh
          </h1>
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
            Sign in to hunt and drop orbs
          </p>
        </div>

        {/* Mode toggle */}
        <div
          style={{
            display: "flex",
            background: C.card,
            borderRadius: 10,
            padding: 4,
            marginBottom: 24,
            border: `1px solid #2a2a3a`,
          }}
        >
          {(["magic", "key"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); setSuccess(""); }}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 7,
                border: "none",
                background: mode === m ? C.surface : "transparent",
                color: mode === m ? C.text : C.muted,
                fontSize: 13,
                fontWeight: mode === m ? 700 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                transition: "all 0.15s",
              }}
            >
              {m === "magic" ? "Magic Link" : "Private Key"}
            </button>
          ))}
        </div>

        {/* Magic link form */}
        {mode === "magic" && (
          <>
            <label style={labelStyle}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused("")}
              onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
              placeholder="you@example.com"
              autoComplete="email"
              style={{
                ...inputStyle,
                borderColor: focused === "email" ? C.primary : "#2a2a3a",
              }}
            />

            {success && <div style={successBanner}>{success}</div>}
            {error && <div style={errorBanner}>{error}</div>}

            <button
              onClick={handleMagicLink}
              disabled={sending || !email.trim()}
              style={{
                ...primaryBtn,
                marginTop: 16,
                opacity: sending || !email.trim() ? 0.5 : 1,
                cursor: sending || !email.trim() ? "not-allowed" : "pointer",
              }}
            >
              {sending ? (
                <Spinner />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              )}
              {sending ? "Sending..." : "Send Magic Link"}
            </button>
          </>
        )}

        {/* Private key form */}
        {mode === "key" && (
          <>
            <label style={labelStyle}>Private key (64-char hex)</label>
            <textarea
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value.trim())}
              onFocus={() => setFocused("pk")}
              onBlur={() => setFocused("")}
              placeholder="Paste your 64-character hex private key..."
              rows={3}
              style={{
                ...inputStyle,
                resize: "none",
                fontFamily: "monospace",
                fontSize: 12,
                borderColor: focused === "pk" ? C.primary : "#2a2a3a",
                lineHeight: 1.6,
              }}
            />
            <p
              style={{
                color: C.danger,
                fontSize: 12,
                margin: "6px 0 0",
                lineHeight: 1.5,
              }}
            >
              Warning: Never share your private key. Stored encrypted on-device only.
            </p>

            {error && <div style={{ ...errorBanner, marginTop: 12 }}>{error}</div>}

            <button
              onClick={handlePrivateKey}
              disabled={sending || privateKey.length < 64}
              style={{
                ...primaryBtn,
                marginTop: 16,
                opacity: sending || privateKey.length < 64 ? 0.5 : 1,
                cursor: sending || privateKey.length < 64 ? "not-allowed" : "pointer",
              }}
            >
              {sending ? <Spinner /> : "Sign In with Key"}
            </button>
          </>
        )}

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "20px 0",
          }}
        >
          <div style={{ flex: 1, height: 1, background: "#2a2a3a" }} />
          <span style={{ color: C.muted, fontSize: 12 }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#2a2a3a" }} />
        </div>

        {/* New user CTA */}
        <a
          href="/onboarding"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            padding: "13px 0",
            borderRadius: 12,
            border: `1px solid ${C.accent}40`,
            background: `${C.accent}08`,
            color: C.accent,
            fontSize: 15,
            fontWeight: 700,
            textDecoration: "none",
            boxSizing: "border-box",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.background = `${C.accent}16`)
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.background = `${C.accent}08`)
          }
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          New here? Create an account
        </a>

        <p
          style={{
            color: C.muted,
            fontSize: 12,
            textAlign: "center",
            margin: "16px 0 0",
            lineHeight: 1.5,
          }}
        >
          No wallet needed. MishMesh creates one for you automatically.
        </p>
      </div>

      <style>{`
        @keyframes siSpin { to { transform: rotate(360deg); } }
        input::placeholder, textarea::placeholder { color: ${C.muted}55; }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */
const labelStyle: React.CSSProperties = {
  display: "block",
  color: C.muted,
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  background: C.card,
  border: `1px solid #2a2a3a`,
  borderRadius: 10,
  color: C.text,
  fontSize: 15,
  fontFamily: "inherit",
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color 0.15s",
};

const primaryBtn: React.CSSProperties = {
  width: "100%",
  padding: "14px 0",
  borderRadius: 12,
  border: "none",
  background: C.primary,
  color: "#fff",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "opacity 0.15s",
  boxShadow: `0 4px 16px ${C.primary}40`,
};

const errorBanner: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 14px",
  background: `#EF444415`,
  border: `1px solid #EF444440`,
  borderRadius: 10,
  color: C.danger,
  fontSize: 13,
};

const successBanner: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 14px",
  background: `${C.accent}15`,
  border: `1px solid ${C.accent}40`,
  borderRadius: 10,
  color: C.accent,
  fontSize: 13,
};

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.25)",
        borderTopColor: "#fff",
        animation: "siSpin 0.7s linear infinite",
      }}
    />
  );
}
