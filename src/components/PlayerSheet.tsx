"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { NearbyPlayer } from "@/components/HuntMap";

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

interface Props {
  player: NearbyPlayer;
  onClose: () => void;
  onMessage?: (userId: string, handle: string | null) => void;
}

interface ProfileSummary {
  user_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  joined_at: string | null;
  bestiary_count: number;
}

export default function PlayerSheet({ player, onClose, onMessage }: Props) {
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (!player.handle) {
          setProfile(null);
          return;
        }
        const res = await fetch(`/api/profile/${encodeURIComponent(player.handle)}`);
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json.profile) setProfile(json.profile);
        else setProfile(null);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [player.handle]);

  const auth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const addFriend = async () => {
    setBusy("friend");
    setStatus(null);
    try {
      const token = await auth();
      if (!token) return;
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: player.user_id }),
      });
      const json = await res.json();
      if (!res.ok) setStatus(json.error ?? "Failed");
      else setStatus(json.existing ? "Already sent" : "Request sent");
    } finally {
      setBusy(null);
    }
  };

  const block = async () => {
    if (!window.confirm("Block this hunter? You won't see each other on the map.")) return;
    setBusy("block");
    try {
      const token = await auth();
      if (!token) return;
      const res = await fetch("/api/users/block", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: player.user_id }),
      });
      if (res.ok) {
        setStatus("Blocked");
        setTimeout(onClose, 600);
      } else setStatus("Failed");
    } finally {
      setBusy(null);
    }
  };

  const submitReport = async () => {
    if (reportText.trim().length < 4) {
      setStatus("Please describe the issue (4+ chars)");
      return;
    }
    setBusy("report");
    try {
      const token = await auth();
      if (!token) return;
      const res = await fetch("/api/users/report", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: player.user_id, reason: reportText.trim() }),
      });
      if (res.ok) {
        setStatus("Report sent — thank you");
        setReportOpen(false);
        setReportText("");
      } else {
        const json = await res.json().catch(() => ({}));
        setStatus(json.error ?? "Failed");
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 80,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: C.surface,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          padding: "20px 20px 28px",
          color: C.text,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar handle={player.handle ?? "?"} url={player.avatar_url} large />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              @{player.handle ?? "anon"}
            </div>
            <div style={{ color: C.muted, fontSize: 12 }}>
              {player.is_friend ? "Friend · ~100m blur" : "Stranger · 300m blur"}
            </div>
            {loading ? (
              <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Loading profile…</div>
            ) : profile ? (
              <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                {profile.bestiary_count} caught · joined {profile.joined_at?.slice(0, 7) ?? "—"}
              </div>
            ) : null}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: C.muted,
              fontSize: 22,
              padding: 4,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {profile?.bio && (
          <p style={{ color: "#cfd3dd", fontSize: 13, lineHeight: 1.5, margin: "12px 0 0" }}>{profile.bio}</p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button onClick={addFriend} disabled={busy !== null} style={primaryBtn()}>
            {busy === "friend" ? "Sending…" : "Add Friend"}
          </button>
          <button
            onClick={() => onMessage?.(player.user_id, player.handle)}
            disabled={!onMessage}
            style={{ ...ghostBtn(), opacity: onMessage ? 1 : 0.5 }}
          >
            Message
          </button>
          <button onClick={() => setReportOpen((v) => !v)} style={ghostBtn()}>
            Report
          </button>
          <button onClick={block} disabled={busy !== null} style={{ ...ghostBtn(), color: C.danger, borderColor: "rgba(239,68,68,0.4)" }}>
            Block
          </button>
        </div>

        {reportOpen && (
          <div style={{ marginTop: 14 }}>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="What happened?"
              rows={3}
              style={{
                width: "100%",
                background: C.bg,
                border: `1px solid ${C.border}`,
                color: C.text,
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button onClick={() => setReportOpen(false)} style={ghostBtn()}>Cancel</button>
              <button onClick={submitReport} disabled={busy === "report"} style={primaryBtn()}>
                {busy === "report" ? "Sending…" : "Send report"}
              </button>
            </div>
          </div>
        )}

        {status && (
          <p style={{ color: C.muted, fontSize: 12, marginTop: 10, textAlign: "center" }}>{status}</p>
        )}
      </div>
    </div>
  );
}

function Avatar({ handle, url, large }: { handle: string; url: string | null; large?: boolean }) {
  const size = large ? 56 : 36;
  if (url) {
    return (
      <img
        src={url}
        alt=""
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `1px solid ${C.border}` }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${C.primary}, ${C.gold})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#0a0a0f",
        fontWeight: 800,
        fontSize: large ? 22 : 14,
      }}
    >
      {(handle ?? "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

function primaryBtn(): React.CSSProperties {
  return {
    padding: "12px 0",
    borderRadius: 12,
    border: "none",
    background: C.primary,
    color: "#0a0a0f",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  };
}

function ghostBtn(): React.CSSProperties {
  return {
    padding: "12px 0",
    borderRadius: 12,
    background: "transparent",
    border: `1px solid ${C.border}`,
    color: C.text,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  };
}
