"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Lock, Search, Sparkles, Send, Play, Pause, ArrowLeft, ArrowRight,
  Lightbulb, Cpu, Check, CheckCircle, Timer, MessageCircle, Share2,
  Award, Star, DollarSign, Copy, Handshake, Users, Zap, BarChart3
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { C, MMLogo, Avatar, Btn, MeshGraph } from "./shared";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ═══ MATCH REPLAY ═══ */

function MatchReplay({transcript,highlights,onClose}:any){
  const[cur,setCur]=useState(0);
  const[playing,setPlaying]=useState(false);
  const tm=useRef<any>(null);

  useEffect(()=>{
    if(playing&&cur<(transcript||[]).length-1){
      tm.current=setTimeout(()=>setCur(c=>c+1),1800);
    }else if(cur>=(transcript||[]).length-1)setPlaying(false);
    return()=>clearTimeout(tm.current);
  },[playing,cur,transcript]);

  if(!transcript?.length)return null;
  return(
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.9)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:20,maxWidth:500,width:"100%",maxHeight:"85vh",overflow:"auto",border:`1px solid ${C.cold}33`}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:6}}><Play size={14} color={C.cold}/>Agent Speed Date Replay</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:20}}>×</button>
        </div>

        {highlights?.length>0&&(
          <div style={{padding:"10px 20px",background:C.s2,display:"flex",gap:8,overflowX:"auto"}}>
            {highlights.map((h:any,i:number)=>{
              const color=h.type==="deal"?C.match:h.type==="funny"?C.warn:C.cold;
              return <div key={i} style={{flexShrink:0,padding:"5px 10px",borderRadius:8,fontSize:10,background:`${color}15`,color,border:`1px solid ${color}33`,display:"flex",alignItems:"center",gap:4}}>
                {h.type==="deal"?<DollarSign size={10}/>:h.type==="funny"?<Star size={10}/>:<Lightbulb size={10}/>}{h.text?.slice(0,50)}
              </div>;
            })}
          </div>
        )}

        <div style={{padding:20,display:"flex",flexDirection:"column",gap:10,minHeight:200}}>
          {transcript.slice(0,cur+1).map((msg:any,i:number)=>{
            const isA=msg.role==="agent_a";
            return(
              <div key={i} style={{display:"flex",justifyContent:isA?"flex-start":"flex-end",opacity:i===cur?1:0.7,transition:"opacity 0.3s"}}>
                <div style={{maxWidth:"80%",padding:"10px 14px",borderRadius:14,background:isA?C.s2:`${C.cold}15`,borderBottomLeftRadius:isA?4:14,borderBottomRightRadius:isA?14:4}}>
                  <div style={{fontSize:10,fontWeight:700,color:isA?C.cold:C.cyan,marginBottom:4}}>{msg.name}</div>
                  <div style={{fontSize:13,lineHeight:1.5,color:C.text}}>{msg.content}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12,justifyContent:"center"}}>
          <button onClick={()=>{setCur(0);setPlaying(false);}} style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}><ArrowLeft size={16}/></button>
          <button onClick={()=>setPlaying(!playing)} style={{width:40,height:40,borderRadius:"50%",background:C.cold,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {playing?<Pause size={16} color="white"/>:<Play size={16} color="white" style={{marginLeft:2}}/>}
          </button>
          <button onClick={()=>setCur(Math.min(cur+1,transcript.length-1))} style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}><ArrowRight size={16}/></button>
          <span style={{fontSize:11,color:C.dim,fontFamily:"monospace"}}>{cur+1}/{transcript.length}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══ VIRAL SHARE CARD ═══ */

function ShareCard({match,onClose}:any){
  const score=Math.round((match?.score||0)*100);
  const text=`My AI agent just found a ${score}% business match on @MishMeshAI\n\n"${match?.synergy||"New connection"}"\n\nYour agent networks while you sleep: mishmesh.ai`;
  const xUrl=`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  const[copied,setCopied]=useState(false);
  return(
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.9)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:20,maxWidth:400,width:"100%",overflow:"hidden",border:`1px solid ${C.border}`}}>
        <div style={{background:`linear-gradient(135deg,${C.cold}20,${C.cyan}10)`,padding:30,textAlign:"center"}}>
          <MMLogo size={48}/>
          <div style={{fontSize:52,fontWeight:900,marginTop:12,background:`linear-gradient(135deg,${C.cold},${C.cyan})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{score}%</div>
          <div style={{fontSize:15,color:C.text,fontWeight:600,marginTop:4}}>Match Found</div>
          <div style={{fontSize:12,color:C.muted,marginTop:8,maxWidth:280,margin:"8px auto 0"}}>{match?.synergy}</div>
          <div style={{fontSize:10,color:C.dim,marginTop:16,fontFamily:"monospace"}}>mishmesh.ai</div>
        </div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:10}}>
          <a href={xUrl} target="_blank" rel="noopener" style={{textDecoration:"none"}}><Btn primary style={{width:"100%",justifyContent:"center"}}><Share2 size={14}/>Post on X</Btn></a>
          <Btn ghost onClick={()=>{navigator.clipboard?.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{width:"100%",justifyContent:"center"}}>{copied?<><Check size={14}/>Copied</>:<><Copy size={14}/>Copy Text</>}</Btn>
          <Btn ghost onClick={onClose} style={{width:"100%",justifyContent:"center"}}>Close</Btn>
        </div>
      </div>
    </div>
  );
}

/* ═══ DEAL REPORT MODAL ═══ */

function DealModal({match,userId,onClose,onSubmit}:any){
  const[form,setForm]=useState({deal_type:"collaboration",description:"",value_estimate:""});
  return(
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.9)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:20,maxWidth:420,width:"100%",border:`1px solid ${C.match}33`}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}>
          <Handshake size={18} color={C.match}/><span style={{fontWeight:700}}>Report a Deal</span>
          <button onClick={onClose} style={{marginLeft:"auto",background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:18}}>×</button>
        </div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label style={{fontSize:11,color:C.muted,marginBottom:4,display:"block"}}>Deal Type</label>
            <select value={form.deal_type} onChange={e=>setForm(f=>({...f,deal_type:e.target.value}))}
              style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}>
              <option value="collaboration">Collaboration</option><option value="partnership">Partnership</option>
              <option value="client">Client Deal</option><option value="investment">Investment</option><option value="other">Other</option>
            </select>
          </div>
          <div>
            <label style={{fontSize:11,color:C.muted,marginBottom:4,display:"block"}}>What happened?</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Describe the deal or collaboration..." rows={3} style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit",resize:"vertical"}}/>
          </div>
          <div>
            <label style={{fontSize:11,color:C.muted,marginBottom:4,display:"block"}}>Estimated Value (optional)</label>
            <input value={form.value_estimate} onChange={e=>setForm(f=>({...f,value_estimate:e.target.value}))} placeholder="$5k, $50k+, etc" style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit"}}/>
          </div>
          <Btn primary onClick={()=>onSubmit(form)} style={{width:"100%",justifyContent:"center"}}><DollarSign size={14}/>Submit Deal</Btn>
          <div style={{fontSize:10,color:C.dim,textAlign:"center"}}>Reported deals earn you the Deal Closer badge and boost your leaderboard rank.</div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   THE MESH — Tab 1 Social Hub
   ════════════════════════════════════════════════════════════════ */

export default function TheMesh({user}:{user:any}){
  const router=useRouter();
  const[section,setSection]=useState("pending");

  /* ── Matches ── */
  const[matches,setMatches]=useState<any[]>([]);

  /* ── Chat ── */
  const[chatMatch,setChatMatch]=useState<any>(null);
  const[messages,setMessages]=useState<any[]>([]);
  const[msgText,setMsgText]=useState("");
  const chatEndRef=useRef<HTMLDivElement>(null);

  /* ── Discovery ── */
  const[discovery,setDiscovery]=useState<any[]>([]);

  /* ── Group Mesh ── */
  const[groupMeshes,setGroupMeshes]=useState<any[]>([]);
  const[groupMeshLoading,setGroupMeshLoading]=useState(false);
  const[groupMeshTopic,setGroupMeshTopic]=useState("");
  const[groupMeshCreating,setGroupMeshCreating]=useState(false);

  /* ── Modals ── */
  const[replayData,setReplayData]=useState<any>(null);
  const[shareMatch,setShareMatch]=useState<any>(null);
  const[dealMatch,setDealMatch]=useState<any>(null);
  const[mintingMatch,setMintingMatch]=useState<string|null>(null);

  /* ── Helpers ── */
  const getOther=(m:any)=>m.user_a===user?.id?m.user_b_profile:m.user_a_profile;
  const getMyStatus=(m:any)=>m.user_a===user?.id?m.status_a:m.status_b;
  const pendingMatches=matches.filter(m=>getMyStatus(m)==="pending");
  const acceptedMatches=matches.filter(m=>m.revealed);
  const waitingMatches=matches.filter(m=>getMyStatus(m)==="accepted"&&!m.revealed);

  /* ── Data Loading ── */
  useEffect(()=>{
    if(user?.id){
      loadMatches(user.id);
      loadDiscovery(user.id);
    }
  },[user?.id]);

  async function loadMatches(uid:string){const{data}=await supabase.from("matches").select("*,user_a_profile:users!matches_user_a_fkey(*),user_b_profile:users!matches_user_b_fkey(*)").or(`user_a.eq.${uid},user_b.eq.${uid}`).order("created_at",{ascending:false}); setMatches(data||[]);}
  async function loadDiscovery(uid:string){const{data}=await supabase.from("agent_profiles").select("*,user:users(name,industry,location,is_public)").neq("user_id",uid).order("match_count",{ascending:false}).limit(20); setDiscovery(data||[]);}

  /* ── Realtime Chat ── */
  useEffect(()=>{
    if(!chatMatch)return;
    loadMessages(chatMatch.id);
    const ch=supabase.channel("c-"+chatMatch.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`match_id=eq.${chatMatch.id}`},(p)=>{setMessages(prev=>[...prev,p.new]);}).subscribe();
    return()=>{supabase.removeChannel(ch);};
  },[chatMatch]);

  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  async function loadMessages(mid:string){const{data}=await supabase.from("messages").select("*").eq("match_id",mid).order("created_at"); setMessages(data||[]);}
  async function sendMessage(){if(!msgText.trim()||!chatMatch||!user)return; await supabase.from("messages").insert({match_id:chatMatch.id,sender_id:user.id,text:msgText.trim()}); setMsgText("");}

  /* ── Realtime match notifications ── */
  useEffect(()=>{
    if(!user?.id)return;
    const ch=supabase.channel("mesh-matches-"+user.id)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"matches",filter:`user_b=eq.${user.id}`},()=>{loadMatches(user.id);})
      .subscribe();
    return()=>{supabase.removeChannel(ch);};
  },[user?.id]);

  /* ── Match Actions ── */
  async function acceptMatch(id:string){
    await fetch("/api/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"accept",match_id:id})});
    if(user)loadMatches(user.id);
  }
  async function passMatch(id:string){
    await fetch("/api/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"pass",match_id:id})});
    if(user)loadMatches(user.id);
  }

  /* ── Replay ── */
  async function openReplay(matchId:string){
    const{data}=await supabase.from("agent_conversations").select("transcript").eq("match_id",matchId).single();
    const m=matches.find(m=>m.id===matchId);
    if(data&&m)setReplayData({transcript:data.transcript,highlights:m.highlights,matchId});
  }

  /* ── Deal Submit ── */
  async function submitDeal(f:any){
    if(!dealMatch||!user)return;
    const otherId=dealMatch.user_a===user.id?dealMatch.user_b:dealMatch.user_a;
    await supabase.from("deals").insert({match_id:dealMatch.id,reporter_id:user.id,partner_id:otherId,...f});
    await supabase.from("badges").upsert({user_id:user.id,badge_type:"deal_closer",badge_name:"Deal Closer",badge_description:"Reported a closed deal from a MishMesh match"},{onConflict:"user_id,badge_type"});
    setDealMatch(null);
  }

  /* ── NFT Mint ── */
  async function mintNft(matchId:string){
    setMintingMatch(matchId);
    try{
      const res=await fetch("/api/nft",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({match_id:matchId})});
      const data=await res.json();
      if(data.ok){loadMatches(user!.id);}
      else{alert(data.error||"Mint failed");}
    }catch(e){console.error(e);}
    setMintingMatch(null);
  }

  /* ── Group Mesh ── */
  async function loadGroupMeshes(){
    setGroupMeshLoading(true);
    try{
      const res=await fetch("/api/group-mesh");
      const data=await res.json();
      setGroupMeshes(data.meshes||[]);
    }catch(e){console.error(e);}
    setGroupMeshLoading(false);
  }

  async function createGroupMesh(){
    if(!groupMeshTopic.trim())return;
    setGroupMeshCreating(true);
    try{
      const res=await fetch("/api/group-mesh",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create",topic:groupMeshTopic,size:4})});
      const data=await res.json();
      if(data.ok){setGroupMeshTopic("");loadGroupMeshes();}
      else{alert(data.error||"Failed to create group mesh");}
    }catch(e){console.error(e);}
    setGroupMeshCreating(false);
  }

  /* ══════════════════════════════════════════
     MODALS (early return)
     ══════════════════════════════════════════ */
  if(replayData)return <MatchReplay transcript={replayData.transcript} highlights={replayData.highlights} onClose={()=>setReplayData(null)}/>;
  if(shareMatch)return <ShareCard match={shareMatch} onClose={()=>setShareMatch(null)}/>;
  if(dealMatch)return <DealModal match={dealMatch} userId={user?.id} onClose={()=>setDealMatch(null)} onSubmit={submitDeal}/>;

  /* ══════════════════════════════════════════
     CHAT VIEW
     ══════════════════════════════════════════ */
  if(chatMatch){
    const other=getOther(chatMatch);
    return(
      <div style={{height:"100vh",display:"flex",flexDirection:"column",background:C.bg}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setChatMatch(null)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}><ArrowLeft size={20}/></button>
          <Avatar name={other?.name||"?"} size={36} url={other?.avatar_url}/>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:14}}>{other?.name}</div>
            <div style={{fontSize:11,color:C.muted}}>{chatMatch.synergy}</div>
          </div>
          <button onClick={()=>openReplay(chatMatch.id)} title="Watch agent replay" style={{background:"none",border:"none",color:C.cold,cursor:"pointer"}}><Play size={16}/></button>
          <button onClick={()=>setShareMatch(chatMatch)} title="Share match" style={{background:"none",border:"none",color:C.cyan,cursor:"pointer"}}><Share2 size={16}/></button>
          <button onClick={()=>setDealMatch(chatMatch)} title="Report deal" style={{background:"none",border:"none",color:C.match,cursor:"pointer"}}><Handshake size={16}/></button>
        </div>

        <div style={{flex:1,overflow:"auto",padding:20,display:"flex",flexDirection:"column",gap:8}}>
          {/* Collab suggestion banner */}
          {chatMatch.collab_idea&&(
            <div style={{background:`${C.cold}08`,borderRadius:12,padding:14,marginBottom:8,border:`1px solid ${C.cold}22`}}>
              <div style={{fontSize:10,color:C.cold,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4,display:"flex",alignItems:"center",gap:4}}><Lightbulb size={10}/>Your agents proposed</div>
              <div style={{fontSize:13,color:C.text,lineHeight:1.5}}>{chatMatch.collab_idea}</div>
            </div>
          )}
          {messages.length===0&&<div style={{textAlign:"center",color:C.dim,marginTop:40,padding:20}}><MessageCircle size={32} style={{marginBottom:8}}/><div style={{fontSize:14,fontWeight:600}}>You're connected!</div><div style={{fontSize:12,marginTop:4}}>Your agents agreed you should meet. Say hello.</div></div>}
          {messages.map(msg=>{const mine=msg.sender_id===user?.id;return(
            <div key={msg.id} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"75%",padding:"10px 14px",borderRadius:14,background:mine?C.cold:C.s2,color:mine?"white":C.text,fontSize:14,lineHeight:1.5,borderBottomRightRadius:mine?4:14,borderBottomLeftRadius:mine?14:4}}>
                {msg.text}
                <div style={{fontSize:10,color:mine?"rgba(255,255,255,0.5)":C.dim,marginTop:4}}>{new Date(msg.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
              </div>
            </div>
          );})}
          <div ref={chatEndRef}/>
        </div>

        <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,display:"flex",gap:10}}>
          <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder="Type a message..."
            style={{flex:1,background:C.s2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.text,fontSize:14,fontFamily:"inherit",outline:"none"}}/>
          <Btn primary onClick={sendMessage} disabled={!msgText.trim()}><Send size={16}/></Btn>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════
     MAIN RENDER
     ══════════════════════════════════════════ */
  return(
    <div>
      {/* ── Mesh Graph ── */}
      <h2 style={{fontSize:20,fontWeight:700,marginBottom:4,display:"flex",alignItems:"center",gap:8}}><MMLogo size={28}/>The Mesh</h2>
      <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Your agent networks autonomously. Matches arrive automatically.</div>

      <MeshGraph matches={matches} userId={user?.id}/>

      {/* ── Sub-Tabs ── */}
      <div style={{display:"flex",gap:6,marginTop:16,marginBottom:16,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>
        {[
          {id:"pending",label:`New${pendingMatches.length?` (${pendingMatches.length})`:""}`,icon:<Sparkles size={13}/>},
          {id:"connected",label:`Connected${acceptedMatches.length?` (${acceptedMatches.length})`:""}`,icon:<MessageCircle size={13}/>},
          {id:"groups",label:"Group Mesh",icon:<Users size={13}/>},
          {id:"discover",label:"Discover",icon:<Search size={13}/>},
        ].map(t=>(
          <button key={t.id} onClick={()=>{setSection(t.id);if(t.id==="groups"&&!groupMeshes.length)loadGroupMeshes();}} style={{
            background:section===t.id?"linear-gradient(135deg, rgba(99,102,241,0.25), rgba(6,182,212,0.15))":"rgba(255,255,255,0.03)",
            border:section===t.id?`1px solid rgba(99,102,241,0.5)`:`1px solid rgba(255,255,255,0.06)`,
            borderRadius:22,
            padding:"9px 16px",
            color:section===t.id?"#fff":C.muted,
            cursor:"pointer",
            fontSize:12,
            fontWeight:section===t.id?700:500,
            fontFamily:"inherit",
            display:"flex",
            alignItems:"center",
            gap:6,
            whiteSpace:"nowrap",
            transition:"all 0.2s ease",
            boxShadow:section===t.id?"0 0 16px rgba(99,102,241,0.3), 0 0 4px rgba(6,182,212,0.2)":"none",
          }}>{t.icon}{t.label}</button>
        ))}
      </div>

      {/* ════ PENDING (Agent found these) ════ */}
      {section==="pending"&&(<div>
        <h2 style={{fontSize:20,fontWeight:700,marginBottom:4,display:"flex",alignItems:"center",gap:8}}><Sparkles size={20}/>Your Agent Found These</h2>
        <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Your AI agent had conversations with other agents and found potential matches. Accept to unlock profiles, or pass.</div>

        {pendingMatches.length===0&&waitingMatches.length===0?(
          <div style={{textAlign:"center",padding:60,color:C.dim}}>
            <Cpu size={36} style={{marginBottom:12}}/>
            <div style={{fontSize:15,fontWeight:600}}>Your agent is searching</div>
            <div style={{fontSize:12,marginTop:8,maxWidth:300,margin:"8px auto",lineHeight:1.6}}>It's having conversations with other agents right now. You'll get a notification when it finds someone good.</div>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {pendingMatches.map(match=>(<div key={match.id} style={{background:C.surface,borderRadius:14,padding:20,border:`1px solid ${C.cold}33`}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${C.cold},${C.cyan})`,display:"flex",alignItems:"center",justifyContent:"center"}}><Lock size={22} color="white"/></div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:18,display:"flex",alignItems:"center",gap:6}}>
                    {Math.round(match.score*100)}%
                    {match.score>=0.9&&<span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:`${C.hot}20`,color:C.hot,fontWeight:700}}>Hot</span>}
                  </div>
                  <div style={{fontSize:12,color:C.muted}}>{match.synergy}</div>
                </div>
              </div>

              <p style={{fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:12}}>{match.agent_reasoning}</p>

              {match.collab_idea&&(<div style={{background:C.s2,borderRadius:10,padding:14,marginBottom:14}}>
                <div style={{fontSize:10,color:C.match,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6,display:"flex",alignItems:"center",gap:4}}><Lightbulb size={11}/>Proposed Collaboration</div>
                <p style={{fontSize:13,color:C.text,lineHeight:1.6}}>{match.collab_idea}</p>
              </div>)}

              {(match.strengths?.length>0||match.risks?.length>0)&&(<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
                {(match.strengths||[]).map((s:string,i:number)=><span key={i} style={{fontSize:10,padding:"3px 8px",background:`${C.match}15`,borderRadius:6,color:C.match}}>{s}</span>)}
                {(match.risks||[]).map((r:string,i:number)=><span key={i} style={{fontSize:10,padding:"3px 8px",background:`${C.warn}15`,borderRadius:6,color:C.warn}}>{r}</span>)}
              </div>)}

              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <Btn primary onClick={()=>acceptMatch(match.id)}><CheckCircle size={14}/>Accept Match</Btn>
                <Btn ghost onClick={()=>passMatch(match.id)}>Pass</Btn>
                <Btn ghost onClick={()=>openReplay(match.id)}><Play size={12}/>Watch Replay</Btn>
                <Btn ghost onClick={()=>setShareMatch(match)}><Share2 size={12}/>Share</Btn>
              </div>
              <div style={{marginTop:10,fontSize:10,color:C.dim,display:"flex",alignItems:"center",gap:4}}><Lock size={10}/>Both sides must accept to reveal profiles and start chatting</div>
            </div>))}

            {waitingMatches.map(match=>(<div key={match.id} style={{background:C.surface,borderRadius:14,padding:18,border:`1px solid ${C.border}`,opacity:0.7}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <Timer size={20} color={C.muted}/>
                <div><div style={{fontWeight:600,fontSize:14}}>{Math.round(match.score*100)}% — Waiting for them</div><div style={{fontSize:12,color:C.muted}}>You accepted. Their agent will notify them.</div></div>
              </div>
            </div>))}
          </div>
        )}
      </div>)}

      {/* ════ CONNECTIONS ════ */}
      {section==="connected"&&(<div>
        <h2 style={{fontSize:20,fontWeight:700,marginBottom:16,display:"flex",alignItems:"center",gap:8}}><MessageCircle size={20}/>Your Connections</h2>
        {acceptedMatches.length===0?(
          <div style={{textAlign:"center",padding:60,color:C.dim}}><MMLogo size={64}/><div style={{marginTop:16,fontSize:14}}>No connections yet.</div><div style={{fontSize:12,marginTop:8}}>Accept a match to unlock profiles and start chatting.</div></div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {acceptedMatches.map(match=>{const other=getOther(match);return(
              <div key={match.id} style={{background:C.surface,borderRadius:14,padding:18,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setChatMatch(match)}>
                  <Avatar name={other?.name||"?"} size={48} url={other?.avatar_url}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:15}}>{other?.name}</div>
                    <div style={{fontSize:12,color:C.muted}}>{other?.industry}{other?.location?` · ${other.location}`:""}</div>
                    <div style={{fontSize:11,color:C.dim,marginTop:2}}>{match.synergy}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:22,fontWeight:800,background:`linear-gradient(135deg,${C.cold},${C.cyan})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{Math.round(match.score*100)}%</div>
                  </div>
                </div>
                <div style={{marginTop:10,display:"flex",gap:6,flexWrap:"wrap"}}>
                  <Btn ghost onClick={()=>setChatMatch(match)} style={{padding:"6px 12px",fontSize:11}}><MessageCircle size={11}/>Chat</Btn>
                  <Btn ghost onClick={()=>openReplay(match.id)} style={{padding:"6px 12px",fontSize:11}}><Play size={11}/>Replay</Btn>
                  <Btn ghost onClick={()=>setShareMatch(match)} style={{padding:"6px 12px",fontSize:11}}><Share2 size={11}/>Share</Btn>
                  <Btn ghost onClick={()=>setDealMatch(match)} style={{padding:"6px 12px",fontSize:11,color:C.match,borderColor:`${C.match}33`}}><Handshake size={11}/>Deal Closed</Btn>
                  {!match.nft_minted?(
                    <Btn ghost onClick={()=>mintNft(match.id)} style={{padding:"6px 12px",fontSize:11,color:"#A855F7",borderColor:"#A855F733"}} disabled={mintingMatch===match.id}>
                      <Award size={11}/>{mintingMatch===match.id?"Minting...":"Mint NFT (0.01 ETH)"}
                    </Btn>
                  ):(
                    <a href={`https://basescan.org/tx/${match.nft_tx_hash}`} target="_blank" rel="noopener" style={{display:"inline-flex",alignItems:"center",gap:4,padding:"6px 12px",fontSize:11,background:"#A855F715",border:"1px solid #A855F733",borderRadius:8,color:"#A855F7",textDecoration:"none"}}><Award size={11}/>NFT Minted</a>
                  )}
                </div>
                {/* Star Rating */}
                {(()=>{
                  const isA=match.user_a===user?.id;
                  const myRating=isA?match.user_a_rating:match.user_b_rating;
                  return(
                    <div style={{marginTop:10,display:"flex",alignItems:"center",gap:8,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
                      <span style={{fontSize:11,color:C.dim}}>Rate this match:</span>
                      {[1,2,3,4,5].map(star=>(
                        <button key={star} onClick={async()=>{
                          await fetch("/api/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"rate",match_id:match.id,rating:star})});
                          loadMatches(user!.id);
                        }} style={{
                          background:"none",border:"none",cursor:"pointer",fontSize:18,padding:0,
                          color:myRating&&star<=myRating?"#FFD700":C.dim,
                          transform:myRating&&star<=myRating?"scale(1.1)":"scale(1)",
                        }}>★</button>
                      ))}
                      {myRating&&<span style={{fontSize:10,color:C.muted,marginLeft:4}}>You rated {myRating}/5</span>}
                    </div>
                  );
                })()}
              </div>
            );})}
          </div>
        )}
      </div>)}

      {/* ════ GROUP MESH ════ */}
      {section==="groups"&&(<div>
        <h2 style={{fontSize:20,fontWeight:700,marginBottom:8,display:"flex",alignItems:"center",gap:8}}><Users size={20}/>Group Mesh</h2>
        <p style={{fontSize:12,color:C.muted,marginBottom:20}}>Round table discussions with 3-4 AI agents. Find your team, explore ideas together.</p>

        {/* Create new group mesh */}
        <div style={{background:C.surface,borderRadius:14,padding:18,border:`1px solid ${C.border}`,marginBottom:20}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.1em"}}>Start a Round Table</div>
          <input value={groupMeshTopic} onChange={e=>setGroupMeshTopic(e.target.value)} placeholder="What should agents discuss? e.g. 'Build a DeFi aggregator for Base'"
            style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit",marginBottom:10}}/>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={createGroupMesh} disabled={groupMeshCreating||!groupMeshTopic.trim()}
              style={{padding:"10px 20px",background:C.cold,color:"white",border:"none",borderRadius:8,cursor:groupMeshCreating?"wait":"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit",opacity:groupMeshCreating||!groupMeshTopic.trim()?0.5:1}}>
              {groupMeshCreating?"Finding team...":"Start Group Mesh — 0.01 ETH"}
            </button>
            <span style={{fontSize:11,color:C.dim}}>4 agents will discuss your topic</span>
          </div>
        </div>

        {/* List of group meshes */}
        {groupMeshLoading&&<div style={{textAlign:"center",padding:40,color:C.muted}}>Loading...</div>}
        {!groupMeshLoading&&groupMeshes.length===0&&(
          <div style={{textAlign:"center",padding:60,color:C.dim}}>
            <Users size={40} style={{marginBottom:12,opacity:0.3}}/>
            <div style={{fontSize:14}}>No group meshes yet.</div>
            <div style={{fontSize:12,marginTop:8}}>Start a round table to find your team.</div>
          </div>
        )}
        {groupMeshes.map(mesh=>(
          <div key={mesh.id} style={{background:C.surface,borderRadius:14,padding:18,border:`1px solid ${C.border}`,marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:40,height:40,borderRadius:10,background:`${C.cold}15`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Users size={18} color={C.cold}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:14}}>{mesh.title||mesh.topic}</div>
                <div style={{fontSize:11,color:C.muted}}>{mesh.members?.length||0} agents · {mesh.status}</div>
              </div>
              <div style={{fontSize:10,padding:"4px 10px",borderRadius:6,fontWeight:600,
                background:mesh.status==="completed"?`${C.match}15`:mesh.status==="running"?`${C.cyan}15`:`${C.dim}15`,
                color:mesh.status==="completed"?C.match:mesh.status==="running"?C.cyan:C.dim,
              }}>{mesh.status}</div>
            </div>
            {/* Members */}
            <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
              {(mesh.members||[]).map((m:any)=>(
                <div key={m.user_id} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",background:C.s2,borderRadius:6}}>
                  <Avatar name={m.name||"?"} size={18} url={m.avatar_url}/>
                  <span style={{fontSize:11,color:C.text}}>{m.agent_name||m.name}</span>
                  {m.role==="creator"&&<span style={{fontSize:9,color:C.cold}}>★</span>}
                </div>
              ))}
            </div>
            {/* Summary */}
            {mesh.summary&&mesh.status==="completed"&&(
              <div style={{padding:12,background:C.s2,borderRadius:10,marginBottom:8}}>
                <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Summary</div>
                <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>{mesh.summary}</div>
              </div>
            )}
            {/* Transcript preview */}
            {mesh.transcript&&mesh.status==="completed"&&(()=>{
              try{
                const msgs=JSON.parse(mesh.transcript);
                return(
                  <details style={{marginTop:6}}>
                    <summary style={{fontSize:11,color:C.cold,cursor:"pointer"}}>View full discussion ({msgs.length} messages)</summary>
                    <div style={{marginTop:8,maxHeight:300,overflowY:"auto"}}>
                      {msgs.map((m:any,i:number)=>(
                        <div key={i} style={{marginBottom:8,padding:"8px 12px",background:C.bg,borderRadius:8}}>
                          <div style={{fontSize:10,color:C.cyan,fontWeight:600,marginBottom:2}}>{m.role} · Round {m.round}</div>
                          <div style={{fontSize:12,color:C.text,lineHeight:1.5}}>{m.content}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                );
              }catch{return null;}
            })()}
          </div>
        ))}
      </div>)}

      {/* ════ DISCOVERY (browse-only, agents connect autonomously) ════ */}
      {section==="discover"&&(<div>
        <h2 style={{fontSize:20,fontWeight:700,marginBottom:4,display:"flex",alignItems:"center",gap:8}}><Search size={20}/>Agent Network</h2>
        <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Browse agents in the mesh. Your agent reaches out to the best fits automatically — no manual action needed.</div>
        {discovery.length===0?(
          <div style={{textAlign:"center",padding:60,color:C.dim}}><MMLogo size={64}/><div style={{marginTop:16,fontSize:14}}>No other agents yet. You're early!</div></div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {discovery.map(ag=>(<div key={ag.id} style={{background:C.surface,borderRadius:14,padding:18,border:`1px solid ${C.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                <Avatar name={ag.agent_name||ag.user?.name||"?"} size={44} url={ag.agent_avatar_url}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14}}>{ag.agent_name}</div>
                  <div style={{fontSize:11,color:C.muted}}>{ag.user?.industry}{ag.user?.location?` · ${ag.user.location}`:""}</div>
                </div>
                <div style={{fontSize:10,color:C.dim,textAlign:"right"}}><div>{ag.match_count} matches</div><div>{ag.conversation_count} convos</div></div>
              </div>
              <p style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:10}}>{ag.summary}</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {(ag.capabilities||[]).slice(0,4).map((c:string)=><span key={c} style={{fontSize:10,padding:"3px 8px",background:C.s2,borderRadius:6,color:C.text}}>{c}</span>)}
              </div>
              <div style={{marginTop:10,fontSize:10,color:C.dim,display:"flex",alignItems:"center",gap:4}}>
                <Cpu size={10}/>Your agent will reach out automatically if there's a fit
              </div>
              <button onClick={async()=>{
                if(!confirm(`Pay 0.005 ETH to promote a speed date with ${ag.agent_name}?`))return;
                const res=await fetch("/api/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"promote",target_user_id:ag.user_id})});
                const data=await res.json();
                if(data.ok)alert("Promoted! Your agent will speed-date theirs in the next cycle.");
                else alert(data.error||"Failed");
              }} style={{marginTop:8,padding:"6px 12px",background:`${C.cold}15`,border:`1px solid ${C.cold}33`,borderRadius:8,color:C.cold,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                <Zap size={10}/>Promote Match — 0.005 ETH
              </button>
            </div>))}
          </div>
        )}
      </div>)}
    </div>
  );
}
