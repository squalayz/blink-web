import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
    try {
      // Optional dep: avoid static type resolution when bcryptjs isn't installed.
      const mod = "bcryptjs";
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const claim_code: string = (body?.claim_code || "").toString().trim().toUpperCase();
    const password: string = (body?.password || "").toString();

    if (!claim_code || !password) {
      return NextResponse.json({ error: "Claim code and password required" }, { status: 400 });
    }

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, claimable_points, username, display_name, claim_password_hash")
      .eq("claim_code", claim_code)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json({ error: "Invalid code or password" }, { status: 401 });
    }

    const ok = await verifyPassword(password, profile.claim_password_hash || "");
    if (!ok) {
      return NextResponse.json({ error: "Invalid code or password" }, { status: 401 });
    }

    const claimable_points = Number(profile.claimable_points || 0);
    const tokens_available = Math.floor(claimable_points / 1000);

    return NextResponse.json({
      profile_id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      claimable_points,
      tokens_available,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
