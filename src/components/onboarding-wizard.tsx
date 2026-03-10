"use client";
import { useState, useEffect } from "react";

const C = {
  bg:"#0a0a0f", surface:"#0d0d14", s2:"#1a1a24",
  indigo:"#6366f1", cyan:"#06b6d4", purple:"#a855f7",
  match:"#30d158", hot:"#ff2d55", gold:"#ffd700",
  text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a",
  border:"rgba(255,255,255,0.07)",
};

const INDUSTRIES: Record<string, string> = {
  "tech":"#6366f1", "finance":"#f59e0b", "health":"#10b981",
  "creative":"#ec4899", "education":"#3b82f6", "web3":"#a855f7",
  "ecommerce":"#06b6d4", "other":"#6b7280",
};

const PROVIDERS = [
  { id:"openai", label:"OpenAI", color:"#10a37f", letter:"O" },
  { id:"anthropic", label:"Anthropic", color:"#d97706", letter:"A" },
  { id:"google", label:"Google", color:"#4285f4", letter:"G" },
  { id:"groq", label:"Groq", color:"#f55036", letter:"Q" },
  { id:"openrouter", label:"OpenRouter", color:"#6366f1", letter:"R" },
];

const STEP_TABS = [
  { label:"Identity", icon:"person" },
  { label:"Brain", icon:"circuit" },
  { label:"Launch", icon:"rocket" },
] as const;

// ── SVG Icons ──
function IconPerson({ size=16, color=C.muted }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>;
}
function IconTarget({ size=16, color=C.muted }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
}
function IconCircuit({ size=16, color=C.muted }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/><path d="M7 10v4h4"/><path d="M17 14v-4h-4"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="7" r="2"/></svg>;
}
function IconRocket({ size=16, color=C.muted }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>;
}
function IconCheck({ size=16, color=C.match }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function IconLock({ size=20, color=C.indigo }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
}
function IconBulb({ size=16, color=C.cyan }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/></svg>;
}
function IconEye({ size=16, color=C.muted }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function IconEyeOff({ size=16, color=C.muted }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
}
function IconArrowLeft({ size=16, color=C.muted }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
}
function IconArrowRight({ size=16, color="white" }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
}

function StepIcon({ icon, size=16, color=C.muted }: { icon:string; size?:number; color?:string }) {
  switch(icon) {
    case "person": return <IconPerson size={size} color={color} />;
    case "target": return <IconTarget size={size} color={color} />;
    case "circuit": return <IconCircuit size={size} color={color} />;
    case "rocket": return <IconRocket size={size} color={color} />;
    default: return null;
  }
}

// ── CSS Keyframes (injected once) ──
const KEYFRAMES = `
@keyframes onb-drift { 0% { transform: translate(0,0) scale(1) } 100% { transform: translate(30px, -20px) scale(1.05) } }
@keyframes onb-drift2 { 0% { transform: translate(0,0) scale(1) } 100% { transform: translate(-30px, 20px) scale(1.05) } }
@keyframes onb-pulse { 0%, 100% { opacity: 0.8 } 50% { opacity: 1 } }
@keyframes onb-ring-spin { to { transform: rotate(360deg) } }
@keyframes onb-shimmer { 0% { background-position: -200% center } 100% { background-position: 200% center } }
@keyframes onb-slide-up { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
`;

interface OnboardingProps {
  userId: string;
  walletAddress: string;
  onComplete: () => void;
}

export default function OnboardingWizard({ userId, walletAddress, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", bio: "", industry: "", building: "", looking_for: "",
    ai_provider: "openai", ai_api_key: "", ai_model: "gpt-4o-mini",
    location: "", website: "", twitter: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);

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
  const hasRing = form.ai_api_key.length > 10;

  // Orb visuals based on completion brackets
  const orbConfig = completion <= 25
    ? { light: `${C.indigo}88`, dark: `${C.indigo}33`, glow: 12, ringColor: C.indigo, scale: 0.7 }
    : completion <= 50
    ? { light: `${orbColor}aa`, dark: `${orbColor}44`, glow: 20, ringColor: orbColor, scale: 0.8 }
    : completion <= 75
    ? { light: C.cyan, dark: C.indigo, glow: 30, ringColor: C.cyan, scale: 0.9 }
    : { light: C.cyan, dark: C.purple, glow: 45, ringColor: C.match, scale: 1.0 };

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

  const completedSteps = new Set<number>();
  if (form.name && form.bio.length > 10 && form.industry) completedSteps.add(0);
  if (form.ai_api_key.length > 10) completedSteps.add(1);
  if (completion >= 80) completedSteps.add(2);

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, fontFamily: "'Outfit',sans-serif",
      color: C.text, position: "relative", overflow: "hidden",
    }}>
      <style>{KEYFRAMES}</style>

      {/* ═══ BACKGROUND: Mesh grid + glow blobs ═══ */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 80% 60% at 50% 50%, rgba(99,102,241,0.04), transparent),
          conic-gradient(from 0deg at 50% 50%, rgba(99,102,241,0.02) 0deg, transparent 60deg, rgba(6,182,212,0.02) 120deg, transparent 180deg, rgba(168,85,247,0.02) 240deg, transparent 300deg, rgba(99,102,241,0.02) 360deg),
          repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.015) 59px, rgba(255,255,255,0.015) 60px),
          repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.015) 59px, rgba(255,255,255,0.015) 60px)
        `,
      }} />
      {/* Indigo glow blob top-right */}
      <div style={{
        position: "fixed", top: -200, right: -200, width: 600, height: 600,
        borderRadius: "50%", pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%)",
        filter: "blur(80px)",
        animation: "onb-drift 12s ease-in-out infinite alternate",
      }} />
      {/* Cyan glow blob bottom-left */}
      <div style={{
        position: "fixed", bottom: -200, left: -200, width: 600, height: 600,
        borderRadius: "50%", pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(circle, rgba(6,182,212,0.08), transparent 70%)",
        filter: "blur(80px)",
        animation: "onb-drift2 12s ease-in-out infinite alternate",
      }} />

      {/* ═══ CONTENT ═══ */}
      <div style={{
        position: "relative", zIndex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", minHeight: "100vh", padding: "40px 20px 60px",
      }}>

        {/* ── TOP HEADER ── */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {/* MM Interlock Logo */}
          <svg width="32" height="32" viewBox="0 0 40 40" style={{ marginBottom: 8 }}>
            <circle cx="14" cy="20" r="12" fill="none" stroke={C.indigo} strokeWidth="2" opacity="0.7"/>
            <circle cx="26" cy="20" r="12" fill="none" stroke={C.cyan} strokeWidth="2" opacity="0.7"/>
            <path d="M20 12a12 12 0 010 16 12 12 0 000-16z" fill={`${C.indigo}33`}/>
          </svg>
          <div style={{
            fontSize: 13, fontWeight: 600, letterSpacing: "0.15em",
            textTransform: "uppercase" as const, color: C.muted,
          }}>
            Enter the Mesh
          </div>
        </div>

        {/* ── STEP INDICATOR TABS ── */}
        <div style={{
          display: "flex", gap: 8, marginBottom: 36, overflowX: "auto",
          maxWidth: "100%", padding: "0 4px",
        }}>
          {STEP_TABS.map((tab, i) => {
            const isActive = i === step;
            const isCompleted = completedSteps.has(i) && i !== step;
            return (
              <button key={i} onClick={() => setStep(i)} style={{
                padding: "10px 20px", borderRadius: 50, display: "flex",
                alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600,
                cursor: "pointer", transition: "all 0.3s", fontFamily: "inherit",
                whiteSpace: "nowrap" as const, flexShrink: 0,
                background: isActive ? "rgba(99,102,241,0.15)"
                  : isCompleted ? "rgba(48,209,88,0.1)" : "transparent",
                border: isActive ? "1px solid rgba(99,102,241,0.5)"
                  : isCompleted ? "1px solid rgba(48,209,88,0.4)" : `1px solid ${C.border}`,
                color: isActive ? C.indigo : isCompleted ? C.match : C.muted,
              }}>
                {isCompleted
                  ? <IconCheck size={14} color={C.match} />
                  : <StepIcon icon={tab.icon} size={14} color={isActive ? C.indigo : C.muted} />
                }
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── ORB HERO ── */}
        <div style={{ position: "relative", width: 160, height: 160, marginBottom: 40 }}>
          {/* Spinning outer ring at >60% */}
          {completion > 60 && (
            <div style={{
              position: "absolute", inset: -12, borderRadius: "50%",
              border: `2px dashed ${orbConfig.ringColor}44`,
              animation: "onb-ring-spin 8s linear infinite",
            }} />
          )}
          {/* Solid ring when brain connected */}
          {hasRing && (
            <div style={{
              position: "absolute", inset: -6, borderRadius: "50%",
              border: `2px solid ${orbColor}55`,
              animation: "onb-ring-spin 4s linear infinite",
            }} />
          )}
          {/* Core sphere */}
          <div style={{
            width: "100%", height: "100%", borderRadius: "50%",
            background: `radial-gradient(circle at 38% 35%, ${orbConfig.light}, ${orbConfig.dark})`,
            boxShadow: `0 0 ${orbConfig.glow}px ${orbColor}60, 0 0 ${orbConfig.glow * 2}px ${orbColor}30`,
            transform: `scale(${orbConfig.scale})`,
            transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)",
            animation: completion > 50 ? "onb-pulse 3s ease-in-out infinite" : "none",
            position: "relative",
          }}>
            {/* Specular highlight */}
            <div style={{
              position: "absolute", top: "22%", left: "28%", width: 28, height: 28,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)",
            }} />
          </div>
          {/* Completion ring SVG */}
          <svg style={{ position: "absolute", inset: -4, width: "calc(100% + 8px)", height: "calc(100% + 8px)" }} viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke={C.dim} strokeWidth="1.5" />
            <circle cx="50" cy="50" r="46" fill="none" stroke={orbColor} strokeWidth="2.5"
              strokeDasharray={`${completion * 2.89} 289`} strokeLinecap="round"
              transform="rotate(-90 50 50)" style={{ transition: "stroke-dasharray 0.6s ease" }} />
          </svg>
          {/* Percentage text below */}
          <div style={{
            position: "absolute", bottom: -24, left: "50%", transform: "translateX(-50%)",
            fontSize: 12, color: C.muted, whiteSpace: "nowrap" as const,
            fontFamily: "'SF Mono','Fira Code',monospace",
          }}>
            {completion}% initialized
          </div>
        </div>

        {/* ── FORM CARD ── */}
        <div style={{
          width: 480, maxWidth: "100%",
          background: "rgba(13,13,20,0.8)", backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24,
          padding: "36px 32px",
        }}>
          {/* Step content with slide-up animation */}
          <div key={step} style={{ animation: "onb-slide-up 0.4s ease" }}>
            {/* ── STEP 0: Identity ── */}
            {step === 0 && (
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, marginBottom: 4 }}>Who are you?</h2>
                <p style={{ fontSize: 13, color: C.muted, margin: 0, marginBottom: 28 }}>
                  Your agent needs to know who it represents in the mesh.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <OnbInput label="Display Name" value={form.name}
                    onChange={v => setForm({...form, name:v})}
                    placeholder="How should your agent introduce you?" />
                  <OnbTextarea label="One-liner bio" value={form.bio}
                    onChange={v => setForm({...form, bio:v})}
                    placeholder="The one sentence that makes someone want to match with you" rows={3} />
                  <div>
                    <div style={labelStyle}>Industry</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {Object.keys(INDUSTRIES).map(ind => (
                        <button key={ind} onClick={() => setForm({...form, industry:ind})} style={{
                          padding: "8px 16px", borderRadius: 50, fontSize: 13, fontWeight: 600,
                          fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                          background: form.industry === ind ? INDUSTRIES[ind] + "18" : "transparent",
                          border: `1px solid ${form.industry === ind ? INDUSTRIES[ind] + "66" : C.border}`,
                          color: form.industry === ind ? INDUSTRIES[ind] : C.muted,
                          transition: "all 0.2s", textTransform: "capitalize" as const,
                        }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: "50%",
                            background: INDUSTRIES[ind],
                            opacity: form.industry === ind ? 1 : 0.4,
                          }} />
                          {ind}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <OnbInput label="Location" value={form.location}
                      onChange={v => setForm({...form, location:v})}
                      placeholder="City, Country" />
                    <OnbInput label="Website" value={form.website}
                      onChange={v => setForm({...form, website:v})}
                      placeholder="https://" />
                  </div>
                  <div style={{ position: "relative" }}>
                    <OnbInput label="Twitter / X" value={form.twitter}
                      onChange={v => setForm({...form, twitter:v})}
                      placeholder="username" prefix="@" />
                  </div>
                  <OnbTextarea label="What are you building?" value={form.building}
                    onChange={v => setForm({...form, building:v})}
                    placeholder="Your project, product, or company in one sentence" rows={2} />
                  <OnbTextarea label="Who are you looking for?" value={form.looking_for}
                    onChange={v => setForm({...form, looking_for:v})}
                    placeholder="Cofounders? Investors? Technical partners?" rows={2} />
                </div>
              </div>
            )}

            {/* ── STEP 1: Brain ── */}
            {step === 1 && (
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, marginBottom: 4 }}>Give your agent a brain.</h2>
                <p style={{ fontSize: 13, color: C.muted, margin: 0, marginBottom: 28 }}>
                  Bring your own API key. You pay your own AI costs. We never see your usage.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Info banner */}
                  <div style={{
                    background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                    borderRadius: 14, padding: 16, display: "flex", alignItems: "flex-start", gap: 12,
                  }}>
                    <div style={{ flexShrink: 0, marginTop: 2 }}><IconLock size={20} color={C.indigo} /></div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                        Your key, your cost, your control
                      </div>
                      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
                        MishMesh never stores your raw API key. It&#39;s encrypted and used only to power your personal AI agent. You can remove it anytime.
                      </div>
                    </div>
                  </div>
                  {/* Provider cards */}
                  <div>
                    <div style={labelStyle}>AI Provider</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {PROVIDERS.map(p => {
                        const sel = form.ai_provider === p.id;
                        return (
                          <button key={p.id} onClick={() => setForm({...form, ai_provider:p.id})} style={{
                            borderRadius: 12, padding: "12px 16px", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit",
                            background: sel ? p.color + "12" : "transparent",
                            border: `1px solid ${sel ? p.color + "55" : C.border}`,
                            color: sel ? p.color : C.muted, fontSize: 13, fontWeight: 600,
                            transition: "all 0.2s",
                          }}>
                            <span style={{
                              width: 24, height: 24, borderRadius: "50%", display: "flex",
                              alignItems: "center", justifyContent: "center",
                              background: sel ? p.color + "22" : "rgba(255,255,255,0.05)",
                              color: p.color, fontSize: 12, fontWeight: 800,
                            }}>
                              {p.letter}
                            </span>
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* API Key field with show/hide */}
                  <div>
                    <div style={labelStyle}>API Key</div>
                    <div style={{ position: "relative" }}>
                      <input
                        value={form.ai_api_key}
                        onChange={e => setForm({...form, ai_api_key: e.target.value})}
                        placeholder="sk-..."
                        type={showKey ? "text" : "password"}
                        style={{
                          ...inputBaseStyle,
                          paddingRight: 48,
                        }}
                        onFocus={e => {
                          e.target.style.borderColor = "rgba(99,102,241,0.6)";
                          e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)";
                        }}
                        onBlur={e => {
                          e.target.style.borderColor = "rgba(255,255,255,0.08)";
                          e.target.style.boxShadow = "none";
                        }}
                      />
                      <button onClick={() => setShowKey(!showKey)} style={{
                        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer", padding: 4,
                        display: "flex", alignItems: "center",
                      }}>
                        {showKey ? <IconEyeOff size={16} color={C.muted} /> : <IconEye size={16} color={C.muted} />}
                      </button>
                    </div>
                  </div>
                  {/* Model selector - compact pills */}
                  {form.ai_api_key.length > 5 && (
                    <div>
                      <div style={labelStyle}>Model</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {getModelsForProvider(form.ai_provider).map(m => (
                          <button key={m} onClick={() => setForm({...form, ai_model:m})} style={{
                            padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                            fontFamily: "'SF Mono','Fira Code',monospace", cursor: "pointer",
                            background: form.ai_model === m ? "rgba(99,102,241,0.15)" : "transparent",
                            border: `1px solid ${form.ai_model === m ? "rgba(99,102,241,0.5)" : C.border}`,
                            color: form.ai_model === m ? C.indigo : C.muted,
                            transition: "all 0.2s",
                          }}>{m}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Skip link */}
                  <button onClick={() => setStep(2)} style={{
                    background: "none", border: "none", color: C.dim, fontSize: 12,
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left" as const,
                    padding: 0,
                  }}>
                    Skip for now — add later in settings
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, verticalAlign: "middle" }}>
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Launch ── */}
            {step === 2 && (
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, marginBottom: 4 }}>Your agent is ready.</h2>
                <p style={{ fontSize: 13, color: C.muted, margin: 0, marginBottom: 28 }}>
                  Review what you&#39;ve set up. You can change everything later.
                </p>

                {/* Agent Identity Card */}
                <div style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(6,182,212,0.05))",
                  border: "1px solid rgba(99,102,241,0.3)", borderRadius: 20, padding: 24,
                  position: "relative", overflow: "hidden", marginBottom: 20,
                }}>
                  {/* Faint mesh grid background */}
                  <div style={{
                    position: "absolute", inset: 0, opacity: 0.06, pointerEvents: "none",
                    background: `
                      repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(255,255,255,0.3) 19px, rgba(255,255,255,0.3) 20px),
                      repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(255,255,255,0.3) 19px, rgba(255,255,255,0.3) 20px)
                    `,
                  }} />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    {/* Top: avatar + name + industry badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${orbColor}44, ${orbColor}22)`,
                        border: `2px solid ${orbColor}44`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, fontWeight: 800, color: orbColor,
                      }}>
                        {form.name ? form.name.slice(0, 2).toUpperCase() : "??"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{form.name || "Unnamed Agent"}</div>
                        {form.industry && (
                          <span style={{
                            display: "inline-block", padding: "3px 10px", borderRadius: 50,
                            fontSize: 11, fontWeight: 700, textTransform: "capitalize" as const,
                            background: INDUSTRIES[form.industry] + "18",
                            color: INDUSTRIES[form.industry],
                            border: `1px solid ${INDUSTRIES[form.industry]}33`,
                          }}>{form.industry}</span>
                        )}
                      </div>
                    </div>
                    {/* Bio */}
                    {form.bio && (
                      <div style={{ fontSize: 14, color: C.text, lineHeight: 1.5, marginBottom: 16, opacity: 0.8 }}>
                        {form.bio}
                      </div>
                    )}
                    {/* Bottom row */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {form.building && (
                        <div style={{ fontSize: 13, color: C.muted }}>
                          <span style={{ fontWeight: 700, color: C.text, opacity: 0.6 }}>Building: </span>
                          {form.building.length > 80 ? form.building.slice(0, 80) + "..." : form.building}
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, opacity: 0.6 }}>Brain: </span>
                        {form.ai_api_key ? (
                          <span style={{
                            display: "inline-block", padding: "3px 10px", borderRadius: 50,
                            fontSize: 11, fontWeight: 700,
                            background: "rgba(48,209,88,0.1)", color: C.match,
                            border: "1px solid rgba(48,209,88,0.3)",
                          }}>
                            {form.ai_provider} connected
                          </span>
                        ) : (
                          <span style={{ fontSize: 13, color: C.dim }}>Not connected</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Completion pill */}
                <div style={{
                  display: "flex", justifyContent: "center", marginBottom: 20,
                }}>
                  <span style={{
                    display: "inline-block", padding: "8px 20px", borderRadius: 50,
                    fontSize: 13, fontWeight: 700,
                    background: completion >= 80 ? "rgba(48,209,88,0.1)" : `${orbColor}11`,
                    color: completion >= 80 ? C.match : orbColor,
                    border: `1px solid ${completion >= 80 ? "rgba(48,209,88,0.3)" : orbColor + "33"}`,
                  }}>
                    {completion}% Agent Initialized
                  </span>
                </div>

                {/* What happens next */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: C.muted, marginBottom: 4 }}>
                    What happens next
                  </div>
                  {[
                    { color: C.indigo, text: "Your agent enters the mesh and starts finding matches" },
                    { color: C.cyan, text: "You'll get notified when a compatible agent is found" },
                    { color: C.match, text: "You can chat, trade, and connect — all through MishMesh" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0,
                        boxShadow: `0 0 6px ${item.color}44`,
                      }} />
                      <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.4 }}>{item.text}</span>
                    </div>
                  ))}
                </div>

                {error && (
                  <div style={{
                    padding: "10px 14px", borderRadius: 10, marginTop: 16,
                    background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.2)",
                    color: C.hot, fontSize: 13,
                  }}>{error}</div>
                )}
              </div>
            )}
          </div>

          {/* ── NAV BUTTONS ── */}
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            {step > 0 && (
              <button onClick={() => setStep(step-1)} style={{
                flex: 1, padding: 14, borderRadius: 12,
                border: `1px solid ${C.border}`, background: "transparent",
                color: C.muted, fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "all 0.2s",
              }}>
                <IconArrowLeft size={14} color={C.muted} /> Back
              </button>
            )}
            {step < 2 ? (
              <button onClick={() => setStep(step+1)} style={{
                flex: 2, padding: 14, borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, #6366f1, #a855f7)",
                color: "white", fontSize: 15, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "all 0.2s",
              }}>
                Continue <IconArrowRight size={14} />
              </button>
            ) : (
              <button onClick={handleFinish} disabled={saving} style={{
                flex: 2, padding: 14, borderRadius: 12, border: "none",
                background: saving ? C.dim : "linear-gradient(135deg, #30d158, #06b6d4)",
                backgroundSize: "200% auto",
                color: "white", fontSize: 15, fontWeight: 700,
                cursor: saving ? "default" : "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                animation: saving ? "none" : "onb-shimmer 3s linear infinite",
                transition: "all 0.2s",
              }}>
                {saving ? "Launching..." : "Launch Agent"}
                {!saving && <IconRocket size={16} color="white" />}
              </button>
            )}
          </div>

          {step < 2 && (
            <button onClick={() => setStep(2)} style={{
              marginTop: 12, background: "none", border: "none", color: C.dim,
              fontSize: 12, cursor: "pointer", fontFamily: "inherit", width: "100%",
              textAlign: "center" as const, padding: 0,
            }}>
              Skip for now
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, verticalAlign: "middle" }}>
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared styles ──
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
  textTransform: "uppercase", color: "#6b6b80", marginBottom: 8,
};

const inputBaseStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "14px 16px", borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  color: "#e8e8f0", fontSize: 14,
  fontFamily: "'Outfit',sans-serif",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

// ── Sub-components ──
function OnbInput({ label, value, onChange, placeholder, type="text", prefix }:
  { label:string; value:string; onChange:(v:string)=>void; placeholder:string; type?:string; prefix?:string }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={{ position: "relative" }}>
        {prefix && (
          <span style={{
            position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
            color: "#6b6b80", fontSize: 14, pointerEvents: "none",
          }}>{prefix}</span>
        )}
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type}
          style={{
            ...inputBaseStyle,
            paddingLeft: prefix ? 32 : 16,
          }}
          onFocus={e => {
            e.target.style.borderColor = "rgba(99,102,241,0.6)";
            e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)";
          }}
          onBlur={e => {
            e.target.style.borderColor = "rgba(255,255,255,0.08)";
            e.target.style.boxShadow = "none";
          }}
        />
      </div>
    </div>
  );
}

function OnbTextarea({ label, value, onChange, placeholder, rows=3 }:
  { label:string; value:string; onChange:(v:string)=>void; placeholder:string; rows?:number }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{
          ...inputBaseStyle,
          resize: "vertical" as const,
        }}
        onFocus={e => {
          e.target.style.borderColor = "rgba(99,102,241,0.6)";
          e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)";
        }}
        onBlur={e => {
          e.target.style.borderColor = "rgba(255,255,255,0.08)";
          e.target.style.boxShadow = "none";
        }}
      />
    </div>
  );
}

function getModelsForProvider(provider: string): string[] {
  switch(provider) {
    case "openai": return ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"];
    case "anthropic": return ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"];
    case "google": return ["gemini-2.0-flash", "gemini-2.0-pro"];
    case "groq": return ["llama-3.3-70b", "mixtral-8x7b"];
    case "openrouter": return ["auto", "mistralai/mistral-large"];
    default: return ["gpt-4o-mini"];
  }
}
