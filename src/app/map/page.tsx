"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { MapPin, Filter, Plus, X, ChevronUp, User, Crosshair } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import UserProfileCard from "@/components/UserProfileCard";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Orb {
  id: string;
  lat: number;
  lng: number;
  currency: string;
  amount: number;
  rarity: "common" | "rare" | "legendary";
  category: string;
  status: string;
  claim_fee_usd: number;
  dropper_id: string | null;
  dropper_name: string;
  dropper_handle?: string | null;
  dropper_pic?: string | null;
  dropper_wallet?: string | null;
  message: string | null;
  expires_at: string;
  created_at: string;
}

interface Position {
  lat: number;
  lng: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const COLORS = {
  bg: "#0A0A0F",
  surface: "#111118",
  card: "#1C1C28",
  primary: "#9945FF",
  accent: "#14F195",
  gold: "#F59E0B",
  text: "#F9FAFB",
  textMuted: "#9CA3AF",
  border: "#1F2028",
};

const RARITY_COLORS: Record<string, string> = {
  common: "#C0C0C0",
  rare: "#3B82F6",
  legendary: "#F59E0B",
};

const FILTER_OPTIONS = ["All", "SOL", "ETH", "BTC", "Tasks"];

const CHAIN_FILTER_MAP: Record<string, string> = {
  SOL: "solana",
  ETH: "ethereum",
  BTC: "bitcoin",
};

const CHAIN_PILL_COLORS: Record<string, string> = {
  SOL: "#9945FF",
  ETH: "#627EEA",
  BTC: "#F7931A",
};

const CLAIM_RADIUS_M = 100;

/* ------------------------------------------------------------------ */
/*  Haversine                                                          */
/* ------------------------------------------------------------------ */

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const p = Math.PI / 180;
  const a =
    0.5 -
    Math.cos((lat2 - lat1) * p) / 2 +
    Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lon2 - lon1) * p)) / 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function orbScreenOffset(
  userPos: Position,
  orbLat: number,
  orbLng: number,
  containerW: number,
  containerH: number
): { x: number; y: number } {
  const scale = 800000; // ~1 degree ≈ 800k px — tweak for visual density
  const dx = (orbLng - userPos.lng) * scale * Math.cos((userPos.lat * Math.PI) / 180);
  const dy = -(orbLat - userPos.lat) * scale;
  const cx = containerW / 2;
  const cy = containerH / 2;
  // clamp so dots stay in view
  const clampedX = Math.max(24, Math.min(containerW - 24, cx + dx));
  const clampedY = Math.max(24, Math.min(containerH - 24, cy + dy));
  return { x: clampedX, y: clampedY };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MapPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  /* ---- State ---- */
  const [position, setPosition] = useState<Position | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [orbsLoading, setOrbsLoading] = useState(true);
  const [orbsError, setOrbsError] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [selectedOrb, setSelectedOrb] = useState<Orb | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [confirmOrb, setConfirmOrb] = useState<Orb | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [profileCardUserId, setProfileCardUserId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapSize, setMapSize] = useState({ w: 0, h: 0 });

  /* ---- Auth redirect ---- */
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/signin");
    }
  }, [authLoading, user, router]);

  /* ---- Geolocation ---- */
  const requestLocation = useCallback(() => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("denied");
        } else {
          setGeoError("Unable to determine your location. Please try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  /* ---- Fetch orbs ---- */
  const fetchOrbs = useCallback(async () => {
    setOrbsLoading(true);
    setOrbsError(false);
    try {
      const { data, error } = await supabase
        .from("orbs")
        .select("*")
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString());
      if (error) throw error;
      setOrbs((data as Orb[]) ?? []);
    } catch {
      setOrbsError(true);
    } finally {
      setOrbsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchOrbs();
  }, [user, fetchOrbs]);

  /* ---- Map sizing ---- */
  useEffect(() => {
    function measure() {
      if (mapRef.current) {
        setMapSize({
          w: mapRef.current.clientWidth,
          h: mapRef.current.clientHeight,
        });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [position]);

  /* ---- Derived ---- */
  const filteredOrbs =
    activeFilter === "All"
      ? orbs
      : activeFilter in CHAIN_FILTER_MAP
        ? orbs.filter((o) => (o as any).chain === CHAIN_FILTER_MAP[activeFilter] || o.currency === activeFilter)
        : orbs.filter((o) => o.category?.toLowerCase() === activeFilter.toLowerCase());

  const orbsWithDistance = filteredOrbs.map((o) => ({
    ...o,
    distance: position ? haversine(position.lat, position.lng, o.lat, o.lng) : Infinity,
  }));

  const sortedOrbs = [...orbsWithDistance].sort((a, b) => a.distance - b.distance);

  const nearbyCount = orbsWithDistance.filter((o) => o.distance < 5000).length;

  /* ---- Claim flow ---- */
  const handleClaim = async (orb: Orb) => {
    if (!user) return;
    setClaimingId(orb.id);
    try {
      const { error: claimErr } = await supabase.from("orb_claims").insert({
        orb_id: orb.id,
        user_id: user.id,
        fee_paid_usd: orb.claim_fee_usd,
      });
      if (claimErr) throw claimErr;

      const { error: updateErr } = await supabase
        .from("orbs")
        .update({
          status: "claimed",
          claimed_by: user.id,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", orb.id);
      if (updateErr) throw updateErr;

      setClaimSuccess(true);
      setConfirmOrb(null);
      setSelectedOrb(null);
      setTimeout(() => setClaimSuccess(false), 2500);
      await fetchOrbs();
    } catch {
      alert("Claim failed. Please try again.");
    } finally {
      setClaimingId(null);
    }
  };

  /* ---- CSS keyframes (injected once) ---- */
  useEffect(() => {
    const id = "mishmesh-map-keyframes";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes mmPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.6); opacity: 0.5; }
      }
      @keyframes mmRing {
        0% { transform: scale(1); opacity: 0.6; }
        100% { transform: scale(3); opacity: 0; }
      }
      @keyframes mmGlow {
        0%, 100% { box-shadow: 0 0 8px 2px var(--glow-color); }
        50% { box-shadow: 0 0 20px 6px var(--glow-color); }
      }
      @keyframes mmFloat {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-4px); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  /* ---- Guards ---- */
  if (authLoading) return null;
  if (!user) return null;

  /* ================================================================ */
  /*  LOADING STATE                                                    */
  /* ================================================================ */
  if (!position && !geoError) {
    return (
      <div
        style={{
          background: COLORS.bg,
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: COLORS.primary,
          }}
        />
        <span style={{ color: COLORS.textMuted, fontSize: 15, fontWeight: 500 }}>
          Locating you...
        </span>
      </div>
    );
  }

  /* ================================================================ */
  /*  GEO DENIED / ERROR                                               */
  /* ================================================================ */
  if (geoError) {
    const isDenied = geoError === "denied";
    return (
      <div
        style={{
          background: COLORS.bg,
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
        }}
      >
        <MapPin size={48} color={COLORS.primary} />
        <h2 style={{ color: COLORS.text, fontSize: 20, fontWeight: 700, margin: 0 }}>
          {isDenied ? "Enable location to hunt orbs" : "Location Error"}
        </h2>
        <p style={{ color: COLORS.textMuted, fontSize: 14, margin: 0, maxWidth: 320 }}>
          {isDenied
            ? "MishMesh needs your location to show nearby orbs. Please allow location access in your browser settings and try again."
            : geoError}
        </p>
        <button
          onClick={requestLocation}
          style={{
            marginTop: 8,
            padding: "12px 32px",
            borderRadius: 12,
            border: "none",
            background: COLORS.primary,
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  /* ================================================================ */
  /*  MAIN RENDER                                                      */
  /* ================================================================ */
  return (
    <div
      style={{
        background: COLORS.bg,
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* ========== TOP BAR ========== */}
      <div
        style={{
          height: 60,
          minHeight: 60,
          background: COLORS.surface,
          borderBottom: `1px solid ${COLORS.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          zIndex: 20,
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            MishMesh
          </span>
        </Link>

        <span style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: 500 }}>
          Nearby: {nearbyCount} orb{nearbyCount !== 1 ? "s" : ""}
        </span>

        <Link href="/profile" style={{ textDecoration: "none" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: COLORS.card,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <User size={18} color={COLORS.textMuted} />
          </div>
        </Link>
      </div>

      {/* ========== FILTER PILLS ========== */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "10px 16px",
          background: COLORS.bg,
          zIndex: 19,
          overflowX: "auto",
        }}
      >
        {FILTER_OPTIONS.map((f) => {
          const active = activeFilter === f;
          const chainColor = CHAIN_PILL_COLORS[f];
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: "6px 16px",
                borderRadius: 20,
                border: active
                  ? chainColor ? `1px solid ${chainColor}` : "none"
                  : `1px solid ${COLORS.border}`,
                background: active
                  ? chainColor ? `${chainColor}22` : COLORS.primary
                  : "transparent",
                color: active
                  ? chainColor ? chainColor : "#fff"
                  : COLORS.textMuted,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* ========== MAP AREA ========== */}
      <div
        ref={mapRef}
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          background: `
            repeating-linear-gradient(0deg, transparent, transparent 39px, #1F202810 39px, #1F202810 40px),
            repeating-linear-gradient(90deg, transparent, transparent 39px, #1F202810 39px, #1F202810 40px),
            #0d0d14
          `,
        }}
      >
        {/* Subtle radial vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at center, transparent 30%, #0A0A0F 100%)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* ---- User dot (center) ---- */}
        {position && mapSize.w > 0 && (
          <div
            style={{
              position: "absolute",
              left: mapSize.w / 2,
              top: mapSize.h / 2,
              transform: "translate(-50%, -50%)",
              zIndex: 10,
            }}
          >
            {/* ring */}
            <div
              style={{
                position: "absolute",
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: `2px solid ${COLORS.primary}`,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                animation: "mmRing 2s ease-out infinite",
              }}
            />
            {/* dot */}
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: COLORS.primary,
                boxShadow: `0 0 16px 4px ${COLORS.primary}80`,
                animation: "mmPulse 2s ease-in-out infinite",
              }}
            />
          </div>
        )}

        {/* ---- Orb dots ---- */}
        {position &&
          mapSize.w > 0 &&
          sortedOrbs.map((orb) => {
            const { x, y } = orbScreenOffset(
              position,
              orb.lat,
              orb.lng,
              mapSize.w,
              mapSize.h
            );
            const color = RARITY_COLORS[orb.rarity] || RARITY_COLORS.common;
            return (
              <motion.div
                key={orb.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, type: "spring" }}
                onClick={() => setSelectedOrb(orb)}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  transform: "translate(-50%, -50%)",
                  zIndex: 5,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* glow ring */}
                <div
                  style={{
                    position: "absolute",
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: `${color}18`,
                    animation: "mmPulse 3s ease-in-out infinite",
                  }}
                />
                {/* outer ring */}
                <div
                  style={{
                    position: "absolute",
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: `1.5px solid ${color}60`,
                    animation: "mmRing 3s ease-out infinite",
                  }}
                />
                {/* core dot */}
                <div
                  style={
                    {
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: color,
                      "--glow-color": `${color}90`,
                      animation: "mmGlow 2s ease-in-out infinite, mmFloat 3s ease-in-out infinite",
                    } as React.CSSProperties
                  }
                />
              </motion.div>
            );
          })}

        {/* ---- Recenter button ---- */}
        <button
          onClick={requestLocation}
          style={{
            position: "absolute",
            bottom: 180,
            left: 16,
            width: 44,
            height: 44,
            borderRadius: 12,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 15,
          }}
        >
          <Crosshair size={20} color={COLORS.textMuted} />
        </button>
      </div>

      {/* ========== BOTTOM SHEET ========== */}
      <motion.div
        animate={{ height: sheetExpanded ? "60dvh" : 160 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: COLORS.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTop: `1px solid ${COLORS.border}`,
          zIndex: 30,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Sheet handle */}
        <div
          onClick={() => setSheetExpanded(!sheetExpanded)}
          style={{
            padding: "12px 16px 8px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: COLORS.border,
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{ color: COLORS.text, fontSize: 16, fontWeight: 700 }}
              >
                Nearby Orbs
              </span>
              <span
                style={{
                  background: COLORS.card,
                  color: COLORS.textMuted,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 10,
                }}
              >
                {sortedOrbs.length}
              </span>
            </div>
            <motion.div
              animate={{ rotate: sheetExpanded ? 180 : 0 }}
              transition={{ duration: 0.25 }}
            >
              <ChevronUp size={20} color={COLORS.textMuted} />
            </motion.div>
          </div>
        </div>

        {/* Orb list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 12px 16px",
          }}
        >
          {orbsLoading && (
            <div style={{ textAlign: "center", padding: 20, color: COLORS.textMuted, fontSize: 13 }}>
              Loading orbs...
            </div>
          )}

          {orbsError && (
            <div style={{ textAlign: "center", padding: 20 }}>
              <p style={{ color: COLORS.textMuted, fontSize: 13, margin: "0 0 12px" }}>
                Failed to load orbs.
              </p>
              <button
                onClick={fetchOrbs}
                style={{
                  padding: "8px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: COLORS.primary,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {!orbsLoading && !orbsError && sortedOrbs.length === 0 && (
            <div style={{ textAlign: "center", padding: 24 }}>
              <p style={{ color: COLORS.textMuted, fontSize: 14, margin: "0 0 12px" }}>
                No orbs nearby. Be the first to drop one!
              </p>
              <Link
                href="/drop"
                style={{
                  display: "inline-block",
                  padding: "10px 24px",
                  borderRadius: 10,
                  background: COLORS.accent,
                  color: COLORS.bg,
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Drop an Orb
              </Link>
            </div>
          )}

          {sortedOrbs.map((orb) => {
            const dist = orb.distance;
            const claimable = dist <= CLAIM_RADIUS_M;
            const color = RARITY_COLORS[orb.rarity] || RARITY_COLORS.common;
            return (
              <motion.div
                key={orb.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedOrb(orb)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  marginBottom: 6,
                  background: COLORS.card,
                  cursor: "pointer",
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                {/* rarity dot */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: color,
                    boxShadow: `0 0 6px ${color}80`,
                    flexShrink: 0,
                  }}
                />
                {/* currency badge */}
                <span
                  style={{
                    background: COLORS.surface,
                    color: COLORS.text,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                >
                  {orb.currency}
                </span>
                {/* distance */}
                <span
                  style={{
                    color: claimable ? COLORS.accent : COLORS.textMuted,
                    fontSize: 12,
                    fontWeight: 600,
                    flexShrink: 0,
                    minWidth: 42,
                  }}
                >
                  {formatDistance(dist)}
                </span>
                {/* dropper */}
                <span
                  style={{
                    color: COLORS.textMuted,
                    fontSize: 12,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {orb.dropper_name}
                </span>
                {/* fee */}
                <span
                  style={{
                    color: COLORS.textMuted,
                    fontSize: 11,
                    flexShrink: 0,
                  }}
                >
                  ${orb.claim_fee_usd?.toFixed(2)}
                </span>
                {/* CTA */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (claimable) setConfirmOrb(orb);
                  }}
                  disabled={!claimable}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: COLORS.accent,
                    color: COLORS.bg,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: claimable ? "pointer" : "default",
                    opacity: claimable ? 1 : 0.3,
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  Crack It
                </button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ========== FAB ========== */}
      <Link href="/drop" style={{ textDecoration: "none" }}>
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          style={{
            position: "absolute",
            bottom: 176,
            right: 16,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: COLORS.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 35,
            boxShadow: `0 0 24px 6px ${COLORS.primary}50`,
          }}
        >
          <Plus size={24} color="#fff" />
        </motion.div>
      </Link>

      {/* ========== ORB DETAIL MODAL ========== */}
      <AnimatePresence>
        {selectedOrb && (
          <motion.div
            key="orb-detail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedOrb(null)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 50,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            <motion.div
              key="orb-detail-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 480,
                background: COLORS.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: "20px 20px 32px",
                position: "relative",
              }}
            >
              {/* close */}
              <button
                onClick={() => setSelectedOrb(null)}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "none",
                  background: COLORS.card,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={16} color={COLORS.textMuted} />
              </button>

              {/* rarity + currency */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span
                  style={{
                    background: `${RARITY_COLORS[selectedOrb.rarity]}20`,
                    color: RARITY_COLORS[selectedOrb.rarity],
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: 8,
                    textTransform: "capitalize",
                  }}
                >
                  {selectedOrb.rarity}
                </span>
                <span
                  style={{
                    background: COLORS.card,
                    color: COLORS.text,
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 8,
                  }}
                >
                  {selectedOrb.currency}
                </span>
              </div>

              {/* amount */}
              <h3
                style={{
                  color: COLORS.text,
                  fontSize: 28,
                  fontWeight: 800,
                  margin: "0 0 4px",
                }}
              >
                {selectedOrb.amount} {selectedOrb.currency}
              </h3>

              {/* dropper */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  margin: "0 0 12px",
                  cursor: selectedOrb.dropper_id ? "pointer" : "default",
                }}
                onClick={() => {
                  if (selectedOrb.dropper_id) {
                    setProfileCardUserId(selectedOrb.dropper_id);
                  }
                }}
              >
                <UserAvatar
                  profilePicUrl={selectedOrb.dropper_pic || null}
                  handle={selectedOrb.dropper_handle || selectedOrb.dropper_name || "anon"}
                  size={40}
                />
                <div>
                  <div style={{ color: COLORS.text, fontSize: 14, fontWeight: 600 }}>
                    @{selectedOrb.dropper_handle || selectedOrb.dropper_name || "anon"}
                  </div>
                  {selectedOrb.dropper_wallet && (
                    <div style={{ color: COLORS.textMuted, fontSize: 12, fontFamily: "monospace" }}>
                      {selectedOrb.dropper_wallet.slice(0, 6)}...{selectedOrb.dropper_wallet.slice(-4)}
                    </div>
                  )}
                </div>
              </div>

              {/* message */}
              {selectedOrb.message && (
                <div
                  style={{
                    background: COLORS.card,
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 16,
                  }}
                >
                  <p
                    style={{
                      color: COLORS.text,
                      fontSize: 14,
                      margin: 0,
                      lineHeight: 1.5,
                      fontStyle: "italic",
                    }}
                  >
                    &ldquo;{selectedOrb.message}&rdquo;
                  </p>
                </div>
              )}

              {/* fee breakdown */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  background: COLORS.card,
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 12,
                }}
              >
                <span style={{ color: COLORS.textMuted, fontSize: 13 }}>Fee</span>
                <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 600 }}>
                  ${selectedOrb.claim_fee_usd?.toFixed(2)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  background: COLORS.card,
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 12,
                }}
              >
                <span style={{ color: COLORS.textMuted, fontSize: 13 }}>You receive</span>
                <span style={{ color: COLORS.accent, fontSize: 13, fontWeight: 700 }}>
                  {selectedOrb.amount} {selectedOrb.currency}
                </span>
              </div>

              {/* distance */}
              {(() => {
                const dist = position
                  ? haversine(position.lat, position.lng, selectedOrb.lat, selectedOrb.lng)
                  : Infinity;
                const claimable = dist <= CLAIM_RADIUS_M;
                return (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        background: COLORS.card,
                        borderRadius: 12,
                        padding: "12px 14px",
                        marginBottom: 20,
                      }}
                    >
                      <span style={{ color: COLORS.textMuted, fontSize: 13 }}>
                        Distance
                      </span>
                      <span
                        style={{
                          color: claimable ? COLORS.accent : COLORS.textMuted,
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {formatDistance(dist)}
                        {!claimable && " (too far)"}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (claimable) {
                          setConfirmOrb(selectedOrb);
                        }
                      }}
                      disabled={!claimable}
                      style={{
                        width: "100%",
                        padding: "14px 0",
                        borderRadius: 14,
                        border: "none",
                        background: COLORS.accent,
                        color: COLORS.bg,
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: claimable ? "pointer" : "default",
                        opacity: claimable ? 1 : 0.3,
                      }}
                    >
                      {claimable ? "Crack It" : "Get closer to crack"}
                    </button>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== CONFIRM MODAL ========== */}
      <AnimatePresence>
        {confirmOrb && (
          <motion.div
            key="confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmOrb(null)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              zIndex: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <motion.div
              key="confirm-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 360,
                background: COLORS.surface,
                borderRadius: 20,
                padding: 24,
                textAlign: "center",
              }}
            >
              <h3 style={{ color: COLORS.text, fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>
                Crack this orb?
              </h3>
              <p style={{ color: COLORS.textMuted, fontSize: 14, margin: "0 0 6px" }}>
                {confirmOrb.amount} {confirmOrb.currency} from {confirmOrb.dropper_name}
              </p>
              <p style={{ color: COLORS.gold, fontSize: 15, fontWeight: 700, margin: "0 0 20px" }}>
                Fee: ${confirmOrb.claim_fee_usd?.toFixed(2)}
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setConfirmOrb(null)}
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    borderRadius: 12,
                    border: `1px solid ${COLORS.border}`,
                    background: "transparent",
                    color: COLORS.textMuted,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleClaim(confirmOrb)}
                  disabled={claimingId === confirmOrb.id}
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    borderRadius: 12,
                    border: "none",
                    background: COLORS.accent,
                    color: COLORS.bg,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: claimingId === confirmOrb.id ? "default" : "pointer",
                    opacity: claimingId === confirmOrb.id ? 0.6 : 1,
                  }}
                >
                  {claimingId === confirmOrb.id ? "Cracking..." : "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== SUCCESS TOAST ========== */}
      <AnimatePresence>
        {claimSuccess && (
          <motion.div
            key="success-toast"
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            style={{
              position: "absolute",
              top: 80,
              left: "50%",
              transform: "translateX(-50%)",
              background: COLORS.accent,
              color: COLORS.bg,
              padding: "12px 24px",
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
              zIndex: 70,
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: `0 8px 32px ${COLORS.accent}40`,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="9" fill={COLORS.bg} fillOpacity={0.2} />
              <path
                d="M5 9.5L7.5 12L13 6.5"
                stroke={COLORS.bg}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Orb cracked successfully!
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== PROFILE CARD ========== */}
      {profileCardUserId && (
        <UserProfileCard
          userId={profileCardUserId}
          onClose={() => setProfileCardUserId(null)}
        />
      )}
    </div>
  );
}
