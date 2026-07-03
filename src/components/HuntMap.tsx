'use client';

import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Orb } from '@/lib/theme';
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

/** Camera-follow state reported up so the page can show the Recenter button. */
export type PanState = {
  away: boolean;
  distanceM: number;
  /** Bearing (radians, 0 = north, clockwise) from camera center back to the user. */
  bearingRad: number;
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
  /** Fired when the user pans away from (or back onto) their location. */
  onPanState?: (state: PanState | null) => void;
  /**
   * Living-approach vignette intensity in [0,1]. Drives the green edge-glow
   * opacity shown when a catchable spawn enters approach range.
   */
  approachIntensity?: number;
}

// App rarity palette (BlinkTheme / Rarity.color) — identical hex values.
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

const NEON = '#00FF88';
const GOLD = '#ffd166';

// App follow camera: MapCamera(distance: 700, pitch: 55). Mapbox equivalent.
const FOLLOW_PITCH = 55;
const FOLLOW_ZOOM = 16.2;
// Player reach — mirrors the app's grab-range "pool of light" (CATCH radius).
const REACH_RADIUS_M = 50;

function normalRarity(r: string): string {
  return (r || '').toLowerCase();
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Deterministic per-id 0..1 so neighbouring pins never animate in sync —
// same trick as the app's seed01 (FNV-ish hash of the id).
function seed01(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (Math.abs(h) % 1000) / 1000;
}

// Approximate meters → on-screen pixels at the current zoom level + latitude
// (Web Mercator). Used to size the reach glow + privacy zones with zoom.
function metersToPx(meters: number, lat: number, zoom: number): number {
  const metersPerPx = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  if (!isFinite(metersPerPx) || metersPerPx <= 0) return 80;
  return meters / metersPerPx;
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const p = Math.PI / 180;
  const a =
    0.5 -
    Math.cos((lat2 - lat1) * p) / 2 +
    Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lon2 - lon1) * p)) / 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Initial bearing (radians, 0 = north, clockwise) from a to b.
function bearingRad(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const dLon = ((bLng - aLng) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return Math.atan2(y, x);
}

/* ────────────────────────────────────────────────────────────────────────
 * Marker CSS — the app's pin spec translated 1:1:
 *  • CreatureMapPin: ground shadow + glowing rarity stand ring + breathing
 *    radial aura (per-pin timing) + scanning comet arc on legendary/mythic
 *    + the bobbing, occasionally hopping creature sprite.
 *  • WalkCoinPin: the glossy 3D brand orb hovering over a living ground
 *    shadow; dim + desaturated out of range, ring + value tag in range.
 *  • TrainerMapPin: soft presence "area" glow, avatar on a presence ring,
 *    name tag capsule.
 *  Transform/opacity animation only — same budget the app keeps.
 * ──────────────────────────────────────────────────────────────────────── */
const HUNT_CSS = `
.mm-ws { transform: scale(var(--mm-world-scale, 1)); transition: transform 0.4s ease; }

/* ── Creature pin ── */
@keyframes mmCpBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}
@keyframes mmCpShadow {
  0%, 100% { transform: translateX(-50%) scale(1); opacity: 1; }
  50% { transform: translateX(-50%) scale(0.78); opacity: 0.6; }
}
@keyframes mmCpAura {
  0%, 100% { opacity: 0.5; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.08); }
}
@keyframes mmCpStandRing {
  0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(0.85); }
  50% { opacity: 0.95; transform: translateX(-50%) scale(1.05); }
}
@keyframes mmCpScan {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes mmCpHop {
  0%, 55%, 100% { transform: scale(1, 1) translateY(0); }
  58% { transform: scale(1.12, 0.86) translateY(3px); }
  63% { transform: scale(0.90, 1.12) translateY(-14px); }
  68% { transform: scale(1.14, 0.84) translateY(1px); }
  74% { transform: scale(1, 1) translateY(0); }
}
.mm-cp {
  position: relative;
  width: 88px; height: 92px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.18s ease, opacity 0.3s ease;
}
.mm-cp:active { transform: scale(0.85); }
.mm-cp-shadow {
  position: absolute; left: 50%; bottom: 8px;
  width: 40px; height: 13px; border-radius: 50%;
  background: radial-gradient(ellipse, rgba(0,0,0,0.45), rgba(0,0,0,0));
  transform: translateX(-50%);
  animation: mmCpShadow var(--bob-dur, 2.5s) ease-in-out infinite;
}
.mm-cp-stand {
  position: absolute; left: 50%; bottom: 8px;
  width: 42px; height: 14px; border-radius: 50%;
  background: var(--tint);
  opacity: 0.14;
  transform: translateX(-50%);
}
.mm-cp-standring {
  position: absolute; left: 50%; bottom: 7px;
  width: 46px; height: 16px; border-radius: 50%;
  border: 2px solid var(--tint);
  animation: mmCpStandRing var(--glow-dur, 2.3s) ease-in-out infinite;
}
.mm-cp-aura {
  position: absolute; left: 50%; top: 50%;
  width: 88px; height: 88px; border-radius: 50%;
  margin: -46px 0 0 -44px;
  background: radial-gradient(circle, var(--aura-strong) 0%, transparent 68%);
  animation: mmCpAura var(--glow-dur, 2.3s) ease-in-out infinite;
  pointer-events: none;
}
.mm-cp-scan {
  position: absolute; left: 50%; top: 50%;
  width: 62px; height: 62px; border-radius: 50%;
  margin: -33px 0 0 -31px;
  background: conic-gradient(from 0deg, transparent 0deg, var(--tint) 54deg, transparent 108deg, transparent 360deg);
  -webkit-mask: radial-gradient(closest-side, transparent 86%, #000 88%);
  mask: radial-gradient(closest-side, transparent 86%, #000 88%);
  animation: mmCpScan 3.4s linear infinite;
  pointer-events: none;
}
.mm-cp-hop {
  position: absolute; left: 50%; bottom: 12px;
  width: 74px; height: 62px;
  margin-left: -37px;
  transform-origin: 50% 100%;
  animation: mmCpHop var(--hop-dur, 4s) ease-in-out infinite;
}
.mm-cp-sprite {
  width: 100%; height: 100%;
  object-fit: contain;
  object-position: bottom;
  animation: mmCpBob var(--bob-dur, 2.5s) ease-in-out infinite;
  filter: drop-shadow(0 2px 3px rgba(0,0,0,0.35));
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}
.mm-cp-dim { opacity: 0.35; }
.mm-cp-genesis {
  position: absolute; left: 50%; top: -26px;
  transform: translateX(-50%);
  padding: 3px 10px; border-radius: 999px;
  background: linear-gradient(135deg, #ffd166, #ff8ae0);
  color: #0a0a0f; font-size: 9px; font-weight: 900;
  letter-spacing: 0.18em; text-transform: uppercase; white-space: nowrap;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  box-shadow: 0 0 14px rgba(255,209,102,0.65);
  pointer-events: none;
}

/* ── Orb pickup pin (WalkCoinPin.coinView) ── */
@keyframes mmOrbBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@keyframes mmOrbShadow {
  0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.95; }
  50% { transform: translateX(-50%) scale(0.72); opacity: 0.5; }
}
@keyframes mmOrbInvite {
  0% { transform: translate(-50%,-50%) scale(0.9); opacity: 0.85; }
  100% { transform: translate(-50%,-50%) scale(1.5); opacity: 0; }
}
@keyframes mmOrbWiggle {
  0%, 100% { transform: translateX(0); }
  30% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
}
.mm-op {
  position: relative;
  width: 64px; height: 64px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.35s ease, opacity 0.35s ease, filter 0.35s ease;
}
.mm-op-out { opacity: 0.55; filter: saturate(0.72); transform: scale(0.86); }
.mm-op-claimed { opacity: 0.3; filter: grayscale(0.8); }
.mm-op-halo {
  position: absolute; left: 50%; top: 50%;
  width: 48px; height: 48px; border-radius: 50%;
  transform: translate(-50%,-50%);
  background: radial-gradient(circle, var(--halo) 0%, transparent 66%);
  pointer-events: none;
}
.mm-op-shadow {
  position: absolute; left: 50%; bottom: 6px;
  width: 32px; height: 11px; border-radius: 50%;
  background: radial-gradient(ellipse, rgba(0,0,0,0.42), rgba(0,0,0,0));
  transform: translateX(-50%);
  animation: mmOrbShadow var(--bob-dur, 1.9s) ease-in-out infinite;
}
.mm-op-bubble {
  position: absolute; left: 50%; bottom: 12px;
  width: var(--dia, 34px); height: var(--dia, 34px);
  margin-left: calc(var(--dia, 34px) / -2);
  object-fit: contain;
  animation: mmOrbBob var(--bob-dur, 1.9s) ease-in-out infinite;
  pointer-events: none; user-select: none; -webkit-user-drag: none;
}
.mm-op-invite {
  position: absolute; left: 50%; top: 50%;
  width: 46px; height: 46px; border-radius: 50%;
  border: 2px solid var(--tint);
  animation: mmOrbInvite 1.5s ease-out infinite;
  pointer-events: none;
}
.mm-op-value {
  position: absolute; left: 50%; top: -4px;
  transform: translateX(-50%);
  padding: 1px 5px; border-radius: 999px;
  background: var(--tint); color: #000;
  font-size: 8.5px; font-weight: 900; white-space: nowrap;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  pointer-events: none;
}
.mm-op-wiggle { animation: mmOrbWiggle 0.3s ease-in-out; }

/* ── Distant orb glint (OrbGlintPin) — static on purpose ── */
.mm-glint {
  position: relative; width: 20px; height: 20px; pointer-events: none;
}
.mm-glint-halo {
  position: absolute; inset: 1px; border-radius: 50%;
  background: radial-gradient(circle, var(--halo) 0%, transparent 66%);
}
.mm-glint-dot {
  position: absolute; left: 50%; top: 50%; width: 5px; height: 5px;
  margin: -2.5px 0 0 -2.5px; border-radius: 50%; background: var(--tint);
}
.mm-glint-spec {
  position: absolute; left: 50%; top: 50%; width: 2px; height: 2px;
  margin: -1.8px 0 0 -1.8px; border-radius: 50%; background: rgba(255,255,255,0.9);
}

/* ── Trainer / player pin ── */
@keyframes mmTpBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
@keyframes mmTpArea {
  0%, 100% { transform: translate(-50%,-50%) scale(0.9); opacity: 0.7; }
  50% { transform: translate(-50%,-50%) scale(1.06); opacity: 1; }
}
.mm-tp {
  position: relative; width: 116px; height: 118px;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  transition: transform 0.18s ease;
}
.mm-tp:active { transform: scale(0.88); }
.mm-tp-area {
  position: absolute; left: 50%; top: 42px;
  width: 104px; height: 104px; border-radius: 50%;
  background: radial-gradient(circle, var(--presence-glow) 0%, transparent 66%);
  animation: mmTpArea 1.9s ease-in-out infinite;
  pointer-events: none;
}
.mm-tp-shadow {
  position: absolute; left: 50%; top: 68px;
  width: 38px; height: 12px; border-radius: 50%;
  background: radial-gradient(ellipse, rgba(0,0,0,0.4), rgba(0,0,0,0));
  transform: translateX(-50%);
}
.mm-tp-core {
  position: absolute; left: 50%; top: 14px;
  width: 52px; height: 52px; margin-left: -26px;
  animation: mmTpBob var(--bob-dur, 2.6s) ease-in-out infinite;
}
.mm-tp-avatar {
  width: 52px; height: 52px; border-radius: 50%;
  background: #12121a;
  border: 2.5px solid var(--presence);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 20px; font-weight: 900;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
  box-sizing: border-box;
}
.mm-tp-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.mm-tp-badge {
  position: absolute; right: -4px; top: -4px;
  width: 15px; height: 15px; border-radius: 50%;
  background: #0a0a0f;
  display: flex; align-items: center; justify-content: center;
}
.mm-tp-name {
  position: absolute; left: 50%; bottom: 8px;
  transform: translateX(-50%);
  max-width: 112px; overflow: hidden; text-overflow: ellipsis;
  padding: 2.5px 7px; border-radius: 999px;
  background: rgba(0,0,0,0.62);
  border: 0.75px solid var(--presence-border);
  color: #fff; font-size: 10.5px; font-weight: 800; white-space: nowrap;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ── User beacon (UserLocationDot) — static, the art carries it ── */
.mm-user {
  position: relative; width: 60px; height: 60px;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
.mm-user-glow {
  position: absolute; inset: 0; border-radius: 50%;
  background: radial-gradient(circle, rgba(0,255,136,0.4) 8%, transparent 62%);
}
.mm-user-art {
  position: relative; width: 46px; height: 46px; object-fit: contain;
  user-select: none; -webkit-user-drag: none;
}

/* ── Reach glow — the collection range as a soft pool of light ── */
.mm-reach { position: relative; pointer-events: none; }
.mm-reach-outer {
  position: absolute; inset: 0; border-radius: 50%;
  background: rgba(0,255,136,0.08);
}
.mm-reach-inner {
  position: absolute; left: 22.5%; top: 22.5%; width: 55%; height: 55%;
  border-radius: 50%;
  background: rgba(0,255,136,0.06);
}

/* ── Wild spawn zone + timer tag ── */
@keyframes mmZoneBreath {
  0%, 100% { opacity: 0.22; transform: scale(1); }
  50% { opacity: 0.36; transform: scale(1.04); }
}
.mm-wild-zone {
  border-radius: 50%;
  animation: mmZoneBreath 5s ease-in-out infinite;
  pointer-events: none;
}
.mm-wild-timer {
  position: absolute; left: 50%; bottom: -4px;
  transform: translateX(-50%);
  padding: 2px 6px; border-radius: 999px;
  background: rgba(0,0,0,0.7);
  color: var(--timer-color); font-size: 9px; font-weight: 800; white-space: nowrap;
  border: 1px solid var(--timer-border);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  pointer-events: none;
}

/* ── Watcher dot + recent-catch ghost ── */
@keyframes mmWatcherPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.25); }
}
.mm-watcher-dot {
  position: relative; width: 8px; height: 8px; border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #ccffe6, #00FF88 70%);
  box-shadow: 0 0 8px rgba(0,255,136,0.75);
  animation: mmWatcherPulse 1.2s ease-in-out infinite;
  cursor: pointer;
}
.mm-watcher-dot::after {
  content: attr(data-handle);
  position: absolute; left: 50%; bottom: 130%;
  transform: translateX(-50%);
  padding: 3px 7px; border-radius: 6px;
  background: rgba(10,10,15,0.9);
  border: 1px solid rgba(0,255,136,0.4);
  color: #00FF88; font-size: 10px; font-weight: 700; white-space: nowrap;
  opacity: 0; transition: opacity 120ms ease; pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.mm-watcher-dot:hover::after { opacity: 1; }
@keyframes mmGhostBob {
  0%, 100% { transform: translateY(0); opacity: 0.55; }
  50% { transform: translateY(-3px); opacity: 0.85; }
}
.mm-ghost-catch {
  position: relative; width: 28px; height: 28px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  animation: mmGhostBob 3s ease-in-out infinite;
}
.mm-ghost-catch svg { filter: drop-shadow(0 0 6px rgba(0,255,136,0.85)); }
.mm-ghost-catch::after {
  content: attr(data-label);
  position: absolute; left: 50%; bottom: 110%;
  transform: translateX(-50%);
  padding: 3px 8px; border-radius: 6px;
  background: rgba(10,10,15,0.92);
  border: 1px solid rgba(0,255,136,0.4);
  color: #00FF88; font-size: 10px; font-weight: 700; white-space: nowrap;
  opacity: 0; transition: opacity 140ms ease; pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.mm-ghost-catch:hover::after { opacity: 1; }

/* ── Living-approach vignette ── */
.mm-approach-vignette {
  position: absolute; inset: 0; pointer-events: none; z-index: 6;
  box-shadow: inset 0 0 120px 30px rgba(0, 255, 136, 0.85);
  opacity: calc(var(--approach-intensity, 0) * 0.6);
  transition: opacity 280ms ease;
  will-change: opacity;
  mix-blend-mode: screen;
}
.mm-approach-vignette::after {
  content: "";
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0, 255, 136, 0.45) 100%);
  animation: mmVignetteBreath 1.8s ease-in-out infinite;
  will-change: opacity;
}
@keyframes mmVignetteBreath {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .mm-cp-shadow, .mm-cp-aura, .mm-cp-standring, .mm-cp-scan, .mm-cp-hop,
  .mm-cp-sprite, .mm-op-shadow, .mm-op-bubble, .mm-op-invite, .mm-tp-area,
  .mm-tp-core, .mm-wild-zone, .mm-watcher-dot, .mm-ghost-catch,
  .mm-approach-vignette::after { animation: none !important; }
}
.mapboxgl-ctrl-logo { display: none !important; }
.mapboxgl-ctrl-attrib { display: none !important; }
.mapboxgl-ctrl-group { display: none !important; }
.mapboxgl-ctrl-top-left { display: none !important; }
.mapboxgl-ctrl-top-right { display: none !important; }
.mapboxgl-ctrl-bottom-left { display: none !important; }
.mapboxgl-ctrl-bottom-right { display: none !important; }
`;

function wildRarityColor(rarity: string): string {
  return RARITY_TONE[normalRarity(rarity)] || '#ffffff';
}

/** Player presence color — mirrors TrainerMapPin.presenceColor. */
function presenceColor(p: NearbyPlayer): string {
  if (!p.last_seen) return NEON;
  const ageMin = (Date.now() - new Date(p.last_seen).getTime()) / 60000;
  if (ageMin < 5) return NEON; // online
  if (ageMin < 60) return '#8cc7ff'; // recently active (0.55, 0.78, 1.0)
  return '#8c94a8'; // away (0.55, 0.58, 0.66)
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Escape a server-provided string before interpolating it into marker
 * innerHTML (attribute or text position) — user-controlled values like
 * avatar URLs must not be able to break out of the markup.
 */
function escHTML(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * App-identical CreatureMapPin markup: ground shadow, glowing rarity stand
 * ring, breathing radial aura (per-creature timing), scanning comet arc on
 * legendary/mythic, and the bobbing/hopping creature sprite.
 */
function creaturePinHTML(opts: {
  id: string;
  tint: string;
  rarity: string;
  sprite: string;
  isGenesis?: boolean;
  reduce: boolean;
}): string {
  const s = seed01(opts.id);
  const bucket = Math.abs(opts.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 5;
  const glowDur = (2.0 + bucket * 0.3).toFixed(2);
  const bobDur = (2.1 + s * 0.9).toFixed(2);
  const hopDur = (3.4 + s * 3).toFixed(2);
  const r = normalRarity(opts.rarity);
  const legOrMythic = r === 'legendary' || r === 'mythic';
  const auraStrong = hexToRgba(opts.tint, legOrMythic ? 0.5 : 0.32);
  const spriteEl = opts.sprite
    ? `<img class="mm-cp-sprite" src="${escHTML(opts.sprite)}" alt="" draggable="false" />`
    : `<div class="mm-cp-sprite" style="display:flex;align-items:flex-end;justify-content:center;">
         <div style="width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 35% 35%, ${opts.tint}, #0a0a0f);border:2px solid ${opts.tint};"></div>
       </div>`;
  return `
    <div class="mm-cp-shadow" style="--bob-dur:${bobDur}s;"></div>
    <div class="mm-cp-stand" style="--tint:${opts.tint};"></div>
    <div class="mm-cp-standring" style="--tint:${opts.tint};--glow-dur:${glowDur}s;"></div>
    <div class="mm-cp-aura" style="--aura-strong:${auraStrong};--glow-dur:${glowDur}s;"></div>
    ${legOrMythic && !opts.reduce ? `<div class="mm-cp-scan" style="--tint:${opts.tint};"></div>` : ''}
    <div class="mm-cp-hop" style="--hop-dur:${hopDur}s;--bob-dur:${bobDur}s;">
      ${spriteEl}
    </div>
    ${opts.isGenesis ? '<div class="mm-cp-genesis">GENESIS</div>' : ''}
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
  onPanState,
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
  const reachMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hasInitialView = useRef(false);
  const spottedIdsRef = useRef<Set<string>>(new Set());
  const lastSpottedAtRef = useRef<number>(0);
  const nearbyIdsRef = useRef<Set<string>>(new Set());
  const lastNearbyAtRef = useRef<number>(0);
  const reducedMotionRef = useRef<boolean>(false);
  // Camera-follow state — mirrors the app: follow until the user pans >30m
  // away, then surface the Recenter button (via onPanState).
  const followRef = useRef<boolean>(true);
  const lastEaseRef = useRef<{ lat: number; lng: number } | null>(null);
  const userPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const onPanStateRef = useRef<typeof onPanState>(onPanState);
  onPanStateRef.current = onPanState;
  userPosRef.current = userPosition;

  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion();
  }, []);

  /* ── Inject CSS ── */
  useEffect(() => {
    const existing = document.getElementById('mm-hunt-styles');
    if (existing) existing.remove();
    const style = document.createElement('style');
    style.id = 'mm-hunt-styles';
    style.textContent = HUNT_CSS;
    document.head.appendChild(style);
  }, []);

  /* ── Init map — PURE satellite imagery + 3D tilted follow camera,
     matching the app's `.mapStyle(.imagery)` + MapCamera(700m, pitch 55). ── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const center: [number, number] = userPosition
      ? [userPosition.lng, userPosition.lat]
      : [-74.006, 40.7128];

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      pitch: FOLLOW_PITCH,
      bearing: 0,
      center,
      zoom: FOLLOW_ZOOM,
      attributionControl: false,
      logoPosition: 'bottom-left',
      renderWorldCopies: false,
      antialias: false,
    });

    // Green atmosphere fog — the satellite horizon fades into brand-dark.
    const applyStyleNow = () => applyBlinkMapStyle(map, { hour: new Date().getHours() });
    map.on('style.load', applyStyleNow);

    // Manual pan disengages follow (only for user-driven moves).
    const reportPan = (e?: { originalEvent?: Event }) => {
      const user = userPosRef.current;
      if (!user) return;
      const c = map.getCenter();
      const dist = haversineM(c.lat, c.lng, user.lat, user.lng);
      if (followRef.current) {
        // Our own follow/recenter easeTo also emits moveend — only a
        // gesture-driven move (originalEvent present) may break follow.
        if (!e?.originalEvent) return;
        if (dist > 30) {
          followRef.current = false;
          onPanStateRef.current?.({
            away: true,
            distanceM: dist,
            bearingRad: bearingRad(c.lat, c.lng, user.lat, user.lng),
          });
        }
        return;
      }
      onPanStateRef.current?.({
        away: dist > 30,
        distanceM: dist,
        bearingRad: bearingRad(c.lat, c.lng, user.lat, user.lng),
      });
    };
    map.on('dragstart', () => {
      followRef.current = false;
    });
    map.on('moveend', reportPan);

    // World zoom scale — pins grow up close, shrink pulled back, exactly the
    // app's sqrt(followDistance/distance) clamp 0.72…1.3 remapped to zoom.
    const applyWorldScale = () => {
      const z = map.getZoom();
      const raw = Math.pow(2, (z - FOLLOW_ZOOM) / 2);
      const clamped = Math.max(0.72, Math.min(1.3, raw));
      containerRef.current?.style.setProperty('--mm-world-scale', clamped.toFixed(3));
      // Resize the reach glow so it stays glued to real meters.
      const user = userPosRef.current;
      if (user && reachMarkerRef.current) {
        const d = Math.max(24, metersToPx(REACH_RADIUS_M, user.lat, z) * 2);
        const el = reachMarkerRef.current.getElement();
        el.style.width = `${d}px`;
        el.style.height = `${d}px`;
      }
    };
    map.on('zoom', applyWorldScale);
    map.on('load', applyWorldScale);

    // Recenter hook the page's Recenter button calls: spring back + re-follow.
    (map as unknown as Record<string, unknown>)._mmRecenter = () => {
      const user = userPosRef.current;
      followRef.current = true;
      onPanStateRef.current?.(null);
      if (user) {
        map.easeTo({
          center: [user.lng, user.lat],
          zoom: FOLLOW_ZOOM,
          pitch: FOLLOW_PITCH,
          bearing: 0,
          duration: 800,
        });
      }
    };

    mapRef.current = map;
    if (externalMapRef) externalMapRef.current = map;
  }, [userPosition?.lat, userPosition?.lng]); // re-init if position arrives before map exists

  /* ── User beacon + reach glow ── */
  useEffect(() => {
    if (!mapRef.current || !userPosition) return;
    const map = mapRef.current;

    if (!reachMarkerRef.current) {
      const reachEl = document.createElement('div');
      reachEl.className = 'mm-reach';
      const d = Math.max(24, metersToPx(REACH_RADIUS_M, userPosition.lat, map.getZoom()) * 2);
      reachEl.style.width = `${d}px`;
      reachEl.style.height = `${d}px`;
      reachEl.innerHTML = '<div class="mm-reach-outer"></div><div class="mm-reach-inner"></div>';
      reachMarkerRef.current = new mapboxgl.Marker({ element: reachEl, anchor: 'center' })
        .setLngLat([userPosition.lng, userPosition.lat])
        .addTo(map);
    } else {
      reachMarkerRef.current.setLngLat([userPosition.lng, userPosition.lat]);
    }

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'mm-user';
      el.innerHTML = `
        <div class="mm-user-glow"></div>
        <img class="mm-user-art" src="/brand/app/beacon-sphere-plasma.png" alt="" draggable="false" />
      `;
      userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([userPosition.lng, userPosition.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([userPosition.lng, userPosition.lat]);
    }

    // Follow camera: ease to the user (throttled — skip <3m moves), keeping
    // the cinematic tilt. MapKit-style: the map drives its own interpolation.
    if (!hasInitialView.current) {
      map.easeTo({
        center: [userPosition.lng, userPosition.lat],
        zoom: FOLLOW_ZOOM,
        pitch: FOLLOW_PITCH,
        bearing: 0,
        duration: 600,
      });
      hasInitialView.current = true;
      lastEaseRef.current = userPosition;
      return;
    }
    if (followRef.current) {
      const last = lastEaseRef.current;
      if (!last || haversineM(last.lat, last.lng, userPosition.lat, userPosition.lng) >= 3) {
        lastEaseRef.current = userPosition;
        map.easeTo({
          center: [userPosition.lng, userPosition.lat],
          duration: 800,
        });
      }
    }
  }, [userPosition]);

  /* ── Orb drop markers — the app's glossy 3D brand-orb street pickups.
     Featured orbs render the real bubble art; far-tier collapses to the tiny
     glint, exactly the app's declutter pass. ── */
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const visibleOrbs = orbs.filter((o) => o.tier);
    const currentIds = new Set(visibleOrbs.map((o) => o.id));

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    visibleOrbs.forEach((orb) => {
      const isClaimed = orb.status === 'claimed';
      const tier = orb.tier ?? 'medium';
      const r = normalRarity(orb.rarity);
      const gold = r === 'legendary' || r === 'rare';
      const tint = gold ? GOLD : NEON;
      const inReach = tier === 'catchable';
      const s = seed01(orb.id);
      const bobDur = (1.5 + s * 0.6).toFixed(2);

      const el = document.createElement('div');
      el.setAttribute('data-tier', tier);
      el.style.willChange = 'transform';

      if (tier === 'far') {
        // Distant treasure — a quiet glint up the road, not a crowd.
        el.innerHTML = `
          <div class="mm-glint" style="--tint:${tint};--halo:${hexToRgba(tint, 0.35)};">
            <div class="mm-glint-halo"></div>
            <div class="mm-glint-dot"></div>
            <div class="mm-glint-spec"></div>
          </div>
        `;
        el.style.cssText += 'width:20px;height:20px;cursor:pointer;';
      } else {
        const dia = gold ? 44 : 34;
        el.style.cssText += 'width:64px;height:64px;';
        el.innerHTML = `
          <div class="mm-ws">
            <div class="mm-op${inReach ? '' : ' mm-op-out'}${isClaimed ? ' mm-op-claimed' : ''}"
                 style="--tint:${tint};--halo:${hexToRgba(tint, 0.34)};--dia:${dia}px;--bob-dur:${bobDur}s;">
              <div class="mm-op-halo"></div>
              <div class="mm-op-shadow"></div>
              <img class="mm-op-bubble" src="/brand/app/energy-orb-b.png" alt="" draggable="false"
                   style="${gold ? 'filter:sepia(0.55) saturate(2.4) hue-rotate(-18deg) brightness(1.08);' : ''}" />
              ${inReach && !isClaimed ? `<div class="mm-op-invite"></div><div class="mm-op-value">+${orb.amount} ${escHTML(orb.currency ?? '')}</div>` : ''}
            </div>
          </div>
        `;
      }

      // .onclick (not addEventListener) so the existing-marker branch can
      // refresh the handler each pass — otherwise clicks resolve against the
      // orb object and onSelectOrb prop from the render the pin was born in.
      const clickHandler = (rootEl: HTMLElement) => () => {
        if (tier !== 'far' && !inReach && !isClaimed) {
          // Too far — the orb wiggles, the app's "walk onto the spot" tell.
          const pin = rootEl.querySelector('.mm-op') as HTMLElement | null;
          if (pin && !reducedMotionRef.current) {
            pin.classList.add('mm-op-wiggle');
            setTimeout(() => pin.classList.remove('mm-op-wiggle'), 320);
          }
        }
        onSelectOrb(orb);
      };
      el.onclick = clickHandler(el);

      if (markersRef.current.has(orb.id)) {
        const existing = markersRef.current.get(orb.id)!;
        const existingEl = existing.getElement();
        const stateKey = `${tier}|${inReach}|${isClaimed}`;
        if (existingEl.getAttribute('data-state') !== stateKey) {
          existing.remove();
          markersRef.current.delete(orb.id);
          el.setAttribute('data-state', stateKey);
          const m = new mapboxgl.Marker({ element: el, anchor: 'center' })
            .setLngLat([orb.longitude, orb.latitude])
            .addTo(map);
          markersRef.current.set(orb.id, m);
        } else {
          existing.setLngLat([orb.longitude, orb.latitude]);
          existingEl.onclick = clickHandler(existingEl);
        }
      } else {
        el.setAttribute('data-state', `${tier}|${inReach}|${isClaimed}`);
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

  /* ── Player markers — the app's TrainerMapPin: presence area glow (the
     privacy halo), avatar on a presence ring, name tag capsule. ── */
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const list = players ?? [];
    const currentIds = new Set(list.map((p) => `tp:${p.user_id}`));

    playerMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        playerMarkersRef.current.delete(id);
      }
    });

    list.forEach((p) => {
      const key = `tp:${p.user_id}`;
      const presence = presenceColor(p);
      const online = presence === NEON;
      const initial = (p.handle ?? '?').slice(0, 1).toUpperCase();
      const s = seed01(p.user_id);
      const bobDur = (2.2 + s * 0.9).toFixed(2);

      const el = document.createElement('div');
      el.style.cssText = 'width:116px;height:118px;';
      el.style.willChange = 'transform';
      const badge = p.is_friend
        ? `<div class="mm-tp-badge">
             <svg width="9" height="9" viewBox="0 0 24 24" fill="#ffd166" aria-hidden="true">
               <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/>
             </svg>
           </div>`
        : online
          ? `<div class="mm-tp-badge"><div style="width:9px;height:9px;border-radius:50%;background:${NEON};"></div></div>`
          : '';
      el.innerHTML = `
        <div class="mm-ws" style="width:116px;height:118px;">
          <div class="mm-tp" style="--presence:${presence};--presence-glow:${hexToRgba(presence, online ? 0.34 : 0.18)};--presence-border:${hexToRgba(presence, 0.5)};">
            <div class="mm-tp-area"></div>
            <div class="mm-tp-shadow"></div>
            <div class="mm-tp-core" style="--bob-dur:${bobDur}s;">
              <div class="mm-tp-avatar">
                ${p.avatar_url ? `<img src="${escHTML(p.avatar_url)}" alt="" draggable="false" />` : initial}
              </div>
              ${badge}
            </div>
            <div class="mm-tp-name">${(p.handle ?? 'trainer').replace(/[<>&"]/g, '')}</div>
          </div>
        </div>
      `;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `Hunter ${p.handle ?? 'anon'}`);
      // .onclick so the update branch below replaces (not stacks) the handler.
      el.onclick = () => onSelectPlayer?.(p);

      const existing = playerMarkersRef.current.get(key);
      if (existing) {
        existing.setLngLat([p.fuzzy_lng, p.fuzzy_lat]);
        existing.getElement().replaceChildren(...Array.from(el.children));
        existing.getElement().onclick = () => onSelectPlayer?.(p);
      } else {
        const m = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([p.fuzzy_lng, p.fuzzy_lat])
          .addTo(map);
        playerMarkersRef.current.set(key, m);
      }
    });
  }, [players, onSelectPlayer]);

  /* ── Wild creature markers (fuzzy search zones) ── */
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

      const fuzzyEl = document.createElement('div');
      const pxRadius = Math.min(280, Math.max(36, metersToPx(s.fuzzy_radius_m, s.fuzzy_lat, map.getZoom()) * 2));
      fuzzyEl.className = 'mm-wild-zone';
      fuzzyEl.style.cssText += `
        width:${pxRadius}px;height:${pxRadius}px;
        background:radial-gradient(circle, ${color}33 0%, ${color}14 55%, transparent 75%);
      `;

      // Mini app-style creature pin over the zone, with the despawn timer tag.
      const art = resolveCreatureArt(s.species, s.rarity, s.id);
      const sprite = art.floating || art.card || s.image_url || '';
      const now = Date.now();
      const expiresAt = new Date(s.expires_at ?? 0).getTime();
      const minsLeft = Math.max(0, Math.floor((expiresAt - now) / 60000));
      const timerColor = minsLeft <= 5 ? '#ff6b6b' : minsLeft <= 15 ? '#ffd166' : NEON;
      const wildEl = document.createElement('div');
      wildEl.style.cssText = 'width:88px;height:98px;cursor:pointer;';
      wildEl.style.willChange = 'transform';
      wildEl.innerHTML = `
        <div class="mm-ws" style="width:88px;height:92px;">
          <div class="mm-cp" style="width:88px;height:92px;">
            ${creaturePinHTML({ id: s.id, tint: color, rarity: s.rarity, sprite, reduce: reducedMotionRef.current })}
            ${s.expires_at ? `<div class="mm-wild-timer" style="--timer-color:${timerColor};--timer-border:${hexToRgba(timerColor, 0.3)};">${minsLeft}m</div>` : ''}
          </div>
        </div>
      `;
      wildEl.setAttribute('role', 'button');
      wildEl.setAttribute('aria-label', `Wild ${s.species}`);
      // .onclick so the update branch below replaces (not stacks) the handler.
      wildEl.onclick = () => onSelectWildSpawn?.(s);

      const fId = `wild-fuzzy:${s.id}`;
      const wId = `wild:${s.id}`;

      const existingF = wildMarkersRef.current.get(fId);
      if (existingF) {
        existingF.setLngLat([s.fuzzy_lng, s.fuzzy_lat]);
        existingF.getElement().style.width = `${pxRadius}px`;
        existingF.getElement().style.height = `${pxRadius}px`;
      } else {
        const m = new mapboxgl.Marker({ element: fuzzyEl, anchor: 'center' })
          .setLngLat([s.fuzzy_lng, s.fuzzy_lat])
          .addTo(map);
        wildMarkersRef.current.set(fId, m);
      }

      const existingW = wildMarkersRef.current.get(wId);
      if (existingW) {
        existingW.setLngLat([s.fuzzy_lng, s.fuzzy_lat]);
        const rootEl = existingW.getElement();
        rootEl.onclick = () => onSelectWildSpawn?.(s);
        // Keep the despawn countdown live — it was baked in at creation.
        const timerEl = rootEl.querySelector('.mm-wild-timer') as HTMLElement | null;
        if (timerEl) {
          timerEl.textContent = `${minsLeft}m`;
          timerEl.style.setProperty('--timer-color', timerColor);
          timerEl.style.setProperty('--timer-border', hexToRgba(timerColor, 0.3));
        }
      } else {
        const m2 = new mapboxgl.Marker({ element: wildEl, anchor: 'center' })
          .setLngLat([s.fuzzy_lng, s.fuzzy_lat])
          .addTo(map);
        wildMarkersRef.current.set(wId, m2);
      }
    });
  }, [wildSpawns, onSelectWildSpawn]);

  /* ── Catchable wild spawns (catch-to-mint, exact GPS) — the app's
     CreatureMapPin, standing on its glowing rarity pad. ── */
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
      const tint = RARITY_TONE[normalRarity(s.tier)] || s.tier_color || NEON;
      const key = `catch:${s.id}`;

      // IDENTITY: resolve through the registry so the map marker matches the
      // creature the AR camera + NFT mint route will show. `floating` is the
      // transparent cutout — the exact art the iOS app renders on its pins.
      const art = resolveByCreatureId(s.creature_id, {
        name: s.name,
        tier: s.tier,
        imageCid: s.image_url,
      });
      const sprite = art.floating || art.card || s.image_url || '';

      const wrap = document.createElement('div');
      wrap.style.cssText = 'width:88px;height:92px;';
      wrap.style.willChange = 'transform';
      wrap.innerHTML = `
        <div class="mm-ws" style="width:88px;height:92px;">
          <div class="mm-cp" style="width:88px;height:92px;">
            ${creaturePinHTML({ id: s.id, tint, rarity: s.tier, sprite, isGenesis: s.is_genesis, reduce: reducedMotionRef.current })}
          </div>
        </div>
      `;
      wrap.setAttribute('role', 'button');
      wrap.setAttribute('aria-label', `Wild ${s.tier} ${s.name}`);
      // .onclick so the update branch below replaces (not stacks) the handler.
      wrap.onclick = () => onSelectCatchable?.(s);

      const existing = catchableMarkersRef.current.get(key);
      if (existing) {
        existing.setLngLat([s.lng, s.lat]);
        existing.getElement().onclick = () => onSelectCatchable?.(s);
      } else {
        const m = new mapboxgl.Marker({ element: wrap, anchor: 'center' })
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
      const wrap = document.createElement('div');
      wrap.style.cssText = 'width:16px;height:16px;display:flex;align-items:center;justify-content:center;';
      wrap.style.willChange = 'transform';
      const dot = document.createElement('div');
      dot.className = 'mm-watcher-dot';
      dot.setAttribute('data-handle', w.handle ? `@${w.handle}` : 'A Watcher');
      wrap.appendChild(dot);

      const existing = watcherMarkersRef.current.get(key);
      if (existing) {
        existing.setLngLat([w.lng, w.lat]);
      } else {
        const m = new mapboxgl.Marker({ element: wrap, anchor: 'center' })
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
      const ageLabel = ageMin === 0 ? 'just now' : `${ageMin} min ago`;
      const handle = g.catcherHandle || 'A Watcher';
      const display = handle === 'A Watcher' ? handle : handle.startsWith('@') ? handle : `@${handle}`;
      const tierColor = RARITY_TONE[normalRarity(g.tier)] || NEON;

      const wrap = document.createElement('div');
      wrap.className = 'mm-ghost-catch';
      wrap.setAttribute('data-label', `${display} caught a ${g.tier} ${ageLabel}`);
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
      const m = new mapboxgl.Marker({ element: wrap, anchor: 'center' })
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
      if (reachMarkerRef.current) {
        reachMarkerRef.current.remove();
        reachMarkerRef.current = null;
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        if (externalMapRef) externalMapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* App-identical top/bottom vignette: black 0.45→0 over 180px on top,
          0→0.35 over 160px at the bottom, so HUD chips stay readable without
          dimming the world. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 180,
          pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0))',
          zIndex: 5,
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 160,
          pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.35))',
          zIndex: 5,
        }}
      />

      {/* Living-approach vignette: green edge glow that intensifies as the
          closest catchable spawn approaches. */}
      <div
        aria-hidden
        className="mm-approach-vignette"
        style={{
          ['--approach-intensity' as unknown as string]: String(
            Math.max(0, Math.min(1, approachIntensity)),
          ),
        }}
      />
    </div>
  );
}

export default React.memo(HuntMap, (prev, next) =>
  prev.orbs === next.orbs &&
  prev.userPosition?.lat === next.userPosition?.lat &&
  prev.userPosition?.lng === next.userPosition?.lng &&
  prev.players === next.players &&
  prev.wildSpawns === next.wildSpawns &&
  prev.catchableSpawns === next.catchableSpawns &&
  prev.watchers === next.watchers &&
  prev.recentCatches === next.recentCatches &&
  prev.approachIntensity === next.approachIntensity
);
