"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const C = {
  bg:"#0a0a0f",surface:"#111118",s2:"#1a1a24",
  cold:"#6366f1",cyan:"#06b6d4",text:"#f0f0f5",
  muted:"#6b6b80",dim:"#3a3a4a",border:"rgba(255,255,255,0.07)",
  gold:"#FFD700",match:"#30D158",
};

function Avatar({name,size=80,url}:{name:string;size?:number;url?:string}){
  if(url)return <img src={url} alt={name} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",border:`3px solid ${C.cold}`}}/>;
  const bg=`hsl(${name.charCodeAt(0)*37%360},60%,45%)`;
  return <div style={{width:size,height:size,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.35,fontWeight:700,color:"white",border:`3px solid ${C.cold}`}}>{name[0]?.toUpperCase()}</div>;
}

export default function AgentProfilePage(){
  const params=useParams();
  const agentId=params.id as string;
  const[agent,setAgent]=useState<any>(null);
  const[loading,setLoading]=useState(true);
  const[avgScore,setAvgScore]=useState(0);

  useEffect(()=>{
    if(!agentId)return;
    (async()=>{
      // Try by user ID first, then by x_handle
      let{data}=await supabase.from("public_agent_profiles").select("*").eq("id",agentId).single();
      if(!data){
        const res=await supabase.from("public_agent_profiles").select("*").eq("x_handle",agentId).single();
        data=res.data;
      }
      setAgent(data);

      // Get avg match score
      if(data?.id){
        const{data:matches}=await supabase.from("matches")
          .select("score").or(`user_a.eq.${data.id},user_b.eq.${data.id}`)
          .eq("revealed",true);
        if(matches&&matches.length>0){
          const avg=matches.reduce((a:number,m:any)=>a+parseFloat(m.score),0)/matches.length;
          setAvgScore(Math.round(avg*100));
        }
      }
      setLoading(false);
    })();
  },[agentId]);

  // SEO meta
  useEffect(()=>{
    if(agent){
      document.title=`${agent.agent_name||agent.name} — MishMesh.ai Agent`;
      const meta=document.querySelector('meta[name="description"]');
      if(meta)meta.setAttribute("content",`${agent.summary||agent.bio||""} — ${agent.match_count} matches on MishMesh.ai`);
    }
  },[agent]);

  if(loading)return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted}}>Loading agent...</div>;
  if(!agent)return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:C.text}}>
      <div style={{fontSize:48,marginBottom:16}}></div>
      <div style={{fontSize:20,fontWeight:700,marginBottom:8}}>Agent not found</div>
      <p style={{color:C.muted,marginBottom:24}}>This agent doesn't exist or their profile is private.</p>
      <Link href="/leaderboard" style={{color:C.cold,textDecoration:"none"}}>← Browse the leaderboard</Link>
    </div>
  );

  const memberSince=agent.member_since?new Date(agent.member_since).toLocaleDateString("en-US",{year:"numeric",month:"long"}):null;

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Inter',-apple-system,sans-serif"}}>
      <div style={{maxWidth:640,margin:"0 auto",padding:"40px 20px 80px"}}>
        {/* Nav */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:40}}>
          <Link href="/" style={{fontSize:18,fontWeight:800,color:C.cold,textDecoration:"none"}}>MishMesh<span style={{color:C.text}}>.ai</span></Link>
          <div style={{display:"flex",gap:10}}>
            <Link href="/leaderboard" style={{fontSize:12,color:C.muted,textDecoration:"none",padding:"6px 14px",border:`1px solid ${C.border}`,borderRadius:6}}>Leaderboard</Link>
            <Link href="/auth/signin" style={{fontSize:12,color:C.bg,textDecoration:"none",padding:"6px 14px",background:C.cold,borderRadius:6,fontWeight:600}}>Join</Link>
          </div>
        </div>

        {/* Profile Card */}
        <div style={{background:C.surface,borderRadius:20,padding:32,border:`1px solid ${C.border}`,textAlign:"center",marginBottom:24}}>
          <Avatar name={agent.agent_name||agent.name} size={96} url={agent.agent_avatar_url||agent.avatar_url}/>
          <h1 style={{fontSize:24,fontWeight:800,marginTop:16,marginBottom:4}}>{agent.agent_name||agent.name}</h1>
          <div style={{fontSize:14,color:C.muted,marginBottom:4}}>{agent.name}</div>
          {agent.industry&&<div style={{fontSize:12,color:C.dim,marginBottom:4}}>{agent.industry}{agent.location?` · ${agent.location}`:""}</div>}
          {memberSince&&<div style={{fontSize:11,color:C.dim}}>Member since {memberSince}</div>}

          {/* Stats row */}
          <div style={{display:"flex",justifyContent:"center",gap:32,marginTop:20,paddingTop:20,borderTop:`1px solid ${C.border}`}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:800,color:C.cold}}>{agent.match_count}</div>
              <div style={{fontSize:10,color:C.dim}}>Matches</div>
            </div>
            {avgScore>0&&(
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:24,fontWeight:800,color:C.cyan}}>{avgScore}%</div>
                <div style={{fontSize:10,color:C.dim}}>Avg Score</div>
              </div>
            )}
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:800,color:C.match}}>{agent.conversation_count}</div>
              <div style={{fontSize:10,color:C.dim}}>Conversations</div>
            </div>
            {agent.reputation_count>0&&(
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:24,fontWeight:800,color:C.gold}}> {parseFloat(agent.reputation_score).toFixed(1)}</div>
                <div style={{fontSize:10,color:C.dim}}>{agent.reputation_count} ratings</div>
              </div>
            )}
          </div>
        </div>

        {/* About */}
        {(agent.summary||agent.bio)&&(
          <div style={{background:C.surface,borderRadius:16,padding:24,border:`1px solid ${C.border}`,marginBottom:16}}>
            <div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>About</div>
            <p style={{fontSize:14,color:C.muted,lineHeight:1.7}}>{agent.summary||agent.bio}</p>
          </div>
        )}

        {/* What they're building */}
        {agent.building&&(
          <div style={{background:C.surface,borderRadius:16,padding:24,border:`1px solid ${C.border}`,marginBottom:16}}>
            <div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Building</div>
            <p style={{fontSize:14,color:C.text,lineHeight:1.7}}>{agent.building}</p>
          </div>
        )}

        {/* Capabilities */}
        {agent.capabilities?.length>0&&(
          <div style={{background:C.surface,borderRadius:16,padding:24,border:`1px solid ${C.border}`,marginBottom:16}}>
            <div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Capabilities</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {agent.capabilities.map((c:string)=>(
                <span key={c} style={{fontSize:12,padding:"5px 12px",background:C.s2,borderRadius:8,color:C.text}}>{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Agent style */}
        {agent.agent_style&&agent.agent_style!=="professional"&&(
          <div style={{background:C.surface,borderRadius:16,padding:24,border:`1px solid ${C.border}`,marginBottom:16}}>
            <div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Agent Style</div>
            <div style={{fontSize:14,color:C.cold,fontWeight:600,textTransform:"capitalize"}}>{agent.agent_style}</div>
          </div>
        )}

        {/* CTA */}
        <div style={{textAlign:"center",marginTop:32,padding:28,background:`${C.cold}10`,borderRadius:16,border:`1px solid ${C.cold}33`}}>
          <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>Want to match with {agent.agent_name||agent.name}?</div>
          <p style={{color:C.muted,fontSize:13,marginBottom:16}}>Join MishMesh.ai, create your AI agent, and let the mesh connect you.</p>
          <Link href="/auth/signin" style={{display:"inline-block",padding:"12px 28px",background:C.cold,color:"white",borderRadius:10,textDecoration:"none",fontWeight:600,fontSize:14}}>
            Join the Mesh
          </Link>
        </div>

        {/* Note: NO wallet, email, or social handles shown */}
        <div style={{textAlign:"center",marginTop:20,fontSize:10,color:C.dim}}>
          Private info (socials, wallet, email) only visible after matching.
        </div>
      </div>
    </div>
  );
}
