"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ═══ TYPES ═══ */
type AgentState = "hunting" | "matching" | "trading" | "meshing" | "idle" | "syncing";

interface WorldAgent {
  id: string;
  name: string;
  avatarUrl: string | null;
  state: AgentState;
  x: number;
  y: number;
  speechBubble: string | null;
  isMe: boolean;
}

interface Props {
  user: any;
}

/* ═══ HELPERS ═══ */
function getStateColor(state: AgentState): string {
  const colors: Record<AgentState, string> = {
    hunting: "#ff2d55",
    matching: "#6366f1",
    trading: "#06b6d4",
    meshing: "#30d158",
    idle: "rgba(107,107,128,0.6)",
    syncing: "#ffd700",
  };
  return colors[state];
}

function getAvatarUrl(profile: any): string | null {
  if (profile.agent_avatar_url) return profile.agent_avatar_url;
  if (profile.users?.avatar_url) return profile.users?.avatar_url;
  if (profile.users?.wallet_address)
    return "https://api.dicebear.com/7.x/identicon/svg?seed=" + profile.users.wallet_address + "&backgroundColor=0a0a0f&scale=80";
  return null;
}

function getZoneTarget(state: AgentState): { cx: number; cy: number } {
  switch (state) {
    case "hunting": return { cx: 22, cy: 28 };
    case "matching":
    case "meshing": return { cx: 72, cy: 28 };
    case "trading": return { cx: 22, cy: 68 };
    default: return { cx: 72, cy: 68 };
  }
}

function randomPosition(state: AgentState): { x: number; y: number } {
  const center = getZoneTarget(state);
  const x = Math.max(6, Math.min(88, center.cx + (Math.random() - 0.5) * 18));
  const y = Math.max(6, Math.min(82, center.cy + (Math.random() - 0.5) * 15));
  return { x, y };
}

function randomState(): AgentState {
  const r = Math.random();
  if (r < 0.4) return "hunting";
  if (r < 0.65) return "idle";
  if (r < 0.85) return "trading";
  return "matching";
}

const BUBBLES: Record<AgentState, string[]> = {
  hunting: ["Scanning Base...", "Found 3 signals", "Analyzing...", "Momentum detected", "Running scan..."],
  trading: ["Executing trade", "+12% target", "Stop set", "Position open", "Order filled"],
  matching: ["Match found!", "Synergy 94%", "Connecting...", "Profile match"],
  meshing: ["Neural link active", "Mesh synced", "Connected"],
  idle: ["Waiting...", "Monitoring...", "Standing by"],
  syncing: ["Updating...", "Syncing state"],
};

/* ═══ KEYFRAMES ═══ */
const KEYFRAMES = `
@keyframes world-radar { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes world-pulse-soft { 0%,100% { box-shadow: 0 0 8px currentColor; } 50% { box-shadow: 0 0 20px currentColor; } }
@keyframes world-float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-4px); } }
@keyframes world-agent-me { 0%,100% { box-shadow: 0 0 16px #6366f1, 0 0 32px rgba(99,102,241,0.5); } 50% { box-shadow: 0 0 28px #6366f1, 0 0 56px rgba(99,102,241,0.7); } }
@keyframes world-blink { 0%,100% { opacity:0.3; } 50% { opacity:1; } }
@keyframes world-thread { from { stroke-dashoffset: 20; } to { stroke-dashoffset: 0; } }
@keyframes world-ring-pulse { 0%,100% { opacity:0.3; transform: scale(0.95); } 50% { opacity:0.7; transform: scale(1.05); } }
@keyframes world-live-blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
@keyframes world-dot-pulse { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
`;

/* ═══ COMPONENT ═══ */
export default function MishMeshWorld({ user }: Props) {
  const [agents, setAgents] = useState<WorldAgent[]>([]);
  const [stats, setStats] = useState({ online: 0, matchesToday: 0, tradesActive: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const agentsRef = useRef<WorldAgent[]>([]);

  useEffect(() => { agentsRef.current = agents; }, [agents]);

  const wanderAgent = useCallback((agent: WorldAgent): WorldAgent => {
    const center = getZoneTarget(agent.state);
    const x = Math.max(6, Math.min(88, center.cx + (Math.random() - 0.5) * 18));
    const y = Math.max(6, Math.min(82, center.cy + (Math.random() - 0.5) * 15));
    return { ...agent, x, y };
  }, []);

  /* ── Bootstrap ── */
  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);

    let cancelled = false;

    async function boot() {
      // Fetch agent profiles - try last_active first, fall back to created_at
      let profiles: any[] | null = null;
      const { data: d1, error: e1 } = await supabase
        .from("agent_profiles")
        .select("id, agent_name, agent_avatar_url, user_id, users(name, wallet_address, avatar_url)")
        .not("agent_name", "is", null)
        .order("updated_at", { ascending: false })
        .limit(16) as any;

      if (e1) {
        const { data: d2 } = await supabase
          .from("agent_profiles")
          .select("id, agent_name, agent_avatar_url, user_id, users(name, wallet_address, avatar_url)")
          .not("agent_name", "is", null)
          .order("created_at", { ascending: false })
          .limit(16) as any;
        profiles = d2;
      } else {
        profiles = d1;
      }

      // Check meshtrade state (gracefully handle missing table)
      let meshtradeRunning = false;
      const hasBrain = !!(user?.ai_api_key_encrypted);

      if (user?.id) {
        try {
          const { data: mtState } = await supabase
            .from("meshtrade_state")
            .select("status")
            .eq("user_id", user.id)
            .maybeSingle();
          meshtradeRunning = mtState?.status === "running";
        } catch {
          // table may not exist
        }
      }

      // Count today's matches
      let matchCount = 0;
      if (user?.id) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count } = await supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .gte("created_at", today.toISOString());
        matchCount = count ?? 0;
      }

      if (cancelled) return;

      const profs = (profiles || []).filter((p: any) => p.agent_name);
      const built: WorldAgent[] = [];

      for (const p of profs) {
        const isMe = !!(user?.id && p.user_id === user.id);
        let state: AgentState;
        if (isMe) {
          if (!hasBrain) state = "idle";
          else if (meshtradeRunning) state = "trading";
          else state = "hunting";
        } else {
          state = randomState();
        }
        const pos = randomPosition(state);
        built.push({
          id: p.id,
          name: p.agent_name || (p as any).users?.name || "Agent",
          avatarUrl: getAvatarUrl(p),
          state,
          x: pos.x,
          y: pos.y,
          speechBubble: null,
          isMe,
        });
      }

      // If no profiles and user exists, add user as sole agent
      if (built.length === 0 && user?.id) {
        const pos = randomPosition(hasBrain ? "hunting" : "idle");
        built.push({
          id: user.id,
          name: user.name || "You",
          avatarUrl: user.avatar_url || null,
          state: hasBrain ? "hunting" : "idle",
          x: pos.x,
          y: pos.y,
          speechBubble: null,
          isMe: true,
        });
      }

      const tradingCount = built.filter(a => a.state === "trading").length;
      setStats({ online: built.length, matchesToday: matchCount, tradesActive: tradingCount });
      setAgents(built);
    }

    boot();

    // Realtime subscriptions
    const channels: any[] = [];
    if (user?.id) {
      try {
        const mtChannel = supabase
          .channel("world-meshtrade")
          .on("postgres_changes", {
            event: "*", schema: "public", table: "meshtrade_state",
            filter: `user_id=eq.${user.id}`,
          }, (payload: any) => {
            const running = payload.new?.status === "running";
            setAgents(prev => prev.map(a => {
              if (!a.isMe) return a;
              const newState: AgentState = running ? "trading" : "hunting";
              const pos = randomPosition(newState);
              return { ...a, state: newState, x: pos.x, y: pos.y, speechBubble: BUBBLES[newState][0] };
            }));
          })
          .subscribe();
        channels.push(mtChannel);
      } catch {
        // meshtrade_state may not exist
      }

      const matchChannel = supabase
        .channel("world-matches")
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "matches",
        }, () => {
          setStats(s => ({ ...s, matchesToday: s.matchesToday + 1 }));
        })
        .subscribe();
      channels.push(matchChannel);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      channels.forEach(c => supabase.removeChannel(c));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* ── Agent movement — every 5s ── */
  useEffect(() => {
    if (!agents.length) return;
    const iv = setInterval(() => {
      setAgents(prev => prev.map(a => wanderAgent(a)));
    }, 9000);
    return () => clearInterval(iv);
  }, [agents.length, wanderAgent]);

  /* ── Speech bubbles — every 10s for others, 20s for user ── */
  useEffect(() => {
    if (!agents.length) return;

    const otherIv = setInterval(() => {
      setAgents(prev => prev.map(a => {
        if (a.isMe || Math.random() > 0.15) return a;
        const pool = BUBBLES[a.state];
        return { ...a, speechBubble: pool[Math.floor(Math.random() * pool.length)] };
      }));
      setTimeout(() => {
        setAgents(prev => prev.map(a => a.isMe ? a : { ...a, speechBubble: null }));
      }, 3000);
    }, 10000);

    const userIv = setInterval(() => {
      setAgents(prev => prev.map(a => {
        if (!a.isMe) return a;
        const pool = BUBBLES[a.state];
        return { ...a, speechBubble: pool[Math.floor(Math.random() * pool.length)] };
      }));
      setTimeout(() => {
        setAgents(prev => prev.map(a => a.isMe ? { ...a, speechBubble: null } : a));
      }, 3000);
    }, 20000);

    return () => { clearInterval(otherIv); clearInterval(userIv); };
  }, [agents.length]);

  /* ── Find matching agent pairs for connection lines ── */
  const matchingAgents = agents.filter(a => a.state === "matching" || a.state === "meshing");
  const connectionPairs: [WorldAgent, WorldAgent][] = [];
  for (let i = 0; i < matchingAgents.length - 1; i += 2) {
    connectionPairs.push([matchingAgents[i], matchingAgents[i + 1]]);
  }

  /* ── Plaza scatter dots ── */
  const plazaDots = useRef(
    Array.from({ length: 8 }, () => ({
      x: 62 + Math.random() * 28,
      y: 58 + Math.random() * 28,
    }))
  );

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{KEYFRAMES}</style>

      {/* ── Stats Bar ── */}
      <div style={{
        height: 36,
        display: "flex",
        gap: 24,
        padding: "0 20px",
        alignItems: "center",
        background: "rgba(10,10,15,0.8)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 11, color: "#6b6b80", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 5, height: 5, borderRadius: "50%", background: "#30d158",
            animation: "world-dot-pulse 2s ease-in-out infinite",
          }} />
          {isMobile ? stats.online : `Agents Online: ${stats.online}`}
        </div>
        <div style={{ fontSize: 11, color: "#6b6b80" }}>
          {isMobile ? stats.matchesToday : `Matches Today: ${stats.matchesToday}`}
        </div>
        <div style={{ fontSize: 11, color: "#6b6b80" }}>
          {isMobile ? stats.tradesActive : `Trades Active: ${stats.tradesActive}`}
        </div>
        <div style={{
          marginLeft: "auto",
          fontSize: 10,
          letterSpacing: "0.15em",
          color: "rgba(255,255,255,0.15)",
        }}>
          MISHMESH WORLD
        </div>
      </div>

      {/* ── The World ── */}
      <div style={{
        position: "relative",
        width: "100%",
        height: isMobile ? "calc(100vh - 116px)" : "calc(100vh - 130px)",
        overflow: "hidden",
        background: "radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.08) 0%, rgba(6,182,212,0.04) 40%, #0a0a0f 70%)",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px), radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.08) 0%, rgba(6,182,212,0.04) 40%, #0a0a0f 70%)",
        backgroundSize: "60px 60px, 60px 60px, 100% 100%",
      }}>

        {/* ── Zone Decorations ── */}

        {/* HUNT FLOOR — top left radar */}
        {!isMobile && (
          <>
            <div style={{
              position: "absolute", top: "8%", left: "6%",
              fontSize: 9, letterSpacing: "0.12em", color: "rgba(255,45,85,0.4)",
              pointerEvents: "none",
            }}>HUNT FLOOR</div>
            <div style={{
              position: "absolute", top: "10%", left: "8%",
              width: 120, height: 120, borderRadius: "50%",
              border: "1px solid rgba(255,45,85,0.2)",
              pointerEvents: "none",
            }}>
              {/* Inner circle */}
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: 60, height: 60, borderRadius: "50%",
                border: "1px solid rgba(255,45,85,0.1)",
              }} />
              {/* Sweep line */}
              <div style={{
                position: "absolute", top: 0, left: 0,
                width: "100%", height: "100%", borderRadius: "50%",
                background: "conic-gradient(from 0deg, transparent 340deg, rgba(255,45,85,0.3) 358deg, transparent 360deg)",
                animation: "world-radar 3s linear infinite",
              }} />
            </div>
          </>
        )}

        {/* MATCH HUB — top right rings */}
        {!isMobile && (
          <>
            <div style={{
              position: "absolute", top: "8%", right: "8%",
              fontSize: 9, letterSpacing: "0.12em", color: "rgba(99,102,241,0.4)",
              pointerEvents: "none",
            }}>MATCH HUB</div>
            <div style={{
              position: "absolute", top: "12%", right: "10%",
              width: 80, height: 80, borderRadius: "50%",
              border: "1px solid rgba(99,102,241,0.25)",
              animation: "world-ring-pulse 3s ease-in-out infinite",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", top: "calc(12% + 15px)", right: "calc(10% + 15px)",
              width: 50, height: 50, borderRadius: "50%",
              border: "1px solid rgba(99,102,241,0.15)",
              animation: "world-ring-pulse 3s ease-in-out infinite 0.5s",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", top: "calc(12% + 30px)", right: "calc(10% + 30px)",
              width: 20, height: 20, borderRadius: "50%",
              border: "1px solid rgba(99,102,241,0.1)",
              animation: "world-ring-pulse 3s ease-in-out infinite 1s",
              pointerEvents: "none",
            }} />
            {/* Center glow dot */}
            <div style={{
              position: "absolute", top: "calc(12% + 37px)", right: "calc(10% + 37px)",
              width: 6, height: 6, borderRadius: "50%",
              background: "#6366f1",
              boxShadow: "0 0 20px #6366f1",
              pointerEvents: "none",
            }} />
          </>
        )}

        {/* EXCHANGE — bottom left chart */}
        {!isMobile && (
          <>
            <div style={{
              position: "absolute", bottom: "22%", left: "5%",
              fontSize: 9, letterSpacing: "0.12em", color: "rgba(6,182,212,0.4)",
              pointerEvents: "none",
            }}>EXCHANGE</div>
            <svg width="100" height="50" viewBox="0 0 100 50" style={{
              position: "absolute", bottom: "18%", left: "5%",
              pointerEvents: "none",
            }}>
              <polyline
                points="0,45 20,35 40,38 60,22 80,26 100,12"
                stroke="#06b6d4"
                strokeWidth="1.5"
                fill="none"
              />
              <polyline
                points="0,45 20,35 40,38 60,22 80,26 100,12 100,50 0,50"
                stroke="none"
                fill="rgba(6,182,212,0.08)"
              />
            </svg>
            <div style={{
              position: "absolute", bottom: "24%", left: "5%",
              display: "flex", alignItems: "center", gap: 4,
              pointerEvents: "none",
            }}>
              <div style={{
                width: 4, height: 4, borderRadius: "50%", background: "#30d158",
                animation: "world-live-blink 1.5s ease-in-out infinite",
              }} />
              <span style={{ fontSize: 8, color: "#30d158", letterSpacing: "0.1em" }}>LIVE</span>
            </div>
          </>
        )}

        {/* PLAZA — bottom right scatter dots */}
        {!isMobile && (
          <>
            <div style={{
              position: "absolute", bottom: "22%", right: "8%",
              fontSize: 9, letterSpacing: "0.12em", color: "rgba(168,85,247,0.4)",
              pointerEvents: "none",
            }}>PLAZA</div>
            {plazaDots.current.map((dot, i) => (
              <div key={`pdot-${i}`} style={{
                position: "absolute",
                left: dot.x + "%",
                top: dot.y + "%",
                width: 3, height: 3, borderRadius: "50%",
                background: "rgba(168,85,247,0.4)",
                pointerEvents: "none",
              }} />
            ))}
          </>
        )}

        {/* CENTER — world title + glow */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: 11, letterSpacing: "0.2em",
          color: "rgba(255,255,255,0.08)",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}>MISHMESH WORLD</div>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.06), transparent)",
          pointerEvents: "none",
        }} />

        {/* ── Connection Lines SVG ── */}
        <svg style={{
          position: "absolute", top: 0, left: 0,
          width: "100%", height: "100%",
          pointerEvents: "none",
          zIndex: 5,
        }}>
          {connectionPairs.map(([a1, a2], i) => (
            <line
              key={`conn-${i}`}
              x1={a1.x + "%"} y1={a1.y + "%"}
              x2={a2.x + "%"} y2={a2.y + "%"}
              stroke="rgba(99,102,241,0.4)"
              strokeWidth="1"
              strokeDasharray="4 6"
              style={{ animation: "world-thread 1.5s linear infinite" }}
            />
          ))}
        </svg>

        {/* ── Agent Avatars ── */}
        {agents.map(agent => {
          const avatarSize = isMobile
            ? (agent.isMe ? 42 : 32)
            : (agent.isMe ? 52 : 40);
          const color = getStateColor(agent.state);

          return (
            <div key={agent.id} style={{
              position: "absolute",
              left: agent.x + "%",
              top: agent.y + "%",
              transform: "translate(-50%, -50%)",
              transition: "left 7s cubic-bezier(0.45, 0, 0.55, 1), top 7s cubic-bezier(0.45, 0, 0.55, 1)",
              zIndex: agent.isMe ? 20 : 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              pointerEvents: "none",
            }}>
              {/* Speech bubble */}
              {agent.speechBubble && (
                <div style={{
                  background: "rgba(20,20,30,0.9)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: "5px 10px",
                  fontSize: 10,
                  color: "#e8e8f0",
                  whiteSpace: "nowrap",
                  marginBottom: 6,
                  animation: "world-float 2s ease-in-out infinite",
                  backdropFilter: "blur(8px)",
                }}>
                  {agent.speechBubble}
                </div>
              )}

              {/* Avatar ring + picture */}
              <div style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: "50%",
                border: `2px solid ${color}`,
                boxShadow: `0 0 16px ${color}80, 0 0 32px ${color}30`,
                overflow: "hidden",
                background: "#0d0d14",
                position: "relative",
                animation: agent.isMe
                  ? "world-agent-me 3s ease-in-out infinite"
                  : "world-pulse-soft 4s ease-in-out infinite",
                flexShrink: 0,
              }}>
                {agent.avatarUrl ? (
                  <img
                    src={agent.avatarUrl}
                    alt={agent.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div style={{
                    width: "100%", height: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: agent.isMe ? 20 : 16, fontWeight: 700,
                    color: color,
                    background: `radial-gradient(circle, ${color}15, #0d0d14)`,
                  }}>
                    {(agent.name || "?")[0].toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name label */}
              <div style={{
                fontSize: 9,
                color: agent.isMe ? "#e8e8f0" : "rgba(255,255,255,0.45)",
                fontWeight: agent.isMe ? 700 : 400,
                marginTop: 4,
                maxWidth: 60,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textAlign: "center",
                letterSpacing: "0.05em",
              }}>
                {agent.isMe ? "YOU" : (agent.name || "agent")}
              </div>

              {/* State indicator dot */}
              <div style={{
                width: 5, height: 5, borderRadius: "50%",
                background: color,
                marginTop: 2,
                boxShadow: `0 0 6px ${color}`,
                animation: "world-blink 2s ease-in-out infinite",
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
