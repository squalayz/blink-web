import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f", fontFamily: "'Outfit',sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 72, marginBottom: 12 }}></div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#FFFFFF", marginBottom: 8 }}>404</h1>
        <p style={{ fontSize: 15, color: "#8a8a99", marginBottom: 24 }}>The Eye does not see this page.</p>
        <Link href="/" style={{
          padding: "10px 24px", borderRadius: 10, background: "#00FF88",
          color: "#0a0a0f", fontSize: 14, fontWeight: 700, textDecoration: "none",
        }}>Back to BLINK</Link>
      </div>
    </div>
  );
}
