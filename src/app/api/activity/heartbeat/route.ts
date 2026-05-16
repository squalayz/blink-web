// POST /api/activity/heartbeat — record the user's coarse location while the
// /map page is open so other Watchers can see ambient activity. Distinct from
// the social-discovery presence/heartbeat flow — this one feeds the new
// "Watchers nearby" chip and exact-ish recent-catch ghosts.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, isValidLat, isValidLng } from "@/lib/api-auth";

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

  // Respect ghost mode — never persist a real location.
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
    /* column not live — default to public */
  }

  if (presenceMode === "ghost") {
    return NextResponse.json({ ok: true, mode: "ghost" });
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      last_lat: lat,
      last_lng: lng,
      last_seen_at: new Date().toISOString(),
    })
    .eq("user_id", user!.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, mode: presenceMode });
}
