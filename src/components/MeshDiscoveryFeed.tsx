"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C, Avatar, Btn } from "./dashboard/shared";
import { Search, Zap, X, Check, Sparkles, Settings } from "lucide-react";

// ══════════════════════════════════════════
// Mesh Discovery Feed — Real-time agent activity
// Shows your agent autonomously swiping + matching
// ══════════════════════════════════════════

interface AgentAction {
  id?: string;
  action_type: "evaluate" | "swipe_right" | "swipe_left" | "send_opener" | "match_found";
  target_user_id: string;
  target_name?: string;
  target_industry?: string;
  target_building?: string;
  target_avatar?: string;
  target_agent_name?: string;
  score?: number;
  reasoning?: string;
  opener?: string;
  match_id?: string;
  created_at?: string;
}

interface Props {
  userId: string;
  agentName?: string;
  hasAI: boolean;
  hasPrefs: boolean;
  onSetupPrefs: () => void;
  onConnectBrain?: () => void;
}

const PREVIEW_PROFILES = [
  { name: 'Sophia R.', age: 28, role: 'DeFi Builder', img: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&h=400&fit=crop&crop=face' },
  { name: 'Marcus T.', age: 31, role: 'Web3 Founder', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop&crop=face' },
  { name: 'Aria K.', age: 26, role: 'AI Engineer', img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&h=400&fit=crop&crop=face' },
  { name: 'Devon M.', age: 33, role: 'Crypto Trader', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=400&fit=crop&crop=face' },
];

export default function MeshDiscoveryFeed({ userId, agentName, hasAI, hasPrefs, onSetupPrefs, onConnectBrain }: Props) {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [newMatchCount, setNewMatchCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);

  // Load existing actions on mount
  useEffect(() => {
    loadActions();
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, []);

  // Auto-refresh every 30s if agent is active
  useEffect(() => {
    if (hasAI && hasPrefs) {
      refreshTimer.current = setInterval(loadActions, 30000);
    }
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [hasAI, hasPrefs]);

  async function loadActions() {
    try {
      const res = await fetch(`/api/agent/discover/actions?limit=30`);
      if (res.ok) {
        const data = await res.json();
        if (data.actions) setActions(data.actions);
      }
    } catch {
      // Silent fail on load
    }
  }

  async function startScan() {
    if (isScanning) return;
    setIsScanning(true);
    setError(null);

    try {
      const res = await fetch("/api/agent/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (data.error === "no_ai") {
        setError("Connect your AI brain first");
        setIsScanning(false);
        return;
      }
      if (data.error === "no_prefs") {
        setError("Set up your preferences first");
        setIsScanning(false);
        return;
      }
      if (data.error) {
        setError(data.error);
        setIsScanning(false);
        return;
      }

      // Animate new actions in one by one
      const newActions: AgentAction[] = data.actions || [];
      const matches = data.new_matches || [];
      setNewMatchCount((c) => c + matches.length);

      for (let i = 0; i < newActions.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        setActions((prev) => [{ ...newActions[i], created_at: new Date().toISOString() }, ...prev]);
      }
    } catch (err) {
      setError("Scan failed — try again");
    }

    setIsScanning(false);
  }

  function timeAgo(ts?: string): string {
    if (!ts) return "now";
    const ms = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function actionIcon(type: string) {
    switch (type) {
      case "evaluate":
        return <Search size={12} />;
      case "swipe_right":
        return <Check size={12} />;
      case "swipe_left":
        return <X size={12} />;
      case "match_found":
        return <Sparkles size={12} />;
      case "send_opener":
        return <Zap size={12} />;
      default:
        return <Search size={12} />;
    }
  }

  function actionColor(type: string) {
    switch (type) {
      case "swipe_right":
        return C.match;
      case "swipe_left":
        return C.muted;
      case "match_found":
        return C.gold;
      case "send_opener":
        return C.cyan;
      default:
        return C.cold;
    }
  }

  function actionLabel(a: AgentAction) {
    switch (a.action_type) {
      case "evaluate":
        return `Evaluated ${a.target_name || "someone"} — ${a.score || 0}% match.${a.score && a.score > 60 ? " Swiping right." : " Passing."}`;
      case "swipe_right":
        return `Swiped right on ${a.target_name || "someone"} — ${a.reasoning || "looks promising"}`;
      case "swipe_left":
        return `Passed on ${a.target_name || "someone"} — ${a.reasoning || "misaligned goals"}`;
      case "match_found":
        return `MATCH with ${a.target_name || "someone"} at ${a.score || 0}%!`;
      case "send_opener":
        return `Sent opener to ${a.target_name || "someone"}`;
      default:
        return `Action: ${a.action_type}`;
    }
  }

  // ── Animated preview: pure CSS keyframe loop (no React state jitter)
  const [pairIdx, setPairIdx] = useState(0);

  useEffect(() => {
    if (hasAI && hasPrefs) return;
    // Swap pairs every 6s to match CSS animation duration
    const iv = setInterval(() => setPairIdx(i => (i + 2) % PREVIEW_PROFILES.length), 6000);
    return () => clearInterval(iv);
  }, [hasAI, hasPrefs]);

  // If no AI or prefs, show animated preview (pure CSS — no React state jitter)
  if (!hasAI || !hasPrefs) {
    const p1 = PREVIEW_PROFILES[pairIdx % PREVIEW_PROFILES.length];
    const p2 = PREVIEW_PROFILES[(pairIdx + 1) % PREVIEW_PROFILES.length];

    return (
      <div style={{
        background: C.surface,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        padding: "24px 20px 20px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
      }}>

        <style dangerouslySetInnerHTML={{__html:`
          /* ── 6s loop: scan → approach → bloom → text → separate → reset ── */
          @keyframes card1Move {
            0%,8%   { transform: translateX(-38px) rotate(-12deg); box-shadow: 0 0 18px #a855f7; }
            30%     { transform: translateX(-10px) rotate(-7deg);  box-shadow: 0 0 28px #a855f780; }
            48%,58% { transform: translateX(18px)  rotate(-2deg);  box-shadow: 0 0 45px #a855f7; }
            75%     { transform: translateX(-10px) rotate(-9deg);  box-shadow: 0 0 22px #a855f760; }
            92%,100%{ transform: translateX(-38px) rotate(-12deg); box-shadow: 0 0 18px #a855f7; }
          }
          @keyframes card2Move {
            0%,8%   { transform: translateX(38px)  rotate(12deg);  box-shadow: 0 0 18px #06b6d4; }
            30%     { transform: translateX(10px)  rotate(7deg);   box-shadow: 0 0 28px #06b6d480; }
            48%,58% { transform: translateX(-18px) rotate(2deg);   box-shadow: 0 0 45px #06b6d4; }
            75%     { transform: translateX(10px)  rotate(9deg);   box-shadow: 0 0 22px #06b6d460; }
            92%,100%{ transform: translateX(38px)  rotate(12deg);  box-shadow: 0 0 18px #06b6d4; }
          }
          /* Soft radial bloom at moment of connection */
          @keyframes meshBloom {
            0%,42%  { opacity:0; transform:translate(-50%,-50%) scale(0.2); }
            50%     { opacity:0.9; transform:translate(-50%,-50%) scale(0.8); }
            58%     { opacity:1; transform:translate(-50%,-50%) scale(1.1); }
            70%     { opacity:0.5; transform:translate(-50%,-50%) scale(1.6); }
            80%,100%{ opacity:0; transform:translate(-50%,-50%) scale(2); }
          }
          /* Second outer ring — slightly delayed */
          @keyframes meshBloom2 {
            0%,48%  { opacity:0; transform:translate(-50%,-50%) scale(0.1); }
            58%     { opacity:0.6; transform:translate(-50%,-50%) scale(0.7); }
            70%     { opacity:0.4; transform:translate(-50%,-50%) scale(1.4); }
            82%,100%{ opacity:0; transform:translate(-50%,-50%) scale(2.2); }
          }
          /* "It's a Mesh." text reveal */
          @keyframes meshTextIn {
            0%,50%  { opacity:0; transform:scale(0.85) translateY(6px); }
            60%     { opacity:1; transform:scale(1.05) translateY(-2px); }
            65%,72% { opacity:1; transform:scale(1) translateY(0); }
            82%,100%{ opacity:0; transform:scale(0.95) translateY(-4px); }
          }
          /* Status label cycling */
          @keyframes labelScan {
            0%,30%  { opacity:1; }
            35%,100%{ opacity:0; }
          }
          @keyframes labelConnect {
            0%,28% { opacity:0; }
            32%,50%{ opacity:1; }
            55%,100%{ opacity:0; }
          }
          @keyframes labelMesh {
            0%,58%  { opacity:0; }
            62%,78% { opacity:1; }
            83%,100%{ opacity:0; }
          }
          /* Scanning progress bar */
          @keyframes scanBar {
            0%   { transform:translateX(-100%); }
            100% { transform:translateX(350%); }
          }
          /* Subtle card float when separated */
          @keyframes floatCard {
            0%,100% { top: 10px; }
            50%     { top: 4px; }
          }
        `}}/>

        {/* Cards stage */}
        <div style={{ position:"relative", width:"100%", height:210, marginBottom:8 }}>

          {/* Card 1 — left (purple) */}
          <div key={`c1-${pairIdx}`} style={{
            position:"absolute",
            left:"calc(50% - 145px)",
            top:10,
            width:130, height:170,
            borderRadius:16, overflow:"hidden",
            border:"2px solid #a855f7aa",
            animation:"card1Move 6s cubic-bezier(0.45,0,0.55,1) infinite, floatCard 3s ease-in-out infinite",
            zIndex:2,
          }}>
            <img src={p1.img} alt={p1.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"6px 8px", background:"linear-gradient(transparent,rgba(0,0,0,0.85))" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"white" }}>{p1.name}, {p1.age}</div>
              <div style={{ fontSize:8, color:"#ccc" }}>{p1.role}</div>
            </div>
          </div>

          {/* Card 2 — right (cyan) */}
          <div key={`c2-${pairIdx}`} style={{
            position:"absolute",
            left:"calc(50% + 15px)",
            top:20,
            width:130, height:170,
            borderRadius:16, overflow:"hidden",
            border:"2px solid #06b6d4aa",
            animation:"card2Move 6s cubic-bezier(0.45,0,0.55,1) infinite, floatCard 3.4s ease-in-out infinite",
            zIndex:2,
          }}>
            <img src={p2.img} alt={p2.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"6px 8px", background:"linear-gradient(transparent,rgba(0,0,0,0.85))" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"white" }}>{p2.name}, {p2.age}</div>
              <div style={{ fontSize:8, color:"#ccc" }}>{p2.role}</div>
            </div>
          </div>

          {/* Bloom ring 1 — appears at moment of connection */}
          <div style={{
            position:"absolute", top:"44%", left:"50%",
            width:120, height:120,
            borderRadius:"50%",
            border:"1.5px solid #a855f7",
            boxShadow:"0 0 20px #a855f766, inset 0 0 20px #a855f722",
            background:"radial-gradient(circle, #a855f711, transparent 70%)",
            animation:"meshBloom 6s ease-in-out infinite",
            pointerEvents:"none", zIndex:3,
          }}/>
          {/* Bloom ring 2 — slightly larger, cyan */}
          <div style={{
            position:"absolute", top:"44%", left:"50%",
            width:140, height:140,
            borderRadius:"50%",
            border:"1px solid #06b6d4",
            boxShadow:"0 0 16px #06b6d444",
            animation:"meshBloom2 6s ease-in-out infinite",
            pointerEvents:"none", zIndex:3,
          }}/>
        </div>

        {/* Stacked status labels — each fades in/out on schedule */}
        <div style={{ position:"relative", height:16, width:"100%", marginBottom:6 }}>
          <div style={{ position:"absolute", inset:0, fontSize:10, color:C.muted, letterSpacing:"0.14em", textTransform:"uppercase", animation:"labelScan 6s ease infinite" }}>
            YOUR AGENT IS SCANNING...
          </div>
          <div style={{ position:"absolute", inset:0, fontSize:10, color:"#a855f7", letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:600, animation:"labelConnect 6s ease infinite" }}>
            COMPATIBILITY DETECTED
          </div>
          <div style={{ position:"absolute", inset:0, fontSize:10, color:"#06b6d4", letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:700, animation:"labelMesh 6s ease infinite" }}>
            IT&apos;S A MESH.
          </div>
        </div>

        {/* "It's a Mesh." big reveal */}
        <div style={{
          fontSize:24, fontWeight:800,
          background:"linear-gradient(135deg,#a855f7,#06b6d4)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          height:34, marginBottom:10,
          animation:"meshTextIn 6s ease infinite",
        }}>
          It&apos;s a Mesh.
        </div>

        {/* Scanning bar */}
        <div style={{ width:"100%", height:2, borderRadius:2, background:C.s2, overflow:"hidden", marginBottom:14 }}>
          <div style={{ width:"35%", height:"100%", borderRadius:2, background:"linear-gradient(90deg,#a855f7,#06b6d4)", animation:"scanBar 2.2s linear infinite" }}/>
        </div>

        <div style={{ width:"100%", height:1, background:C.border, marginBottom:14 }}/>

        <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>Connect your brain to start networking</div>

        <button
          onClick={() => { if (!hasAI && onConnectBrain) onConnectBrain(); else onSetupPrefs(); }}
          style={{ width:"100%", padding:"13px 0", background:"linear-gradient(135deg,#a855f7,#06b6d4)", border:"none", borderRadius:12, color:"white", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.02em" }}
        >
          {!hasAI ? "Connect Brain" : "Set Preferences"}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 300,
        maxHeight: 600,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: C.match,
              animation: "pulse-dot 1.5s infinite",
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {agentName || "Your Agent"} is Networking
          </div>
          <div style={{ fontSize: 9, color: C.muted }}>
            {actions.length} actions{newMatchCount > 0 ? ` · ${newMatchCount} new matches` : ""}
          </div>
        </div>
        <button
          onClick={onSetupPrefs}
          style={{
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "4px 8px",
            cursor: "pointer",
            color: C.muted,
            fontSize: 10,
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Settings size={10} />
          Prefs
        </button>
      </div>

      {/* Feed */}
      <div
        ref={feedRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Scanning indicator */}
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            style={{
              background: `${C.cold}10`,
              border: `1px solid ${C.cold}22`,
              borderRadius: 10,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: `2px solid ${C.cold}`,
                borderTopColor: "transparent",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <div style={{ fontSize: 12, color: C.cold, fontWeight: 600 }}>Agent scanning the mesh...</div>
          </motion.div>
        )}

        {error && (
          <div
            style={{
              background: `${C.hot}10`,
              border: `1px solid ${C.hot}22`,
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 12,
              color: C.hot,
            }}
          >
            {error}
          </div>
        )}

        {/* Action cards */}
        <AnimatePresence>
          {actions.map((action, i) => (
            <motion.div
              key={`${action.action_type}-${action.target_user_id}-${i}`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                background: action.action_type === "match_found" ? `${C.match}08` : C.s2,
                border: `1px solid ${action.action_type === "match_found" ? `${C.match}33` : C.border}`,
                borderLeft: `3px solid ${actionColor(action.action_type)}`,
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              {/* Action header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: `${actionColor(action.action_type)}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: actionColor(action.action_type),
                  }}
                >
                  {actionIcon(action.action_type)}
                </div>
                <div style={{ flex: 1, fontSize: 11, color: C.text, lineHeight: 1.4 }}>
                  {actionLabel(action)}
                </div>
                <span style={{ fontSize: 9, color: C.dim, flexShrink: 0 }}>{timeAgo(action.created_at)}</span>
              </div>

              {/* Target user mini card */}
              {(action.target_name || action.target_industry) && action.action_type !== "swipe_left" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 6,
                    padding: "6px 8px",
                    background: C.surface,
                    borderRadius: 8,
                  }}
                >
                  <Avatar name={action.target_name || "?"} size={28} url={action.target_avatar} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{action.target_name}</div>
                    <div style={{ fontSize: 9, color: C.muted }}>
                      {action.target_industry}
                      {action.target_building ? ` · ${action.target_building.slice(0, 40)}${action.target_building.length > 40 ? "..." : ""}` : ""}
                    </div>
                  </div>
                  {action.score && (
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        background: `linear-gradient(135deg, ${C.cold}, ${C.cyan})`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {action.score}%
                    </div>
                  )}
                </div>
              )}

              {/* Match banner + opener */}
              {action.action_type === "match_found" && (
                <div style={{ marginTop: 8 }}>
                  <div
                    style={{
                      background: `linear-gradient(135deg, ${C.match}20, ${C.cyan}10)`,
                      border: `1px solid ${C.match}33`,
                      borderRadius: 8,
                      padding: "8px 12px",
                      textAlign: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      color: C.match,
                      marginBottom: action.opener ? 6 : 0,
                    }}
                  >
                    MATCH!
                  </div>
                  {action.opener && (
                    <div
                      style={{
                        background: C.surface,
                        borderRadius: 8,
                        padding: "8px 12px",
                        fontSize: 11,
                        color: C.text,
                        lineHeight: 1.5,
                        fontStyle: "italic",
                        borderLeft: `2px solid ${C.cyan}`,
                      }}
                    >
                      "{action.opener}"
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {actions.length === 0 && !isScanning && (
          <div style={{ textAlign: "center", padding: "30px 20px", color: C.dim }}>
            <Search size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div style={{ fontSize: 12, fontWeight: 600 }}>No activity yet</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Hit Scan Now to let your agent loose.</div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.border}` }}>
        <button
          onClick={startScan}
          disabled={isScanning}
          style={{
            width: "100%",
            padding: "12px 0",
            background: isScanning ? C.s2 : `linear-gradient(135deg, ${C.cold}, ${C.cyan})`,
            border: "none",
            borderRadius: 10,
            color: "white",
            fontSize: 13,
            fontWeight: 700,
            cursor: isScanning ? "wait" : "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: isScanning ? 0.6 : 1,
            transition: "all 0.2s",
          }}
        >
          {isScanning ? (
            <>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: "2px solid white",
                  borderTopColor: "transparent",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Agent Scanning...
            </>
          ) : (
            <>
              <Zap size={14} />
              SCAN NOW
            </>
          )}
        </button>
      </div>

      {/* Keyframe animations */}
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100%{opacity:1}50%{opacity:0.3} }
      `}}/>
    </div>
  );
}
