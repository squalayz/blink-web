import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        fontSize: 22,
        fontWeight: 900,
        color: '#00FF88',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0f',
        borderRadius: 8,
        letterSpacing: '-1px',
      }}>
        B
      </div>
    ),
    { ...size }
  );
}
