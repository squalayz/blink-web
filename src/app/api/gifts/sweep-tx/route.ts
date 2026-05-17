// GET /api/gifts/sweep-tx — cron-only sweeper that reconciles gift claim
// transactions whose receipt the catch handler did not get to confirm.
//
// Selects up to 50 claimed gifts with tx_status IN ('broadcast', 'failed')
// older than 5 minutes, fetches the on-chain receipt, and either marks them
// 'confirmed' or 'failed' depending on the receipt status. If still missing
// after 30 minutes we give up and reset the gift so the recipient can
// re-attempt.
//
// Auth: Bearer CRON_SECRET header (Vercel cron passes this automatically).

import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const RPC_URL = (process.env.ETH_RPC_URL || "https://ethereum-rpc.publicnode.com").trim();
const STALE_MS = 5 * 60_000;
const GIVE_UP_MS = 30 * 60_000;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staleBefore = new Date(Date.now() - STALE_MS).toISOString();

  const { data: rows, error } = await supabaseAdmin
    .from("gifts")
    .select("id, on_chain_claim_tx, claimed_at, tx_status, spawn_id")
    .eq("status", "claimed")
    .in("tx_status", ["broadcast", "failed"])
    .lt("claimed_at", staleBefore)
    .limit(50);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const now = Date.now();
  let confirmed = 0;
  let failed = 0;
  let reset = 0;

  for (const r of rows || []) {
    const txHash: string | null = (r as { on_chain_claim_tx: string | null }).on_chain_claim_tx;
    const claimedAt = (r as { claimed_at: string | null }).claimed_at;
    const ageMs = claimedAt ? now - new Date(claimedAt).getTime() : Infinity;
    const spawnId = (r as { spawn_id: string | null }).spawn_id;

    if (!txHash) {
      if (ageMs > GIVE_UP_MS) {
        await supabaseAdmin
          .from("gifts")
          .update({ status: "spawned", tx_status: null, claimed_at: null })
          .eq("id", r.id);
        if (spawnId) {
          await supabaseAdmin
            .from("creature_spawns")
            .update({ caught_by: null, caught_at: null })
            .eq("id", spawnId);
        }
        reset += 1;
      }
      continue;
    }

    let receipt: ethers.TransactionReceipt | null = null;
    try {
      receipt = await provider.getTransactionReceipt(txHash);
    } catch (err) {
      console.error(`[sweep-tx] receipt fetch failed for ${txHash}`, err);
      continue;
    }

    if (receipt && receipt.status === 1) {
      await supabaseAdmin
        .from("gifts")
        .update({ tx_status: "confirmed" })
        .eq("id", r.id);
      confirmed += 1;
      continue;
    }

    if (receipt && receipt.status === 0) {
      await supabaseAdmin
        .from("gifts")
        .update({ status: "failed", tx_status: "failed" })
        .eq("id", r.id);
      console.error(`[sweep-tx] gift ${r.id} tx ${txHash} reverted on-chain`);
      failed += 1;
      continue;
    }

    if (ageMs > GIVE_UP_MS) {
      await supabaseAdmin
        .from("gifts")
        .update({ status: "spawned", tx_status: null, claimed_at: null, on_chain_claim_tx: null })
        .eq("id", r.id);
      if (spawnId) {
        await supabaseAdmin
          .from("creature_spawns")
          .update({ caught_by: null, caught_at: null })
          .eq("id", spawnId);
      }
      console.error(`[sweep-tx] gift ${r.id} tx ${txHash} unresolved after ${Math.round(ageMs/60000)}m — reset for re-attempt`);
      reset += 1;
    }
  }

  return NextResponse.json({ scanned: rows?.length || 0, confirmed, failed, reset });
}
