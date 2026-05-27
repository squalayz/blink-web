"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { NearbyPlayer, WildSpawn } from "@/components/HuntMap";

const HEARTBEAT_MS = 60_000;
const NEARBY_REFRESH_MS = 30_000;
const SPAWNS_REFRESH_MS = 30_000;
const NEARBY_RADIUS_M = 5000;

interface PresenceState {
  players: NearbyPlayer[];
  wildSpawns: WildSpawn[];
}

export function usePresence(userPosition: { lat: number; lng: number } | null): PresenceState {
  const [players, setPlayers] = useState<NearbyPlayer[]>([]);
  const [wildSpawns, setWildSpawns] = useState<WildSpawn[]>([]);
  const tokenRef = useRef<string | null>(null);

  // Always keep the latest token cached so the timers don't re-subscribe per
  // refresh tick.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      tokenRef.current = session?.access_token ?? null;
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      tokenRef.current = session?.access_token ?? null;
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Heartbeat: send fuzzy position to server every minute.
  useEffect(() => {
    if (!userPosition) return;
    let cancelled = false;
    const send = async () => {
      const token = tokenRef.current;
      if (!token) return;
      try {
        await fetch("/api/presence/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lat: userPosition.lat, lng: userPosition.lng }),
        });
      } catch {
        /* ignore */
      }
    };
    send();
    const id = setInterval(send, HEARTBEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [userPosition?.lat, userPosition?.lng]);

  // Nearby players poll (Supabase Realtime presence would be ideal — for v1 we
  // use a 15s polling loop so the map updates without depending on Realtime).
  useEffect(() => {
    if (!userPosition) return;
    let cancelled = false;
    const fetchNearby = async () => {
      const token = tokenRef.current;
      if (!token) return;
      try {
        const res = await fetch(
          `/api/presence/nearby?lat=${userPosition.lat}&lng=${userPosition.lng}&radius_m=${NEARBY_RADIUS_M}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setPlayers((json.players ?? []) as NearbyPlayer[]);
      } catch {
        /* ignore */
      }
    };
    fetchNearby();
    const id = setInterval(fetchNearby, NEARBY_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [userPosition?.lat, userPosition?.lng]);

  // Wild creature spawns poll.
  useEffect(() => {
    if (!userPosition) return;
    let cancelled = false;
    const fetchSpawns = async () => {
      const token = tokenRef.current;
      if (!token) return;
      try {
        const res = await fetch(
          `/api/creatures/nearby?lat=${userPosition.lat}&lng=${userPosition.lng}&radius_m=${NEARBY_RADIUS_M}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setWildSpawns((json.spawns ?? []) as WildSpawn[]);
      } catch {
        /* ignore */
      }
    };
    fetchSpawns();
    const id = setInterval(fetchSpawns, SPAWNS_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [userPosition?.lat, userPosition?.lng]);

  return { players, wildSpawns };
}
