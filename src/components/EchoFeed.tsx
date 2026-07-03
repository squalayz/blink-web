"use client";

// The Living Echoes Feed — web mirror of the iOS app's FeedView.swift
// Following/Nearby scopes: cinematic echo cards (type pill, visual,
// author row, creature reaction bar), the Echo type chooser and guided
// composer (EchoKind.swift vocabulary verbatim), and the app's exact
// empty states. Data: the app's `posts` / `post_reactions` tables
// (src/lib/migrations/posts-echoes.sql) — until they exist, the feed
// rests in its empty states.

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { C, FONT_DISPLAY } from "@/lib/theme";

/* ------------------------------------------------------------------ */
/*  Vocabulary (EchoKind.swift + PostReactionKind.swift, verbatim)     */
/* ------------------------------------------------------------------ */

export type EchoScope = "live" | "following" | "nearby";

interface EchoType {
  key: string;
  title: string;
  blurb: string;
  tag: string;
  accent: string;
  prompt: string;
  placeholder: string;
  starters: string[];
  icon: React.ReactNode;
}

function glyph(path: string, fill = true): React.ReactNode {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke={fill ? undefined : "currentColor"} strokeWidth={fill ? undefined : 2.2} aria-hidden>
      <path d={path} />
    </svg>
  );
}

const LEAF = "M17 3C9 3 4 9 4 15c0 2.4.9 4.3 1.6 5.4.3.5 1 .5 1.4.1l.9-.9A8.2 8.2 0 0 0 12 21c5 0 8-5.5 8-12V4a1 1 0 0 0-1-1h-2ZM6.5 18.5C8 14 11 10.5 15 8.5c-4.8 1-8 4.6-9.4 8.9l.9 1.1Z";
const SPARKLES = "M12 2.5 13.8 8 19.5 9.8 13.8 11.5 12 17.2 10.2 11.5 4.5 9.8 10.2 8 12 2.5ZM19 14l.9 2.6L22.5 17.5l-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14ZM5 15l.7 2 2 .7-2 .7L5 20.5l-.7-2.1-2-.7 2-.7L5 15Z";
const BOOK = "M4 4.5A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v16.5a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 18V4.5Zm2.5 13.5H18v2H6.5a.5.5 0 0 1 0-1V18Z";
const BUBBLES = "M2 8.4C2 6 4 4.2 6.5 4.2h5C14 4.2 16 6 16 8.4c0 2.4-2 4.2-4.5 4.2H8l-3.4 2.6c-.5.4-1.1 0-1.1-.6v-2.8C2.6 11 2 9.8 2 8.4Zm15.2.7c2.7.3 4.8 2.2 4.8 4.6 0 1.4-.7 2.6-1.7 3.4v2.4c0 .6-.7 1-1.2.6L16.4 18h-2c-1.9 0-3.6-1-4.3-2.5h1.4c3.2 0 5.8-2.3 5.8-5.3 0-.4 0-.8-.1-1.1Z";
const STAR = "M12 2.5l2.6 5.8 6.3.6-4.8 4.2 1.4 6.2L12 16l-5.5 3.3 1.4-6.2L3.1 8.9l6.3-.6L12 2.5Z";
const FLAME = "M13.5 1.5s.8 2.6-.7 4.9C11.4 8.6 9 9.4 9 12.1c0 1.4.8 2.6 2 3.2-.3-1 0-2 .7-2.8.5-.6 1.3-1 1.6-2 1.6 1.2 3.2 3.3 3.2 5.4A4.8 4.8 0 0 1 12 21a6.4 6.4 0 0 1-6.4-6.5c0-3.3 2-5 3.2-7C10.3 5 10.4 2.7 13.5 1.5Z";
const BOLT = "M13.6 2.1c.5-.6 1.5-.2 1.4.6l-1 6.3h5c.65 0 1 .75.6 1.25L10.4 21.9c-.5.6-1.5.2-1.4-.6l1-6.3H5c-.65 0-1-.75-.6-1.25L13.6 2.1Z";
const HEART = "M12 21s-8-5.3-10-10C.7 7.5 3 4 6.5 4 8.8 4 10.8 5.4 12 7.2 13.2 5.4 15.2 4 17.5 4 21 4 23.3 7.5 22 11c-2 4.7-10 10-10 10Z";

export const ECHO_TYPES: EchoType[] = [
  {
    key: "reflection",
    title: "Reflection",
    blurb: "A photo from your walk + a thoughtful note",
    tag: "REFLECTION",
    accent: C.primary,
    prompt: "Share a moment from today's walk",
    placeholder: "What did this place make you feel?",
    starters: ["On this walk, I noticed…", "This place made me feel…", "A small moment I want to remember…"],
    icon: glyph(LEAF),
  },
  {
    key: "discovery",
    title: "Discovery",
    blurb: "Share a creature you just met in the world",
    tag: "DISCOVERY",
    accent: "#66d9ff",
    prompt: "Share a creature you discovered",
    placeholder: "Where did you meet it? What was the moment like?",
    starters: ["I met this one near…", "Didn't expect to find…", "The light was perfect when…"],
    icon: glyph(SPARKLES),
  },
  {
    key: "learning",
    title: "Learning Moment",
    blurb: "Something you noticed or learned today",
    tag: "LEARNING",
    accent: "#ffd173",
    prompt: "Share something you learned out there",
    placeholder: "What did you notice or learn today?",
    starters: ["Something I learned today…", "I never knew that…", "Standing here, I realized…"],
    icon: glyph(BOOK),
  },
  {
    key: "question",
    title: "Question",
    blurb: "Ask the community something",
    tag: "QUESTION",
    accent: "#bd99ff",
    prompt: "Ask explorers near and far",
    placeholder: "What would you like to ask?",
    starters: ["Has anyone else…", "What's the most beautiful place near you to…", "I'm curious — where do you…"],
    icon: glyph(BUBBLES),
  },
  {
    key: "spotlight",
    title: "Collection Spotlight",
    blurb: "Feature a creature and why it matters",
    tag: "SPOTLIGHT",
    accent: C.primary2,
    prompt: "Spotlight a creature from your collection",
    placeholder: "Why does this one matter to you?",
    starters: ["This one matters to me because…", "The story behind this catch…", "My favorite so far, and why…"],
    icon: glyph(STAR),
  },
];

function echoTypeFor(key: string | null): EchoType {
  return ECHO_TYPES.find((t) => t.key === key) ?? ECHO_TYPES[0];
}

const REACTIONS = [
  { key: "spark", title: "Spark", color: C.primary, icon: glyph(SPARKLES) },
  { key: "blaze", title: "Blaze", color: "#ff8c40", icon: glyph(FLAME) },
  { key: "bolt", title: "Volt", color: "#ffd94d", icon: glyph(BOLT) },
  { key: "star", title: "Star", color: "#ffc766", icon: glyph(STAR) },
  { key: "love", title: "Love", color: "#ff73b3", icon: glyph(HEART) },
];

const AUDIENCES = [
  { key: "private", title: "Just Me", blurb: "A private reflection only you can see", accent: "#bd99ff" },
  { key: "friends", title: "Friends", blurb: "Shared with the trainers you've added", accent: C.primary },
  { key: "community", title: "Community", blurb: "Shared & discoverable to explorers nearby", accent: "#66d9ff" },
];

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface EchoPost {
  id: string;
  author_id: string;
  caption: string | null;
  echo_type: string | null;
  image_url: string | null;
  creature_name: string | null;
  rarity: string | null;
  visibility: string;
  comment_count: number;
  created_at: string | null;
}

interface AuthorInfo {
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/* ------------------------------------------------------------------ */
/*  Feed view (Following / Nearby scopes)                              */
/* ------------------------------------------------------------------ */

export function EchoFeedView({
  scope,
  userId,
  onCompose,
}: {
  scope: "following" | "nearby";
  userId: string;
  onCompose: () => void;
}) {
  const [posts, setPosts] = useState<EchoPost[] | null>(null);
  const [authors, setAuthors] = useState<Map<string, AuthorInfo>>(new Map());
  const [myReactions, setMyReactions] = useState<Map<string, string>>(new Map());
  const [reactionCounts, setReactionCounts] = useState<Map<string, Record<string, number>>>(new Map());

  const load = useCallback(async () => {
    try {
      let authorFilter: string[] | null = null;
      if (scope === "following") {
        // My posts + my friends' posts, newest first (FeedView's Following).
        const { data: fr } = await supabase
          .from("friendships")
          .select("requester_id, recipient_id")
          .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
          .eq("status", "accepted");
        const ids = new Set<string>([userId]);
        (fr ?? []).forEach((r) => {
          ids.add(r.requester_id === userId ? r.recipient_id : r.requester_id);
        });
        authorFilter = [...ids];
      }

      let q = supabase
        .from("posts")
        .select("id, author_id, caption, echo_type, image_url, creature_name, rarity, visibility, comment_count, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(50);
      if (authorFilter) q = q.in("author_id", authorFilter).in("visibility", ["friends", "community"]);
      else q = q.eq("visibility", "community");

      const { data: rows, error } = await q;
      if (error) {
        // Table not provisioned yet — the feed rests in its empty state.
        setPosts([]);
        return;
      }
      const list = (rows ?? []) as EchoPost[];
      setPosts(list);

      if (list.length > 0) {
        const authorIds = [...new Set(list.map((p) => p.author_id))];
        const postIds = list.map((p) => p.id);
        const [{ data: profs }, { data: reacts }] = await Promise.all([
          supabase.from("profiles").select("id, handle, display_name, avatar_url, is_verified").in("id", authorIds),
          supabase.from("post_reactions").select("post_id, user_id, kind").in("post_id", postIds),
        ]);
        setAuthors(new Map((profs ?? []).map((p) => [p.id as string, p as unknown as AuthorInfo])));
        const counts = new Map<string, Record<string, number>>();
        const mine = new Map<string, string>();
        (reacts ?? []).forEach((r) => {
          const c = counts.get(r.post_id) ?? {};
          c[r.kind] = (c[r.kind] ?? 0) + 1;
          counts.set(r.post_id, c);
          if (r.user_id === userId) mine.set(r.post_id, r.kind);
        });
        setReactionCounts(counts);
        setMyReactions(mine);
      }
    } catch {
      setPosts([]);
    }
  }, [scope, userId]);

  useEffect(() => {
    setPosts(null);
    load();
  }, [load]);

  async function toggleReaction(postId: string, kind: string) {
    const current = myReactions.get(postId);
    // Optimistic swap.
    setMyReactions((m) => {
      const next = new Map(m);
      if (current === kind) next.delete(postId);
      else next.set(postId, kind);
      return next;
    });
    setReactionCounts((m) => {
      const next = new Map(m);
      const c = { ...(next.get(postId) ?? {}) };
      if (current) c[current] = Math.max(0, (c[current] ?? 1) - 1);
      if (current !== kind) c[kind] = (c[kind] ?? 0) + 1;
      next.set(postId, c);
      return next;
    });
    try {
      await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", userId);
      if (current !== kind) {
        await supabase.from("post_reactions").insert({ post_id: postId, user_id: userId, kind });
      }
    } catch {
      /* optimistic state stands; reload corrects on next visit */
    }
  }

  if (posts === null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 22, padding: "6px 20px 40px" }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ height: 300, borderRadius: 24, background: "rgba(255,255,255,0.04)" }} />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    // The app's exact empty states.
    const isFollowing = scope === "following";
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "12vh 28px 40px", textAlign: "center" }}>
        <span style={{ color: C.primary }}>
          {isFollowing ? (
            <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d={LEAF} /></svg>
          ) : (
            <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM5 9.5 7 8l2.5.5L11 7 9.5 5.2A8 8 0 0 1 19.7 10l-2.2.6-1.5 2.4.7 2.5 2.1.6A8 8 0 0 1 5.8 15l1.7-1.5-.5-2.5L5 9.5Z" />
            </svg>
          )}
        </span>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, fontFamily: FONT_DISPLAY, color: "#fff" }}>
          {isFollowing ? "Your feed is quiet" : "No echoes nearby yet"}
        </h2>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: C.textSecondary, maxWidth: 340 }}>
          {isFollowing
            ? "Share a reflection from your walk, or add friends to see theirs unfold here."
            : "Be the first to leave a Community echo here — a thought, a discovery, a moment from this place."}
        </p>
        <button
          onClick={onCompose}
          style={{
            marginTop: 6,
            padding: "13px 26px",
            borderRadius: 999,
            border: "none",
            background: C.primary,
            color: "#000",
            fontSize: 14,
            fontWeight: 900,
            fontFamily: FONT_DISPLAY,
            cursor: "pointer",
          }}
        >
          {isFollowing ? "Share an Echo" : "Share to Community"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, padding: "6px 20px 40px" }}>
      {posts.map((p) => {
        const type = echoTypeFor(p.echo_type);
        const author = authors.get(p.author_id);
        const name = author?.display_name || author?.handle || "Trainer";
        const mine = myReactions.get(p.id);
        const counts = reactionCounts.get(p.id) ?? {};
        return (
          <article key={p.id} style={{ borderRadius: 24, overflow: "hidden", background: C.surface, border: "1px solid rgba(255,255,255,0.06)" }}>
            {/* Visual — photo, or a gradient text card. */}
            <div style={{ position: "relative", minHeight: p.image_url ? undefined : 220 }}>
              {p.image_url ? (
                <div style={{ position: "relative", aspectRatio: "4 / 5" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.25), transparent 35%, rgba(0,0,0,0.75))" }} />
                </div>
              ) : (
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg, ${type.accent}2b, ${C.surface} 70%)` }} />
              )}

              {/* Type pill. */}
              <span
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 11px",
                  borderRadius: 999,
                  background: "rgba(10,10,15,0.55)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  border: `1px solid ${type.accent}80`,
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                }}
              >
                <span style={{ color: type.accent, display: "flex" }}>{type.icon}</span>
                {type.tag}
              </span>

              {/* Text-first caption or bottom caption overlay + author row. */}
              <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end", minHeight: p.image_url ? undefined : 220, padding: p.image_url ? "0 16px 14px" : "58px 16px 14px", ...(p.image_url ? { position: "absolute" as const, inset: 0 } : {}) }}>
                {p.caption && (
                  <p
                    style={{
                      margin: "0 0 12px",
                      color: "#fff",
                      fontSize: p.image_url ? 14.5 : 23,
                      fontWeight: p.image_url ? 600 : 800,
                      fontFamily: p.image_url ? undefined : FONT_DISPLAY,
                      lineHeight: 1.35,
                      textShadow: "0 2px 8px rgba(0,0,0,0.6)",
                      display: "-webkit-box",
                      WebkitLineClamp: 7,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {p.caption}
                  </p>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {author?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={author.avatar_url} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", border: `1.5px solid ${type.accent}` }} />
                  ) : (
                    <span style={{ width: 30, height: 30, borderRadius: "50%", background: `${type.accent}33`, border: `1.5px solid ${type.accent}`, color: type.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, fontFamily: FONT_DISPLAY }}>
                      {name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 800, textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>{name}</span>
                  {author?.is_verified && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill={C.primary} aria-hidden>
                      <path d="M12 2 14.5 4.3l3.4-.4 1 3.2 3 1.7-1.3 3.2 1.3 3.2-3 1.7-1 3.2-3.4-.4L12 22l-2.5-2.3-3.4.4-1-3.2-3-1.7L3.4 12 2.1 8.8l3-1.7 1-3.2 3.4.4L12 2Zm-1.2 13.5 5.4-5.4-1.4-1.4-4 4-1.8-1.8-1.4 1.4 3.2 3.2Z" />
                    </svg>
                  )}
                  <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 10.5, fontWeight: 600 }}>{timeAgo(p.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Footer — creature reactions + reflections. */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", flexWrap: "wrap" }}>
              {REACTIONS.map((r) => {
                const on = mine === r.key;
                const n = counts[r.key] ?? 0;
                return (
                  <button
                    key={r.key}
                    onClick={() => toggleReaction(p.id, r.key)}
                    aria-label={r.title}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 9px",
                      borderRadius: 999,
                      border: `1px solid ${on ? r.color : "rgba(255,255,255,0.1)"}`,
                      background: on ? `${r.color}26` : "rgba(255,255,255,0.04)",
                      color: on ? r.color : "rgba(255,255,255,0.65)",
                      cursor: "pointer",
                      transform: on ? "scale(1.06)" : "scale(1)",
                      transition: "all 0.2s cubic-bezier(0.34, 1.2, 0.64, 1)",
                      fontFamily: "inherit",
                    }}
                  >
                    {r.icon}
                    {n > 0 && <span style={{ fontSize: 11, fontWeight: 800 }}>{n}</span>}
                  </button>
                );
              })}
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, color: C.textSecondary, fontSize: 12, fontWeight: 700 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d={BUBBLES} /></svg>
                {p.comment_count === 0 ? "Add a reflection…" : p.comment_count === 1 ? "1 reflection" : `${p.comment_count} reflections`}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Composer — Echo type chooser → guided caption + audience           */
/* ------------------------------------------------------------------ */

export function EchoComposer({ userId, onClose, onPosted }: { userId: string; onClose: () => void; onPosted: () => void }) {
  const [type, setType] = useState<EchoType | null>(null);
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState("friends");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canShare = useMemo(() => caption.trim().length > 0 && !busy, [caption, busy]);

  async function share() {
    if (!type || !canShare) return;
    setBusy(true);
    setError(null);
    // Community echoes carry a coarse location (~250m blur, like the app)
    // so they can surface in Nearby.
    let lat: number | null = null;
    let lng: number | null = null;
    if (audience === "community" && typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000, maximumAge: 300000 }),
        );
        lat = Math.round(pos.coords.latitude * 400) / 400;
        lng = Math.round(pos.coords.longitude * 400) / 400;
      } catch {
        /* location optional */
      }
    }
    const { error: err } = await supabase.from("posts").insert({
      author_id: userId,
      caption: caption.trim().slice(0, 280),
      echo_type: type.key,
      kind: "echo",
      visibility: audience,
      status: "active",
      lat,
      lng,
    });
    setBusy(false);
    if (err) {
      setError("Couldn't share your Echo right now — please try again.");
      return;
    }
    onPosted();
    onClose();
  }

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 540,
          maxHeight: "88dvh",
          overflow: "auto",
          background: C.bg,
          borderRadius: "24px 24px 0 0",
          border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "none",
          padding: "10px 20px calc(24px + env(safe-area-inset-bottom, 0px))",
          animation: "echoSheetUp 0.32s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        <span style={{ display: "block", width: 40, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.3)", margin: "0 auto 14px" }} />

        {!type ? (
          <>
            <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 900, fontFamily: FONT_DISPLAY, color: "#fff" }}>Share an Echo</h2>
            <p style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 500, color: C.textSecondary }}>
              A moment, a discovery, a thought worth keeping
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ECHO_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setType(t)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    padding: 13,
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ width: 42, height: 42, borderRadius: 13, background: `${t.accent}26`, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {t.icon}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, fontFamily: FONT_DISPLAY }}>{t.title}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: C.textSecondary }}>{t.blurb}</span>
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ marginLeft: "auto", flexShrink: 0 }}>
                    <path d="m9 5 7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <button onClick={() => setType(null)} aria-label="Back" style={{ background: "none", border: "none", color: C.textSecondary, cursor: "pointer", padding: 4, display: "flex" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
              <span style={{ color: type.accent, display: "flex" }}>{type.icon}</span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, fontFamily: FONT_DISPLAY, color: "#fff" }}>{type.prompt}</h2>
            </div>

            <textarea
              autoFocus
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 280))}
              placeholder={type.placeholder}
              rows={5}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 14,
                borderRadius: 16,
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${type.accent}4d`,
                color: "#fff",
                fontSize: 15,
                fontWeight: 500,
                lineHeight: 1.5,
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", margin: "4px 2px 10px" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textTertiary }}>{caption.length}/280</span>
            </div>

            {/* Caption starters. */}
            {caption.length === 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {type.starters.map((s) => (
                  <button
                    key={s}
                    onClick={() => setCaption(s + " ")}
                    style={{ padding: "7px 12px", borderRadius: 999, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: C.textSecondary, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Audience. */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {AUDIENCES.map((a) => {
                const on = audience === a.key;
                return (
                  <button
                    key={a.key}
                    onClick={() => setAudience(a.key)}
                    title={a.blurb}
                    style={{
                      flex: 1,
                      padding: "10px 6px",
                      borderRadius: 14,
                      background: on ? `${a.accent}26` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${on ? a.accent : "rgba(255,255,255,0.08)"}`,
                      color: on ? a.accent : C.textSecondary,
                      fontSize: 12,
                      fontWeight: 800,
                      fontFamily: FONT_DISPLAY,
                      cursor: "pointer",
                    }}
                  >
                    {a.title}
                  </button>
                );
              })}
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 500, color: C.textTertiary, textAlign: "center" }}>
              {AUDIENCES.find((a) => a.key === audience)?.blurb}
            </p>

            {error && (
              <p role="alert" style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: "#FF8094", textAlign: "center" }}>
                {error}
              </p>
            )}

            <button
              onClick={share}
              disabled={!canShare}
              style={{
                width: "100%",
                height: 52,
                borderRadius: 26,
                border: "none",
                background: canShare ? `linear-gradient(90deg, ${C.primary}, ${C.primary2})` : "rgba(255,255,255,0.08)",
                color: canShare ? "#000" : C.textTertiary,
                fontSize: 15,
                fontWeight: 900,
                fontFamily: FONT_DISPLAY,
                letterSpacing: "0.05em",
                cursor: canShare ? "pointer" : "default",
              }}
            >
              {busy ? "Sharing…" : "Share Echo"}
            </button>
          </>
        )}
        <style>{`
          @keyframes echoSheetUp {
            from { transform: translateY(48px); opacity: 0; }
            to   { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Scope tabs (FeedView's Live / Following / Nearby capsule)          */
/* ------------------------------------------------------------------ */

export function FeedScopeTabs({ scope, onChange }: { scope: EchoScope; onChange: (s: EchoScope) => void }) {
  const tabs: { key: EchoScope; label: string; icon: React.ReactNode }[] = [
    {
      key: "live",
      label: "Live",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="12" r="2.4" />
          <path d="M7.7 16.3a6 6 0 0 1 0-8.6L6.3 6.3a8 8 0 0 0 0 11.4l1.4-1.4Zm8.6 0 1.4 1.4a8 8 0 0 0 0-11.4l-1.4 1.4a6 6 0 0 1 0 8.6Z" fillOpacity="0.85" />
        </svg>
      ),
    },
    {
      key: "following",
      label: "Following",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.4 0-8 2.2-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.8-3.6-5-8-5Zm8.5-2.5a3.5 3.5 0 1 0-2.6-5.9 6 6 0 0 1 .3 5.8c.75.1 1.5.1 2.3.1Zm.7 2.2c1.7.9 2.8 2.3 2.8 4.3v2a1 1 0 0 0 1-1v-1c0-2-1.6-3.6-3.8-4.3Z" />
        </svg>
      ),
    },
    {
      key: "nearby",
      label: "Nearby",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM5 9.5 7 8l2.5.5L11 7 9.5 5.2A8 8 0 0 1 19.7 10l-2.2.6-1.5 2.4.7 2.5 2.1.6A8 8 0 0 1 5.8 15l1.7-1.5-.5-2.5L5 9.5Z" />
        </svg>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 999, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
      {tabs.map((t) => {
        const on = scope === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 4px",
              borderRadius: 999,
              border: "none",
              background: on ? C.primary : "transparent",
              color: on ? "#000" : "rgba(255,255,255,0.7)",
              fontSize: 13,
              fontWeight: 800,
              fontFamily: FONT_DISPLAY,
              cursor: "pointer",
              boxShadow: on ? `0 0 14px ${C.primary}66` : "none",
              transition: "all 0.25s ease",
            }}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
