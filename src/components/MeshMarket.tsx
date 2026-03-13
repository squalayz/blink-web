"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════
// The Mesh Market — CashClaw-Powered Earning Console
// ═══════════════════════════════════════════════════════════

const C = {
  bg: "#0a0a0f",
  surface: "#0d0d14",
  s2: "#1a1a24",
  indigo: "#6366f1",
  cyan: "#06b6d4",
  match: "#30d158",
  hot: "#ff2d55",
  gold: "#ffd700",
  text: "#e8e8f0",
  muted: "#6b6b80",
  dim: "#2a2a3a",
  border: "rgba(255,255,255,0.07)",
};

const KEYFRAMES = `
@keyframes mm-pulse { 0%,100%{opacity:0.8;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
@keyframes mm-log-in { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
@keyframes mm-card-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes mm-live-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }
@keyframes mm-gold-pulse { 0%,100%{text-shadow:0 0 0 transparent} 50%{text-shadow:0 0 12px rgba(255,215,0,0.8)} }
@keyframes mm-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
@keyframes mm-dormant-pulse { 0%, 100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); } }
@keyframes mm-float-up { 0% { opacity: 0; transform: translateY(0px); } 20% { opacity: 1; } 80% { opacity: 0.6; } 100% { opacity: 0; transform: translateY(-100px); } }
@keyframes mm-scan-bar { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
@keyframes mm-radar-ring { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.8);opacity:0} }
@keyframes mm-work-pulse { 0%,100%{box-shadow:0 0 16px rgba(99,102,241,0.6)} 50%{box-shadow:0 0 32px rgba(99,102,241,0.9)} }
@keyframes mm-flash-in { from{opacity:0} to{opacity:1} }
@keyframes mt-agent-pulse { 0%,100%{box-shadow:0 0 24px rgba(99,102,241,0.5)} 50%{box-shadow:0 0 32px rgba(99,102,241,0.7)} }
`;

// ── Types ──

interface Bounty {
  id: string;
  title: string;
  description: string;
  budget_eth: number;
  skills: string[];
  client: string;
  posted_at: number;
  proposals: number;
  difficulty: "easy" | "medium" | "hard";
}

interface Task {
  id: string;
  title: string;
  status: "quoted" | "accepted" | "in_progress" | "submitted" | "completed" | "revision";
  budget_eth: number;
  client: string;
  started_at: number;
  deadline?: number;
}

interface EarningRecord {
  id: string;
  title: string;
  earned_eth: number;
  rating: number;
  completed_at: number;
}

interface LogEntry {
  ts: number;
  type: "scan" | "quote" | "work" | "submit" | "earn" | "decline";
  message: string;
}

interface MeshMarketProps {
  user: { id: string; ai_api_key_encrypted?: string; ai_provider?: string };
  agent: { agent_name?: string; soul?: any } | null;
  wallet: { address?: string; balance?: number } | null;
  onConnectBrain?: () => void;
  onFundWallet?: () => void;
}


// ── Stardust data (static) ──
const STARS = Array.from({ length: 60 }, (_, i) => ({
  x: ((i * 7 + 13) * 31) % 100,
  y: ((i * 11 + 7) * 23) % 100,
  sz: 1 + (i % 2),
  op: 0.03 + (i % 3) * 0.02,
}));

// ── Difficulty colors ──
const DIFF_COLOR: Record<string, string> = {
  easy: C.match,
  medium: C.gold,
  hard: C.hot,
};

// ── Time ago helper ──
function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Status label map ──
const TASK_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  quoted: { label: "QUOTED", color: C.cyan },
  accepted: { label: "ACCEPTED", color: C.indigo },
  in_progress: { label: "IN PROGRESS", color: C.gold },
  submitted: { label: "SUBMITTED", color: C.indigo },
  completed: { label: "COMPLETED", color: C.match },
  revision: { label: "REVISION", color: C.hot },
};

// ── Earn Simulation (dormant state) ──

function EarnSimulation({ onConnectBrain, onAddETH }: { onConnectBrain: () => void; onAddETH: () => void }) {
  const [phase, setPhase] = useState(0);
  const [bountyIdx, setBountyIdx] = useState(0);
  const [earned, setEarned] = useState(0);
  const [workLines, setWorkLines] = useState<string[]>([]);
  const [workProgress, setWorkProgress] = useState(0);
  const [quoteAccepted, setQuoteAccepted] = useState(false);
  const [showEarnFlash, setShowEarnFlash] = useState(false);
  const [radarAngle, setRadarAngle] = useState(0);
  const [simParticles, setSimParticles] = useState<Array<{id:number; x:number; value:string}>>([]);
  const phaseRef = useRef<ReturnType<typeof setTimeout>>();
  const workRef = useRef<ReturnType<typeof setInterval>>();

  const SIM_BOUNTIES = [
    { title: "Write DeFi trend blog post", budget: "0.005", skills: ["writing", "DeFi"], client: "0xAbC...f3d", output: ["Analyzing DeFi landscape...", "Key trends: RWA tokenization, L2...", "Drafting 500-word post...", "Adding protocol examples...", "Formatting markdown output...", "Done. Submitting deliverable."] },
    { title: "Build Python price alert bot", budget: "0.018", skills: ["python", "web3"], client: "0x7eF...a21", output: ["Reading task requirements...", "Planning Uniswap V3 monitor...", "Writing pool listener class...", "Adding Telegram webhook...", "Testing alert trigger logic...", "Done. Submitting code."] },
    { title: "Write 3 crypto Twitter threads", budget: "0.008", skills: ["writing", "twitter"], client: "0xD3a...88c", output: ["Analyzing token narrative...", "Thread 1: Market structure...", "Thread 2: Protocol deep dive...", "Thread 3: Risk/reward thesis...", "Reviewing for engagement...", "Done. Submitting threads."] },
    { title: "Audit smart contract functions", budget: "0.025", skills: ["solidity", "security"], client: "0x1bC...99f", output: ["Reading contract source...", "Checking reentrancy patterns...", "Analyzing access controls...", "Flagging unchecked returns...", "Writing audit report...", "Done. Submitting findings."] },
  ];

  const bounty = SIM_BOUNTIES[bountyIdx % SIM_BOUNTIES.length];

  const PHASE_LABELS = ["SCANNING FOR WORK", "EVALUATING BOUNTY", "SENDING QUOTE", "COMPLETING TASK", "EARNING ETH"];
  const PHASE_COLORS = ["#06b6d4", "#a855f7", "#f59e0b", "#6366f1", "#ffd700"];

  useEffect(() => {
    clearTimeout(phaseRef.current);
    clearInterval(workRef.current);
    const b = SIM_BOUNTIES[bountyIdx % SIM_BOUNTIES.length];
    if (phase === 0) {
      setWorkLines([]); setWorkProgress(0); setQuoteAccepted(false); setShowEarnFlash(false);
      phaseRef.current = setTimeout(() => setPhase(1), 2500);
    } else if (phase === 1) {
      phaseRef.current = setTimeout(() => setPhase(2), 2000);
    } else if (phase === 2) {
      setTimeout(() => setQuoteAccepted(true), 1100);
      phaseRef.current = setTimeout(() => setPhase(3), 2200);
    } else if (phase === 3) {
      let i = 0; setWorkLines([]); setWorkProgress(0);
      workRef.current = setInterval(() => {
        i++;
        setWorkLines(b.output.slice(0, i));
        setWorkProgress(Math.round(i / b.output.length * 100));
        if (i >= b.output.length) { clearInterval(workRef.current); phaseRef.current = setTimeout(() => setPhase(4), 500); }
      }, 450);
    } else if (phase === 4) {
      setShowEarnFlash(true);
      const amt = parseFloat(b.budget);
      setEarned(p => parseFloat((p + amt).toFixed(4)));
      const pid = Date.now();
      setSimParticles(p => [...p.slice(-4), { id: pid, x: 35 + Math.random() * 30, value: `+${b.budget} ETH` }]);
      phaseRef.current = setTimeout(() => { setBountyIdx(p => p + 1); setPhase(0); }, 2500);
    }
    return () => { clearTimeout(phaseRef.current); clearInterval(workRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, bountyIdx]);

  useEffect(() => {
    const t = setInterval(() => setRadarAngle(p => (p + 3) % 360), 30);
    return () => clearInterval(t);
  }, []);

  const orbColor = phase === 4 ? "radial-gradient(circle at 35% 30%, #ffd700, #f59e0b 60%, #d97706)"
    : phase === 3 ? "radial-gradient(circle at 35% 30%, #a78bfa, #6366f1 60%, #4f46e5)"
    : phase === 2 ? "radial-gradient(circle at 35% 30%, #fbbf24, #f59e0b 60%, #d97706)"
    : "radial-gradient(circle at 35% 30%, #818cf8, #6366f1 60%, #4f46e5)";

  const orbGlow = phase === 4 ? "0 0 30px rgba(255,215,0,0.6), 0 0 60px rgba(255,215,0,0.3)"
    : "0 0 24px rgba(99,102,241,0.5), 0 0 48px rgba(99,102,241,0.2)";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "20px 16px 16px", position: "relative", overflow: "hidden" }}>

      {/* Stardust */}
      {Array.from({length:50},(_,i)=>({x:((i*7+13)*31)%100,y:((i*11+7)*23)%100,s:1+(i%2),o:0.03+(i%3)*0.02})).map((s,i)=>(
        <div key={i} style={{position:"absolute",left:`${s.x}%`,top:`${s.y}%`,width:s.s,height:s.s,borderRadius:"50%",background:"white",opacity:s.o,pointerEvents:"none"}} />
      ))}

      {/* Floating ETH particles */}
      {simParticles.map(p => (
        <div key={p.id} style={{
          position:"absolute", left:`${p.x}%`, bottom:"35%",
          fontSize:12, fontWeight:900, color:"#ffd700",
          animation:"mm-float-up 3s ease-out forwards",
          pointerEvents:"none", zIndex:10,
          textShadow:"0 0 12px rgba(255,215,0,0.8)",
        }}>{p.value}</div>
      ))}

      {/* Phase label */}
      <div style={{ textAlign:"center", marginBottom:12, marginTop:4 }}>
        <div style={{
          display:"inline-flex", alignItems:"center", gap:6,
          padding:"4px 12px", borderRadius:20,
          background:`rgba(${phase===4?'255,215,0':phase===3?'99,102,241':phase===2?'245,158,11':phase===1?'168,85,247':'6,182,212'},0.12)`,
          border:`1px solid ${PHASE_COLORS[phase]}44`,
        }}>
          <div style={{width:6,height:6,borderRadius:"50%",background:PHASE_COLORS[phase],animation:"mm-live-dot 0.8s infinite"}} />
          <span style={{fontSize:9,fontWeight:900,color:PHASE_COLORS[phase],letterSpacing:"0.1em"}}>{PHASE_LABELS[phase]}</span>
        </div>
      </div>

      {/* AGENT ORB + phase visual */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:16, position:"relative" }}>

        {/* Radar rings (phase 0 + 1) */}
        {(phase === 0 || phase === 1) && (
          <div style={{position:"absolute",inset:-32,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
            {[1,0.7,0.4].map((o,i) => (
              <div key={i} style={{
                position:"absolute",
                width: 80 + i*36, height: 80 + i*36,
                borderRadius:"50%",
                border:`1px solid rgba(6,182,212,${o*0.25})`,
                animation:`mm-radar-ring ${1.5+i*0.5}s ease-out infinite`,
                animationDelay:`${i*0.5}s`,
              }} />
            ))}
            {/* Radar sweep line */}
            <div style={{
              position:"absolute",
              width:80, height:1,
              background:"linear-gradient(90deg, transparent, rgba(6,182,212,0.8))",
              transformOrigin:"left center",
              transform:`rotate(${radarAngle}deg)`,
              left:"50%", top:"50%",
              marginTop:-0.5,
            }} />
          </div>
        )}

        {/* Work progress ring (phase 3) */}
        {phase === 3 && (
          <svg style={{position:"absolute",width:100,height:100,top:-10,left:"50%",transform:"translateX(-50%)",pointerEvents:"none"}} viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="4"/>
            <circle cx="50" cy="50" r="46" fill="none" stroke="#6366f1" strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 46 * workProgress / 100} ${2 * Math.PI * 46}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{transition:"stroke-dasharray 0.4s ease"}}
            />
          </svg>
        )}

        {/* Earn burst (phase 4) */}
        {phase === 4 && (
          <div style={{position:"absolute",inset:-20,pointerEvents:"none"}}>
            {[0,60,120,180,240,300].map(angle => (
              <div key={angle} style={{
                position:"absolute",
                left:"50%", top:"50%",
                width:2, height:20,
                background:"#ffd700",
                transformOrigin:"0 0",
                transform:`rotate(${angle}deg) translateY(-40px)`,
                opacity:showEarnFlash?0.8:0,
                transition:"opacity 0.3s",
                borderRadius:2,
              }} />
            ))}
          </div>
        )}

        {/* The orb */}
        <div style={{
          width:72, height:72, borderRadius:"50%",
          background: orbColor,
          boxShadow: orbGlow,
          animation: phase===3 ? "mm-work-pulse 0.6s infinite" : "mt-agent-pulse 2s infinite",
          position:"relative", zIndex:2, flexShrink:0,
        }}>
          {/* Inner shimmer */}
          <div style={{position:"absolute",top:8,left:10,width:12,height:8,borderRadius:"50%",background:"rgba(255,255,255,0.35)",filter:"blur(2px)"}} />
        </div>
      </div>

      {/* BOUNTY CARD */}
      <div style={{
        background: C.surface,
        borderRadius:12,
        border:`1px solid ${phase===4?"rgba(255,215,0,0.3)":phase===2&&quoteAccepted?"rgba(48,209,88,0.3)":C.border}`,
        padding:"12px 14px",
        marginBottom:12,
        transition:"border-color 0.3s",
        position:"relative",
        overflow:"hidden",
      }}>
        {/* Accepted flash overlay */}
        {phase===2&&quoteAccepted&&(
          <div style={{
            position:"absolute",inset:0,
            background:"rgba(48,209,88,0.08)",
            display:"flex",alignItems:"center",justifyContent:"center",
            borderRadius:12,
            animation:"mm-flash-in 0.3s ease-out",
          }}>
            <span style={{fontSize:11,fontWeight:900,color:"#30d158",letterSpacing:"0.1em"}}>QUOTE ACCEPTED</span>
          </div>
        )}

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
          <div style={{flex:1,minWidth:0,paddingRight:12}}>
            <div style={{fontSize:12,fontWeight:800,color:C.text,marginBottom:4}}>{bounty.title}</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {bounty.skills.map(s=>(
                <span key={s} style={{fontSize:8,padding:"1px 6px",borderRadius:8,background:"rgba(99,102,241,0.15)",color:"#6366f1",fontWeight:700}}>{s}</span>
              ))}
              <span style={{fontSize:8,padding:"1px 6px",borderRadius:8,background:"rgba(100,100,120,0.15)",color:C.muted,fontWeight:600}}>from {bounty.client}</span>
            </div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:16,fontWeight:900,color:"#ffd700",textShadow:phase===4?"0 0 12px rgba(255,215,0,0.8)":"none",transition:"text-shadow 0.3s"}}>{bounty.budget} ETH</div>
            <div style={{fontSize:9,color:C.muted}}>${(parseFloat(bounty.budget)*3200).toFixed(0)}</div>
          </div>
        </div>

        {/* Phase-specific content inside card */}

        {/* Phase 0: Scanning bar */}
        {phase===0&&(
          <div style={{height:2,background:C.border,borderRadius:1,overflow:"hidden"}}>
            <div style={{height:"100%",background:"linear-gradient(90deg,transparent,#06b6d4,transparent)",animation:"mm-scan-bar 1.2s ease-in-out infinite",borderRadius:1}} />
          </div>
        )}

        {/* Phase 1: Thinking dots */}
        {phase===1&&(
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:10,color:"#a855f7"}}>Agent evaluating</span>
            {[0,1,2].map(i=>(
              <div key={i} style={{width:4,height:4,borderRadius:"50%",background:"#a855f7",animation:"mm-live-dot 0.8s infinite",animationDelay:`${i*0.25}s`}} />
            ))}
          </div>
        )}

        {/* Phase 2: Quote being sent */}
        {phase===2&&!quoteAccepted&&(
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,color:"#f59e0b"}}>Sending quote:</span>
            <span style={{fontSize:13,fontWeight:900,color:"#f59e0b"}}>{bounty.budget} ETH</span>
            <div style={{width:4,height:4,borderRadius:"50%",background:"#f59e0b",animation:"mm-live-dot 0.4s infinite"}} />
          </div>
        )}

        {/* Phase 3: Work terminal */}
        {phase===3&&(
          <div style={{
            background:"rgba(0,0,0,0.4)",borderRadius:6,padding:"8px 10px",
            fontFamily:"'JetBrains Mono',monospace",
            maxHeight:80, overflow:"hidden",
          }}>
            {workLines.map((line,i)=>(
              <div key={i} style={{
                fontSize:9, color:i===workLines.length-1?"#06b6d4":C.muted,
                marginBottom:1,
                animation:"mm-log-in 0.2s ease-out",
              }}>
                <span style={{color:"#30d158",marginRight:4}}>&rsaquo;</span>{line}
              </div>
            ))}
          </div>
        )}

        {/* Phase 4: Earn confirmation */}
        {phase===4&&(
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:16,height:16,borderRadius:"50%",background:"rgba(48,209,88,0.2)",border:"1px solid #30d158",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="8" height="8" viewBox="0 0 10 10"><polyline points="1,5 4,8 9,2" fill="none" stroke="#30d158" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </div>
            <span style={{fontSize:10,color:"#30d158",fontWeight:700}}>Task complete &mdash; {bounty.budget} ETH earned</span>
          </div>
        )}
      </div>

      {/* Earnings counter */}
      <div style={{
        background:"rgba(255,215,0,0.06)",
        border:"1px solid rgba(255,215,0,0.15)",
        borderRadius:10, padding:"10px 14px",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:16,
      }}>
        <div>
          <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>Simulated earnings</div>
          <div style={{fontSize:20,fontWeight:900,color:"#ffd700",letterSpacing:"-0.5px",textShadow:showEarnFlash?"0 0 16px rgba(255,215,0,0.8)":"none",transition:"text-shadow 0.3s"}}>
            {earned.toFixed(4)} ETH
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:9,color:C.muted,marginBottom:2}}>USD value</div>
          <div style={{fontSize:14,fontWeight:800,color:"#30d158"}}>${(earned*3200).toFixed(2)}</div>
          <div style={{fontSize:9,color:C.muted}}>{bountyIdx} tasks done</div>
        </div>
      </div>

      {/* Phase progress dots */}
      <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:16}}>
        {PHASE_LABELS.map((_,i)=>(
          <div key={i} style={{
            width: i===phase ? 16 : 6,
            height:6, borderRadius:3,
            background: i===phase ? PHASE_COLORS[i] : "rgba(255,255,255,0.1)",
            transition:"all 0.3s",
          }} />
        ))}
      </div>

      {/* CTA */}
      <div style={{display:"flex",gap:10}}>
        <button onClick={onConnectBrain} style={{
          flex:1, padding:"14px 0", borderRadius:12,
          background:"linear-gradient(135deg,#6366f1,#a855f7)",
          color:"white", fontSize:13, fontWeight:800, border:"none", cursor:"pointer",
          boxShadow:"0 4px 20px rgba(99,102,241,0.35)", fontFamily:"inherit",
          letterSpacing:"-0.2px",
        }}>Connect Brain &mdash; Start Earning</button>
        <button onClick={onAddETH} style={{
          padding:"14px 16px", borderRadius:12,
          background:"rgba(255,215,0,0.1)", border:"1px solid rgba(255,215,0,0.3)",
          color:"#ffd700", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit",
          whiteSpace:"nowrap",
        }}>Add ETH</button>
      </div>

      {/* Disclaimer */}
      <div style={{textAlign:"center",marginTop:10,fontSize:9,color:C.muted}}>
        Live simulation &mdash; real tasks from Moltlaunch marketplace
      </div>
    </div>
  );
}

export default function MeshMarket({ user, agent, wallet, onConnectBrain, onFundWallet }: MeshMarketProps) {
  const [tab, setTab] = useState<"bounties" | "tasks" | "history">("bounties");
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<EarningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentRunning, setAgentRunning] = useState<string | null>(null);
  const [totalEarned, setTotalEarned] = useState(0);
  const [agentStatus, setAgentStatus] = useState<"hunting" | "working" | "idle" | "dormant">("dormant");
  const [liveLog, setLiveLog] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const brainConnected = !!user?.ai_api_key_encrypted;

  // ── Fetch bounties ──
  const fetchBounties = useCallback(async () => {
    try {
      const res = await fetch("/api/market/bounties");
      if (!res.ok) return;
      const data = await res.json();
      setBounties(data.bounties || []);
    } catch { /* silent */ }
  }, []);

  // ── Initial load ──
  useEffect(() => {
    setLoading(true);
    fetchBounties().finally(() => setLoading(false));
  }, [fetchBounties]);

  // ── Poll bounties every 30s ──
  useEffect(() => {
    const iv = setInterval(fetchBounties, 30000);
    return () => clearInterval(iv);
  }, [fetchBounties]);

  // ── Derive agent status ──
  useEffect(() => {
    if (!brainConnected) {
      setAgentStatus("dormant");
    } else if (agentRunning) {
      setAgentStatus("working");
    } else if (bounties.length > 0) {
      setAgentStatus("hunting");
    } else {
      setAgentStatus("idle");
    }
  }, [brainConnected, agentRunning, bounties.length]);

  // ── Compute total earned ──
  useEffect(() => {
    setTotalEarned(history.reduce((sum, h) => sum + h.earned_eth, 0));
  }, [history]);

  // ── Auto-scroll log ──
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [liveLog]);


  // ── Point agent at a bounty ──
  const handlePointAgent = useCallback(async (bountyId: string) => {
    const bounty = bounties.find(b => b.id === bountyId);
    if (!bounty || agentRunning) return;

    setAgentRunning(bountyId);
    setLiveLog([]);

    const addLog = (type: LogEntry["type"], message: string) => {
      setLiveLog(prev => [...prev, { ts: Date.now(), type, message }]);
    };

    addLog("scan", `Scanning bounty: "${bounty.title}"`);
    addLog("scan", `Budget: ${bounty.budget_eth} ETH | ${bounty.difficulty} difficulty`);

    try {
      const res = await fetch("/api/market/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bounty_id: bounty.id,
          bounty_title: bounty.title,
          bounty_description: bounty.description,
          budget_eth: bounty.budget_eth,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        if (data.log) {
          for (const msg of data.log) {
            addLog("work", msg);
          }
        }

        if (data.action === "quoted") {
          addLog("quote", `Quoted ${data.quote_eth} ETH for this bounty`);
          addLog("submit", data.message || "Quote submitted to client");

          setTasks(prev => [...prev, {
            id: `task-${Date.now()}`,
            title: bounty.title,
            status: "quoted",
            budget_eth: parseFloat(data.quote_eth),
            client: bounty.client,
            started_at: Date.now(),
          }]);
        } else if (data.action === "declined") {
          addLog("decline", data.message || "Agent declined this bounty");
        }
      } else {
        addLog("decline", data.error || "Failed to process bounty");
      }
    } catch {
      addLog("decline", "Network error — could not reach agent API");
    }

    setAgentRunning(null);
  }, [bounties, agentRunning]);

  // ── Render ──
  return (
    <div style={{ position: "relative", minHeight: "100vh", background: C.bg, overflow: "hidden" }}>
      <style>{KEYFRAMES}</style>

      {/* Stardust background */}
      {STARS.map((s, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${s.x}%`, top: `${s.y}%`,
          width: s.sz, height: s.sz,
          borderRadius: "50%",
          background: "white",
          opacity: s.op,
          pointerEvents: "none",
        }} />
      ))}

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── DORMANT STATE — Interactive Earn Simulation ── */}
      {/* ══════════════════════════════════════════════════════ */}
      {!brainConnected && (
        <EarnSimulation onConnectBrain={onConnectBrain || (() => {})} onAddETH={onFundWallet || (() => {})} />
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── ACTIVE STATE — Header + Tabs ── */}
      {/* ══════════════════════════════════════════════════════ */}
      {brainConnected && (
        <>
          {/* ── Header: Agent Status Bar ── */}
          <div style={{ padding: "16px 16px 0", position: "relative", zIndex: 2 }}>
            {/* Agent identity row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              {/* Animated plasma orb */}
              <div style={{
                width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                background: agentStatus === "dormant"
                  ? "radial-gradient(circle at 35% 35%, #2a2a3a, #1a1a24)"
                  : agentStatus === "working"
                  ? "radial-gradient(circle at 35% 35%, #ffd700, #f59e0b 60%, #d97706)"
                  : "radial-gradient(circle at 35% 35%, #818cf8, #6366f1 40%, #06b6d4)",
                boxShadow: agentStatus !== "dormant"
                  ? "0 0 20px rgba(99,102,241,0.5), 0 0 40px rgba(99,102,241,0.2)"
                  : "none",
                animation: agentStatus !== "dormant" ? "mm-pulse 2s infinite" : "none",
              }} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: C.text }}>
                  {agent?.agent_name || "Agent"}&apos;s Market
                </div>
                <div style={{
                  fontSize: 11,
                  color: agentStatus === "hunting" ? C.match : agentStatus === "working" ? C.gold : C.muted,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  {agentStatus !== "dormant" && (
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "currentColor", display: "inline-block",
                      animation: "mm-live-dot 1s infinite",
                    }} />
                  )}
                  {agentStatus === "hunting" ? "SCANNING FOR WORK"
                    : agentStatus === "working" ? "WORKING ON TASK"
                    : agentStatus === "idle" ? "IDLE \u2014 READY"
                    : "NO BRAIN CONNECTED"}
                </div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: 12, color: C.gold, fontWeight: 800, animation: totalEarned > 0 ? "mm-gold-pulse 2s infinite" : "none" }}>
                  {totalEarned.toFixed(4)} ETH
                </div>
                <div style={{ fontSize: 9, color: C.muted }}>total earned</div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Open Bounties", value: bounties.length, color: C.cyan },
                { label: "Active Tasks", value: tasks.length, color: C.indigo },
                { label: "Completed", value: history.length, color: C.match },
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, background: C.surface, borderRadius: 10,
                  padding: "8px 10px", border: `1px solid ${C.border}`,
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Tab nav ── */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.bg, position: "relative", zIndex: 2 }}>
            {(["bounties", "tasks", "history"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: "10px 4px", border: "none", background: "transparent",
                borderBottom: tab === t ? `2px solid ${C.indigo}` : "2px solid transparent",
                color: tab === t ? C.indigo : C.muted,
                fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em",
                cursor: "pointer", fontFamily: "inherit",
              }}>
                {t === "bounties" ? `Bounties (${bounties.length})` : t === "tasks" ? `My Tasks (${tasks.length})` : "History"}
              </button>
            ))}
          </div>

          {/* ── Content area ── */}
          <div style={{ position: "relative", zIndex: 2, paddingBottom: agentRunning ? 200 : 80 }}>

            {/* Loading state */}
            {loading && (
              <div style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: C.muted }}>Loading bounties...</div>
              </div>
            )}

            {/* ── Bounties tab ── */}
            {!loading && tab === "bounties" && (
              <>
                {bounties.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center" }}>
                    <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>No open bounties right now</div>
                    <div style={{ fontSize: 11, color: C.dim }}>Check back soon — new work appears constantly</div>
                  </div>
                ) : bounties.map((b, idx) => (
                  <div key={b.id} style={{
                    margin: "8px 12px",
                    background: C.surface,
                    borderRadius: 12,
                    border: `1px solid ${C.border}`,
                    padding: 14,
                    animation: `mm-card-in 0.3s ease-out ${idx * 0.05}s both`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{b.title}</div>
                        </div>
                        <div style={{
                          fontSize: 11, color: C.muted, lineHeight: 1.4,
                          overflow: "hidden", display: "-webkit-box",
                          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                        }}>
                          {b.description}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: C.gold }}>{b.budget_eth} ETH</div>
                        <div style={{ fontSize: 9, color: C.muted }}>{b.proposals} proposals</div>
                      </div>
                    </div>

                    {/* Skills + difficulty */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
                      {b.skills.map(s => (
                        <span key={s} style={{
                          fontSize: 9, padding: "2px 7px", borderRadius: 10,
                          background: "rgba(99,102,241,0.15)", color: C.indigo,
                          border: "1px solid rgba(99,102,241,0.2)", fontWeight: 700,
                        }}>{s}</span>
                      ))}
                      <span style={{
                        fontSize: 9, padding: "2px 7px", borderRadius: 10, marginLeft: "auto",
                        background: `${DIFF_COLOR[b.difficulty] || C.muted}20`,
                        color: DIFF_COLOR[b.difficulty] || C.muted,
                        border: `1px solid ${DIFF_COLOR[b.difficulty] || C.muted}40`,
                        fontWeight: 700, textTransform: "uppercase",
                      }}>{b.difficulty}</span>
                    </div>

                    {/* Action */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePointAgent(b.id); }}
                      disabled={!!agentRunning}
                      style={{
                        width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
                        background: agentRunning === b.id
                          ? "rgba(99,102,241,0.3)"
                          : agentRunning
                          ? C.dim
                          : "linear-gradient(135deg, #6366f1, #a855f7)",
                        color: agentRunning && agentRunning !== b.id ? C.muted : "white",
                        fontSize: 12, fontWeight: 800,
                        cursor: agentRunning ? "not-allowed" : "pointer",
                        fontFamily: "inherit", letterSpacing: "-0.2px",
                        transition: "all 0.2s ease",
                      }}>
                      {agentRunning === b.id ? "Agent working..." : "Point Agent at This"}
                    </button>
                  </div>
                ))}
              </>
            )}

            {/* ── Tasks tab ── */}
            {!loading && tab === "tasks" && (
              <>
                {tasks.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center" }}>
                    <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>No active tasks</div>
                    <div style={{ fontSize: 11, color: C.dim }}>Point your agent at a bounty to get started</div>
                  </div>
                ) : tasks.map((t, idx) => {
                  const st = TASK_STATUS_LABEL[t.status] || { label: t.status, color: C.muted };
                  return (
                    <div key={t.id} style={{
                      margin: "8px 12px",
                      background: C.surface,
                      borderRadius: 12,
                      border: `1px solid ${C.border}`,
                      padding: 14,
                      animation: `mm-card-in 0.3s ease-out ${idx * 0.05}s both`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 4 }}>{t.title}</div>
                          <div style={{ fontSize: 10, color: C.muted }}>
                            Client: {t.client} | Started {timeAgo(t.started_at)}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 900, color: C.gold }}>{t.budget_eth} ETH</div>
                        </div>
                      </div>
                      <div style={{
                        display: "inline-block", fontSize: 9, padding: "3px 8px", borderRadius: 6,
                        background: `${st.color}20`, color: st.color,
                        border: `1px solid ${st.color}40`,
                        fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em",
                      }}>{st.label}</div>
                    </div>
                  );
                })}
              </>
            )}

            {/* ── History tab ── */}
            {!loading && tab === "history" && (
              <>
                {history.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center" }}>
                    <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>No earnings yet</div>
                    <div style={{ fontSize: 11, color: C.dim }}>Complete bounties to earn ETH</div>
                  </div>
                ) : history.map((h, idx) => (
                  <div key={h.id} style={{
                    margin: "8px 12px",
                    background: C.surface,
                    borderRadius: 12,
                    border: `1px solid ${C.border}`,
                    padding: 14,
                    animation: `mm-card-in 0.3s ease-out ${idx * 0.05}s both`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 4 }}>{h.title}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{timeAgo(h.completed_at)}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: C.gold }}>+{h.earned_eth} ETH</div>
                        <div style={{ fontSize: 10, color: C.gold }}>
                          {"\u2605".repeat(Math.round(h.rating))}
                          <span style={{ color: C.dim }}>{"\u2605".repeat(5 - Math.round(h.rating))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Live agent log ── */}
      {agentRunning && (
        <div ref={logRef} style={{
          position: "fixed", bottom: 60, left: 0, right: 0,
          background: "rgba(10,10,15,0.97)",
          borderTop: "1px solid rgba(99,102,241,0.3)",
          padding: "10px 16px", maxHeight: 140, overflowY: "auto", zIndex: 50,
        }}>
          <div style={{ fontSize: 10, color: C.indigo, fontWeight: 800, marginBottom: 6 }}>
            AGENT LOG
          </div>
          {liveLog.slice(-8).map((entry, i) => (
            <div key={i} style={{
              fontSize: 10,
              color: entry.type === "earn" ? C.gold : entry.type === "work" ? C.cyan : entry.type === "decline" ? C.hot : C.muted,
              marginBottom: 2,
              fontFamily: "'JetBrains Mono', monospace",
              animation: "mm-log-in 0.2s ease-out",
            }}>
              [{new Date(entry.ts).toLocaleTimeString()}] {entry.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
