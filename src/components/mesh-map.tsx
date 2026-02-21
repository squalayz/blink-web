"use client";
import { useState, useRef, useEffect, useCallback } from "react";

const C = {
  bg:"#050508", surface:"#0a0a12", indigo:"#6366f1", cyan:"#06b6d4",
  purple:"#a855f7", match:"#30d158", gold:"#ffd700", text:"#e8e8f0",
  muted:"#6b6b80", dim:"#2a2a3a",
};

const CLUSTERS: Record<string, { color: string; x: number; y: number; icon: string }> = {
  tech: { color: "#6366f1", x: 0.3, y: 0.3, icon: "" },
  finance: { color: "#f59e0b", x: 0.7, y: 0.25, icon: "" },
  health: { color: "#10b981", x: 0.2, y: 0.65, icon: "" },
  creative: { color: "#ec4899", x: 0.5, y: 0.7, icon: "" },
  web3: { color: "#a855f7", x: 0.75, y: 0.6, icon: "⛓️" },
  ecommerce: { color: "#06b6d4", x: 0.55, y: 0.4, icon: "🛒" },
  education: { color: "#3b82f6", x: 0.35, y: 0.5, icon: "📚" },
};

interface MeshAgent {
  id: string;
  name: string;
  industry: string;
  rank?: number;
  isMe?: boolean;
}

interface MeshMapProps {
  agents: MeshAgent[];
  myIndustry: string;
  myId: string;
  onAgentClick?: (id: string) => void;
}

export default function MeshMap({ agents, myIndustry, myId, onAgentClick }: MeshMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [hovered, setHovered] = useState<MeshAgent | null>(null);
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const frameRef = useRef(0);
  const timeRef = useRef(0);

  // Count per cluster
  const clusterCounts: Record<string, number> = {};
  agents.forEach(a => { clusterCounts[a.industry] = (clusterCounts[a.industry] || 0) + 1; });

  // Assign positions to agents (deterministic hash around cluster center)
  const agentPositions = useCallback(() => {
    return agents.map((agent, i) => {
      const cluster = CLUSTERS[agent.industry] || CLUSTERS.tech;
      const hash = (i * 2654435761) & 0xffffffff;
      const angle = (hash % 360) * (Math.PI / 180);
      const dist = 30 + (hash % 60);
      return {
        ...agent,
        x: cluster.x * 600 + Math.cos(angle) * dist,
        y: cluster.y * 600 + Math.sin(angle) * dist,
        color: cluster.color,
      };
    });
  }, [agents]);

  // ── Render loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const positions = agentPositions();
    let animFrame: number;

    function draw() {
      timeRef.current += 0.02;
      const w = canvas!.width, h = canvas!.height;
      ctx!.clearRect(0, 0, w, h);

      ctx!.save();
      ctx!.translate(w / 2 + panX, h / 2 + panY);
      ctx!.scale(zoom, zoom);
      ctx!.translate(-300, -300); // Center the 600x600 map

      // Draw cluster labels
      Object.entries(CLUSTERS).forEach(([industry, cl]) => {
        const count = clusterCounts[industry] || 0;
        const cx = cl.x * 600, cy = cl.y * 600;

        // Cluster halo
        ctx!.fillStyle = cl.color + "08";
        ctx!.beginPath();
        ctx!.arc(cx, cy, 80 + count * 0.5, 0, Math.PI * 2);
        ctx!.fill();

        // Label
        ctx!.textAlign = "center";
        ctx!.font = "bold 11px system-ui";
        ctx!.fillStyle = cl.color + "88";
        ctx!.fillText(`${cl.icon} ${industry}`, cx, cy - 90);
        ctx!.font = "500 9px system-ui";
        ctx!.fillStyle = C.dim;
        ctx!.fillText(`${count} agents`, cx, cy - 76);
      });

      // Draw connections (random pairs for visual density)
      ctx!.strokeStyle = "rgba(255,255,255,0.03)";
      ctx!.lineWidth = 0.5;
      for (let i = 0; i < Math.min(positions.length, 100); i += 3) {
        const a = positions[i];
        const b = positions[(i + 7) % positions.length];
        if (a.industry === b.industry) {
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.stroke();
        }
      }

      // Draw agents
      positions.forEach(agent => {
        const isMe = agent.id === myId;
        const r = isMe ? 6 : 3;
        const t = timeRef.current;

        // Agent dot
        ctx!.fillStyle = isMe ? agent.color : agent.color + "88";
        ctx!.beginPath();
        ctx!.arc(agent.x, agent.y, r, 0, Math.PI * 2);
        ctx!.fill();

        // My beacon pulse
        if (isMe) {
          const pulse = Math.sin(t * 3) * 0.3 + 0.7;
          ctx!.strokeStyle = agent.color + Math.round(pulse * 80).toString(16).padStart(2, "0");
          ctx!.lineWidth = 1.5;
          ctx!.beginPath();
          ctx!.arc(agent.x, agent.y, r + 4 + Math.sin(t * 2) * 3, 0, Math.PI * 2);
          ctx!.stroke();

          // Crown for #1
          if (agent.rank === 1) {
            ctx!.font = "12px system-ui";
            ctx!.fillText("", agent.x - 6, agent.y - 14);
          }
        }
      });

      ctx!.restore();
      animFrame = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animFrame);
  }, [agentPositions, zoom, panX, panY, clusterCounts, myId]);

  // ── Mouse/touch handlers ──
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom(z => Math.max(0.5, Math.min(4, z - e.deltaY * 0.001)));
  }

  function handlePointerDown(e: React.PointerEvent) {
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setPanX(p => p + (e.clientX - lastPos.current.x));
    setPanY(p => p + (e.clientY - lastPos.current.y));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }

  function shareCluster() {
    const count = clusterCounts[myIndustry] || 0;
    const text = `I'm in the ${myIndustry} cluster with ${count} other agents on @MishMesh_ai \n\nExplore the mesh: mishmesh.ai`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: `1px solid ${C.dim}` }}>
      <canvas ref={canvasRef} width={600} height={600}
        style={{ width: "100%", height: 400, background: C.bg, cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
      />

      {/* Controls overlay */}
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 4 }}>
        <button onClick={() => setZoom(z => Math.min(4, z + 0.3))} style={zoomBtnStyle}>+</button>
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.3))} style={zoomBtnStyle}>−</button>
        <button onClick={() => { setZoom(1); setPanX(0); setPanY(0); }} style={zoomBtnStyle}>⟳</button>
      </div>

      {/* Share button */}
      <div style={{ position: "absolute", bottom: 12, left: 12 }}>
        <button onClick={shareCluster} style={{
          padding: "6px 14px", borderRadius: 8,
          background: "rgba(10,10,18,0.8)", border: `1px solid ${C.dim}`,
          backdropFilter: "blur(8px)", color: C.text, fontSize: 12, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit",
        }}>↗ Share my cluster</button>
      </div>

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 12, right: 12,
        background: "rgba(10,10,18,0.8)", backdropFilter: "blur(8px)",
        borderRadius: 8, padding: "6px 10px", display: "flex", gap: 8, flexWrap: "wrap",
      }}>
        {Object.entries(CLUSTERS).slice(0, 5).map(([ind, cl]) => (
          <span key={ind} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: C.muted }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: cl.color }} />
            {ind}
          </span>
        ))}
      </div>
    </div>
  );
}

const zoomBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6, border: "none",
  background: "rgba(10,10,18,0.8)", color: "#e8e8f0", fontSize: 16,
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  backdropFilter: "blur(8px)",
};
