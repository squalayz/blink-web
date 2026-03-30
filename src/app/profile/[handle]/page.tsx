"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import UserAvatar from "@/components/UserAvatar";
import { ArrowLeft, Copy } from "lucide-react";

const C = {
  bg: "#0A0A0F",
  surface: "#111118",
  card: "#1C1C28",
  primary: "#9945FF",
  accent: "#14F195",
  gold: "#F59E0B",
  text: "#F9FAFB",
  textMuted: "#9CA3AF",
  border: "#1F2028",
} as const;

interface Profile {
  id: string;
  handle: string | null;
  username: string | null;
  bio: string | null;
  profile_pic_url: string | null;
  wallet_address: string | null;
  sol_address: string | null;
  eth_address: string | null;
  btc_address: string | null;
  preferred_chain: string | null;
  is_verified: boolean;
  orbs_found: number;
  orbs_dropped: number;
  total_earned_usd: number;
  reputation: number;
}

interface DroppedOrb {
  id: string;
  rarity: string;
  currency: string;
  amount: number;
  status: string;
  created_at: string;
}

interface ClaimedOrb {
  id: string;
  orb_id: string;
  fee_paid_usd: number;
  created_at: string;
  orb?: {
    currency: string;
    amount: number;
    dropper_id: string;
  };
}

const rarityColor: Record<string, string> = {
  common: "#9CA3AF",
  uncommon: "#14F195",
  rare: "#3B82F6",
  epic: "#9945FF",
  legendary: "#F59E0B",
};

const statusStyle: Record<string, { bg: string; color: string }> = {
  active: { bg: "rgba(20,241,149,0.15)", color: "#14F195" },
  claimed: { bg: "rgba(59,130,246,0.15)", color: "#3B82F6" },
  expired: { bg: "rgba(239,68,68,0.10)", color: "#9CA3AF" },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const usd = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function PublicProfilePage() {
  const router = useRouter();
  const params = useParams();
  const handle = params.handle as string;
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [droppedOrbs, setDroppedOrbs] = useState<DroppedOrb[]>([]);
  const [claimedOrbs, setClaimedOrbs] = useState<ClaimedOrb[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dropped" | "claimed">("dropped");
  const [copied, setCopied] = useState(false);

  const isOwnProfile = user && profile && user.id === profile.id;

  const fetchProfile = useCallback(async () => {
    setLoading(true);

    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("handle", handle)
      .single();

    if (!prof) {
      setLoading(false);
      return;
    }

    setProfile(prof as Profile);

    const { data: dropped } = await supabase
      .from("orbs")
      .select("id, rarity, currency, amount, status, created_at")
      .eq("dropper_id", prof.id)
      .order("created_at", { ascending: false });

    if (dropped) setDroppedOrbs(dropped as DroppedOrb[]);

    const { data: claimed } = await supabase
      .from("orb_claims")
      .select("id, orb_id, fee_paid_usd, created_at")
      .eq("user_id", prof.id)
      .order("created_at", { ascending: false });

    if (claimed) setClaimedOrbs(claimed as ClaimedOrb[]);

    setLoading(false);
  }, [handle]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const copyWallet = async () => {
    if (!profile?.wallet_address) return;
    await navigator.clipboard.writeText(profile.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const truncateWallet = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: `3px solid ${C.border}`,
            borderTopColor: C.primary,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: C.bg,
          color: C.text,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          gap: 16,
        }}
      >
        <p style={{ fontSize: 18, fontWeight: 600 }}>Profile not found</p>
        <button
          onClick={() => router.push("/map")}
          style={{
            background: C.primary,
            border: "none",
            borderRadius: 12,
            padding: "12px 28px",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Back to Map
        </button>
      </div>
    );
  }

  const displayHandle = profile.handle || profile.username || "user";

  const stats = [
    { label: "Orbs Dropped", value: profile.orbs_dropped },
    { label: "Orbs Found", value: profile.orbs_found },
    { label: "Total Earned", value: usd(profile.total_earned_usd) },
    { label: "Reputation", value: profile.reputation },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: C.bg,
        color: C.text,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "rgba(10,10,15,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            onClick={() => router.back()}
            style={{
              background: "none",
              border: "none",
              color: C.text,
              cursor: "pointer",
              padding: 6,
              display: "flex",
              alignItems: "center",
            }}
          >
            <ArrowLeft size={22} />
          </button>
          <span style={{ fontSize: 17, fontWeight: 600 }}>
            @{displayHandle}
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          maxWidth: 600,
          margin: "0 auto",
          padding: "32px 24px 80px",
        }}
      >
        {/* Profile section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          <UserAvatar
            profilePicUrl={profile.profile_pic_url}
            handle={displayHandle}
            size={100}
          />

          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginTop: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            @{displayHandle}
            {profile.is_verified && (
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="8" fill={C.primary} />
                <path
                  d="M5 8.5L7 10.5L11 6"
                  stroke="#fff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>

          {profile.bio && (
            <p
              style={{
                color: C.textMuted,
                fontSize: 14,
                textAlign: "center",
                marginTop: 8,
                lineHeight: 1.5,
                maxWidth: 400,
              }}
            >
              {profile.bio}
            </p>
          )}

          {/* Multi-chain wallets */}
          {(() => {
            const chains: { key: keyof Profile; symbol: string; name: string; color: string; chain: string }[] = [
              { key: "sol_address", symbol: "\u25CE", name: "SOL", color: "#9945FF", chain: "solana" },
              { key: "eth_address", symbol: "\u2B21", name: "ETH", color: "#627EEA", chain: "ethereum" },
              { key: "btc_address", symbol: "\u20BF", name: "BTC", color: "#F7931A", chain: "bitcoin" },
            ];
            const connected = chains.filter((c) => profile[c.key]);
            if (connected.length === 0 && profile.wallet_address) {
              // Fallback to legacy wallet_address
              return (
                <button
                  onClick={copyWallet}
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "6px 12px",
                    color: C.textMuted,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "monospace",
                    marginTop: 10,
                  }}
                >
                  {copied ? "Copied!" : truncateWallet(profile.wallet_address)}
                </button>
              );
            }
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12, width: "100%", maxWidth: 340 }}>
                {connected.map((c) => {
                  const addr = profile[c.key] as string;
                  return (
                    <div
                      key={c.chain}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: C.surface,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        padding: "6px 12px",
                      }}
                    >
                      <span style={{ fontSize: 14, color: c.color }}>{c.symbol}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.text, minWidth: 28 }}>{c.name}</span>
                      <span style={{ fontSize: 12, color: C.textMuted, fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {truncateWallet(addr)}
                      </span>
                      {profile.preferred_chain === c.chain && (
                        <span style={{ fontSize: 9, color: C.accent, fontWeight: 700 }}>PREF</span>
                      )}
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(addr);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: C.textMuted,
                          cursor: "pointer",
                          padding: 2,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {isOwnProfile && (
            <button
              onClick={() => router.push("/profile/edit")}
              style={{
                marginTop: 14,
                padding: "10px 28px",
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: "transparent",
                color: C.text,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Edit Profile
            </button>
          )}
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 32,
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                backgroundColor: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 18,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: C.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 4,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${C.border}`,
            marginBottom: 20,
          }}
        >
          {(["dropped", "claimed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "12px 0",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === tab
                    ? `2px solid ${C.primary}`
                    : "2px solid transparent",
                color: activeTab === tab ? C.text : C.textMuted,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {tab === "dropped" ? "Dropped Orbs" : "Claimed Orbs"}
            </button>
          ))}
        </div>

        {/* Dropped tab */}
        {activeTab === "dropped" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {droppedOrbs.length === 0 ? (
              <p
                style={{
                  color: C.textMuted,
                  fontSize: 14,
                  textAlign: "center",
                  padding: 32,
                }}
              >
                No orbs dropped yet.
              </p>
            ) : (
              droppedOrbs.map((orb) => {
                const st = statusStyle[orb.status] || statusStyle.active;
                return (
                  <div
                    key={orb.id}
                    style={{
                      backgroundColor: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor:
                          rarityColor[orb.rarity?.toLowerCase()] || C.textMuted,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        backgroundColor: "rgba(153,69,255,0.15)",
                        color: C.primary,
                        padding: "2px 8px",
                        borderRadius: 6,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {orb.currency}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>
                      {orb.amount}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "capitalize",
                        backgroundColor: st.bg,
                        color: st.color,
                        padding: "2px 10px",
                        borderRadius: 20,
                        marginLeft: "auto",
                      }}
                    >
                      {orb.status}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: C.textMuted,
                        width: "100%",
                        marginTop: 2,
                      }}
                    >
                      {fmtDate(orb.created_at)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Claimed tab */}
        {activeTab === "claimed" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {claimedOrbs.length === 0 ? (
              <p
                style={{
                  color: C.textMuted,
                  fontSize: 14,
                  textAlign: "center",
                  padding: 32,
                }}
              >
                No orbs claimed yet.
              </p>
            ) : (
              claimedOrbs.map((claim) => (
                <div
                  key={claim.id}
                  style={{
                    backgroundColor: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: C.accent,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      Fee paid: ${claim.fee_paid_usd?.toFixed(2) ?? "0.00"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: C.textMuted,
                        marginTop: 2,
                      }}
                    >
                      {fmtDate(claim.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
