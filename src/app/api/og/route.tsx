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
          backgroundColor: '#0A0A0F',
          backgroundImage:
            'radial-gradient(circle at 20% 30%, #9945FF22 0%, transparent 45%), radial-gradient(circle at 80% 20%, #14F19518 0%, transparent 40%), radial-gradient(circle at 60% 80%, #627EEA18 0%, transparent 40%), radial-gradient(circle at 30% 80%, #F7931A14 0%, transparent 35%)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Background mesh grid lines */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          backgroundImage: 'linear-gradient(rgba(153,69,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(153,69,255,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Orb dots scattered */}
        <div style={{ position: 'absolute', top: 60, left: 80, width: 52, height: 52, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #9945FFee, #9945FF44)', boxShadow: '0 0 20px #9945FF66, 0 0 40px #9945FF22', display: 'flex' }} />
        <div style={{ position: 'absolute', top: 160, right: 120, width: 36, height: 36, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #14F195ee, #14F19544)', boxShadow: '0 0 16px #14F19566, 0 0 32px #14F19522', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: 100, left: 140, width: 44, height: 44, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #F7931Aee, #F7931A44)', boxShadow: '0 0 18px #F7931A66, 0 0 36px #F7931A22', display: 'flex' }} />
        <div style={{ position: 'absolute', top: 80, right: 260, width: 24, height: 24, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #06B6D4ee, #06B6D444)', boxShadow: '0 0 12px #06B6D466', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: 140, right: 180, width: 40, height: 40, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #EC4899ee, #EC489944)', boxShadow: '0 0 16px #EC489966, 0 0 32px #EC489922', display: 'flex' }} />
        <div style={{ position: 'absolute', top: 240, left: 60, width: 20, height: 20, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #627EEAee, #627EEA44)', boxShadow: '0 0 10px #627EEA66', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: 60, left: 340, width: 28, height: 28, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #9945FFee, #9945FF44)', boxShadow: '0 0 14px #9945FF66', display: 'flex' }} />
        <div style={{ position: 'absolute', top: 300, right: 80, width: 18, height: 18, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #14F195ee, #14F19544)', boxShadow: '0 0 10px #14F19566', display: 'flex' }} />

        {/* Sonar ring on main orb */}
        <div style={{ position: 'absolute', top: 28, left: 48, width: 116, height: 116, borderRadius: '50%', border: '1.5px solid #9945FF44', display: 'flex' }} />

        {/* Center content */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, zIndex: 10 }}>

          {/* Main hero orb */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 130,
            height: 130,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #9945FFff, #7B2FD4ff 50%, #5B1DA4cc)',
            boxShadow: '0 0 60px #9945FF88, 0 0 120px #9945FF44, 0 0 200px #9945FF22',
            marginBottom: 28,
          }}>
            {/* Globe icon SVG */}
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" strokeOpacity="0.9" />
              <ellipse cx="12" cy="12" rx="4" ry="10" stroke="white" strokeWidth="1.2" strokeOpacity="0.7" />
              <line x1="2" y1="12" x2="22" y2="12" stroke="white" strokeWidth="1.2" strokeOpacity="0.7" />
              <line x1="4.9" y1="6" x2="19.1" y2="6" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
              <line x1="4.9" y1="18" x2="19.1" y2="18" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
            </svg>
          </div>

          {/* Brand name */}
          <div style={{
            fontSize: 82,
            fontWeight: 900,
            color: '#F9FAFB',
            letterSpacing: '-3px',
            lineHeight: 1,
            display: 'flex',
          }}>
            MishMesh
          </div>

          {/* Tagline */}
          <div style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '6px',
            textTransform: 'uppercase',
            marginTop: 10,
            display: 'flex',
            gap: 16,
          }}>
            <span style={{ color: '#9945FF' }}>DROP</span>
            <span style={{ color: '#9CA3AF', fontSize: 22 }}>·</span>
            <span style={{ color: '#14F195' }}>HUNT</span>
            <span style={{ color: '#9CA3AF', fontSize: 22 }}>·</span>
            <span style={{ color: '#F7931A' }}>CRACK</span>
          </div>

          {/* Description */}
          <div style={{
            fontSize: 22,
            color: '#9CA3AF',
            marginTop: 20,
            display: 'flex',
            textAlign: 'center',
            maxWidth: 680,
            lineHeight: 1.5,
          }}>
            Real crypto hidden at GPS locations worldwide. Walk to it. Crack it. Keep it.
          </div>

          {/* Chain pills */}
          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            {[
              { label: 'SOL', color: '#9945FF', bg: '#9945FF18', border: '#9945FF40' },
              { label: 'ETH', color: '#627EEA', bg: '#627EEA18', border: '#627EEA40' },
              { label: 'BTC', color: '#F7931A', bg: '#F7931A18', border: '#F7931A40' },
              { label: 'NFT', color: '#14F195', bg: '#14F19518', border: '#14F19540' },
            ].map((c) => (
              <div key={c.label} style={{
                padding: '8px 22px',
                borderRadius: 100,
                background: c.bg,
                border: `1.5px solid ${c.border}`,
                color: c.color,
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '2px',
                display: 'flex',
              }}>
                {c.label}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom domain */}
        <div style={{
          position: 'absolute',
          bottom: 32,
          fontSize: 18,
          color: '#4B5563',
          display: 'flex',
          letterSpacing: '3px',
          fontWeight: 600,
        }}>
          mishmesh.ai
        </div>

        {/* Stat badges bottom corners */}
        <div style={{
          position: 'absolute', bottom: 28, left: 50,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{ color: '#14F195', fontSize: 22, fontWeight: 900, display: 'flex' }}>2,847</div>
          <div style={{ color: '#6B7280', fontSize: 12, display: 'flex', letterSpacing: '1px' }}>ORBS HIDDEN</div>
        </div>
        <div style={{
          position: 'absolute', bottom: 28, right: 50,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
        }}>
          <div style={{ color: '#9945FF', fontSize: 22, fontWeight: 900, display: 'flex' }}>100m</div>
          <div style={{ color: '#6B7280', fontSize: 12, display: 'flex', letterSpacing: '1px' }}>CRACK RANGE</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
