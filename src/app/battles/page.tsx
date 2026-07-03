"use client";

// Battles tab — the web mirror of the iOS app's BattlesTabView.swift
// (nav-titled "Friends"): trophy header with tier badge + wallet pills,
// the code-join express lane, RANKS, gifts banner, friend requests,
// the Discover banner, and the friends list. Every section is backed by
// real data: profiles (trophy_rating, battles_won/lost, trainer_points,
// candy), gifts, friendships APIs and the leaderboard API. The app's
// live duel engine (QuickBattle/Rift/Showdown) is app-only — entering a
// friend's code routes through the universal-link battle landing.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { C, FONT_DISPLAY, glassCard } from "@/lib/theme";

const PINK = "#ff8099"; // (1, 0.5, 0.6) — losses
const GIFT_PINK = "#ff8cd9"; // (1, 0.55, 0.85)
const GOLD = "#ffd166"; // (1, 0.82, 0.4)

/* The app's TrophyTier ladder (BattleSystems.swift). */
function tierFrom(rating: number): { label: string; tint: string } {
  if (rating < 1200) return { label: "Bronze", tint: "#cf8033" };
  if (rating < 1500) return { label: "Silver", tint: "#c7d4e6" };
  if (rating < 1800) return { label: "Gold", tint: "#ffcc4d" };
  if (rating < 2200) return { label: "Platinum", tint: "#8cf2f2" };
  if (rating < 2600) return { label: "Diamond", tint: "#a6ccff" };
  return { label: "Mythic", tint: "#ff8ae0" };
}

interface FriendEntry {
  friendship_id: string;
  user_id: string;
  handle: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface SearchResult {
  user_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface LeaderRow {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  mm_score: number | null;
}

async function authHeader(): Promise<Record<string, string> | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : null;
}

function Avatar({ url, name, size = 44 }: { url: string | null; name: string; size?: number }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid rgba(255,255,255,0.12)" }}
    />
  ) : (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `${C.primary}26`,
        color: C.primary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 900,
        fontFamily: FONT_DISPLAY,
        flexShrink: 0,
      }}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

export default function BattlesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<{
    trophy_rating: number;
    battles_won: number;
    battles_lost: number;
    trainer_points: number;
    candy: number;
  } | null>(null);
  const [giftCount, setGiftCount] = useState(0);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendEntry[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [showRanks, setShowRanks] = useState(false);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth/signin");
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: prof }, { count }, headers] = await Promise.all([
      supabase
        .from("profiles")
        .select("trophy_rating, battles_won, battles_lost, trainer_points, candy")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("gifts").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).eq("status", "pending"),
      authHeader(),
    ]);
    setProfile({
      trophy_rating: (prof?.trophy_rating as number) ?? 1000,
      battles_won: (prof?.battles_won as number) ?? 0,
      battles_lost: (prof?.battles_lost as number) ?? 0,
      trainer_points: (prof?.trainer_points as number) ?? 0,
      candy: (prof?.candy as number) ?? 0,
    });
    if (typeof count === "number") setGiftCount(count);
    if (headers) {
      try {
        const res = await fetch("/api/friends/list", { headers });
        if (res.ok) {
          const data = await res.json();
          const fr: FriendEntry[] = data.friends ?? [];
          setFriends(fr);
          setIncoming(data.incoming ?? []);
          // Presence: a friend is "online" when their profile was seen in
          // the last 5 minutes (last_seen_at / last_active).
          if (fr.length > 0) {
            const { data: seen } = await supabase
              .from("profiles")
              .select("user_id, last_seen_at, last_active")
              .in("user_id", fr.map((f) => f.user_id));
            const cutoff = Date.now() - 5 * 60_000;
            setOnlineIds(
              new Set(
                (seen ?? [])
                  .filter((p) => {
                    const t = (p.last_seen_at as string) || (p.last_active as string);
                    return t && new Date(t).getTime() > cutoff;
                  })
                  .map((p) => p.user_id as string),
              ),
            );
          }
        }
      } catch {
        /* list is best-effort; sections stay empty */
      }
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(request_id: string, accept: boolean) {
    const headers = await authHeader();
    if (!headers) return;
    await fetch("/api/friends/respond", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ request_id, accept }),
    });
    load();
  }

  const onlineCount = useMemo(() => friends.filter((f) => onlineIds.has(f.user_id)).length, [friends, onlineIds]);

  if (authLoading || !user) return <div style={{ position: "fixed", inset: 0, background: C.bg }} />;

  const tier = tierFrom(profile?.trophy_rating ?? 1000);

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <main style={{ maxWidth: 540, margin: "0 auto", padding: "max(16px, env(safe-area-inset-top)) 16px 96px", display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Nav bar — "Friends" with chat + add-friend (the app's toolbar). */}
        <header style={{ display: "flex", alignItems: "center", paddingTop: 4 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, fontFamily: FONT_DISPLAY }}>Friends</h1>
          <span style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <Link href="/messages" aria-label="Chats" style={iconBtn()}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill={C.primary} aria-hidden>
                <path d="M2 8.4C2 6 4 4.2 6.5 4.2h5C14 4.2 16 6 16 8.4c0 2.4-2 4.2-4.5 4.2H8l-3.4 2.6c-.5.4-1.1 0-1.1-.6v-2.8C2.6 11 2 9.8 2 8.4Z" />
                <path d="M17.2 9.1c2.7.3 4.8 2.2 4.8 4.6 0 1.4-.7 2.6-1.7 3.4v2.4c0 .6-.7 1-1.2.6L16.4 18h-2c-1.9 0-3.6-1-4.3-2.5h1.4c3.2 0 5.8-2.3 5.8-5.3 0-.4 0-.8-.1-1.1Z" />
              </svg>
            </Link>
            <button onClick={() => setShowAdd(true)} aria-label="Add friend" style={{ ...iconBtn(), cursor: "pointer" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill={C.primary} aria-hidden>
                <path d="M10 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4 0-7.5 2-7.5 5v1a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-1c0-3-3.5-5-7.5-5Zm9.5-7.5a1 1 0 0 0-2 0V8H16a1 1 0 0 0 0 2h1.5v1.5a1 1 0 0 0 2 0V10H21a1 1 0 0 0 0-2h-1.5V6.5Z" />
              </svg>
            </button>
          </span>
        </header>

        {/* Trophy header. */}
        <section style={{ ...glassCard(22, tier.tint), padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <span style={{ position: "relative", width: 64, height: 64, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span aria-hidden style={{ position: "absolute", width: 84, height: 84, borderRadius: "50%", background: `${tier.tint}33`, filter: "blur(14px)" }} />
              <span
                style={{
                  position: "relative",
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)",
                  border: `2px solid ${tier.tint}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: tier.tint,
                  filter: `drop-shadow(0 0 8px ${tier.tint}b3)`,
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M6 3h12v2h3v3c0 2.5-2 4.5-4.4 4.9A6 6 0 0 1 13 16.9V19h3a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2h3v-2.1a6 6 0 0 1-3.6-4C5 12.5 3 10.5 3 8V5h3V3Zm-1 4v1c0 1.3.9 2.5 2 2.9V7H5Zm14 0h-2v3.9c1.1-.4 2-1.6 2-2.9V7Z" />
                </svg>
              </span>
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.22em", color: tier.tint }}>{tier.label.toUpperCase()}</span>
              <span style={{ fontSize: 26, fontWeight: 900, fontFamily: FONT_DISPLAY }}>{profile?.trophy_rating ?? 1000} RATING</span>
              <span style={{ display: "flex", gap: 10, fontSize: 11, fontWeight: 800 }}>
                <span style={{ color: C.primary, display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 2 14.5 4.3l3.4-.4 1 3.2 3 1.7-1.3 3.2 1.3 3.2-3 1.7-1 3.2-3.4-.4L12 22l-2.5-2.3-3.4.4-1-3.2-3-1.7L3.4 12 2.1 8.8l3-1.7 1-3.2 3.4.4L12 2Zm-1.2 13.5 5.4-5.4-1.4-1.4-4 4-1.8-1.8-1.4 1.4 3.2 3.2Z" />
                  </svg>
                  {profile?.battles_won ?? 0}W
                </span>
                <span style={{ color: PINK, display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm5 11H7v-2h10v2Z" />
                  </svg>
                  {profile?.battles_lost ?? 0}L
                </span>
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <WalletPill tint={C.primary} value={profile?.trainer_points ?? 0} label="TRAINER PTS" icon="bolt" />
            <WalletPill tint={GOLD} value={profile?.candy ?? 0} label="BATTLE CANDY" icon="sparkle" />
          </div>
        </section>

        {/* Quick actions — the code-join lane + RANKS. */}
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => setShowCode(true)} style={{ ...subheroBtn(), cursor: "pointer" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M9.5 3 8.3 9H4a1 1 0 0 0 0 2h3.9l-.8 4H3a1 1 0 0 0 0 2h3.7L6 21h2l.7-4h4L12 21h2l.7-4H19a1 1 0 0 0 0-2h-3.9l.8-4H20a1 1 0 0 0 0-2h-3.7l.7-6h-2l-.7 6h-4l.7-6h-2Zm1.6 8h4l-.8 4h-4l.8-4Z" />
            </svg>
            Enter a friend&apos;s code
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setShowRanks(true)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 8,
                padding: 14,
                borderRadius: 18,
                background: "rgba(18,18,26,0.66)",
                backdropFilter: "blur(22px)",
                WebkitBackdropFilter: "blur(22px)",
                border: `1px solid ${GOLD}66`,
                color: "#fff",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={GOLD} aria-hidden>
                <path d="M6 3h12v2h3v3c0 2.5-2 4.5-4.4 4.9A6 6 0 0 1 13 16.9V19h3a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2h3v-2.1a6 6 0 0 1-3.6-4C5 12.5 3 10.5 3 8V5h3V3Z" />
              </svg>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em" }}>RANKS</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: C.textSecondary }}>Top trainers</span>
            </button>
          </div>
        </section>

        {/* Gifts banner. */}
        {giftCount > 0 && (
          <Link href="/gifts" style={{ textDecoration: "none", color: "#fff" }}>
            <section
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                borderRadius: 16,
                background: "rgba(18,18,26,0.66)",
                border: `1px solid ${GIFT_PINK}66`,
              }}
            >
              <span style={{ width: 44, height: 44, borderRadius: "50%", background: `${GIFT_PINK}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={GIFT_PINK} aria-hidden>
                  <path d="M12 6a3 3 0 1 0-5.7-1.3C6.3 5.3 6.6 6 7 6H4a1 1 0 0 0-1 1v3h18V7a1 1 0 0 0-1-1h-3c.4 0 .7-.7.7-1.3A3 3 0 0 0 12 6Zm-1 6H4v8a1 1 0 0 0 1 1h6V12Zm2 9h6a1 1 0 0 0 1-1v-8h-7v9Z" />
                </svg>
              </span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>
                  {giftCount} gift{giftCount === 1 ? "" : "s"} waiting
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>Tap to open</span>
              </span>
              <Chevron />
            </section>
          </Link>
        )}

        {/* Friend requests. */}
        {incoming.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionHeader label="FRIEND REQUESTS" trailing={String(incoming.length)} />
            {incoming.map((r) => (
              <div key={r.friendship_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Avatar url={r.avatar_url} name={r.handle ?? "?"} />
                <span style={{ fontSize: 14, fontWeight: 800, fontFamily: FONT_DISPLAY, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.handle ?? "Trainer"}
                </span>
                <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button onClick={() => respond(r.friendship_id, true)} aria-label="Accept" style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: C.primary, color: "#000", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M4 12.5 9.5 18 20 6.5" />
                    </svg>
                  </button>
                  <button onClick={() => respond(r.friendship_id, false)} aria-label="Decline" style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </span>
              </div>
            ))}
          </section>
        )}

        {/* Discover banner. */}
        <Link href="/friends" style={{ textDecoration: "none", color: "#fff" }}>
          <section style={{ ...glassCard(18, C.primary), display: "flex", alignItems: "center", gap: 13, padding: 14 }}>
            <span style={{ width: 46, height: 46, borderRadius: "50%", background: `${C.primary}2e`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill={C.primary} aria-hidden>
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM5 9.5 7 8l2.5.5L11 7 9.5 5.2A8 8 0 0 1 19.7 10l-2.2.6-1.5 2.4.7 2.5 2.1.6A8 8 0 0 1 5.8 15l1.7-1.5-.5-2.5L5 9.5Z" />
              </svg>
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 800, fontFamily: FONT_DISPLAY }}>Discover trainers</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: C.textSecondary }}>Find players by state and connect</span>
            </span>
            <Chevron />
          </section>
        </Link>

        {/* Friends. */}
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionHeader label="FRIENDS" trailing={`${onlineCount} online`} />
          {friends.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "26px 20px", borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill={C.primary} aria-hidden>
                <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.4 0-8 2.2-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.8-3.6-5-8-5Zm8.5-2.5a3.5 3.5 0 1 0-2.6-5.9 6 6 0 0 1 .3 5.8c.7.1 1.5.1 2.3.1Zm.7 2.2c1.7.9 2.8 2.3 2.8 4.3v2a1 1 0 0 0 1-1v-1c0-2-1.6-3.6-3.8-4.3Z" />
              </svg>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: FONT_DISPLAY }}>Add your first friend</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: C.muted, maxWidth: 320 }}>
                Match your contacts, or search a username or Trainer Code, to chat, gift, hunt and battle together.
              </span>
              <Link
                href="/friends"
                style={{ marginTop: 4, width: "100%", maxWidth: 300, height: 44, borderRadius: 22, background: C.primary, color: "#000", fontSize: 13, fontWeight: 900, fontFamily: FONT_DISPLAY, letterSpacing: "0.08em", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
              >
                FIND FRIENDS
              </Link>
              <button
                onClick={() => setShowAdd(true)}
                style={{ width: "100%", maxWidth: 300, height: 44, borderRadius: 22, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT_DISPLAY, cursor: "pointer" }}
              >
                Add by username or code
              </button>
            </div>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textTertiary }}>
                Tap a friend to open · tap 💬 to chat from anywhere in the world
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {friends.map((f) => {
                  const online = onlineIds.has(f.user_id);
                  return (
                    <div key={f.friendship_id} style={{ position: "relative" }}>
                      <Link
                        href={f.handle ? `/u/${encodeURIComponent(f.handle)}` : "#"}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: 12,
                          paddingRight: 64,
                          borderRadius: 18,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          textDecoration: "none",
                          color: "#fff",
                        }}
                      >
                        <span style={{ position: "relative", flexShrink: 0 }}>
                          <Avatar url={f.avatar_url} name={f.handle ?? "?"} size={52} />
                          {online && (
                            <span style={{ position: "absolute", right: 0, bottom: 0, width: 12, height: 12, borderRadius: "50%", background: C.primary, border: `2px solid ${C.bg}` }} />
                          )}
                        </span>
                        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, fontFamily: FONT_DISPLAY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {f.handle ?? "Trainer"}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: online ? C.primary : C.textTertiary }}>
                            {online ? "Online now" : "Friends"}
                          </span>
                        </span>
                      </Link>
                      <Link
                        href={`/messages?user=${f.user_id}${f.handle ? `&handle=${encodeURIComponent(f.handle)}` : ""}`}
                        aria-label={`Chat with ${f.handle ?? "friend"}`}
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: C.primary,
                          boxShadow: `0 0 8px ${C.primary}80`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#000",
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M12 3C6.5 3 2 6.6 2 11c0 2.2 1.1 4.2 3 5.6V21l3.9-2.2c1 .2 2 .3 3.1.3 5.5 0 10-3.6 10-8S17.5 3 12 3Z" />
                        </svg>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </main>

      {showAdd && <AddFriendSheet onClose={() => setShowAdd(false)} onSent={load} />}
      {showRanks && <RanksSheet onClose={() => setShowRanks(false)} myId={user.id} />}
      {showCode && (
        <CodeSheet
          onClose={() => setShowCode(false)}
          onSubmit={(code) => {
            setShowCode(false);
            router.push(`/b/${encodeURIComponent(code)}`);
          }}
        />
      )}

      <style>{`
        @keyframes btSheetUp {
          from { transform: translateY(48px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function iconBtn(): React.CSSProperties {
  return {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
  };
}

function subheroBtn(): React.CSSProperties {
  return {
    width: "100%",
    height: 46,
    borderRadius: 23,
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(22px)",
    WebkitBackdropFilter: "blur(22px)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 800,
    fontFamily: FONT_DISPLAY,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  };
}

/* The app's walletPill — icon + value over a tracked uppercase label. */
function WalletPill({ tint, value, label, icon }: { tint: string; value: number; label: string; icon: "bolt" | "sparkle" }) {
  return (
    <span
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "8px 10px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.06)",
        border: `1px solid ${tint}66`,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill={tint} aria-hidden>
          {icon === "bolt" ? (
            <path d="M13.6 2.1c.5-.6 1.5-.2 1.4.6l-1 6.3h5c.65 0 1 .75.6 1.25L10.4 21.9c-.5.6-1.5.2-1.4-.6l1-6.3H5c-.65 0-1-.75-.6-1.25L13.6 2.1Z" />
          ) : (
            <path d="M12 2.5 13.8 8 19.5 9.8 13.8 11.5 12 17.2 10.2 11.5 4.5 9.8 10.2 8 12 2.5Z" />
          )}
        </svg>
        <span style={{ fontSize: 14, fontWeight: 900, fontFamily: FONT_DISPLAY, color: "#fff" }}>{value}</span>
      </span>
      <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.125em", color: C.textSecondary }}>{label}</span>
    </span>
  );
}

function SectionHeader({ label, trailing }: { label: string; trailing?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: C.textSecondary }}>{label}</span>
      {trailing && (
        <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 800, color: C.primary, background: `${C.primary}1a`, border: `1px solid ${C.primary}4d`, borderRadius: 999, padding: "3px 9px" }}>
          {trailing}
        </span>
      )}
    </div>
  );
}

function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ marginLeft: "auto", flexShrink: 0 }}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

/* Bottom sheet scaffold shared by the three sheets. */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 540,
          maxHeight: "82dvh",
          overflow: "auto",
          background: C.bg,
          borderRadius: "24px 24px 0 0",
          border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "none",
          padding: "10px 20px calc(24px + env(safe-area-inset-bottom, 0px))",
          animation: "btSheetUp 0.32s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        <span style={{ display: "block", width: 40, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.3)", margin: "0 auto 14px" }} />
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 900, fontFamily: FONT_DISPLAY, color: "#fff" }}>{title}</h2>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: C.primary, fontSize: 14, fontWeight: 800, fontFamily: FONT_DISPLAY, cursor: "pointer" }}>
            Done
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* The app's AddFriendView — search a username, send a request. */
function AddFriendSheet({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const headers = await authHeader();
      if (!headers) return;
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setResults(data.users ?? data.results ?? []);
        }
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  async function sendRequest(user_id: string) {
    const headers = await authHeader();
    if (!headers) return;
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ user_id }),
    });
    if (res.ok) {
      setSentTo((s) => new Set(s).add(user_id));
      onSent();
    }
  }

  return (
    <Sheet title="Add Friend" onClose={onClose}>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a username or Trainer Code"
        style={{
          width: "100%",
          height: 48,
          boxSizing: "border-box",
          padding: "0 16px",
          borderRadius: 14,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#fff",
          fontSize: 15,
          fontWeight: 600,
          outline: "none",
          fontFamily: "inherit",
          marginBottom: 14,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {searching && <span style={{ fontSize: 12, color: C.textTertiary }}>Searching…</span>}
        {results.map((r) => {
          const sent = sentTo.has(r.user_id);
          return (
            <div key={r.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, borderRadius: 14, background: "rgba(255,255,255,0.04)" }}>
              <Avatar url={r.avatar_url} name={r.handle ?? r.display_name ?? "?"} size={40} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.handle ?? r.display_name ?? "Trainer"}
              </span>
              <button
                onClick={() => sendRequest(r.user_id)}
                disabled={sent}
                style={{
                  marginLeft: "auto",
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "none",
                  background: sent ? "rgba(255,255,255,0.1)" : C.primary,
                  color: sent ? C.textSecondary : "#000",
                  fontSize: 12,
                  fontWeight: 900,
                  fontFamily: FONT_DISPLAY,
                  cursor: sent ? "default" : "pointer",
                }}
              >
                {sent ? "Sent" : "Add"}
              </button>
            </div>
          );
        })}
        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <span style={{ fontSize: 12, color: C.textTertiary }}>No trainers found.</span>
        )}
      </div>
    </Sheet>
  );
}

/* The app's LeaderboardView (Top Trainers). */
function RanksSheet({ onClose, myId }: { onClose: () => void; myId: string }) {
  const [rows, setRows] = useState<LeaderRow[] | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard?sort=mm_score&limit=50")
      .then((r) => r.json())
      .then((d) => setRows(d.rankings ?? []))
      .catch(() => setRows([]));
  }, []);

  return (
    <Sheet title="Top Trainers" onClose={onClose}>
      {rows === null ? (
        <span style={{ fontSize: 12, color: C.textTertiary }}>Loading…</span>
      ) : rows.length === 0 ? (
        <span style={{ fontSize: 12, color: C.textTertiary }}>No trainers yet</span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r, i) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, borderRadius: 14, background: "rgba(255,255,255,0.04)" }}>
              <span style={{ width: 24, textAlign: "center", fontSize: 13, fontWeight: 900, fontFamily: FONT_DISPLAY, color: i < 3 ? GOLD : C.textSecondary }}>{i + 1}</span>
              <Avatar url={r.avatar_url} name={r.handle ?? r.display_name ?? "?"} size={38} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {(r.handle ?? r.display_name ?? "Trainer") + (r.id === myId ? " (You)" : "")}
              </span>
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 900, fontFamily: FONT_DISPLAY, color: GOLD }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M6 3h12v2h3v3c0 2.5-2 4.5-4.4 4.9A6 6 0 0 1 13 16.9V19h3a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2h3v-2.1a6 6 0 0 1-3.6-4C5 12.5 3 10.5 3 8V5h3V3Z" />
                </svg>
                {r.mm_score ?? 0}
              </span>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

/* "Enter a friend's code" — joins via the universal-link battle landing. */
function CodeSheet({ onClose, onSubmit }: { onClose: () => void; onSubmit: (code: string) => void }) {
  const [code, setCode] = useState("");
  return (
    <Sheet title="Enter a friend's code" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) onSubmit(code.trim().toUpperCase());
        }}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="BATTLE CODE"
          maxLength={12}
          style={{
            width: "100%",
            height: 52,
            boxSizing: "border-box",
            padding: "0 16px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#fff",
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: "0.2em",
            textAlign: "center",
            outline: "none",
            fontFamily: "ui-monospace, monospace",
          }}
        />
        <button
          type="submit"
          disabled={!code.trim()}
          style={{
            height: 52,
            borderRadius: 26,
            border: "none",
            background: code.trim() ? `linear-gradient(90deg, ${C.primary}, ${C.primary2})` : "rgba(255,255,255,0.08)",
            color: code.trim() ? "#000" : C.textTertiary,
            fontSize: 15,
            fontWeight: 900,
            fontFamily: FONT_DISPLAY,
            letterSpacing: "0.06em",
            cursor: code.trim() ? "pointer" : "default",
          }}
        >
          JOIN BATTLE
        </button>
      </form>
    </Sheet>
  );
}
