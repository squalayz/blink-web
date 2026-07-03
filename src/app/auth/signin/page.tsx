"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/components/providers";
import { sounds } from "@/lib/sounds";

const GREEN = "#00FF88";
const GREEN2 = "#88FF00";
const BG = "#0a0a0f";
const WHITE = "#FFFFFF";
const MUTED = "#8a8a99";

export default function SignInPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"signup" | "signin">("signup");

  // If already signed in, send the user onward.
  useEffect(() => {
    if (!loading && user) {
      router.replace("/map");
    }
  }, [loading, user, router]);

  // Auto-open the modal once we know the user is signed out.
  useEffect(() => {
    if (!loading && !user) {
      setModalOpen(true);
    }
  }, [loading, user]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: BG,
        color: WHITE,
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <Starfield />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          padding: "32px 20px",
          boxSizing: "border-box",
        }}
      >
        <BlinkEye />

        <h1
          style={{
            fontFamily: "ui-rounded, 'SF Pro Rounded', 'Space Grotesk', 'Inter', sans-serif",
            fontSize: "clamp(44px, 6vw, 58px)",
            fontWeight: 900,
            letterSpacing: "0.17em",
            color: WHITE,
            margin: 0,
            marginRight: "-0.17em",
            lineHeight: 1,
            textShadow:
              "0 0 18px rgba(0,255,136,0.85), 0 2px 8px rgba(0,0,0,0.6)",
          }}
        >
          BLINK
        </h1>

        <p
          style={{
            fontFamily: "ui-rounded, 'SF Pro Rounded', 'Space Grotesk', 'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "6px",
            color: GREEN,
            textTransform: "uppercase",
            textAlign: "center",
            margin: 0,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        >
          The World Is Alive
        </p>

        <p
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            color: "rgba(255,255,255,0.7)",
            textAlign: "center",
            margin: 0,
            textShadow: "0 1px 6px rgba(0,0,0,0.7)",
          }}
        >
          Walk. Discover. Connect.
        </p>

        <p
          style={{
            color: MUTED,
            fontSize: 14,
            margin: 0,
            maxWidth: 460,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          Pick a username. Pick a password. We give you an ETH wallet —
          right inside your account. No browser extensions, no seed phrases to save.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => {
              setModalMode("signup");
              setModalOpen(true);
              sounds.play("tick");
            }}
            style={{
              fontFamily: "ui-rounded, 'SF Pro Rounded', 'Space Grotesk', 'Inter', sans-serif",
              height: 56,
              padding: "0 32px",
              borderRadius: 16,
              border: "none",
              background: `linear-gradient(90deg, ${GREEN2}, ${GREEN})`,
              color: "#000",
              fontSize: 17,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 6px 18px rgba(0,255,136,0.45)",
            }}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setModalMode("signin");
              setModalOpen(true);
              sounds.play("tick");
            }}
            style={{
              fontFamily: "ui-rounded, 'SF Pro Rounded', 'Space Grotesk', 'Inter', sans-serif",
              height: 56,
              padding: "0 32px",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(22px)",
              WebkitBackdropFilter: "blur(22px)",
              color: WHITE,
              fontSize: 17,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Sign In
          </button>
        </div>
      </div>

      <AuthModal
        open={modalOpen}
        initialMode={modalMode}
        onClose={() => setModalOpen(false)}
        onSuccess={() => router.replace("/map")}
      />

      <style>{KEYFRAMES}</style>
    </div>
  );
}

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

function BlinkEye() {
  return (
    <div
      style={{
        position: "relative",
        width: 148,
        height: 148,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        aria-hidden
        className="blink-signin-anim"
        style={{
          position: "absolute",
          inset: -28,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,255,136,0.45) 0%, rgba(0,255,136,0) 65%)",
          filter: "blur(8px)",
          animation: "blinkHalo 2.6s ease-in-out infinite",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="blink-signin-anim"
        src="/brand/logo-orb-glow.png"
        alt="BLINK"
        fetchPriority="high"
        decoding="async"
        width={148}
        height={148}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          animation: "blinkIrisPulse 3s ease-in-out infinite",
          filter:
            "drop-shadow(0 0 28px rgba(0,255,136,0.55)) drop-shadow(0 0 64px rgba(0,255,136,0.22))",
        }}
      />
    </div>
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
@media (prefers-reduced-motion: reduce) {
  .blink-star-layer, .blink-aurora, .blink-signin-anim { animation: none; }
}
`;
