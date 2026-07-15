// ════════════════════════════════════════════════════════════════════════════
// Airdrop Claim v3 helpers — SERVER ONLY.
//
// - Blink Code normalization (XXXX-XXXX, alphabet without 0/O/1/I/L)
// - HMAC-signed httpOnly session tokens (player: 20 min, admin: 12 h)
// - IP hashing for the rate-limit log (never store raw IPs)
//
// The private Blink Code is the ONLY credential. No email, no OTP, ever.
// Never log full codes — first 2 chars max.
// ════════════════════════════════════════════════════════════════════════════

import "server-only";
import { createHmac, createHash, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

function secret(): string {
  const s = process.env.CLAIM_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("CLAIM_SESSION_SECRET missing or too short (need 32+ chars)");
  }
  return s;
}

// ── Blink Code normalization ────────────────────────────────────────────────
// Codes use A-Z + 2-9 minus O/I/L (and 0/1 are excluded from the alphabet).
// Accept sloppy input: lowercase, spaces, missing/extra dashes.

export const PLAYER_COOKIE = "bw_claim";
export const ADMIN_COOKIE = "bw_claim_admin";
export const PLAYER_TTL_S = 20 * 60;
export const ADMIN_TTL_S = 12 * 60 * 60;

export function normalizeBlinkCode(raw: string): {
  cleaned: string; // "K7QMX9F2"
  formatted: string; // "K7QM-X9F2" — matches claim_codes.code
  looksLikeTrainerCode: boolean;
} {
  const cleaned = (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Public trainer codes are "BL-XXXX". The private-code alphabet excludes L,
  // so no real Blink Code can ever start with "BL".
  const looksLikeTrainerCode = cleaned.startsWith("BL");
  const formatted =
    cleaned.length === 8 ? `${cleaned.slice(0, 4)}-${cleaned.slice(4)}` : "";
  return { cleaned, formatted, looksLikeTrainerCode };
}

// Safe fragment for logs: never more than the first 2 characters.
export function codeLogFragment(raw: string): string {
  const { cleaned } = normalizeBlinkCode(raw);
  return cleaned ? `${cleaned.slice(0, 2)}******` : "(empty)";
}

// ── Signed session tokens ───────────────────────────────────────────────────

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function hmac(data: string): string {
  return b64url(createHmac("sha256", secret()).update(data).digest());
}

export function signSession(payload: Record<string, unknown>, ttlSeconds: number): string {
  const body = b64url(
    Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds })),
  );
  return `${body}.${hmac(body)}`;
}

export function verifySession(token: string | undefined): Record<string, unknown> | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = hmac(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    if (typeof payload?.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// Player session bound to a profile_id.
export function getPlayerProfileId(req: NextRequest): string | null {
  const payload = verifySession(req.cookies.get(PLAYER_COOKIE)?.value);
  const pid = payload?.pid;
  return typeof pid === "string" && pid.length > 0 ? pid : null;
}

export function isAdminRequest(req: NextRequest): boolean {
  const payload = verifySession(req.cookies.get(ADMIN_COOKIE)?.value);
  return payload?.role === "claim_admin";
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.CLAIM_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
  if (!expected || !password) return false;
  const a = createHash("sha256").update(password).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

// ── IP hashing ──────────────────────────────────────────────────────────────

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.ip ||
    "unknown"
  );
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(`${ip}|${secret()}`).digest("hex");
}

export const SESSION_COOKIE_OPTS = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
