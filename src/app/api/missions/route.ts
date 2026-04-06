import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/api-auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const type = searchParams.get("type"); // daily | weekly

    // Build missions query
    let query = supabaseAdmin.from("missions").select("*");

    if (type) {
      query = query.eq("type", type);
    }

    const { data: missions, error: missionsError } = await query;

    if (missionsError) {
      // Table might not exist yet
      if (
        missionsError.message.includes("does not exist") ||
        missionsError.code === "42P01"
      ) {
        return NextResponse.json({ missions: [] });
      }
      return NextResponse.json(
        { error: missionsError.message },
        { status: 500 }
      );
    }

    // If user_id provided, join with mission_progress
    if (userId && missions && missions.length > 0) {
      const { data: progress, error: progressError } = await supabaseAdmin
        .from("mission_progress")
        .select("*")
        .eq("user_id", userId);

      if (progressError) {
        // mission_progress table might not exist — return missions without progress
        if (
          progressError.message.includes("does not exist") ||
          progressError.code === "42P01"
        ) {
          return NextResponse.json({ missions });
        }
        return NextResponse.json(
          { error: progressError.message },
          { status: 500 }
        );
      }

      // Merge progress into missions
      const progressMap = new Map(
        (progress || []).map((p: Record<string, unknown>) => [p.mission_id, p])
      );

      const enriched = missions.map((m: Record<string, unknown>) => ({
        ...m,
        progress: progressMap.get(m.id) || null,
      }));

      return NextResponse.json({ missions: enriched });
    }

    return NextResponse.json({ missions: missions || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { mission_id } = body;
    const user_id = user!.id; // Use authenticated user

    if (!mission_id) {
      return NextResponse.json(
        { error: "mission_id is required" },
        { status: 400 }
      );
    }

    // Check mission progress exists and is complete
    const { data: progress, error: fetchError } = await supabaseAdmin
      .from("mission_progress")
      .select("*")
      .eq("user_id", user_id)
      .eq("mission_id", mission_id)
      .single();

    if (fetchError) {
      if (
        fetchError.message.includes("does not exist") ||
        fetchError.code === "42P01"
      ) {
        return NextResponse.json(
          { error: "Missions system not yet available" },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Mission progress not found" },
        { status: 404 }
      );
    }

    if (!progress) {
      return NextResponse.json(
        { error: "Mission progress not found" },
        { status: 404 }
      );
    }

    if (progress.status === "claimed") {
      return NextResponse.json(
        { error: "Mission already claimed" },
        { status: 400 }
      );
    }

    if (progress.status !== "complete") {
      return NextResponse.json(
        { error: "Mission is not yet complete" },
        { status: 400 }
      );
    }

    // Update status to claimed
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("mission_progress")
      .update({
        status: "claimed",
        claimed_at: new Date().toISOString(),
      })
      .eq("user_id", user_id)
      .eq("mission_id", mission_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ mission: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
