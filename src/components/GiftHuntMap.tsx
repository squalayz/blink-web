"use client";

// Dedicated Spirit Gift hunt map. Self-contained so we don't perturb the main
// HuntMap which has its own logic. Renders:
//   - Recipient avatar (separate from real GPS)
//   - Gift creature (golden+green glow, pulsing)
//   - Catch radius circle
//   - Joystick UI (bottom-right) for analog movement
//   - Real GPS updates drive the avatar at real speed
// Catching is the parent's job.

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { applyBlinkMapStyle } from "@/lib/blink-map-style";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export interface GiftHuntMapProps {
  anchor: { lat: number; lng: number };
  spawn: { lat: number; lng: number };
  initialAvatar: { lat: number; lng: number };
  onAvatarChange: (lat: number, lng: number, dtMs: number) => Promise<{ ok: boolean; rolledBackLat?: number; rolledBackLng?: number } | null | undefined>;
  catchRadiusM: number;
  fenceRadiusM: number;
}

const GIFT_CSS = `
@keyframes giftPulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 12px rgba(0,255,136,0.9)) drop-shadow(0 0 30px rgba(136,255,0,0.55)); }
  50% { transform: scale(1.1); filter: drop-shadow(0 0 22px rgba(0,255,136,1)) drop-shadow(0 0 52px rgba(136,255,0,0.85)); }
}
@keyframes giftSonar {
  0% { transform: translate(-50%,-50%) scale(0.6); opacity: 0.8; }
  100% { transform: translate(-50%,-50%) scale(3.6); opacity: 0; }
}
@keyframes avatarPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,136,0.6); transform: scale(1); }
  50% { box-shadow: 0 0 22px 6px rgba(0,255,136,0.35); transform: scale(1.08); }
}
.gift-creature {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, #88FF00 0%, #00FF88 60%, rgba(0,255,136,0.0) 100%);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  animation: giftPulse 1.8s ease-in-out infinite;
}
.gift-creature::after {
  content: "";
  position: absolute; top: 50%; left: 50%;
  width: 60px; height: 60px; border-radius: 50%;
  border: 2px solid rgba(0,255,136,0.7);
  animation: giftSonar 2.4s ease-out infinite;
  pointer-events: none;
}
.gift-iris {
  width: 18px; height: 18px; border-radius: 50%;
  background: #0a0a0f;
  border: 2px solid #FFFFFF;
}
.gift-avatar {
  width: 22px; height: 22px; border-radius: 50%;
  background: #00FF88;
  border: 3px solid #0a0a0f;
  animation: avatarPulse 1.6s ease-in-out infinite;
}
.mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib, .mapboxgl-ctrl-group { display: none !important; }
`;

const MAX_SPEED_MPS = 2.0;

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

function moveAvatar(lat: number, lng: number, dxMeters: number, dyMeters: number): { lat: number; lng: number } {
  const dLat = dyMeters / 111000;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const dLng = dxMeters / (111000 * (Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat));
  return { lat: lat + dLat, lng: lng + dLng };
}

export default function GiftHuntMap({
  anchor,
  spawn,
  initialAvatar,
  onAvatarChange,
  catchRadiusM,
  fenceRadiusM,
}: GiftHuntMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const avatarMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const giftMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const fenceRef = useRef<string>("gift-fence");

  const avatarRef = useRef<{ lat: number; lng: number }>({ ...initialAvatar });
  const [avatarPos, setAvatarPos] = useState<{ lat: number; lng: number }>({ ...initialAvatar });
  const lastSyncRef = useRef<number>(Date.now());

  // Inject CSS once
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!document.getElementById("gift-hunt-styles")) {
      const s = document.createElement("style");
      s.id = "gift-hunt-styles";
      s.textContent = GIFT_CSS;
      document.head.appendChild(s);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const m = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [spawn.lng, spawn.lat],
      zoom: 17,
      pitch: 45,
      attributionControl: false,
    });
    m.on("style.load", () => {
      applyBlinkMapStyle(m, { hour: new Date().getHours() });
      // Fence circle
      const fenceCoords: [number, number][] = [];
      const N = 64;
      for (let i = 0; i <= N; i++) {
        const ang = (i / N) * 2 * Math.PI;
        const off = moveAvatar(anchor.lat, anchor.lng, fenceRadiusM * Math.sin(ang), fenceRadiusM * Math.cos(ang));
        fenceCoords.push([off.lng, off.lat]);
      }
      m.addSource(fenceRef.current, {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "Polygon", coordinates: [fenceCoords] }, properties: {} },
      });
      m.addLayer({
        id: "gift-fence-fill",
        type: "fill",
        source: fenceRef.current,
        paint: { "fill-color": "#00FF88", "fill-opacity": 0.04 },
      });
      m.addLayer({
        id: "gift-fence-line",
        type: "line",
        source: fenceRef.current,
        paint: { "line-color": "#00FF88", "line-opacity": 0.4, "line-dasharray": [2, 4], "line-width": 1.5 },
      });

      // Catch radius around the spawn
      const catchCoords: [number, number][] = [];
      for (let i = 0; i <= N; i++) {
        const ang = (i / N) * 2 * Math.PI;
        const off = moveAvatar(spawn.lat, spawn.lng, catchRadiusM * Math.sin(ang), catchRadiusM * Math.cos(ang));
        catchCoords.push([off.lng, off.lat]);
      }
      m.addSource("gift-catch", {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "Polygon", coordinates: [catchCoords] }, properties: {} },
      });
      m.addLayer({
        id: "gift-catch-fill",
        type: "fill",
        source: "gift-catch",
        paint: { "fill-color": "#88FF00", "fill-opacity": 0.10 },
      });
    });
    mapRef.current = m;
    return () => {
      m.remove();
      mapRef.current = null;
    };
  }, [anchor.lat, anchor.lng, spawn.lat, spawn.lng, fenceRadiusM, catchRadiusM]);

  // Gift creature marker (static)
  useEffect(() => {
    if (!mapRef.current) return;
    const el = document.createElement("div");
    el.style.cssText = "position:relative;width:56px;height:56px;display:flex;align-items:center;justify-content:center;";
    el.innerHTML = '<div class="gift-creature"><div class="gift-iris"></div></div>';
    const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
      .setLngLat([spawn.lng, spawn.lat])
      .addTo(mapRef.current);
    giftMarkerRef.current = marker;
    return () => marker.remove();
  }, [spawn.lat, spawn.lng]);

  // Avatar marker — updates as state changes
  useEffect(() => {
    if (!mapRef.current) return;
    if (!avatarMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText = "display:flex;align-items:center;justify-content:center;";
      el.innerHTML = '<div class="gift-avatar"></div>';
      avatarMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([avatarPos.lng, avatarPos.lat])
        .addTo(mapRef.current);
    } else {
      avatarMarkerRef.current.setLngLat([avatarPos.lng, avatarPos.lat]);
    }
  }, [avatarPos.lat, avatarPos.lng]);

  // Heartbeat sync to server every 1s if avatar moved.
  useEffect(() => {
    let active = true;
    const lastSent = { lat: avatarRef.current.lat, lng: avatarRef.current.lng };
    const iv = setInterval(async () => {
      if (!active) return;
      const cur = avatarRef.current;
      const moved = haversineM(lastSent.lat, lastSent.lng, cur.lat, cur.lng);
      if (moved < 0.5) return;
      const now = Date.now();
      const dt = now - lastSyncRef.current;
      lastSyncRef.current = now;
      const res = await onAvatarChange(cur.lat, cur.lng, dt);
      if (res && res.ok) {
        lastSent.lat = cur.lat;
        lastSent.lng = cur.lng;
      } else if (res && (res.rolledBackLat ?? null) !== null && (res.rolledBackLng ?? null) !== null) {
        // Server rejected — revert.
        const rl = res.rolledBackLat as number;
        const rg = res.rolledBackLng as number;
        avatarRef.current = { lat: rl, lng: rg };
        setAvatarPos({ lat: rl, lng: rg });
      }
    }, 1000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [onAvatarChange]);

  // Real GPS — if the user actually walks, that wins over joystick.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Clamp to fence.
        const distFromAnchor = haversineM(anchor.lat, anchor.lng, lat, lng);
        if (distFromAnchor > 5000) return; // GPS spike, ignore
        avatarRef.current = { lat, lng };
        setAvatarPos({ lat, lng });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [anchor.lat, anchor.lng]);

  // Joystick — drag a stick around. Vector → speed at MAX_SPEED_MPS.
  const stickFrameRef = useRef<number | null>(null);
  const stickVecRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const tick = useCallback(() => {
    const { x, y } = stickVecRef.current;
    if (x === 0 && y === 0) {
      stickFrameRef.current = null;
      return;
    }
    // x,y normalized to [-1,1]
    const speed = MAX_SPEED_MPS; // m/s, max
    const dt = 1 / 30; // 30fps
    const dxMeters = x * speed * dt;
    const dyMeters = -y * speed * dt; // screen-down is south
    const next = moveAvatar(avatarRef.current.lat, avatarRef.current.lng, dxMeters, dyMeters);
    // Enforce fence locally too.
    const distFromAnchor = haversineM(anchor.lat, anchor.lng, next.lat, next.lng);
    if (distFromAnchor <= 1500) {
      avatarRef.current = next;
      setAvatarPos(next);
    }
    stickFrameRef.current = requestAnimationFrame(tick);
  }, [anchor.lat, anchor.lng]);

  const startStick = useCallback(
    (x: number, y: number) => {
      stickVecRef.current = { x, y };
      if (stickFrameRef.current === null) {
        stickFrameRef.current = requestAnimationFrame(tick);
      }
    },
    [tick]
  );
  const stopStick = useCallback(() => {
    stickVecRef.current = { x: 0, y: 0 };
    if (stickFrameRef.current) {
      cancelAnimationFrame(stickFrameRef.current);
      stickFrameRef.current = null;
    }
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      <Joystick onMove={startStick} onEnd={stopStick} />
    </div>
  );
}

function Joystick({ onMove, onEnd }: { onMove: (x: number, y: number) => void; onEnd: () => void }) {
  const padRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activeRef = useRef(false);

  const handlePointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = padRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const r = rect.width / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamped = Math.min(dist, r);
      const ang = Math.atan2(dy, dx);
      const kx = clamped * Math.cos(ang);
      const ky = clamped * Math.sin(ang);
      setKnob({ x: kx, y: ky });
      // Normalize to [-1,1]
      onMove(kx / r, ky / r);
    },
    [onMove]
  );

  return (
    <div
      ref={padRef}
      onPointerDown={(e) => {
        activeRef.current = true;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        handlePointer(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!activeRef.current) return;
        handlePointer(e.clientX, e.clientY);
      }}
      onPointerUp={() => {
        activeRef.current = false;
        setKnob({ x: 0, y: 0 });
        onEnd();
      }}
      onPointerCancel={() => {
        activeRef.current = false;
        setKnob({ x: 0, y: 0 });
        onEnd();
      }}
      style={{
        position: "absolute",
        right: 22,
        bottom: 28,
        width: 130,
        height: 130,
        borderRadius: 65,
        background: "radial-gradient(circle at 50% 50%, rgba(0,255,136,0.10), rgba(0,0,0,0.55))",
        border: "1px solid rgba(0,255,136,0.4)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
        touchAction: "none",
        zIndex: 30,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 54,
          height: 54,
          marginLeft: -27,
          marginTop: -27,
          transform: `translate(${knob.x}px, ${knob.y}px)`,
          borderRadius: 27,
          background: "radial-gradient(circle at 35% 30%, #FFFFFF 0%, #88FF00 50%, #00FF88 100%)",
          boxShadow: "0 4px 14px rgba(0,255,136,0.5)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
