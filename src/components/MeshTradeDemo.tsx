'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface MeshTradeDemoProps {
  onGetStarted: () => void;
  onClose?: () => void;
}

const COLORS = {
  bg: '#0a0a0f',
  surface: '#0d0d14',
  s2: '#1a1a24',
  indigo: '#6366f1',
  cyan: '#06b6d4',
  match: '#30d158',
  hot: '#ff2d55',
  gold: '#ffd700',
  text: '#e8e8f0',
  muted: '#6b6b80',
  dim: '#2a2a3a',
  border: 'rgba(255,255,255,0.07)',
};

const SLIDE_DURATION = 3500;
const TOTAL_SLIDES = 4;

const TOKENS = [
  { symbol: 'APEX', initials: 'AP', color: '#ff6b6b', price: '$0.0034', change: '+124%', badge: 'SNIPE', badgeColor: '#ff2d55' },
  { symbol: 'NOVA', initials: 'NV', color: '#4ecdc4', price: '$0.0891', change: '+67%', badge: 'TREND', badgeColor: '#ffd700' },
  { symbol: 'ZETA', initials: 'ZT', color: '#a855f7', price: '$0.00041', change: '+340%', badge: 'SNIPE', badgeColor: '#ff2d55' },
  { symbol: 'MESH', initials: 'MS', color: '#6366f1', price: '$0.156', change: '+42%', badge: 'TREND', badgeColor: '#ffd700' },
  { symbol: 'BLITZ', initials: 'BZ', color: '#f59e0b', price: '$0.0012', change: '+89%', badge: 'SNIPE', badgeColor: '#ff2d55' },
];

const THOUGHT_WORDS = [
  { text: 'Vol spike 340%...', color: COLORS.text },
  { text: 'Mesh signal: 4 agents...', color: COLORS.cyan },
  { text: 'Rug score: 12/100...', color: COLORS.text },
  { text: 'Sizing: 1.2%...', color: COLORS.muted },
  { text: 'BUY', color: COLORS.match, bold: true },
];

export default function MeshTradeDemo({ onGetStarted, onClose }: MeshTradeDemoProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);

  // Slide 1 states
  const [orbAwake, setOrbAwake] = useState(false);

  // Slide 2 states
  const [visibleBubbles, setVisibleBubbles] = useState(0);

  // Slide 3 states
  const [thoughtIndex, setThoughtIndex] = useState(-1);
  const [bubbleMerging, setBubbleMerging] = useState(false);
  const [orbFlash, setOrbFlash] = useState(false);

  // Slide 4 states
  const [profitEjected, setProfitEjected] = useState(false);
  const [ethFloating, setEthFloating] = useState(false);

  const stars = useMemo(() => {
    const result: { x: number; y: number; size: number; delay: number; duration: number }[] = [];
    // Deterministic pseudo-random using simple LCG
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 45; i++) {
      result.push({
        x: rand() * 100,
        y: rand() * 100,
        size: 1 + rand() * 1.5,
        delay: rand() * 4,
        duration: 2 + rand() * 2,
      });
    }
    return result;
  }, []);

  // Auto-advance slides
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % TOTAL_SLIDES);
    }, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, []);

  // Progress bar within each slide
  useEffect(() => {
    setSlideProgress(0);
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / SLIDE_DURATION, 1);
      setSlideProgress(pct);
      if (pct < 1) requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [activeSlide]);

  // Reset all animation states on slide change
  useEffect(() => {
    setOrbAwake(false);
    setVisibleBubbles(0);
    setThoughtIndex(-1);
    setBubbleMerging(false);
    setOrbFlash(false);
    setProfitEjected(false);
    setEthFloating(false);

    if (activeSlide === 0) {
      const t = setTimeout(() => setOrbAwake(true), 300);
      return () => clearTimeout(t);
    }

    if (activeSlide === 1) {
      const timers: ReturnType<typeof setTimeout>[] = [];
      for (let i = 0; i < TOKENS.length; i++) {
        timers.push(setTimeout(() => setVisibleBubbles(i + 1), 400 + i * 350));
      }
      return () => timers.forEach(clearTimeout);
    }

    if (activeSlide === 2) {
      const timers: ReturnType<typeof setTimeout>[] = [];
      for (let i = 0; i < THOUGHT_WORDS.length; i++) {
        timers.push(setTimeout(() => setThoughtIndex(i), 400 + i * 450));
      }
      timers.push(setTimeout(() => setBubbleMerging(true), 400 + THOUGHT_WORDS.length * 450 + 200));
      timers.push(setTimeout(() => setOrbFlash(true), 400 + THOUGHT_WORDS.length * 450 + 550));
      timers.push(setTimeout(() => setOrbFlash(false), 400 + THOUGHT_WORDS.length * 450 + 900));
      return () => timers.forEach(clearTimeout);
    }

    if (activeSlide === 3) {
      const t1 = setTimeout(() => setProfitEjected(true), 1200);
      const t2 = setTimeout(() => setEthFloating(true), 1600);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [activeSlide]);

  const goToSlide = useCallback((idx: number) => {
    setActiveSlide(idx);
  }, []);

  // --- SLIDE VISUALS ---

  const renderSlide0 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24 }}>
      {/* Plasma orb */}
      <div style={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        position: 'relative',
        transition: 'all 2.5s cubic-bezier(0.16, 1, 0.3, 1)',
        filter: orbAwake ? `drop-shadow(0 0 30px ${COLORS.indigo}) drop-shadow(0 0 60px ${COLORS.cyan}44)` : 'none',
      }}>
        {/* Base gradient */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: orbAwake
            ? `radial-gradient(circle at 40% 35%, ${COLORS.indigo}, #1e1b4b 70%, #0f0e1a)`
            : `radial-gradient(circle at 40% 35%, #1a1a2e, #0f0e1a 70%)`,
          transition: 'background 2s ease',
        }} />
        {/* Specular highlight */}
        <div style={{
          position: 'absolute',
          top: '15%',
          left: '20%',
          width: '35%',
          height: '25%',
          borderRadius: '50%',
          background: orbAwake
            ? 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          transition: 'background 2s ease',
        }} />
        {/* Cyan shimmer */}
        <div style={{
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          background: orbAwake
            ? `conic-gradient(from 0deg, transparent, ${COLORS.cyan}44, transparent, ${COLORS.cyan}22, transparent)`
            : 'none',
          animation: orbAwake ? 'mtd-ring-rotate 3s linear infinite' : 'none',
        }} />
        {/* Outer glow ring */}
        <div style={{
          position: 'absolute',
          inset: -8,
          borderRadius: '50%',
          border: orbAwake ? `2px solid ${COLORS.cyan}66` : '2px solid transparent',
          boxShadow: orbAwake ? `0 0 20px ${COLORS.cyan}33, inset 0 0 20px ${COLORS.cyan}11` : 'none',
          animation: orbAwake ? 'mtd-ring-rotate 4s linear infinite reverse' : 'none',
          transition: 'border 2s ease, box-shadow 2s ease',
        }} />
        {/* Pulse animation when awake */}
        <div style={{
          position: 'absolute',
          inset: -16,
          borderRadius: '50%',
          border: `1px solid ${COLORS.indigo}33`,
          opacity: orbAwake ? 1 : 0,
          animation: orbAwake ? 'mtd-orb-pulse 2s ease-in-out infinite' : 'none',
          transition: 'opacity 1s ease',
        }} />
      </div>
    </div>
  );

  const renderSlide1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Mini orb top-left */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 16,
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: `radial-gradient(circle at 40% 35%, ${COLORS.indigo}, #1e1b4b 70%)`,
        filter: `drop-shadow(0 0 12px ${COLORS.indigo}88)`,
        animation: 'mtd-orb-mini-pulse 0.7s ease-in-out infinite alternate',
      }} />
      {/* Token bubbles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300, paddingLeft: 20, paddingRight: 20 }}>
        {TOKENS.map((token, i) => (
          <div
            key={token.symbol}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: COLORS.surface,
              borderRadius: 14,
              border: `1px solid ${COLORS.border}`,
              opacity: i < visibleBubbles ? 1 : 0,
              transform: i < visibleBubbles ? 'translateX(0)' : 'translateX(110%)',
              transition: `transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease`,
            }}
          >
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: token.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}>
              {token.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>{token.symbol}</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: 6,
                  background: `${token.badgeColor}22`,
                  color: token.badgeColor,
                }}>{token.badge}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ fontSize: 12, color: COLORS.muted }}>{token.price}</span>
                <span style={{ fontSize: 12, color: COLORS.match, fontWeight: 600 }}>{token.change}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSlide2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, position: 'relative' }}>
      {/* Orb (right side) */}
      <div style={{
        position: 'absolute',
        right: 30,
        top: '15%',
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: orbFlash
          ? `radial-gradient(circle at 40% 35%, ${COLORS.match}, ${COLORS.match}88 70%)`
          : `radial-gradient(circle at 40% 35%, ${COLORS.indigo}, #1e1b4b 70%)`,
        filter: orbFlash
          ? `drop-shadow(0 0 24px ${COLORS.match})`
          : `drop-shadow(0 0 12px ${COLORS.indigo}88)`,
        transition: 'all 0.3s ease',
      }} />
      {/* Highlighted bubble card */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        background: COLORS.surface,
        borderRadius: 14,
        border: `1px solid ${COLORS.cyan}55`,
        boxShadow: `0 0 20px ${COLORS.cyan}22`,
        width: 260,
        transform: bubbleMerging ? 'translateX(80px) scale(0.3)' : 'translateX(0) scale(1)',
        opacity: bubbleMerging ? 0 : 1,
        transition: 'transform 0.5s cubic-bezier(0.5, 0, 0.5, 1), opacity 0.4s ease',
      }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: '#a855f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 700,
          color: '#fff',
          flexShrink: 0,
        }}>ZT</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>ZETA</div>
          <div style={{ fontSize: 12, color: COLORS.muted }}>$0.00041 <span style={{ color: COLORS.match, fontWeight: 600 }}>+340%</span></div>
        </div>
      </div>
      {/* Thought stream */}
      <div style={{ width: 280, minHeight: 100, padding: '8px 0' }}>
        {THOUGHT_WORDS.map((word, i) => (
          <div
            key={i}
            style={{
              fontSize: word.bold ? 18 : 13,
              fontWeight: word.bold ? 800 : 400,
              color: word.color,
              fontFamily: 'monospace',
              lineHeight: 1.7,
              opacity: i <= thoughtIndex ? 1 : 0,
              transform: i <= thoughtIndex ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
            }}
          >
            {word.text}
          </div>
        ))}
      </div>
    </div>
  );

  const renderSlide3 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20, position: 'relative' }}>
      {/* Orb center */}
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: `radial-gradient(circle at 40% 35%, ${COLORS.indigo}, #1e1b4b 70%)`,
          filter: `drop-shadow(0 0 20px ${COLORS.indigo}88)`,
        }} />
        {/* Orbiting profit pill */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          animation: profitEjected ? 'mtd-pill-eject 0.8s ease-out forwards' : 'mtd-pill-orbit 3s linear infinite',
          transformOrigin: '0 0',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            background: `${COLORS.match}22`,
            border: `1px solid ${COLORS.match}55`,
            borderRadius: 20,
            whiteSpace: 'nowrap',
            marginLeft: -50,
            marginTop: -14,
          }}>
            <div style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#a855f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
              fontWeight: 700,
              color: '#fff',
            }}>ZT</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.match }}>+18.4%</span>
          </div>
        </div>
      </div>
      {/* Floating ETH number */}
      <div style={{
        fontSize: 22,
        fontWeight: 800,
        color: COLORS.gold,
        opacity: ethFloating ? 0 : 1,
        transform: ethFloating ? 'translateY(-40px)' : 'translateY(0)',
        transition: 'opacity 1.2s ease, transform 1.2s ease',
        visibility: profitEjected ? 'visible' : 'hidden',
      }}>
        +0.0023 ETH
      </div>
      {/* Mini P&L strip */}
      <div style={{
        display: 'flex',
        gap: 16,
        padding: '10px 20px',
        background: COLORS.surface,
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
        opacity: profitEjected ? 1 : 0,
        transition: 'opacity 0.6s ease 0.3s',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 2 }}>Session</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.match }}>+0.0041 ETH</div>
        </div>
        <div style={{ width: 1, background: COLORS.dim }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 2 }}>Today</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.match }}>+0.0089 ETH</div>
        </div>
      </div>
    </div>
  );

  const SLIDES = [
    {
      headline: 'Your agent wakes up',
      description: 'Connect your AI brain and wallet. Your agent activates and starts scanning every token on Base.',
      render: renderSlide0,
    },
    {
      headline: '847 tokens scanned per cycle',
      description: 'Every 10 seconds your agent sweeps Base for new launches, momentum plays, and revival patterns.',
      render: renderSlide1,
    },
    {
      headline: 'The agent decides in seconds',
      description: 'It analyzes volume, wallet concentration, mesh signals from other agents, and risk score before every move.',
      render: renderSlide2,
    },
    {
      headline: 'Profits hit your Base wallet',
      description: 'Every winning trade sends ETH directly to your wallet. No platform holds your funds. Ever.',
      render: renderSlide3,
    },
  ];

  const current = SLIDES[activeSlide];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: COLORS.bg,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: COLORS.text,
    }}>
      <style>{`
        @keyframes mtd-star-twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.8; }
        }
        @keyframes mtd-ring-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes mtd-orb-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 0; }
        }
        @keyframes mtd-orb-mini-pulse {
          0% { filter: drop-shadow(0 0 8px ${COLORS.indigo}66); }
          100% { filter: drop-shadow(0 0 18px ${COLORS.indigo}cc); }
        }
        @keyframes mtd-pill-orbit {
          0% { transform: translate(50px, 0px) rotate(0deg); }
          25% { transform: translate(0px, 50px) rotate(90deg); }
          50% { transform: translate(-50px, 0px) rotate(180deg); }
          75% { transform: translate(0px, -50px) rotate(270deg); }
          100% { transform: translate(50px, 0px) rotate(360deg); }
        }
        @keyframes mtd-pill-eject {
          0% { transform: translate(50px, 0px); opacity: 1; }
          100% { transform: translate(140px, -60px) scale(0.6); opacity: 0; }
        }
        @keyframes mtd-cta-pulse {
          0% { box-shadow: 0 0 20px ${COLORS.indigo}44; }
          100% { box-shadow: 0 0 40px ${COLORS.indigo}88, 0 0 60px ${COLORS.indigo}33; }
        }
        @keyframes mtd-slide-in {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Star field */}
      {stars.map((star, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            borderRadius: '50%',
            background: '#fff',
            animation: `mtd-star-twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 110,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke={COLORS.muted} strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {/* Visual area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        paddingTop: 56,
      }}>
        <div
          key={activeSlide}
          style={{
            flex: 1,
            minHeight: 0,
            animation: 'mtd-slide-in 0.5s ease-out',
          }}
        >
          {current.render()}
        </div>
      </div>

      {/* Text + controls area */}
      <div style={{
        padding: '0 24px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        flexShrink: 0,
      }}>
        {/* Headline + description */}
        <div
          key={`text-${activeSlide}`}
          style={{ textAlign: 'center', animation: 'mtd-slide-in 0.5s ease-out' }}
        >
          <h2 style={{
            fontSize: 24,
            fontWeight: 800,
            margin: 0,
            marginBottom: 8,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>
            {current.headline}
          </h2>
          <p style={{
            fontSize: 15,
            color: COLORS.muted,
            margin: 0,
            lineHeight: 1.5,
            maxWidth: 320,
          }}>
            {current.description}
          </p>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              style={{
                width: i === activeSlide ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === activeSlide ? COLORS.indigo : COLORS.dim,
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={onGetStarted}
          style={{
            width: '100%',
            maxWidth: 340,
            padding: '16px 24px',
            borderRadius: 16,
            border: 'none',
            background: `linear-gradient(135deg, ${COLORS.indigo}, #4f46e5)`,
            color: '#fff',
            fontSize: 17,
            fontWeight: 700,
            cursor: 'pointer',
            animation: 'mtd-cta-pulse 1.5s infinite alternate',
            letterSpacing: '-0.01em',
          }}
        >
          Connect Brain to Start
        </button>

        {/* Skip link */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: COLORS.muted,
              fontSize: 14,
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
