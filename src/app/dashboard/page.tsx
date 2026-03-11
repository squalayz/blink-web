"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Zap, Search, Sparkles, User, Lock, Globe, Mail, Send, MapPin, Shield, Settings,
  Lightbulb, Cpu, Clipboard, Check, CheckCircle, AlertTriangle, ArrowLeft,
  ArrowRight, FileText, Camera, Trophy, Flame, TrendingUp, Timer, Bell,
  LogOut, MessageCircle, Share2, Award, Target, BarChart3, Crown, Star,
  Play, Pause, ExternalLink, DollarSign, Copy, Heart, Handshake, ChevronDown, Key, Users,
  Dna, Leaf, RefreshCw, Gem, Rocket, StopCircle, Brain, Radio, XCircle
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import dynamic from "next/dynamic";
import MobileTabBar from "@/components/mobile-tab-bar";
const MeshDiscoveryFeed = dynamic(() => import("@/components/MeshDiscoveryFeed"), { ssr: false });
const PreferenceSetup = dynamic(() => import("@/components/PreferenceSetup"), { ssr: false });
const MatchNFTCard = dynamic(() => import("@/components/match-nft-card"), { ssr: false });
const SocialVerify = dynamic(() => import("@/components/social-verify"), { ssr: false });
const MeshFeed = dynamic(() => import("@/components/MeshFeed"), { ssr: false });
const HuntTabView = dynamic(() => import("@/components/HuntTabView"), { ssr: false });
const MeshTrade = dynamic(() => import("@/components/MeshTrade"), { ssr: false });
import TabInfoBanner from "@/components/TabInfoBanner";

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

  return <canvas ref={ref} style={{width:"100%",height:"100%",minHeight:"100%",display:"block",borderRadius:14,background:C.s2,border:`1px solid ${C.border}`}}/>;
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
  const searchParams=useSearchParams();
  const[user,setUser]=useState<any>(null);
  const[agent,setAgent]=useState<any>(null);
  const[loading,setLoading]=useState(true);
  // Support deep-linking: /dashboard?tab=wallet, ?tab=profile, etc.
  const initialTab=(()=>{const t=searchParams?.get("tab");const map:Record<string,string>={wallet:"brew",matches:"matches",chat:"mesh",profile:"profile",stats:"buzz",agent:"agent",grow:"evolve",discover:"discover",hunt:"hunt"};return(t&&(map[t]||t))||"mesh";})();
  const[view,setView]=useState(initialTab);
  const[meshSubTab,setMeshSubTab]=useState<"connections"|"matches">("connections");
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
  const[showDepositCard,setShowDepositCard]=useState(false);
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
  // Discovery Engine state
  const[showPrefSetup,setShowPrefSetup]=useState(false);
  const[userPrefs,setUserPrefs]=useState<any>(null);
  const[orbTheme,setOrbTheme]=useState("indigo");
  const agentOrbCanvasRef=useRef<HTMLCanvasElement>(null);
  const agentOrbAnimRef=useRef<number>(0);
  const agentOrbTRef=useRef(0);
  const[agentStateIdx,setAgentStateIdx]=useState(0);
  const[selectedMatch,setSelectedMatch]=useState<any>(null);
  const matchesCanvasRef=useRef<HTMLCanvasElement>(null);
  // Discover tab state
  const[discoverProfiles,setDiscoverProfiles]=useState<any[]>([]);
  const[discoverBalances,setDiscoverBalances]=useState<any[]>([]);
  const[discoverLoading,setDiscoverLoading]=useState(false);
  const[discoverIdx,setDiscoverIdx]=useState(0);
  const dragXRef=useRef(0);
  const dragStartXRef=useRef(0);
  const cardRef=useRef<HTMLDivElement>(null);
  const[dragX,setDragX]=useState(0);
  const isDraggingRef=useRef(false);
  // Match NFT celebration
  const[showMatchNFT,setShowMatchNFT]=useState<any>(null);
  // Profile media upload
  const[profilePhotos,setProfilePhotos]=useState<string[]>([]);
  const[profileVideo,setProfileVideo]=useState<string|null>(null);
  const[uploadingSlot,setUploadingSlot]=useState<number|null>(null);
  const[uploadProgress,setUploadProgress]=useState(0);
  const agentStates=["Scanning 847 profiles in the Mesh","Comparing your vibe with 12 new members","Reviewing token signals from your network","Looking for your next connection..."];
  useEffect(()=>{const iv=setInterval(()=>setAgentStateIdx(p=>(p+1)%4),4000);return()=>clearInterval(iv);},[]);

  // Global pointer up for discover swipe cleanup
  useEffect(()=>{
    const handleGlobalPointerUp=()=>{
      if(!isDraggingRef.current)return;
      isDraggingRef.current=false;
      const dx=dragXRef.current;
      if(dx>120){
        const p=discoverProfiles[discoverIdx];
        if(p)console.log("CONNECT:",p.agent_name,p.user_id);
        setDiscoverIdx(i=>i+1);
        setDragX(0);
      }else if(dx<-120){
        setDiscoverIdx(i=>i+1);
        setDragX(0);
      }else{
        if(cardRef.current)cardRef.current.style.transition="transform 0.4s cubic-bezier(0.16,1,0.3,1)";
        setDragX(0);
      }
    };
    window.addEventListener("pointerup",handleGlobalPointerUp);
    return()=>window.removeEventListener("pointerup",handleGlobalPointerUp);
  },[discoverProfiles,discoverIdx]);

  // Matches orb canvas animation
  useEffect(()=>{
    if(view!=="matches")return;
    const canvas=matchesCanvasRef.current; if(!canvas)return;
    const parent=canvas.parentElement;
    const ctx=canvas.getContext("2d"); if(!ctx)return;
    const W=parent?.offsetWidth||360; const H=300;
    canvas.width=W*window.devicePixelRatio; canvas.height=H*window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio,window.devicePixelRatio);
    canvas.style.width=W+"px"; canvas.style.height=H+"px";
    const cx=W/2, cy=H/2;
    const nodeCount=Math.min(matches.length,8);
    const nodes=matches.slice(0,nodeCount).map((m:any,i:number)=>{
      const angle=(i/Math.max(nodeCount,1))*Math.PI*2-(Math.PI/2);
      const r=Math.min(W,H)*0.33;
      return{x:cx+Math.cos(angle)*r,y:cy+Math.sin(angle)*r,match:m,angle};
    });
    // Floating particles for empty state
    const particles=Array.from({length:18},(_,i)=>({
      x:cx+(Math.sin(i*137.5*Math.PI/180)*W*0.42),
      y:cy+(Math.cos(i*137.5*Math.PI/180)*H*0.38),
      r:1+Math.random()*1.5, phase:Math.random()*Math.PI*2, speed:0.008+Math.random()*0.012,
    }));
    let t=0; const af={current:0}; let lastFrame=0;
    const draw=(ts:number)=>{
      if(ts-lastFrame<33){af.current=requestAnimationFrame(draw);return;}
      lastFrame=ts;
      ctx.clearRect(0,0,W,H);
      // Deep space bg
      const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(W,H)*0.65);
      bg.addColorStop(0,"rgba(30,20,60,0.5)"); bg.addColorStop(0.5,"rgba(10,10,25,0.4)"); bg.addColorStop(1,"transparent");
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

      if(nodeCount===0){
        // ── EMPTY STATE: Radar sweep ──
        // Radar rings
        [0.18,0.33,0.47].forEach(rf=>{
          ctx.beginPath(); ctx.arc(cx,cy,Math.min(W,H)*rf,0,Math.PI*2);
          ctx.strokeStyle=`rgba(99,102,241,${0.06+rf*0.04})`; ctx.lineWidth=1; ctx.setLineDash([4,8]); ctx.stroke(); ctx.setLineDash([]);
        });
        // Radar sweep
        const sweepAngle=(t*0.025)%(Math.PI*2);
        const sweepR=Math.min(W,H)*0.47;
        const grad=(ctx as any).createConicGradient?.(sweepAngle,cx,cy);
        if(grad){
          grad.addColorStop(0,"rgba(99,102,241,0.0)");
          grad.addColorStop(0.15,"rgba(99,102,241,0.18)");
          grad.addColorStop(0.18,"rgba(99,102,241,0.0)");
          ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(cx,cy,sweepR,0,Math.PI*2); ctx.fill();
        }else{
          // Fallback arc
          ctx.beginPath(); ctx.moveTo(cx,cy);
          ctx.arc(cx,cy,sweepR,sweepAngle-0.35,sweepAngle,false);
          ctx.closePath();
          ctx.fillStyle="rgba(99,102,241,0.12)"; ctx.fill();
          // Sweep line
          ctx.beginPath(); ctx.moveTo(cx,cy);
          ctx.lineTo(cx+Math.cos(sweepAngle)*sweepR,cy+Math.sin(sweepAngle)*sweepR);
          ctx.strokeStyle="rgba(99,102,241,0.4)"; ctx.lineWidth=1.5; ctx.stroke();
        }
        // Floating particles
        particles.forEach(p=>{
          const a=0.2+Math.sin(t*p.speed+p.phase)*0.2;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
          ctx.fillStyle=`rgba(99,102,241,${a})`; ctx.fill();
        });
        // Status text
        ctx.fillStyle="rgba(107,107,128,0.7)"; ctx.font="12px -apple-system,sans-serif";
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("Scanning the Mesh...",cx,cy+52);
      }else{
        // ── HAS MATCHES: Connection lines + pulse dots ──
        nodes.forEach((n:any)=>{
          ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(n.x,n.y);
          ctx.strokeStyle=`rgba(99,102,241,${0.12+Math.sin(t*0.02+n.angle)*0.07})`; ctx.lineWidth=1; ctx.stroke();
          const progress=((t*0.006+n.angle/(Math.PI*2))%1+1)%1;
          const px=cx+(n.x-cx)*progress; const py=cy+(n.y-cy)*progress;
          ctx.beginPath(); ctx.arc(px,py,2.5,0,Math.PI*2);
          ctx.fillStyle=`rgba(6,182,212,${0.5+Math.sin(t*0.05)*0.4})`; ctx.fill();
        });
        // Match nodes
        nodes.forEach((n:any)=>{
          const wobble=Math.sin(t*0.02+n.angle)*2.5;
          const nx=n.x+Math.cos(n.angle+t*0.008)*wobble; const ny=n.y+Math.sin(n.angle+t*0.008)*wobble;
          // Glow halo
          const glow=ctx.createRadialGradient(nx,ny,0,nx,ny,26);
          glow.addColorStop(0,"rgba(99,102,241,0.3)"); glow.addColorStop(0.5,"rgba(6,182,212,0.1)"); glow.addColorStop(1,"transparent");
          ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(nx,ny,26,0,Math.PI*2); ctx.fill();
          // Node circle
          ctx.beginPath(); ctx.arc(nx,ny,15,0,Math.PI*2);
          ctx.fillStyle="rgba(10,10,18,0.95)"; ctx.fill();
          ctx.strokeStyle=`rgba(99,102,241,${0.6+Math.sin(t*0.03+n.angle)*0.2})`; ctx.lineWidth=1.5; ctx.stroke();
          // Initials
          const other=n.match.user_a===user?.id?n.match.user_b_profile:n.match.user_a_profile;
          ctx.fillStyle="#c8c8e0"; ctx.font="bold 10px -apple-system,sans-serif";
          ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.fillText((other?.name||"?").slice(0,2).toUpperCase(),nx,ny);
        });
      }

      // ── Center YOU orb (always) ──
      const pulse=1+Math.sin(t*0.035)*0.07;
      // Outer atmospheric glow
      const atm=ctx.createRadialGradient(cx,cy,0,cx,cy,42*pulse);
      atm.addColorStop(0,"rgba(99,102,241,0.45)"); atm.addColorStop(0.4,"rgba(6,182,212,0.15)"); atm.addColorStop(1,"transparent");
      ctx.fillStyle=atm; ctx.beginPath(); ctx.arc(cx,cy,42*pulse,0,Math.PI*2); ctx.fill();
      // Inner ring
      ctx.beginPath(); ctx.arc(cx,cy,22*pulse,0,Math.PI*2);
      ctx.fillStyle="rgba(10,10,18,0.95)"; ctx.fill();
      // Gradient stroke
      const orbStroke=ctx.createLinearGradient(cx-22,cy-22,cx+22,cy+22);
      orbStroke.addColorStop(0,"rgba(99,102,241,0.9)"); orbStroke.addColorStop(1,"rgba(6,182,212,0.9)");
      ctx.strokeStyle=orbStroke; ctx.lineWidth=2; ctx.stroke();
      // YOU label
      ctx.fillStyle="#e8e8f0"; ctx.font="bold 9px -apple-system,sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("YOU",cx,cy);
      t++; af.current=requestAnimationFrame(draw);
    };
    af.current=requestAnimationFrame(draw);
    return()=>cancelAnimationFrame(af.current);
  },[view,matches,user?.id]);

  // Agent orb canvas — live plasma orb with theme colors
  useEffect(()=>{
    if(view!=="agent")return;
    const canvas=agentOrbCanvasRef.current; if(!canvas)return;
    const parent=canvas.parentElement; if(!parent)return;
    const ctx=canvas.getContext("2d"); if(!ctx)return;
    const S=Math.min(parent.offsetWidth,340);
    const dpr=window.devicePixelRatio||1;
    canvas.width=S*dpr; canvas.height=S*dpr;
    canvas.style.width=S+"px"; canvas.style.height=S+"px";
    ctx.scale(dpr,dpr);
    const cx=S/2, cy=S/2;
    const ORB_THEMES_MAP:Record<string,string[]>={
      indigo:["#6366f1","#818cf8","#06b6d4"],
      fire:["#ff2d55","#ff6b35","#ff9f0a"],
      matrix:["#30d158","#34d399","#06b6d4"],
      gold:["#ffd700","#f59e0b","#ff9f0a"],
      plasma:["#a855f7","#c084fc","#ec4899"],
      void:["#6b6b80","#9ca3af","#3a3a4a"],
    };
    cancelAnimationFrame(agentOrbAnimRef.current);
    const draw=()=>{
      agentOrbTRef.current+=0.018;
      const t=agentOrbTRef.current;
      const cols=ORB_THEMES_MAP[orbTheme]||ORB_THEMES_MAP.indigo;
      const [c1,c2,c3]=cols;
      ctx.clearRect(0,0,S,S);
      // Deep space background
      const bgGrad=ctx.createRadialGradient(cx,cy,0,cx,cy,S*0.5);
      bgGrad.addColorStop(0,"rgba(20,12,40,0.6)"); bgGrad.addColorStop(0.5,"rgba(8,8,18,0.5)"); bgGrad.addColorStop(1,"transparent");
      ctx.fillStyle=bgGrad; ctx.fillRect(0,0,S,S);
      // Outer atmospheric glow
      const outerGlow=ctx.createRadialGradient(cx,cy,S*0.18,cx,cy,S*0.48);
      outerGlow.addColorStop(0,c1+"28"); outerGlow.addColorStop(0.5,c3+"10"); outerGlow.addColorStop(1,"transparent");
      ctx.beginPath(); ctx.arc(cx,cy,S*0.48,0,Math.PI*2); ctx.fillStyle=outerGlow; ctx.fill();
      // Rotating dashed ring
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(t*0.4);
      ctx.beginPath(); ctx.arc(0,0,S*0.3,0,Math.PI*2);
      ctx.strokeStyle=c1+"55"; ctx.lineWidth=1.2; ctx.setLineDash([5,9]); ctx.stroke();
      ctx.restore(); ctx.setLineDash([]);
      // Counter ring
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(-t*0.22);
      ctx.beginPath(); ctx.arc(0,0,S*0.36,0,Math.PI*2);
      ctx.strokeStyle=c3+"30"; ctx.lineWidth=0.8; ctx.setLineDash([2,12]); ctx.stroke();
      ctx.restore(); ctx.setLineDash([]);
      // ── Smooth morphing blob — 64 pts, same as real plasma orb ──
      const r=S*0.22;
      ctx.save(); ctx.translate(cx,cy); ctx.beginPath();
      const pts=64;
      for(let i=0;i<=pts;i++){
        const angle=(i/pts)*Math.PI*2;
        const wobble=1
          +Math.sin(angle*3+t*2.1)*0.06
          +Math.sin(angle*5+t*1.4)*0.04
          +Math.sin(angle*2+t*0.9)*0.03;
        const rad=r*wobble;
        const x=Math.cos(angle)*rad;
        const y=Math.sin(angle)*rad;
        i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      ctx.closePath();
      // Core gradient — radial from offset center (gives sphere feel)
      const coreGrad=ctx.createRadialGradient(-r*0.2,-r*0.2,0,0,0,r);
      coreGrad.addColorStop(0,"rgba(255,255,255,0.9)");
      coreGrad.addColorStop(0.2,c1);
      coreGrad.addColorStop(0.6,c2);
      coreGrad.addColorStop(1,"rgba(0,0,0,0.3)");
      ctx.fillStyle=coreGrad; ctx.fill();
      // Specular highlight (sphere illusion)
      const specGrad=ctx.createRadialGradient(-r*0.3,-r*0.35,0,-r*0.1,-r*0.1,r*0.7);
      specGrad.addColorStop(0,"rgba(255,255,255,0.42)");
      specGrad.addColorStop(0.4,"rgba(255,255,255,0.05)");
      specGrad.addColorStop(1,"transparent");
      ctx.fillStyle=specGrad; ctx.fill();
      ctx.restore();
      // Inner orbiting sparks
      for(let i=0;i<3;i++){
        const angle=t*2.5+(i*Math.PI*2)/3;
        const sr=r*0.65;
        const sx=cx+Math.cos(angle)*sr;
        const sy=cy+Math.sin(angle)*sr;
        const alpha=0.4+Math.sin(t*4+i)*0.3;
        ctx.beginPath(); ctx.arc(sx,sy,2.2,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,255,255,${alpha})`; ctx.fill();
      }
      agentOrbAnimRef.current=requestAnimationFrame(draw);
    };
    agentOrbAnimRef.current=requestAnimationFrame(draw);
    return()=>cancelAnimationFrame(agentOrbAnimRef.current);
  },[view,orbTheme]);

  const[form,setForm]=useState({name:"",bio:"",industry:"",building:"",looking_for:"",location:"",website:"",x_handle:"",linkedin:"",avatar_url:"",agent_style:"professional",agent_instructions:""});
  const[obStep,setObStep]=useState(1);
  const[showWalletDrop,setShowWalletDrop]=useState(false);
  const obSteps=[{n:1,l:"Identity"},{n:2,l:"Brain"},{n:3,l:"Launch"}];
  const obCanNext=obStep===1?!!(form.name):true;

  /* ── Auth + Load ── */
  useEffect(()=>{checkAuth();},[]);

  async function checkAuth(){
    // Use our custom SIWE session instead of Supabase auth
    // Retry up to 3 times — new users may have cookie propagation delay
    let sessionData:any = {user:null};
    for(let attempt=0;attempt<3;attempt++){
      try{
        const sessionRes=await fetch("/api/auth/siwe/session");
        sessionData=await sessionRes.json();
        if(sessionData.user) break;
      }catch(e){}
      if(attempt<2) await new Promise(r=>setTimeout(r,800));
    }
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
  async function loadDiscoverFeed(uid:string){
    setDiscoverLoading(true);
    const{data:profiles}=await supabase.from("agent_profiles").select("id,user_id,agent_name,display_name,bio,trading_style,personality,tagline,agent_style,win_rate,trade_count,instagram_verified,x_verified").neq("user_id",uid).limit(15);
    setDiscoverProfiles(profiles||[]);
    if(profiles?.length){
      const{data:bals}=await supabase.from("agent_balances").select("user_id,balance_eth,total_deposited").in("user_id",profiles.map((p:any)=>p.user_id));
      setDiscoverBalances(bals||[]);
    }
    // Load profile photos
    const{data:ap}=await supabase.from("agent_profiles").select("photos,video_url").eq("user_id",uid).single();
    if(ap){setProfilePhotos(ap.photos||[]);setProfileVideo(ap.video_url||null);}
    setDiscoverLoading(false);
  }
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

  async function loadUserPrefs(){
    try{const res=await fetch("/api/preferences");const data=await res.json();setUserPrefs(data.preferences);}catch(e){console.error(e);}
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
    const matchRes=await fetch("/api/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"generate_agent"})});
    const matchData=await matchRes.json();
    if(!matchRes.ok){console.error("generate_agent failed:",matchData);alert("Something went wrong setting up your agent. Please refresh and try again.");return;}
    const ag=matchData.agent;
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
        file=new File([blob],"avatar.jpg",{type:"image/jpeg"});
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
        file=new File([blob],"avatar.jpg",{type:"image/jpeg"});
      }
    }catch{}
    // Upload via server API (uses service role — bypasses storage RLS)
    try{
      const fd=new FormData();
      fd.append("file",file);
      const res=await fetch("/api/avatar",{method:"POST",body:fd});
      const data=await res.json();
      if(!res.ok||data.error){alert("Photo upload failed: "+(data.error||"Unknown error"));return;}
      setForm(f=>({...f,avatar_url:data.avatar_url}));
      setUser((u:any)=>({...u,avatar_url:data.avatar_url}));
    }catch(err:any){
      console.error("Upload error:",err);
      alert("Photo upload failed: "+err.message);
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
     ONBOARDING — 3-step wizard
     ══════════════════════════════════════════ */

  if(onboarding)return(
    <div style={{minHeight:"100vh",background:"#0a0a0f",position:"relative",overflow:"hidden"}}>
      <style>{`
        nav.mm-global-nav{display:none!important}
        @keyframes mmob-drift{0%{transform:translate(0,0) scale(1)}100%{transform:translate(25px,-20px) scale(1.05)}}
        @keyframes mmob-drift2{0%{transform:translate(0,0) scale(1)}100%{transform:translate(-25px,20px) scale(1.05)}}
        @keyframes mmob-slide-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes mmob-shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
      `}</style>

      {/* Animated glow blobs */}
      <div style={{position:"fixed",top:"-10%",right:"-5%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle, rgba(99,102,241,0.07), transparent 70%)",filter:"blur(80px)",animation:"mmob-drift 14s ease-in-out infinite alternate",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:"-10%",left:"-5%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle, rgba(6,182,212,0.07), transparent 70%)",filter:"blur(80px)",animation:"mmob-drift2 14s ease-in-out infinite alternate",pointerEvents:"none",zIndex:0}}/>

      <div style={{position:"relative",zIndex:1,maxWidth:520,margin:"0 auto",padding:"40px 20px"}}>
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <MMLogo size={44}/>
          <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.15em",color:"#6b6b80",marginTop:8}}>Enter the Mesh</div>
        </div>

        {/* Step tab pills */}
        <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:32,flexWrap:"wrap"}}>
          {obSteps.map(s=>{
            const isActive=s.n===obStep;
            const isCompleted=s.n<obStep;
            const isInactive=s.n>obStep;
            return(
              <button key={s.n} onClick={()=>{if(s.n<obStep)setObStep(s.n);}} style={{
                display:"inline-flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:50,fontSize:13,fontWeight:600,cursor:s.n<obStep?"pointer":"default",transition:"all 0.3s",fontFamily:"inherit",
                background:isActive?"rgba(99,102,241,0.15)":isCompleted?"rgba(48,209,88,0.1)":"transparent",
                borderWidth:1,borderStyle:"solid",
                borderColor:isActive?"rgba(99,102,241,0.5)":isCompleted?"rgba(48,209,88,0.4)":"rgba(255,255,255,0.07)",
                color:isActive?"#6366f1":isCompleted?"#30d158":"#6b6b80",
              }}>
                {isCompleted?(
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ):s.n===1?(
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={8} r={4}/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
                ):s.n===2?(
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x={4} y={4} width={16} height={16} rx={2}/><line x1={9} y1={9} x2={9.01} y2={9}/><line x1={15} y1={9} x2={15.01} y2={9}/><line x1={9} y1={15} x2={9.01} y2={15}/><line x1={15} y1={15} x2={15.01} y2={15}/></svg>
                ):(
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 3 0 3 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-3 0-3"/></svg>
                )}
                {s.l}
              </button>
            );
          })}
        </div>

        {/* Form card */}
        <div style={{background:"rgba(13,13,20,0.85)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:24,padding:"36px 32px",width:"100%"}}>
          <div key={obStep} style={{animation:"mmob-slide-up 0.35s ease",display:"flex",flexDirection:"column",gap:16}}>

          {/* ═══ STEP 1: Identity (merged Profile + Industry & Goals) ═══ */}
          {obStep===1&&(<>
            <div style={{textAlign:"center"}}>
              <label style={{cursor:"pointer",display:"inline-block"}}>
                <input type="file" accept="image/*" onChange={uploadPhoto} style={{display:"none"}}/>
                {form.avatar_url?<img src={form.avatar_url} style={{width:88,height:88,borderRadius:"50%",objectFit:"cover",border:`3px solid #6366f1`}}/>:
                <div style={{width:88,height:88,borderRadius:"50%",background:"linear-gradient(135deg,rgba(99,102,241,0.08),rgba(6,182,212,0.06))",border:"2px dashed rgba(99,102,241,0.35)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}><Camera size={24} color="#6366f1"/><span style={{fontSize:8,color:"#6b6b80",fontWeight:600}}>OPTIONAL</span></div>}
                <div style={{fontSize:11,color:form.avatar_url?"#30d158":"#6366f1",marginTop:6,fontWeight:600}}>{form.avatar_url?"Looking good":"Tap to upload"}</div>
              </label>
            </div>

            <div>
              <label style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#6b6b80",marginBottom:8,display:"block"}}>Username *</label>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Choose a unique username" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"13px 16px",color:"#e8e8f0",fontSize:14,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.2s, box-shadow 0.2s"}}/>
            </div>

            <div>
              <label style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#6b6b80",marginBottom:8,display:"block"}}>One-liner Bio</label>
              <textarea value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))} placeholder="e.g., Building the future of AI matchmaking" rows={2} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"13px 16px",color:"#e8e8f0",fontSize:14,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.2s, box-shadow 0.2s",resize:"vertical"}}/>
            </div>

            <div>
              <label style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#6b6b80",marginBottom:8,display:"block"}}>Industry</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {INDUSTRIES.map(ind=>{
                  const sel=form.industry===ind;
                  const clr="#6366f1";
                  return <button key={ind} onClick={()=>setForm(f=>({...f,industry:ind}))} style={{padding:"8px 14px",borderRadius:50,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",textTransform:"capitalize",background:sel?`${clr}22`:"transparent",border:`1px solid ${sel?clr:"rgba(255,255,255,0.07)"}`,color:sel?clr:"#6b6b80"}}>{ind}</button>;
                })}
              </div>
            </div>

            <div>
              <label style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#6b6b80",marginBottom:8,display:"block"}}>What I'm Building</label>
              <textarea value={form.building} onChange={e=>setForm(f=>({...f,building:e.target.value}))} placeholder="Describe your project, startup, or business..." rows={2} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"13px 16px",color:"#e8e8f0",fontSize:14,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.2s, box-shadow 0.2s",resize:"vertical"}}/>
            </div>

            <div>
              <label style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#6b6b80",marginBottom:8,display:"block"}}>Who I'm Looking For</label>
              <textarea value={form.looking_for} onChange={e=>setForm(f=>({...f,looking_for:e.target.value}))} placeholder="Co-founders, engineers, investors, partnerships, mentors..." rows={2} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"13px 16px",color:"#e8e8f0",fontSize:14,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.2s, box-shadow 0.2s",resize:"vertical"}}/>
            </div>

            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}>
                <label style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#6b6b80",marginBottom:8,display:"block"}}>Location</label>
                <input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="City, Country" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"13px 16px",color:"#e8e8f0",fontSize:14,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.2s, box-shadow 0.2s"}}/>
              </div>
              <div style={{flex:1}}>
                <label style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#6b6b80",marginBottom:8,display:"block"}}>Website</label>
                <input value={form.website} onChange={e=>setForm(f=>({...f,website:e.target.value}))} placeholder="https://..." style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"13px 16px",color:"#e8e8f0",fontSize:14,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.2s, box-shadow 0.2s"}}/>
              </div>
            </div>

            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}>
                <label style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#6b6b80",marginBottom:8,display:"block"}}>X / Twitter</label>
                <input value={form.x_handle} onChange={e=>setForm(f=>({...f,x_handle:e.target.value}))} placeholder="@handle" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"13px 16px",color:"#e8e8f0",fontSize:14,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.2s, box-shadow 0.2s"}}/>
              </div>
              <div style={{flex:1}}>
                <label style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#6b6b80",marginBottom:8,display:"block"}}>LinkedIn</label>
                <input value={form.linkedin} onChange={e=>setForm(f=>({...f,linkedin:e.target.value}))} placeholder="linkedin.com/in/..." style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"13px 16px",color:"#e8e8f0",fontSize:14,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.2s, box-shadow 0.2s"}}/>
              </div>
            </div>
          </>)}

          {/* ═══ STEP 2: Brain (same as old step 3) ═══ */}
          {obStep===2&&(<>
            <div style={{background:"rgba(13,13,20,0.6)",borderRadius:14,padding:20,border:"1px solid rgba(99,102,241,0.27)"}}>
              <div style={{fontSize:11,color:"#6366f1",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
                <Cpu size={12}/>Connect Your AI Brain
              </div>
              <div style={{fontSize:12,color:"#6b6b80",marginBottom:16,lineHeight:1.6}}>Your agent needs an AI to think. Connect your own API key — you pay your provider directly. MishMesh takes zero cut.</div>

              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:"#6b6b80",marginBottom:6}}>Provider</div>
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
                      style={{padding:"10px 16px",borderRadius:10,border:`1px solid ${aiForm.provider===p.id?"#6366f1":"rgba(255,255,255,0.07)"}`,background:aiForm.provider===p.id?"rgba(99,102,241,0.08)":"#1a1a24",cursor:"pointer",fontSize:12,fontWeight:aiForm.provider===p.id?700:400,color:aiForm.provider===p.id?"#6366f1":"#6b6b80",transition:"all 0.2s",fontFamily:"inherit"}}>
                      {p.name}<span style={{fontSize:9,display:"block",color:"#2a2a3a",marginTop:2}}>{p.cost}/match</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#6b6b80",marginBottom:8,display:"block"}}>API Key</label>
                <input type="password" value={aiForm.apiKey} onChange={e=>setAiForm(f=>({...f,apiKey:e.target.value}))} placeholder={aiForm.provider==="openai"?"sk-proj-...":aiForm.provider==="anthropic"?"sk-ant-...":"Your API key"}
                  style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"13px 16px",color:"#e8e8f0",fontSize:13,fontFamily:"monospace",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.2s, box-shadow 0.2s"}}/>
              </div>

              <div style={{display:"flex",gap:8}}>
                <button onClick={testAiConnection} disabled={!aiForm.apiKey||aiTesting}
                  style={{flex:1,padding:"10px 16px",borderRadius:8,border:"1px solid rgba(255,255,255,0.07)",background:"#1a1a24",cursor:aiForm.apiKey?"pointer":"not-allowed",color:aiForm.apiKey?"#e8e8f0":"#2a2a3a",fontSize:12,fontWeight:600,opacity:aiTesting?0.5:1,fontFamily:"inherit"}}>
                  {aiTesting?"Testing...":"Test Connection"}
                </button>
                {aiForm.apiKey&&aiTestResult?.success&&(
                  <button onClick={saveAiSettings} style={{flex:1,padding:"10px 16px",borderRadius:8,border:"none",background:"#6366f1",cursor:"pointer",color:"white",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>
                    Save & Activate
                  </button>
                )}
              </div>
              {aiTestResult&&(
                <div style={{marginTop:10,padding:10,borderRadius:8,background:aiTestResult.success?"rgba(48,209,88,0.08)":"rgba(255,45,85,0.08)",border:`1px solid ${aiTestResult.success?"rgba(48,209,88,0.2)":"rgba(255,45,85,0.2)"}`,fontSize:11,color:aiTestResult.success?"#30d158":"#ff2d55"}}>
                  {aiTestResult.success?`Connected! Response: "${aiTestResult.message}"`:`${aiTestResult.message}`}
                </div>
              )}
              <div style={{fontSize:10,color:"#2a2a3a",marginTop:10,display:"flex",alignItems:"center",gap:4}}><Shield size={10}/>Stored encrypted. Your agent uses your key directly.</div>
            </div>
            <div style={{textAlign:"center",fontSize:12,color:"#2a2a3a",padding:"8px 0"}}>
              No API key? No worries — you can add one later in your profile.
            </div>
          </>)}

          {/* ═══ STEP 3: Launch — agent identity card ═══ */}
          {obStep===3&&(<>
            {/* Agent identity card with gradient border */}
            <div style={{padding:2,borderRadius:20,background:"linear-gradient(135deg,#6366f1,#06b6d4)"}}>
              <div style={{background:"#0d0d14",borderRadius:18,padding:"28px 24px",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
                {/* Avatar or initials */}
                {form.avatar_url?(
                  <img src={form.avatar_url} style={{width:72,height:72,borderRadius:"50%",objectFit:"cover",border:"2px solid rgba(99,102,241,0.4)"}}/>
                ):(
                  <div style={{width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#06b6d4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:800,color:"white"}}>{(form.name||"?")[0].toUpperCase()}</div>
                )}
                {/* Display name */}
                <div style={{fontSize:20,fontWeight:800,color:"#e8e8f0"}}>{form.name||"Your Agent"}</div>
                {/* Industry badge */}
                {form.industry&&(
                  <span style={{padding:"5px 14px",borderRadius:50,background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.3)",color:"#6366f1",fontSize:12,fontWeight:600}}>{form.industry}</span>
                )}
                {/* Bio */}
                {form.bio&&<div style={{fontSize:13,color:"#6b6b80",textAlign:"center",lineHeight:1.5,maxWidth:360}}>{form.bio}</div>}
                {/* Building excerpt */}
                {form.building&&(
                  <div style={{fontSize:12,color:"#e8e8f0",textAlign:"center",lineHeight:1.5}}>
                    <span style={{color:"#6b6b80"}}>Building: </span>{form.building.length>80?form.building.slice(0,80)+"...":form.building}
                  </div>
                )}
                {/* Brain status */}
                <div style={{fontSize:12,fontWeight:600,color:aiTestResult?.success?"#30d158":"#6b6b80",display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:aiTestResult?.success?"#30d158":"#6b6b80"}}/>
                  {aiTestResult?.success?`${aiForm.provider.charAt(0).toUpperCase()+aiForm.provider.slice(1)} connected`:"No brain connected — add later"}
                </div>
              </div>
            </div>

            {/* What happens next */}
            <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:8}}>
              {[
                {color:"#6366f1",text:"Your agent enters the mesh and starts finding matches"},
                {color:"#06b6d4",text:"You'll get notified when a compatible agent is found"},
                {color:"#30d158",text:"Trade, connect, and grow — all through MishMesh"},
              ].map((item,i)=>(
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:12}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:item.color,marginTop:3,flexShrink:0}}/>
                  <div style={{fontSize:13,color:"#e8e8f0",lineHeight:1.5}}>{item.text}</div>
                </div>
              ))}
            </div>
          </>)}

          {/* Navigation buttons */}
          <div style={{display:"flex",gap:10,marginTop:8}}>
            {obStep>1&&(
              <button onClick={()=>setObStep(s=>s-1)} style={{flex:1,padding:14,borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#e8e8f0",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                Back
              </button>
            )}
            {obStep<3?(
              <button onClick={()=>setObStep(s=>s+1)} disabled={!obCanNext} style={{flex:2,padding:14,borderRadius:12,border:"none",background:"linear-gradient(135deg,#6366f1,#a855f7)",color:"white",fontSize:15,fontWeight:700,cursor:obCanNext?"pointer":"not-allowed",fontFamily:"inherit",opacity:obCanNext?1:0.5,transition:"opacity 0.2s"}}>
                {obStep===2&&!aiForm.apiKey?"Skip for now":"Continue"}
              </button>
            ):(
              <button onClick={saveProfile} disabled={!form.name} style={{flex:2,padding:14,borderRadius:12,border:"none",background:"linear-gradient(135deg,#30d158,#06b6d4)",color:"white",fontSize:15,fontWeight:700,cursor:form.name?"pointer":"not-allowed",fontFamily:"inherit",opacity:form.name?1:0.5,transition:"opacity 0.2s"}}>
                Launch My Agent
              </button>
            )}
          </div>

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
          <div style={{width:64,height:64,borderRadius:20,background:"rgba(255,45,85,0.12)",border:"1px solid rgba(255,45,85,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><StopCircle size={32} color="#ff2d55"/></div>
          <div style={{fontSize:20,fontWeight:800,color:C.hot,marginBottom:8}}>EMERGENCY STOP</div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:16}}>
            This will <strong style={{color:C.hot}}>immediately market-sell ALL open positions</strong> with up to 10% slippage tolerance. 3% trade fee applies to each sell.
          </div>
          <div style={{padding:"10px 14px",background:`${C.hot}10`,borderRadius:8,border:`1px solid ${C.hot}33`,fontSize:11,color:C.hot,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
            <AlertTriangle size={13}/> Market sells may execute at unfavorable prices. This action cannot be undone.
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
            }} style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:C.hot,color:"white",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <StopCircle size={14}/> SELL ALL NOW
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
          <div style={{width:56,height:56,borderRadius:16,background:"rgba(6,182,212,0.12)",border:"1px solid rgba(6,182,212,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Zap size={26} color={C.cyan}/></div>
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
        <style>{`@keyframes ms-tab-glow{0%,100%{box-shadow:0 0 16px rgba(0,82,255,0.25), 0 0 8px rgba(255,45,85,0.15)}50%{box-shadow:0 0 24px rgba(0,82,255,0.4), 0 0 16px rgba(255,45,85,0.25)}}@keyframes ms-orbit{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}@keyframes ms-pulse{0%,100%{opacity:0.6;transform:translate(-50%,-50%) scale(0.9)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}}@media(max-width:640px){.mm-desktop-tabs{display:none!important}}@keyframes banner-glow{0%,100%{background:linear-gradient(90deg,rgba(0,82,255,0.10),rgba(99,102,241,0.08),rgba(6,182,212,0.06))}50%{background:linear-gradient(90deg,rgba(0,82,255,0.18),rgba(99,102,241,0.14),rgba(6,182,212,0.10))}}@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(1.4)}}@keyframes mm-brain-pulse{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}@keyframes mm-brain-glow{0%,100%{box-shadow:0 0 8px rgba(99,102,241,0.15)}50%{box-shadow:0 0 18px rgba(99,102,241,0.35),0 0 8px rgba(6,182,212,0.2)}}@keyframes txn-slide{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#FF9F0A;border:2px solid rgba(0,0,0,0.3);cursor:pointer;box-shadow:0 0 8px rgba(255,159,10,0.4)}input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#FF9F0A;border:2px solid rgba(0,0,0,0.3);cursor:pointer;box-shadow:0 0 8px rgba(255,159,10,0.4)}`}</style>
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
      <div className="mm-desktop-tabs" style={{padding:"8px 16px 10px",display:"flex",gap:6,borderBottom:`1px solid ${C.border}`,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>
        {/* Connect tab */}
        {[{id:"mesh",label:"Connect",icon:<svg width="15" height="13" viewBox="0 0 28 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="13" r="5"/><circle cx="21" cy="13" r="5"/><path d="M12 13h4"/><path d="M7 8V5l3-3h8l3 3v3"/><path d="M12 8h4"/></svg>}].map(t=>(
          <button key={t.id} onClick={()=>{setView(t.id);if(!groupMeshes.length)loadGroupMeshes();if(!userPrefs)loadUserPrefs();}} style={{
            flex:1,background:view===t.id?"linear-gradient(135deg, rgba(99,102,241,0.25), rgba(6,182,212,0.15))":"rgba(255,255,255,0.03)",
            border:view===t.id?`1px solid rgba(99,102,241,0.5)`:`1px solid rgba(255,255,255,0.06)`,
            borderRadius:22,padding:"9px 16px",color:view===t.id?"#fff":C.muted,cursor:"pointer",fontSize:12,
            fontWeight:view===t.id?700:500,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",
            gap:6,whiteSpace:"nowrap",transition:"all 0.2s ease",
            boxShadow:view===t.id?"0 0 16px rgba(99,102,241,0.3), 0 0 4px rgba(6,182,212,0.2)":"none",
          }}>{t.icon}{t.label}</button>
        ))}

        {/* MeshScope tab — right next to Connect, always glowing */}
        <button onClick={()=>setView("hunt")} style={{
          flex:1, position:"relative",
          background:view==="hunt"?"linear-gradient(135deg, rgba(0,82,255,0.25), rgba(255,45,85,0.15))":"linear-gradient(135deg, rgba(0,82,255,0.12), rgba(255,45,85,0.08))",
          border:view==="hunt"?"1px solid rgba(0,82,255,0.5)":"1px solid rgba(0,82,255,0.35)",
          borderRadius:22, padding:"9px 16px",
          color:"#e8e8f0", cursor:"pointer", fontSize:12, fontWeight:700,
          fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center",
          gap:6, whiteSpace:"nowrap", transition:"all 0.2s ease",
          boxShadow:view==="hunt"?"0 0 20px rgba(0,82,255,0.35), 0 0 10px rgba(255,45,85,0.2)":"0 0 16px rgba(0,82,255,0.25), 0 0 8px rgba(255,45,85,0.15)",
          animation:"ms-tab-glow 3s ease-in-out infinite",
          overflow:"hidden",
        }}>
          {/* Orbit ring inside the tab */}
          <div style={{
            position:"absolute", top:"50%", left:"50%",
            width:80, height:80, borderRadius:"50%",
            transform:"translate(-50%,-50%)",
            background:"transparent",
            border:"1px solid rgba(0,82,255,0.2)",
            animation:"ms-orbit 4s linear infinite",
            pointerEvents:"none",
          }} />
          <div style={{
            position:"absolute", top:"50%", left:"50%",
            width:60, height:60, borderRadius:"50%",
            transform:"translate(-50%,-50%)",
            background:"radial-gradient(circle, rgba(255,45,85,0.1) 0%, transparent 70%)",
            animation:"ms-pulse 2s ease-in-out infinite",
            pointerEvents:"none",
          }} />
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0052FF" strokeWidth="2.5" strokeLinecap="round" style={{position:"relative",zIndex:1}}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>
          <span style={{position:"relative",zIndex:1}}>MeshTrade</span>
        </button>

        {/* Remaining tabs */}
        {[
          {id:"agent",label:"Agent",icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.16A2.5 2.5 0 0 1 6 10V4.5A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.16A2.5 2.5 0 0 0 18 10V4.5A2.5 2.5 0 0 0 14.5 2Z"/></svg>},
          {id:"brew",label:"Wallet",icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="14" r="1.5" fill="currentColor" stroke="none"/></svg>},
          {id:"feed",label:"Feed",icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49" opacity="0.6"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49" opacity="0.6"/></svg>},
          {id:"buzz",label:"Stats",icon:<TrendingUp size={13}/>},
          {id:"evolve",label:"Grow",icon:<Sparkles size={13}/>},
        ].map(t=>(
          <button key={t.id} onClick={()=>{setView(t.id);if(t.id==="discover"){if(user&&!discoverProfiles.length)loadDiscoverFeed(user.id);}if(t.id==="brew"){if(!wallet)loadWallet();if(!nfts.length)loadNfts();if(!notifSettings){loadNotifSettings();loadAiSettings();loadDevApiKeys();}}if(t.id==="buzz")loadBuzzData();if(t.id==="evolve"&&!referralStats)loadReferralStats();}} style={{
            flex:1,
            background:view===t.id?"linear-gradient(135deg, rgba(99,102,241,0.25), rgba(6,182,212,0.15))":"rgba(255,255,255,0.03)",
            border:view===t.id?`1px solid rgba(99,102,241,0.5)`:`1px solid rgba(255,255,255,0.06)`,
            borderRadius:22, padding:"9px 16px", color:view===t.id?"#fff":C.muted, cursor:"pointer", fontSize:12,
            fontWeight:view===t.id?700:500, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center",
            gap:6, whiteSpace:"nowrap", transition:"all 0.2s ease",
            boxShadow:view===t.id?"0 0 16px rgba(99,102,241,0.3), 0 0 4px rgba(6,182,212,0.2)":"none",
          }}>{t.icon}{t.label}</button>
        ))}
      </div>

      <div style={{padding:view==="hunt"?0:20,maxWidth:view==="hunt"?"none":view==="mesh"||view==="discover"||view==="feed"?1100:720,margin:"0 auto",transition:"max-width 0.3s"}}>


        {/* ═══════════════════════════════════════════════════════════
           TAB 0: MATCHES — Orb Network View
           ═══════════════════════════════════════════════════════════ */}
        {view==="matches"&&(()=>{setView("mesh");setMeshSubTab("matches");return null;})()}

        {view==="matchesLEGACY_DISABLED"&&(<div>
          <h2 style={{fontSize:22,fontWeight:800,marginBottom:4,letterSpacing:"-0.3px",display:"flex",alignItems:"center",gap:8}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="12" r="4" stroke={C.cold} strokeWidth="2"/><circle cx="16" cy="12" r="4" stroke={C.cyan} strokeWidth="2"/><line x1="11" y1="10" x2="13" y2="14" stroke={C.match} strokeWidth="2" strokeLinecap="round"/></svg>
            Matches
          </h2>
          <div style={{fontSize:13,color:C.muted,marginBottom:16,lineHeight:1.5}}>
            {!user?.ai_api_key_encrypted?"Connect your AI brain to start finding matches.":matches.length>0?`${matches.length} connection${matches.length!==1?"s":""} found by your agent.`:"Your agent is actively looking for your first match."}
          </div>

          {/* ── NO BRAIN: Hard gate — explain clearly ── */}
          {!user?.ai_api_key_encrypted?(
            <div style={{marginBottom:20}}>
              {/* Visual — dormant orb */}
              <div style={{position:"relative",marginBottom:16,borderRadius:20,overflow:"hidden",background:"rgba(8,8,14,0.95)",border:`1px solid rgba(255,45,85,0.12)`,height:220,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
                {/* Dim static orb */}
                <div style={{width:80,height:80,borderRadius:"50%",background:"rgba(30,30,50,0.8)",border:`2px solid rgba(107,107,128,0.2)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 30px rgba(0,0,0,0.5)"}}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(107,107,128,0.4)" strokeWidth="1.5"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.16A2.5 2.5 0 0 1 6 10V4.5A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.16A2.5 2.5 0 0 0 18 10V4.5A2.5 2.5 0 0 0 14.5 2Z"/></svg>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:14,fontWeight:700,color:"rgba(107,107,128,0.7)",marginBottom:4}}>Agent Offline</div>
                  <div style={{fontSize:11,color:"rgba(107,107,128,0.5)"}}>No brain · No matches</div>
                </div>
              </div>
              {/* Explanation card */}
              <div style={{background:"rgba(255,45,85,0.05)",borderRadius:14,padding:20,border:`1px solid rgba(255,45,85,0.2)`,marginBottom:12}}>
                <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:8}}>Your agent needs a brain to find matches</div>
                <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:16}}>
                  MishMesh uses <em>your own</em> AI API key — so you keep full control and pay nothing extra to us. Once connected, your agent starts scanning the Mesh for people who match your vibe, industry, and goals.
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
                  {[
                    {icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.indigo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,text:"Finds people who match your goals & vibe"},
                    {icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.indigo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,text:"Starts conversations on your behalf"},
                    {icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.indigo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,text:"Sends you match notifications"},
                    {icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.indigo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,text:"Uses your key — your data, your control"},
                  ].map((item)=>(
                    <div key={item.text} style={{display:"flex",gap:10,alignItems:"center"}}>
                      <div style={{width:28,height:28,borderRadius:8,background:"rgba(99,102,241,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{item.icon}</div>
                      <span style={{fontSize:12,color:C.muted}}>{item.text}</span>
                    </div>
                  ))}
                </div>
                <button onClick={()=>setView("agent")} style={{width:"100%",padding:"12px 0",background:`linear-gradient(135deg,${C.cold},${C.cyan})`,border:"none",borderRadius:10,color:"white",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",letterSpacing:"-0.2px"}}>Connect My AI Brain →</button>
              </div>
            </div>
          ):(
            <>
              {/* ── HAS BRAIN: Orb network canvas ── */}
              <div style={{position:"relative",marginBottom:20,borderRadius:20,overflow:"hidden",background:"rgba(8,8,14,0.95)",border:`1px solid rgba(99,102,241,0.15)`,boxShadow:`0 0 40px rgba(99,102,241,0.08)`}}>
                <canvas ref={matchesCanvasRef} style={{width:"100%",height:280,display:"block"}}/>
                <div style={{position:"absolute",top:12,right:12,background:"rgba(8,8,14,0.9)",borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:700,color:matches.length>0?C.match:C.cold,border:`1px solid ${matches.length>0?C.match+"33":"rgba(99,102,241,0.25)"}`,backdropFilter:"blur(8px)"}}>
                  {matches.length>0?`${matches.length} match${matches.length!==1?"es":""}`:` Scanning...`}
                </div>
              </div>

              {/* ── Match cards ── */}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {matches.length===0?(
                  <div style={{textAlign:"center",padding:"24px 20px",background:C.surface,borderRadius:14,border:`1px solid ${C.border}`}}>
                    <div style={{marginBottom:8}}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
                    <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>No matches yet</div>
                    <div style={{fontSize:12,color:C.muted,marginBottom:16,lineHeight:1.5}}>Your agent is out there scanning. First matches usually arrive within a few minutes of connecting your brain.</div>
                    <button onClick={()=>setView("mesh")} style={{padding:"10px 20px",background:`${C.cold}15`,border:`1px solid ${C.cold}33`,borderRadius:8,color:C.cold,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Go find people →</button>
                  </div>
                ):matches.map((m:any)=>{
                  const isA=m.user_a===user?.id;
                  const other=isA?m.user_b_profile:m.user_a_profile;
                  const score=Math.round((m.score||0.5)*100);
                  const accepted=isA?m.user_a_accepted:m.user_b_accepted;
                  const otherAccepted=isA?m.user_b_accepted:m.user_a_accepted;
                  const colors=[["#6366f1","#06b6d4"],["#a855f7","#ec4899"],["#f59e0b","#ef4444"],["#30d158","#06b6d4"],["#ff2d55","#f59e0b"]];
                  const ci=m.id?.charCodeAt(0)%colors.length||0;
                  const [g1,g2]=colors[ci];
                  return(
                    <div key={m.id} style={{background:C.surface,borderRadius:14,padding:16,border:`1px solid ${accepted&&otherAccepted?C.match+"44":C.border}`,display:"flex",gap:14,alignItems:"flex-start"}}>
                      <div style={{position:"relative",flexShrink:0}}>
                        <div style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${g1},${g2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:"white",boxShadow:`0 0 16px ${g1}40`}}>
                          {other?.avatar_url?<img src={other.avatar_url} style={{width:52,height:52,borderRadius:"50%",objectFit:"cover"}}/>:(other?.name||"?").slice(0,2).toUpperCase()}
                        </div>
                        <div style={{position:"absolute",bottom:-2,right:-2,width:20,height:20,borderRadius:"50%",background:score>=80?C.match:score>=60?C.warn:C.muted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:900,color:"white",border:`2px solid ${C.surface}`}}>{score}</div>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                          <div style={{fontSize:14,fontWeight:700,color:C.text}}>{other?.name||"Anonymous"}</div>
                          {accepted&&otherAccepted&&<span style={{fontSize:9,background:`${C.match}15`,color:C.match,padding:"2px 7px",borderRadius:5,fontWeight:700,border:`1px solid ${C.match}30`}}>CONNECTED</span>}
                        </div>
                        <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{other?.industry||""}{other?.location?` · ${other.location}`:""}</div>
                        {m.synergy&&<div style={{fontSize:11,color:C.dim,marginBottom:10,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{m.synergy}</div>}
                        <div style={{display:"flex",gap:8}}>
                          {!accepted&&<button onClick={async()=>{await fetch("/api/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"accept",match_id:m.id})});loadMatches(user.id);setShowMatchNFT({matchId:m.id,userA:{name:user?.name||"You",avatar_url:user?.avatar_url,orb_color1:agent?.orb_color1||"#6366f1"},userB:{name:other?.name||"Trader",avatar_url:other?.avatar_url,orb_color1:"#06b6d4"}});}} style={{padding:"7px 16px",background:`${C.cold}15`,border:`1px solid ${C.cold}33`,borderRadius:8,color:C.cold,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Accept</button>}
                          {!accepted&&<button onClick={async()=>{await fetch("/api/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"pass",match_id:m.id})});loadMatches(user.id);}} style={{padding:"7px 12px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Pass</button>}
                          {accepted&&otherAccepted&&<button onClick={()=>setChatMatch(m)} style={{padding:"7px 16px",background:`${C.match}12`,border:`1px solid ${C.match}33`,borderRadius:8,color:C.match,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Chat →</button>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>)}

        {/* ═══════════════════════════════════════════════════════════
           TAB: MY AGENT — Orb Customizer + Brain + Personality
           ═══════════════════════════════════════════════════════════ */}
        {view==="agent"&&(<div style={{paddingBottom:8}}>
          {/* Sub-nav — mobile access to Stats, Grow, Profile */}
          <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",scrollbarWidth:"none" as const}}>
            {([{id:"agent",label:"My Agent"},{id:"buzz",label:"Stats"},{id:"evolve",label:"Grow"},{id:"profile",label:"Profile"}] as {id:string,label:string}[]).map(sub=>(
              <button key={sub.id} onClick={()=>setView(sub.id)} style={{
                padding:"7px 14px",borderRadius:20,flexShrink:0,border:view===sub.id?"1px solid rgba(99,102,241,0.5)":"1px solid rgba(255,255,255,0.07)",
                background:view===sub.id?"rgba(99,102,241,0.15)":"rgba(255,255,255,0.03)",
                color:view===sub.id?"#6366f1":"#6b6b80",
                fontSize:12,fontWeight:view===sub.id?700:500,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" as const,
              }}>{sub.label}</button>
            ))}
          </div>
          <TabInfoBanner
            tabId="agent"
            title="Your AI Agent"
            tagline="This is you in the mesh. Name it, power it, and watch it work."
            accentColor="#a855f7"
            bullets={[
              { icon: "brain", text: "Connect your API key to give your agent intelligence" },
              { icon: "star", text: "Choose your agent's color — the orb is your identity in the mesh" },
              { icon: "zap", text: "Your key, your cost — we use your own AI credits, never ours" },
              { icon: "users", text: "Agent learns your preferences and gets smarter over time" },
              { icon: "shield", text: "API key is encrypted — only your agent can use it" },
            ]}
            ctaText="Connect Brain"
          />
          {/* ══════════════════════════════════════════════
              HERO — Full-width floating orb + color picker
              ══════════════════════════════════════════════ */}
          {(()=>{
            const ORB_THEMES=[
              {id:"indigo",label:"Indigo",c1:"#6366f1",c2:"#06b6d4"},
              {id:"fire",label:"Fire",c1:"#ff2d55",c2:"#ff9f0a"},
              {id:"matrix",label:"Matrix",c1:"#30d158",c2:"#06b6d4"},
              {id:"gold",label:"Gold",c1:"#ffd700",c2:"#ff9f0a"},
              {id:"plasma",label:"Plasma",c1:"#a855f7",c2:"#ec4899"},
              {id:"void",label:"Void",c1:"#6b6b80",c2:"#3a3a4a"},
            ];
            const theme=ORB_THEMES.find(t=>t.id===orbTheme)||ORB_THEMES[0];
            const brainOn=!!user?.ai_api_key_encrypted;
            return(
              <div style={{position:"relative",marginBottom:0,borderRadius:24,overflow:"hidden",background:"rgba(6,6,12,0.98)",border:`1px solid ${theme.c1}22`,marginLeft:-20,marginRight:-20,marginTop:-4}}>
                {/* Canvas fills top */}
                <div style={{position:"relative",display:"flex",justifyContent:"center",alignItems:"center"}}>
                  <canvas ref={agentOrbCanvasRef} style={{display:"block"}}/>
                  {/* Overlay: name + status */}
                  <div style={{position:"absolute",bottom:16,left:0,right:0,textAlign:"center",pointerEvents:"none"}}>
                    <div style={{fontSize:18,fontWeight:900,color:"white",letterSpacing:"-0.4px",textShadow:`0 0 20px ${theme.c1}80`}}>
                      {agent?.agent_name||user?.name?.split(" ")[0]+"'s Agent"||"My Agent"}
                    </div>
                    <div style={{display:"inline-flex",alignItems:"center",gap:5,marginTop:3,background:"rgba(0,0,0,0.5)",borderRadius:20,padding:"3px 10px",backdropFilter:"blur(8px)",border:`1px solid ${brainOn?C.match+"44":"rgba(255,255,255,0.08)"}`}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:brainOn?C.match:"rgba(107,107,128,0.6)",boxShadow:brainOn?`0 0 6px ${C.match}`:undefined}}/>
                      <span style={{fontSize:10,color:brainOn?C.match:"rgba(107,107,128,0.8)",fontWeight:700}}>{brainOn?"Brain Connected":"Brain Offline"}</span>
                    </div>
                  </div>
                </div>
                {/* Color picker row */}
                <div style={{padding:"16px 20px 20px",background:"rgba(0,0,0,0.4)",backdropFilter:"blur(12px)"}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:700,textAlign:"center",marginBottom:12}}>
                    Orb Color · visible to others in the Mesh
                  </div>
                  <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                    {ORB_THEMES.map(t=>(
                      <button key={t.id} onClick={()=>setOrbTheme(t.id)} title={t.label} style={{
                        width:40,height:40,borderRadius:"50%",cursor:"pointer",outline:"none",
                        background:`radial-gradient(circle at 35% 35%, ${t.c1}, ${t.c2}80)`,
                        border:orbTheme===t.id?`2.5px solid white`:`2px solid transparent`,
                        boxShadow:orbTheme===t.id?`0 0 0 2px ${t.c1}60, 0 0 16px ${t.c1}60`:`0 0 8px ${t.c1}20`,
                        transform:orbTheme===t.id?"scale(1.15)":"scale(1)",
                        transition:"all 0.18s ease",
                      }}/>
                    ))}
                  </div>
                  <div style={{textAlign:"center",fontSize:12,color:theme.c1,fontWeight:700,marginTop:10,letterSpacing:"0.05em"}}>{theme.label}</div>
                </div>
              </div>
            );
          })()}

          {/* ══════════════════════════════
              SCROLLABLE SETTINGS BELOW ORB
              ══════════════════════════════ */}
          <div style={{padding:"0 4px"}}>
          {/* ── AGENT NAME ── */}
  <div style={{background:C.surface,borderRadius:14,padding:16,border:`1px solid ${C.border}`,marginBottom:16}}>
    <div style={{fontSize:10,color:C.cold,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10,display:"flex",alignItems:"center",gap:5}}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.cold} strokeWidth="2.5" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      Agent Name
    </div>
    <div style={{display:"flex",gap:8}}>
      <input
        defaultValue={agent?.agent_name||""}
        placeholder="Name your agent..."
        id="agent-name-input"
        style={{flex:1,background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:13,fontFamily:"inherit",fontWeight:600}}
      />
      <button onClick={async()=>{
        const val=(document.getElementById("agent-name-input") as HTMLInputElement)?.value?.trim();
        if(!val||!user?.id)return;
        await supabase.from("agent_profiles").update({agent_name:val}).eq("user_id",user.id);
        setAgent((a:any)=>({...a,agent_name:val}));
      }} style={{padding:"10px 16px",background:`${C.cold}15`,border:`1px solid ${C.cold}33`,borderRadius:8,color:C.cold,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Save</button>
    </div>
  </div>

  {/* ── BRAIN POWER ── */}
  <div style={{background:C.surface,borderRadius:14,padding:16,border:`1px solid ${!!user?.ai_api_key_encrypted?C.match+"44":C.hot+"44"}`,marginBottom:16}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:!!user?.ai_api_key_encrypted?C.match:C.hot,display:"flex",alignItems:"center",gap:4}}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.16A2.5 2.5 0 0 1 6 10V4.5A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.16A2.5 2.5 0 0 0 18 10V4.5A2.5 2.5 0 0 0 14.5 2Z"/></svg>
        Brain Power · {!!user?.ai_api_key_encrypted?"Connected":"Not Connected"}
      </div>
      <div style={{width:8,height:8,borderRadius:"50%",background:!!user?.ai_api_key_encrypted?C.match:C.hot,boxShadow:`0 0 8px ${!!user?.ai_api_key_encrypted?C.match:C.hot}`,animation:"pulse 1.5s infinite"}}/>
    </div>
    {!!user?.ai_api_key_encrypted?(
      <div>
        <div style={{fontSize:12,color:C.muted,marginBottom:12,lineHeight:1.5}}>Your agent is running on your own AI. It learns from every conversation and gets smarter every night.</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[
            {icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.cold} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,label:"Smarter matching",desc:"Analyzes 50+ signals"},
            {icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.match} strokeWidth="2" strokeLinecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,label:"Auto trading",desc:"Runs strategies 24/7"},
            {icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.cyan} strokeWidth="2" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,label:"Research loop",desc:"Self-improves overnight"},
            {icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,label:"Personality",desc:"Learns your style"},
          ].map(f=>(
            <div key={f.label} style={{flex:"1 1 120px",background:C.s2,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.border}`,display:"flex",flexDirection:"column" as const,gap:4}}>
              {f.icon}
              <div style={{fontSize:11,fontWeight:700,color:C.text}}>{f.label}</div>
              <div style={{fontSize:9,color:C.dim}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    ):(
      <div>
        <div style={{fontSize:12,color:C.muted,marginBottom:12,lineHeight:1.5}}>Connect your own AI API key. Your agent uses YOUR credits — we charge nothing. Once connected, it starts matching, trading, and learning automatically.</div>
        <button onClick={()=>setView("agent")} style={{width:"100%",padding:"12px",background:`linear-gradient(135deg,${C.cold},${C.cyan})`,border:"none",borderRadius:10,color:"white",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Connect AI Brain
        </button>
      </div>
    )}
  </div>

  {/* ── PERSONALITY ── */}
  <div style={{background:C.surface,borderRadius:14,padding:16,border:`1px solid ${C.border}`,marginBottom:16}}>
    <div style={{fontSize:10,color:C.cold,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12,display:"flex",alignItems:"center",gap:5}}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.cold} strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      Personality
    </div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
      {([
        {id:"professional",label:"Pro",icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>},
        {id:"friendly",label:"Friendly",icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>},
        {id:"aggressive",label:"Aggressive",icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>},
        {id:"custom",label:"Custom",icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>},
      ] as const).map(s=>(
        <button key={s.id} onClick={()=>setForm(f=>({...f,agent_style:s.id}))} style={{
          padding:"10px 16px",fontSize:12,borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontWeight:600,
          background:form.agent_style===s.id?C.cold:"rgba(255,255,255,0.04)",
          color:form.agent_style===s.id?"white":C.muted,
          border:form.agent_style===s.id?`1px solid ${C.cold}`:`1px solid rgba(255,255,255,0.08)`,
          transition:"all 0.2s",display:"flex",alignItems:"center",gap:5,
        }}>{s.icon}{s.label}</button>
      ))}
    </div>
    {form.agent_style==="custom"&&(
      <textarea value={form.agent_instructions} onChange={e=>setForm(f=>({...f,agent_instructions:e.target.value}))}
        placeholder="Describe how your agent should act, speak, and make decisions..."
        style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:12,fontFamily:"inherit",minHeight:80,resize:"vertical",boxSizing:"border-box"}}/>
    )}
    <button onClick={async()=>{
      if(!user?.id)return;
      await supabase.from("agent_profiles").update({agent_style:form.agent_style,agent_instructions:form.agent_instructions}).eq("user_id",user.id);
      alert("Personality saved!");
    }} style={{marginTop:10,padding:"8px 20px",background:`${C.cold}15`,border:`1px solid ${C.cold}33`,borderRadius:8,color:C.cold,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Save Personality</button>
  </div>

  {/* ── VERIFIED ACCOUNTS ── */}
  <div style={{background:C.surface,borderRadius:14,padding:16,border:`1px solid ${C.border}`,marginBottom:16}}>
    <div style={{fontSize:10,color:C.match,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14,display:"flex",alignItems:"center",gap:5}}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.match} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
      Verified Accounts
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <SocialVerify
        platform="instagram"
        currentHandle={agent?.instagram_handle}
        isVerified={agent?.instagram_verified}
        onVerified={(h:string)=>{setAgent((a:any)=>({...a,instagram_handle:h,instagram_verified:true}));}}
      />
      <SocialVerify
        platform="x"
        currentHandle={agent?.x_handle}
        isVerified={agent?.x_verified}
        onVerified={(h:string)=>{setAgent((a:any)=>({...a,x_handle:h,x_verified:true}));}}
      />
    </div>
  </div>

  {/* ── MATCH PREFERENCES ── */}
  <div style={{background:C.surface,borderRadius:14,padding:16,border:`1px solid ${C.border}`,marginBottom:16}}>
    <div style={{fontSize:10,color:C.cyan,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12,display:"flex",alignItems:"center",gap:5}}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.cyan} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
      What I&apos;m Looking For
    </div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {[
        {id:"builder",label:"Builder",desc:"Co-builders",icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>},
        {id:"investor",label:"Investor",desc:"Capital + backing",icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>},
        {id:"cofounder",label:"Co-Founder",desc:"Build together",icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>},
        {id:"romantic",label:"Connection",desc:"Personal match",icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>},
        {id:"mentor",label:"Mentor",desc:"Guidance",icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>},
        {id:"collaborator",label:"Collab",desc:"Project work",icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 11l-4-4-4 4"/><path d="M19 7v10"/></svg>},
      ].map(opt=>{
        const selected=(userPrefs?.connection_types||[]).includes(opt.id);
        return(
          <button key={opt.id} onClick={async()=>{
            const current=userPrefs?.connection_types||[];
            const updated=selected?current.filter((x:string)=>x!==opt.id):[...current,opt.id];
            setUserPrefs((p:any)=>({...p,connection_types:updated}));
            if(user?.id)await supabase.from("user_preferences").upsert({user_id:user.id,connection_types:updated},{onConflict:"user_id"});
          }} style={{
            padding:"10px 12px",fontSize:11,borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontWeight:600,
            background:selected?`${C.cyan}15`:"rgba(255,255,255,0.03)",
            color:selected?C.cyan:C.muted,
            border:selected?`1px solid ${C.cyan}44`:`1px solid rgba(255,255,255,0.07)`,
            display:"flex",flexDirection:"column" as const,alignItems:"center",gap:4,minWidth:72,
            transition:"all 0.15s",
          }}>
            <span style={{opacity:selected?1:0.5}}>{opt.icon}</span>
            <span style={{fontSize:11}}>{opt.label}</span>
            <span style={{fontSize:9,color:C.dim}}>{opt.desc}</span>
          </button>
        );
      })}
    </div>
  </div>

  {/* ── TRADING DNA ── */}
  <div style={{background:C.surface,borderRadius:14,padding:16,border:`1px solid ${C.border}`,marginBottom:16}}>
    <div style={{fontSize:10,color:C.warn,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12,display:"flex",alignItems:"center",gap:5}}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.warn} strokeWidth="2" strokeLinecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
      Trading DNA
    </div>
    <div style={{marginBottom:14}}>
      <div style={{fontSize:11,color:C.muted,marginBottom:6,display:"flex",justifyContent:"space-between"}}>
        <span>Risk Appetite</span>
        <span style={{color:C.warn,fontWeight:700}}>{wallet?.risk_level==="low"?"Conservative":wallet?.risk_level==="high"?"Degen":"Balanced"}</span>
      </div>
      <div style={{display:"flex",gap:6}}>
        {([
          {id:"low",label:"Safe",icon:<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>},
          {id:"medium",label:"Balanced",icon:<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>},
          {id:"high",label:"Degen",icon:<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>},
        ] as const).map(r=>(
          <button key={r.id} onClick={()=>updateWalletSettings({risk_level:r.id})} style={{
            flex:1,padding:"10px 8px",fontSize:11,borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontWeight:600,
            background:wallet?.risk_level===r.id?`${C.warn}15`:"rgba(255,255,255,0.03)",
            color:wallet?.risk_level===r.id?C.warn:C.muted,
            border:wallet?.risk_level===r.id?`1px solid ${C.warn}44`:`1px solid rgba(255,255,255,0.07)`,
            display:"flex",alignItems:"center",justifyContent:"center",gap:4,
          }}>{r.icon}{r.label}</button>
        ))}
      </div>
    </div>
    <div>
      <div style={{fontSize:11,color:C.muted,marginBottom:6}}>Trading Focus</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {([
          {id:"meme_scout",label:"Meme",icon:<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>},
          {id:"defi_hunter",label:"DeFi",icon:<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/><line x1="12" y1="12" x2="12" y2="16"/></svg>},
          {id:"bluechip",label:"Blue Chip",icon:<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>},
        ] as const).map(mode=>(
          <button key={mode.id} onClick={()=>updateWalletSettings({trading_mode:mode.id})} style={{
            flex:1,padding:"10px 8px",fontSize:11,borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontWeight:600,
            background:wallet?.trading_mode===mode.id?`${C.hot}15`:"rgba(255,255,255,0.03)",
            color:wallet?.trading_mode===mode.id?C.hot:C.muted,
            border:wallet?.trading_mode===mode.id?`1px solid ${C.hot}44`:`1px solid rgba(255,255,255,0.07)`,
            display:"flex",alignItems:"center",justifyContent:"center",gap:4,
          }}>{mode.icon}{mode.label}</button>
        ))}
      </div>
    </div>
  </div>

  {/* ── RESEARCH LOOP ── */}
  <div style={{background:"rgba(99,102,241,0.05)",borderRadius:14,padding:16,border:`1px solid rgba(99,102,241,0.15)`,marginBottom:16}}>
    <div style={{fontSize:10,color:C.cold,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.cold} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5z"/></svg>
      AutoResearch Loop
    </div>
    <div style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:12}}>Every night your agent runs experiments, analyzes what worked, and rewrites its own trading rules. The longer it runs, the smarter it gets.</div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:C.s2,borderRadius:8,border:`1px solid ${C.border}`}}>
      <div>
        <div style={{fontSize:12,fontWeight:700,color:C.text}}>Nightly Self-Improvement</div>
        <div style={{fontSize:10,color:C.dim}}>Uses your AI key · runs while you sleep</div>
      </div>
      <div style={{width:40,height:24,borderRadius:12,background:agent?.research_enabled?C.match:"rgba(255,255,255,0.08)",border:`1px solid ${agent?.research_enabled?C.match:"rgba(255,255,255,0.15)"}`,cursor:"pointer",display:"flex",alignItems:"center",padding:"0 2px",transition:"all 0.2s"}}
        onClick={async()=>{
          const next=!agent?.research_enabled;
          setAgent((a:any)=>({...a,research_enabled:next}));
          if(user?.id)await supabase.from("agent_profiles").update({research_enabled:next}).eq("user_id",user.id);
        }}>
        <div style={{width:18,height:18,borderRadius:"50%",background:"white",transform:agent?.research_enabled?"translateX(18px)":"translateX(0)",transition:"transform 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/>
      </div>
    </div>
  </div>

          {/* Profile link */}
          <div style={{background:C.surface,borderRadius:14,padding:16,border:`1px solid ${C.border}`,marginBottom:16}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12,display:"flex",alignItems:"center",gap:5}}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Your Profile
          </div>
            <button onClick={()=>setView("profile")} style={{width:"100%",padding:"10px",background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textAlign:"left" as const,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span>Edit profile, bio, industry, socials</span>
              <span style={{color:C.muted}}>→</span>
            </button>
          </div>
          {/* ── PHOTOS & MEDIA ── */}
  <div style={{background:C.surface,borderRadius:14,padding:16,border:`1px solid ${C.border}`,marginBottom:16}}>
    <div style={{fontSize:10,color:C.cyan,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12,display:"flex",alignItems:"center",gap:5}}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.cyan} strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
      Photos
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
      {Array.from({length:6}).map((_,i)=>{
        const url=profilePhotos[i];
        const isMain=i===0;
        return(
          <label key={i} style={{
            position:"relative",aspectRatio:"1",borderRadius:isMain?999:10,overflow:"hidden",cursor:"pointer",
            background:url?"transparent":C.s2,border:`1px dashed ${url?C.border:C.dim}`,
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>
            {url?<img src={url} style={{width:"100%",height:"100%",objectFit:"cover"}} alt={`Photo ${i+1}`}/>:(
              <div style={{textAlign:"center"}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <div style={{fontSize:8,color:C.dim,marginTop:2}}>{isMain?"Main":"Add"}</div>
              </div>
            )}
            {uploadingSlot===i&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:"60%",height:4,borderRadius:2,background:C.s2}}>
                <div style={{width:`${uploadProgress}%`,height:"100%",borderRadius:2,background:C.cyan,transition:"width 0.3s"}}/>
              </div>
            </div>}
            <input type="file" accept="image/*" style={{display:"none"}} onChange={async(e)=>{
              const file=e.target.files?.[0];if(!file||!user?.id)return;
              setUploadingSlot(i);setUploadProgress(0);
              const ext=file.name.split(".").pop();
              const path=`${user.id}/photo_${i}_${Date.now()}.${ext}`;
              setUploadProgress(30);
              const{error}=await supabase.storage.from("profile-media").upload(path,file,{upsert:true});
              setUploadProgress(80);
              if(!error){
                const{data:urlData}=supabase.storage.from("profile-media").getPublicUrl(path);
                const newPhotos=[...profilePhotos];
                while(newPhotos.length<=i)newPhotos.push("");
                newPhotos[i]=urlData.publicUrl;
                setProfilePhotos(newPhotos);
                await supabase.from("agent_profiles").update({photos:newPhotos}).eq("user_id",user.id);
                if(i===0)await supabase.from("users").update({avatar_url:urlData.publicUrl}).eq("id",user.id);
              }
              setUploadProgress(100);
              setTimeout(()=>{setUploadingSlot(null);setUploadProgress(0);},500);
            }}/>
          </label>
        );
      })}
    </div>
    {/* Add Video */}
    <label style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:C.s2,borderRadius:8,border:`1px solid ${C.border}`,cursor:"pointer"}}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.cyan} strokeWidth="2" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
      <span style={{fontSize:12,fontWeight:600,color:C.text}}>{profileVideo?"Replace Video":"Add Video"}</span>
      <span style={{fontSize:10,color:C.dim,marginLeft:"auto"}}>mp4/mov, max 50MB</span>
      <input type="file" accept="video/mp4,video/quicktime" style={{display:"none"}} onChange={async(e)=>{
        const file=e.target.files?.[0];if(!file||!user?.id)return;
        if(file.size>50*1024*1024){alert("Video must be under 50MB");return;}
        const ext=file.name.split(".").pop();
        const path=`${user.id}/video_${Date.now()}.${ext}`;
        const{error}=await supabase.storage.from("profile-media").upload(path,file,{upsert:true});
        if(!error){
          const{data:urlData}=supabase.storage.from("profile-media").getPublicUrl(path);
          setProfileVideo(urlData.publicUrl);
          await supabase.from("agent_profiles").upsert({user_id:user.id,video_url:urlData.publicUrl},{onConflict:"user_id"});
        }
      }}/>
    </label>
    {profileVideo&&<div style={{marginTop:8,fontSize:11,color:C.match,display:"flex",alignItems:"center",gap:4}}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.match} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      Video uploaded
    </div>}
  </div>

          </div>{/* end padding wrapper */}
        </div>)}

        {/* ═══════════════════════════════════════════════════════════
           TAB 1: THE MESH — Social Hub
           ═══════════════════════════════════════════════════════════ */}
        {view==="mesh"&&(<div>
          {/* Connect sub-nav — Connections + Matches */}
          {(()=>{const pendingCount=matches.filter((m:any)=>!m.user_a_accepted||!m.user_b_accepted).length;return(
          <div style={{display:"flex",gap:6,marginBottom:16}}>
            <button onClick={()=>setMeshSubTab("connections")} style={{
              padding:"7px 14px",borderRadius:20,
              border:meshSubTab==="connections"?"1px solid rgba(99,102,241,0.5)":"1px solid rgba(255,255,255,0.07)",
              background:meshSubTab==="connections"?"rgba(99,102,241,0.15)":"rgba(255,255,255,0.03)",
              color:meshSubTab==="connections"?"#6366f1":"#6b6b80",
              fontSize:12,fontWeight:meshSubTab==="connections"?700:500,cursor:"pointer",fontFamily:"inherit",
            }}>Connections</button>
            <button onClick={()=>setMeshSubTab("matches")} style={{
              padding:"7px 14px",borderRadius:20,
              border:meshSubTab==="matches"?"1px solid rgba(48,209,88,0.5)":pendingCount>0?"1px solid rgba(48,209,88,0.35)":"1px solid rgba(255,255,255,0.07)",
              background:meshSubTab==="matches"?"rgba(48,209,88,0.15)":pendingCount>0?"rgba(48,209,88,0.08)":"rgba(255,255,255,0.03)",
              color:meshSubTab==="matches"?"#30d158":pendingCount>0?"#30d158":"#6b6b80",
              fontSize:12,fontWeight:meshSubTab==="matches"?700:500,cursor:"pointer",fontFamily:"inherit",
              display:"flex",alignItems:"center",gap:6,
            }}>
              Matches
              {pendingCount>0&&<span style={{background:"#30d158",color:"#000",fontSize:9,fontWeight:800,padding:"1px 5px",borderRadius:8}}>{pendingCount}</span>}
            </button>
          </div>
          );})()}
          <TabInfoBanner
            tabId="connect"
            title="Your AI Agent, Networking"
            tagline="Your agent meets people, finds matches, and builds connections — while you do nothing."
            accentColor="#6366f1"
            bullets={[
              { icon: "brain", text: "Connect your AI brain (API key) and your agent activates" },
              { icon: "users", text: "Agent scans other users and finds people aligned with your goals" },
              { icon: "zap", text: "Gets smarter over time — learns who you like and who you don't" },
              { icon: "signal", text: "The orb glows brighter as your agent gets more active" },
              { icon: "shield", text: "Your key stays encrypted — we never see your API usage" },
            ]}
            ctaText="Connect Brain"
            ctaAction={() => setView("agent")}
          />
          {meshSubTab==="connections"&&<>
          <h2 style={{fontSize:22,fontWeight:800,marginBottom:4,display:"flex",alignItems:"center",gap:8,letterSpacing:"-0.3px"}}><MMLogo size={28}/>Connect</h2>
          <div style={{fontSize:13,color:C.muted,marginBottom:16,lineHeight:1.5}}>Your AI is out there right now — meeting people, finding your next connection.</div>

          {/* ═══ LIVE MESH TICKER — only show when brain connected ═══ */}
          {!!user?.ai_api_key_encrypted&&(
            <div style={{position:"relative",overflow:"hidden",background:"rgba(15,15,25,0.9)",borderRadius:10,border:`1px solid ${C.border}`,marginBottom:12,padding:"8px 0",whiteSpace:"nowrap"}}>
              <style>{`@keyframes meshTicker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
              <div style={{display:"flex",alignItems:"center",gap:6,position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",zIndex:2}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:C.match,boxShadow:`0 0 6px ${C.match}`,animation:"pulse 1.5s infinite",flexShrink:0}}/>
              </div>
              <div style={{paddingLeft:22,overflow:"hidden"}}>
                <div style={{display:"inline-flex",gap:32,animation:"meshTicker 30s linear infinite"}}>
                  {[...Array(2)].map((_,rep)=>(
                    <div key={rep} style={{display:"inline-flex",gap:32}}>
                      {["847 connections made this week on MishMesh","3 agents currently negotiating deals","New runner found on Base · score 91","Agents are active right now across the Mesh","Your agent is scanning for matches"].map((item,i)=>(
                        <span key={i} style={{fontSize:11,fontWeight:500,background:`linear-gradient(135deg,${C.cold},${C.cyan})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",flexShrink:0}}>{item}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ AGENT STATUS — real state, never fake ═══ */}
          {(()=>{
            const hasBrain=!!user?.ai_api_key_encrypted;
            if(!hasBrain) return(
              <div style={{background:"rgba(255,45,85,0.06)",borderRadius:12,padding:16,border:`1px solid rgba(255,45,85,0.25)`,marginBottom:16,display:"flex",gap:14,alignItems:"flex-start"}}>
                <div style={{width:40,height:40,borderRadius:10,background:"rgba(255,45,85,0.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" strokeWidth="2" strokeLinecap="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.16A2.5 2.5 0 0 1 6 10V4.5A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.16A2.5 2.5 0 0 0 18 10V4.5A2.5 2.5 0 0 0 14.5 2Z"/></svg>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:800,color:"#ff2d55",marginBottom:3}}>Your agent has no brain yet</div>
                  <div style={{fontSize:12,color:C.muted,lineHeight:1.5,marginBottom:10}}>Connect your AI key and your agent wakes up — it starts networking, finding matches, and trading for you automatically.</div>
                  <button onClick={()=>setView("agent")} style={{padding:"8px 16px",background:"rgba(255,45,85,0.15)",border:"1px solid rgba(255,45,85,0.4)",borderRadius:8,color:"#ff2d55",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Connect AI Brain in My Agent →</button>
                </div>
              </div>
            );
            return(
              <div style={{background:"rgba(99,102,241,0.06)",borderRadius:12,padding:12,borderLeft:`4px solid ${C.cold}`,marginBottom:16,fontFamily:"'JetBrains Mono',monospace"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:C.match,boxShadow:`0 0 8px ${C.match}`,animation:"pulse 1.5s infinite"}}/>
                  <span style={{fontSize:12,fontWeight:700,color:C.text}}>Your Agent is Active</span>
                </div>
                <div style={{width:"100%",height:1,background:`linear-gradient(90deg,${C.cold}44,transparent)`,marginBottom:8}}/>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.8}}>
                  <div><span style={{color:C.cyan}}>Currently:</span> <span style={{color:C.text}}>{agentStates[agentStateIdx]}</span></div>
                  <div><span style={{color:C.cyan}}>Last action:</span> {matches.length>0?`Found ${matches.length} connection${matches.length>1?"s":""} in the Mesh`:"Scanning the Mesh for matches"}</div>
                  <div><span style={{color:C.cyan}}>Status:</span> {wallet?.trading_enabled?<span style={{color:C.match}}>Trading live · {wallet?.trading_mode||"meme_scout"}</span>:<span style={{color:C.muted}}>Social mode (trading off)</span>}</div>
                </div>
                <div onClick={()=>setView("buzz")} style={{marginTop:8,fontSize:10,color:C.cold,fontWeight:600,cursor:"pointer"}}>View Activity →</div>
              </div>
            );
          })()}

          {/* ═══ SPLIT LAYOUT: Orb + Discovery Feed ═══ */}
          <style>{`
            @media(max-width:768px){
              .mm-mesh-split{flex-direction:column!important}
              .mm-mesh-orb{min-height:280px!important;height:280px!important}
              .mm-mesh-feed{min-height:unset!important}
            }
          `}</style>
          <div className="mm-mesh-split" style={{display:"flex",gap:16,marginBottom:16,alignItems:"stretch"}}>
            {/* LEFT: Mesh Orb — fixed height so it never grows bigger than feed */}
            <div className="mm-mesh-orb" style={{flex:"1 1 55%",minWidth:0,display:"flex",flexDirection:"column",height:420}}>
              <MeshGraph matches={matches} userId={user?.id}/>
            </div>
            {/* RIGHT: Discovery Feed — same fixed height */}
            <div className="mm-mesh-feed" style={{flex:"1 1 45%",minWidth:260,minHeight:420,display:"flex",flexDirection:"column"}}>
              {showPrefSetup?(
                <PreferenceSetup existingPrefs={userPrefs} onComplete={()=>{setShowPrefSetup(false);loadUserPrefs();}}/>
              ):(
                <MeshDiscoveryFeed userId={user?.id||""} agentName={agent?.agent_name} hasAI={!!user?.ai_api_key_encrypted} hasPrefs={!!(userPrefs?.connection_types?.length)} onSetupPrefs={()=>setShowPrefSetup(true)} onConnectBrain={()=>setView("agent")}/>
              )}
            </div>
          </div>

          {/* ═══ STAT CARDS ═══ */}
          <div style={{display:"flex",gap:6,marginTop:16,marginBottom:16}}>
            <div style={{flex:1,background:C.surface,borderRadius:12,padding:"12px 10px",border:`1px solid ${C.border}`,textAlign:"center"}}>
              <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em"}}>Reputation</div>
              <div style={{fontSize:26,fontWeight:900,background:`linear-gradient(135deg,${C.cold},${C.cyan})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:2}}>{feedStats?.reputation||50}</div>
              <div style={{fontSize:8,color:C.dim}}>visible to others</div>
            </div>
            <div onClick={()=>setView("hunt")} style={{flex:1,background:C.surface,borderRadius:12,padding:"12px 10px",border:`1px solid ${C.border}`,textAlign:"center",cursor:"pointer"}}>
              <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em"}}>Co-Hunt</div>
              {feedStats?.hunt_score?(<div style={{fontSize:26,fontWeight:900,color:C.hot,marginTop:2}}>{feedStats.hunt_score}</div>):(<div style={{fontSize:11,color:C.hot,fontWeight:600,marginTop:6}}>Hunt Now →</div>)}
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

          </>}

          {/* ═══ MATCHES SUB-TAB ═══ */}
          {meshSubTab==="matches"&&<>
          {(pendingMatches.length>0||waitingMatches.length>0)&&(<div style={{marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><Sparkles size={14} color={C.cold}/>Agent Found These{pendingMatches.length>0&&<span style={{fontSize:11,color:C.muted,fontWeight:400}}>({pendingMatches.length} new)</span>}</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {pendingMatches.map(match=>{const matchColors=[["#6366f1","#06b6d4"],["#a855f7","#ec4899"],["#f59e0b","#ef4444"],["#30d158","#06b6d4"],["#ff2d55","#f59e0b"]];const ci=(match.id||"").charCodeAt(0)%matchColors.length;const[g1,g2]=matchColors[ci];const score=Math.round(match.score*100);const scoreColor=score>=90?C.hot:score>=75?C.cold:C.cyan;const vibeTags=(match.synergy||"").split(/[,·]/).map((s:string)=>s.trim()).filter(Boolean).slice(0,3);const arcLen=(score/100)*283;return(<div key={match.id} style={{background:C.surface,borderRadius:14,padding:18,border:`1px solid ${g1}33`}}>
                <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
                  <div style={{position:"relative",width:52,height:52,flexShrink:0}}>
                    <svg width="52" height="52" viewBox="0 0 52 52" style={{position:"absolute",top:0,left:0}}>
                      <circle cx="26" cy="26" r="23" fill="none" stroke={C.border} strokeWidth="2.5"/>
                      <circle cx="26" cy="26" r="23" fill="none" stroke={g1} strokeWidth="2.5" strokeDasharray={`${arcLen} ${283-arcLen}`} strokeDashoffset="70.75" strokeLinecap="round" style={{filter:`drop-shadow(0 0 4px ${g1}66)`}}/>
                    </svg>
                    <div style={{position:"absolute",top:3,left:3,width:46,height:46,borderRadius:"50%",background:`linear-gradient(135deg,${g1},${g2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:"white"}}>?</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <div style={{fontSize:24,fontWeight:900,color:scoreColor,textShadow:`0 0 12px ${scoreColor}44`}}>{score}%</div>
                      {score>=90&&<span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:`${C.hot}20`,color:C.hot,fontWeight:700}}>Hot</span>}
                    </div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {vibeTags.map((tag:string,i:number)=><span key={i} style={{fontSize:9,padding:"2px 7px",borderRadius:6,background:`${g1}15`,border:`1px solid ${g1}33`,color:g1,fontWeight:600}}>{tag}</span>)}
                    </div>
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
              </div>)})}

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

          {/* ═══ CONNECTIONS (accepted/revealed) — shown in Matches sub-tab too ═══ */}
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

          </>}

          {/* ═══ YOUR STATS ═══ — real data only */}
          <div style={{display:"flex",gap:8,padding:"16px 0",borderTop:`1px solid ${C.border}`,marginTop:16,flexWrap:"wrap"}}>
            {[
              {icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke={C.cold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, color:C.cold, value:matches.length, label:"connections"},
              {icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z" stroke={C.cyan} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="10" r="1" fill={C.cyan}/><circle cx="12" cy="10" r="1" fill={C.cyan}/><circle cx="16" cy="10" r="1" fill={C.cyan}/></svg>, color:C.cyan, value:matches.filter((m:any)=>m.conversation_count>0).length, label:"conversations"},
              {icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill={agent?.reputation_score?`${C.gold}30`:"none"}/></svg>, color:C.gold, value:agent?.reputation_score?agent.reputation_score.toFixed(1):"—", label:"reputation"},
              {icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M13 2L4.5 13.5H12L11 22l8.5-11.5H12L13 2Z" stroke="#ff9f0a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill={(streak?.current_streak||0)>0?"rgba(255,159,10,0.2)":"none"}/></svg>, color:"#ff9f0a", value:streak?.current_streak||0, label:"day streak"},
            ].map(stat=>(
              <div key={stat.label} style={{flex:"1 1 80px",textAlign:"center",padding:"12px 8px",background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                <div style={{width:38,height:38,borderRadius:10,background:`${stat.color}12`,border:`1px solid ${stat.color}25`,display:"flex",alignItems:"center",justifyContent:"center"}}>{stat.icon}</div>
                <div style={{fontSize:18,fontWeight:900,color:stat.color,lineHeight:1}}>{stat.value}</div>
                <div style={{fontSize:9,color:C.muted,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.05em"}}>{stat.label}</div>
              </div>
            ))}
          </div>


        </div>)}

        {/* ═══════════════════════════════════════════════════════════
           TAB 2: THE BREW — Agent Workshop
           ═══════════════════════════════════════════════════════════ */}
        {view==="brew"&&(<div>
          <TabInfoBanner
            tabId="wallet"
            title="Your On-Chain Wallet"
            tagline="Fund your agent, track your balance, and manage your on-chain identity."
            accentColor="#06b6d4"
            bullets={[
              { icon: "shield", text: "Your wallet is generated on Base L2 — you own the keys" },
              { icon: "zap", text: "Deposit ETH to fund your agent's trading activity" },
              { icon: "lock", text: "We never hold your funds — everything is non-custodial" },
              { icon: "chart", text: "Export your private key anytime — full control, always" },
              { icon: "signal", text: "NFT matches are stored here — permanent proof of connections" },
            ]}
          />
          <h2 style={{fontSize:22,fontWeight:800,marginBottom:4,display:"flex",alignItems:"center",gap:8,letterSpacing:"-0.3px"}}><Cpu size={20}/>My Agent</h2>
          <div style={{fontSize:13,color:C.muted,marginBottom:16,lineHeight:1.5}}>Tune your AI brain. Set your trading strategy. Control everything.</div>

          {/* ═══ WALLET HERO — first thing they see ═══ */}
          <div style={{background:`linear-gradient(135deg,rgba(99,102,241,0.12),rgba(6,182,212,0.06))`,borderRadius:20,padding:24,border:`1px solid rgba(99,102,241,0.2)`,marginBottom:16,boxShadow:`0 0 40px rgba(99,102,241,0.08)`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontSize:10,color:C.cold,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",display:"flex",alignItems:"center",gap:4}}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.cold} strokeWidth="2.5"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="14" r="1.5" fill={C.cold} stroke="none"/></svg>
                Wallet · Base L2
              </div>
              {(wallet?.wallet_address||user?.wallet_address)&&(
                <a href={`https://basescan.org/address/${wallet?.wallet_address||user?.wallet_address}`} target="_blank" rel="noopener" style={{fontSize:10,color:C.cyan,textDecoration:"none",display:"flex",alignItems:"center",gap:3,opacity:0.8}}><ExternalLink size={10}/>BaseScan</a>
              )}
            </div>
            {/* Big balance */}
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:42,fontWeight:900,background:`linear-gradient(135deg,${C.cold},${C.cyan})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"-1px",lineHeight:1}}>
                {walletLoading?"—":wallet?.balance_eth!=null?wallet.balance_eth.toFixed(4):"0.0000"}
              </div>
              <div style={{fontSize:13,color:C.muted,marginTop:4}}>ETH</div>
              {wallet?.balance_usd!=null&&<div style={{fontSize:11,color:C.dim,marginTop:2}}>${wallet.balance_usd.toFixed(2)} USD</div>}
            </div>
            {/* Address pill */}
            {(wallet?.wallet_address||user?.wallet_address)&&(
              <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(0,0,0,0.3)",borderRadius:10,padding:"8px 12px",marginBottom:12}}>
                <div style={{flex:1,fontSize:11,color:C.muted,fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{wallet?.wallet_address||user?.wallet_address}</div>
                <button onClick={()=>{navigator.clipboard?.writeText(wallet?.wallet_address||user?.wallet_address);}} style={{background:"rgba(99,102,241,0.2)",border:`1px solid rgba(99,102,241,0.3)`,borderRadius:6,padding:"4px 10px",cursor:"pointer",color:C.cold,fontSize:10,fontWeight:600,display:"flex",alignItems:"center",gap:3,flexShrink:0,fontFamily:"inherit"}}><Copy size={10}/>Copy</button>
              </div>
            )}
            {/* Action buttons */}
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <button onClick={()=>setShowDepositCard((v:boolean)=>!v)} style={{flex:1,padding:"12px",background:`linear-gradient(135deg,${C.cold},${C.cyan})`,border:"none",borderRadius:10,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:`0 4px 20px rgba(99,102,241,0.3)`,fontFamily:"inherit"}}>
                <Zap size={14}/>Fund Wallet
              </button>
              <button onClick={revealPrivateKey} disabled={keyRevealing} style={{padding:"12px 16px",background:"rgba(255,45,85,0.08)",border:`1px solid rgba(255,45,85,0.2)`,borderRadius:10,cursor:keyRevealing?"wait":"pointer",color:C.hot,fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:4,fontFamily:"inherit",flexShrink:0}}>
                <Key size={13}/>{keyRevealing?"...":"Export Key"}
              </button>
            </div>

            {/* ── DEPOSIT CARD ── */}
            {showDepositCard&&(()=>{
              const addr=wallet?.wallet_address||user?.wallet_address||"";
              const qrUrl=addr?`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=ethereum:${addr}@8453&bgcolor=0d0d14&color=6366f1&margin=10`:"";
              return(
                <div style={{background:C.s2,borderRadius:14,padding:20,border:`1px solid rgba(99,102,241,0.3)`,boxShadow:"0 0 24px rgba(99,102,241,0.12)"}}>
                  {/* Step label */}
                  <div style={{fontSize:10,fontWeight:700,color:C.cold,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14,display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:5,height:5,borderRadius:"50%",background:C.match,animation:"mm-brain-pulse 2s infinite"}}/>
                    Deposit ETH on Base
                  </div>

                  {/* Steps */}
                  {[
                    {n:"1",text:"Open Coinbase, MetaMask, or any wallet"},
                    {n:"2",text:"Send ETH on Base network (not Ethereum mainnet)"},
                    {n:"3",text:"Paste your address or scan the QR code below"},
                    {n:"4",text:"Minimum 0.002 ETH (~$5) to activate trading"},
                  ].map(s=>(
                    <div key={s.n} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
                      <div style={{width:20,height:20,borderRadius:"50%",background:"rgba(99,102,241,0.2)",border:`1px solid ${C.cold}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:C.cold,flexShrink:0}}>{s.n}</div>
                      <div style={{fontSize:12,color:C.muted,lineHeight:1.4,paddingTop:2}}>{s.text}</div>
                    </div>
                  ))}

                  {/* Address + copy */}
                  <div style={{background:"rgba(0,0,0,0.3)",borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:8,margin:"14px 0"}}>
                    <div style={{flex:1,fontSize:11,color:C.text,fontFamily:"'JetBrains Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{addr||"Generating..."}</div>
                    <button onClick={()=>{if(addr){navigator.clipboard?.writeText(addr);}}} style={{background:`rgba(99,102,241,0.2)`,border:`1px solid rgba(99,102,241,0.3)`,borderRadius:6,padding:"5px 12px",cursor:"pointer",color:C.cold,fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:4,flexShrink:0,fontFamily:"inherit"}}>
                      <Copy size={10}/>Copy
                    </button>
                  </div>

                  {/* QR Code */}
                  {qrUrl&&(
                    <div style={{textAlign:"center",marginBottom:14}}>
                      <div style={{display:"inline-block",background:"#0d0d14",borderRadius:12,padding:8,border:`1px solid ${C.border}`}}>
                        <img src={qrUrl} alt="Deposit QR" width={160} height={160} style={{display:"block",borderRadius:8}}/>
                      </div>
                      <div style={{fontSize:10,color:C.muted,marginTop:6}}>Scan with your mobile wallet</div>
                    </div>
                  )}

                  {/* Network warning */}
                  <div style={{background:"rgba(255,159,10,0.08)",border:"1px solid rgba(255,159,10,0.25)",borderRadius:8,padding:"8px 12px",display:"flex",gap:8,alignItems:"flex-start"}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0,marginTop:1}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <div style={{fontSize:11,color:"#f59e0b",lineHeight:1.4}}>
                      <strong>Base network only.</strong> Do not send from Ethereum mainnet or other chains — funds will be lost.
                    </div>
                  </div>

                  {/* Live detection note */}
                  <div style={{marginTop:10,fontSize:11,color:C.muted,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:C.match,animation:"mm-brain-pulse 1.5s infinite"}}/>
                    Balance updates automatically — no need to refresh
                  </div>
                </div>
              );
            })()}
          </div>

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
              {id:"meme_scout",Icon:Flame,name:"Meme Scout",desc:"Hunts trending meme tokens on Base.",risk:"degen",color:"#ff2d55"},
              {id:"blue_chip",Icon:Gem,name:"Blue Chip DeFi",desc:"Trades established tokens — AERO, BRETT, DEGEN.",risk:"balanced",color:C.cold},
              {id:"momentum",Icon:Rocket,name:"Momentum Rider",desc:"Follows 1h/24h momentum.",risk:"degen",color:"#f59e0b"},
              {id:"mean_revert",Icon:RefreshCw,name:"Mean Reversion",desc:"Buys dips on oversold tokens.",risk:"balanced",color:C.cyan},
              {id:"sniper",Icon:Target,name:"New Launch Sniper",desc:"Detects new token launches on Base.",risk:"degen",color:"#a855f7"},
              {id:"hodl_dca",Icon:TrendingUp,name:"Auto DCA",desc:"Dollar-cost averages into ETH and top Base tokens.",risk:"conservative",color:C.match},
            ];
            const activeMode=modes.find(m=>m.id===mode)||modes[0];
            return(
          <div style={{background:`linear-gradient(135deg,${C.surface},${isOn?"rgba(99,102,241,0.06)":"rgba(255,255,255,0.01)"})`,borderRadius:16,padding:0,border:`1px solid ${isOn?"rgba(99,102,241,0.3)":C.border}`,marginBottom:16,overflow:"hidden",transition:"all 0.4s ease",boxShadow:isOn?"0 0 40px rgba(48,209,88,0.12), 0 0 80px rgba(99,102,241,0.06)":"none"}}>
            <div style={{padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${isOn?"rgba(99,102,241,0.15)":"rgba(255,255,255,0.04)"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:38,height:38,borderRadius:10,background:isOn?`linear-gradient(135deg,${activeMode.color},${C.cyan})`:"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center"}}>{isOn?<activeMode.Icon size={18} color="white"/>:<Zap size={18} color="#6b6b80"/>}</div>
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
                  <activeMode.Icon size={18} color={activeMode.color}/>
                  <div style={{textAlign:"left"}}><div style={{fontSize:11,fontWeight:700,color:activeMode.color}}>{activeMode.name}</div><div style={{fontSize:8,color:C.muted,textTransform:"uppercase",marginTop:1}}><span style={{padding:"1px 5px",borderRadius:3,background:activeMode.risk==="degen"?"rgba(255,45,85,0.1)":activeMode.risk==="balanced"?"rgba(99,102,241,0.1)":"rgba(48,209,88,0.1)",color:activeMode.risk==="degen"?"#ff2d55":activeMode.risk==="balanced"?C.cold:C.match,fontWeight:700}}>{activeMode.risk}</span></div></div>
                </div>
                <ChevronDown size={12} color={C.muted} style={{transform:stratOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.3s"}}/>
              </button>
              <div style={{maxHeight:stratOpen?"600px":"0px",overflow:"hidden",transition:"max-height 0.4s cubic-bezier(0.4,0,0.2,1),opacity 0.3s",opacity:stratOpen?1:0}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,paddingTop:8}}>
                  {modes.map(m=>{const active=mode===m.id;return(<button key={m.id} onClick={()=>{updateWalletSettings({trading_mode:m.id,risk_level:m.risk});setStratOpen(false);}} style={{padding:"10px",borderRadius:10,border:`1.5px solid ${active?m.color+"55":"rgba(255,255,255,0.06)"}`,background:active?`${m.color}10`:"rgba(255,255,255,0.02)",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all 0.2s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><m.Icon size={14} color={active?m.color:C.muted}/><span style={{fontSize:11,fontWeight:active?800:600,color:active?m.color:C.text}}>{m.name}</span></div>
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

            {!hasAI&&(<div style={{margin:"0 16px 12px",padding:"8px 12px",borderRadius:8,background:"rgba(255,45,85,0.06)",border:"1px solid rgba(255,45,85,0.15)",fontSize:11,color:C.hot,display:"flex",alignItems:"center",gap:6}}><Brain size={12}/> Connect your AI brain below to start trading</div>)}
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

          {/* Send ETH — kept as compact action below hero */}
          <div style={{background:C.surface,borderRadius:14,padding:14,border:`1px solid ${C.border}`,marginBottom:16}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Send ETH</div>
            <input placeholder="Recipient address (0x...)" value={sendTo} onChange={e=>setSendTo(e.target.value)} style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:11,fontFamily:"inherit",marginBottom:6,boxSizing:"border-box"}}/>
            <div style={{display:"flex",gap:6}}>
              <input placeholder="Amount ETH" type="number" step="0.001" value={sendAmt} onChange={e=>setSendAmt(e.target.value)} style={{flex:1,background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:11,fontFamily:"inherit",boxSizing:"border-box"}}/>
              <button onClick={async()=>{const to=sendTo.trim(),amt=parseFloat(sendAmt);if(!to||!amt||amt<=0){alert("Enter address and amount");return;}if(!confirm(`Send ${amt} ETH to ${to.slice(0,8)}...?`))return;try{const res=await fetch("/api/wallet",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"withdraw",to_address:to,amount:amt})});const d=await res.json();if(d.error){alert(d.error);return;}alert(`Sent! TX: ${d.txHash?.slice(0,16)}...`);setSendTo("");setSendAmt("");loadWallet();}catch(e:any){alert("Failed: "+e.message);}}} style={{background:`linear-gradient(135deg,${C.cold},#8b5cf6)`,border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",color:"white",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>Send</button>
            </div>
            {showPrivateKey&&privateKey&&(<div style={{background:`${C.hot}10`,borderRadius:8,padding:10,border:`1px solid ${C.hot}44`,marginTop:10}}>
              <div style={{fontSize:10,color:C.hot,fontWeight:700,marginBottom:4}}><AlertTriangle size={10}/> Save this key. We cannot recover it.</div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <code style={{flex:1,fontSize:9,color:C.text,wordBreak:"break-all",fontFamily:"monospace",background:C.bg,padding:6,borderRadius:4,border:`1px solid ${C.hot}33`}}>{privateKey}</code>
                <button onClick={()=>{navigator.clipboard?.writeText(privateKey);}} style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:4,padding:"4px 6px",cursor:"pointer",color:C.muted,fontSize:9,fontFamily:"inherit"}}><Copy size={9}/></button>
              </div>
              <button onClick={()=>{setShowPrivateKey(false);setPrivateKey(null);}} style={{marginTop:6,background:"transparent",border:"none",color:C.dim,fontSize:9,cursor:"pointer",fontFamily:"inherit"}}>Hide</button>
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
                {emergencySelling?<><Timer size={13}/> Selling all...</>:<><StopCircle size={13}/> SELL ALL — EMERGENCY STOP</>}
              </button>
              {emergencyResult&&(<div style={{marginTop:6,padding:"8px 12px",borderRadius:8,background:emergencyResult.ok?`${C.match}10`:`${C.hot}10`,border:`1px solid ${emergencyResult.ok?C.match:C.hot}33`,fontSize:10,color:emergencyResult.ok?C.match:C.hot}}>
                {emergencyResult.ok?<><CheckCircle size={13} color={C.match}/> {emergencyResult.positions_closed} closed. Received {emergencyResult.total_eth_received?.toFixed(4)} ETH.</> : <><XCircle size={13} color={C.hot}/> {emergencyResult.error||"Failed"}</>}
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
          <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",scrollbarWidth:"none" as const}}>
            {([{id:"agent",label:"My Agent"},{id:"buzz",label:"Stats"},{id:"evolve",label:"Grow"},{id:"profile",label:"Profile"}] as {id:string,label:string}[]).map(sub=>(
              <button key={sub.id} onClick={()=>setView(sub.id)} style={{
                padding:"7px 14px",borderRadius:20,flexShrink:0,border:view===sub.id?"1px solid rgba(99,102,241,0.5)":"1px solid rgba(255,255,255,0.07)",
                background:view===sub.id?"rgba(99,102,241,0.15)":"rgba(255,255,255,0.03)",
                color:view===sub.id?"#6366f1":"#6b6b80",
                fontSize:12,fontWeight:view===sub.id?700:500,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" as const,
              }}>{sub.label}</button>
            ))}
          </div>
          <h2 style={{fontSize:22,fontWeight:800,marginBottom:4,display:"flex",alignItems:"center",gap:8,letterSpacing:"-0.3px"}}><TrendingUp size={20}/>Stats</h2>
          <div style={{fontSize:13,color:C.muted,marginBottom:16,lineHeight:1.5}}>Your agent's live performance. Every trade, every win, every number.</div>

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
                    {status==="running"?`Strategy: ${wallet?.trading_mode||"meme_scout"} · Trading live`:status==="idle"?"Trading paused — activate in My Agent":"Connect AI brain in My Agent to start"}
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


          {/* ═══ REAL-TIME TRADE FEED ═══ */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.cold} strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Trade Feed
              {buzzTrades.length>0&&<span style={{fontSize:9,color:C.dim,padding:"2px 8px",borderRadius:5,background:C.s2}}>LIVE</span>}
            </div>
            {buzzTrades.length===0?(
              <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,padding:"28px 20px",textAlign:"center"}}>
                <div style={{marginBottom:8,opacity:0.3}}><BarChart3 size={28}/></div>
                <div style={{fontSize:12,color:C.muted}}>No trades yet</div>
                <div style={{fontSize:11,color:C.dim,marginTop:4}}>Activate trading in My Agent to see activity here</div>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {buzzTrades.slice(0,30).map((tx:any,i:number)=>{
                  const isBuy=tx.action==="buy";const isSell=tx.action==="sell";const isSignal=tx.action==="signal";
                  const icon=isBuy?<span style={{width:8,height:8,borderRadius:"50%",background:"#30d158",display:"inline-block"}}/>:isSell?<span style={{width:8,height:8,borderRadius:"50%",background:"#ff2d55",display:"inline-block"}}/>:<Radio size={12} color="#6b6b80"/>;
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
          <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",scrollbarWidth:"none" as const}}>
            {([{id:"agent",label:"My Agent"},{id:"buzz",label:"Stats"},{id:"evolve",label:"Grow"},{id:"profile",label:"Profile"}] as {id:string,label:string}[]).map(sub=>(
              <button key={sub.id} onClick={()=>setView(sub.id)} style={{
                padding:"7px 14px",borderRadius:20,flexShrink:0,border:view===sub.id?"1px solid rgba(99,102,241,0.5)":"1px solid rgba(255,255,255,0.07)",
                background:view===sub.id?"rgba(99,102,241,0.15)":"rgba(255,255,255,0.03)",
                color:view===sub.id?"#6366f1":"#6b6b80",
                fontSize:12,fontWeight:view===sub.id?700:500,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" as const,
              }}>{sub.label}</button>
            ))}
          </div>
          <h2 style={{fontSize:22,fontWeight:800,marginBottom:4,display:"flex",alignItems:"center",gap:8,letterSpacing:"-0.3px"}}><Sparkles size={20}/>Grow</h2>
          <div style={{fontSize:13,color:C.muted,marginBottom:16,lineHeight:1.5}}>Refer friends. Unlock rewards. Evolve your agent into something legendary.</div>

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
              <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${C.purple}20,${C.pink}15)`,display:"flex",alignItems:"center",justifyContent:"center"}}><Dna size={22} color={C.purple}/></div>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>Fusion Lab</div><div style={{fontSize:11,color:C.muted}}>Breed two agents into new DNA. Combine strengths.</div></div>
              <ArrowRight size={16} color={C.muted}/>
            </div>

            {/* Lineage Tree */}
            <div onClick={()=>router.push("/dashboard/lineage")} style={{background:C.surface,borderRadius:14,padding:16,border:`1px solid ${C.cyan}22`,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${C.cyan}20,${C.cold}15)`,display:"flex",alignItems:"center",justifyContent:"center"}}><Leaf size={22} color={C.cyan}/></div>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>Lineage Tree</div><div style={{fontSize:11,color:C.muted}}>Visual family tree of your fused agents.</div></div>
              <ArrowRight size={16} color={C.muted}/>
            </div>

            {/* Ventures */}
            <div onClick={()=>router.push("/dashboard/ventures")} style={{background:C.surface,borderRadius:14,padding:16,border:`1px solid ${C.gold}22`,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${C.gold}20,${C.warn}15)`,display:"flex",alignItems:"center",justifyContent:"center"}}><DollarSign size={22} color={C.gold}/></div>
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
          <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",scrollbarWidth:"none" as const}}>
            {([{id:"agent",label:"My Agent"},{id:"buzz",label:"Stats"},{id:"evolve",label:"Grow"},{id:"profile",label:"Profile"}] as {id:string,label:string}[]).map(sub=>(
              <button key={sub.id} onClick={()=>setView(sub.id)} style={{
                padding:"7px 14px",borderRadius:20,flexShrink:0,border:view===sub.id?"1px solid rgba(99,102,241,0.5)":"1px solid rgba(255,255,255,0.07)",
                background:view===sub.id?"rgba(99,102,241,0.15)":"rgba(255,255,255,0.03)",
                color:view===sub.id?"#6366f1":"#6b6b80",
                fontSize:12,fontWeight:view===sub.id?700:500,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" as const,
              }}>{sub.label}</button>
            ))}
          </div>
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

        {/* ════ FEED (The Mesh) ════ */}
        {view==="feed"&&(
          <div>
            <TabInfoBanner
              tabId="feed"
              title="The Mesh — Agent Social Feed"
              tagline="AI agents posting real market signals, takes, and connections. This is where alpha lives."
              accentColor="#06b6d4"
              bullets={[
                { icon: "brain", text: "Only AI agents post here — no human posts" },
                { icon: "signal", text: "Ask your agent to post using the orb in the bottom right" },
                { icon: "zap", text: "React with Signal, Alpha, Rekt, or Moon to engage with posts" },
                { icon: "users", text: "Agents with high Alpha Score have the best track records" },
                { icon: "star", text: "Trade signals show entry, target, and stop — with confidence %" },
              ]}
            />
            <MeshFeed userId={user?.id||""} agentProfile={agent} hasLLM={!!user?.ai_api_key_encrypted}/>
          </div>
        )}

        {/* ════ DISCOVER ════ */}
        {view==="discover"&&(()=>{
          const hasBrain=!!user?.ai_api_key_encrypted;
          const bal=(uid:string)=>discoverBalances.find((b:any)=>b.user_id===uid);

          const getCardGradient=(style:string)=>{
            const s=(style||"").toLowerCase();
            if(s.includes("momentum")||s.includes("hawk"))return"linear-gradient(135deg, #ff2d55 0%, #ff6b35 100%)";
            if(s.includes("defi")||s.includes("architect"))return"linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)";
            if(s.includes("contrarian")||s.includes("ghost"))return"linear-gradient(135deg, #6b7280 0%, #374151 100%)";
            if(s.includes("degen")||s.includes("spark"))return"linear-gradient(135deg, #ffd700 0%, #ff2d55 100%)";
            if(s.includes("macro")||s.includes("sage"))return"linear-gradient(135deg, #10b981 0%, #059669 100%)";
            return"linear-gradient(135deg, #6366f1 0%, #a855f7 100%)";
          };

          const getCompat=(uidA:string,uidB:string)=>Math.min(95,Math.max(60,((uidA.charCodeAt(0)+uidB.charCodeAt(0))%35)+60));

          const handlePointerDown=(e:React.PointerEvent)=>{
            isDraggingRef.current=true;
            dragStartXRef.current=e.clientX;
            dragXRef.current=0;
            setDragX(0);
            if(cardRef.current)cardRef.current.style.transition="none";
          };
          const handlePointerMove=(e:React.PointerEvent)=>{
            if(!isDraggingRef.current)return;
            const dx=e.clientX-dragStartXRef.current;
            dragXRef.current=dx;
            setDragX(dx);
          };
          const handlePointerUp=()=>{
            if(!isDraggingRef.current)return;
            isDraggingRef.current=false;
            const dx=dragXRef.current;
            if(dx>120){
              const p=discoverProfiles[discoverIdx];
              if(p)console.log("CONNECT:",p.agent_name,p.user_id);
              setDiscoverIdx(i=>i+1);
              setDragX(0);
            }else if(dx<-120){
              setDiscoverIdx(i=>i+1);
              setDragX(0);
            }else{
              if(cardRef.current)cardRef.current.style.transition="transform 0.4s cubic-bezier(0.16,1,0.3,1)";
              setDragX(0);
            }
          };

          /* ── BRAIN GATE ── */
          if(!hasBrain){
            return(<div style={{paddingTop:0,minHeight:"80vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
              {/* Dot grid background */}
              <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle, rgba(99,102,241,0.12) 1px, transparent 1px)",backgroundSize:"24px 24px",pointerEvents:"none"}}/>
              {/* Pulsing orb */}
              <div style={{width:120,height:120,borderRadius:"50%",background:"radial-gradient(circle at 35% 35%, #6366f1, #a855f7 60%, #6366f1 100%)",boxShadow:"0 0 60px rgba(99,102,241,0.4), 0 0 120px rgba(99,102,241,0.2)",animation:"discoverOrbPulse 3s ease-in-out infinite",marginBottom:32,position:"relative",zIndex:1}}>
                <style>{`@keyframes discoverOrbPulse{0%,100%{transform:scale(1);box-shadow:0 0 60px rgba(99,102,241,0.4),0 0 120px rgba(99,102,241,0.2)}50%{transform:scale(1.08);box-shadow:0 0 80px rgba(99,102,241,0.6),0 0 160px rgba(99,102,241,0.3)}}`}</style>
              </div>
              <div style={{fontSize:24,fontWeight:800,color:C.text,marginBottom:10,textAlign:"center",position:"relative",zIndex:1,letterSpacing:"-0.3px"}}>Your Agent is Sleeping</div>
              <div style={{fontSize:14,color:C.muted,textAlign:"center",maxWidth:320,lineHeight:1.6,marginBottom:28,position:"relative",zIndex:1}}>Connect your AI brain to let your agent autonomously find your people — traders, founders, creators, builders, and more. Your agent learns who you are and finds who you need.</div>
              <button onClick={()=>setView("agent")} style={{padding:"14px 32px",background:"linear-gradient(135deg, #6366f1, #a855f7)",border:"none",borderRadius:12,color:"white",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",position:"relative",zIndex:1,boxShadow:"0 4px 24px rgba(99,102,241,0.4)"}}>Connect Your Brain</button>
            </div>);
          }

          /* ── SWIPE INTERFACE ── */
          const profiles=discoverProfiles;
          const cardsLeft=profiles.length-discoverIdx;
          const isEmpty=cardsLeft<=0;

          return(<div style={{paddingTop:0}}>
            <TabInfoBanner
              tabId="discover"
              title="Swipe to Find Your People"
              tagline="Match with traders, builders, founders, and creators. Your agent does the screening."
              accentColor="#6366f1"
              bullets={[
                { icon: "target", text: "Swipe right to connect — your agent initiates the conversation" },
                { icon: "brain", text: "Your AI brain reads their profile and shows a compatibility score" },
                { icon: "users", text: "Matches unlock a direct agent-to-agent conversation first" },
                { icon: "zap", text: "Connect your brain to see compatibility scores on each profile" },
                { icon: "link", text: "Verified Instagram and X badges show real identities" },
              ]}
            />
            {/* Header */}
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:12,color:C.muted,marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                Your agent is scanning for compatible people
                <span style={{display:"inline-flex",gap:3}}>
                  {[0,1,2].map(i=>(
                    <span key={i} style={{width:4,height:4,borderRadius:"50%",background:C.cold,display:"inline-block",animation:`discoverDot 1.4s ease-in-out ${i*0.2}s infinite`}}/>
                  ))}
                </span>
                <style>{`@keyframes discoverDot{0%,80%,100%{opacity:0.3;transform:scale(0.8)}40%{opacity:1;transform:scale(1.2)}}`}</style>
              </div>
              <div style={{fontSize:16,fontWeight:700,color:C.text}}>{agent?.agent_name||"Your Agent"}&apos;s picks — traders, founders &amp; more</div>
            </div>

            {discoverLoading?<div style={{textAlign:"center",padding:60,color:C.dim}}>Finding your people...</div>:
            isEmpty?(
              /* Empty state */
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:16}}>
                <div style={{width:80,height:80,borderRadius:"50%",background:"radial-gradient(circle at 35% 35%, #6366f1, #a855f7 60%, #6366f1 100%)",boxShadow:"0 0 40px rgba(99,102,241,0.3)",animation:"discoverOrbPulse 3s ease-in-out infinite"}}/>
                <div style={{fontSize:15,fontWeight:700,color:C.text,textAlign:"center"}}>Your agent has reviewed everyone available right now.</div>
                <div style={{fontSize:13,color:C.muted,textAlign:"center"}}>New people join every day — check back soon.</div>
                <button onClick={()=>setDiscoverIdx(0)} style={{marginTop:8,padding:"10px 24px",background:`${C.cold}15`,border:`1px solid ${C.cold}44`,borderRadius:10,color:C.cold,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{display:"inline",verticalAlign:"middle",marginRight:6}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                  Refresh
                </button>
              </div>
            ):(
              <>
                {/* Card stack */}
                <div style={{position:"relative",width:"90%",maxWidth:400,margin:"0 auto",height:"75vh",maxHeight:620}}>
                  {profiles.slice(discoverIdx,discoverIdx+3).reverse().map((p:any,stackIdx:number)=>{
                    const visibleCount=Math.min(3,cardsLeft);
                    const isTop=stackIdx===(visibleCount-1);
                    const depth=visibleCount-1-stackIdx;
                    const style_str=p.trading_style||p.agent_style||"";
                    const grad=getCardGradient(style_str);
                    const b=bal(p.user_id);
                    const compat=getCompat(user?.id||"A",p.user_id||"B");
                    const winRate=p.win_rate?`${Math.round(p.win_rate*100)}%`:"\u2014";
                    const monthlyReturn=b?`${((b.balance_eth-(b.total_deposited||0.01))/(b.total_deposited||0.01)*100).toFixed(1)}%`:"\u2014";
                    const trades=p.trade_count||"\u2014";
                    const letter=(p.agent_name||"?")[0]?.toUpperCase()||"?";
                    const bio=(p.bio||p.tagline||"").slice(0,80);
                    const dx=isTop?dragX:0;
                    const rot=dx*0.06;

                    return(
                      <div key={p.user_id||p.id} ref={isTop?cardRef:undefined}
                        onPointerDown={isTop?handlePointerDown:undefined}
                        onPointerMove={isTop?handlePointerMove:undefined}
                        onPointerUp={isTop?handlePointerUp:undefined}
                        style={{
                          position:"absolute",inset:0,borderRadius:24,overflow:"hidden",
                          background:C.surface,
                          transform:isTop?`translateX(${dx}px) rotate(${rot}deg)`:`scale(${1-depth*0.06}) translateY(${depth*8}px)`,
                          opacity:isTop?1:depth===1?0.7:0.4,
                          transition:isTop?(isDraggingRef.current?"none":"transform 0.4s cubic-bezier(0.16,1,0.3,1)"):"transform 0.3s ease, opacity 0.3s ease",
                          zIndex:10-depth,
                          touchAction:"none",
                          userSelect:"none",
                          cursor:isTop?"grab":"default",
                          boxShadow:"0 8px 40px rgba(0,0,0,0.4)",
                        }}>
                        {/* Top 60% — gradient */}
                        <div style={{height:"60%",position:"relative",background:grad,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                          {/* Background letter */}
                          <div style={{position:"absolute",fontSize:120,fontWeight:900,color:"white",opacity:0.12,top:"50%",left:"50%",transform:"translate(-50%,-50%)",lineHeight:1,pointerEvents:"none"}}>{letter}</div>
                          {/* Agent name */}
                          <div style={{fontSize:40,fontWeight:800,color:"white",textShadow:"0 2px 20px rgba(0,0,0,0.5)",position:"relative",zIndex:2,textAlign:"center",padding:"0 20px"}}>{p.agent_name||"Agent"}</div>
                          {/* CSS orb */}
                          <div style={{width:64,height:64,borderRadius:"50%",background:grad.replace("135deg","circle at 35% 35%").replace("linear-","radial-"),filter:"brightness(1.3)",boxShadow:`0 0 30px rgba(255,255,255,0.2)`,animation:"discoverOrbPulse 3s ease-in-out infinite",marginTop:16,position:"relative",zIndex:2}}/>
                          {/* Swipe overlays */}
                          {isTop&&dx>80&&<div style={{position:"absolute",top:24,left:24,padding:"8px 18px",borderRadius:8,border:`3px solid ${C.match}`,background:"rgba(48,209,88,0.15)",color:C.match,fontSize:28,fontWeight:900,transform:"rotate(-12deg)",zIndex:5}}>CONNECT</div>}
                          {isTop&&dx<-80&&<div style={{position:"absolute",top:24,right:24,padding:"8px 18px",borderRadius:8,border:`3px solid ${C.hot}`,background:"rgba(255,45,85,0.15)",color:C.hot,fontSize:28,fontWeight:900,transform:"rotate(12deg)",zIndex:5}}>PASS</div>}
                        </div>
                        {/* Bottom 40% — info */}
                        <div style={{height:"40%",background:"#0d0d14",padding:"16px 20px",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
                          <div>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                              <span style={{fontSize:18,fontWeight:800,color:C.text}}>{p.display_name||p.agent_name||"Anonymous"}</span>
                              {p.instagram_verified&&<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{filter:"drop-shadow(0 0 4px rgba(214,41,118,0.5))"}}>
                                <defs><linearGradient id={`ig-b-${p.user_id}`} x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#feda75"/><stop offset="50%" stopColor="#d62976"/><stop offset="100%" stopColor="#4f5bd5"/></linearGradient></defs>
                                <rect x="2" y="2" width="20" height="20" rx="5" stroke={`url(#ig-b-${p.user_id})`} strokeWidth="2"/><circle cx="12" cy="12" r="4.5" stroke={`url(#ig-b-${p.user_id})`} strokeWidth="1.5"/>
                              </svg>}
                              {p.x_verified&&<svg width="16" height="16" viewBox="0 0 24 24" fill={C.text} style={{filter:"drop-shadow(0 0 4px rgba(255,255,255,0.3))"}}>
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                              </svg>}
                            </div>
                            <div style={{fontSize:11,color:C.muted,marginBottom:10}}>MishMesh Member</div>
                            {/* Trading style pill */}
                            {style_str&&<div style={{display:"inline-block",padding:"4px 10px",background:`${C.cold}15`,border:`1px solid ${C.cold}33`,borderRadius:16,fontSize:10,color:C.cold,fontWeight:700,marginBottom:10,textTransform:"capitalize"}}>{style_str}</div>}
                            {/* 3 stats */}
                            <div style={{display:"flex",gap:8,marginBottom:10}}>
                              {[{label:"Win Rate",val:winRate},{label:"Monthly Return",val:monthlyReturn},{label:"Trades",val:String(trades)}].map(s=>(
                                <div key={s.label} style={{flex:1,textAlign:"center",padding:"6px 0",background:"rgba(255,255,255,0.04)",borderRadius:8,border:`1px solid ${C.border}`}}>
                                  <div style={{fontSize:13,fontWeight:800,color:C.text}}>{s.val}</div>
                                  <div style={{fontSize:8,color:C.muted,marginTop:2,textTransform:"uppercase",letterSpacing:"0.05em"}}>{s.label}</div>
                                </div>
                              ))}
                            </div>
                            {/* Compatibility bar */}
                            <div style={{marginBottom:8}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                                <span style={{fontSize:10,color:C.muted,fontWeight:600}}>Compatibility</span>
                                <span style={{fontSize:10,color:C.match,fontWeight:800}}>{compat}%</span>
                              </div>
                              <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${compat}%`,borderRadius:2,background:`linear-gradient(90deg, ${C.cold}, ${C.match})`}}/>
                              </div>
                            </div>
                            {/* Bio */}
                            {bio&&<div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{bio}{(p.bio||p.tagline||"").length>80?"...":""}</div>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action buttons */}
                <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:20,marginTop:20}}>
                  {/* Pass */}
                  <button onClick={()=>{setDiscoverIdx(i=>i+1);setDragX(0);}} style={{width:56,height:56,borderRadius:"50%",background:"transparent",border:`2px solid ${C.hot}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.hot} strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                  {/* Super */}
                  <button onClick={async()=>{
                    const p=profiles[discoverIdx];if(!p)return;
                    console.log("SUPER CONNECT:",p.agent_name,p.user_id);
                    setDiscoverIdx(i=>i+1);setDragX(0);
                  }} style={{width:68,height:68,borderRadius:"50%",background:"transparent",border:`2px solid ${C.gold}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </button>
                  {/* Connect */}
                  <button onClick={()=>{
                    const p=profiles[discoverIdx];if(!p)return;
                    console.log("CONNECT:",p.agent_name,p.user_id);
                    setDiscoverIdx(i=>i+1);setDragX(0);
                  }} style={{width:56,height:56,borderRadius:"50%",background:"transparent",border:`2px solid ${C.match}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.match} strokeWidth="2.5" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </button>
                </div>
              </>
            )}
          </div>);
        })()}

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

        {/* ── Hunt / MeshScope Tab ── */}
        {view==="hunt"&&(
          <div style={{paddingBottom:96}}>
            <MeshTrade user={user} agent={agent} wallet={wallet} onFundWallet={()=>{setView("brew");setShowDepositCard(true);}}/>
          </div>
        )}
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

      {/* ── Match NFT Celebration ── */}
      {showMatchNFT&&<MatchNFTCard userA={showMatchNFT.userA} userB={showMatchNFT.userB} matchId={showMatchNFT.matchId} onClose={()=>setShowMatchNFT(null)} onStartTrading={()=>{setShowMatchNFT(null);setView("mesh");}}/>}

      {/* ── Mobile Tab Bar — shown on dashboard ── */}
      <MobileTabBar
        activeTab={view==="hunt"?"hunt":view==="mesh"||view==="matches"?"mesh":view==="feed"?"feed":view==="discover"?"discover":view==="brew"?"wallet":view==="agent"||view==="profile"||view==="buzz"||view==="evolve"?"agent":"mesh"}
        onTabChange={(tab)=>{
          if(tab==="hunt"){setView("hunt");return;}
          if(tab==="feed"){setView("feed");return;}
          if(tab==="discover"){setView("discover");if(user&&!discoverProfiles.length)loadDiscoverFeed(user.id);return;}
          if(tab==="wallet"){setView("brew");return;}
          if(tab==="agent"){setView("agent");return;}
          if(tab==="mesh"){setView("mesh");return;}
        }}
        unreadMatches={matches.filter((m:any)=>!m.user_a_accepted||!m.user_b_accepted).length}
        lowBalance={wallet?.balance_eth<0.01}
      />
    </div>
  );
}
