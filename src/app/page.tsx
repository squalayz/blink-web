"use client";

// BLINKWORLD homepage — a web adaptation of the iOS app's combined
// welcome + auth screen (SignInView.swift): full-bleed alpine key art,
// BLINKWORLD wordmark, email-first "Continue" that signs in or creates an
// account in one step. Full-viewport, non-scrollable.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";

const GREEN = "#00FF88";
const GREEN2 = "#88FF00";
const BG = "#0a0a0f";
const WHITE = "#FFFFFF";
const TEXT_SECONDARY = "rgba(255,255,255,0.72)";
const TEXT_TERTIARY = "rgba(255,255,255,0.5)";
const RED = "#FF8099";

const FONT_ROUNDED = "ui-rounded, 'SF Pro Rounded', 'Space Grotesk', 'Inter', sans-serif";
const FONT_BODY = "'Inter', -apple-system, system-ui, sans-serif";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);

  // Signed-in visitors go straight to their world.
  useEffect(() => {
    if (!loading && user) router.replace("/map");
  }, [loading, user, router]);

  async function handleContinue(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (busy) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Your password needs at least 6 characters.");
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      if (!data.access_token || !data.refresh_token) {
        throw new Error("Server didn't return a session.");
      }
      const { error: setErr } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (setErr) throw setErr;
      router.replace(data.is_new ? "/onboarding" : "/map");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: BG,
        color: WHITE,
        fontFamily: FONT_BODY,
        overflow: "hidden",
      }}
    >
      {/* Full-bleed key art — the app's own explorer_glowing_orb artwork. */}
      <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/app/explorer-glowing-orb.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          className="bw-hero-art"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
          }}
        />
        {/* Readability scrim — art stays vivid up top, melts into the dark
            background where the form lives, exactly like the app. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg,
              rgba(10,10,15,0.18) 0%,
              rgba(10,10,15,0.02) 26%,
              rgba(10,10,15,0.10) 44%,
              rgba(10,10,15,0.62) 62%,
              rgba(10,10,15,0.92) 78%,
              ${BG} 92%)`,
          }}
        />
        {/* Floating mini BLINK orbs drifting over the art. */}
        {ORB_DRIFTERS.map((d) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={d.id}
            src="/brand/logo-orb-glow.png"
            alt=""
            className="bw-drift-orb"
            style={{
              position: "absolute",
              left: d.left,
              top: d.top,
              width: d.size,
              height: d.size,
              objectFit: "contain",
              filter: "drop-shadow(0 0 14px rgba(0,255,136,0.55))",
              animationDuration: `${d.duration}s`,
              animationDelay: `${d.delay}s`,
              opacity: 0.9,
            }}
          />
        ))}
      </div>

      {/* Foreground column */}
      <div
        className="bw-home-col"
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          maxWidth: 440,
          margin: "0 auto",
          padding: "0 24px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        {/* Wordmark block */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-orb-glow.png"
            alt=""
            aria-hidden
            width={64}
            height={64}
            className="bw-logo-pulse"
            style={{
              width: 64,
              height: 64,
              objectFit: "contain",
              filter: "drop-shadow(0 0 22px rgba(0,255,136,0.6))",
            }}
          />
          <h1
            className="bw-wordmark"
            style={{
              fontFamily: FONT_ROUNDED,
              fontSize: "clamp(30px, 8.5vw, 38px)",
              fontWeight: 900,
              letterSpacing: "0.10em",
              marginRight: "-0.10em",
              color: WHITE,
              margin: 0,
              lineHeight: 1,
              textShadow:
                "0 0 22px rgba(0,255,136,0.55), 0 2px 8px rgba(0,0,0,0.65)",
            }}
          >
            BLINKWORLD
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14.5,
              fontWeight: 600,
              color: TEXT_SECONDARY,
              textShadow: "0 1px 6px rgba(0,0,0,0.7)",
            }}
          >
            Walk. Discover. Connect.
          </p>
        </div>

        {/* Email-first form */}
        <form
          onSubmit={handleContinue}
          style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 26 }}
        >
          <Field
            icon={<EnvelopeIcon />}
            type="email"
            placeholder="Email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            inputRef={emailRef}
          />
          <Field
            icon={<LockIcon />}
            type="password"
            placeholder="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />

          {error && (
            <div
              role="alert"
              style={{
                background: "rgba(255,128,153,0.12)",
                border: `1px solid ${RED}55`,
                color: RED,
                fontSize: 13,
                padding: "10px 12px",
                borderRadius: 12,
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="bw-continue"
            style={{
              marginTop: 4,
              height: 56,
              borderRadius: 28,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: busy
                ? "rgba(0,255,136,0.45)"
                : `linear-gradient(90deg, ${GREEN2}, ${GREEN})`,
              color: "#000",
              fontSize: 17,
              fontWeight: 800,
              fontFamily: FONT_ROUNDED,
              cursor: busy ? "wait" : "pointer",
              boxShadow: busy ? "none" : "0 6px 22px rgba(0,255,136,0.45)",
            }}
          >
            {busy ? "Working..." : "Continue"}
            {!busy && <ArrowRightIcon />}
          </button>

          <p
            style={{
              margin: "2px 0 0",
              fontSize: 12,
              fontWeight: 500,
              color: TEXT_TERTIARY,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            New here? Just enter an email and password — we&apos;ll set you up instantly.
          </p>
        </form>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            marginTop: 16,
            paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: TEXT_TERTIARY }}>
            You must be 17+ to use BlinkWorld&apos;s social features.
          </p>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: TEXT_TERTIARY }}>
            By continuing you agree to our{" "}
            <Link href="/terms" style={{ color: GREEN, textDecoration: "none", fontWeight: 800 }}>
              Terms
            </Link>{" "}
            &{" "}
            <Link href="/privacy" style={{ color: GREEN, textDecoration: "none", fontWeight: 800 }}>
              Privacy
            </Link>
          </p>
          <Link
            href="/onboarding?replay=1"
            style={{
              marginTop: 4,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: TEXT_SECONDARY,
              textDecoration: "none",
              borderBottom: "1px solid rgba(255,255,255,0.25)",
              paddingBottom: 1,
            }}
          >
            How it works
          </Link>
        </div>
      </div>

      <style>{KEYFRAMES}</style>
    </div>
  );
}

/* Deterministic drift layout — mirrors the app's AlpineDriftLayer restraint. */
const ORB_DRIFTERS = [
  { id: 0, left: "12%", top: "12%", size: 44, duration: 7.5, delay: 0 },
  { id: 1, left: "78%", top: "8%", size: 34, duration: 9, delay: 1.2 },
  { id: 2, left: "68%", top: "30%", size: 26, duration: 6.5, delay: 2.1 },
];

function Field({
  icon,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  inputRef,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  inputRef?: React.MutableRefObject<HTMLInputElement | null>;
}) {
  return (
    <div
      className="bw-field"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 56,
        boxSizing: "border-box",
        padding: "0 16px",
        borderRadius: 16,
        background: "rgba(20,22,26,0.6)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
        border: "1px solid rgba(255,255,255,0.12)",
        transition: "border-color 0.18s ease, box-shadow 0.18s ease",
      }}
    >
      <span style={{ display: "flex", width: 22, justifyContent: "center", color: TEXT_TERTIARY }}>
        {icon}
      </span>
      <input
        ref={inputRef}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          color: WHITE,
          fontSize: 16,
          fontWeight: 600,
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

function EnvelopeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17.5v-11Zm2.6-.5 6.9 5.2a.85.85 0 0 0 1 0L19.4 6H4.6Zm15.4 1.9-6.3 4.72a2.85 2.85 0 0 1-3.4 0L4 7.9v9.6a.5.5 0 0 0 .5.5h15a.5.5 0 0 0 .5-.5V7.9Z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm3 8V7a3 3 0 1 0-6 0v3h6Zm-3 4a1.5 1.5 0 0 1 .75 2.8V18a.75.75 0 0 1-1.5 0v-1.2A1.5 1.5 0 0 1 12 14Z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const KEYFRAMES = `
@keyframes bwKenBurns {
  0%, 100% { transform: scale(1.04) translateY(0); }
  50% { transform: scale(1.12) translateY(-8px); }
}
@keyframes bwOrbDrift {
  0%, 100% { transform: translate(0, 6px); }
  50% { transform: translate(4px, -10px); }
}
@keyframes bwLogoPulse {
  0%, 100% { filter: drop-shadow(0 0 14px rgba(0,255,136,0.4)); transform: scale(1); }
  50% { filter: drop-shadow(0 0 28px rgba(0,255,136,0.75)); transform: scale(1.05); }
}
.bw-hero-art { animation: bwKenBurns 18s ease-in-out infinite; }
.bw-drift-orb { animation-name: bwOrbDrift; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
.bw-logo-pulse { animation: bwLogoPulse 2.6s ease-in-out infinite; }
.bw-field:focus-within {
  border-color: rgba(0,255,136,0.7) !important;
  box-shadow: 0 0 0 0.5px rgba(0,255,136,0.7);
}
.bw-field input::placeholder { color: rgba(255,255,255,0.5); }
.bw-field input:-webkit-autofill,
.bw-field input:-webkit-autofill:hover,
.bw-field input:-webkit-autofill:focus {
  -webkit-text-fill-color: #fff;
  -webkit-box-shadow: 0 0 0 1000px rgba(20,22,26,0.9) inset;
  transition: background-color 9999s ease-in-out 0s;
}
.bw-continue:not(:disabled):hover { box-shadow: 0 6px 30px rgba(0,255,136,0.65); }
.bw-continue:not(:disabled):active { transform: scale(0.98); }
/* Only if content physically cannot fit does the column scroll. */
@media (max-height: 660px) {
  .bw-home-col { overflow-y: auto; justify-content: flex-start !important; padding-top: 24vh !important; }
}
@media (prefers-reduced-motion: reduce) {
  .bw-hero-art, .bw-drift-orb, .bw-logo-pulse { animation: none !important; }
}
`;
