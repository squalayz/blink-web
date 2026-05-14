import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encryptAES } from "@/lib/production";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();

    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const cleaned = username.trim().toLowerCase();
    if (cleaned.length < 3 || cleaned.length > 30) {
      return NextResponse.json({ error: "Username must be 3–30 characters" }, { status: 400 });
    }
    if (!/^[a-z0-9_]+$/.test(cleaned)) {
      return NextResponse.json({ error: "Letters, numbers, and underscores only" }, { status: 400 });
    }

    // Check username availability
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", cleaned)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    // Generate a unique fake email for Supabase Auth (wallet-only users have no real email)
    const fakeEmail = `${cleaned}-${Date.now()}@wallet.blink.app`;
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();

    // Create Supabase auth user
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: fakeEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { username: cleaned, wallet_user: true },
    });

    if (signUpError || !authData.user) {
      console.error("Auth createUser error:", signUpError);
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    const userId = authData.user.id;

    // Generate ETH wallet
    const { ethers } = await import("ethers");
    const ethWallet = ethers.Wallet.createRandom();
    const ethAddress = ethWallet.address;
    const ethPrivateKey = ethWallet.privateKey;
    const ethEncryptedKey = encryptAES(ethPrivateKey);

    // Generate SOL wallet
    const { Keypair } = await import("@solana/web3.js");
    const solKeypair = Keypair.generate();
    const solAddress = solKeypair.publicKey.toBase58();
    const solPrivateKeyHex = Buffer.from(solKeypair.secretKey).toString("hex");
    const solEncryptedKey = encryptAES(solPrivateKeyHex);

    // Generate BTC wallet
    let btcAddress = "";
    let btcPrivateKey = "";
    let btcEncryptedKey = "";
    try {
      const ecc = await import("tiny-secp256k1");
      const { ECPairFactory } = await import("ecpair");
      const bitcoin = await import("bitcoinjs-lib");
      const ECPair = ECPairFactory(ecc);
      const keyPair = ECPair.makeRandom();
      const { address } = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(keyPair.publicKey) });
      btcAddress = address || "";
      btcPrivateKey = keyPair.toWIF();
      btcEncryptedKey = encryptAES(btcPrivateKey);
    } catch (btcErr) {
      console.error("BTC wallet generation failed:", btcErr);
    }

    // Save profile with encrypted keys
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      user_id: userId,  // profiles table requires user_id
      username: cleaned,
      handle: cleaned,
      display_name: cleaned,
      eth_address: ethAddress,
      eth_encrypted_key: ethEncryptedKey,
      sol_address: solAddress,
      sol_encrypted_key: solEncryptedKey,
      btc_address: btcAddress || null,
      btc_encrypted_key: btcEncryptedKey || null,
      onboarded: true,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("Profile upsert error:", profileError);
      // Don't fail — keys are still returned, profile can be fixed
    }

    // Create a session for the user
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: fakeEmail,
    });

    // Use signInWithPassword as the session mechanism
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: fakeEmail,
      password: tempPassword,
    });

    if (signInError || !signInData.session) {
      console.error("Sign-in error:", signInError);
      return NextResponse.json({ error: "Account created but login failed. Contact support." }, { status: 500 });
    }

    // Return session tokens + private keys (shown once, never stored in plaintext)
    return NextResponse.json({
      success: true,
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      user: { id: userId, username: cleaned },
      eth_address: ethAddress,
      sol_address: solAddress,
      btc_address: btcAddress,
      // Private keys — shown once to user, never stored in plaintext on server
      eth_private_key: ethPrivateKey,
      sol_private_key: solPrivateKeyHex,
      btc_private_key: btcPrivateKey,
    });

  } catch (err) {
    console.error("create-wallet error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
