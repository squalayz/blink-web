"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";
import { C } from "@/lib/theme";
import type { ChatMessage } from "@/lib/theme";

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

function initials(handle: string): string {
  if (!handle) return "?";
  return handle.replace("@", "").slice(0, 2).toUpperCase();
}

function avatarBg(handle: string): string {
  const colors = [C.primary, C.accent, C.gold, C.rareBlue];
  let hash = 0;
  for (let i = 0; i < handle.length; i++) {
    hash = (hash + handle.charCodeAt(i)) % colors.length;
  }
  return colors[hash];
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const partnerId = params?.id as string;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [partnerHandle, setPartnerHandle] = useState(partnerId?.slice(0, 8) || "");
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null);

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

  // Load message history + subscribe
  useEffect(() => {
    mountedRef.current = true;
    if (!user || !partnerId) return;

    // Fetch history
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
      .channel(`chat_${[user.id, partnerId].sort().join("_")}`)
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
            // Avoid duplicates (optimistic update may have added it)
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // Mark as read if received
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
  }, [user, partnerId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function sendMessage() {
    if (!text.trim() || !user || !partnerId || sending) return;
    const msgText = text.trim();
    setText("");
    setSending(true);

    // Optimistic insert
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
      // Revert optimistic
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(msgText);
    } else if (data) {
      // Replace optimistic with real record
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

  if (!authLoading && !user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: C.muted, fontSize: 15 }}>
          Sign in to view messages
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "52px 16px 14px",
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        {/* Back button */}
        <button
          onClick={() => router.back()}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 6,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={C.text}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Partner avatar */}
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

        {/* Name */}
        <div>
          <div style={{ color: C.text, fontSize: 15, fontWeight: 700 }}>
            {displayHandle}
          </div>
        </div>
      </div>

      {/* Messages list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 16px 8px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              paddingTop: 60,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                border: `3px solid ${C.border}`,
                borderTopColor: C.primary,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: 60,
              gap: 12,
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.muted}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
              No messages yet. Say hello!
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isSent = msg.sender_id === user?.id;
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
                      margin: "10px 0 6px",
                    }}
                  >
                    {relativeTime(msg.created_at)}
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
                      background: isSent ? C.primary : C.card,
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
          padding: "12px 16px 28px",
          background: C.surface,
          borderTop: `1px solid ${C.border}`,
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
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim() || sending}
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
            transition: "background 0.2s",
          }}
        >
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
        </button>
      </div>
    </div>
  );
}
