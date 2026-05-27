"use client";

// BLINK — sender's Spirit Gift history.

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";

interface GiftRow {
  id: string;
  short_code: string;
  recipient_username: string | null;
  recipient_id: string | null;
  asset_type: "eth" | "blink" | "nft";
  asset_payload: { amount?: number; contract?: string; token_id?: string };
  mode: "direct" | "public";
  anonymous: boolean;
  status: "pending" | "spawned" | "claimed" | "expired" | "refunded" | "failed";
  expires_at: string;
  created_at: string;
  claimed_at: string | null;
  on_chain_claim_tx: string | null;
}

export default function GiftsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [gifts, setGifts] = useState<GiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  const fetchGifts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sign in first");
      const res = await fetch("/api/gifts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setGifts(data.gifts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchGifts();
  }, [user, fetchGifts]);

  async function cancel(id: string, shortCode: string) {
    if (!confirm("Refund this gift now?")) return;
    setCancellingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/gifts/${shortCode}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      await fetchGifts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setCancellingId(null);
    }
  }

  async function copyLink(code: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/gift/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch {}
  }

  if (authLoading || !user) {
    return (
      <div style={pageStyle}>
        <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 20px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>My Gifts</h1>
          <Link
            href="/gift/new"
            style={{
              padding: "10px 16px",
              background: C.primary,
              color: "#0a0a0f",
              borderRadius: 22,
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: "0.05em",
              textDecoration: "none",
              textTransform: "uppercase",
              boxShadow: "0 4px 18px rgba(0,255,136,0.25)",
            }}
          >
            New
          </Link>
        </div>

        {loading && <div style={{ color: C.muted, padding: 20 }}>Loading…</div>}
        {error && <div style={{ color: C.danger, padding: 20 }}>{error}</div>}
        {!loading && gifts.length === 0 && !error && (
          <div
            style={{
              padding: 32,
              border: "1px dashed rgba(255,255,255,0.08)",
              borderRadius: 16,
              color: C.muted,
              textAlign: "center",
              fontSize: 14,
            }}
          >
            No gifts yet. Send your first one.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {gifts.map((g) => (
            <div
              key={g.id}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14,
                padding: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={badgeFor(g.status)}>{g.status.toUpperCase()}</span>
                  <span style={{ fontSize: 12, color: C.muted, letterSpacing: "0.04em" }}>
                    {g.mode === "public" ? "PUBLIC HUNT" : "DIRECT"}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: C.muted }}>{ago(g.created_at)}</span>
              </div>

              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                {assetSummary(g)}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
                {g.recipient_username ? `To @${g.recipient_username}` : g.mode === "public" ? "Open to the world" : "Direct link"}
                {" · "}
                {g.status === "claimed" && g.claimed_at ? `Claimed ${ago(g.claimed_at)}` : `Expires ${ago(g.expires_at)}`}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => copyLink(g.short_code)} style={miniBtn}>
                  {copiedCode === g.short_code ? "Copied" : "Copy Link"}
                </button>
                <a
                  href={`/gift/${g.short_code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...miniBtn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                >
                  View
                </a>
                {(g.status === "pending" || g.status === "spawned") && (
                  <button
                    type="button"
                    onClick={() => cancel(g.id, g.short_code)}
                    disabled={cancellingId === g.id}
                    style={{ ...miniBtn, color: C.danger, borderColor: `${C.danger}55` }}
                  >
                    {cancellingId === g.id ? "Refunding…" : "Refund"}
                  </button>
                )}
                {g.on_chain_claim_tx && (
                  <a
                    href={`https://etherscan.io/tx/${g.on_chain_claim_tx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...miniBtn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                  >
                    Etherscan
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function assetSummary(g: GiftRow): string {
  if (g.asset_type === "eth") return `${g.asset_payload.amount ?? "?"} ETH`;
  if (g.asset_type === "blink") return `${g.asset_payload.amount ?? "?"} BLINK`;
  return `NFT #${g.asset_payload.token_id ?? "?"}`;
}

function badgeFor(status: GiftRow["status"]): React.CSSProperties {
  const colors: Record<string, { bg: string; fg: string }> = {
    pending: { bg: "rgba(0,255,136,0.10)", fg: C.primary },
    spawned: { bg: "rgba(136,255,0,0.12)", fg: "#88FF00" },
    claimed: { bg: "rgba(0,255,136,0.16)", fg: C.primary },
    refunded: { bg: "rgba(255,255,255,0.05)", fg: C.muted },
    expired: { bg: "rgba(255,255,255,0.05)", fg: C.muted },
    failed: { bg: "rgba(239,68,68,0.12)", fg: C.danger },
  };
  const c = colors[status] || colors.pending;
  return {
    background: c.bg,
    color: c.fg,
    fontSize: 10,
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: 6,
    letterSpacing: "0.08em",
  };
}

function ago(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const abs = Math.abs(diff);
  const future = diff < 0;
  const min = 60_000, hr = 60 * min, day = 24 * hr;
  let label = "now";
  if (abs < min) label = "now";
  else if (abs < hr) label = `${Math.floor(abs / min)}m`;
  else if (abs < day) label = `${Math.floor(abs / hr)}h`;
  else label = `${Math.floor(abs / day)}d`;
  return future ? `in ${label}` : `${label} ago`;
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: C.bg,
  color: C.text,
  fontFamily: "'Inter', system-ui, sans-serif",
};

const miniBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: C.text,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};
