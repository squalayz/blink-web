"use client";
import { useState, useEffect } from "react";

const C = {
  bg:"#0a0a0f", surface:"#111118", s2:"#1a1a24",
  indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", gold:"#ffd700", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
  hot:"#ff2d55",
};

const EVENT_THEMES: Record<string, { icon: string; color: string; bg: string; desc: string }> = {
  mesh_madness: { icon: "🌀", color: C.purple, bg: `${C.purple}08`, desc: "2× matching speed + bonus rewards" },
  speed_date: { icon: "⚡", color: C.gold, bg: `${C.gold}08`, desc: "All agents rapid-fire. Every Friday 8pm." },
  industry_clash: { icon: "⚔️", color: C.hot, bg: `${C.hot}08`, desc: "Tech vs Finance — which cluster wins?" },
  the_purge: { icon: "🔓", color: C.cyan, bg: `${C.cyan}08`, desc: "All filters removed. Wild cross-industry matching." },
  custom: { icon: "✨", color: C.indigo, bg: `${C.indigo}08`, desc: "Special event" },
};

interface SeasonalEvent {
  id: string;
  name: string;
  event_type: string;
  description: string;
  starts_at: string;
  ends_at: string;
  config: Record<string, any>;
}

export function EventBanner({ event }: { event: SeasonalEvent }) {
  const [timeLeft, setTimeLeft] = useState("");
  const theme = EVENT_THEMES[event.event_type] || EVENT_THEMES.custom;
  const now = Date.now();
  const start = new Date(event.starts_at).getTime();
  const end = new Date(event.ends_at).getTime();
  const isLive = now >= start && now < end;
  const isUpcoming = now < start;

  useEffect(() => {
    const iv = setInterval(() => {
      const target = isLive ? end : start;
      const diff = target - Date.now();
      if (diff <= 0) { setTimeLeft("NOW"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(iv);
  }, [isLive, start, end]);

  return (
    <div style={{
      background: theme.bg, border: `1px solid ${theme.color}22`,
      borderRadius: 14, padding: "14px 18px", marginBottom: 12,
      display: "flex", alignItems: "center", gap: 14,
      animation: isLive ? "event-pulse 3s infinite" : "none",
    }}>
      <span style={{ fontSize: 28, animation: isLive ? "event-icon 1s infinite alternate" : "none" }}>{theme.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: theme.color }}>{event.name}</span>
          {isLive && (
            <span style={{
              fontSize: 9, padding: "2px 8px", borderRadius: 6,
              background: theme.color, color: "white", fontWeight: 800,
              animation: "event-live 1.5s infinite",
            }}>LIVE</span>
          )}
          {isUpcoming && (
            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 6, background: C.dim, color: C.muted, fontWeight: 700 }}>SOON</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: C.muted }}>{event.description || theme.desc}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{isLive ? "Ends in" : "Starts in"}</div>
        <div style={{ fontSize: 16, fontWeight: 900, color: theme.color, fontFamily: "'JetBrains Mono',monospace" }}>{timeLeft}</div>
      </div>

      <style>{`
        @keyframes event-pulse{0%,100%{box-shadow:0 0 0 ${theme.color}00}50%{box-shadow:0 0 16px ${theme.color}15}}
        @keyframes event-icon{from{transform:scale(1)}to{transform:scale(1.1)}}
        @keyframes event-live{0%,100%{opacity:0.7}50%{opacity:1}}
      `}</style>
    </div>
  );
}

// ═══ EVENT LIST (settings/discovery) ═══
export function EventList({ events }: { events: SeasonalEvent[] }) {
  const live = events.filter(e => Date.now() >= new Date(e.starts_at).getTime() && Date.now() < new Date(e.ends_at).getTime());
  const upcoming = events.filter(e => Date.now() < new Date(e.starts_at).getTime());

  return (
    <div>
      {live.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>🔴 Live Now</div>
          {live.map(e => <EventBanner key={e.id} event={e} />)}
        </div>
      )}
      {upcoming.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>📅 Upcoming</div>
          {upcoming.map(e => <EventBanner key={e.id} event={e} />)}
        </div>
      )}
      {live.length === 0 && upcoming.length === 0 && (
        <div style={{ textAlign: "center", padding: 32, color: C.dim }}>No events scheduled. Check back soon.</div>
      )}
    </div>
  );
}
