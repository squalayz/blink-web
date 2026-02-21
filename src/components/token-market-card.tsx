"use client";

const C = {
  bg:"#0a0a0a", card:"#141414", border:"#222", text:"#fafafa",
  muted:"#a1a1aa", dim:"#333", violet:"#8b5cf6", green:"#22c55e", red:"#ef4444", gold:"#ffd700",
};

interface TokenCardProps {
  id: string;
  name: string;
  symbol: string;
  price: number;
  price24hAgo: number;
  volume24h: number;
  holderCount: number;
  totalLiquidity: number;
  fusionName?: string;
  fusionGen?: number;
  isHighVolume?: boolean;
  onClick?: () => void;
}

export default function TokenMarketCard({
  id, name, symbol, price, price24hAgo, volume24h, holderCount,
  totalLiquidity, fusionName, fusionGen, isHighVolume, onClick,
}: TokenCardProps) {
  const change24h = price24hAgo > 0 ? ((price - price24hAgo) / price24hAgo) * 100 : 0;
  const isUp = change24h >= 0;

  return (
    <div onClick={onClick} style={{
      background: C.card,
      borderTop: isHighVolume ? `2px solid ${C.gold}` : undefined,
      border: isHighVolume ? undefined : `1px solid ${C.border}`,
      borderRadius: 14, padding: 16, cursor: onClick ? "pointer" : "default",
      transition: "border-color 0.2s, transform 0.15s",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        {/* Token avatar (gold frame) */}
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `linear-gradient(135deg, ${C.violet}33, ${C.violet}11)`,
          border: `2px solid ${C.gold}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 900, color: C.violet,
        }}>{symbol[0]}</div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{name}</span>
            {fusionGen && (
              <span style={{
                fontSize: 8, padding: "1px 4px", borderRadius: 3,
                background: `${C.violet}22`, color: C.violet, fontWeight: 800,
              }}>G{fusionGen}</span>
            )}
          </div>
          <span style={{ fontSize: 12, color: C.muted, fontFamily: "'JetBrains Mono',monospace" }}>${symbol}</span>
        </div>

        {/* Price + change */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, fontFamily: "'JetBrains Mono',monospace" }}>
            {price < 0.001 ? price.toExponential(2) : price.toFixed(6)}
          </div>
          <span style={{
            fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
            color: isUp ? C.green : C.red,
          }}>{isUp ? "+" : ""}{change24h.toFixed(1)}%</span>
        </div>
      </div>

      {/* Sparkline placeholder */}
      <div style={{ height: 24, marginBottom: 10 }}>
        <Sparkline isUp={isUp} />
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {[
          { label: "Liquidity", value: `${totalLiquidity.toFixed(3)} ETH` },
          { label: "Vol 24h", value: `${volume24h.toFixed(3)} ETH` },
          { label: "Holders", value: holderCount.toString() },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: i === 2 ? "right" : i === 1 ? "center" : "left" }}>
            <div style={{ fontSize: 9, color: C.dim, fontWeight: 600, textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Fusion origin */}
      {fusionName && (
        <div style={{ marginTop: 8, fontSize: 10, color: C.dim }}>Born from: {fusionName}</div>
      )}
    </div>
  );
}

// Simple SVG sparkline
function Sparkline({ isUp }: { isUp: boolean }) {
  // Generate random-ish sparkline path
  const points = Array.from({ length: 12 }, (_, i) => {
    const trend = isUp ? i * 0.5 : -i * 0.3;
    return 12 + trend + (Math.sin(i * 1.7) * 4) + (Math.cos(i * 0.8) * 3);
  });
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 280, h = 24;

  const pathD = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  const color = isUp ? "#22c55e" : "#ef4444";

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-${isUp}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.2" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={pathD + ` L ${w} ${h} L 0 ${h} Z`} fill={`url(#spark-${isUp})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
