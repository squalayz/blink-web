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
  if (rarity === 'Legendary') return { size: 28, ring: 44, sonarDelay: '0s' };
  if (rarity === 'Rare') return { size: 22, ring: 36, sonarDelay: '0.3s' };
  return { size: 16, ring: 28, sonarDelay: '0.6s' };
}

const HUNT_CSS = `
@keyframes mmOrbPulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.85; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes mmSonarRing {
  0% { transform: translate(-50%,-50%) scale(0.5); opacity: 0.7; }
  100% { transform: translate(-50%,-50%) scale(2.5); opacity: 0; }
}
@keyframes mmUserPulse {
  0% { box-shadow: 0 0 0 0 rgba(20,241,149,0.6); }
  70% { box-shadow: 0 0 0 16px rgba(20,241,149,0); }
  100% { box-shadow: 0 0 0 0 rgba(20,241,149,0); }
}
@keyframes mmUserSonar {
  0% { transform: translate(-50%,-50%) scale(0.5); opacity: 0.5; }
  100% { transform: translate(-50%,-50%) scale(3); opacity: 0; }
}
.mm-orb-marker {
  border-radius: 50%;
  animation: mmOrbPulse 2.4s ease-in-out infinite;
  cursor: pointer;
  position: relative;
  z-index: 10;
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
.mm-user-dot {
  border-radius: 50%;
  background: #14F195;
  border: 2.5px solid #fff;
  animation: mmUserPulse 1.8s ease-in-out infinite;
  position: relative;
  z-index: 20;
}
.mm-user-sonar {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1.5px solid rgba(20,241,149,0.4);
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
      // Set dusk lighting — dark sky, lit buildings, colored streets
      map.setConfigProperty('basemap', 'lightPreset', 'dusk');
      map.setConfigProperty('basemap', 'showPointOfInterestLabels', true);
      map.setConfigProperty('basemap', 'showTransitLabels', true);
    });

    mapRef.current = map;
    if (externalMapRef) externalMapRef.current = map;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── User marker ── */
  useEffect(() => {
    if (!mapRef.current || !userPosition) return;

    const el = document.createElement('div');
    el.style.cssText = 'position:relative;width:18px;height:18px;';
    el.innerHTML = `
      <div class="mm-user-dot" style="width:18px;height:18px;"></div>
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
            box-shadow: 0 0 16px ${rColor}88, 0 0 32px ${rColor}44;
            --orb-color:${rColor};
          "
        ></div>
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
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        background: '#0a0a0f',
      }}
    />
  );
}
