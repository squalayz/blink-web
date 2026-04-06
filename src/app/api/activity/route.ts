import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");

  let query = supabaseAdmin
    .from("activity")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch activity", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ activities: data ?? [] });
}
