"use client";

const C = {
  bg:"#0a0a0f", surface:"#111118", s2:"#1a1a24",
  dim:"#2a2a3a", border:"rgba(255,255,255,0.04)",
};

// ── Shimmer bar component ──
function Shimmer({ width = "100%", height = 14, radius = 6, style }: {
  width?: string | number; height?: number; radius?: number; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width, height, borderRadius: radius, background: C.dim,
      position: "relative", overflow: "hidden", ...style,
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
        animation: "skel-shimmer 1.5s infinite",
      }} />
    </div>
  );
}

// ═══ DASHBOARD SKELETON ═══
export function DashboardSkeleton() {
  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      {/* Agent voice placeholder */}
      <div style={{ display: "flex", gap: 12, padding: 14, borderRadius: 14, background: C.s2, marginBottom: 16 }}>
        <Shimmer width={32} height={32} radius={16} />
        <div style={{ flex: 1 }}>
          <Shimmer width={80} height={10} style={{ marginBottom: 6 }} />
          <Shimmer width="90%" height={12} style={{ marginBottom: 4 }} />
          <Shimmer width="60%" height={12} />
        </div>
      </div>
      {/* Stats row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, padding: 14, borderRadius: 12, background: C.s2 }}>
            <Shimmer width={40} height={24} style={{ marginBottom: 6 }} />
            <Shimmer width="70%" height={10} />
          </div>
        ))}
      </div>
      {/* Match cards */}
      {[1,2,3].map(i => (
        <div key={i} style={{ display: "flex", gap: 12, padding: 14, borderRadius: 12, background: C.s2, marginBottom: 8 }}>
          <Shimmer width={44} height={44} radius={22} />
          <div style={{ flex: 1 }}>
            <Shimmer width={120} height={14} style={{ marginBottom: 6 }} />
            <Shimmer width="80%" height={11} />
          </div>
          <Shimmer width={50} height={24} radius={8} />
        </div>
      ))}
      <Sty />
    </div>
  );
}

// ═══ MATCHES SKELETON ═══
export function MatchesSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ display: "flex", gap: 12, padding: 14, borderRadius: 12, background: C.s2, marginBottom: 8 }}>
          <Shimmer width={48} height={48} radius={24} />
          <div style={{ flex: 1 }}>
            <Shimmer width={100} height={14} style={{ marginBottom: 6 }} />
            <Shimmer width="60%" height={11} style={{ marginBottom: 4 }} />
            <Shimmer width="40%" height={10} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <Shimmer width={40} height={18} radius={6} />
            <Shimmer width={60} height={10} />
          </div>
        </div>
      ))}
      <Sty />
    </div>
  );
}

// ═══ CHAT SKELETON ═══
export function ChatSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Shimmer width={36} height={36} radius={18} />
        <div>
          <Shimmer width={100} height={14} style={{ marginBottom: 4 }} />
          <Shimmer width={60} height={10} />
        </div>
      </div>
      {/* Messages */}
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ display: "flex", justifyContent: i % 2 ? "flex-start" : "flex-end", marginBottom: 8 }}>
          <div style={{ maxWidth: "60%", padding: 12, borderRadius: 12, background: C.s2 }}>
            <Shimmer width={140 + Math.random() * 60} height={12} style={{ marginBottom: 4 }} />
            {i % 3 === 0 && <Shimmer width={80} height={12} />}
          </div>
        </div>
      ))}
      <Sty />
    </div>
  );
}

// ═══ WALLET SKELETON ═══
export function WalletSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      {/* Balance card */}
      <div style={{ padding: 20, borderRadius: 14, background: C.s2, marginBottom: 16, textAlign: "center" }}>
        <Shimmer width={80} height={10} style={{ margin: "0 auto 8px" }} />
        <Shimmer width={120} height={28} style={{ margin: "0 auto 6px" }} />
        <Shimmer width={60} height={12} style={{ margin: "0 auto" }} />
      </div>
      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Shimmer height={40} radius={10} style={{ flex: 1 }} />
        <Shimmer height={40} radius={10} style={{ flex: 1 }} />
      </div>
      {/* Transaction list */}
      {[1,2,3].map(i => (
        <div key={i} style={{ display: "flex", gap: 12, padding: 12, borderBottom: `1px solid ${C.border}` }}>
          <Shimmer width={32} height={32} radius={8} />
          <div style={{ flex: 1 }}>
            <Shimmer width={100} height={12} style={{ marginBottom: 4 }} />
            <Shimmer width={60} height={10} />
          </div>
          <Shimmer width={50} height={14} />
        </div>
      ))}
      <Sty />
    </div>
  );
}

function Sty() {
  return <style>{`@keyframes skel-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>;
}
