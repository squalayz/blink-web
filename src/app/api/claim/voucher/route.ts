// ════════════════════════════════════════════════════════════════════════════
// BLINK — reward voucher issuance (EIP-712 BlinkRewards flow)
//
// POST { claim_code, password, eth_address }
//   → { voucher_available: true, rewardsContract, player, amount, nonce,
//       deadline, ref, signature, tokens, points_redeemed }
//
// Semantics (mirrors the custodial /api/claim/execute accounting):
//   - Points are deducted when the voucher is ISSUED, and a `pending` row is
//     written to claim_ledger holding the voucher's nonce/deadline/amount.
//   - While that voucher is still valid we re-sign the SAME nonce/deadline —
//     the contract's nonce-uniqueness means the set is single-use, so a user
//     refreshing the page can never double-mint.
//   - Once the deadline passes, the contract can never accept the voucher,
//     so the points are safely restored and a fresh voucher is issued.
//
// When the signer key / rewards contract env is absent this returns 501 and
// the client falls back to the custodial /api/claim/execute path.
// ════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { keccak256, toBytes, parseUnits } from "viem";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveClaimProfile } from "@/lib/claim-auth";
import {
  voucherConfigured,
  rewardsContractAddress,
  signRewardVoucher,
  randomNonce,
} from "@/lib/blink-signer";
import { isValidAddress } from "@/lib/production";

export const runtime = "nodejs";

const MIN_POINTS = 1000;
const POINTS_PER_TOKEN = 1000;
const VOUCHER_TTL_SECONDS = 1800; // 30 min to submit the tx
const EXPIRY_GRACE_MS = 2 * 60 * 1000; // small buffer past deadline before restore

export async function POST(req: NextRequest) {
  if (!voucherConfigured()) {
    return NextResponse.json(
      { voucher_available: false, error: "On-chain voucher claims are not enabled" },
      { status: 501 },
    );
  }

  const body = await req.json().catch(() => null);
  const ethAddress = (body?.eth_address || "").toString().trim();

  if (!ethAddress) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!isValidAddress(ethAddress)) {
    return NextResponse.json({ error: "Invalid Ethereum address" }, { status: 400 });
  }

  const profile = await resolveClaimProfile(req, body);
  if (!profile) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    // Existing pending voucher? Re-sign the same message set, or restore
    // points if it has provably expired on-chain.
    const { data: pending } = await supabaseAdmin
      .from("claim_ledger")
      .select("id, points_redeemed, tokens_sent, voucher_nonce, voucher_deadline, voucher_amount_wei")
      .eq("profile_id", profile.id)
      .eq("status", "pending")
      .not("voucher_nonce", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pending?.voucher_nonce && pending.voucher_deadline) {
      const deadlineMs = new Date(pending.voucher_deadline).getTime();
      if (deadlineMs + EXPIRY_GRACE_MS > Date.now()) {
        // Still live — re-issue the identical voucher (same nonce & deadline).
        const amountWei = BigInt(pending.voucher_amount_wei);
        const ref = keccak256(toBytes(`claim:${pending.id}`));
        const voucher = await signRewardVoucher(
          ethAddress as `0x${string}`,
          amountWei,
          ref,
          {
            nonce: pending.voucher_nonce as `0x${string}`,
            deadline: Math.floor(deadlineMs / 1000),
          },
        );
        await supabaseAdmin
          .from("claim_ledger")
          .update({ eth_address: ethAddress })
          .eq("id", pending.id);
        return NextResponse.json({
          voucher_available: true,
          rewardsContract: rewardsContractAddress(),
          player: ethAddress,
          tokens: Number(pending.tokens_sent),
          points_redeemed: pending.points_redeemed,
          ledger_id: pending.id,
          ...voucher,
        });
      }

      // Deadline passed — the contract will reject it forever. Restore points.
      await supabaseAdmin
        .from("claim_ledger")
        .update({ status: "expired", completed_at: new Date().toISOString() })
        .eq("id", pending.id)
        .eq("status", "pending");
      const { data: fresh } = await supabaseAdmin
        .from("profiles")
        .select("claimable_points")
        .eq("id", profile.id)
        .single();
      await supabaseAdmin
        .from("profiles")
        .update({
          claimable_points:
            Number(fresh?.claimable_points || 0) + Number(pending.points_redeemed || 0),
        })
        .eq("id", profile.id);
      profile.claimable_points =
        Number(fresh?.claimable_points || 0) + Number(pending.points_redeemed || 0);
    }

    if (profile.claimable_points < MIN_POINTS) {
      return NextResponse.json(
        { error: "Minimum 1,000 points required to claim" },
        { status: 400 },
      );
    }

    const tokens = Math.floor(profile.claimable_points / POINTS_PER_TOKEN);
    const pointsRedeemed = tokens * POINTS_PER_TOKEN;
    const amountWei = parseUnits(tokens.toString(), 18);
    const nonce = randomNonce();
    const deadline = Math.floor(Date.now() / 1000) + VOUCHER_TTL_SECONDS;

    // Deduct points up-front (same accounting moment as the custodial path),
    // leaving any sub-1000 remainder untouched.
    const { error: deductErr } = await supabaseAdmin
      .from("profiles")
      .update({ claimable_points: profile.claimable_points - pointsRedeemed })
      .eq("id", profile.id)
      .eq("claimable_points", profile.claimable_points); // optimistic lock

    if (deductErr) throw deductErr;

    const { data: ledger, error: ledgerErr } = await supabaseAdmin
      .from("claim_ledger")
      .insert({
        profile_id: profile.id,
        claim_code: profile.claim_code || "",
        points_redeemed: pointsRedeemed,
        tokens_sent: tokens,
        eth_address: ethAddress,
        status: "pending",
        voucher_nonce: nonce,
        voucher_deadline: new Date(deadline * 1000).toISOString(),
        voucher_amount_wei: amountWei.toString(),
      })
      .select("id")
      .single();

    if (ledgerErr || !ledger) {
      // Roll the deduction back — no voucher was signed yet.
      await supabaseAdmin
        .from("profiles")
        .update({ claimable_points: profile.claimable_points })
        .eq("id", profile.id);
      throw ledgerErr || new Error("Failed to record claim");
    }

    const ref = keccak256(toBytes(`claim:${ledger.id}`));
    const voucher = await signRewardVoucher(
      ethAddress as `0x${string}`,
      amountWei,
      ref,
      { nonce, deadline },
    );

    return NextResponse.json({
      voucher_available: true,
      rewardsContract: rewardsContractAddress(),
      player: ethAddress,
      tokens,
      points_redeemed: pointsRedeemed,
      ledger_id: ledger.id,
      ...voucher,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Voucher issuance failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
