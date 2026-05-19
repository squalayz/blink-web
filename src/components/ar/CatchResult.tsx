"use client";

import { useEffect } from "react";

// Shape of the catch API response. Mirrored locally so this component is
// decoupled from src/app/map/page.tsx — the FSM passes the raw JSON through.
export interface ARCatchResult {
  spawnId: string;
  tier: string;
  tierLabel: string;
  name: string;
  image_url: string;
  tokenId: string | null;
  mintTxHash: string;
  blinkRewardTxHash: string | null;
  blinkRewarded: number;
  wasFreeCatch: boolean;
  freeCatchesRemaining: number;
  openseaUrl: string | null;
}

export interface CatchResultProps {
  result: ARCatchResult;
  accent: string;
  onContinue: () => void;
}

const RESULT_CSS_ID = "ar-catch-result-styles";
const RESULT_CSS = `
@keyframes arResultRise {
  from { opacity: 0; transform: translateY(24px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes arResultCardGlow {
  0%, 100% { box-shadow: 0 0 22px var(--ar-accent), 0 0 44px var(--ar-accent-soft); }
  50%      { box-shadow: 0 0 36px var(--ar-accent), 0 0 80px var(--ar-accent-soft); }
}
@keyframes arResultHeadline {
  from { opacity: 0; transform: translateY(-12px); letter-spacing: 0.5em; }
  to   { opacity: 1; transform: translateY(0); letter-spacing: 0.04em; }
}
@keyframes arStarPop {
  0%   { opacity: 0; transform: scale(0) rotate(-180deg); }
  60%  { opacity: 1; transform: scale(1.3) rotate(20deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}
`;

function useResultCss(): void {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(RESULT_CSS_ID)) return;
    const el = document.createElement("style");
    el.id = RESULT_CSS_ID;
    el.textContent = RESULT_CSS;
    document.head.appendChild(el);
  }, []);
}

// Map tier → star count, mirroring how the rest of the app tiers creatures.
function starCountForTier(tier: string): number {
  const t = (tier || "").toLowerCase();
  if (t === "mythic") return 5;
  if (t === "legendary") return 4;
  if (t === "rare") return 3;
  if (t === "uncommon") return 2;
  return 1;
}

function shortHash(hash: string): string {
  if (!hash) return "";
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

export default function CatchResult({ result, accent, onContinue }: CatchResultProps) {
  useResultCss();
  const stars = starCountForTier(result.tier);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`You caught ${result.name}`}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 70,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "max(28px, env(safe-area-inset-top)) 20px max(28px, env(safe-area-inset-bottom))",
        background:
          "radial-gradient(ellipse at 50% 30%, rgba(0,255,136,0.18), rgba(10,10,15,0.92) 65%)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: "#fff",
        ["--ar-accent" as keyof React.CSSProperties as string]: accent,
        ["--ar-accent-soft" as keyof React.CSSProperties as string]: `${accent}55`,
        animation: "arResultRise 380ms cubic-bezier(.2,.7,.3,1) both",
      }}
    >
      {/* Big headline. */}
      <div
        style={{
          color: "#00FF88",
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.36em",
          textTransform: "uppercase",
          textShadow: "0 0 18px rgba(0,255,136,0.65)",
          marginBottom: 8,
          animation: "arResultHeadline 480ms ease-out 80ms both",
        }}
      >
        Caught
      </div>
      <h1
        style={{
          margin: 0,
          fontSize: "clamp(28px, 7vw, 42px)",
          fontWeight: 900,
          textAlign: "center",
          letterSpacing: "-0.01em",
          color: "#FFFFFF",
          textShadow: `0 0 18px ${accent}aa, 0 0 36px ${accent}55`,
          lineHeight: 1.1,
          animation: "arResultHeadline 520ms ease-out 160ms both",
        }}
      >
        {result.name.toUpperCase()}
      </h1>

      {/* Stars. */}
      <div
        aria-label={`${stars} of 5 stars`}
        style={{
          display: "flex",
          gap: 6,
          marginTop: 12,
          marginBottom: 22,
        }}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            aria-hidden
            style={{
              color: i < stars ? "#00FF88" : "rgba(255,255,255,0.18)",
              fontSize: 22,
              textShadow: i < stars ? "0 0 14px #00FF88" : undefined,
              animation: i < stars ? `arStarPop 420ms ease-out ${240 + i * 90}ms both` : undefined,
              transform: i < stars ? undefined : "scale(0.85)",
            }}
          >
            ★
          </span>
        ))}
      </div>

      {/* Card with the minted NFT art. */}
      <div
        style={{
          width: "min(78vw, 280px)",
          borderRadius: 22,
          padding: 14,
          background: "rgba(10,10,15,0.85)",
          border: `1.5px solid ${accent}`,
          ["--ar-accent" as keyof React.CSSProperties as string]: accent,
          ["--ar-accent-soft" as keyof React.CSSProperties as string]: `${accent}55`,
          animation: "arResultCardGlow 2.4s ease-in-out infinite",
        }}
      >
        <div
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            borderRadius: 14,
            overflow: "hidden",
            background: `radial-gradient(circle at 50% 40%, ${accent}33, #0a0a0f 70%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {result.image_url ? (
            <img
              src={result.image_url}
              alt={result.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <span style={{ color: accent, fontSize: 14, fontWeight: 700 }}>
              {result.tierLabel}
            </span>
          )}
        </div>

        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: accent,
              fontWeight: 800,
            }}
          >
            {result.tierLabel}
          </div>
          {result.tokenId && (
            <div style={{ fontSize: 13, color: "#cfd3dd", fontWeight: 600 }}>
              #{result.tokenId}
            </div>
          )}
          {result.blinkRewarded > 0 && (
            <div
              style={{
                fontSize: 13,
                color: "#88FF00",
                fontWeight: 800,
                letterSpacing: "0.02em",
              }}
            >
              +{result.blinkRewarded.toLocaleString()} BLINK
            </div>
          )}
          {result.mintTxHash && (
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.55)",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              tx {shortHash(result.mintTxHash)}
            </div>
          )}
        </div>
      </div>

      {/* Actions. */}
      <div
        style={{
          marginTop: 24,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          width: "min(78vw, 280px)",
        }}
      >
        {result.openseaUrl && (
          <a
            href={result.openseaUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              padding: "13px 0",
              borderRadius: 999,
              background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
              color: "#0a0a0f",
              fontSize: 14,
              fontWeight: 800,
              textAlign: "center",
              textDecoration: "none",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              border: `1.5px solid ${accent}`,
              boxShadow: `0 0 18px ${accent}66`,
            }}
          >
            View on OpenSea
          </a>
        )}
        <button
          type="button"
          onClick={onContinue}
          style={{
            padding: "13px 0",
            borderRadius: 999,
            background: "transparent",
            color: "#fff",
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            border: "1.5px solid rgba(255,255,255,0.4)",
            cursor: "pointer",
          }}
        >
          Continue Hunt
        </button>
      </div>
    </div>
  );
}
