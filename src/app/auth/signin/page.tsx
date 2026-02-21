"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { SiweMessage } from "siwe";
import { useRouter } from "next/navigation";

const C = {
  bg: "#050508", surface: "#0a0a12", s2: "#111118",
  indigo: "#6366f1", cyan: "#06b6d4", purple: "#a855f7",
  text: "#e8e8f0", muted: "#6b6b80", dim: "#2a2a3a",
  match: "#30d158", hot: "#ff2d55",
};

export default function SignInPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();

  const [step, setStep] = useState<"choose" | "signing" | "creating" | "showkey" | "done">("choose");
  const [error, setError] = useState("");
  const [newWallet, setNewWallet] = useState<{ address: string; privateKey: string } | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [siweAttempted, setSiweAttempted] = useState(false);

  // ── SIWE sign-in flow ──
  const handleSIWE = useCallback(async (addr: string) => {
    setStep("signing");
    setError("");
    setSiweAttempted(true);
    try {
      // 1. Get nonce
      const nonceRes = await fetch("/api/auth/siwe/nonce");
      if (!nonceRes.ok) throw new Error("Failed to get nonce");
      const { nonce } = await nonceRes.json();

      // 2. Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address: addr,
        statement: "Sign in to MishMesh.ai",
        uri: window.location.origin,
        version: "1",
        chainId: 8453, // Base
        nonce,
      });
      const messageStr = message.prepareMessage();

      // 3. Sign
      const signature = await signMessageAsync({ message: messageStr });

      // 4. Verify
      const verifyRes = await fetch("/api/auth/siwe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageStr, signature }),
      });
      const data = await verifyRes.json();

      if (!verifyRes.ok) throw new Error(data.error || "Verification failed");

      setStep("done");
      setTimeout(() => router.push(data.isNewUser ? "/dashboard?onboard=1" : "/dashboard"), 800);
    } catch (err: any) {
      const msg = err.shortMessage || err.message || "Sign-in failed. Try again.";
      // User rejected = don't retry, just show error
      setError(msg);
      setStep("choose");
      // Disconnect so they can cleanly retry
      disconnect();
    }
  }, [signMessageAsync, router, disconnect]);

  // Watch for wallet connection — only auto-trigger ONCE
  useEffect(() => {
    if (isConnected && address && step === "choose" && !siweAttempted) {
      handleSIWE(address);
    }
  }, [isConnected, address, step, siweAttempted, handleSIWE]);

  // ── Create fresh wallet ──
  async function handleCreateWallet() {
    setStep("creating");
    setError("");
    try {
      const res = await fetch("/api/auth/create-wallet", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setNewWallet({ address: data.address, privateKey: data.privateKey });
      setStep("showkey");
    } catch (err: any) {
      setError(err.message || "Wallet creation failed");
      setStep("choose");
    }
  }

  function copyKey() {
    if (newWallet?.privateKey) {
      navigator.clipboard.writeText(newWallet.privateKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  }

  function proceedAfterKey() {
    setStep("done");
    setTimeout(() => router.push("/dashboard?onboard=1"), 500);
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Outfit',sans-serif" }}>
      <div style={{ width: 420, maxWidth: "100%" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, position: "relative" }}>
              <span style={{ position: "absolute", width: 18, height: 18, borderRadius: "50%", top: "50%", transform: "translateY(-50%)", left: 0, background: C.indigo }} />
              <span style={{ position: "absolute", width: 18, height: 18, borderRadius: "50%", top: "50%", transform: "translateY(-50%)", right: 0, background: C.cyan }} />
            </div>
            <span style={{ fontSize: 24, fontWeight: 800, color: C.text }}>MishMesh<span style={{ color: C.indigo }}>.ai</span></span>
          </div>
        </div>

        {/* ═══ CHOOSE (main screen) ═══ */}
        {step === "choose" && (
          <div style={{ background: C.s2, border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 20, padding: "36px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.12em", color: C.muted, marginBottom: 8, fontWeight: 600 }}> Enter the Mesh</div>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24, color: C.text }}>Connect Your Wallet</h2>

            {/* Connect Wallet (RainbowKit) */}
            <button onClick={() => { setSiweAttempted(false); setError(""); openConnectModal?.(); }} style={{
              width: "100%", padding: 16, borderRadius: 14, border: "none",
              background: `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
              color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              transition: "all 0.2s", marginBottom: 12,
            }}>
              <span style={{ fontSize: 20 }}></span>
              Connect Wallet
            </button>

            <div style={{ color: C.dim, fontSize: 13, margin: "16px 0", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              <span>or</span>
              <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* Create New Wallet */}
            <button onClick={handleCreateWallet} style={{
              width: "100%", padding: 16, borderRadius: 14,
              border: `1px solid rgba(255,255,255,0.1)`, background: "transparent",
              color: C.text, fontSize: 16, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              transition: "all 0.2s",
            }}>
              <span style={{ fontSize: 20 }}></span>
              Create New Wallet
            </button>

            <p style={{ fontSize: 13, color: C.dim, marginTop: 20, lineHeight: 1.5 }}>
              No wallet? No problem. We'll create one for you in 2 seconds.
            </p>

            {error && (
              <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.2)", color: C.hot, fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* Social connections info */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <p style={{ fontSize: 12, color: C.dim }}>
                After signing in, connect 𝕏, Instagram, or email in <strong style={{ color: C.muted }}>Settings → Connected Accounts</strong> for enhanced profiles and notifications.
              </p>
            </div>
          </div>
        )}

        {/* ═══ SIGNING ═══ */}
        {step === "signing" && (
          <div style={{ background: C.s2, border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 20, padding: "48px 32px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", border: `3px solid ${C.indigo}`, borderTopColor: "transparent", margin: "0 auto 20px", animation: "spin 1s linear infinite" }} />
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Sign the message</h3>
            <p style={{ fontSize: 14, color: C.muted }}>Confirm in your wallet to prove ownership. No gas fees.</p>
            <button onClick={() => { disconnect(); setStep("choose"); }} style={{
              marginTop: 20, padding: "8px 20px", border: `1px solid rgba(255,255,255,0.1)`,
              borderRadius: 8, background: "transparent", color: C.muted, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>Cancel</button>
          </div>
        )}

        {/* ═══ CREATING ═══ */}
        {step === "creating" && (
          <div style={{ background: C.s2, border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 20, padding: "48px 32px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", border: `3px solid ${C.cyan}`, borderTopColor: "transparent", margin: "0 auto 20px", animation: "spin 1s linear infinite" }} />
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Creating your wallet...</h3>
            <p style={{ fontSize: 14, color: C.muted }}>Generating a fresh Base wallet. 2 seconds.</p>
          </div>
        )}

        {/* ═══ SHOW PRIVATE KEY ═══ */}
        {step === "showkey" && newWallet && (
          <div style={{ background: C.s2, border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 20, padding: "32px 28px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}></div>
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: C.text }}>Save Your Private Key</h3>
            <p style={{ fontSize: 13, color: C.hot, fontWeight: 600, marginBottom: 16 }}> This is shown ONCE. Save it now. We cannot recover it.</p>

            {/* Address */}
            <div style={{ background: "rgba(99,102,241,0.08)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, textAlign: "left" }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Your Wallet Address</div>
              <div style={{ fontSize: 13, fontFamily: "'JetBrains Mono',monospace", color: C.cyan, wordBreak: "break-all" }}>{newWallet.address}</div>
            </div>

            {/* Private Key */}
            <div style={{ background: "rgba(255,45,85,0.06)", border: "1px solid rgba(255,45,85,0.15)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, textAlign: "left" }}>
              <div style={{ fontSize: 11, color: C.hot, marginBottom: 4, fontWeight: 600 }}>Private Key (save this!)</div>
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: C.text, wordBreak: "break-all", lineHeight: 1.5, userSelect: "all" }}>{newWallet.privateKey}</div>
            </div>

            <button onClick={copyKey} style={{
              width: "100%", padding: 12, borderRadius: 10, border: "none",
              background: keyCopied ? C.match : `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
              color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit", marginBottom: 10, transition: "all 0.2s",
            }}>
              {keyCopied ? "✓ Copied!" : "Copy Private Key"}
            </button>

            <button onClick={proceedAfterKey} style={{
              width: "100%", padding: 12, borderRadius: 10,
              border: `1px solid rgba(255,255,255,0.1)`, background: "transparent",
              color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>
              I've saved it → Enter the Mesh
            </button>

            <p style={{ fontSize: 11, color: C.dim, marginTop: 12, lineHeight: 1.5 }}>
              Your private key is your identity. Never share it. Import it into MetaMask or any wallet app to access your funds from anywhere.
            </p>
          </div>
        )}

        {/* ═══ DONE ═══ */}
        {step === "done" && (
          <div style={{ background: C.s2, border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 20, padding: "48px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}></div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: C.match }}>You're in.</h3>
            <p style={{ fontSize: 14, color: C.muted, marginTop: 8 }}>Entering the mesh...</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <a href="/" style={{ color: C.dim, fontSize: 13, textDecoration: "none" }}>← Back to MishMesh.ai</a>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
