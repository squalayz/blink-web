"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FusionCard from "@/components/fusion-card";
import type { FusionStatus } from "@/lib/fusion-types";

const C = {
  bg:"#0a0a0a", card:"#141414", border:"#222", text:"#fafafa",
  muted:"#a1a1aa", dim:"#333", violet:"#8b5cf6",
};

const TABS: Array<{ label: string; value: string }> = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Gestating", value: "gestating" },
  { label: "Pending", value: "pending" },
  { label: "Dormant", value: "dormant" },
];

export default function FusionsPage() {
  const router = useRouter();
  const [fusions, setFusions] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await fetch("/api/fusions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", status_filter: "all" }),
      });
      const data = await res.json();
      setFusions(data.fusions || []);
    } catch (e) {}
    setLoading(false);
  }

  const filtered = filter === "all" ? fusions : fusions.filter(f => f.status === filter);
  const counts: Record<string, number> = { all: fusions.length };
  fusions.forEach(f => { counts[f.status] = (counts[f.status] || 0) + 1; });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Outfit',sans-serif", padding: "80px 24px 100px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: C.text, margin: "0 0 4px" }}>Fusions</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Your hybrid AI agents — born from matches.</p>
          </div>
          <button onClick={() => router.push("/dashboard/lineage")} style={{
            padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
            background: "transparent", color: C.violet, fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}> Bloodline</button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto" }}>
          {TABS.map(tab => (
            <button key={tab.value} onClick={() => setFilter(tab.value)} style={{
              padding: "6px 14px", borderRadius: 8, border: "none",
              background: filter === tab.value ? `${C.violet}15` : "transparent",
              color: filter === tab.value ? C.violet : C.muted,
              fontSize: 13, fontWeight: filter === tab.value ? 700 : 500,
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            }}>
              {tab.label}
              {counts[tab.value] ? <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }}>({counts[tab.value]})</span> : null}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${C.dim}`, borderTopColor: C.violet, animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{
            textAlign: "center", padding: 48, borderRadius: 16,
            border: `2px dashed ${C.border}`, background: `${C.violet}04`,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}></div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 4 }}>
              {filter === "all" ? "No Fusions yet" : `No ${filter} fusions`}
            </h3>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>
              Match with someone, then click <strong> Fuse</strong> to create a hybrid agent.
            </p>
          </div>
        )}

        {/* Fusion grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(f => (
            <FusionCard key={f.id} fusion={f} onClick={() => router.push(`/dashboard/fusions/${f.id}`)} />
          ))}
        </div>
      </div>
    </div>
  );
}
