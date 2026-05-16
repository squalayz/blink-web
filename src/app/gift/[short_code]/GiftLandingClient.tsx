"use client";

// BLINK Spirit Gift — recipient landing page.
// Magic flow: hero, asset preview, privacy assurance, sign-in if needed,
// location prompt, then redirect to /map?gift=[code] where the spawn lives.

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";

interface GiftPreview {
  short_code: string;
  asset_type: "eth" | "blink" | "nft";
  asset_payload: {
    amount?: number;
    contract?: string;
    token_id?: string;
    preview_image?: string;
    preview_name?: string;
  };
  mode: "direct" | "public";
  anonymous: boolean;
  message: string | null;
  status: "pending" | "spawned" | "claimed" | "expired" | "refunded" | "failed";
  expires_at: string;
  claimed_at: string | null;
  recipient_username: string | null;
  sender: { handle: string | null; display_name: string | null } | null;
  winner_handle: string | null;
}

export default function GiftLandingClient() {
  const params = useParams<{ short_code: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const code = String(params.short_code || "").toLowerCase();

  const [gift, setGift] = useState<GiftPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState("");

  const [opening, setOpening] = useState(false);
  const [openErr, setOpenErr] = useState("");

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/gifts/${code}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gift not found");
      setGift(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (code) fetchPreview();
  }, [code, fetchPreview]);

  async function handleAuth(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setAuthErr("");
    setAuthBusy(true);
    try {
      const u = username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,30}$/.test(u)) {
        throw new Error("Username: 3–30 chars, letters/numbers/_ only.");
      }
      if (password.length < 8) throw new Error("Password must be at least 8 characters.");
      const endpoint = authMode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign-in failed");
      if (!data.access_token || !data.refresh_token) throw new Error("No session returned");
      const { error: setErr } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (setErr) throw setErr;
      setUsername("");
      setPassword("");
    } catch (err) {
      setAuthErr(err instanceof Error ? err.message : "Failed");
    } finally {
      setAuthBusy(false);
    }
  }

  async function acceptHunt() {
    if (!user) return;
    setOpenErr("");
    setOpening(true);
    try {
      // Defer location prompt + spawn creation to the hunt page so the user
      // only sees one geolocation dialog and one transition.
      router.push(`/gift/${code}/hunt`);
    } catch (err) {
      setOpenErr(err instanceof Error ? err.message : "Failed");
    } finally {
      setOpening(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div style={pageStyle}>
        <div style={{ padding: 60, textAlign: "center", color: C.muted }}>Unwrapping…</div>
      </div>
    );
  }

  if (error || !gift) {
    return (
      <div style={pageStyle}>
        <div style={centerCol}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Gift not found</h1>
          <div style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>{error || "This link doesn't lead anywhere."}</div>
          <Link href="/gift/new" style={primaryAnchor}>Send your own Spirit Gift</Link>
        </div>
      </div>
    );
  }

  const senderLabel = gift.anonymous
    ? "A mystery hunter"
    : gift.sender?.display_name || (gift.sender?.handle ? `@${gift.sender.handle}` : "Someone");

  // ──── Claimed ────
  if (gift.status === "claimed") {
    return (
      <div style={pageStyle}>
        <div style={centerCol}>
          <Glyph muted />
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, textAlign: "center" }}>
            Already captured
          </h1>
          <div style={{ color: C.muted, fontSize: 14, marginBottom: 6, textAlign: "center" }}>
            {gift.winner_handle ? `@${gift.winner_handle}` : "Another hunter"} caught this Spirit Gift
          </div>
          {gift.claimed_at && (
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 24, textAlign: "center" }}>
              {new Date(gift.claimed_at).toLocaleString()}
            </div>
          )}
          <Link href="/gift/new" style={primaryAnchor}>Send your own Spirit Gift</Link>
        </div>
      </div>
    );
  }

  // ──── Expired / refunded ────
  if (gift.status === "expired" || gift.status === "refunded") {
    return (
      <div style={pageStyle}>
        <div style={centerCol}>
          <Glyph muted />
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, textAlign: "center" }}>
            This gift has returned to its sender
          </h1>
          <div style={{ color: C.muted, fontSize: 14, marginBottom: 24, textAlign: "center" }}>
            Spirit Gifts only stay open for 24 hours.
          </div>
          <Link href="/gift/new" style={primaryAnchor}>Send your own Spirit Gift</Link>
        </div>
      </div>
    );
  }

  // ──── Pending / spawned ────
  const showAuthPanel = !user;

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "40px 22px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <Glyph />
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.32em",
              color: C.primary,
              textTransform: "uppercase",
              marginTop: 16,
              marginBottom: 6,
              textShadow: "0 0 12px rgba(0,255,136,0.45)",
            }}
          >
            Spirit Gift
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: C.text, margin: "4px 0 6px", letterSpacing: "-0.5px" }}>
            A Spirit Gift Awaits
          </h1>
          <div style={{ fontSize: 15, color: C.muted }}>
            {senderLabel} sent you a gift.
            {gift.recipient_username && gift.mode === "direct" && (
              <>
                {" "}
                <span style={{ color: C.text }}>(for @{gift.recipient_username})</span>
              </>
            )}
          </div>
        </div>

        <AssetCard gift={gift} />

        {gift.message && (
          <div
            style={{
              marginTop: 14,
              padding: "12px 14px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontSize: 14,
              color: C.text,
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted, marginBottom: 4 }}>
              Note
            </div>
            {gift.message}
          </div>
        )}

        {/* Privacy notice — CRITICAL, above location prompt */}
        <div
          style={{
            marginTop: 22,
            padding: "16px 16px",
            border: `1px solid ${C.primary}33`,
            background: "rgba(0,255,136,0.05)",
            borderRadius: 14,
            color: C.text,
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.2em",
              color: C.primary,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Your Location Is Private
          </div>
          No one — not even the sender — will know where you are. We just use it
          once to spawn your gift somewhere nearby for you to find.
        </div>

        {showAuthPanel ? (
          <form onSubmit={handleAuth} style={{ marginTop: 22 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {(["signup", "signin"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAuthMode(m)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 8,
                    border: "none",
                    background: authMode === m ? `${C.primary}22` : "transparent",
                    color: authMode === m ? C.primary : C.muted,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {m === "signup" ? "Create Account" : "Sign In"}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="password (8+ chars)"
              autoComplete={authMode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, marginTop: 10 }}
            />
            {authErr && (
              <div style={{ color: C.danger, fontSize: 13, marginTop: 10 }}>{authErr}</div>
            )}
            <button
              type="submit"
              disabled={authBusy}
              style={{ ...primaryBtn, width: "100%", marginTop: 12, opacity: authBusy ? 0.6 : 1 }}
            >
              {authBusy ? "…" : authMode === "signup" ? "Create Account & Continue" : "Sign In & Continue"}
            </button>
            <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 10 }}>
              Creating an account also creates your wallet (about 10 seconds).
            </div>
          </form>
        ) : (
          <div style={{ marginTop: 22 }}>
            <button
              type="button"
              onClick={acceptHunt}
              disabled={opening}
              style={{ ...primaryBtn, width: "100%", height: 56, fontSize: 15, opacity: opening ? 0.6 : 1 }}
            >
              {opening ? "Spawning your gift…" : "Accept the Hunt"}
            </button>
            {openErr && (
              <div style={{ color: C.danger, fontSize: 13, marginTop: 10, textAlign: "center" }}>{openErr}</div>
            )}
            <div style={{ fontSize: 12, color: C.muted, textAlign: "center", marginTop: 12 }}>
              We'll ask for location once. Then you walk to your gift.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AssetCard({ gift }: { gift: GiftPreview }) {
  const isNft = gift.asset_type === "nft";
  const isEth = gift.asset_type === "eth";
  const symbol = isEth ? "ETH" : "BLINK";

  return (
    <div
      style={{
        marginTop: 6,
        padding: 22,
        borderRadius: 20,
        background: "radial-gradient(circle at 50% 0%, rgba(0,255,136,0.16), rgba(0,255,136,0.03) 60%, transparent), rgba(255,255,255,0.03)",
        border: `1px solid ${C.primary}44`,
        textAlign: "center",
        boxShadow: "0 8px 36px rgba(0,255,136,0.10)",
      }}
    >
      {isNft ? (
        <>
          {gift.asset_payload.preview_image ? (
            <img
              src={gift.asset_payload.preview_image}
              alt={gift.asset_payload.preview_name || `Token #${gift.asset_payload.token_id ?? "?"}`}
              style={{
                width: 140,
                height: 140,
                margin: "0 auto 14px",
                display: "block",
                borderRadius: 16,
                objectFit: "cover",
                border: "1px solid rgba(0,255,136,0.2)",
                boxShadow: "0 0 0 1px rgba(0,255,136,0.15), 0 6px 24px rgba(0,255,136,0.18)",
              }}
            />
          ) : (
            <div
              style={{
                width: 140,
                height: 140,
                margin: "0 auto 14px",
                borderRadius: 16,
                background: "rgba(0,255,136,0.08)",
                border: "1px solid rgba(0,255,136,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.primary,
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              NFT
            </div>
          )}
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
            {gift.asset_payload.preview_name || `Token #${gift.asset_payload.token_id ?? "?"}`}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4, fontFamily: "monospace" }}>
            {(gift.asset_payload.contract || "").slice(0, 10)}…
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: C.text,
              lineHeight: 1.1,
              letterSpacing: "-1px",
            }}
          >
            {gift.asset_payload.amount}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.24em",
              color: C.primary,
              textTransform: "uppercase",
              marginTop: 6,
            }}
          >
            {symbol}
          </div>
        </>
      )}
    </div>
  );
}

function Glyph({ muted = false }: { muted?: boolean }) {
  const color = muted ? C.muted : C.primary;
  return (
    <svg
      width="60"
      height="60"
      viewBox="0 0 60 60"
      style={{ display: "block", margin: "0 auto", filter: muted ? "none" : `drop-shadow(0 0 18px ${color})` }}
    >
      <circle cx="30" cy="30" r="22" fill="none" stroke={color} strokeWidth="1.5" opacity={muted ? 0.4 : 0.7} />
      <circle cx="30" cy="30" r="10" fill={color} opacity={muted ? 0.25 : 0.55} />
      <circle cx="30" cy="30" r="4" fill={color} />
    </svg>
  );
}

// ───────────── Styles ─────────────

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: `radial-gradient(circle at 50% -10%, rgba(0,255,136,0.10), transparent 50%), ${C.bg}`,
  color: C.text,
  fontFamily: "'Inter', system-ui, sans-serif",
};

const centerCol: React.CSSProperties = {
  maxWidth: 440,
  margin: "0 auto",
  padding: "70px 22px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 46,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: "0 14px",
  color: C.text,
  fontSize: 15,
  fontFamily: "inherit",
  outline: "none",
};

const primaryBtn: React.CSSProperties = {
  height: 48,
  borderRadius: 24,
  background: C.primary,
  color: "#0a0a0f",
  border: "none",
  fontWeight: 800,
  fontSize: 14,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
  boxShadow: "0 4px 18px rgba(0,255,136,0.25)",
};

const primaryAnchor: React.CSSProperties = {
  ...primaryBtn,
  padding: "0 22px",
  display: "inline-flex",
  alignItems: "center",
  textDecoration: "none",
  height: 46,
};
