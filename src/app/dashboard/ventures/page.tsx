"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import VentureCard from "@/components/venture-card";
import VentureLaunch from "@/components/venture-launch";

const C = {
  bg:"#0a0a0f", surface:"#111118", s2:"#1a1a24",
  indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", gold:"#ffd700", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
};

export default function DashboardVenturesPage() {
  const router = useRouter();
  const [myVentures, setMyVentures] = useState<any[]>([]);
  const [invested, setInvested] = useState<any[]>([]);
  const [showLaunch, setShowLaunch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"mine" | "invested">("mine");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/venture", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "list_ventures", filter: "mine" }),
        }),
        fetch("/api/venture", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "list_ventures", filter: "invested" }),
        }),
      ]);
      const d1 = await r1.json();
      const d2 = await r2.json();
      setMyVentures(d1.ventures || []);
      setInvested(d2.ventures || []);
    } catch (e) {}
    setLoading(false);
  }

  function handleVentureComplete(ventureId: string) {
    setShowLaunch(false);
    router.push(`/venture/${ventureId}`);
  }

  const active = tab === "mine" ? myVentures : invested;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, fontFamily: "'Outfit',sans-serif",
      padding: "80px 24px 100px",
    }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>Ventures</h1>
            <p style={{ fontSize: 13, color: C.muted }}>Teams assembled by AI agents. Building real products.</p>
          </div>
          <button onClick={() => setShowLaunch(true)} style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
            color: "white", fontSize: 14, fontWeight: 800, cursor: "pointer",
            fontFamily: "inherit", whiteSpace: "nowrap",
          }}>⚡ Launch a Venture</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {([["mine", `My Ventures (${myVentures.length})`], ["invested", `Invested (${invested.length})`]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: tab === key ? C.s2 : "transparent",
              color: tab === key ? C.text : C.muted,
              fontSize: 13, fontWeight: tab === key ? 700 : 500,
              cursor: "pointer", fontFamily: "inherit",
            }}>{label}</button>
          ))}
          <button onClick={() => router.push("/explore/ventures")} style={{
            marginLeft: "auto", padding: "8px 16px", borderRadius: 8,
            border: `1px solid ${C.dim}`, background: "transparent",
            color: C.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>🔍 Explore All</button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${C.dim}`, borderTopColor: C.indigo, animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* Empty state */}
        {!loading && active.length === 0 && (
          <div style={{
            textAlign: "center", padding: 48, borderRadius: 16,
            border: `2px dashed ${C.dim}`, background: `${C.indigo}04`,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{tab === "mine" ? "🚀" : "💰"}</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
              {tab === "mine" ? "No ventures yet" : "No investments yet"}
            </h3>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>
              {tab === "mine"
                ? "Describe an idea. Your agent assembles the team."
                : "Browse ventures and invest in teams you believe in."}
            </p>
            <button onClick={() => tab === "mine" ? setShowLaunch(true) : router.push("/explore/ventures")} style={{
              padding: "12px 28px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
              color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>{tab === "mine" ? "Launch a Venture ⚡" : "Explore Ventures →"}</button>
          </div>
        )}

        {/* Venture list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {active.map(v => (
            <VentureCard
              key={v.id}
              name={v.name}
              description={v.description}
              members={(v.venture_members || []).map((m: any) => ({
                name: m.users?.name || m.role, role: m.role || "Member",
                fit_score: m.fit_score || 0, status: m.status || "accepted",
              }))}
              synergy={v.team_synergy_score || 0}
              totalFunded={parseFloat(v.total_funded_eth) || 0}
              fundingGoal={parseFloat(v.funding_goal_eth) || undefined}
              status={v.status}
              onClick={() => router.push(`/venture/${v.id}`)}
            />
          ))}
        </div>

        {/* Launch modal */}
        {showLaunch && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 1100,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }} onClick={() => setShowLaunch(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: C.surface, border: `1px solid ${C.dim}`, borderRadius: 20,
              padding: "32px 28px", maxWidth: 580, width: "100%", maxHeight: "90vh", overflowY: "auto",
            }}>
              <VentureLaunch onComplete={handleVentureComplete} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
