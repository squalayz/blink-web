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

function fmtPnl(n: number, dec = 4) {
  if (isNaN(n)) return "0.0000";
  return (n >= 0 ? "+" : "") + n.toFixed(dec);
}
function fmtUsd(eth: number) {
  const u = Math.abs(eth * ETH_USD);
  return u >= 1000 ? "$" + (u / 1000).toFixed(1) + "k" : "$" + u.toFixed(0);
}
function ageStr(ts: string) {
  const ms = Date.now() - new Date(ts).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h " + (m % 60) + "m ago";
  return Math.floor(h / 24) + "d ago";
}
function durStr(from: string, to: string) {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return m + "m";
  return Math.floor(m / 60) + "h " + (m % 60) + "m";
}
function shortHash(h: string) {
  return h ? h.slice(0, 8) + "..." + h.slice(-4) : "";
}

function Skeleton({ h = 16, w = "100%" }: { h?: number; w?: string }) {
  return (
    <div style={{ width: w, height: h, borderRadius: 8, background: "rgba(255,255,255,0.05)", animation: "tcc-pulse 1.5s ease-in-out infinite" }} />
  );
}

interface Trade {
  id: string;
  action: string;
  token_symbol: string;
  token_address: string;
  amount_eth: number;
  price_at_trade: number;
  fee_eth: number;
  pnl_eth: number;
  reasoning: string;
  tx_hash: string;
  created_at: string;
  closed_at: string | null;
  peak_price: number;
}

interface Stats {
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_pnl: number;
  today_pnl: number;
  open_count: number;
}

export default function TradesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [openPositions, setOpenPositions] = useState<Trade[]>([]);
  const [pnlSeries, setPnlSeries] = useState<{ date: string; pnl: number; cumulative: number }[]>([]);
  const [stats, setStats] = useState<Stats>({ total_trades: 0, wins: 0, losses: 0, win_rate: 0, total_pnl: 0, today_pnl: 0, open_count: 0 });
  const [sortCol, setSortCol] = useState<"date" | "pnl">("date");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/trading/history?limit=200");
      if (res.status === 401) { router.push("/auth/signin"); return; }
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setTrades(data.trades || []);
      setOpenPositions(data.open_positions || []);
      setPnlSeries(data.pnl_series || []);
      setStats(data.stats || { total_trades: 0, wins: 0, losses: 0, win_rate: 0, total_pnl: 0, today_pnl: 0, open_count: 0 });
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  const allActivity = [...trades].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const closedTrades = trades
    .filter(t => t.closed_at)
    .sort((a, b) => {
      if (sortCol === "pnl") return sortDir === "desc" ? (b.pnl_eth - a.pnl_eth) : (a.pnl_eth - b.pnl_eth);
      return sortDir === "desc"
        ? new Date(b.closed_at!).getTime() - new Date(a.closed_at!).getTime()
        : new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime();
    });

  // Equity chart
  const chartW = 800, chartH = 140;
  const PL = 48, PR = 16, PT = 16, PB = 32;
  const iW = chartW - PL - PR, iH = chartH - PT - PB;
  const vals = pnlSeries.map(s => s.cumulative);
  const minV = Math.min(...vals, 0), maxV = Math.max(...vals, 0.001);
  const range = maxV - minV || 0.001;
  const px = (i: number) => PL + (i / Math.max(pnlSeries.length - 1, 1)) * iW;
  const py = (v: number) => PT + (1 - (v - minV) / range) * iH;
  const lineD = pnlSeries.length > 1
    ? "M " + pnlSeries.map((s, i) => px(i).toFixed(1) + "," + py(s.cumulative).toFixed(1)).join(" L ")
    : "";
  const areaD = pnlSeries.length > 1
    ? lineD + " L " + px(pnlSeries.length - 1).toFixed(1) + "," + py(0).toFixed(1) + " L " + px(0).toFixed(1) + "," + py(0).toFixed(1) + " Z"
    : "";
  const profitable = vals.length > 0 && vals[vals.length - 1] >= 0;

  const pnlColor = (n: number) => n > 0 ? C.match : n < 0 ? C.hot : C.muted;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'JetBrains Mono', 'SF Mono', monospace", paddingBottom: 80 }}>
      <style>{`
        @keyframes tcc-pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes tcc-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.6)} }
        @keyframes tcc-slide { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        a { text-decoration: none; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface + "ee", backdropFilter: "blur(12px)", position: "sticky" as const, top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: "4px 8px", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          </button>
          <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.02em" }}>Trade Command Center</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.match, animation: "tcc-dot 2s infinite" }} />
          <span style={{ fontSize: 10, color: C.match, fontWeight: 700, letterSpacing: "0.08em" }}>LIVE</span>
          <button onClick={load} style={{ background: "none", border: "1px solid " + C.border, borderRadius: 6, color: C.muted, cursor: "pointer", padding: "3px 8px", fontSize: 10, fontFamily: "inherit", marginLeft: 8 }}>Refresh</button>
        </div>
      </div>

      {error && <div style={{ margin: "12px 20px", padding: "10px 14px", background: C.hot + "15", border: "1px solid " + C.hot + "44", borderRadius: 10, fontSize: 12, color: C.hot }}>{error}</div>}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px" }}>

        {/* Stat Cards */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" as const }}>
          {[
            { label: "Total P&L", val: loading ? null : fmtPnl(stats.total_pnl) + " ETH", sub: loading ? null : fmtUsd(stats.total_pnl), color: pnlColor(stats.total_pnl) },
            { label: "Win Rate", val: loading ? null : stats.win_rate + "%", sub: loading ? null : stats.wins + "W / " + stats.losses + "L", color: C.indigo },
            { label: "Open Positions", val: loading ? null : String(stats.open_count), sub: stats.open_count > 0 ? "actively trading" : "watching for signals", color: C.cyan },
            { label: "Today's P&L", val: loading ? null : fmtPnl(stats.today_pnl) + " ETH", sub: loading ? null : fmtUsd(stats.today_pnl), color: pnlColor(stats.today_pnl) },
          ].map((card, i) => (
            <div key={i} style={{ flex: "1 1 140px", background: C.surface, border: "1px solid " + card.color + "33", borderRadius: 14, padding: "16px 18px", boxShadow: "0 0 20px " + card.color + "0a" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: C.muted, marginBottom: 8 }}>{card.label}</div>
              {loading ? <Skeleton h={28} /> : <div style={{ fontSize: 20, fontWeight: 900, color: card.color, letterSpacing: "-0.03em" }}>{card.val}</div>}
              {!loading && card.sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{card.sub}</div>}
            </div>
          ))}
        </div>

        {/* Equity Curve */}
        <div style={{ marginBottom: 20, background: C.surface, borderRadius: 16, border: "1px solid " + C.border, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px 4px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: C.muted }}>
            Equity Curve (Cumulative P&L in ETH)
          </div>
          {loading ? (
            <div style={{ padding: "20px 20px 16px" }}><Skeleton h={120} /></div>
          ) : pnlSeries.length < 2 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" as const, color: C.muted, fontSize: 12 }}>
              Chart will appear once your agent closes its first trades
            </div>
          ) : (
            <svg viewBox={"0 0 " + chartW + " " + chartH} style={{ width: "100%", display: "block" }} preserveAspectRatio="none">
              <defs>
                <linearGradient id="eq-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={C.indigo} />
                  <stop offset="100%" stopColor={C.cyan} />
                </linearGradient>
                <linearGradient id="eq-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={profitable ? C.match : C.hot} stopOpacity="0.15" />
                  <stop offset="100%" stopColor={profitable ? C.match : C.hot} stopOpacity="0.01" />
                </linearGradient>
              </defs>
              <line x1={PL} y1={py(0)} x2={chartW - PR} y2={py(0)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4,4" />
              {areaD && <path d={areaD} fill="url(#eq-fill)" />}
              {lineD && <path d={lineD} fill="none" stroke="url(#eq-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
              {[minV, (minV + maxV) / 2, maxV].map((v, i) => (
                <text key={i} x={PL - 4} y={py(v) + 4} textAnchor="end" fontSize="9" fill={C.muted}>{v >= 0 ? "+" : ""}{v.toFixed(3)}</text>
              ))}
              {pnlSeries.filter((_, i) => i % Math.max(1, Math.floor(pnlSeries.length / 6)) === 0).map((s, i, arr) => {
                const idx = pnlSeries.indexOf(s);
                return <text key={i} x={px(idx)} y={chartH - 4} textAnchor="middle" fontSize="9" fill={C.muted}>{s.date.slice(5)}</text>;
              })}
            </svg>
          )}
        </div>

        {/* Two Columns */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "flex-start", flexWrap: "wrap" as const }}>

          {/* Open Positions */}
          <div style={{ flex: "1 1 280px", minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: C.muted, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.match, animation: "tcc-dot 1.5s infinite" }} />
              Open Positions ({openPositions.length})
            </div>
            {loading ? [1, 2].map(i => <div key={i} style={{ marginBottom: 10 }}><Skeleton h={110} /></div>) :
              openPositions.length === 0 ? (
                <div style={{ background: C.surface, borderRadius: 14, border: "1px solid " + C.border, padding: "28px 20px", textAlign: "center" as const, color: C.muted, fontSize: 12 }}>
                  No open positions<br />
                  <span style={{ fontSize: 10, marginTop: 4, display: "block" }}>Agent is scanning for entry signals</span>
                </div>
              ) : openPositions.map(p => (
                <div key={p.id} style={{ background: C.surface, borderRadius: 14, border: "1px solid " + C.match + "33", padding: "14px 16px", marginBottom: 10, animation: "tcc-slide 0.3s ease", boxShadow: "0 0 20px " + C.match + "08" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em" }}>{p.token_symbol}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Entry ${p.price_at_trade > 0 ? p.price_at_trade.toFixed(6) : "—"}</div>
                    </div>
                    <div style={{ textAlign: "right" as const }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: pnlColor(p.pnl_eth || 0) }}>{fmtPnl(p.pnl_eth || 0, 4)} ETH</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{ageStr(p.created_at)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 10, color: C.muted, marginBottom: 8 }}>
                    <span>Size <span style={{ color: C.text }}>{(p.amount_eth || 0).toFixed(4)} ETH</span></span>
                    <span>Fee <span style={{ color: C.text }}>{(p.fee_eth || 0).toFixed(4)} ETH</span></span>
                  </div>
                  {p.reasoning && <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.4, marginBottom: 6 }}>{p.reasoning.slice(0, 100)}{p.reasoning.length > 100 ? "..." : ""}</div>}
                  {p.tx_hash && (
                    <a href={"https://basescan.org/tx/" + p.tx_hash} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: C.indigo }}>
                      {shortHash(p.tx_hash)} on Basescan
                    </a>
                  )}
                </div>
              ))
            }
          </div>

          {/* Activity Log */}
          <div style={{ flex: "1 1 280px", minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: C.muted, marginBottom: 10 }}>
              Agent Activity Log ({allActivity.length})
            </div>
            <div style={{ background: C.surface, borderRadius: 14, border: "1px solid " + C.border, overflow: "hidden" }}>
              <div style={{ overflowY: "auto" as const, maxHeight: 480 }}>
                {loading ? [1, 2, 3, 4].map(i => (
                  <div key={i} style={{ padding: "12px 14px", borderBottom: "1px solid " + C.border }}><Skeleton h={36} /></div>
                )) : allActivity.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center" as const, color: C.muted, fontSize: 12 }}>No activity yet — agent is scanning</div>
                ) : allActivity.map(t => {
                  const borderColor = t.action === "buy" ? C.match : t.action === "sell" ? C.cyan : C.dim;
                  return (
                    <div key={t.id} style={{ padding: "10px 14px", borderBottom: "1px solid " + C.border, borderLeft: "3px solid " + borderColor }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: borderColor, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>{t.action}</span>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{t.token_symbol}</span>
                          {t.action === "buy" && t.amount_eth > 0 && <span style={{ fontSize: 10, color: C.muted }}>{t.amount_eth.toFixed(4)} ETH</span>}
                          {t.action === "sell" && <span style={{ fontSize: 11, fontWeight: 700, color: pnlColor(t.pnl_eth || 0) }}>{fmtPnl(t.pnl_eth || 0, 4)} ETH</span>}
                        </div>
                        <span style={{ fontSize: 9, color: C.muted, flexShrink: 0 }}>{ageStr(t.created_at)}</span>
                      </div>
                      {t.reasoning && <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.4, marginBottom: 4 }}>{t.reasoning.slice(0, 100)}{t.reasoning.length > 100 ? "..." : ""}</div>}
                      {t.tx_hash && (
                        <a href={"https://basescan.org/tx/" + t.tx_hash} target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: C.indigo }}>{shortHash(t.tx_hash)}</a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Closed Trades Table */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: C.muted, marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
            <span>Closed Trades ({closedTrades.length})</span>
            <div style={{ display: "flex", gap: 6 }}>
              {(["date", "pnl"] as const).map(col => (
                <button key={col} onClick={() => { if (sortCol === col) setSortDir(d => d === "desc" ? "asc" : "desc"); else { setSortCol(col); setSortDir("desc"); } }}
                  style={{ background: sortCol === col ? C.indigo + "22" : "transparent", border: "1px solid " + (sortCol === col ? C.indigo + "55" : C.border), borderRadius: 5, padding: "3px 8px", color: sortCol === col ? C.indigo : C.muted, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
                  {col} {sortCol === col ? (sortDir === "desc" ? "↓" : "↑") : ""}
                </button>
              ))}
            </div>
          </div>
          <div style={{ background: C.surface, borderRadius: 14, border: "1px solid " + C.border, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 0.8fr 0.8fr", padding: "10px 16px", borderBottom: "1px solid " + C.border, fontSize: 9, fontWeight: 800, textTransform: "uppercase" as const, color: C.muted, letterSpacing: "0.08em" }}>
              <span>Token</span><span>Amount</span><span>Entry</span><span>P&L</span><span>Duration</span><span>Tx</span>
            </div>
            {loading ? [1, 2, 3].map(i => <div key={i} style={{ padding: "12px 16px", borderBottom: "1px solid " + C.border }}><Skeleton h={18} /></div>) :
              closedTrades.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center" as const, color: C.muted, fontSize: 12 }}>No closed trades yet</div>
              ) : closedTrades.map(t => {
                const p = t.pnl_eth || 0;
                const rowBg = p > 0 ? C.match + "08" : p < 0 ? C.hot + "08" : "transparent";
                return (
                  <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 0.8fr 0.8fr", padding: "11px 16px", borderBottom: "1px solid " + C.border, background: rowBg, alignItems: "center", fontSize: 11 }}>
                    <span style={{ fontWeight: 700 }}>{t.token_symbol}</span>
                    <span style={{ color: C.muted }}>{(t.amount_eth || 0).toFixed(4)}</span>
                    <span style={{ color: C.muted, fontFamily: "monospace", fontSize: 10 }}>{t.price_at_trade > 0 ? "$" + t.price_at_trade.toFixed(5) : "—"}</span>
                    <span style={{ fontWeight: 700, color: pnlColor(p) }}>{fmtPnl(p, 4)}</span>
                    <span style={{ color: C.muted, fontSize: 10 }}>{t.closed_at ? durStr(t.created_at, t.closed_at) : "—"}</span>
                    <span>
                      {t.tx_hash
                        ? <a href={"https://basescan.org/tx/" + t.tx_hash} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: C.indigo }}>{t.tx_hash.slice(0, 6)}...</a>
                        : <span style={{ color: C.dim }}>—</span>}
                    </span>
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
