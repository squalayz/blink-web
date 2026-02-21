"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import VentureCard from "@/components/venture-card";

const C = {
  bg:"#0a0a0f", surface:"#111118", s2:"#1a1a24",
  indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", gold:"#ffd700", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
};

const INDUSTRIES = ["all", "tech", "finance", "health", "creative", "web3", "ecommerce", "education"];

export default function ExploreVenturesPage() {
  const router = useRouter();
  const [ventures, setVentures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<"synergy" | "funded" | "newest">("synergy");

  useEffect(() => { loadVentures(); }, []);

  async function loadVentures() {
    try {
      const res = await fetch("/api/venture", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_ventures", filter: "explore" }),
      });
      const data = await res.json();
      setVentures(data.ventures || []);
    } catch (e) {}
    setLoading(false);
  }

  const filtered = ventures
    .filter(v => filter === "all" || v.industry === filter)
    .sort((a, b) => {
      if (sort === "synergy") return (b.team_synergy_score || 0) - (a.team_synergy_score || 0);
      if (sort === "funded") return (parseFloat(b.total_funded_eth) || 0) - (parseFloat(a.total_funded_eth) || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, fontFamily: "'Outfit',sans-serif",
      padding: "80px 24px 100px",
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>
            <span style={{ color: C.gold }}></span> Explore Ventures
          </h1>
          <p style={{ fontSize: 14, color: C.muted }}>
            AI-assembled teams building real products. Browse, invest, or launch your own.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {INDUSTRIES.map(ind => (
            <button key={ind} onClick={() => setFilter(ind)} style={{
              padding: "6px 14px", borderRadius: 8, border: `1px solid ${filter === ind ? C.indigo : C.dim}`,
              background: filter === ind ? `${C.indigo}15` : "transparent",
              color: filter === ind ? C.indigo : C.muted,
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              textTransform: "capitalize",
            }}>{ind}</button>
          ))}
        </div>

        {/* Sort */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {([["synergy", " Synergy"], ["funded", " Most Funded"], ["newest", "🆕 Newest"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setSort(key)} style={{
              padding: "4px 10px", borderRadius: 6, border: "none",
              background: sort === key ? C.s2 : "transparent",
              color: sort === key ? C.text : C.dim,
              fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>{label}</button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 12, color: C.dim }}>{filtered.length} ventures</span>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${C.dim}`, borderTopColor: C.indigo, animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 13, color: C.muted }}>Loading ventures from the mesh...</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* Venture list */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}></div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>No ventures yet</h3>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>Be the first to launch one.</p>
            <button onClick={() => router.push("/dashboard/ventures")} style={{
              padding: "12px 28px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
              color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Launch a Venture </button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(v => (
            <VentureCard
              key={v.id}
              name={v.name}
              description={v.description}
              members={(v.venture_members || []).map((m: any) => ({
                name: m.users?.name || m.role, role: m.role, fit_score: m.fit_score || 0, status: m.status || "accepted",
              }))}
              synergy={v.team_synergy_score || 0}
              totalFunded={parseFloat(v.total_funded_eth) || 0}
              fundingGoal={parseFloat(v.funding_goal_eth) || undefined}
              status={v.status}
              onClick={() => router.push(`/venture/${v.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
