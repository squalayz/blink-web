'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers';
import { supabase } from '@/lib/supabase';
import { C, rarityColor, type OrbRarity } from '@/lib/theme';
import { useIsDesktop } from '@/hooks/useIsDesktop';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ListingOrb {
  id: string;
  amount: number;
  currency: string;
  rarity: OrbRarity;
  lat: number;
  lng: number;
}

interface Listing {
  id: string;
  orb_id: string;
  seller_id: string;
  asking_price: number;
  asking_currency: string;
  status: string;
  local_window_expires_at: string;
  expires_at: string;
  created_at: string;
  buyer_id: string | null;
  sold_at: string | null;
  orbs: ListingOrb;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeRemaining(expiresAt: string): string {
  const now = Date.now();
  const exp = new Date(expiresAt).getTime();
  const diff = exp - now;
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/* ------------------------------------------------------------------ */
/*  Skeleton Card                                                       */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <div
      className="market-skeleton-card"
      style={{
        background: C.glass,
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 16,
        padding: 20,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        {/* Circle placeholder */}
        <div
          className="market-shimmer"
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: C.s2,
            flexShrink: 0,
          }}
        />
        {/* Lines placeholder */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
          <div
            className="market-shimmer"
            style={{ height: 16, borderRadius: 8, background: C.s2, width: '60%' }}
          />
          <div
            className="market-shimmer"
            style={{ height: 13, borderRadius: 8, background: C.s2, width: '40%' }}
          />
        </div>
      </div>
      {/* Button placeholder */}
      <div
        className="market-shimmer"
        style={{
          marginTop: 16,
          height: 42,
          borderRadius: 12,
          background: C.s2,
          width: '100%',
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MarketPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isDesktop } = useIsDesktop();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState(false);

  /* ---- Auth guard ---- */
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/signin');
    }
  }, [authLoading, user, router]);

  /* ---- Fetch listings ---- */
  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('crack_rights_listings')
      .select('*, orbs(*)')
      .eq('status', 'open')
      .lt('local_window_expires_at', new Date().toISOString());

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    setListings((data as Listing[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchListings();
  }, [user, fetchListings]);

  /* ---- Real-time subscription ---- */
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('market-listings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crack_rights_listings' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as Listing;
            if (
              newRow.status === 'open' &&
              new Date(newRow.local_window_expires_at) < new Date()
            ) {
              fetchListings();
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Listing;
            setListings((prev) => {
              if (updated.status !== 'open') {
                return prev.filter((l) => l.id !== updated.id);
              }
              return prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l));
            });
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as { id: string };
            setListings((prev) => prev.filter((l) => l.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchListings]);

  /* ---- Buy handler ---- */
  const handleBuy = useCallback(async () => {
    if (!selectedListing || !user) return;
    setBuying(true);
    setBuyError(null);
    setBuySuccess(false);

    const { error: updateError } = await supabase
      .from('crack_rights_listings')
      .update({
        status: 'sold',
        buyer_id: user.id,
        sold_at: new Date().toISOString(),
      })
      .eq('id', selectedListing.id)
      .eq('status', 'open');

    if (updateError) {
      setBuyError(updateError.message);
      setBuying(false);
      return;
    }

    const { error: passError } = await supabase
      .from('crack_passes')
      .insert({
        user_id: user.id,
        orb_id: selectedListing.orb_id,
        listing_id: selectedListing.id,
        granted_at: new Date().toISOString(),
      });

    if (passError) {
      setBuyError(passError.message);
      setBuying(false);
      return;
    }

    setBuying(false);
    setBuySuccess(true);

    setListings((prev) => prev.filter((l) => l.id !== selectedListing.id));

    setTimeout(() => {
      setSelectedListing(null);
      setBuySuccess(false);
    }, 2000);
  }, [selectedListing, user]);

  /* ---- Tick timer every minute ---- */
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  /* ---- Auth loading / guard ---- */
  if (authLoading || !user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: C.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ color: C.muted, fontSize: 16 }}>Loading...</div>
      </div>
    );
  }

  /* ---- Render ---- */
  const contentMaxWidth = isDesktop ? 1100 : '100%';
  const contentPadding = isDesktop ? '0 40px' : '0 20px';
  const headerPaddingTop = isDesktop ? '20px' : 'max(20px, env(safe-area-inset-top))';

  return (
    <>
      <style>{`
        @keyframes marketFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes marketPulse {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        @keyframes marketModalIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes orbGlow {
          0%, 100% { box-shadow: 0 0 12px var(--glow-color); }
          50%      { box-shadow: 0 0 24px var(--glow-color); }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .market-shimmer {
          background-image: linear-gradient(
            90deg,
            ${C.s2} 0px,
            rgba(255,255,255,0.06) 80px,
            ${C.s2} 160px
          );
          background-size: 400px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
        }
        .market-listing-card {
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .market-listing-card:hover {
          transform: translateY(-3px);
        }
        .market-listing-card[data-rarity="common"]:hover {
          box-shadow: 0 8px 28px ${rarityColor('common')}33;
        }
        .market-listing-card[data-rarity="uncommon"]:hover {
          box-shadow: 0 8px 28px ${rarityColor('uncommon')}33;
        }
        .market-listing-card[data-rarity="rare"]:hover {
          box-shadow: 0 8px 28px ${rarityColor('rare')}33;
        }
        .market-listing-card[data-rarity="epic"]:hover {
          box-shadow: 0 8px 28px ${rarityColor('epic')}33;
        }
        .market-listing-card[data-rarity="legendary"]:hover {
          box-shadow: 0 8px 28px ${rarityColor('legendary')}33;
        }
        .market-buy-btn {
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .market-buy-btn:hover:not(:disabled) {
          opacity: 0.88;
          transform: translateY(-1px);
        }
        .market-buy-btn:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        paddingBottom: 120,
      }}>
        {/* Header */}
        <div style={{
          paddingTop: headerPaddingTop,
          paddingBottom: 0,
          padding: `${headerPaddingTop} ${isDesktop ? '40px' : '20px'} 0`,
        }}>
          <div style={{
            maxWidth: contentMaxWidth,
            margin: '0 auto',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <button
                onClick={() => router.back()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: C.muted,
                  fontSize: 28,
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1,
                }}
                aria-label="Go back"
              >
                &#8592;
              </button>
              <h1 style={{
                fontSize: isDesktop ? 26 : 22,
                fontWeight: 700,
                color: C.text,
                margin: 0,
                letterSpacing: '-0.02em',
              }}>
                Creature Market
              </h1>
              <button
                onClick={fetchListings}
                style={{
                  background: 'none',
                  border: 'none',
                  color: C.muted,
                  fontSize: 20,
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1,
                }}
                aria-label="Refresh listings"
              >
                &#8635;
              </button>
            </div>

            <p style={{
              color: C.muted,
              fontSize: 14,
              margin: '0 0 24px',
              lineHeight: 1.5,
              textAlign: isDesktop ? 'center' : 'left',
            }}>
              Buy catch rights for creatures whose local window has expired. Highest bidder gets the pass.
            </p>
          </div>
        </div>

        {/* Content wrapper */}
        <div style={{ padding: contentPadding }}>
          <div style={{ maxWidth: contentMaxWidth, margin: '0 auto' }}>

            {/* Error state */}
            {error && (
              <div style={{
                marginBottom: 16,
                padding: '12px 16px',
                background: 'rgba(239,68,68,0.1)',
                border: `1px solid ${C.danger}`,
                borderRadius: 12,
                color: C.danger,
                fontSize: 14,
              }}>
                {error}
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr',
                gap: 16,
              }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && listings.length === 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '80px 20px',
                textAlign: 'center',
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: C.glass,
                  border: `1px solid ${C.glassBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  marginBottom: 16,
                  color: C.muted,
                }}>
                  &#9676;
                </div>
                <div style={{
                  color: C.text,
                  fontSize: 17,
                  fontWeight: 600,
                  marginBottom: 8,
                }}>
                  No listings available
                </div>
                <div style={{
                  color: C.muted,
                  fontSize: 14,
                  maxWidth: 280,
                  lineHeight: 1.5,
                }}>
                  Check back later. New catch rights appear when local claim windows expire.
                </div>
              </div>
            )}

            {/* Listings grid */}
            {!loading && listings.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr',
                gap: 16,
              }}>
                {listings.map((listing, idx) => {
                  const orb = listing.orbs;
                  if (!orb) return null;
                  const rColor = rarityColor(orb.rarity);
                  const remaining = timeRemaining(listing.expires_at);
                  const isExpired = remaining === 'Expired';

                  return (
                    <div
                      key={listing.id}
                      className="market-listing-card"
                      data-rarity={orb.rarity}
                      style={{
                        background: C.card,
                        border: `1px solid ${C.cardBorder}`,
                        borderLeft: `3px solid ${rColor}`,
                        borderRadius: 16,
                        padding: 20,
                        animation: `marketFadeIn 0.4s ease-out ${idx * 0.06}s both`,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Top glow accent line */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 20,
                        right: 20,
                        height: 2,
                        background: `linear-gradient(90deg, transparent, ${rColor}, transparent)`,
                        opacity: 0.4,
                      }} />

                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 16,
                      }}>
                        {/* Orb indicator */}
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: `radial-gradient(circle at 35% 35%, ${rColor}44, ${rColor}11)`,
                            border: `2px solid ${rColor}66`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: `0 0 16px ${rColor}33`,
                            ['--glow-color' as string]: `${rColor}44`,
                            animation: 'orbGlow 3s ease-in-out infinite',
                          }}
                        >
                          <div style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: rColor,
                            opacity: 0.8,
                          }} />
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 6,
                          }}>
                            <span style={{
                              fontSize: 16,
                              fontWeight: 700,
                              color: C.text,
                            }}>
                              {orb.amount} {orb.currency} creature
                            </span>
                            <span style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: rColor,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}>
                              {orb.rarity}
                            </span>
                          </div>

                          {/* Asking price */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginBottom: 8,
                          }}>
                            <span style={{ color: C.muted, fontSize: 13 }}>
                              Asking price:
                            </span>
                            <span style={{
                              color: C.accent,
                              fontSize: 15,
                              fontWeight: 700,
                            }}>
                              {listing.asking_price} {listing.asking_currency}
                            </span>
                          </div>

                          {/* Location & time */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                          }}>
                            <span style={{
                              color: C.muted,
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}>
                              <span style={{ opacity: 0.7 }}>&#9679;</span>
                              Location hidden
                            </span>
                            <span style={{
                              color: isExpired ? C.danger : C.muted,
                              fontSize: 12,
                              fontWeight: isExpired ? 600 : 400,
                            }}>
                              {remaining}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Buy button */}
                      <button
                        className="market-buy-btn"
                        onClick={() => {
                          setBuyError(null);
                          setBuySuccess(false);
                          setSelectedListing(listing);
                        }}
                        disabled={isExpired}
                        style={{
                          width: '100%',
                          marginTop: 16,
                          padding: '12px 0',
                          borderRadius: 12,
                          border: 'none',
                          background: isExpired
                            ? C.s2
                            : `linear-gradient(135deg, ${C.primary}, ${C.indigo})`,
                          color: isExpired ? C.muted : '#fff',
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: isExpired ? 'not-allowed' : 'pointer',
                          letterSpacing: '0.02em',
                          opacity: isExpired ? 0.5 : 1,
                        }}
                      >
                        {isExpired ? 'Listing Expired' : 'Buy Rights'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ---- Purchase Modal ---- */}
      {selectedListing && (
        <div
          onClick={() => {
            if (!buying) {
              setSelectedListing(null);
              setBuyError(null);
              setBuySuccess(false);
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.surface,
              border: `1px solid ${C.cardBorder}`,
              borderRadius: 20,
              padding: 28,
              maxWidth: 400,
              width: '100%',
              animation: 'marketModalIn 0.25s ease-out',
              position: 'relative',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => {
                if (!buying) {
                  setSelectedListing(null);
                  setBuyError(null);
                  setBuySuccess(false);
                }
              }}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                color: C.muted,
                fontSize: 22,
                cursor: 'pointer',
                lineHeight: 1,
                padding: 0,
              }}
              aria-label="Close modal"
            >
              &#10005;
            </button>

            {(() => {
              const orb = selectedListing.orbs;
              if (!orb) return null;
              const rColor = rarityColor(orb.rarity);

              return (
                <>
                  {/* Orb visual */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: 20,
                  }}>
                    <div style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: `radial-gradient(circle at 35% 35%, ${rColor}55, ${rColor}11)`,
                      border: `2px solid ${rColor}88`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 0 32px ${rColor}44`,
                    }}>
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: rColor,
                        opacity: 0.9,
                      }} />
                    </div>
                  </div>

                  <h2 style={{
                    textAlign: 'center',
                    fontSize: 20,
                    fontWeight: 700,
                    color: C.text,
                    margin: '0 0 4px',
                  }}>
                    Buy Catch Rights
                  </h2>
                  <p style={{
                    textAlign: 'center',
                    fontSize: 13,
                    color: C.muted,
                    margin: '0 0 24px',
                  }}>
                    Purchase the right to catch this creature remotely
                  </p>

                  {/* Details */}
                  <div style={{
                    background: C.card,
                    border: `1px solid ${C.cardBorder}`,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20,
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}>
                      <span style={{ color: C.muted, fontSize: 13 }}>Creature Value</span>
                      <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>
                        {orb.amount} {orb.currency}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}>
                      <span style={{ color: C.muted, fontSize: 13 }}>Rarity</span>
                      <span style={{ color: rColor, fontSize: 14, fontWeight: 600 }}>
                        {orb.rarity}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}>
                      <span style={{ color: C.muted, fontSize: 13 }}>Location</span>
                      <span style={{ color: C.muted, fontSize: 14 }}>
                        Location hidden
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}>
                      <span style={{ color: C.muted, fontSize: 13 }}>Time Remaining</span>
                      <span style={{
                        color: timeRemaining(selectedListing.expires_at) === 'Expired' ? C.danger : C.text,
                        fontSize: 14,
                        fontWeight: 600,
                      }}>
                        {timeRemaining(selectedListing.expires_at)}
                      </span>
                    </div>
                    <div style={{
                      height: 1,
                      background: C.cardBorder,
                      margin: '4px 0 12px',
                    }} />
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}>
                      <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>
                        Total Cost
                      </span>
                      <span style={{
                        color: C.accent,
                        fontSize: 16,
                        fontWeight: 700,
                      }}>
                        {selectedListing.asking_price} {selectedListing.asking_currency}
                      </span>
                    </div>
                  </div>

                  {/* Error */}
                  {buyError && (
                    <div style={{
                      padding: '10px 14px',
                      background: 'rgba(239,68,68,0.1)',
                      border: `1px solid ${C.danger}`,
                      borderRadius: 10,
                      color: C.danger,
                      fontSize: 13,
                      marginBottom: 16,
                      textAlign: 'center',
                    }}>
                      {buyError}
                    </div>
                  )}

                  {/* Success */}
                  {buySuccess && (
                    <div style={{
                      padding: '10px 14px',
                      background: 'rgba(0,255,136,0.1)',
                      border: `1px solid ${C.accent}`,
                      borderRadius: 10,
                      color: C.accent,
                      fontSize: 13,
                      marginBottom: 16,
                      textAlign: 'center',
                      fontWeight: 600,
                    }}>
                      Catch rights purchased successfully!
                    </div>
                  )}

                  {/* Confirm button */}
                  {!buySuccess && (
                    <button
                      onClick={handleBuy}
                      disabled={buying}
                      style={{
                        width: '100%',
                        padding: '14px 0',
                        borderRadius: 14,
                        border: 'none',
                        background: buying
                          ? C.s2
                          : `linear-gradient(135deg, ${C.accent}, ${C.cyan})`,
                        color: buying ? C.muted : '#000',
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: buying ? 'not-allowed' : 'pointer',
                        letterSpacing: '0.02em',
                        transition: 'opacity 0.2s',
                      }}
                    >
                      {buying ? 'Processing...' : 'Confirm Purchase'}
                    </button>
                  )}

                  {/* Cancel */}
                  {!buySuccess && (
                    <button
                      onClick={() => {
                        if (!buying) {
                          setSelectedListing(null);
                          setBuyError(null);
                        }
                      }}
                      disabled={buying}
                      style={{
                        width: '100%',
                        marginTop: 10,
                        padding: '12px 0',
                        borderRadius: 14,
                        border: `1px solid ${C.cardBorder}`,
                        background: 'transparent',
                        color: C.muted,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: buying ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
