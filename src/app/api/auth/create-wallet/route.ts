import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { supabaseAdmin } from "@/lib/supabase";
import { generateWallet } from "@/lib/wallet";

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "mishmesh-jwt-secret");

export async function POST() {
  try {
    const { address, privateKey, encryptedKey } = generateWallet();
    const walletAddress = address.toLowerCase();

    // Create user
    const { data: newUser, error } = await supabaseAdmin
      .from("users")
      .insert({
        wallet_address: walletAddress,
        wallet_encrypted_key: encryptedKey,
        tos_accepted_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !newUser) {
      // Might already exist
      if (error?.code === "23505") {
        return NextResponse.json({ error: "Wallet already registered. Try connecting instead." }, { status: 409 });
      }
      console.error("Create wallet user error:", error);
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
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
