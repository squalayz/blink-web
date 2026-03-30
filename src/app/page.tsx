"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Colors                                                            */
/* ------------------------------------------------------------------ */
const C = {
  bg: "#0A0A0F",
  surface: "#111118",
  card: "#1C1C28",
  primary: "#9945FF",
  accent: "#14F195",
  gold: "#F59E0B",
  text: "#F9FAFB",
  textMuted: "#9CA3AF",
  border: "#1F2028",
};

/* ------------------------------------------------------------------ */
/*  MMLogo                                                            */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Floating particles for the hero background                        */
/* ------------------------------------------------------------------ */
function Particles() {
  const [particles] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 6,
      duration: 6 + Math.random() * 8,
      opacity: 0.15 + Math.random() * 0.35,
    }))
  );

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            bottom: "-5%",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background:
              p.id % 3 === 0
                ? C.primary
                : p.id % 3 === 1
                  ? C.accent
                  : C.gold,
            pointerEvents: "none",
          }}
          animate={{
            y: [0, -(typeof window !== "undefined" ? window.innerHeight * 1.2 : 1000)],
            opacity: [0, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Marquee ticker                                                    */
/* ------------------------------------------------------------------ */
function Ticker() {
  const items = [
    { text: "Alex cracked an orb in Tokyo -- earned ", val: "0.5 SOL" },
    { text: "Maria dropped 50 orbs across Miami", val: "" },
    { text: "James cracked a Legendary orb in London -- earned ", val: "2.1 SOL" },
    { text: "Sofia dropped a golden orb in Berlin", val: "" },
    { text: "Liam cracked an orb in Sydney -- earned ", val: "500 BONK" },
    { text: "Nina dropped 20 orbs across Paris", val: "" },
  ];

  const row = items.map((item, i) => (
    <span
      key={i}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
        padding: "0 32px",
        fontSize: 14,
        color: C.textMuted,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: C.accent,
          flexShrink: 0,
        }}
      />
      {item.text}
      {item.val && (
        <span style={{ color: C.accent, fontWeight: 700 }}>{item.val}</span>
      )}
    </span>
  ));

  return (
    <div
      style={{
        overflow: "hidden",
        width: "100%",
        padding: "20px 0",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "max-content",
          animation: "marquee 40s linear infinite",
        }}
      >
        {row}
        {row}
      </div>
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                   */
/* ------------------------------------------------------------------ */
function Section({
  children,
  style,
  id,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  id?: string;
}) {
  return (
    <section
      id={id}
      style={{
        width: "100%",
        maxWidth: 1200,
        margin: "0 auto",
        padding: "100px 24px",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Heading helper                                                    */
/* ------------------------------------------------------------------ */
function SectionHeading({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      style={{ textAlign: "center", marginBottom: 56 }}
    >
      <h2
        style={{
          fontSize: "clamp(28px, 5vw, 48px)",
          fontWeight: 800,
          color: C.text,
          lineHeight: 1.2,
        }}
      >
        {children}
      </h2>
      {sub && (
        <p
          style={{
            marginTop: 16,
            color: C.textMuted,
            fontSize: 18,
            maxWidth: 600,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.6,
          }}
        >
          {sub}
        </p>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                         */
/* ------------------------------------------------------------------ */
export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetch("/api/auth/siwe/session")
      .then((r) => r.json())
      .then((session) => {
        if (session?.user) {
          router.push("/dashboard");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  useEffect(() => {
    if (!checking) setMounted(true);
  }, [checking]);

  /* -- Loading splash --------------------------------------------- */
  if (checking) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <MMLogo size={80} />
          <div
            style={{
              fontWeight: 800,
              fontSize: 28,
              marginTop: 16,
              background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            MishMesh
          </div>
        </div>
      </div>
    );
  }

  /* -- HOW IT WORKS cards ----------------------------------------- */
  const steps = [
    {
      num: "01",
      title: "Drop",
      body: "Load an orb with SOL, SPL tokens, or an NFT. Write a message. Set a claim fee. Drop it anywhere on Earth.",
    },
    {
      num: "02",
      title: "Hunt",
      body: "Open the map. See glowing orbs nearby. Get within 100 meters. The orb pulses gold.",
    },
    {
      num: "03",
      title: "Crack",
      body: "Tap to crack it open. Pay the claim fee. Earn the crypto inside. The world is your treasure map.",
    },
  ];

  /* -- CURRENCIES -------------------------------------------------- */
  const currencies = [
    {
      name: "Solana",
      symbol: "SOL",
      desc: "Lightning-fast transactions with near-zero fees. The backbone of MishMesh drops.",
    },
    {
      name: "SPL Tokens",
      symbol: "SPL",
      desc: "Any token on Solana. Drop USDC, BONK, JUP, or any SPL token into orbs worldwide.",
    },
    {
      name: "NFTs",
      symbol: "NFT",
      desc: "Metaplex NFTs on Solana. Hide collectibles, art, and membership passes for hunters to find.",
    },
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", overflowX: "hidden" }}>
      {/* ============================================================ */}
      {/*  NAVBAR                                                      */}
      {/* ============================================================ */}
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
            transition: "background 0.2s, color 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = C.primary;
            (e.currentTarget as HTMLAnchorElement).style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
            (e.currentTarget as HTMLAnchorElement).style.color = C.primary;
          }}
        >
          Sign In
        </Link>
      </nav>

      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Background radial glow */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "80vw",
            height: "80vw",
            maxWidth: 900,
            maxHeight: 900,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(153,69,255,0.12) 0%, rgba(153,69,255,0.03) 50%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Secondary accent glow */}
        <div
          style={{
            position: "absolute",
            top: "60%",
            left: "65%",
            width: "40vw",
            height: "40vw",
            maxWidth: 500,
            maxHeight: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(20,241,149,0.05) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />

        {/* Particles */}
        {mounted && <Particles />}

        {/* Content */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            textAlign: "center",
            padding: "0 24px",
            maxWidth: 860,
          }}
        >
          {/* Pulsing orb */}
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              boxShadow: [
                "0 0 60px 20px rgba(153,69,255,0.3), 0 0 120px 60px rgba(153,69,255,0.12)",
                "0 0 80px 30px rgba(153,69,255,0.5), 0 0 160px 80px rgba(153,69,255,0.2)",
                "0 0 60px 20px rgba(153,69,255,0.3), 0 0 120px 60px rgba(153,69,255,0.12)",
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              width: 100,
              height: 100,
              margin: "0 auto 48px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 35% 35%, #c084fc, #9945FF 50%, #6B21A8 100%)",
              boxShadow:
                "0 0 60px 20px rgba(153,69,255,0.3), 0 0 120px 60px rgba(153,69,255,0.12)",
            }}
          />

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              fontSize: "clamp(40px, 7vw, 80px)",
              fontWeight: 900,
              color: "#fff",
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              marginBottom: 24,
            }}
          >
            Drop crypto into the world.
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #9945FF, #14F195)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Hunt it down. Crack it open.
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{
              color: C.textMuted,
              fontSize: "clamp(16px, 2.5vw, 20px)",
              maxWidth: 620,
              margin: "0 auto 40px",
              lineHeight: 1.6,
            }}
          >
            MishMesh hides real crypto at GPS locations around the world. Walk to
            within 100m. Crack the orb. Earn SOL, tokens, and NFTs on Solana.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: 28,
            }}
          >
            <Link
              href="/map"
              style={{
                padding: "16px 40px",
                borderRadius: 12,
                background: C.primary,
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
                textDecoration: "none",
                boxShadow: "0 0 30px rgba(153,69,255,0.4)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform =
                  "translateY(-2px)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                  "0 0 40px rgba(153,69,255,0.6)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform =
                  "translateY(0)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                  "0 0 30px rgba(153,69,255,0.4)";
              }}
            >
              Start Hunting
            </Link>
            <Link
              href="/drop"
              style={{
                padding: "16px 40px",
                borderRadius: 12,
                background: "transparent",
                border: `1px solid ${C.primary}`,
                color: C.primary,
                fontWeight: 700,
                fontSize: 16,
                textDecoration: "none",
                transition: "background 0.2s, color 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "rgba(153,69,255,0.1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "transparent";
              }}
            >
              Drop an Orb
            </Link>
          </motion.div>

          {/* Currency badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {["SOL", "SPL Tokens", "NFTs"].map((c) => (
              <span
                key={c}
                style={{
                  padding: "6px 16px",
                  borderRadius: 100,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: C.textMuted,
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                {c}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Bottom gradient fade */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 160,
            background: `linear-gradient(transparent, ${C.bg})`,
            pointerEvents: "none",
          }}
        />
      </section>

      {/* ============================================================ */}
      {/*  HOW IT WORKS                                                */}
      {/* ============================================================ */}
      <Section id="how">
        <SectionHeading sub="Three steps to hidden crypto.">
          How it works
        </SectionHeading>

        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              style={{
                flex: "1 1 300px",
                maxWidth: 380,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                padding: 32,
              }}
            >
              <span
                style={{
                  color: C.primary,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                }}
              >
                {s.num}
              </span>
              <h3
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: C.text,
                  margin: "12px 0 16px",
                }}
              >
                {s.title}
              </h3>
              <p style={{ color: C.textMuted, lineHeight: 1.65, fontSize: 15 }}>
                {s.body}
              </p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  ECONOMICS                                                   */}
      {/* ============================================================ */}
      <Section>
        <SectionHeading sub="Simple, transparent fee structure.">
          How the money works
        </SectionHeading>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 20,
            padding: "48px 40px",
            maxWidth: 720,
            margin: "0 auto",
          }}
        >
          {/* Split graphic */}
          <div
            style={{
              display: "flex",
              gap: 24,
              marginBottom: 32,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                flex: "1 1 200px",
                background: "rgba(153,69,255,0.08)",
                border: "1px solid rgba(153,69,255,0.2)",
                borderRadius: 14,
                padding: "24px 20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 36, fontWeight: 900, color: C.primary }}>
                80%
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: C.textMuted,
                  marginTop: 4,
                  fontWeight: 500,
                }}
              >
                Goes to the dropper
              </div>
            </div>
            <div
              style={{
                flex: "1 1 200px",
                background: "rgba(20,241,149,0.06)",
                border: "1px solid rgba(20,241,149,0.15)",
                borderRadius: 14,
                padding: "24px 20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 36, fontWeight: 900, color: C.accent }}>
                20%
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: C.textMuted,
                  marginTop: 4,
                  fontWeight: 500,
                }}
              >
                Platform fee to MishMesh
              </div>
            </div>
          </div>

          {/* Example */}
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              borderRadius: 12,
              padding: "20px 24px",
              textAlign: "center",
            }}
          >
            <p style={{ color: C.textMuted, fontSize: 15, lineHeight: 1.7 }}>
              Drop 1 SOL. Set a{" "}
              <span style={{ color: C.accent, fontWeight: 700 }}>$2</span> claim
              fee. 100 hunters find it. You earn{" "}
              <span style={{ color: C.accent, fontWeight: 700 }}>$160</span> in
              fees alone.
            </p>
          </div>
        </motion.div>
      </Section>

      {/* ============================================================ */}
      {/*  SECURITY                                                    */}
      {/* ============================================================ */}
      <Section>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 20,
            padding: "60px 40px",
            maxWidth: 900,
            margin: "0 auto",
            display: "flex",
            gap: 40,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* Left side */}
          <div style={{ flex: "1 1 400px", minWidth: 0 }}>
            <span
              style={{
                display: "inline-block",
                padding: "4px 14px",
                borderRadius: 100,
                border: `1px solid ${C.primary}`,
                color: C.primary,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                marginBottom: 20,
              }}
            >
              SECURITY
            </span>
            <h2
              style={{
                fontSize: "clamp(24px, 4vw, 36px)",
                fontWeight: 800,
                color: C.text,
                lineHeight: 1.2,
                marginBottom: 16,
              }}
            >
              Your keys. Your crypto. Always.
            </h2>
            <p
              style={{
                color: C.textMuted,
                fontSize: 15,
                lineHeight: 1.7,
                marginBottom: 24,
              }}
            >
              MishMesh never sees your private key. Not when we create it. Not
              ever. Your wallet is generated on your device and encrypted with
              your phone hardware. We could not access it even if we wanted to.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                "Generated on your device \u2014 never transmitted to our servers",
                "Encrypted by your phone hardware (iOS Secure Enclave / Android Keystore)",
                "Export your private key anytime \u2014 it is yours to take anywhere",
                "Biometric authentication required to reveal your key",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      color: C.accent,
                      fontWeight: 700,
                      fontSize: 16,
                      lineHeight: "1.5",
                      flexShrink: 0,
                    }}
                  >
                    {"\u2713"}
                  </span>
                  <span
                    style={{
                      color: C.textMuted,
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/how-it-works"
              style={{
                display: "inline-block",
                marginTop: 24,
                color: C.primary,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
              }}
            >
              How escrow works &rarr;
            </Link>
          </div>

          {/* Right side — mock private key card */}
          <div style={{ flex: "1 1 260px", minWidth: 240 }}>
            <div
              style={{
                background: C.card,
                borderRadius: 16,
                padding: "28px 24px",
                border: "1px solid rgba(239,68,68,0.25)",
                boxShadow: "0 0 30px rgba(239,68,68,0.08)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "#EF4444",
                  textTransform: "uppercase" as const,
                  marginBottom: 16,
                }}
              >
                PRIVATE KEY
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 13,
                  color: C.textMuted,
                  lineHeight: 1.8,
                  filter: "blur(4px)",
                  userSelect: "none",
                  marginBottom: 16,
                }}
              >
                5Kd3NBUAdUnhyzenE
                <br />
                wVnHGnet3TXd4kGIG
                <br />
                njAXoE6FzNUbeW7yR
              </div>
              <div
                style={{
                  color: C.textMuted,
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                Tap to reveal
              </div>
              <div
                style={{
                  color: C.accent,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Protected by Face ID
              </div>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* ============================================================ */}
      {/*  CURRENCIES                                                  */}
      {/* ============================================================ */}
      <Section>
        <SectionHeading sub="Real crypto. Real ownership. Real value.">
          Supported currencies
        </SectionHeading>

        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {currencies.map((cur, i) => (
            <motion.div
              key={cur.symbol}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              style={{
                flex: "1 1 300px",
                maxWidth: 380,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                padding: 32,
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "6px 14px",
                  borderRadius: 8,
                  background:
                    cur.symbol === "SOL"
                      ? "rgba(153,69,255,0.12)"
                      : cur.symbol === "SPL"
                        ? "rgba(20,241,149,0.12)"
                        : "rgba(245,158,11,0.12)",
                  color:
                    cur.symbol === "SOL"
                      ? C.primary
                      : cur.symbol === "SPL"
                        ? C.accent
                        : C.gold,
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: "0.04em",
                  marginBottom: 16,
                }}
              >
                {cur.symbol}
              </div>
              <h3
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: C.text,
                  marginBottom: 10,
                }}
              >
                {cur.name}
              </h3>
              <p style={{ color: C.textMuted, lineHeight: 1.6, fontSize: 15 }}>
                {cur.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  LIVE ACTIVITY TICKER                                        */}
      {/* ============================================================ */}
      <section style={{ padding: "60px 0" }}>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p
            style={{
              textAlign: "center",
              color: C.textMuted,
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase" as const,
              letterSpacing: "0.1em",
              marginBottom: 16,
            }}
          >
            Happening right now
          </p>
          <div
            style={{
              borderTop: `1px solid ${C.border}`,
              borderBottom: `1px solid ${C.border}`,
              background: "rgba(255,255,255,0.015)",
            }}
          >
            <Ticker />
          </div>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  CTA                                                         */}
      {/* ============================================================ */}
      <Section style={{ textAlign: "center" }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          {/* Glow backdrop */}
          <div
            style={{
              position: "relative",
              display: "inline-block",
              marginBottom: 32,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 300,
                height: 300,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(153,69,255,0.15) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <h2
              style={{
                position: "relative",
                fontSize: "clamp(32px, 6vw, 56px)",
                fontWeight: 900,
                color: C.text,
                lineHeight: 1.15,
              }}
            >
              Ready to hunt?
            </h2>
          </div>

          <p
            style={{
              color: C.textMuted,
              fontSize: 18,
              marginBottom: 40,
              lineHeight: 1.6,
            }}
          >
            No download required. Works in your browser.
          </p>

          <Link
            href="/map"
            style={{
              display: "inline-block",
              padding: "18px 52px",
              borderRadius: 14,
              background: `linear-gradient(135deg, ${C.primary}, #7C3AED)`,
              color: "#fff",
              fontWeight: 700,
              fontSize: 18,
              textDecoration: "none",
              boxShadow:
                "0 0 40px rgba(153,69,255,0.35), 0 4px 20px rgba(0,0,0,0.3)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform =
                "translateY(-3px)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                "0 0 60px rgba(153,69,255,0.5), 0 8px 30px rgba(0,0,0,0.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform =
                "translateY(0)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                "0 0 40px rgba(153,69,255,0.35), 0 4px 20px rgba(0,0,0,0.3)";
            }}
          >
            Open the Map
          </Link>
        </motion.div>
      </Section>

      {/* ============================================================ */}
      {/*  FOOTER                                                      */}
      {/* ============================================================ */}
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
            style={{
              color: C.textMuted,
              fontSize: 14,
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = C.text;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = C.textMuted;
            }}
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            style={{
              color: C.textMuted,
              fontSize: 14,
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = C.text;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = C.textMuted;
            }}
          >
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
