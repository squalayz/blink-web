"use client";
import { useState } from "react";

const C = {
  bg:"#050508", surface:"#0a0a12", s2:"#111118",
  indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", gold:"#ffd700", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
};

const ROLE_ICONS: Record<string, string> = {
  "Technical Lead": "", "Mobile Developer": "", "Backend Developer": "",
  "Design Lead": "", "UI/UX Designer": "", "Growth Lead": "",
  "Growth Marketer": "", "Domain Expert": "", "Nutrition / Health Expert": "",
  "Content Creator": "", "Sales Lead": "", "default": "",
};

interface Role {
  role: string;
  skills: string[];
  filled: boolean;
  locked_user_id: string | null;
}

interface Candidate {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string;
  fit_score: number;
  reasoning: string;
  role_index: number;
  status: string;
}

type Phase = "idea" | "roles" | "assembling" | "review";

export default function VentureLaunch({ onComplete }: { onComplete?: (ventureId: string) => void }) {
  const [phase, setPhase] = useState<Phase>("idea");
  const [idea, setIdea] = useState("");
  const [ventureId, setVentureId] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [candidates, setCandidates] = useState<Record<number, Candidate[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Phase 1: Submit idea ──
  async function submitIdea() {
    if (idea.length < 20) { setError("Describe your idea in at least a sentence."); return; }
    setLoading(true); setError("");
    try {
      // Create venture
      const res1 = await fetch("/api/venture", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_venture", name: "", description: idea }),
      });
      const d1 = await res1.json();
      if (!d1.ok) throw new Error(d1.error);
      setVentureId(d1.venture.id);

      // Analyze idea → get roles
      const res2 = await fetch("/api/venture", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze_idea", venture_id: d1.venture.id, description: idea }),
      });
      const d2 = await res2.json();
      if (d2.roles) setRoles(d2.roles);

      setPhase("roles");
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  // ── Phase 2: Edit roles + start assembly ──
  function updateRole(idx: number, field: string, value: string) {
    setRoles(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  function addRole() {
    setRoles(prev => [...prev, { role: "New Role", skills: [], filled: false, locked_user_id: null }]);
  }

  function removeRole(idx: number) {
    setRoles(prev => prev.filter((_, i) => i !== idx));
  }

  async function startAssembly() {
    setLoading(true);
    try {
      await fetch("/api/venture", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start_assembly", venture_id: ventureId, roles }),
      });
      setPhase("assembling");
      // Start polling for candidates
      pollCandidates();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  // ── Phase 3: Watch assembly + lock candidates ──
  async function pollCandidates() {
    try {
      const res = await fetch("/api/venture", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_venture", venture_id: ventureId }),
      });
      const data = await res.json();
      if (data.candidates) {
        const grouped: Record<number, Candidate[]> = {};
        data.candidates.forEach((c: any) => {
          if (!grouped[c.role_index]) grouped[c.role_index] = [];
          grouped[c.role_index].push({
            id: c.id, user_id: c.user_id,
            name: c.users?.name || "Unknown",
            avatar_url: c.users?.avatar_url,
            fit_score: c.fit_score,
            reasoning: c.reasoning || "",
            role_index: c.role_index,
            status: c.status,
          });
        });
        setCandidates(grouped);
      }
      if (data.venture?.roles_needed) setRoles(data.venture.roles_needed);
    } catch (e) {}
    // Continue polling
    setTimeout(pollCandidates, 10000);
  }

  async function lockCandidate(candidateId: string, userId: string, roleIndex: number, fitScore: number) {
    try {
      await fetch("/api/venture", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lock_candidate", venture_id: ventureId,
          candidate_id: candidateId, user_id: userId,
          role_index: roleIndex, fit_score: fitScore,
        }),
      });
      // Refresh
      pollCandidates();
    } catch (e) {}
  }

  return (
    <div style={{ maxWidth: 560, fontFamily: "'Outfit',sans-serif" }}>
      {/* ═══ PHASE 1: Idea Input ═══ */}
      {phase === "idea" && (
        <div style={{ animation: "vl-in 0.3s ease-out" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <span style={{ fontSize: 40, display: "block", marginBottom: 8 }}></span>
            <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>Launch a Venture</h2>
            <p style={{ fontSize: 14, color: C.muted }}>Describe your idea. Your agent handles the rest.</p>
          </div>

          <textarea value={idea} onChange={e => setIdea(e.target.value)}
            placeholder="An AI-powered meal planning app for gym bros that auto-generates grocery lists and syncs with fitness trackers..."
            rows={4}
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 14, border: `1px solid ${C.dim}`,
              background: C.bg, color: C.text, fontSize: 15, fontFamily: "'Outfit',sans-serif",
              outline: "none", resize: "vertical", lineHeight: 1.6,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <span style={{ fontSize: 11, color: idea.length >= 20 ? C.muted : C.dim }}>{idea.length} chars</span>
          </div>

          {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,45,85,0.1)", color: "#ff2d55", fontSize: 13, marginTop: 8 }}>{error}</div>}

          <button onClick={submitIdea} disabled={loading || idea.length < 20} style={{
            width: "100%", marginTop: 16, padding: 14, borderRadius: 12, border: "none",
            background: loading ? C.dim : `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
            color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
          }}>{loading ? "Analyzing your idea..." : "Let my agent figure it out →"}</button>
        </div>
      )}

      {/* ═══ PHASE 2: Role Casting ═══ */}
      {phase === "roles" && (
        <div style={{ animation: "vl-in 0.3s ease-out" }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Your agent's casting plan</h3>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Review the roles needed. Edit if your agent got it wrong.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {roles.map((role, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                borderRadius: 12, background: C.s2, border: `1px solid ${C.dim}`,
              }}>
                <span style={{ fontSize: 20 }}>{ROLE_ICONS[role.role] || ROLE_ICONS.default}</span>
                <div style={{ flex: 1 }}>
                  <input value={role.role} onChange={e => updateRole(i, "role", e.target.value)} style={{
                    background: "none", border: "none", color: C.text, fontSize: 14, fontWeight: 700,
                    fontFamily: "inherit", outline: "none", width: "100%",
                  }} />
                  <div style={{ fontSize: 11, color: C.dim }}>{role.skills.join(", ") || "Add skills..."}</div>
                </div>
                <button onClick={() => removeRole(i)} style={{
                  background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16,
                }}>×</button>
              </div>
            ))}
          </div>

          <button onClick={addRole} style={{
            width: "100%", padding: 10, borderRadius: 10, border: `1px dashed ${C.dim}`,
            background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer",
            fontFamily: "inherit", marginBottom: 16,
          }}>+ Add role</button>

          <div style={{ padding: "10px 14px", borderRadius: 10, background: `${C.cyan}08`, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: C.cyan }}>⏱ Estimated search time: 2-4 hours</div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setPhase("idea")} style={{
              flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${C.dim}`,
              background: "transparent", color: C.text, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
            }}>← Back</button>
            <button onClick={startAssembly} disabled={loading} style={{
              flex: 2, padding: 12, borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.match}, ${C.cyan})`,
              color: "white", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
            }}>{loading ? "Starting..." : " Start Assembly"}</button>
          </div>
        </div>
      )}

      {/* ═══ PHASE 3: Assembly Progress ═══ */}
      {phase === "assembling" && (
        <div style={{ animation: "vl-in 0.3s ease-out" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 24, marginBottom: 8, animation: "vl-pulse 2s infinite" }}></div>
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>Assembly in Progress</h3>
            <p style={{ fontSize: 13, color: C.muted }}>Your agent is recruiting. Candidates appear as they're found.</p>
          </div>

          {roles.map((role, i) => (
            <div key={i} style={{
              padding: "14px 16px", borderRadius: 12,
              background: role.filled ? `${C.match}08` : C.s2,
              border: `1px solid ${role.filled ? C.match + "22" : C.dim}`,
              marginBottom: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span>{ROLE_ICONS[role.role] || ROLE_ICONS.default}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{role.role}</span>
                {role.filled ? (
                  <span style={{ marginLeft: "auto", fontSize: 11, color: C.match, fontWeight: 700 }}> Locked</span>
                ) : (
                  <span style={{ marginLeft: "auto", fontSize: 11, color: C.purple, fontWeight: 600, animation: "vl-pulse 1.5s infinite" }}>Searching...</span>
                )}
              </div>

              {/* Candidates for this role */}
              {(candidates[i] || []).map(cand => (
                <div key={cand.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                  borderRadius: 8, background: C.bg, marginBottom: 4,
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.dim, overflow: "hidden" }}>
                    {cand.avatar_url && <img src={cand.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{cand.name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{cand.reasoning}</div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: cand.fit_score >= 90 ? C.gold : C.indigo }}>{cand.fit_score}%</span>
                  {cand.status === "proposed" && !role.filled && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => lockCandidate(cand.id, cand.user_id, i, cand.fit_score)} style={{
                        padding: "4px 10px", borderRadius: 6, border: "none",
                        background: C.match, color: "white", fontSize: 11, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit",
                      }}>Lock In</button>
                      <button style={{
                        padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.dim}`,
                        background: "transparent", color: C.muted, fontSize: 11,
                        cursor: "pointer", fontFamily: "inherit",
                      }}>Skip</button>
                    </div>
                  )}
                </div>
              ))}

              {!role.filled && !(candidates[i] || []).length && (
                <div style={{ fontSize: 12, color: C.dim, padding: "8px 0", textAlign: "center" }}>
                  Scanning mesh for candidates...
                </div>
              )}
            </div>
          ))}

          {roles.every(r => r.filled) && (
            <button onClick={() => onComplete?.(ventureId)} style={{
              width: "100%", marginTop: 16, padding: 14, borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${C.gold}, ${C.match})`,
              color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
              animation: "vl-glow 2s infinite",
            }}> Team Assembled — View Venture →</button>
          )}
        </div>
      )}

      <style>{`
        @keyframes vl-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes vl-pulse{0%,100%{opacity:0.6}50%{opacity:1}}
        @keyframes vl-glow{0%,100%{box-shadow:0 0 0 ${C.gold}00}50%{box-shadow:0 0 20px ${C.gold}30}}
      `}</style>
    </div>
  );
}
