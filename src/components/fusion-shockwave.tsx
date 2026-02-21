"use client";
import { useRef, useEffect, useCallback } from "react";

/**
 * FusionShockwave — Ambient overlay that shows ripple/shockwave effects
 * when fusions happen. Renders on a transparent canvas overlaying the mesh.
 * Feed it fusion events and it'll pulse at the coordinates.
 */

const VIOLET = "#8b5cf6";
const PINK = "#ec4899";
const GOLD = "#ffd700";

interface ShockwaveEvent {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  generation: number;
  timestamp: number;
}

interface FusionShockwaveProps {
  events?: ShockwaveEvent[];
  autoDemo?: boolean; // Generate random events for visual demo
  width?: number;
  height?: number;
}

export default function FusionShockwave({ events = [], autoDemo = false, width = 800, height = 600 }: FusionShockwaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeWaves = useRef<Array<{
    x: number; y: number; radius: number; maxRadius: number;
    opacity: number; color: string; startTime: number; gen: number;
  }>>([]);
  const lineageGlows = useRef<Array<{
    x1: number; y1: number; x2: number; y2: number;
    opacity: number; color: string; startTime: number;
  }>>([]);
  const lastEventCount = useRef(0);
  const demoTimer = useRef(0);

  const GEN_COLORS = [VIOLET, "#a855f7", PINK, "#f97316", GOLD];

  const addWave = useCallback((x: number, y: number, gen: number) => {
    const color = GEN_COLORS[Math.min(gen - 1, 4)];
    activeWaves.current.push({
      x: x * width, y: y * height,
      radius: 0, maxRadius: 80 + gen * 20,
      opacity: 0.6, color, startTime: Date.now(), gen,
    });

    // Add a lineage glow line from a random point to the fusion
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 100;
    lineageGlows.current.push({
      x1: x * width + Math.cos(angle) * dist,
      y1: y * height + Math.sin(angle) * dist,
      x2: x * width, y2: y * height,
      opacity: 0.4, color, startTime: Date.now(),
    });
  }, [width, height]);

  // Process new events
  useEffect(() => {
    if (events.length > lastEventCount.current) {
      const newEvents = events.slice(lastEventCount.current);
      newEvents.forEach(e => addWave(e.x, e.y, e.generation));
      lastEventCount.current = events.length;
    }
  }, [events, addWave]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    let raf: number;

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      const now = Date.now();

      // Auto-demo: random fusion every 3-8 seconds
      if (autoDemo && now - demoTimer.current > 3000 + Math.random() * 5000) {
        demoTimer.current = now;
        addWave(0.2 + Math.random() * 0.6, 0.2 + Math.random() * 0.6, 1 + Math.floor(Math.random() * 3));
      }

      // Draw shockwaves
      activeWaves.current = activeWaves.current.filter(w => {
        const age = (now - w.startTime) / 1000;
        const progress = age / 2; // 2 seconds duration
        if (progress > 1) return false;

        w.radius = w.maxRadius * progress;
        w.opacity = 0.6 * (1 - progress);

        // Outer ring
        ctx!.strokeStyle = w.color;
        ctx!.globalAlpha = w.opacity * 0.5;
        ctx!.lineWidth = 2 - progress;
        ctx!.beginPath();
        ctx!.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx!.stroke();

        // Inner flash
        if (progress < 0.3) {
          const grad = ctx!.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.radius * 0.5);
          grad.addColorStop(0, w.color);
          grad.addColorStop(1, "transparent");
          ctx!.globalAlpha = w.opacity * 0.3 * (1 - progress / 0.3);
          ctx!.fillStyle = grad;
          ctx!.beginPath();
          ctx!.arc(w.x, w.y, w.radius * 0.5, 0, Math.PI * 2);
          ctx!.fill();
        }

        // Second ring (delayed)
        if (progress > 0.15 && progress < 0.8) {
          const p2 = (progress - 0.15) / 0.65;
          ctx!.strokeStyle = w.color;
          ctx!.globalAlpha = 0.3 * (1 - p2);
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.arc(w.x, w.y, w.maxRadius * 0.6 * p2, 0, Math.PI * 2);
          ctx!.stroke();
        }

        ctx!.globalAlpha = 1;
        return true;
      });

      // Draw lineage glow lines
      lineageGlows.current = lineageGlows.current.filter(l => {
        const age = (now - l.startTime) / 1000;
        if (age > 3) return false;

        const progress = Math.min(1, age / 0.5); // Glow in over 0.5s
        const fade = age > 2 ? 1 - (age - 2) : 1; // Fade out last second

        ctx!.strokeStyle = l.color;
        ctx!.globalAlpha = l.opacity * progress * fade;
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();

        // Animate the line drawing
        const drawProgress = Math.min(1, age / 0.8);
        const dx = l.x2 - l.x1;
        const dy = l.y2 - l.y1;

        ctx!.moveTo(l.x1, l.y1);
        ctx!.lineTo(l.x1 + dx * drawProgress, l.y1 + dy * drawProgress);
        ctx!.stroke();

        // Glow at the end point
        if (drawProgress > 0.8) {
          const glowR = 4;
          const grad = ctx!.createRadialGradient(l.x2, l.y2, 0, l.x2, l.y2, glowR);
          grad.addColorStop(0, l.color);
          grad.addColorStop(1, "transparent");
          ctx!.fillStyle = grad;
          ctx!.globalAlpha = 0.4 * fade;
          ctx!.beginPath();
          ctx!.arc(l.x2, l.y2, glowR, 0, Math.PI * 2);
          ctx!.fill();
        }

        ctx!.globalAlpha = 1;
        return true;
      });

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, [width, height, autoDemo, addWave]);

  return (
    <canvas ref={canvasRef} style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      width, height, zIndex: 2,
    }} />
  );
}
