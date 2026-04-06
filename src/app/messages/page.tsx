"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";
import { C } from "@/lib/theme";
import type { ChatMessage } from "@/lib/theme";

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

/* ── main component ─────────────────────────────────────────── */

export default function MessagesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [conversations, setConversations] = useState<ConversationDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ghostMode, setGhostMode] = useState(false);
  const [toggleBurst, setToggleBurst] = useState(false);
  const [pressedRow, setPressedRow] = useState<string | null>(null);
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
  const toggleTrackBg = ghostMode
    ? "rgba(255,255,255,0.10)"
    : C.accent;
  const activeColor = ghostMode ? C.muted : C.accent;

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
      `}</style>

      {/* ── Large title ── */}
      <div style={{ padding: "60px 20px 0" }}>
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
      <div style={{ padding: "16px 20px 0" }}>
        <div
          style={{
            background: C.glass,
            border: `1px solid ${C.glassBorder}`,
            borderRadius: 16,
            padding: "16px 20px",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
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
            <div
              style={{ position: "relative" }}
            >
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
                  transition: "background 0.35s cubic-bezier(0.4,0,0.2,1)",
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
      <div style={{ padding: "14px 20px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: C.glass,
            border: `1px solid ${C.glassBorder}`,
            borderRadius: 20,
            padding: "10px 16px",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <SearchIcon color={C.muted} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: C.text,
              fontSize: 15,
              fontWeight: 400,
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
      <div style={{ flex: 1, padding: "12px 20px 100px" }}>
        {authLoading || loading ? (
          /* Loading spinner */
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              paddingTop: 60,
            }}
          >
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
        ) : ghostMode ? (
          /* Ghost mode state */
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
              }}
            >
              Your messages are hidden. Switch to Live to see and send messages.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
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
            <ChatBubbleIcon color={C.muted} size={64} />
            <p
              style={{
                color: C.text,
                fontSize: 17,
                fontWeight: 600,
                margin: 0,
              }}
            >
              {search ? "No results" : "No messages yet"}
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
              {search
                ? "No conversations match your search."
                : "When you crack an orb or someone cracks yours, a conversation opens here automatically."}
            </p>
          </div>
        ) : (
          /* Thread list */
          <div>
            {filtered.map((conv, idx) => (
              <button
                key={conv.partner_id}
                onClick={() => router.push(`/messages/${conv.partner_id}`)}
                onPointerDown={() => setPressedRow(conv.partner_id)}
                onPointerUp={() => setPressedRow(null)}
                onPointerLeave={() => setPressedRow(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  width: "100%",
                  background:
                    pressedRow === conv.partner_id
                      ? "rgba(255,255,255,0.06)"
                      : "transparent",
                  border: "none",
                  borderBottom:
                    idx < filtered.length - 1
                      ? `1px solid ${C.glassBorder}`
                      : "none",
                  borderRadius: 0,
                  padding: "14px 0",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s ease",
                  animation: `fadeSlideIn 0.25s ease ${idx * 0.04}s both`,
                }}
              >
                {/* Avatar circle - 52px */}
                <div
                  style={{
                    width: 52,
                    height: 52,
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
                        fontSize: 17,
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
                        fontSize: 16,
                        fontWeight: conv.unread_count > 0 ? 700 : 500,
                        letterSpacing: -0.1,
                      }}
                    >
                      {conv.partner_handle.startsWith("@")
                        ? conv.partner_handle
                        : `@${conv.partner_handle}`}
                    </span>
                    <span
                      style={{
                        color: C.muted,
                        fontSize: 13,
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
                        color:
                          conv.unread_count > 0 ? C.text : C.muted,
                        fontSize: 14,
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
                        }}
                      >
                        <span
                          style={{
                            color: "#000",
                            fontSize: 12,
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

                {/* Chevron */}
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
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
