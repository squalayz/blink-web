"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";
import type { UserProfile } from "@/lib/theme";
import GlassCard from "@/components/GlassCard";
import { useIsDesktop } from "@/hooks/useIsDesktop";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type Period = "weekly" | "monthly" | "all_time";
type Category = "earnings" | "orbs_found" | "orbs_dropped" | "score" | "tasks";

interface LeaderboardEntry extends UserProfile {
  rank: number;
  metricValue: number;
}

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */
const PERIODS: Array<{ key: Period; label: string }> = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "all_time", label: "All Time" },
];

const CATEGORIES: Array<{ key: Category; label: string; field: string }> = [
  { key: "earnings", label: "Earnings", field: "total_earned" },
  { key: "orbs_found", label: "Watchers", field: "orbs_found" },
  { key: "orbs_dropped", label: "Spawners", field: "orbs_dropped" },
  { key: "score", label: "Score", field: "mm_score" },
  { key: "tasks", label: "Tasks", field: "reputation" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function getTier(score: number): { label: string; color: string } {
  if (score >= 1000) return { label: "Legend", color: C.accent };
  if (score >= 500) return { label: "Elite", color: C.gold };
  if (score >= 200) return { label: "Veteran", color: C.primary };
  if (score >= 50) return { label: "Watcher", color: C.rareBlue };
  return { label: "Newcomer", color: C.muted };
}

function formatMetric(value: number, category: Category): string {
  if (category === "earnings") return `$${value.toFixed(2)}`;
  return value.toLocaleString();
}

function getInitials(profile: UserProfile): string {
  return (profile.display_name || profile.handle || "?")
    .slice(0, 2)
    .toUpperCase();
}

function getWeekEnd(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 0 : 7 - day;
  const end = new Date(now);
  end.setUTCDate(now.getUTCDate() + diff);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0d 0h 0m";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${d}d ${h}h ${m}m`;
}

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                           */
/* ------------------------------------------------------------------ */
function TrophyIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 21h8m-4-4v4m-5-8c-1.5-.5-3-1.5-3-4V4h16v5c0 2.5-1.5 3.5-3 4m-5 0c-1.7 0-3.2-.8-4.2-2M12 13c1.7 0 3.2-.8 4.2-2"
        stroke={C.gold}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrownIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 16 / 22)}
      viewBox="0 0 22 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 15L4 6L8.5 11L11 2L13.5 11L18 6L21 15H1Z"
        fill={C.gold}
        stroke={C.gold}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */
function AvatarCircle({
  profile,
  size,
  fontSize,
  borderColor,
}: {
  profile: UserProfile;
  size: number;
  fontSize: number;
  borderColor?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: profile.avatar_url
          ? `url(${profile.avatar_url}) center/cover`
          : `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize,
        fontWeight: 700,
        color: "#fff",
        border: borderColor
          ? `2px solid ${borderColor}`
          : `1px solid ${C.primary}40`,
      }}
    >
      {!profile.avatar_url && getInitials(profile)}
    </div>
  );
}

function TierBadge({ score }: { score: number }) {
  const tier = getTier(score);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 7px",
        borderRadius: 10,
        background: `${tier.color}18`,
        border: `1px solid ${tier.color}40`,
        fontSize: 10,
        fontWeight: 700,
        color: tier.color,
        letterSpacing: 0.3,
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      {tier.label}
    </span>
  );
}

function SkeletonBlock({
  width,
  height,
  borderRadius = 8,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: `linear-gradient(90deg, ${C.glass} 25%, rgba(255,255,255,0.08) 50%, ${C.glass} 75%)`,
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
    />
  );
}

function LoadingSkeleton({ isDesktop }: { isDesktop: boolean }) {
  return (
    <div style={{ padding: isDesktop ? "0" : "0 16px" }}>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      {/* Prize banner skeleton */}
      <div style={{ marginBottom: 20 }}>
        <SkeletonBlock width="100%" height={80} borderRadius={20} />
      </div>
      {/* Podium skeleton */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: isDesktop ? 16 : 10,
          marginBottom: 24,
        }}
      >
        <SkeletonBlock
          width={isDesktop ? 160 : 100}
          height={isDesktop ? 160 : 110}
          borderRadius={16}
        />
        <SkeletonBlock
          width={isDesktop ? 180 : 110}
          height={isDesktop ? 200 : 140}
          borderRadius={16}
        />
        <SkeletonBlock
          width={isDesktop ? 160 : 100}
          height={isDesktop ? 130 : 90}
          borderRadius={16}
        />
      </div>
      {/* List skeleton */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <SkeletonBlock width="100%" height={isDesktop ? 68 : 60} borderRadius={12} />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "60px 24px",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: C.glass,
          border: `1px solid ${C.glassBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        <TrophyIcon size={28} />
      </div>
      <p
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: C.text,
          margin: "0 0 6px",
        }}
      >
        No rankings yet
      </p>
      <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>
        Start watching, spawning, and completing tasks to appear on
        The Council.
      </p>
    </div>
  );
}

function WeeklyPrizeBanner({
  countdown,
  isDesktop,
}: {
  countdown: string;
  isDesktop: boolean;
}) {
  return (
    <GlassCard
      style={{
        marginBottom: 20,
        padding: isDesktop ? "16px 24px" : "14px 16px",
        border: `1px solid ${C.gold}40`,
        background: `linear-gradient(135deg, ${C.gold}0a, ${C.glass})`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Gold shimmer line at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isDesktop ? 16 : 12,
        }}
      >
        <div
          style={{
            width: isDesktop ? 48 : 40,
            height: isDesktop ? 48 : 40,
            borderRadius: 12,
            background: `${C.gold}18`,
            border: `1px solid ${C.gold}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <TrophyIcon size={isDesktop ? 26 : 22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: isDesktop ? 11 : 10,
              fontWeight: 700,
              letterSpacing: 1.5,
              color: C.gold,
              margin: "0 0 3px",
              textTransform: "uppercase",
            }}
          >
            WEEKLY PRIZE
          </p>
          <p
            style={{
              fontSize: isDesktop ? 15 : 13,
              fontWeight: 600,
              color: C.text,
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Top Watcher wins a Legendary 0.1 ETH Creature
          </p>
        </div>
        <div
          style={{
            textAlign: "right",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              fontSize: 10,
              color: C.muted,
              margin: "0 0 2px",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Ends in
          </p>
          <p
            style={{
              fontSize: isDesktop ? 16 : 14,
              fontWeight: 700,
              color: C.gold,
              margin: 0,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {countdown}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

function PodiumSection({
  entries,
  category,
  currentUserId,
  onTap,
  isDesktop,
}: {
  entries: LeaderboardEntry[];
  category: Category;
  currentUserId?: string;
  onTap: (id: string) => void;
  isDesktop: boolean;
}) {
  if (entries.length === 0) return null;

  // Ensure we always have 3 slots, fill missing with null
  const slots: (LeaderboardEntry | null)[] = [
    entries[1] ?? null, // #2 left
    entries[0] ?? null, // #1 center
    entries[2] ?? null, // #3 right
  ];

  // Desktop sizes are bigger
  const heights = isDesktop ? [160, 200, 130] : [110, 140, 90];
  const widths = isDesktop ? [170, 190, 170] : [105, 120, 105];

  const rankColors = [
    "#CBD5E1", // silver for #2
    C.gold,    // gold for #1
    "#CD7F32", // bronze for #3
  ];
  const ranks = [2, 1, 3];
  const avatarSizes = isDesktop ? [60, 76, 56] : [44, 56, 40];
  const avatarFontSizes = isDesktop ? [18, 22, 16] : [14, 18, 13];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: isDesktop ? 16 : 10,
        marginBottom: isDesktop ? 32 : 24,
        paddingTop: isDesktop ? 36 : 28,
      }}
    >
      {slots.map((entry, idx) => {
        if (!entry) {
          return (
            <div
              key={`empty-${idx}`}
              style={{
                width: widths[idx],
                height: heights[idx],
                borderRadius: 16,
                background: C.cardSolid,
                border: `1px solid ${C.glassBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 13, color: C.muted }}>--</span>
            </div>
          );
        }

        const rank = ranks[idx];
        const isCurrentUser = currentUserId === entry.id;
        const accentColor = rankColors[idx];
        const isCenter = idx === 1;

        return (
          <div
            key={entry.id}
            onClick={() => onTap(entry.id)}
            style={{
              width: widths[idx],
              height: heights[idx],
              borderRadius: 16,
              background: C.cardSolid,
              border: `1.5px solid ${isCurrentUser ? C.primary : accentColor}40`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              padding: isDesktop ? "0 12px 16px" : "0 8px 12px",
              position: "relative",
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${accentColor}20`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
          >
            {/* Crown for #1 */}
            {rank === 1 && (
              <div
                style={{
                  position: "absolute",
                  top: isDesktop ? -18 : -14,
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
              >
                <CrownIcon size={isDesktop ? 28 : 22} />
              </div>
            )}

            {/* Rank badge */}
            <div
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                width: isDesktop ? 26 : 22,
                height: isDesktop ? 26 : 22,
                borderRadius: "50%",
                background: `${accentColor}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isDesktop ? 13 : 11,
                fontWeight: 800,
                color: accentColor,
              }}
            >
              {rank}
            </div>

            {/* Avatar */}
            <AvatarCircle
              profile={entry}
              size={avatarSizes[idx]}
              fontSize={avatarFontSizes[idx]}
              borderColor={`${accentColor}80`}
            />

            {/* Name */}
            <p
              style={{
                fontSize: isCenter ? (isDesktop ? 15 : 13) : (isDesktop ? 13 : 12),
                fontWeight: 700,
                color: C.text,
                margin: "6px 0 0",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: widths[idx] - 20,
                textAlign: "center",
              }}
            >
              {entry.display_name || entry.handle || "Anon"}
            </p>

            {/* Metric */}
            <p
              style={{
                fontSize: isCenter ? (isDesktop ? 20 : 16) : (isDesktop ? 17 : 14),
                fontWeight: 800,
                color: accentColor,
                margin: "2px 0 0",
              }}
            >
              {formatMetric(entry.metricValue, category)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function RankedRow({
  entry,
  category,
  isCurrentUser,
  isEven,
  onClick,
  isDesktop,
}: {
  entry: LeaderboardEntry;
  category: Category;
  isCurrentUser: boolean;
  isEven: boolean;
  onClick: () => void;
  isDesktop: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const tier = getTier(entry.mm_score ?? 0);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        padding: isDesktop ? "14px 20px" : "12px 14px",
        background: hovered
          ? C.s2
          : isEven
          ? C.cardSolid
          : C.glass,
        borderRadius: 12,
        border: isCurrentUser
          ? `1.5px solid ${C.primary}`
          : hovered
          ? `1px solid ${C.glassBorder}`
          : `1px solid ${C.glassBorder}`,
        borderLeft: hovered
          ? `3px solid ${C.primary}`
          : isCurrentUser
          ? `3px solid ${C.primary}`
          : `1px solid ${C.glassBorder}`,
        gap: isDesktop ? 16 : 12,
        cursor: "pointer",
        transition: "background 0.15s ease, border-color 0.15s ease",
      }}
    >
      {/* Rank */}
      <span
        style={{
          width: isDesktop ? 32 : 28,
          textAlign: "center",
          fontSize: isDesktop ? 15 : 14,
          fontWeight: 700,
          color: C.muted,
          flexShrink: 0,
        }}
      >
        {entry.rank}
      </span>

      {/* Avatar */}
      <AvatarCircle
        profile={entry}
        size={isDesktop ? 44 : 40}
        fontSize={isDesktop ? 15 : 14}
      />

      {/* Name + handle + (desktop: tier badge) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "nowrap",
          }}
        >
          <p
            style={{
              fontSize: isDesktop ? 15 : 14,
              fontWeight: 600,
              color: isCurrentUser ? C.primary : C.text,
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {entry.display_name || entry.handle || "Anonymous"}
          </p>
          {isDesktop && <TierBadge score={entry.mm_score ?? 0} />}
        </div>
        {isDesktop ? (
          entry.handle ? (
            <p
              style={{
                fontSize: 12,
                color: C.muted,
                margin: "2px 0 0",
              }}
            >
              @{entry.handle}
            </p>
          ) : null
        ) : (
          entry.handle && (
            <p
              style={{
                fontSize: 12,
                color: C.muted,
                margin: "1px 0 0",
              }}
            >
              @{entry.handle}
            </p>
          )
        )}
      </div>

      {/* Desktop: tier badge column for mobile (no tier shown inline on mobile) */}
      {!isDesktop && (
        <TierBadge score={entry.mm_score ?? 0} />
      )}

      {/* Metric */}
      <span
        style={{
          fontSize: isDesktop ? 16 : 15,
          fontWeight: 700,
          color: isCurrentUser ? C.primary : C.text,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {formatMetric(entry.metricValue, category)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function LeaderboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDesktop } = useIsDesktop();

  const [period, setPeriod] = useState<Period>("weekly");
  const [category, setCategory] = useState<Category>("earnings");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState("");
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Countdown timer
  useEffect(() => {
    function tick() {
      const ms = getWeekEnd().getTime() - Date.now();
      setCountdown(formatCountdown(ms));
    }
    tick();
    const iv = setInterval(tick, 60000);
    return () => clearInterval(iv);
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    const cat = CATEGORIES.find((c) => c.key === category)!;
    const field = cat.field;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order(field, { ascending: false, nullsFirst: false })
      .limit(50);

    if (error || !data) {
      setLoading(false);
      return;
    }

    const ranked: LeaderboardEntry[] = (data as UserProfile[]).map((p, i) => ({
      ...p,
      rank: i + 1,
      metricValue:
        ((p as unknown) as Record<string, number>)[field] ?? 0,
    }));

    setEntries(ranked);
    setLoading(false);
  }, [category]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
        paddingBottom: 100,
      }}
    >
      {/* Inject hover/shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* ---- Header ---- */}
      <div
        style={{
          padding: isDesktop ? "20px 0 16px" : "56px 20px 16px",
          textAlign: "center",
          maxWidth: isDesktop ? 800 : "100%",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: isDesktop ? 32 : 28,
            fontWeight: 800,
            color: C.text,
            letterSpacing: "-0.5px",
            margin: 0,
          }}
        >
          The Council
        </h1>
      </div>

      {/* ---- Content wrapper — centered on desktop ---- */}
      <div
        style={{
          maxWidth: isDesktop ? 800 : "100%",
          margin: "0 auto",
          padding: isDesktop ? "0 24px" : "0 16px",
        }}
      >
        {/* ---- Weekly Prize Banner ---- */}
        <WeeklyPrizeBanner countdown={countdown} isDesktop={isDesktop} />

        {/* ---- Period Selector ---- */}
        <div
          style={{
            display: "flex",
            gap: isDesktop ? 10 : 8,
            marginBottom: isDesktop ? 16 : 14,
            justifyContent: "center",
          }}
        >
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: isDesktop ? "9px 22px" : "8px 18px",
                borderRadius: 20,
                border: period === p.key ? "none" : `1px solid ${C.glassBorder}`,
                background:
                  period === p.key ? C.primary : C.glass,
                color: period === p.key ? "#fff" : C.muted,
                fontSize: isDesktop ? 14 : 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* ---- Category Pills ---- */}
        <div
          ref={categoryScrollRef}
          style={{
            display: "flex",
            gap: isDesktop ? 10 : 8,
            overflowX: "auto",
            marginBottom: isDesktop ? 24 : 20,
            paddingBottom: 4,
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            justifyContent: isDesktop ? "center" : "flex-start",
          }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              style={{
                padding: isDesktop ? "8px 20px" : "7px 16px",
                borderRadius: 20,
                border:
                  category === cat.key
                    ? `1.5px solid ${C.accent}`
                    : `1px solid ${C.glassBorder}`,
                background:
                  category === cat.key ? `${C.accent}14` : C.glass,
                color: category === cat.key ? C.accent : C.muted,
                fontSize: isDesktop ? 14 : 13,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                transition: "all 0.2s",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* ---- Loading ---- */}
        {loading && <LoadingSkeleton isDesktop={isDesktop} />}

        {/* ---- Empty State ---- */}
        {!loading && entries.length === 0 && <EmptyState />}

        {/* ---- Podium (top 3) ---- */}
        {!loading && topThree.length > 0 && (
          <PodiumSection
            entries={topThree}
            category={category}
            currentUserId={user?.id}
            onTap={(id) => router.push(`/profile/${id}`)}
            isDesktop={isDesktop}
          />
        )}

        {/* ---- Ranked List (#4 onward) ---- */}
        {!loading && rest.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: isDesktop ? 8 : 6,
            }}
          >
            {rest.map((entry, i) => (
              <RankedRow
                key={entry.id}
                entry={entry}
                category={category}
                isCurrentUser={user?.id === entry.id}
                isEven={i % 2 === 0}
                onClick={() => router.push(`/profile/${entry.id}`)}
                isDesktop={isDesktop}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
