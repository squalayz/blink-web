"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const C = {
  bg:"#0a0a0f", surface:"#0d0d14", s2:"#1a1a24",
  indigo:"#6366f1", cyan:"#06b6d4", green:"#30d158", red:"#ff2d55",
  gold:"#ffd700", text:"#e8e8f0", muted:"#6b6b80",
  border:"rgba(255,255,255,0.07)", dim:"#2a2a3a",
};

interface Trade {
  id:string; action:"buy"|"sell"|"skip";
  token_symbol:string; token_address:string;
  amount_eth:number; price_at_trade:number; peak_price:number;
  fee_eth:number; pnl_eth:number|null; reasoning:string;
  tx_hash:string; created_at:string; closed_at:string|null;
  stop_loss_pct:number; take_profit_pct:number; trailing_stop_pct:number;
}
interface Agent {
  trading_enabled:boolean; risk_level:string; trading_mode:string;
  total_trading_pnl:number; total_fees:number;
  stop_loss_pct:number; take_profit_pct:number; trailing_stop_pct:number;
  max_position_pct:number; trade_size_pct:number;
}
interface Stats {
  total_closed:number; wins:number; losses:number; skips:number;
  win_rate:number; total_pnl:number; total_pnl_usd:number;
  today_pnl:number; today_pnl_usd:number; today_trades:number;
  avg_win:number; avg_loss:number;
  best_trade:Trade|null; worst_trade:Trade|null;
  streak:number; open_count:number; total_fees:number; total_pnl_all_time:number;
}
interface APIData {
  eth_usd:number; agent:Agent|null;
  open_positions:Trade[]; activity_feed:Trade[];
  pnl_series:{date:string;pnl:number;cumulative:number}[];
  stats:Stats; trades:Trade[];
}

function fmtEth(n:number,dec=4):string { return (n>=0?"+":"")+n.toFixed(dec); }
function fmtUsd(eth:number,ethUsd:number):string { const u=Math.abs(eth*ethUsd); return u>=1000?"$"+(u/1000).toFixed(1)+"k":"$"+u.toFixed(0); }
function ageStr(ts:string):string { const m=Math.floor((Date.now()-new Date(ts).getTime())/60000); if(m<60)return m+"m ago"; const h=Math.floor(m/60); if(h<24)return h+"h "+(m%60)+"m ago"; return Math.floor(h/24)+"d ago"; }
function durStr(from:string,to:string):string { const m=Math.floor((new Date(to).getTime()-new Date(from).getTime())/60000); if(m<60)return m+"m"; return Math.floor(m/60)+"h "+(m%60)+"m"; }
function shortHash(h:string):string { return h?h.slice(0,6)+"..."+h.slice(-4):""; }
function getGrade(reasoning:string):{letter:string;color:string} {
  const match=reasoning?.match(/\[(\d+)%\]/);
  const n=match?parseInt(match[1]):0;
  if(n>=90)return{letter:"A",color:C.green};
  if(n>=80)return{letter:"B",color:C.cyan};
  if(n>=70)return{letter:"C",color:C.gold};
  if(n>=60)return{letter:"D",color:"#f97316"};
  return{letter:"F",color:C.red};
}
function Skeleton({w="100%",h=16}:{w?:string;h?:number}) {
  return <div style={{width:w,height:h,borderRadius:8,background:"rgba(255,255,255,0.05)",animation:"mm-pulse 1.5s ease-in-out infinite"}}/>;
}

export default function TradesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<APIData|null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [countdown, setCountdown] = useState(180);
  const [lastRefreshed, setLastRefreshed] = useState<Date|null>(null);
  const [sortCol, setSortCol] = useState<"date"|"pnl">("date");
  const [sortDir, setSortDir] = useState<"desc"|"asc">("desc");
  const activityRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/trading/history?limit=300");
      if (r.status === 401) { router.push("/auth/signin"); return; }
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      setData(d);
      setLastRefreshed(new Date());
      setCountdown(180);
      if (activityRef.current) activityRef.current.scrollTop = 0;
    } catch(e:any) { setError(e.message); }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  useEffect(() => {
    const iv = setInterval(() => setCountdown(c => Math.max(0, c-1)), 1000);
    return () => clearInterval(iv);
  }, []);

  const stats = data?.stats;
  const agent = data?.agent;
  const ethUsd = data?.eth_usd || 2000;
  const pnlColor = (n:number) => n > 0 ? C.green : n < 0 ? C.red : C.muted;
  const streak = stats?.streak || 0;

  const closedTrades = (data?.trades || [])
    .filter(t => t.closed_at && t.pnl_eth != null)
    .sort((a,b) => {
      if (sortCol === "pnl") return sortDir === "desc" ? (b.pnl_eth||0)-(a.pnl_eth||0) : (a.pnl_eth||0)-(b.pnl_eth||0);
      return sortDir === "desc"
        ? new Date(b.closed_at!).getTime()-new Date(a.closed_at!).getTime()
        : new Date(a.closed_at!).getTime()-new Date(b.closed_at!).getTime();
    });
  const totalPages = Math.max(1, Math.ceil(closedTrades.length/20));
  const pageSlice = closedTrades.slice((page-1)*20, page*20);

  const pnlSeries = data?.pnl_series || [];
  const chartW=900, chartH=160, PL=60, PR=20, PT=20, PB=36, iW=820, iH=104;
  const vals = pnlSeries.map(s=>s.cumulative);
  const minV = vals.length ? Math.min(...vals, 0) : 0;
  const maxV = vals.length ? Math.max(...vals, 0.001) : 0.001;
  const range = maxV-minV || 0.001;
  const cpx = (i:number) => PL + (i/Math.max(pnlSeries.length-1,1))*iW;
  const cpy = (v:number) => PT + (1-(v-minV)/range)*iH;
  const profitable = vals.length > 0 && vals[vals.length-1] >= 0;
  const lineD = pnlSeries.length > 1
    ? "M "+pnlSeries.map((s,i)=>cpx(i).toFixed(1)+","+cpy(s.cumulative).toFixed(1)).join(" L ")
    : "";
  const areaD = lineD
    ? lineD+" L "+cpx(pnlSeries.length-1).toFixed(1)+","+cpy(0).toFixed(1)+" L "+cpx(0).toFixed(1)+","+cpy(0).toFixed(1)+" Z"
    : "";

  const font = "'JetBrains Mono','SF Mono',monospace";
  const riskColors:Record<string,{bg:string;color:string}> = {
    conservative:{bg:C.indigo+"33",color:C.indigo},
    moderate:{bg:C.gold+"33",color:C.gold},
    aggressive:{bg:C.red+"33",color:C.red},
  };
  const riskStyle = riskColors[agent?.risk_level||"conservative"] || riskColors.conservative;

  const xLabels = pnlSeries.length <= 6
    ? pnlSeries.map((_,i)=>i)
    : Array.from({length:6},(_,i)=>Math.round(i*(pnlSeries.length-1)/5));

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:font,paddingBottom:80}}>
      <style>{`
        @keyframes mm-pulse{0%,100%{opacity:0.35}50%{opacity:0.9}}
        @keyframes mm-dot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.7);opacity:0.5}}
        @keyframes mm-slide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes mm-glow{0%,100%{box-shadow:0 0 12px #30d15833}50%{box-shadow:0 0 28px #30d15866}}
        a{text-decoration:none;}
        ::-webkit-scrollbar{width:4px;background:transparent;}
        ::-webkit-scrollbar-thumb{background:#2a2a3a;border-radius:4px;}
      `}</style>
      {/* HEADER */}
      <div style={{position:"sticky",top:0,zIndex:50,background:C.surface+"ee",backdropFilter:"blur(12px)",borderBottom:"1px solid "+C.border,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>router.push("/dashboard")} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",display:"flex",alignItems:"center",gap:4,padding:"4px 8px",fontFamily:font}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <span style={{fontWeight:800,fontSize:14,letterSpacing:"-0.02em"}}>Trade Command Center</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:C.green,animation:"mm-dot 2s infinite"}}/>
          <span style={{fontSize:10,color:C.green,fontWeight:700,letterSpacing:"0.08em"}}>LIVE</span>
          {lastRefreshed && <span style={{fontSize:10,color:C.muted}}>Updated {lastRefreshed.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>}
          <button onClick={load} style={{border:"1px solid "+C.border,borderRadius:6,background:"none",color:C.muted,cursor:"pointer",padding:"3px 10px",fontSize:10,fontFamily:font}}>Refresh</button>
        </div>
      </div>

      {error && <div style={{margin:"12px 20px",padding:"10px 14px",background:C.red+"15",border:"1px solid "+C.red+"44",borderRadius:10,fontSize:12,color:C.red}}>{error}</div>}

      <div style={{maxWidth:1200,margin:"0 auto",padding:"20px 16px"}}>

        {/* STATS BAR */}
        <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
          {[
            {label:"Total P&L", accent:pnlColor(stats?.total_pnl||0), val:fmtEth(stats?.total_pnl||0), sub:fmtUsd(stats?.total_pnl||0,ethUsd), valSize:22},
            {label:"Win Rate", accent:C.indigo, val:(stats?.win_rate||0).toFixed(1)+"%", sub:(stats?.wins||0)+"w / "+(stats?.losses||0)+"l", valSize:22},
            {label:"Streak", accent:streak>0?C.green:streak<0?C.red:C.muted,
              val:streak>0?"+"+streak+" Win Streak":streak<0?Math.abs(streak)+" Loss Streak":"—",
              sub:streak!==0?(streak>0?"consecutive wins":"consecutive losses"):"no active streak", valSize:18},
            {label:"Open Positions", accent:C.cyan, val:String(stats?.open_count||0), sub:(stats?.open_count||0)>0?"actively trading":"scanning for signals", valSize:22},
            {label:"Today", accent:pnlColor(stats?.today_pnl||0), val:fmtEth(stats?.today_pnl||0), sub:(stats?.today_trades||0)+" trades today", valSize:20},
          ].map((card,i)=>(
            <div key={i} style={{flex:"1 1 140px",background:C.surface,border:"1px solid "+card.accent+"33",borderRadius:14,padding:"16px 18px"}}>
              <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:8}}>{card.label}</div>
              {loading ? <Skeleton h={28}/> : <div style={{fontSize:card.valSize,fontWeight:900,color:card.accent,letterSpacing:"-0.02em",lineHeight:1.1}}>{card.val}</div>}
              {!loading && <div style={{fontSize:11,color:C.muted,marginTop:6}}>{card.sub}</div>}
            </div>
          ))}
        </div>

        {/* AGENT STATUS */}
        <div style={{background:C.surface,borderRadius:16,border:"1px solid "+C.border,padding:20,marginBottom:20}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:16}}>Agent Status</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:24}}>
            {/* Col 1 */}
            <div>
              {agent?.trading_enabled
                ? <div style={{background:"#30d15815",border:"1px solid #30d15855",borderRadius:10,padding:12,animation:"mm-glow 2s infinite"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:C.green,animation:"mm-dot 1.5s infinite"}}/>
                      <span style={{fontSize:13,fontWeight:800,color:C.green,letterSpacing:"0.05em"}}>ACTIVE</span>
                    </div>
                    <div style={{fontSize:11,color:"#30d15899",marginTop:4}}>Trading enabled</div>
                  </div>
                : <div style={{background:C.dim,borderRadius:10,padding:12}}>
                    <span style={{fontSize:13,fontWeight:800,color:C.muted}}>PAUSED</span>
                    <div style={{fontSize:11,color:C.muted,marginTop:4}}>Trading disabled</div>
                  </div>
              }
              <div style={{marginTop:12,fontSize:13,color:C.text,fontWeight:600}}>
                {(agent?.trading_mode||"—").replace(/_/g," ").replace(/\b\w/g,(c:string)=>c.toUpperCase())}
              </div>
              <span style={{display:"inline-block",marginTop:8,background:riskStyle.bg,color:riskStyle.color,borderRadius:20,padding:"4px 10px",fontSize:11,fontWeight:700}}>
                {(agent?.risk_level||"—").charAt(0).toUpperCase()+(agent?.risk_level||"").slice(1)}
              </span>
            </div>
            {/* Col 2 */}
            <div>
              {[
                ["Stop Loss", (agent?.stop_loss_pct||0)+"%"],
                ["Take Profit", (agent?.take_profit_pct||0)+"%"],
                ["Trailing Stop", (agent?.trailing_stop_pct||0)+"%"],
                ["Max Position", (agent?.max_position_pct||0)+"%"],
                ["Trade Size", (agent?.trade_size_pct||0)+"%"],
              ].map(([label,val])=>(
                <div key={label} style={{display:"flex",justifyContent:"space-between",borderBottom:"1px solid "+C.border,padding:"8px 0",fontSize:12}}>
                  <span style={{color:C.muted}}>{label}</span>
                  <span style={{color:C.text,fontWeight:600}}>{val}</span>
                </div>
              ))}
            </div>
            {/* Col 3 */}
            <div>
              <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.08em",color:C.muted,marginBottom:4}}>All-Time P&L</div>
              <div style={{fontSize:18,fontWeight:800,color:pnlColor(stats?.total_pnl_all_time||0),marginBottom:14}}>{fmtEth(stats?.total_pnl_all_time||0)}</div>
              <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.08em",color:C.muted,marginBottom:4}}>Fees Paid</div>
              <div style={{fontSize:13,color:C.muted,marginBottom:14}}>{(stats?.total_fees||0).toFixed(4)} ETH</div>
              <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.08em",color:C.muted,marginBottom:4}}>Total Closed</div>
              <div style={{fontSize:13,color:C.text}}>{stats?.total_closed||0}</div>
            </div>
          </div>
          {/* Countdown */}
          <div style={{borderTop:"1px solid "+C.border,marginTop:16,paddingTop:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:11,color:C.muted}}>Next scan in</span>
              <span style={{fontSize:11,color:C.indigo,fontWeight:700}}>{countdown}s</span>
            </div>
            <div style={{height:3,background:C.dim,borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:(countdown/180*100)+"%",background:C.indigo,borderRadius:4,transition:"width 1s linear"}}/>
            </div>
          </div>
        </div>
        {/* EQUITY CURVE */}
        <div style={{background:C.surface,borderRadius:16,border:"1px solid "+C.border,overflow:"hidden",marginBottom:20}}>
          <div style={{padding:"14px 20px 4px",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted}}>Equity Curve — Cumulative P&L (ETH)</div>
          <svg viewBox="0 0 900 160" width="100%" style={{display:"block"}} preserveAspectRatio="none">
            {loading
              ? <text x="450" y="85" textAnchor="middle" fontSize="13" fill={C.muted}>Loading...</text>
              : pnlSeries.length < 2
                ? <text x="450" y="85" textAnchor="middle" fontSize="13" fill={C.muted}>Equity curve appears after first closed trade</text>
                : <>
                    <defs>
                      <linearGradient id="eq-line" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={C.indigo}/>
                        <stop offset="100%" stopColor={C.cyan}/>
                      </linearGradient>
                      <linearGradient id="eq-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={profitable?C.green:C.red} stopOpacity={0.18}/>
                        <stop offset="100%" stopColor={profitable?C.green:C.red} stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <line x1={PL} y1={cpy(0)} x2={chartW-PR} y2={cpy(0)} stroke={C.dim} strokeDasharray="4,3" strokeWidth={1}/>
                    {areaD && <path d={areaD} fill="url(#eq-fill)"/>}
                    {lineD && <path d={lineD} fill="none" stroke="url(#eq-line)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>}
                    {[minV, 0, maxV].map((v,i)=>(
                      <text key={i} x={PL-4} y={cpy(v)+4} textAnchor="end" fontSize="9" fill={C.muted}>{(v>=0?"+":"")+v.toFixed(3)}</text>
                    ))}
                    {xLabels.map((idx,i)=>(
                      <text key={i} x={cpx(idx)} y={156} textAnchor="middle" fontSize="9" fill={C.muted}>{pnlSeries[idx]?.date?.slice(5)}</text>
                    ))}
                  </>
            }
          </svg>
        </div>

        {/* TWO COLUMNS */}
        <div style={{display:"flex",gap:16,marginBottom:20,flexWrap:"wrap",alignItems:"flex-start"}}>
          {/* Open Positions */}
          <div style={{flex:"1 1 300px",minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:C.green,animation:"mm-dot 1.5s infinite"}}/>
              <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted}}>Open Positions ({data?.open_positions?.length||0})</span>
            </div>
            {loading
              ? [0,1].map(i=><div key={i} style={{marginBottom:10}}><Skeleton h={110}/></div>)
              : (data?.open_positions||[]).length === 0
                ? <div style={{background:C.surface,borderRadius:14,border:"1px solid "+C.border,padding:"28px 20px",textAlign:"center"}}>
                    <div style={{fontSize:13,color:C.text}}>No open positions</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:6}}>Scanning for entry signals</div>
                  </div>
                : (data?.open_positions||[]).map(pos=>(
                    <div key={pos.id} style={{background:C.surface,border:"1px solid #30d15855",borderRadius:14,padding:"14px 16px",marginBottom:10,animation:"mm-glow 2s infinite, mm-slide 0.3s ease"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <div>
                          <div style={{fontSize:22,fontWeight:900,letterSpacing:"-0.02em"}}>{pos.token_symbol}</div>
                          <div style={{fontSize:10,color:C.muted,marginTop:2}}>Entry ${pos.price_at_trade>0?pos.price_at_trade.toFixed(6):"—"}</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:15,fontWeight:800,color:pnlColor(pos.pnl_eth||0)}}>{fmtEth(pos.pnl_eth||0)}</div>
                          <div style={{fontSize:10,color:C.muted,marginTop:2}}>{ageStr(pos.created_at)}</div>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:12,fontSize:10,color:C.muted,marginBottom:pos.reasoning?6:0}}>
                        <span>Size {pos.amount_eth.toFixed(4)} ETH</span>
                        <span>SL {pos.stop_loss_pct}%</span>
                        <span>TP {pos.take_profit_pct}%</span>
                      </div>
                      {pos.reasoning && <div style={{fontSize:10,color:C.muted,lineHeight:1.4,marginTop:4}}>{pos.reasoning.slice(0,80)}{pos.reasoning.length>80?"...":""}</div>}
                      {pos.tx_hash && <a href={"https://basescan.org/tx/"+pos.tx_hash} target="_blank" rel="noopener noreferrer" style={{display:"block",fontSize:9,color:C.indigo,marginTop:6}}>{shortHash(pos.tx_hash)} on Basescan</a>}
                    </div>
                  ))
            }
          </div>

          {/* Activity Feed */}
          <div style={{flex:"1 1 300px",minWidth:0}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:10}}>Activity Feed ({data?.activity_feed?.length||0})</div>
            <div style={{background:C.surface,borderRadius:14,border:"1px solid "+C.border,overflow:"hidden"}}>
              <div ref={activityRef} style={{maxHeight:420,overflowY:"auto"}}>
                {loading
                  ? [0,1,2,3].map(i=><div key={i} style={{padding:"12px 14px",borderBottom:"1px solid "+C.border}}><Skeleton h={36}/></div>)
                  : (data?.activity_feed||[]).length === 0
                    ? <div style={{padding:32,textAlign:"center",color:C.muted,fontSize:12}}>No activity yet — agent is scanning</div>
                    : (data?.activity_feed||[]).map(item=>{
                        const accentColor=item.action==="buy"?C.green:item.action==="sell"?C.cyan:C.dim;
                        const badgeBg=item.action==="buy"?"#30d15820":item.action==="sell"?"#06b6d420":C.dim;
                        return (
                          <div key={item.id} style={{padding:"10px 14px",borderBottom:"1px solid "+C.border,borderLeft:"3px solid "+accentColor}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                              <div style={{display:"flex",alignItems:"center",gap:6}}>
                                <span style={{background:badgeBg,color:accentColor,fontSize:9,fontWeight:800,borderRadius:4,padding:"2px 6px",textTransform:"uppercase"}}>{item.action}</span>
                                <span style={{fontSize:12,fontWeight:700}}>{item.token_symbol}</span>
                                {item.action==="buy" && <span style={{fontSize:10,color:C.muted}}>{item.amount_eth.toFixed(4)} ETH</span>}
                                {item.action==="sell" && <span style={{fontSize:11,fontWeight:700,color:pnlColor(item.pnl_eth||0)}}>{fmtEth(item.pnl_eth||0)}</span>}
                                {item.action==="skip" && <span style={{fontSize:10,color:C.muted}}>{(item.reasoning||"").slice(0,60)}</span>}
                              </div>
                              <span style={{fontSize:9,color:C.muted,flexShrink:0}}>{ageStr(item.created_at)}</span>
                            </div>
                            {item.action!=="skip" && item.reasoning && <div style={{fontSize:10,color:C.muted,lineHeight:1.4,marginBottom:3}}>{item.reasoning.slice(0,90)}{item.reasoning.length>90?"...":""}</div>}
                            {item.tx_hash && <a href={"https://basescan.org/tx/"+item.tx_hash} target="_blank" rel="noopener noreferrer" style={{fontSize:9,color:C.indigo}}>{shortHash(item.tx_hash)}</a>}
                          </div>
                        );
                      })
                }
              </div>
            </div>
          </div>
        </div>
        {/* CLOSED TRADES TABLE */}
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted}}>Closed Trades ({closedTrades.length})</span>
            {(["date","pnl"] as const).map(col=>(
              <button key={col} onClick={()=>{ if(sortCol===col){setSortDir(d=>d==="desc"?"asc":"desc");}else{setSortCol(col);setSortDir("desc");} }}
                style={{border:"1px solid "+(sortCol===col?C.indigo+"55":C.border),borderRadius:5,background:sortCol===col?C.indigo+"22":"transparent",color:sortCol===col?C.indigo:C.muted,fontSize:9,fontWeight:700,cursor:"pointer",padding:"3px 8px",fontFamily:font,textTransform:"uppercase",letterSpacing:"0.06em"}}>
                {col==="date"?"Date":"P&L"} {sortCol===col?(sortDir==="desc"?"↓":"↑"):""}
              </button>
            ))}
          </div>
          <div style={{background:C.surface,borderRadius:14,border:"1px solid "+C.border,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"1.4fr 0.9fr 1fr 0.9fr 0.9fr 0.8fr 0.6fr 0.7fr",padding:"10px 16px",borderBottom:"1px solid "+C.border,fontSize:9,fontWeight:800,textTransform:"uppercase",color:C.muted,letterSpacing:"0.08em"}}>
              <span>Token</span><span>Size</span><span>Entry</span><span>P&L ETH</span><span>P&L USD</span><span>Duration</span><span>Grade</span><span>Tx</span>
            </div>
            {loading
              ? [0,1,2].map(i=><div key={i} style={{padding:"12px 16px",borderBottom:"1px solid "+C.border}}><Skeleton h={18}/></div>)
              : pageSlice.length === 0
                ? <div style={{padding:32,textAlign:"center",color:C.muted,fontSize:12}}>No closed trades yet</div>
                : pageSlice.map(t=>{
                    const pnl=t.pnl_eth||0;
                    const grade=getGrade(t.reasoning||"");
                    return (
                      <div key={t.id} style={{display:"grid",gridTemplateColumns:"1.4fr 0.9fr 1fr 0.9fr 0.9fr 0.8fr 0.6fr 0.7fr",padding:"11px 16px",borderBottom:"1px solid "+C.border,background:pnl>0?"#30d15808":pnl<0?"#ff2d5508":"transparent",alignItems:"center"}}>
                        <span style={{fontWeight:700,fontSize:11}}>{t.token_symbol}</span>
                        <span style={{fontSize:11,color:C.muted}}>{t.amount_eth.toFixed(4)}</span>
                        <span style={{fontSize:10,color:C.muted,fontFamily:"monospace"}}>{t.price_at_trade>0?"$"+t.price_at_trade.toFixed(5):"—"}</span>
                        <span style={{fontSize:11,fontWeight:700,color:pnlColor(pnl)}}>{fmtEth(pnl)}</span>
                        <span style={{fontSize:10,color:C.muted}}>{fmtUsd(pnl,ethUsd)}</span>
                        <span style={{fontSize:10,color:C.muted}}>{t.closed_at?durStr(t.created_at,t.closed_at):"—"}</span>
                        <span style={{fontSize:9,fontWeight:800,background:grade.color+"20",color:grade.color,borderRadius:4,padding:"2px 6px",display:"inline-block"}}>{grade.letter}</span>
                        {t.tx_hash
                          ? <a href={"https://basescan.org/tx/"+t.tx_hash} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:C.indigo}}>{shortHash(t.tx_hash)}</a>
                          : <span style={{fontSize:10,color:C.dim}}>—</span>
                        }
                      </div>
                    );
                  })
            }
          </div>
          {totalPages > 1 && (
            <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:12,marginTop:12}}>
              <button onClick={()=>setPage(p=>p-1)} disabled={page===1}
                style={{border:"1px solid "+C.border,borderRadius:6,background:"none",color:C.text,cursor:page===1?"not-allowed":"pointer",padding:"5px 12px",fontSize:11,fontFamily:font,opacity:page===1?0.3:1}}>Prev</button>
              <span style={{fontSize:11,color:C.muted}}>Page {page} of {totalPages}</span>
              <button onClick={()=>setPage(p=>p+1)} disabled={page===totalPages}
                style={{border:"1px solid "+C.border,borderRadius:6,background:"none",color:C.text,cursor:page===totalPages?"not-allowed":"pointer",padding:"5px 12px",fontSize:11,fontFamily:font,opacity:page===totalPages?0.3:1}}>Next</button>
            </div>
          )}
        </div>

        {/* PERFORMANCE */}
        <div style={{marginBottom:40}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:12}}>Performance</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            {[
              {label:"Avg Win",val:(stats?.avg_win||0).toFixed(4)+" ETH",color:C.green,border:C.green},
              {label:"Avg Loss",val:(stats?.avg_loss||0).toFixed(4)+" ETH",color:C.red,border:C.red},
              {label:"Profit Factor",val:((stats?.avg_win||0)/Math.abs(stats?.avg_loss||0.0001)).toFixed(2)+"x",color:C.indigo,border:C.indigo},
            ].map(card=>(
              <div key={card.label} style={{flex:"1 1 140px",background:C.surface,border:"1px solid "+card.border+"33",borderRadius:14,padding:"16px 18px"}}>
                <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:8}}>{card.label}</div>
                {loading ? <Skeleton h={28}/> : <div style={{fontSize:18,fontWeight:800,color:card.color}}>{card.val}</div>}
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:12,marginTop:12,flexWrap:"wrap"}}>
            {stats?.best_trade && (
              <div style={{flex:"1 1 200px",background:C.surface,border:"1px solid #30d15833",borderRadius:14,padding:"16px 18px"}}>
                <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:8}}>Best Trade</div>
                <div style={{fontSize:16,fontWeight:800}}>{stats.best_trade.token_symbol}</div>
                <div style={{fontSize:14,fontWeight:700,color:C.green,marginTop:4}}>{fmtEth(stats.best_trade.pnl_eth||0)}</div>
                {stats.best_trade.tx_hash && <a href={"https://basescan.org/tx/"+stats.best_trade.tx_hash} target="_blank" rel="noopener noreferrer" style={{display:"block",fontSize:9,color:C.indigo,marginTop:6}}>View on Basescan</a>}
              </div>
            )}
            {stats?.worst_trade && (
              <div style={{flex:"1 1 200px",background:C.surface,border:"1px solid #ff2d5533",borderRadius:14,padding:"16px 18px"}}>
                <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted,marginBottom:8}}>Worst Trade</div>
                <div style={{fontSize:16,fontWeight:800}}>{stats.worst_trade.token_symbol}</div>
                <div style={{fontSize:14,fontWeight:700,color:C.red,marginTop:4}}>{fmtEth(stats.worst_trade.pnl_eth||0)}</div>
                {stats.worst_trade.tx_hash && <a href={"https://basescan.org/tx/"+stats.worst_trade.tx_hash} target="_blank" rel="noopener noreferrer" style={{display:"block",fontSize:9,color:C.indigo,marginTop:6}}>View on Basescan</a>}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
