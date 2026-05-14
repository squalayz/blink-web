'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Orb, rarityColor } from '@/lib/theme';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface HuntMapProps {
  orbs: Orb[];
  userPosition: { lat: number; lng: number } | null;
  onSelectOrb: (orb: Orb) => void;
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
.mapboxgl-ctrl-logo { display: none !important; }
.mapboxgl-ctrl-attrib { display: none !important; }
.mapboxgl-ctrl-group { display: none !important; }
`;

export default function HuntMap({ orbs, userPosition, onSelectOrb, mapRef: externalMapRef }: HuntMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hasInitialView = useRef(false);

  /* ── Inject CSS ── */
  useEffect(() => {
    // Custom marker CSS
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
      // BLINK Phase 3: cosmic-night look — dark base, label glow only on key POIs.
      try {
        map.setConfigProperty('basemap', 'lightPreset', 'night');
        map.setConfigProperty('basemap', 'showPointOfInterestLabels', false);
        map.setConfigProperty('basemap', 'showTransitLabels', false);
        map.setConfigProperty('basemap', 'showRoadLabels', false);
        map.setConfigProperty('basemap', 'showPlaceLabels', true);
      } catch {
        // Mapbox Standard style not active — silently fall back to defaults.
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

  /* ── Sync orb markers ── */
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const currentIds = new Set(orbs.map((o) => o.id));

    // Remove stale
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add / update
    orbs.forEach((orb) => {
      const rColor = rarityColor(orb.rarity);
      const isClaimed = orb.status === 'claimed';
      const cfg = orbMarkerConfig(orb.rarity);
      const claimedClass = isClaimed ? ' mm-orb-claimed' : '';

      const el = document.createElement('div');
      el.style.cssText = `position:relative;width:${cfg.ring}px;height:${cfg.ring}px;display:flex;align-items:center;justify-content:center;cursor:pointer;`;
      el.innerHTML = `
        <div
          class="mm-orb-marker${claimedClass}"
          style="
            width:${cfg.size}px;
            height:${cfg.size}px;
            background:radial-gradient(circle at 35% 35%, ${rColor}ee, ${rColor}55);
            border:2px solid ${rColor};
            box-shadow: 0 0 18px ${rColor}aa, 0 0 36px ${rColor}55, inset 0 0 6px ${rColor}55;
            --orb-color:${rColor};
          "
        >
          <div class="mm-orb-iris"></div>
        </div>
        ${!isClaimed ? `
          <div class="mm-orb-sonar" style="width:${cfg.ring}px;height:${cfg.ring}px;--orb-color:${rColor};animation-delay:${cfg.sonarDelay};"></div>
          <div class="mm-orb-sonar" style="width:${cfg.ring}px;height:${cfg.ring}px;--orb-color:${rColor};animation-delay:calc(${cfg.sonarDelay} + 1s);"></div>
        ` : ''}
      `;

      el.addEventListener('click', () => onSelectOrb(orb));

      if (markersRef.current.has(orb.id)) {
        // Update position only
        markersRef.current.get(orb.id)!.setLngLat([orb.longitude, orb.latitude]);
      } else {
        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([orb.longitude, orb.latitude])
          .addTo(map);
        markersRef.current.set(orb.id, marker);
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
    </div>
  );
}
