export const C = {
  bg: '#0A0A0F',
  surface: '#111118',
  s2: '#1C1C28',
  card: 'rgba(255,255,255,0.04)',
  cardSolid: '#1C1C28',
  cardBorder: 'rgba(255,255,255,0.06)',
  primary: '#9945FF',
  accent: '#14F195',
  gold: '#F59E0B',
  text: '#F9FAFB',
  muted: '#9CA3AF',
  rareBlue: '#3B82F6',
  border: 'rgba(255,255,255,0.06)',
  danger: '#EF4444',
  btcOrange: '#F7931A',
  ethBlue: '#627EEA',
  solPurple: '#9945FF',
  glass: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.06)',
  // Extended colors used in tasks, squads, orb pages
  indigo: '#6366F1',
  cyan: '#06B6D4',
};

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
export type OrbStatus = 'pending' | 'claimed' | 'cracked' | 'cancelled' | 'expired' | 'failed';

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
