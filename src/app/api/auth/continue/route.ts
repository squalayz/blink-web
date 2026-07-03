// BLINK email-first "Continue" — mirrors the iOS app's continueWithEmail flow.
// One endpoint: signs an existing account in, or creates a new one (pre-confirmed,
// with a custodial ETH wallet + profile row) and signs it in. The legacy
// username-based /api/auth/login and /api/auth/signup routes are untouched —
// their accounts live on `username@wallet.blink.app` emails and keep working.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";
import { encryptAES, checkRateLimit } from "@/lib/production";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Derive a profile username from the email local part. Usernames stay in the
// same namespace the legacy flow uses ([a-z0-9_]{3,30}), so both login paths
// can coexist against the same profiles table.
function usernameFromEmail(email: string): string {
  let base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  if (base.length < 3) base = `player_${base}`.replace(/_+$/g, "");
  return base.slice(0, 24);
}

async function pickFreeUsername(base: string): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate =
      attempt === 0 ? base : `${base}_${Math.random().toString(36).slice(2, 6)}`;
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${base}_${Date.now().toString(36)}`;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(`continue:${ip}`, 10, 5 * 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
    }

    const body = await req.json();
    const { email: rawEmail, password } = body as { email?: string; password?: string };

    if (!rawEmail || typeof rawEmail !== "string" || !password || typeof password !== "string") {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const email = rawEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (password.length < 6 || password.length > 200) {
      return NextResponse.json({ error: "Your password needs at least 6 characters." }, { status: 400 });
    }

    // 1) Returning player → straight sign-in.
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });
    if (!signInError && signInData.session) {
      return NextResponse.json({
        success: true,
        is_new: false,
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        user: { id: signInData.user?.id },
      });
    }

    // The synthetic domain backs legacy username accounts — never create there.
    if (email.endsWith("@wallet.blink.app")) {
      return NextResponse.json({ error: "That email already has an account. Please check your password." }, { status: 401 });
    }

    // 2) New player → create a pre-confirmed account. New accounts need a
    //    stronger password than the sign-in minimum.
    if (password.length < 8) {
      return NextResponse.json(
        { error: "No account found — to create one, use a password of at least 8 characters." },
        { status: 401 }
      );
    }

    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { email_user: true, wallet_user: true },
    });

    if (createError || !authData?.user) {
      // An existing email with a wrong password lands here.
      const msg = /already|registered|exists/i.test(createError?.message || "")
        ? "That email already has an account. Please check your password."
        : "Couldn't sign you in right now. Please try again.";
      const status = /already|registered|exists/i.test(createError?.message || "") ? 401 : 500;
      if (status === 500) console.error("continue createUser error:", createError);
      return NextResponse.json({ error: msg }, { status });
    }

    const userId = authData.user.id;
    const username = await pickFreeUsername(usernameFromEmail(email));

    const ethWallet = ethers.Wallet.createRandom();
    const ethAddress = ethWallet.address;
    const ethEncryptedKey = encryptAES(ethWallet.privateKey);

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      user_id: userId,
      username,
      handle: username,
      display_name: username,
      eth_address: ethAddress,
      eth_encrypted_key: ethEncryptedKey,
      onboarded: true,
      updated_at: new Date().toISOString(),
    });
    if (profileError) {
      console.error("continue profile upsert error:", profileError);
    }

    const { data: newSession, error: newSignInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });
    if (newSignInError || !newSession.session) {
      console.error("continue post-create sign-in error:", newSignInError);
      return NextResponse.json(
        { error: "Your account is ready — please try once more." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      is_new: true,
      access_token: newSession.session.access_token,
      refresh_token: newSession.session.refresh_token,
      user: { id: userId, username },
      eth_address: ethAddress,
    });
  } catch (err) {
    console.error("continue error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
