import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { supabaseAdmin } from "@/lib/supabase";
import { generateWallet } from "@/lib/wallet";
import { ethers } from "ethers";

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "mishmesh-jwt-secret");

export async function POST(req: NextRequest) {
  try {
    // ── Login with existing private key ──
    let body: any = {};
    try { body = await req.json(); } catch {}

    if (body.privateKey) {
      // Derive address from private key
      let wallet: ethers.Wallet;
      try {
        wallet = new ethers.Wallet(body.privateKey);
      } catch {
        return NextResponse.json({ error: "Invalid private key" }, { status: 400 });
      }
      const walletAddress = wallet.address.toLowerCase();

      // Look up existing user
      const { data: existingUser } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("wallet_address", walletAddress)
        .single();

      if (!existingUser) {
        return NextResponse.json({ error: "No account found for this key. Create one first." }, { status: 404 });
      }

      // Create JWT session
      const token = await new SignJWT({
        sub: existingUser.id,
        address: walletAddress,
        iat: Math.floor(Date.now() / 1000),
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(JWT_SECRET);

      cookies().set("mm-session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });

      return NextResponse.json({ ok: true, address: walletAddress, userId: existingUser.id });
    }

    // ── Create new wallet (retry on rare collision or duplicate request) ──
    let newUser: any = null;
    let privateKey = "";
    let walletAddress = "";
    let lastError: any = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const generated = generateWallet();
      walletAddress = generated.address.toLowerCase();
      privateKey = generated.privateKey;

      const { data, error: insertError } = await supabaseAdmin
        .from("users")
        .insert({
          wallet_address: walletAddress,
          wallet_encrypted_key: generated.encryptedKey,
          tos_accepted_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (!insertError && data) {
        newUser = data;
        break;
      }

      lastError = insertError;
      // 23505 = unique violation — retry with fresh wallet
      if (insertError?.code === "23505") {
        console.warn(`Wallet create attempt ${attempt + 1} hit duplicate, retrying...`);
        continue;
      }

      // Any other error — bail
      console.error("Create wallet user error:", insertError);
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    if (!newUser) {
      console.error("Create wallet failed after 3 attempts:", lastError);
      return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
    }

    // Create agent_profiles
    await supabaseAdmin.from("agent_profiles").insert({
      user_id: newUser.id,
      match_count: 0,
      conversation_count: 0,
      reputation_score: 0,
      reputation_count: 0,
    });

    // Create JWT session
    const token = await new SignJWT({
      sub: newUser.id,
      address: walletAddress,
      iat: Math.floor(Date.now() / 1000),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    cookies().set("mm-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      ok: true,
      address: walletAddress,
      privateKey, //  SHOWN ONCE — user must save this
      userId: newUser.id,
    });
  } catch (err: any) {
    console.error("Create wallet error:", err);
    return NextResponse.json({ error: err.message || "Wallet creation failed" }, { status: 500 });
  }
}
