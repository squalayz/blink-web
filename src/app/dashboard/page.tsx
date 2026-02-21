"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, Search, Sparkles, User, Lock, Globe, Mail, Send, MapPin, Shield, Settings,
  Lightbulb, Cpu, Clipboard, Check, CheckCircle, AlertTriangle, ArrowLeft,
  ArrowRight, FileText, Camera, Trophy, Flame, TrendingUp, Timer, Bell,
  LogOut, MessageCircle, Share2, Award, Target, BarChart3, Crown, Star,
  Play, Pause, ExternalLink, DollarSign, Copy, Heart, Handshake, ChevronDown, Key, Users
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ═══ THEME ═══ */
const C = {
  hot:"#FF2D55", cold:"#6366f1", match:"#30D158", warn:"#FF9F0A",
  cyan:"#06b6d4", purple:"#a855f7", pink:"#ec4899",
  bg:"#0a0a0f", surface:"#111118", s2:"#1a1a24", s3:"#222233",
  text:"#f0f0f5", muted:"#6b6b80", dim:"#3a3a4a",
  border:"rgba(255,255,255,0.07)",
};

/* ═══ SMALL COMPONENTS ═══ */

function MMLogo({size=44}:{size?:number}){
  const h=size*0.5;
  return(
    <svg width={size} height={h} viewBox="0 0 120 60" style={{display:"inline-block",verticalAlign:"middle"}}>
      <defs>
        <linearGradient id="lgL" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#7C3AED"/><stop offset="100%" stopColor="#6366F1"/></linearGradient>
        <linearGradient id="lgR" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#06B6D4"/><stop offset="100%" stopColor="#22D3EE"/></linearGradient>
        <linearGradient id="lgM" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366F1"/><stop offset="100%" stopColor="#06B6D4"/></linearGradient>
      </defs>
      <circle cx="35" cy="30" r="24" fill="none" stroke="url(#lgL)" strokeWidth="5"/>
      <circle cx="65" cy="30" r="24" fill="none" stroke="url(#lgR)" strokeWidth="5"/>
      <path d="M50 10.4 A24 24 0 0 1 50 49.6 A24 24 0 0 1 50 10.4" fill="url(#lgM)" opacity="0.3"/>
      <circle cx="28" cy="30" r="5" fill="url(#lgL)"/><circle cx="72" cy="30" r="5" fill="url(#lgR)"/>
    </svg>
  );
}

function Avatar({name,size=40,url}:{name:string;size?:number;url?:string|null}){
  const pals=[["#6366f1","#818cf8"],["#06b6d4","#22d3ee"],["#a855f7","#c084fc"],["#ec4899","#f472b6"],["#f59e0b","#fbbf24"],["#10b981","#34d399"]];
  const i=Math.abs((name||"A").split("").reduce((a,c)=>a+c.charCodeAt(0),0))%pals.length;
  const init=(name||"?").split(/[\s\-_]+/).map(w=>w[0]).join("").toUpperCase().slice(0,2);
  if(url) return <img src={url} alt={name} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.border}`}}/>;
  return <div style={{width:size,height:size,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg,${pals[i][0]},${pals[i][1]})`,fontSize:size*0.38,fontWeight:700,color:"white",border:`2px solid ${C.border}`}}>{init}</div>;
}

function Btn({children,primary,danger,ghost,disabled,onClick,style:sx,...rest}:any){
  const base:React.CSSProperties={padding:"10px 20px",borderRadius:10,fontSize:13,fontWeight:600,border:"none",cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",transition:"all 0.2s",display:"inline-flex",alignItems:"center",gap:6,opacity:disabled?0.4:1};
  if(primary)Object.assign(base,{background:C.cold,color:"white"});
  else if(danger)Object.assign(base,{background:"#ff2d5520",color:C.hot,border:`1px solid ${C.hot}33`});
  else if(ghost)Object.assign(base,{background:"transparent",color:C.muted,border:`1px solid ${C.border}`});
  else Object.assign(base,{background:C.s2,color:C.text,border:`1px solid ${C.border}`});
  return <button style={{...base,...sx}} disabled={disabled} onClick={onClick} {...rest}>{children}</button>;
}

function BadgeChip({name,type}:{name:string;type:string}){
  const icons:Record<string,any>={streak_7:Crown,streak_30:Star,first_match:Sparkles,deal_closer:DollarSign,speed_demon:Zap,healthtech_collab:Heart,top_builder:Trophy};
  const Ic=icons[type]||Award;
  return <div style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",background:`${C.cold}15`,border:`1px solid ${C.cold}33`,borderRadius:20,fontSize:11,color:C.cold,fontWeight:600}}><Ic size={12}/>{name}</div>;
}

function TierBadge({tier}:{tier:string}){
  if(tier==="free")return null;
  const color=tier==="pro"?C.cold:C.purple;
  return <span style={{fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:4,background:color,color:"white",textTransform:"uppercase",letterSpacing:"0.05em"}}>{tier}</span>;
}

/* ═══ MESH GRAPH (Canvas 2D — animated network visualization) ═══ */

function MeshGraph({matches,userId}:{matches:any[];userId:string}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const cv=ref.current; if(!cv)return;
    const ctx=cv.getContext("2d"); if(!ctx)return;
    const dpr=2;
    const W=cv.offsetWidth, H=cv.offsetHeight;
    cv.width=W*dpr; cv.height=H*dpr; ctx.scale(dpr,dpr);

    type N={x:number;y:number;vx:number;vy:number;color:string;label:string;r:number};
    const nodes:N[]=[]; const edges:[number,number,number][]=[];
    const seen=new Map<string,number>();

    seen.set(userId,0);
    nodes.push({x:W/2,y:H/2,vx:0,vy:0,color:C.cold,label:"You",r:10});

    matches.forEach(m=>{
      const oid=m.user_a===userId?m.user_b:m.user_a;
      const o=m.user_a===userId?m.user_b_profile:m.user_a_profile;
      if(!seen.has(oid)){
        seen.set(oid,nodes.length);
        const a=Math.random()*Math.PI*2, rad=50+Math.random()*70;
        nodes.push({x:W/2+Math.cos(a)*rad,y:H/2+Math.sin(a)*rad,vx:(Math.random()-0.5)*0.2,vy:(Math.random()-0.5)*0.2,color:m.revealed?C.match:C.cyan,label:o?.name?.split(" ")[0]||"?",r:5});
      }
      edges.push([0,seen.get(oid)!,m.score]);
    });

    // Add ambient particles
    const particles:N[]=Array.from({length:15},()=>({
      x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-0.5)*0.4,vy:(Math.random()-0.5)*0.4,
      color:Math.random()>0.5?C.cold:C.cyan,label:"",r:1.5
    }));

    let t=0, raf:number;
    function draw(){
      t+=0.008; ctx!.clearRect(0,0,W,H);

      // Draw mesh grid
      ctx!.strokeStyle=`${C.dim}15`; ctx!.lineWidth=0.5;
      for(let x=0;x<W;x+=30){ctx!.beginPath();ctx!.moveTo(x,0);ctx!.lineTo(x,H);ctx!.stroke();}
      for(let y=0;y<H;y+=30){ctx!.beginPath();ctx!.moveTo(0,y);ctx!.lineTo(W,y);ctx!.stroke();}

      // Drift particles
      particles.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>W)p.vx*=-1;
        if(p.y<0||p.y>H)p.vy*=-1;
        ctx!.beginPath(); ctx!.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx!.fillStyle=p.color+"30"; ctx!.fill();
      });

      // Drift all nodes (including "You")
      nodes.forEach((n,i)=>{
        if(i===0){
          // "You" orb: gentle floating orbit around center
          n.x=W/2+Math.sin(t*0.5)*12+Math.sin(t*0.8+2)*6;
          n.y=H/2+Math.cos(t*0.4)*10+Math.cos(t*0.7+1)*5;
          n.r=10+Math.sin(t*1.5)*0.8; // subtle pulse
        }else{
          n.x+=n.vx+Math.sin(t+i)*0.15;
          n.y+=n.vy+Math.cos(t+i*1.3)*0.15;
          if(n.x<30||n.x>W-30)n.vx*=-1;
          if(n.y<30||n.y>H-30)n.vy*=-1;
        }
      });

      // Edges
      edges.forEach(([f,to,sc])=>{
        const a=nodes[f],b=nodes[to];
        ctx!.beginPath(); ctx!.moveTo(a.x,a.y); ctx!.lineTo(b.x,b.y);
        const pulse=0.15+Math.sin(t*2+f+to)*0.1;
        ctx!.strokeStyle=`rgba(99,102,241,${sc*0.25+pulse})`; ctx!.lineWidth=sc*2.5; ctx!.stroke();
      });

      // Nodes
      nodes.forEach(n=>{
        // Glow
        const g=ctx!.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r*3);
        g.addColorStop(0,n.color+"50"); g.addColorStop(1,"transparent");
        ctx!.beginPath(); ctx!.arc(n.x,n.y,n.r*3,0,Math.PI*2); ctx!.fillStyle=g; ctx!.fill();
        // Core
        ctx!.beginPath(); ctx!.arc(n.x,n.y,n.r,0,Math.PI*2); ctx!.fillStyle=n.color; ctx!.fill();
        // Label
        if(n.label){ctx!.font=`${n.r>6?11:9}px system-ui`; ctx!.fillStyle=C.muted; ctx!.textAlign="center"; ctx!.fillText(n.label,n.x,n.y+n.r+12);}
      });

      raf=requestAnimationFrame(draw);
    }
    raf=requestAnimationFrame(draw);
    return()=>cancelAnimationFrame(raf);
  },[matches,userId]);

  return <canvas ref={ref} style={{width:"100%",height:220,borderRadius:14,background:C.s2,border:`1px solid ${C.border}`}}/>;
}

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

/* ═══ CONSTANTS ═══ */
const INDUSTRIES=["AI/ML","SaaS","DeFi/Crypto","Health & Wellness","E-commerce","Education","Gaming","Marketing","Finance","Developer Tools","Media/Content","Social","Food & Bev","Real Estate","Other"];

/* ════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ════════════════════════════════════════════════════════════════ */

export default function Dashboard(){
  const router=useRouter();
  const[user,setUser]=useState<any>(null);
  const[agent,setAgent]=useState<any>(null);
  const[loading,setLoading]=useState(true);
  const[view,setView]=useState("mesh");
  const[matches,setMatches]=useState<any[]>([]);
  const[notifications,setNotifications]=useState<any[]>([]);
  const[discovery,setDiscovery]=useState<any[]>([]);
  const[badges,setBadges]=useState<any[]>([]);
  const[streak,setStreak]=useState<any>(null);
  const[leaderboard,setLeaderboard]=useState<any[]>([]);
  const[challenges,setChallenges]=useState<any[]>([]);
  const[report,setReport]=useState<any>(null);
  const[chatMatch,setChatMatch]=useState<any>(null);
  const[messages,setMessages]=useState<any[]>([]);
  const[msgText,setMsgText]=useState("");
  const[onboarding,setOnboarding]=useState(false);
  const[replayData,setReplayData]=useState<any>(null);
  const[shareMatch,setShareMatch]=useState<any>(null);
  const[dealMatch,setDealMatch]=useState<any>(null);
  const[lbTab,setLbTab]=useState("builders");
  const chatEndRef=useRef<HTMLDivElement>(null);
  // Crypto + referrals + notifications state
  const[wallet,setWallet]=useState<any>({risk_level:"conservative",trading_enabled:false});
  const[deposits,setDeposits]=useState<any[]>([]);
  const[trades,setTrades]=useState<any[]>([]);
  const[fuelStats,setFuelStats]=useState<any>(null);
  const[walletLoading,setWalletLoading]=useState(false);
  const[showPrivateKey,setShowPrivateKey]=useState(false);
  const[privateKey,setPrivateKey]=useState<string|null>(null);
  const[keyRevealing,setKeyRevealing]=useState(false);
  const[withdrawForm,setWithdrawForm]=useState({address:"",amount:""});
  const[withdrawing,setWithdrawing]=useState(false);
  const[showRiskModal,setShowRiskModal]=useState(false);
  const[riskAccepted,setRiskAccepted]=useState(false);
  const[nfts,setNfts]=useState<any[]>([]);
  const[mintableNfts,setMintableNfts]=useState<any[]>([]);
  const[nftLoading,setNftLoading]=useState(false);
  const[mintingMatch,setMintingMatch]=useState<string|null>(null);
  const[groupMeshes,setGroupMeshes]=useState<any[]>([]);
  const[groupMeshLoading,setGroupMeshLoading]=useState(false);
  const[groupMeshTopic,setGroupMeshTopic]=useState("");
  const[groupMeshCreating,setGroupMeshCreating]=useState(false);
  const[devApiKeys,setDevApiKeys]=useState<any[]>([]);
  const[referralStats,setReferralStats]=useState<any>(null);
  const[notifSettings,setNotifSettings]=useState<any>(null);
  // AI provider state
  const[aiProviders,setAiProviders]=useState<any[]>([]);
  const[aiCurrent,setAiCurrent]=useState<any>(null);
  const[aiForm,setAiForm]=useState({provider:"openai",apiKey:"",model:"gpt-4o-mini",endpoint:""});
  const[aiTesting,setAiTesting]=useState(false);
  const[aiTestResult,setAiTestResult]=useState<any>(null);

  const[form,setForm]=useState({name:"",bio:"",industry:"",building:"",looking_for:"",location:"",website:"",x_handle:"",linkedin:"",avatar_url:"",agent_style:"professional",agent_instructions:""});
  const[obStep,setObStep]=useState(1);
  const[showWalletDrop,setShowWalletDrop]=useState(false);
  const obSteps=[{n:1,l:"Profile"},{n:2,l:"Industry & Goals"},{n:3,l:"AI Brain"},{n:4,l:"Personality"}];
  const obCanNext=obStep===1?!!form.name:obStep===2?!!(form.building&&form.looking_for):true;

  /* ── Auth + Load ── */
  useEffect(()=>{checkAuth();},[]);

  async function checkAuth(){
    // Use our custom SIWE session instead of Supabase auth
    const sessionRes=await fetch("/api/auth/siwe/session");
    const sessionData=await sessionRes.json();
    if(!sessionData.user){router.push("/auth/signin");return;}
    const uid=sessionData.user.id;

    const{data:profile}=await supabase.from("users").select("*").eq("id",uid).single();

    if(!profile?.onboarded){
      setUser({...sessionData.user,...profile});
      const{data:agentP}=await supabase.from("agent_profiles").select("agent_style,agent_instructions").eq("user_id",uid).single();
      setForm({name:profile?.name||"",bio:profile?.bio||"",industry:profile?.industry||"",building:profile?.building||"",looking_for:profile?.looking_for||"",location:profile?.location||"",website:profile?.socials?.website||"",x_handle:profile?.socials?.x||"",linkedin:profile?.socials?.linkedin||"",avatar_url:profile?.avatar_url||"",agent_style:agentP?.agent_style||"professional",agent_instructions:agentP?.agent_instructions||""});
      setOnboarding(true); setLoading(false); return;
    }

    setUser({...sessionData.user,...profile});
    const{data:agentP2}=await supabase.from("agent_profiles").select("agent_style,agent_instructions").eq("user_id",uid).single();
    setForm({name:profile.name,bio:profile.bio,industry:profile.industry,building:profile.building,looking_for:profile.looking_for,location:profile.location,website:profile.socials?.website||"",x_handle:profile.socials?.x||"",linkedin:profile.socials?.linkedin||"",avatar_url:profile.avatar_url||"",agent_style:agentP2?.agent_style||"professional",agent_instructions:agentP2?.agent_instructions||""});

    const{data:ag}=await supabase.from("agent_profiles").select("*").eq("user_id",uid).single();
    setAgent(ag);

    try{await supabase.rpc("update_streak",{uid});}catch{}
    const{data:sk}=await supabase.from("streaks").select("*").eq("user_id",uid).single();
    setStreak(sk);

    await Promise.all([loadMatches(uid),loadDiscovery(uid),loadNotifications(uid),loadBadges(uid),loadLeaderboard(),loadChallenges(uid),loadReport(uid),loadWallet()]);
    setLoading(false);

    // Realtime notifications
    supabase.channel("n-"+uid).on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:`user_id=eq.${uid}`},(p)=>{
      setNotifications(prev=>[p.new as any,...prev]);
    }).on("postgres_changes",{event:"INSERT",schema:"public",table:"matches",filter:`user_b=eq.${uid}`},(p)=>{
      // Auto-refresh matches when agent finds new one
      loadMatches(uid);
    }).subscribe();
  }

  async function loadMatches(uid:string){const{data}=await supabase.from("matches").select("*,user_a_profile:users!matches_user_a_fkey(*),user_b_profile:users!matches_user_b_fkey(*)").or(`user_a.eq.${uid},user_b.eq.${uid}`).order("created_at",{ascending:false}); setMatches(data||[]);}
  async function loadDiscovery(uid:string){const{data}=await supabase.from("agent_profiles").select("*,user:users(name,industry,location,is_public)").neq("user_id",uid).order("match_count",{ascending:false}).limit(20); setDiscovery(data||[]);}
  async function loadNotifications(uid:string){const{data}=await supabase.from("notifications").select("*").eq("user_id",uid).order("created_at",{ascending:false}).limit(30); setNotifications(data||[]);}
  async function loadBadges(uid:string){const{data}=await supabase.from("badges").select("*").eq("user_id",uid); setBadges(data||[]);}
  async function loadLeaderboard(){
    const view=lbTab==="match_rate"?"leaderboard_match_rate":lbTab==="deal_closers"?"leaderboard_deal_closers":"leaderboard_top_builders";
    const{data}=await supabase.from(view).select("*").limit(15);
    setLeaderboard(data||[]);
  }
  async function loadChallenges(uid:string){
    const{data:ch}=await supabase.from("challenges").select("*").eq("active",true);
    const{data:prog}=await supabase.from("challenge_progress").select("*").eq("user_id",uid);
    setChallenges((ch||[]).map(c=>({...c,progress:(prog||[]).find((p:any)=>p.challenge_id===c.id)})));
  }
  async function loadReport(uid:string){const{data}=await supabase.from("agent_reports").select("*").eq("user_id",uid).order("report_date",{ascending:false}).limit(1).maybeSingle(); setReport(data);}

  async function loadWallet(){
    setWalletLoading(true);
    try{
      const res=await fetch("/api/wallet");
      const data=await res.json();
      if(data&&!data.error)setWallet((prev:any)=>({...prev,...data}));
      setTrades(data.recent_trades||[]);
      setDeposits(data.recent_withdrawals||[]);
      setFuelStats({estimated_days:data.estimated_days});
    }catch(e){console.error("Wallet load error:",e);}
    setWalletLoading(false);
  }

  async function revealPrivateKey(){
    if(!confirm("This will show your private key. Anyone with this key controls your wallet funds. Are you sure?")) return;
    setKeyRevealing(true);
    try{
      const res=await fetch("/api/wallet",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"reveal_key"})});
      const data=await res.json();
      if(data.privateKey){setPrivateKey(data.privateKey);setShowPrivateKey(true);}
    }catch(e){console.error(e);}
    setKeyRevealing(false);
  }

  async function handleWithdraw(){
    if(!withdrawForm.address||!withdrawForm.amount) return;
    setWithdrawing(true);
    try{
      const res=await fetch("/api/wallet",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"withdraw",amount_eth:parseFloat(withdrawForm.amount),to_address:withdrawForm.address})});
      const data=await res.json();
      if(data.ok){setWithdrawForm({address:"",amount:""});loadWallet();}else{alert(data.error||"Withdrawal failed");}
    }catch(e){console.error(e);}
    setWithdrawing(false);
  }

  async function updateWalletSettings(settings:any){
    // Optimistic update — respond immediately, don't reload from API
    setWallet((w:any)=>({...w,...settings}));
    try{
      await fetch("/api/wallet",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"settings",...settings})});
    }catch(e){console.error("wallet settings error",e);}
  }

  async function loadNfts(){
    setNftLoading(true);
    try{
      const res=await fetch("/api/nft");
      const data=await res.json();
      setNfts(data.nfts||[]);
      setMintableNfts(data.mintable||[]);
    }catch(e){console.error(e);}
    setNftLoading(false);
  }

  async function mintNft(matchId:string){
    setMintingMatch(matchId);
    try{
      const res=await fetch("/api/nft",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({match_id:matchId})});
      const data=await res.json();
      if(data.ok){loadNfts();loadMatches(user!.id);}
      else{alert(data.error||"Mint failed");}
    }catch(e){console.error(e);}
    setMintingMatch(null);
  }

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

  async function loadDevApiKeys(){
    const{data}=await supabase.from("developer_api_keys").select("*").eq("user_id",user?.id).order("created_at",{ascending:false});
    setDevApiKeys(data||[]);
  }

  async function generateDevApiKey(){
    const name=prompt("API key name:","My App");
    if(!name)return;
    const webhook=prompt("Webhook URL for match notifications (optional):","");
    try{
      const res=await fetch("/api/external",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"generate_key",name,webhook_url:webhook||undefined})});
      const data=await res.json();
      if(data.ok){
        alert(`API Key generated!\n\n${data.api_key}\n\nSave this — it won't be shown again.\nExpires: ${new Date(data.expires_at).toLocaleDateString()}`);
        loadDevApiKeys();
      }else{alert(data.error||"Failed");}
    }catch(e){console.error(e);}
  }

  async function loadReferralStats(){
    if(!user)return;
    const{data}=await supabase.from("referral_stats").select("*").eq("user_id",user.id).single();
    setReferralStats(data);
  }

  async function loadNotifSettings(){
    if(!user)return;
    const{data}=await supabase.from("notification_settings").select("*").eq("user_id",user.id).single();
    setNotifSettings(data);
  }

  async function loadAiSettings(){
    try{
      const res=await fetch("/api/ai");
      const data=await res.json();
      setAiProviders(data.providers||[]);
      setAiCurrent(data.current);
      if(data.current?.connected){
        setAiForm(f=>({...f,provider:data.current.provider,model:data.current.model,endpoint:data.current.endpoint||""}));
      }
    }catch(e){console.error(e);}
  }

  async function testAiConnection(){
    setAiTesting(true); setAiTestResult(null);
    try{
      const res=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"test",...aiForm})});
      const data=await res.json();
      setAiTestResult(data);
    }catch(e:any){setAiTestResult({success:false,message:e.message});}
    setAiTesting(false);
  }

  async function saveAiSettings(){
    await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save",...aiForm})});
    await loadAiSettings();
    setAiTestResult(null);
  }

  async function disconnectAi(){
    await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"disconnect"})});
    setAiCurrent(null); setAiForm({provider:"openai",apiKey:"",model:"gpt-4o-mini",endpoint:""});
  }

  async function updateNotifSettings(updates:any){
    if(!user)return;
    await supabase.from("notification_settings").upsert({user_id:user.id,...notifSettings,...updates},{onConflict:"user_id"});
    setNotifSettings((prev:any)=>({...prev,...updates}));
  }

  useEffect(()=>{loadLeaderboard();},[lbTab]);

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

  /* ── Match Actions (accept/pass only — NO manual connect) ── */
  async function acceptMatch(id:string){
    await fetch("/api/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"accept",match_id:id})});
    if(user)loadMatches(user.id);
  }
  async function passMatch(id:string){
    await fetch("/api/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"pass",match_id:id})});
    if(user)loadMatches(user.id);
  }

  /* ── Deal Submit ── */
  async function submitDeal(f:any){
    if(!dealMatch||!user)return;
    const otherId=dealMatch.user_a===user.id?dealMatch.user_b:dealMatch.user_a;
    await supabase.from("deals").insert({match_id:dealMatch.id,reporter_id:user.id,partner_id:otherId,...f});
    // Award badge
    await supabase.from("badges").upsert({user_id:user.id,badge_type:"deal_closer",badge_name:"Deal Closer",badge_description:"Reported a closed deal from a MishMesh match"},{onConflict:"user_id,badge_type"});
    setDealMatch(null); loadBadges(user.id);
  }

  /* ── Replay ── */
  async function openReplay(matchId:string){
    const{data}=await supabase.from("agent_conversations").select("transcript").eq("match_id",matchId).single();
    const m=matches.find(m=>m.id===matchId);
    if(data&&m)setReplayData({transcript:data.transcript,highlights:m.highlights,matchId});
  }

  /* ── Profile Save + Agent Gen ── */
  async function saveProfile(){
    if(!user)return;
    // Check username uniqueness
    if(form.name){
      const{data:existing}=await supabase.from("users").select("id").eq("name",form.name).neq("id",user.id).limit(1);
      if(existing&&existing.length>0){alert("Username already taken. Choose another.");return;}
    }
    const{error:updateErr}=await supabase.from("users").update({name:form.name,bio:form.bio,industry:form.industry,building:form.building,looking_for:form.looking_for,location:form.location,avatar_url:form.avatar_url,socials:{website:form.website,x:form.x_handle,linkedin:form.linkedin},onboarded:true}).eq("id",user.id);
    if(updateErr){alert(updateErr.message?.includes("users_name_unique")?"Username already taken.":"Save failed: "+updateErr.message);return;}
    // Generate agent
    const res=await fetch("/api/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"generate_agent"})});
    const{agent:ag}=await res.json();
    setAgent(ag);
    // Save agent personality
    if(ag?.id||ag?.user_id){
      await supabase.from("agent_profiles").update({agent_style:form.agent_style,agent_instructions:form.agent_instructions}).eq("user_id",user.id);
    }
    setOnboarding(false);
    setUser((u:any)=>({...u,onboarded:true}));
    // Award first badge
    await supabase.from("badges").upsert({user_id:user.id,badge_type:"first_agent",badge_name:"Agent Deployed",badge_description:"Launched your first AI agent"},{onConflict:"user_id,badge_type"});
  }

  async function uploadPhoto(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0]; if(!file||!user)return;
    const path=`${user.id}/${Date.now()}-${file.name}`;
    const{error}=await supabase.storage.from("avatars").upload(path,file);
    if(!error){
      const{data:{publicUrl}}=supabase.storage.from("avatars").getPublicUrl(path);
      setForm(f=>({...f,avatar_url:publicUrl}));
      setUser((u:any)=>({...u,avatar_url:publicUrl}));
      // Persist to DB immediately
      await supabase.from("users").update({avatar_url:publicUrl}).eq("id",user.id);
    }
  }

  async function signOut(){await fetch("/api/auth/siwe/logout",{method:"POST"}); router.push("/");}

  /* ── Helpers ── */
  const getOther=(m:any)=>m.user_a===user?.id?m.user_b_profile:m.user_a_profile;
  const getMyStatus=(m:any)=>m.user_a===user?.id?m.status_a:m.status_b;
  const pendingMatches=matches.filter(m=>getMyStatus(m)==="pending");
  const acceptedMatches=matches.filter(m=>m.revealed);
  const waitingMatches=matches.filter(m=>getMyStatus(m)==="accepted"&&!m.revealed);
  const unreadNotifs=notifications.filter(n=>!n.read).length;

  /* ── Loading Screen ── */
  if(loading)return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}><MMLogo size={80}/><div style={{color:C.muted,marginTop:16,fontSize:14}}>Loading your mesh...</div>
        <div style={{width:120,height:3,background:C.s2,borderRadius:2,margin:"12px auto 0",overflow:"hidden"}}><div style={{width:"60%",height:"100%",background:`linear-gradient(90deg,${C.cold},${C.cyan})`,borderRadius:2,animation:"shimmer 1.5s infinite"}}></div></div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════
     ONBOARDING — 4-step wizard
     ══════════════════════════════════════════ */

  if(onboarding)return(
    <div style={{minHeight:"100vh",background:C.bg,padding:20}}>
      <style>{`nav.mm-global-nav{display:none!important}`}</style>
      <div style={{maxWidth:560,margin:"0 auto",paddingTop:32}}>
        {/* Logo + header */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <MMLogo size={56}/>
          <h1 style={{fontSize:26,fontWeight:800,marginTop:12}}>
            {obStep===1?"Who are you?":obStep===2?"What are you building?":obStep===3?"Give your agent a brain":"Set the vibe"}
          </h1>
          <p style={{color:C.muted,marginTop:6,fontSize:13}}>
            {obStep===1?"Your agent represents you. Make it count.":obStep===2?"This is how your agent finds the right people.":obStep===3?"Connect an AI provider so your agent can think. Optional — you can do this later.":"How should your agent talk to other agents?"}
          </p>
        </div>

        {/* Progress bar */}
        <div style={{display:"flex",gap:6,marginBottom:32}}>
          {obSteps.map(s=>(
            <div key={s.n} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{width:"100%",height:3,borderRadius:2,background:s.n<=obStep?`linear-gradient(90deg,${C.cold},${C.cyan})`:C.s2,transition:"all 0.4s"}}/>
              <span style={{fontSize:10,color:s.n<=obStep?C.text:C.dim,fontWeight:s.n===obStep?700:400}}>{s.l}</span>
            </div>
          ))}
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:16}}>

          {/* ═══ STEP 1: Profile basics ═══ */}
          {obStep===1&&(<>
            <div style={{textAlign:"center"}}>
              <label style={{cursor:"pointer",display:"inline-block"}}>
                <input type="file" accept="image/*" onChange={uploadPhoto} style={{display:"none"}}/>
                {form.avatar_url?<img src={form.avatar_url} style={{width:88,height:88,borderRadius:"50%",objectFit:"cover",border:`3px solid ${C.cold}`}}/>:
                <div style={{width:88,height:88,borderRadius:"50%",background:C.s2,border:`2px dashed ${C.dim}`,display:"flex",alignItems:"center",justifyContent:"center"}}><Camera size={28} color={C.dim}/></div>}
                <div style={{fontSize:11,color:C.muted,marginTop:6}}>Upload photo</div>
              </label>
            </div>
            {([
              {k:"name",l:"Username *",p:"Choose a unique username"},
              {k:"bio",l:"One-liner Bio",p:"e.g., Building the future of AI matchmaking",m:true},
              {k:"location",l:"Location",p:"City, Country"},
              {k:"website",l:"Website",p:"https://..."},
              {k:"x_handle",l:"X / Twitter",p:"@handle"},
            ] as {k:string,l:string,p:string,m?:boolean}[]).map(({k,l,p,m})=>(
              <div key={k}><label style={{fontSize:12,color:C.muted,marginBottom:4,display:"block"}}>{l}</label>
                {m?<textarea value={(form as any)[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={p} rows={2} style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14,fontFamily:"inherit",resize:"vertical"}}/>
                :<input value={(form as any)[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={p} style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14,fontFamily:"inherit"}}/>}
              </div>
            ))}
          </>)}

          {/* ═══ STEP 2: Industry & Goals ═══ */}
          {obStep===2&&(<>
            <div><label style={{fontSize:12,color:C.muted,marginBottom:4,display:"block"}}>Industry</label>
              <select value={form.industry} onChange={e=>setForm(f=>({...f,industry:e.target.value}))} style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14,fontFamily:"inherit"}}>
                <option value="">Select your industry...</option>{INDUSTRIES.map(i=><option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div><label style={{fontSize:12,color:C.muted,marginBottom:4,display:"block"}}>What I'm Building *</label>
              <textarea value={form.building} onChange={e=>setForm(f=>({...f,building:e.target.value}))} placeholder="Describe your project, startup, or business..." rows={3} style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14,fontFamily:"inherit",resize:"vertical"}}/>
            </div>
            <div><label style={{fontSize:12,color:C.muted,marginBottom:4,display:"block"}}>What I'm Looking For *</label>
              <textarea value={form.looking_for} onChange={e=>setForm(f=>({...f,looking_for:e.target.value}))} placeholder="Co-founders, engineers, investors, partnerships, mentors..." rows={3} style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14,fontFamily:"inherit",resize:"vertical"}}/>
            </div>
            <div><label style={{fontSize:12,color:C.muted,marginBottom:4,display:"block"}}>LinkedIn</label>
              <input value={form.linkedin} onChange={e=>setForm(f=>({...f,linkedin:e.target.value}))} placeholder="linkedin.com/in/..." style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14,fontFamily:"inherit"}}/>
            </div>
          </>)}

          {/* ═══ STEP 3: AI Brain ═══ */}
          {obStep===3&&(<>
            <div style={{background:C.surface,borderRadius:14,padding:20,border:`1px solid ${C.cold}44`}}>
              <div style={{fontSize:11,color:C.cold,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
                <Cpu size={12}/>Connect Your AI Brain
              </div>
              <div style={{fontSize:12,color:C.muted,marginBottom:16,lineHeight:1.6}}>Your agent needs an AI to think. Connect your own API key — you pay your provider directly. MishMesh takes zero cut.</div>

              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:C.muted,marginBottom:6}}>Provider</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {[
                    {id:"openai",name:"OpenAI",cost:"~$0.30"},
                    {id:"anthropic",name:"Anthropic",cost:"~$3.00"},
                    {id:"google",name:"Google",cost:"~$0.15"},
                    {id:"groq",name:"Groq",cost:"~$0.12"},
                    {id:"openrouter",name:"OpenRouter",cost:"~$0.30"},
                  ].map((p)=>(
                    <button key={p.id} onClick={()=>{setAiForm(f=>({...f,provider:p.id,model:p.id==="openai"?"gpt-4o-mini":p.id==="anthropic"?"claude-3-haiku-20240307":p.id==="groq"?"llama-3.1-70b-versatile":"gemini-pro"}));setAiTestResult(null);}}
                      style={{padding:"10px 16px",borderRadius:10,border:`1px solid ${aiForm.provider===p.id?C.cold:C.border}`,background:aiForm.provider===p.id?`${C.cold}15`:C.s2,cursor:"pointer",fontSize:12,fontWeight:aiForm.provider===p.id?700:400,color:aiForm.provider===p.id?C.cold:C.muted,transition:"all 0.2s"}}>
                      {p.name}<span style={{fontSize:9,display:"block",color:C.dim,marginTop:2}}>{p.cost}/match</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:C.muted,marginBottom:4}}>API Key</div>
                <input type="password" value={aiForm.apiKey} onChange={e=>setAiForm(f=>({...f,apiKey:e.target.value}))} placeholder={aiForm.provider==="openai"?"sk-proj-...":aiForm.provider==="anthropic"?"sk-ant-...":"Your API key"}
                  style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"monospace"}}/>
              </div>

              <div style={{display:"flex",gap:8}}>
                <button onClick={testAiConnection} disabled={!aiForm.apiKey||aiTesting}
                  style={{flex:1,padding:"10px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:C.s2,cursor:aiForm.apiKey?"pointer":"not-allowed",color:aiForm.apiKey?C.text:C.dim,fontSize:12,fontWeight:600,opacity:aiTesting?0.5:1}}>
                  {aiTesting?"Testing...":"Test Connection"}
                </button>
                {aiForm.apiKey&&aiTestResult?.success&&(
                  <button onClick={saveAiSettings} style={{flex:1,padding:"10px 16px",borderRadius:8,border:"none",background:C.cold,cursor:"pointer",color:"white",fontSize:12,fontWeight:600}}>
                    Save & Activate
                  </button>
                )}
              </div>
              {aiTestResult&&(
                <div style={{marginTop:10,padding:10,borderRadius:8,background:aiTestResult.success?`${C.match}15`:`${C.hot}15`,border:`1px solid ${aiTestResult.success?C.match:C.hot}33`,fontSize:11,color:aiTestResult.success?C.match:C.hot}}>
                  {aiTestResult.success?`Connected! Response: "${aiTestResult.message}"`:`${aiTestResult.message}`}
                </div>
              )}
              <div style={{fontSize:10,color:C.dim,marginTop:10,display:"flex",alignItems:"center",gap:4}}><Shield size={10}/>Stored encrypted. Your agent uses your key directly.</div>
            </div>
            <div style={{textAlign:"center",fontSize:12,color:C.dim,padding:"8px 0"}}>
              No API key? No worries — you can add one later in your profile.
            </div>
          </>)}

          {/* ═══ STEP 4: Agent Personality ═══ */}
          {obStep===4&&(<>
            <div style={{background:C.surface,borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:16}}>How should your agent represent you?</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {([
                  {s:"professional",emoji:"",desc:"Formal, data-driven, measured"},
                  {s:"friendly",emoji:"",desc:"Warm, approachable, enthusiastic"},
                  {s:"aggressive",emoji:"",desc:"Direct, fast, deal-focused"},
                  {s:"custom",emoji:"",desc:"You write the playbook"},
                ] as const).map(({s,desc})=>(
                  <button key={s} onClick={()=>setForm(f=>({...f,agent_style:s}))} style={{
                    padding:"16px 14px",borderRadius:12,cursor:"pointer",fontFamily:"inherit",textAlign:"left",
                    background:form.agent_style===s?`${C.cold}15`:C.s2,color:C.text,
                    border:`2px solid ${form.agent_style===s?C.cold:C.border}`,transition:"all 0.2s",
                  }}>
                    <div style={{fontSize:14,fontWeight:700,textTransform:"capitalize",marginBottom:4}}>{s}</div>
                    <div style={{fontSize:11,color:C.muted}}>{desc}</div>
                  </button>
                ))}
              </div>
              {form.agent_style==="custom"&&(
                <textarea value={form.agent_instructions} onChange={e=>setForm(f=>({...f,agent_instructions:e.target.value}))} rows={3}
                  placeholder="e.g., Be direct, mention my track record in DeFi, always ask about their timeline..."
                  style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit",resize:"vertical",marginTop:12}}/>
              )}
            </div>
            <div style={{textAlign:"center",padding:"4px 0"}}>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                Your agent starts networking the moment you launch.<br/>
                Matches arrive automatically — no swiping, no cold DMs.
              </div>
            </div>
          </>)}

          {/* Navigation buttons */}
          <div style={{display:"flex",gap:10,marginTop:8}}>
            {obStep>1&&(
              <button onClick={()=>setObStep(s=>s-1)} style={{flex:"0 0 auto",padding:"12px 20px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:14,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                <ArrowLeft size={14}/>Back
              </button>
            )}
            {obStep<4?(
              <Btn primary onClick={()=>setObStep(s=>s+1)} disabled={!obCanNext} style={{flex:1,justifyContent:"center",padding:"12px 20px",fontSize:15}}>
                {obStep===3&&!aiForm.apiKey?"Skip for now":"Continue"}<ArrowRight size={14}/>
              </Btn>
            ):(
              <Btn primary onClick={saveProfile} disabled={!form.name||!form.building||!form.looking_for} style={{flex:1,justifyContent:"center",padding:"14px 20px",fontSize:16}}>
                <Zap size={16}/>Launch My Agent
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════
     MODALS
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
     MAIN LAYOUT
     ══════════════════════════════════════════ */
  return(
    <div style={{minHeight:"100vh",background:C.bg}}>
      {/* Hide global navbar */}
      <style>{`nav.mm-global-nav{display:none!important}`}</style>
      {showWalletDrop&&<div onClick={()=>setShowWalletDrop(false)} style={{position:"fixed",inset:0,zIndex:998}}/>}
      {/* ── Nav ── */}
      <nav style={{padding:"4px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>setView("mesh")}>
          <MMLogo size={32}/><span style={{fontWeight:700,fontSize:15}}>MishMesh</span><TierBadge tier={user?.tier||"free"}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          {/* Wallet balance with dropdown */}
          <div style={{position:"relative"}}>
            <div onClick={()=>setShowWalletDrop(p=>!p)} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:6,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"6px 14px"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:C.match,boxShadow:`0 0 6px ${C.match}`}}/>
              <span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:"'JetBrains Mono',monospace"}}>{wallet?.balance_eth != null ? wallet.balance_eth.toFixed(4) : "..."}</span>
              <span style={{fontSize:11,color:C.muted}}>ETH</span>
            </div>
            {showWalletDrop&&(
              <div style={{position:"absolute",top:"100%",right:0,marginTop:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:12,minWidth:200,zIndex:999,boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
                <div style={{fontSize:10,color:C.dim,marginBottom:8,fontFamily:"monospace",wordBreak:"break-all"}}>{user?.wallet_address?.slice(0,6)}...{user?.wallet_address?.slice(-4)}</div>
                <button onClick={()=>{setShowWalletDrop(false);setTab("wallet");}} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.text,fontSize:12,fontWeight:600,cursor:"pointer",marginBottom:6,fontFamily:"inherit",textAlign:"left"}}>View Wallet</button>
                <button onClick={async()=>{setShowWalletDrop(false);await fetch("/api/auth/siwe/logout",{method:"POST"});window.location.href="/";}} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid rgba(255,50,85,0.3)`,background:"transparent",color:"#FF2D55",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>Disconnect</button>
              </div>
            )}
          </div>
          {/* Streak shown as badge on avatar instead */}
          <button onClick={()=>setView("notifications")} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,position:"relative"}}>
            <Bell size={18}/>{unreadNotifs>0&&<span style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:C.hot,color:"white",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{unreadNotifs}</span>}
          </button>
          <div style={{cursor:"pointer",position:"relative"}} onClick={()=>setView("profile")}>
            <div style={{width:36,height:36,borderRadius:"50%",border:`2px solid ${C.match}`,boxShadow:`0 0 10px ${C.match}44, 0 0 20px ${C.match}22`,overflow:"hidden",background:`linear-gradient(135deg,${C.cold},${C.cyan})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {user?.avatar_url?<img src={user.avatar_url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:14,fontWeight:700,color:"white"}}>{(user?.name||"?")[0]}</span>}
            </div>
            <div style={{position:"absolute",bottom:-1,right:-1,width:10,height:10,borderRadius:"50%",background:C.match,border:`2px solid ${C.bg}`}}/>
            {streak&&streak.current_streak>0&&<div style={{position:"absolute",top:-16,left:"50%",transform:"translateX(-50%)",background:C.warn,borderRadius:6,padding:"1px 5px",fontSize:9,fontWeight:800,color:"#000",border:`1.5px solid ${C.bg}`,display:"flex",alignItems:"center",gap:1,whiteSpace:"nowrap"}} title={`${streak.current_streak} day streak`}><Flame size={8}/>{streak.current_streak}</div>}
          </div>
        </div>
      </nav>

      {/* ── Tabs ── */}
      <div style={{padding:"8px 16px 10px",display:"flex",gap:6,borderBottom:`1px solid ${C.border}`,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>
        {[
          {id:"mesh",label:"Mesh",icon:<BarChart3 size={13}/>},
          {id:"pending",label:`New${pendingMatches.length?` (${pendingMatches.length})`:""}`,icon:<Sparkles size={13}/>},
          {id:"matches",label:`Connected${acceptedMatches.length?` (${acceptedMatches.length})`:""}`,icon:<MessageCircle size={13}/>},
          {id:"discover",label:"Agents",icon:<Search size={13}/>},
          {id:"leaderboard",label:"Ranks",icon:<Trophy size={13}/>},
          {id:"wallet",label:"Agent Fuel",icon:<Zap size={13}/>},
          {id:"nfts",label:`NFTs${nfts.length?` (${nfts.length})`:""}`,icon:<Award size={13}/>},
          {id:"groups",label:"Group Mesh",icon:<Users size={13}/>},
          {id:"referrals",label:"Referrals",icon:<Share2 size={13}/>},
          {id:"settings",label:"AI Brain",icon:<Cpu size={13}/>},
        ].map(t=>(
          <button key={t.id} onClick={()=>{setView(t.id);if(t.id==="wallet"&&!wallet)loadWallet();if(t.id==="nfts"&&!nfts.length)loadNfts();if(t.id==="groups"&&!groupMeshes.length)loadGroupMeshes();if(t.id==="referrals"&&!referralStats)loadReferralStats();if(t.id==="settings"&&!notifSettings){loadNotifSettings();loadAiSettings();loadDevApiKeys();};}} style={{
            background:view===t.id?"linear-gradient(135deg, rgba(99,102,241,0.25), rgba(6,182,212,0.15))":"rgba(255,255,255,0.03)",
            border:view===t.id?`1px solid rgba(99,102,241,0.5)`:`1px solid rgba(255,255,255,0.06)`,
            borderRadius:22,
            padding:"9px 16px",
            color:view===t.id?"#fff":C.muted,
            cursor:"pointer",
            fontSize:12,
            fontWeight:view===t.id?700:500,
            fontFamily:"inherit",
            display:"flex",
            alignItems:"center",
            gap:6,
            whiteSpace:"nowrap",
            transition:"all 0.2s ease",
            boxShadow:view===t.id?"0 0 16px rgba(99,102,241,0.3), 0 0 4px rgba(6,182,212,0.2)":"none",
          }}>{t.icon}{t.label}</button>
        ))}
      </div>

      <div style={{padding:20,maxWidth:720,margin:"0 auto"}}>

        {/* ════ MESH (Home) ════ */}
        {view==="mesh"&&(<div>
          <h2 style={{fontSize:20,fontWeight:700,marginBottom:4,display:"flex",alignItems:"center",gap:8}}><MMLogo size={28}/>Your Mesh</h2>
          <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Your agent networks autonomously. Matches arrive automatically.</div>

          <MeshGraph matches={matches} userId={user?.id}/>

          {/* Agent Status Card */}
          {agent&&(<div style={{background:C.surface,borderRadius:14,padding:18,border:`1px solid ${C.cold}22`,marginTop:16}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:`linear-gradient(135deg,${C.cold},${C.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                <Cpu size={20} color="white"/>
                <div style={{position:"absolute",bottom:-2,right:-2,width:12,height:12,borderRadius:"50%",background:C.match,border:`2px solid ${C.surface}`}} title="Active"/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15}}>{agent.agent_name}</div>
                <div style={{fontSize:11,color:C.match,display:"flex",alignItems:"center",gap:4}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:C.match}}/>Active — networking 24/7
                </div>
              </div>
              <div style={{display:"flex",gap:16}}>
                <div style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color:C.cold}}>{agent.conversation_count}</div><div style={{fontSize:9,color:C.muted,textTransform:"uppercase"}}>Convos</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color:C.match}}>{agent.match_count}</div><div style={{fontSize:9,color:C.muted,textTransform:"uppercase"}}>Matches</div></div>
              </div>
            </div>
            <p style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:10}}>{agent.summary}</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{(agent.capabilities||[]).map((c:string)=><span key={c} style={{fontSize:10,padding:"3px 8px",background:C.s2,borderRadius:6,color:C.text}}>{c}</span>)}</div>
            {user?.tier==="free"&&<div style={{marginTop:12,fontSize:11,color:C.dim,display:"flex",alignItems:"center",gap:4,padding:"8px 12px",background:C.s2,borderRadius:8}}>
              <Timer size={11}/>{user.daily_convos_used||0}/5 daily agent conversations · <span style={{color:C.cold,cursor:"pointer"}}>Upgrade to Pro for unlimited</span>
            </div>}
          </div>)}

          {/* Daily Report */}
          {report&&report.convos_count>0&&(<div style={{background:C.s2,borderRadius:14,padding:16,marginTop:12,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:10,color:C.cold,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,display:"flex",alignItems:"center",gap:4}}><FileText size={11}/>Today's Agent Report</div>
            <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>
              Your agent had <strong>{report.convos_count}</strong> conversations{report.matches_above_85>0&&<>, <strong style={{color:C.match}}>{report.matches_above_85} above 85%</strong></>}
              {report.top_match_score>=0.85&&<> — hot {report.top_match_industry||""} lead at <strong style={{color:C.hot}}>{Math.round(report.top_match_score*100)}%</strong></>}
            </div>
          </div>)}

          {/* Streak + Badges Row */}
          <div style={{display:"flex",gap:12,marginTop:16,flexWrap:"wrap"}}>
            {streak&&<div style={{background:C.surface,borderRadius:14,padding:16,flex:"1 1 120px",border:`1px solid ${C.border}`,textAlign:"center"}}>
              <Flame size={20} color={streak.current_streak>=7?C.hot:C.warn}/>
              <div style={{fontSize:28,fontWeight:800,marginTop:4}}>{streak.current_streak}</div>
              <div style={{fontSize:10,color:C.muted}}>Day Streak</div>
              {streak.current_streak>0&&streak.current_streak<7&&<div style={{fontSize:10,color:C.warn,marginTop:6}}>{7-streak.current_streak} more for Legendary badge</div>}
              {streak.current_streak>=7&&<div style={{fontSize:10,color:C.match,marginTop:6}}>Legendary Networker</div>}
            </div>}
            <div style={{background:C.surface,borderRadius:14,padding:16,flex:"1 1 200px",border:`1px solid ${C.border}`}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:8,display:"flex",alignItems:"center",gap:4}}><Award size={11}/>Badges ({badges.length})</div>
              {badges.length===0?<div style={{fontSize:12,color:C.dim}}>Complete challenges to earn badges</div>:
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{badges.slice(0,6).map(b=><BadgeChip key={b.id} name={b.badge_name} type={b.badge_type}/>)}</div>}
            </div>
          </div>

          {/* Challenges */}
          {challenges.length>0&&(<div style={{marginTop:16}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,display:"flex",alignItems:"center",gap:4}}><Target size={11}/>Weekly Challenges</div>
            {challenges.map(ch=>(<div key={ch.id} style={{background:C.surface,borderRadius:10,padding:14,marginBottom:8,border:`1px solid ${C.border}`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{ch.title}</div><div style={{fontSize:11,color:C.muted}}>{ch.description}</div></div>
                <BadgeChip name={ch.badge_name} type={ch.badge_type}/>
              </div>
              <div style={{marginTop:8,height:4,borderRadius:2,background:C.s2,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(100,((ch.progress?.progress||0)/(ch.criteria?.count||1))*100)}%`,background:`linear-gradient(90deg,${C.cold},${C.cyan})`,borderRadius:2,transition:"width 0.5s"}}/>
              </div>
            </div>))}
          </div>)}
        </div>)}

        {/* ════ PENDING (Agent found these) ════ */}
        {view==="pending"&&(<div>
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
        {view==="matches"&&(<div>
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

        {/* ════ DISCOVERY (browse-only, agents connect autonomously) ════ */}
        {view==="discover"&&(<div>
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

        {/* ════ LEADERBOARD ════ */}
        {view==="leaderboard"&&(<div>
          <h2 style={{fontSize:20,fontWeight:700,marginBottom:16,display:"flex",alignItems:"center",gap:8}}><Trophy size={20}/>Leaderboard</h2>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            {(["builders","match_rate","deal_closers"] as const).map(t=>(
              <button key={t} onClick={()=>setLbTab(t)} style={{background:lbTab===t?C.s2:"transparent",border:`1px solid ${lbTab===t?C.border:"transparent"}`,borderRadius:8,padding:"7px 14px",color:lbTab===t?C.text:C.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit",textTransform:"capitalize"}}>{t.replace(/_/g," ")}</button>
            ))}
          </div>
          {leaderboard.length===0?<div style={{textAlign:"center",padding:40,color:C.dim}}>No data yet. Be the first on the board!</div>:
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {leaderboard.map((u,i)=>{
              const medal=i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":null;
              return(<div key={u.id} style={{display:"flex",alignItems:"center",gap:12,background:C.surface,borderRadius:10,padding:14,border:`1px solid ${medal?C.cold+"33":C.border}`}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:medal||C.s2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:medal?"white":C.muted}}>{i+1}</div>
                <Avatar name={u.name} size={36} url={u.avatar_url}/>
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{u.name}</div><div style={{fontSize:11,color:C.muted}}>{u.agent_name} · {u.industry}</div></div>
                <div style={{fontWeight:800,fontSize:16,color:C.cold}}>{lbTab==="match_rate"?`${u.match_rate}%`:lbTab==="deal_closers"?u.deals_closed:u.match_count}</div>
              </div>);
            })}
          </div>}
        </div>)}

        {/* ════ AGENT FUEL (Master Wallet) ════ */}
        {view==="wallet"&&(<div>
          {walletLoading&&<div style={{textAlign:"center",padding:60,color:C.muted}}>Loading...</div>}
          {!walletLoading&&(<div>
            <h2 style={{fontSize:20,fontWeight:700,marginBottom:16,display:"flex",alignItems:"center",gap:8}}><Zap size={20}/>Your Agent Wallet</h2>

            {/* Balance Card */}
            <div style={{background:`linear-gradient(135deg,${C.cold}15,${C.cyan}08)`,borderRadius:16,padding:24,border:`1px solid ${C.cold}33`,marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div>
                  <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>On-Chain Balance (Base)</div>
                  <div style={{fontSize:36,fontWeight:900,background:`linear-gradient(135deg,${C.cold},${C.cyan})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{(wallet?.balance_eth||0).toFixed(4)} ETH</div>
                </div>
                <div style={{width:56,height:56,borderRadius:"50%",background:(wallet?.balance_eth||0)>0.001?`${C.match}20`:`${C.hot}20`,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${(wallet?.balance_eth||0)>0.001?C.match:C.hot}44`}}>
                  <Zap size={24} color={(wallet?.balance_eth||0)>0.001?C.match:C.hot}/>
                </div>
              </div>
              <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                <div><div style={{fontSize:10,color:C.muted}}>Status</div><div style={{fontSize:13,fontWeight:600,color:(wallet?.balance_eth||0)>0.001?C.match:C.hot,display:"flex",alignItems:"center",gap:4}}><div style={{width:6,height:6,borderRadius:"50%",background:(wallet?.balance_eth||0)>0.001?C.match:C.hot}}/>{(wallet?.balance_eth||0)>0.001?"Active":"Needs Fuel"}</div></div>
                <div><div style={{fontSize:10,color:C.muted}}>Est. Days Left</div><div style={{fontSize:13,fontWeight:600}}>{fuelStats?.estimated_days||0}</div></div>
                <div><div style={{fontSize:10,color:C.muted}}>Trading P&L</div><div style={{fontSize:13,fontWeight:600,color:(wallet?.total_trading_pnl||0)>=0?C.match:C.hot}}>{(wallet?.total_trading_pnl||0)>=0?"+":""}{(wallet?.total_trading_pnl||0).toFixed(4)} ETH</div></div>
                <div><div style={{fontSize:10,color:C.muted}}>Chain</div><div style={{fontSize:13,fontWeight:600}}>Base L2</div></div>
              </div>
            </div>

            {/* YOUR Wallet Address — fund by sending ETH here */}
            <div style={{background:C.surface,borderRadius:14,padding:20,border:`1px solid ${C.match}33`,marginBottom:16}}>
              <div style={{fontSize:10,color:C.match,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                <Shield size={11}/>Your Wallet Address
              </div>

              {wallet?.has_wallet?(
                <div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Send ETH on <strong>Base network</strong> to fund your agent. This is YOUR wallet — you own the keys.</div>
                  <div style={{fontSize:11,padding:"8px 12px",background:`${C.warn}10`,border:`1px solid ${C.warn}33`,borderRadius:8,marginBottom:10,color:C.warn}}>10% platform fee on deposits. 1% fee on all trades. These fees keep the mesh running.</div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <code style={{flex:1,fontSize:11,color:C.cyan,wordBreak:"break-all",fontFamily:"monospace",background:C.bg,padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`}}>{wallet.wallet_address}</code>
                    <button onClick={()=>{navigator.clipboard?.writeText(wallet.wallet_address);}} style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:6,padding:"6px 10px",cursor:"pointer",color:C.muted,fontSize:11,display:"flex",alignItems:"center",gap:4,flexShrink:0}}><Copy size={11}/>Copy</button>
                  </div>

                  {/* QR Code */}
                  <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${wallet.wallet_address}&bgcolor=0a0a0f&color=00d4ff`} alt="Wallet QR" style={{width:140,height:140,borderRadius:12,border:`2px solid ${C.border}`}}/>
                  </div>

                  <div style={{display:"flex",gap:8,marginBottom:8}}>
                    <a href={`https://basescan.org/address/${wallet.wallet_address}`} target="_blank" rel="noopener" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"8px 12px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,color:C.cyan,fontSize:11,textDecoration:"none"}}><ExternalLink size={11}/>View on BaseScan</a>
                    <button onClick={revealPrivateKey} disabled={keyRevealing} style={{flex:1,padding:"8px 12px",background:`${C.hot}15`,border:`1px solid ${C.hot}33`,borderRadius:8,cursor:"pointer",color:C.hot,fontSize:11,fontWeight:600,opacity:keyRevealing?0.5:1}}><Key size={11}/> {keyRevealing?"Loading...":"Export Private Key"}</button>
                  </div>

                  {/* Private Key Reveal */}
                  {showPrivateKey&&privateKey&&(
                    <div style={{background:`${C.hot}10`,borderRadius:10,padding:14,border:`1px solid ${C.hot}44`,marginTop:8}}>
                      <div style={{fontSize:11,color:C.hot,fontWeight:700,marginBottom:6,display:"flex",alignItems:"center",gap:4}}><AlertTriangle size={12}/>Save this key. We cannot recover it.</div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <code style={{flex:1,fontSize:10,color:C.text,wordBreak:"break-all",fontFamily:"monospace",background:C.bg,padding:8,borderRadius:6,border:`1px solid ${C.hot}33`}}>{privateKey}</code>
                        <button onClick={()=>{navigator.clipboard?.writeText(privateKey);}} style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:6,padding:"6px 8px",cursor:"pointer",color:C.muted,fontSize:10,flexShrink:0}}><Copy size={10}/></button>
                      </div>
                      <button onClick={()=>{setShowPrivateKey(false);setPrivateKey(null);}} style={{marginTop:8,background:"transparent",border:"none",color:C.dim,fontSize:10,cursor:"pointer"}}>Hide key</button>
                    </div>
                  )}

                  <div style={{fontSize:10,color:C.dim,marginTop:10,display:"flex",alignItems:"center",gap:4}}><Shield size={10}/>Non-custodial. Your keys, your crypto. 10% deposit fee · 1% trade fee. Platform wallet receives fees only.</div>
                </div>
              ):(
                <div style={{textAlign:"center",padding:20}}>
                  <div style={{fontSize:13,color:C.muted,marginBottom:12}}>No wallet yet. Sign out and back in to generate one, or click below.</div>
                  <button onClick={async()=>{
                    const res=await fetch("/api/wallet",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"generate"})});
                    const data=await res.json();
                    if(data.privateKey){setPrivateKey(data.privateKey);setShowPrivateKey(true);}
                    loadWallet();
                  }} style={{padding:"10px 20px",background:C.cold,border:"none",borderRadius:8,color:"white",cursor:"pointer",fontSize:12,fontWeight:600}}>Generate Wallet</button>
                </div>
              )}
            </div>

            {/* Withdraw */}
            {wallet?.has_wallet&&(wallet?.balance_eth||0)>0.001&&(
              <div style={{background:C.surface,borderRadius:14,padding:20,border:`1px solid ${C.border}`,marginBottom:16}}>
                <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10,display:"flex",alignItems:"center",gap:4}}><DollarSign size={11}/>Withdraw</div>
                <div style={{fontSize:11,color:C.muted,marginBottom:10}}>Send ETH from your agent wallet to any address. No additional fee on withdrawals.</div>
                <input value={withdrawForm.address} onChange={e=>setWithdrawForm(f=>({...f,address:e.target.value}))} placeholder="Destination address (0x...)" style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"monospace",marginBottom:8}}/>
                <div style={{display:"flex",gap:8}}>
                  <input value={withdrawForm.amount} onChange={e=>setWithdrawForm(f=>({...f,amount:e.target.value}))} placeholder="Amount ETH" type="number" step="0.001" style={{flex:1,background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"monospace"}}/>
                  <button onClick={handleWithdraw} disabled={withdrawing||!withdrawForm.address||!withdrawForm.amount} style={{padding:"8px 16px",background:C.cold,border:"none",borderRadius:8,color:"white",cursor:withdrawForm.address&&withdrawForm.amount?"pointer":"not-allowed",fontSize:12,fontWeight:600,opacity:withdrawing?0.5:1}}>{withdrawing?"Sending...":"Withdraw"}</button>
                </div>
                {withdrawForm.amount&&<div style={{fontSize:10,color:C.dim,marginTop:6}}>Full amount sent — no withdrawal fee.</div>}
              </div>
            )}

            {/* Trading Controls */}
            <div style={{background:C.surface,borderRadius:14,padding:20,border:`1px solid ${C.border}`,marginBottom:16}}>
              <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14,display:"flex",alignItems:"center",gap:4}}><Settings size={11}/>Trading Settings</div>

              <div style={{marginBottom:16}}>
                <div style={{fontSize:12,color:C.text,fontWeight:600,marginBottom:8}}>Risk Tolerance</div>
                <div style={{display:"flex",gap:8}}>
                  {(["conservative","balanced","degen"] as const).map(level=>{
                    const labels={conservative:"Conservative",balanced:"Balanced",degen:"Degen"};
                    const descs={conservative:"1% of portfolio traded.",balanced:"5% of portfolio traded.",degen:"20% of portfolio traded."};
                    const colors={conservative:C.match,balanced:C.warn,degen:C.hot};
                    const active=wallet?.risk_level===level;
                    return(<button key={level} onClick={()=>updateWalletSettings({risk_level:level})} style={{flex:1,background:active?`${colors[level]}15`:C.s2,border:`1px solid ${active?colors[level]+"44":C.border}`,borderRadius:10,padding:12,cursor:"pointer",textAlign:"left"}}>
                      <div style={{fontSize:12,fontWeight:700,color:active?colors[level]:C.muted}}>{labels[level]}</div>
                      <div style={{fontSize:10,color:C.dim,marginTop:2}}>{descs[level]}</div>
                    </button>);
                  })}
                </div>
              </div>

              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderTop:`1px solid ${C.border}`}}>
                <div><div style={{fontSize:13,fontWeight:600}}>Autonomous Trading</div><div style={{fontSize:11,color:C.muted}}>Agent trades tokens on Base from your wallet</div></div>
                <button onClick={()=>{
                  if(wallet?.trading_enabled){updateWalletSettings({trading_enabled:false});}
                  else{updateWalletSettings({trading_enabled:true});}
                }}
                  style={{width:48,height:26,borderRadius:13,background:wallet?.trading_enabled?C.cold:C.s2,border:`1px solid ${wallet?.trading_enabled?C.cold:C.border}`,cursor:"pointer",position:"relative",transition:"all 0.2s"}}>
                  <div style={{width:20,height:20,borderRadius:"50%",background:"white",position:"absolute",top:2,left:wallet?.trading_enabled?24:2,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
                </button>
              </div>
            </div>

            {/* Trading Activity */}
            {trades.length>0&&(<div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10,display:"flex",alignItems:"center",gap:4}}><TrendingUp size={11}/>Trading History</div>
              {trades.slice(0,8).map((t:any,i:number)=>{
                const isProfit=t.action==="sell"&&t.pnl_eth>0;
                return(<div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,marginBottom:6}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:C.s2,display:"flex",alignItems:"center",justifyContent:"center"}}>{t.action==="buy"?<TrendingUp size={14} color={C.cyan}/>:<DollarSign size={14} color={isProfit?C.match:C.hot}/>}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600}}>{t.action==="buy"?"Bought":"Sold"} {t.token_symbol}</div>
                    {t.reasoning&&<div style={{fontSize:10,color:C.dim,marginTop:2}}>{t.reasoning}</div>}
                    <div style={{fontSize:10,color:C.dim}}>{new Date(t.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:700,color:isProfit?C.match:t.action==="sell"?C.hot:C.text}}>{t.action==="sell"?(t.pnl_eth>=0?"+":"")+t.pnl_eth.toFixed(4)+" ETH":t.amount_eth.toFixed(4)+" ETH"}</div>
                    {t.tx_hash&&<a href={`https://basescan.org/tx/${t.tx_hash}`} target="_blank" rel="noopener" style={{fontSize:9,color:C.cyan,textDecoration:"none"}}>{t.tx_hash.slice(0,10)}...</a>}
                  </div>
                </div>);
              })}
            </div>)}

            {trades.length===0&&!wallet?.has_wallet&&(<div style={{textAlign:"center",padding:30,color:C.dim,fontSize:12}}>Generate your wallet above to get started.</div>)}
            {trades.length===0&&wallet?.has_wallet&&(wallet?.balance_eth||0)<0.001&&(<div style={{textAlign:"center",padding:30,color:C.dim,fontSize:12}}>Send ETH on Base to your wallet address above to activate your agent.</div>)}
          </div>)}
        </div>)}

        {/* ════ MATCH NFTS ════ */}
        {view==="nfts"&&(<div>
          <h2 style={{fontSize:20,fontWeight:700,marginBottom:16,display:"flex",alignItems:"center",gap:8}}><Award size={20}/>Match NFTs</h2>

          {nftLoading&&<div style={{textAlign:"center",padding:60,color:C.muted}}>Loading NFTs...</div>}

          {!nftLoading&&(<div>
            {/* Mintable matches */}
            {mintableNfts.length>0&&(<div style={{marginBottom:24}}>
              <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Mint Your Matches</div>
              {mintableNfts.map(m=>{
                const tierColors:Record<string,string>={Legendary:"#FFD700",Epic:"#A855F7",Rare:"#06B6D4",Common:"#6366F1"};
                const tc=tierColors[m.tier]||"#6366F1";
                return(<div key={m.matchId} style={{display:"flex",alignItems:"center",gap:14,padding:16,background:C.surface,borderRadius:12,border:`1px solid ${tc}33`,marginBottom:8}}>
                  <div style={{width:50,height:50,borderRadius:10,background:`${tc}15`,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${tc}44`}}>
                    <div style={{fontSize:18,fontWeight:800,color:tc}}>{m.score}%</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14}}>{m.userAName} × {m.userBName}</div>
                    <div style={{fontSize:11,color:C.muted}}>{m.tier} Match · {m.matchDate}</div>
                  </div>
                  <button onClick={()=>mintNft(m.matchId)} disabled={mintingMatch===m.matchId}
                    style={{padding:"8px 16px",background:`${tc}20`,border:`1px solid ${tc}44`,borderRadius:8,color:tc,cursor:mintingMatch===m.matchId?"wait":"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",opacity:mintingMatch===m.matchId?0.5:1}}>
                    <Award size={12} style={{display:"inline",verticalAlign:"middle",marginRight:4}}/>{mintingMatch===m.matchId?"Minting...":"Mint — 0.01 ETH"}
                  </button>
                </div>);
              })}
            </div>)}

            {/* Minted NFT Gallery */}
            {nfts.length>0&&(<div>
              <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Your Collection</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
                {nfts.map(nft=>{
                  const svgDataUri="data:image/svg+xml;base64,"+btoa(nft.previewSvg);
                  return(<div key={nft.matchId} style={{background:C.surface,borderRadius:14,overflow:"hidden",border:`1px solid ${nft.tierColor}33`}}>
                    {/* NFT Image */}
                    <div style={{width:"100%",aspectRatio:"1",background:`url('${svgDataUri}') center/cover`,position:"relative"}}>
                      <div style={{position:"absolute",top:8,right:8,padding:"4px 10px",background:`${nft.tierColor}cc`,borderRadius:6,fontSize:10,fontWeight:700,color:"white"}}>{nft.tier}</div>
                    </div>
                    {/* Info */}
                    <div style={{padding:14}}>
                      <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{nft.userAName} × {nft.userBName}</div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <span style={{fontSize:22,fontWeight:800,color:nft.tierColor}}>{nft.score}%</span>
                        <span style={{fontSize:11,color:C.muted}}>{nft.matchDate}</span>
                      </div>
                      {nft.reasoning&&<div style={{fontSize:11,color:C.dim,lineHeight:1.4,marginBottom:8}}>{nft.reasoning.slice(0,100)}{nft.reasoning.length>100?"...":""}</div>}
                      <div style={{display:"flex",gap:6}}>
                        {nft.txHash&&<a href={`https://basescan.org/tx/${nft.txHash}`} target="_blank" rel="noopener" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"6px 10px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:6,color:C.cyan,fontSize:10,textDecoration:"none"}}><ExternalLink size={10}/>BaseScan</a>}
                        <a href={`https://opensea.io/assets/base/${process.env.NEXT_PUBLIC_NFT_CONTRACT||""}/${nft.nftTokenId?.split(",")[0]||""}`} target="_blank" rel="noopener" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"6px 10px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:6,color:C.muted,fontSize:10,textDecoration:"none"}}><Globe size={10}/>OpenSea</a>
                      </div>
                    </div>
                  </div>);
                })}
              </div>
            </div>)}

            {nfts.length===0&&mintableNfts.length===0&&(
              <div style={{textAlign:"center",padding:60,color:C.dim}}>
                <Award size={40} style={{marginBottom:12,opacity:0.3}}/>
                <div style={{fontSize:14}}>No match NFTs yet.</div>
                <div style={{fontSize:12,marginTop:8}}>Accept matches to unlock minting. Each NFT costs 0.01 ETH with on-chain generative art.</div>
              </div>
            )}
          </div>)}
        </div>)}

        {/* ════ GROUP MESH ════ */}
        {view==="groups"&&(<div>
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

        {/* ════ REFERRALS ════ */}
        {view==="referrals"&&(<div>
          <h2 style={{fontSize:20,fontWeight:700,marginBottom:16,display:"flex",alignItems:"center",gap:8}}><Share2 size={20}/>Referrals</h2>

          {/* Referral Link */}
          <div style={{background:C.surface,borderRadius:14,padding:20,border:`1px solid ${C.cold}33`,marginBottom:16}}>
            <div style={{fontSize:10,color:C.cold,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Your Referral Link</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <code style={{flex:1,fontSize:13,color:C.cyan,fontFamily:"monospace",padding:"10px 14px",background:C.s2,borderRadius:8,border:`1px solid ${C.border}`}}>mishmesh.ai/join/{user?.referral_code||user?.id?.slice(0,8)}</code>
              <button onClick={()=>{navigator.clipboard?.writeText(`https://mishmesh.ai/join/${user?.referral_code||user?.id?.slice(0,8)}`);}} style={{background:C.cold,border:"none",borderRadius:8,padding:"10px 14px",cursor:"pointer",color:"white",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:4,flexShrink:0}}><Copy size={12}/>Copy</button>
            </div>
          </div>

          {/* Stats + Progress */}
          <div style={{background:C.surface,borderRadius:14,padding:20,border:`1px solid ${C.border}`,marginBottom:16}}>
            <div style={{fontSize:28,fontWeight:900,textAlign:"center"}}>{referralStats?.referral_count||0}</div>
            <div style={{fontSize:12,color:C.muted,textAlign:"center",marginBottom:16}}>people joined through you</div>

            {/* Rewards Ladder */}
            {([
              {count:5,label:"Priority Matching",desc:"Your agent goes first in queue",type:"priority_matching"},
              {count:10,label:"Pro Free Month",desc:"All Pro features for 30 days",type:"pro_free_month"},
              {count:25,label:"Founding Member",desc:"Permanent badge on your profile",type:"founding_member"},
              {count:50,label:"Lifetime Pro",desc:"Pro features forever",type:"lifetime_pro"},
              {count:100,label:"Homepage Featured",desc:"Featured on homepage + custom agent",type:"homepage_featured"},
            ] as const).map(reward=>{
              const rc=referralStats?.referral_count||0;
              const unlocked=rc>=reward.count;
              const progress=Math.min(100,(rc/reward.count)*100);
              return(<div key={reward.type} style={{padding:"14px 0",borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:unlocked?`${C.match}20`:C.s2,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${unlocked?C.match:C.border}`,flexShrink:0}}>
                  {unlocked?<CheckCircle size={16} color={C.match}/>:<span style={{fontSize:12,fontWeight:700,color:C.muted}}>{reward.count}</span>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:unlocked?C.match:C.text}}>{reward.label}</div>
                  <div style={{fontSize:11,color:C.muted}}>{reward.desc}</div>
                  {!unlocked&&(<div style={{marginTop:6,height:4,borderRadius:2,background:C.s2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${progress}%`,background:`linear-gradient(90deg,${C.cold},${C.cyan})`,borderRadius:2,transition:"width 0.5s"}}/>
                  </div>)}
                  {!unlocked&&<div style={{fontSize:10,color:C.dim,marginTop:4}}>{reward.count-rc} more to unlock</div>}
                </div>
              </div>);
            })}
          </div>

          {/* Share buttons */}
          <div style={{display:"flex",gap:10}}>
            <a href={`https://x.com/intent/tweet?text=${encodeURIComponent(`My AI agent networks while I sleep on @MishMeshAI\n\nJoin the mesh: mishmesh.ai/join/${user?.referral_code||""}`)}`} target="_blank" rel="noopener" style={{textDecoration:"none",flex:1}}>
              <Btn primary style={{width:"100%",justifyContent:"center"}}><Share2 size={14}/>Share on X</Btn>
            </a>
            <Btn ghost onClick={()=>{navigator.clipboard?.writeText(`https://mishmesh.ai/join/${user?.referral_code||""}`);}} style={{flex:1,justifyContent:"center"}}><Copy size={14}/>Copy Link</Btn>
          </div>
        </div>)}

        {/* ════ NOTIFICATION SETTINGS ════ */}
        {view==="settings"&&(<div>
          <h2 style={{fontSize:20,fontWeight:700,marginBottom:16,display:"flex",alignItems:"center",gap:8}}><Cpu size={20}/>AI Brain & Notifications</h2>

          {/* ── Connect Your AI ── */}
          <div style={{background:C.surface,borderRadius:14,padding:20,border:`1px solid ${aiCurrent?.connected?C.match+"44":C.cold+"44"}`,marginBottom:16}}>
            <div style={{fontSize:10,color:C.cold,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14,display:"flex",alignItems:"center",gap:6}}>
              <Cpu size={12}/>Connect Your AI {aiCurrent?.connected&&<span style={{color:C.match,fontSize:10}}> Connected</span>}
            </div>

            {aiCurrent?.connected?(
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:C.s2,borderRadius:10,marginBottom:12}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>{(aiCurrent.provider||"openai").charAt(0).toUpperCase()+(aiCurrent.provider||"").slice(1)} — {aiCurrent.model}</div>
                    <div style={{fontSize:11,color:C.muted,fontFamily:"monospace"}}>{aiCurrent.keyPreview}</div>
                  </div>
                  <button onClick={disconnectAi} style={{background:"transparent",border:`1px solid ${C.hot}44`,borderRadius:6,padding:"6px 12px",cursor:"pointer",color:C.hot,fontSize:11}}>Disconnect</button>
                </div>
                <div style={{fontSize:11,color:C.muted}}>Your agent uses YOUR API key. You pay your provider directly. MishMesh charges nothing for AI.</div>
              </div>
            ):(
              <div>
                <div style={{fontSize:12,color:C.muted,marginBottom:12,lineHeight:1.6}}>Your agent needs an AI brain. Connect your own API key — you pay your provider directly. MishMesh never sees your calls.</div>

                {/* Provider select */}
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Provider</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {(aiProviders.length?aiProviders:[
                      {id:"openai",name:"OpenAI",cost:"~$0.30"},
                      {id:"anthropic",name:"Anthropic",cost:"~$3.00"},
                      {id:"google",name:"Google",cost:"~$0.15"},
                      {id:"groq",name:"Groq",cost:"~$0.12"},
                      {id:"openrouter",name:"OpenRouter",cost:"~$0.30"},
                      {id:"custom",name:"Custom",cost:"Varies"},
                    ]).map((p:any)=>(
                      <button key={p.id} onClick={()=>{setAiForm(f=>({...f,provider:p.id,model:p.models?.[0]||"gpt-4o-mini"}));setAiTestResult(null);}}
                        style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${aiForm.provider===p.id?C.cold:C.border}`,background:aiForm.provider===p.id?`${C.cold}15`:C.s2,cursor:"pointer",fontSize:11,fontWeight:aiForm.provider===p.id?700:400,color:aiForm.provider===p.id?C.cold:C.muted}}>
                        {p.name}<span style={{fontSize:9,display:"block",color:C.dim}}>{p.cost}/match</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model select */}
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Model</div>
                  <select value={aiForm.model} onChange={e=>setAiForm(f=>({...f,model:e.target.value}))}
                    style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}>
                    {(aiProviders.find((p:any)=>p.id===aiForm.provider)?.models||["gpt-4o-mini"]).map((m:string)=>(
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* API Key */}
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:4}}>API Key</div>
                  <input type="password" value={aiForm.apiKey} onChange={e=>setAiForm(f=>({...f,apiKey:e.target.value}))} placeholder={aiForm.provider==="openai"?"sk-proj-...":aiForm.provider==="anthropic"?"sk-ant-...":"Your API key"}
                    style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"monospace"}}/>
                </div>

                {/* Custom endpoint */}
                {aiForm.provider==="custom"&&(
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:11,color:C.muted,marginBottom:4}}>API Endpoint (OpenAI-compatible)</div>
                    <input value={aiForm.endpoint} onChange={e=>setAiForm(f=>({...f,endpoint:e.target.value}))} placeholder="https://your-api.com/v1/chat/completions"
                      style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"monospace"}}/>
                  </div>
                )}

                {/* Test + Save buttons */}
                <div style={{display:"flex",gap:8,marginTop:12}}>
                  <button onClick={testAiConnection} disabled={!aiForm.apiKey||aiTesting}
                    style={{flex:1,padding:"10px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:C.s2,cursor:aiForm.apiKey?"pointer":"not-allowed",color:aiForm.apiKey?C.text:C.dim,fontSize:12,fontWeight:600,opacity:aiTesting?0.5:1}}>
                    {aiTesting?"Testing...":" Test Connection"}
                  </button>
                  <button onClick={saveAiSettings} disabled={!aiForm.apiKey||!aiTestResult?.success}
                    style={{flex:1,padding:"10px 16px",borderRadius:8,border:"none",background:aiTestResult?.success?C.cold:C.s2,cursor:aiTestResult?.success?"pointer":"not-allowed",color:aiTestResult?.success?"white":C.dim,fontSize:12,fontWeight:600}}>
                    Save & Activate
                  </button>
                </div>

                {/* Test result */}
                {aiTestResult&&(
                  <div style={{marginTop:10,padding:10,borderRadius:8,background:aiTestResult.success?`${C.match}15`:`${C.hot}15`,border:`1px solid ${aiTestResult.success?C.match:C.hot}33`,fontSize:11,color:aiTestResult.success?C.match:C.hot}}>
                    {aiTestResult.success?` Connected! Response: "${aiTestResult.message}"`:` ${aiTestResult.message}`}
                  </div>
                )}

                <div style={{fontSize:10,color:C.dim,marginTop:10,display:"flex",alignItems:"center",gap:4}}><Shield size={10}/>Your key is stored encrypted. MishMesh never makes calls on your behalf — your agent uses your key directly.</div>
              </div>
            )}
          </div>

          {/* ── Notifications ── */}
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:8}}><Bell size={16}/>Notifications</h3>

          {/* Channels */}
          <div style={{background:C.surface,borderRadius:14,padding:20,border:`1px solid ${C.border}`,marginBottom:16}}>
            <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Channels</div>

            {/* Email */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
              <div><div style={{fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}}><Mail size={14}/>Email</div><div style={{fontSize:11,color:C.muted}}>Notifications to {user?.email}</div></div>
              <button onClick={()=>updateNotifSettings({email_enabled:!notifSettings?.email_enabled})}
                style={{width:48,height:26,borderRadius:13,background:notifSettings?.email_enabled?C.cold:C.s2,border:`1px solid ${notifSettings?.email_enabled?C.cold:C.border}`,cursor:"pointer",position:"relative",transition:"all 0.2s"}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:"white",position:"absolute",top:2,left:notifSettings?.email_enabled?24:2,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
              </button>
            </div>

            {/* Telegram */}
            <div style={{padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}}><Send size={14}/>Telegram</div>
                  <div style={{fontSize:11,color:C.muted}}>{notifSettings?.telegram_chat_id?"Connected — notifications active":"Get matches, trades, and alerts in Telegram"}</div>
                </div>
                {notifSettings?.telegram_chat_id?(
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,color:C.match,display:"flex",alignItems:"center",gap:4}}><CheckCircle size={12}/>Connected</span>
                    <button onClick={()=>updateNotifSettings({telegram_chat_id:null})} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 8px",cursor:"pointer",color:C.dim,fontSize:10}}>Disconnect</button>
                  </div>
                ):(
                  <a href={`https://t.me/MishMeshAiBot?start=${user?.id||""}`} target="_blank" rel="noopener"
                    style={{background:`linear-gradient(135deg,#0088cc,#0066aa)`,border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",color:"white",fontSize:12,fontWeight:600,textDecoration:"none",display:"flex",alignItems:"center",gap:6}}>
                    <Send size={13}/>Connect Telegram
                  </a>
                )}
              </div>
            </div>

            {/* Discord */}
            <div style={{padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:6,display:"flex",alignItems:"center",gap:6}}><Globe size={14}/>Discord</div>
              <input value={notifSettings?.discord_webhook_url||""} onChange={e=>updateNotifSettings({discord_webhook_url:e.target.value})} placeholder="Discord Webhook URL" style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}/>
            </div>

            {/* Webhook */}
            <div style={{padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:6,display:"flex",alignItems:"center",gap:6}}><ExternalLink size={14}/>Custom Webhook</div>
              <input value={notifSettings?.webhook_url||""} onChange={e=>updateNotifSettings({webhook_url:e.target.value})} placeholder="https://hooks.slack.com/... or any URL" style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit"}}/>
              <div style={{fontSize:10,color:C.dim,marginTop:4}}>We POST JSON with event data. Works with Slack, Zapier, custom apps.</div>
            </div>

            {/* OpenClaw */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0"}}>
              <div><div style={{fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}}><Cpu size={14}/>OpenClaw</div><div style={{fontSize:11,color:C.muted}}>Route through your OpenClaw agent channels</div></div>
              <button onClick={()=>updateNotifSettings({openclaw_enabled:!notifSettings?.openclaw_enabled})}
                style={{width:48,height:26,borderRadius:13,background:notifSettings?.openclaw_enabled?C.cold:C.s2,border:`1px solid ${notifSettings?.openclaw_enabled?C.cold:C.border}`,cursor:"pointer",position:"relative",transition:"all 0.2s"}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:"white",position:"absolute",top:2,left:notifSettings?.openclaw_enabled?24:2,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
              </button>
            </div>
          </div>

          {/* Event Toggles */}
          <div style={{background:C.surface,borderRadius:14,padding:20,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Events</div>
            {([
              {key:"notify_matches",label:"Matches",desc:"New match found, accepted, passed"},
              {key:"notify_messages",label:"Messages",desc:"New chat messages from connections"},
              {key:"notify_trades",label:"Trading",desc:"Agent bought/sold tokens, P&L updates"},
              {key:"notify_balance",label:"Balance",desc:"Low balance warnings, deposit confirmations"},
            ] as const).map(({key,label,desc})=>(
              <div key={key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div><div style={{fontSize:13,fontWeight:600}}>{label}</div><div style={{fontSize:11,color:C.muted}}>{desc}</div></div>
                <button onClick={()=>updateNotifSettings({[key]:!(notifSettings as any)?.[key]})}
                  style={{width:48,height:26,borderRadius:13,background:(notifSettings as any)?.[key]?C.cold:C.s2,border:`1px solid ${(notifSettings as any)?.[key]?C.cold:C.border}`,cursor:"pointer",position:"relative",transition:"all 0.2s"}}>
                  <div style={{width:20,height:20,borderRadius:"50%",background:"white",position:"absolute",top:2,left:(notifSettings as any)?.[key]?24:2,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
                </button>
              </div>
            ))}
          </div>

          {/* Developer API Access */}
          <div style={{background:C.surface,borderRadius:14,padding:20,border:`1px solid ${C.border}`,marginTop:16}}>
            <div style={{fontSize:10,color:C.cold,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14,display:"flex",alignItems:"center",gap:6}}>
              <Key size={12}/>Developer API Access
            </div>
            <p style={{fontSize:12,color:C.muted,marginBottom:12,lineHeight:1.5}}>Build your own interfaces, integrate matching into your apps, receive webhook notifications.</p>

            {devApiKeys.length>0?(
              <div style={{marginBottom:12}}>
                {devApiKeys.map((k:any)=>(
                  <div key={k.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:C.s2,borderRadius:10,marginBottom:6}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600}}>{k.name}</div>
                      <div style={{fontSize:11,color:C.dim,fontFamily:"monospace"}}>mm_{'•'.repeat(20)}</div>
                      <div style={{fontSize:10,color:C.muted}}>{k.calls_this_month} calls · expires {k.expires_at?new Date(k.expires_at).toLocaleDateString():"-"}</div>
                    </div>
                    <div style={{fontSize:10,padding:"3px 8px",borderRadius:4,background:k.active?`${C.match}15`:`${C.hot}15`,color:k.active?C.match:C.hot}}>{k.active?"Active":"Expired"}</div>
                  </div>
                ))}
              </div>
            ):null}

            <button onClick={generateDevApiKey} style={{padding:"10px 20px",background:`${C.cold}15`,border:`1px solid ${C.cold}33`,borderRadius:8,color:C.cold,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>
              <Key size={12} style={{display:"inline",verticalAlign:"middle",marginRight:4}}/>{devApiKeys.length?"Add Another Key":"Generate API Key — 0.01 ETH/month"}
            </button>
          </div>
        </div>)}

        {/* ════ PROFILE ════ */}
        {view==="profile"&&(<div>
          <h2 style={{fontSize:20,fontWeight:700,marginBottom:16}}>Your Profile</h2>
          <div style={{background:C.surface,borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20}}>
              <label style={{cursor:"pointer"}}>
                <input type="file" accept="image/*" onChange={uploadPhoto} style={{display:"none"}}/>
                <Avatar name={form.name} size={64} url={form.avatar_url}/>
              </label>
              <div>
                <div style={{fontWeight:700,fontSize:18,display:"flex",alignItems:"center",gap:8}}>{form.name}<TierBadge tier={user?.tier||"free"}/></div>
                <div style={{fontSize:13,color:C.muted}}>{form.industry}</div>
                {form.location&&<div style={{fontSize:12,color:C.dim,display:"flex",alignItems:"center",gap:4,marginTop:2}}><MapPin size={11}/>{form.location}</div>}
              </div>
            </div>
            {badges.length>0&&<div style={{marginBottom:16,display:"flex",flexWrap:"wrap",gap:6}}>{badges.map(b=><BadgeChip key={b.id} name={b.badge_name} type={b.badge_type}/>)}</div>}
            {([{k:"name",l:"Name"},{k:"bio",l:"Bio",m:true},{k:"building",l:"What I'm Building",m:true},{k:"looking_for",l:"What I'm Looking For",m:true},{k:"location",l:"Location"},{k:"website",l:"Website"},{k:"x_handle",l:"X Handle"}] as {k:string,l:string,m?:boolean}[]).map(({k,l,m})=>(
              <div key={k} style={{marginBottom:14}}>
                <label style={{fontSize:11,color:C.muted,marginBottom:4,display:"block"}}>{l}</label>
                {m?<textarea value={(form as any)[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} rows={2} style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:13,fontFamily:"inherit",resize:"vertical"}}/>
                :<input value={(form as any)[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:13,fontFamily:"inherit"}}/>}
              </div>
            ))}

            {/* Agent Personality */}
            <div style={{marginTop:16,marginBottom:14,padding:16,background:C.s2,borderRadius:12,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.1em"}}>Agent Personality</div>
              <label style={{fontSize:11,color:C.muted,marginBottom:4,display:"block"}}>How should your agent represent you?</label>
              <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
                {(["professional","friendly","aggressive","custom"] as const).map(s=>(
                  <button key={s} onClick={()=>setForm(f=>({...f,agent_style:s}))} style={{
                    padding:"6px 14px",fontSize:11,borderRadius:8,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize",
                    background:form.agent_style===s?C.cold:C.surface,color:form.agent_style===s?"white":C.muted,
                    border:`1px solid ${form.agent_style===s?C.cold:C.border}`,fontWeight:form.agent_style===s?600:400,
                  }}>{s}</button>
                ))}
              </div>
              {form.agent_style==="custom"&&(
                <div>
                  <label style={{fontSize:11,color:C.muted,marginBottom:4,display:"block"}}>Custom Instructions</label>
                  <textarea value={form.agent_instructions} onChange={e=>setForm(f=>({...f,agent_instructions:e.target.value}))} rows={3}
                    placeholder="e.g., Be direct, mention my track record in DeFi, focus on technical synergies..."
                    style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit",resize:"vertical"}}/>
                </div>
              )}
              <div style={{fontSize:10,color:C.dim,marginTop:8}}>This shapes how your agent talks during speed dates.</div>
            </div>

            <div style={{display:"flex",gap:10,marginTop:10,flexWrap:"wrap"}}>
              <Btn primary onClick={async()=>{
                if(!user)return;
                const{error}=await supabase.from("users").update({name:form.name,bio:form.bio,industry:form.industry,building:form.building,looking_for:form.looking_for,location:form.location,avatar_url:form.avatar_url,socials:{website:form.website,x:form.x_handle,linkedin:form.linkedin}}).eq("id",user.id);
                await supabase.from("agent_profiles").update({agent_style:form.agent_style,agent_instructions:form.agent_instructions}).eq("user_id",user.id);
                if(!error)alert("Profile saved!");
              }}><Check size={14}/>Save Changes</Btn>
              <Btn ghost onClick={()=>window.open(`/agent/${user?.id}`,"_blank")}><ExternalLink size={14}/>Public Profile</Btn>
              <Btn ghost onClick={()=>{const url=`https://mishmesh.ai/agent/${form.x_handle||user?.id}`;navigator.clipboard?.writeText(url);}}><Copy size={14}/>Copy Profile Link</Btn>
              <Btn danger onClick={signOut}><LogOut size={14}/>Sign Out</Btn>
            </div>
          </div>
        </div>)}

        {/* ════ NOTIFICATIONS ════ */}
        {view==="notifications"&&(<div>
          <h2 style={{fontSize:20,fontWeight:700,marginBottom:16}}>Notifications</h2>
          {notifications.length===0?<div style={{textAlign:"center",padding:60,color:C.dim}}>No notifications yet. Your agent will notify you.</div>:
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {notifications.map(n=>{
              const iconMap:Record<string,any>={new_match:Sparkles,match_accepted:CheckCircle,new_message:MessageCircle,agent_report:FileText,badge_earned:Award,deal_closed:DollarSign,challenge_complete:Target,system:Bell};
              const Ic=iconMap[n.type]||Bell;
              return(<div key={n.id} style={{background:n.read?C.surface:`${C.cold}08`,borderRadius:10,padding:14,border:`1px solid ${n.read?C.border:C.cold+"33"}`,cursor:"pointer",display:"flex",gap:12,alignItems:"flex-start"}}
                onClick={async()=>{
                  await supabase.from("notifications").update({read:true}).eq("id",n.id);
                  if(n.type==="new_match")setView("pending");
                  else if(n.type==="match_accepted")setView("matches");
                  loadNotifications(user.id);
                }}>
                <Ic size={16} color={n.read?C.dim:C.cold} style={{marginTop:2,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13}}>{n.title}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:2}}>{n.body}</div>
                  <div style={{fontSize:10,color:C.dim,marginTop:6}}>{new Date(n.created_at).toLocaleString()}</div>
                </div>
              </div>);
            })}
          </div>}
        </div>)}
      </div>

      {/* ═══ RISK DISCLAIMER MODAL ═══ */}
      {showRiskModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,zIndex:9999}}>
          <div style={{background:C.surface,borderRadius:16,maxWidth:520,width:"100%",maxHeight:"85vh",overflow:"auto",border:`1px solid ${C.hot}44`}}>
            <div style={{padding:"24px 24px 0"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:`${C.hot}20`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <AlertTriangle size={18} color={C.hot}/>
                </div>
                <div>
                  <div style={{fontSize:16,fontWeight:700,color:C.hot}}>Risk Disclaimer</div>
                  <div style={{fontSize:11,color:C.muted}}>Read carefully before enabling trading</div>
                </div>
              </div>
            </div>
            <div style={{padding:"0 24px",fontSize:12,lineHeight:1.7,color:C.muted,maxHeight:340,overflow:"auto"}}>
              <p style={{marginBottom:10}}><strong style={{color:C.text}}>Cryptocurrency trading involves substantial risk of loss.</strong> The value of digital assets can fluctuate significantly and you may lose some or all of your deposited funds.</p>
              <p style={{marginBottom:10}}><strong style={{color:C.text}}>Autonomous AI trading is experimental technology.</strong> Trading decisions are made by AI algorithms without human oversight. These algorithms may make poor decisions that result in financial losses.</p>
              <p style={{marginBottom:10}}><strong style={{color:C.text}}>Past performance does not guarantee future results.</strong> Market conditions can change rapidly and without warning.</p>
              <p style={{marginBottom:10}}><strong style={{color:C.text}}>Only deposit funds you can afford to lose entirely.</strong> Do not deposit funds needed for essential expenses.</p>
              <p style={{marginBottom:10}}>Additional risks include: smart contract bugs, network issues, exploits, low liquidity, slippage, oracle manipulation, and regulatory changes.</p>
              <p style={{marginBottom:10}}>MishMesh.ai is not responsible for any trading decisions made by AI agents. The Platform does not provide financial, investment, or trading advice.</p>
              <p>By enabling trading, you explicitly waive any claims against MishMesh.ai related to trading losses.</p>
              <p style={{marginTop:10}}><a href="/risk" target="_blank" style={{color:C.cold,textDecoration:"underline",fontSize:11}}>Read the full Risk Disclaimer</a></p>
            </div>
            <div style={{padding:24}}>
              <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginBottom:16,padding:"12px 14px",background:`${C.hot}10`,borderRadius:10,border:`1px solid ${riskAccepted?C.match+"44":C.hot+"33"}`}}>
                <input type="checkbox" checked={riskAccepted} onChange={e=>setRiskAccepted(e.target.checked)}
                  style={{marginTop:2,accentColor:C.match,width:18,height:18,flexShrink:0}}/>
                <span style={{fontSize:12,color:riskAccepted?C.match:C.text,lineHeight:1.5,fontWeight:600}}>
                  I understand that autonomous trading can lose money and I accept all risk. I have read the Risk Disclaimer.
                </span>
              </label>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>{setShowRiskModal(false);setRiskAccepted(false);}}
                  style={{flex:1,padding:"12px 16px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:10,color:C.muted,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit"}}>Cancel</button>
                <button onClick={async()=>{
                  if(!riskAccepted)return;
                  if(user?.id){await supabase.from("users").update({risk_accepted_at:new Date().toISOString()}).eq("id",user.id);}
                  await updateWalletSettings({trading_enabled:true});
                  setShowRiskModal(false);
                }} disabled={!riskAccepted}
                  style={{flex:1,padding:"12px 16px",background:riskAccepted?C.hot:C.s2,border:"none",borderRadius:10,color:riskAccepted?"white":C.dim,cursor:riskAccepted?"pointer":"not-allowed",fontSize:13,fontWeight:700,fontFamily:"inherit",opacity:riskAccepted?1:0.5}}>
                  Accept Risk &amp; Enable Trading
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
