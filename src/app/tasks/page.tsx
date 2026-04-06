"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";
import { C } from "@/lib/theme";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type TaskCategory = "All" | "Delivery" | "Photo" | "Survey" | "Errand" | "Digital";
type SortMode = "newest" | "highest_reward" | "closest";
type ProofType = "photo" | "text" | "gps";

interface TaskRow {
  id: string;
  title: string;
  description: string;
  category: string;
  reward_amount: number;
  reward_currency: string;
  duration_minutes: number;
  total_slots: number;
  slots_remaining: number;
  latitude: number | null;
  longitude: number | null;
  status: string;
  created_at: string;
  poster_id: string;
  poster_handle: string;
  poster_avatar_url: string | null;
  proof_type?: string;
}

const CATEGORIES: TaskCategory[] = ["All", "Delivery", "Photo", "Survey", "Errand", "Digital"];

const CATEGORY_COLORS: Record<string, string> = {
  Delivery: C.accent,
  delivery: C.accent,
  Photo: C.primary,
  photo: C.primary,
  Survey: C.gold,
  survey: C.gold,
  Errand: "#F7931A",
  errand: "#F7931A",
  Digital: "#3B82F6",
  digital: "#3B82F6",
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] || C.muted;
}

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                           */
/* ------------------------------------------------------------------ */
function PlusIcon({ size = 24, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function BriefcaseIcon({ size = 48, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function CameraIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function TextIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function GpsIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function ClockSmallIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function UsersSmallIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PinIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2" />
    </svg>
  );
}

function proofIcon(proofType: string) {
  switch (proofType) {
    case "photo":
      return <CameraIcon size={12} color={C.muted} />;
    case "gps":
      return <GpsIcon size={12} color={C.muted} />;
    default:
      return <TextIcon size={12} color={C.muted} />;
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function timeSince(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

/* ------------------------------------------------------------------ */
/*  Skeleton Card with shimmer                                          */
/* ------------------------------------------------------------------ */
function TaskSkeleton() {
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
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.cardSolid, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: "70%", height: 14, borderRadius: 7, background: C.cardSolid, marginBottom: 10 }} />
          <div style={{ width: "40%", height: 10, borderRadius: 5, background: C.cardSolid, marginBottom: 10 }} />
          <div style={{ width: "55%", height: 10, borderRadius: 5, background: C.cardSolid }} />
        </div>
        <div style={{ width: 60, height: 24, borderRadius: 12, background: C.cardSolid }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pulsing Orb indicator                                               */
/* ------------------------------------------------------------------ */
function CategoryOrb({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: `radial-gradient(circle at 35% 35%, ${color}50, ${color}20)`,
        border: `2px solid ${color}40`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        position: "relative",
        animation: "orbPulse 2.5s ease-in-out infinite",
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 12px ${color}80`,
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Task Card                                                           */
/* ------------------------------------------------------------------ */
function TaskCard({
  task,
  distance,
  onClick,
}: {
  task: TaskRow;
  distance: number | null;
  onClick: () => void;
}) {
  const catColor = categoryColor(task.category);
  const isFull = task.slots_remaining <= 0;
  const proof = (task.proof_type as ProofType) || "text";

  return (
    <GlassCard
      onClick={onClick}
      style={{
        marginBottom: 12,
        cursor: "pointer",
        transition: "transform 0.15s ease, border-color 0.15s ease",
      }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {/* Left: pulsing orb */}
        <CategoryOrb color={catColor} />

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: C.text,
              lineHeight: 1.3,
              marginBottom: 8,
            }}
          >
            {task.title}
          </div>

          {/* Category badge + proof type */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span
              style={{
                background: `${catColor}18`,
                color: catColor,
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 8,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {task.category}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: C.cardSolid,
                padding: "3px 8px",
                borderRadius: 6,
              }}
            >
              {proofIcon(proof)}
              <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase" }}>
                {proof}
              </span>
            </div>
          </div>

          {/* Meta row: duration, slots, distance */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <ClockSmallIcon size={13} color={C.muted} />
              <span style={{ fontSize: 12, color: C.muted }}>{task.duration_minutes}m</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <UsersSmallIcon size={13} color={C.muted} />
              <span style={{ fontSize: 12, color: C.muted }}>
                {task.slots_remaining}/{task.total_slots}
              </span>
            </div>
            {distance != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <PinIcon size={13} color={C.muted} />
                <span style={{ fontSize: 12, color: C.muted }}>{formatDistance(distance)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right side: reward + action */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          {/* Reward */}
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: C.accent,
                lineHeight: 1.2,
              }}
            >
              {task.reward_amount}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.muted,
                textTransform: "uppercase",
              }}
            >
              {task.reward_currency}
            </div>
          </div>

          {/* Apply or Full */}
          {isFull ? (
            <div
              style={{
                background: `${C.danger}18`,
                color: C.danger,
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: 10,
              }}
            >
              Full
            </div>
          ) : (
            <div
              style={{
                background: C.accent,
                color: "#0A0A0F",
                fontSize: 12,
                fontWeight: 800,
                padding: "6px 16px",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              Apply
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */
export default function TasksFeed() {
  const router = useRouter();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<TaskCategory>("All");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("tasks")
        .select("*")
        .eq("status", "open");

      if (activeCategory !== "All") {
        query = query.eq("category", activeCategory.toLowerCase());
      }

      if (sortMode === "newest") {
        query = query.order("created_at", { ascending: false });
      } else if (sortMode === "highest_reward") {
        query = query.order("reward_amount", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error: fetchErr } = await query.limit(50);

      if (fetchErr) {
        if (fetchErr.code === "42P01" || fetchErr.message?.includes("does not exist")) {
          setTasks([]);
          setError(null);
        } else {
          setError(fetchErr.message);
        }
      } else {
        let result = (data as TaskRow[]) || [];
        if (sortMode === "closest" && userLocation) {
          result = result
            .filter((t) => t.latitude != null && t.longitude != null)
            .sort((a, b) => {
              const dA = getDistance(userLocation.lat, userLocation.lon, a.latitude!, a.longitude!);
              const dB = getDistance(userLocation.lat, userLocation.lon, b.latitude!, b.longitude!);
              return dA - dB;
            });
        }
        setTasks(result);
      }
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, sortMode, userLocation]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

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
        @keyframes orbPulse {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fabBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
      `}</style>

      {/* Sticky header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: `${C.bg}ee`,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${C.glassBorder}`,
          padding: "56px 20px 0",
        }}
      >
        {/* Title row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Tasks</h1>
          <button
            onClick={() => router.push("/tasks/create")}
            style={{
              background: C.glass,
              border: `1px solid ${C.glassBorder}`,
              borderRadius: 12,
              padding: "8px 14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: C.text,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <PlusIcon size={16} color={C.primary} />
            <span>Create</span>
          </button>
        </div>

        {/* Sort pills */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {(
            [
              { key: "newest" as SortMode, label: "Newest" },
              { key: "highest_reward" as SortMode, label: "Highest Reward" },
              { key: "closest" as SortMode, label: "Closest" },
            ]
          ).map((s) => (
            <button
              key={s.key}
              onClick={() => setSortMode(s.key)}
              style={{
                background: sortMode === s.key ? `${C.primary}22` : "transparent",
                color: sortMode === s.key ? C.primary : C.muted,
                border: sortMode === s.key ? `1px solid ${C.primary}40` : `1px solid ${C.glassBorder}`,
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Category filter: horizontal scroll */}
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 14,
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            const catCol = cat === "All" ? C.primary : categoryColor(cat);
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  background: isActive ? `${catCol}22` : C.cardSolid,
                  color: isActive ? catCol : C.muted,
                  border: isActive ? `1px solid ${catCol}40` : `1px solid ${C.glassBorder}`,
                  borderRadius: 20,
                  padding: "7px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 20px" }}>
        {/* Loading */}
        {loading && (
          <>
            <TaskSkeleton />
            <TaskSkeleton />
            <TaskSkeleton />
            <TaskSkeleton />
          </>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              style={{ margin: "0 auto 16px", display: "block" }}
            >
              <circle cx="12" cy="12" r="10" stroke={C.muted} strokeWidth="1.5" />
              <path d="M12 8v4M12 16h.01" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: C.text }}>
              Could not load tasks
            </div>
            <div style={{ fontSize: 13, color: C.muted }}>{error}</div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && tasks.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                background: C.cardSolid,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <BriefcaseIcon size={40} color={C.muted} />
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: C.text,
                marginBottom: 8,
              }}
            >
              No tasks yet
            </div>
            <div
              style={{
                fontSize: 14,
                color: C.muted,
                lineHeight: 1.5,
                maxWidth: 280,
                margin: "0 auto 24px",
              }}
            >
              Be the first to post a task and get things done by the community.
            </div>
            <button
              onClick={() => router.push("/tasks/create")}
              style={{
                background: C.primary,
                color: "#fff",
                border: "none",
                borderRadius: 14,
                padding: "12px 28px",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Create a Task
            </button>
          </div>
        )}

        {/* Task cards */}
        {!loading &&
          !error &&
          tasks.map((task, i) => {
            const dist =
              userLocation && task.latitude != null && task.longitude != null
                ? getDistance(userLocation.lat, userLocation.lon, task.latitude, task.longitude)
                : null;
            return (
              <div
                key={task.id}
                style={{
                  animation: "fadeSlideIn 0.35s ease forwards",
                  animationDelay: `${i * 0.05}s`,
                  opacity: 0,
                }}
              >
                <TaskCard
                  task={task}
                  distance={dist}
                  onClick={() => router.push(`/tasks/${task.id}`)}
                />
              </div>
            );
          })}
      </div>

      {/* Floating action button */}
      <button
        onClick={() => router.push("/tasks/create")}
        style={{
          position: "fixed",
          bottom: 96,
          right: 20,
          width: 58,
          height: 58,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.primary}, #8B5CF6)`,
          border: "none",
          cursor: "pointer",
          boxShadow: `0 6px 24px ${C.primary}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 40,
          animation: "fabBounce 3s ease-in-out infinite",
        }}
      >
        <PlusIcon size={26} color="#fff" />
      </button>
    </div>
  );
}
