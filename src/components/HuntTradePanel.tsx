"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const C = {
  bg: "#0a0a0f", surface: "#0d0d14", s2: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", match: "#30d158",
  hot: "#ff2d55", gold: "#ffd700", text: "#e8e8f0", muted: "#6b6b80",
  dim: "#2a2a3a", border: "rgba(255,255,255,0.07)",
};

interface Token {
  address: string;
  symbol: string;
  name: string;
  chainId: string;
  price: number;
  priceChange1h: number;
  priceChange24h: number;
  volume1h: number;
  volume24h: number;
  liquidity: number;
  fdv: number;
  marketCap: number;
  txns1h: { buys: number; sells: number };
  pairCreatedAt: number;
  imageUrl: string | null;
  url: string;
  score: number;
  tags: string[];
  pricePoints: number[];
}

interface HuntTradePanelProps {
  token: Token | null;
  walletEth: number;
  quickAmount: number;
  onTradeComplete: (result: Record<string, unknown>) => void;
}

function fmtPrice(p: number): string {
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(8)}`;
}

function fmtVol(v: number): string {
  if (!v || v === 0) return "\u2014";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function chainColor(id: string): string {
  const m: Record<string, string> = { base: "#0052FF", solana: "#9945FF", ethereum: "#627EEA", bsc: "#F0B90B", arbitrum: "#28A0F0" };
  return m[id] || C.muted;
}

function generateHuntBrief(token: Token): string {
  const score = token.score || 0;
  const priceChange = token.priceChange1h || 0;
  const vol = token.volume24h || 0;
  const liq = token.liquidity || 0;

  if (score >= 90) return `Score ${score}/100. All signals aligned — volume, liquidity, and momentum are all strong. High-conviction setup.`;
  if (priceChange > 30 && vol > 500000) return `Up ${priceChange.toFixed(0)}% with $${(vol / 1000).toFixed(0)}K volume. Momentum play.`;
  if (liq < 50000) return `Low liquidity ($${(liq / 1000).toFixed(0)}K) — high risk. Only small positions.`;
  if (priceChange > 10 && liq > 200000) return `Healthy breakout with solid liquidity. Score ${score}/100.`;
  if (priceChange < -15) return `Down ${Math.abs(priceChange).toFixed(0)}% — could be shakeout or distribution. Wait for confirmation.`;
  return `Score ${score}/100. Moderate setup. Check volume trend before committing.`;
}

export default function HuntTradePanel({
  token,
  walletEth,
  quickAmount,
  onTradeComplete,
}: HuntTradePanelProps) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [amountEth, setAmountEth] = useState("");
  const [sellPct, setSellPct] = useState(0);
  const [slippage, setSlippage] = useState("1");
  const [customSlippage, setCustomSlippage] = useState("");

  // Quote state
  const [quote, setQuote] = useState<{ amountOut: number; hasLiquidity: boolean } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const quoteTimer = useRef<NodeJS.Timeout | null>(null);

  // Trade execution state
  const [tradeState, setTradeState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [tradeResult, setTradeResult] = useState<Record<string, unknown> | null>(null);
  const [tradeError, setTradeError] = useState("");
  const [txHash, setTxHash] = useState("");

  // Recent trades
  const [recentTrades, setRecentTrades] = useState<Array<{ action: string; token_symbol: string; amount: number; tx_hash: string; created_at: string }>>([]);

  // ETH price for USD conversion
  const [ethPrice, setEthPrice] = useState(0);

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
      .then(r => r.json())
      .then(d => { if (d?.ethereum?.usd) setEthPrice(d.ethereum.usd); })
      .catch(() => {});
  }, []);

  // Convert quickAmount USD to ETH
  useEffect(() => {
    if (tab === "buy" && ethPrice > 0 && quickAmount > 0) {
      setAmountEth((quickAmount / ethPrice).toFixed(6));
    }
  }, [quickAmount, ethPrice, tab]);

  // Fetch quote with debounce
  const fetchQuote = useCallback(async (amt: string) => {
    if (!token || !amt || parseFloat(amt) <= 0) {
      setQuote(null);
      return;
    }
    setQuoteLoading(true);
    try {
      const dir = tab === "buy" ? "buy" : "sell";
      const res = await fetch(`/api/trading/quote?token=${token.address}&amount=${amt}&direction=${dir}`);
      const data = await res.json();
      setQuote({ amountOut: data.amountOut || 0, hasLiquidity: data.hasLiquidity || false });
    } catch {
      setQuote(null);
    }
    setQuoteLoading(false);
  }, [token, tab]);

  useEffect(() => {
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    const amt = tab === "buy" ? amountEth : String(sellPct);
    if (amt && parseFloat(amt) > 0) {
      quoteTimer.current = setTimeout(() => fetchQuote(amt), 500);
    } else {
      setQuote(null);
    }
    return () => { if (quoteTimer.current) clearTimeout(quoteTimer.current); };
  }, [amountEth, sellPct, fetchQuote, tab]);

  // Fetch recent trades
  useEffect(() => {
    if (!token) return;
    fetch(`/api/trades?limit=5`)
      .then(r => r.json())
      .then(d => {
        if (d.trades) {
          setRecentTrades(d.trades.filter((t: { token_symbol: string }) => t.token_symbol === token.symbol).slice(0, 3));
        }
      })
      .catch(() => {});
  }, [token, tradeState]);

  // Reset state when token changes
  useEffect(() => {
    setTradeState("idle");
    setTradeResult(null);
    setTradeError("");
    setTxHash("");
    setQuote(null);
    setSellPct(0);
  }, [token?.address]);

  const executeTrade = async () => {
    if (!token) return;
    const slip = customSlippage ? parseFloat(customSlippage) : parseFloat(slippage);
    const amt = tab === "buy" ? parseFloat(amountEth) : sellPct;

    if (!amt || amt <= 0) return;

    setTradeState("pending");
    setTradeError("");
    setTxHash("");

    try {
      const res = await fetch("/api/trading/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: tab,
          tokenAddress: token.address,
          tokenSymbol: token.symbol,
          amountEth: amt,
          slippagePct: slip,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setTradeState("success");
        setTradeResult(data);
        setTxHash(data.txHash || "");
        onTradeComplete(data);
        setTimeout(() => setTradeState("idle"), 5000);
      } else {
        setTradeState("error");
        setTradeError(data.error || "Trade failed");
        setTimeout(() => setTradeState("idle"), 5000);
      }
    } catch {
      setTradeState("error");
      setTradeError("Network error — check connection");
      setTimeout(() => setTradeState("idle"), 5000);
    }
  };

  if (!token) {
    return (
      <div style={{
        background: "rgba(13,13,20,0.95)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16, padding: 20, position: "sticky", top: 80, alignSelf: "flex-start",
      }}>
        <div style={{ textAlign: "center", padding: "40px 16px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
          </svg>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginTop: 12 }}>Select a token to trade</div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>Click any token from the list</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "rgba(13,13,20,0.95)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16, padding: 20, position: "sticky", top: 80, alignSelf: "flex-start",
    }}>
      {/* Transaction pending bar */}
      {tradeState === "pending" && (
        <div style={{
          background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)",
          borderRadius: 8, padding: "8px 12px", marginBottom: 12,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round"
            style={{ animation: "hunt-spin 1s linear infinite" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>Transaction broadcasting...</span>
          {txHash && (
            <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 10, color: C.cyan, marginLeft: "auto", textDecoration: "none" }}>
              View
            </a>
          )}
        </div>
      )}

      {/* Success bar */}
      {tradeState === "success" && tradeResult && (
        <div style={{
          background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.2)",
          borderRadius: 8, padding: "8px 12px", marginBottom: 12,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.match} strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span style={{ fontSize: 12, color: C.match, fontWeight: 600 }}>
            {(tradeResult as Record<string, unknown>).message as string || "Trade successful!"}
          </span>
          {txHash && (
            <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 10, color: C.cyan, marginLeft: "auto", textDecoration: "none" }}>
              Tx
            </a>
          )}
        </div>
      )}

      {/* Error bar */}
      {tradeState === "error" && (
        <div style={{
          background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.2)",
          borderRadius: 8, padding: "8px 12px", marginBottom: 12,
        }}>
          <span style={{ fontSize: 12, color: C.hot, fontWeight: 600 }}>{tradeError}</span>
        </div>
      )}

      {/* Token header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{token.symbol}</span>
          <span style={{
            fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 8,
            background: `${chainColor(token.chainId)}20`, color: chainColor(token.chainId),
          }}>{token.chainId}</span>
          <a href={token.url} target="_blank" rel="noopener noreferrer"
            style={{
              marginLeft: "auto", display: "flex", alignItems: "center", justifyContent: "center",
              width: 24, height: 24, borderRadius: 6,
              background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
              color: C.muted, textDecoration: "none",
            }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
        <div style={{
          fontSize: 24, fontWeight: 800, color: C.text,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.03em",
        }}>{fmtPrice(token.price)}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
            background: token.priceChange1h >= 0 ? "rgba(48,209,88,0.12)" : "rgba(255,45,85,0.12)",
            color: token.priceChange1h >= 0 ? C.match : C.hot,
          }}>1h: {token.priceChange1h >= 0 ? "+" : ""}{token.priceChange1h.toFixed(1)}%</span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
            background: token.priceChange24h >= 0 ? "rgba(48,209,88,0.12)" : "rgba(255,45,85,0.12)",
            color: token.priceChange24h >= 0 ? C.match : C.hot,
          }}>24h: {token.priceChange24h >= 0 ? "+" : ""}{token.priceChange24h.toFixed(1)}%</span>
        </div>
      </div>

      {/* Mini sparkline */}
      {token.pricePoints && token.pricePoints.length > 1 && (
        <div style={{
          height: 48, borderRadius: 8, marginBottom: 12, overflow: "hidden",
          background: token.priceChange1h >= 0
            ? "linear-gradient(135deg, rgba(48,209,88,0.06), transparent)"
            : "linear-gradient(135deg, rgba(255,45,85,0.06), transparent)",
        }}>
          <svg width="100%" height="48" viewBox={`0 0 ${token.pricePoints.length} 48`} preserveAspectRatio="none" style={{ display: "block" }}>
            {(() => {
              const pts = token.pricePoints;
              const mn = Math.min(...pts);
              const mx = Math.max(...pts);
              const range = mx - mn || 1;
              const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${i} ${44 - ((p - mn) / range) * 40 - 2}`).join(" ");
              const col = token.priceChange1h >= 0 ? C.match : C.hot;
              return <path d={d} fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" />;
            })()}
          </svg>
        </div>
      )}

      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
        {[
          { label: "MCap", val: fmtVol(token.marketCap) },
          { label: "FDV", val: fmtVol(token.fdv) },
          { label: "Liquidity", val: fmtVol(token.liquidity) },
          { label: "Vol 24h", val: fmtVol(token.volume24h) },
        ].map(m => (
          <div key={m.label} style={{
            background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "6px 10px",
          }}>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* AI Whisper bar */}
      <div style={{
        background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
        borderRadius: 10, padding: "8px 12px", marginBottom: 12,
        display: "flex", alignItems: "flex-start", gap: 8,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.indigo} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z" />
          <line x1="9" y1="21" x2="15" y2="21" />
        </svg>
        <span style={{ fontSize: 11, color: C.text, lineHeight: 1.5 }}>
          {generateHuntBrief(token)}
        </span>
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: C.border, marginBottom: 12 }} />

      {/* BUY / SELL tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        <button onClick={() => setTab("buy")} style={{
          flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 700,
          fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
          border: tab === "buy" ? "1px solid rgba(48,209,88,0.4)" : `1px solid ${C.border}`,
          background: tab === "buy" ? "rgba(48,209,88,0.12)" : "transparent",
          color: tab === "buy" ? C.match : C.muted,
        }}>BUY</button>
        <button onClick={() => setTab("sell")} style={{
          flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 700,
          fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
          border: tab === "sell" ? "1px solid rgba(255,45,85,0.4)" : `1px solid ${C.border}`,
          background: tab === "sell" ? "rgba(255,45,85,0.12)" : "transparent",
          color: tab === "sell" ? C.hot : C.muted,
        }}>SELL</button>
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: C.border, marginBottom: 12 }} />

      {tab === "buy" ? (
        <>
          {/* Amount input */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
              Amount (ETH)
            </div>
            <div style={{
              display: "flex", alignItems: "center",
              background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "10px 12px",
            }}>
              <input type="number" step="0.001" min="0" placeholder="0.00"
                value={amountEth} onChange={e => setAmountEth(e.target.value)}
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  color: C.text, fontSize: 16, fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              />
              <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>ETH</span>
            </div>
            {ethPrice > 0 && amountEth && (
              <div style={{ fontSize: 10, color: C.muted, marginTop: 3, paddingLeft: 2 }}>
                ≈ ${(parseFloat(amountEth) * ethPrice).toFixed(2)} USD
              </div>
            )}
          </div>

          {/* Quick USD amounts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
            {[25, 50, 100, 200].map(usd => (
              <button key={usd} onClick={() => {
                if (ethPrice > 0) setAmountEth((usd / ethPrice).toFixed(6));
              }} style={{
                padding: "6px 0", borderRadius: 6, fontSize: 11, fontWeight: 700,
                border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)",
                color: C.muted, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s",
              }}>
                ${usd}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Sell percentage */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
              Sell % of holdings
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {[{ label: "25%", val: 0.25 }, { label: "50%", val: 0.5 }, { label: "100%", val: 1 }].map(opt => (
                <button key={opt.label} onClick={() => setSellPct(opt.val)} style={{
                  padding: "10px 0", borderRadius: 8, fontSize: 13, fontWeight: 700,
                  border: sellPct === opt.val ? "1px solid rgba(255,45,85,0.4)" : `1px solid ${C.border}`,
                  background: sellPct === opt.val ? "rgba(255,45,85,0.12)" : "rgba(255,255,255,0.03)",
                  color: sellPct === opt.val ? C.hot : C.text,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Slippage */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>Slippage:</span>
        {["0.5", "1", "3"].map(s => (
          <button key={s} onClick={() => { setSlippage(s); setCustomSlippage(""); }}
            style={{
              padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
              border: slippage === s && !customSlippage ? `1px solid ${C.indigo}60` : `1px solid ${C.border}`,
              background: slippage === s && !customSlippage ? `${C.indigo}20` : "transparent",
              color: slippage === s && !customSlippage ? C.indigo : C.muted,
              cursor: "pointer", fontFamily: "inherit",
            }}>{s}%</button>
        ))}
        <input type="text" placeholder="Custom"
          value={customSlippage}
          onChange={e => { setCustomSlippage(e.target.value); if (e.target.value) setSlippage(e.target.value); }}
          style={{
            width: 50, padding: "3px 6px", borderRadius: 6, fontSize: 10,
            border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)",
            color: C.text, fontFamily: "inherit", outline: "none",
          }}
        />
      </div>

      {/* Quote preview */}
      {(quoteLoading || quote) && (
        <div style={{
          background: quote?.hasLiquidity ? "rgba(48,209,88,0.06)" : "rgba(255,45,85,0.06)",
          border: `1px solid ${quote?.hasLiquidity ? "rgba(48,209,88,0.15)" : "rgba(255,45,85,0.15)"}`,
          borderRadius: 8, padding: "8px 12px", marginBottom: 12,
        }}>
          {quoteLoading ? (
            <span style={{ fontSize: 11, color: C.muted }}>Getting quote...</span>
          ) : quote?.hasLiquidity ? (
            <span style={{ fontSize: 12, color: C.match, fontWeight: 600 }}>
              {tab === "buy"
                ? `You'll receive ~${quote.amountOut.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${token.symbol}`
                : `You'll receive ~${quote.amountOut.toFixed(6)} ETH`
              }
            </span>
          ) : (
            <span style={{ fontSize: 12, color: C.hot, fontWeight: 600 }}>
              No liquidity found for this pair
            </span>
          )}
        </div>
      )}

      {/* BIG TRADE BUTTON */}
      <button
        onClick={executeTrade}
        disabled={tradeState === "pending" || (tab === "buy" ? !amountEth || parseFloat(amountEth) <= 0 : sellPct <= 0)}
        style={{
          width: "100%", padding: 14, borderRadius: 12, border: "none",
          background: tab === "buy"
            ? "linear-gradient(135deg, #30d158, #06b6d4)"
            : "linear-gradient(135deg, #ff2d55, #ff6b8a)",
          color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer",
          fontFamily: "inherit", letterSpacing: "-0.02em",
          boxShadow: tab === "buy" ? "0 4px 20px rgba(48,209,88,0.3)" : "0 4px 20px rgba(255,45,85,0.3)",
          transition: "all 0.2s",
          opacity: tradeState === "pending" ? 0.6 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
        {tradeState === "pending" ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{ animation: "hunt-spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Executing...
          </>
        ) : tab === "buy" ? (
          `BUY ${amountEth ? `${parseFloat(amountEth).toFixed(4)} ETH of` : ""} ${token.symbol}`
        ) : (
          `SELL ${sellPct > 0 ? `${sellPct * 100}% of` : ""} ${token.symbol}`
        )}
      </button>

      {/* Fee note */}
      <div style={{ fontSize: 10, color: C.dim, textAlign: "center", marginTop: 6 }}>
        3% platform fee included
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: C.border, margin: "12px 0" }} />

      {/* Recent trades */}
      <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
        Recent Trades
      </div>
      {recentTrades.length === 0 ? (
        <div style={{ fontSize: 11, color: C.dim, padding: "8px 0" }}>No trades yet for {token.symbol}</div>
      ) : (
        recentTrades.map((t, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
            borderBottom: i < recentTrades.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none",
          }}>
            {t.action === "buy" ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.match} strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.hot} strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
              </svg>
            )}
            <span style={{ fontSize: 12, color: C.text, flex: 1 }}>
              {t.amount.toFixed(4)} ETH
            </span>
            <a href={`https://basescan.org/tx/${t.tx_hash}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 10, color: C.cyan, textDecoration: "none" }}>
              {t.tx_hash?.slice(0, 8)}...
            </a>
          </div>
        ))
      )}
    </div>
  );
}
