"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

const C = {
  bg: "#050508", surface: "#0a0a12", indigo: "#6366f1", cyan: "#06b6d4",
  purple: "#a855f7", gold: "#ffd700", match: "#30d158", hot: "#ff2d55",
  text: "#e8e8f0", muted: "#6b6b80", dim: "#2a2a3a",
};

function getThreshold(eth: number): { color: string; level: "green" | "yellow" | "red" } {
  if (eth >= 0.01) return { color: C.match, level: "green" };
  if (eth >= 0.005) return { color: "#f59e0b", level: "yellow" };
  return { color: C.hot, level: "red" };
}

export default function NavBar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [bal, setBal] = useState({ eth: 0, usd: 0, pnl: 0, active: true });
  const [aiConnected, setAiConnected] = useState(false);
  const [aiProvider, setAiProvider] = useState<string|null>(null);
  const [flash, setFlash] = useState("");
  const lastBal = useRef<number | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = !!user;
  const threshold = getThreshold(bal.eth);

  // ── SIWE session check ──
  useEffect(() => {
    fetch("/api/auth/siwe/session")
      .then(r => r.json())
      .then(data => { if (data.user) setUser(data.user); })
      .catch(() => {});
  }, []);

  // ── Scroll ──
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // ── Close dropdown on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ── Balance polling ──
  const fetchBalance = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch("/api/wallet");
      if (!res.ok) return;
      const data = await res.json();
      const eth = parseFloat(data.balance_eth || "0");
      const usd = eth * (data.eth_usd_price || 2000);
      const pnl = parseFloat(data.pnl_today || "0");
      const active = data.agent_active !== false;
      setBal({ eth, usd, pnl, active });
      setAiConnected(!!data.ai_connected);
      setAiProvider(data.ai_provider || null);
      if (lastBal.current !== null && eth !== lastBal.current) {
        setFlash(eth > lastBal.current ? "deposit" : "loss");
        setTimeout(() => setFlash(""), 800);
      }
      lastBal.current = eth;
    } catch (e) {}
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchBalance();
    const iv = setInterval(fetchBalance, 10000);
    return () => clearInterval(iv);
  }, [fetchBalance, isLoggedIn]);

  if (pathname === "/auth/signin") return null;

  const links = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "🎯 Hunt", href: "/hunt" },
    { label: "Ventures", href: "/dashboard/ventures" },
    { label: "Fusions", href: "/dashboard/fusions" },
    { label: "Marketplace", href: "/marketplace" },
    { label: "Portfolio", href: "/dashboard/portfolio" },
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Agent Minds", href: "/agents/leaderboard" },
  ];

  const avatarLetter = (user?.name || user?.address || "?")[0]?.toUpperCase();

  return (
    <>
      <nav className="mm-global-nav" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 500,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: scrolled ? "10px 24px" : "14px 24px",
        background: scrolled ? "rgba(5,5,8,0.78)" : "rgba(5,5,8,0.3)",
        backdropFilter: scrolled ? "blur(20px)" : "blur(8px)",
        WebkitBackdropFilter: scrolled ? "blur(20px)" : "blur(8px)",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.04)" : "1px solid transparent",
        transition: "all 0.35s",
        fontFamily: "'Outfit',sans-serif",
      }}>
        {/* Logo */}
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: C.text, fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>
          <div style={{ width: 28, height: 28, position: "relative" }}>
            <span style={{ position: "absolute", width: 14, height: 14, borderRadius: "50%", top: "50%", transform: "translateY(-50%)", left: 0, background: C.indigo }} />
            <span style={{ position: "absolute", width: 14, height: 14, borderRadius: "50%", top: "50%", transform: "translateY(-50%)", right: 0, background: C.cyan }} />
          </div>
          MishMesh<span style={{ color: C.indigo }}>.ai</span>
        </a>

        {/* ═══ AI BRAIN ICON ═══ */}
        {isLoggedIn && (
          <a href="/dashboard?view=settings&section=ai" title={aiConnected ? `AI Brain: ${aiProvider || "Connected"}` : "Connect your AI Brain"} style={{
            width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            background: aiConnected 
              ? "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.15))" 
              : "rgba(255,255,255,0.04)",
            border: aiConnected 
              ? "1.5px solid rgba(99,102,241,0.4)" 
              : "1.5px solid rgba(255,255,255,0.1)",
            cursor: "pointer", textDecoration: "none", position: "relative", transition: "all 0.3s",
            boxShadow: aiConnected ? "0 0 12px rgba(99,102,241,0.2)" : "none",
            animation: aiConnected ? "mm-brain-glow 3s ease-in-out infinite" : "mm-brain-pulse 2s ease-in-out infinite",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" 
              stroke={aiConnected ? "url(#brain-grad)" : "#6b6b80"} 
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="brain-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={C.indigo}/>
                  <stop offset="100%" stopColor={C.cyan}/>
                </linearGradient>
              </defs>
              <path d="M9.5 2a3.5 3.5 0 0 0-3.4 4.3A3.5 3.5 0 0 0 4 9.8a3.5 3.5 0 0 0 .7 3.5A3.5 3.5 0 0 0 6 17a3.5 3.5 0 0 0 3.5 3h1V2z"/><path d="M14.5 2a3.5 3.5 0 0 1 3.4 4.3A3.5 3.5 0 0 1 20 9.8a3.5 3.5 0 0 1-.7 3.5A3.5 3.5 0 0 1 18 17a3.5 3.5 0 0 1-3.5 3h-1V2z"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M12 2v20"/><path d="M8 14c1.3.7 2.7.7 4 0"/><path d="M12 14c1.3.7 2.7.7 4 0"/>
            </svg>
            {!aiConnected && (
              <span style={{
                position: "absolute", top: -2, right: -2, width: 8, height: 8,
                borderRadius: "50%", background: C.hot,
                boxShadow: `0 0 6px ${C.hot}`,
                animation: "mm-pulse-fast 1.2s infinite",
              }}/>
            )}
          </a>
        )}

        {/* Center links (desktop) */}
        <div className="mm-nav-links" style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {links.map(l => {
            const isHunt = l.href === "/hunt";
            const isActive = pathname === l.href;
            return (
              <a key={l.href} href={l.href} style={{
                color: isActive ? C.text : isHunt ? C.hot : C.muted,
                textDecoration: "none", fontSize: 14, fontWeight: isHunt ? 700 : 500,
                transition: "color 0.2s",
                ...(isHunt ? {
                  padding: "4px 12px", borderRadius: 8,
                  background: isActive ? `${C.hot}22` : `${C.hot}12`,
                  border: `1px solid ${C.hot}33`,
                  boxShadow: isActive ? `0 0 12px ${C.hot}40` : "none",
                } : {}),
              }}>{l.label}</a>
            );
          })}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isLoggedIn ? (
            <>
              {/* ═══ BALANCE WIDGET ═══ */}
              <div ref={dropRef} style={{ position: "relative" }}>
                <div onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 14px", borderRadius: 10,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer", transition: "all 0.2s",
                  fontFamily: "'JetBrains Mono',monospace",
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                    background: threshold.color,
                    boxShadow: `0 0 ${threshold.level === "red" ? 10 : 8}px ${threshold.color}80`,
                    animation: threshold.level === "red" ? "mm-pulse-fast 0.8s infinite"
                      : threshold.level === "yellow" ? "mm-pulse-slow 2s infinite" : "none",
                  }} />
                  <span className={flash === "deposit" ? "mm-sparkle" : flash ? "mm-flash" : ""} style={{
                    fontSize: 13, fontWeight: 700, color: threshold.color, transition: "color 0.3s",
                  }}>{bal.eth.toFixed(3)}</span>
                  <span className="mm-bal-unit" style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>ETH</span>
                  {threshold.level === "red" && <span style={{ fontSize: 10, animation: "mm-pulse-fast 0.8s infinite" }}></span>}
                </div>

                {/* ── Dropdown ── */}
                {dropdownOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 10px)", right: 0, width: 280,
                    background: "rgba(10,10,18,0.95)", backdropFilter: "blur(24px)",
                    border: `1px solid rgba(99,102,241,0.15)`, borderRadius: 16,
                    padding: 20, zIndex: 600, textAlign: "left",
                    animation: "mm-dd-in 0.25s cubic-bezier(0.16,1,0.3,1)",
                  }}>
                    <DDRow label="Agent Balance" value={`${bal.eth.toFixed(4)} ETH`} />
                    <DDRow label="≈ USD" value={`$${bal.usd.toFixed(2)}`} />
                    <DDRow label="Trading P&L Today"
                      value={`${bal.pnl >= 0 ? "+" : ""}$${Math.abs(bal.pnl).toFixed(2)} ${bal.pnl >= 0 ? "▲" : "▼"}`}
                      color={bal.pnl >= 0 ? C.match : C.hot} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
                      <span style={{ fontSize: 12, color: C.muted }}>Agent Status</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: bal.active ? C.match : C.muted }} />
                        {bal.active ? "Active" : "Idle"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                      <a href="/dashboard#fund" style={{
                        flex: 1, padding: 10, borderRadius: 10, border: "none",
                        background: `linear-gradient(135deg,${C.indigo},${C.purple})`,
                        color: "white", fontSize: 13, fontWeight: 700, textAlign: "center", textDecoration: "none",
                      }}>Fund Agent</a>
                      <a href="/dashboard#wallet" style={{
                        flex: 1, padding: 10, borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
                        color: C.text, fontSize: 13, fontWeight: 600, textAlign: "center", textDecoration: "none",
                      }}>View Wallet</a>
                    </div>
                    <button onClick={async()=>{await fetch("/api/auth/siwe/logout",{method:"POST"});window.location.href="/";}} style={{
                      width:"100%",padding:10,borderRadius:10,border:`1px solid rgba(255,50,85,0.3)`,background:"transparent",
                      color:"#FF2D55",fontSize:12,fontWeight:600,cursor:"pointer",marginTop:10,fontFamily:"inherit",
                    }}>Disconnect Wallet</button>
                  </div>
                )}
              </div>

              {/* Separator */}
              <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)" }} />

              {/* Avatar → Dashboard */}
              <a href="/dashboard" style={{
                width: 32, height: 32, borderRadius: "50%",
                border: `2px solid ${C.indigo}`, overflow: "hidden",
                background: `linear-gradient(135deg,${C.indigo},${C.purple})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "white", textDecoration: "none",
                transition: "all 0.2s",
              }}>
                {user?.avatar_url
                  ? <img src={user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : avatarLetter}
              </a>
            </>
          ) : (
            <a href="/auth/signin" style={{
              padding: "10px 22px", borderRadius: 10,
              background: `linear-gradient(135deg,${C.indigo},${C.purple})`,
              color: "white", fontSize: 14, fontWeight: 700, textDecoration: "none",
            }}>Enter the Mesh </a>
          )}
        </div>
      </nav>

      <div style={{ height: 56 }} />

      <style>{`
        @keyframes mm-brain-pulse{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}
        @keyframes mm-brain-glow{0%,100%{box-shadow:0 0 8px rgba(99,102,241,0.15)}50%{box-shadow:0 0 18px rgba(99,102,241,0.35),0 0 8px rgba(6,182,212,0.2)}}
        @keyframes mm-pulse-fast{0%,100%{opacity:.6;transform:scale(.9)}50%{opacity:1;transform:scale(1.3)}}
        @keyframes mm-pulse-slow{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.2)}}
        @keyframes mm-flash{0%{filter:brightness(2)}100%{filter:brightness(1)}}
        @keyframes mm-sparkle{0%{text-shadow:0 0 12px rgba(48,209,88,0.8)}100%{text-shadow:none}}
        @keyframes mm-dd-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        .mm-flash{animation:mm-flash 0.6s ease-out}
        .mm-sparkle{animation:mm-sparkle 0.8s ease-out}
        @media(max-width:640px){
          .mm-nav-links{display:none!important}
          .mm-bal-unit{display:none!important}
        }
      `}</style>
    </>
  );
}

function DDRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: 12, color: "#6b6b80", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: color || "#e8e8f0" }}>{value}</span>
    </div>
  );
}
