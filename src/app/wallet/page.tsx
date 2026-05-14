"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { C, truncateAddress, type OrbCurrency } from "@/lib/theme";
import GlassCard from "@/components/GlassCard";
import Skeleton from "@/components/Skeleton";
import ErrorState from "@/components/ErrorState";
import { useBalances } from "@/hooks/useBalances";
import { usePrices } from "@/hooks/usePrices";
import { useIsDesktop } from "@/hooks/useIsDesktop";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Chain = "solana" | "ethereum" | "bitcoin";
type TabKey = "balance" | "collection";

interface ChainMeta {
  key: Chain;
  currency: OrbCurrency;
  name: string;
  color: string;
  gradient: string;
}

interface ChainBalance {
  native: number;
  usd: number;
  address: string;
}

interface ProfileData {
  display_name: string;
  handle: string;
  sol_address: string | null;
  eth_address: string | null;
  btc_address: string | null;
}

/* ------------------------------------------------------------------ */
/*  Chain config                                                       */
/* ------------------------------------------------------------------ */
// BLINK: ETH-only — Solana/Bitcoin chain rows hidden. Underlying balance + send code kept for future L2 work.
const CHAINS: ChainMeta[] = [
  // { key: "solana", currency: "SOL", name: "Solana", color: "#00FF88",
  //   gradient: "linear-gradient(135deg, #1a0533 0%, #2d1060 100%)" }, // BLINK: ETH-only — disabled
  {
    key: "ethereum",
    currency: "ETH",
    name: "Ethereum",
    color: "#00FF88",
    gradient: "linear-gradient(135deg, #0a1628 0%, #1a2d5a 100%)",
  },
  // { key: "bitcoin", currency: "BTC", name: "Bitcoin", color: "#88FF00",
  //   gradient: "linear-gradient(135deg, #1a0d00 0%, #3d1f00 100%)" }, // BLINK: ETH-only — disabled
];

/* ------------------------------------------------------------------ */
/*  SVG Icons (inline, no emojis)                                      */
/* ------------------------------------------------------------------ */
function SettingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SendIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function ReceiveIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="7 13 12 18 17 13" />
      <line x1="12" y1="3" x2="12" y2="18" />
      <line x1="3" y1="21" x2="21" y2="21" />
    </svg>
  );
}

function BuyIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function SwapIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={C.muted}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SolIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="#00FF88" />
      <path d="M7 15.5l2.5-2.5h8L15 15.5H7z" fill="#fff" />
      <path d="M7 8.5l2.5 2.5h8L15 8.5H7z" fill="#fff" />
      <path d="M7 12l2.5-2h8L15 12H7z" fill="#fff" opacity="0.7" />
    </svg>
  );
}

function EthIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="#88FF00" />
      <path d="M12 4v6.5l5.5 2.5L12 4z" fill="#fff" opacity="0.6" />
      <path d="M12 4L6.5 13l5.5-2.5V4z" fill="#fff" />
      <path d="M12 16.5v3.5l5.5-7.5L12 16.5z" fill="#fff" opacity="0.6" />
      <path d="M12 20v-3.5L6.5 12.5 12 20z" fill="#fff" />
    </svg>
  );
}

function BtcIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="#88FF00" />
      <text x="12" y="16.5" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700" fontFamily="Arial">B</text>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNative(n: number): string {
  if (n === 0) return "0";
  if (n < 0.0001) return n.toFixed(8);
  if (n < 1) return n.toFixed(6);
  return n.toFixed(4);
}

function chainIcon(chain: Chain, size = 18): React.ReactNode {
  if (chain === "solana") return <SolIcon size={size} />;
  if (chain === "ethereum") return <EthIcon size={size} />;
  return <BtcIcon size={size} />;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function WalletPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isDesktop } = useIsDesktop();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("balance");
  const [expandedChain, setExpandedChain] = useState<Chain | null>(null);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  // Send flow
  const [showSend, setShowSend] = useState(false);
  const [sendStep, setSendStep] = useState<1 | 2 | 3>(1);
  // BLINK: ETH-only — Send defaults to ethereum
  const [sendChain, setSendChain] = useState<Chain>("ethereum");
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  // Receive flow
  const [showReceive, setShowReceive] = useState(false);
  // BLINK: ETH-only — Receive defaults to ethereum
  const [receiveChain, setReceiveChain] = useState<Chain>("ethereum");

  // Orb locks & referral earnings
  const [orbLocks, setOrbLocks] = useState<Array<{ id: string; currency: OrbCurrency; amount: number; message: string; status: string }>>([]);
  const [referralEarnings, setReferralEarnings] = useState(0);

  // Animated count-up for total balance
  const [displayBalance, setDisplayBalance] = useState(0);
  const displayBalanceRef = useRef(0);

  // Press states
  const [pressedId, setPressedId] = useState<string | null>(null);

  // Hover state for chain cards (desktop)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  /* ---- Auth redirect ---- */
  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth/signin");
  }, [authLoading, user, router]);

  /* ---- Handle Send ---- */
  const handleSend = useCallback(async () => {
    if (!user || !profile) return;
    const toAddr = sendTo.trim();
    const amt = parseFloat(sendAmount);
    if (!toAddr) { setSendError("Enter a recipient address"); return; }
    if (!amt || amt <= 0) { setSendError("Enter a valid amount"); return; }
    const bal = balances[sendChain]?.native ?? 0;
    if (amt > bal) { setSendError(`Insufficient balance (${fmtNative(bal)} available)`); return; }

    setSending(true);
    setSendError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");
      const endpoint = sendChain === "solana" ? "/api/wallet/send-sol" : sendChain === "ethereum" ? "/api/wallet/send-eth" : "/api/wallet/send-btc";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ to_address: toAddr, amount: amt, user_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      const shortHash = data.txHash ? `${data.txHash.slice(0, 8)}...${data.txHash.slice(-6)}` : "";
      setSendSuccess(`Sent! TX: ${shortHash}`);
      setSendStep(3);
      setTimeout(() => refreshBalances(), 3000);
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }, [user, profile, sendTo, sendAmount, sendChain, balances, refreshBalances]);

  /* ---- Fetch profile ---- */
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoadingProfile(true);
    const { data } = await supabase
      .from("profiles")
      .select("display_name, handle, sol_address, eth_address, btc_address")
      .eq("id", user.id)
      .single();
    if (data) setProfile(data as ProfileData);
    setLoadingProfile(false);
  }, [user]);

  /* ---- On-chain balances via shared hook ---- */
  const { sol: solNative, eth: ethNative, btc: btcNative, loading: loadingBalances, refresh: refreshBalances } = useBalances({
    sol_address: profile?.sol_address,
    eth_address: profile?.eth_address,
    btc_address: profile?.btc_address,
  });
  const prices = usePrices();

  const balances: Record<Chain, ChainBalance | null> = {
    solana: profile?.sol_address ? { native: solNative, usd: solNative * prices.sol, address: profile.sol_address } : null,
    ethereum: profile?.eth_address ? { native: ethNative, usd: ethNative * prices.eth, address: profile.eth_address } : null,
    bitcoin: profile?.btc_address ? { native: btcNative, usd: btcNative * prices.btc, address: profile.btc_address } : null,
  };

  /* ---- Fetch orb locks ---- */
  const fetchOrbLocks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orbs")
      .select("id, currency, amount, message, status")
      .eq("dropper_id", user.id)
      .in("status", ["pending"])
      .limit(10);
    if (data) setOrbLocks(data as Array<{ id: string; currency: OrbCurrency; amount: number; message: string; status: string }>);
  }, [user]);

  /* ---- Fetch referral earnings ---- */
  const fetchReferrals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("activity")
      .select("amount_text")
      .eq("user_id", user.id)
      .eq("type", "referral_reward");
    if (data && data.length > 0) {
      const total = data.reduce((sum, row) => {
        const num = parseFloat((row.amount_text || "0").replace(/[^0-9.]/g, ""));
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
      setReferralEarnings(total);
    }
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  useEffect(() => { fetchOrbLocks(); fetchReferrals(); }, [fetchOrbLocks, fetchReferrals]);

  /* ---- Computed totals ---- */
  const totalUSD = Object.values(balances).reduce((sum, b) => sum + (b?.usd ?? 0), 0);
  const change24h = 0; // Real 24h change would require historical price data

  /* ---- Animated count-up ---- */
  useEffect(() => {
    if (totalUSD === 0) { setDisplayBalance(0); displayBalanceRef.current = 0; return; }
    const duration = 800;
    const start = Date.now();
    const startVal = displayBalanceRef.current;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = startVal + (totalUSD - startVal) * eased;
      setDisplayBalance(val);
      displayBalanceRef.current = val;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [totalUSD]);

  /* ---- Copy address ---- */
  const handleCopy = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddr(addr);
      setTimeout(() => setCopiedAddr(null), 1500);
    } catch { /* noop */ }
  };

  /* ---- Press handler helpers ---- */
  const pressProps = (id: string) => ({
    onPointerDown: () => setPressedId(id),
    onPointerUp: () => setPressedId(null),
    onPointerLeave: () => setPressedId(null),
  });
  const pressStyle = (id: string): React.CSSProperties => ({
    transform: pressedId === id ? "scale(0.97)" : "scale(1)",
    transition: "transform 0.15s ease",
  });

  /* ---- Loading state with skeleton ---- */
  if (authLoading || !user) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: C.bg, color: C.text, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px" }}>
          {/* Header skeleton */}
          <div style={{ padding: "14px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Skeleton width={120} height={20} borderRadius={8} />
            <Skeleton width={22} height={22} borderRadius="50%" />
          </div>
          {/* Balance skeleton */}
          <div style={{ textAlign: "center", padding: "32px 0 8px" }}>
            <Skeleton width={80} height={12} borderRadius={6} />
            <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
              <Skeleton width={160} height={36} borderRadius={8} />
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Skeleton width={80} height={24} borderRadius={12} />
            </div>
          </div>
          {/* Chain cards skeleton */}
          <div style={{ display: "flex", gap: 10, margin: "24px 0" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ flex: 1, minWidth: 105, padding: "14px 12px", borderRadius: 16, background: C.glass, border: `1px solid ${C.glassBorder}` }}>
                <Skeleton width={40} height={20} borderRadius={10} />
                <div style={{ marginTop: 8 }}><Skeleton width="70%" height={16} borderRadius={6} /></div>
                <div style={{ marginTop: 6 }}><Skeleton width="50%" height={12} borderRadius={4} /></div>
              </div>
            ))}
          </div>
          {/* Action buttons skeleton */}
          <div style={{ display: "flex", gap: 12, margin: "20px 0 28px" }}>
            <Skeleton width="100%" height={50} borderRadius={25} />
            <Skeleton width="100%" height={50} borderRadius={25} />
          </div>
        </div>
        <style>{`@keyframes skeletonPulse{0%,100%{opacity:0.3}50%{opacity:0.7}}`}</style>
      </div>
    );
  }

  const accountName = profile?.display_name || profile?.handle || "My Wallet";
  const contentMaxWidth = isDesktop ? 900 : 480;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: C.bg,
        color: C.text,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes chainCardGlow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* ============================================================ */}
      {/* 1. HEADER                                                     */}
      {/* ============================================================ */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "rgba(10,10,15,0.88)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: `1px solid ${C.glassBorder}`,
        }}
      >
        <div
          style={{
            maxWidth: contentMaxWidth,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.3px" }}>
            {loadingProfile ? <Skeleton width={100} height={18} borderRadius={6} /> : accountName}
          </span>
          <button
            onClick={() => router.push("/profile/edit")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", ...pressStyle("settings") }}
            aria-label="Settings"
            {...pressProps("settings")}
          >
            <SettingsIcon />
          </button>
        </div>
      </div>

      <div style={{ maxWidth: contentMaxWidth, margin: "0 auto", padding: "0 20px 120px" }}>

        {/* ============================================================ */}
        {/* 2. BALANCE HERO                                               */}
        {/* ============================================================ */}
        <div style={{ textAlign: "center", padding: "32px 0 8px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 8, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Portfolio
          </div>
          {loadingBalances && !Object.values(balances).some(b => b && b.native > 0) ? (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <Skeleton width={160} height={36} borderRadius={8} />
            </div>
          ) : (
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-1px", marginBottom: 12, color: C.text }}>
              ${fmtUSD(displayBalance)}
            </div>
          )}
          {/* 24h change pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 12px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              background: change24h >= 0 ? "rgba(0,255,136,0.12)" : "rgba(239,68,68,0.12)",
              color: change24h >= 0 ? C.accent : "#EF4444",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              {change24h >= 0 ? (
                <path d="M5 1L9 6H1L5 1Z" fill={C.accent} />
              ) : (
                <path d="M5 9L1 4H9L5 9Z" fill="#EF4444" />
              )}
            </svg>
            {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. CHAIN BALANCE MINI CARDS                                   */}
        {/* ============================================================ */}
        <div style={{
          display: isDesktop ? "grid" : "flex",
          ...(isDesktop
            ? { gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }
            : { gap: 10, overflowX: "auto" as const }
          ),
          margin: "24px 0",
        }}>
          {CHAINS.map((c) => {
            const b = balances[c.key];
            const addr = c.key === "solana" ? profile?.sol_address : c.key === "ethereum" ? profile?.eth_address : profile?.btc_address;
            const hasAddr = Boolean(addr);
            const cardId = `chain-${c.key}`;
            const isHovered = hoveredCard === c.key;
            return (
              <div
                key={c.key}
                onMouseEnter={() => setHoveredCard(c.key)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  position: "relative",
                  flex: isDesktop ? undefined : 1,
                  minWidth: isDesktop ? undefined : 105,
                  background: c.gradient,
                  borderRadius: 16,
                  border: `1px solid ${c.color}25`,
                  padding: "14px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  transform: pressedId === cardId ? "scale(0.97)" : (isDesktop && isHovered ? "scale(1.03)" : "scale(1)"),
                  boxShadow: isDesktop && isHovered ? `0 4px 24px ${c.color}33` : "none",
                }}
                {...pressProps(cardId)}
              >
                {/* Gradient border glow overlay */}
                <div style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 16,
                  border: `1.5px solid transparent`,
                  background: `linear-gradient(${c.gradient}) padding-box, linear-gradient(135deg, ${c.color}40, transparent 60%, ${c.color}20) border-box`,
                  pointerEvents: "none",
                  animation: "chainCardGlow 3s ease-in-out infinite",
                }} />
                <div style={{ display: "flex", alignItems: "center", gap: 6, position: "relative" }}>
                  {chainIcon(c.key, 20)}
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.currency}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, position: "relative" }}>
                  {!hasAddr ? "--" : loadingBalances && !b ? "..." : fmtNative(b?.native ?? 0)}
                </div>
                <div style={{ fontSize: 11, color: C.muted, position: "relative" }}>
                  {!hasAddr ? "Not linked" : loadingBalances && !b ? "" : `$${fmtUSD(b?.usd ?? 0)}`}
                </div>
              </div>
            );
          })}
        </div>

        {/* ============================================================ */}
        {/* 4. QUICK ACTIONS                                              */}
        {/* ============================================================ */}
        <div style={{ display: "flex", gap: 12, margin: "20px 0 28px" }}>
            {/* Send button */}
          <button
            onClick={() => { setShowSend(true); setSendStep(1); setSendError(""); setSendSuccess(""); setSendTo(""); setSendAmount(""); }}
            style={{
              flex: 1,
              height: 50,
              borderRadius: 25,
              background: "#00FF88",
              border: "none",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: "inherit",
              boxShadow: "0 4px 20px rgba(0,255,136,0.25)",
              ...pressStyle("btn-send"),
            }}
            {...pressProps("btn-send")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            Send
          </button>
          {/* Receive button */}
          <button
            onClick={() => { setShowReceive(true); }}
            style={{
              flex: 1,
              height: 50,
              borderRadius: 25,
              background: "transparent",
              border: "2px solid #00FF88",
              color: "#00FF88",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: "inherit",
              boxShadow: "0 4px 20px rgba(0,255,136,0.12)",
              ...pressStyle("btn-receive"),
            }}
            {...pressProps("btn-receive")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
            Receive
          </button>
        </div>

        {/* ============================================================ */}
        {/* 5. TAB SELECTOR                                               */}
        {/* ============================================================ */}
        <div
          style={{
            display: "flex",
            background: C.glass,
            borderRadius: 14,
            padding: 3,
            marginBottom: 20,
            border: `1px solid ${C.glassBorder}`,
          }}
        >
          {(["balance", "collection"] as TabKey[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 12,
                border: "none",
                background: activeTab === tab ? C.s2 : "transparent",
                color: activeTab === tab ? C.text : C.muted,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.2s, color 0.2s",
                textTransform: "capitalize",
                ...pressStyle(`tab-${tab}`),
              }}
              {...pressProps(`tab-${tab}`)}
            >
              {tab === "balance" ? "Balance" : "Collection"}
            </button>
          ))}
        </div>

        {/* ============================================================ */}
        {/* 6. BALANCE TAB                                                */}
        {/* ============================================================ */}
        {activeTab === "balance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ---- Orb Locks ---- */}
            <GlassCard>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <LockIcon />
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Creature Locks</span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.primary,
                    background: `${C.primary}18`,
                    padding: "2px 8px",
                    borderRadius: 10,
                  }}
                >
                  {orbLocks.length} active
                </span>
              </div>
              {orbLocks.length === 0 ? (
                <div style={{ fontSize: 13, color: C.muted, padding: "8px 0" }}>
                  No active creature spawns with locked crypto.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {orbLocks.map((orb) => (
                    <div
                      key={orb.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: C.glass,
                        border: `1px solid ${C.glassBorder}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {chainIcon(orb.currency === "SOL" ? "solana" : orb.currency === "ETH" ? "ethereum" : "bitcoin", 16)}
                        <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>
                          {orb.amount} {orb.currency}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: C.muted, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {orb.message || "Creature spawn"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* ---- Referral Earnings ---- */}
            <GlassCard>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <GiftIcon />
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Referral Earnings</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: C.accent }}>
                  ${fmtUSD(referralEarnings)}
                </span>
                <span style={{ fontSize: 12, color: C.muted }}>pending rewards</span>
              </div>
            </GlassCard>

            {/* ---- Chain Sections (expandable) ---- */}
            {CHAINS.map((c) => {
              const b = balances[c.key];
              const addr = c.key === "solana" ? profile?.sol_address : c.key === "ethereum" ? profile?.eth_address : profile?.btc_address;
              const isExpanded = expandedChain === c.key;
              const rowId = `chain-row-${c.key}`;

              return (
                <GlassCard
                  key={c.key}
                  style={{ padding: 0, overflow: "hidden" }}
                  onClick={() => setExpandedChain(isExpanded ? null : c.key)}
                >
                  {/* Chain row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "14px 16px",
                      cursor: "pointer",
                      gap: 12,
                      ...pressStyle(rowId),
                    }}
                    {...pressProps(rowId)}
                  >
                    {chainIcon(c.key, 28)}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{c.currency}</div>
                    </div>
                    <div style={{ textAlign: "right", marginRight: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
                        {!addr ? "--" : loadingBalances && !b ? "..." : fmtNative(b?.native ?? 0)}
                      </div>
                      <div style={{ fontSize: 12, color: C.muted }}>
                        {!addr ? "Not linked" : loadingBalances && !b ? "" : `$${fmtUSD(b?.usd ?? 0)}`}
                      </div>
                    </div>
                    <ChevronIcon expanded={isExpanded} />
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div
                      style={{
                        borderTop: `1px solid ${C.glassBorder}`,
                        padding: "12px 16px 16px",
                      }}
                    >
                      {addr ? (
                        <>
                          {/* Address row */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <span style={{ fontSize: 12, color: C.muted, fontFamily: "monospace" }}>
                              {truncateAddress(addr)}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCopy(addr); }}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: copiedAddr === addr ? C.accent : C.muted,
                                display: "flex",
                                alignItems: "center",
                                padding: 2,
                                fontSize: 11,
                                fontFamily: "inherit",
                                gap: 4,
                                ...pressStyle(`copy-${c.key}`),
                              }}
                              {...pressProps(`copy-${c.key}`)}
                            >
                              <CopyIcon />
                              <span>{copiedAddr === addr ? "Copied" : "Copy"}</span>
                            </button>
                          </div>

                          {/* Recent transactions placeholder */}
                          <div style={{ fontSize: 12, color: C.muted, padding: "6px 0" }}>
                            No recent transactions for {c.name}.
                          </div>
                        </>
                      ) : (
                        <div style={{ padding: "4px 0" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push("/wallet");
                            }}
                            style={{
                              padding: "8px 16px",
                              borderRadius: 10,
                              border: `1px solid ${c.color}44`,
                              background: `${c.color}12`,
                              color: c.color,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "inherit",
                              ...pressStyle(`link-${c.key}`),
                            }}
                            {...pressProps(`link-${c.key}`)}
                          >
                            Link {c.name} Wallet
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </GlassCard>
              );
            })}

            {/* ---- Transaction History ---- */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                Transaction History
              </div>
              <GlassCard>
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div style={{ fontSize: 13, color: C.muted }}>
                    No transactions yet. Fund your wallet to get started.
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 7. COLLECTION TAB (NFT Grid)                                  */}

        {/* ============================================================ */}
        {/* ============================================================ */}
        {activeTab === "collection" && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              {/* Empty state */}
            </div>
            <GlassCard style={{ textAlign: "center", padding: "40px 20px" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", display: "block", opacity: 0.5 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                No collectibles yet
              </div>
              <div style={{ fontSize: 13, color: C.muted }}>
                NFTs and collectibles from creature spawns will appear here.
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* SEND MODAL                                                    */}
      {/* ============================================================ */}
      {showSend && (() => {
        const chainMeta = CHAINS.find(c => c.key === sendChain)!;
        const addr = sendChain === "solana" ? profile?.sol_address : sendChain === "ethereum" ? profile?.eth_address : profile?.btc_address;
        const bal = balances[sendChain]?.native ?? 0;
        const rate = sendChain === "solana" ? prices.sol : sendChain === "ethereum" ? prices.eth : prices.btc;
        const usdEq = parseFloat(sendAmount || "0") * rate;
        const feeTxt = sendChain === "solana" ? "~0.000005 SOL" : sendChain === "ethereum" ? "~0.0001 ETH" : "~0.0001 BTC";
        const ticker = sendChain === "solana" ? "SOL" : sendChain === "ethereum" ? "ETH" : "BTC";
        return (
          <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: isDesktop ? "center" : "stretch",
            justifyContent: isDesktop ? "center" : "stretch",
            background: isDesktop ? "rgba(0,0,0,0.6)" : "#0a0a0f",
            backdropFilter: isDesktop ? "blur(8px)" : undefined,
            WebkitBackdropFilter: isDesktop ? "blur(8px)" : undefined,
          }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              background: "#0a0a0f",
              ...(isDesktop ? {
                maxWidth: 520,
                width: "100%",
                maxHeight: "85vh",
                borderRadius: 20,
                border: `1px solid ${C.glassBorder}`,
                overflow: "hidden",
              } : {
                flex: 1,
              }),
            }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <button onClick={() => { if (sendStep > 1 && sendStep < 3) setSendStep(s => (s - 1) as 1|2|3); else setShowSend(false); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", color: "#8a8a99", ...pressStyle("send-back") }}
                {...pressProps("send-back")}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontSize: 17, fontWeight: 700, color: "#FFFFFF" }}>{sendStep === 3 ? "Sent" : "Send"}</span>
              <div style={{ width: 30 }} />
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {/* Step 1: Pick chain */}
              {sendStep === 1 && (
                <div>
                  <div style={{ fontSize: 13, color: "#8a8a99", marginBottom: 16, fontWeight: 600 }}>Select asset to send</div>
                  {CHAINS.map((c) => {
                    const b = balances[c.key];
                    const btnId = `send-chain-${c.key}`;
                    return (
                      <button key={c.key} onClick={() => { setSendChain(c.key); setSendStep(2); }}
                        style={{ width: "100%", background: "#0d0d14", border: `1px solid ${c.color}30`, borderRadius: 16, padding: "16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit", ...pressStyle(btnId) }}
                        {...pressProps(btnId)}>
                        {chainIcon(c.key, 36)}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: "#8a8a99", marginTop: 2 }}>{c.currency}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>{fmtNative(b?.native ?? 0)}</div>
                          <div style={{ fontSize: 12, color: "#8a8a99" }}>${fmtUSD(b?.usd ?? 0)}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step 2: Enter details */}
              {sendStep === 2 && (
                <div>
                  {/* Chain badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, padding: "10px 14px", background: `${chainMeta.color}15`, border: `1px solid ${chainMeta.color}30`, borderRadius: 12 }}>
                    {chainIcon(sendChain, 22)}
                    <span style={{ fontSize: 14, fontWeight: 700, color: chainMeta.color }}>{chainMeta.name}</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "#8a8a99" }}>{fmtNative(bal)} available</span>
                  </div>

                  {/* To address */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: "#8a8a99", fontWeight: 600, marginBottom: 8, letterSpacing: "0.4px" }}>TO</div>
                    <input
                      value={sendTo}
                      onChange={e => setSendTo(e.target.value)}
                      placeholder="0x address"
                      style={{ width: "100%", background: "#0d0d14", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#FFFFFF", padding: "14px", fontSize: 14, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  {/* Amount */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: "#8a8a99", fontWeight: 600, marginBottom: 8, letterSpacing: "0.4px" }}>AMOUNT</div>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        value={sendAmount}
                        onChange={e => setSendAmount(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="any"
                        style={{ width: "100%", background: "#0d0d14", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#FFFFFF", padding: "14px 80px 14px 14px", fontSize: 18, fontWeight: 700, outline: "none", boxSizing: "border-box" }}
                      />
                      <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => setSendAmount(fmtNative(bal))}
                          style={{ background: "#00FF8825", border: "1px solid #00FF8840", borderRadius: 8, color: "#00FF88", fontSize: 11, fontWeight: 700, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit", ...pressStyle("max-btn") }}
                          {...pressProps("max-btn")}>MAX</button>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#8a8a99" }}>{ticker}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#8a8a99", marginTop: 6, paddingLeft: 2 }}>
                      {usdEq > 0 ? `$${fmtUSD(usdEq)}` : "$0.00"}
                    </div>
                  </div>

                  {/* Fee */}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 20 }}>
                    <span style={{ fontSize: 12, color: "#8a8a99" }}>Network fee</span>
                    <span style={{ fontSize: 12, color: "#8a8a99" }}>{feeTxt}</span>
                  </div>

                  {/* From address */}
                  <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: "#8a8a99", marginBottom: 4 }}>FROM</div>
                    <div style={{ fontSize: 12, fontFamily: "monospace", color: "#FFFFFF" }}>{addr ? truncateAddress(addr) : "No wallet"}</div>
                  </div>

                  {sendError && (
                    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#ef4444", marginBottom: 16 }}>
                      {sendError}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Success */}
              {sendStep === 3 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(0,255,136,0.15)", border: "2px solid #00FF88", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#FFFFFF", marginBottom: 8 }}>Transaction Sent</div>
                  <div style={{ fontSize: 14, color: "#8a8a99", marginBottom: 4 }}>{sendSuccess}</div>
                  <div style={{ fontSize: 13, color: "#8a8a99", marginBottom: 32 }}>Your {ticker} is on its way</div>
                  <button onClick={() => setShowSend(false)}
                    style={{ width: "100%", maxWidth: 320, height: 50, borderRadius: 25, background: "#00FF88", border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", ...pressStyle("done-send") }}
                    {...pressProps("done-send")}>Done</button>
                </div>
              )}
            </div>

            {/* Bottom CTA for step 2 */}
            {sendStep === 2 && (
              <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button
                  onClick={handleSend}
                  disabled={sending || !sendTo.trim() || !sendAmount}
                  style={{ width: "100%", height: 54, borderRadius: 27, background: sending || !sendTo.trim() || !sendAmount ? "#374151" : "#00FF88", border: "none", color: "#fff", fontSize: 16, fontWeight: 700, cursor: sending || !sendTo.trim() || !sendAmount ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: sending || !sendTo.trim() || !sendAmount ? "none" : "0 4px 20px rgba(0,255,136,0.3)", ...pressStyle("confirm-send") }}
                  {...pressProps("confirm-send")}>
                  {sending ? (
                    <><div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Sending...</>
                  ) : `Send ${ticker}`}
                </button>
              </div>
            )}
            </div>
          </div>
        );
      })()}

      {/* ============================================================ */}
      {/* RECEIVE MODAL                                                 */}
      {/* ============================================================ */}
      {showReceive && (() => {
        const chainMeta = CHAINS.find(c => c.key === receiveChain)!;
        const addr = receiveChain === "solana" ? profile?.sol_address : receiveChain === "ethereum" ? profile?.eth_address : profile?.btc_address;
        const ticker = receiveChain === "solana" ? "SOL" : receiveChain === "ethereum" ? "ETH" : "BTC";
        const qrUrl = addr ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&bgcolor=111118&color=ffffff&data=${encodeURIComponent(addr)}` : "";
        return (
          <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: isDesktop ? "center" : "stretch",
            justifyContent: isDesktop ? "center" : "stretch",
            background: isDesktop ? "rgba(0,0,0,0.6)" : "#0a0a0f",
            backdropFilter: isDesktop ? "blur(8px)" : undefined,
            WebkitBackdropFilter: isDesktop ? "blur(8px)" : undefined,
          }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              background: "#0a0a0f",
              ...(isDesktop ? {
                maxWidth: 520,
                width: "100%",
                maxHeight: "85vh",
                borderRadius: 20,
                border: `1px solid ${C.glassBorder}`,
                overflow: "hidden",
              } : {
                flex: 1,
              }),
            }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width: 30 }} />
              <span style={{ fontSize: 17, fontWeight: 700, color: "#FFFFFF" }}>Receive</span>
              <button onClick={() => setShowReceive(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#8a8a99", display: "flex", ...pressStyle("close-receive") }}
                {...pressProps("close-receive")}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
              {/* Chain selector pills */}
              <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
                {CHAINS.map(c => (
                  <button key={c.key} onClick={() => setReceiveChain(c.key)}
                    style={{ flex: 1, height: 38, borderRadius: 19, border: `1.5px solid ${receiveChain === c.key ? c.color : "rgba(255,255,255,0.08)"}`, background: receiveChain === c.key ? `${c.color}18` : "transparent", color: receiveChain === c.key ? c.color : "#8a8a99", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", ...pressStyle(`recv-${c.key}`) }}
                    {...pressProps(`recv-${c.key}`)}>
                    {c.currency}
                  </button>
                ))}
              </div>

              {/* QR Code */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                <div style={{ padding: 16, background: "#0d0d14", borderRadius: 20, border: `1px solid ${chainMeta.color}30`, boxShadow: `0 0 40px ${chainMeta.color}15` }}>
                  {addr ? (
                    <img src={qrUrl} width={220} height={220} alt="QR Code" style={{ borderRadius: 8, display: "block" }} />
                  ) : (
                    <div style={{ width: 220, height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#8a8a99", fontSize: 13 }}>No {ticker} wallet</div>
                  )}
                </div>
              </div>

              {/* Address */}
              {addr && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: "#8a8a99", fontWeight: 600, marginBottom: 8, textAlign: "center", letterSpacing: "0.4px" }}>{ticker} ADDRESS</div>
                  <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 12, fontFamily: "monospace", color: "#FFFFFF", wordBreak: "break-all" }}>{addr}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(addr); setCopiedAddr(addr); setTimeout(() => setCopiedAddr(null), 2000); }}
                      style={{ background: copiedAddr === addr ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "8px 12px", color: copiedAddr === addr ? "#00FF88" : "#8a8a99", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", ...pressStyle("copy-recv") }}
                      {...pressProps("copy-recv")}>
                      {copiedAddr === addr ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {/* Warning */}
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#d97706", textAlign: "center" }}>
                Only send {ticker} to this address. Sending other assets may result in permanent loss.
              </div>
            </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
