"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ═══ TYPES ═══ */
type AgentState = "hunting" | "matching" | "trading" | "meshing" | "idle" | "syncing";
type Zone = "hunt" | "match" | "exchange" | "plaza";

interface WorldAgent {
  id: string;
  name: string;
  avatarUrl: string | null;
  state: AgentState;
  zone: Zone;
  x: number;
  y: number;
  speechBubble: string | null;
  isMe: boolean;
}

interface Props { user: any }

/* ═══ HELPERS ═══ */
function getZoneForState(state: AgentState): Zone {
  if (state === "hunting") return "hunt";
  if (state === "matching" || state === "meshing") return "match";
  if (state === "trading") return "exchange";
  return "plaza";
}

function getStateColor(state: AgentState): string {
  const colors: Record<AgentState, string> = {
    hunting: "#ff2d55",
    matching: "#6366f1",
    trading: "#06b6d4",
    meshing: "#30d158",
    idle: "rgba(107,107,128,0.5)",
    syncing: "#ffd700",
  };
  return colors[state];
}

function getAvatarUrl(profile: any): string | null {
  if (profile.agent_avatar_url) return profile.agent_avatar_url;
  if (profile.user?.avatar_url) return profile.user?.avatar_url;
  if (profile.user?.wallet_address)
    return "https://api.dicebear.com/7.x/identicon/svg?seed=" + profile.user.wallet_address + "&backgroundColor=0a0a0f&scale=80";
  return null;
}

function determineUserState(meshtradeRunning: boolean, hasRecentMatch: boolean, hasBrain: boolean): AgentState {
  if (!hasBrain) return "idle";
  if (meshtradeRunning) return "trading";
  if (hasRecentMatch) return "matching";
  return "hunting";
}

const BUBBLES: Record<AgentState, string[]> = {
  hunting: ["Scanning Base...", "Found 3 signals", "Analyzing...", "Momentum detected"],
  trading: ["Executing trade", "+12% target", "Stop set at -8%", "Position open"],
  matching: ["Match found!", "Synergy: 94%", "Connecting..."],
  meshing: ["Neural link active", "Mesh synced"],
  idle: ["Waiting...", "Monitoring..."],
  syncing: ["Updating profile", "Syncing state"],
};

function randomState(): AgentState {
  const r = Math.random();
  if (r < 0.4) return "hunting";
  if (r < 0.65) return "idle";
  if (r < 0.85) return "trading";
  return "matching";
}

function randRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/* ═══ COMPONENT ═══ */
export default function MishMeshWorld({ user }: Props) {
  const [agents, setAgents] = useState<WorldAgent[]>([]);
  const [stats, setStats] = useState({ online: 0, matchesToday: 0, tradesActive: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const agentsRef = useRef<WorldAgent[]>([]);

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  /* ── Bootstrap ── */
  useEffect(() => {
    setIsMobile(window.innerWidth < 640);

    let cancelled = false;

    async function boot() {
      const { data: profiles } = await supabase
        .from("agent_profiles")
        .select("id, agent_name, agent_avatar_url, user_id, users(name, wallet_address, avatar_url)")
        .order("last_active", { ascending: false })
        .limit(20) as any;

      let meshtradeRunning = false;
      let hasRecentMatch = false;
      const hasBrain = !!(user?.ai_api_key_encrypted);

      if (user?.id) {
        const { data: mtState } = await supabase
          .from("meshtrade_state")
          .select("status")
          .eq("user_id", user.id)
          .maybeSingle();
        meshtradeRunning = mtState?.status === "running";

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count } = await supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
          .gte("created_at", today.toISOString());
        hasRecentMatch = (count ?? 0) > 0;
        setStats(s => ({ ...s, matchesToday: count ?? 0 }));
      }

      if (cancelled) return;

      const built: WorldAgent[] = [];
      const profs = profiles || [];
      setStats(s => ({ ...s, online: profs.length }));

      for (const p of profs) {
        const isMe = user?.id && p.user_id === user.id;
        const state: AgentState = isMe
          ? determineUserState(meshtradeRunning, hasRecentMatch, hasBrain)
          : randomState();
        const zone = getZoneForState(state);
        built.push({
          id: p.id,
          name: p.agent_name || (p as any).users?.name || "Agent",
          avatarUrl: getAvatarUrl(p),
          state,
          zone,
          x: randRange(10, 80),
          y: randRange(10, 65),
          speechBubble: null,
          isMe: !!isMe,
        });
      }

      const tradingCount = built.filter(a => a.state === "trading").length;
      setStats(s => ({ ...s, tradesActive: tradingCount }));
      setAgents(built);
    }

    boot();

    const channels: any[] = [];
    if (user?.id) {
      const mtChannel = supabase
        .channel("world-meshtrade")
        .on("postgres_changes", { event: "*", schema: "public", table: "meshtrade_state", filter: `user_id=eq.${user.id}` }, (payload: any) => {
          const running = payload.new?.status === "running";
          setAgents(prev => prev.map(a => {
            if (!a.isMe) return a;
            const newState: AgentState = running ? "trading" : "hunting";
            return { ...a, state: newState, zone: getZoneForState(newState), speechBubble: BUBBLES[newState][0] };
          }));
        })
        .subscribe();
      channels.push(mtChannel);

      const matchChannel = supabase
        .channel("world-matches")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "matches", filter: `user_a_id=eq.${user.id}` }, () => {
          setAgents(prev => prev.map(a => {
            if (!a.isMe) return a;
            return { ...a, state: "matching" as AgentState, zone: "match" as Zone, speechBubble: "Match found!" };
          }));
          setStats(s => ({ ...s, matchesToday: s.matchesToday + 1 }));
        })
        .subscribe();
      channels.push(matchChannel);
    }

    return () => {
      cancelled = true;
      channels.forEach(c => supabase.removeChannel(c));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* ── Agent movement ── */
  useEffect(() => {
    if (!agents.length) return;

    const intervals: ReturnType<typeof setInterval>[] = [];

    agents.forEach((_, idx) => {
      const delay = 3000 + Math.random() * 4000;
      const iv = setInterval(() => {
        setAgents(prev => prev.map((a, i) => {
          if (i !== idx) return a;
          return { ...a, x: randRange(10, 80), y: randRange(10, 65) };
        }));
      }, delay);
      intervals.push(iv);
    });

    return () => intervals.forEach(iv => clearInterval(iv));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents.length]);

  /* ── Speech bubbles ── */
  useEffect(() => {
    if (!agents.length) return;

    const userIv = setInterval(() => {
      setAgents(prev => prev.map(a => {
        if (!a.isMe) return a;
        const pool = BUBBLES[a.state];
        return { ...a, speechBubble: pool[Math.floor(Math.random() * pool.length)] };
      }));
      setTimeout(() => {
        setAgents(prev => prev.map(a => a.isMe ? { ...a, speechBubble: null } : a));
      }, 3000);
    }, 15000);

    const otherIv = setInterval(() => {
      setAgents(prev => prev.map(a => {
        if (a.isMe) return a;
        if (Math.random() > 0.1) return a;
        const pool = BUBBLES[a.state];
        return { ...a, speechBubble: pool[Math.floor(Math.random() * pool.length)] };
      }));
      setTimeout(() => {
        setAgents(prev => prev.map(a => a.isMe ? a : { ...a, speechBubble: null }));
      }, 3000);
    }, 10000);

    return () => { clearInterval(userIv); clearInterval(otherIv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents.length]);

  /* ── Zone helpers ── */
  const zoneAgents = (zone: Zone) => agents.filter(a => a.zone === zone);
  const avatarSize = (isMe: boolean) => isMobile ? (isMe ? 40 : 32) : (isMe ? 48 : 40);

  function renderAgent(agent: WorldAgent) {
    const size = avatarSize(agent.isMe);
    const color = getStateColor(agent.state);
    return (
      <div key={agent.id} style={{
        position: "absolute",
        left: agent.x + "%",
        top: agent.y + "%",
        transition: "left 2s ease-in-out, top 2s ease-in-out",
        transform: "translate(-50%, -50%)",
        zIndex: agent.isMe ? 10 : 5,
      }}>
        {agent.speechBubble && (
          <div style={{
            position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
            marginBottom: 6,
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 10, padding: "5px 9px",
            fontSize: 10, color: "#e8e8f0", whiteSpace: "nowrap",
            animation: "world-float 2s ease-in-out infinite",
            pointerEvents: "none",
          }}>{agent.speechBubble}</div>
        )}

        <div style={{
          width: size, height: size, borderRadius: "50%",
          border: `2px solid ${color}`,
          boxShadow: `0 0 16px ${color}60, 0 0 32px ${color}20`,
          overflow: "hidden",
          animation: agent.isMe ? "world-agent-me 2s ease-in-out infinite" : undefined,
        }}>
          {agent.avatarUrl ? (
            <img
              src={agent.avatarUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  parent.style.background = color;
                  parent.style.display = "flex";
                  parent.style.alignItems = "center";
                  parent.style.justifyContent = "center";
                  parent.innerHTML = `<span style="color:white;font-size:${size * 0.4}px;font-weight:700">${agent.name.charAt(0).toUpperCase()}</span>`;
                }
              }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%", background: color,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "white", fontSize: size * 0.4, fontWeight: 700 }}>
                {agent.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div style={{
          fontSize: 9, color: "rgba(255,255,255,0.6)", textAlign: "center", marginTop: 3,
          maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontWeight: agent.isMe ? 700 : 400,
        }}>{agent.name}</div>
      </div>
    );
  }

  const zones: { key: Zone; label: string; bg: string; border: string; decoration: React.ReactNode }[] = [
    {
      key: "hunt", label: "HUNT FLOOR", bg: "linear-gradient(135deg, rgba(255,45,85,0.06) 0%, rgba(10,10,15,0.95) 100%)",
      border: "1px solid rgba(255,45,85,0.08)",
      decoration: (
        <div style={{
          position: "absolute", inset: 0, borderRadius: 0,
          background: "conic-gradient(from 0deg, transparent 340deg, rgba(255,45,85,0.25) 358deg, transparent 360deg)",
          animation: "world-radar 3s linear infinite",
          pointerEvents: "none", opacity: 0.5,
        }} />
      ),
    },
    {
      key: "match", label: "MATCH HUB", bg: "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(10,10,15,0.95) 100%)",
      border: "1px solid rgba(99,102,241,0.08)",
      decoration: (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: 8, height: 8, borderRadius: "50%", background: "#6366f1",
          animation: "world-pulse 2s ease-in-out infinite",
          boxShadow: "0 0 20px #6366f1, 0 0 40px rgba(99,102,241,0.4)",
          pointerEvents: "none",
        }} />
      ),
    },
    {
      key: "exchange", label: "THE EXCHANGE", bg: "linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(10,10,15,0.95) 100%)",
      border: "1px solid rgba(6,182,212,0.08)",
      decoration: (
        <>
          <svg width="80" height="40" viewBox="0 0 80 40" style={{ position: "absolute", bottom: 16, right: 16, pointerEvents: "none" }}>
            <polyline points="0,35 15,28 30,32 45,20 60,24 75,10 80,14" stroke="#06b6d4" strokeWidth="1.5" fill="none" />
          </svg>
          <div style={{
            position: "absolute", top: 10, right: 10,
            fontSize: 9, color: "#30d158", fontWeight: 700,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%", background: "#30d158",
              animation: "world-pulse 2s ease-in-out infinite",
            }} />
            LIVE
          </div>
        </>
      ),
    },
    {
      key: "plaza", label: "SOCIAL PLAZA", bg: "linear-gradient(135deg, rgba(168,85,247,0.06) 0%, rgba(10,10,15,0.95) 100%)",
      border: "1px solid rgba(168,85,247,0.08)",
      decoration: (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(rgba(168,85,247,0.15) 1px, transparent 1px)",
          backgroundSize: "24px 24px", pointerEvents: "none",
        }} />
      ),
    },
  ];

  return (
    <div style={{
      width: "100%",
      height: isMobile ? "calc(100vh - 120px)" : "calc(100vh - 130px)",
      display: "flex", flexDirection: "column", overflow: "hidden",
      background: "#0a0a0f",
    }}>
      <style>{`
        @keyframes world-radar{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes world-pulse{0%,100%{opacity:0.5;transform:scale(0.9)}50%{opacity:1;transform:scale(1.15)}}
        @keyframes world-float{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-4px)}}
        @keyframes world-agent-me{0%,100%{box-shadow:0 0 12px #6366f1,0 0 24px rgba(99,102,241,0.4)}50%{box-shadow:0 0 24px #6366f1,0 0 48px rgba(99,102,241,0.6)}}
        @keyframes world-blink{0%,100%{opacity:0.3}50%{opacity:1}}
      `}</style>

      {/* Stats bar */}
      <div style={{
        padding: "8px 16px", display: "flex", gap: 20, alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{ fontSize: 11, color: "#6b6b80", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%", background: "#30d158",
            animation: "world-pulse 2s ease-in-out infinite",
          }} />
          {stats.online} online
        </div>
        <div style={{ fontSize: 11, color: "#6b6b80", display: "flex", alignItems: "center", gap: 6 }}>
          {stats.matchesToday} matches today
        </div>
        <div style={{ fontSize: 11, color: "#6b6b80", display: "flex", alignItems: "center", gap: 6 }}>
          {stats.tradesActive} trading
        </div>
      </div>

      {/* 2x2 zone grid */}
      <div style={{
        flex: 1, overflow: "hidden",
        display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 1,
      }}>
        {zones.map(z => (
          <div key={z.key} style={{
            position: "relative", overflow: "hidden",
            background: z.bg, border: z.border,
          }}>
            <div style={{
              position: "absolute", top: 10, left: 12,
              fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const,
              color: "rgba(255,255,255,0.2)", zIndex: 2,
            }}>{z.label}</div>

            {z.decoration}

            {zoneAgents(z.key).map(a => renderAgent(a))}
          </div>
        ))}
      </div>
    </div>
  );
}
