"use client";

// ════════════════════════════════════════════════════════════════════════════
// ClaimFlow — BlinkWorld Airdrop Claim v3 form. Code-only, zero email.
//
// One card, three stages:
//   1. Enter private Blink Code (XXXX-XXXX, auto-formats)
//   2. Balance reveal hero (count-up of lifetime Blink Balls)
//   3. Paste ETH address → press-and-hold to lock → pending
// Returning players (valid code / live session) see their claim status and
// can edit the address only while it's still pending.
//
// Registration only — this component never sends tokens and never asks for
// keys. Embedded in the /claim landing page; the page owns nav/backdrop.
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CountUp from "react-countup";
import { C } from "@/lib/theme";

const FONT = "'Inter', -apple-system, system-ui, sans-serif";
const FONT_HEAD = "'Space Grotesk', 'Inter', -apple-system, sans-serif";

type Registration = { eth_address: string; status: string; updated_at?: string };
type Stage = "code" | "reveal" | "address" | "done";

const STATUS_META: Record<string, { label: string; color: string; blurb: string }> = {
  pending: {
    label: "PENDING REVIEW",
    color: "#FFD166",
    blurb: "You're registered. We're reviewing claims — check back soon.",
  },
  approved: {
    label: "APPROVED",
    color: C.primary,
    blurb: "Your claim is approved. Tokens will be distributed in a batch send.",
  },
  rejected: {
    label: "NOT ELIGIBLE",
    color: C.danger,
    blurb: "This claim didn't pass review. Reach out via support if you think that's wrong.",
  },
  sent: {
    label: "TOKENS SENT",
    color: C.primary2,
    blurb: "Tokens were sent to your registered address. Welcome aboard, explorer.",
  },
};

// ── Press-and-hold lock button ──────────────────────────────────────────────

const HOLD_MS = 1200;

function HoldToLock({ disabled, onComplete }: { disabled: boolean; onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const raf = useRef<number>(0);
  const start = useRef<number>(0);
  const done = useRef(false);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    if (!done.current) setProgress(0);
  }, []);

  const begin = useCallback(() => {
    if (disabled || done.current) return;
    start.current = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        done.current = true;
        onComplete();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [disabled, onComplete]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const R = 34;
  const CIRC = 2 * Math.PI * R;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <button
        onPointerDown={begin}
        onPointerUp={stop}
        onPointerLeave={stop}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled}
        aria-label="Press and hold to lock in your address"
        style={{
          position: "relative",
          width: 92,
          height: 92,
          borderRadius: "50%",
          border: "none",
          background: disabled ? "rgba(255,255,255,0.06)" : "rgba(0,255,136,0.1)",
          cursor: disabled ? "not-allowed" : "pointer",
          touchAction: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
          transform: progress > 0 ? `scale(${1 + progress * 0.06})` : undefined,
          boxShadow: progress > 0 ? `0 0 ${20 + progress * 40}px rgba(0,255,136,${0.25 + progress * 0.4})` : "none",
          transition: "background 0.2s",
        }}
      >
        <svg width="92" height="92" viewBox="0 0 92 92" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx="46" cy="46" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
          <circle
            cx="46"
            cy="46"
            r={R}
            fill="none"
            stroke={C.primary}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progress)}
          />
        </svg>
        <span style={{ fontSize: 30, position: "relative" }}>{progress >= 1 ? "✅" : "🔒"}</span>
      </button>
      <span
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: disabled ? C.textTertiary : C.primary,
        }}
      >
        {disabled ? "Paste a valid address" : "Press & hold to lock in"}
      </span>
    </div>
  );
}

// ── Shared bits ─────────────────────────────────────────────────────────────

function ScamBanner() {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "12px 16px",
        borderRadius: 14,
        background: "rgba(255,107,128,0.08)",
        border: "1px solid rgba(255,107,128,0.25)",
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      <span style={{ fontSize: 16, lineHeight: "20px" }}>⚠️</span>
      <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, lineHeight: 1.5, color: C.textSecondary }}>
        <strong style={{ color: "#FF8094" }}>Stay safe:</strong> BlinkWorld will <strong>never</strong> DM you
        first, never ask for your seed phrase or private keys, and never ask you to send funds to
        &ldquo;verify&rdquo; a claim. This page only records an address to <em>receive</em> tokens —
        blinkworld.xyz/claim is the only official claim page.
      </p>
    </div>
  );
}

// Glass card matching the landing page's visual language.
const card: React.CSSProperties = {
  background: "linear-gradient(160deg, rgba(22,26,34,0.82), rgba(10,12,18,0.85))",
  backdropFilter: "blur(22px)",
  WebkitBackdropFilter: "blur(22px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 24,
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 50px rgba(0,0,0,0.35), 0 0 44px rgba(0,255,136,0.12)",
  padding: "36px 28px",
  width: "100%",
  maxWidth: 480,
  margin: "0 auto",
  position: "relative",
};

// Auto-format: uppercase, strip junk, dash after 4 chars.
function formatCodeInput(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return cleaned.length > 4 ? `${cleaned.slice(0, 4)}-${cleaned.slice(4)}` : cleaned;
}

const stageAnim = {
  initial: { opacity: 0, y: 28, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -28, scale: 0.97 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};

// ── Flow ────────────────────────────────────────────────────────────────────

export default function ClaimFlow() {
  const [stage, setStage] = useState<Stage>("code");
  const [checkingSession, setCheckingSession] = useState(true);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);

  const [displayName, setDisplayName] = useState("");
  const [balance, setBalance] = useState(0);
  // Total $BLINK already received across all payouts (wei string, null = unknown)
  const [receivedWei, setReceivedWei] = useState<string | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);

  const [address, setAddress] = useState("");
  const addressValid = /^0x[0-9a-fA-F]{40}$/.test(address.trim());

  // Live $BLINK holder check on the entered address (debounced). Purely
  // informational — a zero balance shows an unmissable warning but NEVER
  // blocks registration (players can buy later; balance is re-checked at
  // payout time). RPC failure → "unknown" → neutral note, fail open.
  const [holder, setHolder] = useState<{ state: "idle" | "checking" | "holds" | "none" | "unknown"; balance?: string }>({ state: "idle" });
  const holderSeq = useRef(0);
  useEffect(() => {
    if (stage !== "address" || !addressValid) {
      holderSeq.current += 1;
      setHolder({ state: "idle" });
      return;
    }
    const seq = ++holderSeq.current;
    setHolder({ state: "checking" });
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/claim/balance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: address.trim() }),
        });
        const j = await res.json().catch(() => null);
        if (holderSeq.current !== seq) return; // stale — address changed
        if (res.ok && j?.ok && !j.unknown) {
          setHolder(j.holds ? { state: "holds", balance: j.balance } : { state: "none" });
        } else {
          setHolder({ state: "unknown" });
        }
      } catch {
        if (holderSeq.current === seq) setHolder({ state: "unknown" });
      }
    }, 600);
    return () => clearTimeout(t);
  }, [address, addressValid, stage]);

  // Returning visitor with a live 20-min session skips code entry.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/claim/status", { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          if (j?.ok) {
            setDisplayName(j.display_name || "Explorer");
            setBalance(j.blink_lifetime || 0);
            setReceivedWei(j.blink_received_wei ?? null);
            if (j.registration) {
              setRegistration(j.registration);
              setAddress(j.registration.eth_address || "");
              setStage("done");
            } else {
              setStage("reveal");
            }
          }
        }
      } catch {
        /* no session — start at code entry */
      } finally {
        setCheckingSession(false);
      }
    })();
  }, []);

  const submitCode = useCallback(async () => {
    if (busy || code.replace(/-/g, "").length < 8) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/claim/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j?.error || "Something went wrong. Try again.");
        setShake((s) => s + 1);
        return;
      }
      setDisplayName(j.display_name || "Explorer");
      setBalance(j.blink_lifetime || 0);
      setReceivedWei(j.blink_received_wei ?? null);
      if (j.existing_claim) {
        setRegistration(j.existing_claim);
        setAddress(j.existing_claim.eth_address || "");
        setStage("done");
      } else {
        setStage("reveal");
      }
    } catch {
      setError("Network hiccup — try again.");
      setShake((s) => s + 1);
    } finally {
      setBusy(false);
    }
  }, [busy, code]);

  const submitAddress = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/claim/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eth_address: address.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          setError("Session expired — enter your Blink Code again.");
          setStage("code");
        } else {
          setError(j?.error || "Something went wrong. Try again.");
        }
        return;
      }
      setRegistration({ eth_address: j.eth_address, status: j.status });
      setAddress(j.eth_address);
      setStage("done");
    } catch {
      setError("Network hiccup — try again.");
    } finally {
      setBusy(false);
    }
  }, [address]);

  const status = registration ? STATUS_META[registration.status] ?? STATUS_META.pending : null;

  return (
    <div style={{ width: "100%", position: "relative", fontFamily: FONT, color: C.text }}>
      <style>{`
        @keyframes bwShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-9px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(4px); }
        }
        .bw-code-input:focus { outline: none; border-color: ${C.primary} !important; box-shadow: 0 0 0 4px rgba(0,255,136,0.15); }
        .bw-addr-input:focus { outline: none; border-color: ${C.primary} !important; box-shadow: 0 0 0 4px rgba(0,255,136,0.15); }
      `}</style>

      <div style={{ marginBottom: 26, position: "relative", width: "100%" }}>
        <ScamBanner />
      </div>

      <div style={{ width: "100%", position: "relative" }}>
        <AnimatePresence mode="wait">
          {checkingSession ? (
            <motion.div key="loading" {...stageAnim} style={{ ...card, textAlign: "center" }}>
              <div style={{ fontSize: 28 }}>✨</div>
              <p style={{ color: C.textSecondary, margin: "10px 0 0" }}>Waking the orbs…</p>
            </motion.div>
          ) : stage === "code" ? (
            <motion.div key="code" {...stageAnim} style={{ ...card, textAlign: "center" }}>
              <h2 style={{ fontFamily: FONT_HEAD, fontSize: 26, fontWeight: 700, margin: "0 0 8px" }}>Enter your Blink Code</h2>
              <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.55, margin: "0 0 26px" }}>
                Your <strong style={{ color: C.text }}>private</strong> 8-character code from the
                BlinkWorld app. Not your public BL- Buddy Code — never share this one.
              </p>
              <div key={shake} style={{ animation: shake ? "bwShake 0.45s ease" : undefined }}>
                <input
                  className="bw-code-input"
                  value={code}
                  onChange={(e) => {
                    setCode(formatCodeInput(e.target.value));
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && submitCode()}
                  placeholder="XXXX-XXXX"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  inputMode="text"
                  maxLength={9}
                  aria-label="Blink Code"
                  style={{
                    width: "100%",
                    maxWidth: 300,
                    textAlign: "center",
                    fontFamily: FONT_HEAD,
                    fontSize: 30,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    color: C.text,
                    background: "rgba(255,255,255,0.05)",
                    border: `2px solid ${error ? "rgba(255,107,128,0.6)" : "rgba(255,255,255,0.14)"}`,
                    borderRadius: 16,
                    padding: "16px 12px",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                />
              </div>
              {error && (
                <p role="alert" style={{ color: C.dangerText, fontSize: 13, lineHeight: 1.5, margin: "14px auto 0", maxWidth: 340 }}>
                  {error}
                </p>
              )}
              <button
                onClick={submitCode}
                disabled={busy || code.replace(/-/g, "").length < 8}
                style={{
                  marginTop: 24,
                  width: "100%",
                  maxWidth: 300,
                  padding: "15px 0",
                  fontFamily: FONT,
                  fontSize: 16,
                  fontWeight: 900,
                  letterSpacing: "0.04em",
                  color: "#0a0a0f",
                  background:
                    busy || code.replace(/-/g, "").length < 8
                      ? "rgba(255,255,255,0.14)"
                      : `linear-gradient(90deg, ${C.primary2}, ${C.primary})`,
                  border: "none",
                  borderRadius: 999,
                  cursor: busy || code.replace(/-/g, "").length < 8 ? "not-allowed" : "pointer",
                  boxShadow:
                    code.replace(/-/g, "").length >= 8 && !busy ? "0 6px 22px rgba(0,255,136,0.4)" : "none",
                  transition: "all 0.25s",
                }}
              >
                {busy ? "Checking…" : "Reveal my balance"}
              </button>
            </motion.div>
          ) : stage === "reveal" ? (
            <motion.div key="reveal" {...stageAnim} style={{ ...card, textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.2em", color: C.textSecondary, textTransform: "uppercase", margin: 0 }}>
                Welcome back
              </p>
              <h2 style={{ fontFamily: FONT_HEAD, fontSize: 28, fontWeight: 700, margin: "6px 0 24px", color: C.text }}>{displayName}</h2>
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 160, damping: 14 }}
                style={{
                  fontFamily: FONT_HEAD,
                  fontSize: "clamp(52px, 15vw, 84px)",
                  fontWeight: 700,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  background: `linear-gradient(180deg, ${C.primary}, ${C.primary2})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 26px rgba(0,255,136,0.35))",
                }}
              >
                <CountUp end={balance} duration={2.2} separator="," />
              </motion.div>
              <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.26em", color: C.textSecondary, textTransform: "uppercase", margin: "10px 0 30px" }}>
                Lifetime Blink Balls
              </p>
              <button
                onClick={() => setStage("address")}
                style={{
                  width: "100%",
                  maxWidth: 300,
                  padding: "15px 0",
                  fontFamily: FONT,
                  fontSize: 16,
                  fontWeight: 900,
                  color: "#0a0a0f",
                  background: `linear-gradient(90deg, ${C.primary2}, ${C.primary})`,
                  border: "none",
                  borderRadius: 999,
                  cursor: "pointer",
                  boxShadow: "0 6px 22px rgba(0,255,136,0.4)",
                }}
              >
                Register for the airdrop →
              </button>
            </motion.div>
          ) : stage === "address" ? (
            <motion.div key="address" {...stageAnim} style={{ ...card, textAlign: "center" }}>
              <h2 style={{ fontFamily: FONT_HEAD, fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>Where should tokens go?</h2>
              <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.55, margin: "0 0 24px" }}>
                Paste an <strong style={{ color: C.text }}>Ethereum address you control</strong> (not an
                exchange deposit address). You can change it any time while your claim is pending.
              </p>
              <input
                className="bw-addr-input"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value.trim());
                  setError("");
                }}
                placeholder="0x…"
                autoComplete="off"
                spellCheck={false}
                aria-label="Ethereum address"
                style={{
                  width: "100%",
                  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                  fontSize: 14,
                  fontWeight: 600,
                  color: addressValid ? C.primary : C.text,
                  background: "rgba(255,255,255,0.05)",
                  border: `2px solid ${
                    address && !addressValid ? "rgba(255,209,102,0.5)" : addressValid ? "rgba(0,255,136,0.5)" : "rgba(255,255,255,0.14)"
                  }`,
                  borderRadius: 14,
                  padding: "15px 14px",
                  textAlign: "center",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
              />
              <p style={{ fontSize: 12, color: address && !addressValid ? "#FFD166" : C.textTertiary, margin: "10px 0 24px", minHeight: 16 }}>
                {address && !addressValid
                  ? "Keep going — an ETH address is 0x + 40 characters."
                  : addressValid
                    ? "Looks good ✓"
                    : " "}
              </p>
              {holder.state === "none" && (
                <div
                  role="alert"
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    textAlign: "left",
                    padding: "14px 16px",
                    borderRadius: 14,
                    margin: "0 0 20px",
                    background: "rgba(255,60,80,0.14)",
                    border: "2px solid rgba(255,80,100,0.7)",
                    boxShadow: "0 0 26px rgba(255,60,80,0.28)",
                  }}
                >
                  <span style={{ fontSize: 20, lineHeight: "22px" }}>⛔</span>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: C.text }}>
                    <strong style={{ color: C.dangerText }}>This wallet holds no $BLINK.</strong>{" "}
                    You must own $BLINK in the wallet you register to be eligible to receive
                    rewards. You can still register now and buy $BLINK to this address later —
                    the balance is re-checked before every payout.
                  </p>
                </div>
              )}
              {holder.state === "unknown" && (
                <p style={{ fontSize: 12, color: C.textTertiary, margin: "0 0 20px" }}>
                  Couldn&apos;t verify this wallet&apos;s $BLINK balance right now — you can
                  still register.
                </p>
              )}
              {holder.state === "holds" && (
                <p style={{ fontSize: 12, color: C.primary, fontWeight: 700, margin: "0 0 20px" }}>
                  ✓ Holds {holder.balance} $BLINK
                </p>
              )}
              {holder.state === "checking" && (
                <p style={{ fontSize: 12, color: C.textTertiary, margin: "0 0 20px" }}>
                  Checking $BLINK balance…
                </p>
              )}
              <HoldToLock disabled={!addressValid || busy} onComplete={submitAddress} />
              {error && (
                <p role="alert" style={{ color: C.dangerText, fontSize: 13, margin: "16px auto 0", maxWidth: 340 }}>
                  {error}
                </p>
              )}
              {busy && <p style={{ color: C.textSecondary, fontSize: 13, marginTop: 14 }}>Locking in…</p>}
            </motion.div>
          ) : (
            <motion.div key="done" {...stageAnim} style={{ ...card, textAlign: "center" }}>
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
                style={{ fontSize: 48, marginBottom: 8 }}
              >
                {registration?.status === "sent" ? "🚀" : registration?.status === "rejected" ? "🚫" : "🎟️"}
              </motion.div>
              <div
                style={{
                  display: "inline-block",
                  padding: "6px 16px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: "0.18em",
                  color: "#0a0a0f",
                  background: status?.color ?? C.primary,
                  marginBottom: 16,
                }}
              >
                {status?.label ?? "PENDING"}
              </div>
              <h2 style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>
                {displayName ? `You're in, ${displayName}` : "You're in"}
              </h2>
              <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.55, margin: "0 0 20px" }}>
                {status?.blurb}
              </p>
              {balance > 0 && (
                <p style={{ fontSize: 13, color: C.textSecondary, margin: "0 0 18px" }}>
                  Lifetime Blink Balls:{" "}
                  <strong style={{ color: C.primary, fontVariantNumeric: "tabular-nums" }}>
                    {balance.toLocaleString()}
                  </strong>
                </p>
              )}
              {receivedWei && receivedWei !== "0" && (
                <p style={{ fontSize: 13, color: C.textSecondary, margin: "-8px 0 18px" }}>
                  $BLINK received so far:{" "}
                  <strong style={{ color: C.primary, fontVariantNumeric: "tabular-nums" }}>
                    {(parseFloat(receivedWei) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </strong>
                </p>
              )}
              <div
                style={{
                  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.text,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  wordBreak: "break-all",
                  marginBottom: 18,
                }}
              >
                {registration?.eth_address}
              </div>
              {registration?.status === "pending" && (
                <button
                  onClick={() => {
                    setError("");
                    setStage("address");
                  }}
                  style={{
                    background: "none",
                    border: `1px solid rgba(0,255,136,0.4)`,
                    color: C.primary,
                    fontFamily: FONT,
                    fontWeight: 700,
                    fontSize: 14,
                    borderRadius: 999,
                    padding: "10px 24px",
                    cursor: "pointer",
                  }}
                >
                  Edit address
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Disclaimer */}
      <div style={{ maxWidth: 560, margin: "34px auto 0", position: "relative" }}>
        <p style={{ fontSize: 11.5, lineHeight: 1.6, color: C.textTertiary, textAlign: "center", margin: 0 }}>
          This page registers a receiving address only — no tokens move today, and registering never
          requires a payment, gas fee, signature, or seed phrase. Token distribution is a separate batch
          send after review. Blink Balls are in-game points; any future token allocation is determined at
          distribution time and may differ from displayed balances. Availability subject to eligibility
          and applicable law. Never share your private Blink Code.
        </p>
      </div>
    </div>
  );
}
