"use client";

import { useRef, useEffect } from "react";
import {
  Zap, Sparkles, DollarSign, Trophy, Crown, Star, Heart, Award,
} from "lucide-react";

/* ═══ THEME ═══ */
export const C = {
  hot:"#FF2D55", cold:"#6366f1", match:"#30D158", warn:"#FF9F0A",
  cyan:"#06b6d4", purple:"#a855f7", pink:"#ec4899", gold:"#ffd700",
  bg:"#0a0a0f", surface:"#111118", s2:"#1a1a24", s3:"#222233",
  text:"#f0f0f5", muted:"#6b6b80", dim:"#3a3a4a",
  border:"rgba(255,255,255,0.07)",
};

/* ═══ SMALL COMPONENTS ═══ */

export function MMLogo({size=44}:{size?:number}){
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

export function Avatar({name,size=40,url}:{name:string;size?:number;url?:string|null}){
  const pals=[["#6366f1","#818cf8"],["#06b6d4","#22d3ee"],["#a855f7","#c084fc"],["#ec4899","#f472b6"],["#f59e0b","#fbbf24"],["#10b981","#34d399"]];
  const i=Math.abs((name||"A").split("").reduce((a,c)=>a+c.charCodeAt(0),0))%pals.length;
  const init=(name||"?").split(/[\s\-_]+/).map(w=>w[0]).join("").toUpperCase().slice(0,2);
  if(url) return <img src={url} alt={name} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.border}`}}/>;
  return <div style={{width:size,height:size,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg,${pals[i][0]},${pals[i][1]})`,fontSize:size*0.38,fontWeight:700,color:"white",border:`2px solid ${C.border}`}}>{init}</div>;
}

export function Btn({children,primary,danger,ghost,disabled,onClick,style:sx,...rest}:any){
  const base:React.CSSProperties={padding:"10px 20px",borderRadius:10,fontSize:13,fontWeight:600,border:"none",cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",transition:"all 0.2s",display:"inline-flex",alignItems:"center",gap:6,opacity:disabled?0.4:1};
  if(primary)Object.assign(base,{background:C.cold,color:"white"});
  else if(danger)Object.assign(base,{background:"#ff2d5520",color:C.hot,border:`1px solid ${C.hot}33`});
  else if(ghost)Object.assign(base,{background:"transparent",color:C.muted,border:`1px solid ${C.border}`});
  else Object.assign(base,{background:C.s2,color:C.text,border:`1px solid ${C.border}`});
  return <button style={{...base,...sx}} disabled={disabled} onClick={onClick} {...rest}>{children}</button>;
}

export function BadgeChip({name,type}:{name:string;type:string}){
  const icons:Record<string,any>={streak_7:Crown,streak_30:Star,first_match:Sparkles,deal_closer:DollarSign,speed_demon:Zap,healthtech_collab:Heart,top_builder:Trophy};
  const Ic=icons[type]||Award;
  return <div style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",background:`${C.cold}15`,border:`1px solid ${C.cold}33`,borderRadius:20,fontSize:11,color:C.cold,fontWeight:600}}><Ic size={12}/>{name}</div>;
}

export function TierBadge({tier}:{tier:string}){
  if(tier==="free")return null;
  const color=tier==="pro"?C.cold:C.purple;
  return <span style={{fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:4,background:color,color:"white",textTransform:"uppercase",letterSpacing:"0.05em"}}>{tier}</span>;
}

/* ═══ MESH GRAPH (Canvas 2D — animated network visualization) ═══ */

export function MeshGraph({matches,userId}:{matches:any[];userId:string}){
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
