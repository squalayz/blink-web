"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";
import { C } from "@/lib/theme";
import { useRouter, useParams } from "next/navigation";

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
  proof_required: string[];
  id_required: boolean;
  latitude: number | null;
  longitude: number | null;
  is_remote: boolean;
  status: string;
  created_at: string;
  poster_id: string;
  poster_handle: string;
  poster_avatar_url: string | null;
}

interface TaskClaim {
  id: string;
  task_id: string;
  worker_id: string;
  worker_handle: string;
  worker_avatar_url: string | null;
  status: string;
  proof_url: string | null;
  proof_text: string | null;
  claimed_at: string;
  completed_at: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  delivery: C.cyan,
  photo: C.gold,
  survey: C.primary,
  errand: "#10B981",
  digital: C.solPurple,
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "#10B981" },
  in_progress: { label: "In Progress", color: C.gold },
  completed: { label: "Completed", color: C.cyan },
  cancelled: { label: "Cancelled", color: C.danger },
};

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

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;
  const { user } = useAuth();

  const [task, setTask] = useState<TaskRow | null>(null);
  const [claims, setClaims] = useState<TaskClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isPoster = user && task && user.id === task.poster_id;
  const hasApplied = claims.some((c) => c.worker_id === user?.id);

  const fetchTask = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (fetchErr) {
        if (fetchErr.code === "42P01" || fetchErr.message?.includes("does not exist")) {
          setError("Tasks are not yet available");
        } else if (fetchErr.code === "PGRST116") {
          setError("Task not found");
        } else {
          setError(fetchErr.message);
        }
      } else {
        setTask(data as TaskRow);
      }
    } catch {
      setError("Failed to load task");
    }

    // Fetch claims
    try {
      const { data: claimData } = await supabase
        .from("task_claims")
        .select("*")
        .eq("task_id", taskId)
        .order("claimed_at", { ascending: false });

      if (claimData) {
        setClaims(claimData as TaskClaim[]);
      }
    } catch {
      // Claims table may not exist yet
    }

    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    if (taskId) fetchTask();
  }, [taskId, fetchTask]);

  const handleApply = async () => {
    if (!user || !task) return;
    setApplying(true);
    setActionError(null);

    try {
      const { error: claimErr } = await supabase.from("task_claims").insert({
        task_id: task.id,
        worker_id: user.id,
        status: "applied",
      });

      if (claimErr) {
        if (claimErr.code === "42P01" || claimErr.message?.includes("does not exist")) {
          setActionError("Claims system not yet available");
        } else {
          setActionError(claimErr.message);
        }
      } else {
        setApplySuccess(true);
        fetchTask();
      }
    } catch {
      setActionError("Failed to apply");
    } finally {
      setApplying(false);
    }
  };

  const handleClaimAction = async (claimId: string, action: "approve" | "reject") => {
    setActionError(null);
    try {
      const newStatus = action === "approve" ? "approved" : "rejected";
      const { error: updateErr } = await supabase
        .from("task_claims")
        .update({ status: newStatus })
        .eq("id", claimId);

      if (updateErr) {
        setActionError(updateErr.message);
      } else {
        fetchTask();
      }
    } catch {
      setActionError("Action failed");
    }
  };

  const workerEarns = task ? task.reward_amount * 0.9 : 0;
  const platformFee = task ? task.reward_amount * 0.1 : 0;
  const statusConf = task ? STATUS_CONFIG[task.status] || { label: task.status, color: C.muted } : { label: "", color: C.muted };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          color: C.text,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", color: C.muted }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: `3px solid ${C.border}`,
              borderTopColor: C.primary,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          Loading task...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          color: C.text,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          textAlign: "center",
        }}
      >
        <svg
          width="56"
          height="56"
          viewBox="0 0 24 24"
          fill="none"
          style={{ marginBottom: 16 }}
        >
          <circle cx="12" cy="12" r="10" stroke={C.muted} strokeWidth="1.5" />
          <path d="M12 8v4M12 16h.01" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{error || "Task not found"}</div>
        <button
          onClick={() => router.push("/tasks")}
          style={{
            background: C.s2,
            color: C.text,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "12px 24px",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            marginTop: 20,
          }}
        >
          Back to Tasks
        </button>
      </div>
    );
  }

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
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: `${C.bg}ee`,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${C.border}`,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{ flex: 1, fontSize: 18, fontWeight: 700 }}>Task Detail</div>
        <div
          style={{
            background: `${statusConf.color}22`,
            color: statusConf.color,
            fontSize: 12,
            fontWeight: 700,
            padding: "5px 12px",
            borderRadius: 8,
          }}
        >
          {statusConf.label}
        </div>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        {/* Category + Title */}
        <span
          style={{
            background: `${CATEGORY_COLORS[task.category] || C.muted}22`,
            color: CATEGORY_COLORS[task.category] || C.muted,
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 8,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            display: "inline-block",
            marginBottom: 12,
          }}
        >
          {task.category}
        </span>

        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 16px", lineHeight: 1.2 }}>
          {task.title}
        </h1>

        {/* Poster */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 24,
          }}
        >
          {task.poster_avatar_url ? (
            <img
              src={task.poster_avatar_url}
              alt=""
              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.primary}, ${C.cyan})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {(task.poster_handle || "?")[0].toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>@{task.poster_handle}</div>
            <div style={{ fontSize: 12, color: C.muted }}>Posted {timeSince(task.created_at)}</div>
          </div>
        </div>

        {/* Description */}
        <div
          style={{
            background: C.s2,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 10,
            }}
          >
            Description
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.6, color: C.text, whiteSpace: "pre-wrap" }}>
            {task.description}
          </div>
        </div>

        {/* Reward card */}
        <div
          style={{
            background: `linear-gradient(135deg, ${C.primary}15, ${C.cyan}15)`,
            border: `1px solid ${C.primary}33`,
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 12,
            }}
          >
            Reward
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 32, fontWeight: 800, color: C.gold }}>
              {task.reward_amount}
            </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: task.reward_currency === "ETH" ? C.ethBlue : C.solPurple,
              }}
            >
              {task.reward_currency}
            </span>
          </div>
          <div
            style={{
              borderTop: `1px solid ${C.border}`,
              paddingTop: 12,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: C.muted }}>Worker receives (90%)</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.cyan }}>
                {workerEarns.toFixed(4)} {task.reward_currency}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: C.muted }}>Platform fee (10%)</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>
                {platformFee.toFixed(4)} {task.reward_currency}
              </span>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div
          style={{
            background: C.s2,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 12,
            }}
          >
            Requirements
          </div>

          {/* Proof types */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Proof of completion</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(task.proof_required || []).map((p) => (
                <span
                  key={p}
                  style={{
                    background: `${C.primary}22`,
                    color: C.primary,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "5px 10px",
                    borderRadius: 8,
                    textTransform: "capitalize",
                  }}
                >
                  {p}
                </span>
              ))}
              {(!task.proof_required || task.proof_required.length === 0) && (
                <span style={{ fontSize: 13, color: C.muted }}>None specified</span>
              )}
            </div>
          </div>

          {/* ID required */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="5" width="20" height="14" rx="2" stroke={task.id_required ? C.gold : C.muted} strokeWidth="1.5" />
              <circle cx="8" cy="12" r="2" stroke={task.id_required ? C.gold : C.muted} strokeWidth="1.5" />
              <path d="M14 10h4M14 14h3" stroke={task.id_required ? C.gold : C.muted} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 13, color: task.id_required ? C.gold : C.muted, fontWeight: 600 }}>
              {task.id_required ? "ID verification required" : "No ID verification needed"}
            </span>
          </div>
        </div>

        {/* Duration + Slots */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              flex: 1,
              background: C.s2,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: 16,
              textAlign: "center",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{ display: "block", margin: "0 auto 8px" }}
            >
              <circle cx="12" cy="12" r="9" stroke={C.cyan} strokeWidth="1.5" />
              <path d="M12 7v5l3 3" stroke={C.cyan} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{task.duration_minutes}m</div>
            <div style={{ fontSize: 12, color: C.muted }}>Duration</div>
          </div>
          <div
            style={{
              flex: 1,
              background: C.s2,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: 16,
              textAlign: "center",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{ display: "block", margin: "0 auto 8px" }}
            >
              <path d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4-4v2" stroke={C.primary} strokeWidth="1.5" />
              <circle cx="10" cy="7" r="3" stroke={C.primary} strokeWidth="1.5" />
              <path d="M20 8v6M23 11h-6" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 22, fontWeight: 800 }}>
              {task.slots_remaining}/{task.total_slots}
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>Slots open</div>
          </div>
        </div>

        {/* Location */}
        <div
          style={{
            background: C.s2,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 10,
            }}
          >
            Location
          </div>
          {task.is_remote || (task.latitude == null && task.longitude == null) ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="3" width="20" height="14" rx="2" stroke={C.cyan} strokeWidth="1.5" />
                <path d="M8 21h8M12 17v4" stroke={C.cyan} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.cyan }}>Remote</span>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                    stroke={C.primary}
                    strokeWidth="1.5"
                  />
                  <circle cx="12" cy="9" r="2" stroke={C.primary} strokeWidth="1.5" />
                </svg>
                <span style={{ fontSize: 14, fontWeight: 600 }}>On Location</span>
              </div>
              <div style={{ fontSize: 13, color: C.muted }}>
                {task.latitude?.toFixed(6)}, {task.longitude?.toFixed(6)}
              </div>
              {/* Static map placeholder */}
              <div
                style={{
                  marginTop: 12,
                  height: 140,
                  borderRadius: 10,
                  background: `${C.primary}11`,
                  border: `1px solid ${C.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                    stroke={C.muted}
                    strokeWidth="1.5"
                  />
                  <circle cx="12" cy="9" r="2" stroke={C.muted} strokeWidth="1.5" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Poster management: claims list */}
        {isPoster && claims.length > 0 && (
          <div
            style={{
              background: C.s2,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 12,
              }}
            >
              Applications ({claims.length})
            </div>
            {claims.map((claim) => (
              <div
                key={claim.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {claim.worker_avatar_url ? (
                    <img
                      src={claim.worker_avatar_url}
                      alt=""
                      style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${C.primary}, ${C.cyan})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#fff",
                      }}
                    >
                      {(claim.worker_handle || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>@{claim.worker_handle}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{claim.status}</div>
                  </div>
                </div>
                {claim.status === "applied" && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => handleClaimAction(claim.id, "approve")}
                      style={{
                        background: `#10B98122`,
                        color: "#10B981",
                        border: "none",
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleClaimAction(claim.id, "reject")}
                      style={{
                        background: `${C.danger}22`,
                        color: C.danger,
                        border: "none",
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action error */}
        {actionError && (
          <div
            style={{
              background: `${C.danger}15`,
              border: `1px solid ${C.danger}44`,
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 16,
              fontSize: 13,
              color: C.danger,
            }}
          >
            {actionError}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {!isPoster && task.status === "open" && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: `${C.bg}ee`,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: `1px solid ${C.border}`,
            padding: "16px 20px",
            paddingBottom: "max(16px, env(safe-area-inset-bottom))",
            zIndex: 50,
          }}
        >
          {applySuccess || hasApplied ? (
            <div
              style={{
                width: "100%",
                background: `#10B98122`,
                color: "#10B981",
                border: `1px solid #10B98144`,
                borderRadius: 14,
                padding: "16px",
                fontSize: 16,
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Application Submitted
              </div>
            </div>
          ) : !user ? (
            <button
              onClick={() => router.push("/auth/signin")}
              style={{
                width: "100%",
                background: C.s2,
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: "16px",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sign in to Apply
            </button>
          ) : task.slots_remaining <= 0 ? (
            <div
              style={{
                width: "100%",
                background: C.s2,
                color: C.muted,
                borderRadius: 14,
                padding: "16px",
                fontSize: 16,
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              All Slots Filled
            </div>
          ) : (
            <button
              onClick={handleApply}
              disabled={applying}
              style={{
                width: "100%",
                background: applying
                  ? C.border
                  : `linear-gradient(135deg, ${C.primary}, ${C.cyan})`,
                color: "#fff",
                border: "none",
                borderRadius: 14,
                padding: "16px",
                fontSize: 16,
                fontWeight: 700,
                cursor: applying ? "default" : "pointer",
                opacity: applying ? 0.6 : 1,
              }}
            >
              {applying ? "Applying..." : "Claim Task"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
