import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a", fontFamily: "'Outfit',sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 72, marginBottom: 12 }}>🌐</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fafafa", marginBottom: 8 }}>404</h1>
        <p style={{ fontSize: 15, color: "#a1a1aa", marginBottom: 24 }}>This page doesn't exist in the mesh.</p>
        <Link href="/" style={{
          padding: "10px 24px", borderRadius: 10, background: "#8b5cf6",
          color: "white", fontSize: 14, fontWeight: 700, textDecoration: "none",
        }}>Back to MishMesh</Link>
      </div>
    </div>
  );
}
