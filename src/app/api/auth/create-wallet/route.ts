// BLINK custodial signup.
// Username + password creates a Supabase auth user, generates an ETH wallet,
// encrypts the private key at rest, and returns a session token.
// Private key is NEVER returned here — users access funds by signing back in.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";
import { encryptAES, checkRateLimit } from "@/lib/production";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Stable fake-email so the same username can sign back in with their password.
// Supabase Auth requires an email; users never see this.
function fakeEmail(username: string): string {
  return `${username}@wallet.blink.app`;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(`signup:${ip}`, 5, 5 * 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many signup attempts. Try again later." }, { status: 429 });
    }

    const body = await req.json();
    const { username, password } = body as { username?: string; password?: string };

    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const cleaned = username.trim().toLowerCase();
    if (cleaned.length < 3 || cleaned.length > 30) {
      return NextResponse.json({ error: "Username must be 3-30 characters" }, { status: 400 });
    }
    if (!/^[a-z0-9_]+$/.test(cleaned)) {
      return NextResponse.json({ error: "Letters, numbers, and underscores only" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (password.length > 200) {
      return NextResponse.json({ error: "Password too long" }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", cleaned)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const email = fakeEmail(cleaned);

    // Create Supabase auth user with the real user-supplied password.
    // Supabase hashes the password (bcrypt). We use this same password for re-verification
    // on sends and key exports, so we never need to store a duplicate hash.
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username: cleaned, wallet_user: true },
    });

    if (signUpError || !authData.user) {
      console.error("Auth createUser error:", signUpError);
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    const userId = authData.user.id;

    const ethWallet = ethers.Wallet.createRandom();
    const ethAddress = ethWallet.address;
    const ethEncryptedKey = encryptAES(ethWallet.privateKey);

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      user_id: userId,
      username: cleaned,
      handle: cleaned,
      display_name: cleaned,
      eth_address: ethAddress,
      eth_encrypted_key: ethEncryptedKey,
      onboarded: true,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("Profile upsert error:", profileError);
    }

    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      console.error("Sign-in error:", signInError);
      return NextResponse.json(
        { error: "Account created but login failed. Try signing in." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      user: { id: userId, username: cleaned },
      eth_address: ethAddress,
    });
  } catch (err) {
    console.error("create-wallet error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
