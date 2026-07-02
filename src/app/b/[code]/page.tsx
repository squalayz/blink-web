export default function InvitePage({ params }: { params: { code: string } }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif"
    }}>
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{
          fontSize: '72px',
          marginBottom: '20px',
          filter: 'drop-shadow(0 0 20px #00FF88)'
        }}>
          👁️
        </div>
        
        <h1 style={{
          fontSize: '42px',
          fontWeight: 900,
          color: '#FFFFFF',
          marginBottom: '16px'
        }}>
          BLINK Battle Invite
        </h1>
        
        <div style={{
          background: 'linear-gradient(135deg, #00FF88 0%, #88FF00 100%)',
          padding: '3px',
          borderRadius: '16px',
          marginBottom: '24px',
          display: 'inline-block'
        }}>
          <div style={{
            background: '#0a0a0f',
            borderRadius: '13px',
            padding: '20px 40px'
          }}>
            <p style={{
              fontSize: '24px',
              color: '#00FF88',
              fontWeight: 700,
              margin: 0,
              fontFamily: 'monospace'
            }}>
              {params.code}
            </p>
          </div>
        </div>
        
        <p style={{
          fontSize: '18px',
          color: '#8a8a99',
          marginBottom: '32px'
        }}>
          You've been challenged to a BLINK battle!
        </p>
        
        <a
          href="https://apps.apple.com/app/blink-catch-mystical-beings/id6738373293"
          style={{
            display: 'inline-block',
            padding: '16px 32px',
            borderRadius: '12px',
            background: '#00FF88',
            color: '#0a0a0f',
            fontSize: '18px',
            fontWeight: 700,
            textDecoration: 'none',
            marginBottom: '16px'
          }}
        >
          Get BLINK Free
        </a>
        
        <p style={{
          fontSize: '14px',
          color: '#666',
          margin: 0
        }}>
          The Eye sees all. Don't blink.
        </p>
      </div>
    </div>
  )
}