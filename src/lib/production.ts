// ══════════════════════════════════════════════════════════════
// BLINK — Production Hardening: Shared Utilities
//
// This module provides:
//   1. AES-256-GCM encryption (replaces XOR)
//   2. Environment validation (fails fast)
//   3. Input sanitization (prevents injection)
//   4. Rate limiter (in-memory, per-IP)
//   5. Request validation helpers
//   6. Proper bonding curve math (matches Solidity)
//   7. Structured logging
// ══════════════════════════════════════════════════════════════

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// ═══ 1. ENVIRONMENT VALIDATION ═══
// Fails at import time if critical vars missing

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXTAUTH_SECRET",
  "WALLET_ENCRYPTION_KEY",
] as const;

const missingEnvVars = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnvVars.length > 0 && process.env.NODE_ENV === "production") {
  throw new Error(`FATAL: Missing required environment variables: ${missingEnvVars.join(", ")}`);
}

// ═══ 2. AES-256-GCM ENCRYPTION ═══
// Replaces the XOR "encryption" in wallet.ts
// Uses scrypt key derivation + random IV + auth tag

const ENC_PASSWORD = process.env.WALLET_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "";
const ENC_SALT = "mishmesh-v17-salt"; // Static salt (password is already high-entropy)

function deriveKey(): Buffer {
  return scryptSync(ENC_PASSWORD, ENC_SALT, 32);
}

export function encryptAES(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: base64(iv + authTag + ciphertext)
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptAES(encoded: string): string {
  const key = deriveKey();
  const data = Buffer.from(encoded, "base64");
  const iv = data.subarray(0, 16);
  const authTag = data.subarray(16, 32);
  const ciphertext = data.subarray(32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

// Detect legacy XOR-encrypted keys and re-encrypt
export function isLegacyEncrypted(encoded: string): boolean {
  try {
    const data = Buffer.from(encoded, "base64");
    // AES-GCM output is always >= 32 bytes (16 IV + 16 authTag + ≥0 ciphertext)
    // Private keys are 64 hex chars = 64 bytes plaintext
    // XOR output would be exactly 64 bytes
    // AES output would be 16+16+64 = 96 bytes
    return data.length < 80; // XOR output is shorter
  } catch {
    return true; // If it fails to decode, treat as legacy
  }
}

// ═══ 3. INPUT SANITIZATION ═══

export function sanitizeString(input: string, maxLength: number = 100): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/[<>\"'`\\]/g, "") // Strip injection chars
    .replace(/[\x00-\x1F\x7F]/g, "") // Strip control chars
    .trim()
    .slice(0, maxLength);
}

export function sanitizeTokenSymbol(symbol: string): string {
  return symbol
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 6);
}

export function sanitizeTokenName(name: string): string {
  return sanitizeString(name, 50).replace(/[^a-zA-Z0-9\s\-_.]/g, "");
}

export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function isValidETHAmount(amount: number): boolean {
  return typeof amount === "number" && isFinite(amount) && amount > 0 && amount <= 1000;
}

export function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

// ═══ 4. RATE LIMITER (in-memory) ═══

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

// Clean expired buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt < now) rateBuckets.delete(key);
  }
}, 5 * 60 * 1000);

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (bucket.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count++;
  return { allowed: true, remaining: maxRequests - bucket.count };
}

// Preset rate limits
export const RATE_LIMITS = {
  TRADE: { max: 10, window: 60_000 },         // 10 trades per minute
  PROPOSE: { max: 3, window: 300_000 },         // 3 proposals per 5 min
  SEARCH: { max: 30, window: 60_000 },          // 30 searches per minute
  AUTH: { max: 5, window: 300_000 },             // 5 auth attempts per 5 min
  GENERAL: { max: 60, window: 60_000 },          // 60 requests per minute
} as const;

// ═══ 5. BONDING CURVE MATH ═══
// Must match BondingCurve.sol exactly

const RESERVE_RATIO = 500_000;  // 50% in ppm
const PPM = 1_000_000;
const TRADE_FEE_BPS = 100;     // 1%

export function calculateBuyTokens(
  ethAmount: number,
  reserveBalance: number,
  tokenBalance: number
): { tokensOut: number; fee: number; newPrice: number } {
  const fee = ethAmount * TRADE_FEE_BPS / 10000;
  const netETH = ethAmount - fee;

  if (reserveBalance <= 0 || tokenBalance <= 0) {
    return { tokensOut: 0, fee, newPrice: 0 };
  }

  // Matches Solidity: (tokenBalance * netETH * RESERVE_RATIO) / (reserveBalance * PPM + netETH * RESERVE_RATIO)
  const tokensOut = (tokenBalance * netETH * RESERVE_RATIO) / (reserveBalance * PPM + netETH * RESERVE_RATIO);

  const newReserve = reserveBalance + netETH;
  const newTokenBalance = tokenBalance - tokensOut;
  const newPrice = newTokenBalance > 0
    ? (newReserve * PPM) / (newTokenBalance * RESERVE_RATIO)
    : 0;

  return { tokensOut: Math.floor(tokensOut), fee, newPrice };
}

export function calculateSellETH(
  tokenAmount: number,
  reserveBalance: number,
  tokenBalance: number
): { ethOut: number; fee: number; newPrice: number } {
  if (reserveBalance <= 0 || tokenBalance <= 0) {
    return { ethOut: 0, fee: 0, newPrice: 0 };
  }

  // Matches Solidity: (reserveBalance * tokenAmount * RESERVE_RATIO) / (tokenBalance * PPM + tokenAmount * RESERVE_RATIO)
  const grossETH = (reserveBalance * tokenAmount * RESERVE_RATIO) / (tokenBalance * PPM + tokenAmount * RESERVE_RATIO);
  const fee = grossETH * TRADE_FEE_BPS / 10000;
  const netETH = grossETH - fee;

  const newReserve = Math.max(0, reserveBalance - grossETH);
  const newTokenBalance = tokenBalance + tokenAmount;
  const newPrice = newTokenBalance > 0
    ? (newReserve * PPM) / (newTokenBalance * RESERVE_RATIO)
    : 0;

  return { ethOut: Math.max(0, netETH), fee, newPrice: Math.max(0, newPrice) };
}

export function getCurrentPrice(reserveBalance: number, tokenBalance: number): number {
  if (tokenBalance <= 0) return 0;
  return (reserveBalance * PPM) / (tokenBalance * RESERVE_RATIO);
}

// ═══ 6. STRUCTURED LOGGING ═══

type LogLevel = "info" | "warn" | "error" | "debug";

export function log(level: LogLevel, message: string, data?: Record<string, any>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };
  if (level === "error") console.error(JSON.stringify(entry));
  else if (level === "warn") console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

// ═══ 7. RESPONSE HELPERS ═══

export function apiError(message: string, status: number = 400, details?: any) {
  log("warn", `API error: ${message}`, { status, details });
  return Response.json({ error: message }, { status });
}

export function apiSuccess(data: any) {
  return Response.json(data);
}
