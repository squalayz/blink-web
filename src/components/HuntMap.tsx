'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Orb, rarityColor } from '@/lib/theme';
import { sounds } from '@/lib/sounds';
import { applyBlinkMapStyle } from '@/lib/blink-map-style';
import { resolveCreatureArt, resolveByCreatureId } from '@/lib/bestiary-art';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export type HuntTier = 'far' | 'medium' | 'close' | 'catchable';

export type HuntOrb = Orb & {
  tier?: HuntTier;
  distanceM?: number;
  bearingDeg?: number;
  creatureImage?: string | null;
};

export type NearbyPlayer = {
  user_id: string;
  handle: string | null;
  avatar_url: string | null;
  fuzzy_lat: number;
  fuzzy_lng: number;
  fuzzy_radius_m: number;
  is_friend?: boolean;
  last_seen?: string;
};

export type WildSpawn = {
  id: string;
  species: string;
  rarity: "common" | "uncommon" | "rare" | "legendary" | "mythic" | string;
  fuzzy_lat: number;
  fuzzy_lng: number;
  fuzzy_radius_m: number;
  expires_at?: string;
  image_url?: string;
};

export type CatchableSpawn = {
  id: string;
  lat: number;
  lng: number;
  tier: "common" | "uncommon" | "rare" | "legendary" | "mythic" | string;
  tier_color: string;
  name: string;
  image_url: string;
  /**
   * Stable creature identity stamped at spawn-time. The AR overlay and the
   * NFT mint route both resolve through CREATURE_REGISTRY[creature_id] so
   * the visual the user catches matches the NFT that gets minted. May be
   * null only for legacy rows predating the registry; resolveSpawnIdentity()
   * falls back to a name lookup in that case.
   */
  creature_id?: number | null;
  expires_at: string;
  is_genesis?: boolean;
  distanceM?: number;
};

export type NearbyWatcher = {
  user_id: string;
  handle: string | null;
  lat: number;
  lng: number;
  lastSeenAt: string;
};

export type NearbyRecentCatch = {
  id: string;
  lat: number;
  lng: number;
  tier: string;
  name: string;
  caughtAt: string;
  catcherHandle: string;
};

interface HuntMapProps {
  orbs: HuntOrb[];
  userPosition: { lat: number; lng: number } | null;
  onSelectOrb: (orb: HuntOrb) => void;
  mapRef?: React.MutableRefObject<mapboxgl.Map | null>;
  players?: NearbyPlayer[];
  wildSpawns?: WildSpawn[];
  catchableSpawns?: CatchableSpawn[];
  watchers?: NearbyWatcher[];
  recentCatches?: NearbyRecentCatch[];
  onSelectPlayer?: (player: NearbyPlayer) => void;
  onSelectWildSpawn?: (spawn: WildSpawn) => void;
  onSelectCatchable?: (spawn: CatchableSpawn) => void;
  /**
   * Living-approach vignette intensity in [0,1]. Drives the green edge-glow
   * opacity (0 → 0.6) shown when a catchable spawn enters approach range.
   * GPU-accelerated (opacity-only). Skipped under prefers-reduced-motion.
   */
  approachIntensity?: number;
}

const RARITY_TONE: Record<string, string> = {
  Common: '#9aa3b2',
  Uncommon: '#00FF88',
  Rare: '#88FF00',
  Legendary: '#ffd166',
  Mythic: '#ff8ae0',
  common: '#9aa3b2',
  uncommon: '#00FF88',
  rare: '#88FF00',
  legendary: '#ffd166',
  mythic: '#ff8ae0',
};

function normalRarity(r: string): string {
  return (r || '').toLowerCase();
}

function tierGlowProfile(rarity: string): {
  bob: boolean;
  particles: number;
  haloRotate: boolean;
  scaleBreath: boolean;
  sonarRings: number;
  shadowPx: number;
} {
  const r = normalRarity(rarity);
  if (r === 'mythic') return { bob: true, particles: 8, haloRotate: true, scaleBreath: true, sonarRings: 2, shadowPx: 36 };
  if (r === 'legendary') return { bob: true, particles: 5, haloRotate: false, scaleBreath: true, sonarRings: 2, shadowPx: 28 };
  if (r === 'rare') return { bob: true, particles: 0, haloRotate: false, scaleBreath: false, sonarRings: 2, shadowPx: 22 };
  if (r === 'uncommon') return { bob: true, particles: 0, haloRotate: false, scaleBreath: false, sonarRings: 1, shadowPx: 16 };
  return { bob: false, particles: 0, haloRotate: false, scaleBreath: false, sonarRings: 1, shadowPx: 10 };
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function particleHTML(count: number, color: string, idSeed: string): string {
  if (count <= 0) return '';
  let html = '';
  for (let i = 0; i < count; i++) {
    const left = 15 + Math.floor((i * 73 + idSeed.charCodeAt(i % idSeed.length)) % 70);
    const delay = ((i * 0.27) % 2.6).toFixed(2);
    const dur = (2.2 + ((i * 0.41) % 2.0)).toFixed(2);
    const size = 2 + (i % 3);
    html += `<span class="mm-particle" style="left:${left}%;width:${size}px;height:${size}px;background:${color};animation-delay:${delay}s;animation-duration:${dur}s;"></span>`;
  }
  return `<div class="mm-particle-aura">${html}</div>`;
}

function orbMarkerConfig(rarity: string) {
  if (rarity === 'Legendary') return { size: 32, ring: 56, sonarDelay: '0s' };
  if (rarity === 'Rare') return { size: 26, ring: 46, sonarDelay: '0.3s' };
  return { size: 20, ring: 36, sonarDelay: '0.6s' };
}

const HUNT_CSS = `
@keyframes mmOrbPulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.18); opacity: 0.88; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes mmSonarRing {
  0% { transform: translate(-50%,-50%) scale(0.5); opacity: 0.75; }
  100% { transform: translate(-50%,-50%) scale(2.8); opacity: 0; }
}
@keyframes mmIrisBlink {
  0%, 92%, 100% { transform: scaleY(1); opacity: 1; }
  96% { transform: scaleY(0.05); opacity: 0.5; }
}
@keyframes mmUserBoltPulse {
  0%, 100% { filter: drop-shadow(0 0 6px rgba(0,255,136,0.85)) drop-shadow(0 0 18px rgba(0,255,136,0.45)); transform: scale(1); }
  50% { filter: drop-shadow(0 0 10px rgba(0,255,136,1)) drop-shadow(0 0 32px rgba(0,255,136,0.65)); transform: scale(1.05); }
}
@keyframes mmUserSonar {
  0% { transform: translate(-50%,-50%) scale(0.5); opacity: 0.55; }
  100% { transform: translate(-50%,-50%) scale(3.2); opacity: 0; }
}
@keyframes mmCatchablePulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(0,255,136,0)); }
  50% { transform: scale(1.06); filter: drop-shadow(0 0 22px rgba(0,255,136,0.5)); }
}
@keyframes mmMediumDrift {
  0%, 100% { opacity: 0.32; }
  50% { opacity: 0.55; }
}
@keyframes mmEdgePulse {
  0%, 100% { opacity: 0.35; transform: translate(0,0) scale(1); }
  50% { opacity: 0.85; transform: translate(0,0) scale(1.08); }
}
@keyframes mmPlayerPulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(0,255,136,0.6)); }
  50% { transform: scale(1.12); filter: drop-shadow(0 0 18px rgba(0,255,136,0.35)); }
}
@keyframes mmFuzzyBreath {
  0%, 100% { opacity: 0.22; transform: scale(1); }
  50% { opacity: 0.36; transform: scale(1.04); }
}
@keyframes mmWildPulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px var(--wild-color)); }
  50% { transform: scale(1.06); filter: drop-shadow(0 0 22px var(--wild-color)); }
}
.mm-orb-marker {
  border-radius: 50%;
  animation: mmOrbPulse 2.4s ease-in-out infinite;
  cursor: pointer;
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mm-orb-marker:hover {
  transform: scale(1.2);
  animation-play-state: paused;
}
.mm-orb-iris {
  width: 38%;
  height: 38%;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #FFFFFF 0%, #0a0a0f 70%);
  animation: mmIrisBlink 4.6s ease-in-out infinite;
}
.mm-orb-sonar {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  border: 1.5px solid var(--orb-color);
  opacity: 0;
  animation: mmSonarRing 3s ease-out infinite;
  pointer-events: none;
}
.mm-user-bolt {
  position: relative;
  z-index: 20;
  width: 22px;
  height: 28px;
  animation: mmUserBoltPulse 1.8s ease-in-out infinite;
}
.mm-user-sonar {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1.5px solid rgba(0,255,136,0.55);
  animation: mmUserSonar 2.4s ease-out infinite;
  pointer-events: none;
}
.mm-orb-claimed {
  opacity: 0.35 !important;
  animation: none !important;
  filter: grayscale(0.8);
}
.mm-medium {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1.5px dashed rgba(0,255,136,0.5);
  background: radial-gradient(circle at 50% 50%, rgba(0,255,136,0.18), rgba(0,0,0,0));
  animation: mmMediumDrift 2.6s ease-in-out infinite;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mm-medium-iris {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.85);
}
.mm-catchable-ring {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 2px solid rgba(0,255,136,0.85);
  animation: mmCatchablePulse 1.4s ease-in-out infinite;
  pointer-events: none;
}
.mm-genesis-ring {
  position: absolute;
  inset: -18px;
  border-radius: 50%;
  border: 3px solid var(--genesis-color, #ffd166);
  box-shadow: 0 0 28px var(--genesis-color, #ffd166), inset 0 0 14px var(--genesis-color, #ffd166);
  animation: mmGenesisPulse 1.8s ease-in-out infinite;
  pointer-events: none;
  z-index: 9;
}
@keyframes mmGenesisPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.85;
    filter: drop-shadow(0 0 18px var(--genesis-color, #ffd166));
  }
  50% {
    transform: scale(1.12);
    opacity: 1;
    filter: drop-shadow(0 0 42px var(--genesis-color, #ffd166));
  }
}
.mm-genesis-label {
  position: absolute;
  left: 50%;
  top: -38px;
  transform: translateX(-50%);
  padding: 3px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffd166, #ff8ae0);
  color: #0a0a0f;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  white-space: nowrap;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  box-shadow: 0 0 14px rgba(255,209,102,0.65);
  pointer-events: none;
  z-index: 13;
}
@keyframes mmOrbBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
@keyframes mmScaleBreath {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
@keyframes mmHaloSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes mmParticleFloat {
  0% { transform: translateY(0) scale(0.6); opacity: 0; }
  20% { opacity: 0.9; }
  100% { transform: translateY(-32px) scale(1.1); opacity: 0; }
}
@keyframes mmGhostBob {
  0%, 100% { transform: translateY(0); opacity: 0.55; }
  50% { transform: translateY(-3px); opacity: 0.85; }
}
@keyframes mmGhostFadeIn {
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes mmWatcherPulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 6px rgba(0,255,136,0.6)); }
  50% { transform: scale(1.25); filter: drop-shadow(0 0 12px rgba(0,255,136,0.9)); }
}
@keyframes mmCatchPill {
  0%, 100% { transform: translate(-50%,-2px); }
  50% { transform: translate(-50%,-7px); }
}
@keyframes mmCatchWindup {
  0% { transform: scale(1); filter: brightness(1) drop-shadow(0 0 0 transparent); }
  60% { transform: scale(1.35); filter: brightness(1.6) drop-shadow(0 0 28px rgba(0,255,136,0.95)); }
  100% { transform: scale(1.15); filter: brightness(1.2) drop-shadow(0 0 12px rgba(0,255,136,0.6)); }
}
.mm-orb-bob { animation: mmOrbBob 2s ease-in-out infinite; will-change: transform; }
.mm-orb-breath { animation: mmScaleBreath 3s ease-in-out infinite; }
.mm-orb-halo {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, rgba(0,255,136,0.9), rgba(136,255,0,0.5), rgba(255,138,224,0.7), rgba(0,255,136,0.9));
  filter: blur(4px);
  opacity: 0.55;
  animation: mmHaloSpin 6s linear infinite;
  pointer-events: none;
  z-index: -1;
}
.mm-particle-aura {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
  z-index: 8;
}
.mm-particle {
  position: absolute;
  bottom: 50%;
  border-radius: 50%;
  opacity: 0;
  animation: mmParticleFloat 2.8s ease-in-out infinite;
  filter: drop-shadow(0 0 4px currentColor);
  pointer-events: none;
}
.mm-catch-pill {
  position: absolute;
  left: 50%;
  bottom: 110%;
  transform: translate(-50%, 0);
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(10,10,15,0.85);
  border: 1px solid rgba(0,255,136,0.6);
  color: #00FF88;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  animation: mmCatchPill 1.4s ease-in-out infinite;
  pointer-events: none;
  z-index: 12;
  box-shadow: 0 0 10px rgba(0,255,136,0.45);
}
.mm-windup { animation: mmCatchWindup 200ms ease-out forwards !important; }
.mm-watcher-dot {
  position: relative;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #ccffe6, #00FF88 70%);
  box-shadow: 0 0 8px rgba(0,255,136,0.75);
  animation: mmWatcherPulse 1.2s ease-in-out infinite;
  cursor: pointer;
}
.mm-watcher-dot::after {
  content: attr(data-handle);
  position: absolute;
  left: 50%;
  bottom: 130%;
  transform: translateX(-50%);
  padding: 3px 7px;
  border-radius: 6px;
  background: rgba(10,10,15,0.9);
  border: 1px solid rgba(0,255,136,0.4);
  color: #00FF88;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 120ms ease;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
.mm-watcher-dot:hover::after { opacity: 1; }
.mm-ghost-catch {
  position: relative;
  width: 28px;
  height: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: mmGhostFadeIn 320ms ease-out, mmGhostBob 3s ease-in-out 320ms infinite;
}
.mm-ghost-catch svg { filter: drop-shadow(0 0 6px rgba(0,255,136,0.85)); }
.mm-ghost-catch::after {
  content: attr(data-label);
  position: absolute;
  left: 50%;
  bottom: 110%;
  transform: translateX(-50%);
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(10,10,15,0.92);
  border: 1px solid rgba(0,255,136,0.4);
  color: #00FF88;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 140ms ease;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
.mm-ghost-catch:hover::after { opacity: 1; }
.mm-approach-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 6;
  /* Inset green glow on the screen edges. Driven by --approach-intensity.
   * Pure opacity + box-shadow → GPU compositor friendly. */
  box-shadow: inset 0 0 120px 30px rgba(0, 255, 136, 0.85);
  opacity: calc(var(--approach-intensity, 0) * 0.6);
  transition: opacity 280ms ease;
  will-change: opacity;
  mix-blend-mode: screen;
}
.mm-approach-vignette::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0, 255, 136, 0.45) 100%);
  opacity: 1;
  animation: mmVignetteBreath 1.8s ease-in-out infinite;
  will-change: opacity;
}
@keyframes mmVignetteBreath {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .mm-approach-vignette::after { animation: none !important; }
  .mm-orb-bob,
  .mm-orb-breath,
  .mm-orb-halo,
  .mm-particle,
  .mm-orb-sonar,
  .mm-watcher-dot,
  .mm-ghost-catch,
  .mm-orb-marker,
  .mm-catchable-ring,
  .mm-genesis-ring,
  .mm-user-bolt,
  .mm-user-sonar,
  .mm-medium,
  .mm-orb-iris,
  .mm-catch-pill { animation: none !important; }
  .mm-particle-aura { display: none !important; }
  .mm-orb-halo { display: none !important; }
}
.mapboxgl-ctrl-logo { display: none !important; }
.mapboxgl-ctrl-attrib { display: none !important; }
.mapboxgl-ctrl-group { display: none !important; }
.mapboxgl-ctrl-top-left { display: none !important; }
.mapboxgl-ctrl-top-right { display: none !important; }
.mapboxgl-ctrl-bottom-left { display: none !important; }
.mapboxgl-ctrl-bottom-right { display: none !important; }
.mapboxgl-ctrl-top-left { display: none !important; }
.mapboxgl-ctrl-top-right { display: none !important; }
.mapboxgl-ctrl-bottom-left { display: none !important; }
.mapboxgl-ctrl-bottom-right { display: none !important; }
`;

function wildRarityColor(rarity: string): string {
  const r = rarity.toLowerCase();
  if (r === "mythic") return "#ff8ae0";
  if (r === "legendary") return "#ffd166";
  if (r === "rare") return "#88FF00";
  if (r === "uncommon") return "#00FF88";
  return "#ffffff";
}

// Approximate meters → on-screen pixels at the current zoom level + latitude
// (Web Mercator). Used to size privacy circles so they shrink/grow with zoom.
function metersToPxAtZoom(meters: number, lat: number, zoom: number): number {
  const metersPerPx = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  if (!isFinite(metersPerPx) || metersPerPx <= 0) return 80;
  const px = meters / metersPerPx;
  return Math.min(280, Math.max(36, Math.round(px * 2))); // diameter
}

function silhouetteSvg(rColor: string): string {
  return `
    <svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <ellipse cx="14" cy="14" rx="11" ry="7" fill="${rColor}" opacity="0.55"/>
      <circle cx="14" cy="14" r="3" fill="#0a0a0f"/>
      <circle cx="14" cy="14" r="1.3" fill="#FFFFFF"/>
    </svg>
  `;
}

function HuntMap({
  orbs,
  userPosition,
  onSelectOrb,
  mapRef: externalMapRef,
  players,
  wildSpawns,
  catchableSpawns,
  watchers,
  recentCatches,
  onSelectPlayer,
  onSelectWildSpawn,
  onSelectCatchable,
  approachIntensity = 0,
}: HuntMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const playerMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const wildMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const catchableMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const watcherMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const ghostMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hasInitialView = useRef(false);
  const spottedIdsRef = useRef<Set<string>>(new Set());
  const lastSpottedAtRef = useRef<number>(0);
  const nearbyIdsRef = useRef<Set<string>>(new Set());
  const lastNearbyAtRef = useRef<number>(0);
  const reducedMotionRef = useRef<boolean>(false);

  // Cache reduced-motion preference on first render.
  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion();
  }, []);

  /* ── Inject CSS ── */
  useEffect(() => {
    if (!document.getElementById('mm-hunt-styles')) {
      const style = document.createElement('style');
      style.id = 'mm-hunt-styles';
      style.textContent = HUNT_CSS;
      document.head.appendChild(style);
    }
  }, []);

  /* ── Init map ── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    // Wait for a real position — fall back to NYC if location not enabled
    const center: [number, number] = userPosition
      ? [userPosition.lng, userPosition.lat]
      : [-74.006, 40.7128];

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      pitch: 0,
      bearing: 0,
      center,
      zoom: 15,
      attributionControl: false,
      logoPosition: 'bottom-left',
      renderWorldCopies: false,
      antialias: false,
    });

    const applyStyleNow = () => applyBlinkMapStyle(map, { hour: new Date().getHours() });
    map.on('style.load', applyStyleNow);

    // Re-apply each hour so the time-of-day shading stays correct.
    const hourInterval = setInterval(() => {
      if (map.isStyleLoaded()) applyBlinkMapStyle(map, { hour: new Date().getHours() });
    }, 60 * 60 * 1000);
    (map as unknown as { _mmHourTimer?: ReturnType<typeof setInterval> })._mmHourTimer = hourInterval;

    mapRef.current = map;
    if (externalMapRef) externalMapRef.current = map;
  }, [userPosition?.lat, userPosition?.lng]); // re-init if position arrives before map exists

  /* ── User marker ── */
  useEffect(() => {
    if (!mapRef.current || !userPosition) return;

    const el = document.createElement('div');
    el.style.cssText = 'position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;';
    el.style.willChange = 'transform';
    el.style.transform = 'translateZ(0)';
    el.innerHTML = `
      <svg class="mm-user-bolt" viewBox="0 0 24 30" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="mm-bolt-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#88FF00" />
            <stop offset="100%" stop-color="#00FF88" />
          </linearGradient>
        </defs>
        <path d="M13 1 L1 17 H10 L7 29 L23 11 H14 L17 1 Z" fill="url(#mm-bolt-grad)" stroke="#0a0a0f" stroke-width="1.4" stroke-linejoin="round" />
        <circle cx="12" cy="15" r="2.6" fill="#0a0a0f" />
        <circle cx="12" cy="15" r="1.2" fill="#FFFFFF" />
      </svg>
      <div class="mm-user-sonar"></div>
    `;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([userPosition.lng, userPosition.lat]);
    } else {
      userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([userPosition.lng, userPosition.lat])
        .addTo(mapRef.current);
    }

    if (!hasInitialView.current) {
      mapRef.current.easeTo({ center: [userPosition.lng, userPosition.lat], zoom: 15, duration: 600 });
      hasInitialView.current = true;
    }
  }, [userPosition]);

  /* ── Recenter ── */
  const recenter = useCallback(() => {
    if (mapRef.current && userPosition) {
      mapRef.current.flyTo({ center: [userPosition.lng, userPosition.lat], zoom: 16, duration: 800 });
    }
  }, [userPosition]);

  useEffect(() => {
    if (mapRef.current) {
      (mapRef.current as unknown as Record<string, unknown>)._mmRecenter = recenter;
    }
  }, [recenter]);

  /* ── Sync orb markers with tier-aware rendering ── */
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const visibleOrbs = orbs.filter((o) => o.tier); // show ALL tiers including far
    const currentIds = new Set(visibleOrbs.map((o) => o.id));

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    visibleOrbs.forEach((orb) => {
      const rColor = rarityColor(orb.rarity);
      const isClaimed = orb.status === 'claimed';
      const claimedClass = isClaimed ? ' mm-orb-claimed' : '';
      const tier = orb.tier ?? 'medium';

      const el = document.createElement('div');
      el.style.cssText = 'position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;';
      el.style.willChange = 'transform';
      el.style.transform = 'translateZ(0)';
      el.setAttribute('data-tier', tier);

      const profile = tierGlowProfile(orb.rarity);
      const reduce = reducedMotionRef.current;
      const rTone = RARITY_TONE[orb.rarity] || rColor;

      if (tier === 'far') {
        el.style.width = '28px';
        el.style.height = '28px';
        el.style.opacity = '0.35';
        el.innerHTML = `
          <div style="
            width:22px;height:22px;border-radius:50%;
            background:radial-gradient(circle, ${rTone}44, transparent);
            border:1.5px solid ${rTone}55;
            display:flex;align-items:center;justify-content:center;
            filter:blur(0.8px);
          ">
            <svg viewBox="0 0 20 20" width="11" height="11">
              <circle cx="10" cy="10" r="7" fill="${rTone}" opacity="0.5"/>
              <circle cx="10" cy="10" r="3" fill="#0a0a0f" opacity="0.7"/>
            </svg>
          </div>
        `;
      } else if (tier === 'medium') {
        el.style.width = '34px';
        el.style.height = '34px';
        el.innerHTML = `
          <div class="mm-medium" aria-label="Faint signal">
            <div class="mm-medium-iris"></div>
          </div>
        `;
      } else if (tier === 'close') {
        const cfg = orbMarkerConfig(orb.rarity);
        el.style.width = `${cfg.ring}px`;
        el.style.height = `${cfg.ring}px`;
        const img = orb.creatureImage;
        const innerImg = img
          ? `<img src="${img}" alt="" style="width:60%;height:60%;object-fit:cover;border-radius:50%;display:block;box-shadow:inset 0 0 6px ${rTone}cc;" />`
          : silhouetteSvg(rColor);
        el.innerHTML = `
          <div
            class="mm-orb-marker${claimedClass}${!isClaimed && profile.bob && !reduce ? ' mm-orb-bob' : ''}"
            style="
              width:${cfg.size}px;
              height:${cfg.size}px;
              background:radial-gradient(circle at 35% 35%, ${rColor}cc, ${rColor}33);
              border:2px solid ${rColor};
              box-shadow: 0 0 ${profile.shadowPx * 0.6}px ${rColor}88, inset 0 0 6px ${rColor}55;
              --orb-color:${rColor};
            "
          >
            ${innerImg}
          </div>
          ${!isClaimed ? `<div class="mm-orb-sonar" style="width:${cfg.ring}px;height:${cfg.ring}px;--orb-color:${rColor};"></div>` : ''}
        `;
      } else {
        // catchable
        const cfg = orbMarkerConfig(orb.rarity);
        const img = orb.creatureImage;
        el.style.width = `${cfg.ring + 12}px`;
        el.style.height = `${cfg.ring + 12}px`;
        const breathClass = !isClaimed && profile.scaleBreath && !reduce ? ' mm-orb-breath' : '';
        const bobClass = !isClaimed && profile.bob && !reduce ? ' mm-orb-bob' : '';
        const halo = !isClaimed && profile.haloRotate && !reduce ? '<div class="mm-orb-halo"></div>' : '';
        const particles = !isClaimed && !reduce ? particleHTML(profile.particles, rTone, orb.id) : '';
        const sonarRings = !isClaimed
          ? Array.from({ length: profile.sonarRings }, (_, i) => `<div class="mm-orb-sonar" style="width:${cfg.ring + 12}px;height:${cfg.ring + 12}px;--orb-color:${rColor};animation-delay:${i * 0.45}s;"></div>`).join('')
          : '';
        const catchPill = !isClaimed ? '<div class="mm-catch-pill">Catch</div>' : '';
        const innerImg = img
          ? `<img src="${img}" alt="" style="width:78%;height:78%;object-fit:cover;border-radius:50%;display:block;" />`
          : `<div class="mm-orb-iris"></div>`;
        el.innerHTML = `
          ${halo}
          ${particles}
          <div class="mm-catchable-ring"></div>
          <div
            class="mm-orb-marker${claimedClass}${breathClass}${bobClass}"
            data-tier-mark="catchable"
            style="
              width:${cfg.size + 10}px;
              height:${cfg.size + 10}px;
              background:radial-gradient(circle at 35% 35%, ${rColor}ee, ${rColor}55);
              border:2px solid ${rColor};
              box-shadow: 0 0 ${profile.shadowPx}px ${rColor}aa, 0 0 ${profile.shadowPx * 2}px ${rColor}55, inset 0 0 8px ${rColor}aa;
              --orb-color:${rColor};
              overflow:hidden;
              display:flex;align-items:center;justify-content:center;
            "
          >
            ${innerImg}
          </div>
          ${sonarRings}
          ${catchPill}
        `;
      }

      el.addEventListener('click', () => {
        if (tier === 'far') {
          onSelectOrb(orb); // opens info panel but can't catch
          return;
        }
        if (tier === 'catchable' && !isClaimed) {
          const inner = el.querySelector('[data-tier-mark="catchable"]') as HTMLElement | null;
          if (inner && !reduce) {
            inner.classList.add('mm-windup');
            setTimeout(() => onSelectOrb(orb), 210);
            return;
          }
        }
        onSelectOrb(orb);
      });

      if (markersRef.current.has(orb.id)) {
        // Update DOM if tier changed: remove old, add new.
        const existing = markersRef.current.get(orb.id)!;
        const existingEl = existing.getElement();
        if (existingEl.getAttribute('data-tier') !== tier) {
          existing.remove();
          markersRef.current.delete(orb.id);
          const m = new mapboxgl.Marker({ element: el, anchor: 'center' })
            .setLngLat([orb.longitude, orb.latitude])
            .addTo(map);
          markersRef.current.set(orb.id, m);
        } else {
          existing.setLngLat([orb.longitude, orb.latitude]);
        }
      } else {
        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([orb.longitude, orb.latitude])
          .addTo(map);
        markersRef.current.set(orb.id, marker);
      }

      // Sound triggers (per-spawn, once)
      const now = Date.now();
      if (tier === 'medium' && !spottedIdsRef.current.has(orb.id)) {
        spottedIdsRef.current.add(orb.id);
        if (now - lastSpottedAtRef.current > 250) {
          lastSpottedAtRef.current = now;
          sounds.play('spotted');
        }
      }
      if ((tier === 'close' || tier === 'catchable') && !nearbyIdsRef.current.has(orb.id)) {
        nearbyIdsRef.current.add(orb.id);
        if (now - lastNearbyAtRef.current > 600) {
          lastNearbyAtRef.current = now;
          sounds.play('nearby');
        }
      }
    });
  }, [orbs, onSelectOrb]);

  /* ── Player markers (other hunters, fuzzy) ── */
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const list = players ?? [];
    const currentIds = new Set(list.map((p) => p.user_id));

    playerMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        playerMarkersRef.current.delete(id);
      }
    });

    list.forEach((p) => {
      const tone = p.is_friend ? "#88FF00" : "#00FF88";
      const initial = (p.handle ?? "?").slice(0, 1).toUpperCase();

      // Fuzzy circle as a separate marker behind the dot.
      const fuzzyId = `fuzzy:${p.user_id}`;
      const dotId = `dot:${p.user_id}`;

      const fuzzyEl = document.createElement("div");
      const pxRadius = metersToPxAtZoom(p.fuzzy_radius_m, p.fuzzy_lat, map.getZoom());
      fuzzyEl.style.cssText = `
        width:${pxRadius}px;height:${pxRadius}px;border-radius:50%;
        background:radial-gradient(circle, ${tone}26 0%, ${tone}10 60%, transparent 75%);
        border:1px solid ${tone}55;
        animation:mmFuzzyBreath 4.2s ease-in-out infinite;
        pointer-events:none;
      `;

      const dotEl = document.createElement("div");
      dotEl.style.cssText = `
        position:relative;
        width:24px;height:24px;border-radius:50%;
        background:linear-gradient(135deg, ${tone}, #0a0a0f);
        border:2px solid ${tone};
        box-shadow:0 0 12px ${tone}aa;
        display:flex;align-items:center;justify-content:center;
        color:#0a0a0f;font-weight:800;font-size:11px;
        animation:mmPlayerPulse 2.4s ease-in-out infinite;
        cursor:pointer;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
      `;
      dotEl.style.willChange = 'transform';
      dotEl.style.transform = 'translateZ(0)';
      if (p.avatar_url) {
        dotEl.innerHTML = `<img src="${p.avatar_url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
      } else {
        dotEl.textContent = initial;
      }
      dotEl.setAttribute("role", "button");
      dotEl.setAttribute("aria-label", `Hunter ${p.handle ?? "anon"}`);
      dotEl.addEventListener("click", () => onSelectPlayer?.(p));

      const existingFuzzy = playerMarkersRef.current.get(fuzzyId);
      if (existingFuzzy) {
        existingFuzzy.setLngLat([p.fuzzy_lng, p.fuzzy_lat]);
        existingFuzzy.getElement().style.width = `${pxRadius}px`;
        existingFuzzy.getElement().style.height = `${pxRadius}px`;
      } else {
        const m = new mapboxgl.Marker({ element: fuzzyEl, anchor: "center" })
          .setLngLat([p.fuzzy_lng, p.fuzzy_lat])
          .addTo(map);
        playerMarkersRef.current.set(fuzzyId, m);
      }

      const existingDot = playerMarkersRef.current.get(dotId);
      if (existingDot) {
        existingDot.setLngLat([p.fuzzy_lng, p.fuzzy_lat]);
        const el = existingDot.getElement();
        el.replaceWith(dotEl);
        // Re-create marker because Mapbox doesn't expose element swap cleanly.
        existingDot.remove();
        const m2 = new mapboxgl.Marker({ element: dotEl, anchor: "center" })
          .setLngLat([p.fuzzy_lng, p.fuzzy_lat])
          .addTo(map);
        playerMarkersRef.current.set(dotId, m2);
      } else {
        const m2 = new mapboxgl.Marker({ element: dotEl, anchor: "center" })
          .setLngLat([p.fuzzy_lng, p.fuzzy_lat])
          .addTo(map);
        playerMarkersRef.current.set(dotId, m2);
      }
    });
  }, [players, onSelectPlayer]);

  /* ── Wild creature markers ── */
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const list = wildSpawns ?? [];
    const currentIds = new Set(list.map((s) => `wild:${s.id}`));
    const fuzzyIds = new Set(list.map((s) => `wild-fuzzy:${s.id}`));

    wildMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id) && !fuzzyIds.has(id)) {
        marker.remove();
        wildMarkersRef.current.delete(id);
      }
    });

    list.forEach((s) => {
      const color = wildRarityColor(s.rarity);

      const fuzzyEl = document.createElement("div");
      const pxRadius = metersToPxAtZoom(s.fuzzy_radius_m, s.fuzzy_lat, map.getZoom());
      fuzzyEl.style.cssText = `
        width:${pxRadius}px;height:${pxRadius}px;border-radius:50%;
        background:radial-gradient(circle, ${color}33 0%, ${color}14 55%, transparent 75%);
        border:1px dashed ${color}88;
        animation:mmFuzzyBreath 5s ease-in-out infinite;
        pointer-events:none;
      `;

      const art = resolveCreatureArt(s.species, s.rarity, s.id);
      const cardSrc = art.card || s.image_url || "";
      const wildEl = document.createElement("div");
      wildEl.style.cssText = `
        position:relative;
        width:38px;height:38px;border-radius:50%;
        background:radial-gradient(circle at 35% 35%, ${color}, #0a0a0f);
        border:2px solid ${color};
        --wild-color:${color};
        animation:mmWildPulse 1.9s ease-in-out infinite;
        cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        overflow:visible;
      `;
      wildEl.style.willChange = 'transform';
      wildEl.style.transform = 'translateZ(0)';
      wildEl.setAttribute("role", "button");
      wildEl.setAttribute("aria-label", `Wild ${s.species}`);
      // Add despawn timer to create urgency
      const now = Date.now();
      const expiresAt = new Date(s.expires_at).getTime();
      const minsLeft = Math.max(0, Math.floor((expiresAt - now) / 60000));
      const timerColor = minsLeft <= 5 ? "#ff4444" : minsLeft <= 15 ? "#ffaa00" : "#00FF88";
      const imgHtml = cardSrc
        ? `<img src="${cardSrc}" alt="" style="width:78%;height:78%;object-fit:cover;border-radius:50%;display:block;filter:drop-shadow(0 0 4px ${color}aa);" />`
        : `<svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" width="70%" height="70%">
            <ellipse cx="14" cy="14" rx="10" ry="6" fill="#0a0a0f" opacity="0.75"/>
            <circle cx="14" cy="13" r="3.2" fill="${color}"/>
            <circle cx="14" cy="13" r="1.4" fill="#FFFFFF"/>
          </svg>`;
      wildEl.innerHTML = `${imgHtml}<div style="position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:${timerColor};font-size:9px;font-weight:bold;padding:2px 5px;border-radius:8px;white-space:nowrap;border:1px solid ${timerColor}33;">${minsLeft}m</div>`;
      wildEl.addEventListener("click", () => onSelectWildSpawn?.(s));

      const fId = `wild-fuzzy:${s.id}`;
      const wId = `wild:${s.id}`;

      const existingF = wildMarkersRef.current.get(fId);
      if (existingF) {
        existingF.setLngLat([s.fuzzy_lng, s.fuzzy_lat]);
        existingF.getElement().style.width = `${pxRadius}px`;
        existingF.getElement().style.height = `${pxRadius}px`;
      } else {
        const m = new mapboxgl.Marker({ element: fuzzyEl, anchor: "center" })
          .setLngLat([s.fuzzy_lng, s.fuzzy_lat])
          .addTo(map);
        wildMarkersRef.current.set(fId, m);
      }

      const existingW = wildMarkersRef.current.get(wId);
      if (existingW) {
        existingW.setLngLat([s.fuzzy_lng, s.fuzzy_lat]);
      } else {
        const m2 = new mapboxgl.Marker({ element: wildEl, anchor: "center" })
          .setLngLat([s.fuzzy_lng, s.fuzzy_lat])
          .addTo(map);
        wildMarkersRef.current.set(wId, m2);
      }
    });
  }, [wildSpawns, onSelectWildSpawn]);

  /* ── Catchable wild spawns (catch-to-mint, exact GPS) ── */
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const list = catchableSpawns ?? [];
    const currentIds = new Set(list.map((s) => `catch:${s.id}`));

    catchableMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        catchableMarkersRef.current.delete(id);
      }
    });

    list.forEach((s) => {
      const color = s.tier_color || RARITY_TONE[s.tier] || "#00FF88";
      const key = `catch:${s.id}`;
      const profile = tierGlowProfile(s.tier);
      const reduce = reducedMotionRef.current;

      const wrap = document.createElement("div");
      wrap.style.cssText = `position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;`;
      wrap.style.willChange = 'transform';
      wrap.style.transform = 'translateZ(0)';
      const halo = profile.haloRotate && !reduce ? '<div class="mm-orb-halo"></div>' : '';
      const particles = !reduce ? particleHTML(profile.particles, color, s.id) : '';
      const breathClass = profile.scaleBreath && !reduce ? ' mm-orb-breath' : '';
      const bobClass = profile.bob && !reduce ? ' mm-orb-bob' : '';
      const sonar = Array.from({ length: profile.sonarRings }, (_, i) =>
        `<div class="mm-orb-sonar" style="width:48px;height:48px;--orb-color:${color};animation-delay:${i * 0.45}s;"></div>`,
      ).join('');
      // IDENTITY: catchable spawns carry creature_id stamped at spawn-time.
      // Resolve through the registry so the map marker matches the creature
      // the AR camera + NFT mint route will show.
      const art = resolveByCreatureId(s.creature_id, {
        name: s.name,
        tier: s.tier,
        imageCid: s.image_url,
      });
      const resolvedImg = art.card || s.image_url;
      const inner = resolvedImg
        ? `<img src="${resolvedImg}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />`
        : `<svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" width="60%" height="60%">
             <circle cx="14" cy="14" r="6" fill="${color}" opacity="0.85"/>
             <circle cx="14" cy="14" r="2" fill="#0a0a0f"/>
           </svg>`;

      const genesisRing = s.is_genesis
        ? `<div class="mm-genesis-ring" style="--genesis-color:#ffd166"></div>`
        : "";
      const genesisLabel = s.is_genesis
        ? `<div class="mm-genesis-label">GENESIS</div>`
        : "";
      wrap.innerHTML = `
        ${halo}
        ${particles}
        <div class="mm-catchable-ring"></div>
        ${genesisRing}
        <div
          class="mm-orb-marker${breathClass}${bobClass}"
          data-tier-mark="catchable"
          style="
            position:relative;
            width:38px;height:38px;border-radius:50%;
            background:radial-gradient(circle at 35% 35%, ${color}ee, #0a0a0f);
            border:2px solid ${color};
            --orb-color:${color};
            box-shadow: 0 0 ${profile.shadowPx}px ${color}aa, 0 0 ${profile.shadowPx * 2}px ${color}55, inset 0 0 8px ${color}aa;
            cursor:pointer;
            display:flex;align-items:center;justify-content:center;
            overflow:hidden;
          "
        >
          ${inner}
        </div>
        ${sonar}
        ${genesisLabel}
        <div class="mm-catch-pill">Catch</div>
      `;
      wrap.setAttribute("role", "button");
      wrap.setAttribute("aria-label", `Wild ${s.tier} ${s.name}`);
      wrap.addEventListener("click", () => {
        const innerEl = wrap.querySelector('[data-tier-mark="catchable"]') as HTMLElement | null;
        if (innerEl && !reduce) {
          innerEl.classList.add('mm-windup');
          setTimeout(() => onSelectCatchable?.(s), 210);
          return;
        }
        onSelectCatchable?.(s);
      });

      const existing = catchableMarkersRef.current.get(key);
      if (existing) {
        existing.setLngLat([s.lng, s.lat]);
      } else {
        const m = new mapboxgl.Marker({ element: wrap, anchor: "center" })
          .setLngLat([s.lng, s.lat])
          .addTo(map);
        catchableMarkersRef.current.set(key, m);
      }
    });
  }, [catchableSpawns, onSelectCatchable]);

  /* ── Watcher dots (social proof) ── */
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const list = watchers ?? [];
    const currentIds = new Set(list.map((w) => `watcher:${w.user_id}`));

    watcherMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        watcherMarkersRef.current.delete(id);
      }
    });

    list.forEach((w) => {
      const key = `watcher:${w.user_id}`;
      const wrap = document.createElement("div");
      wrap.style.cssText = `width:16px;height:16px;display:flex;align-items:center;justify-content:center;`;
      wrap.style.willChange = 'transform';
      wrap.style.transform = 'translateZ(0)';
      const dot = document.createElement("div");
      dot.className = "mm-watcher-dot";
      dot.setAttribute("data-handle", w.handle ? `@${w.handle}` : "A Watcher");
      wrap.appendChild(dot);

      const existing = watcherMarkersRef.current.get(key);
      if (existing) {
        existing.setLngLat([w.lng, w.lat]);
      } else {
        const m = new mapboxgl.Marker({ element: wrap, anchor: "center" })
          .setLngLat([w.lng, w.lat])
          .addTo(map);
        watcherMarkersRef.current.set(key, m);
      }
    });
  }, [watchers]);

  /* ── Recent catch ghosts (5-min fade window) ── */
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const list = recentCatches ?? [];
    const currentIds = new Set(list.map((g) => `ghost:${g.id}`));

    ghostMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        ghostMarkersRef.current.delete(id);
      }
    });

    list.forEach((g) => {
      const key = `ghost:${g.id}`;
      const ageMin = Math.max(0, Math.floor((Date.now() - new Date(g.caughtAt).getTime()) / 60000));
      const ageLabel = ageMin === 0 ? "just now" : `${ageMin} min ago`;
      const handle = g.catcherHandle || "A Watcher";
      const isHandled = handle !== "A Watcher" && !handle.startsWith("@");
      const display = handle === "A Watcher" ? handle : isHandled ? `@${handle}` : handle;
      const tierColor = RARITY_TONE[g.tier] || "#00FF88";

      const wrap = document.createElement("div");
      wrap.className = "mm-ghost-catch";
      wrap.setAttribute("data-label", `${display} caught a ${g.tier} ${ageLabel}`);
      wrap.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M11 2 C7 2 4 5 4 9 V19 L7 17 L9 19 L11 17 L13 19 L15 17 L18 19 V9 C18 5 15 2 11 2 Z"
            fill="${tierColor}22" stroke="${tierColor}" stroke-width="1.4" stroke-linejoin="round"/>
          <circle cx="8.5" cy="9" r="1" fill="${tierColor}"/>
          <circle cx="13.5" cy="9" r="1" fill="${tierColor}"/>
        </svg>
      `;

      const existing = ghostMarkersRef.current.get(key);
      if (existing) {
        existing.setLngLat([g.lng, g.lat]);
        existing.remove();
      }
      const m = new mapboxgl.Marker({ element: wrap, anchor: "center" })
        .setLngLat([g.lng, g.lat])
        .addTo(map);
      ghostMarkersRef.current.set(key, m);
    });
  }, [recentCatches]);

  /* ── Cleanup ── */
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      playerMarkersRef.current.forEach((m) => m.remove());
      playerMarkersRef.current.clear();
      wildMarkersRef.current.forEach((m) => m.remove());
      wildMarkersRef.current.clear();
      catchableMarkersRef.current.forEach((m) => m.remove());
      catchableMarkersRef.current.clear();
      watcherMarkersRef.current.forEach((m) => m.remove());
      watcherMarkersRef.current.clear();
      ghostMarkersRef.current.forEach((m) => m.remove());
      ghostMarkersRef.current.clear();
      if (mapRef.current) {
        const timer = (mapRef.current as unknown as { _mmHourTimer?: ReturnType<typeof setInterval> })._mmHourTimer;
        if (timer) clearInterval(timer);
        mapRef.current.remove();
        mapRef.current = null;
        if (externalMapRef) externalMapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Edge pulses for "far" spawns ── */
  const farOrbs = orbs.filter((o) => o.tier === 'far');

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        background: '#0a0a0f',
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: '#000000',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(0,255,136,0.06), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(136,255,0,0.04), transparent 60%), linear-gradient(180deg, rgba(10,10,15,0.15), rgba(10,10,15,0.35))',
          mixBlendMode: 'screen',
        }}
      />

      {/* Living-approach vignette: green edge glow that intensifies as the
          closest catchable spawn approaches. CSS-variable driven so we never
          touch React's commit cycle when intensity changes via the parent's
          state — only the inline style attribute updates. */}
      <div
        aria-hidden
        className="mm-approach-vignette"
        style={{
          ['--approach-intensity' as unknown as string]: String(
            Math.max(0, Math.min(1, approachIntensity)),
          ),
        }}
      />

      {/* Edge pulses — one chevron per cardinal sector for far spawns */}
      <EdgePulses farOrbs={farOrbs} />
    </div>
  );
}

export default React.memo(HuntMap, (prev, next) =>
  prev.orbs === next.orbs &&
  prev.userPosition?.lat === next.userPosition?.lat &&
  prev.userPosition?.lng === next.userPosition?.lng
);

function EdgePulses({ farOrbs }: { farOrbs: HuntOrb[] }) {
  // Bucket by 8-way direction so multiple far spawns in the same sector don't
  // double-render.
  const seen = new Set<string>();
  const chevrons: { side: 'top' | 'right' | 'bottom' | 'left'; bearing: number }[] = [];
  farOrbs.forEach((o) => {
    const b = ((o.bearingDeg ?? 0) + 360) % 360;
    let side: 'top' | 'right' | 'bottom' | 'left';
    if (b >= 315 || b < 45) side = 'top';
    else if (b < 135) side = 'right';
    else if (b < 225) side = 'bottom';
    else side = 'left';
    if (seen.has(side)) return;
    seen.add(side);
    chevrons.push({ side, bearing: b });
  });

  return (
    <>
      {chevrons.map((c) => {
        const pos: React.CSSProperties =
          c.side === 'top'
            ? { top: 12, left: '50%', transform: 'translateX(-50%) rotate(0deg)' }
            : c.side === 'right'
              ? { right: 12, top: '50%', transform: 'translateY(-50%) rotate(90deg)' }
              : c.side === 'bottom'
                ? { bottom: 12, left: '50%', transform: 'translateX(-50%) rotate(180deg)' }
                : { left: 12, top: '50%', transform: 'translateY(-50%) rotate(270deg)' };
        return (
          <div
            key={c.side}
            aria-hidden
            style={{
              position: 'absolute',
              ...pos,
              pointerEvents: 'none',
              zIndex: 14,
              animation: 'mmEdgePulse 2s ease-in-out infinite',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 3 L17 14 H3 Z"
                fill="rgba(0,255,136,0.0)"
                stroke="rgba(0,255,136,0.85)"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        );
      })}
    </>
  );
}
