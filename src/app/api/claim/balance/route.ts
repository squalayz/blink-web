// POST /api/claim/balance — public, rate-limited. Body: { address }.
//
// Live $BLINK balanceOf() for the claim page's eligibility warning. Balances
// are public chain data so no session is required; a per-IP in-memory
// limiter keeps the RPC from being farmed. RPC failure returns
// { ok: true, unknown: true } — the client shows a neutral "couldn't verify"
// note and NEVER blocks registration on it.

import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { getBlinkBalances, formatBlinkBalance } from "@/lib/blink-balance";
import { getClientIp } from "@/lib/claim-v3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-IP sliding window (per server instance — same tradeoff as middleware's).
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 60;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 10_000) {
    for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
  }
  const bucket = hits.get(ip);
  if (!bucket || bucket.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  if (rateLimited(getClientIp(req))) {
    return NextResponse.json({ error: "Too many checks — try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const address = (body?.address || "").toString().trim();
  if (!isAddress(address, { strict: false })) {
    return NextResponse.json({ error: "Invalid Ethereum address." }, { status: 400 });
  }

  const balances = await getBlinkBalances([address]);
  const wei = balances[address.toLowerCase()];
  if (wei == null) {
    return NextResponse.json({ ok: true, unknown: true });
  }
  const weiBig = BigInt(wei);
  return NextResponse.json({
    ok: true,
    holds: weiBig > 0n,
    balance_wei: wei,
    balance: formatBlinkBalance(weiBig),
  });
}
