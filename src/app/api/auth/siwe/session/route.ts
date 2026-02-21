import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { supabaseAdmin } from "@/lib/supabase";

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "mishmesh-jwt-secret");

export async function GET() {
  const token = cookies().get("mm-session")?.value;
  if (!token) return NextResponse.json({ user: null });

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.sub;
    const address = payload.address as string;

    // Fetch fresh user data
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, wallet_address, name, avatar_url, email, onboarded, tier")
      .eq("id", userId)
      .single();

    if (!user) return NextResponse.json({ user: null });

    return NextResponse.json({
      user: {
        id: user.id,
        address: user.wallet_address,
        name: user.name || "",
        avatar_url: user.avatar_url || "",
        email: user.email || "",
        onboarded: user.onboarded,
        tier: user.tier,
      },
    });
  } catch (err) {
    // Invalid/expired token
    cookies().delete("mm-session");
    return NextResponse.json({ user: null });
  }
}
