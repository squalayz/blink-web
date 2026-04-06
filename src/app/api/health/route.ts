import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const startTime = Date.now();

export async function GET() {
  let healthy = true;

  // Database connectivity check only — no secret presence disclosure
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const start = Date.now();
    const { error } = await supabase.from("users").select("id", { count: "exact", head: true }).limit(1);
    const latencyMs = Date.now() - start;
    if (error) healthy = false;
    if (latencyMs > 2000) healthy = false;
  } catch {
    healthy = false;
  }

  const uptime = Math.floor((Date.now() - startTime) / 1000);

  return NextResponse.json({
    status: healthy ? "healthy" : "degraded",
    uptime_seconds: uptime,
    version: "v18",
    timestamp: new Date().toISOString(),
  }, { status: healthy ? 200 : 503 });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
