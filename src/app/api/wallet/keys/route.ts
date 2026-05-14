import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decryptAES } from "@/lib/production";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch encrypted keys from profiles
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select(
        "sol_encrypted_key, eth_encrypted_key, btc_encrypted_key"
      )
      .eq("id", user.id)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json(
        { error: "No wallet keys found" },
        { status: 404 }
      );
    }

    // 3. Decrypt and return
    const sol_key = profile.sol_encrypted_key
      ? decryptAES(profile.sol_encrypted_key)
      : null;
    const eth_key = profile.eth_encrypted_key
      ? decryptAES(profile.eth_encrypted_key)
      : null;
    const btc_key = profile.btc_encrypted_key
      ? decryptAES(profile.btc_encrypted_key)
      : null;

    return NextResponse.json({ sol_key, eth_key, btc_key });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("Wallet keys fetch error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
