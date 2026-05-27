"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CatchableSpawn } from "@/components/HuntMap";

interface MinimapRadarProps {
  userPosition: { lat: number; lng: number } | null;
  heading: number | null;
  spawns: CatchableSpawn[];
  activeSpawnId: string | null;
  onTapSpawn: (spawn: CatchableSpawn) => void;
}

const RADAR_DIAMETER_PX = 110;
const RADAR_RADIUS_PX = 50;
const RADAR_RANGE_M = 250;
const TAP_TARGET_PX = 24;
const NEON = "#00FF88";
const GOLD = "#FFD24A";

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

function bearingDeg(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLng = toRad(lng2 - lng1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);
  const y = Math.sin(dLng) * Math.cos(rLat2);
  const x =
    Math.cos(rLat1) * Math.sin(rLat2) -
    Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export default function MinimapRadar({
  userPosition,
  heading,
  spawns,
  activeSpawnId,
  onTapSpawn,
}: MinimapRadarProps) {
  // Unwrapped, continuous heading so CSS rotation transitions take the short
  // path across the 0/360 boundary instead of spinning a full revolution.
  const [smoothHeading, setSmoothHeading] = useState(0);
  const prevRawRef = useRef<number | null>(null);

  useEffect(() => {
    if (heading === null) return;
    const prev = prevRawRef.current;
    if (prev === null) {
      prevRawRef.current = heading;
      setSmoothHeading(heading);
      return;
    }
    let delta = heading - prev;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    prevRawRef.current = heading;
    setSmoothHeading((s) => s + delta);
  }, [heading]);

  const hasHeading = heading !== null;
  const rotationDeg = hasHeading ? smoothHeading : 0;

  // Plot each spawn in north-up coordinates. The world layer rotates by
  // -heading so the user's current facing lands at the top of the radar.
  const dots = useMemo(() => {
    if (!userPosition) return [] as Array<{
      spawn: CatchableSpawn;
      x: number;
      y: number;
      distance: number;
    }>;
    return spawns.map((spawn) => {
      const distance = haversineMeters(
        userPosition.lat,
        userPosition.lng,
        spawn.lat,
        spawn.lng,
      );
      const bearing = bearingDeg(
        userPosition.lat,
        userPosition.lng,
        spawn.lat,
        spawn.lng,
      );
      const rad = (bearing * Math.PI) / 180;
      const r = Math.min(distance / RADAR_RANGE_M, 1) * RADAR_RADIUS_PX;
      const x = Math.sin(rad) * r;
      const y = -Math.cos(rad) * r;
      return { spawn, x, y, distance };
    });
  }, [userPosition, spawns]);

  const isEmpty = dots.length === 0;
  const rotateTransition = "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <div
      role="region"
      aria-label="Creature radar"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onPointerCancel={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
        left: 16,
        width: RADAR_DIAMETER_PX,
        height: RADAR_DIAMETER_PX,
        zIndex: 55,
        borderRadius: "50%",
        border: `2px solid ${NEON}`,
        background: "rgba(10,10,15,0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow:
          "0 0 12px rgba(0,255,136,0.35), inset 0 0 14px rgba(0,255,136,0.08)",
        overflow: "hidden",
        pointerEvents: "auto",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <style>{`
        @keyframes radarPlayerHalo { 0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 0.95; transform: translate(-50%, -50%) scale(1.22); } }
        @keyframes radarGenesisPulse { 0%, 100% { box-shadow: 0 0 4px 1px ${GOLD}, 0 0 8px 2px rgba(255,210,74,0.55); } 50% { box-shadow: 0 0 10px 3px ${GOLD}, 0 0 18px 6px rgba(255,210,74,0.75); } }
      `}</style>

      {/* Heading wedge — soft gradient cone pointing UP, fixed in screen space. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 0,
          height: 0,
          transform: "translate(-50%, -100%)",
          borderLeft: "26px solid transparent",
          borderRight: "26px solid transparent",
          borderBottom: `52px solid ${NEON}`,
          opacity: 0.18,
          filter: "blur(1px)",
          pointerEvents: "none",
        }}
      />

      {/* World layer — rotated so current heading lands at top. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `rotate(${-rotationDeg}deg)`,
          transformOrigin: "50% 50%",
          transition: rotateTransition,
          willChange: "transform",
        }}
      >
        {/* Cardinal N marker — placed at North in world coordinates. The world
            layer rotation places it at whichever screen position corresponds to
            magnetic north; the inverse rotation keeps the glyph upright. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 5,
            left: "50%",
            transform: `translate(-50%, 0) rotate(${rotationDeg}deg)`,
            color: "#fff",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.1em",
            opacity: 0.8,
            textShadow: "0 0 4px rgba(0,0,0,0.7)",
            pointerEvents: "none",
            transition: rotateTransition,
          }}
        >
          N
        </div>

        {dots.map(({ spawn, x, y, distance }) => {
          const color = spawn.tier_color || NEON;
          const isGenesis = !!spawn.is_genesis;
          const isActive = spawn.id === activeSpawnId;
          const clamped = distance > RADAR_RANGE_M;
          return (
            <button
              key={spawn.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTapSpawn(spawn);
              }}
              aria-label={`Switch AR target to ${spawn.name}`}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: TAP_TARGET_PX,
                height: TAP_TARGET_PX,
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                background: "transparent",
                border: "none",
                padding: 0,
                margin: 0,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "auto",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: isGenesis ? GOLD : color,
                  border: isActive
                    ? `1.5px solid ${NEON}`
                    : `1px solid ${isGenesis ? GOLD : color}`,
                  boxShadow: isActive
                    ? `0 0 12px ${NEON}, 0 0 4px 1px ${NEON}`
                    : isGenesis
                      ? undefined
                      : `0 0 6px 1px ${color}99`,
                  animation: isGenesis
                    ? "radarGenesisPulse 1.6s ease-in-out infinite"
                    : undefined,
                  opacity: clamped ? 0.85 : 1,
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Player halo — soft neon ring that pulses around the player dot. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `1px solid ${NEON}88`,
          transform: "translate(-50%, -50%)",
          animation: "radarPlayerHalo 2s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Player dot — white core, fixed at the visual center of the radar. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#fff",
          transform: "translate(-50%, -50%)",
          boxShadow: `0 0 6px ${NEON}, 0 0 2px ${NEON}`,
          pointerEvents: "none",
        }}
      />

      {/* Status caption inside the frame. */}
      {(isEmpty || !hasHeading) && (
        <div
          aria-live="polite"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 7,
            textAlign: "center",
            color: "rgba(255,255,255,0.78)",
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            pointerEvents: "none",
            textShadow: "0 0 4px rgba(0,0,0,0.75)",
          }}
        >
          {isEmpty
            ? "No creatures nearby"
            : "Calibrate"}
        </div>
      )}
    </div>
  );
}
