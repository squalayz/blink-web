"use client";

import { Suspense, useEffect, useState, useCallback, useRef, useMemo, useDeferredValue } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { Orb as ThemeOrb } from "@/lib/theme";
import { MapPin, Plus, X, User, Crosshair, Camera } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import UserProfileCard from "@/components/UserProfileCard";
import { useIsDesktop } from "@/hooks/useIsDesktop";

import { BlinkCompass, type CompassReading, type CompassTier } from "@/components/BlinkCompass";
import { CreatureRadar, type RadarCreature } from "@/components/CreatureRadar";
import { SpawnNotifier, useNotificationPermission } from "@/components/SpawnNotifier";
import { BESTIARY } from "@/lib/bestiary";
import { usePresence } from "@/lib/use-presence";
import type {
  NearbyPlayer,
  WildSpawn,
  CatchableSpawn,
  NearbyWatcher,
  NearbyRecentCatch,
} from "@/components/HuntMap";
import PrivacyIntroModal from "@/components/PrivacyIntroModal";
import PresenceLegend from "@/components/PresenceLegend";
import PlayerSheet from "@/components/PlayerSheet";
import { ErrorBoundary } from "@/components/error-boundary";
import MapDownState from "@/components/MapDownState";
import ARCameraOverlay from "@/components/ARCameraOverlay";
import { CinematicCatch, DailyLimitError } from "@/components/CinematicCatch";
import { MapApproachVignette } from "@/components/MapApproachVignette";
import { sounds, type ApproachRarity } from "@/lib/sounds";
import { pulseSoft, pulseSharp } from "@/lib/haptics";

const CATCH_PROXIMITY_M = 50;
const AMBIENT_POLL_MS = 15_000;

const TIER_LABELS: Record<string, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  legendary: "Legendary",
  mythic: "Mythic",
};

interface CatchResult {
  spawnId: string;
  tier: string;
  tierLabel: string;
  name: string;
  image_url: string;
  tokenId: string | null;
  mintTxHash: string;
  feeToDeployerTxHash: string | null;
  feeToTreasuryTxHash: string | null;
  blinkRewardTxHash: string | null;
  blinkRewarded: number;
  wasFreeCatch: boolean;
  freeCatchesRemaining: number;
  openseaUrl: string | null;
}

const HuntMap = dynamic(() => import("@/components/HuntMap"), { ssr: false });

type Tier = "far" | "medium" | "close" | "catchable";

function tierFromDistance(m: number): Tier {
  if (m < 30) return "catchable";
  if (m < 100) return "close";
  if (m < 500) return "medium";
  return "far";
}

// 0° = north, clockwise (bearing in degrees)
function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

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
  surface: "rgba(13,13,20,0.96)",
  surfaceBlur: "rgba(13,13,20,0.82)",
  card: "rgba(24,24,36,0.9)",
  primary: "#00FF88",
  accent: "#00FF88",
  gold: "#88FF00",
  text: "#FFFFFF",
  textMuted: "#8a8a99",
  textSubtle: "#555566",
  border: "rgba(255,255,255,0.06)",
  borderGlow: "rgba(0,255,136,0.22)",
  // Frosted glass helper — use as background
  glass: "rgba(10,10,20,0.72)",
  glassStrong: "rgba(10,10,20,0.88)",
};

// Nav height constant: mobile pill nav ≈ 80px + 16px margin = 96px total clearance
const NAV_H = 96;

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

const toolRailBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  background: "rgba(10,10,20,0.75)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#00FF88",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "inherit",
  padding: 0,
  transition: "all 0.15s ease",
  boxShadow: "0 2px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MapPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isDesktop } = useIsDesktop();

  /* ---- State ---- */
  const [position, setPosition] = useState<Position | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [orbsLoading, setOrbsLoading] = useState(true);
  const [orbsError, setOrbsError] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [nearbyPlayersOpen, setNearbyPlayersOpen] = useState(false);
  const [selectedOrb, setSelectedOrb] = useState<Orb | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [confirmOrb, setConfirmOrb] = useState<Orb | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [profileCardUserId, setProfileCardUserId] = useState<string | null>(null);
  const [cameraGranted, setCameraGranted] = useState(true); // assume granted until checked
  const [cameraToast, setCameraToast] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fabDim, setFabDim] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<NearbyPlayer | null>(null);
  const [selectedWild, setSelectedWild] = useState<WildSpawn | null>(null);
  const [privacyForceOpen, setPrivacyForceOpen] = useState(false);
  const [catchableSpawns, setCatchableSpawns] = useState<CatchableSpawn[]>([]);
  const [selectedCatchable, setSelectedCatchable] = useState<CatchableSpawn | null>(null);
  const [catching, setCatching] = useState(false);
  const [catchError, setCatchError] = useState<string | null>(null);
  const [catchResult, setCatchResult] = useState<CatchResult | null>(null);
  const [cinematicOpen, setCinematicOpen] = useState(false);
  const [arSpawn, setArSpawn] = useState<CatchableSpawn | null>(null);
  const [arOpen, setArOpen] = useState(false);
  const [blinkBalance, setBlinkBalance] = useState<number | null>(null);
  const leafletMapRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const fabIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- FAB idle fade ---- */
  const wakeFab = useCallback(() => {
    setFabDim(false);
    if (fabIdleTimerRef.current) clearTimeout(fabIdleTimerRef.current);
    fabIdleTimerRef.current = setTimeout(() => setFabDim(true), 3000);
  }, []);

  useEffect(() => {
    wakeFab();
    return () => {
      if (fabIdleTimerRef.current) clearTimeout(fabIdleTimerRef.current);
    };
  }, [wakeFab]);

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
    // Throttle position updates — only re-render if moved >3m or >3s elapsed
    let lastUpdateMs = 0;
    let lastLat = 0; let lastLng = 0;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        const dlat = Math.abs(pos.coords.latitude - lastLat);
        const dlng = Math.abs(pos.coords.longitude - lastLng);
        const movedEnough = dlat > 0.000027 || dlng > 0.000027; // ~3m
        const timeElapsed = now - lastUpdateMs > 3000;
        if (!movedEnough && !timeElapsed) return;
        lastLat = pos.coords.latitude; lastLng = pos.coords.longitude; lastUpdateMs = now;
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

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const r = await fetch("https://ipapi.co/json/");
        const d = await r.json();
        if (d.latitude && d.longitude) {
          setPosition(prev => prev ?? { lat: Number(d.latitude), lng: Number(d.longitude) });
        }
      } catch {}
    }, 2000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  /* ---- BLINK balance for HUD ---- */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("eth_address, wallet_address")
          .eq("user_id", user.id)
          .single();
        const addr = profile?.eth_address ?? profile?.wallet_address;
        if (!addr) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch(`/api/wallet/balance?address=${addr}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (typeof data.blink === "number") setBlinkBalance(data.blink);
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  /* ---- Ambient wild spawn polling (catch-to-mint) ---- */
  const fetchCatchableSpawns = useCallback(async () => {
    if (!position) return;
    try {
      let { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        // Session may be stale — try refreshing once
        const refreshed = await supabase.auth.refreshSession();
        session = refreshed.data.session;
        if (!session?.access_token) return;
      }
      const res = await fetch(
        `/api/spawns/ambient?lat=${position.lat}&lng=${position.lng}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (!res.ok) {
        console.error('[spawns/ambient]', res.status, await res.text().catch(() => ''));
        return;
      }
      const json = await res.json();
      console.log('[ambient] raw spawns:', json.spawns?.length ?? 0, 'pos:', position?.lat, position?.lng);
      const spawnsWithDistance = (json.spawns ?? []).map((s: CatchableSpawn) => ({
        ...s,
        distanceM: position ? haversine(position.lat, position.lng, s.lat, s.lng) : 9999,
      }));
      console.log('[ambient] setCatchableSpawns:', spawnsWithDistance.length);
      setCatchableSpawns(spawnsWithDistance as CatchableSpawn[]);
    } catch (err) {
      console.error('[fetchCatchableSpawns error]', err);
    }
  }, [position?.lat, position?.lng]);

  useEffect(() => {
    if (!position) return;
    fetchCatchableSpawns();
    const id = setInterval(fetchCatchableSpawns, AMBIENT_POLL_MS);
    return () => clearInterval(id);
  }, [position?.lat, position?.lng, fetchCatchableSpawns]);

  /* ---- Catch flow ---- */
  const performCatch = useCallback(async (override?: CatchableSpawn) => {
    const target = override ?? selectedCatchable;
    if (!target || !position) return;
    setCatching(true);
    setCatchError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setCatchError("Not authenticated.");
        setCatching(false);
        return;
      }
      const res = await fetch("/api/spawns/catch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          spawnId: target.id,
          lat: position.lat,
          lng: position.lng,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setCatchError(json.error || "Catch failed.");
        setCatching(false);
        return;
      }
      setCatchResult(json as CatchResult);
      if (typeof json.blinkRewarded === "number" && json.blinkRewarded > 0) {
        setBlinkBalance((prev) => (prev !== null ? prev + json.blinkRewarded : json.blinkRewarded));
      }
      setSelectedCatchable(null);
      // Re-poll immediately so the caught spawn drops off.
      await fetchCatchableSpawns();
    } catch (err) {
      setCatchError(err instanceof Error ? err.message : "Catch failed.");
    } finally {
      setCatching(false);
    }
  }, [selectedCatchable, position, fetchCatchableSpawns]);

  /* ---- Derived ---- */
  // Render real spawns only — no mock fallback in production.
  const orbsForRender: Orb[] = orbs;

  const filteredOrbs =
    activeFilter === "All"
      ? orbsForRender
      : activeFilter in CHAIN_FILTER_MAP
        ? orbsForRender.filter((o) => (o as any).chain === CHAIN_FILTER_MAP[activeFilter] || o.currency === activeFilter)
        : orbsForRender.filter((o) => o.category?.toLowerCase() === activeFilter.toLowerCase());

  const orbsWithDistance = useMemo(() => filteredOrbs.map((o) => {
    const distance = position ? haversine(position.lat, position.lng, o.lat, o.lng) : Infinity;
    const bearing = position ? bearingDeg(position.lat, position.lng, o.lat, o.lng) : 0;
    const tier: Tier = position ? tierFromDistance(distance) : "far";
    const creatureName = (o as { dropper_name?: string }).dropper_name;
    const creature = BESTIARY.find((c) => c.name === creatureName);
    return { ...o, distance, bearing, tier, creatureImage: creature?.image ?? null };
  }), [filteredOrbs, position]);

  /* ---- Presence + wild spawns (privacy-blurred) ---- */
  const { players, wildSpawns } = usePresence(position);

  /* ---- Activity feed: ambient social proof ---- */
  const [watchers, setWatchers] = useState<NearbyWatcher[]>([]);
  const [recentCatchesList, setRecentCatchesList] = useState<NearbyRecentCatch[]>([]);
  const [watchersOpen, setWatchersOpen] = useState(false);

  // Heartbeat: while the /map page is foreground + we have a position, ping
  // /api/activity/heartbeat every 30s. Page Visibility gates this so background
  // tabs don't hammer the endpoint.
  useEffect(() => {
    if (!user || !position) return;
    let cancelled = false;
    let tokenCache: string | null = null;

    const send = async () => {
      if (document.visibilityState !== "visible") return;
      if (!tokenCache) {
        const { data: { session } } = await supabase.auth.getSession();
        tokenCache = session?.access_token ?? null;
      }
      if (!tokenCache) return;
      try {
        await fetch("/api/activity/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenCache}` },
          body: JSON.stringify({ lat: position.lat, lng: position.lng }),
        });
      } catch {
        /* silent */
      }
    };

    send();
    const id = setInterval(() => {
      if (!cancelled) send();
    }, 30_000);
    const onVis = () => {
      if (document.visibilityState === "visible") send();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user, position?.lat, position?.lng]);

  // Nearby watcher + recent-catch polling (every 30s while visible).
  useEffect(() => {
    if (!user || !position) return;
    let cancelled = false;
    let tokenCache: string | null = null;

    const fetchNearby = async () => {
      if (document.visibilityState !== "visible") return;
      if (!tokenCache) {
        const { data: { session } } = await supabase.auth.getSession();
        tokenCache = session?.access_token ?? null;
      }
      if (!tokenCache) return;
      try {
        const res = await fetch(
          `/api/activity/nearby?lat=${position.lat}&lng=${position.lng}&radiusKm=2`,
          { headers: { Authorization: `Bearer ${tokenCache}` } },
        );
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setWatchers((json.activeWatchers ?? []) as NearbyWatcher[]);
        setRecentCatchesList((json.recentCatches ?? []) as NearbyRecentCatch[]);
      } catch {
        /* silent */
      }
    };

    fetchNearby();
    const id = setInterval(fetchNearby, 30_000);
    const onVis = () => {
      if (document.visibilityState === "visible") fetchNearby();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user, position?.lat, position?.lng]);

  /* ---- Living-approach mechanic (Win #1) ----
   *
   * Compute distance to nearest catchable spawn on every GPS tick. Cross
   * proximity tiers (100m → 50m → 25m → 10m) with a 5m hysteresis buffer
   * so jitter doesn't cause flicker. Each crossing wires the hum + vignette
   * + a haptic pulse. iOS Safari vibrate is a silent no-op (handled in
   * haptics.ts). Reduced-motion users get no vignette pulse (handled in
   * HuntMap CSS) and no audio (gated inside sounds.setApproachIntensity).
   */
  type ApproachTier = "none" | "100m" | "50m" | "25m" | "10m";
  const APPROACH_ENTER: Record<Exclude<ApproachTier, "none">, number> = {
    "100m": 100,
    "50m": 50,
    "25m": 25,
    "10m": 10,
  };
  // Exit threshold = enter + 5m hysteresis so 1-2m GPS jitter can't flicker tiers.
  const APPROACH_EXIT: Record<Exclude<ApproachTier, "none">, number> = {
    "100m": 105,
    "50m": 55,
    "25m": 30,
    "10m": 15,
  };
  const [approachIntensity, setApproachIntensity] = useState(0);
  const approachTierRef = useRef<ApproachTier>("none");
  const approachIntensityRampRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Smoothly ramp the intensity (used for the vignette CSS var + the audio
  // hum) from current → target over ~600ms. setApproachIntensity in sounds.ts
  // already does its own 250ms gain ramp; this just animates the visual side.
  const rampApproachIntensity = useCallback(
    (target: number, rarity: ApproachRarity) => {
      if (approachIntensityRampRef.current) {
        clearInterval(approachIntensityRampRef.current as unknown as number);
        approachIntensityRampRef.current = null;
      }
      const start = approachIntensity;
      const startedAt = Date.now();
      const dur = 600;
      const tick = () => {
        const t = Math.min(1, (Date.now() - startedAt) / dur);
        const v = start + (target - start) * t;
        setApproachIntensity(v);
        if (t >= 1) {
          if (approachIntensityRampRef.current) {
            clearInterval(approachIntensityRampRef.current as unknown as number);
            approachIntensityRampRef.current = null;
          }
        }
      };
      approachIntensityRampRef.current = setInterval(tick, 30);
      // Tell the audio engine immediately so it ramps in parallel.
      sounds.setApproachIntensity(target, rarity);
    },
    [approachIntensity],
  );

  useEffect(() => {
    if (!position || catchableSpawns.length === 0) {
      if (approachTierRef.current !== "none") {
        approachTierRef.current = "none";
        sounds.stopApproachHum();
        rampApproachIntensity(0, "common");
      }
      return;
    }

    // Closest catchable spawn (these are exact GPS — not fuzzy — so distance
    // is trustworthy for the approach mechanic).
    let nearestDist = Infinity;
    let nearestRarity: ApproachRarity = "common";
    for (const s of catchableSpawns) {
      const d = haversine(position.lat, position.lng, s.lat, s.lng);
      if (d < nearestDist) {
        nearestDist = d;
        const r = (s.tier || "common").toLowerCase();
        if (
          r === "common" ||
          r === "uncommon" ||
          r === "rare" ||
          r === "legendary" ||
          r === "mythic"
        ) {
          nearestRarity = r;
        } else {
          nearestRarity = "common";
        }
      }
    }

    const current = approachTierRef.current;

    // Determine the new tier with hysteresis: only step *into* a tighter tier
    // when crossing its enter threshold; only step *out* of a tier when past
    // its exit threshold (5m further out).
    let next: ApproachTier = current;
    const tighter: ApproachTier[] = ["10m", "25m", "50m", "100m"];
    // First, try to enter a tighter tier.
    for (const tier of tighter) {
      if (nearestDist <= APPROACH_ENTER[tier as Exclude<ApproachTier, "none">]) {
        // Tier order: 10m is tightest. Only adopt if it's tighter than current.
        const order: ApproachTier[] = ["none", "100m", "50m", "25m", "10m"];
        if (order.indexOf(tier) > order.indexOf(current)) {
          next = tier;
        }
        break;
      }
    }
    // If we didn't tighten, check if we should loosen.
    if (next === current && current !== "none") {
      const exitFor = APPROACH_EXIT[current as Exclude<ApproachTier, "none">];
      if (nearestDist > exitFor) {
        const order: ApproachTier[] = ["none", "100m", "50m", "25m", "10m"];
        const idx = order.indexOf(current);
        // Step back exactly one tier (and re-evaluate next tick if still loose).
        next = order[Math.max(0, idx - 1)];
      }
    }

    if (next === current) return;

    // Tier change → fire its event payload.
    approachTierRef.current = next;
    switch (next) {
      case "100m":
        // Entering approach range: kick the hum on quietly, ramp to 0.3.
        sounds.setApproachIntensity(0.1, nearestRarity);
        rampApproachIntensity(0.3, nearestRarity);
        break;
      case "50m":
        rampApproachIntensity(0.6, nearestRarity);
        pulseSoft();
        break;
      case "25m":
        rampApproachIntensity(0.85, nearestRarity);
        pulseSoft();
        break;
      case "10m":
        rampApproachIntensity(1.0, nearestRarity);
        // pulseSharp only fires on the transition INTO 10m (debounced by the
        // tier-change guard above — re-entering after exiting + re-crossing
        // is a new transition, which is the intended behaviour).
        pulseSharp();
        break;
      case "none":
        // All spawns left the 100m ring: fade everything out.
        rampApproachIntensity(0, nearestRarity);
        sounds.stopApproachHum();
        break;
    }
  }, [position, catchableSpawns, rampApproachIntensity]);

  // Cleanup on unmount: kill any ramp interval + the hum.
  useEffect(() => {
    return () => {
      if (approachIntensityRampRef.current) {
        clearInterval(approachIntensityRampRef.current as unknown as number);
      }
      sounds.stopApproachHum();
    };
  }, []);

  /* ---- Compass reading ---- */
  // Radar: up to 5 nearest catchable spawns within 1km, sorted by distance
  const radarCreatures: RadarCreature[] = useMemo(() => {
    if (!position) return [];
    return catchableSpawns
      .map((s) => {
        const distanceM = haversine(position.lat, position.lng, s.lat, s.lng);
        if (distanceM > 1000) return null;
        const dLng = (s.lng - position.lng) * Math.PI / 180;
        const lat1 = position.lat * Math.PI / 180;
        const lat2 = s.lat * Math.PI / 180;
        const y = Math.sin(dLng) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
        const bearing = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
        return { id: s.id, name: s.name, tier: s.tier, tier_color: s.tier_color || "", distanceM, bearingDeg: bearing, image_url: s.image_url };
      })
      .filter(Boolean)
      .sort((a, b) => (a!.distanceM - b!.distanceM))
      .slice(0, 5) as RadarCreature[];
  }, [catchableSpawns, position]);

  // Notification-eligible spawns
  const notifySpawns = useMemo(() => radarCreatures.map((c) => ({ id: c.id, name: c.name, tier: c.tier, distanceM: c.distanceM })), [radarCreatures]);
  const { permission: notifPermission } = useNotificationPermission();

  // Vignette: nearest catchable spawn for approach overlay
  const vigData = useMemo(() => {
    if (!position || radarCreatures.length === 0) return null;
    const nearest = radarCreatures[0]; // already sorted by distance
    const distM = nearest.distanceM;
    const intensity = distM > 500 ? 0
      : distM > 100 ? 0.15 + (500 - distM) / 400 * 0.45
      : distM > 50  ? 0.60 + (100 - distM) / 50 * 0.35
      : 1.0;
    return { nearest, distM, intensity };
  }, [radarCreatures, position]);

  const compassReading: CompassReading = (() => {
    if (!position || orbsWithDistance.length === 0) {
      return { tier: "none", distanceM: Infinity, bearingDeg: 0 };
    }
    const nearest = orbsWithDistance.reduce((a, b) =>
      a.distance < b.distance ? a : b,
    );
    return {
      tier: nearest.tier as CompassTier,
      distanceM: nearest.distance,
      bearingDeg: nearest.bearing,
    };
  })();

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
      @keyframes claimPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,136,0.4); }
        50% { box-shadow: 0 0 0 8px rgba(0,255,136,0); }
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
        overflow: "hidden",
        position: "relative",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* ========== FLOATING TOP BAR ========== */}
      {/* Full-screen map underneath — all UI floats as absolute overlays */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          paddingTop: "max(env(safe-area-inset-top, 0px), 12px)",
          padding: "max(env(safe-area-inset-top, 0px), 12px) 12px 0",
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Main pill: logo + sense count + profile */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            pointerEvents: "auto",
          }}
        >
          {/* Logo pill */}
          <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
            <div style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 999,
              background: COLORS.glassStrong,
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(0,255,136,0.18)",
              boxShadow: "0 2px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              <span style={{
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                background: "linear-gradient(135deg, #00FF88, #88FF00)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>BLINK</span>
            </div>
          </Link>

          {/* Sense status pill — center, flex grows */}
          <div style={{
            flex: 1,
            height: 40,
            borderRadius: 999,
            background: COLORS.glassStrong,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: `1px solid ${catchableSpawns.length > 0 ? "rgba(0,255,136,0.22)" : "rgba(255,255,255,0.06)"}`,
            boxShadow: "0 2px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}>
            {catchableSpawns.length > 0 && (
              <span className="mm-sense-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#00FF88", flexShrink: 0 }} />
            )}
            <span style={{
              color: catchableSpawns.length > 0 ? COLORS.text : COLORS.textMuted,
              fontSize: 12,
              fontWeight: catchableSpawns.length > 0 ? 700 : 500,
              letterSpacing: "0.01em",
            }}>
              {catchableSpawns.length > 0 ? `${catchableSpawns.length} nearby` : "The Eye is quiet"}
            </span>
          </div>

          {/* BLINK balance pill */}
          <Link href="/wallet" style={{ textDecoration: "none", flexShrink: 0 }} aria-label="Wallet">
            <div style={{
              height: 40,
              padding: "0 12px",
              borderRadius: 999,
              background: COLORS.glassStrong,
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(0,255,136,0.18)",
              boxShadow: "0 2px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo-orb-transparent.png"
                alt=""
                style={{ width: 17, height: 17, borderRadius: "50%", filter: "drop-shadow(0 0 6px rgba(0,255,136,0.55))" }}
              />
              {blinkBalance === null
                ? <span style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: 700 }}>···</span>
                : <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{blinkBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              }
            </div>
          </Link>

          {/* Profile avatar */}
          <Link href="/profile" style={{ textDecoration: "none", flexShrink: 0 }} aria-label="Profile">
            <div style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: COLORS.glassStrong,
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 2px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <User size={16} color={COLORS.textMuted} />
            </div>
          </Link>
        </div>
      </div>

      {/* ========== CLAIM REWARDS BUTTON ========== */}
      <button
        type="button"
        onClick={() => router.push("/claim")}
        style={{
          position: "fixed",
          top: "calc(env(safe-area-inset-top, 0px) + 64px)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 60,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 24px",
          borderRadius: 999,
          background: "rgba(0,255,136,0.15)",
          border: "1.5px solid #00FF88",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          cursor: "pointer",
          animation: "claimPulse 2s infinite",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-orb-transparent.png"
          alt=""
          style={{ width: 18, height: 18, borderRadius: "50%", filter: "drop-shadow(0 0 6px rgba(0,255,136,0.6))" }}
        />
        <span style={{ color: "#00FF88", fontWeight: 900, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase" }}>Claim Rewards</span>
      </button>

      {/* ========== HOT/COLD COMPASS ========== */}
      {/* Spawn notifier — silent side effect component */}
      <SpawnNotifier spawns={notifySpawns} enabled={notifPermission === "granted"} />

      {/* Creature radar — shows when spawns are within 1km */}
      <AnimatePresence>
        {radarCreatures.length > 0 && (
          <div style={{ position: "absolute", bottom: `calc(${NAV_H + 96}px + env(safe-area-inset-bottom, 0px))`, right: 16, zIndex: 50 }}>
            <CreatureRadar
              creatures={radarCreatures}
              onCreatureSelect={(id) => {
                const spawn = catchableSpawns.find((s) => s.id === id);
                if (spawn) {
                  setSelectedCatchable(spawn);
                  if (position) {
                    const d = haversine(position.lat, position.lng, spawn.lat, spawn.lng);
                    if (d <= CATCH_PROXIMITY_M) setCinematicOpen(true);
                  }
                }
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Legacy compass — show only when no radar creatures (no spawns in 1km) */}
      {radarCreatures.length === 0 && (
        <div
          style={{
            position: "absolute",
            bottom: `calc(${NAV_H + 160}px + env(safe-area-inset-bottom, 0px))`,
            right: 16,
            zIndex: 50,
          }}
        >
          <BlinkCompass reading={compassReading} />
        </div>
      )}

      {/* ========== MAP AREA (full-screen behind all overlays) ========== */}
      <div
        style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 1 }}
      >
        <Suspense
          fallback={
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background: COLORS.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: COLORS.textMuted,
                fontSize: 12,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
              }}
            >
              Opening the Eye…
            </div>
          }
        >
          <ErrorBoundary fallback={<MapDownState />}>
            <HuntMap
              orbs={orbsWithDistance.map((o) => ({
                ...o,
                latitude: o.lat,
                longitude: o.lng,
                tier: o.tier,
                distanceM: o.distance,
                bearingDeg: o.bearing,
                creatureImage: o.creatureImage,
              })) as unknown as ThemeOrb[]}
              userPosition={position}
              onSelectOrb={(orb: ThemeOrb) => {
                const local = orbsWithDistance.find((o) => o.id === orb.id);
                if (local) setSelectedOrb(local);
                wakeFab();
              }}
              mapRef={leafletMapRef}
              players={players}
              wildSpawns={wildSpawns}
              catchableSpawns={catchableSpawns}
              watchers={watchers}
              recentCatches={recentCatchesList}
              onSelectPlayer={(p) => { setSelectedPlayer(p); wakeFab(); }}
              onSelectWildSpawn={(s) => { setSelectedWild(s); wakeFab(); }}
              onSelectCatchable={(s) => {
                setSelectedCatchable(s);
                setCatchError(null);
                wakeFab();
                // If already in range, skip the sheet and go straight to cinematic
                if (position) {
                  const d = haversine(position.lat, position.lng, s.lat, s.lng);
                  if (d <= CATCH_PROXIMITY_M) setCinematicOpen(true);
                }
              }}
              approachIntensity={approachIntensity}
            />
          </ErrorBoundary>
        </Suspense>

        {/* ---- Location pill (subtle, bottom-centered, single-tap) ---- */}
        {showLocationBanner && (
          <button
            onClick={!isDenied ? requestLocation : undefined}
            aria-label={isDenied ? "Location blocked" : "Enable location"}
            style={{
              position: "absolute",
              bottom: `calc(${NAV_H + 92}px + env(safe-area-inset-bottom, 0px))`,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 50,
              background: COLORS.glassStrong,
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: `1px solid ${isDenied ? "rgba(239,68,68,0.35)" : "rgba(0,255,136,0.35)"}`,
              borderRadius: 999,
              padding: "6px 12px",
              display: "inline-flex",
              gap: 6,
              alignItems: "center",
              cursor: isDenied ? "default" : "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
              fontFamily: "inherit",
              color: isDenied ? "#fca5a5" : "#cfd3dd",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.01em",
            }}
          >
            <MapPin size={12} color={isDenied ? "#ef4444" : "#00FF88"} />
            <span>{isDenied ? "Location blocked — open browser settings" : "Location off — tap to enable"}</span>
          </button>
        )}

        {/* ---- Watchers nearby chip ---- */}
        {(watchers.length > 0 || recentCatchesList.length > 0) && (
          <div
            style={{
              position: "absolute",
              top: 64,
              left: 12,
              zIndex: 18,
              maxWidth: "calc(100% - 80px)",
            }}
          >
            <button
              onClick={() => setWatchersOpen((v) => !v)}
              aria-expanded={watchersOpen}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 999,
                background: "rgba(10,10,15,0.85)",
                border: "1px solid rgba(0,255,136,0.45)",
                color: "#00FF88",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 0 14px rgba(0,255,136,0.18)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5C7 5 3 12 3 12s4 7 9 7 9-7 9-7-4-7-9-7Z" stroke="#00FF88" strokeWidth="1.8"/>
                <circle cx="12" cy="12" r="3" fill="#00FF88"/>
              </svg>
              <span>
                {watchers.length} Watcher{watchers.length !== 1 ? "s" : ""} nearby
                {recentCatchesList.length > 0
                  ? ` · ${recentCatchesList.length} recent catch${recentCatchesList.length !== 1 ? "es" : ""}`
                  : ""}
              </span>
            </button>

            {watchersOpen && recentCatchesList.length > 0 && (
              <div
                style={{
                  marginTop: 8,
                  width: 260,
                  maxHeight: 240,
                  overflowY: "auto",
                  background: "rgba(10,10,15,0.95)",
                  border: "1px solid rgba(0,255,136,0.32)",
                  borderRadius: 12,
                  padding: 8,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                }}
              >
                <div
                  style={{
                    color: "#8a8a99",
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                    padding: "0 4px",
                  }}
                >
                  Recent catches
                </div>
                {recentCatchesList.map((rc) => {
                  const ageMin = Math.max(0, Math.floor((Date.now() - new Date(rc.caughtAt).getTime()) / 60000));
                  const ageLabel = ageMin === 0 ? "just now" : `${ageMin} min ago`;
                  return (
                    <div
                      key={rc.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 4px",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#00FF88",
                          boxShadow: "0 0 6px rgba(0,255,136,0.6)",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "#FFFFFF", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {rc.catcherHandle} · {rc.tier}
                        </div>
                        <div style={{ color: "#8a8a99", fontSize: 11 }}>{ageLabel}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---- Tool rail (top-right, below top bar) ---- */}
        <div
          style={{
            position: "absolute",
            top: 64,
            right: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            zIndex: 15,
            padding: 5,
            background: COLORS.glassStrong,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <button
            onClick={() => {
              if (leafletMapRef.current && position) {
                leafletMapRef.current.flyTo({ center: [position.lng, position.lat], zoom: 16, duration: 800 });
              } else {
                requestLocation();
              }
              wakeFab();
            }}
            aria-label="Recenter on me"
            style={{
              ...toolRailBtn,
              border: `1px solid ${position ? "rgba(0,255,136,0.45)" : "rgba(255,255,255,0.10)"}`,
              boxShadow: position ? "0 0 10px rgba(0,255,136,0.22)" : "none",
            }}
          >
            <Crosshair size={16} color={position ? "#00FF88" : COLORS.textMuted} />
          </button>
          {/* Zoom controls — desktop only; pinch-zoom covers mobile. */}
          {isDesktop && (
            <>
              <button
                onClick={() => { leafletMapRef.current?.zoomIn?.(); wakeFab(); }}
                aria-label="Zoom in"
                style={toolRailBtn}
              >
                +
              </button>
              <button
                onClick={() => { leafletMapRef.current?.zoomOut?.(); wakeFab(); }}
                aria-label="Zoom out"
                style={toolRailBtn}
              >
                −
              </button>
            </>
          )}
          <button
            onClick={() => {
              wakeFab();
              if (!cameraGranted) {
                handleCameraRequest();
                return;
              }
              // Always open the AR overlay. If a catchable spawn is nearby,
              // pre-select the nearest one so the Pokémon-GO flow runs; if
              // not, open with arSpawn = null and let the overlay render its
              // "no creatures within 200m" empty state.
              let nearest: CatchableSpawn | null = null;
              if (position && catchableSpawns.length > 0) {
                let bestDist = Infinity;
                for (const s of catchableSpawns) {
                  const d = haversine(position.lat, position.lng, s.lat, s.lng);
                  if (d < bestDist) {
                    bestDist = d;
                    nearest = s;
                  }
                }
              }
              const target = nearest ?? selectedCatchable ?? catchableSpawns[0] ?? null;
              setArSpawn(target);
              setArOpen(true);
            }}
            aria-label={cameraGranted ? "Open AR camera" : "Enable camera"}
            style={{
              ...toolRailBtn,
              border: `1px solid ${catchableSpawns.length > 0 ? "rgba(0,255,136,0.45)" : "rgba(255,255,255,0.10)"}`,
              boxShadow: catchableSpawns.length > 0 ? "0 0 10px rgba(0,255,136,0.22)" : "none",
            }}
          >
            <Camera size={16} color={catchableSpawns.length > 0 ? "#00FF88" : COLORS.textMuted} />
          </button>
        </div>
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
              bottom: `calc(${NAV_H + 130}px + env(safe-area-inset-bottom, 0px))`,
              left: "50%",
              transform: "translateX(-50%)",
              background: COLORS.glassStrong,
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
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

      {/* ========== NEARBY PLAYERS PILL ========== */}
      <AnimatePresence>
        {players.length > 0 && (
          <motion.button
            key="nearby-players-pill"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={() => setNearbyPlayersOpen(true)}
            aria-label={`${players.length} players nearby — tap to view`}
            style={{
              position: "absolute",
              bottom: `calc(${NAV_H + 8}px + env(safe-area-inset-bottom, 0px))`,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 30,
              height: 48,
              maxWidth: 280,
              padding: "0 18px",
              borderRadius: 999,
              background: "rgba(10,10,20,0.78)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(0,255,136,0.4)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 18px rgba(0,255,136,0.18)",
              color: "#00FF88",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.01em",
              fontFamily: "inherit",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>{players.length} player{players.length !== 1 ? "s" : ""} nearby</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ========== NEARBY PLAYERS LIST SHEET ========== */}
      <AnimatePresence>
        {nearbyPlayersOpen && (
          <motion.div
            key="nearby-players-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setNearbyPlayersOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              zIndex: 78,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            <motion.div
              key="nearby-players-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 480,
                background: COLORS.glassStrong,
                backdropFilter: "blur(32px)",
                WebkitBackdropFilter: "blur(32px)",
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                border: "1px solid rgba(0,255,136,0.18)",
                borderBottom: "none",
                boxShadow: "0 -4px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)",
                padding: "20px 16px calc(28px + env(safe-area-inset-bottom, 0px))",
                color: COLORS.text,
                maxHeight: "62dvh",
                overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  {players.length} player{players.length !== 1 ? "s" : ""} nearby
                </span>
                <button
                  onClick={() => setNearbyPlayersOpen(false)}
                  aria-label="Close"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: COLORS.textMuted,
                    fontSize: 24,
                    cursor: "pointer",
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
              {players.length === 0 ? (
                <p style={{ color: COLORS.textMuted, fontSize: 13, textAlign: "center", padding: 16 }}>
                  No players nearby right now.
                </p>
              ) : (
                players.map((p) => (
                  <button
                    key={p.user_id}
                    onClick={() => {
                      setNearbyPlayersOpen(false);
                      setSelectedPlayer(p);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "10px 12px",
                      marginBottom: 6,
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "left",
                    }}
                  >
                    <UserAvatar
                      profilePicUrl={p.avatar_url}
                      handle={p.handle || "anon"}
                      size={36}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: COLORS.text, fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        @{p.handle || "anon"}
                      </div>
                      <div style={{ color: COLORS.textMuted, fontSize: 12 }}>
                        {p.is_friend ? "Friend · " : ""}~{p.fuzzy_radius_m}m
                      </div>
                    </div>
                  </button>
                ))
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== SPAWN FAB (bottom-left, idle-fade) ========== */}
      <Link
        href="/spawn"
        aria-label="Find creatures near you"
        style={{ textDecoration: "none" }}
        onClick={wakeFab}
      >
        <motion.div
          onMouseEnter={wakeFab}
          onFocus={wakeFab}
          onTouchStart={wakeFab}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            opacity: fabDim ? 0.45 : 0.95,
            width: fabDim ? 44 : 50,
            height: fabDim ? 44 : 50,
          }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{
            position: "absolute",
            bottom: `calc(${NAV_H + 96}px + env(safe-area-inset-bottom, 0px))`,
            left: 16,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.gold})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 35,
            boxShadow: `0 4px 24px ${COLORS.primary}50, 0 0 40px ${COLORS.primary}20`,
            border: "1px solid rgba(255,255,255,0.18)",
            color: COLORS.bg,
          }}
        >
          <Plus size={22} color={COLORS.bg} />
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
                background: COLORS.glassStrong,
                backdropFilter: "blur(32px)",
                WebkitBackdropFilter: "blur(32px)",
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                border: "1px solid rgba(255,255,255,0.08)",
                borderBottom: "none",
                boxShadow: "0 -4px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)",
                padding: "20px 20px calc(32px + env(safe-area-inset-bottom, 0px))",
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
                background: COLORS.glassStrong,
                backdropFilter: "blur(32px)",
                WebkitBackdropFilter: "blur(32px)",
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow: "0 8px 48px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.07)",
                padding: 24,
                textAlign: "center",
              }}
            >
              <h3 style={{ color: COLORS.text, fontSize: 18, fontWeight: 700, margin: "0 0 16px" }}>
                Catch this creature?
              </h3>
              {/* Reward */}
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "12px 14px", marginBottom: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
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

      {/* ========== LIVE PRESENCE / SOCIAL ========== */}
      <PresenceLegend onOpenPrivacy={() => setPrivacyForceOpen(true)} />
      <PrivacyIntroModal
        forceOpen={privacyForceOpen}
        onClose={() => setPrivacyForceOpen(false)}
      />
      {selectedPlayer && (
        <PlayerSheet
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onMessage={(uid, handle) => {
            setSelectedPlayer(null);
            router.push(`/messages?user=${uid}${handle ? `&handle=${encodeURIComponent(handle)}` : ""}`);
          }}
        />
      )}

      {/* ========== AR CAMERA OVERLAY ========== */}
      {arOpen && (
      <ARCameraOverlay
        spawn={arSpawn}
        userPosition={position}
        spawns={catchableSpawns}
        onSwitchSpawn={(s) => setArSpawn(s)}
        onClose={() => { setArOpen(false); setArSpawn(null); }}
        onCatch={async () => {
          // AR overlay owns the throw + reveal sequence and renders its own
          // result card, so we call the API inline here instead of going
          // through performCatch (which would also pop the legacy modal).
          if (!arSpawn || !position) {
            return { error: "No position fix yet." };
          }
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return { error: "Not authenticated." };
            const res = await fetch("/api/spawns/catch", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                spawnId: arSpawn.id,
                lat: position.lat,
                lng: position.lng,
              }),
            });
            const json = await res.json();
            if (!res.ok) return { error: json.error || "Catch failed." };
            // Drop the caught spawn from the map immediately.
            void fetchCatchableSpawns();
            return json as CatchResult;
          } catch (err) {
            return { error: err instanceof Error ? err.message : "Catch failed." };
          }
        }}
      />
      )}

      {/* ========== APPROACH VIGNETTE ========== */}
      {vigData && vigData.intensity > 0.02 && (
        <MapApproachVignette
          key="approach-vig"
          intensity={vigData.intensity}
          tierColor={vigData.nearest.tier_color || "#00FF88"}
          creatureName={vigData.nearest.name}
          distanceM={vigData.distM}
          onCatch={vigData.distM <= CATCH_PROXIMITY_M ? () => {
            const spawn = catchableSpawns.find((s) => s.id === vigData.nearest.id);
            if (spawn) { setSelectedCatchable(spawn); setCinematicOpen(true); }
          } : undefined}
        />
      )}

      {/* ========== CINEMATIC CATCH ========== */}
      <AnimatePresence>
        {cinematicOpen && selectedCatchable && (
          <CinematicCatch
            key="cinematic-catch"
            spawn={{
              name: selectedCatchable.name,
              tier: selectedCatchable.tier,
              tier_color: selectedCatchable.tier_color || "#00FF88",
              image_url: selectedCatchable.image_url,
            }}
            onCatch={async (opts) => {
              if (!position || !user) throw new Error("Not authenticated.");
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.access_token) throw new Error("Not authenticated.");
              const res = await fetch("/api/spawns/catch", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({
                  spawnId: selectedCatchable.id,
                  lat: position.lat,
                  lng: position.lng,
                  ...(opts?.txHash ? { txHash: opts.txHash } : {}),
                }),
              });
              const json = await res.json();
              if (res.status === 429) {
                // Daily free limit hit — CinematicCatch will swap to the paid screen.
                throw new DailyLimitError(json.error || "Daily free catch limit reached");
              }
              if (!res.ok) throw new Error(json.error || "Catch failed.");
              void fetchCatchableSpawns();
              return json as CatchResult;
            }}
            onDismiss={() => {
              setCinematicOpen(false);
              setSelectedCatchable(null);
              setCatchResult(null);
            }}
            onShare={(result) => {
              const text = `Just caught ${result.name} on @blinkworldeth and earned ${result.blinkRewarded.toLocaleString()} $BLINK tokens!\n\nReal crypto. Real NFTs. Real money.\n\nhttps://blinkworld.xyz`;
              if (navigator.share) navigator.share({ text }).catch(() => {});
              else navigator.clipboard.writeText(text).catch(() => {});
            }}
          />
        )}
      </AnimatePresence>

      {/* ========== CREATURE ENCOUNTER STRIP ========== */}
      <AnimatePresence>
        {selectedCatchable && !cinematicOpen && (() => {
          const dist = position
            ? haversine(position.lat, position.lng, selectedCatchable.lat, selectedCatchable.lng)
            : Infinity;
          const inRange = dist <= CATCH_PROXIMITY_M;
          const tierLabel = TIER_LABELS[selectedCatchable.tier] ?? selectedCatchable.tier;
          const accent = selectedCatchable.tier_color || "#00FF88";
          const bottomOffset = NAV_H + (players.length > 0 ? 64 : 8);
          return (
            <motion.div
              key="creature-encounter-strip"
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px))`,
                left: 16,
                right: 16,
                maxWidth: 480,
                marginLeft: "auto",
                marginRight: "auto",
                zIndex: 32,
                height: 80,
                padding: "12px 16px",
                background: "rgba(10,10,20,0.95)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderRadius: 18,
                border: `1.5px solid ${accent}`,
                boxShadow: `0 0 24px ${accent}4D, 0 4px 20px rgba(0,0,0,0.6)`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: COLORS.text,
              }}
            >
              {/* Creature image */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 10,
                  background: `radial-gradient(circle at 35% 35%, ${accent}33, #0a0a0f)`,
                  border: `1px solid ${accent}66`,
                  overflow: "hidden",
                  flexShrink: 0,
                  boxShadow: `0 0 12px ${accent}55`,
                }}
              >
                {selectedCatchable.image_url && (
                  <img
                    src={selectedCatchable.image_url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                )}
              </div>

              {/* Name + tier + distance */}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selectedCatchable.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      background: `${accent}22`,
                      color: accent,
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {tierLabel}
                  </span>
                  <span style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600 }}>
                    {Math.round(dist)}m away
                  </span>
                </div>
              </div>

              {/* CATCH! button */}
              <button
                onClick={() => { if (inRange) setCinematicOpen(true); }}
                disabled={!inRange}
                aria-label={inRange ? "Catch creature" : "Too far to catch"}
                style={{
                  flexShrink: 0,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "none",
                  background: inRange ? accent : "rgba(255,255,255,0.06)",
                  color: inRange ? "#000" : COLORS.textMuted,
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: "0.06em",
                  cursor: inRange ? "pointer" : "default",
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                  boxShadow: inRange ? `0 0 14px ${accent}77` : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {inRange ? "CATCH!" : "50m away"}
              </button>

              {/* Dismiss X */}
              <button
                onClick={() => setSelectedCatchable(null)}
                aria-label="Dismiss"
                style={{
                  flexShrink: 0,
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  color: COLORS.textMuted,
                  fontSize: 20,
                  lineHeight: 1,
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "inherit",
                }}
              >
                ×
              </button>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ========== CATCH SUCCESS MODAL ========== */}
      <AnimatePresence>
        {catchResult && (() => {
  const accent = (() => {
    const map: Record<string, string> = {
      common: "#FFFFFF",
      uncommon: "#66E3FF",
      rare: "#6BB5FF",
      legendary: "#FFD773",
      mythic: "#FF66CC",
    };
    return map[catchResult.tier] || COLORS.accent;
  })();

  return (
    <motion.div
      key="catch-success-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setCatchResult(null)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        zIndex: 85,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        overflow: "hidden",
      }}
    >
      {/* Confetti particles */}
      {Array.from({ length: 24 }).map((_, i) => {
        const colors = [accent, "#00FF88", "#ffffff", "#FFD700", "#ff6b6b"];
        const color = colors[i % colors.length];
        const startX = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const duration = 1.2 + Math.random() * 1.2;
        const size = 6 + Math.random() * 8;
        return (
          <motion.div
            key={i}
            initial={{ y: -20, x: `${startX}vw`, opacity: 1, rotate: 0, scale: 1 }}
            animate={{ y: "110vh", x: `calc(${startX}vw + ${(Math.random() - 0.5) * 120}px)`, opacity: 0, rotate: Math.random() * 720 - 360, scale: 0.3 }}
            transition={{ delay, duration, ease: "easeIn" }}
            style={{
              position: "fixed",
              top: 0,
              width: size,
              height: size * (Math.random() > 0.5 ? 1 : 2.5),
              background: color,
              borderRadius: Math.random() > 0.5 ? "50%" : 2,
              zIndex: 86,
              pointerEvents: "none",
            }}
          />
        );
      })}

      {/* Main card */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0, rotateY: 180 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 200, delay: 0.1 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 340,
          background: `linear-gradient(160deg, #0d0d18 0%, #0a0a0f 100%)`,
          borderRadius: 24,
          padding: "28px 22px 24px",
          textAlign: "center",
          border: `2px solid ${accent}`,
          boxShadow: `0 0 60px ${accent}55, 0 0 120px ${accent}22, inset 0 1px 0 ${accent}33`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow pulse */}
        <motion.div
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 50% 30%, ${accent}33 0%, transparent 70%)`,
            pointerEvents: "none",
            borderRadius: 24,
          }}
        />

        {/* "CAUGHT!" badge */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
          style={{
            display: "inline-block",
            background: "linear-gradient(90deg, #00FF88, #88FF00)",
            color: "#000",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 3,
            padding: "5px 14px",
            borderRadius: 999,
            marginBottom: 16,
            textTransform: "uppercase",
            boxShadow: "0 0 12px rgba(0,255,136,0.6)",
          }}
        >
          CAUGHT!
        </motion.div>

        {/* Creature card image */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.25, type: "spring", damping: 16, stiffness: 220 }}
          style={{
            width: 160,
            height: 160,
            borderRadius: 20,
            margin: "0 auto 18px",
            overflow: "hidden",
            border: `3px solid ${accent}`,
            boxShadow: `0 0 40px ${accent}66, 0 8px 32px rgba(0,0,0,0.6)`,
            position: "relative",
          }}
        >
          {catchResult.image_url ? (
            <img
              src={catchResult.image_url}
              alt={catchResult.name}
              loading="lazy"
              decoding="async"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: `radial-gradient(circle, ${accent}44, #0a0a0f)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3" fill={accent} stroke="none"/></svg>
            </div>
          )}
          {/* Shine sweep */}
          <motion.div
            initial={{ x: "-100%", opacity: 0.6 }}
            animate={{ x: "200%", opacity: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
        </motion.div>

        {/* Creature name */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ color: "#fff", fontSize: 26, fontWeight: 900, margin: "0 0 4px", letterSpacing: 1 }}
        >
          {catchResult.name}
        </motion.h2>

        {/* Tier badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ color: accent, fontSize: 13, fontWeight: 700, marginBottom: 20, textTransform: "uppercase", letterSpacing: 2 }}
        >
          {catchResult.tierLabel}
        </motion.div>

        {/* BLINK reward — BIG */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.55, type: "spring", stiffness: 300, damping: 18 }}
          style={{
            background: "rgba(0,255,136,0.08)",
            border: "1px solid #00FF8844",
            borderRadius: 16,
            padding: "14px 16px",
            marginBottom: 14,
          }}
        >
          <div style={{ color: "#ffffff88", fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>You Earned</div>
          <div style={{ color: "#00FF88", fontSize: 32, fontWeight: 900, letterSpacing: 1 }}>
            +{catchResult.blinkRewarded.toLocaleString()}
          </div>
          <div style={{ color: "#00FF88aa", fontSize: 13, fontWeight: 700 }}>$BLINK TOKENS</div>
        </motion.div>

        {/* NFT info row */}
        {catchResult.tokenId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            style={{ color: "#ffffff55", fontSize: 12, marginBottom: 20 }}
          >
            NFT minted to your wallet · Token #{catchResult.tokenId}
          </motion.div>
        )}

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          {/* Share button */}
          <button
            onClick={() => {
              const text = `Just caught ${catchResult.name} on @blinkworldeth and earned ${catchResult.blinkRewarded.toLocaleString()} $BLINK tokens!\n\nReal crypto. Real NFTs. Real money.\n\nhttps://blinkworld.xyz`;
              if (navigator.share) {
                navigator.share({ text }).catch(() => {});
              } else {
                navigator.clipboard.writeText(text).catch(() => {});
              }
            }}
            style={{
              width: "100%",
              padding: "15px 0",
              borderRadius: 999,
              border: "none",
              background: accent,
              color: "#000",
              fontSize: 15,
              fontWeight: 900,
              cursor: "pointer",
              letterSpacing: 0.5,
              boxShadow: `0 0 16px ${accent}80`,
            }}
          >
            Share Your Catch
          </button>

          {catchResult.openseaUrl && (
            <a
              href={catchResult.openseaUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                padding: "12px 0",
                borderRadius: 14,
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              View on OpenSea
            </a>
          )}

          <button
            onClick={() => setCatchResult(null)}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "#ffffff66",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Keep Hunting
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
})()}
      </AnimatePresence>

      {/* ========== WILD CREATURE SHEET ========== */}
      <AnimatePresence>
        {selectedWild && (
          <motion.div
            key="wild-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedWild(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              zIndex: 75,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            <motion.div
              key="wild-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 480,
                background: COLORS.surface,
                borderTopLeftRadius: 22,
                borderTopRightRadius: 22,
                padding: "22px 22px 28px",
                color: COLORS.text,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: `radial-gradient(circle at 35% 35%, #00FF88, #0a0a0f)`,
                    border: "1px solid rgba(0,255,136,0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em" }}>
                    Wild {selectedWild.species}
                  </div>
                  <div style={{ color: COLORS.textMuted, fontSize: 12, textTransform: "capitalize" }}>
                    {selectedWild.rarity} · ~{selectedWild.fuzzy_radius_m}m search zone
                  </div>
                </div>
                <button
                  onClick={() => setSelectedWild(null)}
                  aria-label="Close"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: COLORS.textMuted,
                    fontSize: 22,
                    cursor: "pointer",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
              <p style={{ color: "#cfd3dd", fontSize: 13, lineHeight: 1.55, margin: "14px 0 18px" }}>
                Walk into the highlighted zone to reveal the exact point. The
                Eye won't tell you where it is — only that it's near.
              </p>
              <button
                onClick={() => {
                  setSelectedWild(null);
                  router.push("/map");
                }}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  borderRadius: 14,
                  border: "none",
                  background: COLORS.accent,
                  color: COLORS.bg,
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Hunt
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
