"use client";

import { useEffect, useRef } from "react";

// Canvas-driven particle modes the AR experience composes. The canvas always
// covers the full overlay; the mode tells it what to spawn each frame.
export type ParticleMode = "off" | "idle" | "materialize" | "throwTrail" | "lockBurst";

export interface ParticleFieldProps {
  mode: ParticleMode;
  /** Hex accent colour for particles (#RRGGBB). */
  accent: string;
  /** Centre of the creature in viewport px (used by all modes). */
  centerX: number;
  centerY: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hueShift: number; // 0 = pure accent, 1 = white
}

// Particle budget caps. 60 is the spec cap; we burst higher on lockBurst
// (one-shot) but cap idle/throwTrail at 60 to keep mobile budgets sane.
const SOFT_CAP = 60;
const HARD_CAP = 120;

// Parse "#RRGGBB" into [r,g,b]. Falls back to neon green on garbage input.
function parseAccent(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [0, 255, 136];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export default function ParticleField({
  mode,
  accent,
  centerX,
  centerY,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const modeRef = useRef(mode);
  const accentRef = useRef(parseAccent(accent));
  const centerRef = useRef({ x: centerX, y: centerY });
  const rafRef = useRef<number | null>(null);
  const lastBurstRef = useRef<string | null>(null);

  // Track latest props in refs so the rAF loop reads fresh values without
  // re-binding the loop on every render.
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    accentRef.current = parseAccent(accent);
  }, [accent]);
  useEffect(() => {
    centerRef.current = { x: centerX, y: centerY };
  }, [centerX, centerY]);

  // One-shot bursts (lockBurst, materialize) need to spawn ~once per mode
  // entry. Track the last-seen-mode marker so we know to fire.
  useEffect(() => {
    if (mode === "lockBurst" && lastBurstRef.current !== "lockBurst") {
      lastBurstRef.current = "lockBurst";
      const list = particlesRef.current;
      const { x, y } = centerRef.current;
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 6;
        list.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 60 + Math.random() * 30,
          size: 2 + Math.random() * 3,
          hueShift: Math.random() * 0.6,
        });
      }
      while (list.length > HARD_CAP) list.shift();
    } else if (mode === "materialize" && lastBurstRef.current !== "materialize") {
      lastBurstRef.current = "materialize";
      const list = particlesRef.current;
      const { x, y } = centerRef.current;
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 120 + Math.random() * 80;
        // Particles spawn out on a ring, fly INWARD into the creature.
        list.push({
          x: x + Math.cos(angle) * dist,
          y: y + Math.sin(angle) * dist,
          vx: -Math.cos(angle) * (2 + Math.random() * 2),
          vy: -Math.sin(angle) * (2 + Math.random() * 2),
          life: 0,
          maxLife: 36 + Math.random() * 18,
          size: 2 + Math.random() * 2,
          hueShift: Math.random() * 0.4,
        });
      }
      while (list.length > HARD_CAP) list.shift();
    } else if (mode !== "lockBurst" && mode !== "materialize") {
      lastBurstRef.current = null;
    }
  }, [mode]);

  // rAF loop. Single effect, mounted once. Reads modeRef / accentRef /
  // centerRef on every frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let mounted = true;
    let lastFrame = performance.now();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tick = (now: number) => {
      if (!mounted) return;
      const dt = Math.min(48, now - lastFrame);
      lastFrame = now;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const m = modeRef.current;
      const list = particlesRef.current;
      const [r, g, b] = accentRef.current;
      const { x: cx, y: cy } = centerRef.current;

      // Continuous spawners (idle sparks, throw trail).
      if (!reducedMotion) {
        if (m === "idle" && list.length < SOFT_CAP && Math.random() < 0.35) {
          // Lazy upward sparks drifting around the creature.
          const offX = (Math.random() - 0.5) * 200;
          list.push({
            x: cx + offX,
            y: cy + 60 + Math.random() * 40,
            vx: (Math.random() - 0.5) * 0.6,
            vy: -0.6 - Math.random() * 0.7,
            life: 0,
            maxLife: 70 + Math.random() * 40,
            size: 1.4 + Math.random() * 1.4,
            hueShift: Math.random() * 0.5,
          });
        }
        if (m === "throwTrail" && list.length < SOFT_CAP) {
          // Throw trail: spawn near the creature centre as the orb closes in.
          for (let i = 0; i < 3; i++) {
            list.push({
              x: cx + (Math.random() - 0.5) * 30,
              y: cy + (Math.random() - 0.5) * 30,
              vx: (Math.random() - 0.5) * 2,
              vy: -1 - Math.random() * 1.5,
              life: 0,
              maxLife: 30 + Math.random() * 20,
              size: 1.6 + Math.random() * 1.4,
              hueShift: Math.random() * 0.7,
            });
          }
        }
      }

      // Step + draw.
      const step = dt / 16.67; // normalised to ~60fps frames
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.vy += 0.02 * step; // gentle gravity so sparks fall back
        p.life += step;
        if (p.life >= p.maxLife) {
          list.splice(i, 1);
          continue;
        }
        const t = p.life / p.maxLife;
        const alpha = (1 - t) * 0.9;
        // Lerp colour towards white via hueShift, plus mid-life white-flash
        // peak so sparks shimmer rather than just fading.
        const wlerp = p.hueShift + (1 - t) * 0.4;
        const rr = Math.round(r + (255 - r) * Math.min(1, wlerp));
        const gg = Math.round(g + (255 - g) * Math.min(1, wlerp));
        const bb = Math.round(b + (255 - b) * Math.min(1, wlerp));
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + (1 - t) * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rr},${gg},${bb},${alpha})`;
        ctx.shadowColor = `rgba(${rr},${gg},${bb},${alpha})`;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      mounted = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 12,
        pointerEvents: "none",
      }}
    />
  );
}
