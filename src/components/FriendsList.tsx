"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const C = {
  bg: "#0a0a0f",
  surface: "#0d0d14",
  card: "#1a1a24",
  primary: "#00FF88",
  gold: "#88FF00",
  text: "#FFFFFF",
  muted: "#8a8a99",
  border: "rgba(255,255,255,0.06)",
  danger: "#EF4444",
};

type FriendRow = {
  friendship_id: string;
  user_id: string;
  handle: string | null;
  avatar_url: string | null;
  created_at: string;
};

type SearchResult = {
  user_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

interface Props {
  onOpenChat?: (userId: string, handle: string | null) => void;
}

export default function FriendsList({ onOpenChat }: Props) {
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [incoming, setIncoming] = useState<FriendRow[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authHeader = useCallback(async (): Promise<HeadersInit | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    return { Authorization: `Bearer ${session.access_token}` };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const headers = await authHeader();
    if (!headers) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/friends/list", { headers });
      const json = await res.json();
      setFriends(json.friends ?? []);
      setIncoming(json.incoming ?? []);
      setOutgoing(json.outgoing ?? []);
    } catch {
      setError("Failed to load friends");
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    t = setTimeout(async () => {
      setSearching(true);
      try {
        const headers = await authHeader();
        if (!headers) return;
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`, { headers });
        const json = await res.json();
        setSearchResults(json.results ?? []);
      } catch {
        /* ignore */
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => {
      if (t) clearTimeout(t);
    };
  }, [query, authHeader]);

  const sendRequest = async (userId: string) => {
    setBusyId(userId);
    setError(null);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Request failed");
      } else {
        setQuery("");
        setSearchResults([]);
        refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  const respond = async (requestId: string, accept: boolean) => {
    setBusyId(requestId);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, accept }),
      });
      if (res.ok) refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ color: C.text }}>
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: 14,
          marginBottom: 16,
        }}
      >
        <label
          htmlFor="blink-friend-search"
          style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}
        >
          Find a hunter
        </label>
        <input
          id="blink-friend-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="@handle or name"
          style={{
            width: "100%",
            background: C.bg,
            border: `1px solid ${C.border}`,
            color: C.text,
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 14,
            outline: "none",
          }}
        />
        {(searchResults.length > 0 || searching) && (
          <div style={{ marginTop: 10 }}>
            {searching && <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Searching…</p>}
            {searchResults.map((r) => (
              <div
                key={r.user_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 4px",
                  borderTop: `1px solid ${C.border}`,
                }}
              >
                <Avatar handle={r.handle ?? r.display_name ?? "?"} url={r.avatar_url ?? null} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    @{r.handle ?? r.display_name ?? "anon"}
                  </div>
                </div>
                <button
                  onClick={() => sendRequest(r.user_id)}
                  disabled={busyId === r.user_id}
                  style={ctaStyle()}
                >
                  {busyId === r.user_id ? "…" : "Add"}
                </button>
              </div>
            ))}
          </div>
        )}
        {error && (
          <p style={{ color: C.danger, fontSize: 12, marginTop: 8, marginBottom: 0 }}>{error}</p>
        )}
      </div>

      {incoming.length > 0 && (
        <Section title={`Requests (${incoming.length})`}>
          {incoming.map((r) => (
            <Row key={r.friendship_id} item={r}>
              <button onClick={() => respond(r.friendship_id, true)} disabled={busyId === r.friendship_id} style={ctaStyle()}>
                Accept
              </button>
              <button
                onClick={() => respond(r.friendship_id, false)}
                disabled={busyId === r.friendship_id}
                style={ghostBtn()}
              >
                Decline
              </button>
            </Row>
          ))}
        </Section>
      )}

      <Section title={`Friends (${friends.length})`}>
        {loading && <p style={{ color: C.muted, fontSize: 13, margin: "8px 0" }}>Loading…</p>}
        {!loading && friends.length === 0 && (
          <p style={{ color: C.muted, fontSize: 13, margin: "8px 0" }}>
            No friends yet. Search a handle above to add one.
          </p>
        )}
        {friends.map((f) => (
          <Row key={f.friendship_id} item={f}>
            {onOpenChat && (
              <button onClick={() => onOpenChat(f.user_id, f.handle)} style={ctaStyle()}>
                Message
              </button>
            )}
          </Row>
        ))}
      </Section>

      {outgoing.length > 0 && (
        <Section title={`Pending (${outgoing.length})`}>
          {outgoing.map((f) => (
            <Row key={f.friendship_id} item={f}>
              <span style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>Sent</span>
            </Row>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}

function Row({ item, children }: { item: FriendRow; children?: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 12,
        marginBottom: 6,
        background: C.surface,
        border: `1px solid ${C.border}`,
      }}
    >
      <Avatar handle={item.handle ?? "?"} url={item.avatar_url} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          @{item.handle ?? "anon"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>{children}</div>
    </div>
  );
}

function Avatar({ handle, url }: { handle: string; url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: `1px solid ${C.border}` }}
      />
    );
  }
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${C.primary}, ${C.gold})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#0a0a0f",
        fontWeight: 800,
        fontSize: 13,
      }}
    >
      {(handle ?? "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

function ctaStyle(): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 10,
    border: "none",
    background: C.primary,
    color: "#0a0a0f",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  };
}

function ghostBtn(): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 10,
    background: "transparent",
    border: `1px solid ${C.border}`,
    color: C.muted,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  };
}
