import { NextRequest, NextResponse } from "next/server";
import { requireUserWithEthAddress } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/production";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getBlinkHoldings,
  invalidateHoldingsCache,
  tokenIds,
} from "@/lib/wallet-nfts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const resolved = await requireUserWithEthAddress(req);
  if (resolved.error) return resolved.error;
  const wallet = resolved.address;

  // 1 refresh / minute / wallet.
  const limit = checkRateLimit(`wallet-refresh:${wallet}`, 1, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded — try again in a minute." },
      { status: 429 },
    );
  }

  invalidateHoldingsCache(wallet);
  const snap = await getBlinkHoldings(wallet);
  const payload = {
    wallet,
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
    wallet,
    genesis: snap.genesis,
    mythics: snap.mythics,
    isHolder: snap.genesis.length > 0 || snap.mythics.length > 0,
  });
}
