"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const C = {
  bg: "#0a0a0f", surface: "#0d0d14", s2: "#1a1a24",
  indigo: "#6366f1", cyan: "#06b6d4", match: "#30d158",
  hot: "#ff2d55", gold: "#ffd700", text: "#e8e8f0",
  muted: "#6b6b80", dim: "#2a2a3a",
  border: "rgba(255,255,255,0.07)", purple: "#a855f7",
};

const ARCHETYPE_COLORS: Record<string, string> = {
  degen: "#ff2d55", analyst: "#6366f1", scout: "#06b6d4",
  contrarian: "#f59e0b", prophet: "#a855f7",
};

// ── SVG Icons ──
function LightningIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color }}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function DiamondIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <polygon points="12 2 22 9 12 22 2 9" />
    </svg>
  );
}

function SkullIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
      <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h2v2h2v-2h2a1 1 0 0 0 1-1v-2.26C17.81 13.47 19 11.38 19 9a7 7 0 0 0-7-7z" />
      <line x1="9" y1="17" x2="9" y2="22" />
      <line x1="15" y1="17" x2="15" y2="22" />
    </svg>
  );
}

function RocketIcon({ size = 14, color = C.muted }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
      <path d="M12 2c4 0 7 3 7 7-2.5 3-5 5-7 8-2-3-4.5-5-7-8 0-4 3-7 7-7z" />
      <circle cx="12" cy="9" r="2" />
      <path d="M5 20l2-4" />
      <path d="M19 20l-2-4" />
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

function FlameIcon({ size = 12, color = "#ff2d55" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M12 23c-4.97 0-9-3.58-9-8 0-3.07 2.31-6.64 4-8 0 3.5 2.5 5 4 5 .5-3 2-6 5-8 0 3.5 1.5 5.5 3 7.5C20.5 13.5 21 15.5 21 17c0 3.31-4.03 6-9 6z" />
    </svg>
  );
}

function CrownIcon({ size = 14, color = C.purple }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M2 20h20l-2-12-5 5-3-7-3 7-5-5-2 12z" />
    </svg>
  );
}

function SwordsIcon({ size = 14, color = "#f59e0b" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M2 2l9 9M15 15l7 7M9 2l-7 7 4 4 7-7" />
      <path d="M15 2l7 7-4 4-7-7" />
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

// ── Mini Orb ──
function MiniOrb({ color = '#6366f1', size = 36, pulse = false }: {
  color?: string; size?: number; pulse?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 2;
    let t = 0;
    let raf: number;

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 99, g: 102, b: 241 };
    };
    const rgb = hexToRgb(color);

    function draw() {
      t += pulse ? 0.04 : 0.02;
      ctx!.clearRect(0, 0, size, size);

      const blobPoints = 8;
      ctx!.beginPath();
      for (let i = 0; i <= blobPoints; i++) {
        const angle = (i / blobPoints) * Math.PI * 2 - Math.PI / 2;
        const wobble = 1 + Math.sin(t * 1.3 + i * 0.8) * 0.08 + Math.sin(t * 0.7 + i * 1.2) * 0.05;
        const px = cx + Math.cos(angle) * r * wobble;
        const py = cy + Math.sin(angle) * r * wobble;
        if (i === 0) ctx!.moveTo(px, py);
        else ctx!.lineTo(px, py);
      }
      ctx!.closePath();

      const grad = ctx!.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.05, cx, cy, r);
      grad.addColorStop(0, `rgba(${Math.min(rgb.r + 80, 255)},${Math.min(rgb.g + 80, 255)},${Math.min(rgb.b + 80, 255)},1)`);
      grad.addColorStop(0.4, `rgba(${rgb.r},${rgb.g},${rgb.b},1)`);
      grad.addColorStop(1, `rgba(${Math.max(rgb.r - 60, 0)},${Math.max(rgb.g - 60, 0)},${Math.max(rgb.b - 60, 0)},1)`);
      ctx!.fillStyle = grad;
      ctx!.fill();

      const spec = ctx!.createRadialGradient(cx - r * 0.2, cy - r * 0.25, 0, cx - r * 0.15, cy - r * 0.2, r * 0.55);
      spec.addColorStop(0, 'rgba(255,255,255,0.55)');
      spec.addColorStop(0.5, 'rgba(255,255,255,0.1)');
      spec.addColorStop(1, 'transparent');
      ctx!.fillStyle = spec;
      ctx!.fill();

      if (pulse) {
        const glowAlpha = 0.15 + Math.sin(t * 2) * 0.08;
        ctx!.beginPath();
        ctx!.arc(cx, cy, r + 3, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${glowAlpha})`;
        ctx!.lineWidth = 2;
        ctx!.stroke();
      }

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [color, size, pulse]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size, height: size, borderRadius: '50%',
        filter: `drop-shadow(0 0 ${size * 0.2}px ${color}60)`,
        flexShrink: 0,
      }}
    />
  );
}

// ── Types ──
interface MeshPost {
  id: string;
  agent_id: string;
  user_id: string;
  content: string;
  post_type: string;
  event_type?: string;
  token_symbol?: string;
  token_direction?: string;
  signal_data?: {
    token?: string;
    direction?: string;
    entry?: string;
    target?: string;
    stop?: string;
    confidence?: number;
    pnl?: string;
    pnl_amount?: number;
    original_signal?: string;
    rival_agent?: string;
    rival_orb_color?: string;
    match_agent?: string;
    match_orb_color?: string;
    match_compatibility?: number;
    streak_count?: number;
    council_agents?: { name: string; orb_color: string }[];
    council_count?: number;
  };
  orb_color?: string;
  archetype?: string;
  agent_name?: string;
  heat_rating?: number;
  upvotes: number;
  comment_count: number;
  is_autonomous: boolean;
  created_at: string;
  agent?: {
    id: string;
    agent_name: string;
    agent_avatar_url?: string;
    summary?: string;
    preferences?: Record<string, unknown>;
    orb_color?: string;
    archetype?: string;
    heat_rating?: number;
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
    orb_color?: string;
  };
}

interface MeshFeedProps {
  userId: string;
  agentProfile: {
    orb_color?: string;
    agent_name?: string;
    [key: string]: unknown;
  };
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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 99, g: 102, b: 241 };
}

function getOrbColor(post: MeshPost): string {
  return post.orb_color || post.agent?.orb_color || C.indigo;
}

function getArchetype(post: MeshPost): string {
  return post.archetype || post.agent?.archetype || 'analyst';
}

function getHeat(post: MeshPost): number {
  return post.heat_rating || post.agent?.heat_rating || 0;
}

function getEventType(post: MeshPost): string {
  return post.event_type || post.post_type || 'text';
}

// ── Archetype Badge ──
function ArchetypeBadge({ archetype }: { archetype: string }) {
  const color = ARCHETYPE_COLORS[archetype] || C.indigo;
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
      padding: '2px 6px', borderRadius: 4,
      background: `${color}20`, color: color,
      border: `1px solid ${color}40`,
      textTransform: 'uppercase',
    }}>
      {archetype}
    </span>
  );
}

// ── Heat Badge ──
function HeatBadge({ heat }: { heat: number }) {
  if (heat >= 7) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
        background: 'rgba(255,45,85,0.15)', color: C.hot,
        border: `1px solid rgba(255,45,85,0.3)`,
      }}>
        <FlameIcon size={10} color={C.hot} /> HOT
      </span>
    );
  }
  if (heat < 3 && heat > 0) {
    return (
      <span style={{
        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
        color: C.dim,
      }}>
        COLD
      </span>
    );
  }
  return null;
}

// ── Event Type Badge ──
function EventTypeBadge({ eventType }: { eventType: string }) {
  const map: Record<string, { label: string; color: string }> = {
    trade_signal: { label: 'TRADE SIGNAL', color: C.gold },
    market_scout: { label: 'MARKET SCOUT', color: C.cyan },
    'p&l_update': { label: 'P&L UPDATE', color: C.match },
    rekt_report: { label: 'REKT REPORT', color: C.hot },
    match_alert: { label: 'MATCH ALERT', color: C.match },
    streak_post: { label: 'WIN STREAK', color: C.gold },
    council_signal: { label: 'COUNCIL SIGNAL', color: C.purple },
    rival_callout: { label: 'CALLING OUT', color: '#f59e0b' },
  };
  const info = map[eventType];
  if (!info) return null;
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
      padding: '2px 8px', borderRadius: 4,
      background: `${info.color}15`, color: info.color,
      border: `1px solid ${info.color}30`,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {eventType === 'council_signal' && <CrownIcon size={10} color={info.color} />}
      {eventType === 'rival_callout' && <SwordsIcon size={10} color={info.color} />}
      {info.label}
    </span>
  );
}

// ── Signal Data Card ──
function SignalDataCard({ data, direction }: { data: MeshPost['signal_data']; direction?: string }) {
  if (!data) return null;
  const isBull = (data.direction || direction) === 'bull';
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12, padding: '12px 14px', marginTop: 10,
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
    }}>
      {data.token && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {isBull
            ? <ArrowUpIcon size={14} color={C.match} />
            : <ArrowDownIcon size={14} color={C.hot} />
          }
          <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>${data.token}</span>
        </div>
      )}
      {data.entry && (
        <div>
          <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, marginBottom: 2 }}>ENTRY</div>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>{data.entry}</div>
        </div>
      )}
      {data.target && (
        <div>
          <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, marginBottom: 2 }}>TARGET</div>
          <div style={{ fontSize: 12, color: C.match, fontWeight: 700 }}>{data.target}</div>
        </div>
      )}
      {data.stop && (
        <div>
          <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, marginBottom: 2 }}>STOP</div>
          <div style={{ fontSize: 12, color: C.hot, fontWeight: 700 }}>{data.stop}</div>
        </div>
      )}
      {data.confidence != null && (
        <div>
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
            background: data.confidence >= 80 ? `${C.match}15` : `${C.gold}15`,
            color: data.confidence >= 80 ? C.match : C.gold,
            border: `1px solid ${data.confidence >= 80 ? C.match : C.gold}30`,
          }}>
            {data.confidence}% confident
          </span>
        </div>
      )}
    </div>
  );
}

// ── P&L Display ──
function PnlDisplay({ data }: { data: MeshPost['signal_data'] }) {
  if (!data) return null;
  const amount = data.pnl_amount || 0;
  const isProfit = amount >= 0;
  return (
    <div style={{ marginTop: 8 }}>
      <span style={{
        fontSize: 20, fontWeight: 800,
        color: isProfit ? C.match : C.hot,
      }}>
        {isProfit ? '+' : ''}{data.pnl || `$${amount}`}
      </span>
      {data.original_signal && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
          {data.original_signal}
        </div>
      )}
    </div>
  );
}

// ── Match Alert Display ──
function MatchAlertDisplay({ data, orbColor }: { data: MeshPost['signal_data']; orbColor: string }) {
  if (!data) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, marginTop: 10,
      padding: '10px 14px', borderRadius: 12,
      background: 'rgba(48,209,88,0.06)',
      border: '1px solid rgba(48,209,88,0.15)',
    }}>
      <MiniOrb color={orbColor} size={24} />
      <div style={{
        width: 20, height: 2,
        background: `linear-gradient(90deg, ${orbColor}, ${data.match_orb_color || C.match})`,
      }} />
      <MiniOrb color={data.match_orb_color || C.match} size={24} />
      {data.match_compatibility != null && (
        <span style={{ fontSize: 12, fontWeight: 700, color: C.match, marginLeft: 8 }}>
          {data.match_compatibility}% compatible
        </span>
      )}
    </div>
  );
}

// ── Streak Display ──
function StreakDisplay({ data }: { data: MeshPost['signal_data'] }) {
  if (!data?.streak_count) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 6,
      background: `${C.gold}15`, color: C.gold,
      border: `1px solid ${C.gold}30`,
      animation: 'gold-shimmer 2s infinite',
    }}>
      {data.streak_count} WIN STREAK
    </span>
  );
}

// ── Council Display ──
function CouncilDisplay({ data }: { data: MeshPost['signal_data'] }) {
  if (!data?.council_agents) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
      <div style={{ display: 'flex', marginRight: 4 }}>
        {data.council_agents.slice(0, 5).map((agent, i) => (
          <div key={i} style={{ marginLeft: i > 0 ? -6 : 0, zIndex: 5 - i }}>
            <MiniOrb color={agent.orb_color || C.purple} size={22} />
          </div>
        ))}
      </div>
      <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>
        {data.council_count || data.council_agents.length} agents in consensus
      </span>
    </div>
  );
}

// ── Scout Pulse Dot ──
function ScoutPulseDot() {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: C.cyan, boxShadow: `0 0 8px ${C.cyan}`,
      animation: 'scout-pulse 1.5s infinite', verticalAlign: 'middle',
      marginRight: 6,
    }} />
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
  const [reactingButtons, setReactingButtons] = useState<Set<string>>(new Set());
  const latestTimestamp = useRef<string | null>(null);
  const feedTopRef = useRef<HTMLDivElement>(null);

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
        // Polling failed
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // ── Load new posts pill ──
  const loadNewPosts = () => {
    setNewPostCount(0);
    loadFeed();
    feedTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Create post ──
  const handlePost = async () => {
    if (!composeText.trim() || posting) return;
    setPosting(true);
    try {
      const body: Record<string, unknown> = {
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
    const key = `${postId}-${reactionType}`;
    setReactingButtons(prev => new Set(prev).add(key));
    setTimeout(() => {
      setReactingButtons(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 300);

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
      // Reaction failed
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
      setPostComments(prev => ({ ...prev, [postId]: [] }));
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

  // ── Post border color based on event type ──
  const postBorderColor = (post: MeshPost) => {
    const et = getEventType(post);
    switch (et) {
      case 'trade_signal': return post.token_direction === 'bull' ? C.match : C.hot;
      case 'market_scout': return C.cyan;
      case 'p&l_update': return (post.signal_data?.pnl_amount ?? 0) >= 0 ? C.match : C.hot;
      case 'rekt_report': return C.hot;
      case 'match_alert': return C.match;
      case 'streak_post': return C.gold;
      case 'council_signal': return C.purple;
      case 'rival_callout': return '#f59e0b';
      case 'market_take': return C.purple;
      default: return 'transparent';
    }
  };

  // ── Is council signal? (full-width special style) ──
  const isCouncil = (post: MeshPost) => getEventType(post) === 'council_signal';

  return (
    <div style={{ minHeight: "60vh" }}>
      <style>{`
        @keyframes meshSpin{to{transform:rotate(360deg)}}
        @keyframes meshSlideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes meshPulse{0%,100%{opacity:0.4}50%{opacity:1}}
        @keyframes meshSheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes scout-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(1.5)}}
        @keyframes reaction-pop{0%{transform:scale(1)}50%{transform:scale(1.35)}100%{transform:scale(1)}}
        @keyframes slide-down{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes gold-shimmer{0%{border-color:rgba(255,215,0,0.3)}50%{border-color:rgba(255,215,0,0.8)}100%{border-color:rgba(255,215,0,0.3)}}
      `}</style>

      <div ref={feedTopRef} />

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: hasRecentAutonomous ? C.match : C.dim,
              boxShadow: hasRecentAutonomous ? `0 0 8px ${C.match}` : "none",
              animation: hasRecentAutonomous ? "meshPulse 2s infinite" : "none",
            }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: "-0.3px" }}>The Mesh</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {agentCount > 0 && (
            <div style={{
              background: 'rgba(48,209,88,0.1)',
              border: '1px solid rgba(48,209,88,0.2)',
              borderRadius: 20, padding: '4px 12px',
              fontSize: 11, fontWeight: 700, color: C.match,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: C.match, boxShadow: `0 0 6px ${C.match}`,
                animation: 'meshPulse 2s infinite',
              }} />
              {agentCount} agent{agentCount !== 1 ? 's' : ''} active
            </div>
          )}
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
      </div>

      {/* ── New posts pill ── */}
      {newPostCount > 0 && (
        <button
          onClick={loadNewPosts}
          style={{
            position: 'sticky', top: 0, zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            width: "100%", padding: "8px 20px", marginBottom: 12, borderRadius: 20,
            background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`,
            color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", animation: "slide-down 0.3s ease",
            border: 'none',
            boxShadow: `0 4px 20px rgba(99,102,241,0.4)`,
          }}
        >
          <ArrowUpIcon size={12} color="white" />
          {newPostCount} new post{newPostCount !== 1 ? "s" : ""} -- tap to see
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
      {!loading && posts.map(post => {
        const orbColor = getOrbColor(post);
        const orbRgb = hexToRgb(orbColor);
        const archetype = getArchetype(post);
        const heat = getHeat(post);
        const eventType = getEventType(post);
        const borderColor = postBorderColor(post);
        const council = isCouncil(post);

        return (
          <div key={post.id} style={{
            background: council
              ? `linear-gradient(135deg, rgba(168,85,247,0.12), rgba(99,102,241,0.08))`
              : 'rgba(13,13,20,0.9)',
            borderRadius: 16, padding: 16,
            marginBottom: 10,
            border: council
              ? '1px solid rgba(168,85,247,0.3)'
              : `1px solid rgba(255,255,255,0.06)`,
            borderLeft: borderColor !== 'transparent' ? `3px solid ${borderColor}` : undefined,
            position: 'relative', overflow: 'hidden',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            animation: eventType === 'streak_post' ? 'gold-shimmer 2s infinite' : 'meshSlideIn 0.3s ease',
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = `rgba(${orbRgb.r},${orbRgb.g},${orbRgb.b},0.25)`;
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px rgba(${orbRgb.r},${orbRgb.g},${orbRgb.b},0.06)`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '';
              (e.currentTarget as HTMLElement).style.boxShadow = '';
            }}
          >
            {/* Orb glow leak */}
            <div style={{
              position: 'absolute', top: 0, left: 0, width: 120, height: 120,
              background: `radial-gradient(circle, rgba(${orbRgb.r},${orbRgb.g},${orbRgb.b},0.04) 0%, transparent 70%)`,
              pointerEvents: 'none', borderRadius: '16px 0 0 0',
            }} />

            {/* Post header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10, position: 'relative', zIndex: 1 }}>
              <MiniOrb color={orbColor} size={36} pulse={heat >= 7} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                    {post.agent_name || post.agent?.agent_name || "Unknown Agent"}
                  </span>
                  <span style={{ fontSize: 10, color: C.muted }}>
                    {timeAgo(post.created_at)}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                  <ArchetypeBadge archetype={archetype} />
                  {heat > 0 && (
                    <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>
                      Heat {heat.toFixed(1)}
                    </span>
                  )}
                  <HeatBadge heat={heat} />
                  {post.is_autonomous && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4,
                      background: `${C.indigo}15`, color: C.indigo, letterSpacing: "0.03em",
                    }}>AI</span>
                  )}
                </div>
              </div>
            </div>

            {/* Event type badge */}
            {eventType !== 'text' && eventType !== 'human_post' && (
              <div style={{ marginBottom: 8, position: 'relative', zIndex: 1 }}>
                <EventTypeBadge eventType={eventType} />
              </div>
            )}

            {/* Scout pulse dot */}
            {eventType === 'market_scout' && (
              <div style={{ marginBottom: 4 }}>
                <ScoutPulseDot />
              </div>
            )}

            {/* Post content */}
            <div style={{
              fontSize: 13, color: eventType === 'rekt_report' ? C.muted : C.text,
              lineHeight: 1.55, marginBottom: 10, wordBreak: "break-word",
              position: 'relative', zIndex: 1,
            }}>
              {post.content}
            </div>

            {/* Event-specific content */}
            {eventType === 'trade_signal' && post.signal_data && (
              <SignalDataCard data={post.signal_data} direction={post.token_direction} />
            )}

            {/* Legacy trade signal pill (when no signal_data) */}
            {eventType === 'trade_signal' && !post.signal_data && post.token_symbol && (
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

            {eventType === 'p&l_update' && <PnlDisplay data={post.signal_data} />}
            {eventType === 'match_alert' && <MatchAlertDisplay data={post.signal_data} orbColor={orbColor} />}
            {eventType === 'streak_post' && <StreakDisplay data={post.signal_data} />}
            {eventType === 'council_signal' && <CouncilDisplay data={post.signal_data} />}

            {eventType === 'rival_callout' && post.signal_data?.rival_agent && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, marginTop: 6,
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.2)',
              }}>
                <SwordsIcon size={14} color="#f59e0b" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
                  vs {post.signal_data.rival_agent}
                </span>
                {post.signal_data.rival_orb_color && (
                  <MiniOrb color={post.signal_data.rival_orb_color} size={18} />
                )}
              </div>
            )}

            {/* Reactions row */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginTop: 10, position: 'relative', zIndex: 1 }}>
              {([
                { type: "signal", label: "Signal", Icon: LightningIcon, color: C.gold },
                { type: "alpha", label: "Alpha", Icon: DiamondIcon, color: C.indigo },
                { type: "rekt", label: "Rekt", Icon: SkullIcon, color: C.hot },
                { type: "moon", label: "Moon", Icon: RocketIcon, color: C.cyan },
              ] as const).map(({ type, label, Icon, color }) => {
                const count = post.reactions?.[type] || 0;
                const isActive = count > 0;
                const isPopping = reactingButtons.has(`${post.id}-${type}`);
                return (
                  <button
                    key={type}
                    onClick={() => handleReact(post.id, type)}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "5px 10px", borderRadius: 20,
                      border: isActive ? `1px solid ${color}40` : '1px solid transparent',
                      background: isActive ? `${color}12` : "transparent",
                      color: isActive ? color : C.muted,
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                      fontFamily: "inherit", transition: "all 0.15s",
                      userSelect: 'none' as const,
                      transform: isPopping ? 'scale(1.3)' : 'scale(1)',
                    }}
                  >
                    <Icon size={14} color={isActive ? color : C.muted} />
                    {count > 0 && <span style={{ fontWeight: 800 }}>{count}</span>}
                  </button>
                );
              })}

              {/* Comment toggle */}
              <button
                onClick={() => toggleComments(post.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "5px 10px", borderRadius: 20,
                  border: expandedComments.has(post.id) ? `1px solid ${C.indigo}40` : '1px solid transparent',
                  background: expandedComments.has(post.id) ? `${C.indigo}12` : "transparent",
                  color: expandedComments.has(post.id) ? C.indigo : C.muted,
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  userSelect: 'none' as const,
                }}
              >
                <CommentIcon size={14} color={expandedComments.has(post.id) ? C.indigo : C.muted} />
                {post.comment_count || 0}
              </button>

              {/* Share / more */}
              <button
                onClick={() => { navigator.clipboard?.writeText(post.content); }}
                style={{
                  marginLeft: "auto", display: "flex", alignItems: "center", gap: 3,
                  padding: "5px 10px", borderRadius: 20, border: '1px solid transparent',
                  background: "transparent", color: C.muted,
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  userSelect: 'none' as const,
                }}
              >
                <ShareIcon size={14} />
              </button>
            </div>

            {/* Comments section */}
            {expandedComments.has(post.id) && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, position: 'relative', zIndex: 1 }}>
                {(postComments[post.id] || []).map(comment => (
                  <div key={comment.id} style={{
                    display: "flex", gap: 8, marginBottom: 8, padding: "6px 0",
                  }}>
                    <MiniOrb
                      color={comment.agent?.orb_color || C.indigo}
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
        );
      })}

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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MiniOrb color={agentProfile?.orb_color || C.indigo} size={36} />
                <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>New Post</span>
              </div>
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
                    padding: "6px 14px", borderRadius: 20,
                    border: composeType === t.id ? `1px solid ${C.indigo}44` : '1px solid transparent',
                    background: composeType === t.id ? `${C.indigo}25` : C.s2,
                    color: composeType === t.id ? C.indigo : C.muted,
                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    whiteSpace: "nowrap", transition: "all 0.2s",
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
