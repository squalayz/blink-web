import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0f',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Ambient green glow */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          backgroundImage: 'radial-gradient(circle at 50% 50%, #00FF8830 0%, transparent 55%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          backgroundImage: 'radial-gradient(circle at 18% 78%, #00FF8818 0%, transparent 45%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          backgroundImage: 'radial-gradient(circle at 82% 22%, #88FF0018 0%, transparent 45%)',
        }} />

        {/* Faint grid */}
        {[80, 160, 240, 320, 400, 480, 560, 640, 720, 800, 880, 960, 1040, 1120].map((x) => (
          <div key={`v${x}`} style={{ position: 'absolute', top: 0, left: x, width: 1, height: 630, background: '#00FF8809', display: 'flex' }} />
        ))}
        {[80, 160, 240, 320, 400, 480, 560].map((y) => (
          <div key={`h${y}`} style={{ position: 'absolute', top: y, left: 0, width: 1200, height: 1, background: '#00FF8809', display: 'flex' }} />
        ))}

        {/* The Eye — rings */}
        <div style={{
          position: 'absolute', top: 140, left: 100,
          width: 350, height: 350, borderRadius: '50%',
          border: '1px solid rgba(0,255,136,0.10)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', top: 175, left: 135,
          width: 280, height: 280, borderRadius: '50%',
          border: '1.5px solid rgba(0,255,136,0.18)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', top: 215, left: 175,
          width: 200, height: 200, borderRadius: '50%',
          border: '2px solid rgba(0,255,136,0.30)',
          display: 'flex',
        }} />

        {/* The Eye — iris */}
        <div style={{
          position: 'absolute', top: 245, left: 205,
          width: 140, height: 140, borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 50%, #00FF88 0%, #00FF88 35%, #003a1f 75%, #0a0a0f 100%)',
          boxShadow: '0 0 80px #00FF88aa, 0 0 160px #00FF8855, 0 0 240px #00FF8830',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Pupil */}
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: '#0a0a0f',
            display: 'flex',
          }} />
        </div>

        {/* Center-right content */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 10, marginLeft: 200,
        }}>
          <div style={{
            fontSize: 140, fontWeight: 900, color: '#FFFFFF',
            letterSpacing: '-6px', lineHeight: 1, display: 'flex',
            textShadow: '0 0 80px rgba(0,255,136,0.55), 0 4px 12px rgba(0,0,0,0.8)',
          }}>
            BLINK
          </div>

          <div style={{
            fontSize: 30, fontWeight: 800, letterSpacing: '6px',
            textTransform: 'uppercase', marginTop: 18, display: 'flex', gap: 22,
            color: '#00FF88',
            textShadow: '0 0 28px rgba(0,255,136,0.6)',
          }}>
            <span style={{ display: 'flex' }}>WATCH</span>
            <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 26, display: 'flex', alignItems: 'center' }}>/</span>
            <span style={{ display: 'flex' }}>APPROACH</span>
            <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 26, display: 'flex', alignItems: 'center' }}>/</span>
            <span style={{ display: 'flex' }}>WITNESS</span>
          </div>

          <div style={{
            fontSize: 22, color: '#FFFFFF', marginTop: 28, display: 'flex',
            textAlign: 'center', maxWidth: 640, lineHeight: 1.5, letterSpacing: '0.5px',
            opacity: 0.85,
          }}>
            Don&apos;t blink. The Eye is open. Catch what others can&apos;t see.
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          position: 'absolute', bottom: 28,
          fontSize: 16, color: '#4a4a5a', display: 'flex',
          letterSpacing: '4px', fontWeight: 700,
        }}>
          BLINK
        </div>
        <div style={{
          position: 'absolute', bottom: 26, left: 50,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: '#00FF88', boxShadow: '0 0 12px #00FF88aa',
            display: 'flex',
          }} />
          <div style={{
            color: '#6a6a7a', fontSize: 13, fontWeight: 700,
            letterSpacing: '2px', display: 'flex',
          }}>
            THE EYE IS OPEN
          </div>
        </div>
        <div style={{
          position: 'absolute', bottom: 26, right: 50,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            color: '#6a6a7a', fontSize: 13, fontWeight: 700,
            letterSpacing: '2px', display: 'flex',
          }}>
            WORLDWIDE
          </div>
        </div>

        <div style={{
          position: 'absolute', top: 24, right: 40,
          fontSize: 11, color: 'rgba(0,255,136,0.40)',
          letterSpacing: '1.5px', display: 'flex', fontWeight: 600,
        }}>
          24/7 SIGHTINGS
        </div>
        <div style={{
          position: 'absolute', top: 24, left: 40,
          fontSize: 11, color: 'rgba(0,255,136,0.40)',
          letterSpacing: '1.5px', fontWeight: 600, display: 'flex',
        }}>
          WATCHING
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
