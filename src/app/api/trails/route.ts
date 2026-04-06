import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabaseAdmin
    .from("trails")
    .select("*, creator:profiles!trails_creator_id_fkey(id, handle, display_name, avatar_url)")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  } else {
    query = query.eq("is_public", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch trails", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ trails: data ?? [] });
}
