"use client";

import { useEffect, useRef, useState } from "react";
import { C } from "@/lib/theme";

/* Leaflet is loaded only in the browser */
export default function PlacementMap({
  onCenterChange,
}: {
  onCenterChange: (lat: number, lng: number) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mapRef.current) return; // already initialised

    let cancelled = false;

    async function init() {
      try {
        const L = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css" as any);

        if (cancelled || !mapContainerRef.current) return;

        /* Get initial coords via GPS, fall back to NYC */
        const getInitCoords = (): Promise<{ lat: number; lng: number }> =>
          new Promise((resolve) => {
            if (!navigator.geolocation) {
              resolve({ lat: 40.7128, lng: -74.006 });
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => resolve({ lat: 40.7128, lng: -74.006 }),
              { enableHighAccuracy: true, timeout: 8000 }
            );
          });

        const { lat, lng } = await getInitCoords();
        if (cancelled || !mapContainerRef.current) return;

        const map = L.map(mapContainerRef.current, {
          center: [lat, lng],
          zoom: 17,
          zoomControl: true,
          attributionControl: false,
        });

        /* Dark tile layer matching hunt map */
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          { subdomains: "abcd", maxZoom: 20 }
        ).addTo(map);

        /* Report center on every move */
        const reportCenter = () => {
          const c = map.getCenter();
          onCenterChange(+c.lat.toFixed(6), +c.lng.toFixed(6));
        };

        map.on("move", reportCenter);
        map.on("moveend", reportCenter);
        reportCenter(); // initial

        mapRef.current = map;
        setReady(true);
      } catch (e) {
        console.error("PlacementMap init error", e);
        if (!cancelled) setError("Map failed to load. Please try again.");
      }
    }

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div style={{
        width: "100%", height: "100%",
        background: C.surface,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: C.muted, fontSize: 14, borderRadius: 16,
      }}>
        {error}
      </div>
    );
  }

  return (
    <>
      <style>{`
        .leaflet-container { background: ${C.bg}; }
        .leaflet-control-zoom a {
          background: ${C.card} !important;
          color: ${C.text} !important;
          border-color: #2a2a3a !important;
        }
        .leaflet-control-zoom a:hover {
          background: ${C.surface} !important;
        }
      `}</style>
      <div
        ref={mapContainerRef}
        style={{ width: "100%", height: "100%", borderRadius: 16 }}
      />
      {!ready && (
        <div style={{
          position: "absolute", inset: 0,
          background: C.surface,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: C.muted, fontSize: 14, borderRadius: 16,
          zIndex: 10,
        }}>
          Loading map...
        </div>
      )}
    </>
  );
}
