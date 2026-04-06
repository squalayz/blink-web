import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, rateLimitByUser } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  const rlError = rateLimitByUser(user!.id, "trail-hint", 10, 60_000);
  if (rlError) return rlError;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { trail_orb_id } = body;
  if (!trail_orb_id || typeof trail_orb_id !== "string") {
    return NextResponse.json({ error: "trail_orb_id is required" }, { status: 400 });
  }

  // Get trail orb
  const { data: trailOrb, error: orbError } = await supabaseAdmin
    .from("trail_orbs")
    .select("*")
    .eq("id", trail_orb_id)
    .single();

  if (orbError || !trailOrb) {
    return NextResponse.json({ error: "Trail orb not found" }, { status: 404 });
  }

  // Check if already purchased
  const { data: existing } = await supabaseAdmin
    .from("trail_hint_purchases")
    .select("id")
    .eq("trail_orb_id", trail_orb_id)
    .eq("user_id", user!.id)
    .single();

  if (existing) {
    return NextResponse.json({
      hint_image_url: trailOrb.hint_image_url,
      hint_audio_url: trailOrb.hint_audio_url,
      already_purchased: true,
    });
  }

  // Create purchase
  const { error: insertError } = await supabaseAdmin
    .from("trail_hint_purchases")
    .insert({
      trail_id: trailOrb.trail_id,
      trail_orb_id,
      user_id: user!.id,
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    hint_image_url: trailOrb.hint_image_url,
    hint_audio_url: trailOrb.hint_audio_url,
    already_purchased: false,
  });
}
