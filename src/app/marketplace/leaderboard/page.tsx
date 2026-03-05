"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Medal } from "lucide-react";

const C = {
  bg:"#0a0a0a", card:"#141414", border:"#222", text:"#fafafa",
  muted:"#a1a1aa", dim:"#333", violet:"#8b5cf6", green:"#22c55e", red:"#ef4444", gold:"#ffd700",
};

const TABS = [
  { label: " Volume", value: "volume" },
  { label: "Holders", value: "holders" },
  { label: " Price", value: "price" },
  { label: " New & Hot", value: "newest_hot" },
];

export default function LeaderboardPage() {
  const router = useRouter();
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("volume");

  useEffect(() => { load(); }, [sort]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leaderboard", sort, limit: 25 }),
      });
      const data = await res.json();
      setTokens(data.tokens || []);
    } catch (e) {}
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, fontFamily: "'Outfit',sans-serif",
      padding: "80px 24px 100px",
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => router.push("/marketplace")} style={{
            background: "none", border: "none", color: C.muted, cursor: "pointer",
            fontSize: 13, fontFamily: "inherit", marginBottom: 12, display: "block",
          }}>← Marketplace</button>
          <h1 style={{
            fontSize: 28, fontWeight: 900, margin: "0 0 4px",
            background: `linear-gradient(135deg, ${C.gold}, #f59e0b)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}> Token Leaderboard</h1>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Top-performing agent tokens.</p>
        </div>

        {/* Sort tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.value} onClick={() => setSort(t.value)} style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: sort === t.value ? `${C.gold}15` : "transparent",
              color: sort === t.value ? C.gold : C.muted,
              fontSize: 13, fontWeight: sort === t.value ? 700 : 500,
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              border: `3px solid ${C.dim}`, borderTopColor: C.gold,
              animation: "spin 0.8s linear infinite", margin: "0 auto",
            }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* Table */}
        {!loading && tokens.length > 0 && (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
            overflow: "hidden",
          }}>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "36px 1fr 100px 90px 70px 70px",
              padding: "10px 16px", borderBottom: `1px solid ${C.border}`,
              fontSize: 10, color: C.dim, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}>
              <span>#</span>
              <span>Token</span>
              <span style={{ textAlign: "right" }}>Price</span>
              <span style={{ textAlign: "right" }}>24h</span>
              <span style={{ textAlign: "right" }}>Vol</span>
              <span style={{ textAlign: "right" }}>Holders</span>
            </div>

            {/* Rows */}
            {tokens.map((t: any, i: number) => {
              const price = parseFloat(t.current_price) || 0;
              const price24h = parseFloat(t.price_24h_ago) || 0;
              const change = price24h > 0 ? ((price - price24h) / price24h) * 100 : 0;
              const isUp = change >= 0;
              const volume = parseFloat(t.volume_24h) || 0;

              return (
                <div key={t.id} onClick={() => router.push(`/marketplace/${t.id}`)} style={{
                  display: "grid", gridTemplateColumns: "36px 1fr 100px 90px 70px 70px",
                  padding: "12px 16px", borderBottom: i < tokens.length - 1 ? `1px solid ${C.border}` : "none",
                  cursor: "pointer", alignItems: "center",
                  transition: "background 0.15s",
                }}>
                  {/* Rank */}
                  <span style={{
                    fontSize: 13, fontWeight: 800,
                    color: i < 3 ? C.gold : C.dim,
                  }}>{i === 0 ? <Trophy size={14} color="#FFD700"/> : i === 1 ? <Medal size={14} color="#C0C0C0"/> : i === 2 ? <Medal size={14} color="#CD7F32"/> : i + 1}</span>

                  {/* Name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: `${C.violet}22`, border: `1px solid ${C.gold}33`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 900, color: C.violet,
                    }}>{t.token_symbol?.[0]}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t.token_name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono',monospace" }}>${t.token_symbol}</span>
                        {t.fusion?.generation && (
                          <span style={{
                            fontSize: 8, padding: "1px 3px", borderRadius: 2,
                            background: `${C.violet}22`, color: C.violet, fontWeight: 800,
                          }}>G{t.fusion.generation}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{
                    textAlign: "right", fontSize: 12, fontWeight: 700,
                    color: C.text, fontFamily: "'JetBrains Mono',monospace",
                  }}>
                    {price < 0.001 ? price.toExponential(2) : price.toFixed(6)}
                  </div>

                  {/* 24h change */}
                  <div style={{
                    textAlign: "right", fontSize: 12, fontWeight: 800,
                    color: isUp ? C.green : C.red,
                    fontFamily: "'JetBrains Mono',monospace",
                  }}>
                    {isUp ? "+" : ""}{change.toFixed(1)}%
                  </div>

                  {/* Volume */}
                  <div style={{
                    textAlign: "right", fontSize: 11, color: C.muted,
                    fontFamily: "'JetBrains Mono',monospace",
                  }}>{volume.toFixed(2)}Ξ</div>

                  {/* Holders */}
                  <div style={{
                    textAlign: "right", fontSize: 12, color: C.muted, fontWeight: 700,
                  }}>{t.holder_count || 0}</div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && tokens.length === 0 && (
          <div style={{
            textAlign: "center", padding: 48, borderRadius: 16,
            border: `2px dashed ${C.border}`,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}></div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text }}>No tokens yet</h3>
            <p style={{ fontSize: 14, color: C.muted }}>Be the first to launch a token from a Fusion.</p>
          </div>
        )}
      </div>
    </div>
  );
}
