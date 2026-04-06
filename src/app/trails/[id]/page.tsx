'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { C } from '@/lib/theme';
import { useAuth } from '@/components/providers';
import { supabase } from '@/lib/supabase';

interface TrailCreator {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
}

interface TrailOrb {
  id: string;
  trail_id: string;
  position: number;
  clue_text: string;
  hint_image_url: string | null;
  hint_audio_url: string | null;
  is_finale: boolean;
}

interface Completion {
  id: string;
  finish_rank: number;
  completion_time_seconds: number | null;
  user: {
    id: string;
    handle: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

interface Trail {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  creator_id: string;
  creator: TrailCreator | null;
  total_value: number;
  currency: string;
  orb_count: number;
  status: string;
  time_limit_hours: number | null;
  is_sponsored: boolean;
  brand_name: string | null;
  brand_logo_url: string | null;
  brand_color: string | null;
  brand_cta_url: string | null;
  brand_cta_text: string | null;
  started_count: number;
  completed_count: number;
}

interface TrailProgress {
  id: string;
  current_position: number;
  orbs_cracked: number;
  completed_at: string | null;
}

const DETAIL_CSS = `
@keyframes detailFadeIn {
  0% { opacity: 0; transform: translateY(12px); }
  100% { opacity: 1; transform: translateY(0); }
}
`;

export default function TrailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const trailId = params.id as string;
  const { user, session } = useAuth();

  const [trail, setTrail] = useState<Trail | null>(null);
  const [orbs, setOrbs] = useState<TrailOrb[]>([]);
  const [topCompletions, setTopCompletions] = useState<Completion[]>([]);
  const [progress, setProgress] = useState<TrailProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrail() {
      try {
        const res = await fetch(`/api/trails/${trailId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Not found');
        setTrail(data.trail);
        setOrbs(data.orbs ?? []);
        setTopCompletions(data.topCompletions ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchTrail();
  }, [trailId]);

  // Check if user has existing progress
  useEffect(() => {
    if (!user) return;
    supabase
      .from('trail_progress')
      .select('*')
      .eq('trail_id', trailId)
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setProgress(data);
      });
  }, [user, trailId]);

  async function handleStart() {
    if (!user || !session) {
      router.push(`/auth/signin?redirect=${encodeURIComponent(`/trails/${trailId}`)}`);
      return;
    }
    setStarting(true);
    try {
      const res = await fetch('/api/trails/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ trail_id: trailId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start');
      setProgress(data.progress);
      router.push(`/trails/${trailId}/hunt`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start');
    } finally {
      setStarting(false);
    }
  }

  function formatTime(seconds: number | null): string {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.muted }}>Loading trail...</div>
      </div>
    );
  }

  if (error || !trail) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ color: C.danger }}>{error || 'Trail not found'}</div>
        <button onClick={() => router.push('/trails')} style={{ color: C.indigo, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>Back to Trails</button>
      </div>
    );
  }

  const creator = trail.creator as TrailCreator | null;
  const hasStarted = !!progress;
  const isCompleted = !!progress?.completed_at;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <style>{DETAIL_CSS}</style>

      {/* Cover image */}
      <div style={{
        height: 260,
        background: trail.cover_image_url
          ? `url(${trail.cover_image_url}) center/cover`
          : `linear-gradient(135deg, ${C.indigo}66, ${C.primary}66)`,
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 30%, rgba(10,10,15,0.95))' }} />

        {/* Back button */}
        <button
          onClick={() => router.push('/trails')}
          style={{
            position: 'absolute',
            top: 52,
            left: 16,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(10,10,15,0.6)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${C.border}`,
            color: C.text,
            fontSize: 18,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '0 20px 100px', marginTop: -60, position: 'relative', zIndex: 5, animation: 'detailFadeIn 0.5s ease-out' }}>
        {/* Title */}
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{trail.title}</h1>

        {/* Creator */}
        {creator && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: creator.avatar_url ? `url(${creator.avatar_url}) center/cover` : C.s2,
            }} />
            <span style={{ fontSize: 14, color: C.muted }}>by @{creator.handle}</span>
          </div>
        )}

        {/* Sponsored banner */}
        {trail.is_sponsored && trail.brand_name && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 12,
            background: trail.brand_color ? `${trail.brand_color}18` : 'rgba(99,102,241,0.1)',
            border: `1px solid ${trail.brand_color || C.indigo}44`,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            {trail.brand_logo_url && (
              <img src={trail.brand_logo_url} alt="" style={{ width: 24, height: 24, borderRadius: 6 }} />
            )}
            <span style={{ fontSize: 13, color: C.text }}>Sponsored by {trail.brand_name}</span>
            {trail.brand_cta_url && trail.brand_cta_text && (
              <a href={trail.brand_cta_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', fontSize: 12, color: C.indigo, textDecoration: 'none' }}>{trail.brand_cta_text}</a>
            )}
          </div>
        )}

        {/* Description */}
        {trail.description && (
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>{trail.description}</p>
        )}

        {/* Prize breakdown */}
        <div style={{
          padding: 16,
          borderRadius: 14,
          background: 'rgba(10,10,15,0.7)',
          backdropFilter: 'blur(16px)',
          border: `1px solid ${C.border}`,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: C.muted }}>Prize Breakdown</div>
          {orbs.map((orb, idx) => (
            <div key={orb.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 0',
              borderBottom: idx < orbs.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <span style={{ fontSize: 13, color: C.text }}>
                Orb {orb.position} {orb.is_finale ? '(Finale)' : ''}
              </span>
              <span style={{ fontSize: 13, color: orb.position === 1 || hasStarted ? C.text : C.muted }}>
                {orb.position === 1 || hasStarted ? orb.clue_text : '???'}
              </span>
            </div>
          ))}

          {/* Total */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 10,
            paddingTop: 10,
            borderTop: `1px solid ${C.border}`,
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.gold }}>Total Prize</span>
            <span style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.gold,
              padding: '2px 10px',
              borderRadius: 8,
              background: 'rgba(245,158,11,0.12)',
            }}>
              {trail.total_value} {trail.currency}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{
            flex: 1,
            padding: 12,
            borderRadius: 12,
            background: 'rgba(10,10,15,0.7)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${C.border}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{trail.started_count}</div>
            <div style={{ fontSize: 11, color: C.muted }}>Hunters</div>
          </div>
          <div style={{
            flex: 1,
            padding: 12,
            borderRadius: 12,
            background: 'rgba(10,10,15,0.7)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${C.border}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{trail.completed_count}</div>
            <div style={{ fontSize: 11, color: C.muted }}>Completed</div>
          </div>
          <div style={{
            flex: 1,
            padding: 12,
            borderRadius: 12,
            background: 'rgba(10,10,15,0.7)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${C.border}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{trail.orb_count}</div>
            <div style={{ fontSize: 11, color: C.muted }}>Orbs</div>
          </div>
        </div>

        {/* Top 3 leaderboard */}
        {topCompletions.length > 0 && (
          <div style={{
            padding: 16,
            borderRadius: 14,
            background: 'rgba(10,10,15,0.7)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${C.border}`,
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: C.muted }}>Top Completions</div>
            {topCompletions.map((c) => (
              <div key={c.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 0',
                borderBottom: `1px solid ${C.border}`,
              }}>
                <span style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: c.finish_rank === 1 ? C.gold : c.finish_rank === 2 ? '#C0C0C0' : '#CD7F32',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#000',
                }}>
                  {c.finish_rank}
                </span>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: c.user?.avatar_url ? `url(${c.user.avatar_url}) center/cover` : C.s2,
                }} />
                <span style={{ fontSize: 13, flex: 1 }}>@{c.user?.handle ?? 'unknown'}</span>
                <span style={{ fontSize: 12, color: C.muted }}>{formatTime(c.completion_time_seconds)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action button */}
        <button
          onClick={isCompleted ? () => router.push(`/trails/${trailId}/passport`) : hasStarted ? () => router.push(`/trails/${trailId}/hunt`) : handleStart}
          disabled={starting}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 14,
            border: 'none',
            background: isCompleted ? C.accent : C.indigo,
            color: isCompleted ? '#000' : '#fff',
            fontSize: 16,
            fontWeight: 700,
            cursor: starting ? 'not-allowed' : 'pointer',
            opacity: starting ? 0.6 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {starting ? 'Starting...' : isCompleted ? 'View Passport' : hasStarted ? 'Continue Hunt' : 'Start the Hunt'}
        </button>
      </div>
    </div>
  );
}
