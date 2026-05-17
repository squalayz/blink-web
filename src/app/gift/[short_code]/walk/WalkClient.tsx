"use client";

// BLINK Spirit Gift — interactive walk mode.
// User drops a pin, then either holds the WALK button to advance virtually at
// 1.4 m/s along the path to the spawn, or physically walks (GPS watchPosition)
// — whichever shrinks the remaining distance faster wins. Within 5m the CATCH
// button reveals. Server enforces `via_toggle=true` matching on open + catch.

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";
import { applyBlinkMapStyle } from "@/lib/blink-map-style";
import { playSound } from "@/lib/game-feel";

const CATCH_RADIUS_M = 5;
const PROXIMITY_M = 25;
const WALK_SPEED_MPS = 1.4;
const VIBRATE_INTERVAL_MS = 500;
const DISPLAY_THROTTLE_MS = 250;

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
  | { kind: "approach"; preview: PreviewState; spawn: SpawnState; totalDistanceM: number }
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

function formatEta(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatDistance(m: number): string {
  if (m < 1) return "0m";
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(2)}km`;
}

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
}

const WALK_CSS = `
@keyframes walkAvatarPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,136,0.6); }
  50% { box-shadow: 0 0 22px 6px rgba(0,255,136,0.45); }
}
@keyframes walkAvatarBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
@keyframes walkGiftPulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 12px rgba(0,255,136,0.9)) drop-shadow(0 0 30px rgba(136,255,0,0.55)); }
  50% { transform: scale(1.1); filter: drop-shadow(0 0 22px rgba(0,255,136,1)) drop-shadow(0 0 52px rgba(136,255,0,0.85)); }
}
@keyframes walkGiftPulseClose {
  0%, 100% { transform: scale(1.04); filter: drop-shadow(0 0 18px rgba(0,255,136,1)) drop-shadow(0 0 44px rgba(136,255,0,0.95)); }
  50% { transform: scale(1.22); filter: drop-shadow(0 0 32px rgba(0,255,136,1)) drop-shadow(0 0 72px rgba(136,255,0,1)); }
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
@keyframes walkBtnPulse {
  0%, 100% { box-shadow: 0 0 16px rgba(0,255,136,0.5), 0 0 36px rgba(0,255,136,0.22), 0 8px 26px rgba(0,0,0,0.55); }
  50% { box-shadow: 0 0 28px rgba(0,255,136,0.8), 0 0 68px rgba(0,255,136,0.42), 0 8px 26px rgba(0,0,0,0.55); }
}
@keyframes walkBtnCatchPulse {
  0%, 100% { box-shadow: 0 0 22px rgba(0,255,136,0.85), 0 0 50px rgba(0,255,136,0.55), 0 8px 26px rgba(0,0,0,0.6); transform: scale(1); }
  50% { box-shadow: 0 0 42px rgba(0,255,136,1), 0 0 96px rgba(0,255,136,0.75), 0 8px 26px rgba(0,0,0,0.6); transform: scale(1.03); }
}
@keyframes walkBurst {
  0% { transform: translate(-50%,-50%) scale(0); opacity: 1; }
  100% { transform: translate(-50%,-50%) scale(6); opacity: 0; }
}
@keyframes walkVignetteIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
.walk-avatar {
  width: 22px; height: 22px; border-radius: 50%;
  background: #00FF88;
  border: 3px solid #0a0a0f;
}
.walk-avatar-idle { animation: walkAvatarPulse 1.8s ease-in-out infinite; }
.walk-avatar-walking { animation: walkAvatarPulse 1s ease-in-out infinite, walkAvatarBob 0.55s ease-in-out infinite; }
.walk-gift {
  width: 56px; height: 56px; border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, #88FF00 0%, #00FF88 60%, rgba(0,255,136,0.0) 100%);
  display: flex; align-items: center; justify-content: center;
  position: relative;
  animation: walkGiftPulse 1.8s ease-in-out infinite;
}
.walk-gift-close { animation: walkGiftPulseClose 0.85s ease-in-out infinite; }
.walk-gift::after {
  content: "";
  position: absolute; top: 50%; left: 50%;
  width: 60px; height: 60px; border-radius: 50%;
  border: 2px solid rgba(0,255,136,0.7);
  animation: walkGiftSonar 2.4s ease-out infinite;
  pointer-events: none;
}
.walk-gift-close::after { animation: walkGiftSonar 1.2s ease-out infinite; }
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
  const avatarElRef = useRef<HTMLDivElement | null>(null);
  const giftMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const giftInnerElRef = useRef<HTMLDivElement | null>(null);
  const lineSourceIdRef = useRef("walk-line");

  // Progress tracking
  const virtualProgressRef = useRef(0); // meters walked via button
  const gpsDistanceToSpawnRef = useRef<number | null>(null);
  const holdingRef = useRef(false);
  const lastTickTsRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const vibrateIntervalRef = useRef<number | null>(null);
  const geoWatchIdRef = useRef<number | null>(null);
  const burstFiredRef = useRef(false);
  const totalDistanceMRef = useRef(0);
  const lineDashIntervalRef = useRef<number | null>(null);
  const lastDisplayUpdateRef = useRef<number>(0);

  // Display state (throttled)
  const [holdingUI, setHoldingUI] = useState(false);
  const [remainingM, setRemainingM] = useState(0);
  const [gpsActive, setGpsActive] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const [showHintGps, setShowHintGps] = useState(false);

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) router.replace(`/gift/${code}`);
  }, [authLoading, user, router, code]);

  // Inject styles
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

  // Load preview
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

  // Initialize map
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
        // Outer glow
        m.addLayer({
          id: "walk-line-glow",
          type: "line",
          source: lineSourceIdRef.current,
          paint: {
            "line-color": "#00FF88",
            "line-width": 10,
            "line-opacity": 0.18,
            "line-blur": 6,
          },
        });
        // Main dashed line
        m.addLayer({
          id: "walk-line-layer",
          type: "line",
          source: lineSourceIdRef.current,
          paint: {
            "line-color": "#00FF88",
            "line-width": 4,
            "line-opacity": 0.85,
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

  // Animate dashed line (marching ants) while in approach mode
  useEffect(() => {
    if (step.kind !== "approach") return;
    if (reducedMotion) return;
    const m = mapRef.current;
    if (!m) return;
    const patterns: number[][] = [
      [2, 2],
      [2.5, 1.5],
      [3, 1],
      [2.5, 1.5],
      [2, 2],
      [1.5, 2.5],
      [1, 3],
      [1.5, 2.5],
    ];
    let i = 0;
    const id = window.setInterval(() => {
      i = (i + 1) % patterns.length;
      try {
        if (m.getLayer("walk-line-layer")) {
          m.setPaintProperty("walk-line-layer", "line-dasharray", patterns[i]);
        }
      } catch {
        /* no-op */
      }
    }, 110);
    lineDashIntervalRef.current = id as unknown as number;
    return () => {
      clearInterval(id);
      lineDashIntervalRef.current = null;
    };
  }, [step.kind, reducedMotion]);

  // Pin-drop click handler
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    if (step.kind !== "pin") return;

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      const lng = e.lngLat.lng;
      const lat = e.lngLat.lat;
      void dropPin(lat, lng);
    };
    m.on("click", onClick);
    return () => {
      m.off("click", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.kind]);

  const placePinMarker = useCallback((lat: number, lng: number) => {
    const m = mapRef.current;
    if (!m) return;
    if (pinMarkerRef.current) {
      pinMarkerRef.current.setLngLat([lng, lat]);
    } else {
      const el = document.createElement("div");
      el.style.cssText = "display:flex;align-items:center;justify-content:center;";
      el.innerHTML = '<div class="walk-avatar walk-avatar-idle"></div>';
      pinMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(m);
    }
  }, []);

  // Drop pin → call /open, transition to approach
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
      const totalDistanceM = haversineM(lat, lng, spawn.spawn.lat, spawn.spawn.lng);
      virtualProgressRef.current = 0;
      gpsDistanceToSpawnRef.current = null;
      burstFiredRef.current = false;
      totalDistanceMRef.current = totalDistanceM;
      setRemainingM(totalDistanceM);
      setStep({ kind: "approach", preview, spawn, totalDistanceM });
    } catch (err) {
      setStep({ kind: "fatal", message: err instanceof Error ? err.message : "Failed" });
    }
  }

  // When approach starts: render gift marker, avatar, path, fit bounds
  useEffect(() => {
    if (step.kind !== "approach") return;
    const m = mapRef.current;
    if (!m) return;

    const { anchor, spawn } = step.spawn;

    if (!giftMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText = "position:relative;width:56px;height:56px;display:flex;align-items:center;justify-content:center;";
      const inner = document.createElement("div");
      inner.className = "walk-gift";
      inner.innerHTML = '<div class="walk-gift-iris"></div>';
      el.appendChild(inner);
      giftInnerElRef.current = inner;
      giftMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([spawn.lng, spawn.lat])
        .addTo(m);
    } else {
      giftMarkerRef.current.setLngLat([spawn.lng, spawn.lat]);
    }

    // Avatar starts at anchor
    if (avatarMarkerRef.current) {
      avatarMarkerRef.current.setLngLat([anchor.lng, anchor.lat]);
    } else {
      const el = document.createElement("div");
      el.style.cssText = "display:flex;align-items:center;justify-content:center;";
      const inner = document.createElement("div");
      inner.className = "walk-avatar walk-avatar-idle";
      el.appendChild(inner);
      avatarElRef.current = inner;
      avatarMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([anchor.lng, anchor.lat])
        .addTo(m);
    }
    if (pinMarkerRef.current) {
      pinMarkerRef.current.remove();
      pinMarkerRef.current = null;
    }

    // Draw path
    const src = m.getSource(lineSourceIdRef.current) as mapboxgl.GeoJSONSource | undefined;
    src?.setData({
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[anchor.lng, anchor.lat], [spawn.lng, spawn.lat]] },
      properties: {},
    });

    const bounds = new mapboxgl.LngLatBounds([anchor.lng, anchor.lat], [anchor.lng, anchor.lat]);
    bounds.extend([spawn.lng, spawn.lat]);
    m.fitBounds(bounds, { padding: 90, duration: 600, maxZoom: 17 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.kind]);

  // Compute current effective progress, update avatar position, path line, displays.
  const recompute = useCallback(() => {
    if (step.kind !== "approach") return;
    const { anchor, spawn } = step.spawn;
    const total = totalDistanceMRef.current;
    if (total <= 0) return;

    const gpsDist = gpsDistanceToSpawnRef.current;
    const gpsProgress = gpsDist !== null ? Math.max(0, total - gpsDist) : 0;
    const progress = Math.min(total, Math.max(virtualProgressRef.current, gpsProgress));
    const t = total > 0 ? progress / total : 0;
    const lat = anchor.lat + (spawn.lat - anchor.lat) * t;
    const lng = anchor.lng + (spawn.lng - anchor.lng) * t;
    avatarMarkerRef.current?.setLngLat([lng, lat]);

    const remaining = Math.max(0, total - progress);

    // Update path line from current avatar to spawn so it visually shrinks
    const m = mapRef.current;
    if (m) {
      const src = m.getSource(lineSourceIdRef.current) as mapboxgl.GeoJSONSource | undefined;
      src?.setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: [[lng, lat], [spawn.lng, spawn.lat]] },
        properties: {},
      });
    }

    // Update gift visual closeness
    const giftEl = giftInnerElRef.current;
    if (giftEl) {
      if (remaining <= PROXIMITY_M) {
        if (!giftEl.classList.contains("walk-gift-close")) giftEl.classList.add("walk-gift-close");
      } else if (giftEl.classList.contains("walk-gift-close")) {
        giftEl.classList.remove("walk-gift-close");
      }
    }

    // Throttle display updates
    const now = performance.now();
    if (now - lastDisplayUpdateRef.current >= DISPLAY_THROTTLE_MS) {
      lastDisplayUpdateRef.current = now;
      setRemainingM(remaining);
    }

    // Burst once on first reaching <= 5m
    if (remaining <= CATCH_RADIUS_M && !burstFiredRef.current) {
      burstFiredRef.current = true;
      setRemainingM(remaining);
      setShowBurst(true);
      try { playSound("approach", 0.55); } catch { /* no-op */ }
      if (typeof navigator !== "undefined") {
        const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
        try { nav.vibrate?.([60, 40, 120]); } catch { /* no-op */ }
      }
      window.setTimeout(() => setShowBurst(false), 900);
    }
  }, [step]);

  // Hold-to-walk RAF loop
  const stopHoldLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (vibrateIntervalRef.current !== null) {
      clearInterval(vibrateIntervalRef.current);
      vibrateIntervalRef.current = null;
    }
    if (avatarElRef.current) {
      avatarElRef.current.classList.remove("walk-avatar-walking");
      if (!avatarElRef.current.classList.contains("walk-avatar-idle")) {
        avatarElRef.current.classList.add("walk-avatar-idle");
      }
    }
  }, []);

  const startHoldLoop = useCallback(() => {
    if (step.kind !== "approach") return;
    if (holdingRef.current) return;
    holdingRef.current = true;
    setHoldingUI(true);
    if (avatarElRef.current) {
      avatarElRef.current.classList.remove("walk-avatar-idle");
      if (!avatarElRef.current.classList.contains("walk-avatar-walking")) {
        avatarElRef.current.classList.add("walk-avatar-walking");
      }
    }

    if (!reducedMotion && typeof navigator !== "undefined") {
      const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
      try { nav.vibrate?.(20); } catch { /* no-op */ }
      vibrateIntervalRef.current = window.setInterval(() => {
        try { nav.vibrate?.(20); } catch { /* no-op */ }
      }, VIBRATE_INTERVAL_MS) as unknown as number;
    }

    lastTickTsRef.current = performance.now();
    const tick = () => {
      if (!holdingRef.current) {
        rafRef.current = null;
        return;
      }
      const now = performance.now();
      const dt = (now - lastTickTsRef.current) / 1000;
      lastTickTsRef.current = now;
      virtualProgressRef.current = Math.min(
        totalDistanceMRef.current,
        virtualProgressRef.current + WALK_SPEED_MPS * dt,
      );
      recompute();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [step.kind, reducedMotion, recompute]);

  const releaseHold = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setHoldingUI(false);
    stopHoldLoop();
  }, [stopHoldLoop]);

  // Cleanup on unmount or step change away from approach
  useEffect(() => {
    return () => {
      holdingRef.current = false;
      stopHoldLoop();
      if (geoWatchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }
    };
  }, [stopHoldLoop]);

  // GPS watch — start when in approach
  const startGpsWatch = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (geoWatchIdRef.current !== null) return;
    if (step.kind !== "approach") return;
    const spawn = step.spawn.spawn;
    geoWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const dist = haversineM(pos.coords.latitude, pos.coords.longitude, spawn.lat, spawn.lng);
        gpsDistanceToSpawnRef.current = dist;
        if (!gpsActive) setGpsActive(true);
        if (!showHintGps) {
          setShowHintGps(true);
          window.setTimeout(() => setShowHintGps(false), 4200);
        }
        recompute();
      },
      () => {
        // permission denied / failed — silently ignore, virtual walking still works
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
  }, [step, gpsActive, showHintGps, recompute]);

  // Auto-start GPS if permission already granted
  useEffect(() => {
    if (step.kind !== "approach") return;
    if (typeof navigator === "undefined") return;
    const permsApi = (navigator as Navigator & { permissions?: { query: (q: { name: string }) => Promise<{ state: string }> } }).permissions;
    if (permsApi && typeof permsApi.query === "function") {
      permsApi.query({ name: "geolocation" }).then((result) => {
        if (result.state === "granted") startGpsWatch();
      }).catch(() => { /* no-op */ });
    }
  }, [step.kind, startGpsWatch]);

  // Catch handler
  async function attemptCatch() {
    if (step.kind !== "approach") return;
    if (remainingM > CATCH_RADIUS_M && (gpsDistanceToSpawnRef.current === null || gpsDistanceToSpawnRef.current > CATCH_RADIUS_M)) return;
    const preview = step.preview;
    const spawn = step.spawn;
    // Avatar's current latitude/longitude (interpolated by recompute)
    let avLat = spawn.spawn.lat;
    let avLng = spawn.spawn.lng;
    const total = totalDistanceMRef.current;
    if (total > 0) {
      const gpsDist = gpsDistanceToSpawnRef.current;
      const gpsProgress = gpsDist !== null ? Math.max(0, total - gpsDist) : 0;
      const progress = Math.min(total, Math.max(virtualProgressRef.current, gpsProgress));
      const t = progress / total;
      avLat = spawn.anchor.lat + (spawn.spawn.lat - spawn.anchor.lat) * t;
      avLng = spawn.anchor.lng + (spawn.spawn.lng - spawn.anchor.lng) * t;
    }
    releaseHold();
    setStep({ kind: "catching", preview, spawn });
    try {
      try { playSound("catch", 0.6); } catch { /* no-op */ }
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sign in first");
      const res = await fetch(`/api/gifts/${code}/catch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar_lat: avLat, avatar_lng: avLng, via_toggle: true }),
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

  const canCatch =
    step.kind === "approach" &&
    (remainingM <= CATCH_RADIUS_M ||
      (gpsDistanceToSpawnRef.current !== null && gpsDistanceToSpawnRef.current <= CATCH_RADIUS_M));

  const showProximityVignette = step.kind === "approach" && remainingM <= PROXIMITY_M;
  const progressPct =
    step.kind === "approach" && step.totalDistanceM > 0
      ? Math.min(100, Math.max(0, ((step.totalDistanceM - remainingM) / step.totalDistanceM) * 100))
      : 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {showProximityVignette && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: "radial-gradient(circle at 50% 60%, rgba(0,255,136,0) 35%, rgba(0,255,136,0.18) 75%, rgba(0,255,136,0.42) 100%)",
            animation: reducedMotion ? "none" : "walkVignetteIn 600ms ease-out forwards",
            zIndex: 25,
          }}
        />
      )}

      {showBurst && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "radial-gradient(circle, #88FF00 0%, #00FF88 45%, rgba(0,255,136,0) 70%)",
              animation: reducedMotion ? "none" : "walkBurst 900ms ease-out forwards",
              transform: "translate(-50%,-50%)",
            }}
          />
        </div>
      )}

      {/* Top HUD */}
      {step.kind === "pin" && (
        <div style={topBannerStyle}>
          <div style={topBannerEyebrow}>Walk Mode</div>
          <div style={topBannerBody}>Drop a pin to start your walk to the gift.</div>
          <div style={topBannerMeta}>Tap anywhere on the map</div>
        </div>
      )}

      {step.kind === "opening" && (
        <div style={topBannerStyle}>
          <div style={topBannerEyebrow}>Walk Mode</div>
          <div style={topBannerBody}>Opening gift…</div>
        </div>
      )}

      {(step.kind === "approach" || step.kind === "catching") && (
        <>
          <div style={hudPillLeft}>
            <div style={hudPillLabel}>Distance</div>
            <div style={hudPillValue}>{formatDistance(remainingM)} to gift</div>
          </div>
          {holdingUI && (
            <div style={hudPillRight}>
              <div style={hudPillLabel}>ETA</div>
              <div style={hudPillValue}>~{formatEta((remainingM / WALK_SPEED_MPS) * 1000)}</div>
            </div>
          )}
        </>
      )}

      {/* Exit link */}
      {(step.kind === "approach" || step.kind === "pin") && (
        <button
          type="button"
          onClick={() => router.replace(`/gift/${code}`)}
          style={exitLinkStyle}
        >
          Exit walk
        </button>
      )}

      {/* GPS hint / link */}
      {step.kind === "approach" && (
        <>
          {!gpsActive && (
            <button
              type="button"
              onClick={startGpsWatch}
              style={gpsLinkStyle}
            >
              Use my real location
            </button>
          )}
          {gpsActive && showHintGps && (
            <div style={gpsHintStyle}>GPS active — physical walking also works</div>
          )}
        </>
      )}

      {/* Bottom WALK / CATCH button */}
      {step.kind === "approach" && !canCatch && (
        <div style={bottomButtonWrap}>
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); startHoldLoop(); }}
            onPointerUp={(e) => { e.preventDefault(); releaseHold(); }}
            onPointerCancel={() => releaseHold()}
            onPointerLeave={() => releaseHold()}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              ...walkButtonStyle,
              transform: holdingUI ? "scale(0.96)" : "scale(1)",
              animation: reducedMotion ? "none" : "walkBtnPulse 2.2s ease-in-out infinite",
              touchAction: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "0.18em" }}>HOLD TO WALK</div>
            <div style={walkButtonProgressTrack}>
              <div
                style={{
                  ...walkButtonProgressFill,
                  width: `${progressPct}%`,
                }}
              />
            </div>
          </button>
        </div>
      )}

      {step.kind === "approach" && canCatch && (
        <div style={bottomButtonWrap}>
          <button
            type="button"
            onClick={attemptCatch}
            style={{
              ...catchButtonStyle,
              animation: reducedMotion ? "none" : "walkBtnCatchPulse 0.9s ease-in-out infinite",
            }}
          >
            CATCH
          </button>
        </div>
      )}

      {step.kind === "catching" && (
        <div style={bottomButtonWrap}>
          <button
            type="button"
            disabled
            style={{ ...catchButtonStyle, opacity: 0.7, cursor: "wait" }}
          >
            CATCHING…
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

const hudPillBase: React.CSSProperties = {
  position: "absolute",
  top: 18,
  padding: "8px 14px",
  background: "rgba(10,10,15,0.78)",
  backdropFilter: "blur(10px)",
  border: `1px solid ${C.primary}55`,
  borderRadius: 14,
  color: C.text,
  boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
  zIndex: 30,
  textAlign: "left",
  minWidth: 92,
};

const hudPillLeft: React.CSSProperties = { ...hudPillBase, left: 14 };
const hudPillRight: React.CSSProperties = { ...hudPillBase, right: 14, textAlign: "right" };

const hudPillLabel: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.28em",
  color: C.primary,
  textTransform: "uppercase",
  marginBottom: 2,
};

const hudPillValue: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  color: C.text,
  letterSpacing: "0.02em",
};

const exitLinkStyle: React.CSSProperties = {
  position: "absolute",
  top: 78,
  right: 14,
  padding: "6px 12px",
  background: "rgba(10,10,15,0.65)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  color: C.muted,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
  zIndex: 30,
};

const gpsLinkStyle: React.CSSProperties = {
  position: "absolute",
  top: 78,
  left: 14,
  padding: "6px 12px",
  background: "rgba(10,10,15,0.65)",
  border: `1px solid ${C.primary}55`,
  borderRadius: 12,
  color: C.primary,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
  zIndex: 30,
};

const gpsHintStyle: React.CSSProperties = {
  position: "absolute",
  top: 78,
  left: "50%",
  transform: "translateX(-50%)",
  padding: "6px 14px",
  background: "rgba(10,10,15,0.78)",
  border: `1px solid ${C.primary}55`,
  borderRadius: 12,
  color: C.primary,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  zIndex: 30,
  whiteSpace: "nowrap",
};

const bottomButtonWrap: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 28,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "0 16px",
  zIndex: 30,
  pointerEvents: "none",
};

const walkButtonStyle: React.CSSProperties = {
  width: "80%",
  maxWidth: 440,
  minHeight: 86,
  borderRadius: 22,
  background: "linear-gradient(180deg, #00FF88 0%, #00d873 100%)",
  color: "#0a0a0f",
  border: "2px solid rgba(255,255,255,0.16)",
  fontFamily: "inherit",
  fontWeight: 900,
  fontSize: 18,
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "14px 18px 10px",
  transition: "transform 90ms ease-out",
  pointerEvents: "auto",
  gap: 8,
};

const walkButtonProgressTrack: React.CSSProperties = {
  width: "100%",
  height: 5,
  background: "rgba(10,10,15,0.35)",
  borderRadius: 999,
  overflow: "hidden",
};

const walkButtonProgressFill: React.CSSProperties = {
  height: "100%",
  background: "linear-gradient(90deg, #0a0a0f, #88FF00)",
  transition: "width 120ms linear",
  borderRadius: 999,
};

const catchButtonStyle: React.CSSProperties = {
  width: "80%",
  maxWidth: 440,
  minHeight: 86,
  borderRadius: 22,
  background: "linear-gradient(180deg, #88FF00 0%, #00FF88 100%)",
  color: "#0a0a0f",
  border: "2px solid rgba(255,255,255,0.22)",
  fontFamily: "inherit",
  fontWeight: 900,
  fontSize: 22,
  letterSpacing: "0.22em",
  cursor: "pointer",
  pointerEvents: "auto",
};
