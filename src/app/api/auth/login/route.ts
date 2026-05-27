// BLINK custodial sign-in.
// Takes username + password, looks up the stable fake email, exchanges via Supabase
// signInWithPassword for a session token. Bcrypt verification happens inside Supabase.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/production";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function fakeEmail(username: string): string {
  return `${username}@wallet.blink.app`;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(`login:${ip}`, 10, 5 * 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
    }

    const body = await req.json();
    const { username, password } = body as { username?: string; password?: string };

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const cleaned = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(cleaned)) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }

    // Confirm the username exists before attempting Supabase auth so we get a
    // clean "not found" error instead of leaking auth-internal messages.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, username")
      .eq("username", cleaned)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const email = fakeEmail(cleaned);

    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      user: { id: profile.id, username: cleaned },
    });
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
