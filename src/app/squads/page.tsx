"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";
import { useAuth } from "@/components/providers";
import GlassCard from "@/components/GlassCard";

interface Squad {
  id: string;
  name: string;
  description: string;
  invite_code: string;
  created_by: string;
  member_count: number;
  total_earnings: number;
  created_at: string;
}

interface SquadMember {
  id: string;
  squad_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  display_name?: string;
  avatar_url?: string | null;
  handle?: string;
}

interface SquadMembership {
  squad_id: string;
  role: string;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  member_count: number;
  total_earnings: number;
}

// ── SVG Icons ──────────────────────────────────────────

function IconUsers({ size = 24, color = C.text }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconCopy({ size = 14, color = C.accent }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconTrophy({ size = 18, color = C.gold }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function IconPlus({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconShield({ size = 14, color = C.primary }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconCheck({ size = 14, color = C.accent }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Skeleton ───────────────────────────────────────────

function SkeletonBlock({ width, height, radius = 8 }: { width: string | number; height: number; radius?: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${C.cardSolid} 25%, rgba(255,255,255,0.06) 50%, ${C.cardSolid} 75%)`,
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s ease-in-out infinite",
      }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: "16px 20px" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            background: C.glass,
            border: `1px solid ${C.glassBorder}`,
            borderRadius: 20,
            padding: 20,
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <SkeletonBlock width={48} height={48} radius={14} />
            <div style={{ flex: 1 }}>
              <SkeletonBlock width="60%" height={16} />
              <div style={{ height: 8 }} />
              <SkeletonBlock width="40%" height={12} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <SkeletonBlock width="30%" height={56} radius={12} />
            <SkeletonBlock width="30%" height={56} radius={12} />
            <SkeletonBlock width="30%" height={56} radius={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Mini stat card ─────────────────────────────────────

function StatMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: `${color}0d`,
        border: `1px solid ${color}22`,
        borderRadius: 12,
        padding: "10px 12px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ── Member row ─────────────────────────────────────────

function MemberRow({ member }: { member: SquadMember }) {
  const isLeader = member.role === "leader";
  const name = member.display_name || member.handle || "Member";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 0",
        borderBottom: `1px solid ${C.glassBorder}`,
      }}
    >
      {member.avatar_url ? (
        <img
          src={member.avatar_url}
          alt=""
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            objectFit: "cover",
            border: isLeader ? `2px solid ${C.gold}` : `2px solid ${C.glassBorder}`,
          }}
        />
      ) : (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            border: isLeader ? `2px solid ${C.gold}` : `2px solid transparent`,
          }}
        >
          {initial}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: C.text,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: "3px 8px",
          borderRadius: 6,
          background: isLeader ? `${C.gold}1a` : `${C.primary}1a`,
          color: isLeader ? C.gold : C.primary,
          letterSpacing: "0.04em",
          textTransform: "uppercase" as const,
        }}
      >
        {isLeader ? "Leader" : "Member"}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────

export default function SquadsPage() {
  const { user, loading: authLoading } = useAuth();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [mySquadIds, setMySquadIds] = useState<Set<string>>(new Set());
  const [myRole, setMyRole] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<Record<string, SquadMember[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Create / Join state
  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchSquads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: allSquads, error: sqErr } = await supabase
        .from("squads")
        .select("*")
        .order("total_earnings", { ascending: false });

      if (sqErr) throw sqErr;
      setSquads(allSquads || []);

      // Leaderboard: top 10 by earnings
      setLeaderboard(
        (allSquads || []).slice(0, 10).map((s: Squad) => ({
          id: s.id,
          name: s.name,
          member_count: s.member_count,
          total_earnings: s.total_earnings,
        }))
      );

      if (user) {
        const { data: memberships } = await supabase
          .from("squad_members")
          .select("squad_id, role")
          .eq("user_id", user.id);

        if (memberships) {
          setMySquadIds(new Set(memberships.map((m: SquadMembership) => m.squad_id)));
          const roles: Record<string, string> = {};
          memberships.forEach((m: SquadMembership) => {
            roles[m.squad_id] = m.role;
          });
          setMyRole(roles);
        }

        // Fetch members for user's squads
        if (memberships && memberships.length > 0) {
          const squadIds = memberships.map((m: SquadMembership) => m.squad_id);
          const { data: allMembers } = await supabase
            .from("squad_members")
            .select("*")
            .in("squad_id", squadIds);

          if (allMembers) {
            const grouped: Record<string, SquadMember[]> = {};
            allMembers.forEach((m: SquadMember) => {
              if (!grouped[m.squad_id]) grouped[m.squad_id] = [];
              grouped[m.squad_id].push(m);
            });
            setMembers(grouped);
          }
        }
      }
    } catch (e: any) {
      if (e?.message?.includes("does not exist") || e?.code === "42P01") {
        setError("Squads coming soon.");
      } else {
        setError(e?.message || "Failed to load squads");
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) fetchSquads();
  }, [authLoading, fetchSquads]);

  async function handleCreate() {
    if (!user || !createName.trim()) return;
    setCreating(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: newSquad, error: createErr } = await supabase
        .from("squads")
        .insert({
          name: createName.trim(),
          description: createDesc.trim(),
          invite_code: code,
          created_by: user.id,
          member_count: 1,
          total_earnings: 0,
        })
        .select()
        .single();

      if (createErr) throw createErr;

      await supabase.from("squad_members").insert({
        squad_id: newSquad.id,
        user_id: user.id,
        role: "leader",
      });

      setCreateName("");
      setCreateDesc("");
      setMode("none");
      fetchSquads();
    } catch (e: any) {
      alert(e?.message || "Failed to create squad");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoinByCode() {
    if (!user || !joinCode.trim()) return;
    setJoiningByCode(true);
    try {
      const { data: squad, error: findErr } = await supabase
        .from("squads")
        .select("*")
        .eq("invite_code", joinCode.trim().toUpperCase())
        .single();

      if (findErr || !squad) throw new Error("Invalid invite code");

      await supabase.from("squad_members").insert({
        squad_id: squad.id,
        user_id: user.id,
        role: "member",
      });

      await supabase
        .from("squads")
        .update({ member_count: (squad.member_count || 0) + 1 })
        .eq("id", squad.id);

      setJoinCode("");
      setMode("none");
      fetchSquads();
    } catch (e: any) {
      alert(e?.message || "Invalid invite code");
    } finally {
      setJoiningByCode(false);
    }
  }

  async function handleJoinSquad(squadId: string) {
    if (!user) return;
    setJoining(squadId);
    try {
      await supabase.from("squad_members").insert({
        squad_id: squadId,
        user_id: user.id,
        role: "member",
      });

      await supabase
        .from("squads")
        .update({ member_count: (squads.find((s) => s.id === squadId)?.member_count || 0) + 1 })
        .eq("id", squadId);

      fetchSquads();
    } catch (e: any) {
      alert(e?.message || "Failed to join squad");
    } finally {
      setJoining(null);
    }
  }

  function copyInviteCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  const mySquads = squads.filter((s) => mySquadIds.has(s.id));
  const otherSquads = squads.filter((s) => !mySquadIds.has(s.id));
  const hasSquad = mySquads.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, paddingBottom: 100 }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Header ── */}
      <div
        style={{
          padding: "60px 20px 20px",
          background: C.surface,
          borderBottom: `1px solid ${C.glassBorder}`,
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: C.text }}>Squads</h1>
        <p style={{ fontSize: 14, color: C.muted, margin: "6px 0 0", lineHeight: 1.4 }}>
          Team up. Earn together. Climb the leaderboard.
        </p>
      </div>

      {/* ── Loading ── */}
      {loading && <LoadingSkeleton />}

      {/* ── Error ── */}
      {!loading && error && (
        <div style={{ textAlign: "center", padding: 60, color: C.muted, fontSize: 15 }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ padding: "16px 20px" }}>
          {/* ── My Squad Section ── */}
          {hasSquad &&
            mySquads.map((squad) => (
              <div
                key={squad.id}
                style={{ animation: "fadeIn 0.4s ease", marginBottom: 20 }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.muted,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.08em",
                    marginBottom: 10,
                  }}
                >
                  My Squad
                </div>

                <GlassCard style={{ padding: 20 }}>
                  {/* Squad header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconUsers size={26} color="#fff" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{squad.name}</div>
                      {squad.description && (
                        <div
                          style={{
                            fontSize: 13,
                            color: C.muted,
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {squad.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats mini cards */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                    <StatMini label="Members" value={String(squad.member_count || 0)} color={C.primary} />
                    <StatMini
                      label="Earned"
                      value={`$${(squad.total_earnings || 0).toFixed(2)}`}
                      color={C.gold}
                    />
                    <StatMini
                      label="Your Role"
                      value={myRole[squad.id] === "leader" ? "Leader" : "Member"}
                      color={myRole[squad.id] === "leader" ? C.gold : C.accent}
                    />
                  </div>

                  {/* Invite code */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: C.cardSolid,
                      border: `1px solid ${C.glassBorder}`,
                      borderRadius: 12,
                      padding: "10px 14px",
                      marginBottom: 18,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Invite Code</div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: C.accent,
                          letterSpacing: "0.12em",
                          fontFamily: "monospace",
                        }}
                      >
                        {squad.invite_code}
                      </div>
                    </div>
                    <button
                      onClick={() => copyInviteCode(squad.invite_code)}
                      style={{
                        background: `${C.accent}1a`,
                        border: `1px solid ${C.accent}33`,
                        borderRadius: 10,
                        padding: "8px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                        color: C.accent,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {copiedCode ? (
                        <>
                          <IconCheck size={14} color={C.accent} />
                          Copied
                        </>
                      ) : (
                        <>
                          <IconCopy size={14} color={C.accent} />
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  {/* Members list */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 8 }}>
                    Members
                  </div>
                  <div>
                    {(members[squad.id] || []).map((m) => (
                      <MemberRow key={m.id || m.user_id} member={m} />
                    ))}
                    {(!members[squad.id] || members[squad.id].length === 0) && (
                      <div style={{ fontSize: 13, color: C.muted, padding: "10px 0" }}>
                        Loading members...
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>
            ))}

          {/* ── No Squad State ── */}
          {!hasSquad && (
            <div
              style={{
                animation: "fadeIn 0.4s ease",
                textAlign: "center",
                padding: "40px 0 32px",
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: `${C.primary}15`,
                  border: `1px solid ${C.primary}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                <IconUsers size={32} color={C.primary} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>
                Join or Create a Squad
              </h2>
              <p style={{ fontSize: 14, color: C.muted, margin: "0 0 28px", lineHeight: 1.5 }}>
                Team up with other traders to share alpha and earn together.
              </p>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => setMode("create")}
                  style={{
                    flex: 1,
                    padding: "14px 0",
                    background: C.primary,
                    color: "#fff",
                    border: "none",
                    borderRadius: 14,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <IconPlus size={18} color="#fff" />
                  Create Squad
                </button>
                <button
                  onClick={() => setMode("join")}
                  style={{
                    flex: 1,
                    padding: "14px 0",
                    background: "transparent",
                    color: C.primary,
                    border: `1.5px solid ${C.primary}`,
                    borderRadius: 14,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Join Squad
                </button>
              </div>

              {/* Create flow */}
              {mode === "create" && (
                <div style={{ marginTop: 24, textAlign: "left" }}>
                  <GlassCard style={{ padding: 20 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>
                      Create a New Squad
                    </div>
                    <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>
                      Squad Name
                    </label>
                    <input
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="e.g. Alpha Hunters"
                      maxLength={40}
                      style={{
                        width: "100%",
                        background: C.cardSolid,
                        border: `1px solid ${C.glassBorder}`,
                        borderRadius: 12,
                        padding: "12px 14px",
                        color: C.text,
                        fontSize: 15,
                        outline: "none",
                        marginBottom: 14,
                        boxSizing: "border-box" as const,
                      }}
                    />
                    <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>
                      Description (optional)
                    </label>
                    <textarea
                      value={createDesc}
                      onChange={(e) => setCreateDesc(e.target.value)}
                      placeholder="What is your squad about?"
                      maxLength={200}
                      rows={3}
                      style={{
                        width: "100%",
                        background: C.cardSolid,
                        border: `1px solid ${C.glassBorder}`,
                        borderRadius: 12,
                        padding: "12px 14px",
                        color: C.text,
                        fontSize: 15,
                        outline: "none",
                        resize: "none" as const,
                        marginBottom: 18,
                        boxSizing: "border-box" as const,
                        fontFamily: "inherit",
                      }}
                    />
                    <button
                      onClick={handleCreate}
                      disabled={creating || !createName.trim()}
                      style={{
                        width: "100%",
                        padding: "14px 0",
                        background: !createName.trim() ? C.glassBorder : C.primary,
                        color: "#fff",
                        border: "none",
                        borderRadius: 14,
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: creating || !createName.trim() ? "default" : "pointer",
                        opacity: creating ? 0.6 : 1,
                      }}
                    >
                      {creating ? "Creating..." : "Create Squad"}
                    </button>
                  </GlassCard>
                </div>
              )}

              {/* Join flow */}
              {mode === "join" && (
                <div style={{ marginTop: 24, textAlign: "left" }}>
                  <GlassCard style={{ padding: 20 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>
                      Enter Invite Code
                    </div>
                    <input
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="e.g. A1B2C3"
                      maxLength={10}
                      style={{
                        width: "100%",
                        background: C.cardSolid,
                        border: `1px solid ${C.glassBorder}`,
                        borderRadius: 12,
                        padding: "14px 14px",
                        color: C.text,
                        fontSize: 20,
                        fontWeight: 700,
                        letterSpacing: "0.15em",
                        fontFamily: "monospace",
                        textAlign: "center" as const,
                        outline: "none",
                        marginBottom: 18,
                        boxSizing: "border-box" as const,
                      }}
                    />
                    <button
                      onClick={handleJoinByCode}
                      disabled={joiningByCode || !joinCode.trim()}
                      style={{
                        width: "100%",
                        padding: "14px 0",
                        background: !joinCode.trim() ? C.glassBorder : C.primary,
                        color: "#fff",
                        border: "none",
                        borderRadius: 14,
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: joiningByCode || !joinCode.trim() ? "default" : "pointer",
                        opacity: joiningByCode ? 0.6 : 1,
                      }}
                    >
                      {joiningByCode ? "Joining..." : "Join Squad"}
                    </button>
                  </GlassCard>
                </div>
              )}
            </div>
          )}

          {/* ── Squad Leaderboard ── */}
          {leaderboard.length > 0 && (
            <div style={{ marginTop: 28, animation: "fadeIn 0.5s ease" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <IconTrophy size={18} color={C.gold} />
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: C.text,
                  }}
                >
                  Squad Leaderboard
                </span>
              </div>

              <GlassCard style={{ padding: 0, overflow: "hidden" }}>
                {leaderboard.map((entry, idx) => {
                  const isMine = mySquadIds.has(entry.id);
                  return (
                    <div
                      key={entry.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "14px 16px",
                        borderBottom:
                          idx < leaderboard.length - 1 ? `1px solid ${C.glassBorder}` : "none",
                        background: isMine ? `${C.primary}0d` : "transparent",
                      }}
                    >
                      {/* Rank */}
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background:
                            idx === 0
                              ? `${C.gold}22`
                              : idx === 1
                              ? "rgba(192,192,192,0.15)"
                              : idx === 2
                              ? "rgba(205,127,50,0.15)"
                              : C.glass,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 700,
                          color:
                            idx === 0
                              ? C.gold
                              : idx === 1
                              ? "#C0C0C0"
                              : idx === 2
                              ? "#CD7F32"
                              : C.muted,
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </div>

                      {/* Name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: isMine ? C.primary : C.text,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {entry.name}
                          {isMine && (
                            <span style={{ fontSize: 11, color: C.primary, marginLeft: 6, fontWeight: 400 }}>
                              (You)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: C.muted }}>
                          {entry.member_count} members
                        </div>
                      </div>

                      {/* Earnings */}
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: C.gold,
                          flexShrink: 0,
                        }}
                      >
                        ${(entry.total_earnings || 0).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </GlassCard>
            </div>
          )}

          {/* ── Other Squads ── */}
          {otherSquads.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                  marginBottom: 12,
                }}
              >
                {hasSquad ? "Other Squads" : "All Squads"}
              </div>
              {otherSquads.map((squad) => (
                <GlassCard
                  key={squad.id}
                  style={{ padding: 16, marginBottom: 12, cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconUsers size={22} color="#fff" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{squad.name}</div>
                      {squad.description && (
                        <div
                          style={{
                            fontSize: 12,
                            color: C.muted,
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {squad.description}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleJoinSquad(squad.id)}
                      disabled={joining === squad.id}
                      style={{
                        background: C.primary,
                        color: "#fff",
                        border: "none",
                        borderRadius: 10,
                        padding: "8px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: joining === squad.id ? "default" : "pointer",
                        opacity: joining === squad.id ? 0.6 : 1,
                        flexShrink: 0,
                      }}
                    >
                      {joining === squad.id ? "..." : "Join"}
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: `1px solid ${C.glassBorder}`,
                    }}
                  >
                    <div style={{ fontSize: 12, color: C.muted }}>
                      <span style={{ color: C.text, fontWeight: 600 }}>{squad.member_count}</span> members
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>
                      <span style={{ color: C.gold, fontWeight: 600 }}>
                        ${(squad.total_earnings || 0).toFixed(2)}
                      </span>{" "}
                      earned
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {/* ── Empty state ── */}
          {!loading && !error && squads.length === 0 && !hasSquad && mode === "none" && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: C.muted,
                fontSize: 14,
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <IconUsers size={48} color={C.muted} />
              </div>
              No squads yet. Be the first to create one.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
