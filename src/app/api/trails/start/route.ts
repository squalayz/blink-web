import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, rateLimitByUser } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  const rlError = rateLimitByUser(user!.id, "trail-start", 10, 60_000);
  if (rlError) return rlError;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { trail_id } = body;
  if (!trail_id || typeof trail_id !== "string") {
    return NextResponse.json({ error: "trail_id is required" }, { status: 400 });
  }

  // Check trail exists and is active
  const { data: trail, error: trailError } = await supabaseAdmin
    .from("trails")
    .select("id, status, orb_count")
    .eq("id", trail_id)
    .single();

  if (trailError || !trail) {
    return NextResponse.json({ error: "Trail not found" }, { status: 404 });
  }
  if (trail.status !== "active") {
    return NextResponse.json({ error: "Trail is not active" }, { status: 400 });
  }

  // Check if already started
  const { data: existing } = await supabaseAdmin
    .from("trail_progress")
    .select("id, current_position, orbs_cracked")
    .eq("trail_id", trail_id)
    .eq("user_id", user!.id)
    .single();

  if (existing) {
    // Already started — return current progress
    const { data: currentOrb } = await supabaseAdmin
      .from("trail_orbs")
      .select("*")
      .eq("trail_id", trail_id)
      .eq("position", existing.current_position)
      .single();

    return NextResponse.json({ progress: existing, currentOrb });
  }

  // Create progress
  const { data: progress, error: progressError } = await supabaseAdmin
    .from("trail_progress")
    .insert({
      trail_id,
      user_id: user!.id,
      current_position: 1,
      orbs_cracked: 0,
    })
    .select()
    .single();

  if (progressError) {
    return NextResponse.json({ error: progressError.message }, { status: 500 });
  }

  // Increment started_count
  await supabaseAdmin.rpc("increment_field", {
    table_name: "trails",
    row_id: trail_id,
    field_name: "started_count",
    amount: 1,
  }).then(() => {}).catch(() => {
    // Fallback: manual increment
    supabaseAdmin
      .from("trails")
      .update({ started_count: (trail as Record<string, number>).started_count + 1 })
      .eq("id", trail_id);
  });

  // Get first orb
  const { data: firstOrb } = await supabaseAdmin
    .from("trail_orbs")
    .select("*")
    .eq("trail_id", trail_id)
    .eq("position", 1)
    .single();

  return NextResponse.json({ progress, currentOrb: firstOrb }, { status: 201 });
}
