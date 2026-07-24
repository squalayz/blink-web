// POST /api/claim/admin/payout — admin-only. Body: { id }.
//
// INCREMENTAL approve-and-send: players keep earning Blinks after being paid,
// so each send covers only the DELTA of newly earned basis:
//
//   owed = fresh airdrop_export.airdrop_basis − cumulative basis already paid
//
// Cumulative paid lives in airdrop_registrations.payout_basis and is
// reconciled against the airdrop_payouts history (one row per confirmed tx,
// migration 20260716_airdrop_payout_history.sql — REQUIRED before any send).
// owed <= 0 → refused with "nothing new to pay" (no DB writes).
//
// Idempotency (three layers, per PAYOUT not per registration):
//   1. row must be pending/approved/sent with no fresh in-flight lock —
//      claimed atomically via a conditional UPDATE (double-click safe)
//   2. paidRefs on-chain check recovers payouts whose confirmation was lost
//   3. the vault rejects a second payout for the same ref, ever; each payout
//      uses a fresh ref = payoutRef(reg.id, seq) with seq = history count
//
// Failure: row stays 'approved' with payout_error visible in the admin table;
// the Send button becomes a retry.

import { NextRequest, NextResponse } from "next/server";
import { blinkworldAdmin } from "@/lib/blinkworld-admin";
import { isAdminRequest } from "@/lib/claim-v3";
import {
  basisFromWei,
  computePayoutWei,
  getPublicClient,
  isRefPaid,
  isTxKnown,
  payoutConfig,
  payoutErrorMessage,
  payoutRef,
  sendPayout,
  VAULT_ABI,
  waitForPayout,
} from "@/lib/blink-payout";
import { getBlinkBalance } from "@/lib/blink-balance";
import { announcePayout } from "@/lib/blink-telegram";
import { formatUnits, getAddress, type Address } from "viem";

/// Group-chat hype for a confirmed payout — fire-and-forget, never blocks.
async function announceConfirmedPayout(
  db: ReturnType<typeof blinkworldAdmin>,
  profileId: string,
  amountWei: string,
  txHash: string,
) {
  try {
    const { data } = await db
      .from("airdrop_export")
      .select("username, display_name")
      .eq("profile_id", profileId)
      .maybeSingle();
    await announcePayout({
      username: data?.username || data?.display_name || null,
      amountTokens: Number(formatUnits(BigInt(amountWei), 18)),
      txHash,
    });
  } catch (e) {
    console.error("[claim/admin/payout] announce failed:", e instanceof Error ? e.message : e);
  }
}

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
    if (reg.status === "rejected") {
      return NextResponse.json({ error: "Registration is rejected." }, { status: 400 });
    }

    // Ignored guard — separate tolerant read so the route still works before
    // migration 20260723_airdrop_ignored_column is applied (no column → no guard).
    const { data: ignRow } = await db
      .from("airdrop_registrations")
      .select("ignored")
      .eq("id", id)
      .maybeSingle();
    if (ignRow?.ignored) {
      return NextResponse.json(
        { error: "User is ignored — payout refused. Unignore them first.", code: "ignored" },
        { status: 403 },
      );
    }

    let to: Address;
    try {
      to = getAddress(reg.eth_address);
    } catch {
      return NextResponse.json({ error: "Registered ETH address is invalid." }, { status: 400 });
    }

    // ── Payout history: REQUIRED for incremental accounting ──────────────────
    const { data: history, error: histErr } = await db
      .from("airdrop_payouts")
      .select("tx_hash, amount_wei, basis_delta, basis_total_after, created_at")
      .eq("profile_id", reg.profile_id)
      .order("created_at", { ascending: true });
    if (histErr) {
      return NextResponse.json(
        {
          error:
            "Payout history table missing — run supabase/migrations/20260716_airdrop_payout_history.sql " +
            "on the BlinkWorld project before sending payouts.",
        },
        { status: 503 },
      );
    }
    const payouts = history ?? [];
    const historyHashes = new Set(payouts.map((h) => h.tx_hash));
    const historyTotal = payouts.reduce((m, h) => Math.max(m, Number(h.basis_total_after || 0)), 0);
    const regPaid = Number(reg.payout_basis ?? 0);

    // A recorded tx that history doesn't know about, on a row whose cumulative
    // ALREADY includes it (regPaid > historyTotal) = pre-history row whose
    // backfill hasn't run. Finalizing it again would double-count — stop.
    const unfinalizedHash =
      reg.payout_tx_hash && !historyHashes.has(reg.payout_tx_hash) ? reg.payout_tx_hash : null;
    if (unfinalizedHash && regPaid > historyTotal) {
      return NextResponse.json(
        {
          error:
            "This row was paid before the payout-history migration — run the backfill in " +
            "20260716_airdrop_payout_history.sql, then retry.",
        },
        { status: 409 },
      );
    }

    // Cumulative basis paid so far. payout_basis is authoritative; the history
    // total heals a crash between the history insert and the row update.
    const cumPaid = Math.max(regPaid, historyTotal);

    // Each payout gets its own on-chain ref; seq = confirmed payouts so far.
    const seq = payouts.length;
    const ref = payoutRef(reg.id, seq);

    // On-chain recovery: this seq was paid but never finalized (crash/timeout
    // after send). Fold the recorded tx into history + cumulative, don't pay.
    if (await isRefPaid(cfg.vault, ref)) {
      if (!unfinalizedHash || !reg.payout_amount_wei) {
        return NextResponse.json(
          {
            error:
              "On-chain ref for this payout is already consumed but no tx hash was recorded — " +
              "check the operator address on Etherscan and reconcile airdrop_payouts manually.",
          },
          { status: 409 },
        );
      }
      const delta = basisFromWei(reg.payout_amount_wei, cfg.ratio);
      const totalAfter = cumPaid + delta;
      const { error: histInsErr } = await db.from("airdrop_payouts").insert({
        profile_id: reg.profile_id,
        tx_hash: unfinalizedHash,
        amount_wei: reg.payout_amount_wei,
        basis_delta: delta,
        basis_total_after: totalAfter,
      });
      if (histInsErr) throw histInsErr;
      const now = new Date().toISOString();
      const { data: recovered } = await db
        .from("airdrop_registrations")
        .update({
          status: "sent",
          sent_at: reg.sent_at ?? now,
          payout_basis: totalAfter,
          payout_error: null,
          payout_locked_at: null,
          updated_at: now,
        })
        .eq("id", id)
        .select(REG_COLS)
        .maybeSingle();
      await announceConfirmedPayout(db, reg.profile_id, reg.payout_amount_wei, unfinalizedHash);
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

    // ── The delta: only newly earned basis is ever paid ──────────────────────
    const owed = basis - cumPaid;
    if (owed <= 0) {
      return NextResponse.json(
        {
          error: `Nothing new to pay — lifetime basis ${basis.toLocaleString()}, already paid ${cumPaid.toLocaleString()}.`,
          code: "nothing_owed",
          basis,
          paid: cumPaid,
        },
        { status: 409 },
      );
    }

    let amountWei: bigint;
    try {
      amountWei = computePayoutWei(owed, cfg.ratio, cfg.maxTokens);
    } catch (e) {
      return fail(payoutErrorMessage(e));
    }

    // Pre-flight: vault must hold enough BLINK (ERC20InsufficientBalance = underfunded vault)
    try {
      const pub = getPublicClient();
      const [poolWei, remainingToday] = await Promise.all([
        pub.readContract({ address: cfg.vault, abi: VAULT_ABI, functionName: "poolBalance" }),
        pub.readContract({ address: cfg.vault, abi: VAULT_ABI, functionName: "remainingToday" }),
      ]);
      if (poolWei < amountWei) {
        const need = formatUnits(amountWei, 18);
        const have = formatUnits(poolWei, 18);
        return fail(
          `Vault only has ${Number(have).toLocaleString(undefined, { maximumFractionDigits: 4 })} $BLINK but this payout needs ${Number(need).toLocaleString(undefined, { maximumFractionDigits: 4 })}. ` +
            `Transfer more $BLINK to ${cfg.vault}, then Retry send.`,
          412,
          { code: "vault_empty", need, have, vault: cfg.vault },
        );
      }
      if (remainingToday < amountWei) {
        const need = formatUnits(amountWei, 18);
        const rem = formatUnits(remainingToday, 18);
        return fail(
          `Daily vault cap: only ${Number(rem).toLocaleString(undefined, { maximumFractionDigits: 4 })} $BLINK left today, need ${Number(need).toLocaleString(undefined, { maximumFractionDigits: 4 })}. ` +
            `Raise dailyCap or wait until next UTC day.`,
          412,
          { code: "daily_cap", need, remaining: rem },
        );
      }
    } catch (e) {
      // Non-fatal if view calls flake — simulateContract will still catch empty vault
      console.warn("[claim/admin/payout] vault preflight:", payoutErrorMessage(e));
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

    // Atomically claim the row: only one request can hold a fresh lock on a
    // pending/approved/sent row ('sent' is claimable again — that's what an
    // incremental payout is). The last confirmed tx hash/amount stay in place
    // for display until the new send overwrites them.
    const now = new Date().toISOString();
    const staleCutoff = new Date(Date.now() - LOCK_TTL_MS).toISOString();
    const { data: claimed, error: claimErr } = await db
      .from("airdrop_registrations")
      .update({
        status: "approved",
        approved_at: reg.approved_at ?? now,
        payout_locked_at: now,
        payout_error: null,
        updated_at: now,
      })
      .eq("id", id)
      .in("status", ["pending", "approved", "sent"])
      .or(`payout_locked_at.is.null,payout_locked_at.lt.${staleCutoff}`)
      .select(REG_COLS)
      .maybeSingle();
    if (claimErr) throw claimErr;
    if (!claimed) {
      return NextResponse.json(
        { error: "Payout already in progress for this registration." },
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

    // Record the hash immediately so a crash while waiting is recoverable
    // (the recovery path above turns this recorded tx into a history row).
    await db
      .from("airdrop_registrations")
      .update({
        payout_tx_hash: hash,
        payout_amount_wei: amountWei.toString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    let receipt;
    try {
      receipt = await waitForPayout(hash);
    } catch (e) {
      // Timed out waiting. If the network no longer knows the tx AND the ref is
      // unpaid, it was dropped — nothing was sent, say so plainly and clear the
      // stale hash so the row reads truthfully.
      const known = await isTxKnown(hash);
      const refPaid = known ? true : await isRefPaid(cfg.vault, ref).catch(() => true);
      if (!known && !refPaid) {
        const lastGood = payouts[payouts.length - 1] ?? null;
        await db
          .from("airdrop_registrations")
          .update({
            payout_tx_hash: lastGood?.tx_hash ?? null,
            payout_amount_wei: lastGood?.amount_wei ?? null,
            payout_error: "Transaction was dropped by the network — NOTHING was sent. Safe to retry.",
            payout_locked_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
        return NextResponse.json(
          { error: "Transaction dropped — nothing was sent. Safe to retry.", txHash: hash },
          { status: 502 },
        );
      }
      // Tx may still land — keep hash; a landed tx is auto-recovered on retry.
      return fail(
        `Confirmation timed out — check the tx on Etherscan, then retry (a landed tx is auto-recovered). ${payoutErrorMessage(e)}`,
        504,
        { txHash: hash },
      );
    }

    if (receipt.status !== "success") {
      // Reverted on-chain: ref not consumed, safe to retry. Restore the last
      // CONFIRMED tx for display (the reverted hash means nothing).
      const lastGood = payouts[payouts.length - 1] ?? null;
      const { data: reverted } = await db
        .from("airdrop_registrations")
        .update({
          payout_tx_hash: lastGood?.tx_hash ?? null,
          payout_amount_wei: lastGood?.amount_wei ?? null,
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

    // Confirmed: history row first, then fold the delta into the cumulative.
    // (A crash in between self-heals — cumPaid reconciles with historyTotal.)
    const totalAfter = cumPaid + owed;
    const { error: histInsErr } = await db.from("airdrop_payouts").insert({
      profile_id: reg.profile_id,
      tx_hash: hash,
      amount_wei: amountWei.toString(),
      basis_delta: owed,
      basis_total_after: totalAfter,
    });
    if (histInsErr) {
      // Never lose the cumulative update over a history hiccup — the row
      // update below is what prevents double-pays.
      console.error("[claim/admin/payout] history insert failed for", id, "-", histInsErr.message);
    }

    const doneAt = new Date().toISOString();
    const { data: updated, error: updErr } = await db
      .from("airdrop_registrations")
      .update({
        status: "sent",
        sent_at: doneAt,
        payout_basis: totalAfter,
        payout_error: null,
        payout_locked_at: null,
        updated_at: doneAt,
      })
      .eq("id", id)
      .select(REG_COLS)
      .maybeSingle();
    if (updErr) throw updErr;

    // 🎉 Hype the group — confirmed on-chain, safe to announce.
    await announceConfirmedPayout(db, reg.profile_id, amountWei.toString(), hash);

    return NextResponse.json({
      ok: true,
      txHash: hash,
      paid_delta: owed,
      paid_total: totalAfter,
      registration: updated,
    });
  } catch (e) {
    console.error("[claim/admin/payout] error:", e instanceof Error ? e.message : e);
    return fail("Payout failed — see server logs.", 500);
  }
}
