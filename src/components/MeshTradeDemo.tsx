'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

interface MeshTradeDemoProps {
  onGetStarted: () => void;
  onClose?: () => void;
  hasBrain?: boolean;
}

const COLORS = {
  bg: '#0a0a0f',
  surface: '#0d0d14',
  indigo: '#6366f1',
  cyan: '#06b6d4',
  match: '#30d158',
  gold: '#ffd700',
  text: '#e8e8f0',
  muted: '#6b6b80',
  dim: '#2a2a3a',
  border: 'rgba(255,255,255,0.07)',
};

const SLIDE_DURATION = 6000;
const TOTAL_SLIDES = 5;

const TOKENS = [
  { symbol: 'APEX', initials: 'AP', color: '#ff6b6b', price: '$0.0034', change: '+124%', badge: 'SNIPE', badgeColor: '#ff2d55' },
  { symbol: 'NOVA', initials: 'NV', color: '#4ecdc4', price: '$0.0891', change: '+67%', badge: 'TREND', badgeColor: '#ffd700' },
  { symbol: 'ZETA', initials: 'ZT', color: '#a855f7', price: '$0.00041', change: '+340%', badge: 'SNIPE', badgeColor: '#ff2d55' },
];

const THOUGHT_LINES = [
  { text: 'scanning... ZETA/ETH', color: `${COLORS.cyan}99`, size: 16 },
  { text: 'volume spike: +340% in 90s', color: '#ffffff', size: 16 },
  { text: 'whale concentration: LOW', color: COLORS.match, size: 16 },
  { text: 'mesh signal: 4 agents watching', color: COLORS.indigo, size: 16 },
  { text: 'rug score: 12/100', color: COLORS.match, size: 16 },
  { text: 'BUY', color: COLORS.gold, size: 48, bold: true },
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export default function MeshTradeDemo({ onGetStarted, onClose, hasBrain = false }: MeshTradeDemoProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [prevSlide, setPrevSlide] = useState(-1);
  const [transitioning, setTransitioning] = useState(false);

  // Slide 0
  const [orbSize, setOrbSize] = useState(10);
  const [orbGlow, setOrbGlow] = useState(false);
  const [ringsVisible, setRingsVisible] = useState(0);
  const [headlineVisible, setHeadlineVisible] = useState(false);
  const [starsOn, setStarsOn] = useState(false);

  // Slide 1
  const [visibleCards, setVisibleCards] = useState(0);

  // Slide 2
  const [thoughtIndex, setThoughtIndex] = useState(-1);
  const [buyFlash, setBuyFlash] = useState(false);
  const [orbFlashGreen, setOrbFlashGreen] = useState(false);

  // Slide 3
  const [coinDropped, setCoinDropped] = useState(false);
  const [rippleActive, setRippleActive] = useState(false);
  const [profitCount, setProfitCount] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);
  const profitRef = useRef<number | null>(null);

  // Slide 4 — no special state, CSS animations only

  // Stars and particles (deterministic)
  const stars = useMemo(() => {
    const rand = seededRandom(42);
    return Array.from({ length: 60 }, () => ({
      x: rand() * 100,
      y: rand() * 100,
      size: 1 + rand() * 1.5,
      delay: rand() * 4,
      duration: 2 + rand() * 2,
    }));
  }, []);

  const particles = useMemo(() => {
    const rand = seededRandom(99);
    return Array.from({ length: 15 }, () => ({
      x: rand() * 100,
      size: 1 + rand() * 1.5,
      delay: rand() * 10,
      duration: 8 + rand() * 8,
      opacity: 0.1 + rand() * 0.15,
    }));
  }, []);

  // Slide transition
  const goToSlide = useCallback((idx: number) => {
    if (idx === activeSlide) return;
    setPrevSlide(activeSlide);
    setTransitioning(true);
    setTimeout(() => {
      setActiveSlide(idx);
      setTransitioning(false);
      setPrevSlide(-1);
    }, 400);
  }, [activeSlide]);

  // Auto-advance
  useEffect(() => {
    const interval = setInterval(() => {
      goToSlide(activeSlide === TOTAL_SLIDES - 1 ? 0 : activeSlide + 1);
    }, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, [activeSlide, goToSlide]);

  // Reset + animate per slide
  useEffect(() => {
    // Reset all
    setOrbSize(10);
    setOrbGlow(false);
    setRingsVisible(0);
    setHeadlineVisible(false);
    setStarsOn(false);
    setVisibleCards(0);
    setThoughtIndex(-1);
    setBuyFlash(false);
    setOrbFlashGreen(false);
    setCoinDropped(false);
    setRippleActive(false);
    setProfitCount(0);
    setStatsVisible(false);
    if (profitRef.current) cancelAnimationFrame(profitRef.current);

    const timers: ReturnType<typeof setTimeout>[] = [];

    if (activeSlide === 0) {
      timers.push(setTimeout(() => setStarsOn(true), 200));
      timers.push(setTimeout(() => { setOrbSize(180); setOrbGlow(true); }, 300));
      timers.push(setTimeout(() => setRingsVisible(1), 800));
      timers.push(setTimeout(() => setRingsVisible(2), 1200));
      timers.push(setTimeout(() => setRingsVisible(3), 1600));
      timers.push(setTimeout(() => setHeadlineVisible(true), 2300));
    }

    if (activeSlide === 1) {
      for (let i = 0; i < TOKENS.length; i++) {
        timers.push(setTimeout(() => setVisibleCards(i + 1), 600 + i * 700));
      }
    }

    if (activeSlide === 2) {
      for (let i = 0; i < THOUGHT_LINES.length; i++) {
        timers.push(setTimeout(() => {
          setThoughtIndex(i);
          if (i === THOUGHT_LINES.length - 1) {
            setBuyFlash(true);
            setOrbFlashGreen(true);
            setTimeout(() => setBuyFlash(false), 600);
          }
        }, 500 + i * 600));
      }
    }

    if (activeSlide === 3) {
      timers.push(setTimeout(() => setCoinDropped(true), 400));
      timers.push(setTimeout(() => setRippleActive(true), 900));
      timers.push(setTimeout(() => {
        const start = Date.now();
        const dur = 1500;
        const target = 0.0023;
        const tick = () => {
          const elapsed = Date.now() - start;
          const pct = Math.min(elapsed / dur, 1);
          setProfitCount(pct * target);
          if (pct < 1) profitRef.current = requestAnimationFrame(tick);
        };
        profitRef.current = requestAnimationFrame(tick);
      }, 1200));
      timers.push(setTimeout(() => setStatsVisible(true), 2800));
    }

    return () => {
      timers.forEach(clearTimeout);
      if (profitRef.current) cancelAnimationFrame(profitRef.current);
    };
  }, [activeSlide]);

  const currentOpacity = transitioning ? 0 : 1;

  const SLIDES = [
    { headline: 'Your agent awakens', sub: 'Connect your brain. Watch it come to life.' },
    { headline: '847 tokens scanned per cycle', sub: 'Every 10 seconds. Every launch. Every spike.' },
    { headline: 'The agent decides in seconds', sub: 'No emotion. No hesitation. Pure signal.' },
    { headline: 'Profits hit your Base wallet', sub: 'Directly to you. No platform holds your funds. Ever.' },
    { headline: 'Your agent never sleeps', sub: 'While you live your life, it works -- every second, every cycle.' },
  ];

  const currentSlideData = SLIDES[transitioning ? prevSlide : activeSlide] || SLIDES[activeSlide];

  // Clock labels for slide 4
  const clockLabels = [
    { angle: 0, text: '3:41 AM' },
    { angle: 45, text: 'scanning...' },
    { angle: 90, text: 'signal found' },
    { angle: 135, text: 'executing...' },
    { angle: 180, text: '7:12 AM' },
    { angle: 225, text: 'scanning...' },
    { angle: 270, text: 'new launch' },
    { angle: 315, text: 'profit taken' },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: COLORS.bg,
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: COLORS.text,
      zIndex: 9999,
    }}>
      <style>{`
        @keyframes mtd-star-twinkle {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.7; }
        }
        @keyframes mtd-star-awaken {
          0% { opacity: 0; }
          100% { opacity: 0.7; }
        }
        @keyframes mtd-particle-float {
          0% { transform: translateY(0); }
          100% { transform: translateY(-110vh); }
        }
        @keyframes mtd-ring-expand {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes mtd-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes mtd-cta-glow {
          0% { box-shadow: 0 0 20px ${COLORS.indigo}44, 0 4px 16px rgba(0,0,0,0.4); }
          100% { box-shadow: 0 0 40px ${COLORS.indigo}88, 0 0 60px ${COLORS.indigo}33, 0 4px 16px rgba(0,0,0,0.4); }
        }
        @keyframes mtd-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes mtd-orbit-dot {
          0% { transform: rotate(0deg) translateX(var(--orbit-r)) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(var(--orbit-r)) rotate(-360deg); }
        }
        @keyframes mtd-coin-drop {
          0% { transform: translateY(-40vh); opacity: 0; }
          60% { transform: translateY(0); opacity: 1; }
          75% { transform: translateY(-20px); }
          100% { transform: translateY(0); }
        }
        @keyframes mtd-ripple {
          0% { transform: scale(0.3); opacity: 0.7; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes mtd-buy-flash {
          0% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(2); }
          100% { opacity: 0; transform: scale(3); }
        }
        @keyframes mtd-ring-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Star field - 60 stars */}
      {stars.map((star, i) => (
        <div
          key={`star-${i}`}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            borderRadius: '50%',
            background: '#fff',
            opacity: activeSlide === 0 && !starsOn ? 0 : undefined,
            animation: activeSlide === 0
              ? (starsOn ? `mtd-star-awaken 1.5s ease-out ${star.delay * 0.3}s forwards, mtd-star-twinkle ${star.duration}s ease-in-out ${star.delay}s infinite` : 'none')
              : `mtd-star-twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      ))}

      {/* Particles drifting up */}
      {particles.map((p, i) => (
        <div
          key={`particle-${i}`}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            bottom: 0,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: '#fff',
            opacity: p.opacity,
            animation: `mtd-particle-float ${p.duration}s linear ${p.delay}s infinite`,
            pointerEvents: 'none',
            zIndex: 0,
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
            zIndex: 200,
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

      {/* ========== ANIMATION ZONE: top 55% ========== */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '55%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
        opacity: currentOpacity,
        transition: 'opacity 0.4s ease-out',
      }}>

        {/* SLIDE 0: Orb awakens */}
        {activeSlide === 0 && (
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
          }}>
            {/* Concentric rings */}
            {[0, 1, 2].map((i) => (
              <div
                key={`ring-${i}`}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 180,
                  height: 180,
                  marginLeft: -90,
                  marginTop: -90,
                  borderRadius: '50%',
                  border: `1px solid ${COLORS.indigo}66`,
                  opacity: ringsVisible > i ? 1 : 0,
                  animation: ringsVisible > i ? `mtd-ring-expand 2.5s ease-out ${i * 0.3}s infinite` : 'none',
                  pointerEvents: 'none',
                }}
              />
            ))}
            {/* Main orb */}
            <div style={{
              width: orbSize,
              height: orbSize,
              borderRadius: '50%',
              background: orbGlow
                ? `radial-gradient(circle at 40% 35%, ${COLORS.indigo}, #1e1b4b 70%, #0f0e1a)`
                : `radial-gradient(circle at 50% 50%, #333, #1a1a2e)`,
              transition: 'width 2s cubic-bezier(0.16, 1, 0.3, 1), height 2s cubic-bezier(0.16, 1, 0.3, 1), background 1.5s ease, box-shadow 1.5s ease, filter 1.5s ease',
              boxShadow: orbGlow
                ? `0 0 40px ${COLORS.indigo}88, 0 0 80px ${COLORS.indigo}44, 0 0 120px ${COLORS.cyan}22, inset 0 0 30px ${COLORS.indigo}44`
                : 'none',
              filter: orbGlow
                ? `drop-shadow(0 0 30px ${COLORS.indigo}) drop-shadow(0 0 60px ${COLORS.cyan}44)`
                : 'none',
              position: 'relative',
              zIndex: 2,
            }}>
              {/* Specular highlight */}
              <div style={{
                position: 'absolute',
                top: '15%',
                left: '20%',
                width: '35%',
                height: '25%',
                borderRadius: '50%',
                background: orbGlow
                  ? 'radial-gradient(circle, rgba(255,255,255,0.45) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
                transition: 'background 1.5s ease',
              }} />
              {/* Conic shimmer ring */}
              <div style={{
                position: 'absolute',
                inset: -6,
                borderRadius: '50%',
                background: orbGlow
                  ? `conic-gradient(from 0deg, transparent, ${COLORS.cyan}44, transparent, ${COLORS.cyan}22, transparent)`
                  : 'none',
                animation: orbGlow ? 'mtd-ring-rotate 3s linear infinite' : 'none',
              }} />
            </div>
          </div>
        )}

        {/* SLIDE 1: Signal Detected — orb top-left + token cards from right */}
        {activeSlide === 1 && (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}>
            {/* Mini orb top-left */}
            <div style={{
              position: 'absolute',
              top: 40,
              left: 30,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: `radial-gradient(circle at 40% 35%, ${COLORS.indigo}, #1e1b4b 70%)`,
              boxShadow: `0 0 30px ${COLORS.indigo}88, 0 0 60px ${COLORS.indigo}44`,
              animation: 'mtd-breathe 2s ease-in-out infinite',
            }}>
              <div style={{
                position: 'absolute',
                top: '15%',
                left: '22%',
                width: '30%',
                height: '22%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)',
              }} />
            </div>

            {/* Token cards */}
            <div style={{
              position: 'absolute',
              top: '15%',
              right: 20,
              left: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              alignItems: 'flex-end',
            }}>
              {TOKENS.map((token, i) => {
                const isLast = i === TOKENS.length - 1;
                return (
                  <div
                    key={token.symbol}
                    style={{
                      width: '90%',
                      maxWidth: 400,
                      padding: '16px 20px',
                      background: COLORS.surface,
                      borderRadius: 16,
                      border: `1px solid ${isLast && visibleCards > i ? `${COLORS.cyan}66` : COLORS.border}`,
                      boxShadow: isLast && visibleCards > i ? `0 0 20px ${COLORS.cyan}22` : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      opacity: i < visibleCards ? 1 : 0,
                      transform: i < visibleCards ? 'translateX(0)' : 'translateX(120%)',
                      transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
                    }}
                  >
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      background: token.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#fff',
                      flexShrink: 0,
                    }}>
                      {token.initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 16, color: COLORS.text }}>{token.symbol}</span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 8,
                          background: `${token.badgeColor}22`,
                          color: token.badgeColor,
                        }}>{token.badge}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ fontSize: 14, color: COLORS.muted }}>{token.price}</span>
                        <span style={{ fontSize: 14, color: COLORS.match, fontWeight: 700 }}>{token.change}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SLIDE 2: The Decision — terminal thought stream */}
        {activeSlide === 2 && (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {/* Orb top-right */}
            <div style={{
              position: 'absolute',
              top: 40,
              right: 30,
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: orbFlashGreen
                ? `radial-gradient(circle at 40% 35%, ${COLORS.match}, ${COLORS.match}88 70%)`
                : `radial-gradient(circle at 40% 35%, ${COLORS.indigo}, #1e1b4b 70%)`,
              boxShadow: orbFlashGreen
                ? `0 0 30px ${COLORS.match}88, 0 0 60px ${COLORS.match}44`
                : `0 0 20px ${COLORS.indigo}66, 0 0 40px ${COLORS.indigo}33`,
              transition: 'all 0.3s ease',
            }} />

            {/* BUY flash background burst */}
            {buyFlash && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 200,
                height: 200,
                marginLeft: -100,
                marginTop: -100,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${COLORS.gold}44, transparent 70%)`,
                animation: 'mtd-buy-flash 0.6s ease-out forwards',
                pointerEvents: 'none',
              }} />
            )}

            {/* Terminal thought lines */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              padding: '0 30px',
              maxWidth: 420,
              width: '100%',
            }}>
              {THOUGHT_LINES.map((line, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: '"SF Mono", "Fira Code", "Consolas", monospace',
                    fontSize: line.size,
                    fontWeight: (line as { bold?: boolean }).bold ? 900 : 400,
                    color: line.color,
                    opacity: i <= thoughtIndex ? 1 : 0,
                    transform: i <= thoughtIndex ? 'translateY(0)' : 'translateY(12px)',
                    transition: 'opacity 0.4s ease, transform 0.4s ease',
                    textShadow: (line as { bold?: boolean }).bold && i <= thoughtIndex
                      ? `0 0 30px ${COLORS.gold}88, 0 0 60px ${COLORS.gold}44`
                      : 'none',
                    letterSpacing: (line as { bold?: boolean }).bold ? '0.05em' : undefined,
                  }}
                >
                  {i <= thoughtIndex && i < THOUGHT_LINES.length - 1 && (
                    <span style={{ color: COLORS.dim, marginRight: 8 }}>{'>'}</span>
                  )}
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIDE 3: Profit Lands */}
        {activeSlide === 3 && (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
          }}>
            {/* ETH coin */}
            <div style={{
              position: 'relative',
              width: 100,
              height: 100,
            }}>
              <div style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: `radial-gradient(circle at 40% 35%, ${COLORS.gold}, #b8860b 70%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                fontWeight: 900,
                color: '#0a0a0f',
                boxShadow: `0 0 30px ${COLORS.gold}66, 0 0 60px ${COLORS.gold}33`,
                animation: coinDropped ? 'mtd-coin-drop 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                opacity: coinDropped ? undefined : 0,
                fontFamily: 'serif',
              }}>
                {'\u039E'}
              </div>
              {/* Ripple rings on landing */}
              {rippleActive && [0, 1, 2].map((i) => (
                <div
                  key={`ripple-${i}`}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 100,
                    height: 100,
                    marginLeft: -50,
                    marginTop: -50,
                    borderRadius: '50%',
                    border: `1px solid ${COLORS.gold}55`,
                    animation: `mtd-ripple 1.5s ease-out ${i * 0.2}s forwards`,
                    pointerEvents: 'none',
                  }}
                />
              ))}
            </div>

            {/* Profit count-up */}
            <div style={{
              fontSize: 36,
              fontWeight: 900,
              color: COLORS.gold,
              fontFamily: '"SF Mono", "Fira Code", monospace',
              letterSpacing: '0.02em',
              opacity: coinDropped ? 1 : 0,
              transition: 'opacity 0.5s ease 0.8s',
              textShadow: `0 0 20px ${COLORS.gold}44`,
            }}>
              +{profitCount.toFixed(4)} ETH
            </div>

            {/* Stat pills */}
            <div style={{
              display: 'flex',
              gap: 12,
              opacity: statsVisible ? 1 : 0,
              transform: statsVisible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}>
              {[
                { label: 'Session', value: '+0.0041 ETH' },
                { label: 'Today', value: '+0.0089 ETH' },
              ].map((stat) => (
                <div key={stat.label} style={{
                  padding: '10px 20px',
                  background: COLORS.surface,
                  borderRadius: 14,
                  border: `1px solid ${COLORS.border}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 3 }}>{stat.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.match }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIDE 4: Never Sleeps — large orb + orbiting dots + clock labels */}
        {activeSlide === 4 && (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {/* Central orb */}
            <div style={{
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: `radial-gradient(circle at 40% 35%, ${COLORS.indigo}, ${COLORS.cyan}33 60%, #1e1b4b 85%)`,
              boxShadow: `0 0 50px ${COLORS.indigo}88, 0 0 100px ${COLORS.indigo}44, 0 0 150px ${COLORS.cyan}22, inset 0 0 40px ${COLORS.indigo}44`,
              animation: 'mtd-breathe 3s ease-in-out infinite',
              position: 'relative',
            }}>
              {/* Specular */}
              <div style={{
                position: 'absolute',
                top: '12%',
                left: '18%',
                width: '35%',
                height: '25%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)',
              }} />
            </div>

            {/* 8 orbiting dots */}
            {Array.from({ length: 8 }).map((_, i) => {
              const speed = 5 + i * 0.7;
              const radius = 120 + (i % 3) * 20;
              return (
                <div
                  key={`orbit-${i}`}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 6 + (i % 3),
                    height: 6 + (i % 3),
                    marginLeft: -(3 + (i % 3) * 0.5),
                    marginTop: -(3 + (i % 3) * 0.5),
                    borderRadius: '50%',
                    background: i % 2 === 0 ? COLORS.cyan : COLORS.indigo,
                    boxShadow: `0 0 8px ${i % 2 === 0 ? COLORS.cyan : COLORS.indigo}88`,
                    opacity: 0.75,
                    ['--orbit-r' as string]: `${radius}px`,
                    animation: `mtd-orbit-dot ${speed}s linear infinite`,
                    animationDelay: `${-i * 0.8}s`,
                  }}
                />
              );
            })}

            {/* Clock position labels */}
            {clockLabels.map((label, i) => {
              const rad = (label.angle - 90) * Math.PI / 180;
              const dist = 180;
              const x = Math.cos(rad) * dist;
              const y = Math.sin(rad) * dist;
              return (
                <div
                  key={`clock-${i}`}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
                    fontSize: 11,
                    color: `${COLORS.muted}88`,
                    fontFamily: '"SF Mono", "Fira Code", monospace',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    opacity: 0.6,
                  }}
                >
                  {label.text}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========== BOTTOM CONTROLS — pinned ========== */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: `linear-gradient(to top, ${COLORS.bg} 50%, ${COLORS.bg}ee 75%, transparent)`,
        paddingTop: 40,
        paddingBottom: 36,
        paddingLeft: 24,
        paddingRight: 24,
        gap: 16,
      }}>
        {/* Headline + sub with crossfade */}
        <div style={{
          position: 'relative',
          width: '100%',
          minHeight: 80,
          textAlign: 'center',
        }}>
          {SLIDES.map((slide, idx) => {
            const isActive = idx === activeSlide && !transitioning;
            const isLeaving = transitioning && idx === prevSlide;
            return (
              <div
                key={`text-${idx}`}
                style={{
                  position: idx === 0 ? 'relative' : 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  opacity: isActive ? 1 : (isLeaving ? 0 : 0),
                  transition: 'opacity 0.4s ease-out',
                  pointerEvents: isActive ? 'auto' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <h2 style={{
                  fontSize: 28,
                  fontWeight: 900,
                  margin: 0,
                  marginBottom: 8,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}>
                  {slide.headline}
                </h2>
                <p style={{
                  fontSize: 15,
                  color: COLORS.muted,
                  margin: 0,
                  lineHeight: 1.5,
                  maxWidth: 340,
                }}>
                  {slide.sub}
                </p>
              </div>
            );
          })}
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              style={{
                width: i === activeSlide ? 28 : 8,
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
            maxWidth: 380,
            height: 60,
            borderRadius: 20,
            border: 'none',
            background: hasBrain ? 'linear-gradient(135deg, #06b6d4, #6366f1)' : 'linear-gradient(135deg, #6366f1, #a855f7)',
            color: '#fff',
            fontSize: 16,
            fontWeight: 900,
            cursor: 'pointer',
            letterSpacing: '-0.01em',
            position: 'relative',
            overflow: 'hidden',
            animation: 'mtd-cta-glow 1.5s infinite alternate',
            flexShrink: 0,
          }}
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
            backgroundSize: '200% 100%',
            animation: 'mtd-shimmer 3s ease-in-out infinite',
            pointerEvents: 'none',
            borderRadius: 20,
          }} />
          <span style={{ position: 'relative', zIndex: 1 }}>{hasBrain ? 'Enter Trading Console' : 'Connect Brain to Start Trading'}</span>
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
              flexShrink: 0,
            }}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
