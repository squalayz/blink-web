export default function MarketplaceLoading() {
  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a",
      padding: "100px 24px 40px", textAlign: "center",
    }}>
      <div style={{
        width: 200, height: 32, borderRadius: 8,
        background: "#222", margin: "0 auto 12px",
        animation: "pulse 1.5s ease-in-out infinite",
      }} />
      <div style={{
        width: 340, height: 16, borderRadius: 4,
        background: "#1a1a1a", margin: "0 auto 32px",
      }} />
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 12, maxWidth: 900, margin: "0 auto",
      }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{
            height: 180, borderRadius: 14, background: "#141414",
            border: "1px solid #222",
            animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite`,
          }} />
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}
