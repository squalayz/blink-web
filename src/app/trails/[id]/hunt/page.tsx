'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { C } from '@/lib/theme';
import { useAuth } from '@/components/providers';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { supabase } from '@/lib/supabase';

interface TrailOrb {
  id: string;
  trail_id: string;
  orb_id: string;
  position: number;
  clue_text: string;
  hint_image_url: string | null;
  hint_audio_url: string | null;
  hint_unlocked_after_minutes: number;
  is_finale: boolean;
}

interface TrailProgress {
  id: string;
  trail_id: string;
  current_position: number;
  orbs_cracked: number;
  started_at: string;
  completed_at: string | null;
}

interface OrbRow {
  id: string;
  lat: number;
  lng: number;
}

const HUNT_CSS = `
@keyframes huntSlideUp {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes compassSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(0,255,136,0.3); }
  50% { box-shadow: 0 0 40px rgba(0,255,136,0.6); }
}
@keyframes closeGlow {
  0%, 100% { box-shadow: 0 0 20px rgba(0,255,136,0.4); }
  50% { box-shadow: 0 0 40px rgba(0,255,136,0.8); }
}
`;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x = Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) - Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export default function TrailHuntPage() {
  const params = useParams();
  const router = useRouter();
  const trailId = params.id as string;
  const { user, session } = useAuth();
  const { isDesktop } = useIsDesktop();

  const [trail, setTrail] = useState<{ title: string; orb_count: number } | null>(null);
  const [progress, setProgress] = useState<TrailProgress | null>(null);
  const [currentOrb, setCurrentOrb] = useState<TrailOrb | null>(null);
  const [orbLocation, setOrbLocation] = useState<OrbRow | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [bearing, setBearing] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hintData, setHintData] = useState<{ hint_image_url: string | null; hint_audio_url: string | null } | null>(null);
  const [buyingHint, setBuyingHint] = useState(false);
  const [cracking, setCracking] = useState(false);

  // Load trail and progress
  useEffect(() => {
    async function load() {
      try {
        // Get trail info
        const { data: trailData } = await supabase
          .from('trails')
          .select('title, orb_count')
          .eq('id', trailId)
          .single();
        if (trailData) setTrail(trailData);

        // Get progress
        if (!user) return;
        const { data: prog } = await supabase
          .from('trail_progress')
          .select('*')
          .eq('trail_id', trailId)
          .eq('user_id', user.id)
          .single();

        if (!prog) {
          setError('Trail not started. Go back and start the watch first.');
          setLoading(false);
          return;
        }
        setProgress(prog);

        if (prog.completed_at) {
          router.push(`/trails/${trailId}/passport`);
          return;
        }

        // Get current trail orb
        const { data: tOrb } = await supabase
          .from('trail_orbs')
          .select('*')
          .eq('trail_id', trailId)
          .eq('position', prog.current_position)
          .single();
        if (tOrb) {
          setCurrentOrb(tOrb);
          // Get orb location
          const { data: orbRow } = await supabase
            .from('orbs')
            .select('id, lat, lng')
            .eq('id', tOrb.orb_id)
            .single();
          if (orbRow) setOrbLocation(orbRow);
        }

        // Check if hint already purchased
        if (tOrb) {
          const { data: hintPurchase } = await supabase
            .from('trail_hint_purchases')
            .select('id')
            .eq('trail_orb_id', tOrb.id)
            .eq('user_id', user.id)
            .single();
          if (hintPurchase) {
            setHintData({
              hint_image_url: tOrb.hint_image_url,
              hint_audio_url: tOrb.hint_audio_url,
            });
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [trailId, user, router]);

  // GPS watch
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Calculate distance and bearing
  useEffect(() => {
    if (!userPos || !orbLocation) return;
    const d = haversineMeters(userPos.lat, userPos.lng, orbLocation.lat, orbLocation.lng);
    setDistance(d);
    setBearing(bearingDeg(userPos.lat, userPos.lng, orbLocation.lat, orbLocation.lng));
  }, [userPos, orbLocation]);

  const isClose = distance !== null && distance <= 50;

  const handleBuyHint = useCallback(async () => {
    if (!currentOrb || !session) return;
    setBuyingHint(true);
    try {
      const res = await fetch('/api/trails/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ trail_orb_id: currentOrb.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHintData({ hint_image_url: data.hint_image_url, hint_audio_url: data.hint_audio_url });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to purchase hint');
    } finally {
      setBuyingHint(false);
    }
  }, [currentOrb, session]);

  const handleCrack = useCallback(async () => {
    if (!currentOrb || !session) return;
    setCracking(true);
    try {
      const res = await fetch('/api/trails/crack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ trail_id: trailId, orb_id: currentOrb.orb_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.completed) {
        router.push(`/trails/${trailId}/passport`);
      } else {
        // Load next orb
        setProgress(data.progress);
        setCurrentOrb(data.nextOrb);
        setHintData(null);
        if (data.nextOrb) {
          const { data: orbRow } = await supabase
            .from('orbs')
            .select('id, lat, lng')
            .eq('id', data.nextOrb.orb_id)
            .single();
          if (orbRow) setOrbLocation(orbRow);
        }
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to catch');
    } finally {
      setCracking(false);
    }
  }, [currentOrb, session, trailId, router]);

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: C.bg, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.muted }}>Loading watch...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: C.bg, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ color: C.danger }}>{error}</div>
        <button onClick={() => router.push(`/trails/${trailId}`)} style={{ color: C.indigo, background: 'none', border: 'none', cursor: 'pointer' }}>Back to Trail</button>
      </div>
    );
  }

  const orbCount = trail?.orb_count ?? 0;
  const pos = progress?.current_position ?? 1;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: `radial-gradient(ellipse at center, ${C.indigo}15 0%, ${C.bg} 70%)`,
      color: C.text,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style>{HUNT_CSS}</style>

      {/* Top bar */}
      <div style={{
        padding: '52px 16px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(10,10,15,0.7)',
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${C.border}`,
        zIndex: 10,
      }}>
        <button
          onClick={() => router.push(`/trails/${trailId}`)}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            color: C.text,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{ flex: 1, fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {trail?.title}
        </div>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: orbCount }).map((_, i) => (
            <div key={i} style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: i < (progress?.orbs_cracked ?? 0) ? C.accent : i === pos - 1 ? C.indigo : 'rgba(255,255,255,0.15)',
              border: i === pos - 1 ? `2px solid ${C.indigo}` : 'none',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
      </div>

      {/* Center area — compass / distance */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        {/* Compass arrow */}
        {userPos && orbLocation && (
          <div style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'rgba(10,10,15,0.7)',
            backdropFilter: 'blur(16px)',
            border: `2px solid ${isClose ? C.accent : C.indigo}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: isClose ? 'closeGlow 1.5s ease-in-out infinite' : 'glowPulse 2s ease-in-out infinite',
          }}>
            <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: `rotate(${bearing}deg)`, transition: 'transform 0.5s ease' }}>
              <polygon points="20,4 26,28 20,24 14,28" fill={isClose ? C.accent : C.indigo} />
            </svg>
          </div>
        )}

        {/* Distance */}
        {distance !== null && (
          <div style={{ fontSize: 24, fontWeight: 700, color: isClose ? C.accent : C.text }}>
            {distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`}
          </div>
        )}
        {!userPos && (
          <div style={{ fontSize: 14, color: C.muted }}>Enable GPS to see distance</div>
        )}
      </div>

      {/* Bottom glass card */}
      <div style={{
        margin: isDesktop ? '0 auto 32px' : '0 16px 32px',
        ...(isDesktop ? { maxWidth: 480 } : {}),
        padding: 20,
        borderRadius: 20,
        background: 'rgba(10,10,15,0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${C.border}`,
        animation: 'huntSlideUp 0.5s ease-out',
      }}>
        {/* Orb label */}
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Creature {pos} of {orbCount}
        </div>

        {/* Clue text */}
        <div style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', lineHeight: 1.5, marginBottom: 16 }}>
          &ldquo;{currentOrb?.clue_text}&rdquo;
        </div>

        {/* Hint section */}
        {currentOrb && !hintData && (currentOrb.hint_image_url || currentOrb.hint_audio_url) && (
          <button
            onClick={handleBuyHint}
            disabled={buyingHint}
            style={{
              width: '100%',
              padding: '10px 0',
              borderRadius: 10,
              border: `1px solid ${C.gold}44`,
              background: 'rgba(245,158,11,0.08)',
              color: C.gold,
              fontSize: 13,
              fontWeight: 600,
              cursor: buyingHint ? 'not-allowed' : 'pointer',
              marginBottom: 12,
            }}
          >
            {buyingHint ? 'Purchasing...' : 'Buy Hint'}
          </button>
        )}

        {/* Show hint */}
        {hintData && (
          <div style={{ marginBottom: 12 }}>
            {hintData.hint_image_url && (
              <img src={hintData.hint_image_url} alt="Hint" style={{ width: '100%', borderRadius: 10, marginBottom: 8 }} />
            )}
            {hintData.hint_audio_url && (
              <audio controls src={hintData.hint_audio_url} style={{ width: '100%' }} />
            )}
          </div>
        )}

        {/* Crack button */}
        {isClose && (
          <button
            onClick={handleCrack}
            disabled={cracking}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 14,
              border: 'none',
              background: `linear-gradient(135deg, ${C.accent}, ${C.indigo})`,
              color: '#000',
              fontSize: 16,
              fontWeight: 800,
              cursor: cracking ? 'not-allowed' : 'pointer',
              animation: 'closeGlow 1.5s ease-in-out infinite',
            }}
          >
            {cracking ? 'Catching...' : "You're close! Tap to Catch"}
          </button>
        )}

        {/* Passport link */}
        <button
          onClick={() => router.push(`/trails/${trailId}/passport`)}
          style={{
            width: '100%',
            padding: '10px 0',
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            background: 'transparent',
            color: C.muted,
            fontSize: 13,
            cursor: 'pointer',
            marginTop: 10,
          }}
        >
          Trail Passport
        </button>
      </div>
    </div>
  );
}
