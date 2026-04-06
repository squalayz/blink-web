"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";
import type { ActivityRow } from "@/lib/theme";
import GlassCard from "@/components/GlassCard";

// ── Types ──────────────────────────────────────────────

type ChainFilter = "All" | "SOL" | "ETH" | "BTC";

interface StoryUser {
  id: string;
  handle: string;
  avatar_url: string | null;
}

// ── Helpers ────────────────────────────────────────────

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function typeColor(type: string): string {
  if (type === "crack" || type === "orb_cracked") return C.gold;
  if (type === "drop") return C.primary;
  if (type === "send") return "#3B82F6";
  if (type === "orb_cancelled") return C.danger;
  return C.muted;
}

function isPositiveAmount(amount: string): boolean {
  if (!amount) return false;
  return amount.startsWith("+") || (!amount.startsWith("-") && amount.trim() !== "");
}

function chainFromText(item: ActivityRow): string | null {
  const text = `${item.title} ${item.subtitle} ${item.amount_text}`.toLowerCase();
  if (text.includes("sol")) return "SOL";
  if (text.includes("eth")) return "ETH";
  if (text.includes("btc")) return "BTC";
  return null;
}

// ── SVG Icons ──────────────────────────────────────────

function IconBolt({ size = 20, color = C.gold }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconDrop({ size = 20, color = C.primary }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}

function IconSend({ size = 20, color = "#3B82F6" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconCancel({ size = 20, color = C.danger }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function IconAntenna({ size = 40, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12a10 10 0 0 1 18-6" />
      <path d="M5 10a6 6 0 0 1 11-3" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 14v8" />
      <path d="M9 22h6" />
    </svg>
  );
}

function IconPlus({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function typeIcon(type: string) {
  const color = typeColor(type);
  if (type === "crack" || type === "orb_cracked") return <IconBolt size={20} color={color} />;
  if (type === "drop") return <IconDrop size={20} color={color} />;
  if (type === "send") return <IconSend size={20} color={color} />;
  if (type === "orb_cancelled") return <IconCancel size={20} color={color} />;
  return <IconBolt size={20} color={C.muted} />;
}

// ── Skeleton ───────────────────────────────────────────

function SkeletonBlock({ width, height, radius = 8 }: { width: string | number; height: number; radius?: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${C.cardSolid} 25%, rgba(255,255,255,0.06) 50%, ${C.cardSolid} 75%)`,
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s ease-in-out infinite",
      }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: "0 20px" }}>
      {/* Story skeleton */}
      <div style={{ display: "flex", gap: 14, padding: "16px 0", overflow: "hidden" }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <SkeletonBlock width={60} height={60} radius={30} />
            <SkeletonBlock width={40} height={10} radius={4} />
          </div>
        ))}
      </div>
      {/* Card skeletons */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            background: C.glass,
            border: `1px solid ${C.glassBorder}`,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <SkeletonBlock width={40} height={40} radius={20} />
          <div style={{ flex: 1 }}>
            <SkeletonBlock width="70%" height={14} />
            <div style={{ height: 8 }} />
            <SkeletonBlock width="40%" height={10} />
          </div>
          <SkeletonBlock width={50} height={16} radius={6} />
        </div>
      ))}
    </div>
  );
}

// ── Stories Row ────────────────────────────────────────

function StoriesRow({ users }: { users: StoryUser[] }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        overflowX: "auto",
        padding: "16px 20px",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none" as const,
        msOverflowStyle: "none" as const,
      }}
    >
      {/* Add story button */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: C.cardSolid,
            border: `2px dashed ${C.glassBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <IconPlus size={22} color={C.muted} />
        </div>
        <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>You</span>
      </div>

      {/* User stories */}
      {users.map((u) => {
        const initial = (u.handle || "?").charAt(0).toUpperCase();
        return (
          <div
            key={u.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: `linear-gradient(${C.surface}, ${C.surface}) padding-box, linear-gradient(135deg, #9945FF, #14F195) border-box`,
                border: "2px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: C.bg,
                  padding: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {u.avatar_url ? (
                  <img
                    src={u.avatar_url}
                    alt=""
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${C.primary}44, ${C.accent}44)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 700,
                      color: C.text,
                    }}
                  >
                    {initial}
                  </div>
                )}
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                color: C.muted,
                maxWidth: 60,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textAlign: "center",
              }}
            >
              {u.handle || "user"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Activity Card ──────────────────────────────────────

function ActivityCard({ item, index, isNew }: { item: ActivityRow; index: number; isNew: boolean }) {
  const color = typeColor(item.type);
  const [visible, setVisible] = useState(!isNew);

  useEffect(() => {
    if (isNew) {
      const t = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(t);
    }
  }, [isNew]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: C.glass,
        border: `1px solid ${isNew ? `${color}44` : C.glassBorder}`,
        borderRadius: 16,
        padding: "14px 16px",
        marginBottom: 10,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
        transitionDelay: isNew ? "0ms" : `${Math.min(index * 50, 300)}ms`,
        animation: !isNew ? `fadeSlideUp 0.4s ease ${Math.min(index * 50, 300)}ms both` : "none",
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          background: `${color}15`,
          border: `1.5px solid ${color}33`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {typeIcon(item.type)}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: C.text,
            fontSize: 14,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.3,
          }}
        >
          {item.title}
        </div>
        {item.subtitle && (
          <div
            style={{
              color: C.muted,
              fontSize: 12,
              marginTop: 3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.subtitle}
          </div>
        )}
        <div style={{ color: C.muted, fontSize: 11, marginTop: 4, opacity: 0.7 }}>
          {relativeTime(item.created_at)}
        </div>
      </div>

      {/* Amount */}
      {item.amount_text && (
        <div
          style={{
            color: isPositiveAmount(item.amount_text) ? C.accent : C.danger,
            fontSize: 14,
            fontWeight: 700,
            flexShrink: 0,
            textAlign: "right",
          }}
        >
          {item.amount_text}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────

export default function LiveFeedPage() {
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [chainFilter, setChainFilter] = useState<ChainFilter>("All");
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(false);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (data && mountedRef.current) {
        setActivities(data as ActivityRow[]);
      }

      // Fetch story users from recent activity (unique)
      if (data && data.length > 0) {
        const seen = new Set<string>();
        const users: StoryUser[] = [];
        for (const row of data as ActivityRow[]) {
          if (
            row.related_profile_id &&
            !seen.has(row.related_profile_id) &&
            users.length < 10
          ) {
            seen.add(row.related_profile_id);
            users.push({
              id: row.related_profile_id,
              handle: row.related_profile_handle || "user",
              avatar_url: row.related_profile_avatar_url || null,
            });
          }
        }
        setStoryUsers(users);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    // Real-time subscription
    const channel = supabase
      .channel("activity_feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity" },
        (payload) => {
          if (!mountedRef.current) return;
          const row = payload.new as ActivityRow;
          setActivities((prev) => [row, ...prev.slice(0, 49)]);
          setNewIds((prev) => {
            const next = new Set(prev);
            next.add(row.id);
            return next;
          });
          setTimeout(() => {
            setNewIds((prev) => {
              const next = new Set(prev);
              next.delete(row.id);
              return next;
            });
          }, 1200);
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Pull-to-refresh handlers
  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const el = containerRef.current;
    if (dy > 80 && el && el.scrollTop <= 0 && !refreshing) {
      setRefreshing(true);
      fetchData();
    }
  }

  // Filter activities by chain
  const filtered =
    chainFilter === "All"
      ? activities
      : activities.filter((a) => chainFromText(a) === chainFilter);

  const chains: ChainFilter[] = ["All", "SOL", "ETH", "BTC"];

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        paddingBottom: 100,
        overflowY: "auto",
      }}
    >
      <style>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        div::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Header ── */}
      <div
        style={{
          padding: "60px 20px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: C.surface,
          borderBottom: `1px solid ${C.glassBorder}`,
        }}
      >
        <h1 style={{ color: C.text, fontSize: 28, fontWeight: 700, margin: 0 }}>Live Feed</h1>

        {/* Live indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: `${C.accent}15`,
            border: `1px solid ${C.accent}33`,
            borderRadius: 20,
            padding: "5px 12px",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: C.accent,
              boxShadow: `0 0 8px ${C.accent}`,
              animation: "pulseDot 1.4s ease-in-out infinite",
            }}
          />
          <span
            style={{
              color: C.accent,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
            }}
          >
            LIVE
          </span>
        </div>
      </div>

      {/* ── Pull to refresh indicator ── */}
      {refreshing && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "14px 0 6px",
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              border: `3px solid ${C.glassBorder}`,
              borderTopColor: C.primary,
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
        </div>
      )}

      {/* ── Stories Row ── */}
      {!loading && storyUsers.length > 0 && <StoriesRow users={storyUsers} />}

      {/* ── Chain Filter Pills ── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "8px 20px 14px",
          overflowX: "auto",
        }}
      >
        {chains.map((ch) => {
          const active = chainFilter === ch;
          let pillColor = C.primary;
          if (ch === "SOL") pillColor = "#9945FF";
          if (ch === "ETH") pillColor = "#627EEA";
          if (ch === "BTC") pillColor = "#F7931A";

          return (
            <button
              key={ch}
              onClick={() => setChainFilter(ch)}
              style={{
                padding: "7px 16px",
                borderRadius: 20,
                border: active ? `1.5px solid ${pillColor}` : `1px solid ${C.glassBorder}`,
                background: active ? `${pillColor}1a` : "transparent",
                color: active ? pillColor : C.muted,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.2s ease",
              }}
            >
              {ch}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, padding: "0 20px 32px" }}>
        {loading ? (
          <LoadingSkeleton />
        ) : filtered.length === 0 ? (
          /* ── Empty State ── */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 80,
              gap: 16,
              animation: "fadeSlideUp 0.4s ease",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: C.surface,
                border: `1px solid ${C.glassBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconAntenna size={34} color={C.muted} />
            </div>
            <p
              style={{
                color: C.text,
                fontSize: 16,
                fontWeight: 600,
                textAlign: "center",
                margin: 0,
              }}
            >
              No activity yet
            </p>
            <p
              style={{
                color: C.muted,
                fontSize: 14,
                textAlign: "center",
                margin: 0,
                lineHeight: 1.5,
                maxWidth: 260,
              }}
            >
              {chainFilter !== "All"
                ? `No ${chainFilter} activity to show. Try switching filters.`
                : "Drop or crack orbs to see the feed light up."}
            </p>
          </div>
        ) : (
          /* ── Feed Cards ── */
          <div>
            {filtered.map((item, idx) => (
              <ActivityCard
                key={item.id}
                item={item}
                index={idx}
                isNew={newIds.has(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
