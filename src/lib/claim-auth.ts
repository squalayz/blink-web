// ════════════════════════════════════════════════════════════════════════════
// BLINK claim — shared claim-code auth for the claim API routes.
// Verifies the code+password pair issued in the BLINK app and returns the
// matching profile row. Server-only (uses the service-role client).
// ════════════════════════════════════════════════════════════════════════════

import "server-only";
import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthUser } from "@/lib/api-auth";

export async function verifyClaimPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  if (!hash) return false;
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
    try {
      // Optional dep: avoid static type resolution when bcryptjs isn't installed.
      const mod = "bcryptjs";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bcrypt: any = await import(/* webpackIgnore: true */ mod).catch(() => null);
      if (bcrypt && typeof bcrypt.compare === "function") {
        return await bcrypt.compare(password, hash);
      }
      return false;
    } catch {
      return false;
    }
  }
  const sha = createHash("sha256").update(password).digest("hex");
  return sha === hash.toLowerCase();
}

export interface ClaimProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  claimable_points: number;
  total_claimed_tokens: number;
  claim_code: string;
}

export async function authenticateClaim(
  claimCode: string,
  password: string,
): Promise<ClaimProfile | null> {
  if (!claimCode || !password) return null;

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, username, display_name, claimable_points, claim_password_hash, total_claimed_tokens",
    )
    .eq("claim_code", claimCode.trim().toUpperCase())
    .maybeSingle();

  if (error || !profile) return null;

  const ok = await verifyClaimPassword(password, profile.claim_password_hash || "");
  if (!ok) return null;

  return {
    id: profile.id,
    username: profile.username ?? null,
    display_name: profile.display_name ?? null,
    claimable_points: Number(profile.claimable_points || 0),
    total_claimed_tokens: Number(profile.total_claimed_tokens || 0),
    claim_code: claimCode.trim().toUpperCase(),
  };
}

// Two ways in, mirroring /api/claim/execute: a logged-in web session
// (Authorization bearer) or the claim-code + password pair from the iOS app.
export async function resolveClaimProfile(
  req: NextRequest,
  body: { claim_code?: unknown; password?: unknown } | null,
): Promise<ClaimProfile | null> {
  const claimCode = (body?.claim_code || "").toString().trim().toUpperCase();
  const password = (body?.password || "").toString();

  if (claimCode && password) {
    return authenticateClaim(claimCode, password);
  }

  const authUser = await getAuthUser(req);
  if (!authUser) return null;

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id, username, display_name, claimable_points, total_claimed_tokens, claim_code")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error || !profile) return null;

  return {
    id: profile.id,
    username: profile.username ?? null,
    display_name: profile.display_name ?? null,
    claimable_points: Number(profile.claimable_points || 0),
    total_claimed_tokens: Number(profile.total_claimed_tokens || 0),
    claim_code: (profile.claim_code || "").toString(),
  };
}
