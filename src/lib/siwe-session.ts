// ════════════════════════════════════════════════════════════════════════════
// BLINK Phase 3 — SIWE session
//
// We sign a short-lived JWT with NEXTAUTH_SECRET and persist it in an httpOnly
// cookie. This is the source of truth for "is this wallet logged in" on the
// server. We never store private keys, never broadcast transactions, and
// only read public on-chain data.
// ════════════════════════════════════════════════════════════════════════════

import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const COOKIE_NAME = "blink_siwe";
const NONCE_COOKIE = "blink_siwe_nonce";
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h

function secretKey(): Uint8Array {
  const secret =
    process.env.NEXTAUTH_SECRET ||
    process.env.WALLET_ENCRYPTION_KEY ||
    "blink-dev-secret-do-not-ship-this-value";
  return new TextEncoder().encode(secret);
}

export type SiweSession = {
  address: string; // lowercased EVM address
  chainId: number;
  issuedAt: number;
};

export async function createSiweSession(s: SiweSession): Promise<string> {
  return await new SignJWT({
    address: s.address.toLowerCase(),
    chainId: s.chainId,
    iat: s.issuedAt,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function readSiweSession(
  req?: NextRequest,
): Promise<SiweSession | null> {
  const token = req
    ? req.cookies.get(COOKIE_NAME)?.value
    : (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.address !== "string") return null;
    return {
      address: payload.address.toLowerCase(),
      chainId: Number(payload.chainId ?? 1),
      issuedAt: Number(payload.iat ?? 0),
    };
  } catch {
    return null;
  }
}

export async function clearSiweSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  store.delete(NONCE_COOKIE);
}

export async function setSiweCookies(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  // Nonce is single-use; clear it once a session is minted.
  store.delete(NONCE_COOKIE);
}

export async function setNonceCookie(nonce: string): Promise<void> {
  const store = await cookies();
  store.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 min to sign
  });
}

export async function readNonceCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(NONCE_COOKIE)?.value ?? null;
}

export const SIWE_COOKIE_NAMES = {
  session: COOKIE_NAME,
  nonce: NONCE_COOKIE,
};
