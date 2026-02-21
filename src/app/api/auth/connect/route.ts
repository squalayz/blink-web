import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { supabaseAdmin } from "@/lib/supabase";

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "mishmesh-jwt-secret");

async function getUser(req: NextRequest) {
  const token = cookies().get("mm-session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { id: payload.sub as string, address: payload.address as string };
  } catch { return null; }
}

// GET — list connected accounts
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("connected_accounts")
    .select("id, provider, provider_username, provider_avatar, provider_email, connected_at")
    .eq("user_id", user.id)
    .order("connected_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });

  // Return connected + available providers
  const connected = data || [];
  const allProviders = ["twitter", "instagram", "email", "google", "discord", "telegram"];
  const connectedProviders = connected.map(c => c.provider);
  const available = allProviders.filter(p => !connectedProviders.includes(p));

  return NextResponse.json({ connected, available });
}

// POST — connect a new account
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { provider, action } = body;

  // ── CONNECT EMAIL (magic link) ──
  if (action === "connect" && provider === "email") {
    const { email } = body;
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    // Check if email already connected to another user
    const { data: existing } = await supabaseAdmin
      .from("connected_accounts")
      .select("user_id")
      .eq("provider", "email")
      .eq("provider_email", email)
      .single();

    if (existing && existing.user_id !== user.id) {
      return NextResponse.json({ error: "Email already connected to another account" }, { status: 409 });
    }

    // Store email connection
    const { error } = await supabaseAdmin.from("connected_accounts").upsert({
      user_id: user.id,
      provider: "email",
      provider_id: email,
      provider_email: email,
      provider_username: email,
    }, { onConflict: "user_id,provider" });

    if (error) return NextResponse.json({ error: "Failed to connect email" }, { status: 500 });

    // Also update users.email for notifications
    await supabaseAdmin.from("users").update({ email }).eq("id", user.id);

    return NextResponse.json({ ok: true, provider: "email" });
  }

  // ── CONNECT TWITTER (OAuth callback) ──
  if (action === "connect" && provider === "twitter") {
    // This would normally involve OAuth flow — return the redirect URL
    const clientId = process.env.TWITTER_CLIENT_ID;
    const callbackUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/connect/callback?provider=twitter`;
    const state = Buffer.from(JSON.stringify({ userId: user.id, provider: "twitter" })).toString("base64");

    // Twitter OAuth 2.0 authorization URL
    const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=tweet.read+users.read+offline.access&state=${state}&code_challenge=challenge&code_challenge_method=plain`;

    return NextResponse.json({ redirect: authUrl });
  }

  // ── CONNECT INSTAGRAM (OAuth callback) ──
  if (action === "connect" && provider === "instagram") {
    const clientId = process.env.INSTAGRAM_CLIENT_ID || process.env.META_APP_ID;
    const callbackUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/connect/callback?provider=instagram`;
    const state = Buffer.from(JSON.stringify({ userId: user.id, provider: "instagram" })).toString("base64");

    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=user_profile&response_type=code&state=${state}`;

    return NextResponse.json({ redirect: authUrl });
  }

  // ── DISCONNECT ──
  if (action === "disconnect") {
    if (!provider) return NextResponse.json({ error: "Provider required" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("connected_accounts")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider);

    if (error) return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });

    // Clear email from users table if disconnecting email
    if (provider === "email") {
      await supabaseAdmin.from("users").update({ email: null }).eq("id", user.id);
    }

    return NextResponse.json({ ok: true, disconnected: provider });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
