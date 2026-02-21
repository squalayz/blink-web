import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const startTime = Date.now();

export async function GET() {
  const checks: Record<string, "ok" | "fail" | "warn"> = {};
  let healthy = true;

  // 1. Environment variables
  const requiredEnvs = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXTAUTH_SECRET",
  ];
  const missingEnvs = requiredEnvs.filter(k => !process.env[k]);
  checks.env = missingEnvs.length === 0 ? "ok" : "fail";
  if (missingEnvs.length > 0) healthy = false;

  // 2. Database connectivity
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const start = Date.now();
    const { error } = await supabase.from("users").select("id", { count: "exact", head: true }).limit(1);
    const latencyMs = Date.now() - start;
    checks.database = error ? "fail" : "ok";
    checks.db_latency_ms = latencyMs as any;
    if (error) healthy = false;
    if (latencyMs > 2000) checks.database = "warn" as any;
  } catch {
    checks.database = "fail";
    healthy = false;
  }

  // 3. Wallet encryption key present
  checks.encryption = process.env.WALLET_ENCRYPTION_KEY ? "ok" : "warn";

  // 4. Cron secret present
  checks.cron_auth = process.env.CRON_SECRET ? "ok" : "warn";

  const uptime = Math.floor((Date.now() - startTime) / 1000);

  return NextResponse.json({
    status: healthy ? "healthy" : "degraded",
    checks,
    uptime_seconds: uptime,
    version: "v17",
    timestamp: new Date().toISOString(),
  }, { status: healthy ? 200 : 503 });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
