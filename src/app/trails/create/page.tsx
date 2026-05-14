'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { C } from '@/lib/theme';
import { useAuth } from '@/components/providers';
import { useIsDesktop } from '@/hooks/useIsDesktop';

interface OrbEntry {
  clue_text: string;
  amount: string;
  latitude: string;
  longitude: string;
  hint_image_url: string;
}

const CREATE_CSS = `
@keyframes createFadeIn {
  0% { opacity: 0; transform: translateY(12px); }
  100% { opacity: 1; transform: translateY(0); }
}
`;

// BLINK: ETH-only — Solana/Bitcoin currency options hidden.
const CURRENCIES = ['ETH'];

function emptyOrb(): OrbEntry {
  return { clue_text: '', amount: '', latitude: '', longitude: '', hint_image_url: '' };
}

export default function CreateTrailPage() {
  const router = useRouter();
  const { user, session } = useAuth();
  const { isDesktop } = useIsDesktop();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basics
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [currency, setCurrency] = useState('ETH');
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [timeLimitHours, setTimeLimitHours] = useState('24');
  const [isPublic, setIsPublic] = useState(true);

  // Step 2: Orbs
  const [orbs, setOrbs] = useState<OrbEntry[]>([emptyOrb(), emptyOrb()]);

  function updateOrb(idx: number, field: keyof OrbEntry, value: string) {
    setOrbs((prev) => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  }

  function addOrb() {
    if (orbs.length >= 10) return;
    setOrbs((prev) => [...prev, emptyOrb()]);
  }

  function removeOrb(idx: number) {
    if (orbs.length <= 2) return;
    setOrbs((prev) => prev.filter((_, i) => i !== idx));
  }

  const totalValue = orbs.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
  const platformFee = totalValue * 0.05;

  async function handleSubmit() {
    if (!user || !session) {
      router.push(`/auth/signin?redirect=${encodeURIComponent('/trails/create')}`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title,
        description: description || null,
        cover_image_url: coverImageUrl || null,
        currency,
        time_limit_hours: hasTimeLimit ? parseInt(timeLimitHours) || null : null,
        is_public: isPublic,
        orbs: orbs.map((o) => ({
          clue_text: o.clue_text,
          amount: parseFloat(o.amount) || 0,
          latitude: parseFloat(o.latitude) || 0,
          longitude: parseFloat(o.longitude) || 0,
          hint_image_url: o.hint_image_url || undefined,
        })),
      };

      const res = await fetch('/api/trails/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');

      router.push(`/trails/${data.trail_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: `1px solid ${C.border}`,
    background: 'rgba(255,255,255,0.04)',
    color: C.text,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: C.muted,
    marginBottom: 6,
    display: 'block',
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, paddingBottom: 100 }}>
      <style>{CREATE_CSS}</style>

      {/* Header */}
      <div style={{ padding: '56px 20px 16px', ...(isDesktop ? { maxWidth: 600, margin: '0 auto' } : {}) }}>
        <button
          onClick={() => router.push('/trails')}
          style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, marginBottom: 12 }}
        >
          &larr; Back to Trails
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Create a Trail</h1>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', padding: '0 20px 24px', gap: 8, ...(isDesktop ? { maxWidth: 600, margin: '0 auto' } : {}) }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: step >= s ? C.indigo : 'rgba(255,255,255,0.06)',
              color: step >= s ? '#fff' : C.muted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              transition: 'all 0.3s',
            }}>
              {step > s ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : s}
            </div>
            <span style={{ fontSize: 11, color: step >= s ? C.text : C.muted }}>
              {s === 1 ? 'Basics' : s === 2 ? 'Add Creatures' : 'Preview'}
            </span>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 20px', animation: 'createFadeIn 0.3s ease-out', ...(isDesktop ? { maxWidth: 600, margin: '0 auto' } : {}) }}>
        {/* Step 1: Basics */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name your trail..." style={inputStyle} maxLength={200} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this trail about?" style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} maxLength={1000} />
            </div>
            <div>
              <label style={labelStyle}>Cover Image URL</label>
              <input value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: 10,
                      border: `1.5px solid ${currency === c ? C.indigo : C.border}`,
                      background: currency === c ? 'rgba(0,255,136,0.12)' : 'transparent',
                      color: currency === c ? C.indigo : C.muted,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ ...labelStyle, marginBottom: 0, flex: 1 }}>Time Limit</label>
              <button
                onClick={() => setHasTimeLimit(!hasTimeLimit)}
                style={{
                  width: 48,
                  height: 26,
                  borderRadius: 13,
                  background: hasTimeLimit ? C.indigo : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: 3,
                  left: hasTimeLimit ? 25 : 3,
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
            {hasTimeLimit && (
              <div>
                <label style={labelStyle}>Hours</label>
                <input value={timeLimitHours} onChange={(e) => setTimeLimitHours(e.target.value)} type="number" min="1" style={inputStyle} />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ ...labelStyle, marginBottom: 0, flex: 1 }}>Public Trail</label>
              <button
                onClick={() => setIsPublic(!isPublic)}
                style={{
                  width: 48,
                  height: 26,
                  borderRadius: 13,
                  background: isPublic ? C.indigo : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: 3,
                  left: isPublic ? 25 : 3,
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>

            <button
              onClick={() => title.trim() ? setStep(2) : setError('Title is required')}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 14,
                border: 'none',
                background: C.indigo,
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              Next: Add Creatures
            </button>
          </div>
        )}

        {/* Step 2: Add Orbs */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {orbs.map((orb, idx) => (
              <div
                key={idx}
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: 'rgba(10,10,15,0.7)',
                  backdropFilter: 'blur(16px)',
                  border: `1px solid ${C.border}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>
                    Creature {idx + 1} {idx === orbs.length - 1 ? '(Finale)' : ''}
                  </span>
                  {orbs.length > 2 && (
                    <button
                      onClick={() => removeOrb(idx)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: `1px solid ${C.danger}44`,
                        background: 'rgba(239,68,68,0.08)',
                        color: C.danger,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Clue Text *</label>
                    <textarea
                      value={orb.clue_text}
                      onChange={(e) => updateOrb(idx, 'clue_text', e.target.value)}
                      placeholder="Write a clue for watchers..."
                      maxLength={280}
                      style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                    />
                    <div style={{ fontSize: 11, color: C.muted, textAlign: 'right' }}>{orb.clue_text.length}/280</div>
                  </div>
                  <div>
                    <label style={labelStyle}>Value ({currency}) *</label>
                    <input value={orb.amount} onChange={(e) => updateOrb(idx, 'amount', e.target.value)} type="number" min="0" step="0.01" placeholder="0.00" style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Latitude *</label>
                      <input value={orb.latitude} onChange={(e) => updateOrb(idx, 'latitude', e.target.value)} type="number" step="any" placeholder="40.7128" style={inputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Longitude *</label>
                      <input value={orb.longitude} onChange={(e) => updateOrb(idx, 'longitude', e.target.value)} type="number" step="any" placeholder="-74.0060" style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Hint Image URL (optional)</label>
                    <input value={orb.hint_image_url} onChange={(e) => updateOrb(idx, 'hint_image_url', e.target.value)} placeholder="https://..." style={inputStyle} />
                  </div>
                </div>
              </div>
            ))}

            {orbs.length < 10 && (
              <button
                onClick={addOrb}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  borderRadius: 12,
                  border: `1px dashed ${C.border}`,
                  background: 'transparent',
                  color: C.muted,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                + Add Creature ({orbs.length}/10)
              </button>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: '14px 0',
                  borderRadius: 14,
                  border: `1px solid ${C.border}`,
                  background: 'transparent',
                  color: C.muted,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
              <button
                onClick={() => {
                  const valid = orbs.every((o) => o.clue_text.trim() && parseFloat(o.amount) > 0 && o.latitude && o.longitude);
                  if (!valid) { setError('Fill in all creature fields'); return; }
                  setError(null);
                  setStep(3);
                }}
                style={{
                  flex: 2,
                  padding: '14px 0',
                  borderRadius: 14,
                  border: 'none',
                  background: C.indigo,
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Next: Preview
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Trail card preview */}
            <div style={{
              borderRadius: 16,
              overflow: 'hidden',
              background: C.surface,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{
                height: 140,
                background: coverImageUrl
                  ? `url(${coverImageUrl}) center/cover`
                  : `linear-gradient(135deg, ${C.indigo}44, ${C.primary}44)`,
                position: 'relative',
              }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(10,10,15,0.9))' }} />
                <div style={{ position: 'absolute', bottom: 12, left: 14 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
                </div>
              </div>
              <div style={{ padding: '10px 14px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 12,
                    background: 'rgba(245,158,11,0.12)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    color: C.gold,
                    fontSize: 13,
                    fontWeight: 700,
                  }}>
                    {totalValue.toFixed(2)} {currency}
                  </span>
                  <span style={{ fontSize: 12, color: C.muted }}>{orbs.length} creatures</span>
                </div>
              </div>
            </div>

            {/* Prize breakdown */}
            <div style={{
              padding: 16,
              borderRadius: 14,
              background: 'rgba(10,10,15,0.7)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: C.muted }}>Prize Breakdown</div>
              {orbs.map((orb, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: idx < orbs.length - 1 ? `1px solid ${C.border}` : 'none',
                }}>
                  <span style={{ fontSize: 13 }}>Creature {idx + 1} {idx === orbs.length - 1 ? '(Finale)' : ''}</span>
                  <span style={{ fontSize: 13, color: C.gold }}>{parseFloat(orb.amount) || 0} {currency}</span>
                </div>
              ))}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 10,
                paddingTop: 10,
                borderTop: `1px solid ${C.border}`,
              }}>
                <span style={{ fontSize: 13, color: C.muted }}>Platform Fee (5%)</span>
                <span style={{ fontSize: 13, color: C.muted }}>{platformFee.toFixed(4)} {currency}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.gold }}>Total Value</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.gold }}>{totalValue.toFixed(2)} {currency}</span>
              </div>
            </div>

            {error && (
              <div style={{ color: C.danger, fontSize: 13, textAlign: 'center' }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  flex: 1,
                  padding: '14px 0',
                  borderRadius: 14,
                  border: `1px solid ${C.border}`,
                  background: 'transparent',
                  color: C.muted,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  flex: 2,
                  padding: '14px 0',
                  borderRadius: 14,
                  border: 'none',
                  background: submitting ? C.muted : C.indigo,
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Creating...' : 'Create Trail'}
              </button>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && step !== 3 && (
          <div style={{ color: C.danger, fontSize: 13, textAlign: 'center', marginTop: 12 }}>{error}</div>
        )}
      </div>
    </div>
  );
}
