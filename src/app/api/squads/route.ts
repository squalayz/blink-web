import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, sanitizeText } from "@/lib/api-auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (userId) {
      // Get squads the user is a member of
      const { data: memberships, error: memberError } = await supabaseAdmin
        .from("squad_members")
        .select("squad_id")
        .eq("user_id", userId);

      if (memberError) {
        if (
          memberError.message.includes("does not exist") ||
          memberError.code === "42P01"
        ) {
          return NextResponse.json({ squads: [] });
        }
        return NextResponse.json(
          { error: memberError.message },
          { status: 500 }
        );
      }

      if (!memberships || memberships.length === 0) {
        return NextResponse.json({ squads: [] });
      }

      const squadIds = memberships.map(
        (m: Record<string, unknown>) => m.squad_id
      );

      const { data: squads, error: squadsError } = await supabaseAdmin
        .from("squads")
        .select("*")
        .in("id", squadIds);

      if (squadsError) {
        return NextResponse.json(
          { error: squadsError.message },
          { status: 500 }
        );
      }

      // Attach member counts
      const enriched = await attachMemberCounts(squads || []);
      return NextResponse.json({ squads: enriched });
    }

    // Return all squads
    const { data: squads, error } = await supabaseAdmin
      .from("squads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (
        error.message.includes("does not exist") ||
        error.code === "42P01"
      ) {
        return NextResponse.json({ squads: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const enriched = await attachMemberCounts(squads || []);
    return NextResponse.json({ squads: enriched });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function attachMemberCounts(
  squads: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  if (squads.length === 0) return squads;

  const squadIds = squads.map((s) => s.id);

  const { data: members, error } = await supabaseAdmin
    .from("squad_members")
    .select("squad_id")
    .in("squad_id", squadIds);

  if (error || !members) {
    // If squad_members table doesn't exist, return squads with count 0
    return squads.map((s) => ({ ...s, member_count: 0 }));
  }

  const counts = new Map<string, number>();
  for (const m of members) {
    const sid = m.squad_id as string;
    counts.set(sid, (counts.get(sid) || 0) + 1);
  }

  return squads.map((s) => ({
    ...s,
    member_count: counts.get(s.id as string) || 0,
  }));
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: "action is required (create | join | leave)" },
        { status: 400 }
      );
    }

    switch (action) {
      case "create": {
        const { name, description, avatar_url } = body;
        const creator_id = user!.id;

        if (!name) {
          return NextResponse.json(
            { error: "name is required" },
            { status: 400 }
          );
        }

        // Insert the squad
        const { data: squad, error: createError } = await supabaseAdmin
          .from("squads")
          .insert({
            name: sanitizeText(name, 100),
            description: sanitizeText(description, 500) || null,
            avatar_url: typeof avatar_url === "string" ? avatar_url.slice(0, 500) : null,
            creator_id,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) {
          if (
            createError.message.includes("does not exist") ||
            createError.code === "42P01"
          ) {
            return NextResponse.json(
              { error: "Squads system not yet available" },
              { status: 503 }
            );
          }
          return NextResponse.json(
            { error: createError.message },
            { status: 500 }
          );
        }

        // Add creator as leader
        const { error: memberError } = await supabaseAdmin
          .from("squad_members")
          .insert({
            squad_id: squad.id,
            user_id: creator_id,
            role: "leader",
            joined_at: new Date().toISOString(),
          });

        if (memberError) {
          // Squad was created but member insert failed — still return squad
          return NextResponse.json(
            {
              squad: { ...squad, member_count: 0 },
              warning: "Squad created but leader membership failed: " + memberError.message,
            },
            { status: 201 }
          );
        }

        return NextResponse.json(
          { squad: { ...squad, member_count: 1 } },
          { status: 201 }
        );
      }

      case "join": {
        const { squad_id } = body;
        const user_id = user!.id;

        if (!squad_id) {
          return NextResponse.json(
            { error: "squad_id is required" },
            { status: 400 }
          );
        }

        // Check if already a member
        const { data: existing } = await supabaseAdmin
          .from("squad_members")
          .select("id")
          .eq("squad_id", squad_id)
          .eq("user_id", user_id)
          .maybeSingle();

        if (existing) {
          return NextResponse.json(
            { error: "Already a member of this squad" },
            { status: 400 }
          );
        }

        const { data: member, error } = await supabaseAdmin
          .from("squad_members")
          .insert({
            squad_id,
            user_id,
            role: "member",
            joined_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          if (
            error.message.includes("does not exist") ||
            error.code === "42P01"
          ) {
            return NextResponse.json(
              { error: "Squads system not yet available" },
              { status: 503 }
            );
          }
          return NextResponse.json(
            { error: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({ member }, { status: 201 });
      }

      case "leave": {
        const { squad_id: leaveSquadId } = body;
        const leaveUserId = user!.id;

        if (!leaveSquadId) {
          return NextResponse.json(
            { error: "squad_id is required" },
            { status: 400 }
          );
        }

        const { error } = await supabaseAdmin
          .from("squad_members")
          .delete()
          .eq("squad_id", leaveSquadId)
          .eq("user_id", leaveUserId);

        if (error) {
          if (
            error.message.includes("does not exist") ||
            error.code === "42P01"
          ) {
            return NextResponse.json(
              { error: "Squads system not yet available" },
              { status: 503 }
            );
          }
          return NextResponse.json(
            { error: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: create, join, leave" },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
