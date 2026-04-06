"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";

/* ------------------------------------------------------------------ */
/*  Colors                                                             */
/* ------------------------------------------------------------------ */
const C = {
  bg: "#0A0A0F",
  surface: "#111118",
  card: "#1C1C28",
  primary: "#9945FF",
  accent: "#14F195",
  gold: "#F7931A",
  rareBlue: "#627EEA",
  text: "#F9FAFB",
  muted: "#9CA3AF",
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Step = "hero" | "authMethod" | "walletGen" | "keyReveal" | "profileSetup" | "walkthrough";

interface WalletData {
  access_token: string;
  refresh_token: string;
  sol_address: string;
  eth_address: string;
  btc_address: string;
  sol_private_key: string;
  eth_private_key: string;
  btc_private_key: string;
  user?: { id: string; username: string };
}

/* ------------------------------------------------------------------ */
/*  CSS Keyframes                                                      */
/* ------------------------------------------------------------------ */
const keyframes = `
@keyframes particleFloat {
  0% { transform: translateY(0); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 0.8; }
  100% { transform: translateY(-100vh); opacity: 0; }
}
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
@keyframes orbPulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 0.8; }
}
@keyframes globeRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes orbitDot {
  from { transform: rotate(0deg) translateX(80px) rotate(0deg); }
  to { transform: rotate(360deg) translateX(80px) rotate(-360deg); }
}
@keyframes slideInRight {
  from { transform: translateX(60px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes fadeUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes pulseDot {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.5); }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
@keyframes expandRing {
  0% { transform: scale(0.5); opacity: 0.8; }
  100% { transform: scale(2.5); opacity: 0; }
}
@keyframes slideLeft {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes slideRight {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
input::placeholder { color: #9CA3AF66; }
`;

/* ------------------------------------------------------------------ */
/*  Particles for hero                                                 */
/* ------------------------------------------------------------------ */
function makeParticles(count: number) {
  const colors = [C.primary, C.accent, C.gold, C.rareBlue, "#EC4899"];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 3 + Math.random() * 5,
    duration: 6 + Math.random() * 10,
    delay: Math.random() * 8,
    color: colors[i % colors.length],
  }));
}

const particles = makeParticles(22);

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [step, setStep] = useState<Step>("hero");
  const [orbCount, setOrbCount] = useState<number | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [genError, setGenError] = useState("");
  const [chainStatus, setChainStatus] = useState<("idle" | "loading" | "done")[]>(["idle", "idle", "idle"]);
  const [revealedKeys, setRevealedKeys] = useState([false, false, false]);
  const [keysSaved, setKeysSaved] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [usernameShake, setUsernameShake] = useState(false);
  const [walkthroughPage, setWalkthroughPage] = useState(0);
  const [wtDirection, setWtDirection] = useState<"left" | "right">("left");
  const [showKeyImport, setShowKeyImport] = useState(false);
  const [importKey, setImportKey] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check auth on mount
  useEffect(() => {
    if (loading) return;
    if (!user) return;
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.username) router.push("/hunt");
      });
  }, [user, loading, router]);

  // Orb counter
  // Fetch real orb count from Supabase
  useEffect(() => {
    async function fetchOrbCount() {
      const { count } = await supabase
        .from("orbs")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "claimed"]);
      if (typeof count === "number") setOrbCount(count);
    }
    fetchOrbCount();
    // Refresh every 60s
    const iv = setInterval(fetchOrbCount, 60000);
    return () => clearInterval(iv);
  }, []);

  // Username validation
  const usernameValid = /^[a-zA-Z0-9._]{3,20}$/.test(username);

  // Avatar handler
  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  }, []);

  // Wallet generation
  const generateWallets = useCallback(async () => {
    setStep("walletGen");
    setGenError("");
    setChainStatus(["idle", "idle", "idle"]);

    try {
      const res = await fetch("/api/auth/create-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: `user_${Date.now()}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Wallet creation failed");

      // Animate chain statuses
      setChainStatus(["loading", "idle", "idle"]);
      await new Promise((r) => setTimeout(r, 400));
      setChainStatus(["done", "idle", "idle"]);

      await new Promise((r) => setTimeout(r, 300));
      setChainStatus(["done", "loading", "idle"]);
      await new Promise((r) => setTimeout(r, 300));
      setChainStatus(["done", "done", "idle"]);

      await new Promise((r) => setTimeout(r, 300));
      setChainStatus(["done", "done", "loading"]);
      await new Promise((r) => setTimeout(r, 300));
      setChainStatus(["done", "done", "done"]);

      // Set session
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      setWalletData(data);
      await new Promise((r) => setTimeout(r, 600));
      setStep("keyReveal");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setGenError(msg);
    }
  }, []);

  // Profile save
  const saveProfile = useCallback(async () => {
    if (!usernameValid || !walletData?.user?.id) return;
    setProfileSaving(true);
    const userId = walletData.user.id;

    let avatarUrl = "";
    if (avatarFile) {
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(`${userId}/avatar.jpg`, avatarFile, { upsert: true });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(`${userId}/avatar.jpg`);
        avatarUrl = urlData.publicUrl;
      }
    }

    await supabase.from("profiles").upsert({
      id: userId,
      user_id: userId,
      username: username.toLowerCase(),
      handle: username.toLowerCase(),
      display_name: displayName || username,
      bio,
      avatar_url: avatarUrl || null,
      onboarded: true,
    });

    setProfileSaving(false);
    setStep("walkthrough");
  }, [usernameValid, walletData, avatarFile, username, displayName, bio]);

  // Copy to clipboard
  const copyKey = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  /* ================================================================ */
  /*  Shared styles                                                    */
  /* ================================================================ */
  const fullScreen: React.CSSProperties = {
    minHeight: "100vh",
    background: C.bg,
    color: C.text,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
  };

  const centerCol: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px",
    minHeight: "100vh",
    position: "relative",
    zIndex: 2,
  };

  const primaryBtn = (disabled = false): React.CSSProperties => ({
    width: "100%",
    maxWidth: 380,
    height: 58,
    borderRadius: 16,
    border: "none",
    background: disabled
      ? "#333"
      : `linear-gradient(135deg, ${C.primary}, #7C3AED)`,
    color: disabled ? "#666" : "#fff",
    fontSize: 17,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    position: "relative",
    overflow: "hidden",
    boxShadow: disabled ? "none" : `0 0 30px ${C.primary}44`,
    letterSpacing: 0.3,
  });

  const backBtn: React.CSSProperties = {
    position: "absolute",
    top: 16,
    left: 16,
    background: "none",
    border: "none",
    color: C.muted,
    fontSize: 28,
    cursor: "pointer",
    zIndex: 10,
    padding: 8,
  };

  const pill = (color: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 14px",
    borderRadius: 20,
    border: `1px solid ${color}33`,
    background: `${color}0F`,
    color,
    fontSize: 13,
    fontWeight: 600,
  });

  const cardStyle: React.CSSProperties = {
    background: C.card,
    borderRadius: 16,
    padding: "16px 20px",
    width: "100%",
    maxWidth: 380,
    border: `1px solid rgba(255,255,255,0.06)`,
  };

  /* ================================================================ */
  /*  HERO STEP                                                        */
  /* ================================================================ */
  if (step === "hero") {
    return (
      <div style={fullScreen}>
        <style>{keyframes}</style>

        {/* Particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.left}%`,
              bottom: -10,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: p.color,
              animation: `particleFloat ${p.duration}s linear ${p.delay}s infinite`,
              opacity: 0,
              zIndex: 1,
            }}
          />
        ))}

        <div style={centerCol}>
          {/* Globe SVG */}
          <div
            style={{
              width: 200,
              height: 200,
              position: "relative",
              marginBottom: 32,
              animation: "fadeUp 0.8s ease-out",
            }}
          >
            <svg viewBox="0 0 200 200" width="200" height="200">
              <defs>
                <filter id="purpleGlow">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke={C.primary}
                strokeWidth="1.5"
                opacity="0.6"
                filter="url(#purpleGlow)"
              />
              {/* Latitude lines */}
              <ellipse cx="100" cy="70" rx="70" ry="12" fill="none" stroke={C.primary} strokeWidth="0.7" opacity="0.3" />
              <ellipse cx="100" cy="100" rx="80" ry="15" fill="none" stroke={C.primary} strokeWidth="0.7" opacity="0.3" />
              <ellipse cx="100" cy="130" rx="70" ry="12" fill="none" stroke={C.primary} strokeWidth="0.7" opacity="0.3" />
              {/* Longitude lines */}
              <ellipse cx="100" cy="100" rx="30" ry="80" fill="none" stroke={C.primary} strokeWidth="0.7" opacity="0.3" />
              <ellipse cx="100" cy="100" rx="60" ry="80" fill="none" stroke={C.primary} strokeWidth="0.7" opacity="0.3" />
              {/* Rotating ring */}
              <circle
                cx="100"
                cy="100"
                r="92"
                fill="none"
                stroke={C.accent}
                strokeWidth="1"
                strokeDasharray="8 12"
                opacity="0.5"
                style={{ transformOrigin: "100px 100px", animation: "globeRotate 20s linear infinite" }}
              />
            </svg>
          </div>

          {/* Counter badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 20,
              background: "rgba(20, 241, 149, 0.08)",
              border: "1px solid rgba(20, 241, 149, 0.2)",
              marginBottom: 24,
              animation: "fadeUp 0.8s ease-out 0.2s both",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: C.accent,
                animation: "pulseDot 2s ease-in-out infinite",
              }}
            />
            <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>
              {orbCount !== null ? orbCount.toLocaleString() : "—"} orbs hidden worldwide
            </span>
          </div>

          {/* Headlines */}
          <h1
            style={{
              fontSize: 34,
              fontWeight: 900,
              margin: 0,
              textAlign: "center",
              animation: "fadeUp 0.8s ease-out 0.3s both",
            }}
          >
            The world is hiding
          </h1>
          <h1
            style={{
              fontSize: 34,
              fontWeight: 900,
              margin: "4px 0 12px",
              color: C.accent,
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
              animation: "fadeUp 0.8s ease-out 0.4s both",
            }}
          >
            Go find it.
            <span
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "50%",
                height: "100%",
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                animation: "shimmer 3s ease-in-out infinite",
              }}
            />
          </h1>

          <p
            style={{
              fontSize: 14,
              color: C.muted,
              margin: "0 0 20px",
              textAlign: "center",
              animation: "fadeUp 0.8s ease-out 0.5s both",
            }}
          >
            Real GPS. Real crypto. Real adventure.
          </p>

          {/* Chain pills */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 32,
              animation: "fadeUp 0.8s ease-out 0.6s both",
            }}
          >
            <span style={pill(C.gold)}>BTC</span>
            <span style={pill(C.rareBlue)}>ETH</span>
            <span style={pill(C.primary)}>SOL</span>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => setStep("authMethod")}
            style={{
              ...primaryBtn(),
              animation: "fadeUp 0.8s ease-out 0.7s both",
            }}
          >
            <span style={{ position: "relative", zIndex: 2 }}>Start Hunting &rarr;</span>
            <span
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "40%",
                height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                animation: "shimmer 3s ease-in-out infinite",
              }}
            />
          </button>

          <p
            style={{
              fontSize: 12,
              color: "#6B7280",
              marginTop: 16,
              textAlign: "center",
              animation: "fadeUp 0.8s ease-out 0.8s both",
            }}
          >
            Free to join. Your wallet is created automatically.
          </p>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  AUTH METHOD STEP                                                  */
  /* ================================================================ */
  if (step === "authMethod") {
    return (
      <div style={fullScreen}>
        <style>{keyframes}</style>
        <button onClick={() => setStep("hero")} style={backBtn}>&larr;</button>

        <div style={centerCol}>
          {/* Pulsing wallet orb */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${C.primary}66, ${C.primary}11)`,
              animation: "orbPulse 3s ease-in-out infinite",
              marginBottom: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.5">
              <rect x="2" y="6" width="20" height="14" rx="3" />
              <path d="M16 12h2" />
              <path d="M2 10h20" />
            </svg>
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0, textAlign: "center" }}>
            Your wallets.
          </h1>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: "2px 0 16px", textAlign: "center" }}>
            Your keys.
          </h1>
          <p style={{ fontSize: 15, color: C.muted, textAlign: "center", margin: "0 0 24px", maxWidth: 320 }}>
            We generate SOL, ETH & BTC wallets instantly. No email needed.
          </p>

          {/* Chain badges */}
          <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
            <span style={pill(C.primary)}>SOL</span>
            <span style={pill(C.rareBlue)}>ETH</span>
            <span style={pill(C.gold)}>BTC</span>
          </div>

          {/* Security notes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32, width: "100%", maxWidth: 380 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: C.surface }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span style={{ fontSize: 13, color: C.muted }}>Non-custodial -- keys never leave your device</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: C.surface }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
              <span style={{ fontSize: 13, color: C.muted }}>Recover anytime with your private key</span>
            </div>
          </div>

          {/* Primary button */}
          <button onClick={generateWallets} style={primaryBtn()}>
            <span style={{ position: "relative", zIndex: 2 }}>Generate My Wallets</span>
            <span style={{ position: "absolute", top: 0, left: 0, width: "40%", height: "100%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)", animation: "shimmer 3s ease-in-out infinite" }} />
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "24px 0", width: "100%", maxWidth: 380 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            <span style={{ fontSize: 13, color: "#6B7280" }}>returning?</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          </div>

          {/* Secondary button */}
          <button
            onClick={() => setShowKeyImport(true)}
            style={{
              width: "100%",
              maxWidth: 380,
              height: 48,
              borderRadius: 12,
              border: `1px solid ${C.gold}44`,
              background: `${C.gold}0F`,
              color: C.gold,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign in with Private Key
          </button>

          {/* Key import modal */}
          {showKeyImport && (
            <div style={{ ...cardStyle, marginTop: 20 }}>
              <input
                placeholder="Paste your private key..."
                value={importKey}
                onChange={(e) => setImportKey(e.target.value)}
                style={{
                  width: "100%",
                  background: C.bg,
                  border: `1px solid rgba(255,255,255,0.1)`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  color: C.text,
                  fontSize: 14,
                  fontFamily: "monospace",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button
                  onClick={() => { console.log("Import key:", importKey); setShowKeyImport(false); }}
                  style={{ flex: 1, height: 40, borderRadius: 10, border: "none", background: C.gold, color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                >
                  Import
                </button>
                <button
                  onClick={() => setShowKeyImport(false)}
                  style={{ flex: 1, height: 40, borderRadius: 10, border: `1px solid rgba(255,255,255,0.1)`, background: "transparent", color: C.muted, fontWeight: 600, fontSize: 14, cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  WALLET GEN STEP                                                  */
  /* ================================================================ */
  if (step === "walletGen") {
    const chains = [
      { name: "SOL Wallet", color: C.primary, icon: "S" },
      { name: "ETH Wallet", color: C.rareBlue, icon: "E" },
      { name: "BTC Wallet", color: C.gold, icon: "B" },
    ];

    return (
      <div style={fullScreen}>
        <style>{keyframes}</style>
        <div style={centerCol}>
          {/* Pulsing icon */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${C.primary}55, transparent)`,
              animation: "orbPulse 2s ease-in-out infinite",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.5">
              <rect x="2" y="6" width="20" height="14" rx="3" />
              <path d="M16 12h2" />
              <path d="M2 10h20" />
            </svg>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px", textAlign: "center" }}>
            Create Your Wallet
          </h1>
          <p style={{ fontSize: 14, color: C.muted, textAlign: "center", margin: "0 0 32px", maxWidth: 320 }}>
            We generate 3 blockchain wallets and a master private key.
          </p>

          {/* Chain rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 380 }}>
            {chains.map((chain, i) => (
              <div
                key={chain.name}
                style={{
                  ...cardStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  maxWidth: "100%",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: `${chain.color}22`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 800,
                    color: chain.color,
                  }}
                >
                  {chain.icon}
                </div>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{chain.name}</span>
                <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {chainStatus[i] === "idle" && (
                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid rgba(255,255,255,0.15)` }} />
                  )}
                  {chainStatus[i] === "loading" && (
                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${chain.color}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                  )}
                  {chainStatus[i] === "done" && (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>

          {genError && (
            <div style={{ marginTop: 20, padding: "14px 18px", borderRadius: 12, background: "#EF444422", border: "1px solid #EF444444", color: "#EF4444", fontSize: 14, maxWidth: 380, width: "100%", textAlign: "center" }}>
              {genError}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  KEY REVEAL STEP                                                  */
  /* ================================================================ */
  if (step === "keyReveal") {
    const keys = [
      { label: "SOL Private Key", value: walletData?.sol_private_key || "", color: C.primary },
      { label: "ETH Private Key", value: walletData?.eth_private_key || "", color: C.rareBlue },
      { label: "BTC Private Key", value: walletData?.btc_private_key || "", color: C.gold },
    ];

    return (
      <div style={fullScreen}>
        <style>{keyframes}</style>
        <div style={{ ...centerCol, justifyContent: "flex-start", paddingTop: 60 }}>
          {/* Warning card */}
          <div
            style={{
              background: "#EF444418",
              border: "1px solid #EF444444",
              borderRadius: 16,
              padding: "18px 20px",
              width: "100%",
              maxWidth: 380,
              marginBottom: 24,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#EF4444", margin: "0 0 6px" }}>
              Save Your Private Keys
            </h3>
            <p style={{ fontSize: 13, color: "#EF4444CC", margin: 0 }}>
              Shown once only. If you lose these, you lose access forever.
            </p>
          </div>

          {/* Key cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 380, marginBottom: 24 }}>
            {keys.map((k, i) => (
              <div key={k.label} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: k.color }}>{k.label}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => {
                        const next = [...revealedKeys];
                        next[i] = !next[i];
                        setRevealedKeys(next);
                      }}
                      style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", fontWeight: 600, padding: 0 }}
                    >
                      {revealedKeys[i] ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => copyKey(k.value)}
                      style={{ background: "none", border: "none", color: C.accent, fontSize: 12, cursor: "pointer", fontWeight: 600, padding: 0 }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    color: C.muted,
                    wordBreak: "break-all",
                    background: C.bg,
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  {revealedKeys[i] ? k.value : `${k.value.slice(0, 8)}${"*".repeat(20)}${k.value.slice(-6)}`}
                </div>
              </div>
            ))}
          </div>

          {/* Checkbox */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 24,
              cursor: "pointer",
              fontSize: 14,
              color: C.text,
            }}
          >
            <input
              type="checkbox"
              checked={keysSaved}
              onChange={(e) => setKeysSaved(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: C.accent }}
            />
            I have saved my private keys
          </label>

          {/* Continue */}
          <button
            disabled={!keysSaved}
            onClick={() => setStep("profileSetup")}
            style={{
              ...primaryBtn(!keysSaved),
              background: keysSaved
                ? `linear-gradient(135deg, ${C.accent}, #0D9668)`
                : "#333",
            }}
          >
            Continue to Profile Setup &rarr;
          </button>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  PROFILE SETUP STEP                                               */
  /* ================================================================ */
  if (step === "profileSetup") {
    return (
      <div style={{ ...fullScreen, overflowY: "auto" }}>
        <style>{keyframes}</style>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "60px 24px 40px",
            minHeight: "100vh",
          }}
        >
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 6px", textAlign: "center" }}>
            Create Your Profile
          </h1>
          <p style={{ fontSize: 14, color: C.muted, margin: "0 0 32px", textAlign: "center" }}>
            Choose a username to get started
          </p>

          {/* Avatar */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: C.card,
              border: `3px solid transparent`,
              backgroundImage: avatarPreview ? `url(${avatarPreview})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              marginBottom: 24,
              position: "relative",
              outline: `3px solid ${C.primary}`,
              outlineOffset: 2,
            }}
          >
            {!avatarPreview && (
              <span style={{ fontSize: 28, fontWeight: 800, color: C.primary }}>
                {username ? username[0].toUpperCase() : "?"}
              </span>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
          </div>

          {/* Username */}
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              marginBottom: 16,
              animation: usernameShake ? "shake 0.4s ease" : undefined,
            }}
          >
            <label style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 6, display: "block" }}>
              Username
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: C.surface,
                borderRadius: 12,
                border: `1px solid ${username.length > 0 ? (usernameValid ? C.accent + "66" : "#EF444466") : "rgba(255,255,255,0.08)"}`,
                overflow: "hidden",
              }}
            >
              <span style={{ padding: "0 0 0 14px", color: C.primary, fontWeight: 700, fontSize: 16 }}>@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._]/g, ""))}
                placeholder="username"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  padding: "14px 12px",
                  color: C.text,
                  fontSize: 16,
                }}
              />
              {username.length > 0 && (
                <span style={{ padding: "0 14px 0 0" }}>
                  {usernameValid ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                </span>
              )}
            </div>
            {username.length > 0 && !usernameValid && (
              <span style={{ fontSize: 11, color: "#EF4444", marginTop: 4, display: "block" }}>
                3-20 chars, letters/numbers/dots/underscores only
              </span>
            )}
          </div>

          {/* Display Name */}
          <div style={{ width: "100%", maxWidth: 380, marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 6, display: "block" }}>
              Display Name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How others see you"
              style={{
                width: "100%",
                background: C.surface,
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "14px",
                color: C.text,
                fontSize: 16,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Bio */}
          <div style={{ width: "100%", maxWidth: 380, marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>Bio</label>
              <span style={{ fontSize: 12, color: C.muted }}>{bio.length}/160</span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              placeholder="Tell the world about yourself..."
              rows={3}
              style={{
                width: "100%",
                background: C.surface,
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "14px",
                color: C.text,
                fontSize: 14,
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Continue */}
          <button
            disabled={!usernameValid || profileSaving}
            onClick={() => {
              if (!usernameValid) {
                setUsernameShake(true);
                setTimeout(() => setUsernameShake(false), 500);
                return;
              }
              saveProfile();
            }}
            style={{
              ...primaryBtn(!usernameValid),
              background: usernameValid
                ? `linear-gradient(135deg, ${C.accent}, #0D9668)`
                : "#333",
            }}
          >
            {profileSaving ? "Saving..." : "Continue \u2192"}
          </button>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  WALKTHROUGH STEP                                                 */
  /* ================================================================ */
  if (step === "walkthrough") {
    const totalPages = 6;
    const goNext = () => {
      if (walkthroughPage < totalPages - 1) {
        setWtDirection("left");
        setWalkthroughPage((p) => p + 1);
      }
    };
    const goBack = () => {
      if (walkthroughPage > 0) {
        setWtDirection("right");
        setWalkthroughPage((p) => p - 1);
      }
    };

    const pageAnim: React.CSSProperties = {
      animation: `${wtDirection === "left" ? "slideLeft" : "slideRight"} 0.35s ease-out`,
    };

    const wtBtn = (label: string, onClick: () => void, gradient?: string): React.CSSProperties => ({
      width: "100%",
      maxWidth: 380,
      height: 54,
      borderRadius: 14,
      border: "none",
      background: gradient || `linear-gradient(135deg, ${C.primary}, #7C3AED)`,
      color: "#fff",
      fontSize: 16,
      fontWeight: 700,
      cursor: "pointer",
      marginTop: 32,
    });

    const renderPage = () => {
      switch (walkthroughPage) {
        /* ---- Page 0: What is MishMesh ---- */
        case 0:
          return (
            <div style={{ ...centerCol, ...pageAnim }}>
              {/* Globe with orbiting dots */}
              <div style={{ width: 160, height: 160, position: "relative", marginBottom: 32 }}>
                <svg viewBox="0 0 160 160" width="160" height="160">
                  <circle cx="80" cy="80" r="50" fill="none" stroke={C.primary} strokeWidth="1.5" opacity="0.5" />
                  <ellipse cx="80" cy="80" rx="50" ry="20" fill="none" stroke={C.primary} strokeWidth="0.7" opacity="0.3" />
                  <ellipse cx="80" cy="80" rx="20" ry="50" fill="none" stroke={C.primary} strokeWidth="0.7" opacity="0.3" />
                </svg>
                {[C.primary, C.accent, C.gold, C.rareBlue, "#EC4899", C.primary, C.accent, C.gold].map((color, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: color,
                      animation: `orbitDot ${5 + i * 0.7}s linear ${i * 0.4}s infinite`,
                      transformOrigin: "0 0",
                    }}
                  />
                ))}
              </div>

              <h2 style={{ fontSize: 28, fontWeight: 900, textAlign: "center", margin: 0 }}>
                The world is full of treasure.
              </h2>
              <h2
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  textAlign: "center",
                  margin: "4px 0 16px",
                  background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Go find it.
              </h2>
              <p style={{ fontSize: 15, color: C.muted, textAlign: "center", maxWidth: 320, lineHeight: 1.5 }}>
                MishMesh lets people drop real crypto and NFTs as Orbs anywhere on Earth. Walk to them. Crack them. Keep what&apos;s inside.
              </p>
              <button onClick={goNext} style={wtBtn("", goNext)}>
                How does it work? &rarr;
              </button>
            </div>
          );

        /* ---- Page 1: Hunt Explained ---- */
        case 1:
          return (
            <div style={{ ...centerCol, ...pageAnim }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#06B6D4", letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>
                HUNT
              </span>
              {/* Target icon with rings */}
              <div style={{ width: 100, height: 100, position: "relative", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="1.5" style={{ animation: "globeRotate 8s linear infinite" }}>
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" fill="#06B6D4" />
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                </svg>
                {[0, 1, 2].map((r) => (
                  <div
                    key={r}
                    style={{
                      position: "absolute",
                      width: 60 + r * 30,
                      height: 60 + r * 30,
                      borderRadius: "50%",
                      border: "1px solid #06B6D466",
                      animation: `expandRing 3s ease-out ${r * 0.8}s infinite`,
                    }}
                  />
                ))}
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 20px", textAlign: "center" }}>
                Hunt Orbs near you
              </h2>
              {[
                { icon: "M", color: "#06B6D4", title: "Find orbs on the map", desc: "Open the Hunt tab to see glowing orbs placed by other users." },
                { icon: "W", color: C.accent, title: "Walk to the orb", desc: "Get within 100 meters. The closer you get, the bigger the pulse." },
                { icon: "T", color: C.gold, title: "Crack it open", desc: "Pay the claim fee and crypto transfers directly to your wallet." },
              ].map((item, i) => (
                <div
                  key={item.title}
                  style={{
                    ...cardStyle,
                    display: "flex",
                    gap: 14,
                    marginBottom: 10,
                    animation: `slideInRight 0.5s ease-out ${0.2 + i * 0.15}s both`,
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}22`, display: "flex", alignItems: "center", justifyContent: "center", color: item.color, fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
              <button onClick={goNext} style={wtBtn("", goNext)}>
                What about dropping? &rarr;
              </button>
            </div>
          );

        /* ---- Page 2: Drop Explained ---- */
        case 2:
          return (
            <div style={{ ...centerCol, ...pageAnim }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: C.primary, letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>
                DROP
              </span>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${C.primary}88, ${C.primary}22)`,
                  animation: "orbPulse 2.5s ease-in-out infinite",
                  marginBottom: 24,
                }}
              />
              <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 8px", textAlign: "center" }}>
                Drop your own Orbs
              </h2>
              <p style={{ fontSize: 14, color: C.muted, textAlign: "center", margin: "0 0 24px", maxWidth: 320 }}>
                Choose a location, set the value, write a message. Your orb goes live instantly.
              </p>
              {[
                { color: C.primary, title: "Crypto Orb", desc: "Drop SOL, ETH, or BTC. First one there wins it." },
                { color: "#06B6D4", title: "NFT Orb", desc: "Place an NFT at a location. Whoever finds it owns it." },
                { color: "#EC4899", title: "Stealth Orb", desc: "Invisible until hunters are 50m away. Ultimate hide and seek." },
              ].map((orb, i) => (
                <div
                  key={orb.title}
                  style={{
                    ...cardStyle,
                    display: "flex",
                    gap: 14,
                    marginBottom: 10,
                    borderColor: `${orb.color}22`,
                    animation: `fadeUp 0.5s ease-out ${0.1 + i * 0.12}s both`,
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${orb.color}22`, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: orb.color, marginBottom: 2 }}>{orb.title}</div>
                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{orb.desc}</div>
                  </div>
                </div>
              ))}
              <button onClick={goNext} style={wtBtn("", goNext)}>
                What about my wallet? &rarr;
              </button>
            </div>
          );

        /* ---- Page 3: Wallet Explained ---- */
        case 3:
          return (
            <div style={{ ...centerCol, ...pageAnim }}>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 20 }}>
                <rect x="2" y="6" width="20" height="14" rx="3" stroke={C.accent} strokeWidth="1.5" />
                <path d="M16 12h2" stroke={C.primary} strokeWidth="1.5" />
                <path d="M2 10h20" stroke={C.accent} strokeWidth="1.5" />
              </svg>
              <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 24px", textAlign: "center" }}>
                Real crypto. Real value.
              </h2>
              {/* Chain circles */}
              <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
                {[
                  { label: "SOL", color: C.primary },
                  { label: "ETH", color: C.rareBlue },
                  { label: "BTC", color: C.gold },
                ].map((c, i) => (
                  <div
                    key={c.label}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      background: `${c.color}22`,
                      border: `2px solid ${c.color}44`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 800,
                      color: c.color,
                      animation: `fadeUp 0.5s ease-out ${i * 0.15}s both`,
                    }}
                  >
                    {c.label}
                  </div>
                ))}
              </div>
              {[
                { color: C.accent, icon: "S", text: "Non-custodial -- only you control your keys" },
                { color: "#06B6D4", icon: "C", text: "All transactions happen on-chain" },
                { color: C.gold, icon: "D", text: "Cracked orb earnings deposit automatically" },
              ].map((f, i) => (
                <div
                  key={f.text}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 18px",
                    borderRadius: 12,
                    background: C.surface,
                    width: "100%",
                    maxWidth: 380,
                    marginBottom: 10,
                    animation: `slideInRight 0.5s ease-out ${0.2 + i * 0.12}s both`,
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${f.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="2">
                      {i === 0 && <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />}
                      {i === 1 && <><circle cx="12" cy="12" r="10" /><path d="M8 12l2 2 4-4" /></>}
                      {i === 2 && <><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></>}
                    </svg>
                  </div>
                  <span style={{ fontSize: 14, color: C.muted }}>{f.text}</span>
                </div>
              ))}
              <button onClick={goNext} style={wtBtn("", goNext)}>
                What else can I do? &rarr;
              </button>
            </div>
          );

        /* ---- Page 4: Profile and Social ---- */
        case 4:
          return (
            <div style={{ ...centerCol, ...pageAnim }}>
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.5" style={{ marginBottom: 20 }}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 4px", textAlign: "center" }}>
                More than just hunting
              </h2>
              <p style={{ fontSize: 14, color: C.muted, margin: "0 0 24px", textAlign: "center" }}>
                A full social crypto experience
              </p>
              {[
                { color: C.primary, title: "Your Profile", desc: "Track stats, badges, and cities conquered." },
                { color: C.gold, title: "Leaderboards", desc: "Compete with hunters worldwide." },
                { color: "#06B6D4", title: "Messages", desc: "When you crack an orb, a chat opens automatically." },
                { color: C.accent, title: "Hex Land", desc: "Claim territory. Earn passive income." },
              ].map((f, i) => (
                <div
                  key={f.title}
                  style={{
                    ...cardStyle,
                    display: "flex",
                    gap: 14,
                    marginBottom: 10,
                    animation: `slideInRight 0.5s ease-out ${0.1 + i * 0.12}s both`,
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${f.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="2">
                      {i === 0 && <><circle cx="12" cy="8" r="4" /><path d="M6 20v-2a6 6 0 0 1 12 0v2" /></>}
                      {i === 1 && <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7" /><path d="M12 14l-3-3h6l-3 3z" /></>}
                      {i === 2 && <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>}
                      {i === 3 && <><polygon points="12 2 19.56 6.5 19.56 15.5 12 20 4.44 15.5 4.44 6.5" /></>}
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{f.title}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{f.desc}</div>
                  </div>
                </div>
              ))}
              <button onClick={goNext} style={wtBtn("", goNext)}>
                I am ready! &rarr;
              </button>
            </div>
          );

        /* ---- Page 5: Let's Go ---- */
        case 5:
          return (
            <div style={{ ...centerCol, ...pageAnim }}>
              {/* Compass with orbiting dots */}
              <div style={{ width: 140, height: 140, position: "relative", marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88" fill={C.primary} stroke={C.primary} />
                </svg>
                {/* Rotating ring */}
                <div
                  style={{
                    position: "absolute",
                    width: 130,
                    height: 130,
                    borderRadius: "50%",
                    border: `2px solid transparent`,
                    borderImage: `linear-gradient(135deg, ${C.primary}, ${C.accent}) 1`,
                    animation: "globeRotate 10s linear infinite",
                  }}
                />
                {/* 16 orbiting dots */}
                {Array.from({ length: 16 }, (_, i) => {
                  const colors = [C.primary, C.accent, C.gold, C.rareBlue, "#EC4899", "#06B6D4", C.primary, C.accent];
                  return (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: colors[i % colors.length],
                        animation: `orbitDot ${4 + i * 0.5}s linear ${i * 0.3}s infinite`,
                        transformOrigin: "0 0",
                      }}
                    />
                  );
                })}
              </div>

              <h2 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px", textAlign: "center" }}>
                Your city is waiting.
              </h2>
              <p style={{ fontSize: 15, color: C.muted, textAlign: "center", maxWidth: 320, lineHeight: 1.5, marginBottom: 28 }}>
                Every orb someone drops is yours to find. Every orb you drop is a gift or a trap.
              </p>

              {/* 3 stat cards */}
              <div style={{ display: "flex", gap: 10, marginBottom: 32, width: "100%", maxWidth: 380 }}>
                {[
                  { value: "3 Wallets", color: C.primary },
                  { value: "100m Range", color: C.accent },
                  { value: "30d Orb Life", color: C.gold },
                ].map((s) => (
                  <div
                    key={s.value}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "14px 8px",
                      borderRadius: 14,
                      background: C.card,
                      border: `1px solid ${s.color}22`,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => router.push("/hunt")}
                style={{
                  ...primaryBtn(),
                  background: `linear-gradient(135deg, #6366F1, #06B6D4)`,
                  boxShadow: "0 0 30px #6366F144",
                }}
              >
                <span style={{ position: "relative", zIndex: 2 }}>Start Hunting &rarr;</span>
                <span style={{ position: "absolute", top: 0, left: 0, width: "40%", height: "100%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)", animation: "shimmer 3s ease-in-out infinite" }} />
              </button>
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <div style={fullScreen}>
        <style>{keyframes}</style>

        {/* Skip */}
        <button
          onClick={() => router.push("/hunt")}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            border: "none",
            color: C.muted,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            zIndex: 10,
          }}
        >
          Skip
        </button>

        {/* Back */}
        {walkthroughPage > 0 && (
          <button onClick={goBack} style={backBtn}>
            &lsaquo;
          </button>
        )}

        {renderPage()}

        {/* Progress bar */}
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 6,
            zIndex: 10,
          }}
        >
          {Array.from({ length: totalPages }, (_, i) => (
            <div
              key={i}
              style={{
                width: walkthroughPage === i ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: walkthroughPage === i ? C.primary : "rgba(255,255,255,0.15)",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* Fallback */
  return (
    <div style={fullScreen}>
      <style>{keyframes}</style>
      <div style={centerCol}>
        <p style={{ color: C.muted }}>Loading...</p>
      </div>
    </div>
  );
}
