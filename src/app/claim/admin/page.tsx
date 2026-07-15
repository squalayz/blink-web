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
};

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
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/claim/admin/registrations");
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const j = await res.json();
      setRows(j.registrations ?? []);
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
                ? { ...r, status: j.registration.status, approved_at: j.registration.approved_at, sent_at: j.registration.sent_at }
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

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
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
              <strong style={{ color: C.primary }}>{totalBasis.toLocaleString()}</strong>
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

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={btn(filter === f)}>
              {f} ({totals[f] ?? 0})
            </button>
          ))}
        </div>

        <div style={{ overflowX: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 980 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
                {["Player", "Trainer code", "ETH address", "Lifetime", "Basis", "Registered", "Status", "Actions"].map((h) => (
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
                      <span title={r.eth_address}>{r.eth_address.slice(0, 8)}…{r.eth_address.slice(-6)}</span>
                    </td>
                    <td style={{ padding: "12px 14px", fontVariantNumeric: "tabular-nums" }}>{(r.blink_lifetime || 0).toLocaleString()}</td>
                    <td style={{ padding: "12px 14px", fontVariantNumeric: "tabular-nums", color: C.primary, fontWeight: 700 }}>{(r.airdrop_basis || 0).toLocaleString()}</td>
                    <td style={{ padding: "12px 14px", color: C.textSecondary, whiteSpace: "nowrap", fontSize: 12 }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", color: "#0a0a0f", background: STATUS_COLOR[r.status] ?? "#999", borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap" }}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {r.status === "pending" && (
                          <>
                            <button disabled={busyId === r.id} onClick={() => setStatus(r.id, "approved")} style={{ ...btn(true), padding: "5px 10px" }}>
                              Approve
                            </button>
                            <button disabled={busyId === r.id} onClick={() => setStatus(r.id, "rejected")} style={{ ...btn(), padding: "5px 10px", color: C.dangerText, borderColor: "rgba(255,107,128,0.4)" }}>
                              Reject
                            </button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <>
                            <button disabled={busyId === r.id} onClick={() => setStatus(r.id, "sent")} style={{ ...btn(true), padding: "5px 10px" }}>
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
                        {r.status === "sent" && <span style={{ color: C.textTertiary, fontSize: 12 }}>✓ done</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p style={{ color: C.textTertiary, fontSize: 12, marginTop: 16, lineHeight: 1.6 }}>
          Distribution model: this console only marks statuses. Approve claims, export the CSV (uses
          fresh <code>airdrop_basis</code> per player), run the batch distribution separately, then mark
          rows as sent. Flagged accounts show a REVIEW badge with the flag reasons.
        </p>
      </div>
    </main>
  );
}
