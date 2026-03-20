"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const C = {
  bg: "#0a0a0f", surface: "#0d0d14", s2: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", match: "#30d158",
  hot: "#ff2d55", gold: "#ffd700", text: "#e8e8f0",
  muted: "#6b6b80", dim: "#2a2a3a", border: "rgba(255,255,255,0.07)",
};
const ETH_USD = 2000;

function fmt(n: number, dec = 4) { return n >= 0 ? `+${n.toFixed(dec)}` : n.toFixed(dec); }
function fmtUsd(eth: number) { const u = Math.abs(eth * ETH_USD); return u >= 1000 ? `$${(u/1000).toFixed(1)}k` : `$${u.toFixed(0)}`; }

function age(ts: string) {
  const ms = Date.now() - new Date(ts).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

function duration(from: string, to: string) {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function Skeleton({ w = "100%", h = 16 }: { w?: string | number; h?: number }) {
  return <div style={{ width: w, height: h, borderRadius: 6, background: "rgba(255,255,255,0.04)", animation: "tcc-shimmer 1.5s ease-in-out infinite" }} />;
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${color}33`, borderRadius: 14, padding: "16px 20px", flex: 1, minWidth: 0, boxShadow: `0 0 20px ${color}11` }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: C.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function EquityChart({ series }: { series: { date: string; cumulative: number }[] }) {
  const W = 800, H = 140, PAD = { l: 48, r: 16, t: 16, b: 32 };
  if (!series.length) {
    return (
      <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: 40, textAlign: "center" as const, color: C.muted, fontSize: 13 }}>
        No trade history yet — your agent will chart its performance here once it starts trading.
      </div>
    );
  }
  const vals = series.map(s => s.cumulative);
  const min = Math.min(...vals, 0), max = Math.max(...vals, 0.001);
  const range = max - min || 0.001;
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const px = (i: number) => PAD.l + (i / (series.length - 1)) * iW;
  const py = (v: number) => PAD.t + (1 - (v - min) / range) * iH;
  const pts = series.map((s, i) => `${px(i)},${py(s.cumulative)}`).join(" L ");
  const area = `M ${pts} L ${px(series.length - 1)},${py(0)} L ${px(0)},${py(0)} Z`;
  const line = `M ${pts}`;
  const profitable = vals[vals.length - 1] >= 0;
  const lineColor = profitable ? C.match : C.hot;
  // Y axis labels
  const yTicks = [min, (min + max) / 2, max].map(v => ({ v, y: py(v) }));
  // X axis labels (show up to 5)
  const step = Math.max(1, Math.floor(series.length / 5));
  const xTicks = series.filter((_, i) => i % step === 0 || i === series.length - 1).slice(0, 5);

  return (
    <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: "16px 0 8px", overflow: "hidden" }}>
      <div style={{ padding: "0 20px 8px", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: C.muted }}>Equity Curve (ETH)</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="eq-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={C.indigo} />
            <stop offset="100%" stopColor={C.cyan} />
          </linearGradient>
          <linearGradient id="eq-fill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {/* zero line */}
        <line x1={PAD.l} y1={py(0)} x2={W - PAD.r} y2={py(0)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4,4" />
        {/* area fill */}
        <path d={area} fill="url(#eq-fill)" />
        {/* line */}
        <path d={line} fill="none" stroke="url(#eq-line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Y ticks */}
        {yTicks.map((t, i) => (
          <text key={i} x={PAD.l - 4} y={t.y + 4} textAnchor="end" fontSize="9" fill={C.muted}>{t.v >= 0 ? "+" : ""}{t.v.toFixed(3)}</text>
        ))}
        {/* X ticks */}
        {xTicks.map((s, i) => {
          const idx = series.indexOf(s);
          return <text key={i} x={px(idx)} y={H - 4} textAnchor="middle" fontSize="9" fill={C.muted}>{s.date.slice(5)}</text>;
        })}
      </svg>
    </div>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = { A: C.match, B: C.cyan, C: C.gold, D: "#f97316", F: C.hot };
  const c = colors[grade] || C.muted;
  return <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 5, background: `${c}22`, border: `1px solid ${c}55`, color: c, fontSize: 10, fontWeight: 800 }}>{grade}</span>;
}

interface Trade {
  id: string; action: string; token_symbol: string; token_address: string;
  amount_eth: number; price_at_trade: number; fee_eth: number; pnl_eth: number;
  reasoning: string; tx_hash: string; created_at: string; closed_at: string | null; peak_price: number;
}
interface LogEntry {
  action: string; token_symbol: string; amount: number; price: number; pnl: number;
  grade: string; tx_hash: string; reasoning: string; confidence: number; timestamp: string;
}
interface PerfData {
  total_trades: number; winning_trades: number; total_pnl: number;
  best_trade_pnl: number; worst_trade_pnl: number; current_grade: string;
}

export default function TradesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [perf, setPerf] = useState<PerfData | null>(null);
  const [winRate, setWinRate] = useState(0);
  const [pnlSeries, setPnlSeries] = useState<{ date: string; cumulative: number }[]>([]);
  const [sortCol, setSortCol] = useState<"date" | "pnl">("date");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(async () => {
    try {
      const [walletRes, perfRes, logsRes] = await Promise.all([
        fetch("/api/wallet"),
        fetch("/api/performance"),
        fetch("/api/trades?limit=100"),
      ]);
      const [walletData, perfData, logsData] = await Promise.all([
        walletRes.json(), perfRes.json(), logsRes.json(),
      ]);
      if (walletData.trades) setTrades(walletData.trades.filter((t: Trade) => t.action !== "skip" || true));
      if (perfData.performance) setPerf(perfData.performance);
      if (perfData.win_rate !== undefined) setWinRate(perfData.win_rate);
      if (perfData.pnl_series) setPnlSeries(perfData.pnl_series);
      if (logsData.trades) setLogs(logsData.trades);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Auth check
    fetch("/api/auth/siwe/session").then(r => r.json()).then(d => {
      if (!d?.user) { router.push("/auth/signin"); return; }
      load();
    }).catch(() => router.push("/auth/signin"));
  }, [load, router]);

  useEffect(() => {
    intervalRef.current = setInterval(load, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  const openPositions = trades.filter(t => t.action === "buy" && !t.closed_at);
  const allActivity = trades.filter(t => t.action !== "skip").sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const closedTrades = trades.filter(t => t.closed_at).sort((a, b) => {
    if (sortCol === "pnl") return sortDir === "desc" ? (b.pnl_eth - a.pnl_eth) : (a.pnl_eth - b.pnl_eth);
    return sortDir === "desc"
      ? new Date(b.closed_at!).getTime() - new Date(a.closed_at!).getTime()
      : new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime();
  });

  const totalPnl = perf?.total_pnl ?? 0;
  const todayPnl = trades.filter(t => t.closed_at && new Date(t.closed_at).toDateString() === new Date().toDateString()).reduce((s, t) => s + (t.pnl_eth || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'JetBrains Mono', 'SF Mono', monospace", paddingBottom: 60 }}>
      <style>{`
        @keyframes tcc-shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        @keyframes tcc-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.5)} }
        @keyframes tcc-slide { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Header ── */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: `${C.surface}cc`, backdropFilter: "blur(12px)", position: "sticky" as const, top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: "4px 8px", fontSize: 12, fontFamily: "inherit" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          </button>
          <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.02em" }}>Trade Command Center</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.match, animation: "tcc-pulse 2s infinite" }} />
          <span style={{ fontSize: 10, color: C.match, fontWeight: 700 }}>LIVE</span>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px" }}>

        {/* ── Stat Cards ── */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" as const }}>
          {loading ? [1,2,3,4].map(i => <div key={i} style={{ flex: 1, minWidth: 140 }}><Skeleton h={80} /></div>) : <>
            <StatCard label="Total P&L" value={`${fmt(totalPnl, 4)} ETH`} sub={`${totalPnl >= 0 ? "+" : ""}${fmtUsd(totalPnl)}`} color={totalPnl >= 0 ? C.match : C.hot} />
            <StatCard label="Win Rate" value={`${winRate}%`} sub={`${perf?.winning_trades ?? 0}W / ${(perf?.total_trades ?? 0) - (perf?.winning_trades ?? 0)}L`} color={C.indigo} />
            <StatCard label="Open Positions" value={`${openPositions.length}`} sub={openPositions.length > 0 ? "agents deployed" : "watching for signals"} color={C.cyan} />
            <StatCard label="Today's P&L" value={`${fmt(todayPnl, 4)} ETH`} sub={fmtUsd(todayPnl)} color={todayPnl >= 0 ? C.match : C.hot} />
          </>}
        </div>

        {/* ── Equity Curve ── */}
        <div style={{ marginBottom: 20 }}>
          {loading ? <Skeleton h={180} /> : <EquityChart series={pnlSeries} />}
        </div>

        {/* ── Two Column ── */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" as const }}>

          {/* LEFT: Open Positions */}
          <div style={{ flex: "1 1 300px", minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: C.muted, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.match, animation: "tcc-pulse 1.5s infinite" }} />
              Open Positions ({openPositions.length})
            </div>
            {loading ? [1,2].map(i => <div key={i} style={{ marginBottom: 10 }}><Skeleton h={100} /></div>) :
              openPositions.length === 0 ? (
                <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: "28px 20px", textAlign: "center" as const, color: C.muted, fontSize: 12 }}>
                  No open positions — agent is scanning for signals
                </div>
              ) : openPositions.map(p => {
                const pnlColor = (p.pnl_eth || 0) >= 0 ? C.match : C.hot;
                return (
                  <div key={p.id} style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.match}33`, padding: "14px 16px", marginBottom: 10, animation: "tcc-slide 0.3s ease", boxShadow: `0 0 16px ${C.match}08` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em" }}>{p.token_symbol}</div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Entry: ${p.price_at_trade?.toFixed(6) || "—"}</div>
                      </div>
                      <div style={{ textAlign: "right" as const }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: pnlColor }}>{fmt(p.pnl_eth || 0, 4)} ETH</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{age(p.created_at)} ago</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, fontSize: 10, color: C.muted }}>
                      <span>Size: <span style={{ color: C.text }}>{(p.amount_eth || 0).toFixed(4)} ETH</span></span>
                      <span>|</span>
                      <span>Fee: <span style={{ color: C.text }}>{(p.fee_eth || 0).toFixed(4)} ETH</span></span>
                    </div>
                    {p.tx_hash && (
                      <a href={`https://basescan.org/tx/${p.tx_hash}`} target="_blank" rel="noopener noreferrer"
                        style={{ display: "inline-block", marginTop: 8, fontSize: 10, color: C.indigo, textDecoration: "none" }}>
                        {p.tx_hash.slice(0, 10)}...{p.tx_hash.slice(-6)} on Basescan
                      </a>
                    )}
                  </div>
                );
              })
            }
          </div>

          {/* RIGHT: Activity Log */}
          <div style={{ flex: "1 1 300px", minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: C.muted, marginBottom: 10 }}>Agent Activity Log</div>
            <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden", maxHeight: 460 }}>
              <div style={{ overflowY: "auto" as const, maxHeight: 460 }}>
                {loading ? [1,2,3,4,5].map(i => <div key={i} style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}><Skeleton h={40} /></div>) :
                  allActivity.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center" as const, color: C.muted, fontSize: 12 }}>No activity yet</div>
                  ) : allActivity.map(t => {
                    const isBuy = t.action === "buy";
                    const isSell = t.action === "sell";
                    const borderColor = isBuy ? C.match : isSell ? C.cyan : C.dim;
                    const logEntry = logs.find(l => l.token_symbol === t.token_symbol && Math.abs(new Date(l.timestamp).getTime() - new Date(t.created_at).getTime()) < 120000);
                    return (
                      <div key={t.id} style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}`, borderLeft: `3px solid ${borderColor}`, animation: "tcc-slide 0.2s ease" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: borderColor, textTransform: "uppercase" as const }}>{t.action}</span>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>{t.token_symbol}</span>
                            {isBuy && <span style={{ fontSize: 10, color: C.muted }}>{(t.amount_eth || 0).toFixed(4)} ETH</span>}
                            {isSell && <span style={{ fontSize: 11, fontWeight: 700, color: (t.pnl_eth || 0) >= 0 ? C.match : C.hot }}>{fmt(t.pnl_eth || 0, 4)} ETH</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {logEntry?.grade && <GradeBadge grade={logEntry.grade} />}
                            <span style={{ fontSize: 9, color: C.muted }}>{age(t.created_at)}</span>
                          </div>
                        </div>
                        {t.reasoning && <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.4, marginBottom: 4 }}>{t.reasoning.slice(0, 120)}{t.reasoning.length > 120 ? "..." : ""}</div>}
                        {t.tx_hash && (
                          <a href={`https://basescan.org/tx/${t.tx_hash}`} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 9, color: C.indigo, textDecoration: "none" }}>
                            {t.tx_hash.slice(0, 8)}...{t.tx_hash.slice(-4)}
                          </a>
                        )}
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>
        </div>

        {/* ── Closed Trades Table ── */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: C.muted, marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
            <span>Closed Trades ({closedTrades.length})</span>
            <div style={{ display: "flex", gap: 8 }}>
              {(["date", "pnl"] as const).map(col => (
                <button key={col} onClick={() => { if (sortCol === col) setSortDir(d => d === "desc" ? "asc" : "desc"); else { setSortCol(col); setSortDir("desc"); } }}
                  style={{ background: sortCol === col ? `${C.indigo}22` : "transparent", border: `1px solid ${sortCol === col ? C.indigo + "44" : C.border}`, borderRadius: 5, padding: "3px 8px", color: sortCol === col ? C.indigo : C.muted, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" as const }}>
                  {col} {sortCol === col ? (sortDir === "desc" ? "↓" : "↑") : ""}
                </button>
              ))}
            </div>
          </div>
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 0, padding: "10px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 9, fontWeight: 800, textTransform: "uppercase" as const, color: C.muted, letterSpacing: "0.08em" }}>
              <span>Token</span><span>Amount</span><span>Entry</span><span>P&L</span><span>Duration</span><span>Tx</span>
            </div>
            {loading ? [1,2,3].map(i => <div key={i} style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}><Skeleton h={20} /></div>) :
              closedTrades.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center" as const, color: C.muted, fontSize: 12 }}>No closed trades yet</div>
              ) : closedTrades.map(t => {
                const profitable = (t.pnl_eth || 0) > 0;
                const pnlColor = profitable ? C.match : (t.pnl_eth || 0) < 0 ? C.hot : C.muted;
                return (
                  <div key={t.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 0, padding: "11px 16px", borderBottom: `1px solid ${C.border}`, background: profitable ? `${C.match}06` : (t.pnl_eth || 0) < 0 ? `${C.hot}06` : "transparent", alignItems: "center", fontSize: 11 }}>
                    <div style={{ fontWeight: 700 }}>{t.token_symbol}</div>
                    <div style={{ color: C.muted }}>{(t.amount_eth || 0).toFixed(4)}</div>
                    <div style={{ color: C.muted, fontFamily: "monospace" }}>${t.price_at_trade?.toFixed(5) || "—"}</div>
                    <div style={{ fontWeight: 700, color: pnlColor }}>{fmt(t.pnl_eth || 0, 4)}</div>
                    <div style={{ color: C.muted }}>{t.closed_at ? duration(t.created_at, t.closed_at) : "—"}</div>
                    <div>
                      {t.tx_hash ? (
                        <a href={`https://basescan.org/tx/${t.tx_hash}`} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 10, color: C.indigo, textDecoration: "none" }}>
                          {t.tx_hash.slice(0, 6)}...
                        </a>
                      ) : <span style={{ color: C.dim }}>—</span>}
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    </div>
  );
}
