"use client";
import { useState, useRef, useEffect, useCallback } from "react";

const C = {
  bg:"#050508", surface:"#0a0a12", s2:"#111118",
  indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", gold:"#ffd700", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
  hot:"#ff2d55",
};

interface WeeklyStats {
  conversations: number;
  matches: number;
  messages_sent: number;
  pnl: number;
  rank: number;
  rank_change: number;  // positive = moved up
  streak: number;
  top_match?: { name: string; score: number; reason: string };
  agent_comment: string;  // AI-generated weekly commentary
  week_label: string;     // "Feb 10-16, 2026"
}

export default function WeeklyReport({ stats, orbColor = C.indigo }: { stats: WeeklyStats; orbColor?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const renderReport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = 600, h = 520;
    canvas.width = w; canvas.height = h;

    // Background
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#050508");
    bg.addColorStop(1, "#0a0a18");
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, w, h, 20);
    ctx.fill();

    // Border
    ctx.strokeStyle = "rgba(99,102,241,0.12)";
    ctx.lineWidth = 1;
    roundRect(ctx, 0.5, 0.5, w - 1, h - 1, 20);
    ctx.stroke();

    // Header
    ctx.fillStyle = C.gold;
    ctx.font = "bold 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("⚡ Weekly Mesh Report", w / 2, 36);
    ctx.fillStyle = C.muted;
    ctx.font = "500 12px system-ui";
    ctx.fillText(stats.week_label, w / 2, 54);

    // Stats grid (2x3)
    const statItems = [
      { icon: "🤖", label: "Conversations", value: String(stats.conversations) },
      { icon: "🔗", label: "Matches", value: String(stats.matches) },
      { icon: "💬", label: "Messages", value: String(stats.messages_sent) },
      { icon: "📈", label: "Trading P&L", value: `${stats.pnl >= 0 ? "+" : ""}$${stats.pnl.toFixed(2)}` },
      { icon: "🏆", label: "Rank", value: `#${stats.rank}` },
      { icon: "🔥", label: "Streak", value: `${stats.streak}d` },
    ];

    const cols = 3, gapX = 16, gapY = 12;
    const cellW = (w - 48 - gapX * (cols - 1)) / cols;
    const cellH = 64;
    const startY = 76;

    statItems.forEach((s, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = 24 + col * (cellW + gapX);
      const y = startY + row * (cellH + gapY);

      // Cell background
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      roundRect(ctx, x, y, cellW, cellH, 10);
      ctx.fill();

      // Icon + value
      ctx.textAlign = "center";
      ctx.font = "14px system-ui";
      ctx.fillStyle = C.text;
      ctx.fillText(s.icon, x + cellW / 2, y + 22);

      ctx.font = "bold 18px system-ui";
      const valColor = s.label === "Trading P&L" ? (stats.pnl >= 0 ? C.match : C.hot) :
                        s.label === "Rank" ? C.gold : C.text;
      ctx.fillStyle = valColor;
      ctx.fillText(s.value, x + cellW / 2, y + 44);

      ctx.font = "500 9px system-ui";
      ctx.fillStyle = C.dim;
      ctx.fillText(s.label, x + cellW / 2, y + 58);
    });

    // Rank change
    if (stats.rank_change !== 0) {
      const arrow = stats.rank_change > 0 ? "↑" : "↓";
      const changeColor = stats.rank_change > 0 ? C.match : C.hot;
      ctx.font = "bold 11px system-ui";
      ctx.fillStyle = changeColor;
      ctx.textAlign = "left";
      const rankX = 24 + 1 * (cellW + gapX) + cellW / 2 + 20;
      ctx.fillText(`${arrow}${Math.abs(stats.rank_change)}`, rankX, startY + cellH + gapY + 44);
    }

    // Top match
    const topY = startY + 2 * (cellH + gapY) + 16;
    if (stats.top_match) {
      ctx.fillStyle = "rgba(99,102,241,0.06)";
      roundRect(ctx, 24, topY, w - 48, 60, 10);
      ctx.fill();
      ctx.strokeStyle = "rgba(99,102,241,0.1)";
      roundRect(ctx, 24, topY, w - 48, 60, 10);
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.font = "bold 13px system-ui";
      ctx.fillStyle = C.text;
      ctx.fillText(`Top Match: ${stats.top_match.name} — ${stats.top_match.score}%`, 40, topY + 24);
      ctx.font = "500 11px system-ui";
      ctx.fillStyle = C.muted;
      ctx.fillText(`"${stats.top_match.reason}"`, 40, topY + 44);
    }

    // Agent comment
    const commentY = topY + (stats.top_match ? 76 : 0);
    ctx.fillStyle = "rgba(255,215,0,0.04)";
    roundRect(ctx, 24, commentY, w - 48, 70, 10);
    ctx.fill();

    ctx.textAlign = "left";
    ctx.font = "bold 11px system-ui";
    ctx.fillStyle = C.gold;
    ctx.fillText("🤖 Your Agent Says:", 40, commentY + 20);
    ctx.font = "italic 12px system-ui";
    ctx.fillStyle = C.muted;
    // Word wrap
    wrapText(ctx, `"${stats.agent_comment}"`, 40, commentY + 40, w - 88, 16);

    // Watermark
    ctx.textAlign = "center";
    ctx.font = "600 10px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillText("mishmesh.ai", w / 2, h - 14);
  }, [stats, orbColor]);

  useEffect(() => { renderReport(); }, [renderReport]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `mishmesh-weekly-${stats.week_label.replace(/[^a-z0-9]/gi, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function shareX() {
    const text = `My @MishMesh_ai weekly report ⚡\n\n🤖 ${stats.conversations} conversations\n🔗 ${stats.matches} matches\n📈 ${stats.pnl >= 0 ? "+" : ""}$${stats.pnl.toFixed(2)} P&L\n🏆 Rank #${stats.rank}\n🔥 ${stats.streak} day streak\n\nMy agent: "${stats.agent_comment.slice(0, 80)}..."\n\n🔗 mishmesh.ai`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div style={{ maxWidth: 340 }}>
      <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "auto", display: "block" }} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={shareX} style={{
          flex: 2, padding: "10px 0", borderRadius: 10, border: "none",
          background: `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
          color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}>↗ Share on 𝕏</button>
        <button onClick={download} style={{
          flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${C.dim}`,
          background: "transparent", color: C.text, fontSize: 13, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit",
        }}>💾 Save</button>
      </div>
    </div>
  );
}

// Canvas helpers
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(" ");
  let line = "";
  let ly = y;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, ly);
      line = word + " ";
      ly += lineH;
    } else line = test;
  }
  if (line.trim()) ctx.fillText(line.trim(), x, ly);
}
