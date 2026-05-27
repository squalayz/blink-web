"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import { createWalletClient, custom, parseEther } from "viem";
import { mainnet } from "viem/chains";

export interface CatchResult {
  name: string;
  tier: string;
  tierLabel: string;
  image_url: string;
  blinkRewarded: number;
  tokenId: string | null;
  mintTxHash: string;
  openseaUrl: string | null;
  wasFreeCatch: boolean;
  wasPaidCatch?: boolean;
  freeCatchesRemaining: number;
  dailyCatchRemaining?: number;
}

// Thrown by callers when the catch API returns 429 (daily free limit reached).
// CinematicCatch catches this and shows the paid-catch screen.
export class DailyLimitError extends Error {
  constructor(message = "Daily free catch limit reached") {
    super(message);
    this.name = "DailyLimitError";
  }
}

interface CinematicCatchProps {
  spawn: { name: string; tier: string; tier_color: string; image_url: string };
  onCatch: (opts?: { txHash?: string }) => Promise<CatchResult>;
  onDismiss: () => void;
  onShare?: (result: CatchResult) => void;
}

type Phase = "aim" | "throw" | "caught" | "error" | "paid";
type PaidStep = "idle" | "connecting" | "sending" | "confirming" | "catching";

const CATCH_ROUTER_ADDRESS = (
  process.env.NEXT_PUBLIC_CATCH_ROUTER_ADDRESS ||
  "0xFB3fde2AE27aFF2dEb901Bc3C73783a6b75E2C36"
) as `0x${string}`;
const PAID_CATCH_FEE_ETH = "0.005";

const BG = "#0a0a0f";
const GREEN = "#00FF88";

const KEYFRAMES = `
@keyframes ccRing {
  0%   { transform: translate(-50%,-50%) scale(0.8); opacity: 0.7; }
  100% { transform: translate(-50%,-50%) scale(2.6); opacity: 0; }
}
@keyframes ccShake {
  0%,100% { transform: translateX(0); }
  15%     { transform: translateX(-9px); }
  30%     { transform: translateX(9px); }
  45%     { transform: translateX(-7px); }
  60%     { transform: translateX(7px); }
  75%     { transform: translateX(-4px); }
  90%     { transform: translateX(4px); }
}
@keyframes ccFlash {
  0%,100% { opacity: 0; }
  40%     { opacity: 0.88; }
}
@keyframes ccGreenFlash {
  0%,100% { opacity: 0; }
  30%     { opacity: 0.5; }
}
@keyframes ccEdgePulse {
  0%,100% { opacity: 0.4; }
  50%     { opacity: 1; }
}
@keyframes ccEyeArc {
  0%   { transform: translate(-50%, 0px) scale(0.6); opacity: 0; }
  10%  { opacity: 1; }
  60%  { transform: translate(-50%, -55vh) scale(1.2); }
  100% { transform: translate(-50%, -55vh) scale(0.3); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .cc-ring, .cc-shake, .cc-flash, .cc-eye { animation: none !important; }
}
`;

// Rarity accent colours
const RARITY_COLOR: Record<string, string> = {
  common: "#9aa3b2",
  uncommon: "#00FF88",
  rare: "#88FF00",
  legendary: "#ffd166",
  mythic: "#ff8ae0",
};

function getAccent(tier: string, tierColor: string) {
  return tierColor || RARITY_COLOR[tier.toLowerCase()] || GREEN;
}

// Confetti particle
function Particle({ accent, index }: { accent: string; index: number }) {
  const colors = [accent, GREEN, "#ffffff", "#ffd166", "#ff8ae0"];
  const color = colors[index % colors.length];
  const angle = (index / 40) * Math.PI * 2;
  const radius = 80 + Math.random() * 140;
  const tx = Math.cos(angle) * radius;
  const ty = Math.sin(angle) * radius - 60;
  const size = 5 + Math.random() * 7;
  const isRect = index % 3 === 0;

  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
      animate={{ x: tx, y: ty + 120, opacity: 0, rotate: Math.random() * 540 - 270, scale: 0.2 }}
      transition={{ duration: 1.1 + Math.random() * 0.8, delay: index * 0.018, ease: "easeOut" }}
      style={{
        position: "absolute",
        top: "42%",
        left: "50%",
        width: isRect ? size * 0.5 : size,
        height: isRect ? size * 2 : size,
        background: color,
        borderRadius: isRect ? 2 : "50%",
        pointerEvents: "none",
        zIndex: 10,
      }}
    />
  );
}

export function CinematicCatch({ spawn, onCatch, onDismiss, onShare }: CinematicCatchProps) {
  const [phase, setPhase] = useState<Phase>("aim");
  const [shaking, setShaking] = useState(false);
  const [flash, setFlash] = useState<"white" | "green" | null>(null);
  const [result, setResult] = useState<CatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paidStep, setPaidStep] = useState<PaidStep>("idle");
  const [paidError, setPaidError] = useState<string | null>(null);
  const catchCalledRef = useRef(false);

  const accent = getAccent(spawn.tier, spawn.tier_color);

  const runCatch = useCallback(async () => {
    if (catchCalledRef.current) return;
    catchCalledRef.current = true;
    try {
      const res = await onCatch();
      setResult(res);
    } catch (e) {
      if (e instanceof DailyLimitError) {
        // Hand off to the paid-catch screen instead of the generic error UI.
        setPhase("paid");
        catchCalledRef.current = false; // allow a paid retry
        return;
      }
      setError(e instanceof Error ? e.message : "Catch failed");
      setPhase("error");
    }
  }, [onCatch]);

  const playCatchSequence = useCallback(() => {
    // Cinematic throw → shake → caught timeline. Pure UI; safe to run after
    // the API has already returned (paid path) or in parallel with it (free
    // path — see startThrow).
    setTimeout(() => {
      setFlash("white");
      setTimeout(() => setFlash(null), 180);
    }, 700);
    setTimeout(() => {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }, 900);
    setTimeout(() => {
      setFlash("green");
      setTimeout(() => setFlash(null), 180);
    }, 1100);
    setTimeout(() => {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }, 1300);
    setTimeout(() => {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }, 1700);
    setTimeout(() => {
      setFlash("green");
      setTimeout(() => setFlash(null), 120);
      setPhase("caught");
    }, 2200);
  }, []);

  const catchWithPayment = useCallback(async () => {
    setPaidError(null);
    type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
    const eth =
      typeof window !== "undefined"
        ? ((window as unknown as { ethereum?: Eip1193 }).ethereum ?? undefined)
        : undefined;
    if (!eth) {
      setPaidError("No wallet found. Install MetaMask or another EIP-1193 wallet.");
      return;
    }
    try {
      setPaidStep("connecting");
      const wallet = createWalletClient({ chain: mainnet, transport: custom(eth) });
      const [account] = await wallet.requestAddresses();
      if (!account) throw new Error("Wallet did not return an address");

      setPaidStep("sending");
      const txHash = await wallet.sendTransaction({
        account,
        to: CATCH_ROUTER_ADDRESS,
        value: parseEther(PAID_CATCH_FEE_ETH),
      });

      // Poll for confirmation via the connected wallet's provider.
      setPaidStep("confirming");
      const start = Date.now();
      const TIMEOUT_MS = 120_000;
      while (true) {
        const rcpt = (await eth.request({
          method: "eth_getTransactionReceipt",
          params: [txHash],
        })) as { status?: string } | null;
        if (rcpt && rcpt.status === "0x1") break;
        if (rcpt && rcpt.status === "0x0") {
          throw new Error("Payment reverted on-chain");
        }
        if (Date.now() - start > TIMEOUT_MS) {
          throw new Error("Payment confirmation timed out");
        }
        await new Promise((r) => setTimeout(r, 2500));
      }

      setPaidStep("catching");
      // Retry the catch with the payment receipt — bypasses the daily limit.
      try {
        const res = await onCatch({ txHash });
        setResult(res);
        setPhase("throw");
        // Play the catch animation now that the server gave us a result.
        playCatchSequence();
      } catch (e) {
        setPaidError(e instanceof Error ? e.message : "Catch failed after payment");
        setPaidStep("idle");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      // Surface user rejection separately.
      setPaidError(/reject|denied|user/i.test(msg) ? "Payment cancelled" : msg);
      setPaidStep("idle");
    }
  }, [onCatch, playCatchSequence]);

  const startThrow = useCallback(() => {
    setPhase("throw");
    runCatch();
    playCatchSequence();
  }, [runCatch, playCatchSequence]);

  return (
    <AnimatePresence>
      <motion.div
        key="cinematic-catch"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(0,0,0,0.93)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          animation: shaking ? "ccShake 0.45s ease-in-out" : "none",
        }}
        className={shaking ? "cc-shake" : ""}
      >
        <style>{KEYFRAMES}</style>

        {/* Screen flash overlay */}
        {flash && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: flash === "white" ? "#ffffff" : accent,
              zIndex: 20,
              pointerEvents: "none",
              animation: "ccFlash 200ms ease-out both",
            }}
          />
        )}

        {/* ─── PHASE: AIM ─────────────────────────────────── */}
        {phase === "aim" && (
          <>
            {/* Radar rings */}
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: "38%",
                  left: "50%",
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  border: `2px solid ${accent}`,
                  animation: `ccRing 1.8s ease-out ${i * 0.5}s infinite`,
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              />
            ))}

            {/* Creature */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 14, stiffness: 200 }}
              style={{
                position: "relative",
                zIndex: 5,
                width: 180,
                height: 180,
                marginBottom: 20,
              }}
            >
              {/* Glow aura */}
              <div style={{
                position: "absolute",
                inset: "-30%",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${accent}35 0%, transparent 65%)`,
                animation: "ccEdgePulse 1.2s ease-in-out infinite",
                zIndex: 0,
              }} />
              <img
                src={spawn.image_url}
                alt=""
                style={{
                  position: "relative",
                  zIndex: 1,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  filter: `drop-shadow(0 0 18px ${accent}99)`,
                }}
              />
            </motion.div>

            {/* Creature info */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              style={{ textAlign: "center", marginBottom: 32, zIndex: 5 }}
            >
              <div style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontSize: 26,
                fontWeight: 900,
                color: "#fff",
                letterSpacing: "-0.02em",
              }}>
                Wild {spawn.name}
              </div>
              <span style={{
                display: "inline-block",
                marginTop: 8,
                padding: "4px 14px",
                borderRadius: 999,
                background: `${accent}20`,
                border: `1px solid ${accent}55`,
                color: accent,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}>
                {spawn.tier}
              </span>
            </motion.div>

            {/* CATCH button */}
            <motion.button
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, type: "spring", damping: 16 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startThrow}
              style={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                padding: "18px 56px",
                borderRadius: 999,
                border: "none",
                background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                color: BG,
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                boxShadow: `0 0 32px ${accent}88, 0 0 64px ${accent}44`,
                zIndex: 5,
              }}
            >
              CATCH
            </motion.button>

            {/* Dismiss */}
            <button
              onClick={onDismiss}
              style={{
                marginTop: 20,
                background: "transparent",
                border: "none",
                color: "#8a8a99",
                fontSize: 13,
                cursor: "pointer",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                zIndex: 5,
              }}
            >
              Cancel
            </button>
          </>
        )}

        {/* ─── PHASE: THROW ───────────────────────────────── */}
        {phase === "throw" && (
          <>
            {/* Creature fades + shrinks */}
            <motion.div
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 0.6, opacity: 0.4 }}
              transition={{ duration: 0.4 }}
              style={{ width: 180, height: 180, marginBottom: 20 }}
            >
              <img src={spawn.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", filter: `drop-shadow(0 0 18px ${accent}99)` }} />
            </motion.div>

            {/* Flying eye symbol */}
            <motion.div
              initial={{ bottom: 60, opacity: 0, scale: 0.5 }}
              animate={{ bottom: "55%", opacity: [0, 1, 1, 0], scale: [0.5, 1.3, 1.3, 0.2] }}
              transition={{ duration: 0.75, times: [0, 0.15, 0.8, 1], ease: "easeOut" }}
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10,
              }}
            >
              <svg width="44" height="28" viewBox="0 0 44 28" fill="none">
                <ellipse cx="22" cy="14" rx="20" ry="12" stroke={accent} strokeWidth="2.5" fill={`${accent}22`} />
                <circle cx="22" cy="14" r="6" fill={accent} />
                <circle cx="24" cy="12" r="2" fill="#fff" opacity={0.6} />
              </svg>
            </motion.div>

            {/* Edge pulse rings during shake */}
            {[0, 1].map((i) => (
              <div key={i} style={{
                position: "absolute",
                inset: 0,
                border: `${3 - i}px solid ${accent}`,
                opacity: 0.3 + i * 0.15,
                pointerEvents: "none",
                animation: `ccEdgePulse ${0.4 + i * 0.2}s ease-in-out infinite`,
              }} />
            ))}

            <div style={{
              color: "#8a8a99",
              fontSize: 13,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              marginTop: 80,
              fontWeight: 700,
            }}>
              Catching...
            </div>
          </>
        )}

        {/* ─── PHASE: CAUGHT ──────────────────────────────── */}
        {phase === "caught" && (
          <>
            {/* Confetti */}
            {Array.from({ length: 40 }).map((_, i) => (
              <Particle key={i} accent={accent} index={i} />
            ))}

            <motion.div
              key="caught-card"
              initial={{ scale: 0.5, opacity: 0, rotateY: 180 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              transition={{ type: "spring", damping: 18, stiffness: 200, delay: 0.1 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "calc(100% - 48px)",
                maxWidth: 340,
                background: `linear-gradient(160deg, #0d0d18 0%, ${BG} 100%)`,
                borderRadius: 24,
                padding: "28px 22px 24px",
                textAlign: "center",
                border: `2px solid ${accent}`,
                boxShadow: `0 0 60px ${accent}55, 0 0 120px ${accent}22`,
                position: "relative",
                overflow: "hidden",
                zIndex: 5,
              }}
            >
              {/* Bg glow */}
              <motion.div
                animate={{ opacity: [0.15, 0.35, 0.15] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `radial-gradient(ellipse at 50% 30%, ${accent}33 0%, transparent 70%)`,
                  pointerEvents: "none",
                  borderRadius: 24,
                }}
              />

              {/* CAUGHT badge */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                style={{
                  display: "inline-block",
                  background: accent,
                  color: "#000",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 3,
                  padding: "4px 14px",
                  borderRadius: 20,
                  marginBottom: 16,
                  textTransform: "uppercase",
                }}
              >
                CAUGHT
              </motion.div>

              {/* Creature image */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 16 }}
                style={{
                  width: 160,
                  height: 160,
                  margin: "0 auto 18px",
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 20,
                  border: `3px solid ${accent}`,
                  boxShadow: `0 0 40px ${accent}66`,
                }}
              >
                <img
                  src={result?.image_url || spawn.image_url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                />
                {/* Shine sweep */}
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "220%" }}
                  transition={{ delay: 0.5, duration: 0.9, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)",
                    pointerEvents: "none",
                  }}
                />
              </motion.div>

              {/* Name + tier */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{ color: "#fff", fontSize: 24, fontWeight: 900, margin: "0 0 4px", letterSpacing: "-0.02em" }}
              >
                {result?.name || spawn.name}
              </motion.h2>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.48 }}
                style={{ color: accent, fontSize: 12, fontWeight: 700, marginBottom: 18, textTransform: "uppercase", letterSpacing: "0.2em" }}
              >
                {result?.tierLabel || spawn.tier}
              </motion.div>

              {/* BLINK reward */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.55, type: "spring", stiffness: 280 }}
                style={{
                  background: "rgba(0,255,136,0.07)",
                  border: "1px solid rgba(0,255,136,0.2)",
                  borderRadius: 16,
                  padding: "14px 16px",
                  marginBottom: 16,
                }}
              >
                {result ? (
                  <>
                    <div style={{ color: "#ffffff66", fontSize: 10, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 4 }}>
                      You Earned
                    </div>
                    <div style={{ color: GREEN, fontSize: 36, fontWeight: 900, lineHeight: 1, fontFamily: "Space Grotesk, Inter, sans-serif" }}>
                      +<CountUp end={result.blinkRewarded} duration={1.5} separator="," useEasing />
                    </div>
                    <div style={{ color: `${GREEN}aa`, fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                      $BLINK TOKENS
                    </div>
                  </>
                ) : (
                  <div style={{ color: "#8a8a99", fontSize: 13, letterSpacing: "0.2em", textTransform: "uppercase", padding: "6px 0" }}>
                    Minting NFT...
                  </div>
                )}
              </motion.div>

              {/* Remaining free catches */}
              {result && result.dailyCatchRemaining !== undefined && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  style={{ color: "#8a8a99", fontSize: 11, marginBottom: 16, letterSpacing: "0.1em" }}
                >
                  {result.dailyCatchRemaining} free catches remaining today
                </motion.div>
              )}

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {onShare && result && (
                  <button
                    onClick={() => onShare(result)}
                    style={{
                      width: "100%",
                      padding: "14px 0",
                      borderRadius: 14,
                      border: "none",
                      background: accent,
                      color: BG,
                      fontSize: 14,
                      fontWeight: 900,
                      cursor: "pointer",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Share Your Catch
                  </button>
                )}
                <button
                  onClick={onDismiss}
                  style={{
                    width: "100%",
                    padding: "13px 0",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Keep Hunting
                </button>
              </motion.div>
            </motion.div>
          </>
        )}

        {/* ─── PHASE: ERROR ───────────────────────────────── */}
        {phase === "error" && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              width: "calc(100% - 48px)",
              maxWidth: 320,
              background: "#0d0d14",
              borderRadius: 20,
              padding: "28px 22px",
              textAlign: "center",
              border: "1px solid rgba(248,113,113,0.3)",
            }}
          >
            <div style={{ color: "#F87171", fontSize: 22, fontWeight: 900, marginBottom: 12 }}>
              Catch Failed
            </div>
            <div style={{ color: "#8a8a99", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              {error || "Something went wrong. The creature got away."}
            </div>
            <button
              onClick={onDismiss}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 14,
                border: "none",
                background: GREEN,
                color: BG,
                fontSize: 15,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* ─── PHASE: PAID (daily limit reached) ───────────── */}
        {phase === "paid" && (
          <>
            {/* Creature still visible behind the dark modal */}
            <div
              style={{
                position: "absolute",
                top: "22%",
                left: "50%",
                transform: "translateX(-50%)",
                width: 180,
                height: 180,
                opacity: 0.55,
                filter: `drop-shadow(0 0 24px ${accent}aa)`,
                zIndex: 1,
                pointerEvents: "none",
              }}
            >
              <img
                src={spawn.image_url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>

            {/* Dark dim layered on top of the AnimatePresence overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                zIndex: 2,
                pointerEvents: "none",
              }}
            />

            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 18, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                width: "calc(100% - 48px)",
                maxWidth: 340,
                background: "#0d0d18",
                borderRadius: 22,
                padding: "26px 22px 22px",
                textAlign: "center",
                border: `1px solid ${GREEN}33`,
                boxShadow: `0 12px 60px rgba(0,0,0,0.6), 0 0 32px ${GREEN}22`,
                zIndex: 5,
              }}
            >
              <div
                style={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#fff",
                  letterSpacing: "-0.02em",
                  marginBottom: 8,
                }}
              >
                Daily limit reached
              </div>
              <div
                style={{
                  color: "#aab0bf",
                  fontSize: 14,
                  lineHeight: 1.5,
                  marginBottom: 20,
                }}
              >
                Pay <span style={{ color: "#fff", fontWeight: 700 }}>0.005 ETH</span>{" "}
                to catch this creature and earn{" "}
                <span style={{ color: GREEN, fontWeight: 800 }}>5x BLINK rewards</span>.
              </div>

              {paidError && (
                <div
                  style={{
                    color: "#F87171",
                    fontSize: 12,
                    marginBottom: 12,
                    lineHeight: 1.5,
                  }}
                >
                  {paidError}
                </div>
              )}

              <button
                onClick={catchWithPayment}
                disabled={paidStep !== "idle"}
                style={{
                  width: "100%",
                  padding: "15px 0",
                  borderRadius: 14,
                  border: "none",
                  background: paidStep === "idle" ? GREEN : `${GREEN}55`,
                  color: BG,
                  fontSize: 15,
                  fontWeight: 900,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  cursor: paidStep === "idle" ? "pointer" : "default",
                  boxShadow:
                    paidStep === "idle" ? `0 0 28px ${GREEN}55` : "none",
                  marginBottom: 10,
                }}
              >
                {paidStep === "idle" && "Pay & Catch"}
                {paidStep === "connecting" && "Connecting wallet..."}
                {paidStep === "sending" && "Sending payment..."}
                {paidStep === "confirming" && "Confirming..."}
                {paidStep === "catching" && "Catching..."}
              </button>

              <button
                onClick={onDismiss}
                disabled={paidStep !== "idle"}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  borderRadius: 12,
                  border: "none",
                  background: "transparent",
                  color: "#8a8a99",
                  fontSize: 12,
                  letterSpacing: "0.05em",
                  cursor: paidStep === "idle" ? "pointer" : "default",
                  opacity: paidStep === "idle" ? 1 : 0.4,
                }}
              >
                Come back tomorrow
              </button>
            </motion.div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
