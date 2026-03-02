"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Lock, Search, Sparkles, Send, Play, Pause, ArrowLeft, ArrowRight,
  Lightbulb, Cpu, Check, CheckCircle, Timer, MessageCircle, Share2,
  Award, Star, DollarSign, Copy, Handshake, Users, Zap, BarChart3,
  Camera, Heart, X, Bot, User as UserIcon, Activity, MapPin, Briefcase,
  Crown, Eye, Shield, Flame
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { C, MMLogo, Avatar, Btn, MeshGraph } from "./shared";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ═══════════════════════════════════════════════════════════════
   INJECTED KEYFRAME ANIMATIONS
   ═══════════════════════════════════════════════════════════════ */

function SocialStyles() {
  return (
    <style>{`
      @keyframes mm-slide-up {
        from { transform: translateY(40px) scale(0.95); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }
      @keyframes mm-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes mm-scale-in {
        from { transform: scale(0); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      @keyframes mm-slide-from-left {
        from { transform: translateX(-80px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes mm-slide-from-right {
        from { transform: translateX(80px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes mm-count-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }
      @keyframes mm-confetti {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
      }
      @keyframes mm-sparkle {
        0%, 100% { opacity: 0; transform: scale(0); }
        50% { opacity: 1; transform: scale(1); }
      }
      @keyframes mm-glow-pulse {
        0%, 100% { box-shadow: 0 0 8px rgba(99,102,241,0.2); }
        50% { box-shadow: 0 0 20px rgba(99,102,241,0.5), 0 0 40px rgba(6,182,212,0.2); }
      }
      @keyframes mm-typing-dot {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-6px); }
      }
      @keyframes mm-heart-glow {
        0%, 100% { filter: drop-shadow(0 0 6px rgba(255,45,85,0.4)); transform: scale(1); }
        50% { filter: drop-shadow(0 0 16px rgba(255,45,85,0.8)); transform: scale(1.12); }
      }
      @keyframes mm-toast-in {
        from { transform: translate(-50%, 20px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
      @keyframes mm-toast-out {
        from { transform: translate(-50%, 0); opacity: 1; }
        to { transform: translate(-50%, -20px); opacity: 0; }
      }
      @keyframes mm-tip-glow {
        0%, 100% { box-shadow: 0 0 8px currentColor; }
        50% { box-shadow: 0 0 20px currentColor, 0 0 40px currentColor; }
      }
    `}</style>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════════════ */

function Toast({ text, visible }: { text: string; visible: boolean }) {
  if (!text) return null;
  return (
    <div style={{
      position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "12px 24px", fontSize: 13, color: C.text, zIndex: 250,
      animation: visible ? "mm-toast-in 0.3s ease forwards" : "mm-toast-out 0.3s ease forwards",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      pointerEvents: "none", whiteSpace: "nowrap", maxWidth: "90vw",
    }}>
      {text}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SWIPE DISCOVERY
   ═══════════════════════════════════════════════════════════════ */

function SwipeDiscovery({ profiles, onLike, onPass, showToast }: {
  profiles: any[];
  onLike: (p: any) => void;
  onPass: (p: any) => void;
  showToast: (t: string) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);
  const [entering, setEntering] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const current = profiles[idx];

  const getScore = (p: any) => {
    const hash = (p.user_id || p.id || "x").split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
    return 65 + (hash % 30);
  };

  function handleStart(x: number, y: number) {
    startRef.current = { x, y };
    setDragging(true);
  }
  function handleMove(x: number, y: number) {
    if (!startRef.current) return;
    setDrag({ x: x - startRef.current.x, y: (y - startRef.current.y) * 0.3 });
  }
  function handleEnd() {
    if (!startRef.current) return;
    startRef.current = null;
    setDragging(false);
    if (drag.x > 80) triggerSwipe("right");
    else if (drag.x < -80) triggerSwipe("left");
    else setDrag({ x: 0, y: 0 });
  }

  function triggerSwipe(dir: "left" | "right") {
    setExiting(dir);
    setDrag({ x: 0, y: 0 });
    setTimeout(() => {
      if (dir === "right") onLike(current);
      else onPass(current);
      setExiting(null);
      setEntering(true);
      setIdx(i => i + 1);
      setTimeout(() => setEntering(false), 400);
    }, 350);
  }

  if (!current) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: C.dim, marginBottom: 20 }}>
        <Search size={28} style={{ marginBottom: 8 }} />
        <div style={{ fontSize: 14, fontWeight: 600 }}>No more profiles to discover</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Check back later for new people</div>
      </div>
    );
  }

  const isPopular = (current.match_count || 0) > 5;
  const pendingCount = Math.max(3, (current.match_count || 0) - 2);
  const score = getScore(current);
  const rotation = dragging ? drag.x * 0.08 : 0;
  const likeOpacity = Math.min(1, Math.max(0, drag.x / 80));
  const passOpacity = Math.min(1, Math.max(0, -drag.x / 80));

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
        <Heart size={16} color={C.hot} /> Discover People
      </div>

      <div style={{ position: "relative", height: isPopular ? 480 : 400, overflow: "hidden" }}>
        {/* Card */}
        <div
          onTouchStart={e => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={e => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); }}
          onTouchEnd={handleEnd}
          onMouseDown={e => handleStart(e.clientX, e.clientY)}
          onMouseMove={e => { if (dragging) handleMove(e.clientX, e.clientY); }}
          onMouseUp={handleEnd}
          onMouseLeave={() => { if (dragging) handleEnd(); }}
          style={{
            position: "absolute", inset: 0,
            background: C.surface, borderRadius: 20,
            border: `1px solid ${C.border}`, overflow: "hidden",
            cursor: dragging ? "grabbing" : "grab", userSelect: "none",
            transform: exiting === "right"
              ? "translateX(120%) rotate(15deg)"
              : exiting === "left"
              ? "translateX(-120%) rotate(-15deg)"
              : `translateX(${drag.x}px) translateY(${drag.y}px) rotate(${rotation}deg)`,
            transition: dragging ? "none" : "all 0.4s cubic-bezier(0.2,0.8,0.2,1)",
            opacity: exiting ? 0 : 1,
            animation: entering ? "mm-slide-up 0.4s ease" : undefined,
          }}
        >
          {/* Like overlay */}
          {likeOpacity > 0.05 && (
            <div style={{
              position: "absolute", top: 24, left: 24, zIndex: 10,
              padding: "8px 18px", borderRadius: 10, border: `3px solid ${C.match}`,
              color: C.match, fontSize: 22, fontWeight: 900, transform: "rotate(-12deg)",
              opacity: likeOpacity, background: `${C.match}10`,
            }}>CONNECT</div>
          )}
          {/* Pass overlay */}
          {passOpacity > 0.05 && (
            <div style={{
              position: "absolute", top: 24, right: 24, zIndex: 10,
              padding: "8px 18px", borderRadius: 10, border: `3px solid ${C.hot}`,
              color: C.hot, fontSize: 22, fontWeight: 900, transform: "rotate(12deg)",
              opacity: passOpacity, background: `${C.hot}10`,
            }}>PASS</div>
          )}

          <div style={{ padding: 22, display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Avatar + Score */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <Avatar name={current.agent_name || current.user?.name || "?"} size={68} url={current.agent_avatar_url} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 19, fontWeight: 700 }}>{current.user?.name || current.agent_name || "Anonymous"}</div>
                  {isPopular && (
                    <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: `${C.warn}20`, color: C.warn, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <Zap size={10} /> Popular
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {current.user?.industry && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><Briefcase size={11} />{current.user.industry}</span>}
                  {current.user?.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><MapPin size={11} />{current.user.location}</span>}
                </div>
              </div>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 26, fontWeight: 800, background: `linear-gradient(135deg,${C.cold},${C.cyan})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{score}%</div>
                <div style={{ fontSize: 10, color: C.muted }}>Match</div>
              </div>
            </div>

            {/* Bio */}
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 14, flex: 1 }}>
              {current.summary || "Exploring new connections on MishMesh..."}
            </p>

            {/* Tags */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {(current.capabilities || []).slice(0, 5).map((c: string) => (
                <span key={c} style={{ fontSize: 11, padding: "4px 10px", background: `${C.cold}12`, borderRadius: 8, color: C.cold, border: `1px solid ${C.cold}22` }}>{c}</span>
              ))}
            </div>

            {/* Priority Connect card for popular users */}
            {isPopular && (
              <div style={{
                background: `linear-gradient(135deg, ${C.cold}10, ${C.cyan}08)`,
                borderRadius: 14, padding: 14, marginBottom: 14,
                border: `1px solid ${C.cold}33`,
                animation: "mm-glow-pulse 3s infinite",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Skip the Line</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ display: "flex" }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 18, height: 18, borderRadius: "50%", background: [C.cold, C.cyan, C.purple][i], border: `2px solid ${C.surface}`, marginLeft: i ? -6 : 0 }} />
                    ))}
                  </div>
                  {pendingCount} people waiting to connect
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.cyan }}>0.005 ETH</span>
                  <button onClick={(e) => { e.stopPropagation(); showToast("Coming soon! Priority Connect launches with payments."); }}
                    style={{
                      padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
                      background: `linear-gradient(135deg, ${C.cold}, ${C.cyan})`, color: "white", fontSize: 12, fontWeight: 700,
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}>
                    <Zap size={12} />Connect Now
                  </button>
                </div>
                <div style={{ fontSize: 9, color: C.dim, marginTop: 6 }}>They earn 80% · MishMesh earns 20%</div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", justifyContent: "center", gap: 24, paddingTop: 4 }}>
              <button onClick={() => triggerSwipe("left")} style={{
                width: 56, height: 56, borderRadius: "50%", border: `2px solid ${C.hot}33`,
                background: `${C.hot}10`, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.2s",
              }}><X size={24} color={C.hot} /></button>
              <button onClick={() => triggerSwipe("right")} style={{
                width: 56, height: 56, borderRadius: "50%", border: `2px solid ${C.match}33`,
                background: `${C.match}10`, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.2s",
              }}><CheckCircle size={24} color={C.match} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MUTUAL MATCH CELEBRATION OVERLAY
   ═══════════════════════════════════════════════════════════════ */

function MutualMatchOverlay({ userProfile, otherProfile, score, onChat, onKeepMeshing }: {
  userProfile: any;
  otherProfile: any;
  score: number;
  onChat: () => void;
  onKeepMeshing: () => void;
}) {
  const [countUp, setCountUp] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setTimeout(() => setShowContent(true), 300);
    const target = Math.round(score * 100);
    let current = 0;
    const interval = setInterval(() => {
      current += 2;
      if (current >= target) { current = target; clearInterval(interval); }
      setCountUp(current);
    }, 25);
    return () => clearInterval(interval);
  }, [score]);

  const confetti = Array.from({ length: 30 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2.5 + Math.random() * 2,
    color: [C.cold, C.cyan, C.purple, C.pink, C.gold, C.match][i % 6],
    size: 4 + Math.random() * 6,
  }));

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.95)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "mm-fade-in 0.3s ease",
    }}>
      {confetti.map((c, i) => (
        <div key={i} style={{
          position: "absolute", top: -10, left: `${c.left}%`,
          width: c.size, height: c.size, borderRadius: c.size > 7 ? 2 : "50%",
          background: c.color,
          animation: `mm-confetti ${c.duration}s ${c.delay}s ease-out infinite`,
        }} />
      ))}

      {showContent && (
        <div style={{ textAlign: "center", padding: 20, maxWidth: 360, animation: "mm-scale-in 0.4s ease" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, marginBottom: 28 }}>
            <div style={{ animation: "mm-slide-from-left 0.6s ease" }}>
              <Avatar name={userProfile?.name || "You"} size={80} url={userProfile?.avatar_url} />
            </div>
            <div style={{ animation: "mm-heart-glow 2s infinite" }}>
              <Heart size={36} color={C.hot} fill={C.hot} />
            </div>
            <div style={{ animation: "mm-slide-from-right 0.6s ease" }}>
              <Avatar name={otherProfile?.name || "?"} size={80} url={otherProfile?.avatar_url} />
            </div>
          </div>

          <div style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 8 }}>It&apos;s a Match!</div>
          <div style={{
            fontSize: 52, fontWeight: 900, marginBottom: 4,
            background: `linear-gradient(135deg,${C.cold},${C.cyan})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: "mm-count-pulse 0.6s ease",
          }}>
            {countUp}%
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 28 }}>compatibility</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={onChat} style={{
              padding: "14px 28px", borderRadius: 12, border: "none", cursor: "pointer",
              background: `linear-gradient(135deg, ${C.cold}, ${C.cyan})`,
              color: "white", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <MessageCircle size={18} /> Start Conversation
            </button>
            <button onClick={onKeepMeshing} style={{
              padding: "12px 28px", borderRadius: 12, cursor: "pointer",
              background: "transparent", border: `1px solid ${C.border}`,
              color: C.muted, fontSize: 14, fontWeight: 600, fontFamily: "inherit",
            }}>
              Keep Meshing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOCKED PHOTO SEND MODAL
   ═══════════════════════════════════════════════════════════════ */

function LockedPhotoModal({ onClose, onSend }: { onClose: () => void; onSend: (price: string) => void }) {
  const [price, setPrice] = useState("0.003");
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.9)", zIndex: 150,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: C.surface, borderRadius: 20, maxWidth: 360, width: "100%",
        border: `1px solid ${C.border}`, overflow: "hidden",
        animation: "mm-scale-in 0.3s ease",
      }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <Camera size={18} color={C.cold} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>Share a Locked Photo</span>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 16, margin: "0 auto",
            background: `linear-gradient(135deg, ${C.cold}30, ${C.cyan}20)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Lock size={32} color={C.cold} />
          </div>
          <p style={{ fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 1.6, margin: 0 }}>
            Your photo will be blurred until they pay to unlock it. You earn 100% of the unlock fee.
          </p>
          <div>
            <label style={{ fontSize: 11, color: C.muted, marginBottom: 6, display: "block" }}>Unlock Price (ETH)</label>
            <input value={price} onChange={e => setPrice(e.target.value)} type="text"
              style={{
                width: "100%", background: C.s2, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: "12px 14px", color: C.cyan, fontSize: 16,
                fontFamily: "monospace", fontWeight: 700, boxSizing: "border-box",
              }}
            />
          </div>
          <button onClick={() => onSend(price)} style={{
            padding: "14px 24px", borderRadius: 12, border: "none", cursor: "pointer",
            background: `linear-gradient(135deg, ${C.cold}, ${C.cyan})`,
            color: "white", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <Camera size={16} /> Share Locked Photo
          </button>
          <div style={{ fontSize: 10, color: C.dim, textAlign: "center" }}>Paid on Base L2 · Instant settlement</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOCKED PHOTO CARD (in chat)
   ═══════════════════════════════════════════════════════════════ */

function LockedPhotoCard({ price, onUnlock }: { price: number; onUnlock: () => void }) {
  return (
    <div style={{
      width: 220, borderRadius: 16, overflow: "hidden",
      border: "2px solid transparent",
      backgroundImage: `linear-gradient(${C.surface}, ${C.surface}), linear-gradient(135deg, ${C.cold}, ${C.cyan})`,
      backgroundOrigin: "border-box",
      backgroundClip: "padding-box, border-box",
      position: "relative",
    }}>
      {/* Frosted glass area */}
      <div style={{
        height: 160, position: "relative",
        background: `linear-gradient(135deg, ${C.cold}20, ${C.cyan}15, ${C.purple}10)`,
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        {/* Sparkle dots */}
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{
            position: "absolute",
            top: `${20 + Math.sin(i * 1.5) * 30}%`,
            left: `${15 + Math.cos(i * 2) * 35 + 35}%`,
            width: 3, height: 3, borderRadius: "50%",
            background: i % 2 === 0 ? C.cold : C.cyan,
            animation: `mm-sparkle ${1.5 + i * 0.3}s ${i * 0.4}s infinite`,
          }} />
        ))}
        <Lock size={28} color="white" style={{ marginBottom: 6 }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: "white" }}>Locked Photo</div>
      </div>
      {/* Info */}
      <div style={{ padding: 14, textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.cyan, marginBottom: 8 }}>{price} ETH</div>
        <button onClick={onUnlock} style={{
          width: "100%", padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer",
          background: `linear-gradient(135deg, ${C.cold}, ${C.cyan})`,
          color: "white", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
        }}>
          Tap to Unlock
        </button>
        <div style={{ fontSize: 9, color: C.dim, marginTop: 6 }}>Paid on Base L2</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TIP MENU
   ═══════════════════════════════════════════════════════════════ */

function TipMenu({ onSelect, onClose }: { onSelect: (type: string, amount: number) => void; onClose: () => void }) {
  const tips = [
    { type: "power_react", label: "Power React", amount: 0.001, color: C.warn, emoji: "⚡" },
    { type: "tip", label: "Tip", amount: 0.002, color: C.cold, emoji: "💜" },
    { type: "super_tip", label: "Super Tip", amount: 0.01, color: C.gold, emoji: "🌟" },
  ];
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 139 }} />
      <div style={{
        position: "absolute", bottom: "100%", right: 0, marginBottom: 8,
        background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
        padding: 6, minWidth: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        animation: "mm-slide-up 0.2s ease", zIndex: 140,
      }}>
        <div style={{ padding: "6px 12px", fontSize: 10, color: C.dim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Send a Tip</div>
        {tips.map(t => (
          <button key={t.type} onClick={() => onSelect(t.type, t.amount)} style={{
            width: "100%", padding: "10px 12px", borderRadius: 10,
            background: "transparent", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            color: C.text, fontFamily: "inherit", fontSize: 13, transition: "background 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = C.s2)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ fontWeight: 600 }}>{t.emoji} {t.label}</span>
            <span style={{ fontSize: 12, color: t.color, fontWeight: 700 }}>{t.amount} ETH</span>
          </button>
        ))}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ACTIVITY FEED
   ═══════════════════════════════════════════════════════════════ */

function ActivityFeed() {
  const activities = [
    { icon: <Users size={14} color={C.cold} />, text: "Sarah and Marcus just fused their agents", time: "2m ago", bg: `${C.cold}12` },
    { icon: <Shield size={14} color={C.purple} />, text: "New syndicate formed: DeFi Degens", time: "8m ago", bg: `${C.purple}12` },
    { icon: <Award size={14} color={C.gold} />, text: "Alex hit A-grade performance", time: "15m ago", bg: `${C.gold}12` },
    { icon: <Sparkles size={14} color={C.cyan} />, text: "12 new matches in the last hour", time: "22m ago", bg: `${C.cyan}12` },
    { icon: <Camera size={14} color={C.pink} />, text: "Jessica earned 0.05 ETH from photo unlocks today", time: "34m ago", bg: `${C.pink}12` },
    { icon: <Zap size={14} color={C.warn} />, text: "Priority Connect volume up 40% this week", time: "1h ago", bg: `${C.warn}12` },
    { icon: <Heart size={14} color={C.hot} />, text: "3 mutual matches happened in the last 5 minutes", time: "1h ago", bg: `${C.hot}12` },
  ];
  return (
    <div style={{ marginTop: 28 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <Activity size={16} color={C.cyan} /> Mesh Activity
      </h3>
      <div style={{
        display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8,
        WebkitOverflowScrolling: "touch", scrollbarWidth: "none",
      }}>
        {activities.map((a, i) => (
          <div key={i} style={{
            flexShrink: 0, width: 220, background: C.surface,
            borderRadius: 12, padding: 14, border: `1px solid ${C.border}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {a.icon}
              </div>
              <span style={{ fontSize: 10, color: C.dim }}>{a.time}</span>
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{a.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MATCH REPLAY (existing)
   ═══════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════
   VIRAL SHARE CARD (existing)
   ═══════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════
   DEAL REPORT MODAL (existing)
   ═══════════════════════════════════════════════════════════════ */

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

  /* ── Social Features State ── */
  const[mutualMatchData,setMutualMatchData]=useState<any>(null);
  const[chatMode,setChatMode]=useState<"ai"|"you">("ai");
  const[aiMessages,setAiMessages]=useState<any[]>([]);
  const[aiTyping,setAiTyping]=useState(false);
  const[showPhotoModal,setShowPhotoModal]=useState(false);
  const[showTipMenu,setShowTipMenu]=useState(false);
  const[toast,setToast]=useState({text:"",visible:false});
  const toastTimer=useRef<any>(null);

  /* ── Toast helper ── */
  const showToast=useCallback((text:string)=>{
    if(toastTimer.current)clearTimeout(toastTimer.current);
    setToast({text,visible:true});
    toastTimer.current=setTimeout(()=>setToast(t=>({...t,visible:false})),2500);
    // Clear text after fade-out
    setTimeout(()=>setToast({text:"",visible:false}),2900);
  },[]);

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

  /* ── AI Wingman Messages ── */
  useEffect(()=>{
    if(!chatMatch||chatMode!=="ai"){
      setAiMessages([]);
      setAiTyping(false);
      return;
    }
    const other=getOther(chatMatch);
    const msgs=[
      {role:"agent_a",name:"Your Agent",content:"Hey! I noticed our humans share complementary skills. Your human is building something interesting in this space."},
      {role:"agent_b",name:`${other?.name||"Their"}'s Agent`,content:"Agreed! My human has been looking for exactly this kind of collaboration. The synergy score is impressive."},
      {role:"agent_a",name:"Your Agent",content:"Perfect. I'll recommend a warm introduction. They can jump in and take it from here whenever ready."},
    ];
    setAiMessages([]);
    setAiTyping(true);
    const timeouts:any[]=[];
    msgs.forEach((msg,i)=>{
      timeouts.push(setTimeout(()=>{
        setAiTyping(false);
        setAiMessages(prev=>[...prev,msg]);
        if(i<msgs.length-1) setTimeout(()=>setAiTyping(true),300);
      },1500+i*2500));
    });
    return()=>timeouts.forEach(clearTimeout);
  },[chatMatch?.id,chatMode]);

  /* ── Match Actions ── */
  async function acceptMatch(id:string){
    await fetch("/api/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"accept",match_id:id})});
    if(user)loadMatches(user.id);
  }
  async function passMatch(id:string){
    await fetch("/api/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"pass",match_id:id})});
    if(user)loadMatches(user.id);
  }

  /* ── Swipe Actions ── */
  function handleSwipeLike(profile:any){
    // Simulate mutual match ~30% of the time
    if(Math.random()<0.3){
      setMutualMatchData({
        other:{name:profile.user?.name||profile.agent_name,avatar_url:profile.agent_avatar_url},
        score:(65+Math.random()*30)/100,
      });
    }else{
      showToast("Connection request sent!");
    }
  }
  function handleSwipePass(_profile:any){
    // Just move to next card, no action needed
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
  if(replayData)return(<><SocialStyles/><Toast text={toast.text} visible={toast.visible}/><MatchReplay transcript={replayData.transcript} highlights={replayData.highlights} onClose={()=>setReplayData(null)}/></>);
  if(shareMatch)return(<><SocialStyles/><Toast text={toast.text} visible={toast.visible}/><ShareCard match={shareMatch} onClose={()=>setShareMatch(null)}/></>);
  if(dealMatch)return(<><SocialStyles/><Toast text={toast.text} visible={toast.visible}/><DealModal match={dealMatch} userId={user?.id} onClose={()=>setDealMatch(null)} onSubmit={submitDeal}/></>);

  /* ══════════════════════════════════════════
     MUTUAL MATCH OVERLAY
     ══════════════════════════════════════════ */
  if(mutualMatchData)return(
    <><SocialStyles/><MutualMatchOverlay
      userProfile={user}
      otherProfile={mutualMatchData.other}
      score={mutualMatchData.score}
      onChat={()=>{setMutualMatchData(null);showToast("Chat opened! Say hello.");}}
      onKeepMeshing={()=>setMutualMatchData(null)}
    /></>
  );

  /* ══════════════════════════════════════════
     CHAT VIEW (upgraded with AI Wingman)
     ══════════════════════════════════════════ */
  if(chatMatch){
    const other=getOther(chatMatch);
    return(
      <div style={{height:"100vh",display:"flex",flexDirection:"column",background:C.bg}}>
        <SocialStyles/>
        <Toast text={toast.text} visible={toast.visible}/>

        {/* Photo Modal */}
        {showPhotoModal&&<LockedPhotoModal onClose={()=>setShowPhotoModal(false)} onSend={(price)=>{
          setShowPhotoModal(false);
          showToast("Coming soon! Locked photos will be available when payments go live.");
        }}/>}

        {/* Header */}
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>{setChatMatch(null);setChatMode("ai");}} style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}><ArrowLeft size={20}/></button>
          <Avatar name={other?.name||"?"} size={36} url={other?.avatar_url}/>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:14}}>{other?.name}</div>
            <div style={{fontSize:11,color:C.muted}}>{chatMatch.synergy}</div>
          </div>
          <button onClick={()=>openReplay(chatMatch.id)} title="Watch agent replay" style={{background:"none",border:"none",color:C.cold,cursor:"pointer"}}><Play size={16}/></button>
          <button onClick={()=>setShareMatch(chatMatch)} title="Share match" style={{background:"none",border:"none",color:C.cyan,cursor:"pointer"}}><Share2 size={16}/></button>
          <button onClick={()=>setDealMatch(chatMatch)} title="Report deal" style={{background:"none",border:"none",color:C.match,cursor:"pointer"}}><Handshake size={16}/></button>
        </div>

        {/* Mode Toggle */}
        <div style={{padding:"8px 20px",display:"flex",gap:8,borderBottom:`1px solid ${C.border}`}}>
          <button onClick={()=>setChatMode("ai")} style={{
            flex:1,padding:"8px 12px",borderRadius:10,border:"none",cursor:"pointer",
            background:chatMode==="ai"?`${C.cold}20`:"transparent",
            color:chatMode==="ai"?C.cold:C.muted,
            fontFamily:"inherit",fontSize:12,fontWeight:600,
            display:"flex",alignItems:"center",justifyContent:"center",gap:6,
            boxShadow:chatMode==="ai"?`0 0 12px ${C.cold}30`:"none",
            transition:"all 0.2s",
          }}>
            <Bot size={14}/> AI Mode
          </button>
          <button onClick={()=>setChatMode("you")} style={{
            flex:1,padding:"8px 12px",borderRadius:10,border:"none",cursor:"pointer",
            background:chatMode==="you"?`${C.cyan}20`:"transparent",
            color:chatMode==="you"?C.cyan:C.muted,
            fontFamily:"inherit",fontSize:12,fontWeight:600,
            display:"flex",alignItems:"center",justifyContent:"center",gap:6,
            boxShadow:chatMode==="you"?`0 0 12px ${C.cyan}30`:"none",
            transition:"all 0.2s",
          }}>
            <UserIcon size={14}/> You
          </button>
        </div>

        {/* Messages Area */}
        <div style={{flex:1,overflow:"auto",padding:20,display:"flex",flexDirection:"column",gap:8}}>
          {/* Collab suggestion banner */}
          {chatMatch.collab_idea&&(
            <div style={{background:`${C.cold}08`,borderRadius:12,padding:14,marginBottom:8,border:`1px solid ${C.cold}22`}}>
              <div style={{fontSize:10,color:C.cold,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4,display:"flex",alignItems:"center",gap:4}}><Lightbulb size={10}/>Your agents proposed</div>
              <div style={{fontSize:13,color:C.text,lineHeight:1.5}}>{chatMatch.collab_idea}</div>
            </div>
          )}

          {/* AI Agent Messages (shown in AI mode) */}
          {chatMode==="ai"&&aiMessages.map((msg,i)=>{
            const isA=msg.role==="agent_a";
            return(
              <div key={`ai-${i}`} style={{display:"flex",justifyContent:isA?"flex-start":"flex-end",animation:"mm-fade-in 0.3s ease"}}>
                <div style={{
                  maxWidth:"75%",padding:"10px 14px",borderRadius:14,
                  background:isA?`linear-gradient(135deg, ${C.purple}25, ${C.cold}15)`:`linear-gradient(135deg, ${C.cyan}25, ${C.cold}15)`,
                  color:C.text,fontSize:14,lineHeight:1.5,
                  borderBottomLeftRadius:isA?4:14,borderBottomRightRadius:isA?14:4,
                  border:`1px solid ${isA?C.purple:C.cyan}20`,
                }}>
                  <div style={{fontSize:10,fontWeight:700,color:isA?C.purple:C.cyan,marginBottom:4,display:"flex",alignItems:"center",gap:4}}>
                    <Bot size={10}/>{msg.name}
                  </div>
                  {msg.content}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {chatMode==="ai"&&aiTyping&&(
            <div style={{display:"flex",justifyContent:"flex-start",animation:"mm-fade-in 0.3s ease"}}>
              <div style={{
                padding:"12px 18px",borderRadius:14,borderBottomLeftRadius:4,
                background:`linear-gradient(135deg, ${C.purple}25, ${C.cold}15)`,
                border:`1px solid ${C.purple}20`,display:"flex",gap:5,alignItems:"center",
              }}>
                <Bot size={10} color={C.purple} style={{marginRight:4}}/>
                {[0,1,2].map(i=>(
                  <div key={i} style={{
                    width:6,height:6,borderRadius:"50%",background:C.purple,
                    animation:`mm-typing-dot 1.4s ${i*0.2}s infinite`,
                  }}/>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {chatMode==="you"&&messages.length===0&&<div style={{textAlign:"center",color:C.dim,marginTop:40,padding:20}}><MessageCircle size={32} style={{marginBottom:8}}/><div style={{fontSize:14,fontWeight:600}}>You&apos;re connected!</div><div style={{fontSize:12,marginTop:4}}>Your agents agreed you should meet. Say hello.</div></div>}

          {/* Regular + special messages */}
          {messages.map(msg=>{
            const mine=msg.sender_id===user?.id;

            /* Locked photo message */
            if(msg.message_type==="locked_photo"){
              return(
                <div key={msg.id} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start"}}>
                  <LockedPhotoCard price={msg.metadata?.price_eth||0.003} onUnlock={()=>showToast("Coming soon! Photo unlocks will be available when payments go live.")}/>
                </div>
              );
            }

            /* Tip / power react message */
            if(msg.message_type==="tip"){
              const tipColor=msg.metadata?.tip_type==="super_tip"?C.gold:msg.metadata?.tip_type==="power_react"?C.warn:C.cold;
              return(
                <div key={msg.id} style={{display:"flex",justifyContent:"center"}}>
                  <div style={{
                    padding:"10px 20px",borderRadius:14,
                    background:`${tipColor}10`,border:`1px solid ${tipColor}33`,
                    fontSize:13,color:tipColor,fontWeight:600,textAlign:"center",
                    animation:"mm-tip-glow 2s infinite",
                  }}>
                    {msg.text}
                    <div style={{fontSize:10,color:C.dim,marginTop:4,fontWeight:400}}>
                      {msg.metadata?.amount_eth} ETH · {new Date(msg.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                    </div>
                  </div>
                </div>
              );
            }

            /* Regular message */
            return(
              <div key={msg.id} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"75%",padding:"10px 14px",borderRadius:14,background:mine?C.cold:C.s2,color:mine?"white":C.text,fontSize:14,lineHeight:1.5,borderBottomRightRadius:mine?4:14,borderBottomLeftRadius:mine?14:4}}>
                  {msg.text}
                  <div style={{fontSize:10,color:mine?"rgba(255,255,255,0.5)":C.dim,marginTop:4}}>{new Date(msg.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef}/>
        </div>

        {/* Jump In button (AI mode) */}
        {chatMode==="ai"&&(
          <div style={{padding:"0 20px 8px"}}>
            <button onClick={()=>setChatMode("you")} style={{
              width:"100%",padding:"12px 20px",borderRadius:12,border:"none",cursor:"pointer",
              background:`linear-gradient(135deg, ${C.cold}, ${C.cyan})`,
              color:"white",fontSize:14,fontWeight:700,fontFamily:"inherit",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8,
              boxShadow:`0 4px 20px ${C.cold}40`,transition:"all 0.2s",
            }}>
              <UserIcon size={16}/> Jump In
            </button>
          </div>
        )}

        {/* Input area */}
        {chatMode==="you"?(
          <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8,alignItems:"center"}}>
            {/* Photo lock button */}
            <button onClick={()=>setShowPhotoModal(true)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,position:"relative",padding:4,flexShrink:0}}>
              <Camera size={20}/>
              <Lock size={8} style={{position:"absolute",bottom:2,right:0,color:C.cold}}/>
            </button>

            <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder="Type a message..."
              style={{flex:1,background:C.s2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.text,fontSize:14,fontFamily:"inherit",outline:"none"}}/>

            {/* Tips button */}
            <div style={{position:"relative",flexShrink:0}}>
              <button onClick={()=>setShowTipMenu(!showTipMenu)} style={{background:"none",border:"none",cursor:"pointer",color:C.warn,padding:4}}>
                <Zap size={20}/>
              </button>
              {showTipMenu&&<TipMenu
                onSelect={(type,amount)=>{
                  setShowTipMenu(false);
                  const label=type==="power_react"?"Power React":type==="super_tip"?"Super Tip":"Tip";
                  showToast(`${label} sent! (Coming soon)`);
                  // Add a visual tip message to local state
                  const tipMsg={id:`tip-${Date.now()}`,sender_id:user?.id,text:`${type==="power_react"?"⚡ Power React!":type==="super_tip"?"🌟 Super Tip!":"💜 Tip sent!"}`,message_type:"tip",metadata:{amount_eth:amount,tip_type:type},created_at:new Date().toISOString()};
                  setMessages(prev=>[...prev,tipMsg]);
                }}
                onClose={()=>setShowTipMenu(false)}
              />}
            </div>

            <Btn primary onClick={sendMessage} disabled={!msgText.trim()}><Send size={16}/></Btn>
          </div>
        ):(
          /* AI mode guide bar */
          <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8,alignItems:"center"}}>
            <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();showToast("Agent guidance sent!");}}} placeholder="Guide your agent..."
              style={{flex:1,background:C.s2,border:`1px solid ${C.purple}33`,borderRadius:10,padding:"10px 14px",color:C.text,fontSize:14,fontFamily:"inherit",outline:"none"}}/>
            <Btn primary onClick={()=>{if(msgText.trim()){showToast("Agent guidance sent!");setMsgText("");}}} disabled={!msgText.trim()}><Send size={16}/></Btn>
          </div>
        )}

        {/* Telegram indicator */}
        <div style={{padding:"6px 20px",borderTop:`1px solid ${C.border}`,fontSize:10,color:C.dim,display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:C.match}}/>
          Connected to Telegram
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════
     MAIN RENDER
     ══════════════════════════════════════════ */
  return(
    <div>
      <SocialStyles/>
      <Toast text={toast.text} visible={toast.visible}/>

      {/* ── Title ── */}
      <h2 style={{fontSize:20,fontWeight:700,marginBottom:4,display:"flex",alignItems:"center",gap:8}}><MMLogo size={28}/>The Mesh</h2>
      <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Your agent networks autonomously. Matches arrive automatically.</div>

      {/* ── Swipe Discovery (TOP) ── */}
      {discovery.length>0&&(
        <SwipeDiscovery
          profiles={discovery}
          onLike={handleSwipeLike}
          onPass={handleSwipePass}
          showToast={showToast}
        />
      )}

      {/* ── Mesh Graph ── */}
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
            <div style={{fontSize:12,marginTop:8,maxWidth:300,margin:"8px auto",lineHeight:1.6}}>It&apos;s having conversations with other agents right now. You&apos;ll get a notification when it finds someone good.</div>
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
          <div style={{textAlign:"center",padding:60,color:C.dim}}><MMLogo size={64}/><div style={{marginTop:16,fontSize:14}}>No other agents yet. You&apos;re early!</div></div>
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
                <Cpu size={10}/>Your agent will reach out automatically if there&apos;s a fit
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

      {/* ════ ACTIVITY FEED (bottom) ════ */}
      <ActivityFeed/>
    </div>
  );
}
