"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const C = {
  bg:"#050508",surface:"#0a0a12",s2:"#111118",indigo:"#6366f1",cyan:"#06b6d4",
  match:"#30d158",hot:"#ff2d55",gold:"#ffd700",text:"#e8e8f0",
  muted:"#6b6b80",dim:"#2a2a3a",border:"#1a1a2e",
};

export default function AdminPanel() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"overview"|"users"|"deposits"|"trades"|"syndicates"|"revenue">("overview");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dashboard", pin }),
    });
    const d = await r.json();
    if (d.error) { alert(d.error); setAuthed(false); }
    else { setData(d); setAuthed(true); }
    setLoading(false);
  }

  if (!authed) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Outfit',sans-serif"}}>
      <div style={{background:C.surface,borderRadius:16,padding:32,border:`1px solid ${C.border}`,maxWidth:320,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:24,fontWeight:800,color:C.text,marginBottom:4}}>Admin</div>
        <div style={{fontSize:11,color:C.muted,marginBottom:20}}>MishMesh.ai Control Panel</div>
        <input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="Enter admin PIN"
          onKeyDown={e=>{if(e.key==="Enter")load();}}
          style={{width:"100%",padding:"12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.s2,color:C.text,fontSize:14,fontFamily:"'JetBrains Mono',monospace",textAlign:"center",boxSizing:"border-box",marginBottom:12}}/>
        <button onClick={load} disabled={loading} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${C.indigo},${C.cyan})`,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          {loading?"Loading...":"Enter"}
        </button>
      </div>
    </div>
  );

  if (!data) return null;
  const s = data.stats;

  function StatCard({label,value,sub,color}:{label:string;value:string|number;sub?:string;color?:string}) {
    return (
      <div style={{background:C.surface,borderRadius:12,padding:"14px 12px",border:`1px solid ${C.border}`,textAlign:"center",flex:1,minWidth:80}}>
        <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{label}</div>
        <div style={{fontSize:18,fontWeight:800,color:color||C.text,fontFamily:"'JetBrains Mono',monospace"}}>{value}</div>
        {sub&&<div style={{fontSize:9,color:C.dim,marginTop:2}}>{sub}</div>}
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Outfit',sans-serif",color:C.text,padding:"16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:18,fontWeight:800}}>MishMesh Admin</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={load} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>Refresh</button>
          <div style={{fontSize:9,color:C.dim}}>{new Date().toLocaleString()}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:16,overflowX:"auto"}}>
        {(["overview","users","deposits","trades","syndicates","revenue"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:"8px 14px",borderRadius:8,border:`1px solid ${tab===t?C.indigo+"44":C.border}`,
            background:tab===t?`${C.indigo}15`:"transparent",color:tab===t?C.text:C.muted,
            fontSize:11,fontWeight:tab===t?700:500,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize",whiteSpace:"nowrap",
          }}>{t}</button>
        ))}
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {tab==="overview"&&(
        <div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
            <StatCard label="Total Users" value={s.total_users} />
            <StatCard label="With Wallets" value={s.users_with_wallets} />
            <StatCard label="AI Connected" value={s.users_with_ai} />
            <StatCard label="Trading Active" value={s.trading_active} color={C.match} />
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
            <StatCard label="Total Deposits" value={s.total_deposits} />
            <StatCard label="Deposit Volume" value={`${s.deposit_volume_eth?.toFixed(4)}`} sub="ETH" color={C.cyan} />
            <StatCard label="Fees Collected" value={`${s.total_fees_eth?.toFixed(4)}`} sub="ETH" color={C.gold} />
            <StatCard label="Trade Fees" value={`${s.trade_fees_eth?.toFixed(4)}`} sub="ETH" color={C.gold} />
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
            <StatCard label="Total Trades" value={s.total_trades} />
            <StatCard label="Buys" value={s.total_buys} color={C.match} />
            <StatCard label="Sells" value={s.total_sells} color={C.hot} />
            <StatCard label="Skipped" value={s.total_skips} />
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
            <StatCard label="Syndicates" value={s.total_syndicates} />
            <StatCard label="Active Syndicates" value={s.active_syndicates} color={C.match} />
            <StatCard label="Referrals" value={s.total_referrals} />
            <StatCard label="Signups Today" value={s.signups_today} color={C.cyan} />
          </div>

          {/* Revenue summary */}
          <div style={{background:C.surface,borderRadius:14,padding:16,border:`1px solid ${C.gold}22`,marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.gold,marginBottom:10}}>Revenue Summary</div>
            <div style={{display:"flex",gap:16}}>
              <div>
                <div style={{fontSize:9,color:C.muted}}>Deposit Fees (5%)</div>
                <div style={{fontSize:16,fontWeight:800,color:C.gold,fontFamily:"'JetBrains Mono',monospace"}}>{s.total_fees_eth?.toFixed(6)} ETH</div>
              </div>
              <div>
                <div style={{fontSize:9,color:C.muted}}>Trade Fees (3%)</div>
                <div style={{fontSize:16,fontWeight:800,color:C.gold,fontFamily:"'JetBrains Mono',monospace"}}>{s.trade_fees_eth?.toFixed(6)} ETH</div>
              </div>
              <div>
                <div style={{fontSize:9,color:C.muted}}>Total Revenue</div>
                <div style={{fontSize:16,fontWeight:800,color:C.match,fontFamily:"'JetBrains Mono',monospace"}}>{((s.total_fees_eth||0)+(s.trade_fees_eth||0)).toFixed(6)} ETH</div>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:8}}>RECENT SIGNUPS</div>
          <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:16}}>
            {(data.recent_users||[]).slice(0,10).map((u:any,i:number)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:C.surface,borderRadius:8,border:`1px solid ${C.border}`,fontSize:11}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontWeight:600}}>{u.agent_name||"No agent"}</span>
                  <span style={{color:C.dim,fontSize:9}}>{u.wallet_address?.slice(0,8)}...{u.wallet_address?.slice(-4)}</span>
                </div>
                <span style={{color:C.dim,fontSize:9}}>{new Date(u.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ USERS ═══ */}
      {tab==="users"&&(
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:10}}>ALL USERS ({data.all_users?.length||0})</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {(data.all_users||[]).map((u:any,i:number)=>{
              const hasDeposit=u.balance_live>0;
              const hasAI=!!u.ai_provider&&u.ai_provider!=="openai"||!!u.agent_name;
              return(
                <div key={i} style={{background:C.surface,borderRadius:12,padding:"12px 14px",border:`1px solid ${hasDeposit?`${C.cyan}22`:C.border}`,transition:"all 0.2s"}}>
                  {/* Row 1: Identity */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:28,height:28,borderRadius:8,background:hasDeposit?`${C.cyan}15`:`${C.dim}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:hasDeposit?C.cyan:C.muted}}>
                        {(u.name||u.agent_name||"?")[0]?.toUpperCase()||"?"}
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
                          {u.name||u.agent_name||"Anonymous"}
                          {u.agent_mood&&<span style={{fontSize:12}}>{u.agent_mood}</span>}
                          {u.trading_enabled&&<span style={{padding:"1px 5px",borderRadius:3,background:`${C.match}15`,color:C.match,fontSize:7,fontWeight:700}}>LIVE</span>}
                        </div>
                        <div style={{fontSize:9,color:C.dim,fontFamily:"'JetBrains Mono',monospace",marginTop:1}}>
                          {u.wallet_address}
                        </div>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:9,color:C.dim}}>{new Date(u.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</div>
                      {u.onboarded&&<span style={{fontSize:7,padding:"1px 4px",borderRadius:3,background:`${C.indigo}15`,color:C.indigo,fontWeight:600}}>ONBOARDED</span>}
                    </div>
                  </div>

                  {/* Row 2: Wallet + Balance */}
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",fontSize:9}}>
                    <div style={{padding:"4px 8px",borderRadius:6,background:C.s2,display:"flex",alignItems:"center",gap:4}}>
                      <span style={{color:C.muted}}>Balance:</span>
                      <span style={{color:u.balance_live>0?C.cyan:C.dim,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{u.balance_live?.toFixed(6)||"0"} ETH</span>
                    </div>
                    {u.trading_mode&&(
                      <div style={{padding:"4px 8px",borderRadius:6,background:C.s2,display:"flex",alignItems:"center",gap:4}}>
                        <span style={{color:C.muted}}>Strategy:</span>
                        <span style={{color:C.text,fontWeight:600}}>{u.trading_mode}</span>
                      </div>
                    )}
                    {u.ai_provider&&(
                      <div style={{padding:"4px 8px",borderRadius:6,background:C.s2,display:"flex",alignItems:"center",gap:4}}>
                        <span style={{color:C.muted}}>AI:</span>
                        <span style={{color:C.indigo,fontWeight:600}}>{u.ai_provider}{u.ai_model?` / ${u.ai_model}`:""}</span>
                      </div>
                    )}
                    {u.total_pnl!==0&&(
                      <div style={{padding:"4px 8px",borderRadius:6,background:C.s2,display:"flex",alignItems:"center",gap:4}}>
                        <span style={{color:C.muted}}>P&L:</span>
                        <span style={{color:u.total_pnl>=0?C.match:C.hot,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{u.total_pnl>=0?"+":""}{u.total_pnl?.toFixed(4)}</span>
                      </div>
                    )}
                    {u.tier&&u.tier!=="free"&&(
                      <div style={{padding:"4px 8px",borderRadius:6,background:`${C.gold}10`,display:"flex",alignItems:"center",gap:4}}>
                        <span style={{color:C.gold,fontWeight:600}}>{u.tier.toUpperCase()}</span>
                      </div>
                    )}
                    {u.referred_by&&(
                      <div style={{padding:"4px 8px",borderRadius:6,background:C.s2,display:"flex",alignItems:"center",gap:4}}>
                        <span style={{color:C.muted}}>Ref:</span>
                        <span style={{color:C.text}}>{u.referred_by}</span>
                      </div>
                    )}
                    {u.email&&(
                      <div style={{padding:"4px 8px",borderRadius:6,background:C.s2,display:"flex",alignItems:"center",gap:4}}>
                        <span style={{color:C.muted}}>Email:</span>
                        <span style={{color:C.text}}>{u.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ DEPOSITS ═══ */}
      {tab==="deposits"&&(
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:8}}>ALL DEPOSITS ({data.deposits?.length||0})</div>
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            {(data.deposits||[]).map((d:any,i:number)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:C.surface,borderRadius:8,border:`1px solid ${C.border}`,fontSize:10}}>
                <div>
                  <span style={{fontWeight:700,color:C.cyan,fontFamily:"'JetBrains Mono',monospace"}}>{d.amount_eth?.toFixed(6)} ETH</span>
                  <span style={{color:C.dim,marginLeft:8}}>Fee: {d.fee_eth?.toFixed(6)}</span>
                  <span style={{color:C.match,marginLeft:8}}>Net: {d.net_eth?.toFixed(6)}</span>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{color:C.dim,fontFamily:"'JetBrains Mono',monospace",fontSize:8}}>{d.wallet?.slice(0,10)}...</span>
                  <span style={{color:C.dim,fontSize:8}}>{new Date(d.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ TRADES ═══ */}
      {tab==="trades"&&(
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:8}}>RECENT TRADES ({data.trades?.length||0})</div>
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            {(data.trades||[]).map((t:any,i:number)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:C.surface,borderRadius:8,border:`1px solid ${C.border}`,fontSize:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontWeight:700,color:t.action==="buy"?C.match:t.action==="sell"?C.hot:C.muted,textTransform:"uppercase",minWidth:30}}>{t.action}</span>
                  <span style={{fontWeight:600}}>{t.token_symbol||"—"}</span>
                  <span style={{color:C.cyan,fontFamily:"'JetBrains Mono',monospace"}}>{t.amount_eth?.toFixed(4)} ETH</span>
                  {t.fee_eth>0&&<span style={{color:C.dim}}>Fee: {t.fee_eth?.toFixed(6)}</span>}
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  {t.pnl_eth!=null&&<span style={{color:t.pnl_eth>=0?C.match:C.hot,fontWeight:600}}>{t.pnl_eth>=0?"+":""}{t.pnl_eth?.toFixed(4)}</span>}
                  <span style={{color:C.dim,fontSize:8}}>{t.agent_name||"?"}</span>
                  <span style={{color:C.dim,fontSize:8}}>{new Date(t.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SYNDICATES ═══ */}
      {tab==="syndicates"&&(
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:8}}>SYNDICATES ({data.syndicates_list?.length||0})</div>
          {(data.syndicates_list||[]).length===0?(
            <div style={{textAlign:"center",padding:40,color:C.dim,fontSize:12}}>No syndicates created yet</div>
          ):(data.syndicates_list||[]).map((s:any,i:number)=>(
            <div key={i} style={{background:C.surface,borderRadius:10,padding:"12px",border:`1px solid ${C.border}`,marginBottom:6,fontSize:10}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontWeight:700,fontSize:13}}>{s.avatar_emoji} {s.name}</span>
                <span style={{padding:"2px 6px",borderRadius:4,background:s.status==="active"?`${C.match}15`:`${C.muted}15`,color:s.status==="active"?C.match:C.muted,fontSize:8,fontWeight:600}}>{s.status}</span>
              </div>
              <div style={{display:"flex",gap:12,marginTop:6,color:C.dim}}>
                <span>{s.member_count} members</span>
                <span>{s.total_trades} trades</span>
                <span style={{color:(s.total_pnl_eth||0)>=0?C.match:C.hot}}>P&L: {(s.total_pnl_eth||0).toFixed(4)} ETH</span>
                <span>WR: {((s.win_rate||0)*100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ REVENUE ═══ */}
      {tab==="revenue"&&(
        <div>
          <div style={{background:`linear-gradient(135deg,${C.surface},rgba(255,215,0,0.04))`,borderRadius:14,padding:20,border:`1px solid ${C.gold}22`,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:800,color:C.gold,marginBottom:16}}>Platform Revenue</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <div style={{fontSize:9,color:C.muted}}>Deposit Fees (5%)</div>
                <div style={{fontSize:20,fontWeight:800,color:C.gold,fontFamily:"'JetBrains Mono',monospace"}}>{s.total_fees_eth?.toFixed(6)}</div>
                <div style={{fontSize:9,color:C.dim}}>ETH from {s.total_deposits} deposits</div>
              </div>
              <div>
                <div style={{fontSize:9,color:C.muted}}>Trade Fees (3%)</div>
                <div style={{fontSize:20,fontWeight:800,color:C.gold,fontFamily:"'JetBrains Mono',monospace"}}>{s.trade_fees_eth?.toFixed(6)}</div>
                <div style={{fontSize:9,color:C.dim}}>ETH from {(s.total_buys||0)+(s.total_sells||0)} trades</div>
              </div>
              <div>
                <div style={{fontSize:9,color:C.muted}}>Referral Payouts</div>
                <div style={{fontSize:20,fontWeight:800,color:C.hot,fontFamily:"'JetBrains Mono',monospace"}}>{s.referral_payouts_eth?.toFixed(6)}</div>
                <div style={{fontSize:9,color:C.dim}}>ETH to {s.total_referrals} referrers</div>
              </div>
              <div>
                <div style={{fontSize:9,color:C.muted}}>Net Revenue</div>
                <div style={{fontSize:20,fontWeight:800,color:C.match,fontFamily:"'JetBrains Mono',monospace"}}>{((s.total_fees_eth||0)+(s.trade_fees_eth||0)-(s.referral_payouts_eth||0)).toFixed(6)}</div>
                <div style={{fontSize:9,color:C.dim}}>ETH after referral payouts</div>
              </div>
            </div>
          </div>

          <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:8}}>PLATFORM WALLET</div>
          <div style={{background:C.surface,borderRadius:10,padding:12,border:`1px solid ${C.border}`,fontSize:10}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",color:C.cyan,marginBottom:4}}>0xae055E5e11Eb9Da449fF049e97FfbCbc904d91a1</div>
            <div style={{color:C.dim}}>All deposit + trade fees auto-send here</div>
          </div>
        </div>
      )}
    </div>
  );
}
