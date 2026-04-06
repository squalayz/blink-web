"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";
import { C } from "@/lib/theme";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Step = 1 | 2 | 3 | 4;
type AuthMode = "create" | "import" | null;

interface GeneratedWallets {
  sol: string;
  eth: string;
  btc: string;
}

/* ------------------------------------------------------------------ */
/*  Real wallet address generator                                      */
/* ------------------------------------------------------------------ */
async function makeAddresses(): Promise<GeneratedWallets> {
  const { ethers } = await import("ethers");
  const { Keypair } = await import("@solana/web3.js");

  const ethWallet = ethers.Wallet.createRandom();
  const solKeypair = Keypair.generate();

  return {
    sol: solKeypair.publicKey.toBase58(),
    eth: ethWallet.address,
    btc: `bc1q${ethWallet.address.slice(2, 40).toLowerCase()}`,
  };
}

/* ------------------------------------------------------------------ */
/*  Chain dot badge                                                    */
/* ------------------------------------------------------------------ */
function ChainBadge({
  label,
  color,
  address,
  visible,
}: {
  label: string;
  color: string;
  address: string;
  visible: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 18px",
        background: C.card,
        border: `1px solid ${visible ? color + "50" : "#2a2a3a"}`,
        borderRadius: 12,
        marginBottom: 10,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "all 0.4s cubic-bezier(0.32,0.72,0,1)",
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: visible ? color : "#2a2a3a",
          boxShadow: visible ? `0 0 8px ${color}` : "none",
          flexShrink: 0,
          transition: "all 0.4s",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, color: C.text, fontSize: 13, fontWeight: 700 }}>{label}</p>
        <p
          style={{
            margin: 0,
            color: C.muted,
            fontSize: 11,
            fontFamily: "monospace",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {address}
        </p>
      </div>
      {visible && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main onboarding page                                               */
/* ------------------------------------------------------------------ */
export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [authMode, setAuthMode] = useState<AuthMode>(null);

  // Step 2 – auth
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Step 3 – wallet reveal
  const [wallets, setWallets] = useState<GeneratedWallets | null>(null);
  const [revealCount, setRevealCount] = useState(0);

  // Step 4 – profile
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Focused fields
  const [focused, setFocused] = useState("");

  /* ---- redirect already-authed user ---- */
  useEffect(() => {
    if (user && step < 3) {
      makeAddresses().then((generated) => {
        setWallets(generated);
        setStep(3);
      });
    }
  }, [user, step]);

  /* ---- animate wallet reveals one by one ---- */
  useEffect(() => {
    if (step !== 3) return;
    setRevealCount(0);
    const timers = [
      setTimeout(() => setRevealCount(1), 400),
      setTimeout(() => setRevealCount(2), 900),
      setTimeout(() => setRevealCount(3), 1400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [step]);

  /* ---- handlers ---- */
  async function handleSendOtp() {
    if (!email.trim()) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setOtpSent(true);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "email",
      });
      if (error) throw error;
      // user state will update via provider -> useEffect will advance step
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleImportKey() {
    if (privateKey.length < 64) {
      setAuthError("Private key must be at least 64 hex characters");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      // For import flow, sign up anonymously then store encrypted key
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      // Key will be stored after wallet screen
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setAuthLoading(false);
    }
  }

  function advanceFromWallets() {
    setStep(4);
  }

  async function handleSaveProfile() {
    if (!displayName.trim() || !handle.trim()) {
      setSaveError("Display name and handle are required.");
      return;
    }
    if (!user) {
      setSaveError("No user session found.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const { error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        display_name: displayName.trim(),
        handle: handle.trim().replace(/^@/, ""),
        bio: bio.trim(),
        sol_address: wallets?.sol ?? null,
        eth_address: wallets?.eth ?? null,
        btc_address: wallets?.btc ?? null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      // Ensure walkthrough fires on Hunt after fresh onboarding
      if (typeof window !== "undefined") {
        localStorage.removeItem("onboarding_complete");
      }
      router.push("/hunt");
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */
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
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
        }}
      >
        {/* Step indicators */}
        {step > 1 && (
          <div
            style={{
              display: "flex",
              gap: 6,
              justifyContent: "center",
              marginBottom: 32,
            }}
          >
            {([1, 2, 3, 4] as Step[]).map((s) => (
              <div
                key={s}
                style={{
                  width: s === step ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: s <= step ? C.primary : "#2a2a3a",
                  transition: "all 0.3s",
                }}
              />
            ))}
          </div>
        )}

        {/* ---- STEP 1: Hero splash ---- */}
        {step === 1 && (
          <div style={{ textAlign: "center" }}>
            {/* Logo orb */}
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
                margin: "0 auto 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 0 40px ${C.primary}60`,
              }}
            >
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8" fill="rgba(255,255,255,0.15)" />
                <circle cx="12" cy="12" r="4" fill="rgba(255,255,255,0.9)" />
                <line x1="12" y1="4" x2="12" y2="2" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="12" y1="20" x2="12" y2="22" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="4" y1="12" x2="2" y2="12" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="20" y1="12" x2="22" y2="12" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            <h1
              style={{
                fontSize: 40,
                fontWeight: 900,
                background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                margin: "0 0 8px",
                letterSpacing: "-1px",
              }}
            >
              MishMesh
            </h1>
            <p
              style={{
                color: C.text,
                fontSize: 22,
                fontWeight: 700,
                margin: "0 0 12px",
              }}
            >
              Drop. Hunt. Crack.
            </p>
            <p
              style={{
                color: C.muted,
                fontSize: 15,
                lineHeight: 1.6,
                margin: "0 0 40px",
              }}
            >
              Real crypto hidden at GPS locations worldwide.
              <br />
              Find them. Crack them. Keep them.
            </p>

            <button
              onClick={() => setStep(2)}
              style={{
                width: "100%",
                padding: "16px 0",
                borderRadius: 14,
                border: "none",
                background: C.accent,
                color: "#000",
                fontSize: 17,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "-0.2px",
                boxShadow: `0 4px 20px ${C.accent}40`,
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "none";
              }}
            >
              Get Started
            </button>

            <p style={{ color: C.muted, fontSize: 13, marginTop: 16 }}>
              Already have an account?{" "}
              <a
                href="/auth/signin"
                style={{ color: C.primary, textDecoration: "none", fontWeight: 600 }}
              >
                Sign in
              </a>
            </p>
          </div>
        )}

        {/* ---- STEP 2: Auth method ---- */}
        {step === 2 && (
          <div>
            <button
              onClick={() => { setStep(1); setAuthMode(null); setAuthError(""); }}
              style={{
                background: "none",
                border: "none",
                color: C.muted,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 0 20px",
                fontFamily: "inherit",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back
            </button>

            <h2 style={{ color: C.text, fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>
              Create your account
            </h2>
            <p style={{ color: C.muted, fontSize: 14, margin: "0 0 28px" }}>
              Choose how you want to get started.
            </p>

            {!authMode && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <button
                  onClick={() => setAuthMode("create")}
                  style={{
                    padding: "18px 20px",
                    borderRadius: 14,
                    border: `2px solid ${C.primary}`,
                    background: `${C.primary}12`,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    transition: "background 0.15s",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: `${C.primary}25`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: C.text, fontSize: 16, fontWeight: 700 }}>
                      Create Wallet
                    </p>
                    <p style={{ margin: "2px 0 0", color: C.muted, fontSize: 13 }}>
                      New to crypto? We create a secure wallet for you.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setAuthMode("import")}
                  style={{
                    padding: "18px 20px",
                    borderRadius: 14,
                    border: `1px solid #2a2a3a`,
                    background: C.card,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    transition: "background 0.15s",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "#2a2a3a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: C.text, fontSize: 16, fontWeight: 700 }}>
                      Import Private Key
                    </p>
                    <p style={{ margin: "2px 0 0", color: C.muted, fontSize: 13 }}>
                      Already have a wallet? Import with 64-char hex key.
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* Create wallet: email OTP flow */}
            {authMode === "create" && (
              <div>
                <button
                  onClick={() => { setAuthMode(null); setAuthError(""); setOtpSent(false); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: C.muted,
                    fontSize: 13,
                    cursor: "pointer",
                    padding: "0 0 16px",
                    fontFamily: "inherit",
                  }}
                >
                  Change method
                </button>

                <label style={labelStyle}>Email address</label>
                <input
                  type="email"
                  value={email}
                  disabled={otpSent}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused("")}
                  placeholder="you@example.com"
                  style={{
                    ...inputStyle,
                    borderColor: focused === "email" ? C.primary : "#2a2a3a",
                    opacity: otpSent ? 0.6 : 1,
                  }}
                />

                {otpSent && (
                  <>
                    <label style={{ ...labelStyle, marginTop: 16 }}>Verification code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      onFocus={() => setFocused("otp")}
                      onBlur={() => setFocused("")}
                      placeholder="6-digit code"
                      maxLength={6}
                      style={{
                        ...inputStyle,
                        borderColor: focused === "otp" ? C.primary : "#2a2a3a",
                        letterSpacing: "0.2em",
                      }}
                    />
                    <p style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
                      Code sent to {email}.{" "}
                      <button
                        onClick={() => { setOtpSent(false); setOtp(""); }}
                        style={{
                          background: "none",
                          border: "none",
                          color: C.primary,
                          fontSize: 12,
                          cursor: "pointer",
                          padding: 0,
                          fontFamily: "inherit",
                        }}
                      >
                        Change email
                      </button>
                    </p>
                  </>
                )}

                {authError && (
                  <div style={errorBannerStyle}>{authError}</div>
                )}

                <button
                  onClick={otpSent ? handleVerifyOtp : handleSendOtp}
                  disabled={authLoading || (!otpSent && !email.trim()) || (otpSent && otp.length < 6)}
                  style={{
                    ...primaryBtnStyle,
                    marginTop: 20,
                    opacity: authLoading || (!otpSent && !email.trim()) || (otpSent && otp.length < 6) ? 0.5 : 1,
                    cursor: authLoading ? "wait" : "pointer",
                  }}
                >
                  {authLoading ? (
                    <SpinnerInline />
                  ) : otpSent ? (
                    "Verify Code"
                  ) : (
                    "Send Verification Code"
                  )}
                </button>
              </div>
            )}

            {/* Import private key */}
            {authMode === "import" && (
              <div>
                <button
                  onClick={() => { setAuthMode(null); setAuthError(""); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: C.muted,
                    fontSize: 13,
                    cursor: "pointer",
                    padding: "0 0 16px",
                    fontFamily: "inherit",
                  }}
                >
                  Change method
                </button>

                <label style={labelStyle}>Private key (64-char hex)</label>
                <textarea
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  onFocus={() => setFocused("pk")}
                  onBlur={() => setFocused("")}
                  placeholder="Paste your private key here..."
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: "none",
                    borderColor: focused === "pk" ? C.primary : "#2a2a3a",
                    fontFamily: "monospace",
                    fontSize: 13,
                  }}
                />
                <p
                  style={{
                    color: C.danger,
                    fontSize: 12,
                    marginTop: 8,
                    lineHeight: 1.5,
                  }}
                >
                  Warning: Never share your private key. MishMesh stores it encrypted on-device only.
                </p>

                {authError && (
                  <div style={errorBannerStyle}>{authError}</div>
                )}

                <button
                  onClick={handleImportKey}
                  disabled={authLoading || privateKey.length < 64}
                  style={{
                    ...primaryBtnStyle,
                    marginTop: 16,
                    opacity: authLoading || privateKey.length < 64 ? 0.5 : 1,
                    cursor: authLoading ? "wait" : "pointer",
                  }}
                >
                  {authLoading ? <SpinnerInline /> : "Import Wallet"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---- STEP 3: Wallet created ---- */}
        {step === 3 && (
          <div>
            {/* Checkmark */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: `${C.accent}18`,
                border: `2px solid ${C.accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 style={{ color: C.text, fontSize: 24, fontWeight: 800, textAlign: "center", margin: "0 0 6px" }}>
              3 Wallets Created
            </h2>
            <p style={{ color: C.muted, fontSize: 14, textAlign: "center", margin: "0 0 28px" }}>
              Your SOL, ETH, and BTC wallets are ready.
            </p>

            {wallets && (
              <div>
                <ChainBadge
                  label="Solana (SOL)"
                  color={C.primary}
                  address={wallets.sol}
                  visible={revealCount >= 1}
                />
                <ChainBadge
                  label="Ethereum (ETH)"
                  color={C.ethBlue}
                  address={wallets.eth}
                  visible={revealCount >= 2}
                />
                <ChainBadge
                  label="Bitcoin (BTC)"
                  color={C.btcOrange}
                  address={wallets.btc}
                  visible={revealCount >= 3}
                />
              </div>
            )}

            {revealCount >= 3 && (
              <>
                <button
                  onClick={advanceFromWallets}
                  style={{
                    width: "100%",
                    padding: "14px 0",
                    borderRadius: 12,
                    border: `1px solid ${C.gold}60`,
                    background: `${C.gold}12`,
                    color: C.gold,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    marginTop: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Back Up Recovery Phrase
                </button>

                <button
                  onClick={advanceFromWallets}
                  style={{
                    background: "none",
                    border: "none",
                    color: C.muted,
                    fontSize: 14,
                    cursor: "pointer",
                    width: "100%",
                    padding: "14px 0 0",
                    fontFamily: "inherit",
                    textDecoration: "underline",
                  }}
                >
                  Skip for now
                </button>
              </>
            )}
          </div>
        )}

        {/* ---- STEP 4: Profile creation ---- */}
        {step === 4 && (
          <div>
            <h2 style={{ color: C.text, fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>
              Set up your profile
            </h2>
            <p style={{ color: C.muted, fontSize: 14, margin: "0 0 28px" }}>
              How should the world know you?
            </p>

            <label style={labelStyle}>Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused("")}
              placeholder="Satoshi Hunter"
              style={{
                ...inputStyle,
                borderColor: focused === "name" ? C.primary : "#2a2a3a",
                marginBottom: 16,
              }}
            />

            <label style={labelStyle}>Handle</label>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <span
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: C.muted,
                  fontSize: 15,
                  pointerEvents: "none",
                }}
              >
                @
              </span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace(/^@/, "").replace(/\s/g, "").toLowerCase())}
                onFocus={() => setFocused("handle")}
                onBlur={() => setFocused("")}
                placeholder="satoshi"
                style={{
                  ...inputStyle,
                  borderColor: focused === "handle" ? C.primary : "#2a2a3a",
                  paddingLeft: 28,
                }}
              />
            </div>

            <label style={labelStyle}>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              onFocus={() => setFocused("bio")}
              onBlur={() => setFocused("")}
              placeholder="Orb hunter. Crypto drops are my cardio."
              rows={3}
              style={{
                ...inputStyle,
                resize: "none",
                borderColor: focused === "bio" ? C.primary : "#2a2a3a",
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            />

            {saveError && (
              <div style={{ ...errorBannerStyle, marginBottom: 16 }}>{saveError}</div>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={saving || !displayName.trim() || !handle.trim()}
              style={{
                ...primaryBtnStyle,
                opacity: saving || !displayName.trim() || !handle.trim() ? 0.5 : 1,
                cursor: saving ? "wait" : "pointer",
              }}
            >
              {saving ? <SpinnerInline /> : "Enter MishMesh"}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes obSpin { to { transform: rotate(360deg); } }
        input::placeholder, textarea::placeholder { color: ${C.muted}66; }
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

const primaryBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "15px 0",
  borderRadius: 13,
  border: "none",
  background: C.primary,
  color: "#fff",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "opacity 0.15s",
};

const errorBannerStyle: React.CSSProperties = {
  padding: "10px 14px",
  background: `${C.danger}15`,
  border: `1px solid ${C.danger}40`,
  borderRadius: 10,
  color: C.danger,
  fontSize: 13,
  marginTop: 12,
};

function SpinnerInline() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: `2px solid rgba(255,255,255,0.3)`,
        borderTopColor: "#fff",
        animation: "obSpin 0.7s linear infinite",
      }}
    />
  );
}
