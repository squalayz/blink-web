"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { GEN_COLORS } from "@/lib/fusion-types";

const C = {
  bg:"#0a0a0a", card:"#141414", border:"#222", text:"#fafafa",
  muted:"#a1a1aa", dim:"#333", violet:"#8b5cf6", green:"#22c55e", red:"#ef4444", gold:"#ffd700",
};

const TIMEFRAMES = ["1H", "24H", "7D", "30D", "ALL"];

export default function TokenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const launchId = params.id as string;

  const [token, setToken] = useState<any>(null);
  const [prices, setPrices] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [holders, setHolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"chart" | "holders" | "trades">("chart");
  const [timeframe, setTimeframe] = useState("24H");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeAmount, setTradeAmount] = useState("");
  const [trading, setTrading] = useState(false);

  useEffect(() => { loadAll(); }, [launchId]);

  async function loadAll() {
    const [tRes, pRes, trRes, hRes] = await Promise.all([
      fetch("/api/tokens", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "token_detail", launch_id: launchId }) }),
      fetch("/api/tokens", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "price_history", launch_id: launchId, period: "1h" }) }),
      fetch("/api/tokens", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trade_history", launch_id: launchId, limit: 30 }) }),
      fetch("/api/tokens", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "holders", launch_id: launchId }) }),
    ]);
    const [tData, pData, trData, hData] = await Promise.all([tRes.json(), pRes.json(), trRes.json(), hRes.json()]);
    setToken(tData.token);
    setPrices(pData.prices || []);
    setTrades(trData.trades || []);
    setHolders(hData.holders || []);
    setLoading(false);
  }

  async function executeTrade() {
    if (!tradeAmount || trading) return;
    setTrading(true);
    try {
      await fetch("/api/tokens", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: tradeType, launch_id: launchId,
          ...(tradeType === "buy" ? { eth_amount: parseFloat(tradeAmount) } : { token_amount: parseFloat(tradeAmount) }),
        }),
      });
      setTradeAmount("");
      loadAll();
    } catch (e) {}
    setTrading(false);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${C.dim}`, borderTopColor: C.violet, animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!token) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit',sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Token not found</h2>
        <button onClick={() => router.push("/marketplace")} style={{ marginTop: 12, color: C.violet, background: "none", border: "none", cursor: "pointer" }}>← Marketplace</button>
      </div>
    </div>
  );

  const price = parseFloat(token.current_price) || 0;
  const price24h = parseFloat(token.price_24h_ago) || 0;
  const change = price24h > 0 ? ((price - price24h) / price24h) * 100 : 0;
  const isUp = change >= 0;
  const genColor = token.fusion ? GEN_COLORS[Math.min((token.fusion.generation || 1) - 1, 4)] : C.violet;

  // Preview trade
  const previewAmount = parseFloat(tradeAmount) || 0;
  const previewTokens = tradeType === "buy" && price > 0 ? previewAmount / price : 0;
  const previewEth = tradeType === "sell" ? previewAmount * price : 0;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Outfit',sans-serif", padding: "80px 24px 120px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <button onClick={() => router.push("/marketplace")} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, marginBottom: 16, fontFamily: "inherit" }}>← Marketplace</button>

        {/* ═══ HERO ═══ */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
          padding: 24, marginBottom: 16,
        }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Token avatar */}
            <div style={{
              width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: `linear-gradient(135deg, ${genColor}33, ${genColor}11)`,
              border: `2px solid ${C.gold}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 900, color: genColor,
            }}>{token.token_symbol[0]}</div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>{token.token_name}</h1>
                <span style={{ fontSize: 14, color: C.muted, fontFamily: "'JetBrains Mono',monospace" }}>${token.token_symbol}</span>
                {token.fusion && (
                  <span style={{
                    fontSize: 9, padding: "2px 6px", borderRadius: 4,
                    background: `${genColor}22`, color: genColor, fontWeight: 800,
                  }}>Gen {token.fusion.generation}</span>
                )}
              </div>
              {/* Price */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: C.text, fontFamily: "'JetBrains Mono',monospace" }}>
                  {price < 0.001 ? price.toExponential(3) : price.toFixed(6)}
                </span>
                <span style={{ fontSize: 11, color: C.muted }}>ETH</span>
                <span style={{
                  fontSize: 14, fontWeight: 800,
                  color: isUp ? C.green : C.red,
                  fontFamily: "'JetBrains Mono',monospace",
                }}>{isUp ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 12, marginTop: 16 }}>
            {[
              { label: "Market Cap", value: `${(parseFloat(token.market_cap) || 0).toFixed(2)} ETH` },
              { label: "Liquidity", value: `${(parseFloat(token.total_liquidity) || 0).toFixed(3)} ETH` },
              { label: "Vol 24h", value: `${(parseFloat(token.volume_24h) || 0).toFixed(3)} ETH` },
              { label: "Holders", value: token.holder_count?.toString() || "0" },
              { label: "Trades", value: token.total_trades?.toString() || "0" },
            ].map((s, i) => (
              <div key={i} style={{
                padding: "10px 12px", borderRadius: 10, background: C.bg, textAlign: "center",
              }}>
                <div style={{ fontSize: 9, color: C.dim, fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ MAIN LAYOUT: Chart/Tabs left, Buy/Sell right ═══ */}
        <div className="token-layout" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>

          {/* LEFT COLUMN */}
          <div>
            {/* Tab bar */}
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {(["chart", "holders", "trades"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: "8px 16px", borderRadius: 8, border: "none",
                  background: tab === t ? `${C.violet}15` : "transparent",
                  color: tab === t ? C.violet : C.muted,
                  fontSize: 13, fontWeight: tab === t ? 700 : 500,
                  cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
                }}>{t === "chart" ? "📈 Chart" : t === "holders" ? "👥 Holders" : "📋 Trades"}</button>
              ))}
            </div>

            {/* CHART TAB */}
            {tab === "chart" && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
                {/* Timeframe selector */}
                <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                  {TIMEFRAMES.map(tf => (
                    <button key={tf} onClick={() => setTimeframe(tf)} style={{
                      padding: "4px 10px", borderRadius: 6, border: "none",
                      background: timeframe === tf ? C.violet : "transparent",
                      color: timeframe === tf ? "white" : C.muted,
                      fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    }}>{tf}</button>
                  ))}
                </div>
                {/* SVG chart */}
                <PriceChart prices={prices} isUp={isUp} />
              </div>
            )}

            {/* HOLDERS TAB */}
            {tab === "holders" && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
                {holders.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 24, color: C.dim }}>No holders yet.</div>
                ) : holders.map((h: any, i: number) => {
                  const pct = ((parseFloat(h.balance) / 1_000_000) * 100).toFixed(2);
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                      borderBottom: i < holders.length - 1 ? `1px solid ${C.border}` : "none",
                    }}>
                      <span style={{ fontSize: 12, color: C.dim, width: 20, textAlign: "right" }}>#{i + 1}</span>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, background: C.dim,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, color: C.muted, overflow: "hidden",
                      }}>
                        {h.user?.avatar_url ? <img src={h.user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : h.user?.name?.[0] || "?"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{h.user?.name || "Anonymous"}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: "'JetBrains Mono',monospace" }}>
                          {parseFloat(h.balance).toLocaleString()}
                        </div>
                        <div style={{ fontSize: 10, color: C.muted }}>{pct}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TRADES TAB */}
            {tab === "trades" && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
                {trades.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 24, color: C.dim }}>No trades yet. Be the first!</div>
                ) : trades.map((t: any, i: number) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                    borderBottom: i < trades.length - 1 ? `1px solid ${C.border}` : "none",
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4,
                      background: t.type === "buy" ? `${C.green}15` : `${C.red}15`,
                      color: t.type === "buy" ? C.green : C.red,
                    }}>{t.type.toUpperCase()}</span>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, background: C.dim,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: C.muted, overflow: "hidden",
                    }}>
                      {t.user?.avatar_url ? <img src={t.user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : t.user?.name?.[0] || "?"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{t.user?.name || "Anon"}</div>
                      <div style={{ fontSize: 10, color: C.dim }}>{new Date(t.created_at).toLocaleTimeString()}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: C.text, fontFamily: "'JetBrains Mono',monospace" }}>
                        {parseFloat(t.token_amount).toLocaleString()} tokens
                      </div>
                      <div style={{ fontSize: 10, color: C.muted }}>{parseFloat(t.eth_amount).toFixed(4)} ETH</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Founders + Fusion info */}
            <div style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
              padding: 16, marginTop: 16,
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: C.muted, marginBottom: 10 }}>Founded by</h3>
              <div style={{ display: "flex", gap: 12 }}>
                {[token.founder_a, token.founder_b].filter(Boolean).map((f: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, background: C.dim,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, color: C.muted, overflow: "hidden",
                    }}>
                      {f.avatar_url ? <img src={f.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : f.name?.[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{f.name}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{f.industry || "Builder"}</div>
                    </div>
                  </div>
                ))}
              </div>

              {token.fusion && (
                <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: C.bg }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Parent Fusion</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: genColor }}>{token.fusion.name}</span>
                    <span style={{
                      fontSize: 9, padding: "1px 4px", borderRadius: 3,
                      background: `${genColor}22`, color: genColor, fontWeight: 800,
                    }}>Gen {token.fusion.generation}</span>
                    {token.fusion.performance_score && (
                      <span style={{ fontSize: 10, color: C.muted }}>· {parseFloat(token.fusion.performance_score).toFixed(0)} pts</span>
                    )}
                  </div>
                  {token.fusion.dna?.traits && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                      {Object.entries(token.fusion.dna.traits).slice(0, 4).map(([t, v]) => (
                        <span key={t} style={{
                          fontSize: 9, padding: "2px 5px", borderRadius: 3,
                          background: `${C.violet}11`, color: C.violet,
                        }}>{t}: {((v as number) * 100).toFixed(0)}%</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ═══ RIGHT: BUY/SELL PANEL ═══ */}
          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
            padding: 18, position: "sticky", top: 90,
          }}>
            {/* Buy/Sell toggle */}
            <div style={{
              display: "flex", gap: 4, padding: 4, borderRadius: 10,
              background: C.bg, marginBottom: 16,
            }}>
              <button onClick={() => setTradeType("buy")} style={{
                flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                background: tradeType === "buy" ? C.green : "transparent",
                color: tradeType === "buy" ? "white" : C.muted,
                fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
              }}>Buy</button>
              <button onClick={() => setTradeType("sell")} style={{
                flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                background: tradeType === "sell" ? C.red : "transparent",
                color: tradeType === "sell" ? "white" : C.muted,
                fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
              }}>Sell</button>
            </div>

            {/* Amount */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, display: "block", marginBottom: 4 }}>
                {tradeType === "buy" ? "ETH Amount" : "Token Amount"}
              </label>
              <input
                value={tradeAmount} onChange={e => setTradeAmount(e.target.value)}
                type="number" step={tradeType === "buy" ? "0.01" : "100"} min="0"
                placeholder={tradeType === "buy" ? "0.1" : "1000"}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10,
                  border: `1px solid ${C.border}`, background: C.bg,
                  color: C.text, fontSize: 20, fontWeight: 800,
                  fontFamily: "'JetBrains Mono',monospace", outline: "none", textAlign: "center",
                }}
              />
            </div>

            {/* Quick amounts */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
              {(tradeType === "buy"
                ? [0.01, 0.05, 0.1, 0.5]
                : [1000, 5000, 10000, 50000]
              ).map(amt => (
                <button key={amt} onClick={() => setTradeAmount(amt.toString())} style={{
                  flex: 1, padding: "6px 0", borderRadius: 6,
                  border: `1px solid ${C.border}`, background: "transparent",
                  color: C.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}>{tradeType === "buy" ? `${amt}Ξ` : amt.toLocaleString()}</button>
              ))}
            </div>

            {/* Preview */}
            {previewAmount > 0 && (
              <div style={{
                padding: "10px 12px", borderRadius: 8, background: C.bg,
                marginBottom: 14, fontSize: 12, color: C.muted, lineHeight: 1.6,
              }}>
                {tradeType === "buy" ? (
                  <>You'll receive ≈ <strong style={{ color: C.text }}>{previewTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> {token.token_symbol}<br />
                  Platform fee: <strong>{(previewAmount * 0.01).toFixed(4)} ETH</strong> (1%)</>
                ) : (
                  <>You'll receive ≈ <strong style={{ color: C.text }}>{previewEth.toFixed(6)}</strong> ETH<br />
                  Platform fee: <strong>{(previewEth * 0.01).toFixed(6)} ETH</strong> (1%)</>
                )}
              </div>
            )}

            {/* Execute */}
            <button onClick={executeTrade} disabled={trading || previewAmount <= 0} style={{
              width: "100%", padding: 14, borderRadius: 10, border: "none",
              background: tradeType === "buy"
                ? `linear-gradient(135deg, ${C.green}, #16a34a)`
                : `linear-gradient(135deg, ${C.red}, #dc2626)`,
              color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
              opacity: trading || previewAmount <= 0 ? 0.5 : 1,
            }}>
              {trading ? "Signing..." : tradeType === "buy"
                ? `Buy ${token.token_symbol}`
                : `Sell ${token.token_symbol}`}
            </button>

            <p style={{ fontSize: 10, color: C.dim, textAlign: "center", marginTop: 8 }}>
              Price updates after each trade via bonding curve.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile buy/sell bottom sheet override */}
      <style>{`
        @media (max-width: 768px) {
          .token-layout { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .token-layout > div:last-child { 
            position: fixed !important; bottom: 0; left: 0; right: 0;
            border-radius: 16px 16px 0 0 !important;
            z-index: 50; max-height: 45vh; overflow-y: auto;
          }
        }
      `}</style>
    </div>
  );
}

// ═══ SVG PRICE CHART ═══
function PriceChart({ prices, isUp }: { prices: any[]; isUp: boolean }) {
  const chartData = useMemo(() => {
    if (prices.length === 0) {
      // Generate demo data
      return Array.from({ length: 24 }, (_, i) => ({
        price: 0.001 + Math.sin(i * 0.5) * 0.0003 + (isUp ? i * 0.00005 : -i * 0.00003) + Math.random() * 0.0001,
        time: i,
      }));
    }
    return prices.map((p, i) => ({ price: parseFloat(p.price) || 0, time: i }));
  }, [prices, isUp]);

  const priceValues = chartData.map(d => d.price);
  const min = Math.min(...priceValues);
  const max = Math.max(...priceValues);
  const range = max - min || 0.0001;
  const W = 540, H = 200, pad = 30;

  const pathD = chartData.map((d, i) => {
    const x = pad + (i / Math.max(1, chartData.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (d.price - min) / range) * (H - pad * 2);
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  const lastX = pad + ((chartData.length - 1) / Math.max(1, chartData.length - 1)) * (W - pad * 2);
  const fillD = pathD + ` L ${lastX} ${H - pad} L ${pad} ${H - pad} Z`;
  const color = isUp ? C.green : C.red;

  // Y-axis labels
  const yLabels = [min, min + range * 0.5, max].map(v => v.toFixed(6));

  return (
    <div style={{ position: "relative" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.15" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(p => (
          <line key={p} x1={pad} y1={pad + (1 - p) * (H - pad * 2)} x2={W - pad} y2={pad + (1 - p) * (H - pad * 2)}
            stroke={C.border} strokeWidth="0.5" />
        ))}

        {/* Fill */}
        <path d={fillD} fill="url(#chart-grad)" />

        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />

        {/* Current price dot */}
        {chartData.length > 0 && (() => {
          const last = chartData[chartData.length - 1];
          const x = pad + ((chartData.length - 1) / Math.max(1, chartData.length - 1)) * (W - pad * 2);
          const y = pad + (1 - (last.price - min) / range) * (H - pad * 2);
          return (
            <>
              <circle cx={x} cy={y} r="4" fill={color} />
              <circle cx={x} cy={y} r="7" fill={color} opacity="0.2">
                <animate attributeName="r" values="7;12;7" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.2;0;0.2" dur="2s" repeatCount="indefinite" />
              </circle>
            </>
          );
        })()}

        {/* Y labels */}
        {yLabels.map((label, i) => (
          <text key={i} x={pad - 4} y={pad + (1 - i * 0.5) * (H - pad * 2) + 3}
            textAnchor="end" fill={C.dim} fontSize="8" fontFamily="'JetBrains Mono',monospace">
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}
