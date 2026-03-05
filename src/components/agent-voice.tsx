"use client";
import { useState, useEffect } from "react";

const C = {
  bg:"#0a0a0f", surface:"#111118", s2:"#1a1a24",
  indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", gold:"#ffd700", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
};

interface VoiceMessage {
  id: string;
  message: string;
  type: "insight" | "trade" | "nudge" | "greeting" | "weekly" | "milestone" | "exit";
  read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  insight: "", trade: "", nudge: "", greeting: "",
  weekly: "", milestone: "", exit: "",
};

export default function AgentVoice({ orbColor = C.indigo }: { orbColor?: string }) {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
    // Poll every 60s
    const iv = setInterval(fetchMessages, 60000);
    return () => clearInterval(iv);
  }, []);

  async function fetchMessages() {
    try {
      const res = await fetch("/api/match", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_agent_voice" }),
      });
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (e) {}
    setLoading(false);
  }

  async function markRead(id: string) {
    try {
      await fetch("/api/match", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_voice_read", voice_id: id }),
      });
    } catch (e) {}
  }

  const unread = messages.filter(m => !m.read).length;
  const latest = messages[0];

  if (loading || messages.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* ── Collapsed: latest message bubble ── */}
      {!expanded && latest && (
        <button onClick={() => { setExpanded(true); if (!latest.read) markRead(latest.id); }} style={{
          width: "100%", display: "flex", alignItems: "flex-start", gap: 12,
          padding: "14px 16px", borderRadius: 14,
          background: C.s2, border: `1px solid ${orbColor}22`,
          cursor: "pointer", fontFamily: "inherit", textAlign: "left",
          animation: "av-slide-in 0.3s ease-out",
          transition: "all 0.2s",
        }}>
          {/* Agent orb */}
          <div style={{
            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
            background: `radial-gradient(circle at 40% 40%, ${orbColor}, ${orbColor}66)`,
            boxShadow: `0 0 10px ${orbColor}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>{TYPE_ICONS[latest.type] || ""}</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: orbColor, fontWeight: 700 }}>Your Agent</span>
              {unread > 1 && (
                <span style={{
                  fontSize: 10, padding: "1px 6px", borderRadius: 6,
                  background: orbColor, color: "white", fontWeight: 800,
                }}>{unread}</span>
              )}
            </div>
            <p style={{
              fontSize: 13, color: C.text, lineHeight: 1.5, margin: 0,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any,
              overflow: "hidden",
            }}>{latest.message}</p>
            <span style={{ fontSize: 10, color: C.dim, marginTop: 4, display: "block" }}>
              {timeAgo(latest.created_at)}
            </span>
          </div>
        </button>
      )}

      {/* ── Expanded: message feed ── */}
      {expanded && (
        <div style={{
          background: C.s2, border: `1px solid ${orbColor}22`, borderRadius: 14,
          overflow: "hidden", animation: "av-expand 0.2s ease-out",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 16px", borderBottom: `1px solid ${C.dim}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: `radial-gradient(${orbColor}, ${orbColor}66)`,
                boxShadow: `0 0 8px ${orbColor}30`,
              }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: orbColor }}>Agent Feed</span>
            </div>
            <button onClick={() => setExpanded(false)} style={{
              background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16,
            }}>×</button>
          </div>

          {/* Messages */}
          <div style={{ maxHeight: 300, overflowY: "auto", padding: "8px 0" }}>
            {messages.slice(0, 10).map(msg => (
              <div key={msg.id} onClick={() => { if (!msg.read) { markRead(msg.id); setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m)); }}} style={{
                display: "flex", gap: 10, padding: "10px 16px",
                background: msg.read ? "transparent" : `${orbColor}06`,
                borderLeft: msg.read ? "3px solid transparent" : `3px solid ${orbColor}`,
                cursor: "pointer",
              }}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>{TYPE_ICONS[msg.type] || ""}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: C.text, lineHeight: 1.5, margin: 0 }}>{msg.message}</p>
                  <span style={{ fontSize: 10, color: C.dim }}>{timeAgo(msg.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes av-slide-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes av-expand{from{max-height:60px;opacity:0.8}to{max-height:400px;opacity:1}}
      `}</style>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
