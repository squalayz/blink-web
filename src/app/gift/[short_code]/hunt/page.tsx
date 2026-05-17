"use client";

// BLINK Spirit Gift — the hunt itself.
// Map with a glowing gift creature, walkable avatar, joystick, catch button.

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";

const GiftHuntMap = dynamic(() => import("@/components/GiftHuntMap"), { ssr: false });

const CATCH_RADIUS_M = 50;
const FENCE_RADIUS_M = 1500;

const IN_APP_WEBVIEW_HINTS = ["Telegram", "FBAN", "FBAV", "Instagram", "Twitter", "Line"];

interface OpenedState {
  spawn: { id: string; lat: number; lng: number; species: string; rarity: string };
  avatar: { lat: number; lng: number; anchor_lat: number; anchor_lng: number };
  asset_type: "eth" | "blink" | "nft";
  asset_payload: { amount?: number; contract?: string; token_id?: string };
  sender_label: string;
}

interface PreviewState {
  sender_label: string;
  asset_type: "eth" | "blink" | "nft";
  asset_payload: { amount?: number; contract?: string; token_id?: string };
}

type GeoErrorKind = "denied" | "timeout" | "unavailable" | "unsupported" | "other";

type Step =
  | { kind: "preview-loading" }
  | { kind: "welcome"; preview: PreviewState }
  | { kind: "locating"; preview: PreviewState }
  | { kind: "opening"; preview: PreviewState }
  | { kind: "geo-error"; preview: PreviewState; errorKind: GeoErrorKind }
  | { kind: "fatal"; message: string }
  | { kind: "playing" };

function classifyGeoError(err: unknown): GeoErrorKind {
  if (typeof GeolocationPositionError !== "undefined" && err instanceof GeolocationPositionError) {
    if (err.code === err.PERMISSION_DENIED) return "denied";
    if (err.code === err.TIMEOUT) return "timeout";
    if (err.code === err.POSITION_UNAVAILABLE) return "unavailable";
  }
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: number }).code;
    if (code === 1) return "denied";
    if (code === 3) return "timeout";
    if (code === 2) return "unavailable";
  }
  if (err instanceof Error && /denied/i.test(err.message)) return "denied";
  return "other";
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const p = Math.PI / 180;
  const dLat = (lat2 - lat1) * p;
  const dLng = (lng2 - lng1) * p;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function HuntPage() {
  const params = useParams<{ short_code: string }>();
  const router = useRouter();
  const code = String(params.short_code || "").toLowerCase();
  const { user, loading: authLoading } = useAuth();
  const autoStartedRef = useRef(false);
  const [geoOk, setGeoOk] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setGeoOk(new URLSearchParams(window.location.search).get("geo_ok") === "1");
  }, []);

  const [state, setState] = useState<OpenedState | null>(null);
  const [step, setStep] = useState<Step>({ kind: "preview-loading" });
  const [catchError, setCatchError] = useState("");
  const [isInAppWebView, setIsInAppWebView] = useState(false);
  const [copyHint, setCopyHint] = useState("");

  const avatarPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const [catching, setCatching] = useState(false);
  const [catchResult, setCatchResult] = useState<{ tx: string; asset_type: string; amount?: number; token_id?: string } | null>(null);

  // Authentication redirect.
  useEffect(() => {
    if (!authLoading && !user) router.replace(`/gift/${code}`);
  }, [authLoading, user, router, code]);

  // Webview sniff — runs once on mount.
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent || "";
    setIsInAppWebView(IN_APP_WEBVIEW_HINTS.some((hint) => ua.includes(hint)));
  }, []);

  // Step 1: fetch preview only. No geolocation here.
  const loadPreview = useCallback(async () => {
    if (!user) return;
    setStep({ kind: "preview-loading" });
    try {
      const previewRes = await fetch(`/api/gifts/${code}`);
      const preview = await previewRes.json();
      if (!previewRes.ok) throw new Error(preview.error || "Gift not found");

      if (preview.status === "claimed") {
        router.replace(`/gift/${code}`);
        return;
      }
      if (preview.status === "expired" || preview.status === "refunded" || preview.status === "failed") {
        router.replace(`/gift/${code}`);
        return;
      }

      const senderLabel = preview.anonymous
        ? "A mystery hunter"
        : preview.sender?.handle
        ? `@${preview.sender.handle}`
        : "Someone";

      setStep({
        kind: "welcome",
        preview: {
          sender_label: senderLabel,
          asset_type: preview.asset_type,
          asset_payload: preview.asset_payload,
        },
      });
    } catch (err) {
      setStep({ kind: "fatal", message: err instanceof Error ? err.message : "Failed" });
    }
  }, [user, code, router]);

  useEffect(() => {
    if (user) loadPreview();
  }, [user, loadPreview]);

  // Step 2: invoked by the "Start the Hunt" / "Try Again" button.
  const startHunt = useCallback(
    async (preview: PreviewState) => {
      setStep({ kind: "locating", preview });

      let pos: GeolocationPosition;
      try {
        pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
            return;
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000,
          });
        });
      } catch (err) {
        const kind = !navigator.geolocation ? "unsupported" : classifyGeoError(err);
        setStep({ kind: "geo-error", preview, errorKind: kind });
        return;
      }

      setStep({ kind: "opening", preview });
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Sign in first");

        const res = await fetch(`/api/gifts/${code}/open`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to open");

        setState({
          spawn: data.spawn,
          avatar: data.avatar,
          asset_type: preview.asset_type,
          asset_payload: preview.asset_payload,
          sender_label: preview.sender_label,
        });
        avatarPosRef.current = { lat: data.avatar.lat, lng: data.avatar.lng };
        setDistance(haversineM(data.avatar.lat, data.avatar.lng, data.spawn.lat, data.spawn.lng));
        setStep({ kind: "playing" });
      } catch (err) {
        setStep({ kind: "fatal", message: err instanceof Error ? err.message : "Failed" });
      }
    },
    [code]
  );

  useEffect(() => {
    if (!geoOk) return;
    if (autoStartedRef.current) return;
    if (step.kind !== "welcome") return;
    autoStartedRef.current = true;
    startHunt(step.preview);
  }, [geoOk, step, startHunt]);

  const copyLinkToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyHint("Link copied — paste it in Safari or Chrome.");
    } catch {
      setCopyHint("Couldn't copy. Long-press the address bar to copy this URL.");
    }
  }, []);

  const onAvatarChange = useCallback(
    async (lat: number, lng: number, dtMs: number) => {
      avatarPosRef.current = { lat, lng };
      if (state) setDistance(haversineM(lat, lng, state.spawn.lat, state.spawn.lng));
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return null;
        const res = await fetch(`/api/gifts/${code}/avatar`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ avatar_lat: lat, avatar_lng: lng, dt_ms: dtMs }),
        });
        return { ok: res.ok };
      } catch {
        return null;
      }
    },
    [code, state]
  );

  async function attemptCatch() {
    if (!state || !avatarPosRef.current) return;
    setCatching(true);
    setCatchError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sign in first");
      const res = await fetch(`/api/gifts/${code}/catch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          avatar_lat: avatarPosRef.current.lat,
          avatar_lng: avatarPosRef.current.lng,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Catch failed");
      setCatchResult({
        tx: data.tx_hash,
        asset_type: data.asset_type,
        amount: data.asset_payload?.amount,
        token_id: data.asset_payload?.token_id,
      });
    } catch (err) {
      setCatchError(err instanceof Error ? err.message : "Catch failed");
    } finally {
      setCatching(false);
    }
  }

  if (authLoading || step.kind === "preview-loading") {
    return (
      <div style={pageStyle}>
        <div style={{ padding: 60, textAlign: "center", color: C.muted }}>Spawning…</div>
      </div>
    );
  }

  if (step.kind === "fatal") {
    return (
      <div style={pageStyle}>
        <div style={{ padding: 60, textAlign: "center" }}>
          <div style={{ color: C.danger, fontSize: 15, marginBottom: 18 }}>{step.message}</div>
          <button onClick={() => router.replace(`/gift/${code}`)} style={primaryBtn}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (step.kind === "welcome" || step.kind === "locating" || step.kind === "opening") {
    const busy = step.kind !== "welcome";
    const busyLabel = step.kind === "locating" ? "Locating…" : "Opening gift…";
    return (
      <div style={pageStyle}>
        <div style={preCenterWrap}>
          <div style={preCard}>
            {isInAppWebView && (
              <div style={webviewBanner}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                  Tip: open this in your browser
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.45 }}>
                  Chat-app browsers often block location. Safari or Chrome works best.
                </div>
                <button type="button" onClick={copyLinkToClipboard} style={secondaryBtn}>
                  Copy Link
                </button>
                {copyHint && (
                  <div style={{ fontSize: 11, color: C.primary, marginTop: 8 }}>{copyHint}</div>
                )}
              </div>
            )}
            <div style={preEyebrow}>Spirit Gift</div>
            <h1 style={preTitle}>Your Spirit Gift is waiting</h1>
            <div style={preSubtitle}>From {step.preview.sender_label}</div>
            <p style={preBody}>
              Tap below to find where your gift spawned. We&apos;ll need your location to guide you.
            </p>
            <button
              type="button"
              onClick={() => startHunt(step.preview)}
              disabled={busy}
              style={{ ...primaryBtn, width: "100%", height: 54, opacity: busy ? 0.7 : 1, cursor: busy ? "wait" : "pointer" }}
            >
              {busy ? busyLabel : "Start the Hunt"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step.kind === "geo-error") {
    const { errorKind, preview } = step;
    let title = "We need your location";
    let body = "Your phone blocked location access. Here's how to fix it:";
    let showDeniedTips = true;
    if (errorKind === "timeout") {
      title = "Couldn't lock onto your location";
      body = "We couldn't find your position in time. Move outside or near a window and try again.";
      showDeniedTips = false;
    } else if (errorKind === "unavailable") {
      title = "Location unavailable";
      body = "Your phone can't determine its location right now. Make sure Location Services are on in your phone settings, then try again.";
      showDeniedTips = false;
    } else if (errorKind === "unsupported") {
      title = "Location not supported";
      body = "This browser doesn't support location. Open the link in Safari or Chrome.";
      showDeniedTips = false;
    }

    // Walk-mode fallback offered for everything except timeout (timeout means
    // GPS is working but slow — they should retry, not fall back).
    const offerWalkFallback = errorKind !== "timeout";

    return (
      <div style={pageStyle}>
        <div style={preCenterWrap}>
          <div style={preCard}>
            <div style={{ ...preEyebrow, color: C.danger }}>Action needed</div>
            <h1 style={preTitle}>{title}</h1>
            <p style={preBody}>{body}</p>
            {showDeniedTips && (
              <ul style={tipsList}>
                <li style={tipItem}>
                  If you opened this from Telegram or another chat app, tap the menu and choose &ldquo;Open in Browser&rdquo; (Safari on iPhone, Chrome on Android).
                </li>
                <li style={tipItem}>
                  If you see a location prompt, tap Allow.
                </li>
                <li style={tipItem}>
                  If you already denied it: go to Settings → Safari (or Chrome) → Location → Allow for blinkworld.xyz.
                </li>
              </ul>
            )}
            <button
              type="button"
              onClick={() => startHunt(preview)}
              style={{ ...primaryBtn, width: "100%", height: 54, marginBottom: 10 }}
            >
              Try Again
            </button>
            <button type="button" onClick={copyLinkToClipboard} style={{ ...secondaryBtn, width: "100%" }}>
              Copy Link to Open in Browser
            </button>
            {copyHint && (
              <div style={{ fontSize: 12, color: C.primary, marginTop: 10, textAlign: "center" }}>
                {copyHint}
              </div>
            )}
            {offerWalkFallback && (
              <>
                <button
                  type="button"
                  onClick={() => router.push(`/gift/${code}/walk`)}
                  style={{ ...tertiaryBtn, width: "100%", marginTop: 10 }}
                >
                  Virtually Walk There
                </button>
                <div style={tertiaryHint}>
                  Your gift will appear on a map for you to walk to. No GPS required — but it&apos;ll take a moment to reach.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div style={pageStyle}>
        <div style={{ padding: 60, textAlign: "center", color: C.muted }}>Spawning…</div>
      </div>
    );
  }

  const inRange = (distance ?? Infinity) <= CATCH_RADIUS_M;

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <GiftHuntMap
        anchor={{ lat: state.avatar.anchor_lat, lng: state.avatar.anchor_lng }}
        spawn={{ lat: state.spawn.lat, lng: state.spawn.lng }}
        initialAvatar={{ lat: state.avatar.lat, lng: state.avatar.lng }}
        onAvatarChange={onAvatarChange}
        catchRadiusM={CATCH_RADIUS_M}
        fenceRadiusM={FENCE_RADIUS_M}
      />

      {/* Top distance ticker */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "10px 18px",
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(10px)",
          border: `1px solid ${C.primary}55`,
          borderRadius: 22,
          color: C.text,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
          zIndex: 30,
        }}
      >
        {distance !== null ? `${Math.round(distance)}m away` : "Locating…"}
      </div>

      {/* Sender label */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 18,
          padding: "6px 12px",
          background: "rgba(0,0,0,0.6)",
          borderRadius: 16,
          fontSize: 11,
          color: C.muted,
          fontWeight: 600,
          letterSpacing: "0.06em",
          zIndex: 30,
        }}
      >
        From {state.sender_label}
      </div>

      {/* Catch button */}
      <div style={{ position: "absolute", left: 22, bottom: 36, zIndex: 30 }}>
        <button
          type="button"
          onClick={attemptCatch}
          disabled={!inRange || catching}
          style={{
            padding: "16px 28px",
            borderRadius: 30,
            border: "none",
            background: inRange ? C.primary : "rgba(255,255,255,0.10)",
            color: inRange ? "#0a0a0f" : C.muted,
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: inRange && !catching ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            boxShadow: inRange ? "0 6px 26px rgba(0,255,136,0.45)" : "none",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {catching ? "Catching…" : inRange ? "Catch" : `Get within ${CATCH_RADIUS_M}m`}
        </button>
      </div>

      {catchError && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 110,
            transform: "translateX(-50%)",
            padding: "10px 16px",
            background: "rgba(0,0,0,0.78)",
            border: `1px solid ${C.danger}55`,
            borderRadius: 14,
            color: C.danger,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 35,
            maxWidth: 320,
            textAlign: "center",
          }}
        >
          {catchError}
        </div>
      )}

      {catchResult && <CatchSuccess result={catchResult} sender={state.sender_label} onClose={() => router.replace(`/gifts`)} />}
    </div>
  );
}

function CatchSuccess({
  result,
  sender,
  onClose,
}: {
  result: { tx: string; asset_type: string; amount?: number; token_id?: string };
  sender: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 22,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <Confetti />
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "radial-gradient(circle at 50% 0%, rgba(0,255,136,0.22), rgba(0,255,136,0.02) 60%, transparent), #0d0d14",
          border: `1px solid ${C.primary}66`,
          borderRadius: 22,
          padding: "32px 26px",
          textAlign: "center",
          color: C.text,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 48px rgba(0,255,136,0.18)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.3em",
            color: C.primary,
            textTransform: "uppercase",
            marginBottom: 10,
            textShadow: "0 0 12px rgba(0,255,136,0.55)",
          }}
        >
          Captured
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: "4px 0 8px", letterSpacing: "-0.5px" }}>
          You caught a Spirit Gift
        </h2>
        <div style={{ color: C.muted, fontSize: 14, marginBottom: 18 }}>From {sender}</div>
        <div
          style={{
            padding: 18,
            border: `1px solid ${C.primary}33`,
            borderRadius: 14,
            background: "rgba(0,255,136,0.05)",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 800, color: C.text, letterSpacing: "-1px" }}>
            {result.asset_type === "nft" ? `#${result.token_id}` : result.amount}
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: C.primary,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              marginTop: 6,
            }}
          >
            {result.asset_type.toUpperCase()}
          </div>
        </div>
        {result.tx && (
          <a
            href={`https://etherscan.io/tx/${result.tx}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 600,
              color: C.primary,
              textDecoration: "underline",
              marginBottom: 18,
              wordBreak: "break-all",
            }}
          >
            View transaction
          </a>
        )}
        <button type="button" onClick={onClose} style={{ ...primaryBtn, width: "100%" }}>
          Done
        </button>
      </div>
    </div>
  );
}

function Confetti() {
  // CSS-only confetti — 40 colored dots fall.
  const pieces = Array.from({ length: 40 });
  const colors = ["#00FF88", "#88FF00", "#FFFFFF"];
  return (
    <>
      <style>{`
        @keyframes giftConfettiFall {
          0% { transform: translateY(-110vh) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 90 }}>
        {pieces.map((_, i) => {
          const left = Math.random() * 100;
          const delay = Math.random() * 0.8;
          const dur = 2.2 + Math.random() * 1.6;
          const sz = 6 + Math.random() * 6;
          const color = colors[i % colors.length];
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: 0,
                left: `${left}%`,
                width: sz,
                height: sz * 0.4,
                background: color,
                borderRadius: 2,
                animation: `giftConfettiFall ${dur}s ${delay}s linear forwards`,
                opacity: 0.85,
              }}
            />
          );
        })}
      </div>
    </>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: C.bg,
  color: C.text,
  fontFamily: "'Inter', system-ui, sans-serif",
};

const primaryBtn: React.CSSProperties = {
  height: 48,
  borderRadius: 24,
  background: C.primary,
  color: "#0a0a0f",
  border: "none",
  fontWeight: 800,
  fontSize: 14,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
  padding: "0 22px",
  boxShadow: "0 4px 18px rgba(0,255,136,0.25)",
};

const secondaryBtn: React.CSSProperties = {
  height: 44,
  borderRadius: 22,
  background: "transparent",
  color: C.primary,
  border: `1px solid ${C.primary}66`,
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
  padding: "0 18px",
};

const tertiaryBtn: React.CSSProperties = {
  height: 44,
  borderRadius: 22,
  background: "transparent",
  color: C.text,
  border: `1px dashed ${C.primary}99`,
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
  padding: "0 16px",
};

const tertiaryHint: React.CSSProperties = {
  fontSize: 11,
  color: C.muted,
  marginTop: 8,
  textAlign: "center",
  lineHeight: 1.5,
};

const preCenterWrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 22,
  background: C.bg,
};

const preCard: React.CSSProperties = {
  width: "100%",
  maxWidth: 440,
  background: C.surface,
  border: `1px solid ${C.primary}33`,
  borderRadius: 22,
  padding: "28px 24px",
  color: C.text,
  fontFamily: "'Inter', system-ui, sans-serif",
  boxShadow: "0 18px 48px rgba(0,0,0,0.55), 0 0 36px rgba(0,255,136,0.10)",
};

const preEyebrow: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.3em",
  color: C.primary,
  textTransform: "uppercase",
  marginBottom: 10,
};

const preTitle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  margin: "4px 0 8px",
  letterSpacing: "-0.4px",
  color: C.text,
  lineHeight: 1.2,
};

const preSubtitle: React.CSSProperties = {
  fontSize: 14,
  color: C.muted,
  marginBottom: 14,
  fontWeight: 600,
};

const preBody: React.CSSProperties = {
  fontSize: 14,
  color: C.muted,
  lineHeight: 1.55,
  margin: "0 0 22px",
};

const webviewBanner: React.CSSProperties = {
  padding: "14px 14px 16px",
  border: `1px solid ${C.primary}44`,
  borderRadius: 14,
  background: "rgba(0,255,136,0.05)",
  marginBottom: 20,
};

const tipsList: React.CSSProperties = {
  listStyle: "disc",
  paddingLeft: 20,
  margin: "0 0 22px",
  color: C.muted,
  fontSize: 13,
  lineHeight: 1.55,
};

const tipItem: React.CSSProperties = {
  marginBottom: 8,
};
