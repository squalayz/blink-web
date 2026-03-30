"use client";

import Link from "next/link";

const C = {
  bg: "#0A0A0F",
  surface: "#111118",
  card: "#1C1C28",
  primary: "#9945FF",
  accent: "#14F195",
  text: "#F9FAFB",
  textMuted: "#9CA3AF",
  border: "#1F2028",
};

function MMLogo({ size = 44 }: { size?: number }) {
  const h = Math.round(size * (70 / 120));
  return (
    <svg width={size} height={h} viewBox="0 0 120 70">
      <defs>
        <linearGradient id="lgL" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="lgR" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14F195" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="lgM" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="100%" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <circle cx="35" cy="35" r="24" fill="none" stroke="url(#lgL)" strokeWidth="5" />
      <circle cx="65" cy="35" r="24" fill="none" stroke="url(#lgR)" strokeWidth="5" />
      <path
        d="M50 15.4 A24 24 0 0 1 50 54.6 A24 24 0 0 1 50 15.4"
        fill="url(#lgM)"
        opacity="0.3"
      />
      <circle cx="35" cy="14" r="4" fill="url(#lgL)" />
      <circle cx="65" cy="14" r="4" fill="url(#lgR)" />
    </svg>
  );
}

export default function HowItWorks() {
  const claimSteps = [
    {
      num: 1,
      title: "Hunter walks within 100m",
      desc: "GPS verified by MishMesh servers. You have to physically be there.",
    },
    {
      num: 2,
      title: "Humanity check passed",
      desc: "Proves a real person is claiming, not a bot or script.",
    },
    {
      num: 3,
      title: "Oracle issues authorization",
      desc: "MishMesh oracle issues a one-time signed claim authorization. Each authorization can only be used once.",
    },
    {
      num: 4,
      title: "Submit to Solana",
      desc: "Hunter submits the authorization to the Solana program on-chain.",
    },
    {
      num: 5,
      title: "Program verifies signature",
      desc: "The program verifies the ed25519 signature on-chain. Any tampering is rejected.",
    },
    {
      num: 6,
      title: "SOL transfers instantly",
      desc: "SOL transfers directly to your wallet. 400ms finality, less than $0.001 in fees.",
    },
  ];

  const cannotDoItems = [
    "Steal your escrowed SOL \u2014 the program rejects unauthorized withdrawals",
    "Stop you from reclaiming expired orbs \u2014 reclaim_expired is permissionless",
    "Replay a claim authorization \u2014 each nonce is permanently burned on-chain",
    "Change your orb after dropping \u2014 orb data is immutable in the PDA",
    "Block your refund if we shut down \u2014 the program runs forever on Solana",
  ];

  const supportedAssets = [
    {
      name: "SOL",
      sub: "Native",
      desc: "Held directly in the escrow PDA. No token accounts needed. The simplest and fastest way to drop.",
    },
    {
      name: "SPL Tokens",
      sub: "Any SPL token",
      desc: "Held in a program-owned token account. Supports USDC, BONK, JUP, and every other SPL token on Solana.",
    },
    {
      name: "NFTs",
      sub: "Metaplex",
      desc: "Metaplex NFTs transferred to the program. Drop a 1-of-1 artwork, a membership pass, or a collectible.",
    },
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
      {/* Navbar */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          background: "rgba(10,10,15,0.6)",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <MMLogo size={38} />
          <span
            style={{
              fontWeight: 800,
              fontSize: 20,
              color: C.text,
              letterSpacing: "-0.02em",
            }}
          >
            MishMesh
          </span>
        </Link>
        <Link
          href="/auth/signin"
          style={{
            padding: "10px 24px",
            borderRadius: 10,
            border: `1px solid ${C.primary}`,
            background: "transparent",
            color: C.primary,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Sign In
        </Link>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "120px 24px 80px" }}>
        {/* ============================================================ */}
        {/*  Section 1: Your crypto, your control                        */}
        {/* ============================================================ */}
        <section style={{ marginBottom: 100 }}>
          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 900,
              lineHeight: 1.15,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            Your crypto, your control
          </h1>
          <p
            style={{
              color: C.textMuted,
              fontSize: 18,
              textAlign: "center",
              marginBottom: 56,
              maxWidth: 600,
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.6,
            }}
          >
            Understand exactly how MishMesh protects your funds using Solana
            smart contracts.
          </p>

          <div
            style={{
              display: "flex",
              gap: 40,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {/* Left: explanation */}
            <div style={{ flex: "1 1 320px", minWidth: 0 }}>
              <p style={{ color: C.textMuted, fontSize: 16, lineHeight: 1.7, marginBottom: 16 }}>
                When you drop SOL into an orb, it goes into a{" "}
                <span style={{ color: C.accent, fontWeight: 700 }}>
                  program-controlled escrow account
                </span>{" "}
                (called a PDA) on Solana. Not to MishMesh. Not to a company wallet.
              </p>
              <p style={{ color: C.textMuted, fontSize: 16, lineHeight: 1.7, marginBottom: 16 }}>
                Funds are locked by code, not by us. The rules are enforced by the
                Solana program, which is open source and verifiable by anyone.
              </p>
              <p style={{ color: C.textMuted, fontSize: 16, lineHeight: 1.7 }}>
                Only a valid, oracle-signed claim authorization can release the funds.
                If no one claims, you get everything back automatically.
              </p>
            </div>

            {/* Right: visual flow */}
            <div style={{ flex: "1 1 320px", minWidth: 280 }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  padding: "32px 24px",
                }}
              >
                {/* Your Wallet */}
                <div
                  style={{
                    background: "rgba(153,69,255,0.1)",
                    border: `1px solid rgba(153,69,255,0.3)`,
                    borderRadius: 12,
                    padding: "16px 20px",
                    textAlign: "center",
                    marginBottom: 4,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Your Wallet</div>
                </div>

                {/* Arrow down + label */}
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <div
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: 24,
                      background: C.primary,
                    }}
                  />
                  <div style={{ fontSize: 11, color: C.primary, fontWeight: 600, marginTop: 2 }}>
                    Instant lock
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      width: 0,
                      height: 0,
                      borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent",
                      borderTop: `8px solid ${C.primary}`,
                    }}
                  />
                </div>

                {/* Escrow PDA */}
                <div
                  style={{
                    background: "rgba(20,241,149,0.08)",
                    border: `1px solid rgba(20,241,149,0.25)`,
                    borderRadius: 12,
                    padding: "16px 20px",
                    textAlign: "center",
                    marginBottom: 4,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.accent }}>
                    Solana Escrow (PDA)
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                    Code-enforced rules
                  </div>
                </div>

                {/* Arrow down + label */}
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <div
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: 24,
                      background: C.accent,
                    }}
                  />
                  <div style={{ fontSize: 11, color: C.accent, fontWeight: 600, marginTop: 2 }}>
                    Atomic transfer
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      width: 0,
                      height: 0,
                      borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent",
                      borderTop: `8px solid ${C.accent}`,
                    }}
                  />
                </div>

                {/* Hunter Wallet */}
                <div
                  style={{
                    background: "rgba(20,241,149,0.1)",
                    border: `1px solid rgba(20,241,149,0.3)`,
                    borderRadius: 12,
                    padding: "16px 20px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.accent }}>
                    Hunter Wallet
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  Section 2: The claim process                                 */}
        {/* ============================================================ */}
        <section style={{ marginBottom: 100 }}>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 800,
              textAlign: "center",
              marginBottom: 48,
            }}
          >
            The claim process
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {claimSteps.map((step) => (
              <div
                key={step.num}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  padding: "28px 24px",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(153,69,255,0.15)",
                    color: C.primary,
                    fontWeight: 800,
                    fontSize: 16,
                    marginBottom: 16,
                  }}
                >
                  {step.num}
                </div>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    marginBottom: 8,
                    color: C.text,
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/*  Section 3: What MishMesh cannot do                           */}
        {/* ============================================================ */}
        <section style={{ marginBottom: 100 }}>
          <div
            style={{
              background: C.card,
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 16,
              padding: "40px 32px",
            }}
          >
            <h2
              style={{
                fontSize: "clamp(24px, 4vw, 32px)",
                fontWeight: 800,
                marginBottom: 32,
                textAlign: "center",
              }}
            >
              What we cannot do (by design)
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {cannotDoItems.map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      color: "#EF4444",
                      fontWeight: 800,
                      fontSize: 18,
                      lineHeight: "1.5",
                      flexShrink: 0,
                    }}
                  >
                    {"\u2717"}
                  </span>
                  <span
                    style={{
                      color: C.textMuted,
                      fontSize: 15,
                      lineHeight: 1.6,
                    }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  Section 4: Built on Solana                                   */}
        {/* ============================================================ */}
        <section style={{ marginBottom: 100 }}>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 800,
              textAlign: "center",
              marginBottom: 48,
            }}
          >
            Built on Solana
          </h2>

          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: "40px 32px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 32,
                justifyContent: "center",
                flexWrap: "wrap",
                marginBottom: 32,
              }}
            >
              <div>
                <div style={{ fontSize: 32, fontWeight: 900, color: C.accent }}>
                  400ms
                </div>
                <div style={{ fontSize: 14, color: C.textMuted, marginTop: 4 }}>
                  Transaction finality
                </div>
              </div>
              <div>
                <div style={{ fontSize: 32, fontWeight: 900, color: C.accent }}>
                  &lt;$0.001
                </div>
                <div style={{ fontSize: 14, color: C.textMuted, marginTop: 4 }}>
                  Per transaction
                </div>
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: 10,
                padding: "16px 20px",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: C.textMuted,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  marginBottom: 8,
                }}
              >
                Program Address
              </div>
              <a
                href="https://solscan.io/account/placeholder_until_deployed"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "monospace",
                  fontSize: 14,
                  color: C.primary,
                  textDecoration: "none",
                  wordBreak: "break-all",
                }}
              >
                placeholder_until_deployed
              </a>
            </div>

            <p style={{ color: C.textMuted, fontSize: 15, lineHeight: 1.6 }}>
              Transactions cost a fraction of a cent. Claiming a $5 orb costs
              you $0.0005 in fees.
            </p>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  Section 5: Supported assets                                  */}
        {/* ============================================================ */}
        <section style={{ marginBottom: 80 }}>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 800,
              textAlign: "center",
              marginBottom: 48,
            }}
          >
            Supported assets
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
              gap: 20,
            }}
          >
            {supportedAssets.map((asset) => (
              <div
                key={asset.name}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  padding: "28px 24px",
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: 6,
                    background: "rgba(153,69,255,0.12)",
                    color: C.primary,
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: "0.04em",
                    marginBottom: 14,
                  }}
                >
                  {asset.sub}
                </div>
                <h3
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 8,
                    color: C.text,
                  }}
                >
                  {asset.name}
                </h3>
                <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6 }}>
                  {asset.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer
        style={{
          borderTop: `1px solid ${C.border}`,
          padding: "32px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <span style={{ color: C.textMuted, fontSize: 14 }}>MishMesh 2025</span>
        <div style={{ display: "flex", gap: 24 }}>
          <Link
            href="/privacy"
            style={{ color: C.textMuted, fontSize: 14, textDecoration: "none" }}
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            style={{ color: C.textMuted, fontSize: 14, textDecoration: "none" }}
          >
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
