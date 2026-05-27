// One-time ETH private key export. Requires fresh password re-prompt.
// Rate-limited aggressively. The plaintext key is in the response only for
// this single call — never logged or stored.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decryptAES } from "@/lib/production";
import { requireAuth, rateLimitByUser, verifyUserPassword } from "@/lib/api-auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth(req);
    if (authError) return authError;

    const rlError = rateLimitByUser(user!.id, "export-key", 5, 5 * 60_000);
    if (rlError) return rlError;

    const body = await req.json();
    const { password } = body as { password?: string };

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }
    if (!user!.email) {
      return NextResponse.json({ error: "User has no email" }, { status: 400 });
    }

    const valid = await verifyUserPassword(user!.email, password);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const { data: profile, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("eth_encrypted_key")
      .eq("id", user!.id)
      .single();

    if (fetchError || !profile?.eth_encrypted_key) {
      return NextResponse.json({ error: "No ETH key found" }, { status: 404 });
    }

    const plaintext = decryptAES(profile.eth_encrypted_key);
    const privateKey = plaintext.startsWith("0x") ? plaintext : `0x${plaintext}`;

    return NextResponse.json({
      chain: "eth",
      private_key: privateKey,
    });
  } catch (err) {
    console.error("export-key error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
