"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";
import { useAuth } from "@/components/providers";
import { useIsDesktop } from "@/hooks/useIsDesktop";

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

interface Member {
  user_id: string;
  role: string;
  joined_at: string;
  handle?: string;
  display_name?: string;
  avatar_url?: string | null;
  contribution?: number;
}

export default function SquadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const squadId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [squad, setSquad] = useState<Squad | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [orbsCracked, setOrbsCracked] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const { isDesktop } = useIsDesktop();

  const fetchSquad = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: squadData, error: sqErr } = await supabase
        .from("squads")
        .select("*")
        .eq("id", squadId)
        .single();

      if (sqErr) throw sqErr;
      if (!squadData) {
        setError("Squad not found");
        setLoading(false);
        return;
      }
      setSquad(squadData);

      const { data: memberData, error: memErr } = await supabase
        .from("squad_members")
        .select("*")
        .eq("squad_id", squadId)
        .order("joined_at", { ascending: true });

      if (memErr) throw memErr;

      // Try to enrich members with profile data
      const enriched: Member[] = [];
      for (const m of memberData || []) {
        let profile: any = null;
        try {
          const { data } = await supabase
            .from("profiles")
            .select("handle, display_name, avatar_url")
            .eq("id", m.user_id)
            .single();
          profile = data;
        } catch {
          // profiles table may not have this user
        }
        enriched.push({
          user_id: m.user_id,
          role: m.role,
          joined_at: m.joined_at || m.created_at,
          handle: profile?.handle || undefined,
          display_name: profile?.display_name || undefined,
          avatar_url: profile?.avatar_url || null,
          contribution: m.contribution || 0,
        });
      }

      // Sort by contribution descending for leaderboard
      enriched.sort((a, b) => (b.contribution || 0) - (a.contribution || 0));
      setMembers(enriched);

      const memberIds = enriched.map((m) => m.user_id);
      if (memberIds.length > 0) {
        try {
          const { count } = await supabase
            .from("orbs")
            .select("*", { count: "exact", head: true })
            .in("cracked_by", memberIds)
            .eq("status", "cracked");
          setOrbsCracked(count || 0);
        } catch {
          // orbs table may not exist yet
        }
      }

      if (user) {
        const found = (memberData || []).some((m: any) => m.user_id === user.id);
        setIsMember(found);
      }
    } catch (e: any) {
      if (e?.message?.includes("does not exist") || e?.code === "42P01") {
        setError("Squads coming soon.");
      } else {
        setError(e?.message || "Failed to load squad");
      }
    } finally {
      setLoading(false);
    }
  }, [squadId, user]);

  useEffect(() => {
    if (!authLoading && squadId) fetchSquad();
  }, [authLoading, squadId, fetchSquad]);

  async function handleJoin() {
    if (!user || !squad) return;
    setJoining(true);
    try {
      await supabase.from("squad_members").insert({
        squad_id: squad.id,
        user_id: user.id,
        role: "member",
      });
      await supabase
        .from("squads")
        .update({ member_count: (squad.member_count || 0) + 1 })
        .eq("id", squad.id);
      fetchSquad();
    } catch (e: any) {
      setActionError(e?.message || "Failed to join");
      setTimeout(() => setActionError(null), 3000);
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    if (!user || !squad) return;
    if (!confirm("Leave this squad?")) return;
    setLeaving(true);
    try {
      await supabase
        .from("squad_members")
        .delete()
        .eq("squad_id", squad.id)
        .eq("user_id", user.id);
      await supabase
        .from("squads")
        .update({ member_count: Math.max(0, (squad.member_count || 1) - 1) })
        .eq("id", squad.id);
      router.push("/squads");
    } catch (e: any) {
      setActionError(e?.message || "Failed to leave");
      setTimeout(() => setActionError(null), 3000);
    } finally {
      setLeaving(false);
    }
  }

  function copyCode() {
    if (!squad) return;
    navigator.clipboard.writeText(squad.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>
        Loading...
      </div>
    );
  }

  if (error || !squad) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 15 }}>{error || "Squad not found"}</div>
        <button
          onClick={() => router.push("/squads")}
          style={{ background: C.s2, color: C.text, border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, cursor: "pointer" }}
        >
          Back to Squads
        </button>
      </div>
    );
  }

  const createdDate = new Date(squad.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, paddingBottom: 100 }}>
      {/* Header */}
      <div
        style={{
          padding: isDesktop ? "32px 32px 20px" : "56px 20px 20px",
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <button
          onClick={() => router.push("/squads")}
          style={{
            background: "none",
            border: "none",
            color: C.indigo,
            fontSize: 14,
            cursor: "pointer",
            padding: 0,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.indigo} strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Squads
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{squad.name}</h1>
            {squad.description && (
              <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>{squad.description}</div>
            )}
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Created {createdDate}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: isDesktop ? "16px 0" : "16px 20px", maxWidth: isDesktop ? 720 : undefined, margin: isDesktop ? "0 auto" : undefined, ...(isDesktop ? { paddingLeft: 32, paddingRight: 32 } : {}) }}>
        {/* Stats Row */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {[
            { label: "Members", value: String(squad.member_count || members.length), color: C.text },
            { label: "Earned", value: `$${(squad.total_earnings || 0).toFixed(2)}`, color: C.gold },
            { label: "Creatures Caught", value: String(orbsCracked), color: C.cyan },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                flex: 1,
                background: C.card,
                borderRadius: 12,
                padding: "14px 12px",
                textAlign: "center",
                border: `1px solid ${C.border}`,
                minWidth: isDesktop ? 120 : undefined,
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {actionError && (
          <div
            style={{
              background: `${C.danger}18`,
              border: `1px solid ${C.danger}40`,
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 16,
              fontSize: 14,
              color: C.danger,
              fontWeight: 600,
            }}
          >
            {actionError}
          </div>
        )}

        {/* Invite Code */}
        <div
          style={{
            background: C.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            border: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: isDesktop ? 400 : undefined,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Invite Code</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", letterSpacing: 2, color: C.cyan }}>
              {squad.invite_code}
            </div>
          </div>
          <button
            onClick={copyCode}
            style={{
              background: C.s2,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "8px 14px",
              color: copiedCode ? C.gold : C.text,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copiedCode ? "Copied" : "Copy"}
          </button>
        </div>

        {/* Action Buttons */}
        {user && !isMember && (
          <button
            onClick={handleJoin}
            disabled={joining}
            style={{
              width: "100%",
              padding: "14px 0",
              background: C.indigo,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: joining ? "default" : "pointer",
              opacity: joining ? 0.6 : 1,
              marginBottom: 20,
              maxWidth: isDesktop ? 400 : undefined,
              margin: isDesktop ? "0 auto 20px" : undefined,
              display: isDesktop ? "block" : undefined,
            }}
          >
            {joining ? "Joining..." : "Join Squad"}
          </button>
        )}

        {user && isMember && squad.created_by !== user.id && (
          <button
            onClick={handleLeave}
            disabled={leaving}
            style={{
              width: "100%",
              padding: "14px 0",
              background: "transparent",
              color: C.danger,
              border: `1px solid ${C.danger}`,
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: leaving ? "default" : "pointer",
              opacity: leaving ? 0.6 : 1,
              marginBottom: 20,
              maxWidth: isDesktop ? 400 : undefined,
              margin: isDesktop ? "0 auto 20px" : undefined,
              display: isDesktop ? "block" : undefined,
            }}
          >
            {leaving ? "Leaving..." : "Leave Squad"}
          </button>
        )}

        {/* Member Leaderboard */}
        <h2 style={{ fontSize: 16, fontWeight: 600, color: C.muted, marginBottom: 12, marginTop: 0 }}>
          Members
        </h2>

        {members.length === 0 && (
          <div style={{ textAlign: "center", padding: 32, color: C.muted, fontSize: 14 }}>
            No members yet
          </div>
        )}

        <div style={isDesktop ? { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 } : {}}>
          {members.map((member, idx) => (
            <div
              key={member.user_id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: C.card,
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: isDesktop ? 0 : 8,
                border: `1px solid ${C.border}`,
              }}
            >
              {/* Rank */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: idx === 0 ? C.gold : idx === 1 ? C.muted : C.s2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  color: idx < 2 ? "#000" : C.muted,
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </div>

              {/* Avatar */}
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt="Squad member avatar"
                  style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: C.s2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {member.display_name || member.handle || member.user_id.slice(0, 8)}
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  {member.role === "leader" ? "Leader" : "Member"}
                </div>
              </div>

              <div style={{ fontSize: 14, fontWeight: 600, color: C.gold, flexShrink: 0 }}>
                ${(member.contribution || 0).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
