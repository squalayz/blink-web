'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { C } from '@/lib/theme';
import { useAuth } from '@/components/providers';

interface TrailCreator {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
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
  is_public: boolean;
  is_sponsored: boolean;
  brand_name: string | null;
  brand_logo_url: string | null;
  brand_color: string | null;
  started_count: number;
  completed_count: number;
  expires_at: string | null;
  created_at: string;
}

type FilterTab = 'all' | 'active' | 'sponsored' | 'completed';

const TRAIL_CSS = `
@keyframes trailFadeIn {
  0% { opacity: 0; transform: translateY(12px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes trailPulse {
  0%, 100% { box-shadow: 0 0 8px rgba(245,158,11,0.3); }
  50% { box-shadow: 0 0 16px rgba(245,158,11,0.6); }
}
`;

export default function TrailsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');

  useEffect(() => {
    async function fetchTrails() {
      setLoading(true);
      setError(null);
      try {
        const statusParam = filter === 'all' ? '' : filter === 'sponsored' ? 'active' : filter;
        const res = await fetch(`/api/trails${statusParam ? `?status=${statusParam}` : ''}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch');
        let list: Trail[] = data.trails ?? [];
        if (filter === 'sponsored') {
          list = list.filter((t) => t.is_sponsored);
        }
        if (filter === 'completed') {
          list = list.filter((t) => t.status === 'completed');
        }
        setTrails(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchTrails();
  }, [filter]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'sponsored', label: 'Sponsored' },
    { key: 'completed', label: 'Completed' },
  ];

  function timeRemaining(expiresAt: string | null): string | null {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, paddingBottom: 100 }}>
      <style>{TRAIL_CSS}</style>

      {/* Header */}
      <div style={{ padding: '56px 20px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Orb Trails</h1>
        <p style={{ color: C.muted, fontSize: 14, marginTop: 6 }}>Follow the clues. Claim the prize.</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px', overflowX: 'auto' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            style={{
              flexShrink: 0,
              padding: '8px 18px',
              borderRadius: 20,
              border: `1.5px solid ${filter === t.key ? C.indigo : C.border}`,
              background: filter === t.key ? 'rgba(99,102,241,0.15)' : 'rgba(10,10,15,0.65)',
              color: filter === t.key ? C.indigo : C.muted,
              fontSize: 13,
              fontWeight: filter === t.key ? 700 : 500,
              cursor: 'pointer',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              transition: 'all 0.2s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Create trail button */}
      {user && (
        <div style={{ padding: '0 20px 16px' }}>
          <button
            onClick={() => router.push('/trails/create')}
            style={{
              width: '100%',
              padding: '12px 0',
              borderRadius: 12,
              border: `1px dashed ${C.border}`,
              background: 'transparent',
              color: C.muted,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            + Create a Trail
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Loading trails...</div>
      )}

      {/* Error */}
      {error && (
        <div style={{ textAlign: 'center', padding: 40, color: C.danger }}>{error}</div>
      )}

      {/* Empty */}
      {!loading && !error && trails.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: C.muted, fontSize: 15 }}>
          No active trails right now. Check back soon!
        </div>
      )}

      {/* Trail cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 20px' }}>
        {trails.map((trail, idx) => {
          const remaining = timeRemaining(trail.expires_at);
          const creator = trail.creator as TrailCreator | null;
          return (
            <div
              key={trail.id}
              onClick={() => router.push(`/trails/${trail.id}`)}
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                background: C.surface,
                border: `1px solid ${C.border}`,
                cursor: 'pointer',
                animation: `trailFadeIn 0.4s ease-out ${idx * 0.05}s both`,
                transition: 'transform 0.2s',
              }}
            >
              {/* Cover image */}
              <div style={{
                height: 180,
                background: trail.cover_image_url
                  ? `url(${trail.cover_image_url}) center/cover`
                  : `linear-gradient(135deg, ${C.indigo}44, ${C.primary}44)`,
                position: 'relative',
              }}>
                {/* Gradient overlay */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(transparent 40%, rgba(10,10,15,0.9))',
                }} />

                {/* Sponsored badge */}
                {trail.is_sponsored && trail.brand_logo_url && (
                  <img
                    src={trail.brand_logo_url}
                    alt={trail.brand_name ?? ''}
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      objectFit: 'cover',
                      border: `1px solid ${C.border}`,
                    }}
                  />
                )}

                {/* Title overlay */}
                <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{trail.title}</div>
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: '12px 14px 14px' }}>
                {/* Creator row */}
                {creator && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: creator.avatar_url
                        ? `url(${creator.avatar_url}) center/cover`
                        : C.s2,
                    }} />
                    <span style={{ fontSize: 13, color: C.muted }}>@{creator.handle}</span>
                  </div>
                )}

                {/* Info row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {/* Prize pill */}
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: 12,
                    background: 'rgba(245,158,11,0.12)',
                    border: `1px solid rgba(245,158,11,0.3)`,
                    color: C.gold,
                    fontSize: 13,
                    fontWeight: 700,
                    animation: 'trailPulse 2s ease-in-out infinite',
                  }}>
                    {trail.total_value} {trail.currency}
                  </span>

                  {/* Orb count dots */}
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {Array.from({ length: trail.orb_count }).map((_, i) => (
                      <div key={i} style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: C.indigo,
                        opacity: 0.7,
                      }} />
                    ))}
                    <span style={{ fontSize: 11, color: C.muted, marginLeft: 4 }}>{trail.orb_count} orbs</span>
                  </div>

                  {/* Hunters */}
                  <span style={{ fontSize: 12, color: C.muted }}>
                    {trail.started_count} hunter{trail.started_count !== 1 ? 's' : ''} racing
                  </span>
                </div>

                {/* Time remaining */}
                {remaining && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#F59E0B' }}>{remaining}</div>
                )}

                {/* Start button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/trails/${trail.id}`);
                  }}
                  style={{
                    marginTop: 12,
                    width: '100%',
                    padding: '10px 0',
                    borderRadius: 10,
                    border: 'none',
                    background: C.indigo,
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                  }}
                >
                  Start Hunt
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
