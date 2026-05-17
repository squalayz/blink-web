// Shared helpers for Spirit Gift routes — short code, spawn placement, geo math.

import { randomBytes } from "crypto";
import { haversineM } from "@/lib/geo-fuzz";

const SHORT_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/1/i/l/o
const SHORT_CODE_LEN = 8;

export function generateShortCode(): string {
  const bytes = randomBytes(SHORT_CODE_LEN);
  let out = "";
  for (let i = 0; i < SHORT_CODE_LEN; i++) {
    out += SHORT_CODE_ALPHABET[bytes[i] % SHORT_CODE_ALPHABET.length];
  }
  return out;
}

// Stable numeric seed from a short code — used so the spawn point for a given
// gift is deterministic between an anon client-side preview (walking before
// sign-in) and the real authed /open call. Without a stable seed the previewed
// spawn would jump to a different location once the user signs in at the
// catch moment.
export function seedFromCode(code: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

// Place the gift creature 80-300m from the recipient's anchor, in a random
// direction. Returns lat/lng of the spawn.
export function pickSpawnPoint(
  anchorLat: number,
  anchorLng: number,
  rngSeed?: number
): { lat: number; lng: number; distanceM: number } {
  const seed = rngSeed ?? Date.now();
  const rnd1 = ((Math.sin(seed * 9301 + 49297) * 233280) % 1 + 1) % 1;
  const rnd2 = ((Math.sin(seed * 7919 + 13313) * 233280) % 1 + 1) % 1;
  const distance = 80 + rnd1 * 220;
  const bearing = rnd2 * 2 * Math.PI;
  const dLat = (distance * Math.cos(bearing)) / 111000;
  const cosLat = Math.cos((anchorLat * Math.PI) / 180);
  const dLng =
    (distance * Math.sin(bearing)) / (111000 * (Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat));
  return { lat: anchorLat + dLat, lng: anchorLng + dLng, distanceM: distance };
}

export { haversineM };

export function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    isFinite(lat) &&
    isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export interface GiftAssetPayload {
  // ETH / BLINK
  amount?: number;
  // NFT
  contract?: string;
  token_id?: string;
  // Display
  preview_image?: string;
  preview_name?: string;
}

export interface GiftRow {
  id: string;
  short_code: string;
  sender_id: string;
  recipient_username: string | null;
  recipient_id: string | null;
  asset_type: "nft" | "blink" | "eth";
  asset_payload: GiftAssetPayload;
  mode: "direct" | "public";
  anonymous: boolean;
  message: string | null;
  status: "pending" | "spawned" | "claimed" | "expired" | "refunded" | "failed";
  spawn_id: string | null;
  spawn_anchor_lat: number | null;
  spawn_anchor_lng: number | null;
  expires_at: string;
  created_at: string;
  opened_at: string | null;
  claimed_at: string | null;
  refunded_at: string | null;
  on_chain_escrow_tx: string | null;
  on_chain_claim_tx: string | null;
}
