// Server-side helpers for Genesis Drop announcements.
//
// PRIVACY-FIRST: a Genesis Drop is anchored near the first opener. The drop
// owner never publishes coords — only the drop slug + image + tagline. This
// module exists as a safety net: anything the drop owner enters as an
// announcement passes through sanitizeDropAnnouncement() before we ever
// echo it out (Telegram, X, etc.). If a coord-like sequence sneaks in, we
// strip it.

import "server-only";

// Matches: 33.3528, -111.7891 / 33.3528,-111.7891 / 33.3 -111.7 / lat: 33.3 lng: -111.7
// — any pair of decimal numbers separated by whitespace, comma, slash, or a
// short connector like "by", "and", "/". Also strips standalone decimals with
// 3+ fractional digits (geographic precision tells).
const COORD_PAIR =
  /-?\d{1,3}\.\d{2,}\s*[,/\s]+(?:and\s+|by\s+|near\s+)?-?\d{1,3}\.\d{2,}/gi;
const HIGH_PRECISION_DECIMAL = /-?\b\d{1,3}\.\d{4,}\b/g;
const LAT_LNG_TOKEN = /\b(lat|lng|long|latitude|longitude)\b[:=]?\s*-?\d[\d.\-,\s]*/gi;

export function sanitizeDropAnnouncement(input: string): string {
  if (!input || typeof input !== "string") return "";
  let out = input;
  out = out.replace(LAT_LNG_TOKEN, "[redacted]");
  out = out.replace(COORD_PAIR, "[redacted]");
  out = out.replace(HIGH_PRECISION_DECIMAL, "[redacted]");
  return out.trim();
}

// Pick a random point within `radiusM` meters of (centerLat, centerLng) with
// uniform area distribution (sqrt(rand) on radius).
export function randomPointWithinRadius(
  centerLat: number,
  centerLng: number,
  radiusM: number,
): { lat: number; lng: number } {
  const LAT_M_PER_DEG = 111_320;
  const lngMetersPerDeg = LAT_M_PER_DEG * Math.cos((centerLat * Math.PI) / 180);
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radiusM;
  const dN = Math.cos(angle) * r;
  const dE = Math.sin(angle) * r;
  return {
    lat: centerLat + dN / LAT_M_PER_DEG,
    lng: centerLng + dE / lngMetersPerDeg,
  };
}

// Owner-only access: ADMIN_PIN matches and (optionally) OWNER_USER_ID matches
// the authenticated user. Returns true if the caller is allowed to create
// Genesis Drops.
export function isOwnerRequest(opts: {
  headerPin: string | null;
  userId: string | null;
}): boolean {
  const envPin = (process.env.ADMIN_PIN || "").trim();
  if (!envPin) return false;
  if (!opts.headerPin || opts.headerPin !== envPin) return false;
  const ownerId = (process.env.OWNER_USER_ID || "").trim();
  if (ownerId && opts.userId !== ownerId) return false;
  return true;
}
