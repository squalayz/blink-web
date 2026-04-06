"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";
import { C } from "@/lib/theme";

/* ------------------------------------------------------------------ */
/*  Chain config                                                       */
/* ------------------------------------------------------------------ */
const CHAINS = [
  { key: "sol", label: "Solana", color: "#9945FF" },
  { key: "eth", label: "Ethereum", color: "#627EEA" },
  { key: "btc", label: "Bitcoin", color: "#F7931A" },
] as const;

type ChainKey = (typeof CHAINS)[number]["key"];

interface WalletResult {
  sol_address: string;
  eth_address: string;
  btc_address: string | null;
}

interface PrivateKeys {
  sol_key: string | null;
  eth_key: string | null;
  btc_key: string | null;
}

/* ------------------------------------------------------------------ */
/*  Walkthrough cards                                                  */
/* ------------------------------------------------------------------ */
const WALKTHROUGH_CARDS = [
  {
    icon: "map-pin",
    title: "Find Hidden Crypto",
    body: "Real crypto is hidden at GPS locations near you. Open the map and hunt for glowing orbs dropped by other users.",
    accent: "#9945FF",
    btnColor: "#fff",
  },
  {
    icon: "lightning",
    title: "Walk Up & Crack",
    body: "Get within 100 meters of an orb to unlock it. Tap Crack, sign the transaction, and the crypto transfers directly to your wallet.",
    accent: "#F59E0B",
    btnColor: "#000",
  },
  {
    icon: "drop",
    title: "Drop Your Own Orbs",
    body: "Hide your own crypto anywhere in the world. Set the amount, choose a location, and watch hunters find it on the map.",
    accent: "#14F195",
    btnColor: "#000",
  },
  {
    icon: "trophy",
    title: "Earn While You Explore",
    body: "Every crack earns you Hunter Points. Climb the leaderboard, unlock achievements, and build your reputation as a top hunter.",
    accent: "#F59E0B",
    btnColor: "#000",
  },
];

const WALKTHROUGH_ICONS: Record<string, React.ReactNode> = {
  "map-pin": (
    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  lightning: (
    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  drop: (
    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ */
/*  Sign Up page — 3-step flow with private key reveal                 */
/* ------------------------------------------------------------------ */
export default function SignUpPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState("");

  /* Step 2 state */
  const [completedChains, setCompletedChains] = useState<Set<ChainKey>>(
    new Set()
  );
  const [wallets, setWallets] = useState<WalletResult | null>(null);

  /* Step 3 state — Phase A (addresses) / Phase B (private keys) */
  const [copied, setCopied] = useState<ChainKey | null>(null);
  const [showingKeys, setShowingKeys] = useState(false);
  const [privateKeys, setPrivateKeys] = useState<PrivateKeys | null>(null);
  const [keysLoading, setKeysLoading] = useState(false);
  const [keysSaved, setKeysSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState<ChainKey | null>(null);

  /* Walkthrough state */
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [walkthroughIdx, setWalkthroughIdx] = useState(0);

  /* If already logged in and on step 1, skip to hunt */
  useEffect(() => {
    if (!authLoading && user && step === 1) {
      router.replace("/hunt");
    }
  }, [authLoading, user, router, step]);

  /* ---------------------------------------------------------------- */
  /*  Step 1: Create account                                           */
  /* ---------------------------------------------------------------- */
  async function handleSignUp() {
    if (!email.trim() || password.length < 8 || sending) return;
    setSending(true);
    setError("");

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) throw signUpError;

      /* Move to wallet creation step */
      setStep(2);
      generateWallets();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setSending(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Step 2: Generate wallets                                         */
  /* ---------------------------------------------------------------- */
  const generateWallets = useCallback(async () => {
    try {
      /* Animate chain progress while server generates wallets */
      setCompletedChains((prev) => new Set([...prev, "sol"]));
      await new Promise((r) => setTimeout(r, 500));
      setCompletedChains((prev) => new Set([...prev, "eth"]));
      await new Promise((r) => setTimeout(r, 500));

      /* Server-side wallet generation — private keys never touch the browser */
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const res = await fetch("/api/wallet/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Wallet generation failed");
      }

      const result: WalletResult = await res.json();
      setCompletedChains((prev) => new Set([...prev, "btc"]));
      setWallets(result);

      await new Promise((r) => setTimeout(r, 500));
      setStep(3);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Wallet generation failed"
      );
      setStep(1);
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Step 3 Phase B: Fetch private keys                               */
  /* ---------------------------------------------------------------- */
  async function handleShowKeys() {
    setKeysLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const res = await fetch("/api/wallet/keys", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch keys");
      }

      const keys: PrivateKeys = await res.json();
      setPrivateKeys(keys);
      setShowingKeys(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch keys");
    } finally {
      setKeysLoading(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Copy helpers                                                     */
  /* ---------------------------------------------------------------- */
  function copyAddress(chain: ChainKey) {
    if (!wallets) return;
    const addr =
      chain === "sol"
        ? wallets.sol_address
        : chain === "eth"
        ? wallets.eth_address
        : wallets.btc_address;
    if (addr) navigator.clipboard.writeText(addr);
    setCopied(chain);
    setTimeout(() => setCopied(null), 2000);
  }

  function copyKey(chain: ChainKey) {
    if (!privateKeys) return;
    const key =
      chain === "sol"
        ? privateKeys.sol_key
        : chain === "eth"
        ? privateKeys.eth_key
        : privateKeys.btc_key;
    if (key) navigator.clipboard.writeText(key);
    setCopiedKey(chain);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function truncate(addr: string | null) {
    if (!addr || addr.length <= 14) return addr || "";
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  }

  /* ---------------------------------------------------------------- */
  /*  Loading state                                                    */
  /* ---------------------------------------------------------------- */
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
        <Spinner size={20} />
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
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
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLAnchorElement).style.color = C.text)
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLAnchorElement).style.color = C.muted)
        }
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </a>

      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: C.surface,
          border: `1px solid ${C.border}`,
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
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="2"
                fill="none"
              />
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
        </div>

        {/* Step indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 24,
          }}
        >
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                width: step >= s ? 32 : 8,
                height: 4,
                borderRadius: 2,
                background:
                  step >= s
                    ? `linear-gradient(90deg, ${C.primary}, ${C.accent})`
                    : C.border,
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* ============================================================ */}
        {/*  STEP 1: Email + Password                                     */}
        {/* ============================================================ */}
        {step === 1 && (
          <>
            <h2
              style={{
                color: C.text,
                fontSize: 20,
                fontWeight: 700,
                margin: "0 0 4px",
                textAlign: "center",
              }}
            >
              Create your account
            </h2>
            <p
              style={{
                color: C.muted,
                fontSize: 14,
                margin: "0 0 24px",
                textAlign: "center",
              }}
            >
              Your wallets will be created automatically
            </p>

            <label style={labelStyle}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused("")}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                document.getElementById("su-password")?.focus()
              }
              placeholder="you@example.com"
              autoComplete="email"
              style={{
                ...inputStyle,
                borderColor: focused === "email" ? C.primary : C.border,
                marginBottom: 16,
              }}
            />

            <label style={labelStyle}>Password</label>
            <input
              id="su-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused("")}
              onKeyDown={(e) => e.key === "Enter" && handleSignUp()}
              placeholder="Min 8 characters"
              autoComplete="new-password"
              style={{
                ...inputStyle,
                borderColor: focused === "password" ? C.primary : C.border,
              }}
            />
            {password.length > 0 && password.length < 8 && (
              <p
                style={{
                  color: C.gold,
                  fontSize: 12,
                  margin: "6px 0 0",
                }}
              >
                Password must be at least 8 characters
              </p>
            )}

            {error && <div style={errorBanner}>{error}</div>}

            <button
              onClick={handleSignUp}
              disabled={sending || !email.trim() || password.length < 8}
              style={{
                ...primaryBtn,
                marginTop: 20,
                opacity:
                  sending || !email.trim() || password.length < 8 ? 0.5 : 1,
                cursor:
                  sending || !email.trim() || password.length < 8
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {sending ? (
                <Spinner size={16} />
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              )}
              {sending ? "Creating..." : "Create Account"}
            </button>

            {/* Divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                margin: "20px 0",
              }}
            >
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ color: C.muted, fontSize: 12 }}>or</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            {/* Sign in link */}
            <a
              href="/auth/signin"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "13px 0",
                borderRadius: 12,
                border: `1px solid ${C.muted}30`,
                background: "transparent",
                color: C.muted,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                boxSizing: "border-box",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = `${C.primary}60`;
                (e.currentTarget as HTMLAnchorElement).style.color = C.text;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = `${C.muted}30`;
                (e.currentTarget as HTMLAnchorElement).style.color = C.muted;
              }}
            >
              Already have an account? Sign in
            </a>
          </>
        )}

        {/* ============================================================ */}
        {/*  STEP 2: Creating Wallets                                     */}
        {/* ============================================================ */}
        {step === 2 && (
          <>
            <h2
              style={{
                color: C.text,
                fontSize: 20,
                fontWeight: 700,
                margin: "0 0 4px",
                textAlign: "center",
              }}
            >
              Creating your wallets...
            </h2>
            <p
              style={{
                color: C.muted,
                fontSize: 14,
                margin: "0 0 28px",
                textAlign: "center",
              }}
            >
              Generating secure keys for each chain
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {CHAINS.map((chain) => {
                const done = completedChains.has(chain.key);
                const isActive =
                  !done &&
                  (chain.key === "sol" ||
                    (chain.key === "eth" && completedChains.has("sol")) ||
                    (chain.key === "btc" &&
                      completedChains.has("sol") &&
                      completedChains.has("eth")));

                return (
                  <div
                    key={chain.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "16px 18px",
                      background: done ? `${chain.color}10` : C.s2,
                      border: `1px solid ${done ? `${chain.color}30` : C.border}`,
                      borderRadius: 14,
                      transition: "all 0.3s ease",
                    }}
                  >
                    {/* Chain icon circle */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: done
                          ? chain.color
                          : `${chain.color}20`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.3s ease",
                      }}
                    >
                      {done ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#fff"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <ChainIcon chain={chain.key} color={chain.color} />
                      )}
                    </div>

                    {/* Label */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          color: done ? C.text : C.muted,
                          fontSize: 15,
                          fontWeight: 600,
                          transition: "color 0.3s",
                        }}
                      >
                        {chain.label}
                      </div>
                      <div
                        style={{
                          color: done ? chain.color : `${C.muted}80`,
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {done ? "Wallet created" : isActive ? "Generating..." : "Pending"}
                      </div>
                    </div>

                    {/* Spinner or check */}
                    {isActive && !done && <Spinner size={16} color={chain.color} />}
                  </div>
                );
              })}
            </div>

            {error && (
              <div style={{ ...errorBanner, marginTop: 16 }}>{error}</div>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/*  STEP 3 PHASE A: Wallet Created — Public Addresses             */}
        {/* ============================================================ */}
        {step === 3 && wallets && !showingKeys && (
          <>
            {/* Success icon */}
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
                  margin: "0 auto 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 0 30px ${C.primary}40`,
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            <h2
              style={{
                color: C.text,
                fontSize: 20,
                fontWeight: 700,
                margin: "0 0 4px",
                textAlign: "center",
              }}
            >
              Your wallets are ready
            </h2>
            <p
              style={{
                color: C.muted,
                fontSize: 14,
                margin: "0 0 24px",
                textAlign: "center",
              }}
            >
              3 chains, one account
            </p>

            {/* Address list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CHAINS.map((chain) => {
                const addr =
                  chain.key === "sol"
                    ? wallets.sol_address
                    : chain.key === "eth"
                    ? wallets.eth_address
                    : wallets.btc_address;

                return (
                  <div
                    key={chain.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      background: C.s2,
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                    }}
                  >
                    {/* Chain dot */}
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: chain.color,
                        flexShrink: 0,
                      }}
                    />

                    {/* Chain + address */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: C.muted,
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {chain.label}
                      </div>
                      <div
                        style={{
                          color: C.text,
                          fontSize: 13,
                          fontFamily: "monospace",
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {truncate(addr)}
                      </div>
                    </div>

                    {/* Copy button */}
                    <button
                      onClick={() => copyAddress(chain.key)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 6,
                        cursor: "pointer",
                        color:
                          copied === chain.key ? chain.color : C.muted,
                        transition: "color 0.15s",
                        flexShrink: 0,
                      }}
                    >
                      {copied === chain.key ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="9"
                            y="9"
                            width="13"
                            height="13"
                            rx="2"
                            ry="2"
                          />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Security notice */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginTop: 20,
                padding: "12px 14px",
                background: `${C.gold}08`,
                border: `1px solid ${C.gold}20`,
                borderRadius: 10,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.gold}
                strokeWidth="2"
                style={{ flexShrink: 0, marginTop: 1 }}
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <p
                style={{
                  color: C.muted,
                  fontSize: 12,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Your private keys are encrypted and stored securely.
                Never share them with anyone. You can export them anytime
                from the Wallet tab.
              </p>
            </div>

            {error && <div style={{ ...errorBanner, marginTop: 12 }}>{error}</div>}

            {/* Show My Private Keys button — gold */}
            <button
              onClick={handleShowKeys}
              disabled={keysLoading}
              style={{
                ...primaryBtn,
                marginTop: 20,
                background: C.gold,
                color: "#000",
                boxShadow: `0 4px 16px ${C.gold}40`,
                opacity: keysLoading ? 0.6 : 1,
                cursor: keysLoading ? "wait" : "pointer",
              }}
            >
              {keysLoading ? (
                <Spinner size={16} color="#000" />
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              )}
              {keysLoading ? "Loading..." : "Show My Private Keys"}
            </button>
          </>
        )}

        {/* ============================================================ */}
        {/*  STEP 3 PHASE B: Private Keys Reveal                          */}
        {/* ============================================================ */}
        {step === 3 && wallets && showingKeys && privateKeys && (
          <>
            {/* Warning banner */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "14px 16px",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 12,
                marginBottom: 16,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#EF4444"
                strokeWidth="2"
                style={{ flexShrink: 0, marginTop: 1 }}
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <p
                style={{
                  color: "#EF4444",
                  fontSize: 13,
                  margin: 0,
                  lineHeight: 1.5,
                  fontWeight: 600,
                }}
              >
                Save these keys now — you cannot recover them later
              </p>
            </div>

            <p
              style={{
                color: C.muted,
                fontSize: 13,
                margin: "0 0 20px",
                lineHeight: 1.6,
              }}
            >
              These are your private keys. Anyone with these keys controls your
              funds. Store them somewhere safe — a password manager or written
              down offline.
            </p>

            {/* Private key cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {CHAINS.map((chain) => {
                const key =
                  chain.key === "sol"
                    ? privateKeys.sol_key
                    : chain.key === "eth"
                    ? privateKeys.eth_key
                    : privateKeys.btc_key;

                if (!key) return null;

                return (
                  <div
                    key={chain.key}
                    style={{
                      padding: "14px 16px",
                      background: C.s2,
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                    }}
                  >
                    {/* Chain header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: chain.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          color: C.text,
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {chain.label}
                      </span>
                    </div>

                    {/* Private key text — selectable */}
                    <div
                      style={{
                        padding: "10px 12px",
                        background: C.bg,
                        borderRadius: 8,
                        border: `1px solid ${C.border}`,
                        marginBottom: 8,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontFamily: "monospace",
                          fontSize: 11,
                          color: C.text,
                          wordBreak: "break-all",
                          lineHeight: 1.6,
                          userSelect: "text",
                          WebkitUserSelect: "text",
                        }}
                      >
                        {key}
                      </p>
                    </div>

                    {/* Copy key button */}
                    <button
                      onClick={() => copyKey(chain.key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        width: "100%",
                        padding: "8px 0",
                        borderRadius: 8,
                        border: `1px solid ${copiedKey === chain.key ? chain.color + "50" : C.border}`,
                        background: copiedKey === chain.key ? `${chain.color}10` : "transparent",
                        color: copiedKey === chain.key ? chain.color : C.muted,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                    >
                      {copiedKey === chain.key ? (
                        <>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          Copy Private Key
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Checkbox — I have saved my private keys */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 20,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={keysSaved}
                onChange={(e) => setKeysSaved(e.target.checked)}
                style={{
                  width: 18,
                  height: 18,
                  accentColor: C.primary,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: C.text,
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: 1.4,
                }}
              >
                I have saved my private keys somewhere safe
              </span>
            </label>

            {/* Continue button — disabled until checkbox checked */}
            <button
              onClick={() => {
                if (typeof window !== "undefined") localStorage.removeItem("onboarding_complete");
                router.push("/hunt");
              }}
              disabled={!keysSaved}
              style={{
                ...primaryBtn,
                marginTop: 16,
                opacity: keysSaved ? 1 : 0.4,
                cursor: keysSaved ? "pointer" : "not-allowed",
              }}
            >
              I have saved my keys — continue
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes suSpin { to { transform: rotate(360deg); } }
        input::placeholder { color: ${C.muted}55; }
      `}</style>

      {/* ============================================================ */}
      {/*  WALKTHROUGH OVERLAY                                          */}
      {/* ============================================================ */}
      {showWalkthrough && (() => {
        const card = WALKTHROUGH_CARDS[walkthroughIdx];
        const isLast = walkthroughIdx === WALKTHROUGH_CARDS.length - 1;
        return (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "#0a0a0f",
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            {/* Skip */}
            <button
              onClick={() => router.push("/hunt")}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                fontSize: 14,
                color: "#9CA3AF",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Skip
            </button>

            <div style={{ maxWidth: 360, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* Icon */}
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: `${card.accent}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                  color: card.accent,
                }}
              >
                {WALKTHROUGH_ICONS[card.icon]}
              </div>

              {/* Title */}
              <h2
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  color: "#F9FAFB",
                  textAlign: "center",
                  margin: "0 0 12px",
                }}
              >
                {card.title}
              </h2>

              {/* Body */}
              <p
                style={{
                  fontSize: 15,
                  color: "#9CA3AF",
                  lineHeight: 1.65,
                  textAlign: "center",
                  margin: "0 0 32px",
                  maxWidth: 300,
                }}
              >
                {card.body}
              </p>

              {/* Progress dots */}
              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 28 }}>
                {WALKTHROUGH_CARDS.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: i === walkthroughIdx ? card.accent : "rgba(255,255,255,0.15)",
                    }}
                  />
                ))}
              </div>

              {/* Next / Finish */}
              <button
                onClick={() =>
                  isLast
                    ? router.push("/hunt")
                    : setWalkthroughIdx((i) => i + 1)
                }
                style={{
                  width: "100%",
                  height: 52,
                  borderRadius: 14,
                  background: card.accent,
                  color: card.btnColor,
                  fontSize: 16,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {isLast ? "Start Hunting →" : "Next →"}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function Spinner({ size = 16, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${color}30`,
        borderTopColor: color,
        animation: "suSpin 0.7s linear infinite",
      }}
    />
  );
}

function ChainIcon({ chain, color }: { chain: ChainKey; color: string }) {
  if (chain === "sol") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M4 17.5L8 13.5H20L16 17.5H4Z" fill={color} />
        <path d="M4 6.5L8 10.5H20L16 6.5H4Z" fill={color} />
        <path d="M4 12L8 8H20L16 12H4Z" fill={`${color}80`} />
      </svg>
    );
  }
  if (chain === "eth") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 12L12 16L20 12L12 2Z" fill={color} opacity="0.8" />
        <path d="M12 16L4 12L12 22L20 12L12 16Z" fill={color} />
      </svg>
    );
  }
  /* btc */
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.5 15h-1v1.5h-1V17h-1v1.5h-1V17H8v-1h1v-8H8V7h1.5V5.5h1V7h1V5.5h1V7c1.66 0 3 1.34 3 3 0 .93-.44 1.76-1.12 2.3A2.99 2.99 0 0114.5 15c0 .93-.44 1.76-1 2.3V17zm-1-8.5h-2v3h2c.83 0 1.5-.67 1.5-1.5S13.33 8.5 12.5 8.5zm0 4h-2v3h2c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"
        fill={color}
      />
    </svg>
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
  border: `1px solid ${C.border}`,
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
  color: "#EF4444",
  fontSize: 13,
};
