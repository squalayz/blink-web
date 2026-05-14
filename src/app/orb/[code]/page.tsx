"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";
import { useAuth } from "@/components/providers";

type GiftRarity = "Common" | "Rare" | "Epic" | "Legendary";

interface GiftOrb {
  id: string;
  code: string;
  sender_id: string;
  sender_handle: string;
  sender_avatar_url: string | null;
  amount: number;
  currency: string;
  message: string | null;
  rarity: GiftRarity;
  is_mystery: boolean;
  claimed: boolean;
  claimed_by: string | null;
  claimed_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const RARITY_COLORS: Record<GiftRarity, string> = {
  Common: "#8a8a99",
  Rare: "#00FF88",
  Epic: "#00FF88",
  Legendary: "#88FF00",
};

const KEYFRAMES = `
@keyframes orbFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-14px); }
}
@keyframes glowPulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.15); }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

export default function GiftOrbLandingPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { user, loading: authLoading } = useAuth();

  const [orb, setOrb] = useState<GiftOrb | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [expired, setExpired] = useState(false);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    async function fetchOrb() {
      try {
        const { data, error } = await supabase
          .from("gift_orbs")
          .select("*")
          .eq("code", code)
          .single();

        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setOrb(data);

        if (data.claimed) {
          setClaimed(true);
        }

        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setExpired(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    if (code) fetchOrb();
  }, [code]);

  // Countdown timer
  useEffect(() => {
    if (!orb?.expires_at || expired || claimed) return;

    function updateCountdown() {
      const now = new Date().getTime();
      const target = new Date(orb!.expires_at!).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setExpired(true);
        setCountdown("");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [orb, expired, claimed]);

  async function handleClaim() {
    if (!user) {
      const returnUrl = encodeURIComponent(`/orb/${code}`);
      router.push(`/auth/signin?redirect=${returnUrl}`);
      return;
    }

    if (!orb) return;
    setClaiming(true);

    try {
      const { error } = await supabase
        .from("gift_orbs")
        .update({
          claimed: true,
          claimed_by: user.id,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", orb.id)
        .eq("claimed", false);

      if (error) throw error;
      setClaimed(true);
      setOrb({ ...orb, claimed: true, claimed_by: user.id });
    } catch (e: any) {
      alert(e?.message || "Failed to claim creature");
    } finally {
      setClaiming(false);
    }
  }

  const rarity: GiftRarity = orb?.rarity || "Common";
  const glowColor = RARITY_COLORS[rarity];

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          color: C.muted,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
        Loading...
      </div>
    );
  }

  if (notFound) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          color: C.text,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          textAlign: "center",
        }}
      >
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" style={{ marginBottom: 20 }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <circle cx="12" cy="16" r="0.5" fill={C.muted} />
        </svg>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Gift Not Found</div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>
          This creature link is invalid or has been removed.
        </div>
        <button
          onClick={() => router.push("/")}
          style={{
            background: C.indigo,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "12px 24px",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Go Home
        </button>
      </div>
    );
  }

  const isMystery = orb?.is_mystery && !claimed;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor}22, transparent 70%)`,
          pointerEvents: "none",
          animation: "glowPulse 3s ease-in-out infinite",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: 400,
          width: "100%",
          animation: "fadeIn 0.6s ease-out",
        }}
      >
        {/* Rarity Badge */}
        <div
          style={{
            background: `${glowColor}22`,
            color: glowColor,
            border: `1px solid ${glowColor}44`,
            borderRadius: 20,
            padding: "4px 14px",
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            marginBottom: 28,
          }}
        >
          {rarity}
        </div>

        {/* Animated Orb */}
        <div
          style={{
            animation: "orbFloat 3s ease-in-out infinite",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: `radial-gradient(circle at 35% 35%, ${glowColor}dd, ${glowColor}44 60%, transparent 80%)`,
              boxShadow: `0 0 60px ${glowColor}44, 0 0 120px ${glowColor}22, inset 0 0 40px ${glowColor}33`,
              position: "relative",
            }}
          >
            {/* Inner shine */}
            <div
              style={{
                position: "absolute",
                top: "18%",
                left: "22%",
                width: "28%",
                height: "28%",
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(255,255,255,0.6), transparent)`,
              }}
            />
          </div>
        </div>

        {/* Sender */}
        {orb && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            {orb.sender_avatar_url ? (
              <img
                src={orb.sender_avatar_url}
                alt="Creature sender avatar"
                style={{ width: 32, height: 32, borderRadius: 10, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: C.s2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
            <div style={{ fontSize: 14, color: C.muted }}>
              Sent by <span style={{ color: C.text, fontWeight: 600 }}>@{orb.sender_handle || "someone"}</span>
            </div>
          </div>
        )}

        {/* Value */}
        {isMystery ? (
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: glowColor }}>Mystery Creature</div>
            <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>Claim to reveal the value inside</div>
          </div>
        ) : (
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: C.text }}>
              {orb?.amount} <span style={{ fontSize: 20, color: C.muted }}>{orb?.currency}</span>
            </div>
          </div>
        )}

        {/* Message */}
        {orb?.message && (
          <div
            style={{
              background: C.card,
              borderRadius: 14,
              padding: "14px 18px",
              marginBottom: 24,
              border: `1px solid ${C.border}`,
              width: "100%",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 14, color: C.muted, fontStyle: "italic", lineHeight: 1.5 }}>
              &ldquo;{orb.message}&rdquo;
            </div>
          </div>
        )}

        {/* Countdown */}
        {countdown && !expired && !claimed && (
          <div
            style={{
              fontSize: 13,
              color: C.danger,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            Expires in {countdown}
          </div>
        )}

        {/* States */}
        {expired && !claimed && (
          <div
            style={{
              background: `${C.danger}18`,
              border: `1px solid ${C.danger}44`,
              borderRadius: 14,
              padding: "20px 24px",
              textAlign: "center",
              width: "100%",
              marginBottom: 20,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="1.5" style={{ marginBottom: 8 }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.danger }}>This creature has expired</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
              It was not claimed in time and has been returned to the sender.
            </div>
          </div>
        )}

        {claimed && (
          <div
            style={{
              background: `${C.indigo}18`,
              border: `1px solid ${C.indigo}44`,
              borderRadius: 14,
              padding: "20px 24px",
              textAlign: "center",
              width: "100%",
              marginBottom: 20,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.indigo} strokeWidth="2" style={{ marginBottom: 8 }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="M22 4L12 14.01l-3-3" />
            </svg>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.indigo }}>
              {orb?.claimed_by === user?.id ? "You caught this creature!" : "This creature has been caught"}
            </div>
            {orb?.claimed_by === user?.id && !isMystery && (
              <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>
                {orb?.amount} {orb?.currency} has been added to your balance.
              </div>
            )}
          </div>
        )}

        {/* Claim Button */}
        {!expired && !claimed && (
          <button
            onClick={handleClaim}
            disabled={claiming || authLoading}
            style={{
              width: "100%",
              padding: "16px 0",
              background: `linear-gradient(135deg, ${glowColor}, ${C.indigo})`,
              color: "#fff",
              border: "none",
              borderRadius: 14,
              fontSize: 17,
              fontWeight: 700,
              cursor: claiming ? "default" : "pointer",
              opacity: claiming ? 0.6 : 1,
              marginBottom: 12,
              boxShadow: `0 4px 24px ${glowColor}44`,
            }}
          >
            {claiming ? "Catching..." : user ? "Catch This Creature" : "Catch This Creature"}
          </button>
        )}

        {!expired && !claimed && !user && !authLoading && (
          <div style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>
            You will be asked to sign in to claim.
          </div>
        )}

        {/* Home link */}
        <button
          onClick={() => router.push("/")}
          style={{
            background: "none",
            border: "none",
            color: C.muted,
            fontSize: 13,
            cursor: "pointer",
            marginTop: 24,
            padding: 0,
          }}
        >
          What is BLINK?
        </button>
      </div>
    </div>
  );
}
