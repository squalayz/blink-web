"use client";
import { useState, useMemo } from "react";
import { GEN_COLORS, STATUS_COLORS, type Fusion, type FusionStatus } from "@/lib/fusion-types";

const C = {
  bg:"#0a0a0a", card:"#141414", border:"#222", text:"#fafafa",
  muted:"#a1a1aa", dim:"#333", violet:"#8b5cf6",
};

interface TreeNode {
  id: string;
  name: string;
  type: "agent" | "fusion";
  generation: number;
  status?: FusionStatus;
  score?: number;
  children: string[];  // child fusion IDs
  parents: string[];   // parent IDs
  x: number;
  y: number;
}

interface LineageTreeProps {
  fusions: any[];
  lineage: any[];
  onNodeClick?: (id: string, type: "agent" | "fusion") => void;
}

export default function LineageTree({ fusions, lineage, onNodeClick }: LineageTreeProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [genFilter, setGenFilter] = useState(5); // Show up to this generation
  const [isMobile, setIsMobile] = useState(false);

  // Check mobile on mount
  useState(() => {
    if (typeof window !== "undefined") setIsMobile(window.innerWidth < 640);
  });

  // Build tree structure
  const { nodes, edges, maxGen } = useMemo(() => {
    const nodeMap = new Map<string, TreeNode>();
    const edgeList: Array<{ from: string; to: string; gen: number }> = [];
    let mg = 1;

    // Add fusion nodes
    fusions.forEach(f => {
      if (f.generation > genFilter) return;
      mg = Math.max(mg, f.generation);
      nodeMap.set(f.id, {
        id: f.id, name: f.name, type: "fusion",
        generation: f.generation, status: f.status,
        score: f.performance_score,
        children: [], parents: [], x: 0, y: 0,
      });
    });

    // Add agent nodes + edges from lineage
    lineage.forEach((l: any) => {
      const childId = l.child_id;
      const childNode = nodeMap.get(childId);
      if (!childNode) return;

      if (l.parent_agent_id && l.parent_agent?.id) {
        // Solo agent parent
        const agentId = l.parent_agent.id;
        if (!nodeMap.has(agentId)) {
          nodeMap.set(agentId, {
            id: agentId, name: l.parent_agent.name || "Agent", type: "agent",
            generation: 0, children: [], parents: [], x: 0, y: 0,
          });
        }
        nodeMap.get(agentId)!.children.push(childId);
        childNode.parents.push(agentId);
        edgeList.push({ from: agentId, to: childId, gen: childNode.generation });
      }

      if (l.parent_id && l.parent_fusion?.id) {
        // Fusion parent
        const parentId = l.parent_fusion.id;
        if (nodeMap.has(parentId)) {
          nodeMap.get(parentId)!.children.push(childId);
          childNode.parents.push(parentId);
          edgeList.push({ from: parentId, to: childId, gen: childNode.generation });
        }
      }
    });

    // Layout: group by generation, spread horizontally
    const genGroups: Map<number, string[]> = new Map();
    nodeMap.forEach((n, id) => {
      const gen = n.generation;
      if (!genGroups.has(gen)) genGroups.set(gen, []);
      genGroups.get(gen)!.push(id);
    });

    const sortedGens = Array.from(genGroups.keys()).sort((a, b) => a - b);
    sortedGens.forEach((gen, yi) => {
      const ids = genGroups.get(gen) || [];
      const spacing = 140;
      const startX = -(ids.length - 1) * spacing / 2;
      ids.forEach((id, xi) => {
        const node = nodeMap.get(id)!;
        node.x = startX + xi * spacing;
        node.y = yi * 120;
      });
    });

    return { nodes: Array.from(nodeMap.values()), edges: edgeList, maxGen: mg };
  }, [fusions, lineage, genFilter]);

  const svgW = 600, svgH = Math.max(300, (maxGen + 2) * 120);
  const offsetX = svgW / 2, offsetY = 60;

  // ── Mobile: vertical list view ──
  if (isMobile) {
    return (
      <div>
        <GenSlider maxGen={maxGen} value={genFilter} onChange={setGenFilter} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {nodes.filter(n => n.type === "fusion").sort((a, b) => a.generation - b.generation).map(node => (
            <button key={node.id} onClick={() => onNodeClick?.(node.id, node.type)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
              borderRadius: 10, background: C.card, border: `1px solid ${C.border}`,
              cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: `${GEN_COLORS[Math.min(node.generation - 1, 4)]}22`,
                border: `2px solid ${GEN_COLORS[Math.min(node.generation - 1, 4)]}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14,
              }}>G{node.generation}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{node.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>
                  {node.status && <span style={{ color: STATUS_COLORS[node.status] }}>{node.status}</span>}
                  {node.score !== undefined && <span> · {node.score.toFixed(0)} pts</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Desktop: SVG tree ──
  return (
    <div>
      <GenSlider maxGen={maxGen} value={genFilter} onChange={setGenFilter} />
      <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden", background: C.bg }}>
        <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: "block" }}>
          <defs>
            {GEN_COLORS.map((color, i) => (
              <linearGradient key={i} id={`gen-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity="0.4" />
                <stop offset="1" stopColor={color} stopOpacity="0.1" />
              </linearGradient>
            ))}
          </defs>

          {/* Edges */}
          {edges.map((edge, i) => {
            const from = nodes.find(n => n.id === edge.from);
            const to = nodes.find(n => n.id === edge.to);
            if (!from || !to) return null;
            const genIdx = Math.min(edge.gen - 1, 4);
            return (
              <line key={i}
                x1={from.x + offsetX} y1={from.y + offsetY + 20}
                x2={to.x + offsetX} y2={to.y + offsetY - 20}
                stroke={GEN_COLORS[genIdx]}
                strokeWidth={1.5}
                strokeOpacity={0.3}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const genIdx = node.type === "agent" ? 0 : Math.min(node.generation - 1, 4);
            const color = GEN_COLORS[genIdx];
            const isSelected = selectedNode === node.id;
            const r = node.type === "agent" ? 18 : 22;

            return (
              <g key={node.id}
                onClick={() => { setSelectedNode(node.id); onNodeClick?.(node.id, node.type); }}
                style={{ cursor: "pointer" }}
              >
                {/* Glow */}
                {isSelected && (
                  <circle cx={node.x + offsetX} cy={node.y + offsetY} r={r + 6}
                    fill={color} opacity={0.15} />
                )}
                {/* Node circle */}
                <circle cx={node.x + offsetX} cy={node.y + offsetY} r={r}
                  fill={`url(#gen-grad-${genIdx})`}
                  stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} strokeOpacity={0.6}
                />
                {/* Status dot */}
                {node.status && (
                  <circle cx={node.x + offsetX + r - 4} cy={node.y + offsetY - r + 4} r={4}
                    fill={STATUS_COLORS[node.status]} stroke={C.bg} strokeWidth={1.5} />
                )}
                {/* Gen label */}
                <text x={node.x + offsetX} y={node.y + offsetY + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={color} fontSize={node.type === "agent" ? 10 : 11} fontWeight="800"
                  fontFamily="'Outfit',sans-serif"
                >{node.type === "agent" ? "A" : `G${node.generation}`}</text>
                {/* Name */}
                <text x={node.x + offsetX} y={node.y + offsetY + r + 14}
                  textAnchor="middle" fill={C.muted} fontSize={10}
                  fontFamily="'Outfit',sans-serif"
                >{node.name.length > 14 ? node.name.slice(0, 12) + "…" : node.name}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function GenSlider({ maxGen, value, onChange }: { maxGen: number; value: number; onChange: (v: number) => void }) {
  if (maxGen <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Generations:</span>
      <input type="range" min={1} max={5} value={value} onChange={e => onChange(parseInt(e.target.value))}
        style={{ flex: 1, accentColor: C.violet }} />
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: 4, fontSize: 8, fontWeight: 800,
            background: i < value ? `${GEN_COLORS[i]}33` : C.dim,
            color: i < value ? GEN_COLORS[i] : C.dim,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{i + 1}</div>
        ))}
      </div>
    </div>
  );
}
