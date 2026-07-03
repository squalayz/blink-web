"use client";

import { Suspense, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { Orb as ThemeOrb } from "@/lib/theme";
import { MapPin, X } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { hasCompletedWalkthrough } from "@/components/OnboardingWalkthrough";
import UserProfileCard from "@/components/UserProfileCard";

import { type RadarCreature } from "@/components/CreatureRadar";
import { SpawnNotifier, useNotificationPermission } from "@/components/SpawnNotifier";
import { BESTIARY } from "@/lib/bestiary";
import { resolveByCreatureId } from "@/lib/bestiary-art";
import { usePresence } from "@/lib/use-presence";
import type {
  NearbyPlayer,
  WildSpawn,
  CatchableSpawn,
  NearbyWatcher,
  NearbyRecentCatch,
  PanState,
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

// BLINK: ETH-only — chain map kept for legacy DB rows.
const CHAIN_FILTER_MAP: Record<string, string> = {
  SOL: "solana",
  ETH: "ethereum",
  BTC: "bitcoin",
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
  const [activeFilter] = useState("All");
  const [selectedOrb, setSelectedOrb] = useState<Orb | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [confirmOrb, setConfirmOrb] = useState<Orb | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [profileCardUserId, setProfileCardUserId] = useState<string | null>(null);
  const [cameraGranted, setCameraGranted] = useState(true); // assume granted until checked
  const [cameraToast, setCameraToast] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<NearbyPlayer | null>(null);
  const [selectedWild, setSelectedWild] = useState<WildSpawn | null>(null);
  const [privacyForceOpen, setPrivacyForceOpen] = useState(false);
  const [catchableSpawns, setCatchableSpawns] = useState<CatchableSpawn[]>([]);
  const [selectedCatchable, setSelectedCatchable] = useState<CatchableSpawn | null>(null);
  const [cinematicOpen, setCinematicOpen] = useState(false);
  const [arSpawn, setArSpawn] = useState<CatchableSpawn | null>(null);
  const [arOpen, setArOpen] = useState(false);
  const [blinkBalance, setBlinkBalance] = useState<number | null>(null);
  // App-HUD state: the single top-bar menu fan, the one banner slot's
  // transient "walk closer" nudge, camera-follow pan state (drives the
  // Recenter button), and the bottom Nearby tray.
  const [menuOpen, setMenuOpen] = useState(false);
  const [nudge, setNudge] = useState<{ tint: string; title: string; subtitle: string } | null>(null);
  const nudgeTokenRef = useRef(0);
  const [panState, setPanState] = useState<PanState | null>(null);
  const [nearbyExpanded, setNearbyExpanded] = useState(false);
  // Real daily-energy analog (app: WalkEnergyBar): free catches left today +
  // the day streak, from /api/me/stats. `null` until the first fetch lands —
  // the bar renders nothing rather than fake numbers.
  const [playerStats, setPlayerStats] = useState<{
    catchesToday: number;
    streakDays: number;
    unclaimedCatches: number;
  } | null>(null);
  // WalkEnergyBar presentation state — opens full for a few seconds so the
  // day's state reads at a glance, then slims into the tiny quiet pill.
  const [energyExpanded, setEnergyExpanded] = useState(true);
  const [energyDetail, setEnergyDetail] = useState(false);
  const energyQuietTokenRef = useRef(0);
  const leafletMapRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  /* ---- The unified "walk closer" nudge (app: MapHomeView.showNudge) ---- */
  const showNudge = useCallback((tint: string, title: string, subtitle: string) => {
    setNudge({ tint, title, subtitle });
    nudgeTokenRef.current += 1;
    const token = nudgeTokenRef.current;
    setTimeout(() => {
      if (token === nudgeTokenRef.current) setNudge(null);
    }, 3200);
  }, []);

  /* ---- Player stats: daily energy + streak + claimable dot ---- */
  const fetchPlayerStats = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/api/me/stats", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      if (typeof json.catchesToday === "number") {
        setPlayerStats({
          catchesToday: json.catchesToday,
          streakDays: json.streakDays ?? 0,
          unclaimedCatches: json.unclaimedCatches ?? 0,
        });
      }
    } catch {
      /* silent — the bar simply stays hidden */
    }
  }, []);

  useEffect(() => {
    if (user) fetchPlayerStats();
  }, [user, fetchPlayerStats]);

  /* ---- WalkEnergyBar quiet cycle (app: scheduleQuiet) ---- */
  const scheduleEnergyQuiet = useCallback((afterMs: number) => {
    energyQuietTokenRef.current += 1;
    const token = energyQuietTokenRef.current;
    setTimeout(() => {
      if (token !== energyQuietTokenRef.current) return;
      setEnergyDetail(false);
      setEnergyExpanded(false);
    }, afterMs);
  }, []);

  useEffect(() => {
    scheduleEnergyQuiet(6000);
  }, [scheduleEnergyQuiet]);

  /* ---- Auth redirect ---- */
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/signin");
    }
  }, [authLoading, user, router]);

  /* ---- Walkthrough gate (RootView.swift) — a signed-in trainer who
     hasn't seen the cinematic intro on this device gets it before the
     map, exactly like the app. Also covers the homepage race where the
     signed-in redirect can beat the is_new → /onboarding routing. ---- */
  useEffect(() => {
    if (!authLoading && user && !hasCompletedWalkthrough(user.id)) {
      router.replace("/onboarding");
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
    let status: PermissionStatus | null = null;
    // Safari <16 / some WebViews have no Permissions API — query() would throw synchronously.
    if (typeof navigator.permissions?.query !== "function") return;
    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((s) => {
        status = s;
        setCameraGranted(s.state === "granted");
        s.onchange = () => setCameraGranted(s.state === "granted");
      })
      .catch(() => {
        // permissions API not supported for camera, keep hidden
      });
    return () => {
      if (status) status.onchange = null;
    };
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
      const spawnsWithDistance = (json.spawns ?? []).map((s: CatchableSpawn) => ({
        ...s,
        distanceM: position ? haversine(position.lat, position.lng, s.lat, s.lng) : 9999,
      }));
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

  /* ---- App-HUD derived state ---- */
  // Catchable spawns with live distance, nearest first — feeds the banner
  // slot, the Lens badge, and the Nearby tray's CREATURES section.
  const spawnsByDistance = useMemo(() => {
    if (!position) return [] as (CatchableSpawn & { distanceM: number })[];
    return catchableSpawns
      .map((s) => ({ ...s, distanceM: haversine(position.lat, position.lng, s.lat, s.lng) }))
      .sort((a, b) => a.distanceM - b.distanceM);
  }, [catchableSpawns, position]);

  // The nearest creature actually within catch range — drives the "in reach"
  // banner (app: catchableCreature) and gates the catch flow.
  const inReachSpawn = spawnsByDistance.find((s) => s.distanceM <= CATCH_PROXIMITY_M) ?? null;
  const lensBadgeCount = spawnsByDistance.filter((s) => s.distanceM <= CATCH_PROXIMITY_M).length;

  // Mythic within 100m — the screen-edge pink pulse moment.
  const mythicNear = spawnsByDistance.some(
    (s) => (s.tier || "").toLowerCase() === "mythic" && s.distanceM <= 100,
  );

  // Orb drops sorted by distance for the tray's TREASURE section.
  const orbsByDistance = useMemo(
    () => [...orbsWithDistance].filter((o) => o.status !== "claimed").sort((a, b) => a.distance - b.distance),
    [orbsWithDistance],
  );

  /* ---- Catch proximity gate (app: MapHomeView.tapCreature) ---- */
  // Every creature tap routes through this: within range opens the catch
  // flow; farther away surfaces the calm "walk closer" nudge.
  const tapCatchable = useCallback((s: CatchableSpawn) => {
    const dist = position ? haversine(position.lat, position.lng, s.lat, s.lng) : Infinity;
    if (dist <= CATCH_PROXIMITY_M) {
      setSelectedCatchable(s);
      setCinematicOpen(true);
      return;
    }
    const toGo = Math.max(1, Math.round(dist - CATCH_PROXIMITY_M));
    const tint = s.tier_color || "#00FF88";
    showNudge(tint, `Get closer to catch ${s.name}`, `Walk about ${formatDistance(toGo)} closer to reach it`);
  }, [position, showNudge]);

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
      @keyframes mmBannerShimmer {
        0%, 100% { transform: scale(0.9); opacity: 0.9; }
        50% { transform: scale(1.15); opacity: 0.3; }
      }
      @keyframes mmLensBreathe {
        0%, 100% { transform: scale(0.94); opacity: 0.85; }
        50% { transform: scale(1.16); opacity: 0.35; }
      }
      @keyframes mmRecenterPing {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(1.25); opacity: 0; }
      }
      @keyframes mmMythicEdge {
        0%, 100% { opacity: 0; }
        50% { opacity: 1; }
      }
      @keyframes mmLiveDot {
        0%, 100% { transform: scale(0.9); }
        50% { transform: scale(1.3); }
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
      {/* ========== TOP HUD — ONE calm status row + ONE banner slot ========== */}
      {/* App-identical: the live Orb Balance chip on the left, the single
          menu button on the right, and at most one contextual banner below.
          The world gets the screen. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          padding: "calc(max(env(safe-area-inset-top, 0px), 10px) + 6px) 16px 0",
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
          {/* Orb balance chip — black glass capsule, brand orb + balance */}
          <Link href="/wallet" style={{ textDecoration: "none", flexShrink: 0 }} aria-label="Open your Orb Bank">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 12px 4px 5px",
                borderRadius: 999,
                background: "rgba(10,10,15,0.55)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(0,255,136,0.45)",
                boxShadow: "0 0 8px rgba(0,255,136,0.22)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/app/energy-orb-b.png"
                alt=""
                style={{ width: 17, height: 17, objectFit: "contain" }}
              />
              <span
                style={{
                  color: COLORS.text,
                  fontSize: 14,
                  fontWeight: 900,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: "17px",
                }}
              >
                {blinkBalance === null
                  ? "···"
                  : blinkBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </Link>

          <div style={{ flex: 1 }} />

          {/* The one menu button — rotates into an X when the fan is open.
              A single dot means "something inside is waiting" (app:
              menuHasAttention) — here, real unclaimed catch rewards. */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(20,20,28,0.6)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.25)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
              position: "relative",
            }}
          >
            <span
              style={{
                display: "flex",
                transform: menuOpen ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.35s cubic-bezier(0.34, 1.4, 0.64, 1)",
              }}
            >
              {menuOpen ? (
                <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
                  <path d="M2 2 L13 13 M13 2 L2 13" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
                  <path d="M1.5 3 H13.5 M1.5 7.5 H13.5 M1.5 12 H13.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              )}
            </span>
            {!menuOpen && (playerStats?.unclaimedCatches ?? 0) > 0 && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: -1,
                  right: -1,
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#00FF88",
                  boxShadow: "0 0 0 2px #0a0a0f",
                }}
              />
            )}
          </button>
        </div>

        {/* ---- WalkEnergyBar (app: WalkEnergyBar) ----
            The daily energy meter backed by REAL data: free catches left
            today (DAILY_FREE_LIMIT = 2 in /api/spawns/catch) + the streak
            from /api/me/stats. Opens full for a few seconds, then slims into
            the tiny quiet pill; stays open while low or empty. */}
        {playerStats && (() => {
          const DAILY_FREE = 2;
          const remaining = Math.max(0, DAILY_FREE - playerStats.catchesToday);
          const fraction = remaining / DAILY_FREE;
          const isEmpty = remaining === 0;
          const isLow = remaining === 1;
          const mustStayOpen = isEmpty || isLow;
          const isOpen = energyExpanded || mustStayOpen;
          const barTint = isEmpty ? "#9ea8bd" : isLow ? "#ffb840" : "#00FF88";
          const gold = "#ffd152";
          const streak = playerStats.streakDays;
          const detailText = isEmpty
            ? "Today's free catches are used — they refill at midnight, so come back tomorrow for a fresh run."
            : isLow
              ? `Almost done for today: ${remaining} free catch left. Refills fully at midnight.`
              : `Energy: ${remaining} of ${DAILY_FREE} free catches left today. Every catch spends one — it refills at midnight.`;
          const onTap = () => {
            if (isOpen) setEnergyDetail((v) => !v);
            else {
              setEnergyExpanded(true);
              setEnergyDetail(true);
            }
            scheduleEnergyQuiet(4500);
          };
          const boltSvg = (size: number, tint: string) => (
            <svg width={size} height={size} viewBox="0 0 24 24" fill={tint} aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M13 2L4.5 13.5H11L9.5 22 19 10.5h-6.5z" />
            </svg>
          );
          const moonSvg = (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#9ea8bd" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M20.4 14.6A8.6 8.6 0 0 1 9.4 3.6 8.6 8.6 0 1 0 20.4 14.6z" />
            </svg>
          );
          const flameSvg = (size: number) => (
            <svg width={size} height={size} viewBox="0 0 24 24" fill={gold} aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M12 22c4.2 0 7-2.8 7-6.6 0-2.7-1.5-4.8-3-6.6-1.4-1.6-2.7-3.1-3-5.3-.1-.6-.7-.7-1-.2-1.1 1.5-1.6 3.2-1.5 4.9C8.4 7 7.4 6 6.8 4.9c-.3-.5-.9-.4-1 .1C5.3 7.2 5 9.4 5 11.5 5 17.9 7.8 22 12 22z" />
            </svg>
          );
          return !isOpen ? (
            <button
              type="button"
              onClick={onTap}
              aria-label={`Energy ${remaining} of ${DAILY_FREE}. Day streak ${streak}.`}
              style={{
                alignSelf: "center",
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4.5px 9px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.5)",
                border: `1px solid ${barTint}40`,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {boltSvg(9, barTint)}
              <span style={{ position: "relative", width: 30, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.14)", overflow: "hidden" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: Math.max(3, 30 * fraction),
                    borderRadius: 999,
                    background: barTint,
                    transition: "width 0.6s ease",
                  }}
                />
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                {flameSvg(8)}
                <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 9, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                  {streak}
                </span>
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onTap}
              aria-label={isEmpty ? `Energy empty. Refills at midnight. Day streak ${streak}.` : `Energy ${remaining} of ${DAILY_FREE}. Day streak ${streak}.`}
              style={{
                pointerEvents: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 7,
                width: "100%",
                padding: `${energyDetail ? 9 : 7}px 12px`,
                borderRadius: 14,
                background: "rgba(0,0,0,0.55)",
                border: `1px solid ${barTint}${isLow ? "99" : "4D"}`,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 9, width: "100%" }}>
                {isEmpty ? moonSvg : boltSvg(11, barTint)}
                {isEmpty ? (
                  <span style={{ flex: 1, color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    ENERGY REFILLS AT MIDNIGHT
                  </span>
                ) : (
                  <span style={{ flex: 1, position: "relative", height: 7, borderRadius: 999, background: "rgba(255,255,255,0.12)", overflow: "visible" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${Math.max(4, fraction * 100)}%`,
                        borderRadius: 999,
                        background: `linear-gradient(90deg, ${barTint}BF, ${barTint})`,
                        boxShadow: `0 0 4px ${barTint}99`,
                        transition: "width 0.6s ease",
                      }}
                    />
                  </span>
                )}
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  {flameSvg(10)}
                  <span style={{ color: "#fff", fontSize: 11, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                    {streak}
                  </span>
                </span>
              </span>
              {energyDetail && (
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, width: "100%" }}>
                  {detailText}
                </span>
              )}
            </button>
          );
        })()}

        {/* ONE banner slot — a transient nudge takes priority, then the
            in-reach catch banner. Two messages never stack. */}
        <AnimatePresence>
          {nudge ? (
            <motion.div
              key="map-nudge"
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -24, opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 320 }}
              style={{
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 16,
                background: "rgba(16,16,24,0.78)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: `1.2px solid ${nudge.tint}B3`,
                boxShadow: `0 0 18px ${nudge.tint}66`,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: `${nudge.tint}38`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {/* Walking figure — the app's "figure.walk" glyph */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="13" cy="4" r="2" fill="#fff" stroke="none" />
                  <path d="M13 7l-2 5 3 3v6M11 12l-3 2-2 4M14 10l3 2 3 1" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {nudge.title}
                </div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                  {nudge.subtitle}
                </div>
              </div>
              {/* Trailing context glyph — the app's pawprint, tinted to the nudge */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill={nudge.tint} aria-hidden="true" style={{ flexShrink: 0 }}>
                <ellipse cx="7" cy="8" rx="2" ry="2.6" />
                <ellipse cx="12" cy="6.4" rx="2" ry="2.7" />
                <ellipse cx="17" cy="8" rx="2" ry="2.6" />
                <path d="M12 11c-3 0-5.6 2.2-5.6 4.9 0 1.7 1.3 2.8 3 2.8 1 0 1.8-.4 2.6-.4s1.6.4 2.6.4c1.7 0 3-1.1 3-2.8C17.6 13.2 15 11 12 11z" />
              </svg>
            </motion.div>
          ) : inReachSpawn ? (
            <motion.button
              key={`in-reach-${inReachSpawn.id}`}
              type="button"
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -24, opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 320 }}
              onClick={() => tapCatchable(inReachSpawn)}
              style={{
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 16,
                background: "rgba(16,16,24,0.78)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: `1.2px solid ${(inReachSpawn.tier_color || "#00FF88")}B3`,
                boxShadow: `0 0 18px ${(inReachSpawn.tier_color || "#00FF88")}73`,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                width: "100%",
              }}
            >
              <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: `${inReachSpawn.tier_color || "#00FF88"}40`,
                    animation: "mmBannerShimmer 1s ease-in-out infinite",
                  }}
                />
                {(() => {
                  const art = resolveByCreatureId(inReachSpawn.creature_id, {
                    name: inReachSpawn.name,
                    tier: inReachSpawn.tier,
                    imageCid: inReachSpawn.image_url,
                  });
                  const src = art.floating || art.card || inReachSpawn.image_url;
                  return src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt=""
                      style={{
                        position: "relative",
                        width: 38,
                        height: 38,
                        objectFit: "contain",
                        filter: `drop-shadow(0 0 8px ${inReachSpawn.tier_color || "#00FF88"})`,
                      }}
                    />
                  ) : null;
                })()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 900 }}>
                  A {TIER_LABELS[inReachSpawn.tier] ?? inReachSpawn.tier} is in reach
                </div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                  Tap to catch {inReachSpawn.name}
                </div>
              </div>
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M1 1l6 6-6 6" stroke={inReachSpawn.tier_color || "#00FF88"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      {/* ========== MAP MENU FAN ========== */}
      {/* The single map menu, fanned open over a light scrim — label capsule
          + circular icon rows, entering with a soft stagger. */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="map-menu-fan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMenuOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 55,
              background: "rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "calc(max(env(safe-area-inset-top, 0px), 10px) + 56px)",
                right: 16,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 10,
              }}
            >
              {/* Same three rows as the app's MapMenuFan: Pulse (pink,
                  bolt.heart.fill), Invite & Earn (gold, person.2.fill),
                  Quests (green, list.bullet.clipboard.fill) — wired to the
                  web homes of those hubs. */}
              {([
                {
                  label: "Pulse",
                  tint: "#ff738c",
                  href: "/live",
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 21C12 21 4 15.3 4 9.8 4 7 6.2 5 8.5 5 10 5 11.3 5.8 12 7c.7-1.2 2-2 3.5-2C17.8 5 20 7 20 9.8 20 15.3 12 21 12 21Z" fill="#ff738c" />
                      <path d="M13 8.2 10.2 12.4h1.9l-1 3.6 3.7-4.8h-1.9l1-3z" fill="#0e0e14" />
                    </svg>
                  ),
                },
                {
                  label: "Invite & Earn",
                  tint: "#ffd166",
                  href: "/friends",
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#ffd166" aria-hidden="true">
                      <circle cx="16.2" cy="8.6" r="2.6" opacity="0.6" />
                      <path d="M13.4 19.5c.3-2.8 1.9-4.5 4-4.9 1.9.3 3.6 1.8 3.6 4.2 0 .4-.3.7-.7.7h-6.9Z" opacity="0.6" />
                      <circle cx="9" cy="8" r="3.1" />
                      <path d="M3.2 19.6c0-3.2 2.6-5.1 5.8-5.1s5.8 1.9 5.8 5.1c0 .5-.4.9-.9.9H4.1c-.5 0-.9-.4-.9-.9Z" />
                    </svg>
                  ),
                },
                {
                  label: "Quests",
                  tint: "#00FF88",
                  href: "/missions",
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="4.5" y="3.8" width="15" height="18" rx="2.4" fill="#00FF88" />
                      <rect x="8.6" y="2" width="6.8" height="3.6" rx="1.3" fill="#00FF88" stroke="#0e0e14" strokeWidth="1" />
                      <circle cx="8.3" cy="10.2" r="1" fill="#0e0e14" />
                      <rect x="10.4" y="9.5" width="5.8" height="1.4" rx="0.7" fill="#0e0e14" />
                      <circle cx="8.3" cy="14" r="1" fill="#0e0e14" />
                      <rect x="10.4" y="13.3" width="5.8" height="1.4" rx="0.7" fill="#0e0e14" />
                      <circle cx="8.3" cy="17.8" r="1" fill="#0e0e14" />
                      <rect x="10.4" y="17.1" width="5.8" height="1.4" rx="0.7" fill="#0e0e14" />
                    </svg>
                  ),
                },
              ] as const).map((row, i) => (
                <motion.button
                  key={row.label}
                  type="button"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, type: "spring", damping: 22, stiffness: 300 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    router.push(row.href);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.4))",
                  }}
                >
                  <span
                    style={{
                      padding: "7px 12px",
                      borderRadius: 999,
                      background: "rgba(0,0,0,0.7)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 900,
                    }}
                  >
                    {row.label}
                  </span>
                  <span
                    style={{
                      position: "relative",
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "rgba(14,14,20,0.75)",
                      backdropFilter: "blur(24px)",
                      WebkitBackdropFilter: "blur(24px)",
                      border: `1px solid ${row.tint}8C`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {row.icon}
                    {row.href === "/missions" && (playerStats?.unclaimedCatches ?? 0) > 0 && (
                      <span
                        aria-hidden
                        style={{
                          position: "absolute",
                          top: -1,
                          right: -1,
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: row.tint,
                          boxShadow: "0 0 0 2px #0a0a0f",
                        }}
                      />
                    )}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== MYTHIC EDGE PULSE ========== */}
      {/* Screen-edge pink vignette when a mythic is within 100m. */}
      {mythicNear && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 12,
            pointerEvents: "none",
            background: "radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(255,138,224,0.18) 78%, rgba(255,138,224,0.34) 100%)",
            animation: "mmMythicEdge 2.4s ease-in-out infinite",
          }}
        />
      )}

      {/* Spawn notifier — silent side effect component */}
      <SpawnNotifier spawns={notifySpawns} enabled={notifPermission === "granted"} />

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
              }}
              mapRef={leafletMapRef}
              players={players}
              wildSpawns={wildSpawns}
              catchableSpawns={catchableSpawns}
              watchers={watchers}
              recentCatches={recentCatchesList}
              onSelectPlayer={(p) => setSelectedPlayer(p)}
              onSelectWildSpawn={(s) => setSelectedWild(s)}
              onSelectCatchable={tapCatchable}
              onPanState={setPanState}
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
              bottom: `calc(${NAV_H + 210}px + env(safe-area-inset-bottom, 0px))`,
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

        {/* ---- Nearby watchers pill (app: NearbyTrainersPill) ---- */}
        {(watchers.length > 0 || recentCatchesList.length > 0) && (
          <div
            style={{
              position: "absolute",
              top: "calc(max(env(safe-area-inset-top, 0px), 10px) + 112px)",
              left: 16,
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
                gap: 7,
                padding: "7px 11px",
                borderRadius: 999,
                background: "rgba(16,16,24,0.6)",
                border: "1px solid rgba(0,255,136,0.4)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              <span style={{ position: "relative", display: "flex" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                  <circle cx="9" cy="8" r="3.4" />
                  <path d="M2.5 19c0-3.3 2.9-5.4 6.5-5.4s6.5 2.1 6.5 5.4z" />
                  <circle cx="17" cy="8.5" r="2.6" opacity="0.7" />
                  <path d="M14.8 13.4c2.9 0.2 5.7 2 5.7 4.8h-4" opacity="0.7" />
                </svg>
                {watchers.length > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      right: -3,
                      top: -3,
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#00FF88",
                      animation: "mmLiveDot 1.1s ease-in-out infinite",
                    }}
                  />
                )}
              </span>
              <span>
                {watchers.length > 0 ? `${watchers.length} live` : ""}
                {watchers.length > 0 && recentCatchesList.length > 0 ? " · " : ""}
                {recentCatchesList.length > 0
                  ? `${recentCatchesList.length} recent catch${recentCatchesList.length !== 1 ? "es" : ""}`
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

      </div>

      {/* ========== BOTTOM DOCK + NEARBY TRAY ========== */}
      {/* App-identical bottom stack: the Recenter control (when panned away)
          and the hero LENS button float right, above the Nearby tray, clear
          of the tab bar. */}
      <div
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: `calc(${NAV_H}px + env(safe-area-inset-bottom, 0px))`,
          zIndex: 30,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxWidth: 520,
          margin: "0 auto",
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, pointerEvents: "auto" }}>
            {/* Recenter — fades in when the user pans away; the arrow points
                back toward them. */}
            <AnimatePresence>
              {panState?.away && !nearbyExpanded && (
                <motion.button
                  key="recenter"
                  type="button"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: "spring", damping: 22, stiffness: 300 }}
                  onClick={() => {
                    const fn = leafletMapRef.current?._mmRecenter;
                    if (typeof fn === "function") fn();
                    else if (position) {
                      leafletMapRef.current?.easeTo?.({ center: [position.lng, position.lat], zoom: 16.2, pitch: 55, bearing: 0, duration: 800 });
                    }
                    setPanState(null);
                  }}
                  aria-label="Recenter on me"
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ position: "relative", width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        background: "rgba(0,255,136,0.18)",
                        animation: "mmRecenterPing 1.4s ease-out infinite",
                      }}
                    />
                    <span
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        background: "rgba(16,16,24,0.6)",
                        backdropFilter: "blur(24px)",
                        WebkitBackdropFilter: "blur(24px)",
                        border: "1.2px solid rgba(0,255,136,0.7)",
                        boxShadow: "0 0 14px rgba(0,255,136,0.55)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="#00FF88"
                        aria-hidden="true"
                        style={{
                          transform: `rotate(${panState.bearingRad}rad)`,
                          transition: "transform 0.5s ease",
                        }}
                      >
                        <path d="M12 2l7 20-7-5-7 5z" />
                      </svg>
                    </span>
                  </span>
                  {panState.distanceM >= 1 && (
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: "rgba(16,16,24,0.6)",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        border: "0.8px solid rgba(0,255,136,0.5)",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: "0.06em",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatDistance(panState.distanceM)}
                    </span>
                  )}
                </motion.button>
              )}
            </AnimatePresence>

            {/* The hero LENS button — opens the AR camera that reveals the
                creatures around you. Badge counts what is standing in reach. */}
            {!nearbyExpanded && (
              <button
                type="button"
                onClick={() => {
                  if (!cameraGranted) {
                    handleCameraRequest();
                    return;
                  }
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
                aria-label={cameraGranted ? "Open the Lens camera" : "Enable camera"}
                style={{
                  position: "relative",
                  width: 76,
                  height: 76,
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "inherit",
                  filter: "drop-shadow(0 0 14px rgba(0,255,136,0.45))",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: "rgba(0,255,136,0.20)",
                    animation: "mmLensBreathe 1.6s ease-in-out infinite",
                  }}
                />
                <span
                  style={{
                    position: "relative",
                    width: 62,
                    height: 62,
                    borderRadius: "50%",
                    background: "rgba(10,10,16,0.72)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    border: "1.6px solid rgba(0,255,136,0.85)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                  }}
                >
                  {/* camera.viewfinder */}
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
                    <path d="M9 9.5A1.5 1.5 0 0110.5 8h3A1.5 1.5 0 0115 9.5" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                  <span style={{ color: "#fff", fontSize: 8, fontWeight: 900, letterSpacing: "0.175em" }}>LENS</span>
                </span>
                {lensBadgeCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: "#00FF88",
                      border: "1px solid rgba(0,0,0,0.4)",
                      color: "#000",
                      fontSize: 11,
                      fontWeight: 900,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {lensBadgeCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ---- Nearby tray — floating card, rounded on ALL corners ---- */}
        <div
          style={{
            pointerEvents: "auto",
            width: "100%",
            borderRadius: 24,
            background: "rgba(0,0,0,0.82)",
            border: "0.5px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
            overflow: "hidden",
          }}
        >
          {/* Drag handle */}
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 9, paddingBottom: 8 }}>
            <div style={{ width: 40, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.3)" }} />
          </div>

          {/* Header — tap toggles the expanded list */}
          <button
            type="button"
            onClick={() => setNearbyExpanded((v) => !v)}
            aria-expanded={nearbyExpanded}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              padding: `0 16px ${nearbyExpanded ? 8 : 14}px`,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              textAlign: "left",
            }}
          >
            {/* Lead icon — the brand orb, or the nearest creature */}
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                border: `1.5px solid ${(spawnsByDistance[0]?.tier_color || "#00FF88")}A6`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {orbsByDistance.length > 0 || spawnsByDistance.length === 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/brand/app/energy-orb-b.png" alt="" style={{ width: 36, height: 36, objectFit: "contain" }} />
              ) : (
                (() => {
                  const s = spawnsByDistance[0];
                  const art = resolveByCreatureId(s.creature_id, { name: s.name, tier: s.tier, imageCid: s.image_url });
                  const src = art.floating || art.card || s.image_url;
                  return src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" style={{ width: 36, height: 36, objectFit: "contain" }} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/brand/app/energy-orb-b.png" alt="" style={{ width: 36, height: 36, objectFit: "contain" }} />
                  );
                })()
              )}
            </span>

            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ color: "#fff", fontSize: 19, fontWeight: 900, letterSpacing: "-0.01em" }}>Nearby</span>
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {(() => {
                  const t = orbsByDistance.length;
                  const c = spawnsByDistance.length;
                  const p = players.length;
                  if (t === 0 && c === 0 && p === 0) return "Scanning the area…";
                  const parts: string[] = [];
                  if (t > 0) parts.push(`${t} treasure${t === 1 ? "" : "s"}`);
                  if (c > 0) parts.push(`${c} creature${c === 1 ? "" : "s"}`);
                  if (p > 0) parts.push(`${p} player${p === 1 ? "" : "s"}`);
                  return parts.join(" · ");
                })()}
              </span>
            </span>

            {orbsByDistance.length + spawnsByDistance.length + players.length > 0 && (
              <span
                style={{
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: "#00FF88",
                  color: "#000",
                  fontSize: 13,
                  fontWeight: 900,
                  boxShadow: "0 0 6px rgba(0,255,136,0.4)",
                  flexShrink: 0,
                }}
              >
                {orbsByDistance.length + spawnsByDistance.length + players.length}
              </span>
            )}

            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                border: "0.5px solid rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="12"
                height="8"
                viewBox="0 0 12 8"
                fill="none"
                aria-hidden="true"
                style={{ transform: nearbyExpanded ? "rotate(180deg)" : "none", transition: "transform 0.3s ease" }}
              >
                <path d="M1 7l5-5 5 5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>

          {/* Expandable list */}
          <AnimatePresence>
            {nearbyExpanded && (
              <motion.div
                key="nearby-list"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 26, stiffness: 300 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ height: 0.5, background: "rgba(255,255,255,0.08)", margin: "0 16px" }} />
                <div style={{ maxHeight: 300, overflowY: "auto", padding: "12px 14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {orbsByDistance.length === 0 && spawnsByDistance.length === 0 && players.length === 0 && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "28px 0" }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
                        <circle cx="12" cy="12" r="3.4" />
                      </svg>
                      <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600 }}>Scanning the streets…</span>
                    </div>
                  )}

                  {orbsByDistance.length > 0 && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 2 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00FF88" }} />
                        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 900, letterSpacing: "0.16em" }}>TREASURE</span>
                      </div>
                      {orbsByDistance.slice(0, 6).map((o) => {
                        const inReach = o.distance <= CLAIM_RADIUS_M;
                        const tint = "#00FF88";
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => {
                              setNearbyExpanded(false);
                              setSelectedOrb(o);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              width: "100%",
                              padding: 10,
                              borderRadius: 14,
                              background: "rgba(255,255,255,0.05)",
                              border: `1px solid ${inReach ? `${tint}99` : "rgba(255,255,255,0.07)"}`,
                              cursor: "pointer",
                              fontFamily: "inherit",
                              textAlign: "left",
                            }}
                          >
                            <span
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                background: "rgba(255,255,255,0.08)",
                                border: `1.2px solid ${tint}A6`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src="/brand/app/energy-orb-b.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />
                            </span>
                            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{ color: "#fff", fontSize: 14, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {o.amount} {o.currency}
                              </span>
                              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                Dropped by @{o.dropper_handle || o.dropper_name || "anon"}
                              </span>
                            </span>
                            {inReach ? (
                              <span style={{ padding: "3px 8px", borderRadius: 999, background: tint, color: "#000", fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", flexShrink: 0 }}>
                                GRAB
                              </span>
                            ) : (
                              <span style={{ color: tint, fontSize: 12, fontWeight: 900, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                                {formatDistance(o.distance)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </>
                  )}

                  {spawnsByDistance.length > 0 && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 2 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#88FF00" }} />
                        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 900, letterSpacing: "0.16em" }}>CREATURES</span>
                      </div>
                      {spawnsByDistance.map((s) => {
                        const tint = s.tier_color || "#00FF88";
                        const art = resolveByCreatureId(s.creature_id, { name: s.name, tier: s.tier, imageCid: s.image_url });
                        const src = art.floating || art.card || s.image_url;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setNearbyExpanded(false);
                              tapCatchable(s);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              width: "100%",
                              padding: 10,
                              borderRadius: 14,
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.07)",
                              cursor: "pointer",
                              fontFamily: "inherit",
                              textAlign: "left",
                            }}
                          >
                            <span
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                background: "rgba(255,255,255,0.08)",
                                border: `1.2px solid ${tint}B3`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                overflow: "hidden",
                              }}
                            >
                              {src ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={src} alt="" style={{ width: 34, height: 34, objectFit: "contain" }} />
                              ) : null}
                            </span>
                            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{ color: "#fff", fontSize: 14, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {s.name}
                              </span>
                              <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: tint }}>
                                {(TIER_LABELS[s.tier] ?? s.tier).toUpperCase()}
                              </span>
                            </span>
                            <span style={{ color: s.distanceM <= CATCH_PROXIMITY_M ? tint : "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 900, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                              {s.distanceM <= CATCH_PROXIMITY_M ? "IN REACH" : formatDistance(s.distanceM)}
                            </span>
                          </button>
                        );
                      })}
                    </>
                  )}

                  {players.length > 0 && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 2 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ffd166" }} />
                        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 900, letterSpacing: "0.16em" }}>PLAYERS</span>
                      </div>
                      {players.map((p) => (
                        <button
                          key={p.user_id}
                          type="button"
                          onClick={() => {
                            setNearbyExpanded(false);
                            setSelectedPlayer(p);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            width: "100%",
                            padding: 10,
                            borderRadius: 14,
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            textAlign: "left",
                          }}
                        >
                          <UserAvatar profilePicUrl={p.avatar_url} handle={p.handle || "anon"} size={36} />
                          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ color: "#fff", fontSize: 14, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              @{p.handle || "anon"}
                            </span>
                            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600 }}>
                              {p.is_friend ? "Friend · " : ""}around here (~{p.fuzzy_radius_m}m)
                            </span>
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
            // Reflect the reward in the HUD balance right away.
            if (typeof json.blinkRewarded === "number") {
              setBlinkBalance((p) => (p ?? 0) + json.blinkRewarded);
            }
            // Drop the caught spawn from the map immediately.
            void fetchCatchableSpawns();
            // A catch spent energy — peek the bar so the drain reads, then
            // settle back to quiet (app: onChange of energyRemaining).
            void fetchPlayerStats();
            setEnergyExpanded(true);
            scheduleEnergyQuiet(3000);
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
              // Reflect the reward in the HUD balance right away.
              if (typeof json.blinkRewarded === "number") {
                setBlinkBalance((p) => (p ?? 0) + json.blinkRewarded);
              }
              void fetchCatchableSpawns();
              // A catch spent energy — peek the bar so the drain reads, then
              // settle back to quiet (app: onChange of energyRemaining).
              void fetchPlayerStats();
              setEnergyExpanded(true);
              scheduleEnergyQuiet(3000);
              return json as CatchResult;
            }}
            onDismiss={() => {
              setCinematicOpen(false);
              setSelectedCatchable(null);
            }}
            onShare={(result) => {
              const text = `Just caught ${result.name} on @blinkworldeth and earned ${result.blinkRewarded.toLocaleString()} $BLINK tokens!\n\nReal crypto. Real NFTs. Real money.\n\nhttps://blinkworld.xyz`;
              if (navigator.share) navigator.share({ text }).catch(() => {});
              else navigator.clipboard.writeText(text).catch(() => {});
            }}
          />
        )}
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
