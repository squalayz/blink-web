import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "./production";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Verify Supabase auth session from request.
 * Returns the authenticated user or null.
 */
export async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

/**
 * Require auth — returns error response if not authenticated.
 */
export async function requireAuth(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user, error: null };
}

/**
 * Resolve the authenticated user's custodial ETH wallet address from
 * their profile row. Returns { user, address } on success, or an error
 * NextResponse if anything is missing.
 */
export async function requireUserWithEthAddress(req: NextRequest): Promise<
  | { user: { id: string; email: string | null }; address: string; error: null }
  | { user: null; address: null; error: NextResponse }
> {
  const { user, error } = await requireAuth(req);
  if (error) return { user: null, address: null, error };
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("eth_address")
    .eq("id", user!.id)
    .maybeSingle();
  const addr = profile?.eth_address as string | undefined;
  if (!addr) {
    return {
      user: null,
      address: null,
      error: NextResponse.json(
        { error: "No custodial ETH wallet on account" },
        { status: 400 },
      ),
    };
  }
  return {
    user: { id: user!.id, email: user!.email ?? null },
    address: addr.toLowerCase(),
    error: null,
  };
}

/**
 * Re-verify a user's password by calling signInWithPassword. Returns true if the
 * password is correct, false otherwise. Used for password re-prompts before
 * sensitive actions (sending tx, exporting private keys).
 */
export async function verifyUserPassword(email: string, password: string): Promise<boolean> {
  if (!email || !password) return false;
  // Use a throwaway client so we don't affect the admin session.
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) return false;
  // Don't leave a lingering session on the throwaway client.
  await client.auth.signOut();
  return true;
}

/**
 * Rate limit by user ID. Returns error response if rate limited.
 */
export function rateLimitByUser(userId: string, action: string, maxRequests: number, windowMs: number) {
  const key = `${action}:${userId}`;
  const { allowed, remaining } = checkRateLimit(key, maxRequests, windowMs);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later.", remaining: 0 },
      { status: 429 }
    );
  }
  return null;
}

/**
 * Strip HTML tags from a string.
 */
export function stripHtml(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input.replace(/<[^>]*>/g, "").trim();
}

/**
 * Validate text field: strip HTML, enforce max length.
 */
export function sanitizeText(input: unknown, maxLength: number = 500): string {
  if (!input || typeof input !== "string") return "";
  return stripHtml(input).slice(0, maxLength);
}

/**
 * Validate that a number is positive and finite.
 */
export function isPositiveFinite(n: unknown): n is number {
  return typeof n === "number" && isFinite(n) && n > 0;
}

/**
 * Validate latitude (-90 to 90).
 */
export function isValidLat(lat: unknown): lat is number {
  return typeof lat === "number" && isFinite(lat) && lat >= -90 && lat <= 90;
}

/**
 * Validate longitude (-180 to 180).
 */
export function isValidLng(lng: unknown): lng is number {
  return typeof lng === "number" && isFinite(lng) && lng >= -180 && lng <= 180;
}
