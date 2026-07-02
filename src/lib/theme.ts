import type React from 'react';

// BLINK palette — mirrors the native iOS app's BlinkTheme.swift exactly.
// background #0a0a0f · surface #12121a · primary #00FF88 · secondary #88FF00
export const C = {
  bg: '#0a0a0f',
  surface: '#12121a',
  s2: '#1a1a24',
  card: 'rgba(255,255,255,0.04)',
  cardSolid: '#1a1a24',
  cardBorder: 'rgba(0,255,136,0.10)',
  primary: '#00FF88',
  primary2: '#88FF00',
  accent: '#00FF88',
  gold: '#88FF00',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  textTertiary: 'rgba(255,255,255,0.5)',
  muted: '#8a8a99',
  rareBlue: '#88FF00',
  border: 'rgba(255,255,255,0.06)',
  danger: '#EF4444',
  btcOrange: '#88FF00',
  ethBlue: '#88FF00',
  solPurple: '#00FF88',
  glass: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.08)',
  indigo: '#00FF88',
  cyan: '#00FF88',
  glow: 'rgba(0,255,136,0.4)',
  glowSoft: 'rgba(0,255,136,0.18)',
};

// ── App design system (ported from ios-blink BlinkTheme.swift) ──────────────

// Rarity tints — identical to the app's Rarity.color switch.
export const RARITY_COLOR: Record<string, string> = {
  common: '#9aa3b2',
  uncommon: '#00FF88',
  rare: '#88FF00',
  legendary: '#ffd166',
  mythic: '#ff8ae0',
};

// Web equivalent of the app's `.glassCard(cornerRadius:glow:)` modifier:
// ultraThinMaterial + 1px white 0.08 border + soft glow shadow (r24 y8).
export function glassCard(cornerRadius = 20, glow = C.primary): React.CSSProperties {
  return {
    background: 'rgba(18,18,26,0.66)',
    backdropFilter: 'blur(22px)',
    WebkitBackdropFilter: 'blur(22px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: cornerRadius,
    boxShadow: `0 8px 24px ${glow}2e`,
  };
}

// The app's rounded-black display face (SF Rounded, weight .black).
export const FONT_DISPLAY =
  "'Space Grotesk', ui-rounded, 'SF Pro Rounded', 'Inter', system-ui, sans-serif";
export const FONT_BODY = "'Inter', system-ui, sans-serif";

// Heavy all-caps label, e.g. "BLINK ORBS", "RECENT ACTIVITY".
export function capsLabel(size = 11, color: string = C.textSecondary): React.CSSProperties {
  return {
    fontSize: size,
    fontWeight: 800,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color,
    fontFamily: FONT_DISPLAY,
  };
}

// Monospaced-digit counter, e.g. the orb balance hero number.
export function counterFont(size = 38): React.CSSProperties {
  return {
    fontSize: size,
    fontWeight: 900,
    fontFamily: FONT_DISPLAY,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em',
    lineHeight: 1.05,
  };
}

// Primary CTA — the app's lime→green gradient "Continue" button.
export function primaryCta(): React.CSSProperties {
  return {
    background: `linear-gradient(90deg, ${C.primary2}, ${C.primary})`,
    color: '#0a0a0f',
    fontWeight: 900,
    fontFamily: FONT_DISPLAY,
    borderRadius: 999,
    border: 'none',
    boxShadow: '0 6px 18px rgba(0,255,136,0.45)',
    cursor: 'pointer',
  };
}

export const FEE = {
  platformDeploy: 0.10,
  platformCrack: 0.10,
  withdrawal: 0.05,
  referrer: 0.01,
  claimOwner: 0.90,
  claimPlatform: 0.10,
  hexSale: 0.10,
};

export const FEE_WALLETS = {
  ETH: '0x00468c1B22451ed9Fabc9DA32E6aEa28DC03a216',
  SOL: 'FYxEmF7VKHpp1781aKFMWYc23kwgsD5j4foyCa2SKji7',
  BTC: 'bc1q7tw2jnmj3v483vatwts8h8nrradct0yfpaj64',
};

export type OrbCurrency = 'SOL' | 'ETH' | 'BTC';
// Normalize raw DB orb row (lat/lng) to Orb type (latitude/longitude)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeOrb(raw: any): Orb {
  return {
    ...raw,
    latitude: raw.latitude ?? raw.lat ?? 0,
    longitude: raw.longitude ?? raw.lng ?? 0,
    claim_fee: raw.claim_fee ?? raw.claim_fee_usd ?? 0,
    dropper_username: raw.dropper_username ?? raw.dropper_name ?? '',
    dropper_handle: raw.dropper_handle ?? '',
    dropper_avatar_url: raw.dropper_avatar_url ?? raw.dropper_pic ?? null,
    dropper_wallet_address: raw.dropper_wallet_address ?? raw.dropper_wallet ?? '',
  };
}

export type OrbType = 'Crypto' | 'Token' | 'NFT';
export type OrbRarity = 'Common' | 'Rare' | 'Legendary';
export type OrbStatus = 'pending' | 'claimed' | 'cracked' | 'cancelled' | 'expired' | 'failed' | 'unfunded';

export interface Orb {
  id: string;
  type: OrbType;
  currency: OrbCurrency;
  amount: number;
  claim_fee: number;
  message: string;
  latitude: number;
  longitude: number;
  lat?: number;  // DB column alias
  lng?: number;  // DB column alias
  dropper_id: string;
  dropper_username: string;
  dropper_handle: string;
  dropper_avatar_url: string | null;
  dropper_wallet_address: string;
  rarity: OrbRarity;
  status: OrbStatus;
  dropped_at: string;
  claimed_by: string | null;
  claimer_username: string | null;
  claimer_handle: string | null;
  claimer_avatar_url: string | null;
  expires_at: string | null;
  tx_hash: string | null;
  nft_image_url: string | null;
  nft_name: string | null;
  nft_collection: string | null;
  chain: string | null;
  btc_amount_sats: number | null;
  claim_fee_currency: string | null;
  platform_fee_wallet: string | null;
  platform_fee_percent: number | null;
  payout_tx_hash: string | null;
  presigned_tx_chain: string | null;
  crack_tx_hash: string | null;
  platform_fee_tx_hash: string | null;
  cancel_reason: string | null;
  expired_at: string | null;
  cracked_at: string | null;
  failure_reason: string | null;
  radius_meters: number | null;
  media_url: string | null;
  media_type: string | null;
}

export interface UserProfile {
  id: string;
  handle: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  wallet_address: string;
  joined_at: string;
  orbs_found: number;
  orbs_dropped: number;
  total_earned: number;
  total_dropped: number;
  reputation: number;
  follower_count: number;
  following_count: number;
  is_verified: boolean;
  mm_score: number | null;
  sol_address: string | null;
  eth_address: string | null;
  btc_address: string | null;
  primary_chain: string | null;
  current_streak: number | null;
  longest_streak: number | null;
  vibe_line: string | null;
  interest_tags: string[] | null;
  dms_open: boolean | null;
}

export interface ActivityRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  subtitle: string;
  amount_text: string;
  created_at: string;
  related_profile_id: string | null;
  related_profile_handle: string | null;
  related_profile_avatar_url: string | null;
  tx_hash: string | null;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participant_id: string;
  participant_handle: string;
  participant_avatar: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export function rarityColor(r: OrbRarity): string {
  if (r === 'Legendary') return C.gold;
  if (r === 'Rare') return C.rareBlue;
  return '#ffffff';
}

export function currencyColor(c: OrbCurrency): string {
  if (c === 'BTC') return C.btcOrange;
  if (c === 'ETH') return C.ethBlue;
  return C.primary;
}

export function rarityFromUSD(usd: number): OrbRarity {
  if (usd < 10) return 'Common';
  if (usd <= 100) return 'Rare';
  return 'Legendary';
}

export function truncateAddress(addr: string): string {
  if (!addr || addr.length <= 12) return addr || '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function feeBreakdown(claimFee: number) {
  return {
    ownerEarns: claimFee * FEE.claimOwner,
    platformEarns: claimFee * FEE.claimPlatform,
  };
}

export function withdrawalBreakdown(amount: number) {
  const fee = amount * FEE.withdrawal;
  return { userReceives: amount - fee, platformFee: fee };
}

export const FALLBACK_RATES: Record<OrbCurrency, number> = {
  SOL: 170,
  ETH: 3500,
  BTC: 82000,
};
