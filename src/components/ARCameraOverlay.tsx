"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { CatchableSpawn } from "@/components/HuntMap";
import { resolveCreatureArt } from "@/lib/bestiary-art";
import { sounds } from "@/lib/sounds";
import CreatureVisual, {
  type CreatureVisualState,
} from "@/components/ar/CreatureVisual";
import CaptureOrb, { type CaptureOrbPhase } from "@/components/ar/CaptureOrb";
import ParticleField, { type ParticleMode } from "@/components/ar/ParticleField";
import CatchResult, { type ARCatchResult } from "@/components/ar/CatchResult";

// ── Public surface ─────────────────────────────────────────────────────────
// The parent owns the catch API call but the AR overlay now owns the full
// throw + capture + reveal sequence. `onCatch` must return the mint result
// (or an { error } shape) so the overlay can branch between success / escape.
interface ARCameraOverlayProps {
  spawn: CatchableSpawn | null;
  onClose: () => void;
  onCatch: () => Promise<ARCatchResult | { error: string }>;
  userPosition: { lat: number; lng: number } | null;
}

// ── Distance helpers ───────────────────────────────────────────────────────
// Mirrors the server-side proximity gate so the throw button is locked out
// before the network ever hears about it.
const PROXIMITY_M = 50;

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ── Finite-state machine ──────────────────────────────────────────────────
//
// materializing → idle → aimed → thrown → captured → shaking → success
//                                              ↘ failed (escape) → idle
//
// Mint API fires on THROW so the network round-trip overlaps with the
// 0.8s throw + 1.2s shake. The shake phase awaits the API result before
// advancing to success/failed.
type FsmKind =
  | "materializing"
  | "idle"
  | "aimed"
  | "thrown"
  | "captured"
  | "shaking"
  | "success"
  | "failed";

interface FsmState {
  kind: FsmKind;
  result: ARCatchResult | null;
  error: string | null;
}

type FsmAction =
  | { type: "MATERIALIZED" }
  | { type: "AIM" }
  | { type: "RELEASE" }
  | { type: "THROW" }
  | { type: "HIT" }
  | { type: "SHAKE_BEGIN" }
  | { type: "MINT_SUCCESS"; result: ARCatchResult }
  | { type: "MINT_FAIL"; error: string }
  | { type: "RESET_AFTER_FAIL" }
  | { type: "RESET" };

function fsmReducer(state: FsmState, action: FsmAction): FsmState {
  switch (action.type) {
    case "MATERIALIZED":
      return state.kind === "materializing" ? { ...state, kind: "idle" } : state;
    case "AIM":
      return state.kind === "idle" ? { ...state, kind: "aimed" } : state;
    case "RELEASE":
      return state.kind === "aimed" ? { ...state, kind: "idle" } : state;
    case "THROW":
      if (state.kind === "idle" || state.kind === "aimed") {
        return { ...state, kind: "thrown", error: null };
      }
      return state;
    case "HIT":
      return state.kind === "thrown" ? { ...state, kind: "captured" } : state;
    case "SHAKE_BEGIN":
      return state.kind === "captured" ? { ...state, kind: "shaking" } : state;
    case "MINT_SUCCESS":
      return { ...state, kind: "success", result: action.result, error: null };
    case "MINT_FAIL":
      return { ...state, kind: "failed", result: null, error: action.error };
    case "RESET_AFTER_FAIL":
      return { kind: "idle", result: null, error: null };
    case "RESET":
      return { kind: "materializing", result: null, error: null };
    default:
      return state;
  }
}

const INITIAL_FSM: FsmState = { kind: "materializing", result: null, error: null };

// Swipe gesture threshold — pointer must travel at least this many px upward
// AND release within MAX_SWIPE_MS for it to count as a throw.
const SWIPE_MIN_DY = 80;
const MAX_SWIPE_MS = 700;

export default function ARCameraOverlay({
  spawn,
  onClose,
  onCatch,
  userPosition,
}: ARCameraOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [fsm, dispatch] = useReducer(fsmReducer, INITIAL_FSM);
  const fsmKindRef = useRef<FsmKind>("materializing");
  useEffect(() => {
    fsmKindRef.current = fsm.kind;
  }, [fsm.kind]);

  const [windowSize, setWindowSize] = useState({
    w: typeof window === "undefined" ? 0 : window.innerWidth,
    h: typeof window === "undefined" ? 0 : window.innerHeight,
  });

  // Distance from user → spawn (real, server-mirrored proximity check).
  const distanceM =
    userPosition && spawn
      ? haversineMeters(userPosition.lat, userPosition.lng, spawn.lat, spawn.lng)
      : null;
  const inRange = distanceM === null ? true : distanceM <= PROXIMITY_M;
  const proximity =
    distanceM === null
      ? 1
      : Math.max(0, Math.min(1, 1 - distanceM / (PROXIMITY_M * 2)));

  // ── Reset FSM whenever a new spawn opens ────────────────────────────────
  useEffect(() => {
    if (!spawn) return;
    dispatch({ type: "RESET" });
  }, [spawn?.id]);

  // ── Track viewport size for canvas centre ───────────────────────────────
  useEffect(() => {
    const onResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Start camera ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!spawn) return;
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Camera not supported in this browser. Try opening BLINK in Safari or Chrome on your phone.",
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setCameraReady(true);
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Camera blocked.";
        setCameraError(
          `Camera blocked. ${msg}. On iOS: Settings → Safari → Camera → Allow. On Android: tap the lock icon in the address bar → Permissions → Camera → Allow.`,
        );
      }
    }
    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCameraReady(false);
    };
  }, [spawn?.id]);

  // ── Materialize trigger — once camera is up + spawn ready, advance FSM ──
  useEffect(() => {
    if (!spawn || !cameraReady) return;
    if (fsm.kind !== "materializing") return;
    sounds.play("reveal");
    const t = setTimeout(() => dispatch({ type: "MATERIALIZED" }), 600);
    return () => clearTimeout(t);
  }, [spawn?.id, cameraReady, fsm.kind]);

  // ── Device orientation → parallax shift ─────────────────────────────────
  useEffect(() => {
    if (!spawn) return;
    let active = true;

    function handleOrientation(e: DeviceOrientationEvent) {
      if (!active) return;
      const beta = typeof e.beta === "number" ? e.beta : 0;
      const gamma = typeof e.gamma === "number" ? e.gamma : 0;
      const xOffset = Math.max(-30, Math.min(30, gamma * 0.7));
      const yOffset = Math.max(-30, Math.min(30, (beta - 70) * 0.5));
      setTilt({ x: xOffset, y: yOffset });
    }

    async function request() {
      const DOE = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<"granted" | "denied">;
      };
      if (typeof DOE.requestPermission === "function") {
        try {
          const perm = await DOE.requestPermission();
          if (perm === "granted") {
            window.addEventListener("deviceorientation", handleOrientation, true);
          }
        } catch {
          /* user dismissed — silent */
        }
      } else {
        window.addEventListener("deviceorientation", handleOrientation, true);
      }
    }
    request();

    return () => {
      active = false;
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [spawn?.id]);

  // ── Throw sequence orchestration ────────────────────────────────────────
  // Fires the API immediately on throw so the network call overlaps the
  // 0.8s arc + 1.2s shake; the shake awaits whichever resolves last.
  const mintPromiseRef = useRef<Promise<ARCatchResult | { error: string }> | null>(null);

  const fireThrow = useCallback(() => {
    if (fsmKindRef.current !== "idle" && fsmKindRef.current !== "aimed") return;
    if (!inRange) return;
    dispatch({ type: "THROW" });
    // Soft 'whoosh' = nearby sound; better than nothing until throw.mp3 exists.
    sounds.play("nearby");
    mintPromiseRef.current = onCatch();
  }, [inRange, onCatch]);

  // Throw → captured (after 800ms arc).
  useEffect(() => {
    if (fsm.kind !== "thrown") return;
    const t = setTimeout(() => dispatch({ type: "HIT" }), 800);
    return () => clearTimeout(t);
  }, [fsm.kind]);

  // Captured → shaking (after 220ms creature-suck).
  useEffect(() => {
    if (fsm.kind !== "captured") return;
    const t = setTimeout(() => dispatch({ type: "SHAKE_BEGIN" }), 220);
    return () => clearTimeout(t);
  }, [fsm.kind]);

  // Shaking → await mint result. Shake plays 1200ms; if mint is still pending
  // we keep the orb in 'shaking' state showing CONFIRMING ON CHAIN until the
  // promise resolves.
  useEffect(() => {
    if (fsm.kind !== "shaking") return;
    let cancelled = false;
    const shakeAnim = new Promise<void>((res) => setTimeout(res, 1200));
    const mint = mintPromiseRef.current ?? Promise.resolve({ error: "No mint promise" });
    Promise.all([shakeAnim, mint]).then(([, result]) => {
      if (cancelled) return;
      if (result && "error" in result) {
        dispatch({ type: "MINT_FAIL", error: result.error });
      } else if (result) {
        const r = result as ARCatchResult;
        // Play tier-appropriate catch sound.
        const t = (r.tier || "").toLowerCase();
        if (t === "mythic" || t === "legendary") sounds.play("catchMythic");
        else if (t === "rare") sounds.play("catchRare");
        else sounds.play("catchCommon");
        dispatch({ type: "MINT_SUCCESS", result: r });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fsm.kind]);

  // Failed → escape animation → reset to idle (creature briefly pops back).
  useEffect(() => {
    if (fsm.kind !== "failed") return;
    const t = setTimeout(() => {
      // After the escape, if the error was 'already caught' we just close;
      // anything else (RPC blip, fee error) we let the user try again.
      const err = fsm.error || "";
      const terminal = /already|expired|not found|too far/i.test(err);
      if (terminal) {
        onClose();
      } else {
        dispatch({ type: "RESET_AFTER_FAIL" });
      }
    }, 900);
    return () => clearTimeout(t);
  }, [fsm.kind, fsm.error, onClose]);

  // ── Swipe-up gesture detector ──────────────────────────────────────────
  // pointerdown captures the start time/y, pointermove updates a live ref,
  // pointerup decides: enough upward distance? quick enough? → throw.
  const pointerStartRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (fsmKindRef.current !== "idle") return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    dispatch({ type: "AIM" });
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = pointerStartRef.current;
      pointerStartRef.current = null;
      if (!start) {
        if (fsmKindRef.current === "aimed") dispatch({ type: "RELEASE" });
        return;
      }
      const dy = start.y - e.clientY; // positive = swiped upward
      const dt = performance.now() - start.t;
      if (dy >= SWIPE_MIN_DY && dt <= MAX_SWIPE_MS && inRange) {
        fireThrow();
      } else if (fsmKindRef.current === "aimed") {
        dispatch({ type: "RELEASE" });
      }
    },
    [fireThrow, inRange],
  );

  const onPointerCancel = useCallback(() => {
    pointerStartRef.current = null;
    if (fsmKindRef.current === "aimed") dispatch({ type: "RELEASE" });
  }, []);

  // ── Derive child props from FSM ────────────────────────────────────────
  const art = spawn ? resolveCreatureArt(spawn.name, spawn.tier, spawn.id) : null;
  const accent = spawn?.tier_color || art?.color || "#00FF88";

  // Map FSM → CreatureVisual state.
  const creatureState: CreatureVisualState = (() => {
    switch (fsm.kind) {
      case "materializing":
        return "materializing";
      case "idle":
        return "idle";
      case "aimed":
        return "aimed";
      case "thrown":
        return "thrown";
      case "captured":
      case "shaking":
        return fsm.kind === "shaking" ? "shaking" : "captured";
      case "success":
        return "success";
      case "failed":
        return "failed";
      default:
        return "idle";
    }
  })();

  // Map FSM → orb phase. Show 'locked' for a brief window inside the
  // success state via a transient flag (handled by a timer below).
  const [orbLocked, setOrbLocked] = useState(false);
  useEffect(() => {
    if (fsm.kind !== "success") return;
    setOrbLocked(true);
    const t = setTimeout(() => setOrbLocked(false), 560);
    return () => clearTimeout(t);
  }, [fsm.kind]);

  const orbPhase: CaptureOrbPhase = (() => {
    if (!cameraReady || cameraError) return "hidden";
    switch (fsm.kind) {
      case "materializing":
        return "hidden";
      case "idle":
      case "aimed":
        return inRange ? "ready" : "hidden";
      case "thrown":
        return "throwing";
      case "captured":
      case "shaking":
        return "shaking";
      case "success":
        return orbLocked ? "locked" : "hidden";
      case "failed":
        return "escaping";
      default:
        return "hidden";
    }
  })();

  // Map FSM → particle mode.
  const particleMode: ParticleMode = (() => {
    switch (fsm.kind) {
      case "materializing":
        return "materialize";
      case "idle":
      case "aimed":
        return "idle";
      case "thrown":
      case "captured":
        return "throwTrail";
      case "success":
        return orbLocked ? "lockBurst" : "off";
      default:
        return "off";
    }
  })();

  // Show the chain-confirming label while the API is still pending after
  // the shake animation has had time to play.
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (fsm.kind !== "shaking") {
      setConfirming(false);
      return;
    }
    const t = setTimeout(() => setConfirming(true), 1200);
    return () => clearTimeout(t);
  }, [fsm.kind]);

  if (!spawn) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`AR catch view of ${spawn.name}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0a0a0f",
        overflow: "hidden",
        touchAction: "none",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Local fade-in keyframe used by the top bar / labels. */}
      <style>{`
        @keyframes arFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes arSpin { to { transform: rotate(360deg); } }
        @keyframes arPulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
      `}</style>

      {/* ── Camera video feed ─────────────────────────────────────────── */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 1,
          background: "#0a0a0f",
        }}
      />

      {/* ── Atmospheric tint overlay ──────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          background: `radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(10,10,15,0.35) 80%), radial-gradient(circle at 50% 50%, ${accent}11 0%, transparent 60%)`,
          mixBlendMode: "screen",
        }}
      />

      {/* ── Loading state ─────────────────────────────────────────────── */}
      {!cameraReady && !cameraError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 16,
            color: "#cfd3dd",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              border: `3px solid ${accent}`,
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "arSpin 0.8s linear infinite",
            }}
          />
          <span style={{ fontSize: 13, opacity: 0.8 }}>Starting camera…</span>
        </div>
      )}

      {/* ── Error fallback ────────────────────────────────────────────── */}
      {cameraError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            padding: 32,
            textAlign: "center",
            color: "#fff",
            gap: 16,
            background:
              "radial-gradient(ellipse at top, rgba(10,10,15,0.6), rgba(10,10,15,0.96))",
          }}
        >
          <div
            aria-hidden
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: `2px solid ${accent}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            !
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
            {cameraError}
          </p>
          <button
            onClick={onClose}
            style={{
              marginTop: 8,
              padding: "10px 24px",
              borderRadius: 999,
              border: `1px solid ${accent}`,
              background: `${accent}22`,
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* ── Creature ──────────────────────────────────────────────────── */}
      {cameraReady && (
        <CreatureVisual
          spawn={spawn}
          state={creatureState}
          accent={accent}
          tilt={tilt}
          proximity={proximity}
        />
      )}

      {/* ── Particle field (canvas) ───────────────────────────────────── */}
      {cameraReady && (
        <ParticleField
          mode={particleMode}
          accent={accent}
          centerX={windowSize.w / 2 + tilt.x}
          centerY={windowSize.h / 2 + tilt.y}
        />
      )}

      {/* ── Capture orb (eye-orb) ─────────────────────────────────────── */}
      {cameraReady && (
        <CaptureOrb
          phase={orbPhase}
          showReadyHint={fsm.kind === "idle" && inRange}
          onTap={fireThrow}
        />
      )}

      {/* ── Top bar: name + close ─────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: "env(safe-area-inset-top, 0px)",
          left: 0,
          right: 0,
          zIndex: 60,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          background:
            "linear-gradient(180deg, rgba(10,10,15,0.65), rgba(10,10,15,0))",
          animation: "arFadeIn 0.4s ease-out",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 0,
          }}
        >
          <span
            style={{
              color: accent,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Wild · {spawn.tier}
          </span>
          <span
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "0.01em",
              textShadow: "0 1px 8px rgba(0,0,0,0.7)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {spawn.name}
          </span>
        </div>
        <button
          aria-label="Close AR camera"
          onClick={onClose}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(10,10,15,0.7)",
            color: "#fff",
            fontSize: 20,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            flexShrink: 0,
            pointerEvents: "auto",
          }}
        >
          ×
        </button>
      </div>

      {/* ── Bottom UI: distance + catch button ───────────────────────── */}
      {cameraReady && !cameraError && fsm.kind !== "success" && (
        <div
          style={{
            position: "absolute",
            bottom: "env(safe-area-inset-bottom, 0px)",
            left: 0,
            right: 0,
            zIndex: 30,
            padding: "20px 16px calc(28px + env(safe-area-inset-bottom, 0px))",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            pointerEvents: "none",
            background:
              "linear-gradient(0deg, rgba(10,10,15,0.85), rgba(10,10,15,0))",
            animation: "arFadeIn 0.4s ease-out 0.1s backwards",
          }}
        >
          {/* Distance hint shows when out of range OR as positive feedback. */}
          {!inRange && distanceM !== null && (
            <div
              style={{
                color: "#FFB347",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                background: "rgba(10,10,15,0.65)",
                border: "1px solid rgba(255,179,71,0.45)",
                borderRadius: 999,
                padding: "6px 14px",
                pointerEvents: "auto",
              }}
            >
              Get closer · {Math.round(distanceM)}m away
            </div>
          )}

          {/* Status pill during in-flight catches. */}
          {(fsm.kind === "thrown" ||
            fsm.kind === "captured" ||
            fsm.kind === "shaking") && (
            <div
              style={{
                color: "#00FF88",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                background: "rgba(10,10,15,0.75)",
                border: "1px solid rgba(0,255,136,0.45)",
                borderRadius: 999,
                padding: "6px 14px",
                animation: "arPulse 1.4s ease-in-out infinite",
                pointerEvents: "none",
              }}
            >
              {confirming ? "Confirming on chain…" : "Capturing…"}
            </div>
          )}

          {fsm.kind === "failed" && fsm.error && (
            <div
              style={{
                color: "#F87171",
                fontSize: 12,
                fontWeight: 700,
                background: "rgba(10,10,15,0.85)",
                border: "1px solid rgba(248,113,113,0.5)",
                borderRadius: 12,
                padding: "8px 14px",
                maxWidth: "78vw",
                textAlign: "center",
                pointerEvents: "auto",
              }}
            >
              {fsm.error}
            </div>
          )}

          {/* Tap-to-catch fallback (always available when in range + idle). */}
          {(fsm.kind === "idle" || fsm.kind === "aimed") && (
            <button
              onClick={fireThrow}
              disabled={!inRange}
              aria-label={`Catch ${spawn.name}`}
              style={{
                padding: "16px 56px",
                minWidth: 220,
                borderRadius: 999,
                border: `2px solid ${inRange ? accent : "rgba(255,255,255,0.25)"}`,
                background: inRange
                  ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
                  : "rgba(10,10,15,0.7)",
                color: inRange ? "#0a0a0f" : "rgba(255,255,255,0.55)",
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: inRange ? "pointer" : "not-allowed",
                opacity: inRange ? 1 : 0.6,
                pointerEvents: "auto",
                boxShadow: inRange
                  ? `0 0 18px ${accent}aa, 0 0 36px ${accent}55`
                  : "none",
              }}
            >
              {inRange ? "Catch" : "Out of range"}
            </button>
          )}
        </div>
      )}

      {/* ── Success card (post-mint) ─────────────────────────────────── */}
      {fsm.kind === "success" && fsm.result && !orbLocked && (
        <CatchResult
          result={fsm.result}
          accent={accent}
          onContinue={onClose}
        />
      )}
    </div>
  );
}
