"use client";

// Interactive starfield backdrop for the marketing landing page.
// Canvas + rAF, three parallax depth layers that drift and lean toward the
// cursor, with an occasional green shooting star. Layered aurora glows sit
// behind the canvas as pure CSS. Pauses when the tab is hidden and renders
// a single static frame under prefers-reduced-motion.

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  z: number; // 0.25..1 — depth, drives size/speed/parallax
  r: number;
  phase: number;
  twinkleSpeed: number;
  green: boolean;
};

type Streak = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // seconds remaining
  max: number;
};

export default function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let streaks: Streak[] = [];
    let raf = 0;
    let last = 0;
    let elapsed = 0;
    let untilStreak = 4 + Math.random() * 5;
    const mouse = { tx: 0, ty: 0, x: 0, y: 0 };

    function seed() {
      const count = Math.min(260, Math.max(90, Math.round((w * h) / 6000)));
      stars = Array.from({ length: count }, () => {
        const z = 0.25 + Math.random() * 0.75;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          z,
          r: 0.35 + z * 1.25,
          phase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.6 + Math.random() * 1.6,
          green: Math.random() < 0.16,
        };
      });
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduced.matches || document.hidden) drawFrame(0);
    }

    function drawFrame(dt: number) {
      elapsed += dt;
      ctx.clearRect(0, 0, w, h);

      // Spring the parallax offset toward the cursor.
      mouse.x += (mouse.tx - mouse.x) * 0.045;
      mouse.y += (mouse.ty - mouse.y) * 0.045;

      for (const s of stars) {
        // Slow leftward drift, deeper stars move faster.
        s.x -= (2 + s.z * 7) * dt;
        if (s.x < -4) {
          s.x = w + 4;
          s.y = Math.random() * h;
        }
        const alpha =
          0.22 + 0.55 * (0.5 + 0.5 * Math.sin(elapsed * s.twinkleSpeed + s.phase));
        const px = s.x + mouse.x * 26 * s.z;
        const py = s.y + mouse.y * 16 * s.z;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.green
          ? `rgba(0,255,136,${(alpha * 0.9).toFixed(3)})`
          : `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.fill();
        if (s.z > 0.85 && alpha > 0.6) {
          // Halo on the brightest near-layer stars.
          ctx.beginPath();
          ctx.arc(px, py, s.r * 3, 0, Math.PI * 2);
          ctx.fillStyle = s.green
            ? "rgba(0,255,136,0.05)"
            : "rgba(255,255,255,0.04)";
          ctx.fill();
        }
      }

      // Shooting stars — green streaks with a fading trail.
      untilStreak -= dt;
      if (untilStreak <= 0 && streaks.length < 2) {
        const fromLeft = Math.random() < 0.5;
        const speed = 900 + Math.random() * 500;
        const angle = (18 + Math.random() * 20) * (Math.PI / 180);
        streaks.push({
          x: fromLeft ? Math.random() * w * 0.3 : w * (0.6 + Math.random() * 0.4),
          y: Math.random() * h * 0.35,
          vx: Math.cos(angle) * speed * (fromLeft ? 1 : -1),
          vy: Math.sin(angle) * speed,
          life: 0.9,
          max: 0.9,
        });
        untilStreak = 5 + Math.random() * 8;
      }
      streaks = streaks.filter((st) => st.life > 0);
      for (const st of streaks) {
        st.life -= dt;
        st.x += st.vx * dt;
        st.y += st.vy * dt;
        const t = Math.max(0, st.life / st.max);
        const tailX = st.x - st.vx * 0.13;
        const tailY = st.y - st.vy * 0.13;
        const grad = ctx.createLinearGradient(tailX, tailY, st.x, st.y);
        grad.addColorStop(0, "rgba(0,255,136,0)");
        grad.addColorStop(0.7, `rgba(0,255,136,${(0.5 * t).toFixed(3)})`);
        grad.addColorStop(1, `rgba(255,255,255,${(0.9 * t).toFixed(3)})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(st.x, st.y);
        ctx.stroke();
      }
    }

    function loop(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      drawFrame(dt);
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (raf || reduced.matches || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }

    function onMotionPref() {
      if (reduced.matches) {
        stop();
        streaks = [];
        mouse.x = mouse.tx = 0;
        mouse.y = mouse.ty = 0;
        drawFrame(0);
      } else {
        start();
      }
    }

    function onMouse(e: MouseEvent) {
      mouse.tx = e.clientX / Math.max(1, w) - 0.5;
      mouse.ty = e.clientY / Math.max(1, h) - 0.5;
    }

    resize();
    if (reduced.matches) drawFrame(0);
    else start();

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouse, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", onMotionPref);
    return () => {
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onMotionPref);
    };
  }, []);

  return (
    <div
      aria-hidden
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}
    >
      <style>{AURORA_STYLE}</style>
      {/* Aurora / nebula glows behind the stars */}
      <div className="bwAurora bwAuroraA" />
      <div className="bwAurora bwAuroraB" />
      <div className="bwAurora bwAuroraC" />
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, display: "block" }} />
    </div>
  );
}

const AURORA_STYLE = `
.bwAurora {
  position: absolute;
  border-radius: 50%;
  filter: blur(48px);
  will-change: transform, opacity;
}
.bwAuroraA {
  top: -22%;
  left: 50%;
  width: min(1200px, 130vw);
  height: 720px;
  margin-left: min(-600px, -65vw);
  background: radial-gradient(closest-side, rgba(0,255,136,0.13), rgba(0,255,136,0.04) 55%, transparent 72%);
  animation: bwAuroraDriftA 18s ease-in-out infinite;
}
.bwAuroraB {
  top: 4%;
  right: -18%;
  width: 780px;
  height: 620px;
  background: radial-gradient(closest-side, rgba(136,255,0,0.06), transparent 70%);
  animation: bwAuroraDriftB 24s ease-in-out infinite;
}
.bwAuroraC {
  bottom: -28%;
  left: -14%;
  width: 900px;
  height: 700px;
  background: radial-gradient(closest-side, rgba(0,255,136,0.07), transparent 70%);
  animation: bwAuroraDriftA 28s ease-in-out infinite reverse;
}
@keyframes bwAuroraDriftA {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.9; }
  50% { transform: translate3d(4%, 3%, 0) scale(1.08); opacity: 1; }
}
@keyframes bwAuroraDriftB {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.75; }
  50% { transform: translate3d(-5%, 6%, 0) scale(1.12); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .bwAurora { animation: none !important; }
}
`;
