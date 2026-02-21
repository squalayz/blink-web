"use client";
import { useState, useRef, useEffect, useCallback } from "react";

const C = {
  bg:"#050508", surface:"#0a0a12", s2:"#111118",
  indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", gold:"#ffd700", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
  hot:"#ff2d55",
};

interface MatchCardData {
  matchId: string;
  myName: string;
  myColor: string;
  otherName: string;
  otherColor: string;
  score: number;
  tags: string[];      // "AI Automation × E-comm"
  reasoning?: string;
  minted: boolean;
  nftTokenId?: string;
}

// ═══ MATCH CARD COMPONENT ═══
// Appears after every match. Free = watermarked image. Mint = animated NFT for 0.005 ETH.
export default function MatchCard({ data, onMint, onClose }: {
  data: MatchCardData; onMint?: (matchId: string) => void; onClose?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [minting, setMinting] = useState(false);
  const [shareMenu, setShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Render card to canvas ──
  const renderCard = useCallback((watermark: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = 600, h = 340;
    canvas.width = w; canvas.height = h;

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#050508");
    bg.addColorStop(1, "#0a0a18");
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, w, h, 20);
    ctx.fill();

    // Border
    ctx.strokeStyle = "rgba(99,102,241,0.15)";
    ctx.lineWidth = 1;
    roundRect(ctx, 0.5, 0.5, w - 1, h - 1, 20);
    ctx.stroke();

    // Header
    ctx.fillStyle = C.gold;
    ctx.font = "bold 13px 'Outfit', system-ui";
    ctx.textAlign = "center";
    ctx.fillText(" MishMesh Match ", w / 2, 36);

    // Orbs
    drawOrb(ctx, w / 2 - 70, 100, 36, data.myColor);
    drawOrb(ctx, w / 2 + 70, 100, 36, data.otherColor);

    // Connection line
    const lineGrad = ctx.createLinearGradient(w / 2 - 30, 100, w / 2 + 30, 100);
    lineGrad.addColorStop(0, data.myColor + "88");
    lineGrad.addColorStop(0.5, C.gold);
    lineGrad.addColorStop(1, data.otherColor + "88");
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 32, 100);
    ctx.lineTo(w / 2 + 32, 100);
    ctx.stroke();

    // Snap spark
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.arc(w / 2, 100, 4, 0, Math.PI * 2);
    ctx.fill();

    // Names
    ctx.font = "bold 15px 'Outfit', system-ui";
    ctx.fillStyle = C.text;
    ctx.fillText(data.myName, w / 2 - 70, 155);
    ctx.fillText(data.otherName, w / 2 + 70, 155);

    // Score
    const scoreColor = data.score >= 90 ? C.gold : data.score >= 80 ? C.purple : C.indigo;
    ctx.font = "900 42px 'Outfit', system-ui";
    ctx.fillStyle = scoreColor;
    ctx.fillText(`${data.score}%`, w / 2, 210);
    ctx.font = "600 13px 'Outfit', system-ui";
    ctx.fillStyle = C.muted;
    ctx.fillText("Synergy", w / 2, 228);

    // Tags
    if (data.tags.length > 0) {
      ctx.font = "500 12px 'Outfit', system-ui";
      ctx.fillStyle = C.cyan;
      ctx.fillText(data.tags.join(" × "), w / 2, 258);
    }

    // Watermark (free version only)
    if (watermark) {
      ctx.font = "600 11px 'Outfit', system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillText("mishmesh.ai", w / 2, h - 18);
    }
  }, [data]);

  useEffect(() => {
    renderCard(!data.minted);
  }, [renderCard, data.minted]);

  // ── Download as image ──
  function downloadCard() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `mishmesh-match-${data.score}pct.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  // ── Share to X ──
  function shareX() {
    const text = `Just matched with ${data.otherName} on @MishMesh_ai — ${data.score}% synergy \n\nOur agents figured it out before we did.\n\n mishmesh.ai`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
    trackShare("twitter");
  }

  // ── Copy share text ──
  function copyShare() {
    const text = `Matched with ${data.otherName} — ${data.score}% synergy on mishmesh.ai `;
    navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    trackShare("copy");
  }

  function trackShare(platform: string) {
    fetch("/api/match", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "track_share", share_type: "match", target_id: data.matchId, platform }),
    }).catch(() => {});
    setShareMenu(false);
  }

  async function handleMint() {
    if (minting) return;
    setMinting(true);
    try {
      onMint?.(data.matchId);
    } catch (e) {}
    setMinting(false);
  }

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.dim}`, borderRadius: 20,
      padding: "20px 20px 16px", maxWidth: 340, width: "100%",
      animation: "mc-card-in 0.4s cubic-bezier(0.16,1,0.3,1)",
    }}>
      {/* Canvas card */}
      <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 14, position: "relative" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "auto", display: "block" }} />
        {/* Animated overlay for minted NFTs */}
        {data.minted && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "transparent",
            border: `2px solid ${C.gold}44`,
            borderRadius: 14,
            animation: "mc-nft-glow 3s infinite",
          }}>
            <div style={{
              position: "absolute", top: 8, right: 8, padding: "3px 8px",
              borderRadius: 6, background: C.gold, color: "#000",
              fontSize: 10, fontWeight: 800,
            }}>NFT ✓</div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 6 }}>
        {/* One-tap share */}
        <button onClick={shareX} style={{
          flex: 2, padding: "10px 0", borderRadius: 10, border: "none",
          background: `linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
          color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
          fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>↗ Share on 𝕏</button>

        {/* More share options */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setShareMenu(!shareMenu)} style={{
            padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.dim}`,
            background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>⋯</button>
          {shareMenu && (
            <div style={{
              position: "absolute", bottom: "calc(100% + 6px)", right: 0, zIndex: 10,
              background: C.s2, border: `1px solid ${C.dim}`, borderRadius: 10, padding: 4, width: 160,
              animation: "mc-menu 0.15s ease-out",
            }}>
              <MenuBtn label=" Copy text" onClick={copyShare} />
              <MenuBtn label="💾 Download image" onClick={downloadCard} />
              {!data.minted && <MenuBtn label=" Share on LinkedIn" onClick={() => {
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://mishmesh.ai/match/${data.matchId}`)}`, "_blank");
                trackShare("linkedin");
              }} />}
            </div>
          )}
          {shareMenu && <div style={{ position: "fixed", inset: 0, zIndex: 9 }} onClick={() => setShareMenu(false)} />}
        </div>

        {/* Mint NFT (if not minted) */}
        {!data.minted && (
          <button onClick={handleMint} disabled={minting} style={{
            flex: 1.5, padding: "10px 0", borderRadius: 10, border: `1px solid ${C.gold}44`,
            background: `${C.gold}0a`, color: C.gold, fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>{minting ? "..." : "Mint 0.005Ξ"}</button>
        )}
      </div>

      {/* Mint value prop */}
      {!data.minted && (
        <div style={{ marginTop: 10, fontSize: 11, color: C.dim, textAlign: "center", lineHeight: 1.5 }}>
          Mint to remove watermark, get animated version + own on-chain
        </div>
      )}

      {copied && <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", padding: "8px 16px", borderRadius: 8, background: C.match, color: "white", fontSize: 13, fontWeight: 700, zIndex: 1200 }}>✓ Copied!</div>}

      <style>{`
        @keyframes mc-card-in{from{opacity:0;transform:translateY(10px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes mc-nft-glow{0%,100%{box-shadow:0 0 12px ${C.gold}20}50%{box-shadow:0 0 24px ${C.gold}40}}
        @keyframes mc-menu{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
}

function MenuBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: "block", width: "100%", padding: "7px 10px", borderRadius: 6,
      border: "none", background: "transparent", color: C.text,
      fontSize: 12, textAlign: "left", cursor: "pointer", fontFamily: "inherit",
    }}>{label}</button>
  );
}

// ── Canvas helpers ──
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawOrb(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
  grad.addColorStop(0, color);
  grad.addColorStop(1, color + "44");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.fillStyle = color + "33";
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

// ═══ MATCH CARD MODAL (shown after every match) ═══
export function MatchCardModal({ data, onMint, onClose }: {
  data: MatchCardData; onMint?: (id: string) => void; onClose: () => void;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>
        <MatchCard data={data} onMint={onMint} onClose={onClose} />
      </div>
    </div>
  );
}
