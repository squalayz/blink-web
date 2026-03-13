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
      const inviteCode = typeof window !== "undefined" ? localStorage.getItem("mm_invite_code") : null;
      const res = await fetch("/api/auth/create-wallet", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode || undefined }),
      });
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
    // Clean the key before sending — strip invisible chars, whitespace, smart quotes
    let cleanKey = privateKeyInput
      .trim()
      .replace(/[\u200B\u200C\u200D\uFEFF\u00A0]/g, "")
      .replace(/[""'']/g, "")
      .replace(/\s+/g, "");
    if (!cleanKey) return;
    
    // Add 0x prefix if missing
    if (!cleanKey.startsWith("0x") && !cleanKey.startsWith("0X")) {
      cleanKey = "0x" + cleanKey;
    }

    setStep("logging");
    setError("");
    try {
      const res = await fetch("/api/auth/create-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privateKey: cleanKey }),
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
    if (typeof window !== "undefined") localStorage.removeItem("mm_invite_code");
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
          <div style={{ animation: "fadeUp 0.5s ease-out", position: "relative" }}>
            {/* Background glows */}
            <div style={{ position: "absolute", top: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15), transparent)", filter: "blur(40px)", pointerEvents: "none", zIndex: 0 }} />
            <div style={{ position: "absolute", bottom: -40, right: -20, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.12), transparent)", filter: "blur(35px)", pointerEvents: "none", zIndex: 0 }} />

            {/* Card */}
            <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(160deg, #0f0f1a 0%, #0d0d14 100%)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 24, padding: "40px 28px", textAlign: "center", backdropFilter: "blur(20px)" }}>
              {/* Animated orb */}
              <div style={{ width: 80, height: 80, borderRadius: "50%", margin: "0 auto 20px", position: "relative" }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #a78bfa, #6366f1 50%, #1e1b4b)", boxShadow: "0 0 40px rgba(99,102,241,0.5), 0 0 80px rgba(99,102,241,0.2)", animation: "pulse 3s ease-in-out infinite" }} />
                {/* Specular highlight */}
                <div style={{ position: "absolute", top: 10, left: 12, width: 20, height: 14, borderRadius: "50%", background: "rgba(255,255,255,0.4)", filter: "blur(4px)", pointerEvents: "none" }} />
                {/* Orbit ring */}
                <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: "1px dashed rgba(99,102,241,0.25)", animation: "spin 12s linear infinite", pointerEvents: "none" }} />
              </div>

              {/* Headline */}
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(99,102,241,0.8)", fontWeight: 700, marginBottom: 8 }}>AI AGENT PLATFORM</div>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: "white", letterSpacing: "-0.5px", marginBottom: 8, lineHeight: 1.2 }}>
                <span>Your agent is</span><br /><span>waiting for you</span>
              </h2>
              <p style={{ fontSize: 13, color: "#6b6b80", marginBottom: 28, lineHeight: 1.5 }}>
                <span>Create a wallet in 2 seconds.</span><br /><span>Join the first wave of earning AI agents.</span>
              </p>

              {/* Create Wallet button */}
              <button
                onClick={handleCreateWallet}
                disabled={step !== "choose"}
                onMouseEnter={() => setHoverCreate(true)}
                onMouseLeave={() => setHoverCreate(false)}
                style={{
                  width: "100%", padding: 20, borderRadius: 16, border: "none",
                  background: hoverCreate
                    ? "linear-gradient(135deg, #818cf8, #6366f1, #a855f7)"
                    : "linear-gradient(135deg, #6366f1, #a855f7)",
                  color: "white", fontSize: 17, fontWeight: 800, cursor: "pointer",
                  fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)", minHeight: 64,
                  transform: hoverCreate ? "translateY(-2px)" : "translateY(0)",
                  boxShadow: hoverCreate ? "0 8px 40px rgba(99,102,241,0.6), 0 0 0 3px rgba(99,102,241,0.2)" : "0 4px 30px rgba(99,102,241,0.45)",
                  animation: "mm-cta-pulse 2.5s ease-in-out infinite",
                  WebkitTapHighlightColor: "transparent",
                }}>
                <span style={{ color: "#fbbf24", fontSize: 20 }}>&#10022;</span>
                Create Free Wallet
              </button>

              {/* Badge below button */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, padding: "4px 12px", borderRadius: 20, background: "rgba(48,209,88,0.1)", border: "1px solid rgba(48,209,88,0.2)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#30d158", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
                <span style={{ fontSize: 10, color: "#30d158", fontWeight: 700 }}>2-second setup. No email needed.</span>
              </div>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                <span style={{ fontSize: 11, color: "#6b6b80", whiteSpace: "nowrap" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              </div>

              {/* Log In button */}
              <button
                onClick={() => { setStep("login"); setError(""); }}
                onMouseEnter={() => setHoverLogin(true)}
                onMouseLeave={() => setHoverLogin(false)}
                style={{
                  width: "100%", padding: 16, borderRadius: 14,
                  border: hoverLogin ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.07)",
                  background: hoverLogin ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                  color: "#9ca3af", fontSize: 15, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                  transform: hoverLogin ? "translateY(-1px)" : "none",
                  boxShadow: "none",
                  WebkitTapHighlightColor: "transparent",
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                Log In with Private Key
              </button>

              {error && (
                <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.2)", color: C.hot, fontSize: 13 }}>
                  {error}
                </div>
              )}
            </div>

            {/* Footer below card */}
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {["Wallet address = your identity", "No passwords ever", "Base L2"].map((t) => (
                  <span key={t} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#6b6b80" }}>{t}</span>
                ))}
              </div>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", lineHeight: 1.5 }}>
                Your private key is generated locally and never transmitted.
              </p>
            </div>
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
              <p style={{ fontSize: 13, color: C.hot, fontWeight: 600, marginBottom: 6 }}>! This is shown ONCE. Save it now.</p>
              <p style={{ fontSize: 11, color: C.muted, marginBottom: 20, lineHeight: 1.5 }}>This is your login key. Without it, you cannot access your wallet or funds. Copy it somewhere safe.</p>

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
        @keyframes mm-cta-pulse { 0%,100%{box-shadow:0 4px 30px rgba(99,102,241,0.45)} 50%{box-shadow:0 8px 50px rgba(99,102,241,0.7),0 0 0 4px rgba(99,102,241,0.15)} }
        input::placeholder { color: #3a3a4a }
      `}</style>
    </div>
  );
}
