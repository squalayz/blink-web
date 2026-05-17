"use client";

// BLINK Spirit Gift — no-GPS fallback walk mode.
// User drops a pin anywhere on the map, then an auto-walking avatar travels
// toward the gift's spawn point at a scaled speed (capped at 90s). When the
// avatar arrives, a Catch button unlocks. Server-side anti-cheat enforces
// `via_toggle=true` matching on open + catch.

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";
import { applyBlinkMapStyle } from "@/lib/blink-map-style";

const CATCH_RADIUS_M = 5;
const MAX_WALK_SEC = 90;
const TICK_MS = 100;

interface PreviewState {
  sender_label: string;
  asset_type: "eth" | "blink" | "nft";
  asset_payload: { amount?: number; contract?: string; token_id?: string };
}

interface SpawnState {
  spawn: { lat: number; lng: number };
  anchor: { lat: number; lng: number };
}

type Step =
  | { kind: "loading" }
  | { kind: "fatal"; message: string }
  | { kind: "pin"; preview: PreviewState }
  | { kind: "opening"; preview: PreviewState }
  | { kind: "walking"; preview: PreviewState; spawn: SpawnState; totalMs: number }
  | { kind: "ready"; preview: PreviewState; spawn: SpawnState }
  | { kind: "catching"; preview: PreviewState; spawn: SpawnState }
  | { kind: "claimed"; preview: PreviewState; tx: string | null };

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

function speedForDistance(distM: number): number {
  if (distM < 200) return 5;
  if (distM < 500) return 10;
  return 20;
}

function clampWalkMs(distM: number): number {
  const speed = speedForDistance(distM);
  const naturalMs = (distM / speed) * 1000;
  return Math.min(naturalMs, MAX_WALK_SEC * 1000);
}

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
}

const WALK_CSS = `
@keyframes walkAvatarPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,136,0.6); transform: scale(1); }
  50% { box-shadow: 0 0 22px 6px rgba(0,255,136,0.35); transform: scale(1.08); }
}
@keyframes walkGiftPulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 12px rgba(0,255,136,0.9)) drop-shadow(0 0 30px rgba(136,255,0,0.55)); }
  50% { transform: scale(1.1); filter: drop-shadow(0 0 22px rgba(0,255,136,1)) drop-shadow(0 0 52px rgba(136,255,0,0.85)); }
}
@keyframes walkGiftSonar {
  0% { transform: translate(-50%,-50%) scale(0.6); opacity: 0.8; }
  100% { transform: translate(-50%,-50%) scale(3.6); opacity: 0; }
}
@keyframes walkConfettiFall {
  0% { transform: translateY(-110vh) rotate(0deg); opacity: 0; }
  15% { opacity: 1; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
}
.walk-avatar {
  width: 22px; height: 22px; border-radius: 50%;
  background: #00FF88;
  border: 3px solid #0a0a0f;
  animation: walkAvatarPulse 1.6s ease-in-out infinite;
}
.walk-gift {
  width: 56px; height: 56px; border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, #88FF00 0%, #00FF88 60%, rgba(0,255,136,0.0) 100%);
  display: flex; align-items: center; justify-content: center;
  position: relative;
  animation: walkGiftPulse 1.8s ease-in-out infinite;
}
.walk-gift::after {
  content: "";
  position: absolute; top: 50%; left: 50%;
  width: 60px; height: 60px; border-radius: 50%;
  border: 2px solid rgba(0,255,136,0.7);
  animation: walkGiftSonar 2.4s ease-out infinite;
  pointer-events: none;
}
.walk-gift-iris {
  width: 18px; height: 18px; border-radius: 50%;
  background: #0a0a0f;
  border: 2px solid #FFFFFF;
}
.mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib, .mapboxgl-ctrl-group { display: none !important; }
`;

export default function WalkClient({ initialCenter }: { initialCenter: { lat: number; lng: number } }) {
  const params = useParams<{ short_code: string }>();
  const router = useRouter();
  const code = String(params.short_code || "").toLowerCase();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>({ kind: "loading" });
  const [reducedMotion, setReducedMotion] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const pinMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const avatarMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const giftMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const lineSourceIdRef = useRef("walk-line");
  const animFrameRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);
  const avatarPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const [avatarPos, setAvatarPos] = useState<{ lat: number; lng: number } | null>(null);
  const [walkProgressMs, setWalkProgressMs] = useState<number>(0);

  // Auth gate — bounce back to landing if not signed in.
  useEffect(() => {
    if (!authLoading && !user) router.replace(`/gift/${code}`);
  }, [authLoading, user, router, code]);

  // Inject styles once.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!document.getElementById("walk-styles")) {
      const s = document.createElement("style");
      s.id = "walk-styles";
      s.textContent = WALK_CSS;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  // Load preview.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/gifts/${code}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStep({ kind: "fatal", message: data.error || "Gift not found" });
          return;
        }
        if (data.status === "claimed" || data.status === "expired" || data.status === "refunded" || data.status === "failed") {
          router.replace(`/gift/${code}`);
          return;
        }
        const senderLabel = data.anonymous
          ? "A mystery hunter"
          : data.sender?.handle
          ? `@${data.sender.handle}`
          : "Someone";
        setStep({
          kind: "pin",
          preview: {
            sender_label: senderLabel,
            asset_type: data.asset_type,
            asset_payload: data.asset_payload,
          },
        });
      } catch (err) {
        if (!cancelled) {
          setStep({ kind: "fatal", message: err instanceof Error ? err.message : "Failed" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, code, router]);

  // Initialize map once the page is past the loading state.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (step.kind === "loading" || step.kind === "fatal") return;
    if (!mapboxgl.accessToken) return;

    const m = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [initialCenter.lng, initialCenter.lat],
      zoom: 13,
      pitch: 0,
      attributionControl: false,
    });
    m.on("style.load", () => {
      applyBlinkMapStyle(m, { hour: new Date().getHours() });
      if (!m.getSource(lineSourceIdRef.current)) {
        m.addSource(lineSourceIdRef.current, {
          type: "geojson",
          data: { type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} },
        });
        m.addLayer({
          id: "walk-line-layer",
          type: "line",
          source: lineSourceIdRef.current,
          paint: {
            "line-color": "#00FF88",
            "line-width": 3,
            "line-opacity": 0.55,
            "line-dasharray": [2, 2],
          },
        });
      }
    });
    mapRef.current = m;
    return () => {
      m.remove();
      mapRef.current = null;
    };
  }, [step.kind, initialCenter.lat, initialCenter.lng]);

  // Pin-drop click handler — only when waiting for pin.
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    if (step.kind !== "pin") return;

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      const lng = e.lngLat.lng;
      const lat = e.lngLat.lat;
      dropPin(lat, lng);
    };
    m.on("click", onClick);
    return () => {
      m.off("click", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.kind]);

  // Place / move the pin marker. Returns nothing — purely visual.
  const placePinMarker = useCallback((lat: number, lng: number) => {
    const m = mapRef.current;
    if (!m) return;
    if (pinMarkerRef.current) {
      pinMarkerRef.current.setLngLat([lng, lat]);
    } else {
      const el = document.createElement("div");
      el.style.cssText = "display:flex;align-items:center;justify-content:center;";
      el.innerHTML = '<div class="walk-avatar"></div>';
      pinMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(m);
    }
  }, []);

  // Drop pin → call /open with via_toggle, transition to walking.
  async function dropPin(lat: number, lng: number) {
    if (step.kind !== "pin") return;
    const preview = step.preview;
    placePinMarker(lat, lng);
    setStep({ kind: "opening", preview });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sign in first");
      const res = await fetch(`/api/gifts/${code}/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lat, lng, via_toggle: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open");
      const spawn: SpawnState = {
        spawn: { lat: data.spawn.lat, lng: data.spawn.lng },
        anchor: { lat, lng },
      };
      const distM = haversineM(lat, lng, spawn.spawn.lat, spawn.spawn.lng);
      const totalMs = clampWalkMs(distM);
      setStep({ kind: "walking", preview, spawn, totalMs });
    } catch (err) {
      setStep({ kind: "fatal", message: err instanceof Error ? err.message : "Failed" });
    }
  }

  // When walking begins, render gift marker, draw path, start animation.
  useEffect(() => {
    if (step.kind !== "walking") return;
    const m = mapRef.current;
    if (!m) return;

    const { anchor, spawn } = step.spawn;

    // Gift marker
    if (!giftMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText = "position:relative;width:56px;height:56px;display:flex;align-items:center;justify-content:center;";
      el.innerHTML = '<div class="walk-gift"><div class="walk-gift-iris"></div></div>';
      giftMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([spawn.lng, spawn.lat])
        .addTo(m);
    } else {
      giftMarkerRef.current.setLngLat([spawn.lng, spawn.lat]);
    }

    // Avatar starts at anchor.
    avatarPosRef.current = { lat: anchor.lat, lng: anchor.lng };
    setAvatarPos({ lat: anchor.lat, lng: anchor.lng });
    if (avatarMarkerRef.current) {
      avatarMarkerRef.current.setLngLat([anchor.lng, anchor.lat]);
    } else {
      const el = document.createElement("div");
      el.style.cssText = "display:flex;align-items:center;justify-content:center;";
      el.innerHTML = '<div class="walk-avatar"></div>';
      avatarMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([anchor.lng, anchor.lat])
        .addTo(m);
    }
    // Remove the original pin marker — avatar replaces it.
    if (pinMarkerRef.current) {
      pinMarkerRef.current.remove();
      pinMarkerRef.current = null;
    }

    // Draw the path line.
    const src = m.getSource(lineSourceIdRef.current) as mapboxgl.GeoJSONSource | undefined;
    src?.setData({
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[anchor.lng, anchor.lat], [spawn.lng, spawn.lat]] },
      properties: {},
    });

    // Fit map to show both endpoints.
    const bounds = new mapboxgl.LngLatBounds([anchor.lng, anchor.lat], [anchor.lng, anchor.lat]);
    bounds.extend([spawn.lng, spawn.lat]);
    m.fitBounds(bounds, { padding: 80, duration: 600, maxZoom: 17 });

    // Reduced motion: teleport.
    if (reducedMotion) {
      avatarPosRef.current = { lat: spawn.lat, lng: spawn.lng };
      setAvatarPos({ lat: spawn.lat, lng: spawn.lng });
      avatarMarkerRef.current?.setLngLat([spawn.lng, spawn.lat]);
      setWalkProgressMs(step.totalMs);
      setStep({ kind: "ready", preview: step.preview, spawn: step.spawn });
      return;
    }

    // Animate.
    startTsRef.current = performance.now();
    const totalMs = step.totalMs;

    const tick = () => {
      const now = performance.now();
      const elapsed = now - startTsRef.current;
      const t = Math.min(1, elapsed / totalMs);
      const lat = anchor.lat + (spawn.lat - anchor.lat) * t;
      const lng = anchor.lng + (spawn.lng - anchor.lng) * t;
      avatarPosRef.current = { lat, lng };
      avatarMarkerRef.current?.setLngLat([lng, lat]);
      setAvatarPos({ lat, lng });
      setWalkProgressMs(elapsed);
      if (t >= 1) {
        animFrameRef.current = null;
        setStep((prev) => (prev.kind === "walking" ? { kind: "ready", preview: prev.preview, spawn: prev.spawn } : prev));
        return;
      }
      animFrameRef.current = window.setTimeout(() => requestAnimationFrame(tick), TICK_MS) as unknown as number;
    };
    tick();

    return () => {
      if (animFrameRef.current !== null) {
        clearTimeout(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.kind, reducedMotion]);

  async function attemptCatch() {
    if (step.kind !== "ready") return;
    const preview = step.preview;
    const spawn = step.spawn;
    const av = avatarPosRef.current ?? spawn.spawn;
    setStep({ kind: "catching", preview, spawn });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sign in first");
      const res = await fetch(`/api/gifts/${code}/catch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar_lat: av.lat, avatar_lng: av.lng, via_toggle: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Catch failed");
      setStep({ kind: "claimed", preview, tx: data.tx_hash ?? null });
    } catch (err) {
      setStep({ kind: "fatal", message: err instanceof Error ? err.message : "Catch failed" });
    }
  }

  // ───────────── Render ─────────────

  if (authLoading || step.kind === "loading") {
    return (
      <div style={pageStyle}>
        <div style={{ padding: 60, textAlign: "center", color: C.muted }}>Loading walk mode…</div>
      </div>
    );
  }

  if (step.kind === "fatal") {
    return (
      <div style={pageStyle}>
        <div style={{ padding: 60, textAlign: "center" }}>
          <div style={{ color: C.danger, fontSize: 15, marginBottom: 18 }}>{step.message}</div>
          <button type="button" onClick={() => router.replace(`/gift/${code}`)} style={primaryBtn}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (step.kind === "claimed") {
    return (
      <CatchSuccess
        tx={step.tx}
        preview={step.preview}
        onClose={() => router.replace(`/gifts`)}
      />
    );
  }

  let topBanner: string;
  let bottomLabel: string | null = null;
  let distanceLabel: string | null = null;
  let etaLabel: string | null = null;
  let showCatch = false;

  if (step.kind === "pin") {
    topBanner = "Drop a pin to start your walk to the gift.";
    bottomLabel = "Tap anywhere on the map";
  } else if (step.kind === "opening") {
    topBanner = "Opening gift…";
    bottomLabel = null;
  } else if (step.kind === "walking") {
    topBanner = "Walking to your gift…";
    const distLeft = avatarPos
      ? haversineM(avatarPos.lat, avatarPos.lng, step.spawn.spawn.lat, step.spawn.spawn.lng)
      : null;
    distanceLabel = distLeft !== null ? `${Math.round(distLeft)}m away` : null;
    const remainingMs = Math.max(0, step.totalMs - walkProgressMs);
    etaLabel = `Arriving in ${Math.ceil(remainingMs / 1000)}s`;
  } else if (step.kind === "ready") {
    topBanner = "You arrived. Tap Catch.";
    distanceLabel = "0m away";
    showCatch = true;
  } else if (step.kind === "catching") {
    topBanner = "Catching…";
    showCatch = true;
  } else {
    topBanner = "";
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      <div style={topBannerStyle}>
        <div style={topBannerEyebrow}>Walk Mode</div>
        <div style={topBannerBody}>{topBanner}</div>
        {distanceLabel && <div style={topBannerMeta}>{distanceLabel}{etaLabel ? ` · ${etaLabel}` : ""}</div>}
      </div>

      {bottomLabel && (
        <div style={bottomHintStyle}>{bottomLabel}</div>
      )}

      {showCatch && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 36, display: "flex", justifyContent: "center", zIndex: 30 }}>
          <button
            type="button"
            onClick={attemptCatch}
            disabled={step.kind === "catching"}
            style={{
              padding: "16px 36px",
              borderRadius: 30,
              border: "none",
              background: C.primary,
              color: "#0a0a0f",
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: step.kind === "catching" ? "wait" : "pointer",
              fontFamily: "inherit",
              boxShadow: "0 6px 26px rgba(0,255,136,0.45)",
              opacity: step.kind === "catching" ? 0.7 : 1,
            }}
          >
            {step.kind === "catching" ? "Catching…" : "Catch"}
          </button>
        </div>
      )}
    </div>
  );
}

function CatchSuccess({
  tx,
  preview,
  onClose,
}: {
  tx: string | null;
  preview: PreviewState;
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
        <div style={{ color: C.muted, fontSize: 14, marginBottom: 18 }}>From {preview.sender_label}</div>
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
            {preview.asset_type === "nft" ? `#${preview.asset_payload.token_id}` : preview.asset_payload.amount}
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
            {preview.asset_type.toUpperCase()}
          </div>
        </div>
        {tx && (
          <a
            href={`https://etherscan.io/tx/${tx}`}
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
  const pieces = Array.from({ length: 40 });
  const colors = ["#00FF88", "#88FF00", "#FFFFFF"];
  return (
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
              animation: `walkConfettiFall ${dur}s ${delay}s linear forwards`,
              opacity: 0.85,
            }}
          />
        );
      })}
    </div>
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

const topBannerStyle: React.CSSProperties = {
  position: "absolute",
  top: 18,
  left: "50%",
  transform: "translateX(-50%)",
  padding: "12px 20px",
  background: "rgba(0,0,0,0.72)",
  backdropFilter: "blur(10px)",
  border: `1px solid ${C.primary}55`,
  borderRadius: 18,
  color: C.text,
  boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
  zIndex: 30,
  maxWidth: "calc(100vw - 36px)",
  textAlign: "center",
};

const topBannerEyebrow: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.3em",
  color: C.primary,
  textTransform: "uppercase",
  marginBottom: 4,
};

const topBannerBody: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: C.text,
  lineHeight: 1.3,
};

const topBannerMeta: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: C.muted,
  marginTop: 4,
  letterSpacing: "0.05em",
};

const bottomHintStyle: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  bottom: 30,
  transform: "translateX(-50%)",
  padding: "8px 16px",
  background: "rgba(0,0,0,0.6)",
  borderRadius: 14,
  fontSize: 12,
  color: C.muted,
  fontWeight: 600,
  letterSpacing: "0.06em",
  zIndex: 30,
};
