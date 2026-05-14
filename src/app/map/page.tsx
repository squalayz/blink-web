"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { Orb as ThemeOrb } from "@/lib/theme";
import { MapPin, Filter, Plus, X, ChevronUp, User, Crosshair, Camera } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import UserProfileCard from "@/components/UserProfileCard";

const HuntMap = dynamic(() => import("@/components/HuntMap"), { ssr: false });

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
  bg: "#0a0a0f",
  surface: "#0d0d14",
  card: "#1a1a24",
  primary: "#00FF88",
  accent: "#00FF88",
  gold: "#88FF00",
  text: "#FFFFFF",
  textMuted: "#8a8a99",
  border: "#1F2028",
};

const RARITY_COLORS: Record<string, string> = {
  common: "#C0C0C0",
  rare: "#88FF00",
  legendary: "#88FF00",
};

// BLINK: ETH-only — Solana/Bitcoin filter pills hidden. Underlying chain map kept for legacy DB rows.
const FILTER_OPTIONS = ["All", "ETH", "Tasks"];

const CHAIN_FILTER_MAP: Record<string, string> = {
  SOL: "solana",
  ETH: "ethereum",
  BTC: "bitcoin",
};

const CHAIN_PILL_COLORS: Record<string, string> = {
  SOL: "#00FF88",
  ETH: "#00FF88",
  BTC: "#88FF00",
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

const mapZoomBtn: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  background: "rgba(10,10,15,0.7)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(0,255,136,0.30)",
  color: "#00FF88",
  fontSize: 18,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "inherit",
};

// Dev-only mock spawns so the map visual design is easy to verify locally.
function mockSpawnsAround(pos: Position): Orb[] {
  const rarities: Orb["rarity"][] = ["legendary", "rare", "rare", "common"];
  const angles = [30, 110, 200, 320];
  return rarities.map((r, idx) => {
    const angle = (angles[idx] * Math.PI) / 180;
    const dx = Math.cos(angle) * 0.0018; // ~200m
    const dy = Math.sin(angle) * 0.0018;
    return {
      id: `mock-${idx}`,
      lat: pos.lat + dy,
      lng: pos.lng + dx,
      currency: "ETH",
      amount: 0.005,
      rarity: r,
      category: "creature",
      status: "pending",
      claim_fee_usd: 0.5,
      dropper_id: null,
      dropper_name: "BLINK",
      dropper_handle: "blink",
      dropper_pic: null,
      dropper_wallet: null,
      message: "A creature stirs in the dark.",
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };
  });
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
  const [cameraGranted, setCameraGranted] = useState(true); // assume granted until checked
  const [cameraToast, setCameraToast] = useState(false);
  const leafletMapRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

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
    // Clear any existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    const id = navigator.geolocation.watchPosition(
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
    watchIdRef.current = id;
  }, []);

  useEffect(() => {
    requestLocation();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [requestLocation]);

  /* ---- Camera permission check ---- */
  useEffect(() => {
    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((status) => {
        setCameraGranted(status.state === "granted");
        status.onchange = () => setCameraGranted(status.state === "granted");
      })
      .catch(() => {
        // permissions API not supported for camera, keep hidden
      });
  }, []);

  /* ---- Fetch orbs ---- */
  const fetchOrbs = useCallback(async () => {
    setOrbsLoading(true);
    setOrbsError(false);
    try {
      const { data, error } = await supabase
        .from("orbs")
        .select("*")
        .in("status", ["pending", "claimed"]);
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

  /* ---- Derived ---- */
  // Dev-only: inject 4 mock creatures around the user so the visual design is
  // easy to verify locally without spawning real orbs. Skipped in production.
  const orbsForRender: Orb[] =
    process.env.NODE_ENV !== "production" && position && orbs.length === 0
      ? mockSpawnsAround(position)
      : orbs;

  const filteredOrbs =
    activeFilter === "All"
      ? orbsForRender
      : activeFilter in CHAIN_FILTER_MAP
        ? orbsForRender.filter((o) => (o as any).chain === CHAIN_FILTER_MAP[activeFilter] || o.currency === activeFilter)
        : orbsForRender.filter((o) => o.category?.toLowerCase() === activeFilter.toLowerCase());

  const orbsWithDistance = filteredOrbs.map((o) => ({
    ...o,
    distance: position ? haversine(position.lat, position.lng, o.lat, o.lng) : Infinity,
  }));

  const sortedOrbs = [...orbsWithDistance].sort((a, b) => a.distance - b.distance);

  const nearbyCount = orbsWithDistance.filter((o) => o.distance < 5000).length;

  /* ---- Claim flow ---- */
  const [crackError, setCrackError] = useState<string | null>(null);
  const [crackExplorerUrl, setCrackExplorerUrl] = useState<string | null>(null);

  const handleClaim = async (orb: Orb) => {
    if (!user || !position) return;
    setClaimingId(orb.id);
    setCrackError(null);
    setCrackExplorerUrl(null);
    try {
      // Try the edge function crack flow first (presigned tx)
      // Get session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const { data: profile } = await supabase.from("profiles").select("eth_address, sol_address, btc_address, wallet_address").eq("user_id", user.id).single();
      const orbCurrency = (orb.currency || 'SOL').toUpperCase();
      let hunterWallet: string | null = null;
      if (orbCurrency === 'SOL') hunterWallet = profile?.sol_address ?? null;
      else if (orbCurrency === 'ETH') hunterWallet = profile?.eth_address ?? null;
      else if (orbCurrency === 'BTC') hunterWallet = profile?.btc_address ?? null;
      if (!hunterWallet) {
        setCrackError(`You need a ${orbCurrency} wallet to catch this creature. Check your wallet settings.`);
        setClaimingId(null);
        return;
      }

      const res = await fetch("/api/orbs/crack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          orb_id: orb.id,
          hunter_wallet: hunterWallet,
          lat: position.lat,
          lng: position.lng,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setCrackError(result.error ?? "Catch failed. Please try again.");
        setClaimingId(null);
        return;
      }
      if (result.explorerUrl) setCrackExplorerUrl(result.explorerUrl);

      setClaimSuccess(true);
      setConfirmOrb(null);
      setSelectedOrb(null);
      setTimeout(() => { setClaimSuccess(false); setCrackExplorerUrl(null); }, 4000);
      await fetchOrbs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Catch failed. Please try again.";
      setCrackError(msg);
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

  /* ---- Helpers ---- */
  const handleCameraRequest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setCameraGranted(true);
    } catch {
      setCameraToast(true);
      setTimeout(() => setCameraToast(false), 3000);
    }
  };

  /* ---- Guards ---- */
  if (authLoading) return null;
  if (!user) return null;

  /* ---- Location banner logic ---- */
  const showLocationBanner = !position;
  const isDenied = geoError === "denied";

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
            BLINK
          </span>
        </Link>

        <span style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: 500 }}>
          Nearby: {nearbyCount} creature{nearbyCount !== 1 ? "s" : ""}
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
        style={{ flex: 1, position: "relative", overflow: "hidden" }}
      >
        <HuntMap
          orbs={filteredOrbs.map((o) => ({
            ...o,
            latitude: o.lat,
            longitude: o.lng,
          })) as unknown as ThemeOrb[]}
          userPosition={position}
          onSelectOrb={(orb: ThemeOrb) => {
            const local = filteredOrbs.find((o) => o.id === orb.id);
            if (local) setSelectedOrb(local);
          }}
          mapRef={leafletMapRef}
        />

        {/* ---- Location banner ---- */}
        {showLocationBanner && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 50,
              background: "rgba(13,13,20,0.95)",
              border: `1px solid ${isDenied ? "rgba(239,68,68,0.3)" : "rgba(0,255,136,0.3)"}`,
              borderRadius: 50,
              padding: "8px 16px",
              display: "flex",
              gap: 8,
              alignItems: "center",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            <MapPin size={14} color={isDenied ? "#ef4444" : "#00FF88"} />
            <span style={{ color: isDenied ? "#fca5a5" : "#8888aa", fontSize: 13 }}>
              {isDenied
                ? (() => {
                    const ua = navigator.userAgent;
                    if (/iPhone|iPad/.test(ua)) return "Tap the AA icon → Website Settings → Location";
                    if (/Android/.test(ua)) return "Tap the lock icon → Permissions → Location";
                    return "Tap the lock icon in your address bar → Allow Location";
                  })()
                : "Enable location to find nearby BLINKS"}
            </span>
            {!isDenied && (
              <button
                onClick={requestLocation}
                style={{
                  color: "#00FF88",
                  fontWeight: 700,
                  fontSize: 13,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Enable
              </button>
            )}
          </div>
        )}

        {/* ---- Recenter button ---- */}
        <button
          onClick={() => {
            if (leafletMapRef.current && position) {
              leafletMapRef.current.flyTo({ center: [position.lng, position.lat], zoom: 16, duration: 800 });
            } else {
              requestLocation();
            }
          }}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "rgba(10,10,15,0.7)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: `1px solid ${position ? "rgba(0,255,136,0.45)" : "rgba(255,255,255,0.10)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 15,
            boxShadow: position ? "0 0 14px rgba(0,255,136,0.25)" : "none",
          }}
          aria-label="Recenter on me"
        >
          <Crosshair size={18} color={position ? "#00FF88" : COLORS.textMuted} />
        </button>
        <div
          style={{
            position: "absolute",
            top: 64,
            right: 16,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            zIndex: 15,
          }}
        >
          <button
            onClick={() => leafletMapRef.current?.zoomIn?.()}
            aria-label="Zoom in"
            style={mapZoomBtn}
          >
            +
          </button>
          <button
            onClick={() => leafletMapRef.current?.zoomOut?.()}
            aria-label="Zoom out"
            style={mapZoomBtn}
          >
            −
          </button>
        </div>

        {/* ---- Camera permission button ---- */}
        {!cameraGranted && (
          <button
            onClick={handleCameraRequest}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(13,13,20,0.9)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 15,
            }}
          >
            <Camera size={20} color={COLORS.textMuted} />
          </button>
        )}
      </div>

      {/* ========== CAMERA TOAST ========== */}
      <AnimatePresence>
        {cameraToast && (
          <motion.div
            key="camera-toast"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            style={{
              position: "absolute",
              bottom: 200,
              left: "50%",
              transform: "translateX(-50%)",
              background: COLORS.card,
              color: "#8888aa",
              padding: "10px 20px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 500,
              zIndex: 70,
              whiteSpace: "nowrap",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            Allow camera in browser settings to spawn creatures
          </motion.div>
        )}
      </AnimatePresence>

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
                Nearby Creatures
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
              Loading creatures...
            </div>
          )}

          {orbsError && (
            <div style={{ textAlign: "center", padding: 20 }}>
              <p style={{ color: COLORS.textMuted, fontSize: 13, margin: "0 0 12px" }}>
                Failed to load creatures.
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
                No creatures nearby. Be the first to spawn one!
              </p>
              <Link
                href="/spawn"
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
                Spawn a Creature
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
                  Catch It
                </button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ========== FAB ========== */}
      <Link href="/spawn" style={{ textDecoration: "none" }}>
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
                      {claimable ? "Catch It" : "Get closer to catch"}
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
              <h3 style={{ color: COLORS.text, fontSize: 18, fontWeight: 700, margin: "0 0 16px" }}>
                Catch this creature?
              </h3>
              {/* Reward */}
              <div style={{ background: COLORS.bg, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 13 }}>Reward inside</span>
                  <span style={{ color: COLORS.accent, fontSize: 14, fontWeight: 700 }}>{confirmOrb.amount} {confirmOrb.currency}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 13 }}>Claim fee</span>
                  <span style={{ color: COLORS.text, fontSize: 13 }}>${confirmOrb.claim_fee_usd?.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 13 }}>Platform fee (10%)</span>
                  <span style={{ color: COLORS.textMuted, fontSize: 13 }}>${(confirmOrb.claim_fee_usd * 0.1).toFixed(3)}</span>
                </div>
                <div style={{ height: 1, background: COLORS.border, margin: "8px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: 600 }}>You pay total</span>
                  <span style={{ color: COLORS.gold, fontSize: 13, fontWeight: 700 }}>${(confirmOrb.claim_fee_usd * 1.1).toFixed(2)}</span>
                </div>
              </div>
              {crackError && (
                <p style={{ color: "#F87171", fontSize: 13, margin: "0 0 10px", textAlign: "left" }}>{crackError}</p>
              )}
              {crackExplorerUrl && (
                <a href={crackExplorerUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: "block", color: COLORS.accent, fontSize: 13, marginBottom: 10, wordBreak: "break-all" }}>
                  View transaction
                </a>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => { setConfirmOrb(null); setCrackError(null); }}
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
                  {claimingId === confirmOrb.id ? "Catching..." : "Catch It"}
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
            Creature caught successfully!
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
