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
