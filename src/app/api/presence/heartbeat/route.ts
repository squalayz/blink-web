import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, isValidLat, isValidLng } from "@/lib/api-auth";
import { obfuscate, seedFor } from "@/lib/geo-fuzz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  let body: { lat?: unknown; lng?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { lat, lng } = body;
  if (!isValidLat(lat) || !isValidLng(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  // Pull the user's privacy mode so ghost users never persist any location.
  let presenceMode: "public" | "friends" | "ghost" = "public";
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("presence_mode")
      .eq("user_id", user!.id)
      .maybeSingle();
    if (profile?.presence_mode === "ghost" || profile?.presence_mode === "friends") {
      presenceMode = profile.presence_mode;
    }
  } catch {
    // profiles.presence_mode column may not be live yet — default to public.
  }

  if (presenceMode === "ghost") {
    // Mark presence row as ghost so other users' nearby query filters it out.
    await supabaseAdmin.from("presence").upsert(
      {
        user_id: user!.id,
        fuzzy_lat: 0,
        fuzzy_lng: 0,
        fuzzy_radius_m: 0,
        last_seen: new Date().toISOString(),
        is_ghost: true,
      },
      { onConflict: "user_id" },
    );
    return NextResponse.json({ ok: true, mode: "ghost" });
  }

  const radius = 300;
  const seed = seedFor(user!.id, Date.now());
  const { fuzzy_lat, fuzzy_lng } = obfuscate(lat, lng, radius, seed);

  const { error: upsertError } = await supabaseAdmin.from("presence").upsert(
    {
      user_id: user!.id,
      fuzzy_lat,
      fuzzy_lng,
      fuzzy_radius_m: radius,
      last_seen: new Date().toISOString(),
      is_ghost: false,
    },
    { onConflict: "user_id" },
  );

  if (upsertError) {
    if (upsertError.code === "42P01") {
      return NextResponse.json({ error: "Presence table missing — run migration" }, { status: 503 });
    }
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mode: presenceMode });
}
