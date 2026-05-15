'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Orb, rarityColor } from '@/lib/theme';
import { sounds } from '@/lib/sounds';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export type HuntTier = 'far' | 'medium' | 'close' | 'catchable';

export type HuntOrb = Orb & {
  tier?: HuntTier;
  distanceM?: number;
  bearingDeg?: number;
  creatureImage?: string | null;
};

interface HuntMapProps {
  orbs: HuntOrb[];
  userPosition: { lat: number; lng: number } | null;
  onSelectOrb: (orb: HuntOrb) => void;
  mapRef?: React.MutableRefObject<mapboxgl.Map | null>;
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
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,255,136,0.0); }
  50% { transform: scale(1.06); box-shadow: 0 0 22px 6px rgba(0,255,136,0.5); }
}
@keyframes mmMediumDrift {
  0%, 100% { opacity: 0.32; }
  50% { opacity: 0.55; }
}
@keyframes mmEdgePulse {
  0%, 100% { opacity: 0.35; transform: translate(0,0) scale(1); }
  50% { opacity: 0.85; transform: translate(0,0) scale(1.08); }
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
.mapboxgl-ctrl-logo { display: none !important; }
.mapboxgl-ctrl-attrib { display: none !important; }
.mapboxgl-ctrl-group { display: none !important; }
`;

function silhouetteSvg(rColor: string): string {
  return `
    <svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <ellipse cx="14" cy="14" rx="11" ry="7" fill="${rColor}" opacity="0.55"/>
      <circle cx="14" cy="14" r="3" fill="#0a0a0f"/>
      <circle cx="14" cy="14" r="1.3" fill="#FFFFFF"/>
    </svg>
  `;
}

export default function HuntMap({ orbs, userPosition, onSelectOrb, mapRef: externalMapRef }: HuntMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hasInitialView = useRef(false);
  const spottedIdsRef = useRef<Set<string>>(new Set());
  const lastSpottedAtRef = useRef<number>(0);
  const nearbyIdsRef = useRef<Set<string>>(new Set());
  const lastNearbyAtRef = useRef<number>(0);

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

    const center: [number, number] = userPosition
      ? [userPosition.lng, userPosition.lat]
      : [-74.006, 40.7128];

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/standard',
      pitch: 45,
      bearing: 0,
      center,
      zoom: 15,
      attributionControl: false,
      logoPosition: 'bottom-left',
    });

    map.on('style.load', () => {
      try {
        map.setConfigProperty('basemap', 'lightPreset', 'night');
        map.setConfigProperty('basemap', 'showPointOfInterestLabels', false);
        map.setConfigProperty('basemap', 'showTransitLabels', false);
        map.setConfigProperty('basemap', 'showRoadLabels', false);
        map.setConfigProperty('basemap', 'showPlaceLabels', true);
      } catch {
        /* style not active — fall back */
      }
    });

    mapRef.current = map;
    if (externalMapRef) externalMapRef.current = map;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── User marker ── */
  useEffect(() => {
    if (!mapRef.current || !userPosition) return;

    const el = document.createElement('div');
    el.style.cssText = 'position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;';
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
      mapRef.current.flyTo({ center: [userPosition.lng, userPosition.lat], zoom: 15, duration: 800 });
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

    // Spawns that should render a marker (medium / close / catchable). Far
    // spawns are intentionally hidden — only the compass + edge pulse hint
    // at them, matching Pokemon-GO's distance haze.
    const visibleOrbs = orbs.filter((o) => o.tier && o.tier !== 'far');
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
      el.setAttribute('data-tier', tier);

      if (tier === 'medium') {
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
        el.innerHTML = `
          <div
            class="mm-orb-marker${claimedClass}"
            style="
              width:${cfg.size}px;
              height:${cfg.size}px;
              background:radial-gradient(circle at 35% 35%, ${rColor}cc, ${rColor}33);
              border:2px solid ${rColor};
              box-shadow: 0 0 14px ${rColor}88, inset 0 0 6px ${rColor}55;
              --orb-color:${rColor};
            "
          >
            ${silhouetteSvg(rColor)}
          </div>
          ${!isClaimed ? `<div class="mm-orb-sonar" style="width:${cfg.ring}px;height:${cfg.ring}px;--orb-color:${rColor};"></div>` : ''}
        `;
      } else {
        // catchable
        const cfg = orbMarkerConfig(orb.rarity);
        const img = orb.creatureImage;
        el.style.width = `${cfg.ring}px`;
        el.style.height = `${cfg.ring}px`;
        el.innerHTML = `
          <div class="mm-catchable-ring"></div>
          <div
            class="mm-orb-marker${claimedClass}"
            style="
              width:${cfg.size + 6}px;
              height:${cfg.size + 6}px;
              background:radial-gradient(circle at 35% 35%, ${rColor}ee, ${rColor}55);
              border:2px solid ${rColor};
              box-shadow: 0 0 24px ${rColor}aa, 0 0 56px ${rColor}55, inset 0 0 8px ${rColor}aa;
              --orb-color:${rColor};
              overflow:hidden;
            "
          >
            ${
              img
                ? `<img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />`
                : `<div class="mm-orb-iris"></div>`
            }
          </div>
          ${!isClaimed ? `<div class="mm-orb-sonar" style="width:${cfg.ring}px;height:${cfg.ring}px;--orb-color:${rColor};"></div>` : ''}
        `;
      }

      el.addEventListener('click', () => onSelectOrb(orb));

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

  /* ── Cleanup ── */
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      if (mapRef.current) {
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
          background: '#0a0a0f',
          filter: 'saturate(0.55) brightness(0.7) contrast(1.15) hue-rotate(95deg)',
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

      {/* Edge pulses — one chevron per cardinal sector for far spawns */}
      <EdgePulses farOrbs={farOrbs} />
    </div>
  );
}

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
