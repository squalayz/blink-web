import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SiweMessage } from "siwe";
import { SignJWT } from "jose";
import { supabaseAdmin } from "@/lib/supabase";
import { generateWallet } from "@/lib/wallet";

const JWT_SECRET_STR = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET_STR && process.env.NODE_ENV === "production") {
  throw new Error("FATAL: NEXTAUTH_SECRET required");
}
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STR || "dev-only-insecure-key-do-not-use-in-prod");

const ALLOWED_DOMAINS = ["mishmesh.ai", "www.mishmesh.ai", "localhost:3000"];

export async function POST(req: NextRequest) {
  try {
    const { message, signature } = await req.json();
    if (!message || !signature) {
      return NextResponse.json({ error: "Missing message or signature" }, { status: 400 });
    }

    const storedNonce = cookies().get("siwe-nonce")?.value;
    if (!storedNonce) {
      return NextResponse.json({ error: "Nonce expired. Please try again." }, { status: 400 });
    }

    const siweMessage = new SiweMessage(message);

    // Domain validation — prevent phishing
    if (process.env.NODE_ENV === "production" && !ALLOWED_DOMAINS.includes(siweMessage.domain)) {
      return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
    }

    const result = await siweMessage.verify({ signature, nonce: storedNonce });

    if (!result.success) {
      return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
    }

    const walletAddress = result.data.address.toLowerCase();

    // Clear nonce (one-time use)
    cookies().delete("siwe-nonce");

    // Upsert user in Supabase — wallet_address is primary identity
    let { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, wallet_address, name, avatar_url, onboarded")
      .eq("wallet_address", walletAddress)
      .single();

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // New user — create with wallet address
      isNewUser = true;
      const { data: newUser, error } = await supabaseAdmin
        .from("users")
        .insert({
          wallet_address: walletAddress,
          tos_accepted_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error || !newUser) {
        console.error("User creation error:", error);
        return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
      }
      userId = newUser.id;

      // Create agent_profiles entry
      await supabaseAdmin.from("agent_profiles").insert({
        user_id: userId,
        match_count: 0,
        conversation_count: 0,
        reputation_score: 0,
        reputation_count: 0,
      });
    }

    // Check if they need a platform-managed wallet (for trading)
    // External wallets (MetaMask etc.) are for identity only
    // Trading uses the encrypted wallet we manage
    const { data: walletCheck } = await supabaseAdmin
      .from("users")
      .select("wallet_encrypted_key")
      .eq("id", userId)
      .single();

    if (!walletCheck?.wallet_encrypted_key) {
      // Generate a trading wallet (separate from their identity wallet)
      const { address: tradingAddr, encryptedKey } = generateWallet();
      await supabaseAdmin.from("users").update({
        wallet_encrypted_key: encryptedKey,
        trading_wallet_address: tradingAddr,
      }).eq("id", userId);
    }

    // Create JWT session
    const token = await new SignJWT({
      sub: userId,
      address: walletAddress,
      iat: Math.floor(Date.now() / 1000),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    // Set session cookie
    cookies().set("mm-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({
      ok: true,
      isNewUser,
      userId,
      address: walletAddress,
    });
  } catch (err: any) {
    console.error("SIWE verify error:", err);
    return NextResponse.json({ error: err.message || "Verification failed" }, { status: 500 });
  }
}
