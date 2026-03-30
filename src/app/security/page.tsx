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

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        padding: "48px 40px",
        maxWidth: 800,
        margin: "0 auto 32px",
      }}
    >
      <h2
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: C.text,
          marginBottom: 28,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function SecurityPage() {
  const flowSteps = [
    "You sign up with your phone",
    "Privy.io generates a key pair on your device",
    "Private key encrypted by Secure Enclave",
    "Public key (wallet address) sent to MishMesh",
    "You are ready to hunt",
  ];

  const canSee = [
    "Your wallet ADDRESS (public)",
    "Your username",
    "Your orb activity",
    "Your profile",
  ];

  const cannotSee = [
    "Your private key",
    "Your key phrase",
    "Your key password",
    "Any other wallets you own",
  ];

  const exportSteps = [
    "Profile",
    "Settings",
    "Private Key",
    "Face ID",
    "Key revealed for 30 seconds",
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

      {/* Hero */}
      <section
        style={{
          paddingTop: 140,
          paddingBottom: 80,
          textAlign: "center",
          maxWidth: 800,
          margin: "0 auto",
          padding: "140px 24px 80px",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(32px, 6vw, 56px)",
            fontWeight: 900,
            lineHeight: 1.15,
            marginBottom: 20,
          }}
        >
          Bank-grade security.
          <br />
          Crypto simplicity.
        </h1>
        <p
          style={{
            color: C.textMuted,
            fontSize: 18,
            lineHeight: 1.6,
            maxWidth: 560,
            margin: "0 auto",
          }}
        >
          Your private key never leaves your device. Here is exactly how we keep
          it that way.
        </p>
      </section>

      {/* Cards */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 100px" }}>
        {/* Card 1 — How your wallet is created */}
        <Card title="How your wallet is created">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {flowSteps.map((step, i) => (
              <div
                key={step}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0,
                }}
              >
                <div
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "16px 20px",
                    textAlign: "center",
                    minWidth: 120,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: C.primary,
                      letterSpacing: "0.08em",
                      marginBottom: 6,
                    }}
                  >
                    STEP {i + 1}
                  </div>
                  <div
                    style={{
                      color: C.text,
                      fontSize: 13,
                      lineHeight: 1.4,
                    }}
                  >
                    {step}
                  </div>
                </div>
                {i < flowSteps.length - 1 && (
                  <div
                    style={{
                      color: C.primary,
                      fontSize: 20,
                      padding: "0 8px",
                      flexShrink: 0,
                    }}
                  >
                    &rarr;
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Card 2 — What MishMesh can see */}
        <Card title="What MishMesh can see">
          <div
            style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            {/* Can see */}
            <div style={{ flex: "1 1 280px" }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: C.accent,
                  textTransform: "uppercase" as const,
                  marginBottom: 16,
                }}
              >
                Can see
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {canSee.map((item) => (
                  <div
                    key={item}
                    style={{ display: "flex", gap: 10, alignItems: "center" }}
                  >
                    <span
                      style={{
                        color: C.accent,
                        fontWeight: 700,
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      {"\u2713"}
                    </span>
                    <span style={{ color: C.textMuted, fontSize: 14 }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cannot see */}
            <div style={{ flex: "1 1 280px" }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "#EF4444",
                  textTransform: "uppercase" as const,
                  marginBottom: 16,
                }}
              >
                Cannot see
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {cannotSee.map((item) => (
                  <div
                    key={item}
                    style={{ display: "flex", gap: 10, alignItems: "center" }}
                  >
                    <span
                      style={{
                        color: "#EF4444",
                        fontWeight: 700,
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      {"\u2717"}
                    </span>
                    <span style={{ color: C.textMuted, fontSize: 14 }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Card 3 — Exporting your key */}
        <Card title="Exporting your key">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            {exportSteps.map((step, i) => (
              <div
                key={step}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <div
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: "10px 16px",
                    color: C.text,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {step}
                </div>
                {i < exportSteps.length - 1 && (
                  <span
                    style={{
                      color: C.primary,
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    &rarr;
                  </span>
                )}
              </div>
            ))}
          </div>
          <div
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: 12,
              padding: "16px 20px",
            }}
          >
            <p
              style={{
                color: "#F59E0B",
                fontSize: 14,
                lineHeight: 1.6,
                fontWeight: 500,
                margin: 0,
              }}
            >
              Treat your private key like cash. Anyone who has it owns your
              funds.
            </p>
          </div>
        </Card>

        {/* Card 4 — Powered by Privy */}
        <Card title="Powered by Privy">
          <p
            style={{
              color: C.textMuted,
              fontSize: 15,
              lineHeight: 1.7,
              marginBottom: 20,
            }}
          >
            MishMesh uses Privy.io for wallet infrastructure — the same
            technology trusted by Coinbase, friend.tech, and thousands of other
            crypto apps.
          </p>
          <a
            href="https://privy.io"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: C.primary,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Learn more at privy.io &rarr;
          </a>
        </Card>
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
          maxWidth: 1200,
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
