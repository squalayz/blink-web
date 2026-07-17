// POST /api/claim/admin/payout — admin-only. Body: { id }.
//
// Approve-and-send: sends airdrop_basis × CLAIM_PAYOUT_RATIO BLINK to the
// registration's address via BlinkPayoutVault, waits for 1 confirmation,
// stores the tx hash and flips the row to 'sent'.
//
// Idempotency (three layers):
//   1. row must be pending/approved with no tx hash and no fresh in-flight
//      lock — claimed atomically via a conditional UPDATE (double-click safe)
//   2. paidRefs on-chain check recovers rows whose confirmation was lost
//   3. the vault itself rejects a second payout for the same ref, ever
//
// Failure: row stays 'approved' with payout_error visible in the admin table;
// the Send button becomes a retry.

import { NextRequest, NextResponse } from "next/server";
import { blinkworldAdmin } from "@/lib/blinkworld-admin";
import { isAdminRequest } from "@/lib/claim-v3";
import {
  computePayoutWei,
  isRefPaid,
  payoutConfig,
  payoutErrorMessage,
  payoutRef,
  sendPayout,
  waitForPayout,
} from "@/lib/blink-payout";
import { getBlinkBalance } from "@/lib/blink-balance";
import { getAddress, type Address } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const REG_COLS =
  "id, profile_id, eth_address, status, approved_at, sent_at, payout_tx_hash, payout_amount_wei, payout_basis, payout_error";
const LOCK_TTL_MS = 3 * 60 * 1000;

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cfg = payoutConfig();
  if (!cfg.configured) {
    return NextResponse.json(
      { error: "Payout not configured — set CLAIM_PAYOUT_OPERATOR_KEY and CLAIM_PAYOUT_VAULT_ADDRESS." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const id = (body?.id || "").toString();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  // Admin explicitly confirmed sending to a wallet that holds no $BLINK.
  const overrideNoBalance = body?.overrideNoBalance === true;

  const db = blinkworldAdmin();
  const fail = async (message: string, status = 400, extra: Record<string, unknown> = {}) => {
    // persist the error on the row (visible in admin) and release the lock
    await db
      .from("airdrop_registrations")
      .update({ payout_error: message, payout_locked_at: null, updated_at: new Date().toISOString() })
      .eq("id", id);
    return NextResponse.json({ error: message, ...extra }, { status });
  };

  try {
    const { data: reg, error: regErr } = await db
      .from("airdrop_registrations")
      .select(REG_COLS)
      .eq("id", id)
      .maybeSingle();
    if (regErr) throw regErr;
    if (!reg) return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    if (reg.status === "sent") {
      return NextResponse.json({ ok: true, alreadySent: true, registration: reg });
    }
    if (reg.status === "rejected") {
      return NextResponse.json({ error: "Registration is rejected." }, { status: 400 });
    }

    let to: Address;
    try {
      to = getAddress(reg.eth_address);
    } catch {
      return NextResponse.json({ error: "Registered ETH address is invalid." }, { status: 400 });
    }

    const ref = payoutRef(reg.id);

    // On-chain recovery: paid before but the row never flipped (crash/timeout).
    if (await isRefPaid(cfg.vault, ref)) {
      const now = new Date().toISOString();
      const { data: recovered } = await db
        .from("airdrop_registrations")
        .update({
          status: "sent",
          sent_at: reg.sent_at ?? now,
          payout_error: null,
          payout_locked_at: null,
          updated_at: now,
        })
        .eq("id", id)
        .select(REG_COLS)
        .maybeSingle();
      return NextResponse.json({ ok: true, recovered: true, registration: recovered ?? reg });
    }

    // Fresh basis at send time (same source as the CSV export).
    const { data: exp, error: expErr } = await db
      .from("airdrop_export")
      .select("airdrop_basis")
      .eq("profile_id", reg.profile_id)
      .maybeSingle();
    if (expErr) throw expErr;
    const basis = Number(exp?.airdrop_basis ?? 0);

    let amountWei: bigint;
    try {
      amountWei = computePayoutWei(basis, cfg.ratio, cfg.maxTokens);
    } catch (e) {
      return fail(payoutErrorMessage(e));
    }

    // Holder guard: the recipient must already hold $BLINK. Fresh (uncached)
    // balanceOf right before sending; a confirmed zero refuses the payout
    // unless the admin passed the explicit override. An RPC failure here
    // fails OPEN (null ≠ zero) — the send below exercises the same RPC anyway.
    if (!overrideNoBalance) {
      const holderWei = await getBlinkBalance(to, { fresh: true });
      if (holderWei === 0n) {
        return fail(
          "Wallet holds no $BLINK — payout refused. Send again and confirm the override to pay anyway.",
          412,
          { code: "no_blink" },
        );
      }
    }

    // Atomically claim the row: only one request can hold a fresh lock on an
    // unsent pending/approved row. Also stamps 'approved' before sending.
    // A stale recorded hash is cleared here — we just proved the ref is unpaid
    // on-chain, and even if that old tx later lands, the vault's ref guard
    // makes the retry tx revert, so a double-send is impossible either way.
    const now = new Date().toISOString();
    const staleCutoff = new Date(Date.now() - LOCK_TTL_MS).toISOString();
    const { data: claimed, error: claimErr } = await db
      .from("airdrop_registrations")
      .update({
        status: "approved",
        approved_at: reg.approved_at ?? now,
        payout_locked_at: now,
        payout_tx_hash: null,
        payout_amount_wei: null,
        payout_error: null,
        updated_at: now,
      })
      .eq("id", id)
      .in("status", ["pending", "approved"])
      .or(`payout_locked_at.is.null,payout_locked_at.lt.${staleCutoff}`)
      .select(REG_COLS)
      .maybeSingle();
    if (claimErr) throw claimErr;
    if (!claimed) {
      return NextResponse.json(
        { error: "Payout already in progress (or already sent) for this registration." },
        { status: 409 },
      );
    }

    // Simulate + send. Vault reverts (paused, caps, ref) surface here.
    let hash;
    try {
      hash = await sendPayout(cfg.vault, to, amountWei, ref);
    } catch (e) {
      console.error("[claim/admin/payout] send failed for", id, "-", payoutErrorMessage(e));
      return fail(payoutErrorMessage(e), 502);
    }

    // Record the hash immediately so a crash while waiting is recoverable.
    await db
      .from("airdrop_registrations")
      .update({
        payout_tx_hash: hash,
        payout_amount_wei: amountWei.toString(),
        payout_basis: basis,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    let receipt;
    try {
      receipt = await waitForPayout(hash);
    } catch (e) {
      // Timed out waiting — tx may still land. Keep hash, surface the state.
      return fail(
        `Confirmation timed out — check the tx on Etherscan, then retry (a landed tx is auto-recovered). ${payoutErrorMessage(e)}`,
        504,
        { txHash: hash },
      );
    }

    if (receipt.status !== "success") {
      // Reverted on-chain: ref not consumed, safe to retry.
      const { data: reverted } = await db
        .from("airdrop_registrations")
        .update({
          payout_tx_hash: null,
          payout_amount_wei: null,
          payout_error: `Transaction reverted on-chain (${hash}). Safe to retry.`,
          payout_locked_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(REG_COLS)
        .maybeSingle();
      return NextResponse.json(
        { error: "Payout transaction reverted on-chain.", txHash: hash, registration: reverted },
        { status: 502 },
      );
    }

    const doneAt = new Date().toISOString();
    const { data: updated, error: updErr } = await db
      .from("airdrop_registrations")
      .update({
        status: "sent",
        sent_at: doneAt,
        payout_error: null,
        payout_locked_at: null,
        updated_at: doneAt,
      })
      .eq("id", id)
      .select(REG_COLS)
      .maybeSingle();
    if (updErr) throw updErr;

    return NextResponse.json({ ok: true, txHash: hash, registration: updated });
  } catch (e) {
    console.error("[claim/admin/payout] error:", e instanceof Error ? e.message : e);
    return fail("Payout failed — see server logs.", 500);
  }
}
