"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";
import { C } from "@/lib/theme";
import GlassCard from "@/components/GlassCard";
import { useIsDesktop } from "@/hooks/useIsDesktop";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type Tab = "daily" | "weekly";
type MissionStatus = "active" | "completed" | "claimed";

interface Mission {
  id: string;
  title: string;
  description: string;
  type: Tab;
  target: number;
  reward_amount: number;
  reward_currency: string;
  icon_name: string;
  sort_order: number;
}

interface MissionProgress {
  id: string;
  mission_id: string;
  user_id: string;
  current: number;
  status: MissionStatus;
  claimed_at: string | null;
  updated_at: string;
}

interface MissionWithProgress extends Mission {
  current: number;
  status: MissionStatus;
  claimed_at: string | null;
}

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                           */
/* ------------------------------------------------------------------ */
function TargetIcon({ size = 20, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function CheckCircleIcon({ size = 20, color = C.accent }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ClockIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function StarIcon({ size = 16, color = C.gold }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function SwapIcon({ size = 20, color = C.primary }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function UsersIcon({ size = 20, color = C.primary }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TrendingIcon({ size = 20, color = C.primary }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function WalletIcon({ size = 20, color = C.primary }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function GiftIcon({ size = 16, color = C.gold }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function missionIcon(iconName: string, size: number, color: string) {
  switch (iconName) {
    case "swap":
    case "trade":
      return <SwapIcon size={size} color={color} />;
    case "users":
    case "social":
    case "refer":
      return <UsersIcon size={size} color={color} />;
    case "trending":
    case "chart":
      return <TrendingIcon size={size} color={color} />;
    case "wallet":
    case "fund":
      return <WalletIcon size={size} color={color} />;
    case "gift":
      return <GiftIcon size={size} color={color} />;
    default:
      return <TargetIcon size={size} color={color} />;
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function getTimeRemaining(type: Tab): string {
  const now = new Date();
  if (type === "daily") {
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  return `${daysUntilMonday}d`;
}

function progressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min((current / target) * 100, 100);
}

/* ------------------------------------------------------------------ */
/*  Confetti burst                                                      */
/* ------------------------------------------------------------------ */
function ConfettiBurst({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [C.accent, C.primary, C.gold, "#FF6B6B", "#4ECDC4"];
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      rotationSpeed: number;
      life: number;
    }[] = [];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 16 - 4,
        size: Math.random() * 8 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        life: 1,
      });
    }

    let frame = 0;
    const maxFrames = 60;

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.rotation += p.rotationSpeed;
        p.life = Math.max(0, 1 - frame / maxFrames);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      if (frame < maxFrames) {
        requestAnimationFrame(animate);
      } else {
        onDone();
      }
    }

    requestAnimationFrame(animate);
  }, [onDone]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton Card with shimmer                                          */
/* ------------------------------------------------------------------ */
function SkeletonCard() {
  return (
    <div
      style={{
        background: C.glass,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        border: `1px solid ${C.glassBorder}`,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "-100%",
          width: "200%",
          height: "100%",
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
          animation: "shimmer 1.8s ease-in-out infinite",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: C.cardSolid,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ width: "65%", height: 14, borderRadius: 7, background: C.cardSolid, marginBottom: 8 }} />
          <div style={{ width: "45%", height: 10, borderRadius: 5, background: C.cardSolid }} />
        </div>
        <div style={{ width: 56, height: 26, borderRadius: 13, background: C.cardSolid }} />
      </div>
      <div style={{ width: "100%", height: 6, borderRadius: 3, background: C.cardSolid }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Claim Button with hover/press states                               */
/* ------------------------------------------------------------------ */
function ClaimButton({
  isClaiming,
  onClick,
}: {
  isClaiming: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      disabled={isClaiming}
      style={{
        marginTop: 12,
        width: "100%",
        padding: "10px 0",
        borderRadius: 14,
        border: "none",
        background: isClaiming
          ? C.cardSolid
          : `linear-gradient(135deg, ${C.accent}, ${C.cyan})`,
        color: isClaiming ? C.muted : "#0a0a0f",
        fontSize: 14,
        fontWeight: 800,
        cursor: isClaiming ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        transition: "all 0.2s ease",
        letterSpacing: 0.5,
        transform: pressed ? "scale(0.98)" : "scale(1)",
        boxShadow: hovered && !isClaiming ? `0 0 20px ${C.accent}40` : "none",
      }}
    >
      {isClaiming ? "Claiming..." : "Claim Reward"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Mission Card                                                        */
/* ------------------------------------------------------------------ */
function MissionCard({
  mission,
  onClaim,
  claiming,
}: {
  mission: MissionWithProgress;
  onClaim: (id: string) => void;
  claiming: string | null;
}) {
  const [hovered, setHovered] = useState(false);
  const pct = progressPercent(mission.current, mission.target);
  const isComplete = mission.current >= mission.target;
  const isClaimed = mission.status === "claimed";
  const isClaiming = claiming === mission.id;

  const iconColor = isClaimed ? C.muted : isComplete ? C.accent : C.primary;

  return (
    <GlassCard
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        marginBottom: 12,
        opacity: isClaimed ? 0.55 : 1,
        transition: "all 0.25s ease",
        position: "relative",
        overflow: "hidden",
        transform: hovered && !isClaimed ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered && !isClaimed ? `0 8px 32px rgba(0,0,0,0.35)` : "none",
        // Left border accent for completed-but-unclaimed missions
        borderLeft: isComplete && !isClaimed ? `3px solid ${C.accent}` : undefined,
      }}
    >
      {/* Completed glow stripe */}
      {isComplete && !isClaimed && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, ${C.accent}, ${C.primary})`,
            animation: "glowPulse 2s ease-in-out infinite",
          }}
        />
      )}

      {/* Checkmark overlay for claimed */}
      {isClaimed && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            opacity: 0.4,
          }}
        >
          <CheckCircleIcon size={28} color={C.muted} />
        </div>
      )}

      {/* Green checkmark overlay for completed (not yet claimed) */}
      {isComplete && !isClaimed && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            opacity: 0.85,
          }}
        >
          <CheckCircleIcon size={22} color={C.accent} />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        {/* Left: icon */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: isClaimed
              ? C.cardSolid
              : isComplete
              ? `${C.accent}18`
              : `${C.primary}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {isComplete && !isClaimed ? (
            <CheckCircleIcon size={22} color={C.accent} />
          ) : (
            missionIcon(mission.icon_name, 22, iconColor)
          )}
        </div>

        {/* Center: title, description, progress bar */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: isClaimed ? C.muted : C.text,
                lineHeight: 1.3,
                // Leave room for checkmark overlay when complete
                paddingRight: isComplete ? 32 : 0,
              }}
            >
              {mission.title}
            </div>

            {/* Right: reward badge + progress */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: isClaimed ? C.cardSolid : `${C.gold}18`,
                  padding: "3px 10px",
                  borderRadius: 20,
                }}
              >
                <StarIcon size={11} color={isClaimed ? C.muted : C.gold} />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: isClaimed ? C.muted : C.gold,
                  }}
                >
                  {mission.reward_amount}
                </span>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: isClaimed ? C.muted : isComplete ? C.accent : C.text,
                }}
              >
                {mission.current}/{mission.target}
              </span>
            </div>
          </div>

          <div
            style={{
              fontSize: 13,
              color: C.muted,
              lineHeight: 1.4,
              marginBottom: 12,
            }}
          >
            {mission.description}
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: "100%",
              height: 6,
              borderRadius: 3,
              background: C.cardSolid,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                borderRadius: 3,
                background: isClaimed ? C.muted : C.accent,
                transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: isComplete && !isClaimed ? `0 0 10px ${C.accent}60` : "none",
              }}
            />
          </div>

          {/* Claim button */}
          {isComplete && !isClaimed && (
            <ClaimButton
              isClaiming={isClaiming}
              onClick={(e) => {
                e.stopPropagation();
                onClaim(mission.id);
              }}
            />
          )}
        </div>
      </div>
    </GlassCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */
export default function MissionsPage() {
  const { user } = useAuth();
  const { isDesktop } = useIsDesktop();
  const [tab, setTab] = useState<Tab>("daily");
  const [missions, setMissions] = useState<MissionWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [dailyTime, setDailyTime] = useState(getTimeRemaining("daily"));
  const [weeklyTime, setWeeklyTime] = useState(getTimeRemaining("weekly"));
  const [showConfetti, setShowConfetti] = useState(false);

  // Refresh countdown every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      setDailyTime(getTimeRemaining("daily"));
      setWeeklyTime(getTimeRemaining("weekly"));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const fetchMissions = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: missionRows, error: mErr } = await supabase
        .from("missions")
        .select("*")
        .order("sort_order", { ascending: true });

      if (mErr) {
        if (mErr.code === "42P01" || mErr.message?.includes("does not exist")) {
          setMissions([]);
          setLoading(false);
          return;
        }
        throw mErr;
      }

      if (!missionRows || missionRows.length === 0) {
        setMissions([]);
        setLoading(false);
        return;
      }

      const missionIds = missionRows.map((m: Mission) => m.id);
      const { data: progressRows } = await supabase
        .from("mission_progress")
        .select("*")
        .eq("user_id", user.id)
        .in("mission_id", missionIds);

      const progressMap = new Map<string, MissionProgress>();
      if (progressRows) {
        for (const p of progressRows) {
          progressMap.set(p.mission_id, p);
        }
      }

      const merged: MissionWithProgress[] = missionRows.map((m: Mission) => {
        const prog = progressMap.get(m.id);
        return {
          ...m,
          current: prog?.current ?? 0,
          status: prog?.status ?? "active",
          claimed_at: prog?.claimed_at ?? null,
        };
      });

      setMissions(merged);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load missions";
      if (message.includes("does not exist") || message.includes("42P01")) {
        setMissions([]);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const handleClaim = async (missionId: string) => {
    if (!user || claiming) return;
    setClaiming(missionId);

    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mission_id: missionId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Claim failed");
      }

      setShowConfetti(true);

      setMissions((prev) =>
        prev.map((m) =>
          m.id === missionId
            ? { ...m, status: "claimed" as MissionStatus, claimed_at: new Date().toISOString() }
            : m
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Claim failed";
      setError(message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setClaiming(null);
    }
  };

  const dailyMissions = missions.filter((m) => m.type === "daily");
  const weeklyMissions = missions.filter((m) => m.type === "weekly");
  const activeMissions = tab === "daily" ? dailyMissions : weeklyMissions;

  const claimedCount = activeMissions.filter((m) => m.status === "claimed").length;
  const completed = activeMissions.filter(
    (m) => m.status === "completed" || m.status === "claimed"
  ).length;
  const total = activeMissions.length;
  const allClaimed = total > 0 && claimedCount === total;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        paddingBottom: 100,
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes checkDraw {
          from { stroke-dashoffset: 30; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes celebrationPop {
          0% { opacity: 0; transform: scale(0.85) translateY(8px); }
          60% { opacity: 1; transform: scale(1.04) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Confetti */}
      {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}

      {/* Outer wrapper — centers content on desktop */}
      <div
        style={{
          maxWidth: isDesktop ? 900 : "100%",
          margin: "0 auto",
          padding: isDesktop ? "0 24px" : "0",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: isDesktop ? "20px 0 20px" : "60px 20px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            onClick={() => window.history.back()}
            style={{
              background: "none",
              border: "none",
              padding: 4,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1
            style={{
              fontSize: isDesktop ? 34 : 30,
              fontWeight: 800,
              margin: 0,
              letterSpacing: -0.5,
            }}
          >
            Missions
          </h1>
        </div>

        {/* Tab switcher: Daily | Weekly */}
        <div style={{ padding: isDesktop ? "0 0" : "0 20px", marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              background: C.cardSolid,
              borderRadius: 14,
              padding: 3,
              maxWidth: isDesktop ? 320 : "100%",
            }}
          >
            {(["daily", "weekly"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: "11px 0",
                  borderRadius: 11,
                  border: "none",
                  background: tab === t ? C.primary : "transparent",
                  color: tab === t ? "#fff" : C.muted,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  textTransform: "capitalize",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Section header with countdown */}
        <div style={{ padding: isDesktop ? "0 0" : "0 20px", marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: C.text,
                textTransform: "capitalize",
              }}
            >
              {tab}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: C.glass,
                border: `1px solid ${C.glassBorder}`,
                borderRadius: 20,
                padding: "5px 12px",
              }}
            >
              <ClockIcon size={13} color={C.muted} />
              <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Resets in</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>
                {tab === "daily" ? dailyTime : weeklyTime}
              </span>
            </div>
          </div>

          {/* Progress summary */}
          {total > 0 && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: C.cardSolid,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: total > 0 ? `${(completed / total) * 100}%` : "0%",
                    height: "100%",
                    borderRadius: 2,
                    background: C.accent,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, flexShrink: 0 }}>
                {completed}/{total}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: isDesktop ? "0 0" : "0 20px" }}>
          {/* Error */}
          {error && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: `1px solid rgba(239, 68, 68, 0.25)`,
                borderRadius: 14,
                padding: "10px 14px",
                marginBottom: 12,
                fontSize: 13,
                color: "#ef4444",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          {/* Loading skeletons — 2-col grid on desktop */}
          {loading && (
            <div
              style={{
                display: isDesktop ? "grid" : "block",
                gridTemplateColumns: isDesktop ? "repeat(2, 1fr)" : undefined,
                gap: isDesktop ? 16 : undefined,
              }}
            >
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {/* Empty state */}
          {!loading && activeMissions.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 22,
                  background: C.cardSolid,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                <TargetIcon size={36} color={C.muted} />
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: C.text,
                  marginBottom: 8,
                }}
              >
                No missions available
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: C.muted,
                  lineHeight: 1.5,
                  maxWidth: 280,
                  margin: "0 auto 20px",
                }}
              >
                Nothing in {tab} yet. Try another tab — or hunt creatures to unlock new ones.
              </div>
              <button
                onClick={() => window.history.back()}
                style={{
                  background: "transparent",
                  border: `1.5px solid ${C.primary}`,
                  color: C.primary,
                  borderRadius: 12,
                  padding: "10px 24px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Go Back
              </button>
            </div>
          )}

          {/* All caught up celebration state */}
          {!loading && activeMissions.length > 0 && allClaimed && (
            <div
              style={{
                textAlign: "center",
                padding: "24px 20px 16px",
                animation: "celebrationPop 0.45s ease forwards",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: `${C.accent}14`,
                  border: `1px solid ${C.accent}30`,
                  borderRadius: 16,
                  padding: "10px 20px",
                  marginBottom: 6,
                }}
              >
                <CheckCircleIcon size={18} color={C.accent} />
                <span style={{ fontSize: 15, fontWeight: 700, color: C.accent }}>
                  All missions complete!
                </span>
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                All caught up! Come back when missions reset.
              </div>
            </div>
          )}

          {/* Mission cards — 2-col grid on desktop */}
          {!loading && activeMissions.length > 0 && (
            <div
              style={{
                display: isDesktop ? "grid" : "block",
                gridTemplateColumns: isDesktop ? "repeat(2, 1fr)" : undefined,
                gap: isDesktop ? 16 : undefined,
              }}
            >
              {activeMissions.map((m, i) => (
                <div
                  key={m.id}
                  style={{
                    animation: "fadeSlideIn 0.35s ease forwards",
                    animationDelay: `${i * 0.06}s`,
                    opacity: 0,
                  }}
                >
                  <MissionCard mission={m} onClaim={handleClaim} claiming={claiming} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
