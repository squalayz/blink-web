"use client";

// Glass social-proof strip with count-up numbers. Every figure is derived
// from existing site copy — no invented user counts. Numbers animate once
// when scrolled into view (rAF ease-out), or render final values under
// prefers-reduced-motion / no IntersectionObserver.

import { useEffect, useRef, useState } from "react";

const GREEN = "#00FF88";
const FONT_DISPLAY = "'Space Grotesk', 'Inter', -apple-system, sans-serif";

type Stat = { value: number; prefix?: string; suffix?: string; label: string };

const STATS: Stat[] = [
  { value: 60, suffix: "+", label: "Creatures to catch" },
  { value: 100, suffix: "%", label: "Powered by real steps" },
  { value: 0, label: "Ads or trackers, ever" },
  { value: 1, label: "Tap to block or report" },
];

export default function StatsStrip() {
  return (
    <section
      aria-label="BlinkWorld at a glance"
      style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(8px, 2vw, 20px) 20px" }}
    >
      <style>{STATS_STYLE}</style>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 50px rgba(0,0,0,0.35), 0 0 40px rgba(0,255,136,0.06)",
          overflow: "hidden",
        }}
      >
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className={i > 0 ? "bwStat bwStatDiv" : "bwStat"}
            style={{
              flex: "1 1 200px",
              minWidth: 150,
              padding: "clamp(20px, 3vw, 30px) 18px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: "clamp(30px, 3.6vw, 44px)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
                color: GREEN,
                textShadow: "0 0 26px rgba(0,255,136,0.4)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <CountUp stat={s} />
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 13.5,
                fontWeight: 600,
                color: "rgba(255,255,255,0.72)",
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Vertical hairline dividers between stats — hidden once the strip wraps,
// so a wrapped row never starts with a stray border.
const STATS_STYLE = `
.bwStatDiv { border-left: 1px solid rgba(255,255,255,0.07); }
@media (max-width: 760px) {
  .bwStatDiv { border-left: none; }
}
`;

function CountUp({ stat }: { stat: Stat }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      setDisplay(stat.value);
      setDone(true);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const dur = 1400;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(Math.round(stat.value * eased));
          if (t < 1) raf = requestAnimationFrame(tick);
          else setDone(true);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [stat.value]);

  return (
    <span ref={ref}>
      {stat.prefix}
      {display}
      <span style={{ opacity: done ? 1 : 0, transition: "opacity 0.3s ease" }}>
        {stat.suffix}
      </span>
    </span>
  );
}
