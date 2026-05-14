'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';
import { useIsDesktop } from '@/hooks/useIsDesktop';

interface VirtualLocation {
  user_id: string;
  latitude: number;
  longitude: number;
  city: string | null;
  country: string | null;
  set_at: string | null;
  last_location_lat: number | null;
  last_location_lng: number | null;
  last_hop_at: string | null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PAGE_CSS = `
@keyframes travelFadeIn {
  0% { opacity: 0; transform: translateY(12px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes travelPulse {
  0%, 100% { box-shadow: 0 0 12px ${C.primary}44; }
  50% { box-shadow: 0 0 24px ${C.primary}88; }
}
@keyframes travelGlow {
  0%, 100% { box-shadow: 0 0 8px ${C.accent}33; }
  50% { box-shadow: 0 0 20px ${C.accent}66; }
}
.leaflet-container { background: ${C.bg} !important; }
`;

export default function TravelPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [currentLocation, setCurrentLocation] = useState<VirtualLocation | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [hopping, setHopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const currentMarkerRef = useRef<any>(null);
  const selectedMarkerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const { isDesktop } = useIsDesktop();

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/signin');
    }
  }, [authLoading, user, router]);

  // Fetch current virtual location
  const fetchCurrentLocation = useCallback(async () => {
    if (!user) return;
    setLoadingLocation(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('virtual_locations')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchErr && fetchErr.code !== 'PGRST116') {
        console.error('Fetch location error:', fetchErr);
      }
      if (data) {
        setCurrentLocation(data as VirtualLocation);
      } else {
        setCurrentLocation(null);
      }
    } catch (e) {
      console.error('Error fetching virtual location:', e);
    } finally {
      setLoadingLocation(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchCurrentLocation();
  }, [user, fetchCurrentLocation]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    const loadLeaflet = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      leafletRef.current = L;

      const map = L.map(mapRef.current!, {
        center: [20, 0],
        zoom: 2,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      leafletMapRef.current = map;

      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        setSelectedLat(lat);
        setSelectedLng(lng);
        setError(null);
        setSuccess(null);

        // Place or move selected marker
        if (selectedMarkerRef.current) {
          selectedMarkerRef.current.setLatLng([lat, lng]);
        } else {
          const selectedIcon = L.divIcon({
            className: '',
            html: `<div style="
              width: 20px; height: 20px; border-radius: 50%;
              background: ${C.accent}; border: 3px solid ${C.text};
              box-shadow: 0 0 12px ${C.accent}88;
            "></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });
          selectedMarkerRef.current = L.marker([lat, lng], { icon: selectedIcon }).addTo(map);
        }

        // Reverse geocode
        reverseGeocode(lat, lng);
      });
    };

    loadLeaflet();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update current location marker when location changes
  useEffect(() => {
    if (!leafletMapRef.current || !leafletRef.current || !currentLocation) return;
    const L = leafletRef.current;

    if (currentMarkerRef.current) {
      currentMarkerRef.current.setLatLng([currentLocation.latitude, currentLocation.longitude]);
    } else {
      const currentIcon = L.divIcon({
        className: '',
        html: `<div style="
          width: 24px; height: 24px; border-radius: 50%;
          background: ${C.primary}; border: 3px solid ${C.text};
          box-shadow: 0 0 16px ${C.primary}88;
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      currentMarkerRef.current = L.marker(
        [currentLocation.latitude, currentLocation.longitude],
        { icon: currentIcon }
      ).addTo(leafletMapRef.current);
    }

    leafletMapRef.current.setView(
      [currentLocation.latitude, currentLocation.longitude],
      5,
      { animate: true }
    );
  }, [currentLocation]);

  const reverseGeocode = async (lat: number, lng: number) => {
    setGeocoding(true);
    setSelectedCity('');
    setSelectedCountry('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const city =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        '';
      const country = data.address?.country || '';
      setSelectedCity(city);
      setSelectedCountry(country);
    } catch {
      setSelectedCity('');
      setSelectedCountry('');
    } finally {
      setGeocoding(false);
    }
  };

  const handleHop = async () => {
    if (!user || selectedLat === null || selectedLng === null) return;
    setError(null);
    setSuccess(null);
    setHopping(true);

    try {
      const now = new Date();

      // Velocity check
      if (currentLocation && currentLocation.last_hop_at) {
        const lastHop = new Date(currentLocation.last_hop_at);
        const hoursSinceHop = (now.getTime() - lastHop.getTime()) / (1000 * 60 * 60);

        // Minimum 6h between any hops
        if (hoursSinceHop < 6) {
          const remainingHours = Math.ceil((6 - hoursSinceHop) * 10) / 10;
          setError(
            `Too fast! Minimum 6 hours between hops. Try again in ${remainingHours} hours.`
          );
          setHopping(false);
          return;
        }

        const distance = haversineKm(
          currentLocation.latitude,
          currentLocation.longitude,
          selectedLat,
          selectedLng
        );

        // Must be >100km from last location
        if (distance <= 100) {
          setError('New location must be more than 100km from your current virtual location.');
          setHopping(false);
          return;
        }

        // Speed check: 900 km/h max
        const minTravelHours = distance / 900;
        if (hoursSinceHop < minTravelHours) {
          const waitHours = Math.ceil((minTravelHours - hoursSinceHop) * 10) / 10;
          setError(
            `Too fast! You could not have traveled this distance yet. Try again in ${waitHours} hours.`
          );
          setHopping(false);
          return;
        }
      }

      // Perform the upsert
      const { error: upsertErr } = await supabase.from('virtual_locations').upsert(
        {
          user_id: user.id,
          latitude: selectedLat,
          longitude: selectedLng,
          city: selectedCity || null,
          country: selectedCountry || null,
          set_at: now.toISOString(),
          last_location_lat: currentLocation?.latitude ?? null,
          last_location_lng: currentLocation?.longitude ?? null,
          last_hop_at: now.toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (upsertErr) {
        setError(upsertErr.message);
        setHopping(false);
        return;
      }

      const locationLabel = [selectedCity, selectedCountry].filter(Boolean).join(', ') || `${selectedLat.toFixed(2)}, ${selectedLng.toFixed(2)}`;
      setSuccess(`Hopped to ${locationLabel}!`);

      // Clear selected marker
      if (selectedMarkerRef.current && leafletMapRef.current) {
        leafletMapRef.current.removeLayer(selectedMarkerRef.current);
        selectedMarkerRef.current = null;
      }
      setSelectedLat(null);
      setSelectedLng(null);
      setSelectedCity('');
      setSelectedCountry('');

      // Refresh current location
      await fetchCurrentLocation();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setHopping(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: C.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: C.muted, fontSize: 16 }}>Loading...</div>
      </div>
    );
  }

  const locationLabel = currentLocation
    ? [currentLocation.city, currentLocation.country].filter(Boolean).join(', ') ||
      `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
    : null;

  const selectedLabel = geocoding
    ? 'Looking up location...'
    : [selectedCity, selectedCountry].filter(Boolean).join(', ') ||
      (selectedLat !== null
        ? `${selectedLat.toFixed(4)}, ${selectedLng!.toFixed(4)}`
        : '');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        paddingBottom: 120,
      }}
    >
      <style>{PAGE_CSS}</style>

      {/* Header */}
      <div
        style={{
          padding: isDesktop ? '20px 32px 0' : '20px 20px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          maxWidth: isDesktop ? 1200 : undefined,
          margin: isDesktop ? '0 auto' : undefined,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            color: C.muted,
            fontSize: 24,
            cursor: 'pointer',
            padding: 4,
          }}
          aria-label="Go back"
        >
          &#8592;
        </button>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            margin: 0,
            background: `linear-gradient(135deg, ${C.primary}, ${C.cyan})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Virtual Travel
        </h1>
      </div>

      {/* Main content area */}
      <div
        style={{
          display: 'flex',
          flexDirection: isDesktop ? 'row' : 'column',
          gap: isDesktop ? 24 : 0,
          padding: isDesktop ? '16px 32px' : 0,
          maxWidth: isDesktop ? 1200 : undefined,
          margin: isDesktop ? '0 auto' : undefined,
        }}
      >
        {/* Left column: Map */}
        <div
          style={{
            flex: isDesktop ? 1.5 : undefined,
            minWidth: 0,
          }}
        >
          {/* Map */}
          <div
            style={{
              margin: isDesktop ? 0 : '12px 20px',
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${C.glassBorder}`,
              position: isDesktop ? 'sticky' : 'relative',
              top: isDesktop ? 80 : undefined,
            }}
          >
            <div
              ref={mapRef}
              style={{
                width: '100%',
                height: isDesktop ? 'calc(100vh - 120px)' : 380,
                background: C.surface,
              }}
            />
          </div>
        </div>

        {/* Right column: Panels */}
        <div
          style={{
            flex: isDesktop ? 1 : undefined,
            minWidth: 0,
          }}
        >
          {/* Current location info panel */}
          {!loadingLocation && currentLocation && (
            <div
              style={{
                margin: isDesktop ? '0 0 16px' : '16px 20px',
                padding: 16,
                background: C.glass,
                border: `1px solid ${C.glassBorder}`,
                borderRadius: 16,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                animation: 'travelFadeIn 0.4s ease-out',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.muted,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                Current Virtual Location
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                {locationLabel}
              </div>
              <div style={{ fontSize: 13, color: C.muted }}>
                {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
              </div>
              {currentLocation.set_at && (
                <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
                  Set {new Date(currentLocation.set_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}
            </div>
          )}

          {!loadingLocation && !currentLocation && (
            <div
              style={{
                margin: isDesktop ? '0 0 16px' : '16px 20px',
                padding: 16,
                background: C.glass,
                border: `1px solid ${C.glassBorder}`,
                borderRadius: 16,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                animation: 'travelFadeIn 0.4s ease-out',
              }}
            >
              <div style={{ fontSize: 14, color: C.muted }}>
                No virtual location set. Tap anywhere on the map to choose your first destination.
              </div>
            </div>
          )}

          {/* Selected location panel */}
          {selectedLat !== null && (
            <div
              style={{
                margin: isDesktop ? '0 0 16px' : '12px 20px',
                padding: 16,
                background: C.glass,
                border: `1px solid ${C.accent}33`,
                borderRadius: 16,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                animation: 'travelFadeIn 0.3s ease-out',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.accent,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                Selected Destination
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                {selectedLabel}
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>
                {selectedLat.toFixed(4)}, {selectedLng!.toFixed(4)}
              </div>
              {currentLocation && (
                <div style={{ fontSize: 13, color: C.muted }}>
                  Distance:{' '}
                  {haversineKm(
                    currentLocation.latitude,
                    currentLocation.longitude,
                    selectedLat,
                    selectedLng!
                  ).toFixed(0)}{' '}
                  km from current location
                </div>
              )}

              {/* Hop button */}
              <button
                onClick={handleHop}
                disabled={hopping || geocoding}
                style={{
                  marginTop: 14,
                  width: '100%',
                  padding: '14px 0',
                  background: hopping
                    ? C.s2
                    : `linear-gradient(135deg, ${C.primary}, ${C.indigo})`,
                  color: C.text,
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: hopping ? 'not-allowed' : 'pointer',
                  opacity: hopping ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {hopping ? 'Traveling...' : 'Hop Here'}
              </button>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div
              style={{
                margin: isDesktop ? '0 0 16px' : '12px 20px',
                padding: 14,
                background: `${C.danger}15`,
                border: `1px solid ${C.danger}44`,
                borderRadius: 12,
                color: C.danger,
                fontSize: 14,
                lineHeight: 1.5,
                animation: 'travelFadeIn 0.3s ease-out',
              }}
            >
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div
              style={{
                margin: isDesktop ? '0 0 16px' : '12px 20px',
                padding: 14,
                background: `${C.accent}15`,
                border: `1px solid ${C.accent}44`,
                borderRadius: 12,
                color: C.accent,
                fontSize: 14,
                fontWeight: 600,
                animation: 'travelGlow 2s ease-in-out infinite',
              }}
            >
              {success}
            </div>
          )}

          {/* Info section */}
          <div
            style={{
              margin: isDesktop ? '0' : '20px 20px 0',
              padding: 16,
              background: C.glass,
              border: `1px solid ${C.glassBorder}`,
              borderRadius: 16,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: C.text,
                marginBottom: 10,
              }}
            >
              Travel Rules
            </div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
              <div style={{ marginBottom: 6 }}>
                -- Minimum 6 hours between hops
              </div>
              <div style={{ marginBottom: 6 }}>
                -- New location must be over 100km away
              </div>
              <div style={{ marginBottom: 6 }}>
                -- Max travel speed: 900 km/h (commercial flight)
              </div>
              <div>
                -- First hop has no restrictions
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
