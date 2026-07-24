// GET /api/claim/admin/registrations — admin-only list of airdrop
// registrations joined against a FRESH read of airdrop_export (balances,
// airdrop_basis, flags are never cached in airdrop_registrations) plus the
// airdrop_payouts history (incremental payouts: paid vs owed per row).

import { NextRequest, NextResponse } from "next/server";
import { blinkworldAdmin } from "@/lib/blinkworld-admin";
import { isAdminRequest } from "@/lib/claim-v3";
import { getBlinkBalances } from "@/lib/blink-balance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = blinkworldAdmin();
    const BASE_COLS =
      "id, profile_id, trainer_code, eth_address, status, created_at, updated_at, approved_at, sent_at";
    // degraded = payout columns unreadable (migration 20260716_airdrop_payout_columns
    // not applied) — surfaced to the UI instead of silently hiding payout state.
    // ignoredAvailable = ignored column readable (migration 20260723_airdrop_ignored_column).
    let degraded = false;
    let ignoredAvailable = true;
    let { data: regs, error }: { data: any[] | null; error: any } = await db
      .from("airdrop_registrations")
      .select(`${BASE_COLS}, payout_tx_hash, payout_amount_wei, payout_basis, payout_error, ignored`)
      .order("created_at", { ascending: false });
    if (error) {
      ignoredAvailable = false;
      ({ data: regs, error } = await db
        .from("airdrop_registrations")
        .select(`${BASE_COLS}, payout_tx_hash, payout_amount_wei, payout_basis, payout_error`)
        .order("created_at", { ascending: false }));
    }
    if (error) {
      degraded = true;
      ({ data: regs, error } = await db
        .from("airdrop_registrations")
        .select(BASE_COLS)
        .order("created_at", { ascending: false }));
    }
    if (error) throw error;

    const ids = (regs ?? []).map((r) => r.profile_id);
    let exportById: Record<string, any> = {};
    if (ids.length > 0) {
      const { data: exportRows, error: exportErr } = await db
        .from("airdrop_export")
        .select("profile_id, display_name, username, trainer_code, account_created, blink_lifetime, received_transfers, airdrop_basis, flagged, flag_reasons")
        .in("profile_id", ids);
      if (exportErr) throw exportErr;
      exportById = Object.fromEntries((exportRows ?? []).map((r) => [r.profile_id, r]));
    }

    // Payout history per profile (migration 20260716_airdrop_payout_history).
    // Missing table → history_available:false, owed falls back to payout_basis.
    let historyAvailable = true;
    const payoutsById: Record<string, any[]> = {};
    if (ids.length > 0) {
      const { data: payoutRows, error: payoutErr } = await db
        .from("airdrop_payouts")
        .select("profile_id, tx_hash, amount_wei, basis_delta, basis_total_after, created_at")
        .in("profile_id", ids)
        .order("created_at", { ascending: false });
      if (payoutErr) {
        historyAvailable = false;
      } else {
        for (const p of payoutRows ?? []) {
          (payoutsById[p.profile_id] ??= []).push(p);
        }
      }
    }

    // Live $BLINK holder check per registered wallet (multicall, 60 s cache).
    // null = couldn't verify (RPC hiccup) — the panel shows a neutral badge.
    const balances = await getBlinkBalances((regs ?? []).map((r) => r.eth_address));

    const rows = (regs ?? []).map((r) => {
      const x = exportById[r.profile_id] ?? {};
      const balanceWei = balances[r.eth_address.toLowerCase()] ?? null;
      const payouts = payoutsById[r.profile_id] ?? [];
      const airdropBasis = Number(x.airdrop_basis ?? 0);
      // Cumulative paid: payout_basis is authoritative, history heals a crash
      // between the history insert and the row update (same rule as payout).
      const historyTotal = payouts.reduce((m, p) => Math.max(m, Number(p.basis_total_after || 0)), 0);
      const paidBasis = Math.max(Number(r.payout_basis ?? 0), historyTotal);
      return {
        ...r,
        blink_balance_wei: balanceWei,
        holds_blink: balanceWei == null ? null : BigInt(balanceWei) > 0n,
        display_name: x.display_name ?? null,
        username: x.username ?? null,
        trainer_code: r.trainer_code ?? x.trainer_code ?? null,
        account_created: x.account_created ?? null,
        blink_lifetime: Number(x.blink_lifetime ?? 0),
        received_transfers: Number(x.received_transfers ?? 0),
        airdrop_basis: airdropBasis,
        ignored: Boolean(r.ignored),
        flagged: Boolean(x.flagged),
        flag_reasons: x.flag_reasons ?? null,
        paid_basis: paidBasis,
        owed_basis: Math.max(0, airdropBasis - paidBasis),
        payouts,
      };
    });

    return NextResponse.json(
      { ok: true, registrations: rows, degraded, history_available: historyAvailable, ignored_available: ignoredAvailable },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[claim/admin/registrations] error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Failed to load registrations." }, { status: 500 });
  }
}
