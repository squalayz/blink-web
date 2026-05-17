'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { C, Orb, OrbCurrency, normalizeOrb } from '@/lib/theme';
import OrbDetailSheet from '@/components/OrbDetailSheet';
import AuroraOverlay from '@/components/AuroraOverlay';
import OnboardingWalkthrough from '@/components/OnboardingWalkthrough';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { YourBestiary } from '@/components/YourBestiary';

// Dynamically import the map so Leaflet never runs on the server
const HuntMap = dynamic(() => import('@/components/HuntMap'), { ssr: false });

// ──────────────────────────────────────────────────────────────────────────────
// Types & constants
// ──────────────────────────────────────────────────────────────────────────────

type FilterKey = 'All Creatures' | 'Nearby' | 'Stealth' | 'In Flight';
const FILTERS: FilterKey[] = ['All Creatures', 'Nearby', 'Stealth', 'In Flight'];

const ACCENT = '#00FF88';
const PRIMARY = '#00FF88';
const GOLD = '#88FF00';
const BG = '#0a0a0f';
const TEXT = '#FFFFFF';
const MUTED = '#8a8a99';
const GLASS = 'rgba(255,255,255,0.04)';
const GLASS_BORDER = 'rgba(255,255,255,0.06)';

// ──────────────────────────────────────────────────────────────────────────────
// Haversine distance
// ──────────────────────────────────────────────────────────────────────────────

function haversineMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
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

// ──────────────────────────────────────────────────────────────────────────────
// SVG Icons (inline, no emojis)
// ──────────────────────────────────────────────────────────────────────────────

function LocationIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEXT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEXT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEXT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
      <line x1="12" y1="22" x2="12" y2="15.5" />
      <polyline points="22 8.5 12 15.5 2 8.5" />
    </svg>
  );
}

function NearbyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function DropIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14 0-5.5 3.5-7.5C13 5 15 6.5 16 9c.5 1.38.5 2 0 4a2.5 2.5 0 0 0 2.5 2.5" />
      <path d="M12 22c4 0 7-2.69 7-6 0-2-1-3.5-2.5-5L12 16l-4.5-5C6 13 5 14.5 5 16c0 3.31 3 6 7 6z" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Hunt page CSS keyframes
// ──────────────────────────────────────────────────────────────────────────────

const HUNT_PAGE_CSS = `
@keyframes huntSpinOrb {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes huntFadeIn {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes huntPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
@keyframes gpsGlow {
  0%, 100% { box-shadow: 0 0 6px 2px rgba(239,68,68,0.3); }
  50% { box-shadow: 0 0 18px 6px rgba(239,68,68,0.6); }
}
@keyframes huntOrbSpin {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.1); }
  100% { transform: rotate(360deg) scale(1); }
}
@keyframes emptyStateFadeIn {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
`;

// ──────────────────────────────────────────────────────────────────────────────
// Filter pills
// ──────────────────────────────────────────────────────────────────────────────

interface FilterBarProps {
  selected: FilterKey;
  onChange: (f: FilterKey) => void;
}

function FilterBar({ selected, onChange }: FilterBarProps) {
  const [hoveredFilter, setHoveredFilter] = useState<FilterKey | null>(null);
  const { isDesktop } = useIsDesktop();

  return (
    <div style={{
      position: 'absolute',
      top: 52,
      left: 0,
      right: 0,
      zIndex: 500,
      padding: isDesktop ? '0 24px' : '0 14px',
      paddingRight: isDesktop ? 24 : 100,
      overflowX: 'auto',
      display: 'flex',
      gap: isDesktop ? 10 : 8,
      justifyContent: isDesktop ? 'center' : 'flex-start',
      scrollbarWidth: 'none' as 'none',
      animation: 'huntFadeIn 0.4s ease-out',
    }}>
      {FILTERS.map((f) => {
        const active = f === selected;
        const hovered = isDesktop && hoveredFilter === f && !active;
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            onMouseEnter={() => isDesktop && setHoveredFilter(f)}
            onMouseLeave={() => isDesktop && setHoveredFilter(null)}
            style={{
              flexShrink: 0,
              padding: isDesktop ? '8px 20px' : '7px 16px',
              borderRadius: 20,
              border: `1.5px solid ${active ? ACCENT : hovered ? 'rgba(255,255,255,0.12)' : GLASS_BORDER}`,
              background: active
                ? 'rgba(0,255,136,0.12)'
                : hovered
                  ? 'rgba(10,10,15,0.8)'
                  : 'rgba(10,10,15,0.65)',
              color: active ? ACCENT : hovered ? '#D1D5DB' : MUTED,
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              transition: 'all 0.2s ease',
              letterSpacing: '0.01em',
              lineHeight: '1',
              whiteSpace: 'nowrap',
              filter: hovered ? 'brightness(1.3)' : 'none',
            }}
          >
            {f}
          </button>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Right side action buttons
// ──────────────────────────────────────────────────────────────────────────────

interface SideButtonsProps {
  onRecenter: () => void;
  nearbyCount: number;
  hexGridOn: boolean;
  onToggleHex: () => void;
  gpsActive: boolean;
  activeFilter: FilterKey;
  onSetFilter: (f: FilterKey) => void;
  onARView: () => void;
}

function SideButtons({ onRecenter, nearbyCount, hexGridOn, onToggleHex, gpsActive, activeFilter, onSetFilter, onARView }: SideButtonsProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const { isDesktop } = useIsDesktop();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const btnStyle: React.CSSProperties = {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: 'rgba(10,10,15,0.7)',
    border: `1px solid ${GLASS_BORDER}`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };

  const hoverProps = (id: string) => isDesktop ? {
    onMouseEnter: () => setHoveredBtn(id),
    onMouseLeave: () => setHoveredBtn(null),
  } : {};

  const hoverScale = (id: string): React.CSSProperties => isDesktop && hoveredBtn === id ? {
    transform: 'scale(1.1)',
    borderColor: 'rgba(255,255,255,0.12)',
    boxShadow: `0 0 14px ${PRIMARY}44`,
  } : {};

  const nearbyActive = activeFilter === 'Nearby';

  return (
    <div style={{
      position: 'absolute',
      right: 14,
      top: 110,
      zIndex: 500,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      animation: 'huntFadeIn 0.5s ease-out 0.1s backwards',
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute',
          right: 50,
          top: 0,
          background: 'rgba(10,10,15,0.92)',
          border: `1px solid ${GLASS_BORDER}`,
          borderRadius: 10,
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 600,
          color: TEXT,
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}

      {/* GPS / Recenter */}
      <button
        {...hoverProps('gps')}
        onClick={async () => {
          if (gpsActive) {
            onRecenter();
            return;
          }
          // Always try getCurrentPosition first — it triggers the browser prompt if permission is 'prompt'
          navigator.geolocation.getCurrentPosition(
            () => { onRecenter(); },
            async (err) => {
              if (err.code === 1) {
                // Permission denied — check if it's permanently blocked or just dismissed
                try {
                  const perm = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
                  if (perm?.state === 'denied') {
                    showToast('Location blocked — tap Settings → Safari → Location → Allow');
                  } else {
                    showToast('Tap the location button again to allow access');
                  }
                } catch {
                  showToast('Location denied — enable in Settings → Privacy → Location Services');
                }
              } else if (err.code === 2) {
                showToast('Location unavailable — check GPS is on');
              } else {
                showToast('Location timed out — try again');
              }
            },
            { enableHighAccuracy: true, timeout: 10000 },
          );
        }}
        style={{
          ...btnStyle,
          border: `1px solid ${gpsActive ? ACCENT + '66' : '#ef444466'}`,
          background: gpsActive ? ACCENT + '18' : 'rgba(239,68,68,0.15)',
          animation: gpsActive ? 'none' : 'gpsGlow 2s ease-in-out infinite',
          ...hoverScale('gps'),
        }}
        title={gpsActive ? 'Recenter on my location' : 'GPS off — tap to enable location'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={gpsActive ? ACCENT : '#ef4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" fill={gpsActive ? ACCENT + '60' : '#ef444440'} />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
      </button>

      {/* Camera — AR view */}
      <button
        {...hoverProps('ar')}
        onClick={onARView}
        style={{ ...btnStyle, ...hoverScale('ar') }}
        title="AR View"
      >
        <CameraIcon />
      </button>

      {/* Hex grid toggle — desktop only (niche feature, no thumb-reach use) */}
      {isDesktop && (
        <button
          {...hoverProps('hex')}
          onClick={onToggleHex}
          style={{
            ...btnStyle,
            border: `1px solid ${hexGridOn ? PRIMARY + '66' : GLASS_BORDER}`,
            background: hexGridOn ? PRIMARY + '22' : btnStyle.background,
            ...hoverScale('hex'),
          }}
          title={hexGridOn ? 'Hide hex grid' : 'Show hex grid'}
        >
          <GridIcon />
        </button>
      )}

      {/* Nearby toggle — desktop only; mobile users use the Nearby filter pill in the top bar */}
      {isDesktop && (
        <button
          {...hoverProps('nearby')}
          onClick={() => onSetFilter(nearbyActive ? 'All Creatures' : 'Nearby')}
          style={{
            ...btnStyle,
            flexDirection: 'column',
            gap: 2,
            border: `1px solid ${nearbyActive ? ACCENT + '66' : GLASS_BORDER}`,
            background: nearbyActive ? ACCENT + '18' : btnStyle.background,
            ...hoverScale('nearby'),
          }}
          title={nearbyActive ? 'Show all creatures' : 'Show nearby only'}
        >
          <NearbyIcon />
          <span style={{ fontSize: 10, fontWeight: 700, color: nearbyActive ? ACCENT : MUTED, lineHeight: 1 }}>
            {nearbyCount}
          </span>
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Loading state
// ──────────────────────────────────────────────────────────────────────────────

function LoadingOverlay() {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 900,
      background: BG,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
    }}>
      {/* Spinning orb */}
      <div style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${PRIMARY}cc, ${PRIMARY}44)`,
        border: `2px solid ${PRIMARY}`,
        boxShadow: `0 0 32px ${PRIMARY}66, 0 0 64px ${PRIMARY}22`,
        animation: 'huntOrbSpin 2s ease-in-out infinite',
      }} />
      {/* Text */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{
          fontSize: 15,
          fontWeight: 600,
          color: TEXT,
          animation: 'huntPulse 1.8s ease-in-out infinite',
        }}>
          Getting your location...
        </span>
        <span style={{ fontSize: 12, color: MUTED }}>
          Scanning for nearby creatures
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Streak fire pill
// ──────────────────────────────────────────────────────────────────────────────

function StreakPill({ streak }: { streak: number }) {
  if (streak < 2) return null;
  return (
    <div style={{
      position: 'absolute',
      top: 90,
      left: 14,
      zIndex: 500,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 12px',
      borderRadius: 20,
      background: 'rgba(10,10,15,0.7)',
      border: `1px solid ${GOLD}44`,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      animation: 'huntFadeIn 0.4s ease-out 0.2s backwards',
    }}>
      <FireIcon />
      <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>
        {streak}
      </span>
      <span style={{ fontSize: 11, color: MUTED }}>streak</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Bottom overlay: Drop button + Nearby pill
// ──────────────────────────────────────────────────────────────────────────────

function BottomOverlay({ nearbyCount }: { nearbyCount: number }) {
  const [hoveredNearby, setHoveredNearby] = useState(false);
  const [hoveredLaunch, setHoveredLaunch] = useState(false);
  const { isDesktop } = useIsDesktop();

  return (
    <div style={{
      position: 'absolute',
      bottom: isDesktop ? 24 : 0,
      left: isDesktop ? 80 : 0,
      right: 0,
      zIndex: 500,
      paddingBottom: isDesktop ? 0 : 'calc(env(safe-area-inset-bottom, 16px) + 100px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: isDesktop ? 'flex-start' : 'center',
      paddingLeft: isDesktop ? 24 : 0,
      gap: 10,
      pointerEvents: 'none',
      animation: 'huntFadeIn 0.5s ease-out 0.15s backwards',
    }}>
      {/* Nearby pill */}
      <div
        onMouseEnter={() => isDesktop && setHoveredNearby(true)}
        onMouseLeave={() => isDesktop && setHoveredNearby(false)}
        style={{
          padding: '6px 14px',
          borderRadius: 20,
          background: 'rgba(10,10,15,0.65)',
          border: `1px solid ${GLASS_BORDER}`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          pointerEvents: 'auto',
          transition: 'filter 0.2s ease',
          filter: isDesktop && hoveredNearby ? 'brightness(1.3)' : 'none',
        }}
      >
        <span style={{ fontSize: 13, color: MUTED }}>
          <span style={{ color: ACCENT, fontWeight: 700 }}>{nearbyCount}</span>
          {' '}Nearby
        </span>
      </div>

      {/* Drop button */}
      <a
        href="/spawn?mode=launch"
        onMouseEnter={() => isDesktop && setHoveredLaunch(true)}
        onMouseLeave={() => isDesktop && setHoveredLaunch(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '12px 32px',
          borderRadius: 24,
          background: `linear-gradient(135deg, #00FF88, #88FF00)`,
          color: '#000',
          fontSize: 15,
          fontWeight: 700,
          textDecoration: 'none',
          cursor: 'pointer',
          boxShadow: isDesktop && hoveredLaunch
            ? `0 4px 32px ${PRIMARY}99, 0 0 60px ${PRIMARY}44`
            : `0 4px 24px ${PRIMARY}66, 0 0 40px ${PRIMARY}22`,
          pointerEvents: 'auto',
          transition: 'all 0.15s ease',
          letterSpacing: '0.02em',
          transform: isDesktop && hoveredLaunch ? 'scale(1.05)' : 'none',
        }}
      >
        <DropIcon />
        Launch BLINK
      </a>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Empty state overlay when no orbs match filter
// ──────────────────────────────────────────────────────────────────────────────

// Tight labels — keep each under ~26 chars so the pill stays single-line.
const EMPTY_SUBTITLES: Record<FilterKey, string> = {
  'All Creatures': 'No creatures here yet',
  'Nearby': 'None within 500m',
  'Stealth': 'No stealth nearby',
  'In Flight': 'Nothing in flight',
};

function EmptyStateOverlay({ activeFilter }: { activeFilter: FilterKey }) {
  const { isDesktop } = useIsDesktop();
  return (
    <a
      href="/spawn?mode=launch"
      style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        // Sit just above the BottomOverlay stack (Launch BLINK + Nearby pill).
        bottom: isDesktop
          ? 130
          : 'calc(env(safe-area-inset-bottom, 16px) + 210px)',
        zIndex: 600,
        animation: 'emptyStateFadeIn 0.4s ease-out forwards',
        pointerEvents: 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 36,
        padding: '0 14px',
        maxWidth: 200,
        borderRadius: 18,
        background: 'rgba(13,13,20,0.78)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${PRIMARY}33`,
        boxShadow: `0 4px 18px rgba(0,0,0,0.35)`,
        textDecoration: 'none',
        color: TEXT,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={PRIMARY}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span
        style={{
          fontSize: 12,
          color: MUTED,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {EMPTY_SUBTITLES[activeFilter]}
      </span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: PRIMARY,
          letterSpacing: '0.02em',
          flexShrink: 0,
        }}
      >
        Spawn
      </span>
    </a>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main HuntPage
// ──────────────────────────────────────────────────────────────────────────────

export default function HuntPage() {
  const router = useRouter();
  const [allOrbs, setAllOrbs] = useState<Orb[]>([]);
  const [filteredOrbs, setFilteredOrbs] = useState<Orb[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('All Creatures');
  const [selectedOrb, setSelectedOrb] = useState<Orb | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsActive, setGpsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [geoReady, setGeoReady] = useState(true);
  const [hexGridOn, setHexGridOn] = useState(false);
  const [streak] = useState(0); // TODO: fetch from Supabase
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null);

  // ── Onboarding walkthrough for new users ─────────────────────────────────
  useEffect(() => {
    if (localStorage.getItem('onboarding_complete') !== 'true') {
      setShowWalkthrough(true);
    }
  }, []);

  // ── GPS helpers ──────────────────────────────────────────────────────────
  const startGpsWatch = useCallback(() => {
    if (!navigator.geolocation) return;
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsActive(true);
        setGeoReady(true);
      },
      () => {
        setGpsActive(false);
        setGeoReady(true);
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  }, []);

  // ── GPS ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoReady(true);
      return;
    }

    // Timeout: if no GPS in 6s, proceed anyway
    const timeout = setTimeout(() => setGeoReady(true), 6000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsActive(true);
        setGeoReady(true);
        clearTimeout(timeout);
      },
      () => {
        setGpsActive(false);
        setGeoReady(true);
        clearTimeout(timeout);
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );

    return () => {
      clearTimeout(timeout);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // ── Permission change listener ───────────────────────────────────────────
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    navigator.permissions?.query({ name: 'geolocation' as PermissionName }).then((perm) => {
      const onChange = () => {
        if (perm.state === 'granted') {
          startGpsWatch();
        } else {
          setGpsActive(false);
        }
      };
      perm.addEventListener('change', onChange);
      cleanup = () => perm.removeEventListener('change', onChange);
    }).catch(() => {});
    return () => cleanup?.();
  }, [startGpsWatch]);

  // ── Fetch orbs from Supabase ──────────────────────────────────────────────
  useEffect(() => {
    async function fetchOrbs() {
      setLoading(true);
      const { data, error } = await supabase
        .from('orbs')
        .select('*')
        .in('status', ['pending', 'active', 'claimed']);

      if (!error && data) {
        setAllOrbs(data.map(normalizeOrb));
      }
      setLoading(false);
    }

    fetchOrbs();

    // Realtime subscription
    const channel = supabase
      .channel('orbs-hunt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orbs' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const o = normalizeOrb(payload.new);
            if (o.status === 'pending' || o.status === 'active' || o.status === 'claimed') {
              setAllOrbs((prev) => [...prev, o]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const o = normalizeOrb(payload.new);
            setAllOrbs((prev) =>
              prev.map((existing) => (existing.id === o.id ? o : existing)),
            );
          } else if (payload.eventType === 'DELETE') {
            const o = payload.old as Orb;
            setAllOrbs((prev) => prev.filter((existing) => existing.id !== o.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Apply filter ─────────────────────────────────────────────────────────
  useEffect(() => {
    let result = allOrbs;

    if (activeFilter === 'Nearby') {
      if (userPosition) {
        result = allOrbs.filter((o) => {
          const d = haversineMeters(userPosition.lat, userPosition.lng, o.latitude, o.longitude);
          return d <= 500;
        });
      }
    } else if (activeFilter === 'Stealth') {
      // Stealth = orbs with no message (hidden/mystery)
      result = allOrbs.filter((o) => !o.message || o.message.trim() === '');
    } else if (activeFilter === 'In Flight') {
      // In Flight = recently dropped (within last hour)
      const oneHourAgo = Date.now() - 3600000;
      result = allOrbs.filter((o) => new Date(o.dropped_at).getTime() > oneHourAgo);
    }

    setFilteredOrbs(result);
  }, [allOrbs, activeFilter, userPosition]);

  // ── Nearby count (within 500m) ────────────────────────────────────────────
  const nearbyCount = userPosition
    ? allOrbs.filter((o) => {
        const d = haversineMeters(userPosition.lat, userPosition.lng, o.latitude, o.longitude);
        return d <= 500;
      }).length
    : allOrbs.length;

  // ── Callbacks ────────────────────────────────────────────────────────────
  const handleSelectOrb = useCallback((orb: Orb) => {
    setSelectedOrb(orb);
  }, []);

  const handleRecenter = useCallback(() => {
    if (!gpsActive) {
      (async () => {
        try {
          const perm = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
          if (perm?.state === 'denied') {
            return;
          }
        } catch {}
        navigator.geolocation.getCurrentPosition(
          () => startGpsWatch(),
          () => {},
          { enableHighAccuracy: true, timeout: 10000 },
        );
      })();
      return;
    }
    // Fly map to user position
    if (leafletMapRef.current) {
      const map = leafletMapRef.current as unknown as Record<string, unknown>;
      if (typeof map._mmRecenter === 'function') {
        (map._mmRecenter as () => void)();
      }
    }
    // Also trigger via Mapbox ref directly
    if (userPosition) {
      const mapboxRef = leafletMapRef.current as unknown as { flyTo?: (opts: object) => void };
      if (mapboxRef?.flyTo) {
        mapboxRef.flyTo({ center: [userPosition.lng, userPosition.lat], zoom: 16, duration: 800 });
      }
    }
  }, [gpsActive, startGpsWatch, userPosition]);

  // ── Distance to selected orb ──────────────────────────────────────────────
  const distanceToSelected =
    selectedOrb && userPosition
      ? haversineMeters(
          userPosition.lat,
          userPosition.lng,
          selectedOrb.latitude,
          selectedOrb.longitude,
        )
      : null;

  // Show loading screen until geo is ready AND orbs are loaded
  const showLoading = !geoReady && loading;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: BG,
      overflow: 'hidden',
      overscrollBehavior: 'none',
    }}>
      {/* Inject keyframes */}
      <style>{HUNT_PAGE_CSS}</style>

      {/* Loading overlay */}
      {showLoading && <LoadingOverlay />}

      {/* Full-screen satellite map */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <HuntMap
          orbs={filteredOrbs}
          userPosition={userPosition}
          onSelectOrb={handleSelectOrb}
          mapRef={leafletMapRef}
        />
      </div>

      {/* Aurora overlay on top of map */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        <AuroraOverlay />
      </div>

      {/* Top gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '30%',
        zIndex: 3,
        background: 'linear-gradient(to bottom, rgba(10,10,15,0.3) 0%, transparent 40%)',
        pointerEvents: 'none',
      }} />

      {/* Bottom gradient overlay */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '35%',
        zIndex: 3,
        background: 'linear-gradient(to top, rgba(10,10,15,0.45) 0%, transparent 40%)',
        pointerEvents: 'none',
      }} />

      {/* Your Bestiary compact chip (Phase 3) — only renders if holder */}
      {!showLoading && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: 14,
          zIndex: 510,
          animation: 'huntFadeIn 0.4s ease-out',
        }}>
          <YourBestiary variant="compact" />
        </div>
      )}

      {/* Trails glowing button */}
      {!showLoading && (
        <div style={{
          position: 'absolute',
          top: 12,
          right: 14,
          zIndex: 510,
          animation: 'huntFadeIn 0.4s ease-out',
        }}>
          <button
            onClick={() => router.push('/trails')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 20,
              border: '1.5px solid rgba(245,158,11,0.5)',
              background: 'rgba(245,158,11,0.10)',
              color: GOLD,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 0 12px rgba(245,158,11,0.25), inset 0 0 8px rgba(245,158,11,0.05)',
              letterSpacing: '0.01em',
              lineHeight: '1',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            Trails
          </button>
        </div>
      )}

      {/* Filter pills (below portfolio bar area) */}
      {!showLoading && (
        <div style={{ position: 'relative', zIndex: 10 }}>
          <FilterBar selected={activeFilter} onChange={setActiveFilter} />
        </div>
      )}

      {/* Streak fire pill */}
      {!showLoading && <StreakPill streak={streak} />}

      {/* Right side action buttons */}
      {!showLoading && (
        <SideButtons
          onRecenter={handleRecenter}
          nearbyCount={nearbyCount}
          hexGridOn={hexGridOn}
          onToggleHex={() => setHexGridOn(!hexGridOn)}
          gpsActive={gpsActive}
          activeFilter={activeFilter}
          onSetFilter={setActiveFilter}
          onARView={() => router.push('/ar')}
        />
      )}

      {/* Bottom overlay: Drop + Nearby */}
      {!showLoading && <BottomOverlay nearbyCount={nearbyCount} />}

      {/* Empty state when no orbs match */}
      {!showLoading && !loading && filteredOrbs.length === 0 && (
        <EmptyStateOverlay activeFilter={activeFilter} />
      )}

      {/* Orb loading indicator (after initial load, when fetching) */}
      {!showLoading && loading && (
        <div style={{
          position: 'absolute',
          top: 90,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 600,
          background: 'rgba(10,10,15,0.8)',
          border: `1px solid ${GLASS_BORDER}`,
          borderRadius: 20,
          padding: '7px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: ACCENT,
            animation: 'huntPulse 1s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 12, color: MUTED }}>Scanning...</span>
        </div>
      )}

      {/* OrbDetailSheet modal */}
      {selectedOrb && (
        <OrbDetailSheet
          orb={selectedOrb}
          distance={distanceToSelected}
          onClose={() => setSelectedOrb(null)}
        />
      )}

      {/* Onboarding walkthrough for new users */}
      {showWalkthrough && (
        <OnboardingWalkthrough onComplete={() => setShowWalkthrough(false)} />
      )}
    </div>
  );
}
