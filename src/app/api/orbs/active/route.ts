import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filter = (searchParams.get("filter") ?? "all").toLowerCase();

  let query = supabaseAdmin
    .from("orbs")
    .select("*")
    .in("status", ["pending", "active", "claimed"])
    .order("created_at", { ascending: false });

  // Apply currency or type filter
  if (filter !== "all") {
    if (["btc", "eth", "sol"].includes(filter)) {
      query = query.ilike("currency", filter);
    } else if (filter === "nft") {
      query = query.eq("type", "nft");
    }
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch orbs", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ orbs: data ?? [] });
}
