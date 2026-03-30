"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { Mail, ArrowLeft } from "lucide-react";

const colors = {
  bg: "#0A0A0F",
  surface: "#111118",
  card: "#1C1C28",
  primary: "#9945FF",
  accent: "#14F195",
  gold: "#F59E0B",
  text: "#F9FAFB",
  textMuted: "#9CA3AF",
  border: "#1F2028",
};

type Chain = "solana" | "ethereum" | "bitcoin";

const CHAIN_OPTIONS: {
  id: Chain;
  name: string;
  symbol: string;
  desc: string;
  color: string;
  gradient: string;
  recommended?: boolean;
}[] = [
  {
    id: "solana",
    name: "Solana",
    symbol: "\u25CE",
    desc: "Fast. Cheap. Native SOL.",
    color: "#9945FF",
    gradient: "linear-gradient(135deg, #1a0533, #2d1060)",
    recommended: true,
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "\u2B21",
    desc: "ETH + ERC-20 tokens + NFTs",
    color: "#627EEA",
    gradient: "linear-gradient(135deg, #0a1628, #1a2d5a)",
  },
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "\u20BF",
    desc: "Store of value. Simple.",
    color: "#F7931A",
    gradient: "linear-gradient(135deg, #1a0d00, #3d1f00)",
  },
];

export default function SignInPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [hoverMagicLink, setHoverMagicLink] = useState(false);
  const [hoverGoogle, setHoverGoogle] = useState(false);

  // Chain selection state
  const [showChainStep, setShowChainStep] = useState(false);
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [walletReady, setWalletReady] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      // Check if user already has a preferred chain set
      const checkChain = async () => {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("preferred_chain, sol_address, eth_address, btc_address")
            .eq("id", user.id)
            .single();
          if (data?.preferred_chain && (data.sol_address || data.eth_address || data.btc_address)) {
            router.push("/map");
          } else {
            setShowChainStep(true);
          }
        } catch {
          setShowChainStep(true);
        }
      };
      checkChain();
    }
  }, [authLoading, user, router]);

  async function handleMagicLink() {
    if (!email.trim() || sending) return;
    setSending(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin + "/auth/signin",
        },
      });
      if (error) throw error;
      setSuccessMessage("Check your email for the magic link");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send magic link");
    } finally {
      setSending(false);
    }
  }

  async function handleGoogleSignIn() {
    setErrorMessage("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/auth/signin",
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMessage(err.message || "Google sign-in failed");
    }
  }

  async function handleChainContinue() {
    if (!selectedChain || !user) return;
    setCreatingWallet(true);

    // Simulate wallet creation (in production, Privy creates the embedded wallet)
    // Generate a placeholder address based on chain
    await new Promise((r) => setTimeout(r, 1800));

    const placeholderAddresses: Record<Chain, string> = {
      solana: `${user.id.replace(/-/g, "").slice(0, 32)}`,
      ethereum: `0x${user.id.replace(/-/g, "").slice(0, 40)}`,
      bitcoin: `bc1q${user.id.replace(/-/g, "").slice(0, 30)}`,
    };

    const addr = placeholderAddresses[selectedChain];
    setWalletAddress(addr);

    // Register wallet in backend
    try {
      await fetch("/api/wallet/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          chain: selectedChain,
          address: addr,
        }),
      });
    } catch {}

    setCreatingWallet(false);
    setWalletReady(true);

    setTimeout(() => {
      router.push("/map");
    }, 2000);
  }

  // Show chain selection step after auth
  if (showChainStep && user) {
    // Creating wallet loading screen
    if (creatingWallet) {
      const chainConfig = CHAIN_OPTIONS.find((c) => c.id === selectedChain)!;
      return (
        <div
          style={{
            minHeight: "100vh",
            background: colors.bg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              border: `3px solid ${chainConfig.color}33`,
              borderTopColor: chainConfig.color,
              marginBottom: 24,
            }}
          />
          <p style={{ color: colors.text, fontSize: 18, fontWeight: 600 }}>
            Creating your {chainConfig.name} wallet...
          </p>
          <p style={{ color: colors.textMuted, fontSize: 14, marginTop: 8 }}>
            This only takes a moment
          </p>
        </div>
      );
    }

    // Wallet ready screen
    if (walletReady) {
      const chainConfig = CHAIN_OPTIONS.find((c) => c.id === selectedChain)!;
      return (
        <div
          style={{
            minHeight: "100vh",
            background: colors.bg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: `${chainConfig.color}20`,
              border: `2px solid ${chainConfig.color}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={chainConfig.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </motion.div>
          <p style={{ color: colors.text, fontSize: 20, fontWeight: 700 }}>
            Your wallet is ready
          </p>
          <div
            style={{
              marginTop: 12,
              padding: "8px 16px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: 8,
              fontFamily: "monospace",
              fontSize: 13,
              color: colors.textMuted,
              maxWidth: 320,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {walletAddress}
          </div>
          <p style={{ color: colors.textMuted, fontSize: 13, marginTop: 16 }}>
            Redirecting to map...
          </p>
        </div>
      );
    }

    // Chain selection UI
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            width: "100%",
            maxWidth: 560,
            padding: "40px 32px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span
              style={{
                fontSize: 28,
                fontWeight: 900,
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              MishMesh
            </span>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: colors.text,
                marginTop: 20,
                marginBottom: 8,
              }}
            >
              Choose your chain
            </h1>
            <p style={{ fontSize: 14, color: colors.textMuted, margin: 0 }}>
              Select the blockchain for your primary wallet.
            </p>
          </div>

          {/* Chain cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 14,
              marginBottom: 28,
            }}
          >
            {CHAIN_OPTIONS.map((c) => {
              const selected = selectedChain === c.id;
              return (
                <motion.button
                  key={c.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedChain(c.id)}
                  style={{
                    padding: "28px 16px 24px",
                    borderRadius: 16,
                    border: selected ? `2px solid ${c.color}` : `2px solid ${colors.border}`,
                    background: c.gradient,
                    cursor: "pointer",
                    outline: "none",
                    textAlign: "center",
                    position: "relative",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    boxShadow: selected ? `0 0 20px ${c.color}33` : "none",
                  }}
                >
                  {c.recommended && (
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        background: "rgba(20,241,149,0.15)",
                        color: colors.accent,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 8,
                        letterSpacing: "0.03em",
                      }}
                    >
                      Recommended
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 36,
                      color: c.color,
                      lineHeight: 1,
                      marginBottom: 12,
                    }}
                  >
                    {c.symbol}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 6 }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.4 }}>
                    {c.desc}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Continue button */}
          <button
            onClick={handleChainContinue}
            disabled={!selectedChain}
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 12,
              border: "none",
              background: selectedChain
                ? CHAIN_OPTIONS.find((c) => c.id === selectedChain)!.color
                : colors.border,
              color: selectedChain ? "#fff" : colors.textMuted,
              fontSize: 16,
              fontWeight: 700,
              cursor: selectedChain ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              transition: "background 0.2s",
            }}
          >
            Continue
          </button>

          <p
            style={{
              fontSize: 12,
              color: colors.textMuted,
              textAlign: "center",
              marginTop: 16,
              marginBottom: 0,
            }}
          >
            You can add more chains later in your wallet settings
          </p>
        </motion.div>
      </div>
    );
  }

  if (!authLoading && user && !showChainStep) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* Back arrow */}
      <a
        href="/"
        style={{
          position: "fixed",
          top: 24,
          left: 24,
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: colors.textMuted,
          textDecoration: "none",
          fontSize: 14,
          fontWeight: 500,
          zIndex: 10,
          transition: "color 0.2s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color = colors.text)
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = colors.textMuted)
        }
      >
        <ArrowLeft size={18} />
        <span>Back</span>
      </a>

      {/* Center card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: 420,
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: 40,
          boxSizing: "border-box",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center" }}>
          <span
            style={{
              fontSize: 28,
              fontWeight: 900,
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            MishMesh
          </span>
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: colors.text,
            textAlign: "center",
            marginTop: 24,
            marginBottom: 0,
          }}
        >
          Welcome to MishMesh
        </h1>

        {/* Subtext */}
        <p
          style={{
            fontSize: 14,
            color: colors.textMuted,
            textAlign: "center",
            marginTop: 8,
            marginBottom: 28,
          }}
        >
          Sign in to hunt and drop orbs
        </p>

        {/* Email label */}
        <label
          htmlFor="signin-email"
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            color: colors.text,
            marginBottom: 8,
          }}
        >
          Email address
        </label>

        {/* Email input */}
        <input
          id="signin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleMagicLink();
          }}
          placeholder="you@example.com"
          autoComplete="email"
          style={{
            width: "100%",
            padding: "14px 16px",
            background: colors.card,
            border: `1px solid ${emailFocused ? colors.primary : colors.border}`,
            borderRadius: 10,
            color: colors.text,
            fontSize: 16,
            fontFamily: "inherit",
            boxSizing: "border-box",
            outline: "none",
            transition: "border-color 0.2s",
          }}
        />

        {/* Send Magic Link button */}
        <button
          onClick={handleMagicLink}
          disabled={sending || !email.trim()}
          onMouseEnter={() => setHoverMagicLink(true)}
          onMouseLeave={() => setHoverMagicLink(false)}
          style={{
            width: "100%",
            padding: 14,
            marginTop: 16,
            borderRadius: 10,
            border: "none",
            background:
              sending || !email.trim()
                ? `${colors.primary}66`
                : hoverMagicLink
                  ? "#A855FF"
                  : colors.primary,
            color: "white",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: sending || !email.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "background 0.2s, transform 0.15s",
            transform: hoverMagicLink && !sending && email.trim() ? "translateY(-1px)" : "none",
            opacity: sending || !email.trim() ? 0.6 : 1,
          }}
        >
          {sending ? (
            <span
              style={{
                display: "inline-block",
                width: 18,
                height: 18,
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "white",
                borderRadius: "50%",
                animation: "signin-spin 0.7s linear infinite",
              }}
            />
          ) : (
            <Mail size={18} />
          )}
          {sending ? "Sending..." : "Send Magic Link"}
        </button>

        {/* Success message */}
        {successMessage && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
              borderRadius: 10,
              background: `${colors.accent}15`,
              border: `1px solid ${colors.accent}33`,
              color: colors.accent,
              fontSize: 13,
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            {successMessage}
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#EF4444",
              fontSize: 13,
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            margin: "24px 0",
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: colors.border,
            }}
          />
          <span
            style={{
              fontSize: 13,
              color: colors.textMuted,
              whiteSpace: "nowrap",
            }}
          >
            or
          </span>
          <div
            style={{
              flex: 1,
              height: 1,
              background: colors.border,
            }}
          />
        </div>

        {/* Continue with Google */}
        <button
          onClick={handleGoogleSignIn}
          onMouseEnter={() => setHoverGoogle(true)}
          onMouseLeave={() => setHoverGoogle(false)}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 10,
            border: `1px solid ${hoverGoogle ? colors.textMuted + "44" : colors.border}`,
            background: hoverGoogle ? "rgba(255,255,255,0.03)" : "transparent",
            color: colors.text,
            fontSize: 16,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transition: "all 0.2s",
          }}
        >
          {/* Google G icon */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 48 48"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
          Continue with Google
        </button>

        {/* Bottom text */}
        <p
          style={{
            fontSize: 13,
            color: colors.textMuted,
            textAlign: "center",
            marginTop: 24,
            marginBottom: 0,
          }}
        >
          No wallet needed. We create one for you.
        </p>
      </motion.div>

      {/* Spinner keyframe */}
      <style>{`
        @keyframes signin-spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder {
          color: ${colors.textMuted}88;
        }
      `}</style>
    </div>
  );
}
