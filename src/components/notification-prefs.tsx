"use client";
import { useState, useEffect } from "react";

const C = {
  bg:"#0a0a0f", surface:"#111118", s2:"#1a1a24",
  indigo:"#6366f1", cyan:"#06b6d4", match:"#30d158",
  text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a", hot:"#ff2d55",
};

interface NotifPrefs {
  frequency: "realtime" | "daily" | "weekly" | "critical";
  push_enabled: boolean;
  email_enabled: boolean;
  telegram_enabled: boolean;
  notify_matches: boolean;
  notify_messages: boolean;
  notify_low_balance: boolean;
  notify_trades: boolean;
  notify_leaderboard: boolean;
  notify_mesh_growth: boolean;
}

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<NotifPrefs>({
    frequency: "smart" as any, push_enabled: true, email_enabled: false,
    telegram_enabled: false, notify_matches: true, notify_messages: true,
    notify_low_balance: true, notify_trades: true, notify_leaderboard: false,
    notify_mesh_growth: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_notification_prefs" }),
    }).then(r => r.json()).then(d => { if (d.prefs) setPrefs(d.prefs); }).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_notification_prefs", prefs }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) {}
    setSaving(false);
  }

  const frequencies = [
    { id: "realtime", label: "Real-time", desc: "Instant for everything", icon: "" },
    { id: "daily", label: "Daily Digest", desc: "Summary each morning", icon: "📬" },
    { id: "weekly", label: "Weekly", desc: "One email per week", icon: "" },
    { id: "critical", label: "Critical Only", desc: "Matches + low balance only", icon: "" },
  ] as const;

  const categories = [
    { key: "notify_matches" as const, label: "New Matches", desc: "When your agent finds a match", icon: "", urgent: true },
    { key: "notify_messages" as const, label: "Messages", desc: "New chat messages", icon: "", urgent: true },
    { key: "notify_low_balance" as const, label: "Low Balance", desc: "When agent funds run low", icon: "", urgent: true },
    { key: "notify_trades" as const, label: "Trading Activity", desc: "P&L updates and trades", icon: "", urgent: false },
    { key: "notify_leaderboard" as const, label: "Leaderboard", desc: "Rank changes", icon: "", urgent: false },
    { key: "notify_mesh_growth" as const, label: "Mesh Growth", desc: "New agents in your industry", icon: "", urgent: false },
  ];

  return (
    <div style={{ maxWidth: 480 }}>
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Notifications</h3>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Control how and when your agent reaches you.</p>

      {/* ── Frequency picker ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Frequency</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {frequencies.map(f => (
            <button key={f.id} onClick={() => setPrefs({ ...prefs, frequency: f.id })} style={{
              padding: "12px 14px", borderRadius: 12, border: `1px solid ${prefs.frequency === f.id ? C.indigo : C.dim}`,
              background: prefs.frequency === f.id ? `${C.indigo}15` : "transparent",
              cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 14 }}>{f.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: prefs.frequency === f.id ? C.indigo : C.text }}>{f.label}</span>
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>{f.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Channels ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Channels</div>
        <Toggle label="Push Notifications" desc="Browser notifications" checked={prefs.push_enabled} onChange={v => setPrefs({ ...prefs, push_enabled: v })} />
        <Toggle label="Email" desc="Requires connected email" checked={prefs.email_enabled} onChange={v => setPrefs({ ...prefs, email_enabled: v })} />
        <Toggle label="Telegram" desc="Via @MishMeshBot" checked={prefs.telegram_enabled} onChange={v => setPrefs({ ...prefs, telegram_enabled: v })} />
      </div>

      {/* ── Categories ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>What to notify</div>
        {categories.map(cat => (
          <Toggle key={cat.key} label={`${cat.icon} ${cat.label}`} desc={cat.desc}
            checked={prefs[cat.key]} onChange={v => setPrefs({ ...prefs, [cat.key]: v })}
            locked={cat.urgent && prefs.frequency === "critical"} />
        ))}
      </div>

      {/* Save */}
      <button onClick={save} disabled={saving} style={{
        width: "100%", padding: 12, borderRadius: 10, border: "none",
        background: saved ? C.match : `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`,
        color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        transition: "all 0.2s",
      }}>{saved ? "✓ Saved" : saving ? "Saving..." : "Save Preferences"}</button>
    </div>
  );
}

function Toggle({ label, desc, checked, onChange, locked }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; locked?: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 0", borderBottom: `1px solid ${C.dim}`,
      opacity: locked ? 0.5 : 1,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</div>
        <div style={{ fontSize: 11, color: C.muted }}>{desc}</div>
      </div>
      <button onClick={() => !locked && onChange(!checked)} style={{
        width: 40, height: 22, borderRadius: 11, border: "none", cursor: locked ? "not-allowed" : "pointer",
        background: checked ? C.indigo : C.dim, position: "relative", transition: "background 0.2s",
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: "50%", background: "white",
          position: "absolute", top: 2, left: checked ? 20 : 2,
          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </button>
    </div>
  );
}
