"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import {
  C,
  FEE_WALLETS,
  rarityFromUSD,
  rarityColor,
  feeBreakdown,
  type OrbCurrency,
  type OrbRarity,
} from "@/lib/theme";
import { usePrices } from "@/hooks/usePrices";
import { useIsDesktop } from "@/hooks/useIsDesktop";

/* ------------------------------------------------------------------ */
/*  Dynamic Leaflet map (SSR-safe)                                     */
/* ------------------------------------------------------------------ */

const PlacementMap = dynamic(() => import("./PlacementMap"), { ssr: false });

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type OrbKind = "Crypto" | "NFT" | "Task" | "Stealth";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TOTAL_STEPS = 5;

const EXPIRY_OPTIONS: { label: string; value: string; hours: number }[] = [
  { label: "1 hour", value: "1h", hours: 1 },
  { label: "6 hours", value: "6h", hours: 6 },
  { label: "24 hours", value: "24h", hours: 24 },
  { label: "7 days", value: "7d", hours: 168 },
  { label: "30 days", value: "30d", hours: 720 },
];

const CURRENCY_CHAIN: Record<OrbCurrency, string> = {
  SOL: "solana",
  ETH: "ethereum",
  BTC: "bitcoin",
};

const ORB_TYPES: {
  kind: OrbKind;
  title: string;
  desc: string;
  borderColor: string;
  glowColor: string;
  tag?: string;
}[] = [
  {
    kind: "Crypto",
    title: "Crypto Creature",
    desc: "Spawn ETH for watchers to discover and catch on The Eye Map.",
    borderColor: C.accent,
    glowColor: C.accent,
  },
  {
    kind: "NFT",
    title: "NFT Creature",
    desc: "Hide an NFT on The Eye Map for someone to find. Digital treasure watching.",
    borderColor: C.gold,
    glowColor: C.gold,
  },
  {
    kind: "Task",
    title: "Task Creature",
    desc: "Set a challenge with a crypto reward. Watchers complete the task to earn.",
    borderColor: C.gold,
    glowColor: C.gold,
    tag: "COMING SOON",
  },
  {
    kind: "Stealth",
    title: "Stealth Creature",
    desc: "Invisible on The Eye Map until a watcher is within range. Maximum surprise.",
    borderColor: "#6b6b80",
    glowColor: "#6b6b80",
    tag: "COMING SOON",
  },
];

const STEP_LABELS = ["Type", "Value", "Media", "Location", "Review"];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function expiresAt(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

const RATE_FALLBACK: Record<OrbCurrency, number> = { SOL: 170, ETH: 3500, BTC: 82000 };
let _livePrices: Record<OrbCurrency, number> = RATE_FALLBACK;

function usdFromAmount(amount: number, currency: OrbCurrency): number {
  return amount * (_livePrices[currency] ?? 0);
}

/** Haversine forward: given origin, bearing (deg) and distance (mi), return destination lat/lng */
function destinationPoint(
  lat1: number, lng1: number, bearingDeg: number, distanceMi: number,
): { lat: number; lng: number } {
  const R = 3958.8; // Earth radius in miles
  const d = distanceMi / R;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1r = (lat1 * Math.PI) / 180;
  const lng1r = (lng1 * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1r) * Math.cos(d) + Math.cos(lat1r) * Math.sin(d) * Math.cos(brng),
  );
  const lng2 =
    lng1r +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1r),
      Math.cos(d) - Math.sin(lat1r) * Math.sin(lat2),
    );

  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

type LocationMode = "drop" | "launch";

const DISTANCE_OPTIONS = [
  { mi: 0.5, label: "0.5 mi", km: "0.8 km" },
  { mi: 1, label: "1 mi", km: "1.6 km" },
  { mi: 5, label: "5 mi", km: "8 km" },
  { mi: 10, label: "10 mi", km: "16 km" },
  { mi: 25, label: "25 mi", km: "40 km" },
  { mi: 50, label: "50 mi", km: "80 km" },
  { mi: 100, label: "100 mi", km: "161 km" },
];

function bearingLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

function CryptoIcon({ size = 24, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M9 9h4.5a1.5 1.5 0 010 3H9m0 0h5a1.5 1.5 0 010 3H9" />
    </svg>
  );
}

function ImageIcon({ size = 24, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function BriefcaseIcon({ size = 24, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      <path d="M2 12h20" />
    </svg>
  );
}

function EyeSlashIcon({ size = 24, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function ChevronLeftIcon({ size = 24, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function MapPinIcon({ size = 24, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function RocketIcon({ size = 24, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

function ShieldIcon({ size = 24, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

const ORB_KIND_ICONS: Record<OrbKind, (props: { size?: number; color?: string }) => JSX.Element> = {
  Crypto: CryptoIcon,
  NFT: ImageIcon,
  Task: BriefcaseIcon,
  Stealth: EyeSlashIcon,
};

/* ------------------------------------------------------------------ */
/*  Desktop Preview Panel                                              */
/* ------------------------------------------------------------------ */

function DropPreview({
  orbType,
  currency,
  amount,
  amountUsd,
  rarity,
  rarityCol,
  nftName,
  nftImage,
  step,
}: {
  orbType: OrbKind | null;
  currency: OrbCurrency;
  amount: string;
  amountUsd: number;
  rarity: OrbRarity;
  rarityCol: string;
  nftName: string;
  nftImage: string;
  step: number;
}) {
  const amountNum = parseFloat(amount) || 0;
  const hasType = orbType !== null;
  const isNFT = orbType === "NFT";
  const gradientCol = rarityCol || C.primary;

  return (
    <div style={{
      width: 340,
      flexShrink: 0,
      position: "sticky",
      top: 120,
      alignSelf: "flex-start",
      background: C.glass,
      border: `1px solid ${C.glassBorder}`,
      borderRadius: 20,
      padding: "32px 24px",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 16,
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        color: C.muted,
        textTransform: "uppercase" as const,
        marginBottom: 4,
      }}>
        Live Preview
      </div>

      {/* Orb visualization */}
      <div style={{ position: "relative", width: 80, height: 80 }}>
        <style>{`
          @keyframes dropPreviewPulse {
            0%, 100% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.12); opacity: 0.4; }
          }
          @keyframes dropPreviewSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        {/* Outer glow ring */}
        <div style={{
          position: "absolute",
          inset: -8,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${gradientCol}22 0%, transparent 70%)`,
          animation: hasType ? "dropPreviewPulse 2.5s ease-in-out infinite" : "none",
        }} />
        {/* Main orb */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: hasType
            ? `radial-gradient(circle at 35% 35%, ${gradientCol}, ${gradientCol}88 60%, ${gradientCol}44)`
            : `radial-gradient(circle at 35% 35%, ${C.muted}44, ${C.muted}22)`,
          boxShadow: hasType
            ? `0 0 24px ${gradientCol}44, 0 0 48px ${gradientCol}18, inset 0 -4px 12px ${gradientCol}33`
            : "none",
          transition: "all 0.5s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {isNFT && nftImage ? (
            <img
              src={nftImage}
              alt=""
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : hasType ? (
            (() => {
              const Icon = ORB_KIND_ICONS[orbType!];
              return <Icon size={28} color="#fff" />;
            })()
          ) : null}
        </div>
      </div>

      {/* Content based on step progress */}
      {!hasType ? (
        <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.5 }}>
          Choose a creature type to begin
        </div>
      ) : (
        <>
          {/* Type badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 12px",
            borderRadius: 20,
            background: `${gradientCol}15`,
            border: `1px solid ${gradientCol}33`,
          }}>
            <span style={{ color: gradientCol, fontSize: 12, fontWeight: 700 }}>
              {orbType} Creature
            </span>
          </div>

          {/* Amount + Currency */}
          {step >= 2 && amountNum > 0 && !isNFT && (
            <div>
              <div style={{
                fontSize: 28,
                fontWeight: 800,
                color: C.text,
                letterSpacing: "-0.02em",
              }}>
                {amountNum} {currency}
              </div>
              {amountUsd > 0 && (
                <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>
                  ${amountUsd.toFixed(2)} USD
                </div>
              )}
            </div>
          )}

          {/* NFT name */}
          {isNFT && nftName && (
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: C.text,
            }}>
              {nftName}
            </div>
          )}

          {/* Rarity badge */}
          {step >= 2 && (amountNum > 0 || isNFT) && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 14px",
              borderRadius: 20,
              background: `${rarityCol}18`,
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: rarityCol,
                boxShadow: `0 0 6px ${rarityCol}88`,
              }} />
              <span style={{ color: rarityCol, fontSize: 12, fontWeight: 700 }}>
                {rarity}
              </span>
            </div>
          )}

          {/* Step hint */}
          <div style={{
            color: C.muted,
            fontSize: 11,
            marginTop: 4,
            lineHeight: 1.5,
          }}>
            {step === 1 && "Set the value next"}
            {step === 2 && "Add a message or media next"}
            {step === 3 && "Choose a location next"}
            {step === 4 && "Placing on the map..."}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DropOrbPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const livePrices = usePrices();
  const { isDesktop, isTablet } = useIsDesktop();
  _livePrices = { SOL: livePrices.sol, ETH: livePrices.eth, BTC: livePrices.btc };

  /* ---- multi-step state ---- */
  const [step, setStep] = useState(1);

  /* step 1 */
  const [orbType, setOrbType] = useState<OrbKind | null>(null);

  /* step 2 (crypto) */
  const [currency, setCurrency] = useState<OrbCurrency>("ETH");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  /* step 3 (media) */
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);

  /* step 4 */
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  /* step 3 — Launch Anywhere mode */
  const [locationMode, setLocationMode] = useState<LocationMode>("drop");

  // Check URL for launch mode deep-link
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "launch") {
      setLocationMode("launch");
    }
  }, []);

  const [flingHeading, setFlingHeading] = useState(0);
  const [flingDistance, setFlingDistance] = useState(5); // miles
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [flingAnimating, setFlingAnimating] = useState(false);
  const [flingLanded, setFlingLanded] = useState(false);
  const [flingLandingName, setFlingLandingName] = useState("");

  /* launch animation */
  const [launching, setLaunching] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [launched, setLaunched] = useState(false);

  /* wallet balance */
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState(false);

  /* submit */
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSigning, setIsSigning] = useState(false);

  /* step 2 (NFT) */
  const [nftImage, setNftImage] = useState<string | null>(null);
  const [nftImageFile, setNftImageFile] = useState<File | null>(null);
  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [nftChain, setNftChain] = useState<"ETH" | "SOL">("ETH");
  const [nftRarity, setNftRarity] = useState<"Common" | "Rare" | "Legendary">("Common");
  const [nftUploading, setNftUploading] = useState(false);

  /* derived */
  const amountNum = parseFloat(amount) || 0;
  const amountUsd = usdFromAmount(amountNum, currency);
  const rarity: OrbRarity = rarityFromUSD(amountUsd);
  const rarityCol = rarityColor(rarity);
  const claimFee = Math.max(0.1, amountUsd * 0.1);
  const { ownerEarns, platformEarns } = feeBreakdown(claimFee);
  const platformFeeWallet = FEE_WALLETS[currency];

  /* auth guard */
  useEffect(() => {
    if (!loading && !user) router.replace("/auth/signin");
  }, [loading, user, router]);

  /* ---- fetch wallet balance ---- */
  useEffect(() => {
    if (step !== 2 || !user) return;
    let cancelled = false;

    async function fetchBalance() {
      setBalanceLoading(true);
      setBalanceError(false);
      setWalletBalance(null);

      try {
        // Get wallet addresses from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("sol_address, eth_address, btc_address")
          .eq("user_id", user!.id)
          .single();

        if (!profile || cancelled) { setBalanceError(true); setBalanceLoading(false); return; }

        let balance: number | null = null;

        if (currency === "SOL" && profile.sol_address) {
          const res = await fetch("https://api.mainnet-beta.solana.com", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0", id: 1, method: "getBalance",
              params: [profile.sol_address],
            }),
          });
          const json = await res.json();
          balance = (json?.result?.value ?? 0) / 1e9;
        } else if (currency === "ETH" && profile.eth_address) {
          const res = await fetch("https://cloudflare-eth.com", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0", id: 1, method: "eth_getBalance",
              params: [profile.eth_address, "latest"],
            }),
          });
          const json = await res.json();
          balance = parseInt(json?.result ?? "0", 16) / 1e18;
        } else if (currency === "BTC" && profile.btc_address) {
          const res = await fetch(
            `https://blockstream.info/api/address/${profile.btc_address}`
          );
          const json = await res.json();
          const confirmed = json?.chain_stats?.funded_txo_sum - json?.chain_stats?.spent_txo_sum;
          balance = (confirmed ?? 0) / 1e8;
        }

        if (!cancelled) {
          if (balance !== null) setWalletBalance(balance);
          else setBalanceError(true);
        }
      } catch {
        if (!cancelled) setBalanceError(true);
      } finally {
        if (!cancelled) setBalanceLoading(false);
      }
    }

    fetchBalance();
    return () => { cancelled = true; };
  }, [step, currency, user]);

  /* ---- navigation ---- */
  const goNext = () => setStep((s) => {
    // NFT orbs skip step 3 (media) — go from step 2 directly to step 4 (location)
    if (orbType === "NFT" && s === 2) return 4;
    return Math.min(s + 1, TOTAL_STEPS);
  });
  const goBack = () => {
    if (step === 1) router.push("/watch");
    // NFT orbs skip step 3 on the way back too
    else if (orbType === "NFT" && step === 4) setStep(2);
    else setStep((s) => s - 1);
  };

  const GAS_BUFFER: Record<OrbCurrency, number> = { SOL: 0.000005, ETH: 0.002, BTC: 0 };
  const gasBuffer = GAS_BUFFER[currency];
  const hasSufficientFunds =
    walletBalance !== null && amountNum > 0
      ? amountNum + gasBuffer <= walletBalance
      : true; // don't block if balance unknown

  const nftClaimFees: Record<string, number> = { Common: 0, Rare: 1, Legendary: 5 };

  const canAdvance = (() => {
    if (step === 1) return orbType !== null;
    if (step === 2) {
      if (orbType === "NFT") return !!nftImage && !nftUploading && nftName.trim().length > 0;
      return amountNum > 0 && amountUsd >= 0.01 && hasSufficientFunds;
    }
    if (step === 3) return true; // media step is always skippable
    if (step === 4) {
      if (locationMode === "launch") return lat !== null && lng !== null && !flingAnimating;
      return lat !== null && lng !== null;
    }
    return false;
  })();

  /* ---- submit with launch animation ---- */
  const handleLaunch = useCallback(async () => {
    if (!user) return;

    /* Start countdown */
    setLaunching(true);
    setCountdown(3);

    await new Promise<void>((resolve) => {
      let c = 3;
      const iv = setInterval(() => {
        c -= 1;
        if (c <= 0) {
          clearInterval(iv);
          setCountdown(null);
          resolve();
        } else {
          setCountdown(c);
        }
      }, 700);
    });

    /* Signing overlay */
    setIsSigning(true);
    await new Promise<void>((r) => setTimeout(r, 1500));
    setIsSigning(false);

    /* Submit via API route (uses service role, creates wallet_locks + activity) */
    setSubmitting(true);
    setSubmitError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const isNft = orbType === "NFT";
      const payload: Record<string, unknown> = isNft ? {
        type: "nft",
        currency: nftChain,
        chain: CURRENCY_CHAIN[nftChain as OrbCurrency],
        amount: 0,
        amount_usd: 0,
        claim_fee_usd: nftClaimFees[nftRarity],
        message: nftName,
        media_url: nftImage || null,
        media_type: "image",
        nft_name: nftName,
        nft_description: nftDescription,
        latitude: lat,
        longitude: lng,
        rarity: nftRarity.toLowerCase(),
        fee_wallet: FEE_WALLETS[nftChain as OrbCurrency],
        fee_percent: 0.1,
        radius_meters: 100,
        expires_at: expiresAt(168),
      } : {
        type: orbType?.toLowerCase() ?? "crypto",
        currency,
        chain: CURRENCY_CHAIN[currency],
        amount: amountNum,
        amount_usd: +amountUsd.toFixed(2),
        claim_fee_usd: +claimFee.toFixed(2),
        message: message.trim() || null,
        media_url: mediaUrl || null,
        media_type: mediaUrl ? "video" : (message.trim() ? "text" : null),
        latitude: lat,
        longitude: lng,
        rarity: rarity.toLowerCase(),
        fee_wallet: platformFeeWallet,
        fee_percent: 0.1,
        radius_meters: 100,
        expires_at: expiresAt(168),
      };

      if (locationMode === "launch" && userLat !== null && userLng !== null) {
        payload.fling_origin_lat = userLat;
        payload.fling_origin_lng = userLng;
        payload.fling_force = flingDistance;
        payload.fling_direction = flingHeading;
      }

      const res = await fetch("/api/orbs/drop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create creature");
      }

      setSubmitting(false);
      setLaunched(true);
    } catch (err: unknown) {
      setSubmitting(false);
      setLaunching(false);
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please retry.");
    }
  }, [
    user, orbType, currency, amountNum, amountUsd, claimFee,
    message, mediaUrl, mediaType, lat, lng, rarity, platformFeeWallet,
    locationMode, userLat, userLng, flingDistance, flingHeading,
    nftImage, nftName, nftDescription, nftChain, nftRarity, nftClaimFees,
  ]);

  /* ---------------------------------------------------------------- */
  /*  Loading / auth guard                                            */
  /* ---------------------------------------------------------------- */

  if (loading || !user) {
    return (
      <div style={{
        minHeight: "100vh", background: C.bg, display: "flex",
        alignItems: "center", justifyContent: "center",
        color: C.muted, fontFamily: "system-ui, sans-serif",
      }}>
        Loading...
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Launch overlay                                                  */
  /* ---------------------------------------------------------------- */

  if (launching) {
    return (
      <LaunchAnimation
        countdown={countdown}
        launched={launched}
        rarity={rarity}
        amountNum={amountNum}
        currency={currency}
        orbType={orbType}
        nftName={nftName}
        onDone={() => router.push("/watch")}
      />
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Main layout                                                     */
  /* ---------------------------------------------------------------- */

  const dropMaxWidth = isDesktop ? 640 : isTablet ? 580 : 480;
  const showPreview = isDesktop && step < TOTAL_STEPS;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "system-ui, sans-serif",
      display: "flex", flexDirection: "column",
      alignItems: "center",
    }}>
      <div style={{
        width: "100%",
        maxWidth: showPreview ? dropMaxWidth + 340 + 32 : dropMaxWidth,
        display: "flex",
        flexDirection: "row",
        gap: showPreview ? 32 : 0,
        flex: 1,
        transition: "max-width 0.3s ease",
      }}>
      <div style={{
        width: "100%",
        maxWidth: dropMaxWidth,
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minWidth: 0,
      }}>
      <GlobalStyles />

      {/* Signing transaction overlay */}
      {isSigning && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}>
          <style>{`
            @keyframes dropSignSpin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #00FF88, #88FF00 50%, #00FF8888)",
            boxShadow: "0 0 32px #00FF8866, 0 0 64px #00FF8822",
            animation: "dropSignSpin 1.5s linear infinite",
          }} />
          <div style={{ color: "#FFFFFF", fontSize: 17, fontWeight: 600 }}>
            Signing transaction...
          </div>
          <div style={{ color: "#8a8a99", fontSize: 14 }}>
            Securing your spawn on-chain
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "16px 20px 0",
      }}>
        <button
          onClick={goBack}
          style={{
            background: "none", border: "none", color: C.text,
            cursor: "pointer", padding: 4, lineHeight: 1,
            display: "flex", alignItems: "center",
          }}
          aria-label="Go back"
        >
          <ChevronLeftIcon size={22} color={C.text} />
        </button>
        <span style={{
          flex: 1, textAlign: "center", fontSize: 16,
          fontWeight: 700, color: C.text,
          letterSpacing: "-0.01em",
        }}>
          Spawn Creature
        </span>
        <div style={{ width: 30 }} />
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} total={TOTAL_STEPS} labels={STEP_LABELS} isDesktop={isDesktop} />

      {/* Step content */}
      <div style={{
        flex: 1,
        padding: step === 4 ? "0 16px" : "0 24px",
        overflowY: step === 4 ? "hidden" : "auto",
        WebkitOverflowScrolling: "touch",
      }}>
        {step === 1 && (
          <Step1TypeSelect
            selected={orbType}
            onSelect={(t) => {
              setOrbType(t);
              if (t === "Crypto" || t === "NFT") goNext();
            }}
            isDesktop={isDesktop}
          />
        )}
        {step === 2 && orbType === "NFT" && (
          <Step2NFT
            nftImage={nftImage} setNftImage={setNftImage}
            nftImageFile={nftImageFile} setNftImageFile={setNftImageFile}
            nftName={nftName} setNftName={setNftName}
            nftDescription={nftDescription} setNftDescription={setNftDescription}
            nftChain={nftChain} setNftChain={setNftChain}
            nftRarity={nftRarity} setNftRarity={setNftRarity}
            nftUploading={nftUploading} setNftUploading={setNftUploading}
            userId={user.id}
          />
        )}
        {step === 2 && orbType !== "NFT" && (
          <Step2Value
            currency={currency}
            setCurrency={setCurrency}
            amount={amount}
            setAmount={setAmount}
            amountUsd={amountUsd}
            rarity={rarity}
            rarityCol={rarityCol}
            walletBalance={walletBalance}
            balanceLoading={balanceLoading}
            balanceError={balanceError}
            hasSufficientFunds={hasSufficientFunds}
            gasBuffer={gasBuffer}
            isDesktop={isDesktop}
          />
        )}
        {step === 3 && (
          <Step3Media
            message={message}
            setMessage={setMessage}
            mediaUrl={mediaUrl}
            setMediaUrl={setMediaUrl}
            mediaType={mediaType}
            setMediaType={setMediaType}
            mediaUploading={mediaUploading}
            setMediaUploading={setMediaUploading}
            userId={user.id}
            onSkip={goNext}
            isDesktop={isDesktop}
          />
        )}
        {step === 4 && (
          <Step3Location
            lat={lat}
            lng={lng}
            message={message}
            setMessage={setMessage}
            mediaUrl={mediaUrl}
            setMediaUrl={setMediaUrl}
            mediaUploading={mediaUploading}
            setMediaUploading={setMediaUploading}
            setMediaType={setMediaType}
            userId={user?.id ?? ""}
            onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }}
            locationMode={locationMode}
            setLocationMode={setLocationMode}
            flingHeading={flingHeading}
            setFlingHeading={setFlingHeading}
            flingDistance={flingDistance}
            setFlingDistance={setFlingDistance}
            userLat={userLat}
            userLng={userLng}
            setUserLat={setUserLat}
            setUserLng={setUserLng}
            flingAnimating={flingAnimating}
            setFlingAnimating={setFlingAnimating}
            flingLanded={flingLanded}
            setFlingLanded={setFlingLanded}
            flingLandingName={flingLandingName}
            setFlingLandingName={setFlingLandingName}
            onFlingComplete={() => {
              // Auto-advance to step 5 after fling
              setTimeout(() => setStep(5), 3000);
            }}
            isDesktop={isDesktop}
          />
        )}
        {step === 5 && (
          <Step4Review
            orbType={orbType!}
            currency={currency}
            amountNum={amountNum}
            amountUsd={amountUsd}
            rarity={orbType === "NFT" ? nftRarity : rarity}
            rarityCol={orbType === "NFT" ? rarityColor(nftRarity) : rarityCol}
            claimFee={orbType === "NFT" ? nftClaimFees[nftRarity] : claimFee}
            ownerEarns={orbType === "NFT" ? nftClaimFees[nftRarity] * 0.9 : ownerEarns}
            platformEarns={orbType === "NFT" ? nftClaimFees[nftRarity] * 0.1 : platformEarns}
            lat={lat}
            lng={lng}
            message={message}
            submitting={submitting}
            submitError={submitError}
            onLaunch={handleLaunch}
            nftImage={nftImage}
            nftName={nftName}
            nftDescription={nftDescription}
            nftChain={nftChain}
            nftRarity={nftRarity}
          />
        )}
      </div>

      {/* Bottom continue button (steps 1-4) */}
      {step < TOTAL_STEPS && step !== 1 && !(step === 4 && locationMode === "launch" && !flingLanded) && (
        <div style={{
          padding: "16px 24px 36px",
          background: `linear-gradient(transparent, ${C.bg} 30%)`,
        }}>
          <style>{`
            .drop-continue-btn:hover:not(:disabled) {
              transform: scale(1.01);
              box-shadow: 0 0 24px ${C.accent}44, 0 4px 16px rgba(0,0,0,0.3);
            }
            .drop-continue-btn:active:not(:disabled) {
              transform: scale(0.98);
            }
          `}</style>
          <button
            className="drop-continue-btn"
            onClick={goNext}
            disabled={!canAdvance}
            style={{
              width: "100%", padding: "16px 0",
              borderRadius: 50, border: "none",
              background: canAdvance
                ? `linear-gradient(135deg, ${C.accent}, #0ea37a)`
                : "rgba(255,255,255,0.06)",
              color: canAdvance ? "#0a0a0f" : C.muted,
              fontSize: 16, fontWeight: 700,
              cursor: canAdvance ? "pointer" : "not-allowed",
              transition: "all 0.2s",
              letterSpacing: "-0.01em",
            }}
          >
            Continue
          </button>
        </div>
      )}
    </div>

    {/* Desktop preview panel */}
    {showPreview && (
      <DropPreview
        orbType={orbType}
        currency={currency}
        amount={amount}
        amountUsd={amountUsd}
        rarity={orbType === "NFT" ? nftRarity : rarity}
        rarityCol={orbType === "NFT" ? rarityColor(nftRarity) : rarityCol}
        nftName={nftName}
        nftImage={nftImage}
        step={step}
      />
    )}
    </div>
    </div>
  );
}

/* ================================================================== */
/*  Global Styles                                                      */
/* ================================================================== */

function GlobalStyles() {
  return (
    <style>{`
      input[type="number"]::-webkit-inner-spin-button,
      input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; }
      input[type="number"] { -moz-appearance: textfield; }
      @keyframes orbFloat {
        0%, 100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-6px) scale(1.03); }
      }
      @keyframes orbPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }
      @keyframes orbRingRotate {
        from { transform: translate(-50%, -50%) rotate(0deg); }
        to { transform: translate(-50%, -50%) rotate(360deg); }
      }
      @keyframes glowPulse {
        0%, 100% { box-shadow: 0 0 20px 4px rgba(0,255,136,0.4), 0 0 60px 10px rgba(0,255,136,0.15); transform: scale(1); }
        50% { box-shadow: 0 0 30px 8px rgba(0,255,136,0.7), 0 0 80px 20px rgba(0,255,136,0.3), 0 0 120px 40px rgba(0,255,136,0.1); transform: scale(1.02); }
      }
      @keyframes launchShimmer {
        0% { left: -100%; }
        100% { left: 200%; }
      }
      @keyframes countdownPop {
        0% { transform: scale(0.3); opacity: 0; }
        50% { transform: scale(1.2); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes orbLiftoff {
        0% { transform: translateY(0) scale(1); opacity: 1; }
        60% { transform: translateY(-120px) scale(1.3); opacity: 0.9; }
        100% { transform: translateY(-400px) scale(0.2); opacity: 0; }
      }
      @keyframes confettiBurst {
        0% { transform: scale(0); opacity: 1; }
        50% { transform: scale(1); opacity: 0.8; }
        100% { transform: scale(1.5); opacity: 0; }
      }
      @keyframes successSlideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes starTwinkle {
        0%, 100% { opacity: 0.15; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.5); }
      }
      @keyframes particleFly {
        0% { transform: translate(0,0) scale(1); opacity: 1; }
        100% { transform: translate(var(--px), var(--py)) scale(0); opacity: 0; }
      }
      @keyframes shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes cardHover {
        0%, 100% { box-shadow: 0 0 0 0 transparent; }
        50% { box-shadow: 0 0 20px 2px var(--glow); }
      }
    `}</style>
  );
}

/* ================================================================== */
/*  Step Indicator                                                     */
/* ================================================================== */

function StepIndicator({
  current,
  total,
  labels,
  isDesktop,
}: {
  current: number;
  total: number;
  labels: string[];
  isDesktop?: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 0, padding: isDesktop ? "20px 48px 24px" : "16px 32px 20px",
    }}>
      {Array.from({ length: total }, (_, i) => {
        const s = i + 1;
        const active = s === current;
        const done = s < current;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: i < total - 1 ? 1 : undefined }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
                background: active
                  ? `linear-gradient(135deg, ${C.primary}, #88FF00)`
                  : done
                    ? C.accent
                    : "rgba(255,255,255,0.06)",
                color: active || done ? "#fff" : C.muted,
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: active ? `0 0 16px ${C.primary}55` : "none",
                transform: active ? "scale(1.1)" : "scale(1)",
              }}>
                {done ? (
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : s}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: active ? C.text : C.muted,
                letterSpacing: "0.02em",
                transition: "color 0.3s ease",
              }}>
                {labels[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div style={{
                flex: 1, height: 2, margin: isDesktop ? "0 16px" : "0 6px",
                marginBottom: 18,
                background: done
                  ? C.accent
                  : active
                    ? `linear-gradient(90deg, ${C.primary}, rgba(255,255,255,0.06))`
                    : "rgba(255,255,255,0.06)",

                borderRadius: 1,
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/*  Step 1 -- Type Selection                                           */
/* ================================================================== */

function Step1TypeSelect({
  selected,
  onSelect,
  isDesktop,
}: {
  selected: OrbKind | null;
  onSelect: (t: OrbKind) => void;
  isDesktop?: boolean;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div style={{ paddingBottom: 100 }}>
      <style>{`
        .drop-type-card:active:not([disabled]) {
          transform: scale(0.98) !important;
        }
      `}</style>
      <h2 style={{
        color: C.text, fontSize: 26, fontWeight: 800,
        margin: "0 0 6px", letterSpacing: "-0.02em",
      }}>
        What are you spawning?
      </h2>
      <p style={{ color: C.muted, fontSize: 14, margin: "0 0 28px", lineHeight: 1.5 }}>
        Choose the type of creature to place on The Eye Map.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: isDesktop ? 16 : 12,
      }}>
        {ORB_TYPES.map((ot, idx) => {
          const isSelected = selected === ot.kind;
          const isHovered = hoveredIdx === idx;
          const disabled = ot.tag === "COMING SOON";
          const Icon = ORB_KIND_ICONS[ot.kind];

          return (
            <button
              key={ot.kind}
              className="drop-type-card"
              onClick={() => { if (!disabled) onSelect(ot.kind); }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                padding: isDesktop ? "24px 20px" : "20px 16px",
                borderRadius: 18,
                border: isSelected
                  ? `2px solid ${ot.borderColor}`
                  : `1px solid ${C.glassBorder}`,
                background: C.glass,
                cursor: disabled ? "default" : "pointer",
                textAlign: "left",
                position: "relative",
                overflow: "hidden",
                opacity: disabled ? 0.5 : 1,
                transition: "all 0.25s",
                transform: isHovered && !disabled
                  ? "scale(1.02)"
                  : "scale(1)",
                boxShadow: isSelected
                  ? `0 0 20px ${ot.borderColor}33, 0 4px 20px rgba(0,0,0,0.3)`
                  : isHovered && !disabled
                    ? `0 0 16px ${ot.borderColor}22, 0 4px 16px rgba(0,0,0,0.2)`
                    : "none",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {/* Radial glow on hover/select */}
              <div style={{
                position: "absolute", inset: 0,
                background: `radial-gradient(ellipse at 30% 30%, ${ot.glowColor}${isSelected ? '20' : isHovered && !disabled ? '12' : '00'} 0%, transparent 70%)`,
                pointerEvents: "none",
                transition: "all 0.3s",
              }} />

              <div style={{ position: "relative" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `linear-gradient(135deg, ${ot.borderColor}22, ${ot.borderColor}08)`,
                  border: `1px solid ${ot.borderColor}33`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 4,
                }}>
                  <Icon size={22} color={ot.borderColor} />
                </div>
                <div style={{
                  color: C.text, fontSize: 15, fontWeight: 700,
                  marginBottom: 4, letterSpacing: "-0.01em",
                }}>
                  {ot.title}
                </div>
                <div style={{
                  color: C.muted, fontSize: 11, lineHeight: 1.5,
                }}>
                  {ot.desc}
                </div>
                {ot.tag && (
                  <div style={{
                    display: "inline-block", marginTop: 8,
                    padding: "3px 8px", borderRadius: 20,
                    background: `${ot.borderColor}18`,
                    color: ot.borderColor,
                    fontSize: 9, fontWeight: 700,
                    letterSpacing: "0.06em",
                  }}>
                    {ot.tag}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Step 2 -- Value Input                                              */
/* ================================================================== */

function Step2Value({
  currency, setCurrency,
  amount, setAmount,
  amountUsd,
  rarity, rarityCol,
  walletBalance, balanceLoading, balanceError,
  hasSufficientFunds, gasBuffer,
  isDesktop,
}: {
  currency: OrbCurrency;
  setCurrency: (c: OrbCurrency) => void;
  amount: string;
  setAmount: (v: string) => void;
  amountUsd: number;
  rarity: OrbRarity;
  rarityCol: string;
  walletBalance: number | null;
  balanceLoading: boolean;
  balanceError: boolean;
  hasSufficientFunds: boolean;
  gasBuffer: number;
  isDesktop?: boolean;
}) {
  const [hoveredCurrency, setHoveredCurrency] = useState<OrbCurrency | null>(null);
  const [hoveredQuick, setHoveredQuick] = useState<number | null>(null);
  const [amountFocused, setAmountFocused] = useState(false);

  // BLINK: ETH-only — Solana currency pill hidden. Underlying SOL spawn code preserved for future L2 work.
  const currencies: { sym: OrbCurrency; color: string; label: string; live: boolean }[] = [
    { sym: "ETH", color: C.ethBlue, label: "ETH", live: true },
    // { sym: "SOL", color: C.solPurple, label: "SOL", live: true }, // BLINK: ETH-only — disabled
  ];

  const amountNum = parseFloat(amount) || 0;
  const quickAmounts = [0.001, 0.005, 0.01, 0.05];
  const quickLabels = currency === "ETH"
    ? ["0.001", "0.005", "0.01", "0.05"]
    : ["0.1", "0.5", "1", "5"];
  const quickValues = currency === "ETH"
    ? [0.001, 0.005, 0.01, 0.05]
    : [0.1, 0.5, 1, 5];

  return (
    <div style={{ paddingBottom: 80, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2 style={{
        color: C.text, fontSize: 26, fontWeight: 800,
        margin: "0 0 6px", alignSelf: "flex-start",
        letterSpacing: "-0.02em",
      }}>
        Set the value
      </h2>
      <p style={{
        color: C.muted, fontSize: 14,
        margin: "0 0 28px", alignSelf: "flex-start",
      }}>
        Choose currency and amount to spawn.
      </p>

      {/* Currency pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32, width: "100%" }}>
        {currencies.map((c) => {
          const active = currency === c.sym;
          if (!c.live) {
            return (
              <div
                key={c.sym}
                style={{
                  flex: 1, padding: "12px 0",
                  borderRadius: 50,
                  border: `1px solid ${C.glassBorder}`,
                  background: "rgba(255,255,255,0.02)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 2,
                  cursor: "not-allowed",
                  opacity: 0.45,
                  position: "relative",
                }}
              >
                <span style={{ color: C.muted, fontSize: 15, fontWeight: 700, letterSpacing: "0.02em" }}>{c.label}</span>
                <span style={{ color: C.muted, fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Soon</span>
              </div>
            );
          }
          const currHovered = isDesktop && hoveredCurrency === c.sym && !active;
          return (
            <button
              key={c.sym}
              onClick={() => { setCurrency(c.sym); setAmount(""); }}
              onMouseEnter={() => isDesktop && setHoveredCurrency(c.sym)}
              onMouseLeave={() => isDesktop && setHoveredCurrency(null)}
              style={{
                flex: 1, padding: "12px 0",
                borderRadius: 50,
                border: active ? `2px solid ${c.color}` : `1px solid ${C.glassBorder}`,
                background: active ? `${c.color}18` : C.glass,
                color: active ? c.color : C.muted,
                fontSize: 15, fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
                letterSpacing: "0.02em",
                filter: currHovered ? "brightness(1.4)" : "none",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Balance pill */}
      <div style={{
        width: "100%", display: "flex", justifyContent: "flex-end",
        marginBottom: 16, marginTop: -16,
      }}>
        {balanceLoading ? (
          <span style={{
            fontSize: 12, color: C.muted, fontWeight: 500,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <span style={{
              width: 12, height: 12, borderRadius: "50%",
              border: `2px solid ${C.muted}`,
              borderTopColor: "transparent",
              display: "inline-block",
              animation: "dropSignSpin 0.8s linear infinite",
            }} />
            Loading balance...
          </span>
        ) : balanceError ? (
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>
            Balance: unavailable
          </span>
        ) : walletBalance !== null ? (
          <span style={{
            fontSize: 12, color: C.muted, fontWeight: 600,
            background: "rgba(255,255,255,0.04)",
            padding: "4px 12px", borderRadius: 20,
          }}>
            Balance: {walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {currency}
          </span>
        ) : null}
      </div>

      {/* Large amount input */}
      <div style={{
        position: "relative",
        marginBottom: 8,
        width: "100%",
        textAlign: "center",
      }}>
        <div style={{
          display: "flex", alignItems: "baseline",
          justifyContent: "center", gap: 8,
        }}>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onFocus={() => setAmountFocused(true)}
            onBlur={() => setAmountFocused(false)}
            style={{
              width: "100%", maxWidth: 220,
              fontSize: 56, fontWeight: 800,
              color: C.text, background: "transparent",
              border: "none",
              borderBottom: amountFocused ? `2px solid ${C.accent}` : "2px solid transparent",
              textAlign: "center", outline: "none",
              padding: "6px 0",
              fontFamily: "system-ui, sans-serif",
              letterSpacing: "-0.03em",
              transition: "border-color 0.2s",
            }}
          />
          <span style={{
            fontSize: 20, fontWeight: 700,
            color: currencies.find(c => c.sym === currency)?.color || C.muted,
          }}>
            {currency}
          </span>
        </div>
      </div>

      {/* USD equivalent */}
      <p style={{
        color: C.muted, fontSize: 16, textAlign: "center",
        margin: "0 0 4px", fontWeight: 500,
      }}>
        ${amountUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
      </p>

      {amountUsd > 0 && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 14px", borderRadius: 20,
          background: `${rarityCol}18`,
          marginBottom: 12,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: rarityCol,
            boxShadow: `0 0 6px ${rarityCol}`,
          }} />
          <span style={{ color: rarityCol, fontSize: 13, fontWeight: 700 }}>
            {rarity} Creature
          </span>
        </div>
      )}

      {/* Balance info banner */}
      <div style={{
        width: "100%",
        background: C.glass,
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 14,
        padding: "14px 18px",
        marginTop: 16, marginBottom: 20,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <ShieldIcon size={16} color={C.muted} />
        <span style={{ color: C.muted, fontSize: 12, lineHeight: 1.5 }}>
          Your {currency} stays in your wallet until someone catches the creature. No upfront transfer needed.
        </span>
      </div>

      {/* Quick amount buttons */}
      <div style={{
        display: "flex", gap: 8, width: "100%",
      }}>
        {quickLabels.map((label, i) => {
          const val = quickValues[i];
          const active = amountNum === val;
          const qHovered = isDesktop && hoveredQuick === i && !active;
          return (
            <button
              key={label}
              onClick={() => setAmount(String(val))}
              onMouseEnter={() => isDesktop && setHoveredQuick(i)}
              onMouseLeave={() => isDesktop && setHoveredQuick(null)}
              style={{
                flex: 1, padding: "10px 0",
                borderRadius: 12,
                border: active ? `1px solid ${C.primary}66` : `1px solid ${C.glassBorder}`,
                background: active ? `${C.primary}18` : C.glass,
                color: active ? C.primary : C.muted,
                fontSize: 13, fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
                filter: qHovered ? "brightness(1.4)" : "none",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Funds check feedback */}
      {amountNum > 0 && walletBalance !== null && !balanceLoading && (
        !hasSufficientFunds ? (
          <div style={{
            width: "100%", marginTop: 16,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 14, padding: "14px 18px",
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <span style={{ color: "#EF4444", fontSize: 16, lineHeight: 1 }}>&#x26A0;</span>
            <span style={{ color: "#EF4444", fontSize: 13, lineHeight: 1.5, fontWeight: 500 }}>
              Insufficient balance. You have {walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {currency} but this creature requires {(amountNum + gasBuffer).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {currency}{gasBuffer > 0 ? ` (incl. ~${gasBuffer} gas)` : ""}.
            </span>
          </div>
        ) : (
          <div style={{
            width: "100%", marginTop: 16,
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: 14, padding: "12px 18px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ color: "#22C55E", fontSize: 13, fontWeight: 600 }}>
              You have enough to spawn this creature
            </span>
          </div>
        )
      )}
    </div>
  );
}

/* ================================================================== */
/*  Step 2 NFT -- Image, Name, Chain, Rarity                           */
/* ================================================================== */

function Step2NFT({
  nftImage, setNftImage, nftImageFile, setNftImageFile,
  nftName, setNftName, nftDescription, setNftDescription,
  nftChain, setNftChain, nftRarity, setNftRarity,
  nftUploading, setNftUploading, userId,
}: {
  nftImage: string | null; setNftImage: (v: string | null) => void;
  nftImageFile: File | null; setNftImageFile: (v: File | null) => void;
  nftName: string; setNftName: (v: string) => void;
  nftDescription: string; setNftDescription: (v: string) => void;
  nftChain: "ETH" | "SOL"; setNftChain: (v: "ETH" | "SOL") => void;
  nftRarity: "Common" | "Rare" | "Legendary"; setNftRarity: (v: "Common" | "Rare" | "Legendary") => void;
  nftUploading: boolean; setNftUploading: (v: boolean) => void;
  userId: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("Image must be under 10 MB"); return; }

    const reader = new FileReader();
    reader.onload = (ev) => setNftImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    setNftImageFile(file);

    setNftUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${userId}/nft/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("orb-media").upload(path, file, { contentType: file.type, upsert: true });
    if (error) { setNftUploading(false); return; }
    const { data: urlData } = supabase.storage.from("orb-media").getPublicUrl(path);
    setNftImage(urlData.publicUrl);
    setNftUploading(false);
  };

  const nftClaimFees: Record<string, number> = { Common: 0, Rare: 1, Legendary: 5 };

  return (
    <div style={{ paddingBottom: 80, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2 style={{ color: C.text, fontSize: 26, fontWeight: 800, margin: "0 0 6px", alignSelf: "flex-start", letterSpacing: "-0.02em" }}>
        Create your NFT
      </h2>
      <p style={{ color: C.muted, fontSize: 14, margin: "0 0 28px", alignSelf: "flex-start" }}>
        Upload an image and set your NFT details.
      </p>

      <input ref={fileRef} type="file" accept="image/png,image/jpg,image/jpeg,image/gif,image/webp" style={{ display: "none" }} onChange={handleImageUpload} />

      {nftImage ? (
        <div style={{ width: "100%", marginBottom: 24, position: "relative" }}>
          <img src={nftImage} alt="NFT preview" style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 18, border: `1px solid ${C.glassBorder}` }} />
          <button onClick={() => { setNftImage(null); setNftImageFile(null); }} style={{ position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 16, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
          {nftUploading && <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.7)", padding: "6px 16px", borderRadius: 20, color: C.text, fontSize: 12 }}>Uploading...</div>}
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()} disabled={nftUploading} style={{ width: "100%", height: 200, borderRadius: 18, border: `2px dashed ${C.glassBorder}`, background: C.glass, color: C.muted, fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 24 }}>
          <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={1.5}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
          {nftUploading ? "Uploading..." : "Upload Image"}
          <span style={{ fontSize: 11, color: C.muted, opacity: 0.6 }}>PNG, JPG, GIF, WEBP (max 10 MB)</span>
        </button>
      )}

      <input value={nftName} onChange={(e) => { if (e.target.value.length <= 50) setNftName(e.target.value); }} placeholder="NFT Name" style={{ width: "100%", boxSizing: "border-box", background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 14, color: C.text, fontSize: 16, fontWeight: 600, padding: "14px 16px", outline: "none", fontFamily: "system-ui, sans-serif", marginBottom: 12 }} />

      <textarea value={nftDescription} onChange={(e) => { if (e.target.value.length <= 200) setNftDescription(e.target.value); }} placeholder="Description (optional)" rows={3} style={{ width: "100%", boxSizing: "border-box", background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 14, color: C.text, fontSize: 14, padding: "14px 16px", outline: "none", fontFamily: "system-ui, sans-serif", resize: "none", marginBottom: 20 }} />

      <p style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, alignSelf: "flex-start", margin: "0 0 10px" }}>Chain</p>
      {/* BLINK: ETH-only — Solana NFT chain option hidden. setNftChain still used internally; locked to ETH. */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, width: "100%" }}>
        {(["ETH"] as const).map((ch) => {
          const active = nftChain === ch;
          const color = "#00FF88";
          return (
            <button key={ch} onClick={() => setNftChain(ch)} style={{ flex: 1, padding: "12px 0", borderRadius: 50, border: active ? `2px solid ${color}` : `1px solid ${C.glassBorder}`, background: active ? `${color}18` : C.glass, color: active ? color : C.muted, fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>Ethereum</button>
          );
        })}
      </div>

      <p style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, alignSelf: "flex-start", margin: "0 0 10px" }}>Rarity Tier</p>
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        {(["Common", "Rare", "Legendary"] as const).map((r) => {
          const active = nftRarity === r;
          const col = r === "Legendary" ? C.gold : r === "Rare" ? C.rareBlue : C.text;
          const fee = nftClaimFees[r];
          return (
            <button key={r} onClick={() => setNftRarity(r)} style={{ flex: 1, padding: "14px 0", borderRadius: 14, border: active ? `2px solid ${col}` : `1px solid ${C.glassBorder}`, background: active ? `${col}15` : C.glass, color: active ? col : C.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span>{r}</span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>{fee === 0 ? "Free" : `$${fee} fee`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Step 3 -- Message & Media                                          */
/* ================================================================== */

function Step3Media({
  message, setMessage,
  mediaUrl, setMediaUrl,
  mediaType, setMediaType,
  mediaUploading, setMediaUploading,
  userId, onSkip,
  isDesktop,
}: {
  message: string;
  setMessage: (v: string) => void;
  mediaUrl: string | null;
  setMediaUrl: (v: string | null) => void;
  mediaType: string | null;
  setMediaType: (v: string | null) => void;
  mediaUploading: boolean;
  setMediaUploading: (v: boolean) => void;
  userId: string;
  onSkip: () => void;
  isDesktop?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [textareaFocused, setTextareaFocused] = useState(false);
  const [uploadHovered, setUploadHovered] = useState(false);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert("Video must be under 50 MB");
      return;
    }

    setMediaUploading(true);
    const ext = file.name.split(".").pop() || "mp4";
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("orb-media")
      .upload(path, file, { contentType: file.type, upsert: true });

    if (error) {
      alert("Upload failed: " + error.message);
      setMediaUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("orb-media").getPublicUrl(path);
    setMediaUrl(urlData.publicUrl);
    setMediaType("video");
    setMediaUploading(false);
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <h2 style={{
        color: C.text, fontSize: 26, fontWeight: 800,
        margin: "0 0 6px", letterSpacing: "-0.02em",
      }}>
        Message & Media
      </h2>
      <p style={{ color: C.muted, fontSize: 14, margin: "0 0 24px" }}>
        Attach an optional message or video to your creature.
      </p>

      {/* Textarea */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <textarea
          value={message}
          onChange={(e) => { if (e.target.value.length <= 280) setMessage(e.target.value); }}
          placeholder="Write a message for the watcher..."
          rows={4}
          onFocus={() => setTextareaFocused(true)}
          onBlur={() => setTextareaFocused(false)}
          style={{
            width: "100%", boxSizing: "border-box",
            background: C.glass,
            border: `1px solid ${textareaFocused ? C.accent : C.glassBorder}`,
            borderRadius: 14,
            color: C.text, fontSize: 14,
            padding: "14px 16px",
            outline: "none",
            fontFamily: "system-ui, sans-serif",
            resize: "none",
            transition: "border-color 0.2s",
          }}
        />
        <span style={{
          position: "absolute", right: 14, bottom: 10,
          fontSize: 11, color: message.length >= 250 ? C.gold : C.muted,
        }}>
          {message.length}/280
        </span>
      </div>

      {/* Video upload */}
      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/mov,video/webm"
        style={{ display: "none" }}
        onChange={handleVideoUpload}
      />

      {mediaUrl && mediaType === "video" ? (
        <div style={{
          borderRadius: 14, overflow: "hidden",
          border: `1px solid ${C.glassBorder}`, marginBottom: 16,
          position: "relative",
        }}>
          <video
            src={mediaUrl}
            controls
            style={{ width: "100%", display: "block", maxHeight: 240 }}
          />
          <button
            onClick={() => { setMediaUrl(null); setMediaType(null); }}
            style={{
              position: "absolute", top: 8, right: 8,
              width: 28, height: 28, borderRadius: 14,
              background: "rgba(0,0,0,0.7)", border: "none",
              color: "#fff", fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            x
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={mediaUploading}
          onMouseEnter={() => isDesktop && setUploadHovered(true)}
          onMouseLeave={() => isDesktop && setUploadHovered(false)}
          style={{
            width: "100%", padding: "16px 0",
            borderRadius: 14, border: `1px dashed ${C.glassBorder}`,
            background: C.glass, color: C.muted,
            fontSize: 14, fontWeight: 600,
            cursor: mediaUploading ? "not-allowed" : "pointer",
            marginBottom: 16,
            transition: "filter 0.2s",
            filter: isDesktop && uploadHovered && !mediaUploading ? "brightness(1.4)" : "none",
          }}
        >
          {mediaUploading ? "Uploading..." : "Upload Video (mp4 / mov / webm, max 50 MB)"}
        </button>
      )}

      {/* Skip button */}
      <button
        onClick={onSkip}
        style={{
          width: "100%", padding: "14px 0",
          borderRadius: 50, border: "none",
          background: "rgba(255,255,255,0.06)",
          color: C.muted, fontSize: 14, fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Skip
      </button>
    </div>
  );
}

/* ================================================================== */
/*  Step 4 -- Location                                                 */
/* ================================================================== */

function Step3Location({
  lat, lng, message, setMessage,
  mediaUrl, setMediaUrl, mediaUploading, setMediaUploading, setMediaType, userId,
  onChange,
  locationMode, setLocationMode,
  flingHeading, setFlingHeading,
  flingDistance, setFlingDistance,
  userLat, userLng, setUserLat, setUserLng,
  flingAnimating, setFlingAnimating,
  flingLanded, setFlingLanded,
  flingLandingName, setFlingLandingName,
  onFlingComplete,
}: {
  lat: number | null;
  lng: number | null;
  message: string;
  setMessage: (v: string) => void;
  mediaUrl: string | null;
  setMediaUrl: (v: string | null) => void;
  mediaUploading: boolean;
  setMediaUploading: (v: boolean) => void;
  setMediaType: (v: string | null) => void;
  userId: string;
  onChange: (lat: number, lng: number) => void;
  locationMode: LocationMode;
  setLocationMode: (m: LocationMode) => void;
  flingHeading: number;
  setFlingHeading: (h: number) => void;
  flingDistance: number;
  setFlingDistance: (d: number) => void;
  userLat: number | null;
  userLng: number | null;
  setUserLat: (v: number | null) => void;
  setUserLng: (v: number | null) => void;
  flingAnimating: boolean;
  setFlingAnimating: (v: boolean) => void;
  flingLanded: boolean;
  setFlingLanded: (v: boolean) => void;
  flingLandingName: string;
  setFlingLandingName: (v: string) => void;
  onFlingComplete: () => void;
}) {
  const { isDesktop } = useIsDesktop();
  const compassRef = useRef<HTMLDivElement>(null);
  const [draggingCompass, setDraggingCompass] = useState(false);
  const [hasDeviceOrientation, setHasDeviceOrientation] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [hoveredMode, setHoveredMode] = useState<LocationMode | null>(null);
  const [launchHovered, setLaunchHovered] = useState(false);
  const [msgFocused, setMsgFocused] = useState(false);

  const compassSize = isDesktop ? 360 : 280;
  const cs = compassSize / 280; // scale factor

  /* Get user location for Launch Anywhere */
  useEffect(() => {
    if (locationMode !== "launch") return;
    if (userLat !== null && userLng !== null) return;

    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setGeoError("");
      },
      () => setGeoError("Enable location access to launch creatures"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [locationMode, userLat, userLng, setUserLat, setUserLng]);

  /* Device orientation for real compass on mobile */
  useEffect(() => {
    if (locationMode !== "launch") return;

    let handler: ((e: DeviceOrientationEvent) => void) | null = null;

    const setup = () => {
      handler = (e: DeviceOrientationEvent) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const heading = (e as any).webkitCompassHeading ?? (e.alpha != null ? (360 - e.alpha) % 360 : null);
        if (heading != null && !draggingCompass) {
          setHasDeviceOrientation(true);
          setFlingHeading(Math.round(heading));
        }
      };
      window.addEventListener("deviceorientation", handler as EventListener);
    };

    // iOS 13+ requires permission
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DOE = DeviceOrientationEvent as any;
    if (typeof DOE.requestPermission === "function") {
      DOE.requestPermission()
        .then((perm: string) => { if (perm === "granted") setup(); })
        .catch(() => {/* user denied — fall back to manual */});
    } else {
      setup();
    }

    return () => {
      if (handler) window.removeEventListener("deviceorientation", handler as EventListener);
    };
  }, [locationMode, draggingCompass, setFlingHeading]);

  /* Compass drag/tap handler */
  const handleCompassInteraction = useCallback((clientX: number, clientY: number) => {
    if (!compassRef.current) return;
    const rect = compassRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(clientX - cx, -(clientY - cy));
    const deg = ((angle * 180) / Math.PI + 360) % 360;
    setFlingHeading(Math.round(deg));
  }, [setFlingHeading]);

  /* Execute fling */
  const handleFling = useCallback(() => {
    if (userLat === null || userLng === null) return;
    setFlingAnimating(true);
    setFlingLanded(false);
    setFlingLandingName("");

    const dest = destinationPoint(userLat, userLng, flingHeading, flingDistance);
    onChange(dest.lat, dest.lng);

    // Try reverse geocode for landing name
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${dest.lat}&lon=${dest.lng}&format=json&zoom=10`,
    )
      .then((r) => r.json())
      .then((data) => {
        const name =
          data?.address?.city ||
          data?.address?.town ||
          data?.address?.county ||
          data?.address?.state ||
          "";
        setFlingLandingName(name);
      })
      .catch(() => {});

    // Animation timing: orb shoots up (1.2s), then show map (0.5s delay)
    setTimeout(() => {
      setFlingLanded(true);
      onFlingComplete();
    }, 2000);
  }, [userLat, userLng, flingHeading, flingDistance, onChange, setFlingAnimating, setFlingLanded, setFlingLandingName, onFlingComplete]);

  /* ---- Fling animation overlay ---- */
  if (flingAnimating) {
    const dest = lat !== null && lng !== null ? { lat, lng } : null;
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        height: "calc(100vh - 220px)",
        position: "relative", overflow: "hidden",
      }}>
        <style>{`
          @keyframes flingOrbShoot {
            0% { transform: scale(1) translateY(0); opacity: 1; }
            40% { transform: scale(1.4) translateY(0); opacity: 1; }
            100% { transform: scale(0.2) translateY(-500px); opacity: 0; }
          }
          @keyframes flingFlash {
            0% { opacity: 0; }
            20% { opacity: 0.6; }
            100% { opacity: 0; }
          }
          @keyframes flingTrailParticle {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(60px) scale(0.3); }
          }
          @keyframes flingMapReveal {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes flingPulseOrigin {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
            50% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
          }
          @keyframes flingImpactRing {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
          }
          @keyframes flingTextSlide {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes flingDotDash {
            to { stroke-dashoffset: 0; }
          }
        `}</style>

        {!flingLanded ? (
          /* Phase 1: orb shoots upward */
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            {/* Flash */}
            <div style={{
              position: "absolute", inset: 0,
              background: "white",
              animation: "flingFlash 0.8s ease-out forwards",
              pointerEvents: "none", zIndex: 10,
            }} />

            {/* Fire trail particles */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{
                position: "absolute",
                width: 6 + Math.random() * 8, height: 6 + Math.random() * 8,
                borderRadius: "50%",
                background: [C.gold, "#ff6b2b", C.cyan, C.indigo][i % 4],
                left: `${45 + Math.random() * 10}%`,
                top: "50%",
                animation: `flingTrailParticle ${0.6 + Math.random() * 0.4}s ${i * 0.05}s ease-out forwards`,
                pointerEvents: "none",
              }} />
            ))}

            {/* Orb shooting up */}
            <div style={{ animation: "flingOrbShoot 1.2s ease-in forwards" }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: `radial-gradient(circle at 35% 35%, ${C.cyan}, ${C.indigo} 60%, ${C.primary})`,
                boxShadow: `0 0 60px ${C.indigo}88, 0 0 120px ${C.cyan}44`,
              }} />
            </div>
          </div>
        ) : (
          /* Phase 2: mini map showing origin → landing */
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            animation: "flingMapReveal 0.6s ease-out",
            padding: "0 20px",
          }}>
            {/* Mini map */}
            <div style={{
              width: "100%", maxWidth: 320, height: 200,
              borderRadius: 20, overflow: "hidden",
              position: "relative",
              background: "rgba(13,13,20,0.85)",
              border: `1px solid ${C.indigo}33`,
              backdropFilter: "blur(20px)",
            }}>
              <svg width="100%" height="100%" viewBox="0 0 320 200">
                {/* Origin point */}
                <circle cx="80" cy="140" r="6" fill={C.cyan} opacity={0.9} />
                <circle cx="80" cy="140" r="16" fill="none" stroke={C.cyan} strokeWidth={1} opacity={0.4}>
                  <animate attributeName="r" values="8;24;8" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                </circle>

                {/* Dotted arc line */}
                <path
                  d="M 80 140 Q 160 40 240 70"
                  fill="none"
                  stroke={C.indigo}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  strokeDashoffset={100}
                  style={{ animation: "flingDotDash 1s ease-out forwards" }}
                />

                {/* Distance label on arc */}
                <text x="160" y="75" fill={C.text} fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="system-ui">
                  {flingDistance} mi
                </text>

                {/* Landing point */}
                <circle cx="240" cy="70" r="8" fill={C.indigo} opacity={0.9} />
                {/* Impact rings */}
                <circle cx="240" cy="70" r="12" fill="none" stroke={C.indigo} strokeWidth={1.5}>
                  <animate attributeName="r" values="10;30" dur="1s" repeatCount="1" fill="freeze" />
                  <animate attributeName="opacity" values="1;0" dur="1s" repeatCount="1" fill="freeze" />
                </circle>
                <circle cx="240" cy="70" r="12" fill="none" stroke={C.indigo} strokeWidth={1}>
                  <animate attributeName="r" values="10;40" dur="1.2s" begin="0.2s" repeatCount="1" fill="freeze" />
                  <animate attributeName="opacity" values="0.8;0" dur="1.2s" begin="0.2s" repeatCount="1" fill="freeze" />
                </circle>

                {/* Labels */}
                <text x="80" y="165" fill={C.muted} fontSize="10" textAnchor="middle" fontFamily="system-ui">You</text>
                <text x="240" y="100" fill={C.muted} fontSize="10" textAnchor="middle" fontFamily="system-ui">Landing</text>
              </svg>
            </div>

            {/* Success text */}
            <div style={{
              textAlign: "center", marginTop: 24,
              animation: "flingTextSlide 0.5s 0.3s ease-out both",
            }}>
              <p style={{
                color: C.text, fontSize: 24, fontWeight: 800,
                margin: "0 0 6px", letterSpacing: "-0.02em",
              }}>
                Creature Launched!
              </p>
              {flingLandingName && (
                <p style={{ color: C.cyan, fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>
                  Landing near {flingLandingName}
                </p>
              )}
              <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
                {Math.round(flingHeading)}{"\u00B0"} {bearingLabel(flingHeading)} / {flingDistance} mi
              </p>
              {dest && (
                <p style={{ color: C.muted, fontSize: 11, margin: "6px 0 0", fontFamily: "monospace" }}>
                  {dest.lat.toFixed(5)}, {dest.lng.toFixed(5)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---- Normal step 3 UI ---- */
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "calc(100vh - 220px)",
    }}>
      {/* Mode toggle */}
      <div style={{
        display: "flex", justifyContent: "center", marginBottom: 12,
      }}>
        <div style={{
          display: "inline-flex", borderRadius: 50, overflow: "hidden",
          border: `1px solid ${C.glassBorder}`,
          background: C.glass,
        }}>
          {(["drop", "launch"] as LocationMode[]).map((mode) => {
            const active = locationMode === mode;
            return (
              <button
                key={mode}
                onClick={() => {
                  setLocationMode(mode);
                  setFlingAnimating(false);
                  setFlingLanded(false);
                }}
                onMouseEnter={() => isDesktop && setHoveredMode(mode)}
                onMouseLeave={() => isDesktop && setHoveredMode(null)}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  background: active
                    ? mode === "launch"
                      ? `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`
                      : `linear-gradient(135deg, ${C.primary}, #88FF00)`
                    : "transparent",
                  color: active ? "#fff" : C.muted,
                  fontSize: 13, fontWeight: 700,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  transition: "all 0.25s",
                  letterSpacing: "-0.01em",
                  filter: !active && isDesktop && hoveredMode === mode ? "brightness(1.4)" : "none",
                }}
              >
                {mode === "drop" ? (
                  <MapPinIcon size={14} color={active ? "#fff" : C.muted} />
                ) : (
                  <RocketIcon size={14} color={active ? "#fff" : C.muted} />
                )}
                {mode === "drop" ? "Spawn Here" : "Launch Anywhere"}
              </button>
            );
          })}
        </div>
      </div>

      {locationMode === "drop" ? (
        /* ---- DROP HERE MODE (original) ---- */
        <>
          {/* Instruction pill */}
          <div style={{
            display: "flex", justifyContent: "center", marginBottom: 12,
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 18px", borderRadius: 50,
              background: C.glass,
              border: `1px solid ${C.glassBorder}`,
            }}>
              <MapPinIcon size={14} color={C.primary} />
              <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>
                Drag The Eye Map to place your creature
              </span>
            </div>
          </div>

          {/* Map container */}
          <div style={{
            flex: 1, borderRadius: 20, overflow: "hidden",
            position: "relative", minHeight: 280,
            border: `1px solid ${C.glassBorder}`,
          }}>
            <PlacementMap onCenterChange={onChange} />

            {/* Crosshair overlay */}
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none", zIndex: 1000,
            }}>
              <div style={{ position: "relative", width: 48, height: 48 }}>
                <div style={{
                  position: "absolute", inset: 4,
                  borderRadius: "50%",
                  border: `2px solid ${C.primary}88`,
                }} />
                <div style={{
                  position: "absolute", top: "50%", left: 0, right: 0,
                  height: 2, background: C.primary,
                  transform: "translateY(-50%)",
                  boxShadow: `0 0 8px ${C.primary}`,
                }} />
                <div style={{
                  position: "absolute", left: "50%", top: 0, bottom: 0,
                  width: 2, background: C.primary,
                  transform: "translateX(-50%)",
                  boxShadow: `0 0 8px ${C.primary}`,
                }} />
                <div style={{
                  position: "absolute", top: "50%", left: "50%",
                  width: 10, height: 10, borderRadius: "50%",
                  background: C.primary,
                  transform: "translate(-50%, -50%)",
                  boxShadow: `0 0 16px ${C.primary}`,
                }} />
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ---- LAUNCH ANYWHERE MODE ---- */
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "flex-start",
          gap: 16, overflowY: "auto",
        }}>
          {geoError && (
            <div style={{
              padding: "10px 18px", borderRadius: 12,
              background: `${C.gold}18`, border: `1px solid ${C.gold}33`,
              color: C.gold, fontSize: 13, fontWeight: 600,
              textAlign: "center", width: "100%", boxSizing: "border-box",
            }}>
              {geoError}
            </div>
          )}

          {/* Compass Ring */}
          <div
            ref={compassRef}
            style={{
              position: "relative",
              width: compassSize, height: compassSize,
              flexShrink: 0,
              cursor: "pointer",
              touchAction: "none",
            }}
            onPointerDown={(e) => {
              setDraggingCompass(true);
              handleCompassInteraction(e.clientX, e.clientY);
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (draggingCompass) handleCompassInteraction(e.clientX, e.clientY);
            }}
            onPointerUp={() => setDraggingCompass(false)}
          >
            <style>{`
              @keyframes compassGlow {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 0.8; }
              }
              @keyframes compassArrowPulse {
                0%, 100% { filter: drop-shadow(0 0 6px ${C.cyan}88); }
                50% { filter: drop-shadow(0 0 16px ${C.cyan}); }
              }
            `}</style>

            {/* Outer ring glow */}
            <div style={{
              position: "absolute", inset: -4,
              borderRadius: "50%",
              border: `2px solid ${C.indigo}44`,
              animation: "compassGlow 3s ease-in-out infinite",
            }} />

            {/* Main ring */}
            <svg width={compassSize} height={compassSize} viewBox={`0 0 ${compassSize} ${compassSize}`}>
              {/* Degree tick marks */}
              {Array.from({ length: 72 }).map((_, i) => {
                const deg = i * 5;
                const isMajor = deg % 30 === 0;
                const isCardinal = deg % 90 === 0;
                const r1 = (isCardinal ? 118 : isMajor ? 122 : 126) * cs;
                const r2 = 132 * cs;
                const rad = (deg * Math.PI) / 180;
                const cx = compassSize / 2;
                const cy = compassSize / 2;
                return (
                  <line
                    key={i}
                    x1={cx + r1 * Math.sin(rad)}
                    y1={cy - r1 * Math.cos(rad)}
                    x2={cx + r2 * Math.sin(rad)}
                    y2={cy - r2 * Math.cos(rad)}
                    stroke={isCardinal ? C.cyan : isMajor ? C.indigo : `${C.muted}44`}
                    strokeWidth={isCardinal ? 2.5 : isMajor ? 1.5 : 0.8}
                  />
                );
              })}

              {/* Cardinal labels */}
              {[
                { label: "N", deg: 0, color: C.cyan },
                { label: "E", deg: 90, color: C.text },
                { label: "S", deg: 180, color: C.text },
                { label: "W", deg: 270, color: C.text },
              ].map(({ label, deg, color }) => {
                const rad = (deg * Math.PI) / 180;
                const cx = compassSize / 2;
                const cy = compassSize / 2;
                const labelR = 105 * cs;
                return (
                  <text
                    key={label}
                    x={cx + labelR * Math.sin(rad)}
                    y={cy - labelR * Math.cos(rad)}
                    fill={color}
                    fontSize={label === "N" ? 18 : 14}
                    fontWeight={label === "N" ? 800 : 600}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontFamily="system-ui, sans-serif"
                  >
                    {label}
                  </text>
                );
              })}

              {/* Inner circle */}
              <circle cx={compassSize / 2} cy={compassSize / 2} r={80 * cs} fill="none" stroke={`${C.indigo}22`} strokeWidth={1} />
              <circle cx={compassSize / 2} cy={compassSize / 2} r={50 * cs} fill="none" stroke={`${C.indigo}15`} strokeWidth={0.5} />

              {/* Direction arrow */}
              <g transform={`rotate(${flingHeading}, ${compassSize / 2}, ${compassSize / 2})`}>
                <line
                  x1={compassSize / 2} y1={compassSize / 2} x2={compassSize / 2} y2={32 * cs}
                  stroke={C.cyan} strokeWidth={3} strokeLinecap="round"
                  style={{ animation: "compassArrowPulse 2s ease-in-out infinite" }}
                />
                <polygon
                  points={`${compassSize / 2},${22 * cs} ${compassSize / 2 - 7 * cs},${40 * cs} ${compassSize / 2 + 7 * cs},${40 * cs}`}
                  fill={C.cyan}
                  style={{ animation: "compassArrowPulse 2s ease-in-out infinite" }}
                />
                {/* Tail */}
                <line
                  x1={compassSize / 2} y1={compassSize / 2} x2={compassSize / 2} y2={180 * cs}
                  stroke={`${C.indigo}66`} strokeWidth={1.5} strokeLinecap="round"
                />
              </g>

              {/* Center dot */}
              <circle cx={compassSize / 2} cy={compassSize / 2} r={5} fill={C.indigo} />
              <circle cx={compassSize / 2} cy={compassSize / 2} r={8} fill="none" stroke={`${C.indigo}44`} strokeWidth={1} />
            </svg>

            {/* Heading readout */}
            <div style={{
              position: "absolute", bottom: 65 * cs, left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(13,13,20,0.9)",
              border: `1px solid ${C.indigo}33`,
              borderRadius: 12,
              padding: "6px 14px",
              display: "flex", alignItems: "baseline", gap: 6,
            }}>
              <span style={{
                color: C.cyan, fontSize: 20, fontWeight: 800,
                fontFamily: "monospace",
              }}>
                {flingHeading}{"\u00B0"}
              </span>
              <span style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>
                {bearingLabel(flingHeading)}
              </span>
            </div>
          </div>

          {hasDeviceOrientation && (
            <p style={{ color: C.muted, fontSize: 11, margin: 0, textAlign: "center" }}>
              Point your phone to aim / tap compass to override
            </p>
          )}

          {/* Distance slider */}
          <div style={{
            width: "100%", maxWidth: 340,
            background: "rgba(13,13,20,0.85)",
            border: `1px solid ${C.indigo}22`,
            borderRadius: 16, padding: "16px 20px",
            backdropFilter: "blur(20px)",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "baseline", marginBottom: 12,
            }}>
              <span style={{ color: C.muted, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Distance
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ color: C.text, fontSize: 18, fontWeight: 800 }}>
                  {DISTANCE_OPTIONS.find((o) => o.mi === flingDistance)?.label ?? `${flingDistance} mi`}
                </span>
                <span style={{ color: C.muted, fontSize: 11 }}>
                  ({DISTANCE_OPTIONS.find((o) => o.mi === flingDistance)?.km ?? ""})
                </span>
              </div>
            </div>

            {/* Slider track */}
            <div style={{
              display: "flex", gap: 4,
              alignItems: "center",
            }}>
              {DISTANCE_OPTIONS.map((opt, i) => {
                const active = opt.mi === flingDistance;
                const passed = opt.mi <= flingDistance;
                return (
                  <button
                    key={opt.mi}
                    onClick={() => setFlingDistance(opt.mi)}
                    style={{
                      flex: 1,
                      height: 8 + i * 2,
                      borderRadius: 4,
                      border: "none",
                      background: active
                        ? `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`
                        : passed
                          ? `${C.indigo}55`
                          : `${C.muted}22`,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      boxShadow: active ? `0 0 12px ${C.indigo}55` : "none",
                    }}
                  />
                );
              })}
            </div>

            {/* Distance labels */}
            <div style={{
              display: "flex", justifyContent: "space-between",
              marginTop: 6,
            }}>
              <span style={{ color: C.muted, fontSize: 9 }}>0.5 mi</span>
              <span style={{ color: C.muted, fontSize: 9 }}>100 mi</span>
            </div>
          </div>

          {/* LAUNCH button */}
          <button
            onClick={handleFling}
            disabled={userLat === null || userLng === null}
            onMouseEnter={() => isDesktop && setLaunchHovered(true)}
            onMouseLeave={() => isDesktop && setLaunchHovered(false)}
            style={{
              width: "100%", maxWidth: 340,
              padding: "18px 0", borderRadius: 50,
              border: "none",
              background: userLat !== null
                ? `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`
                : "rgba(255,255,255,0.06)",
              color: userLat !== null ? "#fff" : C.muted,
              fontSize: 18, fontWeight: 800,
              cursor: userLat !== null ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              boxShadow: userLat !== null
                ? launchHovered
                  ? `0 4px 50px ${C.indigo}88`
                  : `0 4px 40px ${C.indigo}55`
                : "none",
              transition: "all 0.2s",
              letterSpacing: "-0.01em",
              animation: userLat !== null ? "glowPulse 2s ease-in-out infinite" : "none",
              flexShrink: 0,
              transform: launchHovered && userLat !== null ? "scale(1.03)" : "scale(1)",
            }}
          >
            <RocketIcon size={20} color={userLat !== null ? "#fff" : C.muted} />
            LAUNCH
          </button>
        </div>
      )}

      {/* Message input (both modes) */}
      {locationMode === "drop" && (
        <>
          <div style={{ position: "relative", marginTop: 12 }}>
            <input
              value={message}
              onChange={(e) => { if (e.target.value.length <= 140) setMessage(e.target.value); }}
              onFocus={() => setMsgFocused(true)}
              onBlur={() => setMsgFocused(false)}
              placeholder="Add a message for the watcher..."
              style={{
                width: "100%", boxSizing: "border-box",
                background: C.glass,
                border: msgFocused ? "1px solid rgba(0,255,136,0.5)" : `1px solid ${C.glassBorder}`,
                borderRadius: 14,
                color: C.text, fontSize: 14,
                padding: "14px 50px 14px 16px",
                outline: "none",
                fontFamily: "system-ui, sans-serif",
                transition: "border-color 0.2s",
              }}
            />
            <span style={{
              position: "absolute", right: 14, top: "50%",
              transform: "translateY(-50%)",
              fontSize: 11, color: message.length >= 120 ? C.gold : C.muted,
            }}>
              {message.length}/140
            </span>
          </div>

          {/* Video upload */}
          <div style={{ marginTop: 12 }}>
            {!mediaUrl ? (
              <label style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 16px",
                borderRadius: 14,
                background: C.glass,
                border: `1px solid ${C.glassBorder}`,
                cursor: mediaUploading ? "not-allowed" : "pointer",
                opacity: mediaUploading ? 0.5 : 1,
              }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                <span style={{ color: C.muted, fontSize: 13 }}>
                  {mediaUploading ? "Uploading..." : "Attach a video"}
                </span>
                <input
                  type="file"
                  accept="video/mp4,video/mov,video/webm"
                  style={{ display: "none" }}
                  disabled={mediaUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !userId) return;
                    setMediaUploading(true);
                    const path = `${userId}/${Date.now()}.mp4`;
                    const { error } = await supabase.storage
                      .from("orb-media")
                      .upload(path, file, { upsert: true });
                    if (error) {
                      setMediaUploading(false);
                      return;
                    }
                    const { data: urlData } = supabase.storage
                      .from("orb-media")
                      .getPublicUrl(path);
                    setMediaUrl(urlData.publicUrl);
                    setMediaType("video");
                    setMediaUploading(false);
                  }}
                />
              </label>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 16px",
                borderRadius: 14,
                background: C.glass,
                border: `1px solid ${C.glassBorder}`,
              }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ color: "#22C55E", fontSize: 13, flex: 1 }}>Video attached</span>
                <button
                  onClick={() => { setMediaUrl(null); setMediaType(null); }}
                  style={{
                    background: "none", border: "none", color: C.muted,
                    cursor: "pointer", fontSize: 12, padding: 0,
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Coords display */}
          <div style={{
            marginTop: 10,
            padding: "10px 16px",
            borderRadius: 12,
            background: C.glass,
            border: `1px solid ${C.glassBorder}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ color: C.muted, fontSize: 12 }}>Coordinates</span>
            <span style={{
              color: lat !== null ? C.text : C.muted,
              fontSize: 12, fontFamily: "monospace", fontWeight: 600,
            }}>
              {lat !== null && lng !== null
                ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                : "Move the map..."}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Step 4 -- Review                                                   */
/* ================================================================== */

function Step4Review({
  orbType, currency, amountNum, amountUsd, rarity, rarityCol,
  claimFee, ownerEarns, platformEarns,
  lat, lng, message,
  submitting, submitError, onLaunch,
  nftImage, nftName, nftDescription, nftChain, nftRarity,
}: {
  orbType: OrbKind;
  currency: OrbCurrency;
  amountNum: number;
  amountUsd: number;
  rarity: OrbRarity;
  rarityCol: string;
  claimFee: number;
  ownerEarns: number;
  platformEarns: number;
  lat: number | null;
  lng: number | null;
  message: string;
  submitting: boolean;
  submitError: string;
  onLaunch: () => void;
  nftImage?: string | null;
  nftName?: string;
  nftDescription?: string;
  nftChain?: "ETH" | "SOL";
  nftRarity?: "Common" | "Rare" | "Legendary";
}) {
  const isNft = orbType === "NFT";
  return (
    <div style={{ paddingBottom: 180 }}>
      <h2 style={{
        color: C.text, fontSize: 26, fontWeight: 800,
        margin: "0 0 6px", letterSpacing: "-0.02em",
      }}>
        Review & Launch
      </h2>
      <p style={{ color: C.muted, fontSize: 14, margin: "0 0 24px" }}>
        Confirm everything before deploying your creature.
      </p>

      {/* Orb preview */}
      <div style={{
        display: "flex", justifyContent: "center",
        marginBottom: 28, position: "relative",
      }}>
        {isNft && nftImage ? (
          <img src={nftImage} alt="NFT preview" style={{ maxHeight: 200, borderRadius: 18, border: `1px solid ${C.glassBorder}`, objectFit: "cover" }} />
        ) : (
          <OrbVisual rarity={rarity} size={120} />
        )}
      </div>

      {/* Details card */}
      <div style={{
        background: C.glass,
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 18,
        padding: "20px 20px", marginBottom: 14,
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        <ReviewRow label="Type" value={`${orbType} Creature`} />
        {isNft ? (
          <>
            <ReviewRow label="Name" value={nftName || "--"} />
            {nftDescription && <ReviewRow label="Description" value={nftDescription} />}
            <ReviewRow label="Chain" value="Ethereum" />
            <ReviewRow label="Rarity" value={nftRarity || "Common"} valueStyle={{ color: rarityCol, fontWeight: 700 }} />
            <ReviewRow label="Claim Fee" value={claimFee === 0 ? "Free" : `$${claimFee}`} />
          </>
        ) : (
          <>
            <ReviewRow
              label="Amount"
              value={`${amountNum} ${currency}`}
              sub={`$${amountUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
            />
            <ReviewRow label="Rarity" value={rarity} valueStyle={{ color: rarityCol, fontWeight: 700 }} />
          </>
        )}
        <ReviewRow
          label="Location"
          value={lat !== null && lng !== null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "--"}
        />
        {!isNft && message && <ReviewRow label="Message" value={message} />}
      </div>

      {/* Fee breakdown */}
      <div style={{
        background: C.glass,
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 18,
        padding: "18px 20px", marginBottom: 14,
      }}>
        <p style={{
          color: C.muted, fontSize: 11, fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase",
          margin: "0 0 14px",
        }}>
          Fee Breakdown
        </p>
        <FeeRow label="To catcher (90%)" value={`$${ownerEarns.toFixed(2)}`} color={C.accent} />
        <FeeRow label="Platform (10%)" value={`$${platformEarns.toFixed(2)}`} color={C.muted} />
        <div style={{
          borderTop: `1px solid ${C.glassBorder}`,
          paddingTop: 10, marginTop: 6,
        }}>
          <FeeRow label="Total claim fee" value={`$${claimFee.toFixed(2)}`} color={C.text} bold />
        </div>
      </div>

      {/* Security note */}
      <div style={{
        background: `${C.primary}0c`,
        border: `1px solid ${C.primary}22`,
        borderRadius: 14,
        padding: "14px 16px", marginBottom: 24,
        display: "flex", gap: 10,
      }}>
        <ShieldIcon size={16} color={C.primary} />
        <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
          Your crypto stays in your wallet until caught. The creature uses a pre-signed transaction that only executes when a watcher claims it within range.
        </p>
      </div>

      {submitError && (
        <p style={{
          color: C.danger, fontSize: 14,
          textAlign: "center", marginBottom: 16,
        }}>
          {submitError}
        </p>
      )}

      {/* Launch button */}
      <button
        onClick={onLaunch}
        disabled={submitting}
        style={{
          width: "100%", padding: "20px 0",
          borderRadius: 50, border: "1px solid rgba(0,255,136,0.4)",
          background: submitting
            ? "rgba(255,255,255,0.06)"
            : `linear-gradient(135deg, ${C.primary}, #88FF00, #00FF88)`,
          color: submitting ? C.muted : "#fff",
          fontSize: 19, fontWeight: 800,
          cursor: submitting ? "wait" : "pointer",
          boxShadow: submitting ? "none" : `0 4px 40px ${C.primary}55`,
          transition: "all 0.2s",
          letterSpacing: "0.02em",
          textTransform: "uppercase" as const,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          animation: submitting ? "none" : "glowPulse 2.5s ease-in-out infinite",
          position: "relative" as const,
          overflow: "hidden" as const,
        }}
      >
        {!submitting && (
          <span style={{
            position: "absolute", top: 0, left: "-100%", width: "100%", height: "100%",
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
            animation: "launchShimmer 3s ease-in-out infinite",
          }} />
        )}
        <RocketIcon size={20} color={submitting ? C.muted : "#fff"} />
        {submitting ? "Launching..." : "Launch Creature"}
      </button>
    </div>
  );
}

/* ================================================================== */
/*  Launch Animation Screen                                            */
/* ================================================================== */

function LaunchAnimation({
  countdown,
  launched,
  rarity,
  amountNum,
  currency,
  orbType,
  nftName,
  onDone,
}: {
  countdown: number | null;
  launched: boolean;
  rarity: OrbRarity;
  amountNum: number;
  currency: OrbCurrency;
  orbType: string | null;
  nftName: string;
  onDone: () => void;
}) {
  const rarityCol = rarityColor(rarity);

  /* Confetti particles */
  const particles = useRef(
    Array.from({ length: 24 }, () => ({
      x: (Math.random() - 0.5) * 300,
      y: (Math.random() - 0.5) * 300 - 100,
      color: [C.accent, C.primary, C.gold, "#00FF88", "#88FF00"][Math.floor(Math.random() * 5)],
      delay: Math.random() * 0.3,
      size: 4 + Math.random() * 6,
    }))
  ).current;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
      overflow: "hidden", position: "relative",
    }}>
      {/* Star field background */}
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: 2, height: 2, borderRadius: "50%",
          background: "#fff",
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animation: `starTwinkle ${1.5 + Math.random() * 2}s ${Math.random() * 2}s infinite`,
          opacity: 0.15,
          pointerEvents: "none",
        }} />
      ))}

      {/* Countdown phase */}
      {countdown !== null && (
        <div
          key={countdown}
          style={{
            fontSize: 120, fontWeight: 900,
            color: C.primary,
            animation: "countdownPop 0.6s ease-out",
            textShadow: `0 0 60px ${C.primary}88`,
            letterSpacing: "-0.05em",
          }}
        >
          {countdown}
        </div>
      )}

      {/* Orb liftoff phase */}
      {countdown === null && !launched && (
        <div style={{
          animation: "orbLiftoff 1.2s ease-in forwards",
        }}>
          <OrbVisual rarity={rarity} size={140} />
        </div>
      )}

      {/* Success phase */}
      {launched && (
        <>
          {/* Confetti burst */}
          {particles.map((p, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: p.size, height: p.size,
                borderRadius: p.size > 7 ? 2 : "50%",
                background: p.color,
                top: "45%", left: "50%",
                ["--px" as any]: `${p.x}px`,
                ["--py" as any]: `${p.y}px`,
                animation: `particleFly 0.8s ${p.delay}s ease-out forwards`,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Success message */}
          <div style={{
            textAlign: "center",
            animation: "successSlideUp 0.6s 0.2s ease-out both",
          }}>
            {/* Success check orb */}
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.accent}33, ${C.primary}33)`,
              border: `2px solid ${C.accent}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: `0 0 40px ${C.accent}33`,
            }}>
              <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <p style={{
              color: C.text, fontSize: 28, fontWeight: 800,
              margin: "0 0 8px", letterSpacing: "-0.02em",
            }}>
              Creature Launched!
            </p>
            <p style={{
              color: C.muted, fontSize: 15, margin: "0 0 12px",
            }}>
              {orbType === "NFT" ? `${nftName || "NFT"} is now live on The Eye Map` : `${amountNum} ${currency} is now live on The Eye Map`}
            </p>
            <p style={{
              color: C.muted, fontSize: 13, margin: "0 0 40px",
              opacity: 0.7,
            }}>
              Watchers nearby can now discover your creature
            </p>

            <button
              onClick={onDone}
              style={{
                padding: "16px 48px", borderRadius: 50,
                background: `linear-gradient(135deg, ${C.primary}, #88FF00)`,
                border: "none", color: "#fff",
                fontSize: 16, fontWeight: 700,
                cursor: "pointer",
                boxShadow: `0 4px 32px ${C.primary}55`,
                letterSpacing: "-0.01em",
              }}
            >
              Back to Watch
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================== */
/*  OrbVisual                                                          */
/* ================================================================== */

function OrbVisual({ rarity, size }: { rarity: OrbRarity; size: number }) {
  const col = rarityColor(rarity);
  const gradients: Record<OrbRarity, string> = {
    Common: `radial-gradient(circle at 35% 35%, #ffffff, #8a8a99 60%, #4b5563)`,
    Rare: `radial-gradient(circle at 35% 35%, #88FF00, #00FF88 55%, #006633)`,
    Legendary: `radial-gradient(circle at 35% 35%, #fde68a, #88FF00 55%, #00FF88)`,
  };

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {/* Outer glow */}
      <div style={{
        position: "absolute",
        width: size * 1.6, height: size * 1.6,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${col}30 0%, transparent 70%)`,
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        animation: "orbPulse 2s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* Orb sphere */}
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: gradients[rarity],
        boxShadow: `0 0 ${size * 0.3}px ${col}88, inset 0 -${size * 0.1}px ${size * 0.2}px rgba(0,0,0,0.4)`,
        animation: "orbFloat 3s ease-in-out infinite",
        position: "relative", zIndex: 1,
      }} />

      {/* Rotating ring */}
      <div style={{
        position: "absolute",
        width: size * 1.25, height: size * 1.25,
        border: `1.5px solid ${col}44`,
        borderTop: `1.5px solid ${col}`,
        borderRadius: "50%",
        top: "50%", left: "50%",
        animation: "orbRingRotate 3s linear infinite",
        pointerEvents: "none",
        zIndex: 2,
      }} />

      {/* Second ring (slower, opposite) */}
      <div style={{
        position: "absolute",
        width: size * 1.4, height: size * 1.4,
        border: `1px solid ${col}22`,
        borderBottom: `1px solid ${col}66`,
        borderRadius: "50%",
        top: "50%", left: "50%",
        animation: "orbRingRotate 5s linear infinite reverse",
        pointerEvents: "none",
        zIndex: 2,
      }} />
    </div>
  );
}

/* ================================================================== */
/*  Small helpers                                                      */
/* ================================================================== */

function ReviewRow({
  label, value, sub, valueStyle,
}: {
  label: string;
  value: string;
  sub?: string;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      alignItems: "flex-start", gap: 12,
    }}>
      <span style={{ color: C.muted, fontSize: 14, flexShrink: 0 }}>{label}</span>
      <div style={{ textAlign: "right", maxWidth: "60%" }}>
        <span style={{
          color: C.text, fontSize: 14, fontWeight: 600,
          wordBreak: "break-word", ...valueStyle,
        }}>
          {value}
        </span>
        {sub && <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function FeeRow({
  label, value, color, bold,
}: {
  label: string;
  value: string;
  color: string;
  bold?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      marginBottom: 8,
    }}>
      <span style={{
        color: C.muted, fontSize: 13,
        fontWeight: bold ? 600 : 400,
      }}>
        {label}
      </span>
      <span style={{
        color, fontSize: 13,
        fontWeight: bold ? 700 : 600,
      }}>
        {value}
      </span>
    </div>
  );
}
