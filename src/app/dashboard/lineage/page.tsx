"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LineageTree from "@/components/lineage-tree";
import { GEN_COLORS, STATUS_COLORS, STATUS_LABELS, type FusionStatus } from "@/lib/fusion-types";

const C = {
  bg:"#0a0a0a", card:"#141414", border:"#222", text:"#fafafa",
  muted:"#a1a1aa", dim:"#333", violet:"#8b5cf6", green:"#22c55e",
};

export default function LineagePage() {
  const router = useRouter();
  const [fusions, setFusions] = useState<any[]>([]);
  const [lineage, setLineage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => { loadLineage(); }, []);

  async function loadLineage() {
    try {
      // Get all user's fusions + lineage data
      const res = await fetch("/api/fusions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lineage" }),
      });
      const data = await res.json();
      setFusions(data.fusions || []);
      setLineage(data.lineage || []);
    } catch (e) {}
    setLoading(false);
  }

  function handleNodeClick(id: string, type: "agent" | "fusion") {
    if (type === "fusion") {
      const f = fusions.find(f => f.id === id);
      setSelectedNode(f);
    } else {
      setSelectedNode({ id, type: "agent" });
    }
  }

  // Stats
  const totalFusions = fusions.length;
  const activeFusions = fusions.filter(f => f.status === "active").length;
  const maxGeneration = Math.max(1, ...fusions.map(f => f.generation));
  const avgPerformance = fusions.length > 0
    ? (fusions.reduce((sum, f) => sum + (f.performance_score || 0), 0) / fusions.length).toFixed(1)
    : "—";

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, fontFamily: "'Outfit',sans-serif",
      padding: "80px 24px 100px",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* ═══ HEADER ═══ */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: 0 }}> Bloodline</h1>
            <div style={{
              display: "flex", gap: 2,
            }}>
              {GEN_COLORS.map((color, i) => (
                <div key={i} style={{
                  width: 8, height: 20, borderRadius: 4,
                  background: i < maxGeneration ? color : C.dim,
                  opacity: i < maxGeneration ? 1 : 0.3,
                }} />
              ))}
            </div>
          </div>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
            Your complete AI agent family tree. Every fusion, every generation, every mutation.
          </p>
        </div>

        {/* ═══ STATS ROW ═══ */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10,
          marginBottom: 24,
        }}>
          {[
            { label: "Total Fusions", value: totalFusions, icon: "" },
            { label: "Active", value: activeFusions, icon: "", color: C.green },
            { label: "Deepest Gen", value: `Gen ${maxGeneration}`, icon: "", color: GEN_COLORS[Math.min(maxGeneration - 1, 4)] },
            { label: "Avg Performance", value: avgPerformance, icon: "" },
          ].map((stat, i) => (
            <div key={i} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: "14px 16px", textAlign: "center",
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{stat.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: stat.color || C.text }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ═══ TREE ═══ */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 80 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              border: `3px solid ${C.dim}`, borderTopColor: C.violet,
              animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
            }} />
            <p style={{ fontSize: 13, color: C.muted }}>Building your bloodline...</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : fusions.length === 0 ? (
          <div style={{
            textAlign: "center", padding: 64, borderRadius: 16,
            border: `2px dashed ${C.border}`, background: `${C.violet}04`,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}></div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 6 }}>No bloodline yet</h2>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 20, maxWidth: 360, margin: "0 auto 20px" }}>
              Match with someone and click <strong style={{ color: C.violet }}> Fuse</strong> to create your first Fusion Agent. Then watch your bloodline grow.
            </p>
            <button onClick={() => router.push("/dashboard")} style={{
              padding: "12px 28px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.violet}, #a855f7)`,
              color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Go to Dashboard →</button>
          </div>
        ) : (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
            padding: 20, marginBottom: 20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>Family Tree</h3>
              <div style={{ display: "flex", gap: 6 }}>
                {GEN_COLORS.slice(0, maxGeneration).map((color, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                    <span style={{ fontSize: 9, color: C.muted }}>Gen {i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
            <LineageTree
              fusions={fusions}
              lineage={lineage}
              onNodeClick={handleNodeClick}
            />
          </div>
        )}

        {/* ═══ SELECTED NODE DETAIL ═══ */}
        {selectedNode && selectedNode.type !== "agent" && (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
            padding: 20, marginBottom: 16,
            animation: "node-in 0.2s ease-out",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${GEN_COLORS[Math.min((selectedNode.generation || 1) - 1, 4)]}22`,
                  border: `2px solid ${GEN_COLORS[Math.min((selectedNode.generation || 1) - 1, 4)]}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20,
                }}></div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: "0 0 2px" }}>{selectedNode.name}</h3>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{
                      fontSize: 10, padding: "2px 6px", borderRadius: 4,
                      background: `${GEN_COLORS[Math.min((selectedNode.generation || 1) - 1, 4)]}22`,
                      color: GEN_COLORS[Math.min((selectedNode.generation || 1) - 1, 4)],
                      fontWeight: 800,
                    }}>Gen {selectedNode.generation}</span>
                    {selectedNode.status && (
                      <span style={{
                        fontSize: 10, padding: "2px 6px", borderRadius: 4,
                        background: `${STATUS_COLORS[selectedNode.status as FusionStatus]}15`,
                        color: STATUS_COLORS[selectedNode.status as FusionStatus],
                        fontWeight: 700,
                      }}>{STATUS_LABELS[selectedNode.status as FusionStatus]}</span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => router.push(`/dashboard/fusions/${selectedNode.id}`)} style={{
                  padding: "6px 14px", borderRadius: 8, border: "none",
                  background: C.violet, color: "white", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}>View Detail →</button>
                <button onClick={() => setSelectedNode(null)} style={{
                  padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.border}`,
                  background: "transparent", color: C.muted, fontSize: 14,
                  cursor: "pointer", fontFamily: "inherit",
                }}>×</button>
              </div>
            </div>

            {/* DNA traits mini-view */}
            {selectedNode.dna?.traits && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 12 }}>
                {Object.entries(selectedNode.dna.traits).map(([trait, val]) => (
                  <div key={trait} style={{
                    display: "flex", alignItems: "center", gap: 4,
                    fontSize: 10, padding: "3px 8px", borderRadius: 6,
                    background: `${C.violet}08`, color: C.violet,
                  }}>
                    <span style={{ textTransform: "capitalize" }}>{trait}</span>
                    <div style={{ width: 24, height: 3, borderRadius: 2, background: C.dim }}>
                      <div style={{ width: `${(val as number) * 100}%`, height: "100%", borderRadius: 2, background: C.violet }} />
                    </div>
                    <span style={{ fontWeight: 700 }}>{((val as number) * 100).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Performance + mutations */}
            <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
              {selectedNode.performance_score !== undefined && (
                <div style={{ fontSize: 11, color: C.muted }}>
                  Performance: <strong style={{ color: selectedNode.performance_score >= 70 ? C.green : C.text }}>
                    {selectedNode.performance_score?.toFixed(0)}
                  </strong>
                </div>
              )}
              {selectedNode.dna?.mutations?.length > 0 && (
                <div style={{ fontSize: 11, color: C.muted }}>
                  Mutations: <strong style={{ color: C.violet }}>{selectedNode.dna.mutations.length}</strong>
                </div>
              )}
            </div>

            <style>{`@keyframes node-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
          </div>
        )}

        {/* ═══ FUSIONS LIST (below tree) ═══ */}
        {fusions.length > 0 && (
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              All Fusions ({fusions.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {fusions.sort((a, b) => a.generation - b.generation).map(f => {
                const genColor = GEN_COLORS[Math.min(f.generation - 1, 4)];
                const statusColor = STATUS_COLORS[f.status as FusionStatus];
                return (
                  <button key={f.id} onClick={() => router.push(`/dashboard/fusions/${f.id}`)} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                    borderRadius: 10, background: C.card, border: `1px solid ${C.border}`,
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%",
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: `${genColor}22`, border: `1.5px solid ${genColor}44`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 900, color: genColor,
                    }}>G{f.generation}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        <span style={{ color: statusColor }}>{STATUS_LABELS[f.status as FusionStatus]}</span>
                        <span style={{ margin: "0 4px", color: C.dim }}>·</span>
                        <span>{f.performance_score?.toFixed(0) || "—"} pts</span>
                        {f.dna?.mutations?.length > 0 && (
                          <>
                            <span style={{ margin: "0 4px", color: C.dim }}>·</span>
                            <span style={{ color: C.violet }}>{f.dna.mutations.length} mutations</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: C.dim }}>→</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
