'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { C, Orb, normalizeOrb, rarityColor, currencyColor } from '@/lib/theme';

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const GLASS_BG = 'rgba(10,10,15,0.7)';
const GLASS_BORDER = 'rgba(255,255,255,0.06)';
const MAX_RANGE = 500; // meters
const FOV_DEG = 60; // horizontal field of view we simulate

// ──────────────────────────────────────────────────────────────────────────────
// Haversine helpers
// ──────────────────────────────────────────────────────────────────────────────

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(rLat2);
  const x = Math.cos(rLat1) * Math.sin(rLat2) - Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ──────────────────────────────────────────────────────────────────────────────
// Currency label helper
// ──────────────────────────────────────────────────────────────────────────────

function currencyLetter(c: string): string {
  if (c === 'BTC') return 'B';
  if (c === 'ETH') return 'E';
  return 'S';
}

// ──────────────────────────────────────────────────────────────────────────────
// Format distance
// ──────────────────────────────────────────────────────────────────────────────

function fmtDist(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Keyframes
// ──────────────────────────────────────────────────────────────────────────────

const AR_CSS = `
@keyframes arPulse {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.18); opacity: 1; }
}
@keyframes arGlow {
  0%, 100% { box-shadow: 0 0 12px var(--glow), 0 0 24px var(--glow); }
  50% { box-shadow: 0 0 20px var(--glow), 0 0 48px var(--glow); }
}
@keyframes arFadeIn {
  0% { opacity: 0; transform: translateY(12px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes arSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// ──────────────────────────────────────────────────────────────────────────────
// Main AR Page
// ──────────────────────────────────────────────────────────────────────────────

export default function ARPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // State
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [pitch, setPitch] = useState(0);
  const [orientationError, setOrientationError] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState(false);
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Start camera ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch {
        if (!cancelled) setCameraError('Camera access denied. Go to Settings > Safari > Camera and allow access for this site.');
      }
    }
    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Device orientation (compass) ──────────────────────────────────────────
  useEffect(() => {
    let active = true;

    function handleOrientation(e: DeviceOrientationEvent) {
      if (!active) return;
      // iOS: webkitCompassHeading is magnetic north; Android: alpha needs transform
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const evt = e as any;
      if (typeof evt.webkitCompassHeading === 'number') {
        setHeading(evt.webkitCompassHeading);
      } else if (typeof e.alpha === 'number') {
        // Android: alpha=0 means north on some browsers, on others it's arbitrary.
        // absolute orientation is more reliable when available
        setHeading((360 - e.alpha) % 360);
      }
      // Pitch from beta (front-back tilt): 0 = flat, 90 = upright
      if (typeof e.beta === 'number') {
        setPitch(e.beta);
      }
    }

    async function requestPermission() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const DOE = DeviceOrientationEvent as any;
      if (typeof DOE.requestPermission === 'function') {
        try {
          const perm = await DOE.requestPermission();
          if (perm === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, true);
          } else {
            setOrientationError('Compass permission denied. Enable Motion & Orientation in Settings.');
          }
        } catch {
          setOrientationError('Could not request compass permission.');
        }
      } else {
        // Non-iOS or older browsers — just listen
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    }

    requestPermission();

    return () => {
      active = false;
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  // ── GPS ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) { setGpsError(true); return; }
    const id = navigator.geolocation.watchPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGpsError(true),
      { enableHighAccuracy: true, maximumAge: 3000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ── Fetch orbs ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('orbs')
        .select('*')
        .eq('status', 'pending');
      if (data) setOrbs(data.map(normalizeOrb));
      setLoading(false);
    }
    load();
  }, []);

  // ── Filter orbs within range ──────────────────────────────────────────────
  const nearbyOrbs = userPos
    ? orbs
        .map(o => ({
          ...o,
          distance: haversineMeters(userPos.lat, userPos.lng, o.latitude, o.longitude),
          bearing: bearingDeg(userPos.lat, userPos.lng, o.latitude, o.longitude),
        }))
        .filter(o => o.distance <= MAX_RANGE)
    : [];

  // ── Compute screen position for each orb ──────────────────────────────────
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 390;
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 844;

  const positionedOrbs = heading !== null
    ? nearbyOrbs.map(o => {
        // Horizontal: difference between orb bearing and compass heading
        let deltaH = o.bearing - heading;
        if (deltaH > 180) deltaH -= 360;
        if (deltaH < -180) deltaH += 360;
        const xPct = 0.5 + deltaH / FOV_DEG;
        const x = xPct * screenWidth;

        // Vertical: closer orbs appear at eye level, farther orbs slightly higher
        // Also adjust by device pitch (beta). When phone is at ~70-90° (upright viewing), center is ~80°
        const basePitch = 75; // expected pitch when holding phone in AR mode
        const pitchDelta = pitch - basePitch;
        const distanceFactor = 1 - Math.min(o.distance / MAX_RANGE, 1); // 1=close, 0=far
        const baseY = screenHeight * 0.35 + (1 - distanceFactor) * screenHeight * 0.15;
        const y = baseY - pitchDelta * 3;

        // Scale: closer orbs are larger
        const scale = 0.7 + distanceFactor * 0.6;

        // Visible if within ~FOV
        const visible = xPct > -0.15 && xPct < 1.15;

        return { ...o, x, y, scale, visible };
      })
    : [];

  // ── Tap handler ────────────────────────────────────────────────────────────
  const handleOrbTap = useCallback((id: string) => {
    router.push('/crack/' + id);
  }, [router]);

  // ── Compass display ────────────────────────────────────────────────────────
  const compassLabel = heading !== null
    ? (() => {
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        return dirs[Math.round(heading / 45) % 8];
      })()
    : '--';

  // ── Error / loading states ─────────────────────────────────────────────────
  const hasError = cameraError || gpsError;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: C.bg,
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <style>{AR_CSS}</style>

      {/* ── Camera video feed ──────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1,
        }}
      />

      {/* ── Dark overlay when camera not ready ────────────────────────────── */}
      {!cameraReady && !cameraError && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          background: C.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div style={{
            width: 40,
            height: 40,
            border: `3px solid ${C.primary}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'arSpin 0.8s linear infinite',
          }} />
          <span style={{ color: C.muted, fontSize: 14 }}>Starting camera...</span>
        </div>
      )}

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {hasError && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 100,
          background: C.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          padding: 32,
          textAlign: 'center',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span style={{ color: C.text, fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>
            {cameraError || 'GPS unavailable'}
          </span>
          {gpsError && !cameraError && (
            <span style={{ color: C.muted, fontSize: 13, lineHeight: 1.5 }}>
              Enable Location Services in your device settings, then reload this page.
            </span>
          )}
          {orientationError && (
            <span style={{ color: C.muted, fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>
              {orientationError}
            </span>
          )}
          <button
            onClick={() => router.push('/hunt')}
            style={{
              marginTop: 12,
              padding: '12px 28px',
              borderRadius: 20,
              background: C.primary,
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Back to Map
          </button>
        </div>
      )}

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      {!hasError && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: GLASS_BG,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: `1px solid ${GLASS_BORDER}`,
            animation: 'arFadeIn 0.4s ease-out',
          }}>
            {/* Back arrow */}
            <button
              onClick={() => router.push('/hunt')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span style={{ color: C.text, fontSize: 15, fontWeight: 600 }}>AR Hunt</span>
            </button>

            {/* Compass */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={C.accent} />
              </svg>
              <span style={{ color: C.accent, fontSize: 13, fontWeight: 700, minWidth: 30, textAlign: 'center' }}>
                {heading !== null ? `${Math.round(heading)}°` : '--'}
              </span>
              <span style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>
                {compassLabel}
              </span>
            </div>

            {/* Orb count badge */}
            <div style={{
              padding: '4px 10px',
              borderRadius: 12,
              background: nearbyOrbs.length > 0 ? `${C.accent}22` : 'rgba(255,255,255,0.06)',
              border: `1px solid ${nearbyOrbs.length > 0 ? C.accent + '44' : GLASS_BORDER}`,
            }}>
              <span style={{
                color: nearbyOrbs.length > 0 ? C.accent : C.muted,
                fontSize: 12,
                fontWeight: 700,
              }}>
                {loading ? '...' : nearbyOrbs.length} orbs
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Orb markers ───────────────────────────────────────────────────── */}
      {!hasError && cameraReady && positionedOrbs.filter(o => o.visible).map(orb => {
        const rc = rarityColor(orb.rarity);
        const cc = currencyColor(orb.currency);
        return (
          <button
            key={orb.id}
            onClick={() => handleOrbTap(orb.id)}
            style={{
              position: 'absolute',
              left: orb.x,
              top: orb.y,
              transform: `translate(-50%, -50%) scale(${orb.scale})`,
              zIndex: 30,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              animation: 'arFadeIn 0.3s ease-out',
              // @ts-expect-error CSS custom property for glow animation
              '--glow': rc + '88',
            }}
          >
            {/* Glow circle */}
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: `radial-gradient(circle at 35% 35%, ${rc}dd, ${rc}33)`,
              border: `2px solid ${rc}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'arPulse 2s ease-in-out infinite, arGlow 2s ease-in-out infinite',
              boxShadow: `0 0 16px ${rc}66, 0 0 32px ${rc}22`,
              // @ts-expect-error CSS custom property
              '--glow': rc + '66',
            }}>
              <span style={{
                fontSize: 16,
                fontWeight: 800,
                color: '#fff',
                textShadow: `0 0 8px ${cc}`,
              }}>
                {currencyLetter(orb.currency)}
              </span>
            </div>

            {/* Amount label */}
            <div style={{
              padding: '2px 8px',
              borderRadius: 8,
              background: 'rgba(10,10,15,0.85)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: `1px solid ${GLASS_BORDER}`,
            }}>
              <span style={{ color: cc, fontSize: 11, fontWeight: 700 }}>
                {orb.amount} {orb.currency}
              </span>
            </div>

            {/* Distance badge */}
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: C.muted,
              background: 'rgba(10,10,15,0.7)',
              padding: '1px 6px',
              borderRadius: 6,
            }}>
              {fmtDist(orb.distance)}
            </span>
          </button>
        );
      })}

      {/* ── No orbs message ───────────────────────────────────────────────── */}
      {!hasError && cameraReady && !loading && nearbyOrbs.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 30,
          textAlign: 'center',
          animation: 'arFadeIn 0.5s ease-out',
        }}>
          <div style={{
            padding: '20px 28px',
            borderRadius: 16,
            background: GLASS_BG,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${GLASS_BORDER}`,
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: '0 0 4px 0' }}>
              No orbs nearby
            </p>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
              Explore the map to find orbs!
            </p>
          </div>
        </div>
      )}

      {/* ── Crosshair center indicator ────────────────────────────────────── */}
      {!hasError && cameraReady && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          pointerEvents: 'none',
          opacity: 0.25,
        }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={C.text} strokeWidth="1">
            <line x1="16" y1="4" x2="16" y2="12" />
            <line x1="16" y1="20" x2="16" y2="28" />
            <line x1="4" y1="16" x2="12" y2="16" />
            <line x1="20" y1="16" x2="28" y2="16" />
            <circle cx="16" cy="16" r="2" />
          </svg>
        </div>
      )}

      {/* ── Bottom bar ────────────────────────────────────────────────────── */}
      {!hasError && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px 16px',
            background: GLASS_BG,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: `1px solid ${GLASS_BORDER}`,
            animation: 'arFadeIn 0.4s ease-out 0.1s backwards',
          }}>
            <button
              onClick={() => router.push('/hunt')}
              style={{
                padding: '10px 28px',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.08)',
                border: `1px solid ${GLASS_BORDER}`,
                color: C.text,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              Back to Map
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
