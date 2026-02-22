"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const C = {
  bg:"#050508",surface:"#0a0a12",s2:"#111118",indigo:"#6366f1",cyan:"#06b6d4",
  purple:"#a855f7",match:"#30d158",hot:"#ff2d55",gold:"#ffd700",text:"#e8e8f0",
  muted:"#6b6b80",dim:"#2a2a3a",border:"#1a1a2e",
};

/* ═══ CUSTOM SVG COMPONENTS — No emojis ═══ */

function FireOrb({ size = 110, color = "#ff2d55", scanning = false }: { size?: number; color?: string; scanning?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <defs>
        <radialGradient id="orb-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.6">
            <animate attributeName="stopOpacity" values="0.6;0.9;0.6" dur="2s" repeatCount="indefinite" />
          </stop>
          <stop offset="40%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="orb-inner" cx="40%" cy="35%" r="35%">
          <stop offset="0%" stopColor="white" stopOpacity="0.4" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="orb-glow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="orb-glow-lg">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Outer glow rings */}
      <circle cx="60" cy="60" r="55" fill="none" stroke={color} strokeWidth="0.5" opacity="0.15">
        <animate attributeName="r" values="50;58;50" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.15;0.05;0.15" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="60" r="48" fill="none" stroke={color} strokeWidth="0.3" opacity="0.1">
        <animate attributeName="r" values="45;52;45" dur="4s" repeatCount="indefinite" />
      </circle>
      {/* Core plasma */}
      <circle cx="60" cy="60" r="36" fill="url(#orb-core)" filter="url(#orb-glow-lg)">
        <animate attributeName="r" values="34;38;34" dur="2.5s" repeatCount="indefinite" />
      </circle>
      {/* Inner hot core */}
      <circle cx="60" cy="60" r="18" fill={color} opacity="0.25" filter="url(#orb-glow)">
        <animate attributeName="r" values="16;20;16" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.25;0.45;0.25" dur="1.8s" repeatCount="indefinite" />
      </circle>
      {/* Specular highlight */}
      <circle cx="60" cy="60" r="36" fill="url(#orb-inner)" />
      {/* Center bright point */}
      <circle cx="55" cy="52" r="6" fill="white" opacity="0.15">
        <animate attributeName="opacity" values="0.15;0.3;0.15" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Scanning particles */}
      {scanning && [0,60,120,180,240,300].map((angle, i) => (
        <circle key={i} cx="60" cy="60" r="2" fill={C.cyan} opacity="0.6">
          <animateTransform attributeName="transform" type="rotate" from={`${angle} 60 60`} to={`${angle + 360} 60 60`} dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
          <animateMotion dur={`${3 + i * 0.5}s`} repeatCount="indefinite" path={`M0,0 A${42 + i * 2},${42 + i * 2} 0 1 1 0,-1 Z`} />
        </circle>
      ))}
    </svg>
  );
}

function AIRobotHead({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <defs>
        <linearGradient id="head-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2a2a40" />
          <stop offset="50%" stopColor="#1a1a2e" />
          <stop offset="100%" stopColor="#0f0f1a" />
        </linearGradient>
        <linearGradient id="visor-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={C.indigo} />
          <stop offset="50%" stopColor={C.cyan} />
          <stop offset="100%" stopColor={C.indigo} />
        </linearGradient>
        <linearGradient id="metal-shine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4a4a5a" />
          <stop offset="50%" stopColor="#2a2a3a" />
          <stop offset="100%" stopColor="#1a1a28" />
        </linearGradient>
        <filter id="robot-shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(99,102,241,0.3)" />
        </filter>
        <filter id="eye-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Antenna */}
      <line x1="60" y1="12" x2="60" y2="24" stroke="#3a3a4a" strokeWidth="2" strokeLinecap="round" />
      <circle cx="60" cy="10" r="4" fill={C.cyan} opacity="0.8" filter="url(#eye-glow)">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Head shape — rounded rectangle */}
      <rect x="22" y="26" width="76" height="64" rx="18" ry="18" fill="url(#head-grad)" filter="url(#robot-shadow)" stroke="#3a3a4a" strokeWidth="1" />
      {/* Top highlight edge */}
      <rect x="24" y="27" width="72" height="20" rx="16" ry="10" fill="url(#metal-shine)" opacity="0.3" />
      {/* Visor band */}
      <rect x="30" y="46" width="60" height="16" rx="8" fill="rgba(0,0,0,0.5)" stroke="url(#visor-grad)" strokeWidth="1.5" />
      {/* Eyes */}
      <circle cx="44" cy="54" r="5" fill={C.cyan} filter="url(#eye-glow)">
        <animate attributeName="r" values="5;4;5" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="76" cy="54" r="5" fill={C.cyan} filter="url(#eye-glow)">
        <animate attributeName="r" values="5;4;5" dur="3s" repeatCount="indefinite" />
      </circle>
      {/* Eye pupils */}
      <circle cx="44" cy="54" r="2" fill="white" opacity="0.8" />
      <circle cx="76" cy="54" r="2" fill="white" opacity="0.8" />
      {/* Mouth grill */}
      <rect x="40" y="70" width="40" height="10" rx="5" fill="rgba(0,0,0,0.4)" stroke="#2a2a3a" strokeWidth="0.5" />
      {[44, 52, 60, 68, 76].map((x, i) => (
        <line key={i} x1={x} y1="72" x2={x} y2="78" stroke={C.indigo} strokeWidth="1" opacity="0.4">
          <animate attributeName="opacity" values="0.2;0.6;0.2" dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
        </line>
      ))}
      {/* Ear panels */}
      <rect x="14" y="42" width="10" height="24" rx="3" fill="url(#metal-shine)" stroke="#3a3a4a" strokeWidth="0.5" />
      <rect x="96" y="42" width="10" height="24" rx="3" fill="url(#metal-shine)" stroke="#3a3a4a" strokeWidth="0.5" />
      {/* Jaw/chin */}
      <rect x="32" y="88" width="56" height="12" rx="6" fill="url(#head-grad)" stroke="#3a3a4a" strokeWidth="0.5" />
      {/* Chin light */}
      <circle cx="60" cy="94" r="2" fill={C.indigo} opacity="0.3">
        <animate attributeName="opacity" values="0.2;0.5;0.2" dur="4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function TradeIcon({ type, size = 20 }: { type: "buy" | "sell" | "skip" | "other"; size?: number }) {
  if (type === "buy") return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <defs>
        <linearGradient id="buy-g" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={C.match} /><stop offset="100%" stopColor={C.cyan} />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#buy-g)" opacity="0.15" />
      <path d="M12 6v12M8 10l4-4 4 4" stroke="url(#buy-g)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
  if (type === "sell") return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <defs>
        <linearGradient id="sell-g" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={C.hot} /><stop offset="100%" stopColor="#ff6b6b" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#sell-g)" opacity="0.15" />
      <path d="M12 18V6M8 14l4 4 4-4" stroke="url(#sell-g)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
  if (type === "skip") return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="rgba(255,159,10,0.1)" />
      <path d="M12 8v4M12 16h.01" stroke="#ff9f0a" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="rgba(99,102,241,0.1)" />
      <circle cx="12" cy="12" r="3" fill={C.indigo} opacity="0.5" />
    </svg>
  );
}

/* ═══ STRATEGY ORB CONFIGS ═══ */
const MODES: Record<string, { name: string; color: string; orbColor: string }> = {
  meme_scout: { name: "Meme Scout", color: "#ff2d55", orbColor: "#ff2d55" },
  blue_chip: { name: "Blue Chip", color: C.indigo, orbColor: "#6366f1" },
  momentum: { name: "Momentum", color: "#f59e0b", orbColor: "#f59e0b" },
  mean_revert: { name: "Mean Reversion", color: C.cyan, orbColor: "#06b6d4" },
  sniper: { name: "Sniper", color: C.purple, orbColor: "#a855f7" },
  hodl_dca: { name: "Auto DCA", color: C.match, orbColor: "#30d158" },
};

export default function TradingDashboard() {
  const router = useRouter();
  const [wallet, setWallet] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orbState, setOrbState] = useState<"idle"|"scanning"|"buy"|"sell">("idle");
  const [toggling, setToggling] = useState(false);
  const [scan, setScan] = useState<any>(null);
  const [scanTokenIdx, setScanTokenIdx] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const prevTradeCount = useRef(0);

  async function updateSetting(key: string, value: any) {
    setWallet((w: any) => ({ ...w, [key]: value }));
    try {
      await fetch("/api/wallet", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "settings", [key]: value }),
      });
    } catch {}
  }

  async function toggleEngine() {
    if (toggling) return;
    const newState = !wallet?.trading_enabled;
    if (newState && (wallet?.balance_eth || 0) < 0.002) { alert("Fund your wallet first (min 0.002 ETH)"); return; }
    setToggling(true);
    setWallet((w: any) => ({ ...w, trading_enabled: newState }));
    setOrbState(newState ? "scanning" : "idle");
    try {
      await fetch("/api/wallet", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "settings", trading_enabled: newState }),
      });
    } catch (e) { console.error(e); }
    setToggling(false);
  }

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/wallet");
        if (!r.ok) { router.push("/auth/signin"); return; }
        const data = await r.json();
        if (data.error) { router.push("/auth/signin"); return; }
        setWallet(data);
        setTrades(data.recent_trades || []);
        if (data.trading_enabled) setOrbState("scanning");
      } catch { router.push("/auth/signin"); }
      setLoading(false);
    }
    load();

    // Scan feed — poll every 3s when engine on
    const scanIv = setInterval(async () => {
      try {
        const r = await fetch("/api/trading/scan", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
        });
        if (r.ok) {
          const d = await r.json();
          setScan(d);
          if (d.scanning) {
            setScanTokenIdx(prev => (prev + 1) % Math.max(1, d.tokens?.length || 1));
          }
        }
      } catch {}
    }, 3000);

    const iv = setInterval(async () => {
      try {
        const r = await fetch("/api/wallet");
        if (!r.ok) return;
        const data = await r.json();
        if (data && !data.error) {
          setWallet(data);
          const newTrades = data.recent_trades || [];
          if (newTrades.length > prevTradeCount.current && prevTradeCount.current > 0) {
            const latest = newTrades[0];
            setOrbState(latest.action === "buy" ? "buy" : latest.action === "sell" ? "sell" : "scanning");
            setTimeout(() => setOrbState(data.trading_enabled ? "scanning" : "idle"), 2000);
          }
          prevTradeCount.current = newTrades.length;
          setTrades(newTrades);
          if (data.trading_enabled && orbState === "idle") setOrbState("scanning");
        }
      } catch {}
    }, 10000);
    return () => { clearInterval(iv); clearInterval(scanIv); };
  }, []);

  if (loading) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:40,height:40,borderRadius:"50%",border:`3px solid ${C.dim}`,borderTopColor:C.indigo,animation:"spin 0.8s linear infinite"}}/>
    </div>
  );

  const mode = MODES[wallet?.trading_mode] || MODES.meme_scout;
  const isOn = wallet?.trading_enabled;
  const balance = wallet?.balance_eth || 0;
  const balUsd = wallet?.balance_usd || 0;
  const pnl = wallet?.total_trading_pnl || 0;
  const openPositions = trades.filter((t: any) => t.action === "buy" && !t.closed_at);
  const closedTrades = trades.filter((t: any) => t.closed_at || t.action === "sell");
  const wins = closedTrades.filter((t: any) => (t.pnl_eth || 0) > 0).length;
  const winRate = closedTrades.length > 0 ? Math.round((wins / closedTrades.length) * 100) : 0;

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Outfit',sans-serif",color:C.text,paddingBottom:40}}>
      <style>{`
        body{margin:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(1.3)}}
        @keyframes txn-enter{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes float-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow-pulse{0%,100%{box-shadow:0 0 20px rgba(99,102,241,0.1)}50%{box-shadow:0 0 40px rgba(99,102,241,0.2)}}
        @keyframes orb-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
        @keyframes shimmer{0%{transform:translateX(-100%)}50%{transform:translateX(100%)}100%{transform:translateX(100%)}}
        @keyframes bar-fill{from{width:0}to{width:var(--fill)}}
      `}</style>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:`1px solid ${C.border}`}}>
        <button onClick={() => router.push("/dashboard")} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontFamily:"inherit",fontSize:13,display:"flex",alignItems:"center",gap:6}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Dashboard
        </button>
        <div style={{fontSize:14,fontWeight:700,letterSpacing:"0.02em"}}>AI Trading</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:isOn ? mode.color : C.muted,fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase",transition:"color 0.4s"}}>{isOn ? "Live" : "Off"}</span>
          <button onClick={toggleEngine} disabled={toggling} style={{
            width:56,height:30,borderRadius:15,border:"none",cursor:toggling?"wait":"pointer",position:"relative",
            background:isOn?`linear-gradient(135deg, ${mode.color}, ${mode.orbColor}dd)`:"rgba(255,255,255,0.06)",
            boxShadow:isOn?`0 0 24px ${mode.color}55, 0 0 48px ${mode.color}22, inset 0 1px 2px rgba(255,255,255,0.2)`:"inset 0 2px 4px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)",
            transition:"all 0.4s cubic-bezier(0.4,0,0.2,1)",WebkitTapHighlightColor:"transparent",
            overflow:"hidden",
          }}>
            {/* Animated shimmer when on */}
            {isOn && <div style={{
              position:"absolute",top:0,left:0,right:0,bottom:0,borderRadius:15,
              background:`linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)`,
              animation:"shimmer 2s ease-in-out infinite",
            }}/>}
            {/* Track glow particles when on */}
            {isOn && <div style={{
              position:"absolute",top:"50%",left:10,width:4,height:4,borderRadius:"50%",
              background:"rgba(255,255,255,0.4)",marginTop:-2,
              animation:"pulse-dot 1.5s infinite",
            }}/>}
            {isOn && <div style={{
              position:"absolute",top:"50%",left:18,width:3,height:3,borderRadius:"50%",
              background:"rgba(255,255,255,0.25)",marginTop:-1.5,
              animation:"pulse-dot 1.5s 0.3s infinite",
            }}/>}
            {/* Knob */}
            <div style={{
              width:24,height:24,borderRadius:"50%",position:"absolute",top:3,
              left:isOn?29:3,transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
              background:isOn?`radial-gradient(circle at 40% 35%, white, #f0f0f0)`:"radial-gradient(circle at 40% 35%, #888, #555)",
              boxShadow:isOn?`0 2px 8px rgba(0,0,0,0.2), 0 0 12px ${mode.color}44`:"0 2px 4px rgba(0,0,0,0.4)",
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>
              {isOn ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={mode.color} strokeWidth="3" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              ) : (
                <div style={{width:8,height:2,background:"#333",borderRadius:1}}/>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* ═══ THE ORB ═══ */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"28px 0 24px",position:"relative"}}>
        <div style={{animation:"orb-breathe 3s ease-in-out infinite",transition:"all 0.4s"}}>
          <FireOrb
            size={120}
            color={orbState === "buy" ? C.match : orbState === "sell" ? C.hot : mode.orbColor}
            scanning={orbState === "scanning"}
          />
        </div>
        <div style={{marginTop:14,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:800,color:mode.color,letterSpacing:"0.03em"}}>{mode.name}</div>
          <div style={{fontSize:11,color:C.muted,marginTop:3,display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
            {orbState === "scanning" && <span style={{width:4,height:4,borderRadius:"50%",background:C.cyan,animation:"pulse-dot 1.2s infinite"}} />}
            {orbState === "idle" ? "Engine off" : orbState === "scanning" ? "Scanning markets" : orbState === "buy" ? "Executing buy" : "Executing sell"}
          </div>
        </div>
      </div>

      {/* ═══ PORTFOLIO BAR ═══ */}
      <div style={{display:"flex",gap:6,padding:"0 16px",marginBottom:20}}>
        {[
          { label: "Portfolio", value: `${balance.toFixed(4)} ETH`, sub: `$${balUsd.toFixed(0)}`, color: C.text },
          { label: "P&L", value: `${pnl >= 0 ? "+" : ""}${pnl.toFixed(4)}`, sub: "ETH", color: pnl >= 0 ? C.match : C.hot },
          { label: "Trades", value: trades.length.toString(), sub: "total", color: C.text },
          { label: "Win Rate", value: closedTrades.length > 0 ? `${winRate}%` : "\u2014", sub: `${wins}W`, color: winRate >= 50 ? C.match : closedTrades.length > 0 ? C.hot : C.muted },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, background: C.surface, borderRadius: 12, padding: "12px 8px", textAlign: "center",
            border: `1px solid ${C.border}`, animation: `float-up 0.4s ease-out ${i * 0.08}s both`,
          }}>
            <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:15,fontWeight:800,color:s.color,fontFamily:"'JetBrains Mono',monospace"}}>{s.value}</div>
            <div style={{fontSize:9,color:C.dim}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ═══ TRADING CONFIG ═══ */}
      <div style={{padding:"0 16px",marginBottom:12}}>
        <button onClick={()=>setShowConfig(!showConfig)} style={{
          width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${C.border}`,
          background:showConfig?`${C.indigo}08`:C.surface,cursor:"pointer",fontFamily:"inherit",
          display:"flex",alignItems:"center",justifyContent:"space-between",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.indigo} strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span style={{fontSize:12,fontWeight:600,color:C.text}}>Trading Config</span>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round"
            style={{transform:showConfig?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s"}}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>

        {showConfig && (
          <div style={{background:C.surface,borderRadius:"0 0 12px 12px",border:`1px solid ${C.border}`,borderTop:"none",padding:"14px"}}>
            {/* Trade Size */}
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:10,color:C.muted,fontWeight:600}}>Trade Size (% of portfolio)</span>
                <span style={{fontSize:11,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono',monospace"}}>{wallet?.trade_size_pct||15}%</span>
              </div>
              <div style={{display:"flex",gap:4}}>
                {[5,10,15,25,40].map(pct=>(
                  <button key={pct} onClick={()=>updateSetting("trade_size_pct",pct)} style={{
                    flex:1,padding:"8px 4px",borderRadius:6,border:`1px solid ${(wallet?.trade_size_pct||15)===pct?C.indigo+"44":C.border}`,
                    background:(wallet?.trade_size_pct||15)===pct?`${C.indigo}15`:"transparent",
                    color:(wallet?.trade_size_pct||15)===pct?C.text:C.muted,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                  }}>{pct}%</button>
                ))}
              </div>
            </div>

            {/* Max Positions */}
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:10,color:C.muted,fontWeight:600}}>Max Positions (hold at once)</span>
                <span style={{fontSize:11,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono',monospace"}}>{wallet?.max_concurrent_positions||3}</span>
              </div>
              <div style={{display:"flex",gap:4}}>
                {[1,2,3,5,7].map(n=>(
                  <button key={n} onClick={()=>updateSetting("max_concurrent_positions",n)} style={{
                    flex:1,padding:"8px 4px",borderRadius:6,border:`1px solid ${(wallet?.max_concurrent_positions||3)===n?C.cyan+"44":C.border}`,
                    background:(wallet?.max_concurrent_positions||3)===n?`${C.cyan}15`:"transparent",
                    color:(wallet?.max_concurrent_positions||3)===n?C.text:C.muted,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                  }}>{n}</button>
                ))}
              </div>
              <div style={{fontSize:8,color:C.dim,marginTop:4}}>When full, agent sells weakest before buying new</div>
            </div>

            {/* Stop Loss / Take Profit */}
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:600,marginBottom:4}}>Stop Loss</div>
                <div style={{display:"flex",gap:3}}>
                  {[-10,-20,-30,-50].map(sl=>(
                    <button key={sl} onClick={()=>updateSetting("stop_loss_pct",sl)} style={{
                      flex:1,padding:"6px 2px",borderRadius:5,border:`1px solid ${(wallet?.stop_loss_pct||-25)===sl?C.hot+"44":C.border}`,
                      background:(wallet?.stop_loss_pct||-25)===sl?`${C.hot}15`:"transparent",
                      color:(wallet?.stop_loss_pct||-25)===sl?C.hot:C.dim,fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                    }}>{sl}%</button>
                  ))}
                </div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:600,marginBottom:4}}>Take Profit</div>
                <div style={{display:"flex",gap:3}}>
                  {[25,50,100,200].map(tp=>(
                    <button key={tp} onClick={()=>updateSetting("take_profit_pct",tp)} style={{
                      flex:1,padding:"6px 2px",borderRadius:5,border:`1px solid ${(wallet?.take_profit_pct||80)===tp?C.match+"44":C.border}`,
                      background:(wallet?.take_profit_pct||80)===tp?`${C.match}15`:"transparent",
                      color:(wallet?.take_profit_pct||80)===tp?C.match:C.dim,fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                    }}>+{tp}%</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Trailing Stop */}
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:10,color:C.muted,fontWeight:600}}>Trailing Stop</span>
                <span style={{fontSize:10,fontWeight:700,color:C.text}}>{wallet?.trailing_stop_pct||20}%</span>
              </div>
              <div style={{display:"flex",gap:3}}>
                {[10,15,20,30,0].map(ts=>(
                  <button key={ts} onClick={()=>updateSetting("trailing_stop_pct",ts)} style={{
                    flex:1,padding:"6px 2px",borderRadius:5,border:`1px solid ${(wallet?.trailing_stop_pct||20)===ts?C.purple+"44":C.border}`,
                    background:(wallet?.trailing_stop_pct||20)===ts?`${C.purple}15`:"transparent",
                    color:(wallet?.trailing_stop_pct||20)===ts?C.purple:C.dim,fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                  }}>{ts===0?"Off":`${ts}%`}</button>
                ))}
              </div>
              <div style={{fontSize:8,color:C.dim,marginTop:3}}>Locks in profits by trailing behind the peak price</div>
            </div>

            {/* Cooldown + Auto Rebalance */}
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:600,marginBottom:4}}>Cooldown (min between trades)</div>
                <div style={{display:"flex",gap:3}}>
                  {[5,10,15,30].map(cd=>(
                    <button key={cd} onClick={()=>updateSetting("cooldown_minutes",cd)} style={{
                      flex:1,padding:"6px 2px",borderRadius:5,border:`1px solid ${(wallet?.cooldown_minutes||15)===cd?C.indigo+"44":C.border}`,
                      background:(wallet?.cooldown_minutes||15)===cd?`${C.indigo}15`:"transparent",
                      color:(wallet?.cooldown_minutes||15)===cd?C.text:C.dim,fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                    }}>{cd}m</button>
                  ))}
                </div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:600,marginBottom:4}}>Auto-Rebalance</div>
                <button onClick={()=>updateSetting("auto_rebalance",!(wallet?.auto_rebalance??true))} style={{
                  width:"100%",padding:"6px",borderRadius:5,cursor:"pointer",fontFamily:"inherit",fontSize:9,fontWeight:600,
                  border:`1px solid ${(wallet?.auto_rebalance??true)?C.match+"44":C.border}`,
                  background:(wallet?.auto_rebalance??true)?`${C.match}15`:"transparent",
                  color:(wallet?.auto_rebalance??true)?C.match:C.dim,
                }}>{(wallet?.auto_rebalance??true)?"On — sells weakest when full":"Off — waits for manual exit"}</button>
              </div>
            </div>

            {/* Daily Loss Limit */}
            <div style={{marginTop:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:10,color:C.muted,fontWeight:600}}>Daily Loss Limit (circuit breaker)</span>
                <span style={{fontSize:10,fontWeight:700,color:C.hot}}>{wallet?.max_daily_loss_pct||-30}%</span>
              </div>
              <div style={{display:"flex",gap:3}}>
                {[-15,-20,-30,-50].map(dl=>(
                  <button key={dl} onClick={()=>updateSetting("max_daily_loss_pct",dl)} style={{
                    flex:1,padding:"6px 2px",borderRadius:5,border:`1px solid ${(wallet?.max_daily_loss_pct||-30)===dl?C.hot+"44":C.border}`,
                    background:(wallet?.max_daily_loss_pct||-30)===dl?`${C.hot}10`:"transparent",
                    color:(wallet?.max_daily_loss_pct||-30)===dl?C.hot:C.dim,fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                  }}>{dl}%</button>
                ))}
              </div>
              <div style={{fontSize:8,color:C.dim,marginTop:3}}>Auto-pauses trading if portfolio drops this much in one day</div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ OPEN POSITIONS ═══ */}
      {openPositions.length > 0 && (
        <div style={{padding:"0 16px",marginBottom:20}}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.cyan} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            Open Positions
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {openPositions.map((pos: any, i: number) => {
              const pnlPct = pos.price_at_trade ? (((pos.current_price || pos.price_at_trade) - pos.price_at_trade) / pos.price_at_trade * 100) : 0;
              const isUp = pnlPct >= 0;
              const sl = pos.stop_loss_pct || -20;
              const tp = pos.take_profit_pct || 50;
              const progress = Math.min(100, Math.max(0, ((pnlPct - sl) / (tp - sl)) * 100));
              return (
                <div key={i} style={{
                  background: C.surface, borderRadius: 12, padding: "14px 14px",
                  border: `1px solid ${isUp ? "rgba(48,209,88,0.12)" : "rgba(255,45,85,0.12)"}`,
                  animation: `float-up 0.3s ease-out ${i * 0.05}s both`,
                }}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <TradeIcon type="buy" size={22} />
                      <span style={{fontSize:14,fontWeight:700}}>{pos.token_symbol}</span>
                    </div>
                    <div style={{fontSize:15,fontWeight:800,color:isUp ? C.match : C.hot,fontFamily:"'JetBrains Mono',monospace"}}>
                      {isUp ? "+" : ""}{pnlPct.toFixed(1)}%
                    </div>
                  </div>
                  {/* SL/TP progress bar */}
                  <div style={{position:"relative",height:6,background:C.s2,borderRadius:3,overflow:"hidden"}}>
                    <div style={{
                      position:"absolute",left:0,top:0,height:"100%",width:`${progress}%`,borderRadius:3,
                      background:isUp ? `linear-gradient(90deg,${C.match},${C.cyan})` : `linear-gradient(90deg,${C.hot},#ff6b6b)`,
                      transition:"width 0.5s ease",
                    }}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:5,fontSize:9,color:C.dim}}>
                    <span>SL: {sl}%</span>
                    <span style={{color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>{pos.amount_eth?.toFixed(4)} ETH</span>
                    <span>TP: +{tp}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ LIVE SCANNER ═══ */}
      {isOn && scan?.scanning && (
        <div style={{padding:"0 16px",marginBottom:16}}>
          {/* Phase indicator */}
          <div style={{
            background:`linear-gradient(135deg,${C.surface},rgba(99,102,241,0.04))`,
            borderRadius:12,padding:"12px 14px",border:`1px solid rgba(99,102,241,0.1)`,marginBottom:8,
          }}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:
                  scan.phase==="ai_decision"?C.purple:scan.phase==="safety"?"#f59e0b":
                  scan.phase==="routing"?C.cyan:C.indigo,
                  animation:"pulse-dot 1s infinite"}}/>
                <span style={{fontSize:11,fontWeight:700,color:C.indigo,textTransform:"uppercase",letterSpacing:"0.05em"}}>
                  {scan.phase==="fetching"?"Fetching Tokens":scan.phase==="analyzing"?"Analyzing":
                   scan.phase==="safety"?"Safety Check":scan.phase==="ai_decision"?"AI Deciding":
                   scan.phase==="routing"?"Finding Route":"Monitoring"}
                </span>
              </div>
              <span style={{fontSize:9,color:C.dim,fontFamily:"'JetBrains Mono',monospace"}}>
                Next cycle: {scan.nextScan}m
              </span>
            </div>
            <div style={{fontSize:10,color:C.muted,lineHeight:1.4,animation:"float-up 0.3s ease-out"}} key={scan.phaseDetail}>
              {scan.phaseDetail}
            </div>
            {/* Cycle progress bar */}
            <div style={{height:2,borderRadius:1,background:C.s2,marginTop:8,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${scan.cycleProgress}%`,borderRadius:1,
                background:`linear-gradient(90deg,${C.indigo},${C.cyan})`,transition:"width 1s linear"}}/>
            </div>
          </div>

          {/* Token scan grid */}
          {scan.tokens?.length > 0 && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
              {scan.tokens.slice(0, 8).map((t: any, i: number) => {
                const isActive = i === scanTokenIdx;
                const isUp = (t.change1h || 0) >= 0;
                const vol = t.volume24h >= 1000000 ? `$${(t.volume24h/1000000).toFixed(1)}M` : `$${(t.volume24h/1000).toFixed(0)}k`;
                const liq = t.liquidity >= 1000000 ? `$${(t.liquidity/1000000).toFixed(1)}M` : `$${(t.liquidity/1000).toFixed(0)}k`;
                return (
                  <div key={t.address || i} style={{
                    background: isActive ? `${mode.orbColor}08` : C.surface,
                    borderRadius: 8, padding: "8px 10px",
                    border: `1px solid ${isActive ? mode.orbColor + "33" : C.border}`,
                    transition: "all 0.3s",
                    animation: isActive ? "glow-pulse 2s infinite" : "none",
                  }}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:11,fontWeight:700,color:isActive?C.text:C.muted}}>{t.symbol}</span>
                      <span style={{fontSize:10,fontWeight:700,color:isUp?C.match:C.hot,fontFamily:"'JetBrains Mono',monospace"}}>
                        {isUp?"+":""}{(t.change1h||0).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:3,fontSize:8,color:C.dim}}>
                      <span>${t.price < 0.01 ? t.price?.toFixed(6) : t.price < 1 ? t.price?.toFixed(4) : t.price?.toFixed(2)}</span>
                      <span>Vol {vol}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:1,fontSize:8,color:C.dim}}>
                      <span>Liq {liq}</span>
                      <span>{t.txns||0} txns/1h</span>
                    </div>
                    {/* Scanning indicator on active token */}
                    {isActive && (
                      <div style={{marginTop:4,height:2,borderRadius:1,background:C.s2,overflow:"hidden"}}>
                        <div style={{height:"100%",width:"100%",borderRadius:1,
                          background:`linear-gradient(90deg,transparent,${mode.orbColor},transparent)`,
                          animation:"shimmer 1.5s ease-in-out infinite"}}/>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent trades by your agent (last hour) */}
          {scan.recentTrades?.length > 0 && (
            <div style={{marginTop:8}}>
              <div style={{fontSize:9,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>
                Recent Executions
              </div>
              {scan.recentTrades.slice(0, 3).map((t: any, i: number) => (
                <div key={i} style={{
                  display:"flex",alignItems:"center",gap:8,padding:"6px 10px",
                  background:t.action==="buy"?`${C.match}06`:`${C.hot}06`,
                  borderRadius:6,border:`1px solid ${t.action==="buy"?C.match:C.hot}15`,
                  marginBottom:3,animation:`txn-enter 0.3s ease-out ${i*0.1}s both`,
                }}>
                  <div style={{width:4,height:20,borderRadius:2,background:t.action==="buy"?C.match:C.hot}}/>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:10,fontWeight:700,color:t.action==="buy"?C.match:C.hot}}>
                        {t.action?.toUpperCase()} {t.token_symbol}
                      </span>
                      <span style={{fontSize:9,color:C.dim}}>
                        {t.created_at ? (() => {
                          const m = Math.floor((Date.now() - new Date(t.created_at).getTime()) / 60000);
                          return m < 1 ? "just now" : m < 60 ? `${m}m ago` : `${Math.floor(m/60)}h ago`;
                        })() : ""}
                      </span>
                    </div>
                    <div style={{fontSize:8,color:C.muted,marginTop:1}}>{t.reasoning?.slice(0, 60)}</div>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:C.text}}>
                    {t.amount_eth?.toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ TRADE FEED ═══ */}
      <div style={{padding:"0 16px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",display:"flex",alignItems:"center",gap:6}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Trade History
          </div>
          {trades.length > 0 && (
            <div style={{fontSize:9,color:C.dim,padding:"3px 8px",borderRadius:5,background:C.s2,display:"flex",alignItems:"center",gap:4}}>
              <span style={{width:4,height:4,borderRadius:"50%",background:C.match,animation:"pulse-dot 1.5s infinite"}}/>
              LIVE
            </div>
          )}
        </div>

        {trades.filter((t:any)=>t.action!=="skip").length === 0 ? (
          <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,padding:"44px 20px",textAlign:"center"}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
              <AIRobotHead size={80} />
            </div>
            <div style={{fontSize:15,fontWeight:700,color:C.muted,marginBottom:6}}>No trades yet</div>
            <div style={{fontSize:12,color:C.dim,lineHeight:1.6,maxWidth:280,margin:"0 auto"}}>
              Your agent is standing by. Connect your AI brain and activate trading to begin.
            </div>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            {trades.filter((t:any)=>t.action!=="skip").slice(0, 20).map((tx: any, i: number) => {
              const isBuy = tx.action === "buy";
              const isSell = tx.action === "sell";
              const isSkip = tx.action === "skip";
              const iconType: "buy"|"sell"|"skip"|"other" = isBuy ? "buy" : isSell ? "sell" : isSkip ? "skip" : "other";
              const color = isBuy ? C.match : isSell ? C.hot : C.muted;
              const reasoning = tx.reasoning?.replace(/^\[\d+%\]\s*/, "").slice(0, 70);
              const time = tx.created_at ? new Date(tx.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
              const txHash = tx.tx_hash;

              return (
                <div key={i} style={{
                  display:"flex",alignItems:"flex-start",gap:10,padding:"11px 12px",
                  background: i === 0 ? `${color}06` : C.surface,
                  borderRadius: 10,
                  border: `1px solid ${i === 0 ? color + "18" : C.border}`,
                  animation: i < 3 ? `txn-enter 0.3s ease-out ${i * 0.06}s both` : "none",
                  opacity: Math.max(0.3, 1 - i * 0.04),
                }}>
                  <div style={{marginTop:1,flexShrink:0}}>
                    <TradeIcon type={iconType} size={22} />
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <span style={{fontSize:11,fontWeight:700,color,textTransform:"uppercase"}}>{tx.action}</span>
                        <span style={{fontSize:11,fontWeight:600}}>{tx.token_symbol}</span>
                        {tx.confidence && (
                          <span style={{
                            fontSize:8,padding:"2px 5px",borderRadius:4,fontWeight:700,
                            background:`${color}12`,color,border:`1px solid ${color}22`,
                          }}>{tx.confidence}%</span>
                        )}
                      </div>
                      <span style={{fontSize:12,fontWeight:800,color,fontFamily:"'JetBrains Mono',monospace"}}>
                        {isBuy ? "+" : "-"}{(tx.amount_eth || 0).toFixed(4)}
                      </span>
                    </div>
                    {reasoning && <div style={{fontSize:9,color:C.muted,marginTop:3,lineHeight:1.4}}>{reasoning}</div>}
                    <div style={{display:"flex",gap:8,fontSize:8,color:C.dim,marginTop:4}}>
                      <span>{time}</span>
                      {tx.fee_eth > 0 && <span>Fee: {tx.fee_eth.toFixed(6)}</span>}
                      {txHash && (
                        <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener"
                          style={{color:C.indigo,textDecoration:"none",display:"flex",alignItems:"center",gap:2}}>
                          BaseScan
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{textAlign:"center",padding:"24px 16px 0",fontSize:10,color:"rgba(255,255,255,0.12)"}}>
        5% deposit fee · 3% trade fee · All trades on Base L2
      </div>
    </div>
  );
}
