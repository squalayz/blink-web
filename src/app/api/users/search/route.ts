import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth, sanitizeText } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const q = sanitizeText(searchParams.get("q") ?? "", 40).replace(/^@/, "");
  if (q.length < 2) return NextResponse.json({ results: [] });

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("user_id, handle, display_name, avatar_url")
    .or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`)
    .neq("user_id", user!.id)
    .limit(15);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ results: data ?? [] });
}
