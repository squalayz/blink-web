"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";
import type { UserProfile, Orb, OrbRarity, OrbCurrency } from "@/lib/theme";
import GlassCard from "@/components/GlassCard";
import SettingsSheet from "@/components/SettingsSheet";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/* ------------------------------------------------------------------ */
/*  Tier helpers                                                        */
/* ------------------------------------------------------------------ */
type Tier = { label: string; color: string; bg: string };

function getTier(score: number): Tier {
  if (score >= 1000)
    return { label: "Legend", color: "#EF4444", bg: "rgba(239,68,68,0.12)" };
  if (score >= 500)
    return { label: "Elite", color: C.gold, bg: "rgba(245,158,11,0.12)" };
  if (score >= 200)
    return { label: "Veteran", color: C.primary, bg: "rgba(99,102,241,0.12)" };
  if (score >= 50)
    return { label: "Hunter", color: C.accent, bg: "rgba(20,241,149,0.12)" };
  return { label: "Newcomer", color: C.muted, bg: "rgba(156,163,175,0.10)" };
}

function rarityColor(r: string): string {
  if (r === "Legendary") return C.gold;
  if (r === "Rare") return C.rareBlue;
  return "#ffffff";
}

function currencyColor(c: string): string {
  if (c === "BTC") return C.btcOrange;
  if (c === "ETH") return C.ethBlue;
  return C.primary;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncAddr(addr: string): string {
  if (!addr || addr.length <= 12) return addr || "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/* ------------------------------------------------------------------ */
/*  Inline SVG Icons (no emojis, no lucide for stat cards)              */
/* ------------------------------------------------------------------ */
function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function FireStreakIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={C.accent} stroke="none">
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 12c0 4.97 3.018 9.217 7.322 11.014.638.266 1.318.266 1.956 0C16.58 21.217 19.6 16.97 19.6 12c0-.98-.12-1.935-.345-2.848l.363-.168z" />
      <path d="M9 12l2 2 4-4" stroke="#0A0A0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Keyframe injection                                                  */
/* ------------------------------------------------------------------ */
const KEYFRAMES = `
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
`;

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */
function AnimatedStatCard({
  icon,
  label,
  value,
  accent,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
  delay: number;
}) {
  return (
    <GlassCard
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "18px 12px",
        animation: `fadeSlideUp 0.5s ease ${delay}s both`,
      }}
    >
      <div style={{ color: accent, marginBottom: 2 }}>{icon}</div>
      <span
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: accent,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 11,
          color: C.muted,
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </GlassCard>
  );
}

function OrbRow({ orb }: { orb: Orb }) {
  const rc = rarityColor(orb.rarity);
  const cc = currencyColor(orb.currency);
  const dateStr = orb.dropped_at ? fmtDate(orb.dropped_at) : "";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "12px 14px",
        background: C.glass,
        borderRadius: 14,
        border: `1px solid ${C.glassBorder}`,
        gap: 10,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: cc,
          background: `${cc}18`,
          border: `1px solid ${cc}40`,
          borderRadius: 6,
          padding: "2px 8px",
          minWidth: 36,
          textAlign: "center",
        }}
      >
        {orb.currency}
      </span>
      <span style={{ color: C.text, fontWeight: 600, fontSize: 14, flex: 1 }}>
        {orb.amount} {orb.currency}
      </span>
      <span style={{ fontSize: 11, color: rc, fontWeight: 600 }}>
        {orb.rarity}
      </span>
      <span
        style={{
          fontSize: 11,
          color:
            orb.status === "claimed" || orb.status === "cracked"
              ? C.accent
              : orb.status === "pending"
              ? C.gold
              : C.muted,
          textTransform: "capitalize",
          minWidth: 54,
          textAlign: "right",
        }}
      >
        {orb.status}
      </span>
      <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>
        {dateStr}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [droppedOrbs, setDroppedOrbs] = useState<Orb[]>([]);
  const [claimedOrbs, setClaimedOrbs] = useState<Orb[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<"drops" | "claims" | "moments">(
    "drops"
  );
  const [showSettings, setShowSettings] = useState(false);

  /* redirect if unauthenticated */
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  /* fetch data */
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);

    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (prof) setProfile(prof as UserProfile);

    const { data: drops } = await supabase
      .from("orbs")
      .select("*")
      .eq("dropper_id", user.id)
      .order("dropped_at", { ascending: false })
      .limit(30);

    if (drops) setDroppedOrbs(drops as Orb[]);

    const { data: claims } = await supabase
      .from("orbs")
      .select("*")
      .eq("claimed_by", user.id)
      .order("dropped_at", { ascending: false })
      .limit(30);

    if (claims) setClaimedOrbs(claims as Orb[]);

    setLoadingData(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  /* sign out */
  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  /* ---- Loading / guard ---- */
  if (authLoading || loadingData) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
        }}
      >
        <style>{KEYFRAMES}</style>
        <div
          style={{
            width: 32,
            height: 32,
            border: `3px solid ${C.glassBorder}`,
            borderTopColor: C.primary,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  if (!user || !profile) return null;

  const score = profile.mm_score ?? 0;
  const tier = getTier(score);
  const streak = profile.current_streak ?? 0;
  const initials = (profile.display_name || profile.handle || "?")
    .slice(0, 2)
    .toUpperCase();

  const isLive = true; // future: derive from last_active_at
  const tabs: Array<{ key: "drops" | "claims" | "moments"; label: string }> = [
    { key: "drops", label: "Drops" },
    { key: "claims", label: "Claims" },
    { key: "moments", label: "Moments" },
  ];
  const listOrbs = activeTab === "drops" ? droppedOrbs : activeTab === "claims" ? claimedOrbs : [];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: FONT,
        paddingBottom: 100,
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* ============================================================ */}
      {/*  TOP NAV: Gear (left) + Trophy (right)                       */}
      {/* ============================================================ */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "52px 16px 0",
        }}
      >
        <button
          onClick={() => setShowSettings(true)}
          style={{
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: `1px solid ${C.glassBorder}`,
            borderRadius: 12,
            padding: 8,
            cursor: "pointer",
            color: C.muted,
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Settings"
        >
          <GearIcon />
        </button>

        <button
          onClick={() => router.push("/leaderboard")}
          style={{
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: `1px solid ${C.glassBorder}`,
            borderRadius: 12,
            padding: 8,
            cursor: "pointer",
            color: C.gold,
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Leaderboard"
        >
          <TrophyIcon />
        </button>
      </div>

      {/* ============================================================ */}
      {/*  HERO HEADER: Gradient bg + Avatar + Score badge              */}
      {/* ============================================================ */}
      <div
        style={{
          background: `linear-gradient(180deg, ${C.primary}30 0%, transparent 100%)`,
          height: 200,
          position: "relative",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: -48,
          position: "relative",
          zIndex: 5,
        }}
      >
        {/* Avatar */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: profile.avatar_url
                ? `url(${profile.avatar_url}) center/cover`
                : `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
              color: "#fff",
              border: `3px solid ${C.bg}`,
              boxShadow: `0 0 0 2px ${C.primary}60`,
              flexShrink: 0,
            }}
          >
            {!profile.avatar_url && initials}
          </div>

          {/* Score badge overlay */}
          <div
            style={{
              position: "absolute",
              bottom: -4,
              right: -4,
              background: tier.bg,
              border: `2px solid ${tier.color}`,
              borderRadius: 10,
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 800,
              color: tier.color,
              whiteSpace: "nowrap",
            }}
          >
            {score}
          </div>
        </div>

        {/* ============================================================ */}
        {/*  IDENTITY: Name, Handle, Vibe, Followers                     */}
        {/* ============================================================ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            marginTop: 14,
            padding: "0 20px",
          }}
        >
          {/* Display name + verified */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: C.text,
              }}
            >
              {profile.display_name || profile.handle || "Anonymous"}
            </span>
            {profile.is_verified && <VerifiedIcon />}
          </div>

          {/* Handle */}
          {profile.handle && (
            <span style={{ fontSize: 14, color: C.muted }}>
              @{profile.handle}
            </span>
          )}

          {/* Vibe line */}
          {profile.vibe_line && (
            <p
              style={{
                fontStyle: "italic",
                color: C.muted,
                fontSize: 13,
                textAlign: "center",
                maxWidth: 280,
                marginTop: 4,
                lineHeight: 1.4,
              }}
            >
              &ldquo;{profile.vibe_line}&rdquo;
            </p>
          )}

          {/* Follower / Following */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginTop: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                {(profile.follower_count ?? 0).toLocaleString()}
              </span>
              <span style={{ fontSize: 11, color: C.muted }}>Followers</span>
            </div>
            <div
              style={{
                width: 1,
                height: 24,
                background: C.glassBorder,
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                {(profile.following_count ?? 0).toLocaleString()}
              </span>
              <span style={{ fontSize: 11, color: C.muted }}>Following</span>
            </div>
          </div>

          {/* ============================================================ */}
          {/*  Live / Ghost status pill                                     */}
          {/* ============================================================ */}
          <div
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: isLive ? "rgba(20,241,149,0.10)" : "rgba(156,163,175,0.10)",
              border: `1px solid ${isLive ? C.accent : C.muted}30`,
              borderRadius: 20,
              padding: "4px 12px",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isLive ? C.accent : C.muted,
                animation: isLive ? "pulse 2s ease-in-out infinite" : "none",
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: isLive ? C.accent : C.muted,
              }}
            >
              {isLive ? "Live" : "Ghost"}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  BODY CONTENT                                                 */}
      {/* ============================================================ */}
      <div style={{ padding: "20px 16px 0" }}>
        {/* ============================================================ */}
        {/*  SCORE SECTION (GlassCard)                                   */}
        {/* ============================================================ */}
        <GlassCard
          style={{
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 18px",
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 4,
                fontWeight: 600,
              }}
            >
              MishMesh Score
            </p>
            <p
              style={{
                fontSize: 38,
                fontWeight: 800,
                color: C.text,
                lineHeight: 1,
              }}
            >
              {score.toLocaleString()}
            </p>
            {/* Streak line */}
            {streak > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 8,
                }}
              >
                <span style={{ color: C.gold }}>
                  <FireStreakIcon />
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: C.gold,
                  }}
                >
                  {streak} day streak
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 8,
            }}
          >
            {/* Tier badge */}
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: tier.color,
                background: tier.bg,
                border: `1px solid ${tier.color}40`,
                borderRadius: 10,
                padding: "6px 16px",
              }}
            >
              {tier.label}
            </span>

            {/* Verification level */}
            {profile.is_verified && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <VerifiedIcon />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.accent,
                  }}
                >
                  Verified
                </span>
              </div>
            )}
          </div>
        </GlassCard>

        {/* ============================================================ */}
        {/*  ANIMATED STATS CARDS (2x2 grid)                             */}
        {/* ============================================================ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <AnimatedStatCard
            icon={<DollarIcon />}
            label="Earned"
            value={`$${(profile.total_earned ?? 0).toFixed(2)}`}
            accent={C.accent}
            delay={0}
          />
          <AnimatedStatCard
            icon={<LightningIcon />}
            label="Cracked"
            value={profile.orbs_found ?? 0}
            accent={C.primary}
            delay={0.08}
          />
          <AnimatedStatCard
            icon={<FlameIcon />}
            label="Dropped"
            value={profile.orbs_dropped ?? 0}
            accent={C.gold}
            delay={0.16}
          />
          <AnimatedStatCard
            icon={<FireStreakIcon />}
            label="Streak"
            value={`${streak}d`}
            accent={C.accent}
            delay={0.24}
          />
        </div>

        {/* ============================================================ */}
        {/*  WALLET QUICK SECTION (GlassCard)                            */}
        {/* ============================================================ */}
        {(profile.sol_address || profile.eth_address || profile.btc_address) && (
          <GlassCard style={{ marginBottom: 14, padding: "16px 18px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                }}
              >
                Wallets
              </span>
              <button
                onClick={() => router.push("/wallet")}
                style={{
                  background: `${C.primary}18`,
                  border: `1px solid ${C.primary}40`,
                  borderRadius: 8,
                  padding: "6px 14px",
                  cursor: "pointer",
                  color: C.primary,
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <WalletIcon />
                Open Wallet
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {profile.sol_address && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 0",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: C.solPurple,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: C.solPurple,
                      minWidth: 30,
                    }}
                  >
                    SOL
                  </span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: C.muted,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {truncAddr(profile.sol_address)}
                  </span>
                </div>
              )}
              {profile.eth_address && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 0",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: C.ethBlue,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: C.ethBlue,
                      minWidth: 30,
                    }}
                  >
                    ETH
                  </span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: C.muted,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {truncAddr(profile.eth_address)}
                  </span>
                </div>
              )}
              {profile.btc_address && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 0",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: C.btcOrange,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: C.btcOrange,
                      minWidth: 30,
                    }}
                  >
                    BTC
                  </span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: C.muted,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {truncAddr(profile.btc_address)}
                  </span>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {/* ============================================================ */}
        {/*  BIO + INTEREST TAGS                                         */}
        {/* ============================================================ */}
        {profile.bio && (
          <GlassCard style={{ marginBottom: 14, padding: "16px 18px" }}>
            <p
              style={{
                fontSize: 11,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Bio
            </p>
            <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>
              {profile.bio}
            </p>
          </GlassCard>
        )}

        {profile.interest_tags && profile.interest_tags.length > 0 && (
          <div
            style={{
              marginBottom: 14,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {profile.interest_tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.primary,
                  background: `${C.primary}15`,
                  border: `1px solid ${C.primary}35`,
                  borderRadius: 20,
                  padding: "5px 14px",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ============================================================ */}
        {/*  CONTENT TABS: Drops | Claims | Moments                      */}
        {/* ============================================================ */}
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${C.glassBorder}`,
            marginBottom: 14,
          }}
        >
          {tabs.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  border: "none",
                  borderBottom: isActive
                    ? `2px solid ${C.primary}`
                    : "2px solid transparent",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  background: "transparent",
                  color: isActive ? C.text : C.muted,
                  transition: "color 0.2s, border-color 0.2s",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ---- Tab Content ---- */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {activeTab === "moments" ? (
            <p
              style={{
                color: C.muted,
                fontSize: 14,
                textAlign: "center",
                padding: "32px 0",
              }}
            >
              No moments yet.
            </p>
          ) : listOrbs.length === 0 ? (
            <p
              style={{
                color: C.muted,
                fontSize: 14,
                textAlign: "center",
                padding: "32px 0",
              }}
            >
              {activeTab === "drops"
                ? "No orbs dropped yet."
                : "No orbs claimed yet."}
            </p>
          ) : (
            listOrbs.map((orb) => <OrbRow key={orb.id} orb={orb} />)
          )}
        </div>

        {/* ============================================================ */}
        {/*  EDIT PROFILE BUTTON                                         */}
        {/* ============================================================ */}
        <button
          onClick={() => router.push("/profile/edit")}
          style={{
            marginTop: 24,
            width: "100%",
            padding: "14px 0",
            borderRadius: 14,
            border: `1px solid ${C.primary}40`,
            background: `${C.primary}12`,
            color: C.primary,
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <EditIcon />
          Edit Profile
        </button>
      </div>

      <SettingsSheet isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
