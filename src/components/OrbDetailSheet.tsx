'use client';

import { useState, useEffect } from 'react';
import { C, Orb, OrbCurrency, rarityColor, currencyColor, truncateAddress, feeBreakdown } from '@/lib/theme';
import { OrbView } from '@/components/OrbAnimation';
import { useIsDesktop } from '@/hooks/useIsDesktop';

interface OrbDetailSheetProps {
  orb: Orb;
  distance: number | null;
  onClose: () => void;
}

const CLAIM_RADIUS = 100; // meters

const SHEET_CSS = `
@keyframes orbSheetSlideUp {
  0% { transform: translateY(100%); }
  100% { transform: translateY(0); }
}
@keyframes orbSheetSlideRight {
  0% { transform: translateX(100%); }
  100% { transform: translateX(0); }
}
@keyframes orbSheetBackdropIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes orbSheetGlowLine {
  0% { opacity: 0.4; background-position: -200% center; }
  100% { opacity: 1; background-position: 200% center; }
}
`;

function CurrencyIcon({ currency }: { currency: OrbCurrency | string }) {
  const color = currencyColor(currency as OrbCurrency);
  const label = currency === 'BTC' ? 'B' : currency === 'ETH' ? 'E' : 'S';
  return (
    <div style={{
      width: 28,
      height: 28,
      borderRadius: '50%',
      background: color + '22',
      border: `1.5px solid ${color}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: 13,
      color,
      flexShrink: 0,
    }}>
      {label}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function OrbDetailSheet({ orb, distance, onClose }: OrbDetailSheetProps) {
  const { isDesktop } = useIsDesktop();
  const [mounted, setMounted] = useState(false);
  const rColor = rarityColor(orb.rarity);
  const cColor = currencyColor(orb.currency);
  const { ownerEarns, platformEarns } = feeBreakdown(orb.claim_fee);
  const inRange = distance !== null && distance <= CLAIM_RADIUS;
  const distanceLabel = distance === null
    ? 'Locating...'
    : distance < 1000
    ? `${Math.round(distance)}m away`
    : `${(distance / 1000).toFixed(1)}km away`;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Shared content for both layouts
  const sheetContent = (
    <div style={{ padding: isDesktop ? '20px 24px 32px' : '12px 20px 24px' }}>
      {/* Dropper row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        {/* Avatar */}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: C.card,
          border: `2px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          color: C.muted,
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {orb.dropper_avatar_url ? (
            <img
              src={orb.dropper_avatar_url}
              alt={orb.dropper_username}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            />
          ) : (
            <span style={{ fontSize: 20 }}>?</span>
          )}
        </div>

        {/* Name + handle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: C.text, lineHeight: 1.2 }}>
            {orb.dropper_username || 'Anonymous'}
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
            @{orb.dropper_handle || 'unknown'}
          </div>
        </div>

        {/* Wallet pill */}
        <div style={{
          padding: '4px 10px',
          borderRadius: 20,
          background: C.card,
          border: `1px solid ${C.border}`,
          fontSize: 12,
          color: C.muted,
          fontFamily: 'monospace',
          flexShrink: 0,
        }}>
          {truncateAddress(orb.dropper_wallet_address)}
        </div>
      </div>

      {/* Rarity + currency badges */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{
          padding: '4px 12px',
          borderRadius: 20,
          background: rColor + '22',
          border: `1.5px solid ${rColor}`,
          fontSize: 12,
          fontWeight: 600,
          color: rColor,
        }}>
          {orb.rarity}
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: 20,
          background: cColor + '22',
          border: `1.5px solid ${cColor}`,
          fontSize: 12,
          fontWeight: 600,
          color: cColor,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <CurrencyIcon currency={orb.currency} />
          {orb.type === 'NFT' ? 'NFT' : orb.currency}
        </div>
        {orb.status === 'claimed' && (
          <div style={{
            padding: '4px 12px',
            borderRadius: 20,
            background: C.muted + '22',
            border: `1.5px solid ${C.muted}`,
            fontSize: 12,
            fontWeight: 600,
            color: C.muted,
          }}>
            Claimed
          </div>
        )}
      </div>

      {/* Mystery card */}
      <div style={{
        background: C.card,
        borderRadius: 16,
        padding: '20px',
        marginBottom: 16,
        border: `1px solid ${rColor}44`,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow */}
        <div style={{
          position: 'absolute',
          top: -30,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: rColor + '18',
          filter: 'blur(24px)',
          pointerEvents: 'none',
        }} />

        {/* Orb visual */}
        <div style={{ margin: '0 auto 12px', display: 'flex', justifyContent: 'center' }}>
          <OrbView rarity={orb.rarity} isClaimable={inRange} size={88} />
        </div>

        <div style={{ fontWeight: 700, fontSize: 17, color: C.text, marginBottom: 6 }}>
          {orb.type === 'NFT' ? `Mystery NFT Creature` : `Mystery ${orb.currency} Creature`}
        </div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
          {orb.message || `Catch it to reveal the value inside`}
        </div>
      </div>

      {/* Locked mystery info card */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <div>
          <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 3 }}>
            Contains ??? until caught
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>
            Amount hidden -- walk to catch
          </div>
        </div>
      </div>

      {/* Fee breakdown */}
      <div style={{
        background: C.card,
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 16,
        border: `1px solid ${C.border}`,
      }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Claim Fee Breakdown
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: C.text }}>Spawner earns</span>
          <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>90%</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: C.text }}>BLINK fee</span>
          <span style={{ fontSize: 13, color: C.muted }}>10%</span>
        </div>
        <div style={{ height: 1, background: C.border, marginBottom: 10 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>Claim fee</span>
          <span style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>
            {orb.claim_fee} {orb.claim_fee_currency || orb.currency}
          </span>
        </div>
      </div>

      {/* Distance indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
        padding: '10px 14px',
        background: C.card,
        borderRadius: 10,
        border: `1px solid ${inRange ? C.accent + '44' : C.border}`,
      }}>
        {/* Distance dot */}
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: inRange ? C.accent : C.gold,
          boxShadow: `0 0 8px ${inRange ? C.accent : C.gold}`,
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 13, color: inRange ? C.accent : C.muted, fontWeight: 600 }}>
          {inRange ? 'In range' : distanceLabel}
        </span>
        {!inRange && distance !== null && (
          <span style={{ fontSize: 12, color: C.muted, marginLeft: 'auto' }}>
            Need 100m
          </span>
        )}
      </div>

      {/* CTA */}
      {orb.status === 'claimed' ? (
        <div style={{
          width: '100%',
          padding: '14px',
          borderRadius: 12,
          background: C.card,
          border: `1px solid ${C.border}`,
          color: C.muted,
          fontSize: 15,
          fontWeight: 600,
          textAlign: 'center',
        }}>
          Already Claimed
        </div>
      ) : inRange ? (
        <a
          href={`/catch/${orb.id}`}
          style={{
            display: 'block',
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            background: C.gold,
            color: '#000',
            fontSize: 15,
            fontWeight: 700,
            textAlign: 'center',
            textDecoration: 'none',
            boxShadow: `0 0 20px ${C.gold}66`,
            cursor: 'pointer',
          }}
        >
          Catch It
        </a>
      ) : (
        <button
          disabled
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            background: C.card,
            border: `1px solid ${C.border}`,
            color: C.muted,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'not-allowed',
            textAlign: 'center',
          }}
        >
          Walk within 100m to Catch
        </button>
      )}
    </div>
  );

  // Desktop: right side panel
  if (isDesktop) {
    return (
      <>
        <style>{SHEET_CSS}</style>

        {/* Subtle backdrop */}
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 999,
            animation: 'orbSheetBackdropIn 0.25s ease-out',
          }}
        />

        {/* Side panel */}
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 380,
          background: 'rgba(13,13,20,0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderLeft: `1px solid ${C.glassBorder}`,
          zIndex: 1000,
          overflowY: 'auto',
          animation: 'orbSheetSlideRight 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}>
          {/* Accent glow line at top */}
          <div style={{
            height: 2,
            background: `linear-gradient(90deg, transparent, ${C.accent}88, ${C.primary}88, transparent)`,
            backgroundSize: '200% 100%',
            animation: 'orbSheetGlowLine 1.2s ease-out forwards',
          }} />

          {/* Close button */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '16px 16px 0',
          }}>
            <button
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: C.card,
                border: `1px solid ${C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease',
              }}
              title="Close"
            >
              <CloseIcon />
            </button>
          </div>

          {sheetContent}
        </div>
      </>
    );
  }

  // Mobile: bottom sheet (original behavior)
  return (
    <>
      <style>{SHEET_CSS}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 999,
          animation: 'orbSheetBackdropIn 0.2s ease-out',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: C.surface,
        borderRadius: '20px 20px 0 0',
        border: `1px solid ${C.border}`,
        borderBottom: 'none',
        zIndex: 1000,
        maxHeight: '85vh',
        overflowY: 'auto',
        padding: '0 0 env(safe-area-inset-bottom, 16px) 0',
        animation: 'orbSheetSlideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        {/* Accent glow line at top */}
        <div style={{
          height: 2,
          borderRadius: '20px 20px 0 0',
          background: `linear-gradient(90deg, transparent, ${C.accent}88, ${C.primary}88, transparent)`,
          backgroundSize: '200% 100%',
          animation: 'orbSheetGlowLine 1.2s ease-out forwards',
        }} />

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border }} />
        </div>

        {sheetContent}
      </div>
    </>
  );
}
