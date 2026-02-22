import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Base numbers — public-facing vanity offset (admin panel uses real counts)
const SEED = { agents: 53, matches: 24, eth: 4.2 };

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [agentsRes, matchesRes, tradesRes] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("matches").select("id", { count: "exact", head: true }),
      supabase.from("token_trades").select("eth_amount"),
    ]);

    const realAgents = agentsRes.count ?? 0;
    const realMatches = matchesRes.count ?? 0;
    const realEth = (tradesRes.data ?? []).reduce(
      (sum: number, t: { eth_amount?: number }) => sum + (t.eth_amount ?? 0),
      0
    );

    return NextResponse.json({
      agents: SEED.agents + realAgents,
      matches: SEED.matches + realMatches,
      eth: Math.round((SEED.eth + realEth) * 100) / 100,
    }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (e) {
    // Fallback to seeds on error
    return NextResponse.json(SEED);
  }
}
