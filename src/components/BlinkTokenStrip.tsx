"use client";

import { useState } from "react";

const BLINK_TOKEN_CONTRACT =
  process.env.NEXT_PUBLIC_BLINK_TOKEN_CONTRACT ||
  "0xe7BF94959b0bfa8CB9e61149de5BFb387B40761B";
const ETHERSCAN_URL = `https://etherscan.io/token/${BLINK_TOKEN_CONTRACT}`;
const DEXSCREENER_URL = `https://dexscreener.com/ethereum/${BLINK_TOKEN_CONTRACT}`;
const UNISWAP_URL = `https://app.uniswap.org/explore/tokens/ethereum/${BLINK_TOKEN_CONTRACT}`;

const TRADING_ACTIVE = false;

const GREEN = "#00FF88";
const GREEN2 = "#88FF00";
const BG = "#0a0a0f";
const SURFACE = "#0d0d14";
const BORDER = "rgba(0,255,136,0.10)";
const WHITE = "#FFFFFF";
const MUTED = "#8a8a99";

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function BlinkTokenStrip() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(BLINK_TOKEN_CONTRACT)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        /* clipboard blocked — silently no-op */
      });
  };

  return (
    <section
      style={{
        padding: "40px clamp(14px, 4vw, 24px)",
        maxWidth: 1280,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          position: "relative",
          background: `linear-gradient(135deg, rgba(0,255,136,0.10), rgba(136,255,0,0.05))`,
          border: `1px solid ${GREEN}66`,
          borderRadius: 20,
          padding: "22px clamp(16px, 4vw, 24px)",
          boxShadow: `0 0 28px rgba(0,255,136,0.18)`,
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 10% 20%, rgba(0,255,136,0.18), transparent 55%), radial-gradient(circle at 90% 80%, rgba(136,255,0,0.10), transparent 60%)",
            pointerEvents: "none",
          }}
        />

        <div
          className="blink-token-strip-row"
          style={{
            position: "relative",
            display: "grid",
            // minmax(0, ...) lets each column shrink below its content's
            // min-width so the long contract pill can't blow horizontal layout.
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, auto) minmax(0, 1fr)",
            alignItems: "center",
            gap: 18,
          }}
        >
          {/* LEFT */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span
              aria-hidden
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: GREEN,
                boxShadow: `0 0 12px ${GREEN}`,
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: "0.04em",
                  color: WHITE,
                }}
              >
                $BLINK
              </div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: GREEN,
                  fontWeight: 700,
                  marginTop: 2,
                }}
              >
                Live on Ethereum
              </div>
            </div>
          </div>

          {/* CENTER */}
          <button
            type="button"
            onClick={handleCopy}
            aria-label={`Copy contract address ${BLINK_TOKEN_CONTRACT}`}
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              padding: "9px 14px",
              borderRadius: 999,
              color: WHITE,
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifySelf: "center",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "center",
              maxWidth: "100%",
            }}
          >
            <span style={{ color: GREEN, fontWeight: 700 }}>
              {copied ? "Copied" : shortAddr(BLINK_TOKEN_CONTRACT)}
            </span>
            <a
              href={ETHERSCAN_URL}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="View on Etherscan"
              style={{
                color: MUTED,
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Etherscan ↗
            </a>
          </button>

          {/* RIGHT */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              minWidth: 0,
            }}
          >
            {TRADING_ACTIVE ? (
              <a
                href={UNISWAP_URL}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  padding: "10px 18px",
                  borderRadius: 999,
                  background: `linear-gradient(135deg, ${GREEN}, ${GREEN2})`,
                  color: BG,
                  textDecoration: "none",
                  fontWeight: 800,
                  fontSize: 12,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Buy on Uniswap
              </a>
            ) : (
              <span
                style={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  padding: "9px 16px",
                  borderRadius: 999,
                  border: `1px solid ${GREEN}66`,
                  color: GREEN,
                  fontWeight: 800,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                Trading · Enabling soon
              </span>
            )}
            <a
              href={DEXSCREENER_URL}
              target="_blank"
              rel="noreferrer"
              style={{
                color: MUTED,
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              DexScreener ↗
            </a>
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            position: "relative",
            marginTop: 16,
            paddingTop: 14,
            borderTop: `1px solid ${BORDER}`,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "8px 22px",
            color: MUTED,
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          <span>2B fixed supply</span>
          <span style={{ color: GREEN }}>·</span>
          <span>10% tax</span>
          <span style={{ color: GREEN }}>·</span>
          <span>8 wallets</span>
          <span style={{ color: GREEN }}>·</span>
          <span>No mint</span>
          <span style={{ color: GREEN }}>·</span>
          <span>No blacklist</span>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .blink-token-strip-row {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 14px !important;
            text-align: center;
            justify-items: center;
          }
          .blink-token-strip-row > div:last-child {
            justify-content: center !important;
          }
        }
      `}</style>
    </section>
  );
}
