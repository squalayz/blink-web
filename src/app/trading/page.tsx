"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const C = {
  bg:"#050508",surface:"#0a0a12",s2:"#111118",indigo:"#6366f1",cyan:"#06b6d4",
  purple:"#a855f7",match:"#30d158",hot:"#ff2d55",gold:"#ffd700",text:"#e8e8f0",
  muted:"#6b6b80",dim:"#2a2a3a",border:"#1a1a2e",
};

const MODES: any = {
  meme_scout:{emoji:"🔥",name:"Meme Scout",color:"#ff2d55"},
  blue_chip:{emoji:"💎",name:"Blue Chip",color:C.indigo},
  momentum:{emoji:"🚀",name:"Momentum",color:"#f59e0b"},
  mean_revert:{emoji:"🔄",name:"Mean Reversion",color:C.cyan},
  sniper:{emoji:"🎯",name:"Sniper",color:C.purple},
  hodl_dca:{emoji:"📈",name:"Auto DCA",color:C.match},
};

export default function TradingDashboard() {
  const router = useRouter();
  const [wallet, setWallet] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orbState, setOrbState] = useState<"idle"|"scanning"|"buy"|"sell">("idle");
  const orbRef = useRef<HTMLDivElement>(null);
  const prevTradeCount = useRef(0);

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

    // Poll every 10s
    const iv = setInterval(async () => {
      try {
        const r = await fetch("/api/wallet");
        if (!r.ok) return;
        const data = await r.json();
        if (data && !data.error) {
          setWallet(data);
          const newTrades = data.recent_trades || [];
          // Flash orb on new trade
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
    return () => clearInterval(iv);
  }, []);

  if (loading) return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:40,height:40,borderRadius:"50%",border:`3px solid ${C.dim}`,borderTopColor:C.indigo,animation:"spin 0.8s linear infinite"}}/></div>;

  const mode = MODES[wallet?.trading_mode] || MODES.meme_scout;
  const isOn = wallet?.trading_enabled;
  const balance = wallet?.balance_eth || 0;
  const balUsd = wallet?.balance_usd || 0;
  const pnl = wallet?.total_trading_pnl || 0;
  const openPositions = trades.filter((t:any) => t.action === "buy" && !t.closed_at);
  const closedTrades = trades.filter((t:any) => t.closed_at || t.action === "sell");
  const wins = closedTrades.filter((t:any) => (t.pnl_eth || 0) > 0).length;
  const winRate = closedTrades.length > 0 ? Math.round((wins / closedTrades.length) * 100) : 0;

  const orbColors: any = {
    idle: { bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.2)", glow: "rgba(99,102,241,0.15)" },
    scanning: { bg: "rgba(99,102,241,0.12)", border: "rgba(6,182,212,0.3)", glow: "rgba(6,182,212,0.2)" },
    buy: { bg: "rgba(48,209,88,0.15)", border: "rgba(48,209,88,0.5)", glow: "rgba(48,209,88,0.4)" },
    sell: { bg: "rgba(255,45,85,0.15)", border: "rgba(255,45,85,0.5)", glow: "rgba(255,45,85,0.4)" },
  };
  const oc = orbColors[orbState];

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Outfit',sans-serif",color:C.text,paddingBottom:40}}>
      <style>{`
        body{margin:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes orb-idle{0%,100%{transform:scale(1);box-shadow:0 0 30px ${orbColors.idle.glow}}50%{transform:scale(1.02);box-shadow:0 0 50px ${orbColors.idle.glow}}}
        @keyframes orb-scan{0%,100%{transform:scale(1);box-shadow:0 0 40px ${orbColors.scanning.glow},0 0 80px rgba(6,182,212,0.05)}50%{transform:scale(1.04);box-shadow:0 0 60px ${orbColors.scanning.glow},0 0 120px rgba(6,182,212,0.08)}}
        @keyframes orb-buy{0%{transform:scale(1);box-shadow:0 0 40px rgba(48,209,88,0.3)}50%{transform:scale(1.12);box-shadow:0 0 80px rgba(48,209,88,0.5),0 0 150px rgba(48,209,88,0.2)}100%{transform:scale(1);box-shadow:0 0 40px rgba(48,209,88,0.3)}}
        @keyframes orb-sell{0%{transform:scale(1);box-shadow:0 0 40px rgba(255,45,85,0.3)}50%{transform:scale(1.12);box-shadow:0 0 80px rgba(255,45,85,0.5),0 0 150px rgba(255,45,85,0.2)}100%{transform:scale(1);box-shadow:0 0 40px rgba(255,45,85,0.3)}}
        @keyframes orb-ring{0%{transform:scale(0.8);opacity:1}100%{transform:scale(2);opacity:0}}
        @keyframes float-particle{0%{transform:translateY(0) rotate(0deg);opacity:0.6}100%{transform:translateY(-60px) rotate(180deg);opacity:0}}
        @keyframes txn-enter{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(1.3)}}
      `}</style>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px"}}>
        <button onClick={()=>router.push("/dashboard")} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontFamily:"inherit",fontSize:13,display:"flex",alignItems:"center",gap:6}}>
          ← Dashboard
        </button>
        <div style={{fontSize:14,fontWeight:700}}>AI Trading</div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {isOn&&<span style={{width:6,height:6,borderRadius:"50%",background:C.match,animation:"pulse-dot 1.5s infinite"}}/>}
          <span style={{fontSize:11,color:isOn?C.match:C.muted}}>{isOn?"Live":"Off"}</span>
        </div>
      </div>

      {/* ═══ THE ORB ═══ */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 0 30px",position:"relative"}}>
        {/* Particles (scanning state) */}
        {orbState==="scanning"&&Array.from({length:6}).map((_,i)=>(
          <div key={i} style={{
            position:"absolute",width:4,height:4,borderRadius:"50%",
            background:C.cyan,opacity:0.4,
            left:`calc(50% + ${Math.cos(i*60*Math.PI/180)*60}px)`,
            top:`calc(50% + ${Math.sin(i*60*Math.PI/180)*60}px - 20px)`,
            animation:`float-particle ${2+i*0.3}s ease-out ${i*0.4}s infinite`,
          }}/>
        ))}

        {/* Ring pulse on trade */}
        {(orbState==="buy"||orbState==="sell")&&(
          <div style={{
            position:"absolute",width:130,height:130,borderRadius:"50%",
            border:`2px solid ${orbState==="buy"?C.match:C.hot}`,
            animation:"orb-ring 1s ease-out forwards",pointerEvents:"none",
          }}/>
        )}

        {/* Main orb */}
        <div ref={orbRef} style={{
          width:110,height:110,borderRadius:"50%",
          background:`radial-gradient(circle at 35% 35%, ${oc.bg}, ${C.bg})`,
          border:`2px solid ${oc.border}`,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          animation: orbState==="idle"?"orb-idle 4s ease-in-out infinite":
                     orbState==="scanning"?"orb-scan 3s ease-in-out infinite":
                     orbState==="buy"?"orb-buy 0.8s ease-in-out":
                     "orb-sell 0.8s ease-in-out",
          transition:"all 0.4s",cursor:"pointer",position:"relative",
        }}>
          <span style={{fontSize:32}}>{mode.emoji}</span>
        </div>

        <div style={{marginTop:12,textAlign:"center"}}>
          <div style={{fontSize:14,fontWeight:700,color:mode.color}}>{mode.name}</div>
          <div style={{fontSize:11,color:C.muted,marginTop:2}}>
            {orbState==="idle"?"Engine off":orbState==="scanning"?"Scanning markets...":orbState==="buy"?"Executing buy!":"Executing sell!"}
          </div>
        </div>
      </div>

      {/* ═══ PORTFOLIO BAR ═══ */}
      <div style={{display:"flex",gap:6,padding:"0 16px",marginBottom:20}}>
        {[
          {label:"Portfolio",value:`${balance.toFixed(4)} ETH`,sub:`$${balUsd.toFixed(0)}`,color:C.text},
          {label:"P&L",value:`${pnl>=0?"+":""}${pnl.toFixed(4)}`,sub:"ETH",color:pnl>=0?C.match:C.hot},
          {label:"Trades",value:trades.length.toString(),sub:"total",color:C.text},
          {label:"Win Rate",value:closedTrades.length>0?`${winRate}%`:"—",sub:`${wins}W`,color:winRate>=50?C.match:C.hot},
        ].map((s,i)=>(
          <div key={i} style={{flex:1,background:C.surface,borderRadius:12,padding:"12px 8px",textAlign:"center",border:`1px solid ${C.border}`}}>
            <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:15,fontWeight:800,color:s.color,fontFamily:"'JetBrains Mono',monospace"}}>{s.value}</div>
            <div style={{fontSize:9,color:C.dim}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ═══ OPEN POSITIONS ═══ */}
      {openPositions.length>0&&(
        <div style={{padding:"0 16px",marginBottom:20}}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Open Positions</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {openPositions.map((pos:any,i:number)=>{
              const pnlPct=pos.price_at_trade?(((pos.current_price||pos.price_at_trade)-pos.price_at_trade)/pos.price_at_trade*100):0;
              const isUp=pnlPct>=0;
              const sl=pos.stop_loss_pct||-20;
              const tp=pos.take_profit_pct||50;
              const progress=Math.min(100,Math.max(0,((pnlPct-sl)/(tp-sl))*100));
              return(
                <div key={i} style={{background:C.surface,borderRadius:12,padding:"12px 14px",border:`1px solid ${isUp?"rgba(48,209,88,0.1)":"rgba(255,45,85,0.1)"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:16}}>🟢</span>
                      <span style={{fontSize:13,fontWeight:700}}>{pos.token_symbol}</span>
                    </div>
                    <div style={{fontSize:14,fontWeight:800,color:isUp?C.match:C.hot,fontFamily:"'JetBrains Mono',monospace"}}>
                      {isUp?"+":""}{pnlPct.toFixed(1)}%
                    </div>
                  </div>
                  {/* SL/TP progress bar */}
                  <div style={{position:"relative",height:6,background:C.s2,borderRadius:3,overflow:"hidden"}}>
                    <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${progress}%`,borderRadius:3,
                      background:isUp?`linear-gradient(90deg,${C.match},${C.cyan})`:`linear-gradient(90deg,${C.hot},#ff6b6b)`,
                      transition:"width 0.5s ease"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:9,color:C.dim}}>
                    <span>SL: {sl}%</span>
                    <span>{pos.amount_eth?.toFixed(4)} ETH</span>
                    <span>TP: +{tp}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ LIVE TRADE FEED ═══ */}
      <div style={{padding:"0 16px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em"}}>Trade History</div>
          {trades.length>0&&<div style={{fontSize:9,color:C.dim,padding:"3px 8px",borderRadius:5,background:C.s2}}>
            <span style={{width:4,height:4,borderRadius:"50%",background:C.match,display:"inline-block",marginRight:4,animation:"pulse-dot 1.5s infinite"}}/>LIVE
          </div>}
        </div>

        {trades.length===0?(
          <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,padding:"40px 20px",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12,opacity:0.3}}>🤖</div>
            <div style={{fontSize:14,fontWeight:600,color:C.muted,marginBottom:4}}>No trades yet</div>
            <div style={{fontSize:11,color:C.dim}}>Your agent is waiting. Connect your AI brain and activate trading to start.</div>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            {trades.slice(0,15).map((tx:any,i:number)=>{
              const isBuy=tx.action==="buy";
              const isSell=tx.action==="sell";
              const isSkip=tx.action==="skip";
              const icon=isBuy?"🟢":isSell?"🔴":isSkip?"⚠️":"📋";
              const color=isBuy?C.match:isSell?C.hot:C.muted;
              const reasoning=tx.reasoning?.replace(/^\[\d+%\]\s*/,"").slice(0,60);
              const time=tx.created_at?new Date(tx.created_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}):""
              const txHash=tx.tx_hash;

              return(
                <div key={i} style={{
                  display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",
                  background:i===0?`${color}06`:C.surface,borderRadius:10,
                  border:`1px solid ${i===0?color+"18":C.border}`,
                  animation:i<3?`txn-enter 0.3s ease-out ${i*0.06}s both`:"none",
                  opacity:Math.max(0.3,1-i*0.06),
                }}>
                  <span style={{fontSize:16,marginTop:1}}>{icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <span style={{fontSize:11,fontWeight:700,color}}>{tx.action?.toUpperCase()}</span>
                        <span style={{fontSize:11,fontWeight:600}}>{tx.token_symbol}</span>
                        {tx.confidence&&<span style={{fontSize:8,padding:"1px 4px",borderRadius:3,background:`${color}15`,color,fontWeight:700}}>{tx.confidence}%</span>}
                      </div>
                      <span style={{fontSize:12,fontWeight:800,color,fontFamily:"'JetBrains Mono',monospace"}}>
                        {isBuy?"+":"-"}{(tx.amount_eth||0).toFixed(4)}
                      </span>
                    </div>
                    {reasoning&&<div style={{fontSize:9,color:C.muted,marginTop:2,lineHeight:1.3}}>{reasoning}</div>}
                    <div style={{display:"flex",gap:8,fontSize:8,color:C.dim,marginTop:3}}>
                      <span>{time}</span>
                      {tx.fee_eth&&<span>Fee: {tx.fee_eth.toFixed(6)}</span>}
                      {txHash&&<a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener" style={{color:C.cold,textDecoration:"none"}}>BaseScan ↗</a>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
