// POST /api/claim/admin/login — password gate for /claim/admin.
// Compares against CLAIM_ADMIN_PASSWORD (fallback ADMIN_PASSWORD) and issues
// a 12-hour httpOnly signed cookie. DELETE logs out.

import { NextRequest, NextResponse } from "next/server";
import {
  checkAdminPassword,
  signSession,
  ADMIN_COOKIE,
  ADMIN_TTL_S,
  SESSION_COOKIE_OPTS,
} from "@/lib/claim-v3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = (body?.password || "").toString();

  if (!checkAdminPassword(password)) {
    // Small fixed delay to blunt brute-force attempts.
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, signSession({ role: "claim_admin" }, ADMIN_TTL_S), {
    ...SESSION_COOKIE_OPTS,
    maxAge: ADMIN_TTL_S,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { ...SESSION_COOKIE_OPTS, maxAge: 0 });
  return res;
}
