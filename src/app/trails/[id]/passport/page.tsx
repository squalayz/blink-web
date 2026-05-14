'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { C } from '@/lib/theme';
import { useAuth } from '@/components/providers';
import { supabase } from '@/lib/supabase';

interface TrailInfo {
  title: string;
  orb_count: number;
  total_value: number;
  currency: string;
  creator: { handle: string; display_name: string; avatar_url: string | null } | null;
}

interface TrailProgress {
  id: string;
  current_position: number;
  orbs_cracked: number;
  started_at: string;
  completed_at: string | null;
  completion_time_seconds: number | null;
  finish_rank: number | null;
}

const PASSPORT_CSS = `
@keyframes passportFadeIn {
  0% { opacity: 0; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes stampGlow {
  0%, 100% { box-shadow: 0 0 8px rgba(20,241,149,0.3); }
  50% { box-shadow: 0 0 20px rgba(20,241,149,0.6); }
}
@keyframes confettiFall {
  0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
@keyframes completeGlow {
  0%, 100% { text-shadow: 0 0 10px rgba(20,241,149,0.5); }
  50% { text-shadow: 0 0 30px rgba(20,241,149,0.8); }
}
`;

function ConfettiOverlay() {
  const colors = [C.accent, C.indigo, C.gold, '#FF6B6B', '#4ECDC4', C.primary];
  const pieces = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 3,
    color: colors[i % colors.length],
    size: 6 + Math.random() * 8,
  }));

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100, overflow: 'hidden' }}>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: 0,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : 2,
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s both`,
          }}
        />
      ))}
    </div>
  );
}

export default function TrailPassportPage() {
  const params = useParams();
  const router = useRouter();
  const trailId = params.id as string;
  const { user } = useAuth();

  const [trail, setTrail] = useState<TrailInfo | null>(null);
  const [progress, setProgress] = useState<TrailProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const { data: trailData } = await supabase
          .from('trails')
          .select('title, orb_count, total_value, currency, creator:profiles!trails_creator_id_fkey(handle, display_name, avatar_url)')
          .eq('id', trailId)
          .single();
        if (trailData) setTrail(trailData as unknown as TrailInfo);

        const { data: prog } = await supabase
          .from('trail_progress')
          .select('*')
          .eq('trail_id', trailId)
          .eq('user_id', user.id)
          .single();
        if (prog) setProgress(prog);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [trailId, user]);

  function formatTime(seconds: number | null): string {
    if (!seconds) return '-';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function elapsed(): string {
    if (!progress) return '-';
    const start = new Date(progress.started_at).getTime();
    const end = progress.completed_at ? new Date(progress.completed_at).getTime() : Date.now();
    return formatTime(Math.floor((end - start) / 1000));
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.muted }}>Loading passport...</div>
      </div>
    );
  }

  if (error || !trail || !progress) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ color: C.danger }}>{error || 'Not found'}</div>
        <button onClick={() => router.push('/trails')} style={{ color: C.indigo, background: 'none', border: 'none', cursor: 'pointer' }}>Back to Trails</button>
      </div>
    );
  }

  const isCompleted = !!progress.completed_at;
  const orbCount = trail.orb_count;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, position: 'relative' }}>
      <style>{PASSPORT_CSS}</style>

      {isCompleted && <ConfettiOverlay />}

      <div style={{ padding: '56px 20px 40px', animation: 'passportFadeIn 0.6s ease-out' }}>
        {/* Back button */}
        <button
          onClick={() => router.push(`/trails/${trailId}/hunt`)}
          style={{
            marginBottom: 20,
            padding: '8px 16px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${C.border}`,
            color: C.muted,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Back to Hunt
        </button>

        {/* Header */}
        {isCompleted && (
          <h1 style={{
            fontSize: 32,
            fontWeight: 800,
            textAlign: 'center',
            margin: '0 0 8px',
            color: C.accent,
            animation: 'completeGlow 2s ease-in-out infinite',
          }}>
            Trail Complete!
          </h1>
        )}

        <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', margin: '0 0 24px' }}>{trail.title}</h2>

        {/* Orb stamps */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 30,
        }}>
          {Array.from({ length: orbCount }).map((_, i) => {
            const cracked = i < progress.orbs_cracked;
            return (
              <div
                key={i}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: cracked ? 'rgba(20,241,149,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${cracked ? C.accent : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: cracked ? 'stampGlow 2s ease-in-out infinite' : 'none',
                }}
              >
                {cracked ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>{i + 1}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Creator info */}
        {trail.creator && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 24,
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: trail.creator.avatar_url ? `url(${trail.creator.avatar_url}) center/cover` : C.s2,
            }} />
            <span style={{ fontSize: 14, color: C.muted }}>Created by @{trail.creator.handle}</span>
          </div>
        )}

        {/* Stats card */}
        <div style={{
          padding: 20,
          borderRadius: 16,
          background: 'rgba(10,10,15,0.7)',
          backdropFilter: 'blur(16px)',
          border: `1px solid ${C.border}`,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 12 }}>Your Stats</div>

          {[
            { label: 'Started', value: formatDate(progress.started_at) },
            { label: 'Time Elapsed', value: elapsed() },
            { label: 'BLINKS Caught', value: `${progress.orbs_cracked} / ${orbCount}` },
            ...(isCompleted && progress.finish_rank ? [{ label: 'Finish Rank', value: `#${progress.finish_rank}` }] : []),
            ...(isCompleted ? [{ label: 'Completion Time', value: formatTime(progress.completion_time_seconds) }] : []),
          ].map((row, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 13, color: C.muted }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Prize */}
        {isCompleted && (
          <div style={{
            textAlign: 'center',
            padding: 20,
            borderRadius: 16,
            background: 'rgba(245,158,11,0.08)',
            border: `1px solid rgba(245,158,11,0.3)`,
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 14, color: C.gold, marginBottom: 4 }}>Prize Earned</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.gold }}>{trail.total_value} {trail.currency}</div>
          </div>
        )}

        {/* Share button */}
        {isCompleted && (
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `I completed the "${trail.title}" trail on MishMesh!`,
                  text: `Finished rank #${progress.finish_rank} in ${formatTime(progress.completion_time_seconds)}`,
                  url: window.location.href,
                });
              }
            }}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 14,
              border: 'none',
              background: C.indigo,
              color: '#fff',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Share Completion
          </button>
        )}
      </div>
    </div>
  );
}
