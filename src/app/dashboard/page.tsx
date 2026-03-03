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
  cyan:"#06b6d4", purple:"#a855f7", pink:"#ec4899", gold:"#ffd700",
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
    const particles:N[]=Array.from({length:20},()=>({
      x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-0.5)*0.5,vy:(Math.random()-0.5)*0.5,
      color:Math.random()>0.6?C.cold:Math.random()>0.3?C.cyan:C.purple,label:"",r:1+Math.random()*1.5
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
          // "You" orb: slow wandering lissajous across the canvas
          n.x=W/2+Math.sin(t*0.25)*W*0.18+Math.sin(t*0.4+1.5)*W*0.08;
          n.y=H/2+Math.cos(t*0.2)*H*0.2+Math.cos(t*0.35+2)*H*0.06;
          n.r=12+Math.sin(t*1.2)*1.2; // breathing pulse
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
      nodes.forEach((n,i)=>{
        // Outer glow (bigger for "You" orb)
        const glowR=i===0?n.r*5:n.r*3;
        const g=ctx!.createRadialGradient(n.x,n.y,0,n.x,n.y,glowR);
        g.addColorStop(0,n.color+"40"); g.addColorStop(0.4,n.color+"15"); g.addColorStop(1,"transparent");
        ctx!.beginPath(); ctx!.arc(n.x,n.y,glowR,0,Math.PI*2); ctx!.fillStyle=g; ctx!.fill();

        if(i===0){
          // 3D sphere: dark base
          const baseG=ctx!.createRadialGradient(n.x-n.r*0.3,n.y-n.r*0.3,n.r*0.1,n.x,n.y,n.r);
          baseG.addColorStop(0,"#a5b4fc"); baseG.addColorStop(0.5,n.color); baseG.addColorStop(1,"#312e81");
          ctx!.beginPath(); ctx!.arc(n.x,n.y,n.r,0,Math.PI*2); ctx!.fillStyle=baseG; ctx!.fill();
          // Specular highlight
          const specG=ctx!.createRadialGradient(n.x-n.r*0.25,n.y-n.r*0.3,0,n.x-n.r*0.2,n.y-n.r*0.2,n.r*0.6);
          specG.addColorStop(0,"rgba(255,255,255,0.6)"); specG.addColorStop(0.4,"rgba(255,255,255,0.1)"); specG.addColorStop(1,"transparent");
          ctx!.beginPath(); ctx!.arc(n.x,n.y,n.r,0,Math.PI*2); ctx!.fillStyle=specG; ctx!.fill();
          // Rim light
          ctx!.beginPath(); ctx!.arc(n.x,n.y,n.r,0,Math.PI*2);
          ctx!.strokeStyle="rgba(165,180,252,0.3)"; ctx!.lineWidth=1.5; ctx!.stroke();
        }else{
          // Regular nodes — simple filled
          ctx!.beginPath(); ctx!.arc(n.x,n.y,n.r,0,Math.PI*2); ctx!.fillStyle=n.color; ctx!.fill();
        }
        // Label
        if(n.label){ctx!.font=`${i===0?"600 12":"400 9"}px system-ui`; ctx!.fillStyle=i===0?C.text:C.muted; ctx!.textAlign="center"; ctx!.fillText(n.label,n.x,n.y+n.r+14);}
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
  const[sendTo,setSendTo]=useState("");
  const[sendAmt,setSendAmt]=useState("");
  const[onboarding,setOnboarding]=useState(false);
  const[replayData,setReplayData]=useState<any>(null);
  const[shareMatch,setShareMatch]=useState<any>(null);
  const[dealMatch,setDealMatch]=useState<any>(null);
  const[lbTab,setLbTab]=useState("builders");
  const chatEndRef=useRef<HTMLDivElement>(null);
  // Crypto + referrals + notifications state
  const[wallet,setWallet]=useState<any>({risk_level:"conservative",trading_enabled:false,balance_eth:0,has_wallet:false});
  const[stratOpen,setStratOpen]=useState(false);
  const[riskOpen,setRiskOpen]=useState(false);
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
  const[emergencySelling,setEmergencySelling]=useState(false);
  const[emergencyResult,setEmergencyResult]=useState<any>(null);
  const[showEmergencyConfirm,setShowEmergencyConfirm]=useState(false);
  const[showReEnableConfirm,setShowReEnableConfirm]=useState(false);
  const[feedEvents,setFeedEvents]=useState<any[]>([]);
  const[feedStats,setFeedStats]=useState<any>(null);
  // Buzz tab state
  const[buzzPerf,setBuzzPerf]=useState<any>(null);
  const[buzzTrades,setBuzzTrades]=useState<any[]>([]);
  const[buzzPnlSeries,setBuzzPnlSeries]=useState<any[]>([]);
  const[buzzTimeframe,setBuzzTimeframe]=useState<"daily"|"weekly"|"all">("all");

  const[form,setForm]=useState({name:"",bio:"",industry:"",building:"",looking_for:"",location:"",website:"",x_handle:"",linkedin:"",avatar_url:"",agent_style:"professional",agent_instructions:""});
  const[obStep,setObStep]=useState(1);
  const[showWalletDrop,setShowWalletDrop]=useState(false);
  const obSteps=[{n:1,l:"Profile"},{n:2,l:"Industry & Goals"},{n:3,l:"AI Brain"},{n:4,l:"Personality"}];
  const obCanNext=obStep===1?!!(form.name):obStep===2?!!(form.building&&form.looking_for):true;

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

    // Real-time wallet balance polling (10s) — instant deposit detection
    const walletPoll=setInterval(()=>{
      fetch("/api/wallet").then(r=>r.json()).then(data=>{
        if(data&&!data.error){
          setWallet((prev:any)=>{
            // Flash effect if balance changed
            if(prev.balance_eth!==undefined&&data.balance_eth!==prev.balance_eth&&data.balance_eth>prev.balance_eth){
              // Deposit detected — could trigger toast here
            }
            return{...prev,...data};
          });
          setTrades(data.recent_trades||[]);
        }
      }).catch(()=>{});
    },10000);
    return()=>clearInterval(walletPoll);

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

  async function loadFeed(){
    try{
      const[evRes,stRes]=await Promise.all([
        fetch("/api/feed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"list",limit:30})}),
        fetch("/api/feed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"stats"})}),
      ]);
      const[evData,stData]=await Promise.all([evRes.json(),stRes.json()]);
      if(evData.events)setFeedEvents(evData.events);
      if(stData.reputation!=null)setFeedStats(stData);
    }catch{}
  }

  // Poll feed every 10s
  useEffect(()=>{
    loadFeed();
    const iv=setInterval(loadFeed,10000);
    return()=>clearInterval(iv);
  },[]);

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

  async function loadBuzzData(){
    try{
      const res=await fetch("/api/performance");
      const data=await res.json();
      setBuzzPerf(data.performance||null);
      setBuzzTrades(data.recent_trades||[]);
      setBuzzPnlSeries(data.pnl_series||[]);
    }catch(e){console.error("Buzz load error:",e);}
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
    // Trigger delayed first match (2-10 min random delay, runs in background)
    fetch("/api/match/delayed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:user.id})}).catch(()=>{});
    // Award first badge
    await supabase.from("badges").upsert({user_id:user.id,badge_type:"first_agent",badge_name:"Agent Deployed",badge_description:"Launched your first AI agent"},{onConflict:"user_id,badge_type"});
  }

  async function uploadPhoto(e:React.ChangeEvent<HTMLInputElement>){
    let file=e.target.files?.[0]; if(!file||!user)return;
    // Convert HEIC/HEIF or any non-web format to JPEG via canvas
    if(!["image/jpeg","image/png","image/gif","image/webp"].includes(file.type)){
      try{
        const bitmap=await createImageBitmap(file);
        const canvas=document.createElement("canvas");
        canvas.width=bitmap.width; canvas.height=bitmap.height;
        const ctx=canvas.getContext("2d")!;
        ctx.drawImage(bitmap,0,0);
        const blob=await new Promise<Blob>((res,rej)=>canvas.toBlob(b=>b?res(b):rej(new Error("Conversion failed")),"image/jpeg",0.9));
        file=new File([blob],file.name.replace(/\.\w+$/,".jpg"),{type:"image/jpeg"});
      }catch(convErr){
        console.error("Image conversion error:",convErr);
        alert("Could not process this image format. Try a JPEG or PNG instead.");
        return;
      }
    }
    // Resize large images to max 800px for avatars
    try{
      const bitmap=await createImageBitmap(file);
      if(bitmap.width>800||bitmap.height>800){
        const scale=800/Math.max(bitmap.width,bitmap.height);
        const canvas=document.createElement("canvas");
        canvas.width=Math.round(bitmap.width*scale); canvas.height=Math.round(bitmap.height*scale);
        const ctx=canvas.getContext("2d")!;
        ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
        const blob=await new Promise<Blob>((res,rej)=>canvas.toBlob(b=>b?res(b):rej(new Error("Resize failed")),"image/jpeg",0.9));
        file=new File([blob],file.name.replace(/\.\w+$/,".jpg"),{type:"image/jpeg"});
      }
    }catch{}
    const path=`${user.id}/${Date.now()}-${file.name}`;
    const{error}=await supabase.storage.from("avatars").upload(path,file,{upsert:true,contentType:file.type});
    if(error){
      console.error("Upload error:",error);
      alert("Photo upload failed: "+error.message);
      return;
    }
    const{data:{publicUrl}}=supabase.storage.from("avatars").getPublicUrl(path);
    setForm(f=>({...f,avatar_url:publicUrl}));
    setUser((u:any)=>({...u,avatar_url:publicUrl}));
    // Persist to DB immediately
    await supabase.from("users").update({avatar_url:publicUrl}).eq("id",user.id);
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
            {obStep===1?"Create your identity":obStep===2?"What drives you?":obStep===3?"Power up your agent":"Set the vibe"}
          </h1>
          <p style={{color:C.muted,marginTop:6,fontSize:13}}>
            {obStep===1?"Photo + username. 30 seconds.":obStep===2?"Your agent uses this to find your people.":obStep===3?"Give it a brain and it starts networking for you. Skip if you want — add later.":"Last step. How should your agent represent you?"}
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
                <div style={{width:88,height:88,borderRadius:"50%",background:`linear-gradient(135deg,${C.cold}15,${C.cyan}10)`,border:`2px dashed ${C.cold}55`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}><Camera size={24} color={C.cold}/><span style={{fontSize:8,color:C.muted,fontWeight:600}}>OPTIONAL</span></div>}
                <div style={{fontSize:11,color:form.avatar_url?C.match:C.cold,marginTop:6,fontWeight:600}}>{form.avatar_url?"Looking good":"Tap to upload"}</div>
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
                    {id:"xai",name:"xAI (Grok)",cost:"~$0.30"},
                    {id:"groq",name:"Groq",cost:"~$0.12"},
                    {id:"openrouter",name:"OpenRouter",cost:"~$0.30"},
                  ].map((p)=>(
                    <button key={p.id} onClick={()=>{const defaults:any={"openai":"gpt-4o-mini","anthropic":"claude-sonnet-4-20250514","google":"gemini-2.0-flash","xai":"grok-3-mini","groq":"llama-3.1-70b-versatile","openrouter":"openai/gpt-4o-mini","custom":"default"};setAiForm(f=>({...f,provider:p.id,model:defaults[p.id]||"gpt-4o-mini"}));setAiTestResult(null);}}
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

  /* ═══ Emergency Sell Confirmation Modal ═══ */
  if(showEmergencyConfirm)return(
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.9)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:20,maxWidth:420,width:"100%",border:`1px solid ${C.hot}44`}}>
        <div style={{padding:"20px 24px",textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:12}}>🛑</div>
          <div style={{fontSize:20,fontWeight:800,color:C.hot,marginBottom:8}}>EMERGENCY STOP</div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:16}}>
            This will <strong style={{color:C.hot}}>immediately market-sell ALL open positions</strong> with up to 10% slippage tolerance. 3% trade fee applies to each sell.
          </div>
          <div style={{padding:"10px 14px",background:`${C.hot}10`,borderRadius:8,border:`1px solid ${C.hot}33`,fontSize:11,color:C.hot,marginBottom:16}}>
            ⚠️ Market sells may execute at unfavorable prices. This action cannot be undone.
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setShowEmergencyConfirm(false)} style={{flex:1,padding:"12px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            <button onClick={async()=>{
              setShowEmergencyConfirm(false);
              setEmergencySelling(true);setEmergencyResult(null);
              try{
                const res=await fetch("/api/emergency",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"sell_all"})});
                const data=await res.json();
                setEmergencyResult(data);
                if(data.ok){setWallet((w:any)=>({...w,trading_enabled:false}));loadWallet();}
              }catch(e:any){setEmergencyResult({ok:false,error:e.message});}
              setEmergencySelling(false);
            }} style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:C.hot,color:"white",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
              🛑 SELL ALL NOW
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ═══ Re-enable Trading Confirmation ═══ */
  if(showReEnableConfirm)return(
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.9)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:20,maxWidth:400,width:"100%",border:`1px solid ${C.cold}44`}}>
        <div style={{padding:"20px 24px",textAlign:"center"}}>
          <div style={{fontSize:36,marginBottom:12}}>⚡</div>
          <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>Re-enable Trading?</div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:16}}>
            Your agent will resume autonomous trading with your current strategy and risk settings.
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setShowReEnableConfirm(false)} style={{flex:1,padding:"12px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            <button onClick={async()=>{
              setShowReEnableConfirm(false);
              try{
                await fetch("/api/emergency",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"re_enable"})});
                setWallet((w:any)=>({...w,trading_enabled:true}));
                setEmergencyResult(null);
              }catch{}
            }} style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:C.cold,color:"white",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
              Re-enable Trading
            </button>
          </div>
        </div>
      </div>
    </div>
  );

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
      {/* Base ETH Banner */}
      <div style={{position:"sticky",top:0,left:0,right:0,zIndex:1000,background:"linear-gradient(90deg,rgba(0,82,255,0.12),rgba(99,102,241,0.10),rgba(6,182,212,0.08))",borderBottom:"1px solid rgba(99,102,241,0.1)",padding:"6px 16px",textAlign:"center",fontSize:10,fontWeight:500,color:"rgba(165,180,252,0.8)",letterSpacing:"0.5px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,animation:"banner-glow 4s ease-in-out infinite"}}>
        <style>{`@keyframes banner-glow{0%,100%{background:linear-gradient(90deg,rgba(0,82,255,0.10),rgba(99,102,241,0.08),rgba(6,182,212,0.06))}50%{background:linear-gradient(90deg,rgba(0,82,255,0.18),rgba(99,102,241,0.14),rgba(6,182,212,0.10))}}@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(1.4)}}@keyframes mm-brain-pulse{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}@keyframes mm-brain-glow{0%,100%{box-shadow:0 0 8px rgba(99,102,241,0.15)}50%{box-shadow:0 0 18px rgba(99,102,241,0.35),0 0 8px rgba(6,182,212,0.2)}}@keyframes txn-slide{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#FF9F0A;border:2px solid rgba(0,0,0,0.3);cursor:pointer;box-shadow:0 0 8px rgba(255,159,10,0.4)}input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#FF9F0A;border:2px solid rgba(0,0,0,0.3);cursor:pointer;box-shadow:0 0 8px rgba(255,159,10,0.4)}`}</style>
        <span style={{display:"inline-flex",alignItems:"center",gap:4}}><svg width="14" height="14" viewBox="0 0 111 111" style={{verticalAlign:"-2px"}} fill="none"><circle cx="55.5" cy="55.5" r="55.5" fill="#0052FF"/><path d="M55.7 14.7c-22.6 0-40.8 18.3-40.8 40.8s18.3 40.8 40.8 40.8 40.8-18.3 40.8-40.8H55.7V14.7z" fill="white"/></svg> Powered by AI & Base L2</span>
        <span style={{opacity:0.3}}>·</span>
        <span>All deposits & trades use ETH on Base</span>
      </div>
      {showWalletDrop&&<div onClick={()=>setShowWalletDrop(false)} style={{position:"fixed",inset:0,zIndex:998}}/>}
      {/* ── Nav ── */}
      <nav style={{padding:"4px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>window.location.href="/landing.html"}>
          <MMLogo size={32}/><span style={{fontWeight:700,fontSize:15}}>MishMesh</span>
          {(()=>{const aiOn=!!user?.ai_api_key_encrypted;return(
            <div onClick={(e)=>{e.stopPropagation();setView("settings");}} title={aiOn?"AI Brain Connected":"Connect AI Brain"} style={{
              width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative",transition:"all 0.3s",
              background:aiOn?"linear-gradient(135deg,rgba(99,102,241,0.15),rgba(6,182,212,0.15))":"rgba(255,255,255,0.04)",
              border:aiOn?"1.5px solid rgba(99,102,241,0.4)":"1.5px solid rgba(255,255,255,0.1)",
              boxShadow:aiOn?"0 0 12px rgba(99,102,241,0.2)":"none",
              animation:aiOn?"mm-brain-glow 3s ease-in-out infinite":"mm-brain-pulse 2s ease-in-out infinite",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={aiOn?"url(#dbg)":"#6b6b80"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <defs><linearGradient id="dbg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#06b6d4"/></linearGradient></defs>
                <path d="M9.5 2a3.5 3.5 0 0 0-3.4 4.3A3.5 3.5 0 0 0 4 9.8a3.5 3.5 0 0 0 .7 3.5A3.5 3.5 0 0 0 6 17a3.5 3.5 0 0 0 3.5 3h1V2z"/><path d="M14.5 2a3.5 3.5 0 0 1 3.4 4.3A3.5 3.5 0 0 1 20 9.8a3.5 3.5 0 0 1-.7 3.5A3.5 3.5 0 0 1 18 17a3.5 3.5 0 0 1-3.5 3h-1V2z"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M12 2v20"/><path d="M8 14c1.3.7 2.7.7 4 0"/><path d="M12 14c1.3.7 2.7.7 4 0"/>
              </svg>
              {!aiOn&&<span style={{position:"absolute",top:-2,right:-2,width:7,height:7,borderRadius:"50%",background:"#ff2d55",boxShadow:"0 0 6px #ff2d55",animation:"pulse 1.2s infinite"}}/>}
            </div>);})()}
          <TierBadge tier={user?.tier||"free"}/>
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
                <div style={{fontSize:10,color:C.dim,marginBottom:8,fontFamily:"monospace",wordBreak:"break-all"}}>{(wallet?.wallet_address||user?.wallet_address)?.slice(0,6)}...{(wallet?.wallet_address||user?.wallet_address)?.slice(-4)}</div>
                <button onClick={()=>{const addr=wallet?.wallet_address||user?.wallet_address;if(addr){navigator.clipboard?.writeText(addr);}setShowWalletDrop(false);}} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${C.cold},${C.cyan})`,color:"white",fontSize:12,fontWeight:700,cursor:"pointer",marginBottom:6,fontFamily:"inherit",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}><Zap size={12}/>Fund Wallet (Copy Address)</button>
                <button onClick={()=>{setShowWalletDrop(false);setView("wallet");}} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.text,fontSize:12,fontWeight:600,cursor:"pointer",marginBottom:6,fontFamily:"inherit",textAlign:"left"}}>View Wallet</button>
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
          {id:"mesh",label:"The Mesh",icon:<BarChart3 size={13}/>},
          {id:"brew",label:"The Brew",icon:<Cpu size={13}/>},
          {id:"buzz",label:"The Buzz",icon:<TrendingUp size={13}/>},
          {id:"evolve",label:"Evolve",icon:<Sparkles size={13}/>},
        ].map(t=>(
          <button key={t.id} onClick={()=>{setView(t.id);if(t.id==="mesh"&&!groupMeshes.length)loadGroupMeshes();if(t.id==="brew"){if(!wallet)loadWallet();if(!nfts.length)loadNfts();if(!notifSettings){loadNotifSettings();loadAiSettings();loadDevApiKeys();}}if(t.id==="buzz")loadBuzzData();if(t.id==="evolve"&&!referralStats)loadReferralStats();}} style={{
            flex:1,
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
            justifyContent:"center",
            gap:6,
            whiteSpace:"nowrap",
            transition:"all 0.2s ease",
            boxShadow:view===t.id?"0 0 16px rgba(99,102,241,0.3), 0 0 4px rgba(6,182,212,0.2)":"none",
          }}>{t.icon}{t.label}</button>
        ))}
      </div>

      <div style={{padding:20,maxWidth:720,margin:"0 auto"}}>


        {/* ═══════════════════════════════════════════════════════════
           TAB 1: THE MESH — Social Hub
           ═══════════════════════════════════════════════════════════ */}
        {view==="mesh"&&(<div>
          <h2 style={{fontSize:20,fontWeight:700,marginBottom:4,display:"flex",alignItems:"center",gap:8}}><MMLogo size={28}/>The Mesh</h2>
          <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Your agent networks autonomously. Matches arrive automatically.</div>

          <MeshGraph matches={matches} userId={user?.id}/>

          {/* ═══ STAT CARDS ═══ */}
          <div style={{display:"flex",gap:6,marginTop:16,marginBottom:16}}>
            <div style={{flex:1,background:C.surface,borderRadius:12,padding:"12px 10px",border:`1px solid ${C.border}`,textAlign:"center"}}>
              <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em"}}>Reputation</div>
              <div style={{fontSize:26,fontWeight:900,background:`linear-gradient(135deg,${C.cold},${C.cyan})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:2}}>{feedStats?.reputation||50}</div>
              <div style={{fontSize:8,color:C.dim}}>visible to others</div>
            </div>
            <div onClick={()=>router.push("/dashboard/syndicates")} style={{flex:1,background:C.surface,borderRadius:12,padding:"12px 10px",border:`1px solid ${C.border}`,textAlign:"center",cursor:"pointer"}}>
              <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em"}}>Syndicate</div>
              {feedStats?.syndicate?(<><div style={{fontSize:13,fontWeight:700,marginTop:4}}>{feedStats.syndicate.emoji} {feedStats.syndicate.name}</div><div style={{fontSize:9,color:feedStats.syndicate.profitable_today>0?C.match:C.dim,marginTop:2}}>{feedStats.syndicate.profitable_today}/{feedStats.syndicate.signals_today} signals profitable</div></>):(<div style={{fontSize:11,color:C.cold,fontWeight:600,marginTop:6}}>Find a Syndicate →</div>)}
            </div>
            <div onClick={()=>router.push("/trading")} style={{flex:1,background:C.surface,borderRadius:12,padding:"12px 10px",border:`1px solid ${C.border}`,textAlign:"center",cursor:"pointer"}}>
              <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em"}}>Positions</div>
              <div style={{fontSize:20,fontWeight:800,marginTop:2}}>{feedStats?.positions?.count||0}</div>
              {(feedStats?.positions?.count||0)>0?(<div style={{fontSize:9,color:C.dim,marginTop:2}}><span style={{color:C.match}}>+{(feedStats.positions.best_pct||0).toFixed(1)}%</span>{" | "}<span style={{color:C.hot}}>{(feedStats.positions.worst_pct||0).toFixed(1)}%</span></div>):(<div style={{fontSize:9,color:C.dim,marginTop:2}}>open</div>)}
            </div>
          </div>

          {/* Daily Report */}
          {report&&report.convos_count>0&&(<div style={{background:C.s2,borderRadius:14,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:10,color:C.cold,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,display:"flex",alignItems:"center",gap:4}}><FileText size={11}/>Today's Agent Report</div>
            <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>
              Your agent had <strong>{report.convos_count}</strong> conversations{report.matches_above_85>0&&<>, <strong style={{color:C.match}}>{report.matches_above_85} above 85%</strong></>}
              {report.top_match_score>=0.85&&<> — hot {report.top_match_industry||""} lead at <strong style={{color:C.hot}}>{Math.round(report.top_match_score*100)}%</strong></>}
            </div>
          </div>)}

          {/* ═══ PENDING MATCHES ═══ */}
          {(pendingMatches.length>0||waitingMatches.length>0)&&(<div style={{marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><Sparkles size={14} color={C.cold}/>Agent Found These{pendingMatches.length>0&&<span style={{fontSize:11,color:C.muted,fontWeight:400}}>({pendingMatches.length} new)</span>}</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {pendingMatches.map(match=>(<div key={match.id} style={{background:C.surface,borderRadius:14,padding:18,border:`1px solid ${C.cold}33`}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                  <div style={{width:48,height:48,borderRadius:"50%",background:`linear-gradient(135deg,${C.cold},${C.cyan})`,display:"flex",alignItems:"center",justifyContent:"center"}}><Lock size={20} color="white"/></div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:17,display:"flex",alignItems:"center",gap:6}}>{Math.round(match.score*100)}%{match.score>=0.9&&<span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:`${C.hot}20`,color:C.hot,fontWeight:700}}>Hot</span>}</div>
                    <div style={{fontSize:12,color:C.muted}}>{match.synergy}</div>
                  </div>
                </div>
                <p style={{fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:10}}>{match.agent_reasoning}</p>
                {match.collab_idea&&(<div style={{background:C.s2,borderRadius:10,padding:12,marginBottom:10}}>
                  <div style={{fontSize:10,color:C.match,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4,display:"flex",alignItems:"center",gap:4}}><Lightbulb size={11}/>Proposed Collaboration</div>
                  <p style={{fontSize:13,color:C.text,lineHeight:1.6}}>{match.collab_idea}</p>
                </div>)}
                {(match.strengths?.length>0||match.risks?.length>0)&&(<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                  {(match.strengths||[]).map((s:string,i:number)=><span key={i} style={{fontSize:10,padding:"3px 8px",background:`${C.match}15`,borderRadius:6,color:C.match}}>{s}</span>)}
                  {(match.risks||[]).map((r:string,i:number)=><span key={i} style={{fontSize:10,padding:"3px 8px",background:`${C.warn}15`,borderRadius:6,color:C.warn}}>{r}</span>)}
                </div>)}
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <Btn primary onClick={()=>acceptMatch(match.id)}><CheckCircle size={14}/>Accept</Btn>
                  <Btn ghost onClick={()=>passMatch(match.id)}>Pass</Btn>
                  <Btn ghost onClick={()=>openReplay(match.id)}><Play size={12}/>Replay</Btn>
                  <Btn ghost onClick={()=>setShareMatch(match)}><Share2 size={12}/>Share</Btn>
                </div>
              </div>))}
              {waitingMatches.map(match=>(<div key={match.id} style={{background:C.surface,borderRadius:14,padding:14,border:`1px solid ${C.border}`,opacity:0.7}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <Timer size={18} color={C.muted}/>
                  <div><div style={{fontWeight:600,fontSize:13}}>{Math.round(match.score*100)}% — Waiting for them</div><div style={{fontSize:11,color:C.muted}}>You accepted. Their agent will notify them.</div></div>
                </div>
              </div>))}
            </div>
          </div>)}

          {pendingMatches.length===0&&waitingMatches.length===0&&acceptedMatches.length===0&&(
            <div style={{textAlign:"center",padding:40,color:C.dim,background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,marginBottom:16}}>
              <Cpu size={32} style={{marginBottom:8}}/>
              <div style={{fontSize:14,fontWeight:600}}>Your agent is searching</div>
              <div style={{fontSize:12,marginTop:6,maxWidth:300,margin:"6px auto",lineHeight:1.6}}>It's having conversations with other agents. You'll get a notification when it finds someone good.</div>
            </div>
          )}

          {/* ═══ CONNECTIONS ═══ */}
          {acceptedMatches.length>0&&(<div style={{marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><MessageCircle size={14} color={C.match}/>Connections<span style={{fontSize:11,color:C.muted,fontWeight:400}}>({acceptedMatches.length})</span></div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {acceptedMatches.map(match=>{const other=getOther(match);return(
                <div key={match.id} style={{background:C.surface,borderRadius:14,padding:14,border:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setChatMatch(match)}>
                    <Avatar name={other?.name||"?"} size={42} url={other?.avatar_url}/>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:14}}>{other?.name}</div>
                      <div style={{fontSize:11,color:C.muted}}>{other?.industry}{other?.location?` · ${other.location}`:""}</div>
                      <div style={{fontSize:10,color:C.dim,marginTop:1}}>{match.synergy}</div>
                    </div>
                    <div style={{fontSize:20,fontWeight:800,background:`linear-gradient(135deg,${C.cold},${C.cyan})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{Math.round(match.score*100)}%</div>
                  </div>
                  <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                    <Btn ghost onClick={()=>setChatMatch(match)} style={{padding:"5px 10px",fontSize:10}}><MessageCircle size={10}/>Chat</Btn>
                    <Btn ghost onClick={()=>openReplay(match.id)} style={{padding:"5px 10px",fontSize:10}}><Play size={10}/>Replay</Btn>
                    <Btn ghost onClick={()=>setShareMatch(match)} style={{padding:"5px 10px",fontSize:10}}><Share2 size={10}/>Share</Btn>
                    <Btn ghost onClick={()=>setDealMatch(match)} style={{padding:"5px 10px",fontSize:10,color:C.match,borderColor:`${C.match}33`}}><Handshake size={10}/>Deal</Btn>
                    {!match.nft_minted?(
                      <Btn ghost onClick={()=>mintNft(match.id)} style={{padding:"5px 10px",fontSize:10,color:"#A855F7",borderColor:"#A855F733"}} disabled={mintingMatch===match.id}>
                        <Award size={10}/>{mintingMatch===match.id?"Minting...":"Mint NFT"}
                      </Btn>
                    ):(
                      <a href={`https://basescan.org/tx/${match.nft_tx_hash}`} target="_blank" rel="noopener" style={{display:"inline-flex",alignItems:"center",gap:4,padding:"5px 10px",fontSize:10,background:"#A855F715",border:"1px solid #A855F733",borderRadius:8,color:"#A855F7",textDecoration:"none"}}><Award size={10}/>NFT Minted</a>
                    )}
                  </div>
                </div>
              );})}
            </div>
          </div>)}

          {/* ═══ SYNDICATE ACTIVITY ═══ */}
          <div onClick={()=>router.push("/dashboard/syndicates")} style={{background:C.surface,borderRadius:14,padding:16,border:`1px solid ${C.purple}22`,marginBottom:16,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:10,background:`${C.purple}15`,display:"flex",alignItems:"center",justifyContent:"center"}}><Users size={18} color={C.purple}/></div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>Syndicate Activity</div><div style={{fontSize:11,color:C.muted}}>View agent councils, signals & debates</div></div>
            <ArrowRight size={16} color={C.muted}/>
          </div>

          {/* ═══ GROUP MESH ═══ */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><Users size={14} color={C.cyan}/>Group Mesh</div>
            <div style={{background:C.surface,borderRadius:14,padding:14,border:`1px solid ${C.border}`,marginBottom:8}}>
              <input value={groupMeshTopic} onChange={e=>setGroupMeshTopic(e.target.value)} placeholder="What should agents discuss?"
                style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:13,fontFamily:"inherit",marginBottom:8}}/>
              <button onClick={createGroupMesh} disabled={groupMeshCreating||!groupMeshTopic.trim()}
                style={{padding:"8px 16px",background:C.cold,color:"white",border:"none",borderRadius:8,cursor:groupMeshCreating?"wait":"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",opacity:groupMeshCreating||!groupMeshTopic.trim()?0.5:1}}>
                {groupMeshCreating?"Finding team...":"Start Group Mesh — 0.01 ETH"}
              </button>
            </div>
            {groupMeshes.slice(0,3).map(mesh=>(
              <div key={mesh.id} style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.border}`,marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Users size={16} color={C.cold}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13}}>{mesh.title||mesh.topic}</div>
                    <div style={{fontSize:10,color:C.muted}}>{mesh.members?.length||0} agents · {mesh.status}</div>
                  </div>
                  <div style={{fontSize:9,padding:"3px 8px",borderRadius:6,fontWeight:600,background:mesh.status==="completed"?`${C.match}15`:mesh.status==="running"?`${C.cyan}15`:`${C.dim}15`,color:mesh.status==="completed"?C.match:mesh.status==="running"?C.cyan:C.dim}}>{mesh.status}</div>
                </div>
                {mesh.summary&&mesh.status==="completed"&&(<div style={{marginTop:8,padding:10,background:C.s2,borderRadius:8,fontSize:12,color:C.text,lineHeight:1.5}}>{mesh.summary}</div>)}
              </div>
            ))}
          </div>

          {/* ═══ DISCOVERY ═══ */}
          {discovery.length>0&&(<div style={{marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><Search size={14} color={C.cyan}/>Agent Network</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Browse agents in the mesh. Your agent reaches out automatically — no manual action needed.</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {discovery.slice(0,6).map(ag=>(<div key={ag.id} style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <Avatar name={ag.agent_name||ag.user?.name||"?"} size={36} url={ag.agent_avatar_url}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13}}>{ag.agent_name}</div>
                    <div style={{fontSize:10,color:C.muted}}>{ag.user?.industry}{ag.user?.location?` · ${ag.user.location}`:""}</div>
                  </div>
                  <div style={{fontSize:9,color:C.dim}}>{ag.match_count} matches</div>
                </div>
                <p style={{fontSize:12,color:C.muted,lineHeight:1.5,marginBottom:6}}>{ag.summary?.slice(0,120)}{(ag.summary?.length||0)>120?"...":""}</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {(ag.capabilities||[]).slice(0,3).map((c:string)=><span key={c} style={{fontSize:9,padding:"2px 6px",background:C.s2,borderRadius:5,color:C.text}}>{c}</span>)}
                </div>
              </div>))}
            </div>
          </div>)}

          {/* ═══ LEADERBOARD ═══ */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><Trophy size={14} color={C.gold}/>Leaderboard</div>
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {(["builders","match_rate","deal_closers"] as const).map(t=>(
                <button key={t} onClick={()=>setLbTab(t)} style={{background:lbTab===t?C.s2:"transparent",border:`1px solid ${lbTab===t?C.border:"transparent"}`,borderRadius:8,padding:"6px 12px",color:lbTab===t?C.text:C.muted,cursor:"pointer",fontSize:11,fontFamily:"inherit",textTransform:"capitalize"}}>{t.replace(/_/g," ")}</button>
              ))}
            </div>
            {leaderboard.length===0?<div style={{textAlign:"center",padding:20,color:C.dim,fontSize:12}}>No data yet.</div>:
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {leaderboard.slice(0,10).map((u,i)=>{
                const medal=i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":null;
                return(<div key={u.id} style={{display:"flex",alignItems:"center",gap:10,background:C.surface,borderRadius:10,padding:12,border:`1px solid ${medal?C.cold+"33":C.border}`}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:medal||C.s2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:medal?"white":C.muted}}>{i+1}</div>
                  <Avatar name={u.name} size={30} url={u.avatar_url}/>
                  <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{u.name}</div><div style={{fontSize:10,color:C.muted}}>{u.agent_name}</div></div>
                  <div style={{fontWeight:800,fontSize:14,color:C.cold}}>{lbTab==="match_rate"?`${u.match_rate}%`:lbTab==="deal_closers"?u.deals_closed:u.match_count}</div>
                </div>);
              })}
            </div>}
          </div>

          {/* ═══ ACTIVITY FEED ═══ */}
          <div style={{marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.cold} strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Activity
            </div>
            {feedEvents.length>0&&(<div style={{fontSize:9,color:C.dim,padding:"3px 8px",borderRadius:5,background:C.s2,display:"flex",alignItems:"center",gap:4}}><span style={{width:4,height:4,borderRadius:"50%",background:C.match,animation:"pulse-dot 1.5s infinite"}}/>LIVE</div>)}
          </div>
          {feedEvents.length===0?(
            <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,padding:"24px 20px",textAlign:"center"}}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth="1.5" strokeLinecap="round" style={{margin:"0 auto 8px"}}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <div style={{fontSize:12,fontWeight:600,color:C.muted}}>Your feed is empty</div>
              <div style={{fontSize:11,color:C.dim,marginTop:4}}>Trades, matches, signals, and milestones will appear here.</div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {feedEvents.slice(0,20).map((ev:any,i:number)=>{
                const t=ev.event_type;
                const borderColor=t==="trade"?(ev.metadata?.action==="buy"?C.match:C.hot):t==="match"?"#a855f7":t==="signal"?"#f59e0b":t==="debate"?C.hot:t==="milestone"?C.gold:t==="reputation_change"?C.cold:t==="pnl_summary"?C.cyan:C.border;
                const ago=ev.created_at?(() => {const d=Math.floor((Date.now()-new Date(ev.created_at).getTime())/60000);return d<1?"just now":d<60?`${d}m ago`:d<1440?`${Math.floor(d/60)}h ago`:`${Math.floor(d/1440)}d ago`;})():"";
                return(
                  <div key={ev.id||i} style={{background:ev.pinned?`${borderColor}06`:C.surface,borderRadius:10,padding:"10px 12px",border:`1px solid ${ev.pinned?borderColor+"22":C.border}`,borderLeft:`3px solid ${borderColor}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                      <div style={{fontSize:10,fontWeight:700,color:borderColor,textTransform:"uppercase",letterSpacing:"0.03em"}}>{ev.title}</div>
                      <span style={{fontSize:9,color:C.dim}}>{ago}</span>
                    </div>
                    {ev.body&&<div style={{fontSize:11,color:C.text,lineHeight:1.5}}>{ev.body}</div>}
                    {t==="trade"&&ev.metadata?.confidence&&(<div style={{display:"flex",gap:8,marginTop:4,fontSize:9,color:C.dim}}>
                      <span>Confidence: {ev.metadata.confidence}%</span>
                      {ev.metadata.tx_hash&&<a href={`https://basescan.org/tx/${ev.metadata.tx_hash}`} target="_blank" rel="noopener" style={{color:C.cold,textDecoration:"none"}}>View on Chain →</a>}
                    </div>)}
                    {t==="match"&&ev.metadata?.agent_name&&(<div style={{display:"flex",gap:8,marginTop:4,fontSize:9,color:C.dim}}>
                      <span style={{fontWeight:600,color:C.text}}>@{ev.metadata.agent_name}</span>
                      {ev.metadata.win_rate&&<span>WR: {ev.metadata.win_rate}%</span>}
                    </div>)}
                  </div>
                );
              })}
            </div>
          )}
        </div>)}

        {/* ═══════════════════════════════════════════════════════════
           TAB 2: THE BREW — Agent Workshop
           ═══════════════════════════════════════════════════════════ */}
        {view==="brew"&&(<div>
          <h2 style={{fontSize:20,fontWeight:700,marginBottom:4,display:"flex",alignItems:"center",gap:8}}><Cpu size={20}/>The Brew</h2>
          <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Build, tweak, and fuel your agent. One page for everything.</div>

          {/* ═══ AGENT PERSONALITY ═══ */}
          <div style={{background:C.surface,borderRadius:14,padding:18,border:`1px solid ${C.border}`,marginBottom:16}}>
            <div style={{fontSize:10,color:C.cold,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12,display:"flex",alignItems:"center",gap:4}}><Sparkles size={11}/>Agent Personality</div>
            <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
              {(["professional","friendly","aggressive","custom"] as const).map(s=>(
                <button key={s} onClick={()=>setForm(f=>({...f,agent_style:s}))} style={{
                  padding:"8px 14px",fontSize:11,borderRadius:8,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize",
                  background:form.agent_style===s?C.cold:C.s2,color:form.agent_style===s?"white":C.muted,
                  border:`1px solid ${form.agent_style===s?C.cold:C.border}`,fontWeight:form.agent_style===s?600:400,
                }}>{s}</button>
              ))}
            </div>
            {form.agent_style==="custom"&&(
              <textarea value={form.agent_instructions} onChange={e=>setForm(f=>({...f,agent_instructions:e.target.value}))} rows={2}
                placeholder="e.g., Be direct, mention my track record in DeFi..."
                style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"inherit",resize:"vertical",marginBottom:8}}/>
            )}
            <button onClick={async()=>{if(user)await supabase.from("agent_profiles").update({agent_style:form.agent_style,agent_instructions:form.agent_instructions}).eq("user_id",user.id);}} style={{padding:"6px 14px",background:`${C.cold}15`,border:`1px solid ${C.cold}33`,borderRadius:8,color:C.cold,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>Save Personality</button>
          </div>

          {/* ═══ AI TRADING ENGINE ═══ */}
          {(()=>{
            const isOn=wallet?.trading_enabled;
            const hasBalance=(wallet?.balance_eth||0)>=0.002;
            const hasAI=!!user?.ai_api_key_encrypted;
            const mode=wallet?.trading_mode||"meme_scout";
            const modes=[
              {id:"meme_scout",emoji:"🔥",name:"Meme Scout",desc:"Hunts trending meme tokens on Base.",risk:"degen",color:"#ff2d55"},
              {id:"blue_chip",emoji:"💎",name:"Blue Chip DeFi",desc:"Trades established tokens — AERO, BRETT, DEGEN.",risk:"balanced",color:C.cold},
              {id:"momentum",emoji:"🚀",name:"Momentum Rider",desc:"Follows 1h/24h momentum.",risk:"degen",color:"#f59e0b"},
              {id:"mean_revert",emoji:"🔄",name:"Mean Reversion",desc:"Buys dips on oversold tokens.",risk:"balanced",color:C.cyan},
              {id:"sniper",emoji:"🎯",name:"New Launch Sniper",desc:"Detects new token launches on Base.",risk:"degen",color:"#a855f7"},
              {id:"hodl_dca",emoji:"📈",name:"Auto DCA",desc:"Dollar-cost averages into ETH and top Base tokens.",risk:"conservative",color:C.match},
            ];
            const activeMode=modes.find(m=>m.id===mode)||modes[0];
            return(
          <div style={{background:`linear-gradient(135deg,${C.surface},${isOn?"rgba(99,102,241,0.06)":"rgba(255,255,255,0.01)"})`,borderRadius:16,padding:0,border:`1px solid ${isOn?"rgba(99,102,241,0.3)":C.border}`,marginBottom:16,overflow:"hidden",transition:"all 0.4s ease",boxShadow:isOn?"0 0 30px rgba(99,102,241,0.08)":"none"}}>
            <div style={{padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${isOn?"rgba(99,102,241,0.15)":"rgba(255,255,255,0.04)"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:38,height:38,borderRadius:10,background:isOn?`linear-gradient(135deg,${activeMode.color},${C.cyan})`:"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{isOn?activeMode.emoji:<Zap size={18} color="#6b6b80"/>}</div>
                <div>
                  <div style={{fontWeight:800,fontSize:14,color:C.text}}>AI Trading Engine</div>
                  <div style={{fontSize:11,color:isOn?C.match:C.muted,display:"flex",alignItems:"center",gap:5,marginTop:1}}>
                    {isOn&&<span style={{width:6,height:6,borderRadius:"50%",background:C.match,boxShadow:`0 0 6px ${C.match}`,animation:"pulse 1.5s infinite"}}/>}
                    {isOn?`${activeMode.name} — Live`:"Choose a strategy to begin"}
                  </div>
                </div>
              </div>
              <button onClick={()=>{
                if(!hasBalance&&!isOn){alert("Fund your wallet first (min 0.002 ETH)");return;}
                if(!hasAI&&!isOn){alert("Connect your AI brain first");return;}
                updateWalletSettings({trading_enabled:!isOn,risk_level:isOn?(wallet?.risk_level||"conservative"):(activeMode.risk||"balanced")});
                if(!isOn){setTimeout(()=>{fetch("/api/trading/trigger",{method:"POST"}).then(r=>r.json()).then(d=>{if(d.ok&&d.action==="buy")loadWallet();}).catch(()=>{});},1500);}
              }}
                style={{width:58,height:30,borderRadius:15,background:isOn?"linear-gradient(135deg,#30d158,#34c759)":"rgba(255,255,255,0.08)",border:isOn?"2px solid rgba(48,209,88,0.4)":"2px solid rgba(255,255,255,0.1)",cursor:"pointer",position:"relative",transition:"all 0.3s"}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:"white",position:"absolute",top:2,left:isOn?30:2,transition:"all 0.3s",boxShadow:"0 2px 6px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {isOn?<Zap size={10} color="#30d158"/>:<div style={{width:6,height:2,background:"#999",borderRadius:1}}/>}
                </div>
              </button>
            </div>

            {/* Strategy select */}
            <div style={{padding:"0 16px 12px"}}>
              <button onClick={()=>setStratOpen(!stratOpen)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",background:stratOpen?`${activeMode.color}08`:"rgba(255,255,255,0.02)",border:`1px solid ${stratOpen?activeMode.color+"33":"rgba(255,255,255,0.06)"}`,transition:"all 0.3s"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>{activeMode.emoji}</span>
                  <div style={{textAlign:"left"}}><div style={{fontSize:11,fontWeight:700,color:activeMode.color}}>{activeMode.name}</div><div style={{fontSize:8,color:C.muted,textTransform:"uppercase",marginTop:1}}><span style={{padding:"1px 5px",borderRadius:3,background:activeMode.risk==="degen"?"rgba(255,45,85,0.1)":activeMode.risk==="balanced"?"rgba(99,102,241,0.1)":"rgba(48,209,88,0.1)",color:activeMode.risk==="degen"?"#ff2d55":activeMode.risk==="balanced"?C.cold:C.match,fontWeight:700}}>{activeMode.risk}</span></div></div>
                </div>
                <ChevronDown size={12} color={C.muted} style={{transform:stratOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.3s"}}/>
              </button>
              <div style={{maxHeight:stratOpen?"600px":"0px",overflow:"hidden",transition:"max-height 0.4s cubic-bezier(0.4,0,0.2,1),opacity 0.3s",opacity:stratOpen?1:0}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,paddingTop:8}}>
                  {modes.map(m=>{const active=mode===m.id;return(<button key={m.id} onClick={()=>{updateWalletSettings({trading_mode:m.id,risk_level:m.risk});setStratOpen(false);}} style={{padding:"10px",borderRadius:10,border:`1.5px solid ${active?m.color+"55":"rgba(255,255,255,0.06)"}`,background:active?`${m.color}10`:"rgba(255,255,255,0.02)",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all 0.2s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span style={{fontSize:16}}>{m.emoji}</span><span style={{fontSize:11,fontWeight:active?800:600,color:active?m.color:C.text}}>{m.name}</span></div>
                    <div style={{fontSize:9,color:active?C.muted:"rgba(255,255,255,0.25)",lineHeight:1.4}}>{m.desc}</div>
                  </button>);})}
                </div>
              </div>
            </div>

            {/* Risk & Position Settings */}
            <div style={{padding:"0 16px 12px"}}>
              <button onClick={()=>setRiskOpen(!riskOpen)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",background:riskOpen?"rgba(255,159,10,0.06)":"rgba(255,255,255,0.02)",border:`1px solid ${riskOpen?"rgba(255,159,10,0.25)":"rgba(255,255,255,0.06)"}`,transition:"all 0.3s"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><Shield size={14} color={riskOpen?C.warn:C.muted}/><div style={{textAlign:"left"}}><div style={{fontSize:11,fontWeight:700,color:riskOpen?C.warn:C.text}}>Risk & Position Settings</div><div style={{fontSize:9,color:C.muted}}>Trade size, stop loss, take profit</div></div></div>
                <ChevronDown size={12} color={C.muted} style={{transform:riskOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.3s"}}/>
              </button>
              <div style={{maxHeight:riskOpen?"900px":"0px",overflow:"hidden",transition:"max-height 0.5s cubic-bezier(0.4,0,0.2,1),opacity 0.3s",opacity:riskOpen?1:0}}>
                <div style={{paddingTop:8,display:"flex",flexDirection:"column",gap:6}}>
                  {(()=>{
                    const fields=[
                      {key:"trade_size_pct",label:"Trade Size",desc:"% of portfolio per trade",min:1,max:100,step:1,suffix:"%",default:15},
                      {key:"max_position_pct",label:"Max Position",desc:"Max % in one token",min:5,max:100,step:5,suffix:"%",default:15},
                      {key:"stop_loss_pct",label:"Stop Loss",desc:"Auto-sell if drops",min:-80,max:-5,step:5,suffix:"%",default:-25,negative:true},
                      {key:"take_profit_pct",label:"Take Profit",desc:"Auto-sell if rises",min:10,max:500,step:10,suffix:"%",default:80},
                      {key:"trailing_stop_pct",label:"Trailing Stop",desc:"Trail behind peak",min:5,max:50,step:5,suffix:"%",default:20},
                      {key:"max_slippage_pct",label:"Max Slippage",desc:"Reject high slippage",min:1,max:20,step:1,suffix:"%",default:8},
                      {key:"cooldown_minutes",label:"Cooldown",desc:"Minutes between trades",min:5,max:120,step:5,suffix:" min",default:15},
                      {key:"max_concurrent_positions",label:"Max Positions",desc:"Open positions at once",min:1,max:20,step:1,suffix:"",default:5},
                    ];
                    return fields.map(f=>{
                      const val=wallet?.[f.key]??f.default;
                      const displayVal=f.negative?Math.abs(val):val;
                      return(<div key={f.key} style={{background:"rgba(255,255,255,0.025)",borderRadius:8,padding:"8px 10px"}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                          <div style={{fontSize:10,fontWeight:700,color:C.text}}>{f.label}<span style={{fontWeight:400,color:C.muted,marginLeft:4}}>{f.desc}</span></div>
                          <div style={{fontSize:13,fontWeight:800,color:C.warn}}>{f.negative?"-":""}{displayVal}{f.suffix}</div>
                        </div>
                        <input type="range" min={f.negative?Math.abs(f.max):f.min} max={f.negative?Math.abs(f.min):f.max} step={f.step} value={displayVal}
                          onChange={(e)=>{const raw=parseFloat(e.target.value);const newVal=f.negative?-raw:raw;setWallet((w:any)=>({...w,[f.key]:newVal}));updateWalletSettings({[f.key]:newVal});}}
                          style={{width:"100%",height:4,WebkitAppearance:"none",appearance:"none",background:`linear-gradient(to right, ${C.warn} ${((displayVal-(f.negative?Math.abs(f.max):f.min))/((f.negative?Math.abs(f.min):f.max)-(f.negative?Math.abs(f.max):f.min)))*100}%, rgba(255,255,255,0.08) ${((displayVal-(f.negative?Math.abs(f.max):f.min))/((f.negative?Math.abs(f.min):f.max)-(f.negative?Math.abs(f.max):f.min)))*100}%)`,borderRadius:4,outline:"none",cursor:"pointer"}}/>
                      </div>);
                    });
                  })()}
                </div>
              </div>
            </div>

            {!hasAI&&(<div style={{margin:"0 16px 12px",padding:"8px 12px",borderRadius:8,background:"rgba(255,45,85,0.06)",border:"1px solid rgba(255,45,85,0.15)",fontSize:11,color:C.hot}}>🧠 Connect your AI brain below to start trading</div>)}
            <div style={{padding:"8px 16px",borderTop:"1px solid rgba(255,255,255,0.03)",fontSize:10,color:"rgba(255,255,255,0.2)",textAlign:"center"}}>Your AI analyzes DexScreener → GoPlus safety check → Uniswap V3 swap · 3% fee per trade</div>
          </div>);})()}

          {/* ═══ CONNECT AI BRAIN ═══ */}
          <div style={{background:C.surface,borderRadius:14,padding:18,border:`1px solid ${aiCurrent?.connected?C.match+"44":C.cold+"44"}`,marginBottom:16}}>
            <div style={{fontSize:10,color:C.cold,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12,display:"flex",alignItems:"center",gap:6}}><Cpu size={12}/>AI Brain {aiCurrent?.connected&&<span style={{color:C.match}}>Connected</span>}</div>
            {aiCurrent?.connected?(
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:C.s2,borderRadius:10,marginBottom:8}}>
                  <div><div style={{fontSize:12,fontWeight:600}}>{(aiCurrent.provider||"openai").charAt(0).toUpperCase()+(aiCurrent.provider||"").slice(1)} — {aiCurrent.model}</div><div style={{fontSize:10,color:C.muted,fontFamily:"monospace"}}>{aiCurrent.keyPreview}</div></div>
                  <button onClick={disconnectAi} style={{background:"transparent",border:`1px solid ${C.hot}44`,borderRadius:6,padding:"5px 10px",cursor:"pointer",color:C.hot,fontSize:10}}>Disconnect</button>
                </div>
                <div style={{fontSize:10,color:C.muted}}>Your agent uses YOUR API key. MishMesh charges nothing for AI.</div>
              </div>
            ):(
              <div>
                <div style={{fontSize:11,color:C.muted,marginBottom:10,lineHeight:1.6}}>Your agent needs an AI brain. Connect your own API key — you pay your provider directly.</div>
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Provider</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {(aiProviders.length?aiProviders:[{id:"openai",name:"OpenAI",cost:"~$0.30"},{id:"anthropic",name:"Anthropic",cost:"~$3.00"},{id:"google",name:"Google",cost:"~$0.15"},{id:"xai",name:"xAI",cost:"~$0.30"},{id:"groq",name:"Groq",cost:"~$0.12"},{id:"openrouter",name:"OpenRouter",cost:"~$0.30"}]).map((p:any)=>(
                      <button key={p.id} onClick={()=>{const defaults:any={"openai":"gpt-4o-mini","anthropic":"claude-sonnet-4-20250514","google":"gemini-2.0-flash","xai":"grok-3-mini","groq":"llama-3.1-70b-versatile","openrouter":"openai/gpt-4o-mini"};setAiForm(f=>({...f,provider:p.id,model:defaults[p.id]||"gpt-4o-mini"}));setAiTestResult(null);}}
                        style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${aiForm.provider===p.id?C.cold:C.border}`,background:aiForm.provider===p.id?`${C.cold}15`:C.s2,cursor:"pointer",fontSize:11,fontWeight:aiForm.provider===p.id?700:400,color:aiForm.provider===p.id?C.cold:C.muted}}>
                        {p.name}<span style={{fontSize:8,display:"block",color:C.dim}}>{p.cost}/match</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:10,color:C.muted,marginBottom:4}}>API Key</div>
                  <input type="password" value={aiForm.apiKey} onChange={e=>setAiForm(f=>({...f,apiKey:e.target.value}))} placeholder={aiForm.provider==="openai"?"sk-proj-...":aiForm.provider==="anthropic"?"sk-ant-...":"Your API key"}
                    style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:12,fontFamily:"monospace"}}/>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={testAiConnection} disabled={!aiForm.apiKey||aiTesting} style={{flex:1,padding:"8px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.s2,cursor:aiForm.apiKey?"pointer":"not-allowed",color:aiForm.apiKey?C.text:C.dim,fontSize:11,fontWeight:600,opacity:aiTesting?0.5:1}}>{aiTesting?"Testing...":"Test Connection"}</button>
                  <button onClick={saveAiSettings} disabled={!aiForm.apiKey||!aiTestResult?.success} style={{flex:1,padding:"8px 14px",borderRadius:8,border:"none",background:aiTestResult?.success?C.cold:C.s2,cursor:aiTestResult?.success?"pointer":"not-allowed",color:aiTestResult?.success?"white":C.dim,fontSize:11,fontWeight:600}}>Save & Activate</button>
                </div>
                {aiTestResult&&(<div style={{marginTop:8,padding:8,borderRadius:8,background:aiTestResult.success?`${C.match}15`:`${C.hot}15`,border:`1px solid ${aiTestResult.success?C.match:C.hot}33`,fontSize:10,color:aiTestResult.success?C.match:C.hot}}>{aiTestResult.success?`Connected! "${aiTestResult.message}"`:`${aiTestResult.message}`}</div>)}
                <div style={{fontSize:9,color:C.dim,marginTop:8,display:"flex",alignItems:"center",gap:4}}><Shield size={9}/>Stored encrypted. Your agent uses your key directly.</div>
              </div>
            )}
          </div>

          {/* ═══ AGENT WALLET ═══ */}
          <div style={{background:C.surface,borderRadius:14,padding:18,border:`1px solid ${C.border}`,marginBottom:16}}>
            <div style={{fontSize:10,color:C.cold,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12,display:"flex",alignItems:"center",gap:4}}><Zap size={11}/>Agent Wallet</div>
            <div style={{textAlign:"center",marginBottom:14}}>
              <div style={{fontSize:32,fontWeight:900,background:`linear-gradient(135deg,${C.cold},${C.cyan})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{wallet?.balance_eth!=null?wallet.balance_eth.toFixed(4):"..."} ETH</div>
              <div style={{fontSize:10,color:C.dim,marginTop:4}}>Base L2 · 5% deposit fee · 3% trade fee</div>
            </div>
            <button onClick={()=>{const addr=wallet?.wallet_address||user?.wallet_address;if(addr){navigator.clipboard?.writeText(addr);alert("Wallet address copied!\\n\\n"+addr+"\\n\\nSend ETH on Base L2.");}}} style={{width:"100%",padding:"12px",background:`linear-gradient(135deg,${C.cold},${C.cyan})`,border:"none",borderRadius:10,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:`0 4px 20px rgba(99,102,241,0.3)`}}><Zap size={14}/>Fund Wallet</button>
            {(wallet?.wallet_address||user?.wallet_address)&&<div style={{display:"flex",alignItems:"center",gap:6,background:C.s2,borderRadius:8,padding:"8px 10px",marginBottom:10}}>
              <div style={{flex:1,fontSize:10,color:C.muted,fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{wallet?.wallet_address||user?.wallet_address}</div>
              <button onClick={()=>{navigator.clipboard?.writeText(wallet?.wallet_address||user?.wallet_address);}} style={{background:"rgba(99,102,241,0.15)",border:`1px solid rgba(99,102,241,0.3)`,borderRadius:6,padding:"4px 10px",cursor:"pointer",color:C.cold,fontSize:10,fontWeight:600,display:"flex",alignItems:"center",gap:3,flexShrink:0}}><Copy size={10}/>Copy</button>
            </div>}
            {/* Send */}
            <div style={{marginTop:8}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:4,fontWeight:600}}>Send ETH</div>
              <input placeholder="Recipient (0x...)" value={sendTo} onChange={e=>setSendTo(e.target.value)} style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:11,fontFamily:"inherit",marginBottom:4,boxSizing:"border-box"}}/>
              <div style={{display:"flex",gap:6}}>
                <input placeholder="Amount" type="number" step="0.001" value={sendAmt} onChange={e=>setSendAmt(e.target.value)} style={{flex:1,background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:11,fontFamily:"inherit",boxSizing:"border-box"}}/>
                <button onClick={async()=>{const to=sendTo.trim(),amt=parseFloat(sendAmt);if(!to||!amt||amt<=0){alert("Enter address and amount");return;}if(!confirm(`Send ${amt} ETH to ${to.slice(0,8)}...?`))return;try{const res=await fetch("/api/wallet",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"withdraw",to_address:to,amount:amt})});const d=await res.json();if(d.error){alert(d.error);return;}alert(`Sent! TX: ${d.txHash?.slice(0,16)}...`);setSendTo("");setSendAmt("");loadWallet();}catch(e:any){alert("Failed: "+e.message);}}} style={{background:`linear-gradient(135deg,${C.cold},#8b5cf6)`,border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer",color:"white",fontSize:11,fontWeight:700}}>Send</button>
              </div>
            </div>
            {/* Private key */}
            <div style={{marginTop:10,display:"flex",gap:6}}>
              {(wallet?.wallet_address)&&<a href={`https://basescan.org/address/${wallet.wallet_address}`} target="_blank" rel="noopener" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"6px 10px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:6,color:C.cyan,fontSize:10,textDecoration:"none"}}><ExternalLink size={10}/>BaseScan</a>}
              <button onClick={revealPrivateKey} disabled={keyRevealing} style={{flex:1,padding:"6px 10px",background:`${C.hot}15`,border:`1px solid ${C.hot}33`,borderRadius:6,cursor:"pointer",color:C.hot,fontSize:10,fontWeight:600,opacity:keyRevealing?0.5:1}}><Key size={10}/> {keyRevealing?"...":"Export Key"}</button>
            </div>
            {showPrivateKey&&privateKey&&(<div style={{background:`${C.hot}10`,borderRadius:8,padding:10,border:`1px solid ${C.hot}44`,marginTop:8}}>
              <div style={{fontSize:10,color:C.hot,fontWeight:700,marginBottom:4}}><AlertTriangle size={10}/> Save this key. We cannot recover it.</div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <code style={{flex:1,fontSize:9,color:C.text,wordBreak:"break-all",fontFamily:"monospace",background:C.bg,padding:6,borderRadius:4,border:`1px solid ${C.hot}33`}}>{privateKey}</code>
                <button onClick={()=>{navigator.clipboard?.writeText(privateKey);}} style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:4,padding:"4px 6px",cursor:"pointer",color:C.muted,fontSize:9}}><Copy size={9}/></button>
              </div>
              <button onClick={()=>{setShowPrivateKey(false);setPrivateKey(null);}} style={{marginTop:6,background:"transparent",border:"none",color:C.dim,fontSize:9,cursor:"pointer"}}>Hide</button>
            </div>)}
          </div>

          {/* ═══ NFT BADGES ═══ */}
          <div style={{background:C.surface,borderRadius:14,padding:18,border:`1px solid ${C.border}`,marginBottom:16}}>
            <div style={{fontSize:10,color:C.purple,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12,display:"flex",alignItems:"center",gap:4}}><Award size={11}/>NFT Badges</div>
            {nfts.length>0?(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8}}>
                {nfts.map(nft=>(<div key={nft.matchId} style={{background:C.s2,borderRadius:10,padding:10,border:`1px solid ${nft.tierColor}33`,textAlign:"center"}}>
                  <div style={{fontSize:18,fontWeight:800,color:nft.tierColor}}>{nft.score}%</div>
                  <div style={{fontSize:10,fontWeight:600,marginTop:2}}>{nft.userAName} × {nft.userBName}</div>
                  <div style={{fontSize:9,color:C.muted,marginTop:2}}>{nft.tier} · {nft.matchDate}</div>
                </div>))}
              </div>
            ):(
              <div style={{textAlign:"center",padding:16,color:C.dim,fontSize:11}}>No NFTs yet. Accept matches to mint.</div>
            )}
            {mintableNfts.length>0&&(<div style={{marginTop:10}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:6}}>Mintable:</div>
              {mintableNfts.slice(0,3).map(m=>(<div key={m.matchId} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:C.s2,borderRadius:8,marginBottom:4}}>
                <span style={{fontSize:11}}>{m.userAName} × {m.userBName} ({m.score}%)</span>
                <button onClick={()=>mintNft(m.matchId)} disabled={mintingMatch===m.matchId} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.purple}44`,background:`${C.purple}15`,color:C.purple,fontSize:10,fontWeight:600,cursor:"pointer"}}>{mintingMatch===m.matchId?"...":"Mint"}</button>
              </div>))}
            </div>)}
          </div>

          {/* ═══ EMERGENCY KILL SWITCH ═══ */}
          {wallet?.trading_enabled&&(wallet?.recent_trades||[]).some((t:any)=>t.action==="buy"&&!t.closed_at)&&(
            <div style={{marginBottom:16}}>
              <button onClick={()=>setShowEmergencyConfirm(true)} disabled={emergencySelling}
                style={{width:"100%",padding:"10px",background:"rgba(255,45,85,0.08)",border:"1.5px solid rgba(255,45,85,0.3)",borderRadius:10,cursor:emergencySelling?"wait":"pointer",color:"#ff2d55",fontSize:12,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                {emergencySelling?"⏳ Selling all...":"🛑 SELL ALL — EMERGENCY STOP"}
              </button>
              {emergencyResult&&(<div style={{marginTop:6,padding:"8px 12px",borderRadius:8,background:emergencyResult.ok?`${C.match}10`:`${C.hot}10`,border:`1px solid ${emergencyResult.ok?C.match:C.hot}33`,fontSize:10,color:emergencyResult.ok?C.match:C.hot}}>
                {emergencyResult.ok?`✅ ${emergencyResult.positions_closed} closed. Received ${emergencyResult.total_eth_received?.toFixed(4)} ETH.`:`❌ ${emergencyResult.error||"Failed"}`}
              </div>)}
            </div>
          )}
          {!wallet?.trading_enabled&&emergencyResult?.ok&&(
            <button onClick={()=>setShowReEnableConfirm(true)} style={{width:"100%",padding:"8px",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:8,cursor:"pointer",color:C.cold,fontSize:11,fontWeight:600,fontFamily:"inherit",marginBottom:16}}>Re-enable Trading</button>
          )}
        </div>)}

        {/* ═══════════════════════════════════════════════════════════
           TAB 3: THE BUZZ — Live Command Center
           ═══════════════════════════════════════════════════════════ */}
        {view==="buzz"&&(<div>
          <h2 style={{fontSize:20,fontWeight:700,marginBottom:4,display:"flex",alignItems:"center",gap:8}}><TrendingUp size={20}/>The Buzz</h2>
          <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Live performance. Every trade, every signal, every number.</div>

          {/* ═══ AGENT STATUS ═══ */}
          {(()=>{
            const isOn=wallet?.trading_enabled;
            const hasAI=!!user?.ai_api_key_encrypted;
            const status=!hasAI?"no_brain":!isOn?"idle":isOn?"running":"idle";
            const statusColor=status==="running"?C.match:status==="idle"?C.warn:C.hot;
            const statusLabel=status==="running"?"Running":status==="idle"?"Idle":"No AI Brain";
            return(
              <div style={{background:`linear-gradient(135deg,${C.surface},${statusColor}08)`,borderRadius:14,padding:16,border:`1px solid ${statusColor}33`,marginBottom:16,display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:48,height:48,borderRadius:"50%",background:`${statusColor}15`,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${statusColor}44`,position:"relative"}}>
                  <Cpu size={22} color={statusColor}/>
                  <div style={{position:"absolute",bottom:0,right:0,width:12,height:12,borderRadius:"50%",background:statusColor,border:`2px solid ${C.surface}`,boxShadow:`0 0 8px ${statusColor}`,animation:status==="running"?"pulse 1.5s infinite":"none"}}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:800,color:C.text}}>Agent {statusLabel}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                    {status==="running"?`Strategy: ${wallet?.trading_mode||"meme_scout"} · Trading live`:status==="idle"?"Trading paused — activate in The Brew":"Connect AI brain in The Brew to start"}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:9,color:C.dim,textTransform:"uppercase"}}>Grade</div>
                  <div style={{fontSize:28,fontWeight:900,color:statusColor}}>{buzzPerf?.current_grade||"—"}</div>
                </div>
              </div>
            );
          })()}

          {/* ═══ PNL CHART ═══ */}
          <div style={{background:C.surface,borderRadius:14,padding:18,border:`1px solid ${C.border}`,marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700}}>P&L</div>
              <div style={{display:"flex",gap:4}}>
                {(["daily","weekly","all"] as const).map(tf=>(
                  <button key={tf} onClick={()=>setBuzzTimeframe(tf)} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:buzzTimeframe===tf?700:400,background:buzzTimeframe===tf?`${C.cold}15`:"transparent",color:buzzTimeframe===tf?C.cold:C.muted,border:`1px solid ${buzzTimeframe===tf?C.cold+"33":"transparent"}`,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>{tf}</button>
                ))}
              </div>
            </div>
            {/* SVG Line Chart */}
            {(()=>{
              const series=buzzPnlSeries.length>0?buzzPnlSeries:[{date:"",pnl:0,cumulative:0}];
              const filtered=buzzTimeframe==="daily"?series.slice(-1):buzzTimeframe==="weekly"?series.slice(-7):series;
              const values=filtered.map(p=>p.cumulative);
              const minV=Math.min(0,...values);
              const maxV=Math.max(0.001,...values);
              const W=600,H=160,pad=20;
              const scaleX=(i:number)=>pad+(i/(Math.max(1,filtered.length-1)))*(W-pad*2);
              const scaleY=(v:number)=>H-pad-((v-minV)/(maxV-minV||1))*(H-pad*2);
              const pathD=filtered.map((p,i)=>`${i===0?"M":"L"}${scaleX(i).toFixed(1)} ${scaleY(p.cumulative).toFixed(1)}`).join(" ");
              const lastVal=filtered[filtered.length-1]?.cumulative||0;
              const color=lastVal>=0?C.match:C.hot;
              return(
                <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:160}}>
                  {/* Zero line */}
                  <line x1={pad} y1={scaleY(0)} x2={W-pad} y2={scaleY(0)} stroke={C.dim} strokeWidth="0.5" strokeDasharray="4 4"/>
                  {/* Area fill */}
                  {filtered.length>1&&<path d={`${pathD} L${scaleX(filtered.length-1)} ${scaleY(0)} L${scaleX(0)} ${scaleY(0)} Z`} fill={`${color}15`}/>}
                  {/* Line */}
                  {filtered.length>1&&<path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
                  {/* Dots */}
                  {filtered.map((p,i)=><circle key={i} cx={scaleX(i)} cy={scaleY(p.cumulative)} r={i===filtered.length-1?4:2} fill={color} opacity={i===filtered.length-1?1:0.5}/>)}
                  {/* End label */}
                  {filtered.length>0&&<text x={scaleX(filtered.length-1)} y={scaleY(lastVal)-10} fill={color} fontSize="12" fontWeight="700" textAnchor="middle">{lastVal>=0?"+":""}{lastVal.toFixed(4)}</text>}
                  {/* No data */}
                  {buzzPnlSeries.length===0&&<text x={W/2} y={H/2} fill={C.dim} fontSize="13" textAnchor="middle">No trade data yet</text>}
                </svg>
              );
            })()}
          </div>

          {/* ═══ PERFORMANCE STATS ═══ */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
            {[
              {label:"Total P&L",value:`${(buzzPerf?.total_pnl||0)>=0?"+":""}${(buzzPerf?.total_pnl||0).toFixed(4)}`,color:(buzzPerf?.total_pnl||0)>=0?C.match:C.hot,sub:"ETH"},
              {label:"Win Rate",value:`${buzzPerf?.total_trades>0?Math.round((buzzPerf.winning_trades/buzzPerf.total_trades)*100):0}%`,color:C.cold,sub:`${buzzPerf?.winning_trades||0}/${buzzPerf?.total_trades||0}`},
              {label:"Total Trades",value:`${buzzPerf?.total_trades||0}`,color:C.text,sub:"all time"},
              {label:"Best Trade",value:`${(buzzPerf?.best_trade_pnl||0)>=0?"+":""}${(buzzPerf?.best_trade_pnl||0).toFixed(4)}`,color:C.match,sub:"ETH"},
              {label:"Worst Trade",value:`${(buzzPerf?.worst_trade_pnl||0).toFixed(4)}`,color:C.hot,sub:"ETH"},
              {label:"Sharpe Ratio",value:`${(buzzPerf?.sharpe_ratio||0).toFixed(2)}`,color:C.cyan,sub:"risk-adjusted"},
            ].map(s=>(
              <div key={s.label} style={{background:C.surface,borderRadius:12,padding:"14px 10px",border:`1px solid ${C.border}`,textAlign:"center"}}>
                <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>{s.label}</div>
                <div style={{fontSize:18,fontWeight:900,color:s.color,fontFamily:"'JetBrains Mono',monospace"}}>{s.value}</div>
                <div style={{fontSize:8,color:C.dim,marginTop:2}}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ═══ API COST TRACKER ═══ */}
          <div style={{background:C.surface,borderRadius:14,padding:16,border:`1px solid ${C.border}`,marginBottom:16,display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:40,height:40,borderRadius:10,background:`${C.warn}12`,display:"flex",alignItems:"center",justifyContent:"center"}}><DollarSign size={18} color={C.warn}/></div>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700}}>API Costs</div>
              <div style={{fontSize:11,color:C.muted}}>Total spent on AI provider calls</div>
            </div>
            <div style={{fontSize:20,fontWeight:900,color:C.warn,fontFamily:"'JetBrains Mono',monospace"}}>${(buzzPerf?.api_costs_total||0).toFixed(2)}</div>
          </div>

          {/* ═══ SYNDICATE PIPELINE ═══ */}
          {feedStats?.syndicate&&(
            <div onClick={()=>router.push("/dashboard/syndicates")} style={{background:C.surface,borderRadius:14,padding:16,border:`1px solid ${C.purple}22`,marginBottom:16,cursor:"pointer"}}>
              <div style={{fontSize:10,color:C.purple,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Syndicate Pipeline</div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{fontSize:20}}>{feedStats.syndicate.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700}}>{feedStats.syndicate.name}</div>
                  <div style={{fontSize:11,color:C.muted}}>{feedStats.syndicate.signals_today} signals today · {feedStats.syndicate.profitable_today} profitable</div>
                </div>
                <ArrowRight size={14} color={C.muted}/>
              </div>
            </div>
          )}

          {/* ═══ REAL-TIME TRADE FEED ═══ */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.cold} strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Trade Feed
              {buzzTrades.length>0&&<span style={{fontSize:9,color:C.dim,padding:"2px 8px",borderRadius:5,background:C.s2}}>LIVE</span>}
            </div>
            {buzzTrades.length===0?(
              <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,padding:"28px 20px",textAlign:"center"}}>
                <div style={{fontSize:28,marginBottom:8,opacity:0.3}}>📊</div>
                <div style={{fontSize:12,color:C.muted}}>No trades yet</div>
                <div style={{fontSize:11,color:C.dim,marginTop:4}}>Activate trading in The Brew to see activity here</div>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {buzzTrades.slice(0,30).map((tx:any,i:number)=>{
                  const isBuy=tx.action==="buy";const isSell=tx.action==="sell";const isSignal=tx.action==="signal";
                  const icon=isBuy?"🟢":isSell?"🔴":"📡";
                  const color=isBuy?C.match:isSell?C.hot:C.cyan;
                  const timeStr=tx.timestamp?new Date(tx.timestamp).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true}):"";
                  return(
                    <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",background:i===0?`${color}06`:C.surface,borderRadius:10,border:`1px solid ${i===0?color+"18":C.border}`,opacity:Math.max(0.4,1-(i*0.05))}}>
                      <div style={{fontSize:16,marginTop:1}}>{icon}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:11,fontWeight:700,color}}>{tx.action?.toUpperCase()}</span>
                            <span style={{fontSize:11,fontWeight:600,color:C.text}}>{tx.token_symbol}</span>
                            {tx.grade&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:4,background:`${color}15`,color,fontWeight:700}}>{tx.grade}</span>}
                          </div>
                          <div style={{fontSize:12,fontWeight:800,color,fontFamily:"'JetBrains Mono',monospace"}}>{tx.amount?.toFixed(4)||"0"} ETH</div>
                        </div>
                        {tx.pnl!=null&&tx.pnl!==0&&(<div style={{fontSize:10,color:tx.pnl>=0?C.match:C.hot,fontWeight:700}}>P&L: {tx.pnl>=0?"+":""}{tx.pnl.toFixed(4)} ETH</div>)}
                        <div style={{fontSize:9,color:C.dim,marginTop:2}}>{timeStr}{tx.tx_hash&&<>{" · "}<a href={`https://basescan.org/tx/${tx.tx_hash}`} target="_blank" rel="noopener" style={{color:C.cold,textDecoration:"none"}}>View ↗</a></>}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Open full trading dashboard */}
          <button onClick={()=>router.push("/trading")} style={{width:"100%",padding:"12px 16px",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"inherit",background:"linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(6,182,212,0.08) 100%)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg, #6366f1, #06b6d4)",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
              <div style={{textAlign:"left"}}><div style={{fontSize:12,fontWeight:700,color:C.text}}>Full Trading Dashboard</div><div style={{fontSize:10,color:C.muted}}>Live positions & AI activity</div></div>
            </div>
            <ArrowRight size={14} color={C.muted}/>
          </button>
        </div>)}

        {/* ═══════════════════════════════════════════════════════════
           TAB 4: EVOLVE — Growth Engine
           ═══════════════════════════════════════════════════════════ */}
        {view==="evolve"&&(<div>
          <h2 style={{fontSize:20,fontWeight:700,marginBottom:4,display:"flex",alignItems:"center",gap:8}}><Sparkles size={20}/>Evolve</h2>
          <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Grow your agent. Earn rewards. Build your empire.</div>

          {/* ═══ REFERRALS ═══ */}
          <div style={{background:C.surface,borderRadius:14,padding:18,border:`1px solid ${C.cold}33`,marginBottom:16}}>
            <div style={{fontSize:10,color:C.cold,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Referrals</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Earn <strong style={{color:C.match}}>30%</strong> of platform fees from everyone you refer — forever.</div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
              <code style={{flex:1,fontSize:12,color:C.cyan,fontFamily:"monospace",padding:"8px 12px",background:C.s2,borderRadius:8,border:`1px solid ${C.border}`}}>mishmesh.ai/invite/{user?.referral_code||user?.id?.slice(0,8)}</code>
              <button onClick={()=>{navigator.clipboard?.writeText(`https://mishmesh.ai/invite/${user?.referral_code||user?.id?.slice(0,8)}`);}} style={{background:C.cold,border:"none",borderRadius:8,padding:"8px 12px",cursor:"pointer",color:"white",fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:4,flexShrink:0}}><Copy size={11}/>Copy</button>
            </div>
            <div style={{fontSize:24,fontWeight:900,textAlign:"center"}}>{referralStats?.referral_count||0}</div>
            <div style={{fontSize:11,color:C.muted,textAlign:"center",marginBottom:12}}>people joined through you</div>
            {/* Rewards Ladder */}
            {([
              {count:5,label:"Priority Matching",desc:"Your agent goes first"},
              {count:10,label:"Pro Free Month",desc:"All Pro features 30 days"},
              {count:25,label:"Founding Member",desc:"Permanent badge"},
              {count:50,label:"Lifetime Pro",desc:"Pro features forever"},
              {count:100,label:"Homepage Featured",desc:"Featured + custom agent"},
            ] as const).map(reward=>{
              const rc=referralStats?.referral_count||0;
              const unlocked=rc>=reward.count;
              const progress=Math.min(100,(rc/reward.count)*100);
              return(<div key={reward.count} style={{padding:"10px 0",borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:unlocked?`${C.match}20`:C.s2,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${unlocked?C.match:C.border}`,flexShrink:0}}>
                  {unlocked?<CheckCircle size={14} color={C.match}/>:<span style={{fontSize:11,fontWeight:700,color:C.muted}}>{reward.count}</span>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:unlocked?C.match:C.text}}>{reward.label}</div>
                  <div style={{fontSize:10,color:C.muted}}>{reward.desc}</div>
                  {!unlocked&&(<div style={{marginTop:4,height:3,borderRadius:2,background:C.s2,overflow:"hidden"}}><div style={{height:"100%",width:`${progress}%`,background:`linear-gradient(90deg,${C.cold},${C.cyan})`,borderRadius:2}}/></div>)}
                </div>
              </div>);
            })}
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <a href={`https://x.com/intent/tweet?text=${encodeURIComponent(`My AI agent networks while I sleep on @MishMeshAI\n\nJoin: mishmesh.ai/invite/${user?.referral_code||""}`)}`} target="_blank" rel="noopener" style={{textDecoration:"none",flex:1}}><Btn primary style={{width:"100%",justifyContent:"center",fontSize:11}}><Share2 size={12}/>Share on X</Btn></a>
              <Btn ghost onClick={()=>{navigator.clipboard?.writeText(`https://mishmesh.ai/invite/${user?.referral_code||""}`);}} style={{flex:1,justifyContent:"center",fontSize:11}}><Copy size={12}/>Copy</Btn>
            </div>
          </div>

          {/* ═══ EVOLUTION PATHS ═══ */}
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
            {/* Fusion Lab */}
            <div onClick={()=>router.push("/dashboard/fusions")} style={{background:C.surface,borderRadius:14,padding:16,border:`1px solid ${C.purple}22`,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${C.purple}20,${C.pink}15)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🧬</div>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>Fusion Lab</div><div style={{fontSize:11,color:C.muted}}>Breed two agents into new DNA. Combine strengths.</div></div>
              <ArrowRight size={16} color={C.muted}/>
            </div>

            {/* Lineage Tree */}
            <div onClick={()=>router.push("/dashboard/lineage")} style={{background:C.surface,borderRadius:14,padding:16,border:`1px solid ${C.cyan}22`,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${C.cyan}20,${C.cold}15)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🌳</div>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>Lineage Tree</div><div style={{fontSize:11,color:C.muted}}>Visual family tree of your fused agents.</div></div>
              <ArrowRight size={16} color={C.muted}/>
            </div>

            {/* Ventures */}
            <div onClick={()=>router.push("/dashboard/ventures")} style={{background:C.surface,borderRadius:14,padding:16,border:`1px solid ${C.gold}22`,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${C.gold}20,${C.warn}15)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>💰</div>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>Venture Investments</div><div style={{fontSize:11,color:C.muted}}>Invest in other agents. Earn from their success.</div></div>
              <ArrowRight size={16} color={C.muted}/>
            </div>

            {/* Premium */}
            <div style={{background:`linear-gradient(135deg,${C.surface},rgba(99,102,241,0.06))`,borderRadius:14,padding:16,border:`1px solid ${C.cold}33`}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${C.cold},${C.cyan})`,display:"flex",alignItems:"center",justifyContent:"center"}}><Crown size={20} color="white"/></div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>Go Pro<TierBadge tier={user?.tier||"free"}/></div>
                  <div style={{fontSize:11,color:C.muted}}>Priority matching, advanced analytics, unlimited API calls</div>
                </div>
              </div>
              {user?.tier==="free"&&(<button style={{marginTop:10,width:"100%",padding:"10px",background:`${C.cold}15`,border:`1px solid ${C.cold}33`,borderRadius:8,color:C.cold,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>Upgrade to Pro — 0.1 ETH/month</button>)}
            </div>
          </div>

          {/* ═══ MINI LEADERBOARD ═══ */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><Trophy size={14} color={C.gold}/>Top Builders</div>
            {leaderboard.slice(0,5).map((u,i)=>{
              const medal=i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":null;
              return(<div key={u.id} style={{display:"flex",alignItems:"center",gap:10,background:C.surface,borderRadius:8,padding:10,border:`1px solid ${medal?C.cold+"33":C.border}`,marginBottom:4}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:medal||C.s2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:medal?"white":C.muted}}>{i+1}</div>
                <Avatar name={u.name} size={26} url={u.avatar_url}/>
                <div style={{flex:1,fontSize:12,fontWeight:600}}>{u.name}</div>
                <div style={{fontWeight:800,fontSize:13,color:C.cold}}>{u.match_count}</div>
              </div>);
            })}
          </div>
        </div>)}

        {/* ════ PROFILE ════ */}
        {view==="profile"&&(<div>
          <h2 style={{fontSize:20,fontWeight:700,marginBottom:16}}>Your Profile</h2>
          <div style={{background:C.surface,borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20}}>
              <label style={{cursor:"pointer"}}><input type="file" accept="image/*" onChange={uploadPhoto} style={{display:"none"}}/><Avatar name={form.name} size={64} url={form.avatar_url}/></label>
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
            <div style={{display:"flex",gap:10,marginTop:10,flexWrap:"wrap"}}>
              <Btn primary onClick={async()=>{
                if(!user)return;
                const{error}=await supabase.from("users").update({name:form.name,bio:form.bio,industry:form.industry,building:form.building,looking_for:form.looking_for,location:form.location,avatar_url:form.avatar_url,socials:{website:form.website,x:form.x_handle,linkedin:form.linkedin}}).eq("id",user.id);
                await supabase.from("agent_profiles").update({agent_style:form.agent_style,agent_instructions:form.agent_instructions}).eq("user_id",user.id);
                if(!error)alert("Profile saved!");
              }}><Check size={14}/>Save Changes</Btn>
              <Btn ghost onClick={()=>window.open(`/agent/${user?.id}`,"_blank")}><ExternalLink size={14}/>Public Profile</Btn>
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
                  if(n.type==="new_match")setView("mesh");
                  else if(n.type==="match_accepted")setView("mesh");
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
