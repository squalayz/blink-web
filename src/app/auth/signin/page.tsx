"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAccount, useChainId, useDisconnect, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { SiweMessage } from "siwe";
import { supabase } from "@/lib/supabase";
import { sounds } from "@/lib/sounds";
import {
  BLINK_MINT_URL,
  BLINK_OPENSEA_URL,
  BESTIARY,
  RARITY_COLOR,
  type Rarity,
} from "@/lib/bestiary";

const GREEN = "#00FF88";
const GREEN2 = "#88FF00";
const BG = "#0a0a0f";
const SURFACE = "#0d0d14";
const TEXT = "#FFFFFF";
const MUTED = "#8a8a99";

type Phase =
  | "idle"
  | "awaiting-wallet"
  | "signing"
  | "verifying"
  | "lore-holder"
  | "lore-non-holder";

type HoldingSummary = {
  genesis: number[];
  mythics: number[];
};

export default function SignInPage() {
  const router = useRouter();
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<HoldingSummary>({
    genesis: [],
    mythics: [],
  });

  // Click AWAKEN when there's no connected wallet → trigger RainbowKit. Once
  // connected, the effect below picks up and runs the SIWE flow automatically.
  const [awakenClicked, setAwakenClicked] = useState(false);

  useEffect(() => {
    if (!awakenClicked) return;
    if (!isConnected || !address) return;
    if (phase !== "awaiting-wallet" && phase !== "idle") return;
    void runSiweFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awakenClicked, isConnected, address]);

  async function runSiweFlow() {
    if (!address) return;
    setError(null);
    setPhase("signing");

    try {
      // 1. Get nonce
      const nonceRes = await fetch("/api/auth/siwe/nonce", {
        method: "GET",
        credentials: "include",
      });
      if (!nonceRes.ok) throw new Error("Could not generate nonce");
      const { nonce } = (await nonceRes.json()) as { nonce: string };

      // 2. Build SIWE message
      const domain =
        typeof window !== "undefined" ? window.location.host : "blink.local";
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://blink.local";
      const message = new SiweMessage({
        domain,
        address,
        statement:
          "Sign in to BLINK. We only read your wallet's public NFT holdings. We never request keys, signatures for transactions, or access to your funds.",
        uri: origin,
        version: "1",
        chainId: chainId ?? 1,
        nonce,
        issuedAt: new Date().toISOString(),
      });
      const prepared = message.prepareMessage();

      // 3. Ask wallet to sign
      const signature = await signMessageAsync({ message: prepared });

      // 4. Verify on server (sets httpOnly cookie + creates Supabase shadow user)
      setPhase("verifying");
      const verifyRes = await fetch("/api/auth/siwe/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prepared, signature }),
      });
      const verifyJson = (await verifyRes.json()) as {
        ok?: boolean;
        error?: string;
        isHolder?: boolean;
        holdings?: HoldingSummary;
        supabase?: { email: string; token: string } | null;
      };
      if (!verifyRes.ok || !verifyJson.ok) {
        throw new Error(verifyJson.error || "Signature could not be verified");
      }

      // 5. Trade the magic-link token for a Supabase session so the rest of
      //    the app (which still reads `useAuth().user`) keeps working. This
      //    is internal plumbing — the user only ever sees a wallet flow.
      if (verifyJson.supabase) {
        await supabase.auth.verifyOtp({
          email: verifyJson.supabase.email,
          token: verifyJson.supabase.token,
          type: "magiclink",
        });
      }

      sounds.play("awaken");
      setHoldings(verifyJson.holdings ?? { genesis: [], mythics: [] });
      setPhase(verifyJson.isHolder ? "lore-holder" : "lore-non-holder");

      // 6. Holders ride a short cinematic, then land on /watch.
      if (verifyJson.isHolder) {
        setTimeout(() => router.replace("/watch"), 3200);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      setError(msg);
      setPhase("idle");
      try {
        await disconnectAsync();
      } catch {
        /* ignore */
      }
      setAwakenClicked(false);
    }
  }

  const ownedCreatures = useMemo(() => {
    const ids = new Set(holdings.genesis);
    return BESTIARY.filter((c) => ids.has(c.id));
  }, [holdings.genesis]);

  const showRainbow = phase === "awaiting-wallet";
  const isWorking =
    phase === "signing" || phase === "verifying";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: BG,
        color: TEXT,
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <Starfield />

      {/* Centered cinematic stack */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: "32px 20px",
          boxSizing: "border-box",
        }}
      >
        <BlinkEye working={isWorking} />

        {phase === "idle" || phase === "awaiting-wallet" ? (
          <IdleStack
            error={error}
            onAwaken={() => {
              setError(null);
              setAwakenClicked(true);
              setPhase("awaiting-wallet");
            }}
            showRainbow={showRainbow}
          />
        ) : null}

        {phase === "signing" || phase === "verifying" ? (
          <OpeningEye phase={phase} />
        ) : null}

        {phase === "lore-holder" ? (
          <HolderReveal owned={ownedCreatures} holdings={holdings} />
        ) : null}

        {phase === "lore-non-holder" ? <NonHolderPanel /> : null}

        <FooterCopy />
      </div>

      <style>{KEYFRAMES}</style>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Cosmic starfield (pure CSS, parallax via two layers)
// ────────────────────────────────────────────────────────────────────────────
function Starfield() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 1,
        background:
          "radial-gradient(ellipse at center, rgba(0,255,136,0.06) 0%, rgba(10,10,15,0.95) 60%, #050507 100%)",
        overflow: "hidden",
      }}
    >
      <div className="blink-star-layer blink-star-near" />
      <div className="blink-star-layer blink-star-far" />
      <div className="blink-aurora" />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// BLINK animated eye
// ────────────────────────────────────────────────────────────────────────────
function BlinkEye({ working }: { working: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        width: 168,
        height: 168,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -32,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,255,136,0.45) 0%, rgba(0,255,136,0) 65%)",
          filter: "blur(8px)",
          animation: `blinkHalo ${working ? "1.4s" : "2.6s"} ease-in-out infinite`,
        }}
      />
      <svg
        width="148"
        height="148"
        viewBox="0 0 200 200"
        fill="none"
        style={{
          position: "relative",
          filter:
            "drop-shadow(0 0 28px rgba(0,255,136,0.65)) drop-shadow(0 0 64px rgba(0,255,136,0.25))",
        }}
      >
        <defs>
          <radialGradient id="blink-iris" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={GREEN2} />
            <stop offset="60%" stopColor={GREEN} />
            <stop offset="100%" stopColor="#003a1f" />
          </radialGradient>
          <radialGradient id="blink-iris-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
        </defs>
        <ellipse
          cx="100"
          cy="100"
          rx="92"
          ry="48"
          stroke={GREEN}
          strokeWidth="3"
        />
        <circle
          cx="100"
          cy="100"
          r="38"
          fill="url(#blink-iris)"
          style={{ animation: "blinkIrisPulse 3s ease-in-out infinite" }}
        />
        <circle cx="100" cy="100" r="14" fill="url(#blink-iris-core)" />
        <circle cx="92" cy="92" r="5" fill="rgba(255,255,255,0.85)" />
      </svg>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Idle: tagline + AWAKEN button + ConnectButton
// ────────────────────────────────────────────────────────────────────────────
function IdleStack({
  error,
  onAwaken,
  showRainbow,
}: {
  error: string | null;
  onAwaken: () => void;
  showRainbow: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 22,
        animation: "blinkFadeUp 0.6s ease-out",
      }}
    >
      <p
        style={{
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          fontSize: "clamp(18px, 2.4vw, 22px)",
          fontWeight: 600,
          letterSpacing: "0.08em",
          color: TEXT,
          textTransform: "uppercase",
          textAlign: "center",
          margin: 0,
        }}
      >
        The Bestiary remembers your wallet.
      </p>

      <button
        type="button"
        onClick={onAwaken}
        style={{
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          padding: "18px 64px",
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: "0.32em",
          color: GREEN,
          background: "rgba(0,255,136,0.04)",
          border: `2px solid ${GREEN}`,
          borderRadius: 999,
          cursor: "pointer",
          textTransform: "uppercase",
          position: "relative",
          overflow: "hidden",
          animation: "blinkAwakenPulse 2.2s ease-in-out infinite",
          transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.transform = "scale(1.04)";
          el.style.background = "rgba(0,255,136,0.12)";
          sounds.play("tick");
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.transform = "scale(1)";
          el.style.background = "rgba(0,255,136,0.04)";
        }}
      >
        AWAKEN
      </button>

      {showRainbow ? (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <ConnectButton
            label="Connect Wallet"
            showBalance={false}
            chainStatus="none"
            accountStatus="address"
          />
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            color: "#FF8B8B",
            background: "rgba(239,68,68,0.10)",
            border: "1px solid rgba(239,68,68,0.40)",
            padding: "10px 18px",
            borderRadius: 14,
            fontSize: 13,
            maxWidth: 420,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Working state: "OPENING THE EYE..."
// ────────────────────────────────────────────────────────────────────────────
function OpeningEye({ phase }: { phase: "signing" | "verifying" }) {
  const label =
    phase === "signing"
      ? "WAITING FOR YOUR SIGNATURE"
      : "OPENING THE EYE...";
  return (
    <div
      style={{
        textAlign: "center",
        animation: "blinkFadeUp 0.4s ease-out",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
      }}
    >
      <p
        style={{
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          letterSpacing: "0.36em",
          fontSize: 14,
          color: GREEN,
          margin: 0,
          textTransform: "uppercase",
          animation: "blinkFlicker 1.6s ease-in-out infinite",
        }}
      >
        {label}
      </p>
      <div
        aria-hidden
        style={{
          width: 220,
          height: 2,
          borderRadius: 2,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "40%",
            background: `linear-gradient(90deg, transparent, ${GREEN}, transparent)`,
            animation: "blinkBar 1.2s linear infinite",
          }}
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Holder cinematic
// ────────────────────────────────────────────────────────────────────────────
function HolderReveal({
  owned,
  holdings,
}: {
  owned: typeof BESTIARY;
  holdings: HoldingSummary;
}) {
  const total = holdings.genesis.length + holdings.mythics.length;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        textAlign: "center",
        animation: "blinkFadeUp 0.5s ease-out",
      }}
    >
      <p
        style={{
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          fontSize: "clamp(18px, 2.6vw, 24px)",
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: GREEN,
          margin: 0,
          textTransform: "uppercase",
        }}
      >
        The Eye sees {total} of yours…
      </p>
      <div
        style={{
          position: "relative",
          width: "min(560px, 92vw)",
          height: 150,
        }}
      >
        {owned.slice(0, 6).map((c, idx) => {
          const offset = (idx - (owned.length - 1) / 2) * 80;
          const rarityTint: Rarity = c.rarity;
          return (
            <div
              key={c.id}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 92,
                height: 138,
                marginLeft: offset - 46,
                marginTop: -69,
                borderRadius: 10,
                overflow: "hidden",
                border: `1px solid ${RARITY_COLOR[rarityTint]}`,
                boxShadow: `0 0 22px ${RARITY_COLOR[rarityTint]}66`,
                animation: `blinkFlyIn 0.7s ease-out ${idx * 0.12}s both`,
                background: "#000",
              }}
            >
              <Image
                src={c.image}
                alt={c.name}
                fill
                sizes="92px"
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
          );
        })}
      </div>
      <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>
        Welcome back, Council member. Redirecting to your watch…
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Non-holder soft prompt
// ────────────────────────────────────────────────────────────────────────────
function NonHolderPanel() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        textAlign: "center",
        maxWidth: 460,
        animation: "blinkFadeUp 0.5s ease-out",
      }}
    >
      <p
        style={{
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          fontSize: "clamp(20px, 3vw, 26px)",
          fontWeight: 800,
          letterSpacing: "0.04em",
          color: TEXT,
          margin: 0,
        }}
      >
        You have not been awakened.
      </p>
      <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.6, margin: 0 }}>
        Mint your first creature at{" "}
        <a
          href={BLINK_MINT_URL}
          target="_blank"
          rel="noreferrer"
          style={{ color: GREEN, textDecoration: "none", fontWeight: 700 }}
        >
          mintmyblink.com
        </a>{" "}
        and the Bestiary will know you next time.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <a
          href={BLINK_MINT_URL}
          target="_blank"
          rel="noreferrer"
          style={{
            padding: "14px 24px",
            borderRadius: 999,
            background: `linear-gradient(135deg, ${GREEN}, ${GREEN2})`,
            color: BG,
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            textDecoration: "none",
            boxShadow: "0 0 24px rgba(0,255,136,0.45)",
          }}
        >
          Mint a Genesis
        </a>
        <a
          href={BLINK_OPENSEA_URL}
          target="_blank"
          rel="noreferrer"
          style={{
            padding: "14px 24px",
            borderRadius: 999,
            border: `1px solid ${GREEN}`,
            color: GREEN,
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          View the Mythics
        </a>
      </div>
      <a
        href="/watch"
        style={{
          color: MUTED,
          fontSize: 12,
          textDecoration: "underline",
          marginTop: 4,
        }}
      >
        Continue as guest
      </a>
    </div>
  );
}

function FooterCopy() {
  return (
    <p
      style={{
        position: "absolute",
        bottom: 24,
        left: 0,
        right: 0,
        color: MUTED,
        fontSize: 11,
        textAlign: "center",
        letterSpacing: "0.08em",
        margin: 0,
        padding: "0 20px",
      }}
    >
      Wallet-only ·{" "}
      <a
        href="/WHAT_WE_NEVER_DO.md"
        style={{ color: MUTED, textDecoration: "underline" }}
      >
        We never request keys, signatures for transactions, or access to your funds.
      </a>
    </p>
  );
}

const KEYFRAMES = `
@keyframes blinkHalo {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.08); }
}
@keyframes blinkIrisPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
@keyframes blinkAwakenPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,136,0.55), 0 0 28px rgba(0,255,136,0.25); }
  50% { box-shadow: 0 0 0 12px rgba(0,255,136,0), 0 0 36px rgba(0,255,136,0.45); }
}
@keyframes blinkFadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes blinkFlicker {
  0%, 100% { opacity: 1; }
  45% { opacity: 0.6; }
  55% { opacity: 0.95; }
}
@keyframes blinkBar {
  from { transform: translateX(-100%); }
  to { transform: translateX(260%); }
}
@keyframes blinkFlyIn {
  0% { opacity: 0; transform: translateY(40px) rotate(-6deg); filter: blur(10px); }
  100% { opacity: 1; transform: translateY(0) rotate(0); filter: blur(0); }
}
@keyframes blinkStarsDrift {
  from { transform: translate3d(0,0,0); }
  to { transform: translate3d(-200px, -100px, 0); }
}
@keyframes blinkAuroraDrift {
  0% { opacity: 0.35; transform: translateX(-12%) scaleY(1); }
  50% { opacity: 0.6; transform: translateX(8%) scaleY(1.12); }
  100% { opacity: 0.35; transform: translateX(-12%) scaleY(1); }
}
.blink-star-layer {
  position: absolute;
  inset: -50%;
  background-repeat: repeat;
  background-image:
    radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.85), transparent 60%),
    radial-gradient(1px 1px at 35% 70%, rgba(255,255,255,0.55), transparent 60%),
    radial-gradient(2px 2px at 60% 30%, rgba(0,255,136,0.75), transparent 60%),
    radial-gradient(1px 1px at 80% 15%, rgba(255,255,255,0.45), transparent 60%),
    radial-gradient(1px 1px at 50% 90%, rgba(255,255,255,0.65), transparent 60%),
    radial-gradient(1px 1px at 90% 60%, rgba(255,255,255,0.55), transparent 60%);
  background-size: 700px 700px;
}
.blink-star-near {
  opacity: 0.85;
  animation: blinkStarsDrift 90s linear infinite;
}
.blink-star-far {
  opacity: 0.45;
  background-size: 1100px 1100px;
  animation: blinkStarsDrift 220s linear infinite;
}
.blink-aurora {
  position: absolute;
  inset: -10%;
  background:
    radial-gradient(ellipse at 30% 30%, rgba(0,255,136,0.14), transparent 50%),
    radial-gradient(ellipse at 70% 70%, rgba(136,255,0,0.10), transparent 55%);
  filter: blur(40px);
  animation: blinkAuroraDrift 18s ease-in-out infinite;
}
`;
