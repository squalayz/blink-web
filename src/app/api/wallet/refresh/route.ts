import { NextRequest, NextResponse } from "next/server";
import { readSiweSession } from "@/lib/siwe-session";
import { checkRateLimit } from "@/lib/production";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getBlinkHoldings,
  invalidateHoldingsCache,
  tokenIds,
} from "@/lib/wallet-nfts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await readSiweSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1 refresh / minute / wallet.
  const limit = checkRateLimit(`wallet-refresh:${session.address}`, 1, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded — try again in a minute." },
      { status: 429 },
    );
  }

  invalidateHoldingsCache(session.address);
  const snap = await getBlinkHoldings(session.address);
  const payload = {
    wallet: session.address,
    genesis_ids: tokenIds(snap.genesis),
    mythic_ids: tokenIds(snap.mythics),
    last_refreshed: new Date().toISOString(),
  };

  try {
    await supabaseAdmin.from("user_blink_holdings").upsert(payload).select();
  } catch {
    // Migration may be missing — surface a partial response anyway.
  }

  return NextResponse.json({
    ok: true,
    wallet: session.address,
    genesis: snap.genesis,
    mythics: snap.mythics,
    isHolder: snap.genesis.length > 0 || snap.mythics.length > 0,
  });
}
