// ════════════════════════════════════════════════════════════════════════════
// BLINK — confirm an on-chain voucher claim.
//
// POST { claim_code, password, ledger_id, tx_hash }
//   → { success: true, tx_hash } once the tx is mined successfully.
//   → 202 { confirmed: false } while the receipt isn't available yet
//     (client polls).
//
// Points were already deducted at voucher issuance; this endpoint verifies
// the receipt (status 1, addressed to the BlinkRewards contract) and flips
// the pending ledger row to `sent`.
// ════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveClaimProfile } from "@/lib/claim-auth";
import { voucherConfigured, rewardsContractAddress } from "@/lib/blink-signer";

export const runtime = "nodejs";
export const maxDuration = 30;

const RPC_URL = (process.env.ETH_RPC_URL || "https://ethereum-rpc.publicnode.com").trim();

export async function POST(req: NextRequest) {
  if (!voucherConfigured()) {
    return NextResponse.json({ error: "Voucher claims are not enabled" }, { status: 501 });
  }

  const body = await req.json().catch(() => null);
  const ledgerId = (body?.ledger_id || "").toString();
  const txHash = (body?.tx_hash || "").toString().trim();

  if (!ledgerId || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const profile = await resolveClaimProfile(req, body);
  if (!profile) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { data: row } = await supabaseAdmin
    .from("claim_ledger")
    .select("id, status, tokens_sent, points_redeemed")
    .eq("id", ledgerId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }
  if (row.status === "sent") {
    return NextResponse.json({ success: true, tx_hash: txHash, already_confirmed: true });
  }
  if (row.status !== "pending") {
    return NextResponse.json({ error: `Claim is ${row.status}` }, { status: 409 });
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return NextResponse.json({ confirmed: false }, { status: 202 });
    }
    if (receipt.status !== 1) {
      return NextResponse.json({ error: "Transaction reverted on-chain" }, { status: 400 });
    }
    if ((receipt.to || "").toLowerCase() !== rewardsContractAddress().toLowerCase()) {
      return NextResponse.json(
        { error: "Transaction is not a BlinkRewards claim" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    await supabaseAdmin
      .from("claim_ledger")
      .update({ status: "sent", tx_hash: txHash, completed_at: now })
      .eq("id", row.id)
      .eq("status", "pending");

    const newTotal = profile.total_claimed_tokens + Number(row.tokens_sent || 0);
    await supabaseAdmin
      .from("profiles")
      .update({ total_claimed_tokens: newTotal, last_claim_at: now })
      .eq("id", profile.id);

    return NextResponse.json({
      success: true,
      tx_hash: txHash,
      tokens_sent: Number(row.tokens_sent || 0),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Confirmation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
