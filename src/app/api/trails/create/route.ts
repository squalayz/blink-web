import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, rateLimitByUser, sanitizeText, isPositiveFinite, isValidLat, isValidLng } from "@/lib/api-auth";

interface OrbInput {
  clue_text: string;
  amount: number;
  latitude: number;
  longitude: number;
  hint_image_url?: string;
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  const rlError = rateLimitByUser(user!.id, "trail-create", 5, 300_000);
  if (rlError) return rlError;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, description, cover_image_url, currency, time_limit_hours, is_public, orbs } = body;

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!Array.isArray(orbs) || orbs.length < 2 || orbs.length > 10) {
    return NextResponse.json({ error: "orbs must be an array of 2-10 items" }, { status: 400 });
  }

  const validCurrencies = ["SOL", "ETH", "BTC"];
  const curr = typeof currency === "string" && validCurrencies.includes(currency) ? currency : "SOL";

  // Validate each orb
  let totalValue = 0;
  for (let i = 0; i < orbs.length; i++) {
    const o = orbs[i] as OrbInput;
    if (!o.clue_text || typeof o.clue_text !== "string") {
      return NextResponse.json({ error: `Orb ${i + 1}: clue_text is required` }, { status: 400 });
    }
    if (!isPositiveFinite(o.amount)) {
      return NextResponse.json({ error: `Orb ${i + 1}: amount must be positive` }, { status: 400 });
    }
    if (!isValidLat(o.latitude) || !isValidLng(o.longitude)) {
      return NextResponse.json({ error: `Orb ${i + 1}: invalid coordinates` }, { status: 400 });
    }
    totalValue += o.amount;
  }

  // Get creator profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("handle, display_name, avatar_url")
    .eq("id", user!.id)
    .single();

  // Create trail
  const { data: trail, error: trailError } = await supabaseAdmin
    .from("trails")
    .insert({
      title: sanitizeText(title, 200),
      description: description ? sanitizeText(description as string, 1000) : null,
      cover_image_url: cover_image_url ? String(cover_image_url) : null,
      creator_id: user!.id,
      total_value: totalValue,
      currency: curr,
      orb_count: orbs.length,
      status: "active",
      time_limit_hours: typeof time_limit_hours === "number" && time_limit_hours > 0 ? time_limit_hours : null,
      is_public: is_public !== false,
    })
    .select()
    .single();

  if (trailError || !trail) {
    return NextResponse.json({ error: trailError?.message ?? "Failed to create trail" }, { status: 500 });
  }

  // Create orb rows and trail_orbs
  for (let i = 0; i < orbs.length; i++) {
    const o = orbs[i] as OrbInput;
    const isFinale = i === orbs.length - 1;

    // Create actual orb in orbs table
    const { data: orbRow, error: orbError } = await supabaseAdmin
      .from("orbs")
      .insert({
        type: "Crypto",
        currency: curr,
        amount: o.amount,
        message: sanitizeText(o.clue_text, 280),
        lat: o.latitude,
        lng: o.longitude,
        dropper_id: user!.id,
        dropper_username: profile?.display_name ?? "",
        dropper_handle: profile?.handle ?? "",
        dropper_avatar_url: profile?.avatar_url ?? null,
        status: "pending",
        dropped_at: new Date().toISOString(),
        rarity: o.amount >= 100 ? "Legendary" : o.amount >= 10 ? "Rare" : "Common",
      })
      .select("id")
      .single();

    if (orbError || !orbRow) {
      // Cleanup: delete trail on failure
      await supabaseAdmin.from("trails").delete().eq("id", trail.id);
      return NextResponse.json({ error: `Failed to create orb ${i + 1}: ${orbError?.message}` }, { status: 500 });
    }

    // Create trail_orb link
    const { error: linkError } = await supabaseAdmin
      .from("trail_orbs")
      .insert({
        trail_id: trail.id,
        orb_id: orbRow.id,
        position: i + 1,
        clue_text: sanitizeText(o.clue_text, 280),
        hint_image_url: o.hint_image_url ? String(o.hint_image_url) : null,
        is_finale: isFinale,
      });

    if (linkError) {
      await supabaseAdmin.from("trails").delete().eq("id", trail.id);
      return NextResponse.json({ error: `Failed to link orb ${i + 1}: ${linkError.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ trail_id: trail.id }, { status: 201 });
}
