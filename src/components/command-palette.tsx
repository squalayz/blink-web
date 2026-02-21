"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const C = {
  bg:"#0a0a0f", surface:"#0d0d14", s2:"#111118",
  indigo:"#6366f1", cyan:"#06b6d4", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
};

interface CmdItem {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  section: string;
  keywords?: string;
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items: CmdItem[] = [
    // Navigation
    { id: "dash", label: "Dashboard", icon: "", action: () => router.push("/dashboard"), section: "Navigate", keywords: "home overview" },
    { id: "matches", label: "Matches", icon: "", action: () => router.push("/dashboard#matches"), section: "Navigate", keywords: "connections people" },
    { id: "chat", label: "Chat", icon: "", action: () => router.push("/dashboard#chat"), section: "Navigate", keywords: "messages" },
    { id: "wallet", label: "Wallet", icon: "", action: () => router.push("/dashboard#wallet"), section: "Navigate", keywords: "balance fund eth" },
    { id: "lb", label: "Leaderboard", icon: "", action: () => router.push("/leaderboard"), section: "Navigate", keywords: "ranking top" },
    { id: "ventures", label: "My Ventures", icon: "", action: () => router.push("/dashboard/ventures"), section: "Navigate", keywords: "team startup company build" },
    { id: "explore-v", label: "Explore Ventures", icon: "", action: () => router.push("/explore/ventures"), section: "Navigate", keywords: "invest fund browse" },
    { id: "fusions", label: "My Fusions", icon: "", action: () => router.push("/dashboard/fusions"), section: "Navigate", keywords: "fusion agent hybrid merge" },
    { id: "lineage", label: "Bloodline", icon: "", action: () => router.push("/dashboard/lineage"), section: "Navigate", keywords: "lineage tree family ancestry" },
    { id: "marketplace", label: "Token Marketplace", icon: "", action: () => router.push("/marketplace"), section: "Navigate", keywords: "token buy sell trade bonding curve" },
    { id: "portfolio", label: "My Portfolio", icon: "", action: () => router.push("/dashboard/portfolio"), section: "Navigate", keywords: "portfolio holdings pnl profit" },
    { id: "token-leaders", label: "Token Leaderboard", icon: "", action: () => router.push("/marketplace/leaderboard"), section: "Navigate", keywords: "leaderboard top tokens volume" },
    { id: "agent-minds", label: "Agent Minds Leaderboard", icon: "", action: () => router.push("/agents/leaderboard"), section: "Navigate", keywords: "personality evolved quirks minds agents" },
    { id: "personality", label: "Agent Personality", icon: "", action: () => router.push("/dashboard#personality"), section: "Navigate", keywords: "soul quirks mood evolution radar" },
    { id: "profile", label: "Edit Profile", icon: "👤", action: () => router.push("/dashboard#profile"), section: "Navigate", keywords: "bio settings" },
    // Actions
    { id: "fund", label: "Fund Agent", icon: "", action: () => router.push("/dashboard#fund"), section: "Actions", keywords: "deposit eth" },
    { id: "apikey", label: "Update API Key", icon: "", action: () => router.push("/dashboard#brain"), section: "Actions", keywords: "openai anthropic brain" },
    { id: "notif", label: "Notification Settings", icon: "", action: () => router.push("/dashboard#notifications"), section: "Actions", keywords: "alerts email telegram" },
    { id: "connect", label: "Connected Accounts", icon: "", action: () => router.push("/dashboard#accounts"), section: "Actions", keywords: "twitter instagram social" },
    { id: "invite", label: "Invite Someone", icon: "📨", action: () => router.push("/dashboard#invite"), section: "Actions", keywords: "referral share friend" },
    // Links
    { id: "terms", label: "Terms of Service", icon: "📄", action: () => router.push("/terms"), section: "Legal" },
    { id: "privacy", label: "Privacy Policy", icon: "", action: () => router.push("/privacy"), section: "Legal" },
  ];

  const filtered = query.length === 0 ? items : items.filter(item => {
    const q = query.toLowerCase();
    return item.label.toLowerCase().includes(q) || (item.keywords || "").includes(q);
  });

  // ── Keyboard listeners ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery("");
        setSelectedIdx(0);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => { setSelectedIdx(0); }, [query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && filtered[selectedIdx]) { filtered[selectedIdx].action(); setOpen(false); }
  }, [filtered, selectedIdx]);

  if (!open) return null;

  // Group by section
  const sections: Record<string, CmdItem[]> = {};
  filtered.forEach(item => {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  });
  let flatIdx = 0;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", justifyContent: "center", paddingTop: "20vh",
    }} onClick={() => setOpen(false)}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 480, maxWidth: "92vw", background: C.surface,
        border: `1px solid ${C.dim}`, borderRadius: 16,
        overflow: "hidden", animation: "cmd-in 0.15s ease-out",
        maxHeight: "60vh", display: "flex", flexDirection: "column",
      }}>
        {/* Search input */}
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.dim}`, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: C.muted, fontSize: 16 }}>⌘</span>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Search commands, pages, settings..."
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: C.text, fontSize: 15, fontFamily: "'Outfit',sans-serif",
            }} />
          <kbd style={{ padding: "2px 6px", borderRadius: 4, background: C.dim, color: C.muted, fontSize: 10, fontFamily: "monospace" }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: C.muted, fontSize: 13 }}>No results found</div>
          )}
          {Object.entries(sections).map(([section, items]) => (
            <div key={section}>
              <div style={{ padding: "8px 16px 4px", fontSize: 10, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{section}</div>
              {items.map(item => {
                const idx = flatIdx++;
                return (
                  <button key={item.id} onClick={() => { item.action(); setOpen(false); }}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 16px", border: "none", fontFamily: "inherit",
                      background: idx === selectedIdx ? `${C.indigo}15` : "transparent",
                      color: C.text, fontSize: 14, cursor: "pointer", textAlign: "left",
                      borderLeft: idx === selectedIdx ? `2px solid ${C.indigo}` : "2px solid transparent",
                    }}>
                    <span style={{ fontSize: 16, width: 24 }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {idx === selectedIdx && <span style={{ fontSize: 10, color: C.muted }}>↵</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{ padding: "8px 16px", borderTop: `1px solid ${C.dim}`, display: "flex", gap: 12 }}>
          {[["↑↓", "Navigate"], ["↵", "Select"], ["esc", "Close"]].map(([key, label]) => (
            <span key={label} style={{ fontSize: 10, color: C.dim }}>
              <kbd style={{ padding: "1px 4px", borderRadius: 3, background: C.dim, marginRight: 3, fontFamily: "monospace" }}>{key}</kbd>{label}
            </span>
          ))}
        </div>
      </div>

      <style>{`@keyframes cmd-in{from{opacity:0;transform:translateY(-8px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
    </div>
  );
}
