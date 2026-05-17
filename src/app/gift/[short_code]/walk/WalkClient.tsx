"use client";

// BLINK Spirit Gift — virtual-joystick navigation mode.
// User drops a pin anywhere on the map, then steers a green-dot avatar with a
// thumb joystick (Call-of-Duty style) toward the gift's spawn point. Optional
// GPS layered in: whichever method (virtual or real) is closer to the spawn
// wins. Server-side anti-cheat enforces `via_toggle=true` matching on open + catch.

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";
import { applyBlinkMapStyle } from "@/lib/blink-map-style";
import { startApproachLoop, stopApproach, setApproachVolume, playSound, haptic, HAPTIC } from "@/lib/game-feel";

const CATCH_RADIUS_M = 5;
const WALK_SPEED_MPS = 1.4;
const TICK_MS = 60;
const JOYSTICK_OUTER_R = 70;
const JOYSTICK_KNOB_R = 26;
const JOYSTICK_DEADZONE = 0.08;

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
  | { kind: "navigating"; preview: PreviewState; spawn: SpawnState }
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

// Bearing in degrees from (lat1,lng1) to (lat2,lng2), 0° = north, clockwise.
function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const p = Math.PI / 180;
  const phi1 = lat1 * p;
  const phi2 = lat2 * p;
  const dl = (lng2 - lng1) * p;
  const y = Math.sin(dl) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dl);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
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
@keyframes walkCompassPulse {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(0,255,136,0.55)); }
  50% { filter: drop-shadow(0 0 14px rgba(0,255,136,1)); }
}
@keyframes walkCatchPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,136,0.7), 0 8px 30px rgba(0,255,136,0.5); }
  50% { box-shadow: 0 0 0 14px rgba(0,255,136,0), 0 12px 40px rgba(0,255,136,0.65); }
}
@keyframes walkCatchRise {
  0% { transform: translate(-50%, 40px); opacity: 0; }
  100% { transform: translate(-50%, 0); opacity: 1; }
}
@keyframes walkLabelFloat {
  0%, 100% { transform: translate(-50%, 0); }
  50% { transform: translate(-50%, -2px); }
}
.walk-avatar {
  width: 22px; height: 22px; border-radius: 50%;
  background: #00FF88;
  border: 3px solid #0a0a0f;
  animation: walkAvatarPulse 1.6s ease-in-out infinite;
}
.walk-avatar-label {
  position: absolute;
  top: 26px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 11px;
  font-weight: 700;
  color: #00FF88;
  text-shadow: 0 0 6px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.8);
  letter-spacing: 0.04em;
  pointer-events: none;
  animation: walkLabelFloat 2.4s ease-in-out infinite;
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

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const pinMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const avatarMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const giftMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Virtual avatar position — driven by joystick.
  const virtualPosRef = useRef<{ lat: number; lng: number } | null>(null);
  // Real GPS position when available.
  const gpsPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const [gpsActive, setGpsActive] = useState(false);

  // Effective avatar position (closer of virtual/gps to spawn) — for HUD render.
  const [avatarPos, setAvatarPos] = useState<{ lat: number; lng: number } | null>(null);
  const avatarPosRef = useRef<{ lat: number; lng: number } | null>(null);

  // Joystick state.
  const joystickRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const activePointerIdRef = useRef<number | null>(null);
  const knobRef = useRef<{ dx: number; dy: number; mag: number; angle: number }>({ dx: 0, dy: 0, mag: 0, angle: 0 });

  const tickHandleRef = useRef<number | null>(null);
  const lastTickTsRef = useRef<number>(0);
  const approachActiveRef = useRef<boolean>(false);

  const handleRef = useRef<string>("@you");

  // Auth gate.
  useEffect(() => {
    if (!authLoading && !user) router.replace(`/gift/${code}`);
  }, [authLoading, user, router, code]);

  // Pull handle for avatar label.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("handle, display_name")
          .eq("id", user.id)
          .single();
        if (cancelled) return;
        const h = data?.handle || data?.display_name || "you";
        handleRef.current = `@${String(h).replace(/^@/, "")}`;
        const el = document.getElementById("walk-avatar-label");
        if (el) el.textContent = handleRef.current;
      } catch {
        /* no-op */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

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

  // Initialize map.
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
    });
    mapRef.current = m;
    return () => {
      m.remove();
      mapRef.current = null;
    };
  }, [step.kind, initialCenter.lat, initialCenter.lng]);

  // Pin-drop click handler.
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    if (step.kind !== "pin") return;

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      void dropPin(e.lngLat.lat, e.lngLat.lng);
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
      el.innerHTML = '<div class="walk-avatar"></div>';
      pinMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(m);
    }
  }, []);

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
      setStep({ kind: "navigating", preview, spawn });
    } catch (err) {
      setStep({ kind: "fatal", message: err instanceof Error ? err.message : "Failed" });
    }
  }

  // When navigation begins, render gift + avatar markers, seed virtual position.
  useEffect(() => {
    if (step.kind !== "navigating") return;
    const m = mapRef.current;
    if (!m) return;

    const { anchor, spawn } = step.spawn;

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

    virtualPosRef.current = { lat: anchor.lat, lng: anchor.lng };
    avatarPosRef.current = { lat: anchor.lat, lng: anchor.lng };
    setAvatarPos({ lat: anchor.lat, lng: anchor.lng });

    if (!avatarMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText = "position:relative;display:flex;align-items:center;justify-content:center;";
      const dot = document.createElement("div");
      dot.className = "walk-avatar";
      const label = document.createElement("div");
      label.className = "walk-avatar-label";
      label.id = "walk-avatar-label";
      label.textContent = handleRef.current;
      el.appendChild(dot);
      el.appendChild(label);
      avatarMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([anchor.lng, anchor.lat])
        .addTo(m);
    } else {
      avatarMarkerRef.current.setLngLat([anchor.lng, anchor.lat]);
    }
    if (pinMarkerRef.current) {
      pinMarkerRef.current.remove();
      pinMarkerRef.current = null;
    }

    m.easeTo({ center: [anchor.lng, anchor.lat], zoom: 18, duration: 700 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.kind]);

  // GPS watcher — runs during navigation.
  useEffect(() => {
    if (step.kind !== "navigating") return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let cleared = false;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        if (cleared) return;
        gpsPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsActive(true);
      },
      () => { /* permission denied — joystick still works */ },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 8000 },
    );
    return () => {
      cleared = true;
      try { navigator.geolocation.clearWatch(id); } catch { /* no-op */ }
      setGpsActive(false);
    };
  }, [step.kind]);

  // Movement + render tick — runs while navigating.
  useEffect(() => {
    if (step.kind !== "navigating") return;
    const m = mapRef.current;
    if (!m) return;
    const spawn = step.spawn.spawn;

    lastTickTsRef.current = performance.now();
    let stopped = false;

    const loop = () => {
      if (stopped) return;
      const now = performance.now();
      const dt = Math.min(0.25, (now - lastTickTsRef.current) / 1000);
      lastTickTsRef.current = now;

      const k = knobRef.current;
      const vp = virtualPosRef.current;
      if (vp && k.mag > JOYSTICK_DEADZONE) {
        const dist = WALK_SPEED_MPS * k.mag * dt;
        const dLat = (dist * Math.cos(k.angle)) / 111000;
        const dLng = (dist * Math.sin(k.angle)) / (111000 * Math.cos((vp.lat * Math.PI) / 180));
        virtualPosRef.current = { lat: vp.lat + dLat, lng: vp.lng + dLng };
      }

      const vNow = virtualPosRef.current;
      const g = gpsPosRef.current;
      let eff = vNow ?? g;
      if (vNow && g) {
        const vd = haversineM(vNow.lat, vNow.lng, spawn.lat, spawn.lng);
        const gd = haversineM(g.lat, g.lng, spawn.lat, spawn.lng);
        eff = gd < vd ? g : vNow;
      }
      if (!eff) {
        tickHandleRef.current = window.setTimeout(loop, TICK_MS);
        return;
      }
      avatarPosRef.current = eff;

      if (avatarMarkerRef.current) {
        avatarMarkerRef.current.setLngLat([eff.lng, eff.lat]);
      }
      m.easeTo({ center: [eff.lng, eff.lat], duration: 240 });

      const distLeft = haversineM(eff.lat, eff.lng, spawn.lat, spawn.lng);
      if (distLeft <= 25) {
        const vol = Math.max(0.05, Math.min(0.55, (25 - distLeft) / 25));
        if (!approachActiveRef.current) {
          startApproachLoop(vol);
          approachActiveRef.current = true;
        } else {
          setApproachVolume(vol);
        }
      } else if (approachActiveRef.current) {
        stopApproach();
        approachActiveRef.current = false;
      }

      setAvatarPos(eff);
      tickHandleRef.current = window.setTimeout(loop, TICK_MS);
    };
    loop();

    return () => {
      stopped = true;
      if (tickHandleRef.current !== null) {
        clearTimeout(tickHandleRef.current);
        tickHandleRef.current = null;
      }
      stopApproach();
      approachActiveRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.kind]);

  // Joystick pointer handlers.
  const updateKnob = useCallback((clientX: number, clientY: number) => {
    const el = joystickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const maxR = JOYSTICK_OUTER_R - JOYSTICK_KNOB_R;
    if (dist > maxR && dist > 0) {
      const s = maxR / dist;
      dx *= s;
      dy *= s;
    }
    const mag = Math.min(1, dist / maxR);
    // angle: 0 = north (knob pushed up), clockwise.
    // dx (east), -dy (north): atan2(dx, -dy) gives 0 when straight up.
    const angle = Math.atan2(dx, -dy);
    knobRef.current = { dx, dy, mag, angle };
    setKnob({ x: dx, y: dy });
  }, []);

  const releaseKnob = useCallback(() => {
    activePointerIdRef.current = null;
    knobRef.current = { dx: 0, dy: 0, mag: 0, angle: 0 };
    setKnob({ x: 0, y: 0 });
  }, []);

  const onJoystickDown = useCallback(
    (e: React.PointerEvent) => {
      if (activePointerIdRef.current !== null) return;
      // stop the map from grabbing the gesture
      e.preventDefault();
      e.stopPropagation();
      const el = joystickRef.current;
      if (!el) return;
      try { el.setPointerCapture(e.pointerId); } catch { /* no-op */ }
      activePointerIdRef.current = e.pointerId;
      updateKnob(e.clientX, e.clientY);
      haptic(HAPTIC.TAP);
      // Disable Mapbox drag/zoom so the map doesn't fight the joystick gesture
      // (especially on iOS Safari where two touch handlers can race).
      const m = mapRef.current;
      if (m) {
        m.dragPan.disable();
        m.touchZoomRotate.disable();
        m.scrollZoom.disable();
        m.doubleClickZoom.disable();
      }
    },
    [updateKnob],
  );

  const onJoystickMove = useCallback(
    (e: React.PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      e.preventDefault();
      updateKnob(e.clientX, e.clientY);
    },
    [updateKnob],
  );

  const onJoystickUp = useCallback(
    (e: React.PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      const el = joystickRef.current;
      try { el?.releasePointerCapture(e.pointerId); } catch { /* no-op */ }
      releaseKnob();
      // Re-enable Mapbox handlers so the user can pan/zoom the map manually again.
      const m = mapRef.current;
      if (m) {
        m.dragPan.enable();
        m.touchZoomRotate.enable();
        m.scrollZoom.enable();
        m.doubleClickZoom.enable();
      }
    },
    [releaseKnob],
  );

  const recenter = useCallback(() => {
    const m = mapRef.current;
    const a = avatarPosRef.current;
    if (!m || !a) return;
    m.easeTo({ center: [a.lng, a.lat], zoom: 18, duration: 400 });
  }, []);

  async function attemptCatch() {
    if (step.kind !== "navigating") return;
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
      try { playSound("catch", 0.55); } catch { /* no-op */ }
      haptic(HAPTIC.CATCH_SUCCESS);
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

  const isNavigating = step.kind === "navigating" || step.kind === "catching";
  const spawnNow =
    step.kind === "navigating" || step.kind === "catching" ? step.spawn.spawn : null;

  const distLeft =
    isNavigating && spawnNow && avatarPos
      ? haversineM(avatarPos.lat, avatarPos.lng, spawnNow.lat, spawnNow.lng)
      : null;
  const compassDeg =
    isNavigating && spawnNow && avatarPos
      ? bearingDeg(avatarPos.lat, avatarPos.lng, spawnNow.lat, spawnNow.lng)
      : 0;
  const withinCatch = distLeft !== null && distLeft <= CATCH_RADIUS_M;
  const vignetteAlpha =
    distLeft !== null && distLeft <= 25 ? Math.min(0.55, (25 - distLeft) / 25) : 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: C.bg,
        color: C.text,
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: "hidden",
        touchAction: "none",
      }}
    >
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {vignetteAlpha > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,255,136,${vignetteAlpha * 0.55}) 100%)`,
            zIndex: 5,
          }}
        />
      )}

      {step.kind === "pin" && (
        <div style={topBannerStyle}>
          <div style={topBannerEyebrow}>Walk Mode</div>
          <div style={topBannerBody}>Drop a pin to start the hunt</div>
          <div style={topBannerMeta}>Tap anywhere on the map</div>
        </div>
      )}
      {step.kind === "opening" && (
        <div style={topBannerStyle}>
          <div style={topBannerEyebrow}>Walk Mode</div>
          <div style={topBannerBody}>Opening gift…</div>
        </div>
      )}

      {isNavigating && spawnNow && (
        <CompassHud
          distM={distLeft ?? 0}
          bearing={compassDeg}
          gpsActive={gpsActive}
          withinCatch={withinCatch}
        />
      )}

      <button
        type="button"
        onClick={() => router.replace(`/gift/${code}`)}
        style={exitBtnStyle}
        aria-label="Exit walk mode"
      >
        Exit
      </button>

      {isNavigating && spawnNow && avatarPos && (
        <Minimap avatar={avatarPos} spawn={spawnNow} />
      )}

      {isNavigating && (
        <button
          type="button"
          onClick={recenter}
          style={recenterBtnStyle}
          aria-label="Recenter map on you"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="1" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="23" />
            <line x1="1" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="23" y2="12" />
          </svg>
        </button>
      )}

      {isNavigating && !withinCatch && (
        <div
          ref={joystickRef}
          onPointerDown={onJoystickDown}
          onPointerMove={onJoystickMove}
          onPointerUp={onJoystickUp}
          onPointerCancel={onJoystickUp}
          style={joystickOuterStyle}
        >
          <div style={joystickRingInnerStyle} />
          <div
            style={{
              ...joystickKnobStyle,
              transform: `translate(${knob.x}px, ${knob.y}px)`,
              transition:
                activePointerIdRef.current === null
                  ? "transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1)"
                  : "none",
            }}
          />
        </div>
      )}

      {isNavigating && withinCatch && (
        <div style={catchWrapStyle}>
          <button
            type="button"
            onClick={attemptCatch}
            disabled={step.kind === "catching"}
            style={{
              ...catchBtnStyle,
              animation: step.kind === "catching" ? "none" : "walkCatchPulse 1.4s ease-in-out infinite",
              opacity: step.kind === "catching" ? 0.7 : 1,
              cursor: step.kind === "catching" ? "wait" : "pointer",
            }}
          >
            {step.kind === "catching" ? "Catching…" : "Catch"}
          </button>
        </div>
      )}
    </div>
  );
}

// ───────────── Sub-components ─────────────

function CompassHud({
  distM,
  bearing,
  gpsActive,
  withinCatch,
}: {
  distM: number;
  bearing: number;
  gpsActive: boolean;
  withinCatch: boolean;
}) {
  const distLabel =
    distM >= 1000 ? `${(distM / 1000).toFixed(2)}km to gift` : `${Math.round(distM)}m to gift`;
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        background: "rgba(10,10,15,0.78)",
        backdropFilter: "blur(10px)",
        border: `1px solid ${C.primary}66`,
        borderRadius: 16,
        zIndex: 30,
        boxShadow: "0 6px 24px rgba(0,0,0,0.55)",
        maxWidth: "calc(100vw - 110px)",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `rotate(${bearing}deg)`,
          transition: "transform 220ms linear",
          animation: withinCatch ? "walkCompassPulse 0.7s ease-in-out infinite" : undefined,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#00FF88" stroke="#0a0a0f" strokeWidth="1.2" strokeLinejoin="round">
          <path d="M12 2 L18 20 L12 16 L6 20 Z" />
        </svg>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: "0.02em" }}>
        {distLabel}
      </div>
      {gpsActive && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            background: "rgba(0,255,136,0.12)",
            border: `1px solid ${C.primary}55`,
            borderRadius: 10,
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.18em",
            color: C.primary,
            textTransform: "uppercase",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 3, background: C.primary, boxShadow: `0 0 6px ${C.primary}` }} />
          GPS
        </div>
      )}
    </div>
  );
}

function Minimap({
  avatar,
  spawn,
}: {
  avatar: { lat: number; lng: number };
  spawn: { lat: number; lng: number };
}) {
  const [visible, setVisible] = useState(true);
  const W = 120;
  const PAD = 14;
  const midLat = (avatar.lat + spawn.lat) / 2;
  const midLng = (avatar.lng + spawn.lng) / 2;
  const dLat = Math.max(0.00012, Math.abs(avatar.lat - spawn.lat));
  const dLng = Math.max(0.00012, Math.abs(avatar.lng - spawn.lng));
  const span = Math.max(dLat, dLng) * 1.6;
  const norm = (v: number, mid: number) => (v - mid) / span;
  const toPx = (n: number) => W / 2 + n * (W - PAD * 2);
  const avX = toPx(norm(avatar.lng, midLng));
  const avY = toPx(-norm(avatar.lat, midLat));
  const spX = toPx(norm(spawn.lng, midLng));
  const spY = toPx(-norm(spawn.lat, midLat));
  return (
    <button
      type="button"
      onClick={() => setVisible((v) => !v)}
      style={{
        position: "absolute",
        top: 70,
        right: 14,
        width: visible ? W : 38,
        height: visible ? W : 38,
        padding: 0,
        border: `1px solid ${C.primary}66`,
        borderRadius: 14,
        background: "rgba(10,10,15,0.86)",
        backdropFilter: "blur(8px)",
        cursor: "pointer",
        overflow: "hidden",
        zIndex: 30,
        boxShadow: "0 6px 20px rgba(0,0,0,0.55)",
        transition: "width 220ms ease, height 220ms ease",
      }}
      aria-label={visible ? "Hide minimap" : "Show minimap"}
    >
      {visible ? (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(0,255,136,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.12) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <svg width={W} height={W} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <line x1={avX} y1={avY} x2={spX} y2={spY} stroke="#00FF88" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.55" />
          </svg>
          <div
            style={{
              position: "absolute",
              left: spX - 6,
              top: spY - 6,
              width: 12,
              height: 12,
              borderRadius: 6,
              background: "#88FF00",
              boxShadow: "0 0 10px rgba(136,255,0,0.9)",
              animation: "walkAvatarPulse 1.4s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: avX - 4,
              top: avY - 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              background: "#00FF88",
              border: "1px solid #0a0a0f",
            }}
          />
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </div>
      )}
    </button>
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

// ───────────── Styles ─────────────

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

const exitBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 14,
  height: 36,
  padding: "0 14px",
  borderRadius: 18,
  background: "rgba(10,10,15,0.78)",
  backdropFilter: "blur(10px)",
  border: `1px solid ${C.primary}44`,
  color: C.text,
  fontFamily: "inherit",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  cursor: "pointer",
  zIndex: 31,
};

const recenterBtnStyle: React.CSSProperties = {
  position: "absolute",
  right: 14,
  bottom: 200,
  width: 44,
  height: 44,
  borderRadius: 22,
  background: "rgba(10,10,15,0.78)",
  backdropFilter: "blur(10px)",
  border: `1px solid ${C.primary}55`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  zIndex: 30,
  boxShadow: "0 6px 20px rgba(0,0,0,0.55)",
};

const joystickOuterStyle: React.CSSProperties = {
  position: "absolute",
  left: 28,
  // Lift well above iOS Safari's bottom toolbar (chrome + nav). Without the env()
  // safe-area inset the joystick sits behind the browser UI and taps never
  // reach the page.
  bottom: "calc(env(safe-area-inset-bottom, 16px) + 120px)",
  width: JOYSTICK_OUTER_R * 2,
  height: JOYSTICK_OUTER_R * 2,
  borderRadius: JOYSTICK_OUTER_R,
  background: "radial-gradient(circle at 50% 50%, rgba(0,255,136,0.10), rgba(0,0,0,0.55) 70%)",
  border: `2px solid ${C.primary}88`,
  boxShadow: "0 8px 28px rgba(0,0,0,0.6), 0 0 24px rgba(0,255,136,0.25)",
  backdropFilter: "blur(6px)",
  zIndex: 40,
  touchAction: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const joystickRingInnerStyle: React.CSSProperties = {
  position: "absolute",
  width: JOYSTICK_OUTER_R * 1.4,
  height: JOYSTICK_OUTER_R * 1.4,
  borderRadius: "50%",
  border: "1px dashed rgba(0,255,136,0.35)",
  pointerEvents: "none",
};

const joystickKnobStyle: React.CSSProperties = {
  position: "absolute",
  width: JOYSTICK_KNOB_R * 2,
  height: JOYSTICK_KNOB_R * 2,
  borderRadius: JOYSTICK_KNOB_R,
  background: "radial-gradient(circle at 35% 30%, #b6ffd0 0%, #00FF88 55%, #00b35e 100%)",
  border: "2px solid rgba(255,255,255,0.6)",
  boxShadow: "0 4px 14px rgba(0,255,136,0.55), inset 0 0 8px rgba(255,255,255,0.4)",
  pointerEvents: "none",
};

const catchWrapStyle: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  bottom: 48,
  transform: "translateX(-50%)",
  width: "80%",
  maxWidth: 420,
  zIndex: 40,
  animation: "walkCatchRise 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
};

const catchBtnStyle: React.CSSProperties = {
  width: "100%",
  height: 80,
  borderRadius: 22,
  border: "2px solid rgba(255,255,255,0.15)",
  background: "linear-gradient(135deg, #00FF88 0%, #88FF00 100%)",
  color: "#0a0a0f",
  fontWeight: 900,
  fontSize: 22,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  fontFamily: "inherit",
};
