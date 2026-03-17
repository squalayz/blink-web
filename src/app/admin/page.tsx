"use client";
import { useState, useEffect, useCallback } from "react";

const C = {
  bg: "#050508", surface: "#0a0a12", s2: "#111118", s3: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", match: "#30d158", hot: "#ff2d55",
  gold: "#ffd700", text: "#e8e8f0", muted: "#6b6b80", dim: "#2a2a3a", border: "#1a1a2e",
};

type Tab = "overview" | "users" | "activity" | "deposits" | "trading" | "social" | "syndicates" | "platform";

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function truncWallet(addr: string | null | undefined): string {
  if (!addr) return "---";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function copyToClip(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [elapsed, setElapsed] = useState(0);
  const [userSearch, setUserSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dashboard", pin }),
      });
      const d = await r.json();
      if (d.error) { alert(d.error); setAuthed(false); }
      else { setData(d); setAuthed(true); setLastUpdated(Date.now()); }
    } catch { alert("Network error"); }
    setLoading(false);
  }, [pin]);

  useEffect(() => {
    if (!lastUpdated) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - lastUpdated) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [lastUpdated]);

  // ═══ PIN SCREEN ═══
  if (!authed) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit',sans-serif" }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: 32, border: `1px solid ${C.border}`, maxWidth: 320, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 4 }}>Admin</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 20 }}>MishMesh.ai Control Panel</div>
        <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Enter admin PIN"
          onKeyDown={e => { if (e.key === "Enter") load(); }}
          style={{ width: "100%", padding: "12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.s2, color: C.text, fontSize: 14, fontFamily: "'JetBrains Mono',monospace", textAlign: "center", boxSizing: "border-box", marginBottom: 12 }} />
        <button onClick={load} disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: `linear-gradient(135deg,${C.indigo},${C.cyan})`, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {loading ? "Loading..." : "Enter"}
        </button>
      </div>
    </div>
  );

  if (!data) return null;
  const s = data.stats;

  // ═══ HELPERS ═══
  const tabCounts: Record<Tab, number | null> = {
    overview: null,
    users: s.total_users,
    activity: (data.feed_events?.length || 0) + (data.notification_log?.length || 0),
    deposits: s.total_deposits,
    trading: s.total_trades,
    social: s.total_posts,
    syndicates: s.total_syndicates,
    platform: null,
  };

  function Badge({ text, color }: { text: string; color: string }) {
    return <span style={{ padding: "2px 6px", borderRadius: 4, background: `${color}18`, color, fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" }}>{text}</span>;
  }

  function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
    return (
      <div style={{ background: C.surface, borderRadius: 12, padding: "14px 12px", border: `1px solid ${C.border}`, textAlign: "center", flex: 1, minWidth: 90 }}>
        <div style={{ fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, fontFamily: "'Outfit',sans-serif" }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: color || C.text, fontFamily: "'JetBrains Mono',monospace" }}>{value}</div>
        {sub && <div style={{ fontSize: 9, color: C.dim, marginTop: 2, fontFamily: "'JetBrains Mono',monospace" }}>{sub}</div>}
      </div>
    );
  }

  function TH({ children, w }: { children: React.ReactNode; w?: number | string }) {
    return <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, borderBottom: `1px solid ${C.border}`, fontFamily: "'Outfit',sans-serif", whiteSpace: "nowrap", width: w }}>{children}</th>;
  }

  function TD({ children, color, mono, onClick }: { children: React.ReactNode; color?: string; mono?: boolean; onClick?: () => void }) {
    return <td onClick={onClick} style={{ padding: "6px 8px", fontSize: 10, color: color || C.text, fontFamily: mono ? "'JetBrains Mono',monospace" : "'Outfit',sans-serif", cursor: onClick ? "pointer" : undefined, whiteSpace: "nowrap" }}>{children}</td>;
  }

  // ═══ SIGNUP CHART DATA ═══
  const signupsByDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    signupsByDay[d.toISOString().slice(0, 10)] = 0;
  }
  (data.recent_signups || []).forEach((ts: string) => {
    const day = ts.slice(0, 10);
    if (signupsByDay[day] !== undefined) signupsByDay[day]++;
  });
  const chartEntries = Object.entries(signupsByDay);
  const maxSignups = Math.max(...chartEntries.map(e => e[1]), 1);

  // Filtered users
  const filteredUsers = (data.all_users || []).filter((u: any) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (u.agent_name || "").toLowerCase().includes(q)
      || (u.name || "").toLowerCase().includes(q)
      || (u.wallet_address || "").toLowerCase().includes(q)
      || (u.email || "").toLowerCase().includes(q);
  });

  // Combined activity
  const allActivity = [
    ...(data.feed_events || []).map((e: any) => ({ source: "feed", type: e.event_type, title: e.title, body: e.body, created_at: e.created_at })),
    ...(data.notification_log || []).map((n: any) => ({ source: "notif", type: n.event, title: n.event, body: `${n.channel} - ${n.status}`, created_at: n.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const filteredActivity = activityFilter === "all" ? allActivity : allActivity.filter(a => a.type === activityFilter);
  const activityTypes = [...new Set(allActivity.map(a => a.type))];

  // Deposit/withdrawal totals
  const totalDepositAmount = (data.deposits || []).reduce((sum: number, d: any) => sum + (d.amount_eth || 0), 0);
  const totalDepositFees = (data.deposits || []).reduce((sum: number, d: any) => sum + (d.fee_eth || 0), 0);
  const totalDepositNet = (data.deposits || []).reduce((sum: number, d: any) => sum + (d.net_eth || 0), 0);
  const totalWithdrawals = (data.withdrawals || []).reduce((sum: number, w: any) => sum + (w.amount_eth || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Outfit',sans-serif", color: C.text, padding: "12px 16px" }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>MishMesh Admin</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 9, color: C.muted, fontFamily: "'JetBrains Mono',monospace" }}>Updated {elapsed}s ago</span>
          <button onClick={load} disabled={loading} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
            {loading ? "..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* STICKY TAB BAR */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: C.bg, paddingBottom: 8, display: "flex", gap: 4, overflowX: "auto" }}>
        {(["overview", "users", "activity", "deposits", "trading", "social", "syndicates", "platform"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "7px 12px", borderRadius: 8, border: `1px solid ${tab === t ? C.indigo + "44" : C.border}`,
            background: tab === t ? `${C.indigo}15` : "transparent", color: tab === t ? C.text : C.muted,
            fontSize: 10, fontWeight: tab === t ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
            textTransform: "uppercase", whiteSpace: "nowrap", display: "flex", gap: 4, alignItems: "center",
          }}>
            {t}
            {tabCounts[t] != null && <span style={{ fontSize: 8, color: C.cyan, fontFamily: "'JetBrains Mono',monospace" }}>{tabCounts[t]}</span>}
          </button>
        ))}
      </div>

      {/* ═══════════ TAB 1: OVERVIEW ═══════════ */}
      {tab === "overview" && (
        <div>
          {/* Big stat cards */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            <StatCard label="Total Users" value={s.total_users} />
            <StatCard label="Today" value={s.signups_today} color={C.cyan} />
            <StatCard label="This Week" value={s.signups_week} color={C.indigo} />
            <StatCard label="Deposits" value={`${s.total_deposits}`} sub={`${s.deposit_volume_eth?.toFixed(4)} ETH`} color={C.cyan} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            <StatCard label="Revenue" value={`${((s.total_fees_eth || 0) + (s.trade_fees_eth || 0)).toFixed(4)}`} sub="ETH total" color={C.gold} />
            <StatCard label="Active Traders" value={s.trading_active} color={C.match} />
            <StatCard label="With AI" value={s.users_with_ai} color={C.indigo} />
            <StatCard label="Total Trades" value={s.total_trades} />
          </div>

          {/* 7-day signup chart */}
          <div style={{ background: C.surface, borderRadius: 12, padding: 14, border: `1px solid ${C.border}`, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10, fontFamily: "'Outfit',sans-serif" }}>SIGNUPS — LAST 7 DAYS</div>
            {chartEntries.map(([day, count]) => (
              <div key={day} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: C.muted, width: 44, fontFamily: "'JetBrains Mono',monospace", flexShrink: 0 }}>{day.slice(5)}</span>
                <div style={{ flex: 1, height: 14, background: C.s2, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(count / maxSignups) * 100}%`, background: `linear-gradient(90deg,${C.indigo},${C.cyan})`, borderRadius: 3, minWidth: count > 0 ? 4 : 0 }} />
                </div>
                <span style={{ fontSize: 9, color: C.text, fontFamily: "'JetBrains Mono',monospace", width: 20, textAlign: "right" }}>{count}</span>
              </div>
            ))}
          </div>

          {/* Revenue breakdown */}
          <div style={{ background: C.surface, borderRadius: 12, padding: 14, border: `1px solid ${C.gold}22`, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, marginBottom: 8 }}>REVENUE BREAKDOWN</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <TH>Source</TH><TH>Amount ETH</TH><TH>Count</TH>
              </tr></thead>
              <tbody>
                <tr style={{ background: C.s2 }}>
                  <TD>Deposit Fees (5%)</TD>
                  <TD mono color={C.gold}>{(s.total_fees_eth || 0).toFixed(6)}</TD>
                  <TD mono>{s.total_deposits}</TD>
                </tr>
                <tr>
                  <TD>Trade Fees (3%)</TD>
                  <TD mono color={C.gold}>{(s.trade_fees_eth || 0).toFixed(6)}</TD>
                  <TD mono>{(s.total_buys || 0) + (s.total_sells || 0)}</TD>
                </tr>
                <tr style={{ background: C.s2 }}>
                  <TD>Referral Payouts</TD>
                  <TD mono color={C.hot}>-{(s.referral_payouts_eth || 0).toFixed(6)}</TD>
                  <TD mono>{s.total_referrals}</TD>
                </tr>
                <tr style={{ borderTop: `1px solid ${C.border}` }}>
                  <TD color={C.match}>Net Revenue</TD>
                  <TD mono color={C.match}>{((s.total_fees_eth || 0) + (s.trade_fees_eth || 0) - (s.referral_payouts_eth || 0)).toFixed(6)}</TD>
                  <TD>{""}</TD>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Recent activity feed */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>RECENT ACTIVITY</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {(data.activity_feed || []).map((a: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: i % 2 === 0 ? C.surface : C.s2, borderRadius: 6, fontSize: 10 }}>
                <Badge text={a.type?.toUpperCase() || "?"} color={a.type === "signup" ? C.indigo : a.type === "deposit" ? C.cyan : a.type === "buy" ? C.match : a.type === "sell" ? C.hot : C.muted} />
                <span style={{ fontWeight: 600, flex: 1 }}>{a.agent_name}</span>
                {a.amount != null && <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.cyan }}>{a.amount?.toFixed(4)} ETH</span>}
                <span style={{ color: C.muted, fontSize: 9, fontFamily: "'JetBrains Mono',monospace" }}>{timeAgo(a.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ TAB 2: USERS ═══════════ */}
      {tab === "users" && (
        <div>
          <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name, wallet, email..."
            style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.s2, color: C.text, fontSize: 12, fontFamily: "'Outfit',sans-serif", boxSizing: "border-box", marginBottom: 10 }} />
          <div style={{ fontSize: 9, color: C.muted, marginBottom: 6 }}>Showing {filteredUsers.length} of {data.all_users?.length || 0} users</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead><tr>
                <TH>Agent</TH><TH>Wallet</TH><TH>Email</TH><TH>AI</TH><TH>Tier</TH>
                <TH>Wallet?</TH><TH>AI?</TH><TH>Live?</TH><TH>DB Bal</TH><TH>Live Bal</TH>
                <TH>PnL</TH><TH>Risk</TH><TH>Joined</TH>
              </tr></thead>
              <tbody>
                {filteredUsers.map((u: any, i: number) => {
                  const isExpanded = expandedUser === u.id;
                  return (
                    <tr key={u.id} onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                      style={{ background: i % 2 === 0 ? C.surface : C.s2, cursor: "pointer", verticalAlign: "top" }}>
                      <TD color={C.text}><span style={{ fontWeight: 700 }}>{u.agent_name || u.name || "---"}</span>
                        {isExpanded && (
                          <div style={{ marginTop: 6, fontSize: 9, color: C.muted, lineHeight: 1.8 }}>
                            <div>ID: <span style={{ color: C.dim, fontFamily: "'JetBrains Mono',monospace" }}>{u.id}</span></div>
                            <div>Full Wallet: <span style={{ color: C.cyan, fontFamily: "'JetBrains Mono',monospace" }}>{u.wallet_address || "none"}</span></div>
                            <div>Referral Code: <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{u.referral_code || "---"}</span></div>
                            <div>Referred By: <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{u.referred_by || "---"}</span></div>
                            <div>Trading Mode: {u.trading_mode || "---"}</div>
                            <div>Onboarded: {u.onboarded ? "Yes" : "No"}</div>
                          </div>
                        )}
                      </TD>
                      <TD mono>
                        <span style={{ cursor: "pointer" }} onClick={e => { e.stopPropagation(); copyToClip(u.wallet_address || ""); }}>
                          {truncWallet(u.wallet_address)}
                        </span>
                      </TD>
                      <TD color={C.muted}>{u.email || "---"}</TD>
                      <TD color={C.indigo}>{u.ai_provider || "---"}</TD>
                      <TD color={u.tier && u.tier !== "free" ? C.gold : C.muted}>{u.tier || "free"}</TD>
                      <TD color={u.has_wallet ? C.match : C.muted}>{u.has_wallet ? "Y" : "N"}</TD>
                      <TD color={u.has_ai ? C.match : C.muted}>{u.has_ai ? "Y" : "N"}</TD>
                      <TD color={u.trading_enabled ? C.match : C.muted}>{u.trading_enabled ? "Y" : "N"}</TD>
                      <TD mono color={C.text}>{(u.balance_db || 0).toFixed(4)}</TD>
                      <TD mono color={C.cyan}>{(u.balance_live || 0).toFixed(4)}</TD>
                      <TD mono color={(u.total_pnl || 0) >= 0 ? C.match : C.hot}>{(u.total_pnl || 0) >= 0 ? "+" : ""}{(u.total_pnl || 0).toFixed(4)}</TD>
                      <TD color={C.muted}>{u.risk_level || "---"}</TD>
                      <TD color={C.muted}>{timeAgo(u.created_at)}</TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ TAB 3: ACTIVITY ═══════════ */}
      {tab === "activity" && (
        <div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
            <button onClick={() => setActivityFilter("all")} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${activityFilter === "all" ? C.indigo : C.border}`, background: activityFilter === "all" ? `${C.indigo}15` : "transparent", color: activityFilter === "all" ? C.text : C.muted, fontSize: 9, cursor: "pointer", fontFamily: "inherit" }}>ALL</button>
            {activityTypes.map(t => (
              <button key={t} onClick={() => setActivityFilter(t)} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${activityFilter === t ? C.indigo : C.border}`, background: activityFilter === t ? `${C.indigo}15` : "transparent", color: activityFilter === t ? C.text : C.muted, fontSize: 9, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}>{t}</button>
            ))}
          </div>
          <div style={{ fontSize: 9, color: C.muted, marginBottom: 6 }}>{filteredActivity.length} events</div>
          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {filteredActivity.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 10px", background: i % 2 === 0 ? C.surface : C.s2, borderRadius: 4, fontSize: 10, marginBottom: 2 }}>
                <Badge text={a.source === "feed" ? "FEED" : "NOTIF"} color={a.source === "feed" ? C.indigo : C.cyan} />
                <Badge text={(a.type || "?").toUpperCase().slice(0, 16)} color={C.muted} />
                <span style={{ flex: 1, color: C.text }}>{a.title || a.body || "---"}</span>
                <span style={{ color: C.muted, fontSize: 9, fontFamily: "'JetBrains Mono',monospace", flexShrink: 0 }}>{timeAgo(a.created_at)}</span>
              </div>
            ))}
            {filteredActivity.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.dim, fontSize: 12 }}>No activity events</div>}
          </div>
        </div>
      )}

      {/* ═══════════ TAB 4: DEPOSITS & WITHDRAWALS ═══════════ */}
      {tab === "deposits" && (
        <div>
          {/* Running totals */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            <StatCard label="Total Deposited" value={totalDepositAmount.toFixed(4)} sub="ETH" color={C.cyan} />
            <StatCard label="Fees Taken" value={totalDepositFees.toFixed(4)} sub="ETH" color={C.gold} />
            <StatCard label="Net Credited" value={totalDepositNet.toFixed(4)} sub="ETH" color={C.match} />
            <StatCard label="Withdrawals" value={totalWithdrawals.toFixed(4)} sub="ETH" color={C.hot} />
          </div>

          {/* Deposits table */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>CONFIRMED DEPOSITS ({data.deposits?.length || 0})</div>
          <div style={{ overflowX: "auto", marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
              <thead><tr>
                <TH>Wallet</TH><TH>Amount ETH</TH><TH>Fee ETH</TH><TH>Net ETH</TH><TH>When</TH>
              </tr></thead>
              <tbody>
                {(data.deposits || []).map((d: any, i: number) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? C.surface : C.s2 }}>
                    <TD mono><span style={{ cursor: "pointer" }} onClick={() => copyToClip(d.wallet || "")}>{truncWallet(d.wallet)}</span></TD>
                    <TD mono color={(d.amount_eth || 0) > 0.1 ? C.gold : C.cyan}>{(d.amount_eth || 0).toFixed(6)}</TD>
                    <TD mono color={C.muted}>{(d.fee_eth || 0).toFixed(6)}</TD>
                    <TD mono color={C.match}>{(d.net_eth || 0).toFixed(6)}</TD>
                    <TD color={C.muted}>{timeAgo(d.created_at)}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Withdrawals */}
          {(data.withdrawals || []).length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>WITHDRAWALS ({data.withdrawals.length})</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                  <thead><tr>
                    <TH>To Address</TH><TH>Amount ETH</TH><TH>Status</TH><TH>TX</TH><TH>When</TH>
                  </tr></thead>
                  <tbody>
                    {data.withdrawals.map((w: any, i: number) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? C.surface : C.s2 }}>
                        <TD mono><span style={{ cursor: "pointer" }} onClick={() => copyToClip(w.to_address || "")}>{truncWallet(w.to_address)}</span></TD>
                        <TD mono color={C.hot}>{(w.amount_eth || 0).toFixed(6)}</TD>
                        <TD><Badge text={w.status?.toUpperCase() || "?"} color={w.status === "sent" ? C.match : w.status === "pending" ? C.gold : C.hot} /></TD>
                        <TD mono color={C.dim}>{w.tx_hash ? truncWallet(w.tx_hash) : "---"}</TD>
                        <TD color={C.muted}>{timeAgo(w.created_at)}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════ TAB 5: TRADING ═══════════ */}
      {tab === "trading" && (
        <div>
          {/* Stats */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            <StatCard label="Total Trades" value={s.total_trades} />
            <StatCard label="Buys" value={s.total_buys} color={C.match} />
            <StatCard label="Sells" value={s.total_sells} color={C.hot} />
            <StatCard label="Skips" value={s.total_skips} color={C.muted} />
            <StatCard label="Trade Fees" value={(s.trade_fees_eth || 0).toFixed(4)} sub="ETH" color={C.gold} />
          </div>

          {/* Token leaderboard */}
          {(data.token_leaderboard || []).length > 0 && (
            <div style={{ background: C.surface, borderRadius: 12, padding: 14, border: `1px solid ${C.border}`, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10 }}>TOP 10 MOST TRADED TOKENS</div>
              {data.token_leaderboard.map((t: any, i: number) => {
                const maxCount = data.token_leaderboard[0]?.count || 1;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 9, color: C.gold, width: 14, textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>{i + 1}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, width: 60, fontFamily: "'JetBrains Mono',monospace", color: C.text }}>{t.symbol}</span>
                    <div style={{ flex: 1, height: 12, background: C.s2, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(t.count / maxCount) * 100}%`, background: `linear-gradient(90deg,${C.indigo},${C.cyan})`, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 9, color: C.muted, fontFamily: "'JetBrains Mono',monospace", width: 28, textAlign: "right" }}>{t.count}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent trades */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>RECENT TRADES ({data.trades?.length || 0})</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead><tr>
                <TH>Agent</TH><TH>Action</TH><TH>Token</TH><TH>Amount ETH</TH><TH>Fee ETH</TH><TH>PnL</TH><TH>When</TH>
              </tr></thead>
              <tbody>
                {(data.trades || []).map((t: any, i: number) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? C.surface : C.s2 }}>
                    <TD>{t.agent_name || "?"}</TD>
                    <TD><Badge text={(t.action || "?").toUpperCase()} color={t.action === "buy" ? C.match : t.action === "sell" ? C.hot : C.muted} /></TD>
                    <TD mono color={C.text}>{t.token_symbol || "---"}</TD>
                    <TD mono color={C.cyan}>{(t.amount_eth || 0).toFixed(4)}</TD>
                    <TD mono color={C.muted}>{(t.fee_eth || 0).toFixed(6)}</TD>
                    <TD mono color={(t.pnl_eth || 0) >= 0 ? C.match : C.hot}>{t.pnl_eth != null ? `${(t.pnl_eth || 0) >= 0 ? "+" : ""}${(t.pnl_eth || 0).toFixed(4)}` : "---"}</TD>
                    <TD color={C.muted}>{timeAgo(t.created_at)}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ TAB 6: SOCIAL ═══════════ */}
      {tab === "social" && (
        <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            <StatCard label="Posts" value={s.total_posts} color={C.indigo} />
            <StatCard label="Comments" value={s.total_comments} />
            <StatCard label="Reactions" value={s.total_reactions} color={C.cyan} />
            <StatCard label="Matches" value={s.total_matches} color={C.match} />
            <StatCard label="Messages" value={s.total_messages} />
          </div>

          {/* Top posters */}
          {(data.top_posters || []).length > 0 && (
            <div style={{ background: C.surface, borderRadius: 12, padding: 14, border: `1px solid ${C.border}`, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>TOP 5 MOST ACTIVE POSTERS</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH>Agent</TH><TH>Posts</TH></tr></thead>
                <tbody>
                  {data.top_posters.map((p: any, i: number) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? C.s2 : C.surface }}>
                      <TD color={C.text}>{p.name}</TD>
                      <TD mono color={C.indigo}>{p.count}</TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Recent posts */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>RECENT POSTS</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
              <thead><tr>
                <TH>Agent</TH><TH>Content</TH><TH>Reactions</TH><TH>Comments</TH><TH>When</TH>
              </tr></thead>
              <tbody>
                {(data.recent_posts || []).map((p: any, i: number) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? C.surface : C.s2 }}>
                    <TD color={C.text}>{p.agent_name || "?"}</TD>
                    <TD color={C.muted}>{(p.content || "").slice(0, 50)}{(p.content || "").length > 50 ? "..." : ""}</TD>
                    <TD mono color={C.cyan}>{p.upvotes || 0}</TD>
                    <TD mono>{p.comment_count || 0}</TD>
                    <TD color={C.muted}>{timeAgo(p.created_at)}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ TAB 7: SYNDICATES ═══════════ */}
      {tab === "syndicates" && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>ALL SYNDICATES ({data.syndicates_list?.length || 0})</div>
          {(data.syndicates_list || []).length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: C.dim, fontSize: 12 }}>No syndicates created yet</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead><tr>
                  <TH>Name</TH><TH>Status</TH><TH>Members</TH><TH>Chats</TH><TH>Created By</TH><TH>Created</TH>
                </tr></thead>
                <tbody>
                  {data.syndicates_list.map((sy: any, i: number) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? C.surface : C.s2 }}>
                      <TD color={C.text}><span style={{ fontWeight: 700 }}>{sy.name}</span></TD>
                      <TD><Badge text={(sy.status || "?").toUpperCase()} color={sy.status === "active" ? C.match : C.muted} /></TD>
                      <TD mono>{sy.live_member_count || sy.member_count || 0}</TD>
                      <TD mono color={C.dim}>{sy.chat_count || 0}</TD>
                      <TD>{sy.created_by_name || "?"}</TD>
                      <TD color={C.muted}>{timeAgo(sy.created_at)}</TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TAB 8: PLATFORM ═══════════ */}
      {tab === "platform" && (
        <div>
          {/* platform_stats view */}
          {data.platform_stats && (
            <div style={{ background: C.surface, borderRadius: 12, padding: 14, border: `1px solid ${C.border}`, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>PLATFORM STATS (VIEW)</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(data.platform_stats).map(([key, val]) => (
                  <div key={key} style={{ background: C.s2, borderRadius: 8, padding: "8px 12px", textAlign: "center", minWidth: 80 }}>
                    <div style={{ fontSize: 7, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{key.replace(/_/g, " ")}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.text, fontFamily: "'JetBrains Mono',monospace" }}>{typeof val === "number" ? val : String(val)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table counts */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>TABLE COUNTS</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><TH>Table</TH><TH>Count</TH></tr></thead>
              <tbody>
                {([
                  ["agent_signals", s.total_signals],
                  ["agent_memories", s.total_memories],
                  ["token_launches", s.total_token_launches],
                  ["waitlist", s.total_waitlist],
                  ["developer_api_keys", s.total_api_keys],
                  ["invites", s.total_invites],
                  ["social_verifications", s.total_social_verifs],
                  ["connected_accounts", s.total_connected_accts],
                  ["matches", s.total_matches],
                  ["messages", s.total_messages],
                  ["mesh_posts", s.total_posts],
                  ["mesh_comments", s.total_comments],
                  ["mesh_reactions", s.total_reactions],
                  ["syndicates", s.total_syndicates],
                  ["deposits", s.total_deposits],
                  ["trading_history", s.total_trades],
                  ["users", s.total_users],
                ] as [string, number][]).map(([name, count], i) => (
                  <tr key={name} style={{ background: i % 2 === 0 ? C.surface : C.s2 }}>
                    <TD mono color={C.muted}>{name}</TD>
                    <TD mono color={C.text}>{count ?? 0}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
