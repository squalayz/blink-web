"use client";

import { useEffect, useRef } from "react";

export interface NearbySpawn {
  id: string;
  name: string;
  tier: string;
  distanceM: number;
}

interface SpawnNotifierProps {
  spawns: NearbySpawn[];
  enabled: boolean;
}

const NOTIFY_TIERS = ["rare", "legendary", "mythic"];
const NOTIFY_RADIUS_M = 500;
// Only notify once per spawn ID per session
const notifiedIds = new Set<string>();

export function SpawnNotifier({ spawns, enabled }: SpawnNotifierProps) {
  const permissionRef = useRef<NotificationPermission>("default");

  useEffect(() => {
    if (!enabled || typeof Notification === "undefined") return;
    permissionRef.current = Notification.permission;
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    for (const spawn of spawns) {
      if (notifiedIds.has(spawn.id)) continue;
      if (spawn.distanceM > NOTIFY_RADIUS_M) continue;
      if (!NOTIFY_TIERS.includes(spawn.tier.toLowerCase())) continue;

      notifiedIds.add(spawn.id);

      const dist = spawn.distanceM < 1000
        ? `${Math.round(spawn.distanceM)}m away`
        : `${(spawn.distanceM / 1000).toFixed(1)}km away`;

      const tierLabel = spawn.tier.charAt(0).toUpperCase() + spawn.tier.slice(1).toLowerCase();

      try {
        new Notification(`${tierLabel} ${spawn.name} spotted`, {
          body: `A wild ${spawn.name} is ${dist}. Open BLINK to catch it.`,
          icon: "/icon-192.png",
          badge: "/icon-72.png",
          tag: `spawn-${spawn.id}`,
          requireInteraction: spawn.tier.toLowerCase() === "mythic",
        });
      } catch {
        // Notification failed silently — not critical
      }
    }
  }, [spawns, enabled]);

  return null; // purely a side-effect component
}

// Hook to request notification permission
export function useNotificationPermission() {
  const request = async (): Promise<boolean> => {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  };
  return {
    permission: typeof Notification !== "undefined" ? Notification.permission : "denied",
    request,
  };
}
