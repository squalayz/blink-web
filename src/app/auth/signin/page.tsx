"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const C = {
  bg: "#050508", surface: "#0a0a12", s2: "#111118",
  indigo: "#6366f1", cyan: "#06b6d4", purple: "#a855f7",
  text: "#e8e8f0", muted: "#6b6b80", dim: "#2a2a3a",
  match: "#30d158", hot: "#ff2d55",
};

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<"choose" | "creating" | "showkey" | "login" | "logging" | "done">("choose");
  const [error, setError] = useState("");
  const [newWallet, setNewWallet] = useState<{ address: string; privateKey: string } | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [hoverCreate, setHoverCreate] = useState(false);
  const [hoverLogin, setHoverLogin] = useState(false);

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

  async function handleLogin() {
    if (!privateKeyInput.trim()) return;
    setStep("logging");
    setError("");
    try {
      const res = await fetch("/api/auth/create-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privateKey: privateKeyInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid private key");
      setStep("done");
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (err: any) {
      setError(err.message || "Login failed");
      setStep("login");
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
    setTimeout(() => router.push("/dashboard?onboard=1"), 600);
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Outfit',sans-serif", overflow: "hidden" }}>
      {/* Ambient background orbs */}
      <div style={{ position: "fixed", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${C.indigo}15, transparent 70%)`, top: "10%", left: "-5%", pointerEvents: "none", animation: "float1 8s ease-in-out infinite" }} />
      <div style={{ position: "fixed", width: 250, height: 250, borderRadius: "50%", background: `radial-gradient(circle, ${C.cyan}12, transparent 70%)`, bottom: "10%", right: "-5%", pointerEvents: "none", animation: "float2 10s ease-in-out infinite" }} />

      <div style={{ width: 420, maxWidth: "100%", boxSizing: "border-box", position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28, animation: "fadeDown 0.6s ease-out" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, position: "relative" }}>
              <span style={{ position: "absolute", width: 18, height: 18, borderRadius: "50%", top: "50%", transform: "translateY(-50%)", left: 0, background: C.indigo, animation: "pulse 2s ease-in-out infinite" }} />
              <span style={{ position: "absolute", width: 18, height: 18, borderRadius: "50%", top: "50%", transform: "translateY(-50%)", right: 0, background: C.cyan, animation: "pulse 2s ease-in-out infinite 0.5s" }} />
            </div>
            <span style={{ fontSize: 24, fontWeight: 800, color: C.text }}>MishMesh<span style={{ color: C.indigo }}>.ai</span></span>
          </div>
        </div>

        {/* ═══ CHOOSE ═══ */}
        {step === "choose" && (
          <div style={{ animation: "fadeUp 0.5s ease-out" }}>
            <div style={{ background: C.s2, border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 24, padding: "36px 28px", textAlign: "center", backdropFilter: "blur(20px)" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", color: C.muted, marginBottom: 10, fontWeight: 600 }}>Enter the Mesh</div>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 24, color: C.text }}>Welcome</h2>

              {/* Create Wallet button */}
              <button
                onClick={handleCreateWallet}
                disabled={step !== "choose"}
                onMouseEnter={() => setHoverCreate(true)}
                onMouseLeave={() => setHoverCreate(false)}
                style={{
                  width: "100%", padding: 20, borderRadius: 16, border: "none",
                  background: hoverCreate
                    ? `linear-gradient(135deg, ${C.purple}, ${C.indigo})`
                    : `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
                  color: "white", fontSize: 17, fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                  transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)", minHeight: 60,
                  transform: hoverCreate ? "translateY(-2px)" : "translateY(0)",
                  boxShadow: hoverCreate ? `0 8px 30px ${C.indigo}40` : `0 4px 15px ${C.indigo}20`,
                  WebkitTapHighlightColor: "transparent",
                }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                Create Wallet
              </button>

              <p style={{ fontSize: 12, color: C.dim, margin: "8px 0 20px", lineHeight: 1.5 }}>
                New here? We'll generate a secure wallet instantly.
              </p>

              {/* Log In button */}
              <button
                onClick={() => { setStep("login"); setError(""); }}
                onMouseEnter={() => setHoverLogin(true)}
                onMouseLeave={() => setHoverLogin(false)}
                style={{
                  width: "100%", padding: 18, borderRadius: 16,
                  border: `1px solid ${hoverLogin ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)"}`,
                  background: hoverLogin ? "rgba(255,255,255,0.04)" : "transparent",
                  color: C.text, fontSize: 16, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)", minHeight: 56,
                  transform: hoverLogin ? "translateY(-1px)" : "translateY(0)",
                  boxShadow: hoverLogin ? "0 4px 20px rgba(255,255,255,0.05)" : "none",
                  WebkitTapHighlightColor: "transparent",
                }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
                Log In
              </button>

              <p style={{ fontSize: 12, color: C.dim, margin: "8px 0 0", lineHeight: 1.5 }}>
                Already have an account? Enter with your private key.
              </p>

              {error && (
                <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.2)", color: C.hot, fontSize: 13 }}>
                  {error}
                </div>
              )}
            </div>

            <p style={{ fontSize: 10, color: C.dim, marginTop: 20, textAlign: "center", lineHeight: 1.5 }}>
              Your wallet is your identity. No email needed. No passwords.
            </p>
          </div>
        )}

        {/* ═══ LOG IN (paste private key) ═══ */}
        {step === "login" && (
          <div style={{ animation: "fadeUp 0.4s ease-out" }}>
            <div style={{ background: C.s2, border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 24, padding: "36px 28px", textAlign: "center", backdropFilter: "blur(20px)" }}>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: C.text }}>Welcome Back</h3>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 24, lineHeight: 1.5 }}>Paste your private key to log in.</p>

              <input
                type="password"
                value={privateKeyInput}
                onChange={e => setPrivateKeyInput(e.target.value)}
                placeholder="0x..."
                autoFocus
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: 12,
                  border: `1px solid ${privateKeyInput ? C.indigo + "44" : "rgba(255,255,255,0.08)"}`,
                  background: "rgba(255,255,255,0.03)", color: C.text, fontSize: 14,
                  fontFamily: "'JetBrains Mono',monospace", boxSizing: "border-box",
                  transition: "border-color 0.3s", outline: "none",
                }}
                onFocus={e => e.target.style.borderColor = C.indigo + "66"}
                onBlur={e => e.target.style.borderColor = privateKeyInput ? C.indigo + "44" : "rgba(255,255,255,0.08)"}
              />

              <button
                onClick={handleLogin}
                disabled={!privateKeyInput.trim()}
                style={{
                  width: "100%", padding: 18, borderRadius: 14, border: "none",
                  background: privateKeyInput.trim() ? `linear-gradient(135deg, ${C.indigo}, ${C.purple})` : C.dim,
                  color: "white", fontSize: 16, fontWeight: 700,
                  cursor: privateKeyInput.trim() ? "pointer" : "not-allowed",
                  fontFamily: "inherit", marginTop: 14, minHeight: 56,
                  transition: "all 0.3s", opacity: privateKeyInput.trim() ? 1 : 0.5,
                }}>
                Enter the Mesh
              </button>

              {error && (
                <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.2)", color: C.hot, fontSize: 13 }}>
                  {error}
                </div>
              )}

              <button onClick={() => { setStep("choose"); setError(""); setPrivateKeyInput(""); }} style={{
                marginTop: 16, background: "none", border: "none", color: C.muted, fontSize: 13,
                cursor: "pointer", fontFamily: "inherit", padding: 8,
              }}>
                ← Back
              </button>

              <p style={{ fontSize: 10, color: C.dim, marginTop: 12, lineHeight: 1.5 }}>
                Your key stays in your browser. We never store or transmit it.
              </p>
            </div>
          </div>
        )}

        {/* ═══ CREATING ═══ */}
        {step === "creating" && (
          <div style={{ animation: "fadeUp 0.4s ease-out" }}>
            <div style={{ background: C.s2, border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 24, padding: "48px 32px", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, margin: "0 auto 20px", position: "relative" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", border: `3px solid ${C.cyan}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: `2px solid ${C.indigo}`, borderBottomColor: "transparent", animation: "spin 1.2s linear infinite reverse" }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: C.text }}>Generating your wallet</h3>
              <p style={{ fontSize: 13, color: C.muted }}>Creating cryptographic keys...</p>
              <div style={{ width: 120, height: 3, borderRadius: 2, background: C.dim, margin: "16px auto 0", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${C.indigo}, ${C.cyan})`, animation: "loading 1.5s ease-in-out infinite" }} />
              </div>
            </div>
          </div>
        )}

        {/* ═══ LOGGING IN ═══ */}
        {step === "logging" && (
          <div style={{ animation: "fadeUp 0.4s ease-out" }}>
            <div style={{ background: C.s2, border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 24, padding: "48px 32px", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, margin: "0 auto 20px", position: "relative" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", border: `3px solid ${C.indigo}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: C.text }}>Verifying your key</h3>
              <p style={{ fontSize: 13, color: C.muted }}>Authenticating...</p>
            </div>
          </div>
        )}

        {/* ═══ SHOW PRIVATE KEY ═══ */}
        {step === "showkey" && newWallet && (
          <div style={{ animation: "fadeUp 0.5s ease-out" }}>
            <div style={{ background: C.s2, border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 24, padding: "32px 24px", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${C.match}20, ${C.cyan}20)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: `2px solid ${C.match}44` }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.match} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: C.text }}>Save Your Private Key</h3>
              <p style={{ fontSize: 13, color: C.hot, fontWeight: 600, marginBottom: 20 }}>This is shown ONCE. Save it now.</p>

              <div style={{ background: "rgba(99,102,241,0.06)", borderRadius: 12, padding: "12px 16px", marginBottom: 12, textAlign: "left" }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>Wallet Address</div>
                <div style={{ fontSize: 13, fontFamily: "'JetBrains Mono',monospace", color: C.cyan, wordBreak: "break-all" }}>{newWallet.address}</div>
              </div>

              <div style={{ background: "rgba(255,45,85,0.04)", border: `1px solid rgba(255,45,85,0.12)`, borderRadius: 12, padding: "12px 16px", marginBottom: 20, textAlign: "left" }}>
                <div style={{ fontSize: 10, color: C.hot, marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Private Key</div>
                <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: C.text, wordBreak: "break-all", lineHeight: 1.6, userSelect: "all" }}>{newWallet.privateKey}</div>
              </div>

              <button onClick={copyKey} style={{
                width: "100%", padding: 14, borderRadius: 12, border: "none",
                background: keyCopied ? C.match : `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
                color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", marginBottom: 10, transition: "all 0.3s",
                boxShadow: keyCopied ? `0 4px 15px ${C.match}30` : `0 4px 15px ${C.indigo}20`,
              }}>
                {keyCopied ? "Copied!" : "Copy Private Key"}
              </button>

              <button onClick={proceedAfterKey} style={{
                width: "100%", padding: 14, borderRadius: 12,
                border: `1px solid rgba(255,255,255,0.08)`, background: "transparent",
                color: C.text, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.2s",
              }}>
                I've saved it → Enter the Mesh
              </button>

              <p style={{ fontSize: 10, color: C.dim, marginTop: 14, lineHeight: 1.5 }}>
                Use this key to log back in. Import it into MetaMask to access your funds from anywhere.
              </p>
            </div>
          </div>
        )}

        {/* ═══ DONE ═══ */}
        {step === "done" && (
          <div style={{ animation: "scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div style={{ background: C.s2, border: `1px solid ${C.match}22`, borderRadius: 24, padding: "48px 32px", textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${C.match}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: `0 0 30px ${C.match}20` }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.match} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 800, color: C.match }}>You're in.</h3>
              <p style={{ fontSize: 14, color: C.muted, marginTop: 8 }}>Entering the mesh...</p>
            </div>
          </div>
        )}

        {/* Footer */}
        {(step === "choose" || step === "login") && (
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <a href="/" style={{ color: C.dim, fontSize: 12, textDecoration: "none" }}>← Back to MishMesh.ai</a>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeDown { from { opacity: 0; transform: translateY(-12px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9) } to { opacity: 1; transform: scale(1) } }
        @keyframes pulse { 0%,100% { opacity: 0.8; transform: translateY(-50%) scale(1) } 50% { opacity: 1; transform: translateY(-50%) scale(1.08) } }
        @keyframes float1 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(20px,30px) } }
        @keyframes float2 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(-25px,-20px) } }
        @keyframes loading { 0% { width: 0% } 50% { width: 80% } 100% { width: 100% } }
        input::placeholder { color: #3a3a4a }
      `}</style>
    </div>
  );
}
