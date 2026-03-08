"use client";

import { useRef, useEffect, useCallback } from "react";

const C = {
  bg: "#0a0a0f", surface: "#0d0d14",
  indigo: "#6366f1", cyan: "#06b6d4", match: "#30d158",
  hot: "#ff2d55", text: "#e8e8f0", muted: "#6b6b80",
};

interface Token {
  address: string;
  symbol: string;
  chainId: string;
  score: number;
  liquidity: number;
}

interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  score: number;
  symbol: string;
  chainId: string;
  address: string;
  phase: number;
}

function orbColor(score: number): string {
  if (score >= 90) return "#ffffff";
  if (score >= 75) return "#f59e0b";
  if (score >= 60) return "#06b6d4";
  return "#6366f1";
}

function chainShort(id: string): string {
  const m: Record<string, string> = { base: "Base", solana: "SOL", ethereum: "ETH", bsc: "BSC", arbitrum: "ARB" };
  return m[id] || id;
}

export default function HuntPulseViz({
  tokens,
  loading,
  onSelectToken,
}: {
  tokens: Token[];
  loading: boolean;
  onSelectToken?: (address: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbsRef = useRef<Orb[]>([]);
  const animRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build orbs from tokens
  useEffect(() => {
    const maxLiq = Math.max(...tokens.map(t => t.liquidity), 1);

    orbsRef.current = tokens.slice(0, 20).map((t, i) => {
      const liqNorm = Math.log10(Math.max(t.liquidity, 1)) / Math.log10(Math.max(maxLiq, 10));
      const radius = 12 + liqNorm * 22;
      return {
        x: 40 + Math.random() * 280,
        y: 30 + Math.random() * 200,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.3,
        radius,
        score: t.score,
        symbol: t.symbol,
        chainId: t.chainId,
        address: t.address,
        phase: Math.random() * Math.PI * 2,
      };
    });
  }, [tokens]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    let time = 0;
    let lastFrame = 0;
    const TARGET_FPS = 30;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    const draw = (timestamp: number) => {
      // Throttle to 30fps to prevent jank
      if (timestamp - lastFrame < FRAME_INTERVAL) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrame = timestamp;

      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, w, h);

      // Stars — reduced to 25, static positions (no per-frame trig)
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 25; i++) {
        const sx = (Math.sin(i * 127.1) * 0.5 + 0.5) * w;
        const sy = (Math.cos(i * 311.7) * 0.5 + 0.5) * h;
        const a = 0.08 + Math.sin(time * 0.02 + i) * 0.06;
        ctx.globalAlpha = a;
        ctx.fillRect(sx, sy, 1, 1);
      }
      ctx.globalAlpha = 1;

      const orbs = orbsRef.current;

      // Skeleton orbs if loading
      if (orbs.length === 0) {
        for (let i = 0; i < 8; i++) {
          const sx = 40 + (i % 4) * (w / 5) + Math.sin(time * 0.002 + i) * 10;
          const sy = 60 + Math.floor(i / 4) * 80 + Math.cos(time * 0.002 + i) * 8;
          const r = 14 + (i % 3) * 8;
          ctx.globalAlpha = 0.08 + Math.sin(time * 0.004 + i * 0.5) * 0.04;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fillStyle = C.indigo;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        time++;
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // Update & draw orbs
      for (const orb of orbs) {
        // Drift
        orb.x += orb.vx;
        orb.y += orb.vy;

        // Bounce off edges
        if (orb.x < orb.radius || orb.x > w - orb.radius) orb.vx *= -1;
        if (orb.y < orb.radius || orb.y > h - orb.radius) orb.vy *= -1;
        orb.x = Math.max(orb.radius, Math.min(w - orb.radius, orb.x));
        orb.y = Math.max(orb.radius, Math.min(h - orb.radius, orb.y));

        const pulse = 1 + Math.sin(time * 0.03 + orb.phase) * 0.08;
        const r = orb.radius * pulse;
        const color = orbColor(orb.score);

        // Glow
        const glow = ctx.createRadialGradient(orb.x, orb.y, r * 0.2, orb.x, orb.y, r * 2);
        glow.addColorStop(0, color + "30");
        glow.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, r * 2, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Orb body
        const grad = ctx.createRadialGradient(orb.x - r * 0.3, orb.y - r * 0.3, r * 0.1, orb.x, orb.y, r);
        grad.addColorStop(0, color + "cc");
        grad.addColorStop(1, color + "44");
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Symbol text
        ctx.fillStyle = "#ffffffdd";
        ctx.font = `bold ${Math.max(8, r * 0.55)}px -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(orb.symbol.slice(0, 5), orb.x, orb.y - 2);

        // Chain label
        ctx.fillStyle = "#ffffff77";
        ctx.font = `${Math.max(6, r * 0.35)}px -apple-system, sans-serif`;
        ctx.fillText(chainShort(orb.chainId), orb.x, orb.y + r * 0.45);
      }

      time++;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [tokens.length === 0]); // re-init when tokens arrive

  // Click handling
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onSelectToken) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const orb of orbsRef.current) {
      const dx = x - orb.x;
      const dy = y - orb.y;
      if (dx * dx + dy * dy < orb.radius * orb.radius * 1.5) {
        onSelectToken(orb.address);
        break;
      }
    }
  }, [onSelectToken]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: 260,
        position: "relative",
        borderRadius: 20,
        overflow: "hidden",
        background: `radial-gradient(ellipse at 50% 80%, ${C.indigo}12, ${C.bg})`,
        // Isolate repaints from rest of page — critical for performance
        contain: "strict",
        willChange: "transform",
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{
          width: "100%",
          height: "100%",
          cursor: "pointer",
        }}
      />

      {/* Gradient overlay at bottom */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
        background: `linear-gradient(transparent, ${C.bg})`,
        pointerEvents: "none",
      }} />

      {/* Top-right status */}
      <div style={{
        position: "absolute", top: 14, right: 16,
        fontSize: 10, color: loading ? C.cyan : C.muted,
        display: "flex", alignItems: "center", gap: 5,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: loading ? C.cyan : C.match,
          animation: "hunt-pulse-dot 1.4s infinite",
        }} />
        {loading ? "Scanning…" : "Live"}
      </div>

      {/* Bottom hint */}
      <div style={{
        position: "absolute", bottom: 68, left: 0, right: 0,
        textAlign: "center",
        fontSize: 10, color: "rgba(255,255,255,0.2)",
        pointerEvents: "none",
        letterSpacing: "0.05em",
      }}>
        tap an orb to highlight
      </div>

      <style>{`
        @keyframes hunt-pulse-dot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
