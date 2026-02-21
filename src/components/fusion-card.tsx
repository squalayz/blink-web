"use client";
import { STATUS_COLORS, STATUS_LABELS, GEN_COLORS, type Fusion, type FusionDNA } from "@/lib/fusion-types";

const C = {
  bg:"#0a0a0a", card:"#141414", border:"#222", text:"#fafafa",
  muted:"#a1a1aa", dim:"#333", violet:"#8b5cf6",
};

interface FusionCardProps {
  fusion: Fusion;
  onClick?: () => void;
  compact?: boolean;
}

export default function FusionCard({ fusion, onClick, compact }: FusionCardProps) {
  const dna = fusion.dna as FusionDNA;
  const genColor = GEN_COLORS[Math.min(fusion.generation - 1, 4)];
  const statusColor = STATUS_COLORS[fusion.status];

  return (
    <div onClick={onClick} style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: compact ? 14 : 18, cursor: onClick ? "pointer" : "default",
      transition: "border-color 0.2s, transform 0.2s",
    }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {/* Fusion avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: compact ? 44 : 52, height: compact ? 44 : 52, borderRadius: 14,
            background: `linear-gradient(135deg, ${genColor}33, ${genColor}11)`,
            border: `2px solid ${genColor}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: compact ? 20 : 24,
          }}>
            {fusion.status === "gestating" ? "🥚" : fusion.status === "active" ? "⚡" : fusion.status === "dissolved" ? "💨" : "🧬"}
          </div>
          {/* Generation badge */}
          <div style={{
            position: "absolute", top: -4, right: -4, width: 18, height: 18,
            borderRadius: "50%", background: genColor, color: "white",
            fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${C.card}`,
          }}>G{fusion.generation}</div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <h3 style={{ fontSize: compact ? 14 : 16, fontWeight: 700, color: C.text, margin: 0 }}>{fusion.name}</h3>
            {/* Status pill */}
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 6,
              background: `${statusColor}15`, color: statusColor,
              fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
            }}>{STATUS_LABELS[fusion.status]}</span>
          </div>

          {/* Goal */}
          {fusion.goal && !compact && (
            <p style={{
              fontSize: 13, color: C.muted, lineHeight: 1.5, margin: "0 0 8px",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden",
            }}>{fusion.goal}</p>
          )}

          {/* DNA trait pills */}
          {!compact && dna?.traits && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
              {Object.entries(dna.traits).slice(0, 4).map(([trait, value]) => (
                <span key={trait} style={{
                  fontSize: 10, padding: "2px 6px", borderRadius: 4,
                  background: `${C.violet}11`, color: C.violet,
                  fontWeight: 600,
                }}>{trait}: {((value as number) * 100).toFixed(0)}%</span>
              ))}
            </div>
          )}

          {/* Bottom row: parents + performance */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* Parent avatars */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {[fusion.parent_a, fusion.parent_b].filter(Boolean).map((p: any, i) => (
                <div key={i} style={{
                  width: 20, height: 20, borderRadius: 6,
                  background: C.dim, overflow: "hidden", border: `1px solid ${C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: C.muted,
                }}>
                  {p?.avatar_url ? <img src={p.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : p?.name?.[0] || "?"}
                </div>
              ))}
              <span style={{ fontSize: 10, color: C.dim, marginLeft: 4 }}>
                {fusion.parent_a?.name} × {fusion.parent_b?.name}
              </span>
            </div>

            {/* Performance score */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 32, height: 4, borderRadius: 2, background: C.dim, overflow: "hidden",
              }}>
                <div style={{
                  width: `${fusion.performance_score}%`, height: "100%", borderRadius: 2,
                  background: fusion.performance_score >= 70 ? "#22c55e" : fusion.performance_score >= 40 ? "#eab308" : "#ef4444",
                }} />
              </div>
              <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>
                {fusion.performance_score?.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gestating progress bar */}
      {fusion.status === "gestating" && fusion.gestating_at && (
        <div style={{ marginTop: 10 }}>
          <GestatingBar startedAt={fusion.gestating_at} />
        </div>
      )}
    </div>
  );
}

function GestatingBar({ startedAt }: { startedAt: string }) {
  const elapsed = Date.now() - new Date(startedAt).getTime();
  const total = 24 * 60 * 60 * 1000;
  const pct = Math.min(100, (elapsed / total) * 100);
  const hoursLeft = Math.max(0, Math.ceil((total - elapsed) / 3600000));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "#3b82f6" }}>Gestating...</span>
        <span style={{ fontSize: 10, color: C.muted }}>{hoursLeft}h remaining</span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: C.dim, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 2,
          background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
          animation: "fusion-gestate 2s infinite",
        }} />
      </div>
      <style>{`@keyframes fusion-gestate{0%,100%{opacity:0.7}50%{opacity:1}}`}</style>
    </div>
  );
}
