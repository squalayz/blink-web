"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  LogOut,
  Target,
  Crosshair,
  DollarSign,
  Gem,
  Copy,
  Wallet,
} from "lucide-react";
import UserAvatar from "@/components/UserAvatar";

/* ------------------------------------------------------------------ */
/*  Colour tokens                                                      */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Profile {
  id: string;
  username: string | null;
  avatar_color: string | null;
  handle: string | null;
  bio: string | null;
  profile_pic_url: string | null;
  wallet_address: string | null;
  sol_address: string | null;
  eth_address: string | null;
  btc_address: string | null;
  preferred_chain: string | null;
  orbs_found: number;
  orbs_dropped: number;
  total_earned_usd: number;
  total_dropped_usd: number;
  created_at: string;
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
  rarity: string;
  currency: string;
  amount: number;
  fee_paid: number;
  claimed_at: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const usd = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD" });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: "easeOut" },
  }),
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [droppedOrbs, setDroppedOrbs] = useState<DroppedOrb[]>([]);
  const [claimedOrbs, setClaimedOrbs] = useState<ClaimedOrb[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  /* ---- redirect if unauthenticated ---- */
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/signin");
    }
  }, [authLoading, user, router]);

  /* ---- fetch profile + orbs ---- */
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);

    /* profile — upsert default if missing */
    let { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!prof) {
      const defaultProfile = {
        id: user.id,
        username: null,
        avatar_color: C.primary,
        orbs_found: 0,
        orbs_dropped: 0,
        total_earned_usd: 0,
        total_dropped_usd: 0,
      };
      const { data: inserted } = await supabase
        .from("profiles")
        .insert(defaultProfile)
        .select("*")
        .single();
      prof = inserted;
    }

    if (prof) setProfile(prof as Profile);

    /* dropped orbs */
    const { data: dropped } = await supabase
      .from("orbs")
      .select("id, rarity, currency, amount, status, created_at")
      .eq("dropper_id", user.id)
      .order("created_at", { ascending: false });

    if (dropped) setDroppedOrbs(dropped as DroppedOrb[]);

    /* claimed orbs */
    const { data: claimed } = await supabase
      .from("orbs")
      .select("id, rarity, currency, amount, fee_paid, claimed_at")
      .eq("claimed_by", user.id)
      .order("claimed_at", { ascending: false });

    if (claimed) setClaimedOrbs(claimed as ClaimedOrb[]);

    setLoadingData(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  /* ---- sign out ---- */
  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  /* ---- loading / auth gate ---- */
  if (authLoading || !user) {
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

  const displayName =
    profile?.username || user.email || "User";
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const avatarColor = profile?.avatar_color || C.primary;
  const memberSince = profile?.created_at
    ? fmtDate(profile.created_at)
    : fmtDate(user.created_at || new Date().toISOString());

  /* ---- stat card data ---- */
  const stats = [
    {
      icon: Target,
      label: "Orbs Found",
      value: profile?.orbs_found ?? 0,
    },
    {
      icon: Crosshair,
      label: "Orbs Dropped",
      value: profile?.orbs_dropped ?? 0,
    },
    {
      icon: DollarSign,
      label: "Total Earned",
      value: usd(profile?.total_earned_usd ?? 0),
    },
    {
      icon: Gem,
      label: "Total Dropped",
      value: usd(profile?.total_dropped_usd ?? 0),
    },
  ];

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
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
      {/* ---- Top bar ---- */}
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
            maxWidth: 640,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={() => router.push("/map")}
            style={{
              background: "none",
              border: "none",
              color: C.text,
              cursor: "pointer",
              padding: 6,
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Back to map"
          >
            <ArrowLeft size={22} />
          </button>

          <span
            style={{
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            Profile
          </span>

          <button
            onClick={handleSignOut}
            style={{
              background: "none",
              border: "none",
              color: C.textMuted,
              cursor: "pointer",
              padding: 6,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
            }}
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* ---- Content ---- */}
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "32px 24px 80px",
        }}
      >
        {loadingData ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div
              style={{
                width: 28,
                height: 28,
                border: `3px solid ${C.border}`,
                borderTopColor: C.primary,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto",
              }}
            />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            {/* ---- Avatar ---- */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: 28,
              }}
            >
              <div style={{ marginBottom: 14 }}>
                <UserAvatar
                  profilePicUrl={profile?.profile_pic_url || null}
                  handle={profile?.handle || displayName}
                  size={80}
                />
              </div>

              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                {displayName}
              </div>

              {profile?.handle && (
                <div
                  style={{
                    fontSize: 15,
                    color: C.primary,
                    fontWeight: 600,
                    marginTop: 4,
                  }}
                >
                  @{profile.handle}
                </div>
              )}

              {profile?.bio && (
                <div
                  style={{
                    fontSize: 14,
                    color: C.textMuted,
                    marginTop: 6,
                    textAlign: "center",
                    lineHeight: 1.5,
                    maxWidth: 400,
                  }}
                >
                  {profile.bio}
                </div>
              )}

              <div
                style={{
                  fontSize: 13,
                  color: C.textMuted,
                  marginTop: 6,
                }}
              >
                Member since {memberSince}
              </div>

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
            </motion.div>

            {/* ---- Wallets section ---- */}
            {(() => {
              const WALLET_CHAINS: { key: keyof Profile; chain: string; symbol: string; name: string; color: string }[] = [
                { key: "sol_address", chain: "solana", symbol: "\u25CE", name: "Solana", color: "#9945FF" },
                { key: "eth_address", chain: "ethereum", symbol: "\u2B21", name: "Ethereum", color: "#627EEA" },
                { key: "btc_address", chain: "bitcoin", symbol: "\u20BF", name: "Bitcoin", color: "#F7931A" },
              ];
              const connectedWallets = WALLET_CHAINS.filter((w) => profile?.[w.key]);
              if (connectedWallets.length === 0) return null;
              const truncAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
              const handleCopy = async (addr: string) => {
                await navigator.clipboard.writeText(addr);
                setCopiedAddr(addr);
                setTimeout(() => setCopiedAddr(null), 1500);
              };
              return (
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={1}
                  style={{ marginBottom: 28 }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                      <Wallet size={16} style={{ color: C.textMuted }} />
                      Wallets
                    </h2>
                    <button
                      onClick={() => router.push("/wallet")}
                      style={{
                        background: "none",
                        border: "none",
                        color: C.primary,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Manage
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {connectedWallets.map((w) => {
                      const addr = profile![w.key] as string;
                      return (
                        <div
                          key={w.chain}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            backgroundColor: C.surface,
                            border: `1px solid ${C.border}`,
                            borderRadius: 10,
                            padding: "10px 14px",
                          }}
                        >
                          <span style={{ fontSize: 18, color: w.color, flexShrink: 0 }}>{w.symbol}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
                              {w.name}
                              {profile?.preferred_chain === w.chain && (
                                <span style={{ fontSize: 10, color: C.accent, background: "rgba(20,241,149,0.12)", padding: "1px 6px", borderRadius: 6, fontWeight: 700 }}>
                                  Preferred
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: C.textMuted, fontFamily: "monospace" }}>
                              {truncAddr(addr)}
                            </div>
                          </div>
                          <button
                            onClick={() => handleCopy(addr)}
                            style={{
                              background: "none",
                              border: "none",
                              color: copiedAddr === addr ? C.accent : C.textMuted,
                              cursor: "pointer",
                              padding: 4,
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })()}

            {/* ---- Stats grid ---- */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 36,
              }}
            >
              {stats.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    style={{
                      backgroundColor: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      padding: 20,
                    }}
                  >
                    <Icon
                      size={18}
                      style={{ color: C.textMuted, marginBottom: 8 }}
                    />
                    <div
                      style={{
                        fontSize: 12,
                        color: C.textMuted,
                        marginBottom: 4,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: C.text,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {s.value}
                    </div>
                  </div>
                );
              })}
            </motion.div>

            {/* ---- My Dropped Orbs ---- */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              style={{ marginBottom: 36 }}
            >
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 14,
                  letterSpacing: "-0.01em",
                }}
              >
                My Dropped Orbs
              </h2>

              {droppedOrbs.length === 0 ? (
                <div
                  style={{
                    backgroundColor: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "32px 20px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      color: C.textMuted,
                      fontSize: 14,
                      marginBottom: 12,
                    }}
                  >
                    You haven't dropped any orbs yet.
                  </p>
                  <button
                    onClick={() => router.push("/drop")}
                    style={{
                      background: "none",
                      border: "none",
                      color: C.primary,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    Drop your first orb
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {droppedOrbs.map((orb) => {
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
                        {/* rarity dot */}
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

                        {/* currency badge */}
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

                        {/* amount */}
                        <span style={{ fontWeight: 600, fontSize: 15 }}>
                          {orb.amount}
                        </span>

                        {/* status pill */}
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

                        {/* date — full width row on small screens */}
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
                  })}
                </div>
              )}
            </motion.div>

            {/* ---- My Claimed Orbs ---- */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={4}
              style={{ marginBottom: 40 }}
            >
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 14,
                  letterSpacing: "-0.01em",
                }}
              >
                Orbs I Found
              </h2>

              {claimedOrbs.length === 0 ? (
                <div
                  style={{
                    backgroundColor: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "32px 20px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      color: C.textMuted,
                      fontSize: 14,
                      marginBottom: 12,
                    }}
                  >
                    No orbs found yet. Start hunting!
                  </p>
                  <button
                    onClick={() => router.push("/map")}
                    style={{
                      background: "none",
                      border: "none",
                      color: C.accent,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    Open the map
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {claimedOrbs.map((orb) => (
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
                      {/* rarity dot */}
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

                      {/* currency badge */}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          backgroundColor: "rgba(20,241,149,0.12)",
                          color: C.accent,
                          padding: "2px 8px",
                          borderRadius: 6,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {orb.currency}
                      </span>

                      {/* amount */}
                      <span style={{ fontWeight: 600, fontSize: 15 }}>
                        {orb.amount}
                      </span>

                      {/* fee paid */}
                      {orb.fee_paid > 0 && (
                        <span
                          style={{
                            fontSize: 12,
                            color: C.textMuted,
                            marginLeft: "auto",
                          }}
                        >
                          Fee: {usd(orb.fee_paid)}
                        </span>
                      )}

                      {/* date */}
                      <span
                        style={{
                          fontSize: 12,
                          color: C.textMuted,
                          width: "100%",
                          marginTop: 2,
                        }}
                      >
                        {orb.claimed_at ? fmtDate(orb.claimed_at) : "---"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* ---- Sign Out button ---- */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={5}
            >
              <button
                onClick={handleSignOut}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  backgroundColor: "transparent",
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  color: C.text,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
