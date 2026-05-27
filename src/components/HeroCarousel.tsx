'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { BESTIARY, RARITY_COLOR } from '@/lib/bestiary'

const RARITY_ORDER = { mythic: 0, legendary: 1, rare: 2, uncommon: 3, common: 4 } as const

const OFFSET_TRANSFORM: Record<number, { tz: number; tx: number; ry: number; opacity: number; zIndex: number }> = {
  [-2]: { tz: -240, tx: -370, ry: 48, opacity: 0.65, zIndex: 6 },
  [-1]: { tz: -130, tx: -210, ry: 26, opacity: 0.88, zIndex: 8 },
  [0]: { tz: 0, tx: 0, ry: 0, opacity: 1.0, zIndex: 10 },
  [1]: { tz: -130, tx: 210, ry: -26, opacity: 0.88, zIndex: 8 },
  [2]: { tz: -240, tx: 370, ry: -48, opacity: 0.65, zIndex: 6 },
}

const PARTICLES = [
  { x: 8, y: 15, d: 0.0, dur: 2.8 },
  { x: 18, y: 72, d: 1.1, dur: 3.4 },
  { x: 28, y: 35, d: 0.5, dur: 2.6 },
  { x: 38, y: 88, d: 2.0, dur: 4.0 },
  { x: 52, y: 8, d: 1.4, dur: 3.2 },
  { x: 64, y: 65, d: 0.3, dur: 2.9 },
  { x: 74, y: 22, d: 1.8, dur: 3.6 },
  { x: 82, y: 80, d: 0.8, dur: 3.0 },
  { x: 90, y: 42, d: 2.3, dur: 4.2 },
  { x: 12, y: 55, d: 1.6, dur: 3.8 },
  { x: 46, y: 92, d: 0.2, dur: 2.7 },
  { x: 96, y: 18, d: 1.9, dur: 3.3 },
]

const KEYFRAMES = `
@keyframes earthSpin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
@keyframes earthAtmo { 0%,100% { opacity:0.5 } 50% { opacity:1.0 } }
@keyframes hcTwinkle { 0%,100% { opacity:0.15; transform:scale(0.6) } 50% { opacity:0.9; transform:scale(1.2) } }
`

export function HeroCarousel() {
  const [mounted, setMounted] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const creatures = useMemo(
    () => [...BESTIARY].sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]),
    []
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || creatures.length === 0) return
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % creatures.length)
    }, 3200)
    return () => window.clearInterval(id)
  }, [mounted, creatures.length])

  if (!mounted || creatures.length === 0) return null

  const total = creatures.length

  return (
    <div
      style={{
        height: 'clamp(420px, 50vw, 520px)',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        background: '#0a0a0f',
      }}
    >
      <style>{KEYFRAMES}</style>

      {PARTICLES.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${p.y}%`,
            left: `${p.x}%`,
            width: 2,
            height: 2,
            borderRadius: '50%',
            background: '#00FF88',
            boxShadow: '0 0 6px #00FF88',
            animation: `hcTwinkle ${p.dur}s ease-in-out ${p.d}s infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}

      <div
        style={{
          perspective: '1200px',
          perspectiveOrigin: '50% 45%',
          position: 'relative',
          height: '100%',
        }}
      >
        {[-2, -1, 0, 1, 2].map((offset) => {
          const idx = (((activeIndex + offset) % total) + total) % total
          const creature = creatures[idx]
          const cfg = OFFSET_TRANSFORM[offset]
          const rarityColor = RARITY_COLOR[creature.rarity]
          const isCenter = offset === 0

          const shadow = isCenter
            ? `0 0 40px ${rarityColor}, 0 20px 60px rgba(0,0,0,0.6)`
            : '0 10px 30px rgba(0,0,0,0.5)'

          return (
            <div
              key={offset}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                marginLeft: -95,
                marginTop: -141,
                transform: `translateZ(${cfg.tz}px) translateX(${cfg.tx}px) rotateY(${cfg.ry}deg) scale(1.0)`,
                opacity: cfg.opacity,
                zIndex: cfg.zIndex,
                transition: 'all 0.72s cubic-bezier(0.25,0.46,0.45,0.94)',
                transformStyle: 'preserve-3d',
              }}
            >
              {isCenter && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    marginLeft: -80,
                    top: 'calc(50% + 80px)',
                    width: 160,
                    height: 160,
                    borderRadius: '50%',
                    background:
                      'radial-gradient(circle at 40% 35%, #1e7a42 0%, #0e5030 20%, #0a2040 50%, #050f20 100%)',
                    boxShadow:
                      '0 0 35px rgba(0,255,136,0.55), 0 0 70px rgba(0,100,255,0.25), inset 0 0 25px rgba(0,0,0,0.7)',
                    border: '1.5px solid rgba(0,255,136,0.35)',
                    overflow: 'hidden',
                    zIndex: 5,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background:
                        'linear-gradient(135deg, transparent 40%, rgba(0,255,136,0.12) 60%, transparent 80%)',
                      animation: 'earthSpin 18s linear infinite',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      background:
                        'radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,200,100,0.3) 68%, transparent 85%)',
                      animation: 'earthAtmo 3.2s ease-in-out infinite',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              )}

              <div
                style={{
                  width: 190,
                  height: 283,
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: `2px solid ${rarityColor}`,
                  boxShadow: shadow,
                  position: 'relative',
                  zIndex: 10,
                }}
              >
                <Image
                  src={creature.image}
                  alt={creature.name}
                  fill
                  sizes="190px"
                  style={{ objectFit: 'cover' }}
                />
              </div>

              {isCenter && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: -32,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    whiteSpace: 'nowrap',
                    zIndex: 11,
                  }}
                >
                  <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
                    {creature.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: rarityColor,
                      color: '#0a0a0f',
                    }}
                  >
                    {creature.rarity}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
