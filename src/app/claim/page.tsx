"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const GREEN = "#00FF88";
const GREEN2 = "#88FF00";
const BG = "#0a0a0f";
const SURFACE = "#0d0d14";
const WHITE = "#FFFFFF";
const MUTED = "#8a8a99";
const RED = "#ff5572";
const BORDER = "rgba(0,255,136,0.20)";

type Step = 1 | 2 | 3;

type LookupResult = {
  profile_id: string;
  username: string | null;
  display_name: string | null;
  claimable_points: number;
  tokens_available: number;
};

type ExecuteResult = {
  tx_hash: string;
  tokens_sent: number;
  eth_address: string;
};

export default function ClaimPage() {
  const [step, setStep] = useState<Step>(1);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [ethAddress, setEthAddress] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExecuteResult | null>(null);

  const tokensToClaim = useMemo(
    () => (lookup ? Math.floor(lookup.claimable_points / 1000) : 0),
    [lookup],
  );

  const ethValid = /^0x[0-9a-fA-F]{40}$/.test(ethAddress);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!code.trim() || !password) {
      setError("Enter both code and password.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/claim/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_code: code.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Lookup failed");
        return;
      }
      setLookup(data as LookupResult);
      setStep(2);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!ethValid) {
      setError("Please enter a valid Ethereum address.");
      return;
    }
    if (!confirmed) {
      setError("Please confirm your wallet address.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/claim/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_code: code.trim(),
          password,
          eth_address: ethAddress.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setError(data?.error || "Claim failed. Please try again.");
        return;
      }
      setResult({
        tx_hash: data.tx_hash,
        tokens_sent: data.tokens_sent,
        eth_address: data.eth_address,
      });
      setStep(3);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        color: WHITE,
        fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 16px 60px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(0,255,136,0.10) 0%, rgba(10,10,15,0) 60%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <Link
        href="/"
        style={{
          textDecoration: "none",
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: "0.32em",
          color: WHITE,
          marginBottom: 28,
          position: "relative",
          zIndex: 1,
        }}
      >
        BL<span style={{ color: GREEN }}>I</span>NK
      </Link>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          marginTop: 28,
          background: "rgba(13,13,20,0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${BORDER}`,
          borderRadius: 20,
          padding: "32px 24px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,255,136,0.04) inset",
          position: "relative",
          zIndex: 1,
        }}
      >
        {step === 1 && (
          <form onSubmit={handleLookup}>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: "0.02em",
                textAlign: "center",
              }}
            >
              Claim Your BLINK Rewards
            </h1>
            <p
              style={{
                color: MUTED,
                fontSize: 14,
                lineHeight: 1.6,
                textAlign: "center",
                margin: "10px 0 24px",
              }}
            >
              Enter your Claim Code and Password from the BLINK app.
            </p>

            <Label>Claim Code</Label>
            <Input
              value={code}
              onChange={(v) => setCode(v.toUpperCase().slice(0, 10))}
              placeholder="BL-7K9X"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={10}
              uppercase
            />

            <div style={{ height: 16 }} />

            <Label>Password</Label>
            <Input
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              type="password"
            />

            {error && <ErrorMsg>{error}</ErrorMsg>}

            <PrimaryButton disabled={busy} type="submit">
              {busy ? <Spinner /> : "Look Up My Rewards"}
            </PrimaryButton>

            <p
              style={{
                color: MUTED,
                fontSize: 12,
                textAlign: "center",
                marginTop: 18,
                lineHeight: 1.6,
              }}
            >
              Don't have a code yet? Catch creatures in the BLINK app to earn points.
            </p>
          </form>
        )}

        {step === 2 && lookup && (
          <form onSubmit={handleClaim}>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: "0.02em",
                textAlign: "center",
              }}
            >
              Hey {lookup.display_name || lookup.username || "Trainer"}! 👋
            </h1>

            <div
              style={{
                marginTop: 20,
                padding: "24px 16px",
                borderRadius: 16,
                background:
                  "linear-gradient(160deg, rgba(0,255,136,0.10), rgba(0,255,136,0.02))",
                border: `1px solid ${BORDER}`,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  background: `linear-gradient(135deg, ${GREEN}, ${GREEN2})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  lineHeight: 1.1,
                }}
              >
                {lookup.claimable_points.toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: MUTED,
                  marginTop: 4,
                }}
              >
                BLINK Points
              </div>

              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: "1px dashed rgba(0,255,136,0.18)",
                  fontSize: 16,
                  color: WHITE,
                  fontWeight: 700,
                }}
              >
                = {tokensToClaim.toLocaleString()} BLINK Tokens
              </div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
                1,000 points = 1 BLINK
              </div>
            </div>

            {lookup.claimable_points < 1000 ? (
              <div
                style={{
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 12,
                  background: "rgba(255,200,0,0.06)",
                  border: "1px solid rgba(255,200,0,0.25)",
                  color: "#ffd866",
                  fontSize: 13,
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                Keep playing to earn more! Minimum 1,000 points to claim.
              </div>
            ) : (
              <>
                <div style={{ height: 22 }} />
                <Label>Ethereum Wallet Address</Label>
                <Input
                  value={ethAddress}
                  onChange={setEthAddress}
                  placeholder="0x..."
                  spellCheck={false}
                />
                {ethAddress && !ethValid && (
                  <div style={{ color: RED, fontSize: 12, marginTop: 6 }}>
                    That doesn't look like a valid 0x address.
                  </div>
                )}

                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    marginTop: 16,
                    cursor: "pointer",
                    color: MUTED,
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    style={{
                      marginTop: 3,
                      accentColor: GREEN,
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                    }}
                  />
                  <span>
                    I confirm this is my wallet address and understand this is
                    irreversible.
                  </span>
                </label>
              </>
            )}

            {error && <ErrorMsg>{error}</ErrorMsg>}

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError("");
                  setEthAddress("");
                  setConfirmed(false);
                }}
                style={{
                  flex: "0 0 auto",
                  padding: "14px 18px",
                  borderRadius: 999,
                  border: `1px solid ${BORDER}`,
                  background: "transparent",
                  color: WHITE,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Back
              </button>
              <PrimaryButton
                disabled={
                  busy ||
                  lookup.claimable_points < 1000 ||
                  !ethValid ||
                  !confirmed
                }
                type="submit"
                style={{ flex: 1, marginTop: 0 }}
              >
                {busy ? (
                  <Spinner />
                ) : (
                  `Claim ${tokensToClaim.toLocaleString()} BLINK Tokens`
                )}
              </PrimaryButton>
            </div>
          </form>
        )}

        {step === 3 && result && (
          <div style={{ textAlign: "center" }}>
            <SuccessCheck />
            <h1
              style={{
                margin: "20px 0 8px",
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: "0.02em",
              }}
            >
              Claimed!
            </h1>
            <p
              style={{
                color: MUTED,
                fontSize: 14,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              <span style={{ color: GREEN, fontWeight: 700 }}>
                {result.tokens_sent.toLocaleString()} BLINK
              </span>{" "}
              sent to
              <br />
              <span style={{ color: WHITE, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                {`${result.eth_address.slice(0, 6)}...${result.eth_address.slice(-4)}`}
              </span>
            </p>

            {result.tx_hash && (
              <a
                href={`https://etherscan.io/tx/${result.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: 16,
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: `1px solid ${BORDER}`,
                  background: "rgba(0,255,136,0.05)",
                  color: GREEN,
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                View on Etherscan →
              </a>
            )}

            <p
              style={{
                color: MUTED,
                fontSize: 12,
                marginTop: 18,
                lineHeight: 1.5,
              }}
            >
              Points balance reset to 0.
            </p>

            <Link
              href="/"
              style={{
                display: "block",
                marginTop: 24,
                padding: "14px 20px",
                borderRadius: 999,
                background: `linear-gradient(135deg, ${GREEN}, ${GREEN2})`,
                color: BG,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                boxShadow: "0 0 22px rgba(0,255,136,0.45)",
              }}
            >
              Back to BLINK World
            </Link>
          </div>
        )}
      </div>

      <style>{KEYFRAMES}</style>
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps: Array<{ n: Step; label: string }> = [
    { n: 1, label: "Verify" },
    { n: 2, label: "Wallet" },
    { n: 3, label: "Done" },
  ];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        position: "relative",
        zIndex: 1,
      }}
    >
      {steps.map((s, i) => {
        const active = current === s.n;
        const done = current > s.n;
        return (
          <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${active || done ? GREEN : BORDER}`,
                  background: done ? GREEN : active ? "rgba(0,255,136,0.12)" : "transparent",
                  color: done ? BG : active ? GREEN : MUTED,
                  fontSize: 12,
                  fontWeight: 900,
                  transition: "all 240ms ease",
                  boxShadow: active ? "0 0 14px rgba(0,255,136,0.45)" : "none",
                }}
              >
                {done ? "✓" : s.n}
              </div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: active || done ? WHITE : MUTED,
                }}
              >
                {s.label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  width: 36,
                  height: 1,
                  background: current > s.n ? GREEN : BORDER,
                  marginBottom: 18,
                  transition: "background 240ms ease",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: MUTED,
        marginBottom: 8,
        fontWeight: 700,
      }}
    >
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  autoCapitalize,
  spellCheck,
  uppercase,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  autoCapitalize?: string;
  spellCheck?: boolean;
  uppercase?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      maxLength={maxLength}
      autoCapitalize={autoCapitalize}
      spellCheck={spellCheck}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: "100%",
        padding: "14px 16px",
        borderRadius: 12,
        background: SURFACE,
        border: `1px solid ${focused ? GREEN : BORDER}`,
        color: WHITE,
        fontSize: 16,
        letterSpacing: uppercase ? "0.08em" : "normal",
        textTransform: uppercase ? "uppercase" : "none",
        outline: "none",
        boxSizing: "border-box",
        fontFamily: "inherit",
        transition: "border-color 160ms ease, box-shadow 160ms ease",
        boxShadow: focused ? "0 0 0 3px rgba(0,255,136,0.12)" : "none",
      }}
    />
  );
}

function PrimaryButton({
  children,
  disabled,
  type,
  style,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  style?: React.CSSProperties;
}) {
  return (
    <button
      type={type || "button"}
      disabled={disabled}
      style={{
        width: "100%",
        marginTop: 22,
        padding: "16px 22px",
        borderRadius: 999,
        border: "none",
        background: disabled
          ? "rgba(0,255,136,0.18)"
          : `linear-gradient(135deg, ${GREEN}, ${GREEN2})`,
        color: BG,
        fontSize: 14,
        fontWeight: 900,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 0 22px rgba(0,255,136,0.45)",
        opacity: disabled ? 0.7 : 1,
        transition: "transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: "10px 14px",
        borderRadius: 10,
        background: "rgba(255,85,114,0.08)",
        border: "1px solid rgba(255,85,114,0.3)",
        color: RED,
        fontSize: 13,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-label="loading"
      style={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        border: `2px solid rgba(10,10,15,0.3)`,
        borderTopColor: BG,
        display: "inline-block",
        animation: "blinkClaimSpin 0.8s linear infinite",
      }}
    />
  );
}

function SuccessCheck() {
  return (
    <div
      style={{
        width: 86,
        height: 86,
        borderRadius: "50%",
        background: "rgba(0,255,136,0.10)",
        border: `2px solid ${GREEN}`,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 40px rgba(0,255,136,0.45)",
        animation: "blinkClaimPop 480ms cubic-bezier(.2,1.4,.4,1) both",
      }}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 12.5l5 5L20 6"
          stroke={GREEN}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 30,
            strokeDashoffset: 30,
            animation: "blinkClaimDraw 600ms 200ms ease-out forwards",
          }}
        />
      </svg>
    </div>
  );
}

const KEYFRAMES = `
@keyframes blinkClaimSpin {
  to { transform: rotate(360deg); }
}
@keyframes blinkClaimPop {
  0% { transform: scale(0.4); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes blinkClaimDraw {
  to { stroke-dashoffset: 0; }
}
`;
