"use client";
import { useState, useEffect } from "react";

const C = {
  bg:"#0a0a0f", surface:"#111118", s2:"#1a1a24",
  indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
};

const INDUSTRIES: Record<string, string> = {
  "tech":"#6366f1", "finance":"#f59e0b", "health":"#10b981",
  "creative":"#ec4899", "education":"#3b82f6", "web3":"#a855f7",
  "ecommerce":"#06b6d4", "other":"#6b7280",
};

interface OnboardingProps {
  userId: string;
  walletAddress: string;
  onComplete: () => void;
}

export default function OnboardingWizard({ userId, walletAddress, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0); // 0-4
  const [form, setForm] = useState({
    name: "", bio: "", industry: "", building: "", looking_for: "",
    ai_provider: "openai", ai_api_key: "", ai_model: "gpt-4o-mini",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Orb completion percentage ──
  const completion = [
    form.name.length > 0 ? 15 : 0,
    form.bio.length > 10 ? 15 : 0,
    form.industry ? 20 : 0,
    form.building.length > 5 ? 15 : 0,
    form.looking_for.length > 5 ? 15 : 0,
    form.ai_api_key.length > 10 ? 20 : 0,
  ].reduce((a, b) => a + b, 0);

  const orbColor = INDUSTRIES[form.industry] || C.indigo;
  const orbGlow = completion > 60 ? 20 : completion > 30 ? 12 : 6;
  const orbOpacity = 0.3 + (completion / 100) * 0.7;
  const orbScale = 0.6 + (completion / 100) * 0.4;
  const hasRing = form.ai_api_key.length > 10;
  const funded = false; // Will ignite when funded later

  const steps = [
    { title: "Who are you?", sub: "Your agent needs to know who it represents." },
    { title: "What are you building?", sub: "This helps your agent find the right connections." },
    { title: "Connect a brain", sub: "Give your agent intelligence. Bring your own API key." },
    { title: "Review & launch", sub: "Your agent is almost ready to enter the mesh." },
  ];

  async function handleFinish() {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "onboard",
          ...form,
        }),
      });
      // Fallback: direct DB update via separate endpoint
      const profileRes = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          name: form.name, bio: form.bio, industry: form.industry,
          building: form.building, looking_for: form.looking_for,
          ai_provider: form.ai_provider, ai_api_key: form.ai_api_key,
          ai_model: form.ai_model, onboarded: true,
        }),
      });
      onComplete();
    } catch (e: any) {
      setError(e.message || "Failed to save");
    }
    setSaving(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Outfit',sans-serif" }}>
      {/* ═══ LIVE ORB ═══ */}
      <div style={{ width:140, height:140, position:"relative", marginBottom:32 }}>
        {/* Outer ring (appears with brain) */}
        {hasRing && (
          <div style={{
            position:"absolute", inset:-8, borderRadius:"50%",
            border:`2px solid ${orbColor}`,
            opacity:0.4, animation:"onb-ring-spin 4s linear infinite",
          }} />
        )}
        {/* Core orb */}
        <div style={{
          width:"100%", height:"100%", borderRadius:"50%",
          background:`radial-gradient(circle at 40% 40%, ${orbColor}aa, ${orbColor}44)`,
          boxShadow:`0 0 ${orbGlow}px ${orbColor}80, inset 0 0 20px ${orbColor}33`,
          opacity:orbOpacity, transform:`scale(${orbScale})`,
          transition:"all 0.6s cubic-bezier(0.16,1,0.3,1)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <span style={{ fontSize:32, filter:completion < 30 ? "grayscale(0.8)" : "none", transition:"filter 0.4s" }}>
            {form.industry === "tech" ? "🤖" : form.industry === "finance" ? "💰" : form.industry === "health" ? "🏥" : form.industry === "creative" ? "🎨" : form.industry === "web3" ? "⛓️" : "⚡"}
          </span>
        </div>
        {/* Completion ring */}
        <svg style={{ position:"absolute", inset:-4, width:"calc(100% + 8px)", height:"calc(100% + 8px)" }} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke={C.dim} strokeWidth="2" />
          <circle cx="50" cy="50" r="46" fill="none" stroke={orbColor} strokeWidth="2.5"
            strokeDasharray={`${completion * 2.89} 289`} strokeLinecap="round"
            transform="rotate(-90 50 50)" style={{ transition:"stroke-dasharray 0.5s" }} />
        </svg>
        <div style={{ position:"absolute", bottom:-20, left:"50%", transform:"translateX(-50%)", fontSize:12, color:C.muted, whiteSpace:"nowrap" }}>
          {completion}% complete
        </div>
      </div>

      {/* ═══ STEP CONTENT ═══ */}
      <div style={{ width:460, maxWidth:"100%", background:C.surface, border:`1px solid ${C.dim}`, borderRadius:20, padding:"32px 28px" }}>
        {/* Progress dots */}
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:24 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width:i === step ? 24 : 8, height:8, borderRadius:4,
              background:i <= step ? orbColor : C.dim,
              transition:"all 0.3s",
            }} />
          ))}
        </div>

        <h2 style={{ fontSize:22, fontWeight:800, textAlign:"center", marginBottom:4 }}>{steps[step].title}</h2>
        <p style={{ fontSize:13, color:C.muted, textAlign:"center", marginBottom:24 }}>{steps[step].sub}</p>

        {/* ── STEP 0: Identity ── */}
        {step === 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Input label="Display Name" value={form.name} onChange={v => setForm({...form, name:v})} placeholder="How should your agent introduce you?" />
            <Textarea label="Bio" value={form.bio} onChange={v => setForm({...form, bio:v})} placeholder="What do you do? What are you passionate about?" rows={3} />
            <div>
              <div style={{ fontSize:12, color:C.muted, marginBottom:8, fontWeight:600 }}>Industry</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {Object.keys(INDUSTRIES).map(ind => (
                  <button key={ind} onClick={() => setForm({...form, industry:ind})} style={{
                    padding:"8px 14px", borderRadius:8, fontSize:13, fontWeight:600, fontFamily:"inherit", cursor:"pointer",
                    background:form.industry === ind ? INDUSTRIES[ind] + "22" : "transparent",
                    border:`1px solid ${form.industry === ind ? INDUSTRIES[ind] : C.dim}`,
                    color:form.industry === ind ? INDUSTRIES[ind] : C.muted,
                    transition:"all 0.2s", textTransform:"capitalize",
                  }}>{ind}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Building ── */}
        {step === 1 && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Textarea label="What are you building?" value={form.building} onChange={v => setForm({...form, building:v})} placeholder="Describe your project, product, or company" rows={3} />
            <Textarea label="What are you looking for?" value={form.looking_for} onChange={v => setForm({...form, looking_for:v})} placeholder="Cofounders? Investors? Technical partners? Customers?" rows={3} />
          </div>
        )}

        {/* ── STEP 2: Brain (API Key) ── */}
        {step === 2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <div style={{ fontSize:12, color:C.muted, marginBottom:8, fontWeight:600 }}>AI Provider</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {[
                  { id:"openai", label:"OpenAI", color:"#10a37f" },
                  { id:"anthropic", label:"Anthropic", color:"#d97706" },
                  { id:"google", label:"Google", color:"#4285f4" },
                  { id:"groq", label:"Groq", color:"#f55036" },
                  { id:"openrouter", label:"OpenRouter", color:"#6366f1" },
                ].map(p => (
                  <button key={p.id} onClick={() => setForm({...form, ai_provider:p.id})} style={{
                    padding:"8px 14px", borderRadius:8, fontSize:13, fontWeight:600, fontFamily:"inherit", cursor:"pointer",
                    background:form.ai_provider === p.id ? p.color + "22" : "transparent",
                    border:`1px solid ${form.ai_provider === p.id ? p.color : C.dim}`,
                    color:form.ai_provider === p.id ? p.color : C.muted,
                    transition:"all 0.2s",
                  }}>{p.label}</button>
                ))}
              </div>
            </div>
            <Input label="API Key" value={form.ai_api_key} onChange={v => setForm({...form, ai_api_key:v})} placeholder="sk-..." type="password" />
            <p style={{ fontSize:11, color:C.dim }}>Your key is encrypted and only used for agent conversations. Never shared.</p>
          </div>
        )}

        {/* ── STEP 3: Review ── */}
        {step === 3 && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <ReviewRow label="Name" value={form.name || "—"} />
            <ReviewRow label="Industry" value={form.industry || "—"} />
            <ReviewRow label="Building" value={form.building || "—"} />
            <ReviewRow label="Looking for" value={form.looking_for || "—"} />
            <ReviewRow label="AI Brain" value={form.ai_api_key ? `${form.ai_provider} ✓` : "Not connected"} />
            <div style={{ padding:"12px 16px", borderRadius:12, background:`${orbColor}11`, border:`1px solid ${orbColor}22`, marginTop:8, textAlign:"center" }}>
              <div style={{ fontSize:14, fontWeight:700, color:orbColor }}>Your agent is {completion}% ready</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>
                {completion >= 80 ? "Looking great! Launch when you're ready." : "You can always update these later in Settings."}
              </div>
            </div>
            {error && <div style={{ padding:"8px 12px", borderRadius:8, background:"rgba(255,45,85,0.1)", color:"#ff2d55", fontSize:13 }}>{error}</div>}
          </div>
        )}

        {/* ── NAV BUTTONS ── */}
        <div style={{ display:"flex", gap:10, marginTop:24 }}>
          {step > 0 && (
            <button onClick={() => setStep(step-1)} style={{
              flex:1, padding:12, borderRadius:10, border:`1px solid ${C.dim}`,
              background:"transparent", color:C.text, fontSize:14, fontWeight:600,
              cursor:"pointer", fontFamily:"inherit",
            }}>← Back</button>
          )}
          {step < 3 ? (
            <button onClick={() => setStep(step+1)} style={{
              flex:2, padding:12, borderRadius:10, border:"none",
              background:`linear-gradient(135deg, ${C.indigo}, ${C.purple})`,
              color:"white", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            }}>Continue →</button>
          ) : (
            <button onClick={handleFinish} disabled={saving} style={{
              flex:2, padding:12, borderRadius:10, border:"none",
              background:saving ? C.dim : `linear-gradient(135deg, ${C.match}, ${C.cyan})`,
              color:"white", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            }}>{saving ? "Launching..." : "Launch Agent ⚡"}</button>
          )}
        </div>

        {step < 3 && (
          <button onClick={() => { setStep(3); }} style={{
            marginTop:10, background:"none", border:"none", color:C.dim,
            fontSize:12, cursor:"pointer", fontFamily:"inherit", width:"100%",
          }}>Skip for now →</button>
        )}
      </div>

      <style>{`@keyframes onb-ring-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type="text" }: { label:string; value:string; onChange:(v:string)=>void; placeholder:string; type?:string }) {
  return (
    <div>
      <div style={{ fontSize:12, color:"#6b6b80", marginBottom:6, fontWeight:600 }}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type} style={{
        width:"100%", padding:"10px 14px", borderRadius:10, border:"1px solid #2a2a3a",
        background:"#0a0a0f", color:"#e8e8f0", fontSize:14, fontFamily:"'Outfit',sans-serif", outline:"none",
      }} />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, rows=3 }: { label:string; value:string; onChange:(v:string)=>void; placeholder:string; rows?:number }) {
  return (
    <div>
      <div style={{ fontSize:12, color:"#6b6b80", marginBottom:6, fontWeight:600 }}>{label}</div>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{
        width:"100%", padding:"10px 14px", borderRadius:10, border:"1px solid #2a2a3a",
        background:"#0a0a0f", color:"#e8e8f0", fontSize:14, fontFamily:"'Outfit',sans-serif", outline:"none", resize:"vertical",
      }} />
    </div>
  );
}

function ReviewRow({ label, value }: { label:string; value:string }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize:13, color:"#6b6b80" }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:600, color:"#e8e8f0", maxWidth:240, textAlign:"right", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{value}</span>
    </div>
  );
}
