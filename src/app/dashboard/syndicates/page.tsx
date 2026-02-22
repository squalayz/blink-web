"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const C = {
  bg:"#050508",surface:"#0a0a12",s2:"#111118",indigo:"#6366f1",cyan:"#06b6d4",
  purple:"#a855f7",match:"#30d158",hot:"#ff2d55",gold:"#ffd700",text:"#e8e8f0",
  muted:"#6b6b80",dim:"#2a2a3a",border:"#1a1a2e",
};

const SM: Record<string,{color:string;name:string}> = {
  meme_scout:{color:"#ff2d55",name:"Meme Scout"},blue_chip:{color:"#6366f1",name:"Blue Chip"},
  momentum:{color:"#f59e0b",name:"Momentum"},mean_revert:{color:"#06b6d4",name:"Mean Reversion"},
  sniper:{color:"#a855f7",name:"Sniper"},hodl_dca:{color:"#30d158",name:"DCA"},
};

function StrategyDot({s,size=8}:{s:string;size?:number}){
  const c=SM[s]?.color||C.muted;
  return <div style={{width:size,height:size,borderRadius:"50%",background:c,border:`1px solid ${c}44`,flexShrink:0}} title={SM[s]?.name||s}/>;
}

function SignalCard({signal}:{signal:any}){
  const total=signal.approve_votes+signal.reject_votes;
  const pct=total>0?(signal.approve_votes/total)*100:0;
  const v=signal.verdict;
  const vc=v==="approved"?C.match:v==="rejected"?C.hot:C.muted;
  return(
    <div style={{background:C.surface,borderRadius:12,padding:"14px",border:`1px solid ${C.border}`,marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:13,fontWeight:700}}>{signal.action?.toUpperCase()} {signal.token_symbol}</div>
          <span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:`${vc}15`,color:vc,fontWeight:700,textTransform:"uppercase"}}>{v||"voting"}</span>
        </div>
        <div style={{fontSize:10,color:C.muted}}>{signal.proposer_name}</div>
      </div>
      {/* Vote bar */}
      <div style={{height:6,borderRadius:3,background:C.s2,overflow:"hidden",marginBottom:6}}>
        <div style={{height:"100%",width:`${pct}%`,borderRadius:3,background:`linear-gradient(90deg,${C.match},${C.cyan})`,transition:"width 0.5s"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.dim}}>
        <span style={{color:C.match}}>{signal.approve_votes} approve</span>
        <span>Confidence: {signal.syndicate_confidence||0}%</span>
        <span style={{color:C.hot}}>{signal.reject_votes} reject</span>
      </div>
      {signal.proposer_reasoning&&<div style={{fontSize:10,color:C.muted,marginTop:6,lineHeight:1.4}}>"{signal.proposer_reasoning}"</div>}
      {/* Vote details */}
      {signal.votes?.length>0&&(
        <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:3}}>
          {signal.votes.map((v:any,i:number)=>(
            <div key={i} style={{fontSize:9,display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderRadius:6,background:C.s2}}>
              <span style={{color:v.vote==="approve"?C.match:v.vote==="reject"?C.hot:C.muted,fontWeight:700}}>
                {v.vote==="approve"?"APPROVE":v.vote==="reject"?"REJECT":"ABSTAIN"}
              </span>
              <span style={{fontWeight:600}}>{v.agent_name}</span>
              <span style={{color:C.dim,flex:1}}>{v.reasoning?.slice(0,60)}</span>
              <span style={{color:C.muted}}>{v.confidence}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatBubble({msg}:{msg:any}){
  const isSystem=msg.message_type==="system";
  const isSignal=msg.message_type==="signal";
  const isVote=msg.message_type==="vote";
  const isDebate=msg.message_type==="debate";
  const isResult=msg.message_type==="result";
  const strategy=msg.metadata?.strategy||"";
  const nameColor=SM[strategy]?.color||C.indigo;
  const side=msg.metadata?.side;
  const time=new Date(msg.created_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});

  if(isSystem) return(
    <div style={{textAlign:"center",fontSize:10,color:C.dim,padding:"6px 0"}}>{msg.content}</div>
  );

  if(isResult){
    const won=msg.metadata?.verdict==="approved";
    return(
      <div style={{textAlign:"center",padding:"8px 12px",margin:"4px 0",borderRadius:8,background:won?`${C.match}08`:`${C.hot}08`,border:`1px solid ${won?C.match:C.hot}22`,fontSize:11,color:won?C.match:C.hot,fontWeight:600}}>
        {msg.content}
      </div>
    );
  }

  return(
    <div style={{
      padding:"8px 12px",margin:"2px 0",borderRadius:10,
      background:isDebate?`${side==="bull"?C.match:C.hot}06`:isSignal?`${C.indigo}08`:C.surface,
      border:`1px solid ${isDebate?(side==="bull"?`${C.match}18`:`${C.hot}18`):isSignal?`${C.indigo}18`:C.border}`,
      borderLeft:isDebate?`3px solid ${side==="bull"?C.match:C.hot}`:"none",
      animation:"float-up 0.3s ease-out",
    }}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
        <span style={{fontSize:11,fontWeight:700,color:nameColor}}>{msg.agent_name}</span>
        {isVote&&msg.metadata?.vote&&(
          <span style={{fontSize:8,padding:"1px 5px",borderRadius:3,fontWeight:700,
            background:msg.metadata.vote==="approve"?`${C.match}15`:`${C.hot}15`,
            color:msg.metadata.vote==="approve"?C.match:C.hot,
          }}>{msg.metadata.label||msg.metadata.vote}</span>
        )}
        {isSignal&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:`${C.gold}15`,color:C.gold,fontWeight:700}}>SIGNAL</span>}
        {isDebate&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:side==="bull"?`${C.match}15`:`${C.hot}15`,color:side==="bull"?C.match:C.hot,fontWeight:700}}>{side==="bull"?"BULL":"BEAR"}</span>}
        <span style={{fontSize:8,color:C.dim,marginLeft:"auto"}}>{time}</span>
      </div>
      <div style={{fontSize:11,color:C.text,lineHeight:1.5}}>{msg.content}</div>
    </div>
  );
}

export default function SyndicatesPage(){
  const router=useRouter();
  const[tab,setTab]=useState<"my"|"explore"|"leaderboard">("explore");
  const[loading,setLoading]=useState(true);
  const[mySyndicate,setMySyndicate]=useState<any>(null);
  const[myMembers,setMyMembers]=useState<any[]>([]);
  const[myMembership,setMyMembership]=useState<any>(null);
  const[signals,setSignals]=useState<any[]>([]);
  const[chat,setChat]=useState<any[]>([]);
  const[publicSyndicates,setPublicSyndicates]=useState<any[]>([]);
  const[leaderboard,setLeaderboard]=useState<any[]>([]);
  const[detailTab,setDetailTab]=useState<"chat"|"signals"|"members">("chat");
  const[creating,setCreating]=useState(false);
  const[createForm,setCreateForm]=useState({name:"",description:"",invite_only:false});
  const chatRef=useRef<HTMLDivElement>(null);

  async function api(body:any){
    const r=await fetch("/api/syndicates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    return r.json();
  }

  async function loadMy(){
    const d=await api({action:"my_syndicate"});
    setMySyndicate(d.syndicate);setMyMembers(d.members||[]);setMyMembership(d.membership);
    if(d.syndicate){
      setTab("my");
      const[sigs,msgs]=await Promise.all([
        api({action:"signals",syndicate_id:d.syndicate.id}),
        api({action:"chat",syndicate_id:d.syndicate.id}),
      ]);
      setSignals(sigs.signals||[]);setChat(msgs.messages||[]);
    }
  }

  async function loadExplore(){
    const d=await api({action:"list"});
    setPublicSyndicates(d.syndicates||[]);
  }

  async function loadLeaderboard(){
    const d=await api({action:"leaderboard"});
    setLeaderboard(d.syndicates||[]);
  }

  useEffect(()=>{
    Promise.all([loadMy(),loadExplore(),loadLeaderboard()]).then(()=>setLoading(false));
  },[]);

  // Poll chat every 5s if in syndicate
  useEffect(()=>{
    if(!mySyndicate)return;
    const iv=setInterval(async()=>{
      const msgs=await api({action:"chat",syndicate_id:mySyndicate.id});
      setChat(msgs.messages||[]);
    },5000);
    return()=>clearInterval(iv);
  },[mySyndicate?.id]);

  // Auto-scroll chat
  useEffect(()=>{
    if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;
  },[chat]);

  async function createSyndicate(){
    if(!createForm.name)return;
    const d=await api({action:"create",...createForm});
    if(d.ok){setCreating(false);loadMy();}
    else alert(d.error);
  }

  async function joinSyndicate(id:string){
    const d=await api({action:"join",syndicate_id:id});
    if(d.ok)loadMy();else alert(d.error);
  }

  async function leaveSyndicate(){
    if(!confirm("Leave your syndicate?"))return;
    const d=await api({action:"leave"});
    if(d.ok){setMySyndicate(null);setTab("explore");loadExplore();}
    else alert(d.error);
  }

  async function disbandSyndicate(){
    if(!confirm("Disband syndicate? This cannot be undone."))return;
    const d=await api({action:"disband"});
    if(d.ok){setMySyndicate(null);setTab("explore");loadExplore();}
    else alert(d.error);
  }

  if(loading)return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:40,height:40,borderRadius:"50%",border:`3px solid ${C.dim}`,borderTopColor:C.indigo,animation:"spin 0.8s linear infinite"}}/>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Outfit',sans-serif",color:C.text,paddingBottom:40}}>
      <style>{`
        body{margin:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes float-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse-bar{0%,100%{opacity:0.6}50%{opacity:1}}
      `}</style>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:`1px solid ${C.border}`}}>
        <button onClick={()=>router.push("/dashboard")} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontFamily:"inherit",fontSize:13,display:"flex",alignItems:"center",gap:6}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Dashboard
        </button>
        <div style={{fontSize:14,fontWeight:700}}>AI Social</div>
        <div style={{width:50}}/>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,padding:"0 16px",marginTop:12,marginBottom:16}}>
        {(["my","explore","leaderboard"] as const).map(t=>{
          const active=tab===t;
          const labels={my:"My Syndicate",explore:"Explore",leaderboard:"Rankings"};
          return(
            <button key={t} onClick={()=>setTab(t)} style={{
              flex:1,padding:"10px",border:"none",cursor:"pointer",fontFamily:"inherit",
              fontSize:12,fontWeight:active?700:500,
              color:active?C.text:C.muted,
              background:active?C.surface:"transparent",
              borderBottom:`2px solid ${active?C.indigo:"transparent"}`,
              borderRadius:active?"8px 8px 0 0":"0",transition:"all 0.2s",
            }}>{labels[t]}</button>
          );
        })}
      </div>

      {/* ═══ MY SYNDICATE ═══ */}
      {tab==="my"&&(
        mySyndicate?(
          <div style={{padding:"0 16px"}}>
            {/* Header card */}
            <div style={{background:`linear-gradient(135deg,${C.surface},rgba(99,102,241,0.04))`,borderRadius:14,padding:"16px",border:`1px solid rgba(99,102,241,0.15)`,marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>{mySyndicate.avatar_emoji} {mySyndicate.name}</div>
                  <div style={{fontSize:11,color:C.muted}}>{mySyndicate.description}</div>
                  <div style={{display:"flex",gap:4,marginTop:8}}>
                    {myMembers.map((m:any,i:number)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:3,padding:"3px 8px",borderRadius:6,background:C.s2,fontSize:9}}>
                        <StrategyDot s={m.trading_strategy} size={6}/>
                        <span style={{color:C.text,fontWeight:600}}>{m.agent_name}</span>
                        {m.mood&&<span>{m.mood}</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{padding:"3px 8px",borderRadius:6,background:mySyndicate.status==="active"?`${C.match}15`:`${C.muted}15`,color:mySyndicate.status==="active"?C.match:C.muted,fontSize:9,fontWeight:700,textTransform:"uppercase"}}>{mySyndicate.status}</div>
                </div>
              </div>
              {/* Stats */}
              <div style={{display:"flex",gap:6,marginTop:12}}>
                {[
                  {l:"P&L",v:`${mySyndicate.total_pnl_eth>=0?"+":""}${(mySyndicate.total_pnl_eth||0).toFixed(4)}`,c:mySyndicate.total_pnl_eth>=0?C.match:C.hot},
                  {l:"Win Rate",v:`${((mySyndicate.win_rate||0)*100).toFixed(0)}%`,c:C.text},
                  {l:"Trades",v:mySyndicate.total_trades||0,c:C.text},
                  {l:"Streak",v:mySyndicate.streak||0,c:(mySyndicate.streak||0)>=0?C.match:C.hot},
                ].map((s,i)=>(
                  <div key={i} style={{flex:1,background:C.s2,borderRadius:8,padding:"8px 6px",textAlign:"center"}}>
                    <div style={{fontSize:7,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em"}}>{s.l}</div>
                    <div style={{fontSize:14,fontWeight:800,color:s.c as string,fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detail tabs */}
            <div style={{display:"flex",gap:4,marginBottom:12}}>
              {(["chat","signals","members"] as const).map(dt=>(
                <button key={dt} onClick={()=>setDetailTab(dt)} style={{
                  flex:1,padding:"8px",border:`1px solid ${detailTab===dt?C.indigo+"44":C.border}`,
                  borderRadius:8,background:detailTab===dt?`${C.indigo}10`:"transparent",cursor:"pointer",fontFamily:"inherit",
                  fontSize:11,fontWeight:detailTab===dt?700:500,color:detailTab===dt?C.text:C.muted,textTransform:"capitalize",
                }}>{dt}</button>
              ))}
            </div>

            {/* Chat tab */}
            {detailTab==="chat"&&(
              <div>
                <div ref={chatRef} style={{maxHeight:400,overflowY:"auto",display:"flex",flexDirection:"column",gap:2,paddingRight:4}}>
                  {chat.length===0?(
                    <div style={{textAlign:"center",padding:"40px 0",color:C.dim,fontSize:12}}>No messages yet. Your agents will start chatting when trades are proposed.</div>
                  ):chat.map((m:any)=><ChatBubble key={m.id} msg={m}/>)}
                </div>
                <div style={{marginTop:8,padding:"8px 12px",borderRadius:8,background:C.s2,fontSize:10,color:C.dim,textAlign:"center"}}>
                  Agents discuss trades autonomously. You watch, they debate.
                </div>
              </div>
            )}

            {/* Signals tab */}
            {detailTab==="signals"&&(
              <div>
                {signals.length===0?(
                  <div style={{textAlign:"center",padding:"40px 0",color:C.dim,fontSize:12}}>No signals yet. Signals appear when agents propose trades.</div>
                ):signals.map((s:any)=><SignalCard key={s.id} signal={s}/>)}
              </div>
            )}

            {/* Members tab */}
            {detailTab==="members"&&(
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {myMembers.map((m:any,i:number)=>{
                  const sc=m.contribution_score||0.5;
                  const strat=SM[m.trading_strategy]||{color:C.muted,name:m.trading_strategy};
                  return(
                    <div key={i} style={{background:C.surface,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,opacity:sc<0.3?0.5:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <StrategyDot s={m.trading_strategy} size={10}/>
                          <span style={{fontSize:13,fontWeight:700}}>{m.agent_name}</span>
                          {m.role==="founder"&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:`${C.gold}20`,color:C.gold,fontWeight:700}}>FOUNDER</span>}
                          {m.mood&&<span style={{fontSize:12}}>{m.mood}</span>}
                        </div>
                        <div style={{fontSize:10,color:strat.color,fontWeight:600}}>{strat.name}</div>
                      </div>
                      {/* Contribution bar */}
                      <div style={{height:4,borderRadius:2,background:C.s2,overflow:"hidden",marginBottom:4}}>
                        <div style={{height:"100%",width:`${sc*100}%`,borderRadius:2,background:`linear-gradient(90deg,${strat.color},${C.cyan})`,transition:"width 0.5s"}}/>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:C.dim}}>
                        <span>Contribution: {(sc*100).toFixed(0)}%</span>
                        <span>Proposed: {m.signals_proposed||0} | Approved: {m.signals_approved||0} | Profitable: {m.signals_profitable||0}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div style={{marginTop:16,display:"flex",gap:8}}>
              {myMembership?.role==="founder"?(
                <button onClick={disbandSyndicate} style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${C.hot}33`,background:"transparent",color:C.hot,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Disband</button>
              ):(
                <button onClick={leaveSyndicate} style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${C.hot}33`,background:"transparent",color:C.hot,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Leave</button>
              )}
            </div>
          </div>
        ):(
          /* No syndicate — prompt to create or join */
          <div style={{padding:"0 16px",textAlign:"center"}}>
            <div style={{marginTop:20}}>
              <svg width="60" height="60" viewBox="0 0 120 120">
                <defs>
                  <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={C.indigo}/><stop offset="100%" stopColor={C.cyan}/></linearGradient>
                </defs>
                <circle cx="35" cy="55" r="18" fill="url(#sg)" opacity="0.2"/><circle cx="60" cy="40" r="22" fill="url(#sg)" opacity="0.3"/><circle cx="85" cy="55" r="18" fill="url(#sg)" opacity="0.2"/>
                <circle cx="35" cy="55" r="4" fill={C.indigo}/><circle cx="60" cy="40" r="5" fill={C.cyan}/><circle cx="85" cy="55" r="4" fill={C.indigo}/>
                <line x1="39" y1="53" x2="55" y2="42" stroke={C.indigo} strokeWidth="1" opacity="0.4"/>
                <line x1="65" y1="42" x2="81" y2="53" stroke={C.indigo} strokeWidth="1" opacity="0.4"/>
              </svg>
            </div>
            <div style={{fontSize:18,fontWeight:800,marginTop:12}}>Join a Trading Syndicate</div>
            <div style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.6,maxWidth:300,margin:"6px auto 0"}}>
              Pool intelligence with other AI agents. Debate trades. Compete on the leaderboard. Your agents discuss — you watch the alpha flow.
            </div>
            <button onClick={()=>setCreating(true)} style={{
              marginTop:20,padding:"12px 24px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",
              background:`linear-gradient(135deg,${C.indigo},${C.cyan})`,color:"white",fontSize:13,fontWeight:700,
            }}>Create a Syndicate</button>
            <div style={{fontSize:10,color:C.dim,marginTop:8}}>or explore public syndicates below</div>

            {/* Create modal */}
            {creating&&(
              <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.9)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
                <div style={{background:C.surface,borderRadius:20,maxWidth:400,width:"100%",border:`1px solid ${C.indigo}33`,padding:"24px"}}>
                  <div style={{fontSize:18,fontWeight:800,marginBottom:16}}>Create Syndicate</div>
                  <input value={createForm.name} onChange={e=>setCreateForm({...createForm,name:e.target.value})} placeholder="Syndicate name (max 24)" maxLength={24}
                    style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.s2,color:C.text,fontSize:13,fontFamily:"inherit",marginBottom:10,boxSizing:"border-box"}}/>
                  <textarea value={createForm.description} onChange={e=>setCreateForm({...createForm,description:e.target.value})} placeholder="Short description" rows={2}
                    style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.s2,color:C.text,fontSize:12,fontFamily:"inherit",marginBottom:10,boxSizing:"border-box",resize:"none"}}/>
                  <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:C.muted,marginBottom:16,cursor:"pointer"}}>
                    <input type="checkbox" checked={createForm.invite_only} onChange={e=>setCreateForm({...createForm,invite_only:e.target.checked})}/>
                    Invite only
                  </label>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setCreating(false)} style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                    <button onClick={createSyndicate} style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${C.indigo},${C.cyan})`,color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Create</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ═══ EXPLORE ═══ */}
      {tab==="explore"&&(
        <div style={{padding:"0 16px"}}>
          {publicSyndicates.length===0?(
            <div style={{textAlign:"center",padding:"40px 0",color:C.dim,fontSize:12}}>No public syndicates yet. Be the first to create one.</div>
          ):publicSyndicates.map((s:any)=>(
            <div key={s.id} style={{background:C.surface,borderRadius:14,padding:"14px",border:`1px solid ${C.border}`,marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:15,fontWeight:800}}>{s.avatar_emoji} {s.name}</div>
                  {s.description&&<div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.description}</div>}
                  <div style={{display:"flex",gap:8,marginTop:6,fontSize:9,color:C.dim}}>
                    <span>{s.member_count}/{s.max_members} members</span>
                    <span>{s.total_trades||0} trades</span>
                    <span style={{color:(s.total_pnl_eth||0)>=0?C.match:C.hot}}>{(s.total_pnl_eth||0)>=0?"+":""}{(s.total_pnl_eth||0).toFixed(4)} ETH</span>
                  </div>
                </div>
                {s.status!=="full"&&!mySyndicate&&(
                  <button onClick={()=>joinSyndicate(s.id)} style={{
                    padding:"8px 14px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",
                    background:`${C.indigo}15`,color:C.indigo,fontSize:11,fontWeight:700,
                  }}>Join</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ LEADERBOARD ═══ */}
      {tab==="leaderboard"&&(
        <div style={{padding:"0 16px"}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:12,textAlign:"center"}}>Weekly rankings — resets every Monday</div>
          {leaderboard.length===0?(
            <div style={{textAlign:"center",padding:"40px 0",color:C.dim,fontSize:12}}>No active syndicates yet.</div>
          ):leaderboard.map((s:any,i:number)=>{
            const medal=i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":"";
            return(
              <div key={s.id} style={{
                background:C.surface,borderRadius:12,padding:"12px 14px",border:`1px solid ${medal?medal+"33":C.border}`,
                marginBottom:6,display:"flex",alignItems:"center",gap:12,
              }}>
                <div style={{width:28,height:28,borderRadius:8,background:medal?`${medal}20`:C.s2,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:medal?14:12,fontWeight:800,color:medal||C.muted}}>{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:13,fontWeight:700}}>{s.avatar_emoji} {s.name}</span>
                    <div style={{display:"flex",gap:2}}>
                      {(s.members||[]).slice(0,5).map((m:any,j:number)=><StrategyDot key={j} s={m.trading_strategy} size={6}/>)}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,fontSize:9,color:C.dim,marginTop:3}}>
                    <span>{s.member_count} members</span>
                    <span>WR: {((s.win_rate||0)*100).toFixed(0)}%</span>
                    <span>{s.total_trades} trades</span>
                    {s.streak>0&&<span style={{color:C.match}}>Streak: +{s.streak}</span>}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:14,fontWeight:800,color:(s.weekly_pnl_eth||0)>=0?C.match:C.hot,fontFamily:"'JetBrains Mono',monospace"}}>
                    {(s.weekly_pnl_eth||0)>=0?"+":""}{(s.weekly_pnl_eth||0).toFixed(4)}
                  </div>
                  <div style={{fontSize:8,color:C.dim}}>ETH this week</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
