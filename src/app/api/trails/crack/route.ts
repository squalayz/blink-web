import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, rateLimitByUser } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  const rlError = rateLimitByUser(user!.id, "trail-crack", 20, 60_000);
  if (rlError) return rlError;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { trail_id, orb_id } = body;
  if (!trail_id || !orb_id) {
    return NextResponse.json({ error: "trail_id and orb_id are required" }, { status: 400 });
  }

  // Get user's progress
  const { data: progress, error: progressError } = await supabaseAdmin
    .from("trail_progress")
    .select("*")
    .eq("trail_id", trail_id)
    .eq("user_id", user!.id)
    .single();

  if (progressError || !progress) {
    return NextResponse.json({ error: "You haven't started this trail" }, { status: 400 });
  }
  if (progress.completed_at) {
    return NextResponse.json({ error: "Trail already completed" }, { status: 400 });
  }

  // Verify the orb is at the user's current position
  const { data: trailOrb } = await supabaseAdmin
    .from("trail_orbs")
    .select("*")
    .eq("trail_id", trail_id)
    .eq("orb_id", orb_id)
    .single();

  if (!trailOrb) {
    return NextResponse.json({ error: "Orb not part of this trail" }, { status: 400 });
  }
  if (trailOrb.position !== progress.current_position) {
    return NextResponse.json({ error: "Not the current orb in sequence" }, { status: 400 });
  }

  // Get trail info
  const { data: trail } = await supabaseAdmin
    .from("trails")
    .select("orb_count")
    .eq("id", trail_id)
    .single();

  const isLastOrb = trailOrb.is_finale || trailOrb.position === trail?.orb_count;
  const newPosition = isLastOrb ? progress.current_position : progress.current_position + 1;
  const newCracked = progress.orbs_cracked + 1;

  const updateData: Record<string, unknown> = {
    current_position: newPosition,
    orbs_cracked: newCracked,
  };

  if (isLastOrb) {
    const startedAt = new Date(progress.started_at).getTime();
    const completionSeconds = Math.floor((Date.now() - startedAt) / 1000);

    // Calculate finish rank
    const { count } = await supabaseAdmin
      .from("trail_progress")
      .select("id", { count: "exact", head: true })
      .eq("trail_id", trail_id as string)
      .not("completed_at", "is", null);

    updateData.completed_at = new Date().toISOString();
    updateData.completion_time_seconds = completionSeconds;
    updateData.finish_rank = (count ?? 0) + 1;

    // Increment completed_count on trail
    await supabaseAdmin
      .from("trails")
      .update({ completed_count: (count ?? 0) + 1 })
      .eq("id", trail_id);
  }

  const { data: updatedProgress, error: updateError } = await supabaseAdmin
    .from("trail_progress")
    .update(updateData)
    .eq("id", progress.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Get next orb data if not completed
  let nextOrb = null;
  if (!isLastOrb) {
    const { data } = await supabaseAdmin
      .from("trail_orbs")
      .select("*")
      .eq("trail_id", trail_id)
      .eq("position", newPosition)
      .single();
    nextOrb = data;
  }

  return NextResponse.json({
    progress: updatedProgress,
    completed: isLastOrb,
    nextOrb,
  });
}
