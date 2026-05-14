"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { C, truncateAddress } from "@/lib/theme";
import type { UserProfile, Orb, OrbCurrency } from "@/lib/theme";
import GlassCard from "@/components/GlassCard";
import Skeleton from "@/components/Skeleton";
import SettingsSheet from "@/components/SettingsSheet";
import { YourBestiary } from "@/components/YourBestiary";
import { useBalances } from "@/hooks/useBalances";
import { usePrices } from "@/hooks/usePrices";
import { useIsDesktop } from "@/hooks/useIsDesktop";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/* ------------------------------------------------------------------ */
/*  Tier helpers                                                        */
/* ------------------------------------------------------------------ */
type Tier = { label: string; color: string; bg: string };

function getTier(score: number): Tier {
  if (score >= 1000)
    return { label: "Legend", color: "#EF4444", bg: "rgba(239,68,68,0.12)" };
  if (score >= 500)
    return { label: "Elite", color: C.gold, bg: "rgba(245,158,11,0.12)" };
  if (score >= 200)
    return { label: "Veteran", color: C.primary, bg: "rgba(0,255,136,0.12)" };
  if (score >= 50)
    return { label: "Watcher", color: C.accent, bg: "rgba(0,255,136,0.12)" };
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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(iso);
}

/* ------------------------------------------------------------------ */
/*  Inline SVG Icons                                                    */
/* ------------------------------------------------------------------ */
function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function FireStreakIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={C.accent} stroke="none">
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 12c0 4.97 3.018 9.217 7.322 11.014.638.266 1.318.266 1.956 0C16.58 21.217 19.6 16.97 19.6 12c0-.98-.12-1.935-.345-2.848l.363-.168z" />
      <path d="M9 12l2 2 4-4" stroke="#0a0a0f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function DropIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Keyframe injection                                                  */
/* ------------------------------------------------------------------ */
const KEYFRAMES = `
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes skeletonPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes modalSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
@keyframes countUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes borderGlow {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
@keyframes successCheck {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes particleBurst {
  0% { transform: translate(0,0) scale(1); opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
}
`;

/* ------------------------------------------------------------------ */
/*  Chain config (for embedded wallet)                                  */
/* ------------------------------------------------------------------ */
type Chain = "solana" | "ethereum" | "bitcoin";

interface ChainMeta {
  key: Chain;
  currency: OrbCurrency;
  name: string;
  color: string;
  gradient: string;
}

// BLINK: ETH-only — Solana/Bitcoin chain rows hidden. Underlying multi-chain code preserved for future L2 work.
const CHAINS: ChainMeta[] = [
  // { key: "solana", currency: "SOL", name: "Solana", color: C.solPurple, gradient: "linear-gradient(135deg, #1a0533 0%, #2d1060 100%)" }, // BLINK: ETH-only — disabled
  { key: "ethereum", currency: "ETH", name: "Ethereum", color: C.primary, gradient: "linear-gradient(135deg, #0a1628 0%, #1a2d5a 100%)" },
  // { key: "bitcoin", currency: "BTC", name: "Bitcoin", color: C.btcOrange, gradient: "linear-gradient(135deg, #1a0d00 0%, #3d1f00 100%)" }, // BLINK: ETH-only — disabled
];

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
  if (chain === "solana") return <SolIconW size={size} />;
  if (chain === "ethereum") return <EthIconW size={size} />;
  return <BtcIconW size={size} />;
}

function SolIconW({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="#00FF88" />
      <path d="M7 15.5l2.5-2.5h8L15 15.5H7z" fill="#fff" />
      <path d="M7 8.5l2.5 2.5h8L15 8.5H7z" fill="#fff" />
      <path d="M7 12l2.5-2h8L15 12H7z" fill="#fff" opacity="0.7" />
    </svg>
  );
}

function EthIconW({ size = 18 }: { size?: number }) {
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

function BtcIconW({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="#88FF00" />
      <text x="12" y="16.5" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700" fontFamily="Arial">B</text>
    </svg>
  );
}

function SendIconW() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function ReceiveIconW() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function BuyIconW() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function SwapIconW() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function CopyIconW() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ShareIconW() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton Shimmer Block                                              */
/* ------------------------------------------------------------------ */
function ShimmerBlock({ width, height, borderRadius = 8, style }: {
  width: string | number;
  height: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width,
      height,
      borderRadius,
      background: `linear-gradient(90deg, ${C.s2} 25%, rgba(255,255,255,0.06) 50%, ${C.s2} 75%)`,
      backgroundSize: "200% 100%",
      animation: "shimmer 1.8s ease-in-out infinite",
      ...style,
    }} />
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */
function AnimatedStatCard({
  icon,
  label,
  value,
  accent,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
  delay: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <GlassCard
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "18px 12px",
        animation: `fadeSlideUp 0.5s ease ${delay}s both`,
        transition: "transform 0.2s ease, border-color 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        borderColor: hovered ? `${accent}40` : C.glassBorder,
        cursor: "default",
      }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ display: "contents" }}
      >
        <div style={{ color: accent, marginBottom: 2 }}>{icon}</div>
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: accent,
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: 11,
            color: C.muted,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
      </div>
    </GlassCard>
  );
}

function OrbRow({ orb }: { orb: Orb }) {
  const [hovered, setHovered] = useState(false);
  const rc = rarityColor(orb.rarity);
  const cc = currencyColor(orb.currency);
  const dateStr = orb.dropped_at ? timeAgo(orb.dropped_at) : "";
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "14px 16px",
        background: hovered ? "rgba(255,255,255,0.06)" : C.glass,
        borderRadius: 14,
        border: `1px solid ${hovered ? `${cc}30` : C.glassBorder}`,
        gap: 12,
        transition: "background 0.2s ease, border-color 0.2s ease, transform 0.15s ease",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        cursor: "pointer",
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
/*  Full Skeleton Loading State                                         */
/* ------------------------------------------------------------------ */
function ProfileSkeleton({ isDesktop }: { isDesktop: boolean }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      fontFamily: FONT,
      paddingBottom: 100,
    }}>
      <style>{KEYFRAMES}</style>

      {/* Hero gradient */}
      <div style={{
        background: `linear-gradient(180deg, ${C.primary}15 0%, transparent 100%)`,
        height: 200,
        position: "relative",
      }}>
        {/* Top nav skeleton */}
        <div style={{
          position: "absolute", top: 52, left: 16, right: 16,
          display: "flex", justifyContent: "space-between",
        }}>
          <ShimmerBlock width={40} height={40} borderRadius={12} />
          <ShimmerBlock width={40} height={40} borderRadius={12} />
        </div>
      </div>

      {/* Avatar skeleton */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: -48 }}>
        <ShimmerBlock width={96} height={96} borderRadius="50%" />
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <ShimmerBlock width={160} height={22} borderRadius={8} />
          <ShimmerBlock width={100} height={14} borderRadius={6} />
          <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
            <ShimmerBlock width={60} height={32} borderRadius={8} />
            <ShimmerBlock width={60} height={32} borderRadius={8} />
          </div>
        </div>
      </div>

      {/* Body skeleton */}
      <div style={{
        padding: "20px 16px 0",
        ...(isDesktop ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 960, margin: "0 auto" } : {}),
      }}>
        {/* Left column */}
        <div>
          <ShimmerBlock width="100%" height={100} borderRadius={20} style={{ marginBottom: 14 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <ShimmerBlock width="100%" height={100} borderRadius={20} />
            <ShimmerBlock width="100%" height={100} borderRadius={20} />
            <ShimmerBlock width="100%" height={100} borderRadius={20} />
            <ShimmerBlock width="100%" height={100} borderRadius={20} />
          </div>
          <ShimmerBlock width="100%" height={160} borderRadius={20} style={{ marginBottom: 14 }} />
        </div>
        {/* Right column (desktop) or continuation */}
        <div>
          <ShimmerBlock width="100%" height={48} borderRadius={12} style={{ marginBottom: 14 }} />
          <ShimmerBlock width="100%" height={64} borderRadius={14} style={{ marginBottom: 8 }} />
          <ShimmerBlock width="100%" height={64} borderRadius={14} style={{ marginBottom: 8 }} />
          <ShimmerBlock width="100%" height={64} borderRadius={14} style={{ marginBottom: 8 }} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isDesktop } = useIsDesktop();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [droppedOrbs, setDroppedOrbs] = useState<Orb[]>([]);
  const [claimedOrbs, setClaimedOrbs] = useState<Orb[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<"drops" | "claims" | "moments">(
    "drops"
  );
  const [showSettings, setShowSettings] = useState(false);

  // Wallet state
  const [expandedChain, setExpandedChain] = useState<Chain | null>(null);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [showSend, setShowSend] = useState(false);
  const [sendStep, setSendStep] = useState<1 | 2 | 3 | 4>(1);
  const [sendChain, setSendChain] = useState<Chain>("ethereum");
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");
  const [showReceive, setShowReceive] = useState(false);
  const [receiveChain, setReceiveChain] = useState<Chain>("ethereum");
  const [toast, setToast] = useState<string | null>(null);
  const [portfolioAnimated, setPortfolioAnimated] = useState(false);
  const portfolioRef = useRef<HTMLDivElement>(null);

  // Button hover states
  const [gearHover, setGearHover] = useState(false);
  const [trophyHover, setTrophyHover] = useState(false);
  const [editBtnHover, setEditBtnHover] = useState(false);
  const [editBtnPressed, setEditBtnPressed] = useState(false);

  /* redirect if unauthenticated */
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  /* fetch data */
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);

    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (prof) {
      setProfile(prof as UserProfile);
    } else if (!profErr || profErr.code === "PGRST116") {
      const ADJ = ['swift','bright','cool','bold','keen','calm','wild','quick','brave','sly'];
      const ANI = ['fox','owl','wolf','hawk','lynx','bear','deer','crow','hare','orca'];
      function genCleanName() {
        const a = ADJ[Math.floor(Math.random() * ADJ.length)];
        const n = ANI[Math.floor(Math.random() * ANI.length)];
        const s = Math.floor(Math.random() * 90) + 10;
        return `${a}_${n}_${s}`;
      }
      let defaultUsername: string;
      const rawPrefix = user.email?.split("@")[0] || "";
      const cleaned = rawPrefix.replace(/[^a-z]/gi, "").toLowerCase();
      const digitCount = (rawPrefix.match(/\d/g) || []).length;
      if (cleaned.length >= 2 && digitCount <= 6) {
        defaultUsername = cleaned;
      } else {
        defaultUsername = genCleanName();
      }

      const { error: upsertErr } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          user_id: user.id,
          username: defaultUsername,
          handle: defaultUsername,
          display_name: defaultUsername,
          bio: null,
          avatar_url: null,
          is_verified: false,
          mm_score: 0,
          orbs_found: 0,
          orbs_dropped: 0,
          total_earned: 0,
          current_streak: 0,
          longest_streak: 0,
          follower_count: 0,
          following_count: 0,
          onboarded: true,
        });

      if (upsertErr) {
        console.error("Profile auto-create error:", upsertErr.message);
      } else {
        const { data: newProf } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (newProf) setProfile(newProf as UserProfile);
      }
    } else {
      console.error("Profile fetch error:", profErr.message, profErr.details);
    }

    const { data: drops } = await supabase
      .from("orbs")
      .select("*")
      .eq("dropper_id", user.id)
      .order("dropped_at", { ascending: false })
      .limit(30);

    if (drops) setDroppedOrbs(drops as Orb[]);

    const { data: claims } = await supabase
      .from("orbs")
      .select("*")
      .eq("claimed_by", user.id)
      .order("dropped_at", { ascending: false })
      .limit(30);

    if (claims) setClaimedOrbs(claims as Orb[]);

    setLoadingData(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  /* ---- On-chain balances ---- */
  const { sol: solNative, eth: ethNative, btc: btcNative, loading: loadingBalances, refresh: refreshBalances } = useBalances({
    sol_address: profile?.sol_address,
    eth_address: profile?.eth_address,
    btc_address: profile?.btc_address,
  });
  const prices = usePrices();

  type ChainBalance = { native: number; usd: number; address: string };
  const walletBalances: Record<Chain, ChainBalance | null> = {
    solana: profile?.sol_address ? { native: solNative, usd: solNative * prices.sol, address: profile.sol_address } : null,
    ethereum: profile?.eth_address ? { native: ethNative, usd: ethNative * prices.eth, address: profile.eth_address } : null,
    bitcoin: profile?.btc_address ? { native: btcNative, usd: btcNative * prices.btc, address: profile.btc_address } : null,
  };
  const totalUSD = Object.values(walletBalances).reduce((sum, b) => sum + (b?.usd ?? 0), 0);
  const change24h = 0;

  const dominantChainColor = (() => {
    let max = 0; let col = C.primary;
    if ((walletBalances.solana?.usd ?? 0) > max) { max = walletBalances.solana!.usd; col = C.solPurple; }
    if ((walletBalances.ethereum?.usd ?? 0) > max) { max = walletBalances.ethereum!.usd; col = C.ethBlue; }
    if ((walletBalances.bitcoin?.usd ?? 0) > max) { col = C.btcOrange; }
    return col;
  })();

  useEffect(() => {
    if (!loadingBalances && !portfolioAnimated) {
      setTimeout(() => setPortfolioAnimated(true), 100);
    }
  }, [loadingBalances, portfolioAnimated]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleCopy = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddr(addr);
      setTimeout(() => setCopiedAddr(null), 1500);
    } catch { /* noop */ }
  };

  const handleSend = useCallback(async () => {
    if (!user || !profile) return;
    const toAddr = sendTo.trim();
    const amt = parseFloat(sendAmount);
    if (!toAddr) { setSendError("Enter a recipient address"); return; }
    if (!amt || amt <= 0) { setSendError("Enter a valid amount"); return; }
    const bal = walletBalances[sendChain]?.native ?? 0;
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
      setSendStep(4);
      setTimeout(() => refreshBalances(), 3000);
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }, [user, profile, sendTo, sendAmount, sendChain, walletBalances, refreshBalances]);

  /* sign out */
  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  /* ---- Loading / guard ---- */
  if (authLoading || loadingData) {
    return <ProfileSkeleton isDesktop={isDesktop} />;
  }

  if (!user) return null;
  if (!profile) return null;

  const score = profile.mm_score ?? 0;
  const tier = getTier(score);
  const streak = profile.current_streak ?? 0;
  const initials = (profile.display_name || profile.handle || "?")
    .slice(0, 2)
    .toUpperCase();

  const isLive = true;
  const tabs: Array<{ key: "drops" | "claims" | "moments"; label: string }> = [
    { key: "drops", label: "Drops" },
    { key: "claims", label: "Claims" },
    { key: "moments", label: "Moments" },
  ];
  const listOrbs = activeTab === "drops" ? droppedOrbs : activeTab === "claims" ? claimedOrbs : [];
  const hasWallet = profile.sol_address || profile.eth_address || profile.btc_address;

  /* ============================================================ */
  /*  LEFT COLUMN: User Card + Wallet                              */
  /* ============================================================ */
  const leftColumn = (
    <>
      {/* Score Section */}
      <GlassCard
        style={{
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 18px",
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 4,
              fontWeight: 600,
            }}
          >
            BLINK Score
          </p>
          <p
            style={{
              fontSize: 38,
              fontWeight: 800,
              color: C.text,
              lineHeight: 1,
            }}
          >
            {score.toLocaleString()}
          </p>
          {streak > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 8,
              }}
            >
              <span style={{ color: C.gold }}>
                <FireStreakIcon />
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.gold,
                }}
              >
                {streak} day streak
              </span>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: tier.color,
              background: tier.bg,
              border: `1px solid ${tier.color}40`,
              borderRadius: 10,
              padding: "6px 16px",
            }}
          >
            {tier.label}
          </span>

          {profile.is_verified && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <VerifiedIcon />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.accent,
                }}
              >
                Verified
              </span>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Stats Cards (2x2 grid) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <AnimatedStatCard
          icon={<DollarIcon />}
          label="Earned"
          value={`$${(profile.total_earned ?? 0).toFixed(2)}`}
          accent={C.accent}
          delay={0}
        />
        <AnimatedStatCard
          icon={<LightningIcon />}
          label="Caught"
          value={profile.orbs_found ?? 0}
          accent={C.primary}
          delay={0.08}
        />
        <AnimatedStatCard
          icon={<FlameIcon />}
          label="Spawned"
          value={profile.orbs_dropped ?? 0}
          accent={C.gold}
          delay={0.16}
        />
        <AnimatedStatCard
          icon={<FireStreakIcon />}
          label="Streak"
          value={`${streak}d`}
          accent={C.accent}
          delay={0.24}
        />
      </div>

      {/* Embedded Wallet */}
      {hasWallet && (
        <div style={{ marginBottom: 14 }}>
          {/* Portfolio Value Header */}
          <div
            ref={portfolioRef}
            style={{
              position: "relative",
              borderRadius: 20,
              padding: "22px 20px 18px",
              background: C.glass,
              border: `1px solid ${C.glassBorder}`,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              overflow: "hidden",
              marginBottom: 12,
            }}
          >
            <div style={{
              position: "absolute", inset: -1, borderRadius: 20, padding: 1, pointerEvents: "none",
              background: `linear-gradient(135deg, ${dominantChainColor}40, transparent 50%, ${dominantChainColor}20)`,
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              animation: "borderGlow 3s ease-in-out infinite",
            }} />

            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>
              Portfolio
            </div>

            {loadingBalances && totalUSD === 0 ? (
              <Skeleton width={140} height={36} borderRadius={8} />
            ) : (
              <div style={{
                fontSize: 36, fontWeight: 800, color: C.text, lineHeight: 1, letterSpacing: "-1px",
                animation: portfolioAnimated ? "countUp 0.5s ease both" : "none",
              }}>
                ${fmtUSD(totalUSD)}
              </div>
            )}

            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4, marginTop: 10,
              padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600,
              background: change24h >= 0 ? "rgba(0,255,136,0.12)" : "rgba(239,68,68,0.12)",
              color: change24h >= 0 ? C.accent : C.danger,
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                {change24h >= 0 ? <path d="M5 1L9 6H1L5 1Z" fill={C.accent} /> : <path d="M5 9L1 4H9L5 9Z" fill={C.danger} />}
              </svg>
              {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
            </div>
          </div>

          {/* Chain Balance Cards */}
          <div style={{
            display: isDesktop ? "grid" : "flex",
            gridTemplateColumns: isDesktop ? "1fr 1fr 1fr" : undefined,
            gap: 10,
            marginBottom: 14,
            overflowX: isDesktop ? undefined : "auto",
            paddingBottom: 2,
          }}>
            {CHAINS.map((c) => {
              const b = walletBalances[c.key];
              const addr = c.key === "solana" ? profile.sol_address : c.key === "ethereum" ? profile.eth_address : profile.btc_address;
              const hasAddr = Boolean(addr);
              const isExpanded = expandedChain === c.key;

              return (
                <div
                  key={c.key}
                  onClick={() => setExpandedChain(isExpanded ? null : c.key)}
                  style={{
                    flex: isDesktop ? undefined : 1, minWidth: isDesktop ? undefined : 105, cursor: "pointer",
                    background: c.gradient, borderRadius: 16,
                    border: `1px solid ${isExpanded ? c.color : `${c.color}25`}`,
                    boxShadow: isExpanded ? `0 0 16px ${c.color}25` : "none",
                    padding: "14px 12px",
                    display: "flex", flexDirection: "column", gap: 8,
                    transition: "border-color 0.25s, box-shadow 0.25s, transform 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {chainIcon(c.key, 20)}
                    <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.currency}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
                    {!hasAddr ? "--" : loadingBalances && !b ? "..." : fmtNative(b?.native ?? 0)}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {!hasAddr ? "Not linked" : loadingBalances && !b ? "" : `$${fmtUSD(b?.usd ?? 0)}`}
                  </div>

                  {isExpanded && addr && (
                    <div style={{ borderTop: `1px solid ${c.color}25`, paddingTop: 8, marginTop: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: C.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {truncateAddress(addr)}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCopy(addr); }}
                          style={{
                            background: "none", border: "none", cursor: "pointer", padding: 2,
                            color: copiedAddr === addr ? C.accent : C.muted, display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontFamily: FONT,
                          }}
                        >
                          <CopyIconW />
                          <span>{copiedAddr === addr ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                        No recent transactions
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Action Bar */}
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 4, padding: "4px 0" }}>
            {[
              { label: "Send", icon: <SendIconW />, action: () => { setShowSend(true); setSendStep(1); setSendError(""); setSendSuccess(""); setSendTo(""); setSendAmount(""); } },
              { label: "Receive", icon: <ReceiveIconW />, action: () => setShowReceive(true) },
              { label: "Buy", icon: <BuyIconW />, action: () => showToast("Buy coming soon") },
              { label: "Swap", icon: <SwapIconW />, action: () => showToast("Swap coming soon") },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  color: C.text, fontFamily: FONT, transition: "transform 0.15s",
                }}
                onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.9)")}
                onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onPointerLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: C.glass, border: `1px solid ${C.glassBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bio + Interest Tags */}
      {profile.bio && (
        <GlassCard style={{ marginBottom: 14, padding: "16px 18px" }}>
          <p
            style={{
              fontSize: 11,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            Bio
          </p>
          <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>
            {profile.bio}
          </p>
        </GlassCard>
      )}

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
                padding: "5px 14px",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </>
  );

  /* ============================================================ */
  /*  RIGHT COLUMN: Activity Feed                                   */
  /* ============================================================ */
  const rightColumn = (
    <>
      {/* Content Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${C.glassBorder}`,
          marginBottom: 14,
        }}
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                flex: 1,
                padding: "12px 0",
                border: "none",
                borderBottom: isActive
                  ? `2px solid ${C.primary}`
                  : "2px solid transparent",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                background: "transparent",
                color: isActive ? C.text : C.muted,
                transition: "color 0.2s, border-color 0.2s",
                fontFamily: FONT,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {activeTab === "moments" ? (
          <div style={{
            color: C.muted,
            fontSize: 14,
            textAlign: "center",
            padding: "48px 20px",
          }}>
            <div style={{ marginBottom: 12, opacity: 0.5 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>No moments yet</p>
            <p style={{ fontSize: 13, color: C.muted }}>Your best catches will show up here</p>
          </div>
        ) : listOrbs.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "48px 20px",
          }}>
            <div style={{ marginBottom: 16 }}>
              <DropIcon />
            </div>
            <p style={{ fontWeight: 600, color: C.text, fontSize: 15, marginBottom: 6 }}>
              {activeTab === "drops"
                ? "No creatures spawned yet"
                : "No creatures caught yet"}
            </p>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.5 }}>
              {activeTab === "drops"
                ? "Spawn your first creature and watch someone discover it"
                : "Head to the map to find creatures near you"}
            </p>
            <button
              onClick={() => router.push(activeTab === "drops" ? "/spawn" : "/watch")}
              onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
              onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onPointerLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              style={{
                padding: "10px 28px",
                borderRadius: 12,
                border: `1px solid ${C.primary}40`,
                background: `${C.primary}15`,
                color: C.primary,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: FONT,
                transition: "transform 0.15s ease",
              }}
            >
              {activeTab === "drops" ? "Spawn a Creature" : "Start Watching"}
            </button>
          </div>
        ) : (
          listOrbs.map((orb) => <OrbRow key={orb.id} orb={orb} />)
        )}
      </div>

      {/* Explore Links */}
      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <button
          onClick={() => router.push("/market")}
          onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
          onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onPointerLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          style={{
            padding: "14px 0",
            borderRadius: 14,
            border: "1px solid rgba(0,255,136,0.3)",
            background: "rgba(0,255,136,0.08)",
            color: C.primary,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontFamily: FONT,
            transition: "transform 0.15s ease, background 0.2s ease",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          Creature Market
        </button>
        <button
          onClick={() => router.push("/travel")}
          onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
          onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onPointerLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          style={{
            padding: "14px 0",
            borderRadius: 14,
            border: "1px solid rgba(0,255,136,0.3)",
            background: "rgba(0,255,136,0.08)",
            color: "#00FF88",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontFamily: FONT,
            transition: "transform 0.15s ease, background 0.2s ease",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          Virtual Travel
        </button>
      </div>

      {/* Edit Profile Button */}
      <button
        onClick={() => router.push("/profile/edit")}
        onMouseEnter={() => setEditBtnHover(true)}
        onMouseLeave={() => { setEditBtnHover(false); setEditBtnPressed(false); }}
        onPointerDown={() => setEditBtnPressed(true)}
        onPointerUp={() => setEditBtnPressed(false)}
        style={{
          marginTop: 24,
          width: "100%",
          padding: "14px 0",
          borderRadius: 14,
          border: `1px solid ${editBtnHover ? C.primary : `${C.primary}40`}`,
          background: editBtnHover ? `${C.primary}20` : `${C.primary}12`,
          color: C.primary,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontFamily: FONT,
          transition: "all 0.2s ease",
          transform: editBtnPressed ? "scale(0.98)" : "scale(1)",
        }}
      >
        <EditIcon />
        Edit Profile
      </button>
    </>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: FONT,
        paddingBottom: 100,
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* ============================================================ */}
      {/*  TOP NAV: Gear (left) + Trophy (right)                       */}
      {/* ============================================================ */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "52px 16px 0",
        }}
      >
        <button
          onClick={() => setShowSettings(true)}
          onMouseEnter={() => setGearHover(true)}
          onMouseLeave={() => setGearHover(false)}
          onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.9)")}
          onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onPointerLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; setGearHover(false); }}
          style={{
            background: gearHover ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.35)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: `1px solid ${gearHover ? "rgba(255,255,255,0.12)" : C.glassBorder}`,
            borderRadius: 12,
            padding: 8,
            cursor: "pointer",
            color: gearHover ? C.text : C.muted,
            display: "flex",
            alignItems: "center",
            transition: "all 0.2s ease",
          }}
          aria-label="Settings"
        >
          <GearIcon />
        </button>

        <button
          onClick={() => router.push("/council")}
          onMouseEnter={() => setTrophyHover(true)}
          onMouseLeave={() => setTrophyHover(false)}
          onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.9)")}
          onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onPointerLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; setTrophyHover(false); }}
          style={{
            background: trophyHover ? "rgba(245,158,11,0.12)" : "rgba(0,0,0,0.35)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: `1px solid ${trophyHover ? "rgba(245,158,11,0.3)" : C.glassBorder}`,
            borderRadius: 12,
            padding: 8,
            cursor: "pointer",
            color: C.gold,
            display: "flex",
            alignItems: "center",
            transition: "all 0.2s ease",
          }}
          aria-label="The Council"
        >
          <TrophyIcon />
        </button>
      </div>

      {/* ============================================================ */}
      {/*  HERO HEADER: Gradient bg + Avatar + Score badge              */}
      {/* ============================================================ */}
      <div
        style={{
          background: `linear-gradient(180deg, ${C.primary}30 0%, transparent 100%)`,
          height: 200,
          position: "relative",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: -48,
          position: "relative",
          zIndex: 5,
        }}
      >
        {/* Avatar */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: profile.avatar_url
                ? `url(${profile.avatar_url}) center/cover`
                : `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
              color: "#fff",
              border: `3px solid ${C.bg}`,
              boxShadow: `0 0 0 2px ${C.primary}60`,
              flexShrink: 0,
            }}
          >
            {!profile.avatar_url && initials}
          </div>

          <div
            style={{
              position: "absolute",
              bottom: -4,
              right: -4,
              background: tier.bg,
              border: `2px solid ${tier.color}`,
              borderRadius: 10,
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 800,
              color: tier.color,
              whiteSpace: "nowrap",
            }}
          >
            {score}
          </div>
        </div>

        {/* Identity */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            marginTop: 14,
            padding: "0 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: C.text,
              }}
            >
              {profile.display_name || profile.handle || "Anonymous"}
            </span>
            {profile.is_verified && <VerifiedIcon />}
          </div>

          {profile.handle && (
            <span style={{ fontSize: 14, color: C.muted }}>
              @{profile.handle}
            </span>
          )}

          {profile.vibe_line && (
            <p
              style={{
                fontStyle: "italic",
                color: C.muted,
                fontSize: 13,
                textAlign: "center",
                maxWidth: 280,
                marginTop: 4,
                lineHeight: 1.4,
              }}
            >
              &ldquo;{profile.vibe_line}&rdquo;
            </p>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginTop: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                {(profile.follower_count ?? 0).toLocaleString()}
              </span>
              <span style={{ fontSize: 11, color: C.muted }}>Followers</span>
            </div>
            <div
              style={{
                width: 1,
                height: 24,
                background: C.glassBorder,
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                {(profile.following_count ?? 0).toLocaleString()}
              </span>
              <span style={{ fontSize: 11, color: C.muted }}>Following</span>
            </div>
          </div>

          <div
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: isLive ? "rgba(0,255,136,0.10)" : "rgba(156,163,175,0.10)",
              border: `1px solid ${isLive ? C.accent : C.muted}30`,
              borderRadius: 20,
              padding: "4px 12px",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isLive ? C.accent : C.muted,
                animation: isLive ? "pulse 2s ease-in-out infinite" : "none",
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: isLive ? C.accent : C.muted,
              }}
            >
              {isLive ? "Live" : "Ghost"}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  YOUR BESTIARY (Phase 3) — owned Genesis/Mythics              */}
      {/* ============================================================ */}
      <div
        style={{
          padding: "20px 16px 0",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <YourBestiary />
      </div>

      {/* ============================================================ */}
      {/*  BODY CONTENT — Two-column on desktop                        */}
      {/* ============================================================ */}
      <div style={{
        padding: "20px 16px 0",
        ...(isDesktop ? {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          maxWidth: 960,
          margin: "0 auto",
        } : {}),
      }}>
        <div>{leftColumn}</div>
        <div>{rightColumn}</div>
      </div>

      <SettingsSheet isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", zIndex: 300,
          background: "rgba(10,10,15,0.92)", border: `1px solid ${C.glassBorder}`, borderRadius: 12,
          padding: "8px 18px", fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: "nowrap",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", pointerEvents: "none",
          animation: "fadeSlideUp 0.3s ease both",
        }}>
          {toast}
        </div>
      )}

      {/* Send Modal */}
      {showSend && (() => {
        const chainMeta = CHAINS.find(c => c.key === sendChain)!;
        const addr = sendChain === "solana" ? profile?.sol_address : sendChain === "ethereum" ? profile?.eth_address : profile?.btc_address;
        const bal = walletBalances[sendChain]?.native ?? 0;
        const rate = sendChain === "solana" ? prices.sol : sendChain === "ethereum" ? prices.eth : prices.btc;
        const usdEq = parseFloat(sendAmount || "0") * rate;
        const feeTxt = sendChain === "solana" ? "~0.000005 SOL" : sendChain === "ethereum" ? "~0.0001 ETH" : "~0.0001 BTC";
        const ticker = chainMeta.currency;
        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 250, display: "flex", flexDirection: "column",
            background: C.bg, animation: "modalSlideUp 0.4s cubic-bezier(0.32,0.72,0,1) both",
          }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: -1 }} />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.glassBorder}` }}>
              <button
                onClick={() => { if (sendStep > 1 && sendStep < 4) setSendStep(s => (s - 1) as 1|2|3|4); else setShowSend(false); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", color: C.muted }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>
                {sendStep === 4 ? "Sent" : sendStep === 3 ? "Confirm" : "Send"}
              </span>
              <div style={{ width: 30 }} />
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {/* Step 1: Select chain */}
              {sendStep === 1 && (
                <div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, fontWeight: 600 }}>Select asset to send</div>
                  {CHAINS.map((c) => {
                    const b = walletBalances[c.key];
                    return (
                      <button key={c.key} onClick={() => { setSendChain(c.key); setSendStep(2); }}
                        onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                        onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        onPointerLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        style={{
                          width: "100%", background: C.surface, border: `1px solid ${c.color}30`, borderRadius: 16,
                          padding: 16, marginBottom: 10, display: "flex", alignItems: "center", gap: 14,
                          cursor: "pointer", textAlign: "left", fontFamily: FONT, transition: "transform 0.15s",
                        }}>
                        {chainIcon(c.key, 36)}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{c.currency}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{fmtNative(b?.native ?? 0)}</div>
                          <div style={{ fontSize: 12, color: C.muted }}>${fmtUSD(b?.usd ?? 0)}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step 2: Enter details */}
              {sendStep === 2 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, padding: "10px 14px", background: `${chainMeta.color}15`, border: `1px solid ${chainMeta.color}30`, borderRadius: 12 }}>
                    {chainIcon(sendChain, 22)}
                    <span style={{ fontSize: 14, fontWeight: 700, color: chainMeta.color }}>{chainMeta.name}</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}>{fmtNative(bal)} available</span>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 8, letterSpacing: "0.4px" }}>TO</div>
                    <input
                      value={sendTo} onChange={e => setSendTo(e.target.value)}
                      placeholder="0x address"
                      style={{ width: "100%", background: C.surface, border: `1px solid ${C.glassBorder}`, borderRadius: 12, color: C.text, padding: 14, fontSize: 14, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 8, letterSpacing: "0.4px" }}>AMOUNT</div>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number" value={sendAmount} onChange={e => setSendAmount(e.target.value)}
                        placeholder="0.00" min="0" step="any"
                        style={{ width: "100%", background: C.surface, border: `1px solid ${C.glassBorder}`, borderRadius: 12, color: C.text, padding: "14px 80px 14px 14px", fontSize: 18, fontWeight: 700, outline: "none", boxSizing: "border-box" }}
                      />
                      <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => setSendAmount(fmtNative(bal))}
                          style={{ background: `${C.primary}25`, border: `1px solid ${C.primary}40`, borderRadius: 8, color: C.primary, fontSize: 11, fontWeight: 700, padding: "4px 8px", cursor: "pointer", fontFamily: FONT }}>MAX</button>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>{ticker}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 6, paddingLeft: 2 }}>
                      {usdEq > 0 ? `= $${fmtUSD(usdEq)}` : "= $0.00"}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: `1px solid ${C.glassBorder}`, marginBottom: 20 }}>
                    <span style={{ fontSize: 12, color: C.muted }}>Network fee</span>
                    <span style={{ fontSize: 12, color: C.muted }}>{feeTxt}</span>
                  </div>

                  <div style={{ padding: "10px 14px", background: C.glass, borderRadius: 10, marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>FROM</div>
                    <div style={{ fontSize: 12, fontFamily: "monospace", color: C.text }}>{addr ? truncateAddress(addr) : "No wallet"}</div>
                  </div>

                  {sendError && (
                    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.danger, marginBottom: 16 }}>
                      {sendError}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Review & confirm */}
              {sendStep === 3 && (
                <div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, fontWeight: 600, textAlign: "center" }}>Review your transaction</div>

                  <div style={{ background: C.surface, borderRadius: 16, padding: 20, border: `1px solid ${C.glassBorder}`, marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                      {chainIcon(sendChain, 28)}
                      <span style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{sendAmount} {ticker}</span>
                    </div>
                    <div style={{ fontSize: 14, color: C.muted, marginBottom: 4 }}>= ${fmtUSD(usdEq)}</div>

                    <div style={{ borderTop: `1px solid ${C.glassBorder}`, margin: "16px 0", paddingTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, color: C.muted }}>From</span>
                        <span style={{ fontSize: 13, fontFamily: "monospace", color: C.text }}>{addr ? truncateAddress(addr) : "--"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, color: C.muted }}>To</span>
                        <span style={{ fontSize: 13, fontFamily: "monospace", color: C.text }}>{truncateAddress(sendTo)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, color: C.muted }}>Network fee</span>
                        <span style={{ fontSize: 13, color: C.muted }}>{feeTxt}</span>
                      </div>
                    </div>
                  </div>

                  {sendError && (
                    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.danger, marginBottom: 16 }}>
                      {sendError}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Success */}
              {sendStep === 4 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center", position: "relative" }}>
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i / 12) * 360;
                    const rad = (angle * Math.PI) / 180;
                    const dist = 40 + Math.random() * 30;
                    return (
                      <div key={i} style={{
                        position: "absolute", top: "30%", left: "50%",
                        width: 6, height: 6, borderRadius: "50%",
                        background: [C.accent, C.primary, C.gold, C.ethBlue][i % 4],
                        // @ts-expect-error custom CSS properties for animation
                        "--tx": `${Math.cos(rad) * dist}px`, "--ty": `${Math.sin(rad) * dist}px`,
                        animation: "particleBurst 0.8s ease-out forwards",
                        animationDelay: `${i * 0.03}s`,
                      }} />
                    );
                  })}

                  <div style={{
                    width: 72, height: 72, borderRadius: "50%",
                    background: "rgba(0,255,136,0.15)", border: `2px solid ${C.accent}`,
                    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
                    animation: "successCheck 0.5s cubic-bezier(0.32,0.72,0,1) both",
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 8 }}>Transaction Sent</div>
                  <div style={{ fontSize: 14, color: C.muted, marginBottom: 4 }}>{sendSuccess}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 32 }}>Your {ticker} is on its way</div>
                  <button onClick={() => setShowSend(false)}
                    onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                    onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    onPointerLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    style={{
                      width: "100%", maxWidth: 320, height: 50, borderRadius: 25,
                      background: C.primary, border: "none", color: "#fff", fontSize: 15, fontWeight: 700,
                      cursor: "pointer", fontFamily: FONT, transition: "transform 0.15s",
                    }}>Done</button>
                </div>
              )}
            </div>

            {/* Bottom CTA for step 2 */}
            {sendStep === 2 && (
              <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.glassBorder}` }}>
                <button
                  onClick={() => { setSendError(""); setSendStep(3); }}
                  disabled={!sendTo.trim() || !sendAmount || parseFloat(sendAmount) <= 0}
                  onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                  onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  onPointerLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  style={{
                    width: "100%", height: 54, borderRadius: 27,
                    background: !sendTo.trim() || !sendAmount ? "#374151" : C.primary,
                    border: "none", color: "#fff", fontSize: 16, fontWeight: 700,
                    cursor: !sendTo.trim() || !sendAmount ? "not-allowed" : "pointer",
                    fontFamily: FONT, transition: "transform 0.15s",
                  }}>
                  Review
                </button>
              </div>
            )}

            {/* Bottom CTA for step 3 */}
            {sendStep === 3 && (
              <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.glassBorder}` }}>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  onPointerDown={(e) => { if (!sending) e.currentTarget.style.transform = "scale(0.97)"; }}
                  onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  onPointerLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  style={{
                    width: "100%", height: 54, borderRadius: 27,
                    background: sending ? "#374151" : C.accent,
                    border: "none", color: C.bg, fontSize: 16, fontWeight: 700,
                    cursor: sending ? "not-allowed" : "pointer",
                    fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "transform 0.15s",
                  }}>
                  {sending ? (
                    <><div style={{ width: 18, height: 18, border: "2px solid rgba(0,0,0,0.3)", borderTopColor: C.bg, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Sending...</>
                  ) : `Confirm & Send ${ticker}`}
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Receive Modal */}
      {showReceive && (() => {
        const chainMeta = CHAINS.find(c => c.key === receiveChain)!;
        const addr = receiveChain === "solana" ? profile?.sol_address : receiveChain === "ethereum" ? profile?.eth_address : profile?.btc_address;
        const ticker = chainMeta.currency;
        const qrUrl = addr ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&bgcolor=111118&color=ffffff&data=${encodeURIComponent(addr)}` : "";
        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 250, display: "flex", flexDirection: "column",
            background: C.bg, animation: "modalSlideUp 0.4s cubic-bezier(0.32,0.72,0,1) both",
          }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: -1 }} />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.glassBorder}` }}>
              <div style={{ width: 30 }} />
              <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>Receive</span>
              <button onClick={() => setShowReceive(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: C.muted, display: "flex" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
              {/* Chain selector pills */}
              <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
                {CHAINS.map(c => (
                  <button key={c.key} onClick={() => setReceiveChain(c.key)}
                    onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                    onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    onPointerLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    style={{
                      flex: 1, height: 38, borderRadius: 19,
                      border: `1.5px solid ${receiveChain === c.key ? c.color : C.glassBorder}`,
                      background: receiveChain === c.key ? `${c.color}18` : "transparent",
                      color: receiveChain === c.key ? c.color : C.muted,
                      fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
                      transition: "all 0.2s",
                    }}>
                    {c.currency}
                  </button>
                ))}
              </div>

              {/* QR Code */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                <div style={{
                  padding: 16, background: C.surface, borderRadius: 20,
                  border: `1px solid ${chainMeta.color}30`, boxShadow: `0 0 40px ${chainMeta.color}15`,
                }}>
                  {addr ? (
                    <img src={qrUrl} width={220} height={220} alt="QR Code" style={{ borderRadius: 8, display: "block" }} />
                  ) : (
                    <div style={{ width: 220, height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: 13 }}>No {ticker} wallet</div>
                  )}
                </div>
              </div>

              {/* Address + Copy */}
              {addr && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 8, textAlign: "center", letterSpacing: "0.4px" }}>{ticker} ADDRESS</div>
                  <div style={{ background: C.surface, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 12, fontFamily: "monospace", color: C.text, wordBreak: "break-all" }}>{addr}</span>
                    <button
                      onClick={() => handleCopy(addr)}
                      onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
                      onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                      onPointerLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                      style={{
                        background: copiedAddr === addr ? "rgba(0,255,136,0.15)" : C.glass,
                        border: "none", borderRadius: 8, padding: "8px 12px",
                        color: copiedAddr === addr ? C.accent : C.muted,
                        fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                        whiteSpace: "nowrap", transition: "all 0.2s",
                      }}>
                      {copiedAddr === addr ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {/* Warning */}
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#d97706", textAlign: "center", marginBottom: 20 }}>
                Only send {ticker} to this address. Sending other assets may result in permanent loss.
              </div>

              {/* Share button */}
              {addr && typeof navigator !== "undefined" && "share" in navigator && (
                <button
                  onClick={() => { navigator.share({ title: `My ${ticker} Address`, text: addr }).catch(() => {}); }}
                  onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                  onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  onPointerLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  style={{
                    width: "100%", height: 48, borderRadius: 24,
                    border: `1px solid ${C.glassBorder}`, background: C.glass,
                    color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer",
                    fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "transform 0.15s",
                  }}>
                  <ShareIconW />
                  Share Address
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
