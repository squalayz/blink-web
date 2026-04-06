"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { Copy, Check, MessageCircle, UserPlus } from "lucide-react";
import { C } from "@/lib/theme";
import type { UserProfile, Orb } from "@/lib/theme";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
type Tier = { label: string; color: string; bg: string };

function getTier(score: number): Tier {
  if (score >= 1000) return { label: "Legend", color: C.accent, bg: "rgba(6,182,212,0.12)" };
  if (score >= 500) return { label: "Elite", color: C.gold, bg: "rgba(245,158,11,0.12)" };
  if (score >= 200) return { label: "Veteran", color: C.primary, bg: "rgba(99,102,241,0.12)" };
  if (score >= 50) return { label: "Hunter", color: C.rareBlue, bg: "rgba(59,130,246,0.12)" };
  return { label: "Newcomer", color: C.muted, bg: "rgba(156,163,175,0.10)" };
}

function rarityColor(r: string): string {
  if (r === "Legendary") return C.gold;
  if (r === "Rare") return C.rareBlue;
  return "#ffffff";
}

function currencyColor(c: string): string {
  if (c === "BTC") return C.btcOrange;
  if (c === "ETH") return C.ethBlue;
  return C.primary;
}

function truncAddr(addr: string): string {
  if (!addr || addr.length <= 12) return addr || "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */
function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: C.card,
        borderRadius: 12,
        padding: "14px 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        border: `1px solid ${C.border}`,
      }}
    >
      <span style={{ fontSize: 20, fontWeight: 700, color: accent ?? C.text }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>
        {label}
      </span>
    </div>
  );
}

function WalletRow({
  label,
  address,
  color,
  copied,
  onCopy,
}: {
  label: string;
  address: string;
  color: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        background: C.surface,
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        gap: 10,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 32 }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 13,
          color: C.muted,
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {truncAddr(address)}
      </span>
      <button
        onClick={onCopy}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: copied ? C.accent : C.muted,
          padding: 4,
          display: "flex",
          alignItems: "center",
        }}
        aria-label="Copy address"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  );
}

function OrbRow({ orb }: { orb: Orb }) {
  const rc = rarityColor(orb.rarity);
  const cc = currencyColor(orb.currency);
  const dateStr = orb.dropped_at ? fmtDate(orb.dropped_at) : "";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "12px 14px",
        background: C.card,
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        gap: 10,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: cc,
          background: `${cc}18`,
          border: `1px solid ${cc}40`,
          borderRadius: 6,
          padding: "2px 8px",
          minWidth: 36,
          textAlign: "center",
        }}
      >
        {orb.currency}
      </span>
      <span style={{ color: C.text, fontWeight: 600, fontSize: 14, flex: 1 }}>
        {orb.amount} {orb.currency}
      </span>
      <span style={{ fontSize: 11, color: rc, fontWeight: 600 }}>
        {orb.rarity}
      </span>
      <span
        style={{
          fontSize: 11,
          color:
            orb.status === "claimed" || orb.status === "cracked"
              ? C.accent
              : orb.status === "pending"
              ? C.gold
              : C.muted,
          textTransform: "capitalize",
          minWidth: 54,
          textAlign: "right",
        }}
      >
        {orb.status}
      </span>
      <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>
        {dateStr}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function PublicProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const profileId = params?.id ?? "";
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [droppedOrbs, setDroppedOrbs] = useState<Orb[]>([]);
  const [claimedOrbs, setClaimedOrbs] = useState<Orb[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<"drops" | "claims">("drops");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!profileId) return;
    setLoadingData(true);

    const { data: prof, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (error || !prof) {
      setNotFound(true);
      setLoadingData(false);
      return;
    }

    setProfile(prof as UserProfile);

    const { data: drops } = await supabase
      .from("orbs")
      .select("*")
      .eq("dropper_id", profileId)
      .order("dropped_at", { ascending: false })
      .limit(30);

    if (drops) setDroppedOrbs(drops as Orb[]);

    const { data: claims } = await supabase
      .from("orbs")
      .select("*")
      .eq("claimed_by", profileId)
      .order("dropped_at", { ascending: false })
      .limit(30);

    if (claims) setClaimedOrbs(claims as Orb[]);

    setLoadingData(false);
  }, [profileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  /* ---- Loading ---- */
  if (loadingData) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.muted,
          fontFamily: "system-ui, sans-serif",
          fontSize: 15,
        }}
      >
        Loading...
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: C.muted,
          fontFamily: "system-ui, sans-serif",
          gap: 16,
        }}
      >
        <p style={{ fontSize: 18, color: C.text, fontWeight: 700 }}>Profile not found</p>
        <button
          onClick={() => router.back()}
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "10px 20px",
            color: C.text,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const score = profile.mm_score ?? 0;
  const tier = getTier(score);
  const initials = (profile.display_name || profile.handle || "?")
    .slice(0, 2)
    .toUpperCase();
  const isOwnProfile = user?.id === profileId;
  const tabs: Array<{ key: "drops" | "claims"; label: string }> = [
    { key: "drops", label: "Drops" },
    { key: "claims", label: "Claims" },
  ];
  const listOrbs = activeTab === "drops" ? droppedOrbs : claimedOrbs;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "system-ui, sans-serif",
        paddingBottom: 40,
      }}
    >
      {/* ---- Hero Header ---- */}
      <div
        style={{
          background: `linear-gradient(180deg, ${C.primary}22 0%, transparent 100%)`,
          padding: "48px 20px 24px",
          position: "relative",
        }}
      >
        {/* Back button */}
        <button
          onClick={() => router.back()}
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "8px 12px",
            cursor: "pointer",
            color: C.muted,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Back
        </button>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {/* Avatar */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: profile.avatar_url
                ? `url(${profile.avatar_url}) center/cover`
                : `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              border: `2px solid ${C.primary}60`,
              flexShrink: 0,
            }}
          >
            {!profile.avatar_url && initials}
          </div>

          {/* Name + Verification */}
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: C.text }}>
                {profile.display_name || profile.handle || "Anonymous"}
              </span>
              {profile.is_verified && (
                <span
                  style={{
                    background: `${C.accent}20`,
                    color: C.accent,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 6,
                    border: `1px solid ${C.accent}40`,
                  }}
                >
                  VERIFIED
                </span>
              )}
            </div>
            {profile.handle && (
              <p style={{ fontSize: 14, color: C.muted, marginTop: 2 }}>
                @{profile.handle}
              </p>
            )}
          </div>

          {/* Vibe line */}
          {profile.vibe_line && (
            <p
              style={{
                fontStyle: "italic",
                color: C.muted,
                fontSize: 13,
                textAlign: "center",
                maxWidth: 280,
              }}
            >
              "{profile.vibe_line}"
            </p>
          )}

          {/* Action buttons (only for other users) */}
          {!isOwnProfile && (
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              {profile.dms_open && (
                <button
                  onClick={() => router.push(`/messages?to=${profileId}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: C.primary,
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 18px",
                    cursor: "pointer",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  <MessageCircle size={16} />
                  Message
                </button>
              )}
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "10px 18px",
                  cursor: "pointer",
                  color: C.text,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <UserPlus size={16} />
                Follow
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* ---- MM Score ---- */}
        <div
          style={{
            background: C.card,
            borderRadius: 16,
            padding: "20px 16px",
            marginBottom: 14,
            border: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              MM Score
            </p>
            <p style={{ fontSize: 36, fontWeight: 800, color: C.text, lineHeight: 1 }}>
              {score.toLocaleString()}
            </p>
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: tier.color,
              background: tier.bg,
              border: `1px solid ${tier.color}40`,
              borderRadius: 8,
              padding: "6px 14px",
            }}
          >
            {tier.label}
          </span>
        </div>

        {/* ---- Stats Grid ---- */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <StatCard label="Orbs Found" value={profile.orbs_found ?? 0} accent={C.accent} />
          <StatCard label="Orbs Dropped" value={profile.orbs_dropped ?? 0} accent={C.primary} />
          <StatCard
            label="Total Earned"
            value={`$${(profile.total_earned ?? 0).toFixed(2)}`}
            accent={C.gold}
          />
          <StatCard label="Reputation" value={profile.reputation ?? 0} accent={C.rareBlue} />
        </div>

        {/* ---- Wallet Section ---- */}
        {(profile.sol_address || profile.eth_address || profile.btc_address) && (
          <div
            style={{
              background: C.card,
              borderRadius: 16,
              padding: "16px",
              marginBottom: 14,
              border: `1px solid ${C.border}`,
            }}
          >
            <p
              style={{
                fontSize: 11,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 10,
              }}
            >
              Wallets
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {profile.sol_address && (
                <WalletRow
                  label="SOL"
                  address={profile.sol_address}
                  color={C.primary}
                  copied={copiedKey === "sol"}
                  onCopy={() => handleCopy("sol", profile.sol_address!)}
                />
              )}
              {profile.eth_address && (
                <WalletRow
                  label="ETH"
                  address={profile.eth_address}
                  color={C.ethBlue}
                  copied={copiedKey === "eth"}
                  onCopy={() => handleCopy("eth", profile.eth_address!)}
                />
              )}
              {profile.btc_address && (
                <WalletRow
                  label="BTC"
                  address={profile.btc_address}
                  color={C.btcOrange}
                  copied={copiedKey === "btc"}
                  onCopy={() => handleCopy("btc", profile.btc_address!)}
                />
              )}
            </div>
          </div>
        )}

        {/* ---- Bio ---- */}
        {profile.bio && (
          <div
            style={{
              background: C.card,
              borderRadius: 16,
              padding: "16px",
              marginBottom: 14,
              border: `1px solid ${C.border}`,
            }}
          >
            <p style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Bio
            </p>
            <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>
              {profile.bio}
            </p>
          </div>
        )}

        {/* ---- Interest Tags ---- */}
        {profile.interest_tags && profile.interest_tags.length > 0 && (
          <div
            style={{
              marginBottom: 14,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {profile.interest_tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.primary,
                  background: `${C.primary}15`,
                  border: `1px solid ${C.primary}35`,
                  borderRadius: 20,
                  padding: "4px 12px",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ---- Tab Selector ---- */}
        <div
          style={{
            display: "flex",
            background: C.card,
            borderRadius: 12,
            padding: 4,
            marginBottom: 14,
            border: `1px solid ${C.border}`,
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 9,
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                background: activeTab === t.key ? C.primary : "transparent",
                color: activeTab === t.key ? "#fff" : C.muted,
                transition: "background 0.2s, color 0.2s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ---- Orb List ---- */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {listOrbs.length === 0 ? (
            <p style={{ color: C.muted, fontSize: 14, textAlign: "center", padding: "24px 0" }}>
              {activeTab === "drops" ? "No orbs dropped yet." : "No orbs claimed yet."}
            </p>
          ) : (
            listOrbs.map((orb) => <OrbRow key={orb.id} orb={orb} />)
          )}
        </div>
      </div>
    </div>
  );
}
