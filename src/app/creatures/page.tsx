"use client";

// Creatures tab — the web mirror of the iOS app's MyCreaturesView.swift:
// "My Creatures" header with collected count, a glass stat strip
// (Collected / Day Streak / Rarest) over a rarity distribution bar, and a
// two-column grid of caught-creature cards. Tapping a card opens the
// detail sheet. All data is real: the signed-in trainer's catches from
// wild_spawns, streak from their profile row.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { C, RARITY_COLOR, FONT_DISPLAY } from "@/lib/theme";
import { resolveByCreatureId } from "@/lib/bestiary-art";

const RARITY_ORDER = ["common", "uncommon", "rare", "legendary", "mythic"] as const;
type RarityKey = (typeof RARITY_ORDER)[number];

const RARITY_LABEL: Record<RarityKey, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  legendary: "Legendary",
  mythic: "Mythic",
};

interface Catch {
  id: string;
  creature_id: number | null;
  name: string | null;
  tier: string | null;
  image_cid: string | null;
  caught_at: string;
}

function rarityOf(c: Catch): RarityKey {
  const t = (c.tier || "common").toLowerCase();
  return (RARITY_ORDER as readonly string[]).includes(t) ? (t as RarityKey) : "common";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/* The app's pulsing empty-state eye (EmptyPulseEye). */
function EmptyEye() {
  return (
    <span className="cr-eye" style={{ color: C.primary, display: "block" }}>
      <svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 5C6.5 5 2.3 9.2 1 12c1.3 2.8 5.5 7 11 7s9.7-4.2 11-7c-1.3-2.8-5.5-7-11-7Zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9Zm0-2A2.5 2.5 0 1 0 12 10a2.5 2.5 0 0 0 0 4.5Z" />
      </svg>
    </span>
  );
}

export default function CreaturesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [catches, setCatches] = useState<Catch[] | null>(null);
  const [streak, setStreak] = useState(0);
  const [selected, setSelected] = useState<Catch | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth/signin");
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: rows }, { data: prof }] = await Promise.all([
      supabase
        .from("wild_spawns")
        .select("id, creature_id, name, tier, image_cid, caught_at")
        .eq("caught_by", user.id)
        .order("caught_at", { ascending: false }),
      supabase.from("profiles").select("current_streak").eq("user_id", user.id).maybeSingle(),
    ]);
    setCatches((rows ?? []) as Catch[]);
    setStreak((prof?.current_streak as number) ?? 0);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  /* First catch of each species is a "discovery"; the ✨ NEW badge pulses
     for 3 days after it (the app's isFreshDiscovery). */
  const firstOfSpecies = useMemo(() => {
    const first = new Map<number, string>();
    for (const c of catches ?? []) {
      if (c.creature_id == null) continue;
      const prev = first.get(c.creature_id);
      if (!prev || c.caught_at < prev) first.set(c.creature_id, c.caught_at);
    }
    return first;
  }, [catches]);

  const isFresh = useCallback(
    (c: Catch) => {
      if (c.creature_id == null) return false;
      if (firstOfSpecies.get(c.creature_id) !== c.caught_at) return false;
      return Date.now() - new Date(c.caught_at).getTime() < 3 * 24 * 3600 * 1000;
    },
    [firstOfSpecies],
  );

  const rarityCounts = useMemo(() => {
    const counts: Record<RarityKey, number> = { common: 0, uncommon: 0, rare: 0, legendary: 0, mythic: 0 };
    for (const c of catches ?? []) counts[rarityOf(c)]++;
    return counts;
  }, [catches]);

  const rarest: RarityKey | null = useMemo(() => {
    for (let i = RARITY_ORDER.length - 1; i >= 0; i--) {
      if (rarityCounts[RARITY_ORDER[i]] > 0) return RARITY_ORDER[i];
    }
    return null;
  }, [rarityCounts]);

  const total = catches?.length ?? 0;

  if (authLoading || !user) {
    return <div style={{ position: "fixed", inset: 0, background: C.bg }} />;
  }

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <main style={{ maxWidth: 540, margin: "0 auto", padding: "max(16px, env(safe-area-inset-top)) 16px 96px" }}>
        {/* Header — "My Creatures" + collected count (app: 28pt black rounded). */}
        <header style={{ paddingTop: 8, marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, fontFamily: FONT_DISPLAY, color: "#fff" }}>My Creatures</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: C.textSecondary }}>
            {total} collected
          </p>
        </header>

        {catches === null ? (
          /* Loading shimmer keeps layout stable. */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ height: 236, borderRadius: 20, background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        ) : total === 0 ? (
          /* Empty state — exact app copy. */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "18vh 24px 0", textAlign: "center" }}>
            <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span
                aria-hidden
                style={{ position: "absolute", width: 160, height: 160, borderRadius: "50%", background: `${C.primary}2e`, filter: "blur(40px)" }}
              />
              <EmptyEye />
            </span>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, fontFamily: FONT_DISPLAY }}>No creatures yet</h2>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: C.textSecondary }}>
              Go explore — they&apos;re hiding nearby.
            </p>
          </div>
        ) : (
          <>
            {/* Stat strip — Collected / Day Streak / Rarest. */}
            <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
              <StatTile
                label="COLLECTED"
                value={String(total)}
                tint={C.primary}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 2.5 13.8 8 19.5 9.8 13.8 11.5 12 17.2 10.2 11.5 4.5 9.8 10.2 8 12 2.5ZM19 14l.9 2.6L22.5 17.5l-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14ZM5 15l.7 2 2 .7-2 .7L5 20.5l-.7-2.1-2-.7 2-.7L5 15Z" />
                  </svg>
                }
              />
              <StatTile
                label="DAY STREAK"
                value={String(streak)}
                tint="#FF9933"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M13.5 1.5s.8 2.6-.7 4.9C11.4 8.6 9 9.4 9 12.1c0 1.4.8 2.6 2 3.2-.3-1 0-2 .7-2.8.5-.6 1.3-1 1.6-2 1.6 1.2 3.2 3.3 3.2 5.4A4.8 4.8 0 0 1 12 21a6.4 6.4 0 0 1-6.4-6.5c0-3.3 2-5 3.2-7C10.3 5 10.4 2.7 13.5 1.5Z" />
                  </svg>
                }
              />
              <StatTile
                label="RAREST"
                value={rarest ? RARITY_LABEL[rarest] : "—"}
                tint={rarest ? RARITY_COLOR[rarest] : C.textTertiary}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M3 8.5 7.5 12 12 5l4.5 7L21 8.5 19.5 18h-15L3 8.5Zm2 11h14v1.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-1.5Z" />
                  </svg>
                }
              />
            </div>

            {/* Rarity distribution bar + legend. */}
            <div
              style={{
                background: "rgba(18,18,26,0.66)",
                backdropFilter: "blur(22px)",
                WebkitBackdropFilter: "blur(22px)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16,
                padding: "12px 14px",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", gap: 2, height: 8, borderRadius: 4, overflow: "hidden" }}>
                {RARITY_ORDER.filter((r) => rarityCounts[r] > 0).map((r) => (
                  <span
                    key={r}
                    style={{
                      flex: rarityCounts[r],
                      background: RARITY_COLOR[r],
                      borderRadius: 4,
                      boxShadow: `0 0 6px ${RARITY_COLOR[r]}99`,
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10 }}>
                {RARITY_ORDER.filter((r) => rarityCounts[r] > 0).map((r) => (
                  <span key={r} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: RARITY_COLOR[r], display: "block" }} />
                    <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.075em", color: C.textSecondary }}>
                      {rarityCounts[r]} {RARITY_LABEL[r].toUpperCase()}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {/* Two-column creature grid. */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {catches.map((c) => {
                const rar = rarityOf(c);
                const art = resolveByCreatureId(c.creature_id, { name: c.name, tier: c.tier, imageCid: c.image_cid });
                const fresh = isFresh(c);
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="cr-card"
                    style={{
                      textAlign: "left",
                      padding: 0,
                      cursor: "pointer",
                      background: "rgba(18,18,26,0.66)",
                      backdropFilter: "blur(22px)",
                      WebkitBackdropFilter: "blur(22px)",
                      border: `1.2px solid ${RARITY_COLOR[rar]}8c`,
                      borderRadius: 20,
                      boxShadow: `0 8px 24px ${RARITY_COLOR[rar]}1f`,
                      overflow: "hidden",
                      color: "#fff",
                      fontFamily: "inherit",
                    }}
                  >
                    <span style={{ position: "relative", display: "block", height: 140, margin: 6, borderRadius: 14, background: "rgba(255,255,255,0.04)" }}>
                      {art.floating || art.card ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={art.floating || art.card}
                          alt={c.name ?? "Creature"}
                          loading="lazy"
                          style={{ position: "absolute", left: "50%", top: "50%", width: 110, height: 110, transform: "translate(-50%, -50%)", objectFit: "contain" }}
                        />
                      ) : null}
                      {fresh && (
                        <span
                          className="cr-new"
                          style={{
                            position: "absolute",
                            top: 8,
                            left: 8,
                            padding: "3px 7px",
                            borderRadius: 999,
                            background: `linear-gradient(90deg, ${C.primary}, ${C.primary2})`,
                            color: "#000",
                            fontSize: 9,
                            fontWeight: 900,
                            letterSpacing: "0.11em",
                            fontFamily: FONT_DISPLAY,
                          }}
                        >
                          ✨ NEW
                        </span>
                      )}
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 6, padding: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, fontFamily: FONT_DISPLAY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.name ?? "Creature"}
                      </span>
                      <span
                        style={{
                          alignSelf: "flex-start",
                          padding: "3px 8px",
                          borderRadius: 999,
                          background: `${RARITY_COLOR[rar]}1f`,
                          border: `1px solid ${RARITY_COLOR[rar]}80`,
                          color: RARITY_COLOR[rar],
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: "0.17em",
                        }}
                      >
                        {RARITY_LABEL[rar].toUpperCase()}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: C.textTertiary }}>{fmtDate(c.caught_at)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Detail sheet (the app's CreatureDetailView, .large detent). */}
      {selected && (
        <CreatureDetailSheet catch_={selected} fresh={isFresh(selected)} onClose={() => setSelected(null)} />
      )}

      <style>{`
        .cr-card { transition: transform 0.18s cubic-bezier(0.34, 1.2, 0.64, 1); }
        .cr-card:active { transform: scale(0.96); }
        @keyframes crNewPulse {
          0%, 100% { transform: scale(0.97); }
          50%      { transform: scale(1.06); box-shadow: 0 0 12px ${C.primary}99; }
        }
        .cr-new { animation: crNewPulse 1.6s ease-in-out infinite; }
        @keyframes crEyePulse {
          0%, 100% { filter: drop-shadow(0 0 8px ${C.primary}66); }
          50%      { filter: drop-shadow(0 0 22px ${C.primary}); }
        }
        .cr-eye { animation: crEyePulse 1.4s ease-in-out infinite; }
        @keyframes crSheetUp {
          from { transform: translateY(48px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cr-new, .cr-eye { animation: none; }
        }
      `}</style>
    </div>
  );
}

function StatTile({ label, value, tint, icon }: { label: string; value: string; tint: string; icon: React.ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        padding: "12px 4px",
        borderRadius: 16,
        background: "rgba(18,18,26,0.66)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
        border: `1px solid ${tint}4d`,
        minWidth: 0,
      }}
    >
      <span style={{ color: tint, display: "flex" }}>{icon}</span>
      <span
        style={{
          fontSize: 17,
          fontWeight: 900,
          fontFamily: FONT_DISPLAY,
          color: "#fff",
          maxWidth: "100%",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.125em", color: C.textSecondary }}>{label}</span>
    </div>
  );
}

function CreatureDetailSheet({ catch_: c, fresh, onClose }: { catch_: Catch; fresh: boolean; onClose: () => void }) {
  const rar = rarityOf(c);
  const art = resolveByCreatureId(c.creature_id, { name: c.name, tier: c.tier, imageCid: c.image_cid });
  const [shared, setShared] = useState(false);

  async function share() {
    const text = `I caught ${c.name ?? "a creature"} (${RARITY_LABEL[rar]}) in BLINK!`;
    const url = "https://blinkworld.xyz";
    try {
      if (navigator.share) {
        await navigator.share({ title: "BLINK", text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShared(true);
        setTimeout(() => setShared(false), 1600);
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 540,
          maxHeight: "88dvh",
          overflow: "auto",
          background: C.bg,
          borderRadius: "24px 24px 0 0",
          border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "none",
          padding: "10px 24px calc(28px + env(safe-area-inset-bottom, 0px))",
          textAlign: "center",
          animation: "crSheetUp 0.32s cubic-bezier(0.22, 1, 0.36, 1) both",
          position: "relative",
        }}
      >
        {/* Drag indicator */}
        <span style={{ display: "block", width: 40, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.3)", margin: "0 auto 8px" }} />

        {/* Rarity aura behind the hero sprite */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: 240 }}>
          <span aria-hidden style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", background: `${RARITY_COLOR[rar]}26`, filter: "blur(50px)" }} />
          {art.floating || art.card ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={art.floating || art.card}
              alt={c.name ??  "Creature"}
              style={{ position: "relative", width: 220, height: 220, objectFit: "contain", filter: `drop-shadow(0 12px 28px ${RARITY_COLOR[rar]}59)` }}
            />
          ) : null}
        </div>

        <h2 style={{ margin: "6px 0 10px", fontSize: 32, fontWeight: 900, fontFamily: FONT_DISPLAY }}>{c.name ?? "Creature"}</h2>

        <span
          style={{
            display: "inline-block",
            padding: "6px 14px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            border: `1px solid ${RARITY_COLOR[rar]}80`,
            color: RARITY_COLOR[rar],
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.23em",
            marginBottom: 10,
          }}
        >
          {RARITY_LABEL[rar].toUpperCase()}
          {fresh ? " · NEW" : ""}
        </span>

        <p style={{ margin: "0 0 22px", fontSize: 12, fontWeight: 600, color: C.textTertiary }}>Caught {fmtDate(c.caught_at)}</p>

        <button
          onClick={share}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 26,
            border: "none",
            background: C.primary,
            color: "#000",
            fontSize: 15,
            fontWeight: 800,
            fontFamily: FONT_DISPLAY,
            cursor: "pointer",
            marginBottom: 10,
          }}
        >
          {shared ? "Copied" : "Share"}
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            height: 46,
            borderRadius: 23,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: FONT_DISPLAY,
            cursor: "pointer",
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
