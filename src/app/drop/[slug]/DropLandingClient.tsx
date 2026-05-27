"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";

interface Props {
  slug: string;
  name: string;
  description: string | null;
  tier: string;
  imageUrl: string;
  blinkReward: number | null;
  expiresAt: string;
  anchored: boolean;
  caught: boolean;
  expired: boolean;
  catcherLabel: string | null;
  proximityRadiusM: number;
}

const TIER_COLOR: Record<string, string> = {
  common: "#9aa3b2",
  uncommon: "#00FF88",
  rare: "#88FF00",
  legendary: "#ffd166",
  mythic: "#ff8ae0",
};

function formatExpiry(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h left`;
  if (h > 0) return `${h}h left`;
  const m = Math.floor(ms / 60_000);
  return `${m}m left`;
}

export default function DropLandingClient(props: Props) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tierColor = TIER_COLOR[props.tier] || "#ffd166";

  const onOpen = async () => {
    if (busy) return;
    setError(null);
    if (!user) {
      // Redirect to auth, then back here.
      router.push(
        `/auth/signin?redirect=${encodeURIComponent(`/drop/${props.slug}`)}`,
      );
      return;
    }
    if (props.caught || props.expired) return;
    if (!("geolocation" in navigator)) {
      setError("Your browser does not support location services.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            setError("You need to be signed in.");
            setBusy(false);
            return;
          }
          const res = await fetch(`/api/genesis-drops/${props.slug}/open`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          });
          const json = await res.json();
          if (!res.ok) {
            setError(json.error || "Failed to open drop.");
            setBusy(false);
            return;
          }
          // Stash the spawn id so /map can highlight it on arrival.
          try {
            sessionStorage.setItem(
              "blink:genesisDrop",
              JSON.stringify({
                slug: props.slug,
                spawnId: json.spawnId,
                isFirstOpener: !!json.isFirstOpener,
                ts: Date.now(),
              }),
            );
          } catch {
            /* ignore storage errors */
          }
          router.push(`/map?genesis=${json.spawnId}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to open drop.");
          setBusy(false);
        }
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enable location to claim this drop."
            : "Could not read your location.",
        );
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  };

  const buttonLabel = (() => {
    if (props.caught) return "Claimed";
    if (props.expired) return "Expired";
    if (authLoading) return "Loading…";
    if (!user) return "Sign in to open";
    if (busy) return "Opening…";
    if (props.anchored) return "Go to the map";
    return "Open Drop";
  })();

  const buttonDisabled = busy || props.caught || props.expired;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at top, #1a0a14 0%, #0a0a0f 60%)",
        color: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 20px 48px",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: tierColor,
          marginBottom: 8,
          fontWeight: 700,
        }}
      >
        Genesis Drop · {props.tier.toUpperCase()}
      </div>

      <h1
        style={{
          fontSize: 30,
          fontWeight: 900,
          margin: "0 0 24px",
          textAlign: "center",
          letterSpacing: "-0.01em",
          textShadow: `0 0 28px ${tierColor}66`,
        }}
      >
        {props.name}
      </h1>

      <div
        style={{
          position: "relative",
          width: "min(360px, 86vw)",
          aspectRatio: "1 / 1",
          borderRadius: 24,
          overflow: "hidden",
          border: `2px solid ${tierColor}`,
          boxShadow: `0 0 60px ${tierColor}55, inset 0 0 30px ${tierColor}33`,
          marginBottom: 28,
          background: "#0a0a0f",
        }}
      >
        {props.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={props.imageUrl}
            alt={props.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#8a8a99",
              fontSize: 12,
            }}
          >
            (no image)
          </div>
        )}
      </div>

      {props.description && (
        <p
          style={{
            maxWidth: 480,
            textAlign: "center",
            color: "#cfd0d8",
            fontSize: 15,
            lineHeight: 1.55,
            margin: "0 0 22px",
          }}
        >
          {props.description}
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: 18,
          alignItems: "center",
          color: "#8a8a99",
          fontSize: 12,
          letterSpacing: "0.08em",
          marginBottom: 28,
          textTransform: "uppercase",
        }}
      >
        {typeof props.blinkReward === "number" && (
          <span>
            <strong style={{ color: tierColor, fontWeight: 800 }}>
              +{props.blinkReward.toLocaleString("en-US")}
            </strong>{" "}
            BLINK
          </span>
        )}
        <span>{formatExpiry(props.expiresAt)}</span>
      </div>

      {props.caught ? (
        <div
          style={{
            background: "rgba(255,138,224,0.08)",
            border: "1px solid rgba(255,138,224,0.35)",
            color: "#ff8ae0",
            padding: "14px 20px",
            borderRadius: 14,
            textAlign: "center",
            maxWidth: 420,
          }}
        >
          This drop was claimed by {props.catcherLabel || "a hunter"} — try the next one.
        </div>
      ) : props.expired ? (
        <div
          style={{
            background: "rgba(138,138,153,0.08)",
            border: "1px solid rgba(138,138,153,0.35)",
            color: "#8a8a99",
            padding: "14px 20px",
            borderRadius: 14,
            textAlign: "center",
          }}
        >
          This Genesis Drop has expired.
        </div>
      ) : (
        <>
          <button
            onClick={onOpen}
            disabled={buttonDisabled}
            style={{
              padding: "16px 36px",
              borderRadius: 16,
              border: "none",
              background: buttonDisabled
                ? "rgba(255,255,255,0.06)"
                : `linear-gradient(135deg, ${tierColor}, #88FF00)`,
              color: buttonDisabled ? "#8a8a99" : "#0a0a0f",
              fontSize: 17,
              fontWeight: 900,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: buttonDisabled ? "not-allowed" : "pointer",
              boxShadow: buttonDisabled
                ? "none"
                : `0 8px 32px ${tierColor}55`,
              transition: "transform 0.15s ease, box-shadow 0.2s ease",
              fontFamily: "inherit",
            }}
          >
            {buttonLabel}
          </button>

          {!user && !authLoading && (
            <div style={{ marginTop: 14, color: "#8a8a99", fontSize: 13 }}>
              You&apos;ll need a BLINK account to open this drop.
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: 14,
                color: "#ff8ae0",
                fontSize: 13,
                textAlign: "center",
                maxWidth: 360,
              }}
            >
              {error}
            </div>
          )}

          {!props.anchored && (
            <p
              style={{
                marginTop: 26,
                color: "#6b6b78",
                fontSize: 12,
                textAlign: "center",
                maxWidth: 360,
                lineHeight: 1.5,
              }}
            >
              First opener anchors the spawn near themselves (within{" "}
              {props.proximityRadiusM}m). Then it&apos;s a race to catch it.
            </p>
          )}

          {props.anchored && (
            <p
              style={{
                marginTop: 26,
                color: "#6b6b78",
                fontSize: 12,
                textAlign: "center",
                maxWidth: 360,
                lineHeight: 1.5,
              }}
            >
              This drop has already anchored. Tap above to see it on the map.
            </p>
          )}
        </>
      )}

      <Link
        href="/"
        style={{
          marginTop: 44,
          color: "#6b6b78",
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          textDecoration: "none",
        }}
      >
        ← Back to BLINK
      </Link>
    </div>
  );
}
