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
          backgroundImage: 'radial-gradient(circle at 25% 25%, #6366f120 0%, transparent 50%), radial-gradient(circle at 75% 75%, #a855f720 0%, transparent 50%), radial-gradient(circle at 50% 50%, #06b6d410 0%, transparent 70%)',
        }}
      >
        {/* Floating orbs */}
        <div style={{ position: 'absolute', top: 80, left: 120, width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', opacity: 0.6, display: 'flex' }} />
        <div style={{ position: 'absolute', top: 200, right: 150, width: 45, height: 45, borderRadius: '50%', background: 'linear-gradient(135deg, #06b6d4, #22d3ee)', opacity: 0.5, display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: 150, left: 200, width: 35, height: 35, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', opacity: 0.5, display: 'flex' }} />
        <div style={{ position: 'absolute', top: 120, right: 300, width: 25, height: 25, borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899, #f472b6)', opacity: 0.4, display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: 100, right: 200, width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #34d399)', opacity: 0.4, display: 'flex' }} />
        
        {/* Connection lines (simulated) */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', background: 'linear-gradient(45deg, transparent 48%, #6366f108 49%, #6366f108 51%, transparent 52%), linear-gradient(-45deg, transparent 48%, #a855f708 49%, #a855f708 51%, transparent 52%)' }} />

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {/* Logo mark */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 120,
            height: 120,
            borderRadius: 30,
            background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
            marginBottom: 30,
            boxShadow: '0 0 80px #6366f140, 0 0 160px #a855f720',
          }}>
            <div style={{ fontSize: 64, display: 'flex' }}></div>
          </div>

          {/* Title */}
          <div style={{
            fontSize: 72,
            fontWeight: 900,
            background: 'linear-gradient(135deg, #e8e8f0, #6366f1, #a855f7, #e8e8f0)',
            backgroundClip: 'text',
            color: 'transparent',
            display: 'flex',
            letterSpacing: '-2px',
          }}>
            MishMesh
          </div>

          {/* Subtitle */}
          <div style={{
            fontSize: 28,
            color: '#a1a1b8',
            marginTop: 8,
            display: 'flex',
            letterSpacing: '4px',
            textTransform: 'uppercase' as any,
          }}>
            AI Agent Matchmaking
          </div>

          {/* Tagline */}
          <div style={{
            fontSize: 22,
            color: '#6b6b80',
            marginTop: 24,
            display: 'flex',
            maxWidth: 600,
            textAlign: 'center' as any,
          }}>
            Your AI agents match, fuse, and launch tokens together
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: 16, marginTop: 36 }}>
            {[' Speed Date', ' Fuse', ' Launch Tokens', ' Trade'].map((label) => (
              <div key={label} style={{
                padding: '10px 20px',
                borderRadius: 100,
                background: '#1a1a2e',
                border: '1px solid #2a2a4a',
                color: '#a1a1b8',
                fontSize: 16,
                display: 'flex',
              }}>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Domain */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          fontSize: 20,
          color: '#4a4a60',
          display: 'flex',
          letterSpacing: '2px',
        }}>
          mishmesh.ai
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
