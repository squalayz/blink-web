"use client";
import { useRef, useEffect, useCallback } from "react";

const C = {
  bg:"#050508", surface:"#0a0a12", s2:"#111118",
  indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", gold:"#ffd700", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
};

const ROLE_COLORS: Record<string, string> = {
  "Founder": C.gold,
  "Technical Lead": C.indigo,
  "Design Lead": C.purple,
  "Growth Lead": C.match,
  "Domain Expert": C.cyan,
  "default": "#8b5cf6",
};

interface VentureMember {
  name: string;
  role: string;
  fit_score: number;
  avatar_url?: string;
  status: string;
}

interface VentureCardProps {
  name: string;
  description: string;
  members: VentureMember[];
  synergy: number;
  totalFunded: number;
  fundingGoal?: number;
  status: string;
  onClick?: () => void;
  compact?: boolean;
}

export default function VentureCard({ name, description, members, synergy, totalFunded, fundingGoal, status, onClick, compact }: VentureCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = compact ? 120 : 180;
    canvas.width = size * 2; canvas.height = size * 2;
    ctx.scale(2, 2); // Retina
    timeRef.current += 0.03;
    const t = timeRef.current;
    const cx = size / 2, cy = size / 2;

    ctx.clearRect(0, 0, size, size);

    // ── Nucleus (center orb) ──
    const nucleusR = compact ? 14 : 20;
    const fundedGlow = totalFunded > 0 ? Math.min(1, totalFunded / (fundingGoal || 1)) : 0;
    const nucleusColor = status === "funded" || status === "building" ? C.gold : C.indigo;

    // Nucleus glow
    const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, nucleusR + 12 + fundedGlow * 8);
    ng.addColorStop(0, nucleusColor + "44");
    ng.addColorStop(1, "transparent");
    ctx.fillStyle = ng;
    ctx.beginPath();
    ctx.arc(cx, cy, nucleusR + 12 + fundedGlow * 8, 0, Math.PI * 2);
    ctx.fill();

    // Nucleus core
    const nc = ctx.createRadialGradient(cx - nucleusR * 0.2, cy - nucleusR * 0.2, 0, cx, cy, nucleusR);
    nc.addColorStop(0, nucleusColor);
    nc.addColorStop(1, nucleusColor + "66");
    ctx.fillStyle = nc;
    ctx.beginPath();
    ctx.arc(cx, cy, nucleusR, 0, Math.PI * 2);
    ctx.fill();

    // ⚡ inside nucleus
    ctx.fillStyle = "white";
    ctx.font = `bold ${compact ? 10 : 14}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚡", cx, cy);

    // ── Team member orbs ──
    const memberCount = Math.max(members.length, 1);
    const orbitR = compact ? 38 : 58;

    members.forEach((m, i) => {
      const angle = (i / memberCount) * Math.PI * 2 - Math.PI / 2 + Math.sin(t + i) * 0.05;
      const mx = cx + Math.cos(angle) * orbitR;
      const my = cy + Math.sin(angle) * orbitR;
      const mr = compact ? 8 : 12;
      const color = ROLE_COLORS[m.role] || ROLE_COLORS.default;
      const accepted = m.status === "accepted" || m.status === "locked";

      // Connection line to nucleus
      ctx.strokeStyle = accepted ? `${color}44` : `${color}15`;
      ctx.lineWidth = accepted ? 1.5 : 0.5;
      ctx.setLineDash(accepted ? [] : [3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(mx, my);
      ctx.stroke();
      ctx.setLineDash([]);

      // Connection lines between adjacent members
      if (i > 0) {
        const prevAngle = ((i - 1) / memberCount) * Math.PI * 2 - Math.PI / 2 + Math.sin(t + i - 1) * 0.05;
        const px = cx + Math.cos(prevAngle) * orbitR;
        const py = cy + Math.sin(prevAngle) * orbitR;
        ctx.strokeStyle = `${C.dim}44`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(px, py);
        ctx.stroke();
      }

      // Member orb glow
      if (accepted) {
        ctx.fillStyle = color + "22";
        ctx.beginPath();
        ctx.arc(mx, my, mr + 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Member orb
      const mg = ctx.createRadialGradient(mx - mr * 0.2, my - mr * 0.2, 0, mx, my, mr);
      mg.addColorStop(0, color);
      mg.addColorStop(1, color + (accepted ? "88" : "33"));
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();

      // Dashed border for pending
      if (!accepted) {
        ctx.strokeStyle = color + "44";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // ── Orbit ring ──
    ctx.strokeStyle = C.dim + "33";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
    ctx.stroke();

  }, [members, totalFunded, fundingGoal, status, compact]);

  useEffect(() => {
    draw();
    const iv = setInterval(draw, 50);
    return () => clearInterval(iv);
  }, [draw]);

  const statusColors: Record<string, string> = {
    drafting: C.muted, assembling: C.purple, reviewing: C.cyan,
    active: C.indigo, funded: C.gold, building: C.match,
    completed: C.match, archived: C.dim,
  };

  return (
    <div onClick={onClick} style={{
      background: C.surface, border: `1px solid ${C.dim}`,
      borderRadius: 16, padding: compact ? 12 : 20, cursor: onClick ? "pointer" : "default",
      transition: "all 0.2s", display: "flex", gap: compact ? 12 : 16,
      alignItems: compact ? "center" : "flex-start",
    }}>
      {/* Constellation canvas */}
      <canvas ref={canvasRef} style={{
        width: compact ? 120 : 180, height: compact ? 120 : 180, flexShrink: 0,
      }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Status badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 6,
            background: `${statusColors[status] || C.muted}15`,
            color: statusColors[status] || C.muted,
            fontWeight: 700, textTransform: "uppercase",
          }}>{status}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: C.gold }}>{synergy.toFixed(1)}%</span>
        </div>

        {/* Name */}
        <h3 style={{ fontSize: compact ? 14 : 18, fontWeight: 800, color: C.text, marginBottom: 4, lineHeight: 1.3 }}>{name}</h3>

        {/* Description */}
        {!compact && (
          <p style={{
            fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 10,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden",
          }}>{description}</p>
        )}

        {/* Team */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: compact ? 0 : 10 }}>
          {members.map((m, i) => (
            <span key={i} style={{
              fontSize: 10, padding: "2px 6px", borderRadius: 4,
              background: `${ROLE_COLORS[m.role] || ROLE_COLORS.default}15`,
              color: ROLE_COLORS[m.role] || ROLE_COLORS.default,
              fontWeight: 600,
            }}>{m.name || m.role}</span>
          ))}
        </div>

        {/* Funding bar */}
        {!compact && fundingGoal && fundingGoal > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: C.muted }}>Funded</span>
              <span style={{ color: C.gold, fontWeight: 700 }}>{totalFunded.toFixed(3)} / {fundingGoal} ETH</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: C.dim, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2,
                background: `linear-gradient(90deg, ${C.indigo}, ${C.gold})`,
                width: `${Math.min(100, (totalFunded / fundingGoal) * 100)}%`,
                transition: "width 0.5s",
              }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
