"use client";

import Link from "next/link";
import Image from "next/image";

const C = {
  bg: "#0a0a0f",
  surface: "#0d0d14",
  card: "#1a1a24",
  primary: "#00FF88",
  accent: "#88FF00",
  text: "#FFFFFF",
  textMuted: "#8a8a99",
  border: "#1a1a24",
};

export default function HowItWorks() {
  const watchSteps = [
    {
      num: 1,
      title: "Watch",
      desc: "Open The Eye Map. Creatures shimmer at real-world coordinates only Watchers can see. Each one waits where it spawned.",
    },
    {
      num: 2,
      title: "Approach",
      desc: "Move toward the Creature. GPS verifies your real presence. Get within range and the air starts to change.",
    },
    {
      num: 3,
      title: "Witness",
      desc: "Hold steady. Confirm the catch. The Creature is recorded in your trail and stitched into your Council standing.",
    },
  ];

  const rules = [
    "You must physically be at the spawn point. No teleporting, no spoofing.",
    "Every catch is verified through The Eye. Fake locations are rejected.",
    "Rare Creatures appear less often and in unpredictable places.",
    "Your activity earns standing in The Council, the ranked order of Watchers.",
    "$BLINK token rewards are coming. Early Watchers are remembered.",
  ];

  const creatureKinds = [
    {
      name: "Sprite",
      sub: "Common",
      desc: "Quick, common, shy. The first thing most Watchers ever catch. Spawns everywhere there is movement.",
    },
    {
      name: "Cyclops",
      sub: "Rare",
      desc: "Single-eyed sentinels that drift between high-traffic spawn lines. Hard to catch without patience.",
    },
    {
      name: "Serpent",
      sub: "Legendary",
      desc: "Long, slow, unmistakable. Legendary Creatures appear at strange hours and reward bold Watchers.",
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
          <Image
            src="/blink-logo.webp"
            alt="BLINK"
            width={38}
            height={38}
            style={{ objectFit: "contain" }}
          />
          <span
            style={{
              fontWeight: 800,
              fontSize: 20,
              color: C.text,
              letterSpacing: "-0.02em",
            }}
          >
            BLINK
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
          Enter The Eye
        </Link>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "120px 24px 80px" }}>
        {/* ============================================================ */}
        {/*  Section 1: Don't blink                                       */}
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
            Don&apos;t blink. The Eye is open.
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
            BLINK is a real-world catching game. Creatures spawn at real
            coordinates. You walk. You watch. You witness.
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
                The Eye is open across cities, parks, alleys and skylines.
                Creatures appear at{" "}
                <span style={{ color: C.primary, fontWeight: 700 }}>
                  precise GPS spawn points
                </span>
                . You have to physically be there. No spoofing, no shortcuts.
              </p>
              <p style={{ color: C.textMuted, fontSize: 16, lineHeight: 1.7, marginBottom: 16 }}>
                Every catch is verified through The Mesh of Eyes. Your record is
                stitched onto your trail and into The Council standings.
              </p>
              <p style={{ color: C.textMuted, fontSize: 16, lineHeight: 1.7 }}>
                $BLINK token rewards are coming. Watchers who catch early are
                remembered. The Eye does not forget.
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
                {/* You */}
                <div
                  style={{
                    background: "rgba(0,255,136,0.1)",
                    border: `1px solid rgba(0,255,136,0.3)`,
                    borderRadius: 12,
                    padding: "16px 20px",
                    textAlign: "center",
                    marginBottom: 4,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15 }}>You</div>
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
                    Approach
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

                {/* Spawn point */}
                <div
                  style={{
                    background: "rgba(136,255,0,0.08)",
                    border: `1px solid rgba(136,255,0,0.25)`,
                    borderRadius: 12,
                    padding: "16px 20px",
                    textAlign: "center",
                    marginBottom: 4,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.accent }}>
                    Spawn point
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                    GPS verified by The Eye
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
                    Witness
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

                {/* Caught */}
                <div
                  style={{
                    background: "rgba(0,255,136,0.1)",
                    border: `1px solid rgba(0,255,136,0.3)`,
                    borderRadius: 12,
                    padding: "16px 20px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.primary }}>
                    Caught
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                    Trail updated. Council notices.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  Section 2: Watch, Approach, Witness                          */}
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
            Watch. Approach. Witness.
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {watchSteps.map((step) => (
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
                    background: "rgba(0,255,136,0.15)",
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
        {/*  Section 3: Rules of The Eye                                  */}
        {/* ============================================================ */}
        <section style={{ marginBottom: 100 }}>
          <div
            style={{
              background: C.card,
              border: `1px solid rgba(0,255,136,0.25)`,
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
              Rules of The Eye
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {rules.map((item) => (
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
                      color: C.primary,
                      fontWeight: 800,
                      fontSize: 18,
                      lineHeight: "1.5",
                      flexShrink: 0,
                    }}
                  >
                    {"•"}
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
        {/*  Section 4: $BLINK rewards (coming)                           */}
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
            $BLINK token rewards are coming
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
                <div style={{ fontSize: 32, fontWeight: 900, color: C.primary }}>
                  Watch
                </div>
                <div style={{ fontSize: 14, color: C.textMuted, marginTop: 4 }}>
                  Earn standing in The Council
                </div>
              </div>
              <div>
                <div style={{ fontSize: 32, fontWeight: 900, color: C.accent }}>
                  Catch
                </div>
                <div style={{ fontSize: 14, color: C.textMuted, marginTop: 4 }}>
                  Build your trail of witnessed Creatures
                </div>
              </div>
              <div>
                <div style={{ fontSize: 32, fontWeight: 900, color: C.primary }}>
                  $BLINK
                </div>
                <div style={{ fontSize: 14, color: C.textMuted, marginTop: 4 }}>
                  Early Watchers are remembered
                </div>
              </div>
            </div>

            <p style={{ color: C.textMuted, fontSize: 15, lineHeight: 1.6, maxWidth: 560, margin: "0 auto" }}>
              Your trail, your Creatures and your Council standing are recorded
              now. When $BLINK arrives, the ledger is already written.
            </p>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  Section 5: Creature kinds                                    */}
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
            What you will witness
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
              gap: 20,
            }}
          >
            {creatureKinds.map((kind) => (
              <div
                key={kind.name}
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
                    background: "rgba(0,255,136,0.12)",
                    color: C.primary,
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: "0.04em",
                    marginBottom: 14,
                  }}
                >
                  {kind.sub}
                </div>
                <h3
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 8,
                    color: C.text,
                  }}
                >
                  {kind.name}
                </h3>
                <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6 }}>
                  {kind.desc}
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
        <span style={{ color: C.textMuted, fontSize: 14 }}>BLINK {new Date().getFullYear()}</span>
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
