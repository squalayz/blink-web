"use client";

const C = {
  bg:"#0a0a0f", indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", gold:"#ffd700", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
};

type LoadingType = "dashboard" | "matches" | "chat" | "wallet" | "generic";

export default function MeshLoader({ type = "generic", message }: { type?: LoadingType; message?: string }) {
  const configs: Record<LoadingType, { emoji: string; label: string; color: string; anim: string }> = {
    dashboard: { emoji: "", label: message || "Syncing your agent...", color: C.indigo, anim: "loader-spin" },
    matches: { emoji: "", label: message || "Finding connections...", color: C.purple, anim: "loader-approach" },
    chat: { emoji: "", label: message || "Opening channel...", color: C.cyan, anim: "loader-line" },
    wallet: { emoji: "", label: message || "Loading balance...", color: C.match, anim: "loader-flow" },
    generic: { emoji: "", label: message || "Loading...", color: C.indigo, anim: "loader-spin" },
  };
  const cfg = configs[type];

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 48, minHeight: 200,
    }}>
      {/* ═══ ORB ANIMATIONS ═══ */}
      {type === "dashboard" && (
        <div style={{ width: 80, height: 80, position: "relative", marginBottom: 20 }}>
          <div style={{
            width: "100%", height: "100%", borderRadius: "50%",
            background: `radial-gradient(circle at 40% 40%, ${C.indigo}, ${C.indigo}44)`,
            boxShadow: `0 0 20px ${C.indigo}40`,
            animation: "loader-orb-spin 2s ease-in-out infinite",
          }} />
          {/* Scanning lines */}
          {[0, 120, 240].map(deg => (
            <div key={deg} style={{
              position: "absolute", top: "50%", left: "50%", width: 60, height: 2,
              background: `linear-gradient(90deg, transparent, ${C.indigo}60, transparent)`,
              transformOrigin: "0 0", transform: `rotate(${deg}deg)`,
              animation: `loader-scan 2s ease-in-out infinite ${deg / 360}s`,
            }} />
          ))}
        </div>
      )}

      {type === "matches" && (
        <div style={{ width: 120, height: 60, position: "relative", marginBottom: 20 }}>
          {/* Two orbs approaching */}
          <div style={{
            position: "absolute", top: 10, width: 40, height: 40, borderRadius: "50%",
            background: `radial-gradient(circle, ${C.indigo}, ${C.indigo}66)`,
            boxShadow: `0 0 12px ${C.indigo}60`,
            animation: "loader-left 2s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", top: 10, right: 0, width: 40, height: 40, borderRadius: "50%",
            background: `radial-gradient(circle, ${C.cyan}, ${C.cyan}66)`,
            boxShadow: `0 0 12px ${C.cyan}60`,
            animation: "loader-right 2s ease-in-out infinite",
          }} />
          {/* Connection spark */}
          <div style={{
            position: "absolute", top: 26, left: "50%", transform: "translateX(-50%)",
            width: 8, height: 8, borderRadius: "50%", background: C.gold,
            boxShadow: `0 0 12px ${C.gold}`,
            animation: "loader-spark 2s ease-in-out infinite",
          }} />
        </div>
      )}

      {type === "chat" && (
        <div style={{ width: 100, height: 40, position: "relative", marginBottom: 20 }}>
          {/* Connection line forming */}
          <div style={{
            position: "absolute", top: "50%", left: 0, height: 2,
            background: `linear-gradient(90deg, ${C.indigo}, ${C.gold}, ${C.cyan})`,
            animation: "loader-line-grow 1.5s ease-in-out infinite",
            borderRadius: 1,
          }} />
          <div style={{
            position: "absolute", top: "calc(50% - 8px)", left: 0, width: 16, height: 16,
            borderRadius: "50%", background: C.indigo, boxShadow: `0 0 8px ${C.indigo}60`,
          }} />
          <div style={{
            position: "absolute", top: "calc(50% - 8px)", right: 0, width: 16, height: 16,
            borderRadius: "50%", background: C.cyan, boxShadow: `0 0 8px ${C.cyan}60`,
          }} />
        </div>
      )}

      {type === "wallet" && (
        <div style={{ width: 60, height: 60, position: "relative", marginBottom: 20 }}>
          <div style={{
            width: "100%", height: "100%", borderRadius: "50%",
            border: `2px solid ${C.match}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {/* ETH flowing */}
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                position: "absolute", fontSize: 14, color: C.match,
                animation: `loader-eth-float 1.5s ease-in-out infinite ${i * 0.5}s`,
                opacity: 0,
              }}>Ξ</div>
            ))}
          </div>
        </div>
      )}

      {type === "generic" && (
        <div style={{ width: 48, height: 48, marginBottom: 20 }}>
          <div style={{
            width: "100%", height: "100%", borderRadius: "50%",
            border: `3px solid ${C.dim}`, borderTopColor: C.indigo,
            animation: "loader-generic-spin 0.8s linear infinite",
          }} />
        </div>
      )}

      <div style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}>{cfg.label}</div>

      <style>{`
        @keyframes loader-orb-spin{0%,100%{transform:scale(1);opacity:0.8}50%{transform:scale(1.08);opacity:1}}
        @keyframes loader-scan{0%,100%{opacity:0;width:0}50%{opacity:1;width:60px}}
        @keyframes loader-left{0%,100%{left:0}50%{left:30px}}
        @keyframes loader-right{0%,100%{right:0}50%{right:30px}}
        @keyframes loader-spark{0%,30%,100%{opacity:0;transform:translateX(-50%) scale(0)}40%,60%{opacity:1;transform:translateX(-50%) scale(1.5)}}
        @keyframes loader-line-grow{0%{width:0}50%{width:100%}100%{width:0}}
        @keyframes loader-eth-float{0%{opacity:0;transform:translateY(10px)}50%{opacity:1;transform:translateY(-5px)}100%{opacity:0;transform:translateY(-20px)}}
        @keyframes loader-generic-spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
