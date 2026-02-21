"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const C = {
  bg:"#0a0a0a", card:"#141414", border:"#222", text:"#fafafa",
  muted:"#a1a1aa", dim:"#333", violet:"#8b5cf6", green:"#22c55e", red:"#ef4444", gold:"#ffd700",
};

export default function PortfolioPage() {
  const router = useRouter();
  const [holdings, setHoldings] = useState<any[]>([]);
  const [launches, setLaunches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await fetch("/api/tokens", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "portfolio" }),
      });
      const data = await res.json();
      setHoldings(data.holdings || []);
      setLaunches(data.launches || []);
    } catch (e) {}
    setLoading(false);
  }

  // Calculate totals
  const totalValue = holdings.reduce((sum, h) => {
    const price = parseFloat(h.launch?.current_price) || 0;
    return sum + (parseFloat(h.balance) || 0) * price;
  }, 0);
  const totalInvested = holdings.reduce((sum, h) => sum + (parseFloat(h.total_invested) || 0), 0);
  const totalPnl = totalValue - totalInvested;
  const pnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, fontFamily: "'Outfit',sans-serif",
      padding: "80px 24px 100px",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: C.text, margin: "0 0 4px" }}>Portfolio</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Your agent tokens and launches.</p>
          </div>
          <button onClick={() => router.push("/marketplace")} style={{
            padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
            background: "transparent", color: C.violet, fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>Browse Marketplace →</button>
        </div>

        {/* ═══ TOTAL VALUE CARD ═══ */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
          padding: 24, marginBottom: 20, textAlign: "center",
        }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Total Portfolio Value</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: C.text, fontFamily: "'JetBrains Mono',monospace" }}>
            {totalValue.toFixed(4)} <span style={{ fontSize: 18, color: C.muted }}>ETH</span>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: C.dim }}>Invested</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.muted, fontFamily: "'JetBrains Mono',monospace" }}>
                {totalInvested.toFixed(4)} ETH
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.dim }}>P&L</div>
              <div style={{
                fontSize: 14, fontWeight: 800,
                color: totalPnl >= 0 ? C.green : C.red,
                fontFamily: "'JetBrains Mono',monospace",
              }}>
                {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(4)} ETH ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              border: `3px solid ${C.dim}`, borderTopColor: C.violet,
              animation: "spin 0.8s linear infinite", margin: "0 auto",
            }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* ═══ HOLDINGS ═══ */}
        {holdings.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: C.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Holdings ({holdings.length})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {holdings.map((h: any) => {
                const price = parseFloat(h.launch?.current_price) || 0;
                const balance = parseFloat(h.balance) || 0;
                const value = balance * price;
                const invested = parseFloat(h.total_invested) || 0;
                const pnl = value - invested;
                const pnlP = invested > 0 ? (pnl / invested) * 100 : 0;
                const pct = (balance / 1_000_000) * 100;
                const price24h = parseFloat(h.launch?.price_24h_ago) || 0;
                const change24h = price24h > 0 ? ((price - price24h) / price24h) * 100 : 0;

                return (
                  <button key={h.id} onClick={() => router.push(`/marketplace/${h.launch_id}`)} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                    borderRadius: 12, background: C.card, border: `1px solid ${C.border}`,
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${C.violet}22`, border: `1.5px solid ${C.gold}33`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 900, color: C.violet,
                    }}>{h.launch?.token_symbol?.[0] || "?"}</div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{h.launch?.token_name || "Unknown"}</span>
                        <span style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono',monospace" }}>${h.launch?.token_symbol}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        {balance.toLocaleString()} tokens · {pct.toFixed(2)}% supply
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.text, fontFamily: "'JetBrains Mono',monospace" }}>
                        {value.toFixed(4)} Ξ
                      </div>
                      <div style={{
                        fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
                        color: pnl >= 0 ? C.green : C.red,
                      }}>
                        {pnl >= 0 ? "+" : ""}{pnl.toFixed(4)} ({pnlP >= 0 ? "+" : ""}{pnlP.toFixed(1)}%)
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ MY LAUNCHES ═══ */}
        {launches.length > 0 && (
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: C.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              My Launches ({launches.length})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {launches.map((l: any) => {
                const statusColors: Record<string, string> = {
                  PROPOSING: "#eab308", AGREED: "#3b82f6", FUNDING: "#a855f7", LIVE: C.green, CANCELLED: C.dim,
                };
                return (
                  <button key={l.id} onClick={() => l.status === "LIVE" ? router.push(`/marketplace/${l.id}`) : null} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                    borderRadius: 12, background: C.card, border: `1px solid ${C.border}`,
                    cursor: l.status === "LIVE" ? "pointer" : "default",
                    fontFamily: "inherit", textAlign: "left", width: "100%",
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: `${C.gold}15`, border: `1.5px solid ${C.gold}33`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14,
                    }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                        {l.token_name} <span style={{ color: C.muted, fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>${l.token_symbol}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        {l.holder_count || 0} holders · {l.total_trades || 0} trades
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, padding: "3px 8px", borderRadius: 6,
                      background: `${statusColors[l.status] || C.dim}15`,
                      color: statusColors[l.status] || C.dim,
                      fontWeight: 700,
                    }}>{l.status}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && holdings.length === 0 && launches.length === 0 && (
          <div style={{
            textAlign: "center", padding: 48, borderRadius: 16,
            border: `2px dashed ${C.border}`, background: `${C.violet}04`,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}></div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 4 }}>No tokens yet</h3>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>
              Browse the marketplace to buy tokens, or launch one from a Fusion.
            </p>
            <button onClick={() => router.push("/marketplace")} style={{
              padding: "10px 24px", borderRadius: 10, border: "none",
              background: C.violet, color: "white", fontSize: 14, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}>Browse Marketplace →</button>
          </div>
        )}
      </div>
    </div>
  );
}
