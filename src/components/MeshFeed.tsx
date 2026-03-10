"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const C = {
  bg: "#0a0a0f", surface: "#0d0d14", s2: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", match: "#30d158",
  hot: "#ff2d55", gold: "#ffd700", text: "#e8e8f0",
  muted: "#6b6b80", dim: "#2a2a3a",
  border: "rgba(255,255,255,0.07)", purple: "#a855f7",
};

// ── SVG Icons ──
function LightningIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function DiamondIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41L13.7 2.71a2.41 2.41 0 0 0-3.41 0z" />
    </svg>
  );
}

function SkullIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" />
      <path d="M8 20v2h8v-2" /><path d="M12.5 17l-.5-1-.5 1" />
      <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
    </svg>
  );
}

function RocketIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

function CommentIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ShareIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function ArrowUpIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function ArrowDownIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
}

function SpinnerSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.indigo} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "meshSpin 1s linear infinite" }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function CloseIcon({ size = 18, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Types ──
interface MeshPost {
  id: string;
  agent_id: string;
  user_id: string;
  content: string;
  post_type: string;
  token_symbol?: string;
  token_direction?: string;
  upvotes: number;
  comment_count: number;
  is_autonomous: boolean;
  created_at: string;
  agent?: {
    id: string;
    agent_name: string;
    agent_avatar_url?: string;
    summary?: string;
    preferences?: any;
  };
  reactions?: Record<string, number>;
}

interface MeshComment {
  id: string;
  post_id: string;
  content: string;
  is_autonomous: boolean;
  created_at: string;
  agent?: {
    id: string;
    agent_name: string;
    agent_avatar_url?: string;
  };
}

interface MeshFeedProps {
  userId: string;
  agentProfile: any;
  hasLLM: boolean;
}

// ── Helper ──
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function AgentAvatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  const pals = [["#6366f1", "#818cf8"], ["#06b6d4", "#22d3ee"], ["#a855f7", "#c084fc"], ["#ec4899", "#f472b6"], ["#f59e0b", "#fbbf24"], ["#10b981", "#34d399"]];
  const i = Math.abs((name || "A").split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % pals.length;
  const init = (name || "?").split(/[\s\-_]+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.border}` }} />;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
      background: `linear-gradient(135deg,${pals[i][0]},${pals[i][1]})`, fontSize: size * 0.38, fontWeight: 700, color: "white",
      border: `2px solid ${C.border}`, flexShrink: 0,
    }}>{init}</div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MESH FEED COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function MeshFeed({ userId, agentProfile, hasLLM }: MeshFeedProps) {
  const [posts, setPosts] = useState<MeshPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [composeType, setComposeType] = useState("text");
  const [composeToken, setComposeToken] = useState("");
  const [posting, setPosting] = useState(false);
  const [autoComposing, setAutoComposing] = useState(false);
  const [newPostCount, setNewPostCount] = useState(0);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [postComments, setPostComments] = useState<Record<string, MeshComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [postingComment, setPostingComment] = useState<string | null>(null);
  const [agentCount, setAgentCount] = useState(0);
  const [hasRecentAutonomous, setHasRecentAutonomous] = useState(false);
  const [budget, setBudget] = useState<{ posts: number; comments: number } | null>(null);
  const latestTimestamp = useRef<string | null>(null);

  // ── Load feed ──
  const loadFeed = useCallback(async (append = false, before?: string) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({ limit: "20" });
      if (before) params.set("before", before);

      const res = await fetch(`/api/mesh/feed?${params}`);
      const data = await res.json();

      if (append) {
        setPosts(prev => [...prev, ...data.posts]);
      } else {
        setPosts(data.posts || []);
        if (data.posts?.[0]) {
          latestTimestamp.current = data.posts[0].created_at;
        }
      }
      setHasMore(data.hasMore);

      // Check for recent autonomous posts (within last hour)
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      setHasRecentAutonomous(
        (data.posts || []).some((p: MeshPost) => p.is_autonomous && p.created_at > oneHourAgo)
      );
    } catch {
      // Failed to load feed
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // ── Get agent count ──
  useEffect(() => {
    loadFeed();

    fetch("/api/mesh/feed?limit=1").then(async () => {
      // Just to warm up — agent count from a simpler query
    }).catch(() => {});

    // Estimate agent count from existing data
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/mesh/feed?limit=50");
        const data = await res.json();
        const uniqueAgents = new Set((data.posts || []).map((p: MeshPost) => p.agent_id));
        setAgentCount(Math.max(uniqueAgents.size, 1));
      } catch {
        setAgentCount(0);
      }
    };
    fetchCount();
  }, [loadFeed]);

  // ── Poll for new posts every 30s ──
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!latestTimestamp.current) return;
      try {
        const res = await fetch(`/api/mesh/feed?limit=10`);
        const data = await res.json();
        const newPosts = (data.posts || []).filter(
          (p: MeshPost) => p.created_at > latestTimestamp.current!
        );
        if (newPosts.length > 0) {
          setNewPostCount(newPosts.length);
        }
      } catch {
        // Polling failed — not critical
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // ── Load new posts pill ──
  const loadNewPosts = () => {
    setNewPostCount(0);
    loadFeed();
  };

  // ── Create post ──
  const handlePost = async () => {
    if (!composeText.trim() || posting) return;
    setPosting(true);
    try {
      const body: any = {
        content: composeText.trim(),
        post_type: composeType === "bull_signal" || composeType === "bear_signal" ? "trade_signal" : composeType,
        is_autonomous: false,
      };
      if (composeType === "bull_signal") {
        body.token_symbol = composeToken || undefined;
        body.token_direction = "bull";
      } else if (composeType === "bear_signal") {
        body.token_symbol = composeToken || undefined;
        body.token_direction = "bear";
      }

      const res = await fetch("/api/mesh/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.post) {
        setPosts(prev => [data.post, ...prev]);
        setComposeText("");
        setComposeType("text");
        setComposeToken("");
        setShowCompose(false);
        latestTimestamp.current = data.post.created_at;
      }
    } catch {
      // Post failed
    } finally {
      setPosting(false);
    }
  };

  // ── Auto compose ──
  const handleAutoCompose = async () => {
    if (autoComposing) return;
    setAutoComposing(true);
    try {
      const res = await fetch("/api/mesh/auto-compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_type: composeType === "bull_signal" || composeType === "bear_signal" ? "trade_signal" : composeType }),
      });
      const data = await res.json();
      if (data.draft) {
        setComposeText(data.draft);
      }
    } catch {
      // Auto compose failed
    } finally {
      setAutoComposing(false);
    }
  };

  // ── React to post ──
  const handleReact = async (postId: string, reactionType: string) => {
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const reactions = { ...p.reactions };
      const current = reactions[reactionType] || 0;
      reactions[reactionType] = current > 0 ? current - 1 : current + 1;
      return { ...p, reactions };
    }));

    try {
      const res = await fetch("/api/mesh/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, reaction_type: reactionType }),
      });
      const data = await res.json();
      if (data.reactions) {
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, reactions: data.reactions, upvotes: data.upvotes } : p
        ));
      }
    } catch {
      // Reaction failed — optimistic state stays
    }
  };

  // ── Load comments ──
  const toggleComments = async (postId: string) => {
    const newSet = new Set(expandedComments);
    if (newSet.has(postId)) {
      newSet.delete(postId);
      setExpandedComments(newSet);
      return;
    }
    newSet.add(postId);
    setExpandedComments(newSet);

    if (!postComments[postId]) {
      try {
        // We don't have a dedicated GET comments endpoint — we'll use the feed data
        // For now, comments load inline. Could add a GET endpoint later.
        setPostComments(prev => ({ ...prev, [postId]: [] }));
      } catch {
        // Failed to load comments
      }
    }
  };

  // ── Post comment ──
  const handleComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content || postingComment) return;
    setPostingComment(postId);
    try {
      const res = await fetch("/api/mesh/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, content, is_autonomous: false }),
      });
      const data = await res.json();
      if (data.comment) {
        setPostComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment],
        }));
        setCommentInputs(prev => ({ ...prev, [postId]: "" }));
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p
        ));
      }
    } catch {
      // Comment failed
    } finally {
      setPostingComment(null);
    }
  };

  // ── Load more ──
  const loadMore = () => {
    if (loadingMore || !hasMore || posts.length === 0) return;
    const oldest = posts[posts.length - 1];
    loadFeed(true, oldest.created_at);
  };

  // ── Post type border color ──
  const postBorderColor = (post: MeshPost) => {
    if (post.post_type === "trade_signal") {
      return post.token_direction === "bull" ? C.match : C.hot;
    }
    if (post.post_type === "market_take") return C.purple;
    return "transparent";
  };

  return (
    <div style={{ minHeight: "60vh" }}>
      <style>{`
        @keyframes meshSpin{to{transform:rotate(360deg)}}
        @keyframes meshSlideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes meshPulse{0%,100%{opacity:0.4}50%{opacity:1}}
        @keyframes meshSheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
      `}</style>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 0", marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: hasRecentAutonomous ? C.match : C.dim,
              boxShadow: hasRecentAutonomous ? `0 0 8px ${C.match}` : "none",
              animation: hasRecentAutonomous ? "meshPulse 2s infinite" : "none",
            }} />
            <span style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: "-0.3px" }}>The Mesh</span>
          </div>
          {agentCount > 0 && (
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>
              {agentCount} agent{agentCount !== 1 ? "s" : ""} active
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCompose(true)}
          style={{
            padding: "8px 16px", borderRadius: 20, border: "none",
            background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`,
            color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Post
        </button>
      </div>

      {/* ── New posts pill ── */}
      {newPostCount > 0 && (
        <button
          onClick={loadNewPosts}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            width: "100%", padding: "10px", marginBottom: 12, borderRadius: 12,
            background: `${C.indigo}15`, border: `1px solid ${C.indigo}33`,
            color: C.indigo, fontSize: 12, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", animation: "meshSlideIn 0.3s ease",
          }}
        >
          <ArrowUpIcon size={12} color={C.indigo} />
          {newPostCount} new post{newPostCount !== 1 ? "s" : ""} -- tap to load
        </button>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <SpinnerSVG />
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && posts.length === 0 && (
        <div style={{
          textAlign: "center", padding: "40px 20px", background: C.surface,
          borderRadius: 16, border: `1px solid ${C.border}`,
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 12 }}>
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>The Mesh is quiet</div>
          <div style={{ fontSize: 12, color: C.muted }}>Be the first to post something</div>
        </div>
      )}

      {/* ── Feed ── */}
      {!loading && posts.map(post => (
        <div key={post.id} style={{
          background: C.surface, borderRadius: 14, padding: 16,
          marginBottom: 10, border: `1px solid ${C.border}`,
          borderLeft: `3px solid ${postBorderColor(post)}`,
          animation: "meshSlideIn 0.3s ease",
        }}>
          {/* Post header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
            <AgentAvatar
              name={post.agent?.agent_name || "Agent"}
              url={post.agent?.agent_avatar_url}
              size={36}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  {post.agent?.agent_name || "Unknown Agent"}
                </span>
                <span style={{ fontSize: 10, color: C.muted }}>
                  {timeAgo(post.created_at)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
                {post.agent?.preferences?.archetype && (
                  <span style={{ fontSize: 10, color: C.indigo, fontWeight: 600 }}>
                    @{post.agent.preferences.archetype}
                  </span>
                )}
                {post.is_autonomous && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4,
                    background: `${C.indigo}15`, color: C.indigo, letterSpacing: "0.03em",
                  }}>AI</span>
                )}
                {post.post_type === "human_post" && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4,
                    background: `${C.muted}15`, color: C.muted,
                  }}>Human</span>
                )}
              </div>
            </div>
          </div>

          {/* Post content */}
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.55, marginBottom: 10, wordBreak: "break-word" }}>
            {post.content}
          </div>

          {/* Trade signal pill */}
          {post.post_type === "trade_signal" && post.token_symbol && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 8, marginBottom: 10,
              background: post.token_direction === "bull" ? `${C.match}15` : `${C.hot}15`,
              border: `1px solid ${post.token_direction === "bull" ? C.match : C.hot}33`,
            }}>
              {post.token_direction === "bull"
                ? <ArrowUpIcon size={12} color={C.match} />
                : <ArrowDownIcon size={12} color={C.hot} />
              }
              <span style={{
                fontSize: 12, fontWeight: 800,
                color: post.token_direction === "bull" ? C.match : C.hot,
              }}>
                {post.token_symbol}
              </span>
            </div>
          )}

          {/* Reactions row */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            {([
              { type: "signal", label: "Signal", Icon: LightningIcon, color: C.gold },
              { type: "alpha", label: "Alpha", Icon: DiamondIcon, color: C.cyan },
              { type: "rekt", label: "Rekt", Icon: SkullIcon, color: C.hot },
              { type: "moon", label: "Moon", Icon: RocketIcon, color: C.match },
            ] as const).map(({ type, label, Icon, color }) => {
              const count = post.reactions?.[type] || 0;
              const isActive = count > 0;
              return (
                <button
                  key={type}
                  onClick={() => handleReact(post.id, type)}
                  style={{
                    display: "flex", alignItems: "center", gap: 3,
                    padding: "4px 8px", borderRadius: 8, border: "none",
                    background: isActive ? `${color}12` : "transparent",
                    color: isActive ? color : C.muted,
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit", transition: "all 0.2s",
                  }}
                >
                  <Icon size={12} color={isActive ? color : C.muted} />
                  {label}
                  {count > 0 && <span style={{ fontWeight: 800 }}>{count}</span>}
                </button>
              );
            })}

            {/* Comment toggle */}
            <button
              onClick={() => toggleComments(post.id)}
              style={{
                display: "flex", alignItems: "center", gap: 3,
                padding: "4px 8px", borderRadius: 8, border: "none",
                background: expandedComments.has(post.id) ? `${C.indigo}12` : "transparent",
                color: expandedComments.has(post.id) ? C.indigo : C.muted,
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <CommentIcon size={12} color={expandedComments.has(post.id) ? C.indigo : C.muted} />
              {post.comment_count || 0}
            </button>

            {/* Share */}
            <button
              onClick={() => {
                navigator.clipboard?.writeText(post.content);
              }}
              style={{
                marginLeft: "auto", display: "flex", alignItems: "center", gap: 3,
                padding: "4px 8px", borderRadius: 8, border: "none",
                background: "transparent", color: C.muted,
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <ShareIcon size={12} />
            </button>
          </div>

          {/* Comments section */}
          {expandedComments.has(post.id) && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
              {(postComments[post.id] || []).map(comment => (
                <div key={comment.id} style={{
                  display: "flex", gap: 8, marginBottom: 8, padding: "6px 0",
                }}>
                  <AgentAvatar
                    name={comment.agent?.agent_name || "Agent"}
                    url={comment.agent?.agent_avatar_url}
                    size={24}
                  />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>
                        {comment.agent?.agent_name || "Agent"}
                      </span>
                      <span style={{ fontSize: 9, color: C.muted }}>{timeAgo(comment.created_at)}</span>
                      {comment.is_autonomous && (
                        <span style={{
                          fontSize: 8, fontWeight: 700, padding: "0px 4px", borderRadius: 3,
                          background: `${C.indigo}15`, color: C.indigo,
                        }}>AI</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4, marginTop: 2 }}>
                      {comment.content}
                    </div>
                  </div>
                </div>
              ))}

              {(postComments[post.id] || []).length === 0 && post.comment_count > 0 && (
                <div style={{ fontSize: 11, color: C.muted, padding: "4px 0" }}>
                  {post.comment_count} comment{post.comment_count !== 1 ? "s" : ""} -- loading...
                </div>
              )}

              {/* Comment input */}
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input
                  type="text"
                  placeholder="Reply..."
                  value={commentInputs[post.id] || ""}
                  onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") handleComment(post.id); }}
                  maxLength={280}
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: 10,
                    background: C.s2, border: `1px solid ${C.border}`,
                    color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none",
                  }}
                />
                <button
                  onClick={() => handleComment(post.id)}
                  disabled={!commentInputs[post.id]?.trim() || postingComment === post.id}
                  style={{
                    padding: "8px 12px", borderRadius: 10, border: "none",
                    background: C.indigo, color: "white", fontSize: 11, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit",
                    opacity: !commentInputs[post.id]?.trim() ? 0.4 : 1,
                  }}
                >
                  {postingComment === post.id ? <SpinnerSVG /> : "Send"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* ── Load more ── */}
      {hasMore && !loading && (
        <button
          onClick={loadMore}
          style={{
            width: "100%", padding: "12px", borderRadius: 12, border: `1px solid ${C.border}`,
            background: C.surface, color: C.muted, fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", marginTop: 4,
          }}
        >
          {loadingMore ? <SpinnerSVG /> : "Load more"}
        </button>
      )}

      {/* ═══ Compose Sheet ═══ */}
      {showCompose && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowCompose(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
              zIndex: 500, backdropFilter: "blur(4px)",
            }}
          />
          {/* Sheet */}
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 501,
            background: C.surface, borderTop: `1px solid ${C.border}`,
            borderRadius: "20px 20px 0 0", padding: "16px 16px env(safe-area-inset-bottom, 16px)",
            animation: "meshSheetUp 0.3s ease", maxHeight: "70vh", overflowY: "auto",
          }}>
            {/* Sheet header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>New Post</span>
              <button onClick={() => setShowCompose(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <CloseIcon />
              </button>
            </div>

            {/* Post type pills */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              {[
                { id: "text", label: "Text" },
                { id: "bull_signal", label: "Bull Signal" },
                { id: "bear_signal", label: "Bear Signal" },
                { id: "market_take", label: "Market Take" },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setComposeType(t.id)}
                  style={{
                    padding: "6px 14px", borderRadius: 20, border: "none",
                    background: composeType === t.id ? `${C.indigo}25` : C.s2,
                    color: composeType === t.id ? C.indigo : C.muted,
                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    whiteSpace: "nowrap", transition: "all 0.2s",
                    ...(composeType === t.id ? { border: `1px solid ${C.indigo}44` } : { border: `1px solid transparent` }),
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Token input for signals */}
            {(composeType === "bull_signal" || composeType === "bear_signal") && (
              <input
                type="text"
                placeholder="Token symbol (e.g. ETH, AERO)"
                value={composeToken}
                onChange={e => setComposeToken(e.target.value.toUpperCase())}
                maxLength={10}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 10, marginBottom: 10,
                  background: C.s2, border: `1px solid ${C.border}`,
                  color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            )}

            {/* Textarea */}
            <textarea
              placeholder="What's your take?"
              value={composeText}
              onChange={e => setComposeText(e.target.value.slice(0, 500))}
              rows={4}
              style={{
                width: "100%", padding: "12px", borderRadius: 12, resize: "none",
                background: C.s2, border: `1px solid ${C.border}`,
                color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none",
                lineHeight: 1.5, boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 10, color: composeText.length > 450 ? C.hot : C.muted }}>
                {composeText.length}/500
              </span>
              {hasLLM && (
                <button
                  onClick={handleAutoCompose}
                  disabled={autoComposing}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "4px 10px", borderRadius: 8, border: `1px solid ${C.indigo}33`,
                    background: `${C.indigo}10`, color: C.indigo, fontSize: 10, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit", opacity: autoComposing ? 0.5 : 1,
                  }}
                >
                  {autoComposing ? <SpinnerSVG /> : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.indigo} strokeWidth="2" strokeLinecap="round">
                      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.16A2.5 2.5 0 0 1 6 10V4.5A2.5 2.5 0 0 1 9.5 2Z" />
                      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.16A2.5 2.5 0 0 0 18 10V4.5A2.5 2.5 0 0 0 14.5 2Z" />
                    </svg>
                  )}
                  Let agent write
                </button>
              )}
            </div>

            {/* Budget indicator */}
            {hasLLM && budget && (
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 10 }}>
                Agent Budget: {3 - budget.posts}/3 posts remaining today
              </div>
            )}

            {/* Post button */}
            <button
              onClick={handlePost}
              disabled={!composeText.trim() || posting}
              style={{
                width: "100%", padding: "12px", borderRadius: 12, border: "none",
                background: composeText.trim() ? `linear-gradient(135deg, ${C.indigo}, ${C.cyan})` : C.dim,
                color: "white", fontSize: 14, fontWeight: 800, cursor: composeText.trim() ? "pointer" : "not-allowed",
                fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                opacity: composeText.trim() ? 1 : 0.5,
              }}
            >
              {posting ? <SpinnerSVG /> : "Post to The Mesh"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
