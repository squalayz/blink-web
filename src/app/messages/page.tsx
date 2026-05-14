"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";
import { C } from "@/lib/theme";
import type { ChatMessage } from "@/lib/theme";
import Skeleton from "@/components/Skeleton";
import { useIsDesktop } from "@/hooks/useIsDesktop";

/* ── types ─────────────────────────────────────────────────── */

interface ConversationDisplay {
  partner_id: string;
  partner_handle: string;
  partner_avatar: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

/* ── helpers ────────────────────────────────────────────────── */

function initials(handle: string): string {
  if (!handle) return "?";
  return handle.replace("@", "").slice(0, 2).toUpperCase();
}

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function avatarBg(handle: string): string {
  const colors = [C.primary, C.accent, C.gold, C.rareBlue];
  let hash = 0;
  for (let i = 0; i < handle.length; i++) {
    hash = (hash + handle.charCodeAt(i)) % colors.length;
  }
  return colors[hash];
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ── particle burst component ──────────────────────────────── */

function ParticleBurst({ active, color }: { active: boolean; color: string }) {
  const [particles, setParticles] = useState<
    { id: number; angle: number; distance: number }[]
  >([]);
  const counterRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const id = ++counterRef.current;
    const newParticles = Array.from({ length: 6 }, (_, i) => ({
      id: id * 10 + i,
      angle: i * 60 + Math.random() * 20 - 10,
      distance: 28 + Math.random() * 14,
    }));
    setParticles(newParticles);
    const timer = setTimeout(() => setParticles([]), 500);
    return () => clearTimeout(timer);
  }, [active]);

  return (
    <>
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * p.distance;
        const ty = Math.sin(rad) * p.distance;
        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: color,
              left: "50%",
              top: "50%",
              marginLeft: -2.5,
              marginTop: -2.5,
              opacity: 0,
              transform: `translate(${tx}px, ${ty}px) scale(0)`,
              animation: "particleBurst 0.45s cubic-bezier(0.2,0.8,0.3,1) forwards",
              boxShadow: `0 0 6px ${color}`,
            }}
          />
        );
      })}
    </>
  );
}

/* ── SVG icons ──────────────────────────────────────────────── */

function EyeSlashIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function EyeIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SearchIcon({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ChatBubbleIcon({ color, size = 64 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

/* ── ChatPanel (embedded in desktop split-pane) ────────────── */

function ChatPanel({
  partnerId,
  user,
}: {
  partnerId: string;
  user: { id: string };
}) {
  const { isDesktop } = useIsDesktop();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [partnerHandle, setPartnerHandle] = useState(partnerId.slice(0, 8));
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null);
  const [sendHovered, setSendHovered] = useState(false);
  const [sendPressed, setSendPressed] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load partner profile
  useEffect(() => {
    if (!partnerId) return;
    supabase
      .from("profiles")
      .select("handle, avatar_url")
      .eq("id", partnerId)
      .single()
      .then(({ data }) => {
        if (data) {
          setPartnerHandle(data.handle || partnerId.slice(0, 8));
          setPartnerAvatar(data.avatar_url || null);
        }
      });
  }, [partnerId]);

  // Load messages + subscribe
  useEffect(() => {
    mountedRef.current = true;
    if (!partnerId) return;

    setLoading(true);
    setMessages([]);

    supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data && mountedRef.current) {
          setMessages(data as ChatMessage[]);
        }
        if (mountedRef.current) setLoading(false);
      });

    // Mark received messages as read
    supabase
      .from("messages")
      .update({ read: true })
      .eq("receiver_id", user.id)
      .eq("sender_id", partnerId)
      .eq("read", false)
      .then(() => {});

    // Real-time subscription
    const channel = supabase
      .channel(`chat_panel_${[user.id, partnerId].sort().join("_")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          if (!mountedRef.current) return;
          const msg = payload.new as ChatMessage;
          const isRelevant =
            (msg.sender_id === user.id && msg.receiver_id === partnerId) ||
            (msg.sender_id === partnerId && msg.receiver_id === user.id);
          if (!isRelevant) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (msg.receiver_id === user.id) {
            supabase
              .from("messages")
              .update({ read: true })
              .eq("id", msg.id)
              .then(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [user.id, partnerId]);

  // Auto-scroll
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function sendMessage() {
    if (!text.trim() || !partnerId || sending) return;
    const msgText = text.trim();
    setText("");
    setSending(true);

    const tempId = `temp_${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      sender_id: user.id,
      receiver_id: partnerId,
      content: msgText,
      created_at: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        receiver_id: partnerId,
        content: msgText,
        read: false,
      })
      .select()
      .single();

    if (!mountedRef.current) return;

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(msgText);
    } else if (data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? (data as ChatMessage) : m))
      );
    }
    setSending(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const displayHandle = partnerHandle.startsWith("@")
    ? partnerHandle
    : `@${partnerHandle}`;

  const skeletonWidths = ["65%", "45%", "72%", "38%", "55%", "48%"];
  const skeletonAligns: ("flex-start" | "flex-end")[] = [
    "flex-start",
    "flex-end",
    "flex-start",
    "flex-end",
    "flex-start",
    "flex-end",
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: C.bg,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 20px",
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: partnerAvatar ? "transparent" : avatarBg(partnerHandle),
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {partnerAvatar ? (
            <img
              src={partnerAvatar}
              alt={partnerHandle}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
              {initials(partnerHandle)}
            </span>
          )}
        </div>
        <div>
          <div style={{ color: C.text, fontSize: 15, fontWeight: 700 }}>
            {displayHandle}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px 8px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {loading ? (
          <div style={{ paddingTop: 24 }}>
            {skeletonWidths.map((w, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: skeletonAligns[i],
                  marginBottom: 12,
                  animation: `shimmerStagger 1.5s ease-in-out ${i * 0.12}s infinite`,
                }}
              >
                <Skeleton
                  width={w}
                  height={isDesktop ? 42 : 38}
                  borderRadius={18}
                />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              gap: 12,
            }}
          >
            <ChatBubbleIcon color={C.muted} size={40} />
            <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
              No messages yet. Say hello!
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isSent = msg.sender_id === user.id;
            const prevMsg = messages[i - 1];
            const showTime =
              !prevMsg ||
              new Date(msg.created_at).getTime() -
                new Date(prevMsg.created_at).getTime() >
                5 * 60 * 1000;

            return (
              <div key={msg.id}>
                {showTime && (
                  <div
                    style={{
                      textAlign: "center",
                      color: C.muted,
                      fontSize: 11,
                      margin: "12px 0 6px",
                    }}
                  >
                    {formatTimestamp(msg.created_at)}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: isSent ? "flex-end" : "flex-start",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "72%",
                      background: isSent
                        ? `linear-gradient(135deg, ${C.primary}, ${C.indigo})`
                        : C.surface,
                      color: C.text,
                      borderRadius: isSent
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                      padding: "10px 14px",
                      fontSize: 14,
                      lineHeight: 1.45,
                      wordBreak: "break-word",
                      border: isSent ? "none" : `1px solid ${C.border}`,
                      opacity: msg.id.startsWith("temp_") ? 0.6 : 1,
                      transition: "opacity 0.2s",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 20px 16px",
          background: C.glass,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: `1px solid ${C.border}`,
          flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 22,
            padding: "11px 16px",
            color: C.text,
            fontSize: 14,
            outline: "none",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim() || sending}
          onMouseEnter={() => setSendHovered(true)}
          onMouseLeave={() => {
            setSendHovered(false);
            setSendPressed(false);
          }}
          onPointerDown={() => setSendPressed(true)}
          onPointerUp={() => setSendPressed(false)}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background:
              text.trim() && !sending ? C.primary : `${C.primary}55`,
            border: "none",
            cursor: text.trim() && !sending ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.2s, transform 0.12s",
            transform: sendPressed
              ? "scale(0.92)"
              : sendHovered
              ? "scale(1.06)"
              : "scale(1)",
          }}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

/* ── main component ─────────────────────────────────────────── */

export default function MessagesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isDesktop } = useIsDesktop();

  const [conversations, setConversations] = useState<ConversationDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ghostMode, setGhostMode] = useState(false);
  const [toggleBurst, setToggleBurst] = useState(false);
  const [pressedRow, setPressedRow] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);
  const [ctaPressed, setCtaPressed] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    null
  );
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ── Supabase real-time ── */

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!mountedRef.current) return;

    if (error || !data) {
      setLoading(false);
      return;
    }

    const map = new Map<string, ConversationDisplay>();

    for (const msg of data as ChatMessage[]) {
      const partnerId =
        msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

      if (!map.has(partnerId)) {
        map.set(partnerId, {
          partner_id: partnerId,
          partner_handle: partnerId.slice(0, 8),
          partner_avatar: null,
          last_message: msg.content,
          last_message_at: msg.created_at,
          unread_count: !msg.read && msg.receiver_id === user.id ? 1 : 0,
        });
      } else {
        const existing = map.get(partnerId)!;
        if (!msg.read && msg.receiver_id === user.id) {
          existing.unread_count += 1;
        }
      }
    }

    const partnerIds = Array.from(map.keys());
    if (partnerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, handle, avatar_url")
        .in("id", partnerIds);

      if (profiles) {
        for (const p of profiles) {
          const conv = map.get(p.id);
          if (conv) {
            conv.partner_handle = p.handle || p.id.slice(0, 8);
            conv.partner_avatar = p.avatar_url || null;
          }
        }
      }
    }

    if (mountedRef.current) {
      setConversations(Array.from(map.values()));
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchConversations();

    const channel = supabase
      .channel(`messages-user-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          if (mountedRef.current) fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          if (mountedRef.current) fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  /* ── toggle handler ── */

  function handleToggle() {
    setGhostMode((prev) => !prev);
    setToggleBurst(true);
    setTimeout(() => setToggleBurst(false), 50);
  }

  /* ── filter ── */

  const filtered = conversations.filter((c) =>
    c.partner_handle.toLowerCase().includes(search.toLowerCase())
  );

  /* ── derived sizes ── */

  const avatarSize = isDesktop ? 48 : 52;
  const skeletonCount = isDesktop ? 8 : 5;

  /* ── conversation click handler ── */

  function handleConversationClick(partnerId: string) {
    if (isDesktop) {
      setSelectedPartnerId(partnerId);
    } else {
      router.push(`/messages/${partnerId}`);
    }
  }

  /* ── unauthenticated ── */

  if (!authLoading && !user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 32,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <ChatBubbleIcon color={C.muted} size={48} />
        <p
          style={{
            color: C.text,
            fontSize: 16,
            fontWeight: 600,
            margin: 0,
          }}
        >
          Sign in to view messages
        </p>
        <button
          onClick={() => router.push("/auth/signin")}
          style={{
            background: C.primary,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "12px 28px",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Sign In
        </button>
      </div>
    );
  }

  /* ── main render ── */

  const toggleKnobLeft = ghostMode ? 4 : 36;
  const toggleTrackBg = ghostMode ? "rgba(255,255,255,0.10)" : C.accent;
  const activeColor = ghostMode ? C.muted : C.accent;

  /* ── Conversation list content (shared between mobile & desktop sidebar) ── */

  function renderConversationListContent() {
    if (authLoading || loading) {
      return (
        <div style={{ paddingTop: 8 }}>
          {Array.from({ length: skeletonCount }, (_, i) => i).map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: isDesktop ? 12 : 14,
                padding: isDesktop ? "12px 16px" : "14px 0",
                borderBottom:
                  i < skeletonCount - 1
                    ? `1px solid ${C.glassBorder}`
                    : "none",
                borderRadius: isDesktop ? 10 : 0,
                opacity: 1,
                animation: `shimmerStagger 1.5s ease-in-out ${i * 0.12}s infinite`,
              }}
            >
              <Skeleton
                width={avatarSize}
                height={avatarSize}
                borderRadius="50%"
              />
              <div style={{ flex: 1 }}>
                <Skeleton width="45%" height={14} borderRadius={7} />
                <div style={{ height: 8 }} />
                <Skeleton width="70%" height={12} borderRadius={6} />
              </div>
              <Skeleton width={28} height={12} borderRadius={6} />
            </div>
          ))}
        </div>
      );
    }

    if (ghostMode) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 80,
            gap: 14,
            animation: "fadeSlideIn 0.3s ease",
          }}
        >
          <EyeSlashIcon color={C.muted} size={56} />
          <p
            style={{
              color: C.text,
              fontSize: 17,
              fontWeight: 600,
              margin: 0,
            }}
          >
            Ghost Mode Active
          </p>
          <p
            style={{
              color: C.muted,
              fontSize: 14,
              margin: 0,
              textAlign: "center",
              lineHeight: 1.5,
              maxWidth: 280,
              padding: "0 16px",
            }}
          >
            Your messages are hidden. Switch to Live to see and send messages.
          </p>
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: isDesktop ? 60 : 80,
            gap: 16,
            animation: "emptyFadeIn 0.45s ease both",
            padding: "0 16px",
          }}
        >
          <div
            style={{
              width: isDesktop ? 64 : 80,
              height: isDesktop ? 64 : 80,
              borderRadius: "50%",
              background: "rgba(0,255,136, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 4,
              marginTop: isDesktop ? 60 : 0,
            }}
          >
            <ChatBubbleIcon color={C.muted} size={isDesktop ? 64 : 80} />
          </div>
          <p
            style={{
              color: C.text,
              fontSize: isDesktop ? 17 : 20,
              fontWeight: 700,
              margin: 0,
              letterSpacing: -0.2,
            }}
          >
            {search ? "No results" : "No messages yet"}
          </p>
          <p
            style={{
              color: C.muted,
              fontSize: isDesktop ? 13 : 14,
              margin: 0,
              textAlign: "center",
              lineHeight: 1.6,
              maxWidth: 300,
            }}
          >
            {search
              ? "No conversations match your search."
              : "No conversations yet. When you catch a creature or someone catches yours, a conversation opens here automatically."}
          </p>
          {!search && !isDesktop && (
            <button
              onClick={() => router.push("/watch")}
              onMouseEnter={() => setCtaHovered(true)}
              onMouseLeave={() => {
                setCtaHovered(false);
                setCtaPressed(false);
              }}
              onPointerDown={() => setCtaPressed(true)}
              onPointerUp={() => setCtaPressed(false)}
              style={{
                marginTop: 20,
                background: ctaPressed
                  ? `${C.primary}dd`
                  : ctaHovered
                  ? `linear-gradient(135deg, ${C.primary}, ${C.primary}cc)`
                  : C.primary,
                color: "#fff",
                border: "none",
                borderRadius: 14,
                padding: "13px 32px",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                transform: ctaPressed
                  ? "scale(0.97)"
                  : ctaHovered
                  ? "scale(1.03)"
                  : "scale(1)",
                transition: "transform 0.15s ease, background 0.15s ease",
                boxShadow: ctaHovered ? `0 4px 20px ${C.primary}44` : "none",
              }}
            >
              Start Watching
            </button>
          )}
        </div>
      );
    }

    return (
      <div>
        {filtered.map((conv, idx) => {
          const isHovered = hoveredRow === conv.partner_id;
          const isPressed = pressedRow === conv.partner_id;
          const isSelected =
            isDesktop && selectedPartnerId === conv.partner_id;
          return (
            <button
              key={conv.partner_id}
              onClick={() => handleConversationClick(conv.partner_id)}
              onPointerDown={() => setPressedRow(conv.partner_id)}
              onPointerUp={() => setPressedRow(null)}
              onPointerLeave={() => {
                setPressedRow(null);
                setHoveredRow(null);
              }}
              onMouseEnter={() => setHoveredRow(conv.partner_id)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: isDesktop ? 12 : 14,
                width: "100%",
                background: isSelected
                  ? "rgba(0,255,136, 0.12)"
                  : isPressed
                  ? "rgba(255,255,255,0.06)"
                  : isHovered && isDesktop
                  ? C.glass
                  : "transparent",
                border: "none",
                borderBottom: isDesktop
                  ? "none"
                  : idx < filtered.length - 1
                  ? `1px solid ${C.glassBorder}`
                  : "none",
                borderRadius: isDesktop ? 10 : 0,
                padding: isDesktop ? "12px 16px" : "14px 0",
                marginBottom: isDesktop ? 2 : 0,
                cursor: "pointer",
                textAlign: "left",
                transition:
                  "background 0.18s ease, transform 0.12s ease",
                animation: `fadeSlideIn 0.25s ease ${idx * 0.04}s both`,
                transform: isPressed ? "scale(0.99)" : "scale(1)",
                borderLeft: isSelected
                  ? `3px solid ${C.primary}`
                  : "3px solid transparent",
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              }}
            >
              {/* Avatar circle */}
              <div
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: "50%",
                  background: conv.partner_avatar
                    ? "transparent"
                    : avatarBg(conv.partner_handle),
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {conv.partner_avatar ? (
                  <img
                    src={conv.partner_avatar}
                    alt={conv.partner_handle}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      color: "#fff",
                      fontSize: isDesktop ? 16 : 17,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                    }}
                  >
                    {initials(conv.partner_handle)}
                  </span>
                )}

                {/* Unread dot on avatar */}
                {conv.unread_count > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 1,
                      right: 1,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: C.accent,
                      border: `2px solid ${C.bg}`,
                    }}
                  />
                )}
              </div>

              {/* Text content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      color: C.text,
                      fontSize: isDesktop ? 14 : 16,
                      fontWeight: conv.unread_count > 0 ? 700 : 500,
                      letterSpacing: -0.1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {conv.partner_handle.startsWith("@")
                      ? conv.partner_handle
                      : `@${conv.partner_handle}`}
                  </span>
                  <span
                    style={{
                      color: C.muted,
                      fontSize: isDesktop ? 12 : 13,
                      fontWeight: 400,
                      flexShrink: 0,
                      marginLeft: 8,
                    }}
                  >
                    {relativeTime(conv.last_message_at)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      color: conv.unread_count > 0 ? C.text : C.muted,
                      fontSize: isDesktop ? 13 : 14,
                      fontWeight: conv.unread_count > 0 ? 500 : 400,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flex: 1,
                      lineHeight: 1.3,
                    }}
                  >
                    {conv.last_message}
                  </span>

                  {/* Unread count badge */}
                  {conv.unread_count > 0 && (
                    <div
                      style={{
                        minWidth: 22,
                        height: 22,
                        borderRadius: 11,
                        background: C.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 6px",
                        flexShrink: 0,
                        boxShadow: "0 0 8px rgba(0,255,136,0.3)",
                      }}
                    >
                      <span
                        style={{
                          color: "#000",
                          fontSize: 11,
                          fontWeight: 700,
                          lineHeight: 1,
                        }}
                      >
                        {conv.unread_count > 99
                          ? "99+"
                          : conv.unread_count}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Chevron (mobile only) */}
              {!isDesktop && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={C.muted}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0, opacity: 0.5 }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  /* ── DESKTOP LAYOUT: split pane ── */

  if (isDesktop) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          justifyContent: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes particleBurst {
            0% { opacity: 1; transform: translate(0,0) scale(1); }
            100% { opacity: 0; transform: translate(var(--tx,0),var(--ty,0)) scale(0.2); }
          }
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes toggleSpring {
            0% { transform: scale(1); }
            40% { transform: scale(0.85, 1.15); }
            70% { transform: scale(1.05, 0.95); }
            100% { transform: scale(1); }
          }
          @keyframes shimmerStagger {
            0% { opacity: 0.4; }
            50% { opacity: 0.7; }
            100% { opacity: 0.4; }
          }
          @keyframes emptyFadeIn {
            from { opacity: 0; transform: translateY(16px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        <div
          style={{
            display: "flex",
            width: "100%",
            maxWidth: 1100,
            height: "100vh",
            overflow: "hidden",
          }}
        >
          {/* LEFT: conversation list sidebar */}
          <div
            style={{
              width: 320,
              minWidth: 320,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              borderRight: `1px solid ${C.border}`,
              overflow: "hidden",
            }}
          >
            {/* Title */}
            <div
              style={{
                padding: "20px 20px 0",
                flexShrink: 0,
              }}
            >
              <h1
                style={{
                  color: C.text,
                  fontSize: 24,
                  fontWeight: 800,
                  margin: 0,
                  letterSpacing: -0.5,
                }}
              >
                Messages
              </h1>
            </div>

            {/* Ghost / Live toggle card */}
            <div
              style={{
                padding: "14px 16px 0",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  background: C.glass,
                  border: ghostMode
                    ? `1px solid ${C.primary}44`
                    : `1px solid ${C.glassBorder}`,
                  borderRadius: 14,
                  padding: "12px 16px",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  transition: "border-color 0.3s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 3,
                      opacity: ghostMode ? 1 : 0.4,
                      transition: "opacity 0.3s ease",
                    }}
                  >
                    <EyeSlashIcon
                      color={ghostMode ? C.text : C.muted}
                      size={18}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: ghostMode ? C.text : C.muted,
                        transition: "color 0.3s ease",
                      }}
                    >
                      Ghost
                    </span>
                  </div>

                  <div style={{ position: "relative" }}>
                    <button
                      onClick={handleToggle}
                      style={{
                        width: 60,
                        height: 30,
                        borderRadius: 15,
                        border: "none",
                        background: toggleTrackBg,
                        cursor: "pointer",
                        position: "relative",
                        transition:
                          "background 0.35s cubic-bezier(0.4,0,0.2,1)",
                        padding: 0,
                        outline: "none",
                        boxShadow: ghostMode
                          ? "inset 0 1px 3px rgba(0,0,0,0.3)"
                          : `inset 0 1px 3px rgba(0,0,0,0.2), 0 0 12px ${C.accent}33`,
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 3,
                          left: ghostMode ? 4 : 30,
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: "#fff",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                          transition:
                            "left 0.35s cubic-bezier(0.34,1.56,0.64,1)",
                          animation: toggleBurst
                            ? "toggleSpring 0.35s ease"
                            : "none",
                        }}
                      />
                    </button>
                    <ParticleBurst active={toggleBurst} color={activeColor} />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 3,
                      opacity: ghostMode ? 0.4 : 1,
                      transition: "opacity 0.3s ease",
                    }}
                  >
                    <EyeIcon
                      color={ghostMode ? C.muted : C.accent}
                      size={18}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: ghostMode ? C.muted : C.accent,
                        transition: "color 0.3s ease",
                      }}
                    >
                      Live
                    </span>
                  </div>
                </div>

                <p
                  style={{
                    margin: "8px 0 0",
                    textAlign: "center",
                    fontSize: 11,
                    color: ghostMode ? C.muted : C.accent,
                    fontWeight: 500,
                    transition: "color 0.3s ease",
                    letterSpacing: 0.1,
                  }}
                >
                  {ghostMode
                    ? "Invisible to others"
                    : "You're visible. Matches can find you."}
                </p>
              </div>
            </div>

            {/* Search bar */}
            <div
              style={{
                padding: "12px 16px 0",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: C.glass,
                  border: `1px solid ${searchFocused ? C.primary : C.glassBorder}`,
                  borderRadius: 16,
                  padding: "8px 14px",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  transition: "border-color 0.25s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: searchFocused ? "scale(1.15)" : "scale(1)",
                    transition: "transform 0.2s ease",
                  }}
                >
                  <SearchIcon
                    color={searchFocused ? C.primary : C.muted}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: C.text,
                    fontSize: 14,
                    fontWeight: 400,
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "none",
                      borderRadius: "50%",
                      width: 20,
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={C.muted}
                      strokeWidth="3"
                      strokeLinecap="round"
                    >
                      <line x1="4" y1="4" x2="20" y2="20" />
                      <line x1="20" y1="4" x2="4" y2="20" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Conversation list (scrollable) */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "8px 12px 20px",
              }}
            >
              {renderConversationListContent()}
            </div>
          </div>

          {/* RIGHT: chat panel or placeholder */}
          <div
            style={{
              flex: 1,
              height: "100%",
              overflow: "hidden",
            }}
          >
            {selectedPartnerId && user ? (
              <ChatPanel partnerId={selectedPartnerId} user={user} />
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 16,
                  animation: "emptyFadeIn 0.45s ease both",
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: "rgba(0,255,136, 0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChatBubbleIcon color={C.muted} size={48} />
                </div>
                <p
                  style={{
                    color: C.text,
                    fontSize: 18,
                    fontWeight: 700,
                    margin: 0,
                    letterSpacing: -0.2,
                  }}
                >
                  Select a conversation
                </p>
                <p
                  style={{
                    color: C.muted,
                    fontSize: 14,
                    margin: 0,
                    textAlign: "center",
                    lineHeight: 1.5,
                    maxWidth: 280,
                  }}
                >
                  Choose a conversation from the list to start chatting.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── MOBILE LAYOUT ── */

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes particleBurst {
          0% { opacity: 1; transform: translate(0,0) scale(1); }
          100% { opacity: 0; transform: translate(var(--tx,0),var(--ty,0)) scale(0.2); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes toggleSpring {
          0% { transform: scale(1); }
          40% { transform: scale(0.85, 1.15); }
          70% { transform: scale(1.05, 0.95); }
          100% { transform: scale(1); }
        }
        @keyframes shimmerStagger {
          0% { opacity: 0.4; }
          50% { opacity: 0.7; }
          100% { opacity: 0.4; }
        }
        @keyframes emptyFadeIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* ── Large title ── */}
      <div
        style={{
          padding: "60px 20px 0",
          boxSizing: "border-box",
        }}
      >
        <h1
          style={{
            color: C.text,
            fontSize: 32,
            fontWeight: 800,
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          Messages
        </h1>
      </div>

      {/* ── Ghost / Live toggle card ── */}
      <div
        style={{
          padding: "16px 20px 0",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            background: C.glass,
            border: ghostMode
              ? `1px solid ${C.primary}44`
              : `1px solid ${C.glassBorder}`,
            borderRadius: 16,
            padding: "16px 20px",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            width: "100%",
            transition: "border-color 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Ghost side */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                opacity: ghostMode ? 1 : 0.4,
                transition: "opacity 0.3s ease",
              }}
            >
              <EyeSlashIcon
                color={ghostMode ? C.text : C.muted}
                size={22}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: ghostMode ? C.text : C.muted,
                  transition: "color 0.3s ease",
                }}
              >
                Ghost
              </span>
            </div>

            {/* Toggle switch */}
            <div style={{ position: "relative" }}>
              <button
                onClick={handleToggle}
                style={{
                  width: 72,
                  height: 36,
                  borderRadius: 18,
                  border: "none",
                  background: toggleTrackBg,
                  cursor: "pointer",
                  position: "relative",
                  transition:
                    "background 0.35s cubic-bezier(0.4,0,0.2,1)",
                  padding: 0,
                  outline: "none",
                  boxShadow: ghostMode
                    ? "inset 0 1px 3px rgba(0,0,0,0.3)"
                    : `inset 0 1px 3px rgba(0,0,0,0.2), 0 0 12px ${C.accent}33`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 3,
                    left: toggleKnobLeft,
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                    transition:
                      "left 0.35s cubic-bezier(0.34,1.56,0.64,1)",
                    animation: toggleBurst
                      ? "toggleSpring 0.35s ease"
                      : "none",
                  }}
                />
              </button>
              <ParticleBurst active={toggleBurst} color={activeColor} />
            </div>

            {/* Live side */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                opacity: ghostMode ? 0.4 : 1,
                transition: "opacity 0.3s ease",
              }}
            >
              <EyeIcon
                color={ghostMode ? C.muted : C.accent}
                size={22}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: ghostMode ? C.muted : C.accent,
                  transition: "color 0.3s ease",
                }}
              >
                Live
              </span>
            </div>
          </div>

          {/* Status text */}
          <p
            style={{
              margin: "10px 0 0",
              textAlign: "center",
              fontSize: 12,
              color: ghostMode ? C.muted : C.accent,
              fontWeight: 500,
              transition: "color 0.3s ease",
              letterSpacing: 0.1,
            }}
          >
            {ghostMode
              ? "Invisible to others"
              : "You're visible. Matches can find you."}
          </p>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div
        style={{
          padding: "14px 20px 0",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: C.glass,
            border: `1px solid ${searchFocused ? C.primary : C.glassBorder}`,
            borderRadius: 20,
            padding: "10px 16px",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            width: "100%",
            transition: "border-color 0.25s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: searchFocused ? "scale(1.15)" : "scale(1)",
              transition: "transform 0.2s ease",
            }}
          >
            <SearchIcon color={searchFocused ? C.primary : C.muted} />
          </div>
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: C.text,
              fontSize: 15,
              fontWeight: 400,
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "none",
                borderRadius: "50%",
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.muted}
                strokeWidth="3"
                strokeLinecap="round"
              >
                <line x1="4" y1="4" x2="20" y2="20" />
                <line x1="20" y1="4" x2="4" y2="20" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div
        style={{
          flex: 1,
          padding: "12px 20px 100px",
          boxSizing: "border-box",
        }}
      >
        {renderConversationListContent()}
      </div>
    </div>
  );
}
