"use client";

// ════════════════════════════════════════════════════════════════════════════
// /claim/admin — Airdrop Claim v3 admin console.
// Password gate (CLAIM_ADMIN_PASSWORD) → httpOnly cookie. Lists registrations
// joined with a fresh airdrop_export read, supports approve / reject / mark
// sent, shows a REVIEW badge for flagged accounts, and exports the full CSV
// (with airdrop_basis) for the future batch distribution.
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from "react";
import { C } from "@/lib/theme";

const FONT = "'Outfit', 'Space Grotesk', system-ui, sans-serif";

type Row = {
  id: string;
  profile_id: string;
  display_name: string | null;
  username: string | null;
  trainer_code: string | null;
  eth_address: string;
  status: string;
  blink_lifetime: number;
  received_transfers: number;
  airdrop_basis: number;
  flagged: boolean;
  flag_reasons: string[] | string | null;
  account_created: string | null;
  created_at: string;
  approved_at: string | null;
  sent_at: string | null;
  payout_tx_hash?: string | null;
  payout_amount_wei?: string | null;
  payout_basis?: number | null;
  payout_error?: string | null;
  blink_balance_wei?: string | null;
  holds_blink?: boolean | null; // null = couldn't verify (RPC hiccup)
  paid_basis?: number; // cumulative basis paid (payout_basis ∪ history)
  owed_basis?: number; // fresh airdrop_basis − paid_basis, clamped ≥ 0
  payouts?: Payout[]; // confirmed sends, newest first
};

type Payout = {
  tx_hash: string;
  amount_wei: string;
  basis_delta: number;
  basis_total_after: number;
  created_at: string;
};

function formatBlink(wei: string | null | undefined): string {
  if (!wei) return "";
  const n = parseFloat(wei) / 1e18;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const STATUS_COLOR: Record<string, string> = {
  pending: "#FFD166",
  approved: C.primary,
  rejected: C.danger,
  sent: C.primary2,
};

const FILTERS = ["all", "pending", "approved", "sent", "rejected"] as const;

export default function ClaimAdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [holderFilter, setHolderFilter] = useState<"all" | "holds" | "none">("all");
  const [busyId, setBusyId] = useState("");
  const [dbWarning, setDbWarning] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // no-store: statuses/tx hashes must ALWAYS come from the DB, never from
      // a browser-cached copy of this authenticated JSON.
      const res = await fetch("/api/claim/admin/registrations", { cache: "no-store" });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const j = await res.json();
      setRows(j.registrations ?? []);
      setDbWarning(
        j.degraded
          ? "Payout columns unreadable — run supabase/migrations/20260716_airdrop_payout_columns.sql. Statuses shown may be missing tx/paid data."
          : j.history_available === false
            ? "Payout history table missing — run supabase/migrations/20260716_airdrop_payout_history.sql before the next send (owed amounts below ignore it)."
            : "",
      );
      setAuthed(true);
    } catch {
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const login = useCallback(async () => {
    setLoginError("");
    const res = await fetch("/api/claim/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setLoginError("Wrong password.");
      return;
    }
    setPassword("");
    load();
  }, [password, load]);

  const setStatus = useCallback(
    async (id: string, status: string) => {
      setBusyId(id);
      try {
        const res = await fetch("/api/claim/admin/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status }),
        });
        const j = await res.json();
        if (res.ok && j?.registration) {
          setRows((rs) =>
            rs.map((r) =>
              r.id === id
                ? { ...r, status: j.registration.status, approved_at: j.registration.approved_at, sent_at: j.registration.sent_at, payout_error: null }
                : r,
            ),
          );
        }
      } finally {
        setBusyId("");
      }
    },
    [],
  );

  // Approve + auto-send: server sends BLINK via the payout vault, waits for
  // 1 confirmation, flips the row to sent with the tx hash. On failure the
  // row stays approved with payout_error set and the button becomes a retry.
  const sendPayout = useCallback(async (id: string, overrideNoBalance = false) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/claim/admin/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, overrideNoBalance }),
      });
      const j = await res.json().catch(() => null);
      if (j?.registration) {
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...j.registration } : r)));
        // Re-pull the whole list so paid/owed/history reflect the DB exactly.
        await load();
      } else if (j?.error) {
        setRows((rs) =>
          rs.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: r.status === "pending" ? "approved" : r.status,
                  payout_error: j.error,
                  // Server re-checked and refused: reflect the fresh zero
                  // balance so the next Send asks for the override.
                  ...(j.code === "no_blink" ? { holds_blink: false, blink_balance_wei: "0" } : {}),
                }
              : r,
          ),
        );
      }
    } catch {
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, payout_error: "Network error — retry." } : r)));
    } finally {
      setBusyId("");
    }
  }, [load]);

  // NO BLINK rows require an explicit confirmation before sending.
  const confirmAndSend = useCallback(
    (r: Row) => {
      if (r.holds_blink === false) {
        const short = `${r.eth_address.slice(0, 8)}…${r.eth_address.slice(-6)}`;
        if (!window.confirm(`${short} holds no $BLINK — send anyway?`)) return;
        sendPayout(r.id, true);
      } else {
        sendPayout(r.id);
      }
    },
    [sendPayout],
  );

  const filtered = useMemo(() => {
    let out = filter === "all" ? rows : rows.filter((r) => r.status === filter);
    if (holderFilter === "holds") out = out.filter((r) => r.holds_blink === true);
    if (holderFilter === "none") out = out.filter((r) => r.holds_blink === false);
    return out;
  }, [rows, filter, holderFilter]);

  const holderTotals = useMemo(
    () => ({
      holds: rows.filter((r) => r.holds_blink === true).length,
      none: rows.filter((r) => r.holds_blink === false).length,
    }),
    [rows],
  );

  const totals = useMemo(() => {
    const t: Record<string, number> = { all: rows.length, pending: 0, approved: 0, sent: 0, rejected: 0 };
    for (const r of rows) t[r.status] = (t[r.status] ?? 0) + 1;
    return t;
  }, [rows]);

  const totalBasis = useMemo(
    () => rows.filter((r) => r.status === "approved" || r.status === "sent").reduce((s, r) => s + (r.airdrop_basis || 0), 0),
    [rows],
  );

  const totalPaid = useMemo(() => rows.reduce((s, r) => s + (r.paid_basis || 0), 0), [rows]);
  const totalOwed = useMemo(() => rows.reduce((s, r) => s + (r.owed_basis || 0), 0), [rows]);

  const btn = (active = false): React.CSSProperties => ({
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 700,
    padding: "7px 14px",
    borderRadius: 999,
    border: `1px solid ${active ? C.primary : "rgba(255,255,255,0.14)"}`,
    background: active ? "rgba(0,255,136,0.12)" : "transparent",
    color: active ? C.primary : C.textSecondary,
    cursor: "pointer",
  });

  if (authed === false) {
    return (
      <main style={{ minHeight: "100dvh", background: C.bg, color: C.text, fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 360, background: "rgba(18,18,26,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 30, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 18px" }}>Claim Admin</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="Admin password"
            autoFocus
            style={{
              width: "100%",
              fontFamily: FONT,
              fontSize: 15,
              color: C.text,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 12,
              padding: "12px 14px",
            }}
          />
          {loginError && <p style={{ color: C.dangerText, fontSize: 13, margin: "12px 0 0" }}>{loginError}</p>}
          <button
            onClick={login}
            style={{ marginTop: 16, width: "100%", padding: "12px 0", fontFamily: FONT, fontWeight: 900, fontSize: 15, color: "#0a0a0f", background: `linear-gradient(90deg, ${C.primary2}, ${C.primary})`, border: "none", borderRadius: 999, cursor: "pointer" }}
          >
            Unlock
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100dvh", background: C.bg, color: C.text, fontFamily: FONT, padding: "28px 20px 60px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>Airdrop registrations</h1>
            <p style={{ color: C.textSecondary, fontSize: 13, margin: "4px 0 0" }}>
              {totals.all} registered · {totals.pending} pending · {totals.approved} approved · {totals.sent} sent ·{" "}
              {totals.rejected} rejected · approved basis Σ{" "}
              <strong style={{ color: C.primary }}>{totalBasis.toLocaleString()}</strong> · paid Σ{" "}
              <strong style={{ color: C.primary2 }}>{totalPaid.toLocaleString()}</strong> · owed Σ{" "}
              <strong style={{ color: "#FFD166" }}>{totalOwed.toLocaleString()}</strong>
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={load} style={btn()}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <a
              href="/api/claim/admin/export"
              style={{ ...btn(true), textDecoration: "none", display: "inline-block" }}
            >
              ⬇ Export CSV
            </a>
          </div>
        </div>

        {dbWarning && (
          <div
            role="alert"
            style={{
              marginBottom: 16,
              padding: "12px 16px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              color: "#FFD166",
              background: "rgba(255,209,102,0.1)",
              border: "1px solid rgba(255,209,102,0.45)",
            }}
          >
            ⚠️ {dbWarning}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={btn(filter === f)}>
              {f} ({totals[f] ?? 0})
            </button>
          ))}
          <span style={{ width: 1, height: 20, background: "rgba(255,255,255,0.12)", margin: "0 4px" }} />
          <button onClick={() => setHolderFilter(holderFilter === "holds" ? "all" : "holds")} style={btn(holderFilter === "holds")}>
            💰 holds blink ({holderTotals.holds})
          </button>
          <button
            onClick={() => setHolderFilter(holderFilter === "none" ? "all" : "none")}
            style={{
              ...btn(holderFilter === "none"),
              ...(holderFilter === "none"
                ? { borderColor: C.danger, background: "rgba(255,107,128,0.12)", color: C.dangerText }
                : {}),
            }}
          >
            🚫 no blink ({holderTotals.none})
          </button>
        </div>

        <div style={{ overflowX: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 980 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
                {["Player", "Trainer code", "ETH address", "Lifetime", "Basis · paid · owed", "Registered", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "12px 14px", fontWeight: 800, letterSpacing: "0.06em", fontSize: 11, textTransform: "uppercase", color: C.textSecondary, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 28, textAlign: "center", color: C.textTertiary }}>
                    {loading ? "Loading…" : "No registrations yet."}
                  </td>
                </tr>
              )}
              {filtered.map((r) => {
                const reasons = Array.isArray(r.flag_reasons) ? r.flag_reasons.join(", ") : r.flag_reasons || "";
                const owed = r.owed_basis || 0;
                return (
                  <tr key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 700 }}>
                        {r.display_name || r.username || "—"}
                        {r.flagged && (
                          <span
                            title={reasons || "Flagged account"}
                            style={{ marginLeft: 8, fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", color: "#0a0a0f", background: "#FFD166", borderRadius: 6, padding: "2px 7px", verticalAlign: "middle", cursor: "help" }}
                          >
                            REVIEW
                          </span>
                        )}
                      </div>
                      <div style={{ color: C.textTertiary, fontSize: 11 }}>@{r.username || "?"}</div>
                      {r.flagged && reasons && (
                        <div style={{ color: "#FFD166", fontSize: 11, marginTop: 3, maxWidth: 220, whiteSpace: "normal" }}>{reasons}</div>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px", color: C.textSecondary, whiteSpace: "nowrap" }}>{r.trainer_code || "—"}</td>
                    <td style={{ padding: "12px 14px", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }}>
                      <span
                        title="Click to copy"
                        onClick={() => { try { navigator.clipboard.writeText(r.eth_address); } catch { /* noop */ } }}
                        style={{ wordBreak: "break-all", cursor: "pointer", maxWidth: 340, display: "inline-block" }}
                      >
                        {r.eth_address}
                      </span>
                      <div style={{ marginTop: 5 }}>
                        {r.holds_blink === true ? (
                          <span
                            title={r.blink_balance_wei ? `${formatBlink(r.blink_balance_wei)} BLINK on-chain` : undefined}
                            style={{ fontFamily: FONT, fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", color: "#0a0a0f", background: C.primary, borderRadius: 6, padding: "2px 7px", whiteSpace: "nowrap" }}
                          >
                            HOLDS BLINK · {formatBlink(r.blink_balance_wei)}
                          </span>
                        ) : r.holds_blink === false ? (
                          <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", color: "#0a0a0f", background: C.danger, borderRadius: 6, padding: "2px 7px", whiteSpace: "nowrap" }}>
                            NO BLINK
                          </span>
                        ) : (
                          <span
                            title="Couldn't verify the on-chain $BLINK balance (RPC error) — refresh to retry"
                            style={{ fontFamily: FONT, fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", color: C.textTertiary, border: "1px solid rgba(255,255,255,0.16)", borderRadius: 6, padding: "1px 6px", whiteSpace: "nowrap", cursor: "help" }}
                          >
                            BLINK ?
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", fontVariantNumeric: "tabular-nums" }}>{(r.blink_lifetime || 0).toLocaleString()}</td>
                    <td style={{ padding: "12px 14px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      <div style={{ color: C.primary, fontWeight: 700 }}>{(r.airdrop_basis || 0).toLocaleString()}</div>
                      <div style={{ color: C.textTertiary, fontSize: 11, marginTop: 3 }}>
                        paid {(r.paid_basis || 0).toLocaleString()}
                      </div>
                      {(r.owed_basis || 0) > 0 ? (
                        <span style={{ display: "inline-block", marginTop: 4, fontSize: 10, fontWeight: 900, letterSpacing: "0.06em", color: "#0a0a0f", background: "#FFD166", borderRadius: 6, padding: "2px 7px" }}>
                          +{(r.owed_basis || 0).toLocaleString()} NEW
                        </span>
                      ) : (r.paid_basis || 0) > 0 ? (
                        <div style={{ color: C.primary2, fontSize: 11, marginTop: 4, fontWeight: 700 }}>fully paid</div>
                      ) : null}
                    </td>
                    <td style={{ padding: "12px 14px", color: C.textSecondary, whiteSpace: "nowrap", fontSize: 12 }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", color: "#0a0a0f", background: STATUS_COLOR[r.status] ?? "#999", borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap" }}>
                        {busyId === r.id ? "SENDING…" : r.status.toUpperCase()}
                      </span>
                      {r.payout_tx_hash && (
                        <div style={{ marginTop: 5, fontSize: 11 }}>
                          <a
                            href={`https://etherscan.io/tx/${r.payout_tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={r.payout_amount_wei ? `${formatBlink(r.payout_amount_wei)} BLINK — ${r.payout_tx_hash}` : r.payout_tx_hash}
                            style={{ color: C.primary2, fontFamily: "ui-monospace, Menlo, monospace", textDecoration: "none" }}
                          >
                            {r.payout_amount_wei ? `${formatBlink(r.payout_amount_wei)} BLINK · ` : ""}
                            {r.payout_tx_hash.slice(0, 10)}…↗
                          </a>
                        </div>
                      )}
                      {r.payout_error && busyId !== r.id && (
                        <div style={{ marginTop: 5, fontSize: 11, color: C.dangerText, maxWidth: 240, whiteSpace: "normal" }}>
                          {r.payout_error}
                        </div>
                      )}
                      {(r.payouts?.length ?? 0) > 1 && (
                        <details style={{ marginTop: 6 }}>
                          <summary style={{ fontSize: 11, color: C.textSecondary, cursor: "pointer" }}>
                            {r.payouts!.length} payouts
                          </summary>
                          <div style={{ marginTop: 4, display: "grid", gap: 3 }}>
                            {r.payouts!.map((p) => (
                              <a
                                key={p.tx_hash}
                                href={`https://etherscan.io/tx/${p.tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={p.tx_hash}
                                style={{ fontSize: 11, color: C.primary2, fontFamily: "ui-monospace, Menlo, monospace", textDecoration: "none", whiteSpace: "nowrap" }}
                              >
                                {new Date(p.created_at).toLocaleDateString()} · +{Number(p.basis_delta).toLocaleString()} ·{" "}
                                {formatBlink(p.amount_wei)} BLINK · {p.tx_hash.slice(0, 10)}…↗
                              </a>
                            ))}
                          </div>
                        </details>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {r.status === "pending" && (
                          <>
                            {owed > 0 ? (
                              <button disabled={busyId === r.id} onClick={() => confirmAndSend(r)} style={{ ...btn(true), padding: "5px 10px" }}>
                                {busyId === r.id ? "Sending…" : "Approve + send"}
                              </button>
                            ) : (
                              <span style={{ color: C.textTertiary, fontSize: 12, alignSelf: "center" }}>nothing owed</span>
                            )}
                            <button disabled={busyId === r.id} onClick={() => setStatus(r.id, "rejected")} style={{ ...btn(), padding: "5px 10px", color: C.dangerText, borderColor: "rgba(255,107,128,0.4)" }}>
                              Reject
                            </button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <>
                            {owed > 0 ? (
                              <button disabled={busyId === r.id} onClick={() => confirmAndSend(r)} style={{ ...btn(true), padding: "5px 10px" }}>
                                {busyId === r.id ? "Sending…" : r.payout_error ? "Retry send" : "Send tokens"}
                              </button>
                            ) : (
                              <span style={{ color: C.textTertiary, fontSize: 12, alignSelf: "center" }}>nothing owed</span>
                            )}
                            <button disabled={busyId === r.id} onClick={() => setStatus(r.id, "sent")} style={{ ...btn(), padding: "5px 10px" }}>
                              Mark sent
                            </button>
                            <button disabled={busyId === r.id} onClick={() => setStatus(r.id, "pending")} style={{ ...btn(), padding: "5px 10px" }}>
                              Undo
                            </button>
                          </>
                        )}
                        {r.status === "rejected" && (
                          <button disabled={busyId === r.id} onClick={() => setStatus(r.id, "pending")} style={{ ...btn(), padding: "5px 10px" }}>
                            Reopen
                          </button>
                        )}
                        {r.status === "sent" &&
                          (owed > 0 ? (
                            <button disabled={busyId === r.id} onClick={() => confirmAndSend(r)} style={{ ...btn(true), padding: "5px 10px" }}>
                              {busyId === r.id ? "Sending…" : `Send +${owed.toLocaleString()} new`}
                            </button>
                          ) : (
                            <span style={{ color: C.textTertiary, fontSize: 12 }}>
                              {(r.paid_basis || 0) > 0 ? "✓ fully paid" : "✓ done"}
                            </span>
                          ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p style={{ color: C.textTertiary, fontSize: 12, marginTop: 16, lineHeight: 1.6 }}>
          <strong>Approve + send</strong> pays the player on-chain automatically — and INCREMENTALLY:
          only the owed delta (fresh <code>airdrop_basis</code> − basis already paid) × payout ratio
          is ever sent, so players who keep earning can be paid again with{" "}
          <strong>Send +N new</strong>. Each confirmed send is recorded in the payout history
          (expandable under the status). Failures keep the row APPROVED with the error shown —
          Retry send is always safe (the vault rejects a replay of the same payout, on-chain).
          Mark sent / Undo remain for manual bookkeeping. Flagged accounts show a REVIEW badge.
          The <strong>HOLDS BLINK / NO BLINK</strong> badge is a live on-chain balance check of the
          registered wallet (refreshed on load, ~60&nbsp;s cache) — players must already hold $BLINK
          to receive rewards. Sending to a NO BLINK wallet asks for confirmation and the server
          re-checks the balance right before every send.
        </p>
      </div>
    </main>
  );
}
