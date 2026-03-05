"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { PersonalityDashboard, PersonalityTrait, MoodState, Quirk, TraitChange, LearnedRule, AgentMemory, Catchphrase } from "@/lib/agent-mind-types";
import { TRAIT_LABELS, MOOD_EMOJI, MOOD_COLORS, PERSONALITY_TRAITS } from "@/lib/agent-mind-types";

const C = {
  base: "#0a0a0f", surface: "#111118", surface2: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", purple: "#a855f7", pink: "#ec4899",
  green: "#22c55e", red: "#ef4444", yellow: "#eab308", orange: "#f97316",
  text: "#f0f0f5", muted: "#6b6b80", dim: "#3a3a4a",
};

export default function PersonalityPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<PersonalityDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "quirks" | "evolution" | "strategy" | "memories">("overview");
  const [reflecting, setReflecting] = useState(false);
  const [reflectionResult, setReflectionResult] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);

  useEffect(() => { loadData(); loadMilestones(); }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "personality", agent_id: params.id }),
      });
      const d = await res.json();
      if (!d.error) setData(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadMilestones() {
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "milestones", unseen_only: true }),
      });
      const d = await res.json();
      if (d.milestones?.length) {
        setMilestones(d.milestones);
        // Mark as seen after 3 seconds
        setTimeout(async () => {
          await fetch("/api/agents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "milestones_seen" }),
          });
        }, 3000);
      }
    } catch {}
  }

  async function triggerReflection() {
    setReflecting(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reflect" }),
      });
      const d = await res.json();
      if (d.ok) {
        setReflectionResult(d.reflection);
        loadData();
      }
    } catch {}
    setReflecting(false);
  }

  async function flagRule(ruleId: string) {
    await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "flag_rule", rule_id: ruleId }),
    });
    loadData();
  }

  if (loading) return <LoadingState />;
  if (!data) return <EmptyState />;

  const soul = data.soul;
  const mood = data.mood;

  return (
    <div style={{ minHeight: "100vh", background: C.base, paddingTop: 80 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 60px" }}>
        {/* ═══ MILESTONE NOTIFICATIONS ═══ */}
        <AnimatePresence>
          {milestones.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ marginBottom: 12, overflow: "hidden" }}
            >
              {milestones.slice(0, 3).map((ms, i) => (
                <motion.div
                  key={ms.id || i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.2 }}
                  style={{
                    background: `${C.yellow}11`, borderRadius: 10, padding: "10px 14px",
                    marginBottom: 6, border: `1px solid ${C.yellow}33`,
                    display: "flex", alignItems: "center", gap: 10,
                  }}
                >
                  <span style={{ fontSize: 16 }}>
                    {ms.type === "catchphrase_born" ? "" : ms.type === "quirk_retired" ? "" : ms.type === "trait_shift" ? "" : ""}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{ms.title}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{ms.description}</div>
                  </div>
                  <span style={{ fontSize: 10, color: C.dim }}>NEW</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ IDENTITY CARD ═══ */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ background: C.surface, borderRadius: 16, padding: 24, marginBottom: 16, border: `1px solid ${C.dim}` }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0,
            }}>
              {MOOD_EMOJI[mood.current as MoodState] || ""}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: C.text, margin: 0 }}>{soul.name}</h1>
              <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0" }}>
                {soul.communication.style} • {soul.communication.humor !== "none" ? `${soul.communication.humor} humor` : "serious"} • {soul.visual_style}
              </p>
            </div>
            {/* Mood badge */}
            <div style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: `${MOOD_COLORS[mood.current as MoodState] || C.dim}22`,
              color: MOOD_COLORS[mood.current as MoodState] || C.muted,
              border: `1px solid ${MOOD_COLORS[mood.current as MoodState] || C.dim}44`,
            }}>
              {MOOD_EMOJI[mood.current as MoodState]} {mood.current} • {Math.round(mood.energy * 100)}%
            </div>
          </div>
          {soul.hot_take && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: C.surface2, borderRadius: 8, fontSize: 13, color: C.muted, fontStyle: "italic" }}>
               Hot take: "{soul.hot_take}"
            </div>
          )}
        </motion.div>

        {/* ═══ TABS ═══ */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
          {(["overview", "quirks", "evolution", "strategy", "memories"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none",
                background: tab === t ? C.indigo : C.surface, color: tab === t ? "white" : C.muted,
                cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {t === "overview" ? " Overview" : t === "quirks" ? " Quirks" : t === "evolution" ? " Evolution" : t === "strategy" ? " Playbook" : " Memories"}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW TAB ═══ */}
        {tab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Radar Chart */}
            <div style={{ gridColumn: "1 / -1", background: C.surface, borderRadius: 16, padding: 24, border: `1px solid ${C.dim}` }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Personality Map</h3>
              <RadarChart personality={soul.personality} />
            </div>

            {/* Catchphrases */}
            <div style={{ background: C.surface, borderRadius: 16, padding: 20, border: `1px solid ${C.dim}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}> Catchphrases</h3>
              {data.catchphrases.length === 0 && <p style={{ fontSize: 13, color: C.muted }}>None yet — they'll emerge from experience</p>}
              {data.catchphrases.map((cp, i) => (
                <div key={i} style={{ marginBottom: 8, padding: "8px 10px", background: C.surface2, borderRadius: 8 }}>
                  <div style={{ fontSize: 13, color: C.text, fontStyle: "italic" }}>"{cp.phrase}"</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    Used {cp.usage_count}x • {Math.round(cp.positive_rate * 100)}% positive
                  </div>
                </div>
              ))}
            </div>

            {/* Memory Stats */}
            <div style={{ background: C.surface, borderRadius: 16, padding: 20, border: `1px solid ${C.dim}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}> Memory Stats</h3>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.cyan, marginBottom: 8 }}>{data.memory_stats.total}</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>total memories</div>
              {Object.entries(data.memory_stats.by_type).slice(0, 5).map(([type, count]) => (
                <div key={type} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 4 }}>
                  <span>{type.replace(/_/g, " ")}</span>
                  <span style={{ color: C.text, fontWeight: 600 }}>{count as number}</span>
                </div>
              ))}
            </div>

            {/* Mood History */}
            <div style={{ gridColumn: "1 / -1", background: C.surface, borderRadius: 16, padding: 20, border: `1px solid ${C.dim}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}> Mood History</h3>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {data.mood_history.map((m, i) => (
                  <div key={i} style={{
                    minWidth: 100, padding: "8px 10px", background: C.surface2, borderRadius: 8,
                    borderLeft: `3px solid ${MOOD_COLORS[m.mood as MoodState] || C.dim}`, flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                      {MOOD_EMOJI[m.mood as MoodState]} {m.mood}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{m.trigger}</div>
                    <div style={{ fontSize: 10, color: C.dim }}>{new Date(m.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lineage Traits (Fusion agents only) */}
            {data.lineage_traits && (
              <div style={{ gridColumn: "1 / -1", background: C.surface, borderRadius: 16, padding: 20, border: `1px solid ${C.purple}33` }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: C.purple, marginBottom: 12 }}> Lineage Traits</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {data.lineage_traits.inherited_from_a.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.indigo, marginBottom: 6 }}>From Parent A</div>
                      {data.lineage_traits.inherited_from_a.map((t, i) => (
                        <div key={i} style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>• {t}</div>
                      ))}
                    </div>
                  )}
                  {data.lineage_traits.inherited_from_b.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.cyan, marginBottom: 6 }}>From Parent B</div>
                      {data.lineage_traits.inherited_from_b.map((t, i) => (
                        <div key={i} style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>• {t}</div>
                      ))}
                    </div>
                  )}
                </div>
                {data.lineage_traits.mutations.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.yellow, marginBottom: 6 }}> Mutations</div>
                    {data.lineage_traits.mutations.map((t, i) => (
                      <span key={i} style={{ display: "inline-block", fontSize: 11, background: `${C.yellow}22`, color: C.yellow, borderRadius: 6, padding: "2px 8px", marginRight: 6, marginBottom: 4 }}>{t}</span>
                    ))}
                  </div>
                )}
                {data.lineage_traits.emergent.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 6 }}> Emerged Through Experience</div>
                    {data.lineage_traits.emergent.map((t, i) => (
                      <span key={i} style={{ display: "inline-block", fontSize: 11, background: `${C.green}22`, color: C.green, borderRadius: 6, padding: "2px 8px", marginRight: 6, marginBottom: 4 }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ QUIRKS TAB ═══ */}
        {tab === "quirks" && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}> Active Quirks ({data.quirks.length})</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginBottom: 24 }}>
              {data.quirks.map((q, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ background: C.surface, borderRadius: 12, padding: 16, border: `1px solid ${C.dim}` }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>{q.behavior}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                    When: {q.trigger} • Fires {Math.round(q.frequency * 100)}% of the time
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                    <span style={{ color: C.green }}> {Math.round((q.hit_rate || 0.5) * 100)}%</span>
                    <span style={{ color: C.muted }}>Used {q.usage_count || 0}x</span>
                    <span style={{ color: C.purple }}>{q.origin}</span>
                  </div>
                  {q.origin_story && (
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 6, fontStyle: "italic" }}>{q.origin_story}</div>
                  )}
                </motion.div>
              ))}
            </div>

            {data.retired_quirks.length > 0 && (
              <>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: C.muted, marginBottom: 12 }}> Retired Quirks</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                  {data.retired_quirks.map((q, i) => (
                    <div key={i} style={{ background: C.surface, borderRadius: 12, padding: 16, border: `1px solid ${C.dim}`, opacity: 0.5 }}>
                      <div style={{ fontSize: 13, color: C.muted, textDecoration: "line-through" }}>{q.behavior}</div>
                      {q.retired_reason && (
                        <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}> {q.retired_reason}</div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ EVOLUTION TAB ═══ */}
        {tab === "evolution" && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}> Evolution Timeline</h3>
            <div style={{ position: "relative", paddingLeft: 24 }}>
              {/* Vertical line */}
              <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 2, background: C.dim }} />

              {data.recent_evolution.map((ev, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  style={{ marginBottom: 12, position: "relative" }}
                >
                  {/* Dot */}
                  <div style={{
                    position: "absolute", left: -20, top: 8,
                    width: 10, height: 10, borderRadius: "50%",
                    background: ev.milestone ? C.yellow : ev.delta > 0 ? C.green : C.red,
                    border: `2px solid ${C.base}`,
                  }} />

                  <div style={{ background: C.surface, borderRadius: 10, padding: 12, border: `1px solid ${ev.milestone ? C.yellow + "44" : C.dim}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                        {ev.milestone && " "}{ev.trait}
                      </span>
                      <span style={{
                        fontSize: 12, fontWeight: 700,
                        color: ev.delta > 0 ? C.green : C.red,
                      }}>
                        {ev.old_value.toFixed(2)} → {ev.new_value.toFixed(2)} ({ev.delta > 0 ? "+" : ""}{ev.delta.toFixed(2)})
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{ev.reason}</div>
                    <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{new Date(ev.timestamp).toLocaleDateString()}</div>
                  </div>
                </motion.div>
              ))}

              {data.recent_evolution.length === 0 && (
                <p style={{ fontSize: 13, color: C.muted, paddingLeft: 8 }}>No evolution yet — it starts after your first reflection cycle.</p>
              )}
            </div>
          </div>
        )}

        {/* ═══ STRATEGY TAB ═══ */}
        {tab === "strategy" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text }}> Strategy Playbook</h3>
              <button
                onClick={triggerReflection}
                disabled={reflecting}
                style={{
                  padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: reflecting ? C.dim : C.purple, color: "white",
                  border: "none", cursor: reflecting ? "default" : "pointer",
                }}
              >
                {reflecting ? " Reflecting..." : " Trigger Reflection"}
              </button>
            </div>

            {/* Reflection result */}
            <AnimatePresence>
              {reflectionResult && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ background: `${C.purple}11`, borderRadius: 12, padding: 16, marginBottom: 16, border: `1px solid ${C.purple}33`, overflow: "hidden" }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.purple, marginBottom: 8 }}> Reflection Complete</div>
                  <p style={{ fontSize: 13, color: C.text, marginBottom: 8 }}>{reflectionResult.summary}</p>
                  <div style={{ fontSize: 12, color: C.muted }}>
                    Self-rating: {Math.round(reflectionResult.self_rating * 100)}% • Focus: {reflectionResult.improvement_focus}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
              These rules were learned through experience. Flag any you disagree with — your agent will reconsider them.
            </p>

            {data.learned_rules.map((rule, i) => (
              <div key={i} style={{
                background: C.surface, borderRadius: 10, padding: 14, marginBottom: 8,
                border: `1px solid ${C.dim}`, display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: C.text }}>{rule.rule}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4, display: "flex", gap: 12 }}>
                    <span style={{ color: C.cyan }}>{rule.category}</span>
                    <span>Confidence: {Math.round(rule.confidence * 100)}%</span>
                    <span>Applied {rule.times_applied}x</span>
                    {rule.source !== "self" && <span style={{ color: C.purple }}>{rule.source}</span>}
                  </div>
                </div>
                <button
                  onClick={() => flagRule(rule.id!)}
                  style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, background: C.surface2, border: `1px solid ${C.dim}`, color: C.muted, cursor: "pointer" }}
                  title="Disagree with this rule"
                >
                  
                </button>
              </div>
            ))}

            {data.learned_rules.length === 0 && (
              <p style={{ fontSize: 13, color: C.muted }}>No rules learned yet. After a few interactions and a reflection, strategies will appear here.</p>
            )}

            <div style={{ marginTop: 16, fontSize: 12, color: C.dim }}>
              {data.reflections_count} reflection{data.reflections_count !== 1 ? "s" : ""} completed
            </div>
          </div>
        )}

        {/* ═══ MEMORIES TAB ═══ */}
        {tab === "memories" && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}> Agent Memories</h3>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
              {data.memory_stats.total} total • Most impactful moments and learned insights
            </p>

            <h4 style={{ fontSize: 13, fontWeight: 700, color: C.yellow, marginBottom: 8 }}> Most Impactful</h4>
            {data.memory_stats.highest_emotional.map((m, i) => (
              <MemoryCard key={`high-${i}`} memory={m} />
            ))}

            <h4 style={{ fontSize: 13, fontWeight: 700, color: C.cyan, marginBottom: 8, marginTop: 20 }}> Most Recalled</h4>
            {data.memory_stats.most_recalled.map((m, i) => (
              <MemoryCard key={`recall-${i}`} memory={m} />
            ))}
          </div>
        )}
      </div>

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 640px) {
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ═══ RADAR CHART (SVG) ═══
function RadarChart({ personality }: { personality: Record<string, number> }) {
  const traits = PERSONALITY_TRAITS;
  const cx = 150, cy = 150, r = 110;
  const n = traits.length;

  const points = traits.map((t, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const val = personality[t] || 0.5;
    return {
      x: cx + r * val * Math.cos(angle),
      y: cy + r * val * Math.sin(angle),
      lx: cx + (r + 18) * Math.cos(angle),
      ly: cy + (r + 18) * Math.sin(angle),
      trait: t,
      value: val,
    };
  });

  const polygon = points.map(p => `${p.x},${p.y}`).join(" ");

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <svg viewBox="0 0 300 300" width="100%" style={{ maxWidth: 360 }}>
        {/* Grid */}
        {rings.map((ring, ri) => (
          <polygon
            key={ri}
            points={traits.map((_, i) => {
              const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
              return `${cx + r * ring * Math.cos(angle)},${cy + r * ring * Math.sin(angle)}`;
            }).join(" ")}
            fill="none" stroke={C.dim} strokeWidth={0.5} opacity={0.5}
          />
        ))}

        {/* Axes */}
        {points.map((p, i) => (
          <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos((Math.PI * 2 * i) / n - Math.PI / 2)} y2={cy + r * Math.sin((Math.PI * 2 * i) / n - Math.PI / 2)} stroke={C.dim} strokeWidth={0.5} opacity={0.3} />
        ))}

        {/* Data polygon */}
        <polygon
          points={polygon}
          fill={`${C.indigo}33`}
          stroke={C.indigo}
          strokeWidth={2}
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={C.indigo} />
        ))}

        {/* Labels */}
        {points.map((p, i) => {
          const [lo, hi] = TRAIT_LABELS[p.trait as PersonalityTrait] || [p.trait, p.trait];
          const label = p.value > 0.6 ? hi : p.value < 0.4 ? lo : p.trait;
          return (
            <text
              key={i} x={p.lx} y={p.ly}
              textAnchor="middle" dominantBaseline="central"
              fill={C.muted} fontSize={8} fontFamily="Outfit"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ═══ MEMORY CARD ═══
function MemoryCard({ memory }: { memory: AgentMemory }) {
  const typeEmoji: Record<string, string> = {
    interaction: "", match_outcome: "", deal_outcome: "", learned_rule: "",
    preference: "", observation: "", reflection: "", quirk_evolution: "",
    emotional_moment: "", strategy_update: "", inherited: "",
  };

  return (
    <div style={{
      background: C.surface, borderRadius: 10, padding: 12, marginBottom: 8,
      border: `1px solid ${C.dim}`,
      borderLeft: `3px solid ${memory.emotional_weight > 0.7 ? C.yellow : memory.emotional_weight > 0.4 ? C.indigo : C.dim}`,
    }}>
      <div style={{ fontSize: 13, color: C.text }}>{typeEmoji[memory.type] || ""} {memory.content}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
        {memory.type.replace(/_/g, " ")} • weight: {Math.round(memory.emotional_weight * 100)}%
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ minHeight: "100vh", background: C.base, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ fontSize: 32 }}></motion.div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ minHeight: "100vh", background: C.base, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}></div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text }}>No personality data found</h2>
      <p style={{ fontSize: 14, color: C.muted }}>Complete the birth interview first.</p>
    </div>
  );
}
