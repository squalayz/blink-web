"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ── Colors ──
const C = {
  bg: "#0a0a0f", surface: "#0d0d14", s2: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", purple: "#a855f7",
  match: "#30d158", hot: "#ff2d55", gold: "#ffd700",
  text: "#e8e8f0", muted: "#6b6b80", dim: "#2a2a3a",
  border: "rgba(255,255,255,0.07)",
};

// ── Agent Name Generator ──
const AGENT_NAMES: Record<string, string[]> = {
  tech: ["NEXUS", "CIPHER", "APEX", "VECTOR", "CORE"],
  finance: ["VAULT", "SIGMA", "DELTA", "PRIME", "APEX"],
  web3: ["CHAIN", "NODE", "MESH", "FORGE", "BLOCK"],
  creative: ["MUSE", "PRISM", "NOVA", "SPARK", "FLUX"],
  health: ["PULSE", "HELIX", "VITA", "APEX", "CORE"],
  education: ["SAGE", "MENTOR", "ATLAS", "NOVA", "ECHO"],
  ecommerce: ["TRADE", "NEXUS", "PRIME", "FLOW", "APEX"],
  other: ["ECHO", "AXIOM", "FORGE", "NOVA", "CORE"],
};

function suggestAgentName(industry: string, userName: string): string {
  const names = AGENT_NAMES[industry] || AGENT_NAMES.other;
  const idx = (userName || "A").toUpperCase().charCodeAt(0) % names.length;
  return names[idx];
}

// ── Providers ──
const PROVIDERS = [
  { id: "openai", label: "OpenAI", color: "#10a37f" },
  { id: "anthropic", label: "Anthropic", color: "#d97706" },
  { id: "google", label: "Google", color: "#4285f4" },
  { id: "groq", label: "Groq", color: "#f55036" },
  { id: "openrouter", label: "OpenRouter", color: "#6366f1" },
];

// ── Industry cards ──
const INDUSTRIES = [
  { id: "tech", label: "TECH", color: "#6366f1", icon: "chip" },
  { id: "finance", label: "FINANCE", color: "#f59e0b", icon: "chart" },
  { id: "web3", label: "WEB3", color: "#a855f7", icon: "chain" },
  { id: "creative", label: "CREATIVE", color: "#ec4899", icon: "palette" },
  { id: "health", label: "HEALTH", color: "#10b981", icon: "pulse" },
  { id: "ecommerce", label: "ECOM", color: "#06b6d4", icon: "cart" },
  { id: "education", label: "EDUCATION", color: "#3b82f6", icon: "book" },
  { id: "other", label: "OTHER", color: "#6b7280", icon: "star" },
];

// ── Goal cards ──
const GOALS = [
  { id: "partners", label: "Find partners & collaborators", icon: "link" },
  { id: "trading", label: "Trade crypto with AI help", icon: "trending" },
  { id: "agent", label: "Build my AI agent", icon: "bot" },
  { id: "all", label: "All of it", icon: "zap" },
];

// ── SVG Icons ──
function IconChip({ size = 24, color = C.muted }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></svg>;
}
function IconChart({ size = 24, color = C.muted }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 5-10" /></svg>;
}
function IconChain({ size = 24, color = C.muted }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>;
}
function IconPalette({ size = 24, color = C.muted }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="0.5" fill={color} /><circle cx="17.5" cy="10.5" r="0.5" fill={color} /><circle cx="8.5" cy="7.5" r="0.5" fill={color} /><circle cx="6.5" cy="12" r="0.5" fill={color} /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04-.23-.29-.38-.63-.38-1.01 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.5-4.5-9.95-10-9.95z" /></svg>;
}
function IconPulse({ size = 24, color = C.muted }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
}
function IconCart({ size = 24, color = C.muted }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" /></svg>;
}
function IconBook({ size = 24, color = C.muted }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>;
}
function IconStar({ size = 24, color = C.muted }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
}
function IconLink({ size = 24, color = C.muted }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 7h3a5 5 0 015 5 5 5 0 01-5 5h-3m-6 0H6a5 5 0 01-5-5 5 5 0 015-5h3" /><line x1="8" y1="12" x2="16" y2="12" /></svg>;
}
function IconTrending({ size = 24, color = C.muted }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
}
function IconBot({ size = 24, color = C.muted }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" /></svg>;
}
function IconZap({ size = 24, color = C.muted }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
}
function IconCheck({ size = 16, color = C.match }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
function IconEye({ size = 16, color = C.muted }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
}
function IconEyeOff({ size = 16, color = C.muted }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
}
function IconCopy({ size = 16, color = C.muted }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>;
}

function IndustryIcon({ icon, size = 24, color = C.muted }: { icon: string; size?: number; color?: string }) {
  switch (icon) {
    case "chip": return <IconChip size={size} color={color} />;
    case "chart": return <IconChart size={size} color={color} />;
    case "chain": return <IconChain size={size} color={color} />;
    case "palette": return <IconPalette size={size} color={color} />;
    case "pulse": return <IconPulse size={size} color={color} />;
    case "cart": return <IconCart size={size} color={color} />;
    case "book": return <IconBook size={size} color={color} />;
    case "star": return <IconStar size={size} color={color} />;
    default: return null;
  }
}

function GoalIcon({ icon, size = 24, color = C.muted }: { icon: string; size?: number; color?: string }) {
  switch (icon) {
    case "link": return <IconLink size={size} color={color} />;
    case "trending": return <IconTrending size={size} color={color} />;
    case "bot": return <IconBot size={size} color={color} />;
    case "zap": return <IconZap size={size} color={color} />;
    default: return null;
  }
}

// ── Keyframes ──
const KEYFRAMES = `
@keyframes onb-orb-pulse {
  0%, 100% { box-shadow: 0 0 40px rgba(99,102,241,0.5), 0 0 80px rgba(99,102,241,0.2); transform: scale(1); }
  50% { box-shadow: 0 0 60px rgba(99,102,241,0.7), 0 0 120px rgba(99,102,241,0.3), 0 0 160px rgba(6,182,212,0.15); transform: scale(1.06); }
}
@keyframes onb-orb-drift {
  0% { transform: translateY(0) scale(1); }
  100% { transform: translateY(-8px) scale(1.04); }
}
@keyframes onb-slide-in {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes onb-card-select {
  0% { transform: scale(1); }
  40% { transform: scale(0.95); }
  100% { transform: scale(1); }
}
@keyframes onb-glow-up {
  0% { opacity: 0.2; filter: brightness(0.4); }
  100% { opacity: 1; filter: brightness(1); }
}
@keyframes onb-dash {
  to { stroke-dashoffset: -20; }
}
@keyframes onb-fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

// ── State ──
interface OnboardingState {
  userName: string;
  industry: string;
  goal: string;
  agentName: string;
  aiProvider: string;
  aiApiKey: string;
  skippedBrain: boolean;
}

interface OnboardingProps {
  userId: string;
  walletAddress: string;
  onComplete: () => void;
}

// ── Progress Dots ──
function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{
      display: "flex", gap: 8, justifyContent: "center",
      padding: "20px 0 0",
    }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: i === current ? C.indigo : i < current ? `${C.indigo}66` : C.dim,
          transition: "all 0.3s",
          boxShadow: i === current ? `0 0 8px ${C.indigo}88` : "none",
        }} />
      ))}
    </div>
  );
}

// ── Plasma Orb ──
function PlasmaOrb({ size = 80, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "radial-gradient(circle at 35% 35%, #818cf8, #6366f1 40%, #06b6d4 80%)",
      boxShadow: `0 0 40px rgba(99,102,241,0.5), 0 0 80px rgba(99,102,241,0.2), 0 0 120px rgba(6,182,212,0.1)`,
      animation: glow
        ? "onb-orb-pulse 2s ease-in-out infinite, onb-orb-drift 6s ease-in-out infinite alternate, onb-glow-up 1s ease forwards"
        : "onb-orb-pulse 2s ease-in-out infinite, onb-orb-drift 6s ease-in-out infinite alternate",
    }} />
  );
}

// ── CTA Button ──
function CTAButton({ label, onClick, disabled, variant = "primary" }: {
  label: string; onClick: () => void; disabled?: boolean; variant?: "primary" | "skip";
}) {
  if (variant === "skip") {
    return (
      <button onClick={onClick} style={{
        width: "100%", padding: "14px 0", borderRadius: 14,
        background: "transparent", color: C.muted, fontSize: 14, fontWeight: 600,
        border: "none", cursor: "pointer", fontFamily: "inherit",
        letterSpacing: "-0.3px",
      }}>
        {label}
      </button>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "16px 0", borderRadius: 14,
      background: disabled ? C.dim : "linear-gradient(135deg, #6366f1, #a855f7)",
      color: disabled ? C.muted : "white", fontSize: 16, fontWeight: 800,
      border: "none", cursor: disabled ? "default" : "pointer", fontFamily: "inherit",
      boxShadow: disabled ? "none" : "0 4px 24px rgba(99,102,241,0.4)",
      letterSpacing: "-0.3px",
      transition: "all 0.3s",
      opacity: disabled ? 0.5 : 1,
    }}>
      {label}
    </button>
  );
}

// ═════════════════════════════════════════════
// Screen 0 — The Awakening
// ═════════════════════════════════════════════
function AwakeningScreen({ onNext }: { onNext: () => void }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "0 24px", textAlign: "center", gap: 32, minHeight: "80vh",
    }}>
      <PlasmaOrb size={80} />
      <div>
        <h1 style={{
          fontSize: 28, fontWeight: 900, margin: 0, marginBottom: 8,
          color: C.text, letterSpacing: "-0.5px",
        }}>
          Your agent is waiting.
        </h1>
        <p style={{ fontSize: 15, color: C.muted, margin: 0, marginBottom: 24, lineHeight: 1.5 }}>
          Let&apos;s build it in 60 seconds.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {["Name it", "Shape its personality", "Connect its brain"].map((t, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.muted,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", background: C.indigo,
              }} />
              {t}
            </div>
          ))}
        </div>
      </div>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <CTAButton label="Begin →" onClick={onNext} />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════
// Screen 1 — Name yourself
// ═════════════════════════════════════════════
function NameScreen({ state, setState, onNext }: {
  state: OnboardingState; setState: (s: OnboardingState) => void; onNext: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canContinue = state.userName.trim().length >= 2;

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && canContinue) onNext();
  }

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "0 24px", minHeight: "80vh",
    }}>
      <h1 style={{
        fontSize: 28, fontWeight: 900, color: C.text, margin: 0, marginBottom: 40,
        letterSpacing: "-0.5px", textAlign: "center",
      }}>
        First, who are you?
      </h1>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <input
          ref={inputRef}
          value={state.userName}
          onChange={e => setState({ ...state, userName: e.target.value })}
          onKeyDown={handleKey}
          placeholder="Your name"
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "16px 0", fontSize: 24, fontWeight: 700,
            textAlign: "center", color: C.text, fontFamily: "inherit",
            background: "transparent", border: "none",
            borderBottom: `2px solid ${C.dim}`,
            outline: "none",
            transition: "border-color 0.3s",
          }}
          onFocus={e => { e.target.style.borderBottomColor = C.indigo; }}
          onBlur={e => { e.target.style.borderBottomColor = C.dim; }}
        />
        <p style={{
          fontSize: 13, color: C.muted, textAlign: "center",
          margin: "12px 0 40px",
        }}>
          We&apos;ll use this to name your agent too
        </p>
        <div style={{
          opacity: canContinue ? 1 : 0,
          transform: canContinue ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.3s",
          pointerEvents: canContinue ? "auto" : "none",
        }}>
          <CTAButton label="Continue →" onClick={onNext} />
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════
// Screen 2 — Pick your world
// ═════════════════════════════════════════════
function IndustryScreen({ state, setState, onNext }: {
  state: OnboardingState; setState: (s: OnboardingState) => void; onNext: () => void;
}) {
  const [selected, setSelected] = useState(state.industry);
  const [animating, setAnimating] = useState<string | null>(null);

  function handleSelect(id: string) {
    setSelected(id);
    setAnimating(id);
    setState({ ...state, industry: id });
    setTimeout(() => setAnimating(null), 300);
    setTimeout(() => onNext(), 500);
  }

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", padding: "0 24px", minHeight: "80vh",
      justifyContent: "center",
    }}>
      <h1 style={{
        fontSize: 28, fontWeight: 900, color: C.text, margin: 0, marginBottom: 32,
        letterSpacing: "-0.5px", textAlign: "center",
      }}>
        What&apos;s your world?
      </h1>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 12, width: "100%", maxWidth: 360,
      }}>
        {INDUSTRIES.map(ind => {
          const isSel = selected === ind.id;
          const isAnim = animating === ind.id;
          return (
            <button key={ind.id} onClick={() => handleSelect(ind.id)} style={{
              height: 70, borderRadius: 14, display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 4, cursor: "pointer", fontFamily: "inherit",
              border: isSel ? `2px solid ${ind.color}` : `1px solid ${C.border}`,
              background: isSel ? `${ind.color}18` : "rgba(255,255,255,0.02)",
              color: isSel ? ind.color : C.muted,
              transition: "all 0.2s",
              animation: isAnim ? "onb-card-select 0.3s ease" : "none",
              position: "relative",
            }}>
              {isSel && (
                <div style={{
                  position: "absolute", top: 6, right: 6,
                }}>
                  <IconCheck size={14} color={ind.color} />
                </div>
              )}
              <IndustryIcon icon={ind.icon} size={22} color={isSel ? ind.color : C.muted} />
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em" }}>
                {ind.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════
// Screen 3 — What brings you here?
// ═════════════════════════════════════════════
function GoalScreen({ state, setState, onNext }: {
  state: OnboardingState; setState: (s: OnboardingState) => void; onNext: () => void;
}) {
  const [animating, setAnimating] = useState<string | null>(null);

  function handleSelect(id: string) {
    setAnimating(id);
    setState({ ...state, goal: id });
    setTimeout(() => onNext(), 400);
  }

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", padding: "0 24px", minHeight: "80vh",
      justifyContent: "center",
    }}>
      <h1 style={{
        fontSize: 28, fontWeight: 900, color: C.text, margin: 0, marginBottom: 32,
        letterSpacing: "-0.5px", textAlign: "center",
      }}>
        What are you here for?
      </h1>
      <div style={{
        display: "flex", flexDirection: "column",
        gap: 12, width: "100%", maxWidth: 360,
      }}>
        {GOALS.map(g => {
          const isSel = state.goal === g.id;
          const isAnim = animating === g.id;
          return (
            <button key={g.id} onClick={() => handleSelect(g.id)} style={{
              padding: "18px 20px", borderRadius: 14, display: "flex",
              alignItems: "center", gap: 14, cursor: "pointer", fontFamily: "inherit",
              border: isSel ? `2px solid ${C.indigo}` : `1px solid ${C.border}`,
              background: isSel ? `${C.indigo}18` : "rgba(255,255,255,0.02)",
              color: isSel ? C.text : C.muted,
              transition: "all 0.2s",
              animation: isAnim ? "onb-card-select 0.3s ease" : "none",
              textAlign: "left",
              fontSize: 15, fontWeight: 600,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: isSel ? `${C.indigo}22` : "rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <GoalIcon icon={g.icon} size={20} color={isSel ? C.indigo : C.muted} />
              </div>
              {g.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════
// Screen 4 — Meet your agent
// ═════════════════════════════════════════════
function AgentScreen({ state, setState, onNext }: {
  state: OnboardingState; setState: (s: OnboardingState) => void; onNext: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const suggested = suggestAgentName(state.industry, state.userName);

  useEffect(() => {
    if (!state.agentName) {
      setState({ ...state, agentName: suggested });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName = state.agentName || suggested;

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "0 24px", minHeight: "80vh", textAlign: "center",
    }}>
      <div style={{ marginBottom: 24 }}>
        <PlasmaOrb size={100} glow />
      </div>
      <p style={{
        fontSize: 15, color: C.muted, margin: "0 0 32px",
        animation: "onb-fade-in 0.6s ease 0.3s backwards",
      }}>
        {state.userName}&apos;s Agent is coming to life...
      </p>
      <input
        ref={inputRef}
        value={displayName}
        onChange={e => setState({ ...state, agentName: e.target.value.toUpperCase() })}
        style={{
          fontSize: 32, fontWeight: 900, textAlign: "center",
          color: C.text, fontFamily: "inherit",
          background: "transparent", border: "none",
          borderBottom: `2px solid ${C.dim}`,
          outline: "none", width: "100%", maxWidth: 300,
          letterSpacing: "0.1em",
          transition: "border-color 0.3s",
        }}
        onFocus={e => { e.target.style.borderBottomColor = C.indigo; }}
        onBlur={e => { e.target.style.borderBottomColor = C.dim; }}
      />
      <p style={{
        fontSize: 12, color: C.dim, margin: "12px 0 40px",
      }}>
        You can always change this later
      </p>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <CTAButton label={`This is ${displayName} →`} onClick={onNext} />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════
// Screen 5 — Power it up (API Key)
// ═════════════════════════════════════════════
function BrainScreen({ state, setState, onNext }: {
  state: OnboardingState; setState: (s: OnboardingState) => void; onNext: () => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const hasKey = state.aiApiKey.length > 5;

  function handleSkip() {
    setState({ ...state, skippedBrain: true });
    onNext();
  }

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", padding: "0 24px", minHeight: "80vh",
      justifyContent: "center",
    }}>
      {/* Orb at top with power line */}
      <div style={{ marginBottom: 8 }}>
        <PlasmaOrb size={48} />
      </div>
      <div style={{ position: "relative", width: 2, height: 60, marginBottom: 8 }}>
        <svg width="2" height="60" style={{ display: "block" }}>
          <line x1="1" y1="0" x2="1" y2="60"
            stroke={C.indigo} strokeWidth="2" strokeDasharray="6 4"
            style={{ animation: "onb-dash 1s linear infinite" }} />
        </svg>
      </div>

      <h1 style={{
        fontSize: 24, fontWeight: 900, color: C.text, margin: "0 0 24px",
        letterSpacing: "-0.5px", textAlign: "center",
      }}>
        Connect {state.agentName || "Agent"}&apos;s brain.
      </h1>

      <div style={{ width: "100%", maxWidth: 360 }}>
        {/* Provider pills */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 8,
          justifyContent: "center", marginBottom: 20,
        }}>
          {PROVIDERS.map(p => {
            const isSel = state.aiProvider === p.id;
            return (
              <button key={p.id} onClick={() => setState({ ...state, aiProvider: p.id })} style={{
                padding: "8px 14px", borderRadius: 50, fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                background: isSel ? `${p.color}18` : "transparent",
                border: `1px solid ${isSel ? p.color + "66" : C.border}`,
                color: isSel ? p.color : C.muted,
                transition: "all 0.2s",
              }}>
                {p.label}
              </button>
            );
          })}
        </div>

        {/* API Key input */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <input
            value={state.aiApiKey}
            onChange={e => setState({ ...state, aiApiKey: e.target.value })}
            placeholder="sk-..."
            type={showKey ? "text" : "password"}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "16px 48px 16px 16px", borderRadius: 14,
              border: `1px solid ${hasKey ? C.match + "55" : C.border}`,
              background: "rgba(255,255,255,0.03)",
              color: C.text, fontSize: 15, fontFamily: "inherit",
              outline: "none", transition: "border-color 0.3s",
            }}
            onFocus={e => { e.target.style.borderColor = `rgba(99,102,241,0.6)`; }}
            onBlur={e => { e.target.style.borderColor = hasKey ? `${C.match}55` : C.border; }}
          />
          <button onClick={() => setShowKey(!showKey)} style={{
            position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", padding: 4,
            display: "flex", alignItems: "center",
          }}>
            {showKey ? <IconEyeOff size={18} color={C.muted} /> : <IconEye size={18} color={C.muted} />}
          </button>
        </div>

        <p style={{
          fontSize: 11, color: C.dim, textAlign: "center",
          margin: "0 0 32px",
        }}>
          Your key is encrypted and never shared
        </p>

        <CTAButton
          label={hasKey ? "Power up →" : "Skip for now →"}
          onClick={hasKey ? onNext : handleSkip}
        />
        {hasKey && (
          <CTAButton label="Skip for now →" onClick={handleSkip} variant="skip" />
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════
// Screen 6 — Wallet reveal
// ═════════════════════════════════════════════
function WalletScreen({ state, walletAddress, onComplete }: {
  state: OnboardingState; walletAddress: string; onComplete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const truncAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "Generating...";

  const qrUrl = walletAddress
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=ethereum:${walletAddress}@8453&bgcolor=0a0a0f&color=6366f1&margin=10`
    : "";

  async function handleCopy() {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  const handleFinish = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      // Save profile
      await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "onboard",
          name: state.userName,
          industry: state.industry,
          goal: state.goal,
          agent_name: state.agentName,
        }),
      });

      await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          name: state.userName,
          industry: state.industry,
          goal: state.goal,
          agent_name: state.agentName,
          onboarded: true,
        }),
      });

      // Save AI key if provided
      if (state.aiApiKey && !state.skippedBrain) {
        await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save",
            provider: state.aiProvider,
            apiKey: state.aiApiKey,
          }),
        });
      }

      onComplete();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      setError(msg);
    }
    setSaving(false);
  }, [state, onComplete]);

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "0 24px", minHeight: "80vh", textAlign: "center",
    }}>
      {/* Base chain logo */}
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: "linear-gradient(135deg, #0052ff, #0066ff)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20, boxShadow: "0 0 30px rgba(0,82,255,0.3)",
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
        </svg>
      </div>

      <h1 style={{
        fontSize: 24, fontWeight: 900, color: C.text, margin: 0, marginBottom: 8,
        letterSpacing: "-0.5px",
      }}>
        Your wallet is live on Base.
      </h1>

      {/* Wallet address + copy */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        justifyContent: "center", marginBottom: 20,
      }}>
        <span style={{
          fontFamily: "'SF Mono','Fira Code',monospace",
          fontSize: 16, color: C.text, fontWeight: 600,
        }}>
          {truncAddr}
        </span>
        <button onClick={handleCopy} style={{
          background: copied ? `${C.match}18` : "rgba(255,255,255,0.05)",
          border: `1px solid ${copied ? `${C.match}55` : C.border}`,
          borderRadius: 8, padding: "6px 8px", cursor: "pointer",
          display: "flex", alignItems: "center",
          transition: "all 0.2s",
        }}>
          {copied
            ? <IconCheck size={14} color={C.match} />
            : <IconCopy size={14} color={C.muted} />
          }
        </button>
      </div>

      {/* QR code */}
      {qrUrl && (
        <div style={{
          background: C.surface, borderRadius: 16, padding: 16,
          border: `1px solid ${C.border}`, marginBottom: 20,
          display: "inline-block",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="Wallet QR" width={140} height={140}
            style={{ borderRadius: 8, display: "block" }} />
        </div>
      )}

      <p style={{ fontSize: 13, color: C.muted, margin: "0 0 16px" }}>
        Fund it later in your wallet tab
      </p>

      {/* Stats row */}
      <div style={{
        display: "flex", gap: 16, justifyContent: "center",
        flexWrap: "wrap", marginBottom: 32,
      }}>
        {["0.0000 ETH", "Base L2", "Non-custodial"].map((s, i) => (
          <span key={i} style={{
            fontSize: 12, color: C.dim, fontWeight: 600,
            fontFamily: "'SF Mono','Fira Code',monospace",
          }}>
            {s}
            {i < 2 && <span style={{ margin: "0 0 0 16px", color: C.dim }}>·</span>}
          </span>
        ))}
      </div>

      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: 10, marginBottom: 16,
          background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.2)",
          color: C.hot, fontSize: 13, width: "100%", maxWidth: 360,
        }}>{error}</div>
      )}

      <div style={{ width: "100%", maxWidth: 360 }}>
        <CTAButton
          label={saving ? "Launching..." : "Go to my dashboard →"}
          onClick={handleFinish}
          disabled={saving}
        />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════
// Main Wizard
// ═════════════════════════════════════════════
export default function OnboardingWizard({ userId, walletAddress, onComplete }: OnboardingProps) {
  const [screen, setScreen] = useState(0);
  const [state, setState] = useState<OnboardingState>({
    userName: "",
    industry: "",
    goal: "",
    agentName: "",
    aiProvider: "openai",
    aiApiKey: "",
    skippedBrain: false,
  });

  const screens = [
    <AwakeningScreen key="s0" onNext={() => setScreen(1)} />,
    <NameScreen key="s1" state={state} setState={setState} onNext={() => setScreen(2)} />,
    <IndustryScreen key="s2" state={state} setState={setState} onNext={() => setScreen(3)} />,
    <GoalScreen key="s3" state={state} setState={setState} onNext={() => setScreen(4)} />,
    <AgentScreen key="s4" state={state} setState={setState} onNext={() => setScreen(5)} />,
    <BrainScreen key="s5" state={state} setState={setState} onNext={() => setScreen(6)} />,
    <WalletScreen key="s6" state={state} walletAddress={walletAddress} onComplete={onComplete} />,
  ];

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      fontFamily: "'Outfit',sans-serif", color: C.text,
      display: "flex", flexDirection: "column",
    }}>
      <style>{KEYFRAMES}</style>
      <ProgressDots total={7} current={screen} />
      <div key={screen} style={{
        flex: 1, display: "flex", flexDirection: "column",
        maxWidth: 440, width: "100%", margin: "0 auto",
        animation: "onb-slide-in 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {screens[screen]}
      </div>
    </div>
  );
}
