"use client";
import { useState, useEffect } from "react";

const C = {
  bg:"#0a0a0f", surface:"#0d0d14", s2:"#1a1a24", indigo:"#6366f1", cyan:"#06b6d4",
  match:"#30d158", hot:"#ff2d55", gold:"#ffd700", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
  border:"rgba(255,255,255,0.07)",
};

interface MatchNFTCardProps {
  userA: { name: string; avatar_url?: string | null; orb_color1?: string; orb_color2?: string };
  userB: { name: string; avatar_url?: string | null; orb_color1?: string; orb_color2?: string };
  matchId: string;
  onClose: () => void;
  onStartTrading?: () => void;
}

function ProfileCircle({ user, size = 72 }: { user: { name: string; avatar_url?: string | null }; size?: number }) {
  const pals = [["#6366f1","#818cf8"],["#06b6d4","#22d3ee"],["#a855f7","#c084fc"],["#ec4899","#f472b6"]];
  const i = Math.abs((user.name || "A").split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % pals.length;
  const init = (user.name || "?").split(/[\s\-_]+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
  if (user.avatar_url) return <img src={user.avatar_url} alt={user.name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.15)" }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg,${pals[i][0]},${pals[i][1]})`, fontSize: size * 0.35, fontWeight: 800, color: "white", border: "3px solid rgba(255,255,255,0.15)" }}>
      {init}
    </div>
  );
}

export default function MatchNFTCard({ userA, userB, matchId, onClose, onStartTrading }: MatchNFTCardProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const nftNumber = matchId ? Math.abs(matchId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 1000 + Date.now() % 10000) : Date.now() % 100000;
  const c1 = userA.orb_color1 || "#6366f1";
  const c2 = userB.orb_color1 || "#06b6d4";

  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);
  useEffect(() => { const t = setTimeout(() => { setDismissed(true); setTimeout(onClose, 400); }, 8000); return () => clearTimeout(t); }, [onClose]);

  const dismiss = () => { setDismissed(true); setTimeout(onClose, 400); };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: dismissed ? 0 : visible ? 1 : 0,
      transition: "opacity 0.4s ease",
      padding: 20,
    }} onClick={dismiss}>

      {/* Particle effect */}
      <style>{`
        @keyframes nft-particle{0%{transform:translateY(0) scale(1);opacity:0.8}100%{transform:translateY(-120vh) scale(0.3);opacity:0}}
        @keyframes nft-glow{0%,100%{box-shadow:0 0 30px ${c1}40, 0 0 60px ${c2}20}50%{box-shadow:0 0 50px ${c1}60, 0 0 90px ${c2}40}}
        @keyframes nft-line{0%{opacity:0;width:0}50%{opacity:1;width:60px}100%{opacity:0.6;width:60px}}
        @keyframes nft-scale-in{0%{transform:scale(0.7);opacity:0}100%{transform:scale(1);opacity:1}}
      `}</style>
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          bottom: -10,
          left: `${5 + Math.random() * 90}%`,
          width: 3 + Math.random() * 4,
          height: 3 + Math.random() * 4,
          borderRadius: "50%",
          background: i % 3 === 0 ? C.gold : i % 3 === 1 ? c1 : c2,
          animation: `nft-particle ${3 + Math.random() * 4}s linear infinite`,
          animationDelay: `${Math.random() * 3}s`,
          opacity: 0.7,
        }} />
      ))}

      {/* Profiles connected */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28, animation: "nft-scale-in 0.6s ease forwards" }} onClick={e => e.stopPropagation()}>
        <ProfileCircle user={userA} size={72} />
        <div style={{ width: 60, height: 3, background: `linear-gradient(90deg, ${c1}, ${C.gold}, ${c2})`, borderRadius: 2, animation: "nft-line 1.5s ease forwards", boxShadow: `0 0 12px ${C.gold}60` }} />
        <ProfileCircle user={userB} size={72} />
      </div>

      {/* NFT Card */}
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 320, borderRadius: 20, overflow: "hidden",
        background: `linear-gradient(160deg, ${C.surface}, ${C.s2})`,
        border: "2px solid transparent",
        backgroundClip: "padding-box",
        boxShadow: `0 0 0 2px ${C.gold}60, 0 0 40px ${C.gold}20, 0 0 80px ${c1}15`,
        animation: "nft-glow 3s ease infinite, nft-scale-in 0.8s ease forwards",
        position: "relative",
      }}>
        {/* Gold border gradient overlay */}
        <div style={{ position: "absolute", inset: -2, borderRadius: 22, background: `linear-gradient(135deg, ${C.gold}, ${C.hot}, ${C.gold})`, zIndex: -1 }} />

        <div style={{ padding: "24px 20px", textAlign: "center" }}>
          {/* Title */}
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: C.gold, marginBottom: 16 }}>
            MATCH NFT #{nftNumber}
          </div>

          {/* Merged profiles */}
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 16 }}>
            <ProfileCircle user={userA} size={56} />
            <ProfileCircle user={userB} size={56} />
          </div>

          {/* Names */}
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4, letterSpacing: "-0.3px" }}>
            {userA.name} + {userB.name}
          </div>

          {/* Gradient border line */}
          <div style={{ width: 60, height: 2, background: `linear-gradient(90deg, ${c1}, ${c2})`, borderRadius: 1, margin: "12px auto" }} />

          {/* Base L2 badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", borderRadius: 20, padding: "6px 14px", marginBottom: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" stroke={C.cyan} strokeWidth="1.5"/>
              <path d="M12 6v4l3.5 2" stroke={C.cyan} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>Minted on Base L2</span>
          </div>

          {/* Date */}
          <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>
            {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* Subtitle */}
      <div style={{ fontSize: 14, color: C.muted, marginTop: 20, fontWeight: 600, animation: "nft-scale-in 1s ease forwards" }}>
        Your agents are now connected
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 20, animation: "nft-scale-in 1.2s ease forwards" }} onClick={e => e.stopPropagation()}>
        <button disabled style={{
          padding: "12px 20px", borderRadius: 12, border: `1px solid ${C.dim}`, background: "transparent",
          color: C.dim, fontSize: 12, fontWeight: 700, cursor: "not-allowed", fontFamily: "inherit", opacity: 0.5,
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            View on OpenSea
          </span>
        </button>
        <button onClick={() => { dismiss(); onStartTrading?.(); }} style={{
          padding: "12px 20px", borderRadius: 12, border: "none",
          background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`,
          color: "white", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
          boxShadow: `0 0 20px ${C.indigo}40`,
        }}>
          Start Trading Together
        </button>
      </div>
    </div>
  );
}
