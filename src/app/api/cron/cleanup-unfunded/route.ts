import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized triggering
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("orbs")
    .update({ status: "expired", expired_at: now })
    .eq("status", "unfunded")
    .lt("fund_deadline", now)
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: "Cleanup failed", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ cleaned: data?.length ?? 0 });
}
