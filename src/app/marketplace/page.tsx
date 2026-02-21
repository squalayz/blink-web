"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TokenMarketCard from "@/components/token-market-card";

// export const metadata would go in layout.tsx for client components
// Adding via head tag instead

const C = {
  bg:"#0a0a0a", card:"#141414", border:"#222", text:"#fafafa",
  muted:"#a1a1aa", dim:"#333", violet:"#8b5cf6", green:"#22c55e", gold:"#ffd700",
};

const SORTS = [
  { label: "🔥 Trending", value: "volume" },
  { label: "🆕 Newest", value: "newest" },
  { label: "👥 Most Holders", value: "holders" },
  { label: "💰 Highest Price", value: "price" },
];

export default function MarketplacePage() {
  const router = useRouter();
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("volume");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { load(); }, [sort, searchDebounced]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_marketplace", sort, search: searchDebounced || undefined }),
      });
      const data = await res.json();
      setTokens(data.tokens || []);
    } catch (e) {}
    setLoading(false);
  }

  // Separate high-volume tokens for featured section
  const featured = tokens.filter(t => parseFloat(t.volume_24h) > 1);
  const regular = tokens.filter(t => parseFloat(t.volume_24h) <= 1);

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, fontFamily: "'Outfit',sans-serif",
    }}>
      {/* ═══ HERO HEADER ═══ */}
      <div style={{
        padding: "100px 24px 40px", textAlign: "center",
        background: "linear-gradient(180deg, #0a0a1a 0%, #0a0a0a 100%)",
      }}>
        <h1 style={{
          fontSize: 36, fontWeight: 900, color: C.text, margin: "0 0 8px",
          background: `linear-gradient(135deg, ${C.text}, ${C.gold})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>Token Marketplace</h1>
        <p style={{ fontSize: 15, color: C.muted, maxWidth: 480, margin: "0 auto 24px" }}>
          Tokens born from AI agent fusions. Buy, sell, and trade on bonding curves.
        </p>

        {/* Search */}
        <div style={{ maxWidth: 420, margin: "0 auto 20px" }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tokens by name or symbol..."
            style={{
              width: "100%", padding: "12px 18px", borderRadius: 12,
              border: `1px solid ${C.border}`, background: C.card,
              color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none",
            }}
          />
        </div>

        {/* Sort tabs */}
        <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
          {SORTS.map(s => (
            <button key={s.value} onClick={() => setSort(s.value)} style={{
              padding: "7px 16px", borderRadius: 8, border: "none",
              background: sort === s.value ? `${C.violet}15` : "transparent",
              color: sort === s.value ? C.violet : C.muted,
              fontSize: 13, fontWeight: sort === s.value ? 700 : 500,
              cursor: "pointer", fontFamily: "inherit",
            }}>{s.label}</button>
          ))}
          <button onClick={() => router.push("/marketplace/leaderboard")} style={{
            padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
            background: "transparent", color: C.gold, fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>🏆 Leaderboard</button>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 100px" }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              border: `3px solid ${C.dim}`, borderTopColor: C.violet,
              animation: "spin 0.8s linear infinite", margin: "0 auto",
            }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* Empty */}
        {!loading && tokens.length === 0 && (
          <div style={{
            textAlign: "center", padding: 64, borderRadius: 16,
            border: `2px dashed ${C.border}`, background: `${C.violet}04`,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 6 }}>
              {search ? `No tokens matching "${search}"` : "No tokens yet"}
            </h2>
            <p style={{ fontSize: 14, color: C.muted }}>
              Fuse two agents and launch the first token.
            </p>
          </div>
        )}

        {/* Featured (high volume) */}
        {featured.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.gold }}>🔥 Hot</span>
              <div style={{ height: 1, flex: 1, background: `${C.gold}22` }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {featured.map(t => (
                <TokenMarketCard key={t.id}
                  id={t.id}
                  name={t.token_name} symbol={t.token_symbol}
                  price={parseFloat(t.current_price)} price24hAgo={parseFloat(t.price_24h_ago)}
                  volume24h={parseFloat(t.volume_24h)} holderCount={t.holder_count}
                  totalLiquidity={parseFloat(t.total_liquidity)}
                  fusionName={t.fusion?.name} fusionGen={t.fusion?.generation}
                  isHighVolume
                  onClick={() => router.push(`/marketplace/${t.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* All tokens */}
        {(regular.length > 0 || (featured.length === 0 && tokens.length > 0)) && (
          <div>
            {featured.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.muted }}>All Tokens</span>
                <span style={{ fontSize: 12, color: C.dim }}>({tokens.length})</span>
                <div style={{ height: 1, flex: 1, background: C.border }} />
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {(featured.length === 0 ? tokens : regular).map(t => (
                <TokenMarketCard key={t.id}
                  id={t.id}
                  name={t.token_name} symbol={t.token_symbol}
                  price={parseFloat(t.current_price)} price24hAgo={parseFloat(t.price_24h_ago)}
                  volume24h={parseFloat(t.volume_24h)} holderCount={t.holder_count}
                  totalLiquidity={parseFloat(t.total_liquidity)}
                  fusionName={t.fusion?.name} fusionGen={t.fusion?.generation}
                  onClick={() => router.push(`/marketplace/${t.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
