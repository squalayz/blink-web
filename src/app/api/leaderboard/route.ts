import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const VALID_SORT_FIELDS = [
  "total_earned",
  "orbs_found",
  "orbs_dropped",
  "mm_score",
] as const;

type SortField = (typeof VALID_SORT_FIELDS)[number];

function isValidSortField(value: string): value is SortField {
  return VALID_SORT_FIELDS.includes(value as SortField);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sortParam = searchParams.get("sort") ?? "mm_score";
  const limitParam = searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam ?? "50", 10) || 50, 1), 200);

  if (!isValidSortField(sortParam)) {
    return NextResponse.json(
      {
        error: `Invalid sort field. Must be one of: ${VALID_SORT_FIELDS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, handle, display_name, avatar_url, mm_score, orbs_found, orbs_dropped, total_earned, total_dropped, reputation, current_streak, is_verified")
    .order(sortParam, { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch leaderboard", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ rankings: data ?? [] });
}
