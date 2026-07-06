// app/u/[username]/page.tsx
//
// BLINK public card landing page (https://blinkworld.xyz/u/<username>).
//
// The animated web mirror of a trainer's in-app BLINK Card. iPhones with BLINK
// installed open the app; everyone else (friends without the app, Android,
// desktop) lands here on a living card — photo, rank, top creatures, socials —
// with a big "Get BLINK & add me" call to action carrying their buddy code.
//
// Server Component (no client JS). Reads the world-readable `profiles` row via
// the Supabase REST endpoint with the public anon key (RLS already allows
// "Anyone can read profiles"); we only ever select public-safe columns.
// Written for Next.js 15 (async `params`).

import type { Metadata } from "next";

const APP_STORE_URL = "https://apps.apple.com/app/id6774225621";

// Marketing-only mode (App Review): hide the in-game balance stat so the
// public card shows gameplay stats only.
const MARKETING_ONLY = process.env.NEXT_PUBLIC_MARKETING_ONLY === "true";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "";
const SUPABASE_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "";

// Accent palettes — mirrors the app's CardTheme.
const THEMES: Record<string, [string, string]> = {
  signature: ["#00FF88", "#88FF00"],
  aurora: ["#B07CFF", "#5AC8FF"],
  ember: ["#FF6A3D", "#FF3D6E"],
  ice: ["#6FE3FF", "#B0F0FF"],
  gold: ["#FFCB4A", "#FFA82A"],
  mythic: ["#FF7AD8", "#B07CFF"],
};

type ShowcaseItem = { slug?: string; name?: string; rarity?: string; power?: number };

type CardProfile = {
  username: string | null;
  avatar_url: string | null;
  avatar_status: string | null;
  trophy_rating: number | null;
  blink_balance: number | null;
  blink_catches: number | null;
  top_slug: string | null;
  showcase: ShowcaseItem[] | null;
  verified: boolean | null;
  instagram: string | null;
  x_handle: string | null;
  card_theme: string | null;
  card_effect: string | null;
  card_backdrop: string | null;
  trainer_code: string | null;
  created_at: string | null;
  bio: string | null;
};

/** Mirror the app's username rules: lowercase, [a-z0-9_], max 20. */
function cleanName(raw: string): string {
  return Array.from(decodeURIComponent(raw ?? "").toLowerCase())
    .filter((ch) => /[a-z0-9_]/.test(ch))
    .join("")
    .slice(0, 20);
}

/** Normalise a stored handle for building a profile URL. */
function cleanHandle(raw: string | null): string | null {
  if (!raw) return null;
  const h = raw.trim().replace(/^@+/, "").split(/[/?\s]/)[0];
  return h.length ? h : null;
}

function tierFor(rating: number): [string, string] {
  if (rating < 1200) return ["Bronze", "#CF8033"];
  if (rating < 1500) return ["Silver", "#C7D4E6"];
  if (rating < 1800) return ["Gold", "#FFCC4D"];
  if (rating < 2200) return ["Platinum", "#8CF2F2"];
  if (rating < 2600) return ["Diamond", "#A6CCFF"];
  return ["Mythic", "#FF8AE0"];
}

async function fetchProfile(lower: string): Promise<CardProfile | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON || !lower) return null;
  const cols =
    "username,avatar_url,avatar_status,trophy_rating,blink_balance,blink_catches,top_slug,showcase,verified,instagram,x_handle,card_theme,card_effect,card_backdrop,trainer_code,created_at,bio";
  const url = `${SUPABASE_URL}/rest/v1/profiles?username_lower=eq.${encodeURIComponent(
    lower,
  )}&select=${cols}&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as CardProfile[];
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const lower = cleanName(username);
  const p = await fetchProfile(lower);
  const name = p?.username || lower || "A trainer";
  const title = `${name} on BLINK`;
  const description =
    p?.bio?.trim() || "Catch creatures, battle friends, and connect in the real world. Tap to join.";
  const ogImage =
    p && p.avatar_status === "approved" && p.avatar_url
      ? p.avatar_url
      : "https://blinkworld.xyz/og-battle.jpg";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://blinkworld.xyz/u/${lower}`,
      siteName: "BLINK",
      images: [ogImage],
      type: "profile",
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function PublicCardPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const lower = cleanName(username);
  const p = await fetchProfile(lower);

  const theme = (p?.card_theme && THEMES[p.card_theme]) || THEMES.signature;
  const [accent, accent2] = theme;
  const effect = p?.card_effect || "holographic";
  const rating = p?.trophy_rating ?? 1000;
  const [tierLabel, tierColor] = tierFor(rating);
  const name = p?.username || lower || "Trainer";
  const initials = (name.slice(0, 2) || "?").toUpperCase();
  const hasAvatar = !!(p && p.avatar_status === "approved" && p.avatar_url);
  const ig = cleanHandle(p?.instagram ?? null);
  const x = cleanHandle(p?.x_handle ?? null);
  const code = p?.trainer_code || "";
  const year = p?.created_at ? new Date(p.created_at).getFullYear() : new Date().getFullYear();
  const creatures = ((p?.showcase && p.showcase.length
    ? p.showcase
    : p?.top_slug
      ? [{ slug: p.top_slug }]
      : []) as ShowcaseItem[])
    .filter((c) => !!c.slug)
    .slice(0, 3);
  const backdropSlug = p?.card_backdrop === "creature" ? creatures[0]?.slug : undefined;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: `radial-gradient(120% 80% at 50% 0%, ${hexA(accent, 0.18)} 0%, ${hexA(accent, 0)} 55%), #0a0a0f`,
        color: "#FFFFFF",
        fontFamily: "'Outfit', system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 20px 56px",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* The card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 360,
          aspectRatio: "2 / 3",
          borderRadius: 26,
          overflow: "hidden",
          background: "#0c0c14",
          boxShadow: `0 30px 90px ${hexA(accent, 0.22)}`,
          animation: "blinkFloat 6s ease-in-out infinite",
        }}
      >
        {/* Creature backdrop */}
        {backdropSlug ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://blinkworld.xyz/floating/${backdropSlug}.png`}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.28,
              filter: "blur(2px)",
            }}
          />
        ) : null}

        {/* Theme wash */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg, ${hexA(accent, 0.26)} 0%, transparent 45%, ${hexA(accent2, 0.16)} 100%), radial-gradient(80% 50% at 50% 0%, ${hexA(accent, 0.22)} 0%, transparent 70%), linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.5) 100%)`,
          }}
        />

        {/* Effect layer */}
        {effect === "holographic" ? (
          <div className="fx-holo" style={{ background: `linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.38) 50%, transparent 65%)` }} />
        ) : null}
        {effect === "aurora" ? (
          <>
            <div className="fx-aurora a1" style={{ background: `radial-gradient(circle, ${hexA(accent, 0.8)} 0%, transparent 60%)` }} />
            <div className="fx-aurora a2" style={{ background: `radial-gradient(circle, ${hexA(accent2, 0.8)} 0%, transparent 60%)` }} />
          </>
        ) : null}
        {effect === "particles" ? (
          <div className="fx-particles">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                style={{
                  left: `${(i * 53) % 100}%`,
                  bottom: `${(i * 37) % 90}%`,
                  background: i % 2 ? accent2 : accent,
                  animationDelay: `${(i % 7) * 0.4}s`,
                  animationDuration: `${4 + (i % 5)}s`,
                }}
              />
            ))}
          </div>
        ) : null}

        {/* Border */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 26,
            padding: 2,
            background: `linear-gradient(135deg, ${hexA(accent, 0.9)}, rgba(255,255,255,0.22), ${hexA(accent2, 0.8)})`,
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            pointerEvents: "none",
          }}
        />

        {/* Content */}
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", padding: 18 }}>
          {/* top row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: accent, fontWeight: 900, fontSize: 15, letterSpacing: 1 }}>
              <span>◉</span> BLINK
            </div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: "#0a0a0f", background: tierColor, padding: "5px 10px", borderRadius: 999 }}>
              {tierLabel.toUpperCase()}
            </div>
          </div>

          {/* avatar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 14 }}>
            <div style={{ position: "relative", width: 96, height: 96 }}>
              <div style={{ position: "absolute", inset: -4, borderRadius: "50%", background: hexA(accent, 0.2) }} />
              {hasAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p!.avatar_url as string}
                  alt={name}
                  style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: `3px solid ${accent}`, position: "relative" }}
                />
              ) : (
                <div style={{ width: 96, height: 96, borderRadius: "50%", border: `3px solid ${accent}`, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 900, position: "relative" }}>
                  {initials}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 900 }}>{name}</span>
              {p?.verified ? <span style={{ color: accent, fontSize: 16 }}>✦</span> : null}
            </div>
            {p?.bio?.trim() ? (
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.86)", textAlign: "center", lineHeight: 1.35, maxHeight: 36, overflow: "hidden", padding: "0 6px" }}>
                {p.bio.trim()}
              </div>
            ) : null}
          </div>

          {/* stats */}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {stat(`${rating}`, "RATING", accent)}
            {stat(`${p?.blink_catches ?? 0}`, "CAUGHT", accent2)}
            {MARKETING_ONLY
              ? stat(tierLabel.toUpperCase(), "TIER", tierColor)
              : stat(`${p?.blink_balance ?? 0}`, "BLINK", tierColor)}
          </div>

          {/* creatures */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>TOP CREATURES</div>
            <div style={{ display: "flex", gap: 10 }}>
              {[0, 1, 2].map((i) => {
                const c = creatures[i];
                return (
                  <div key={i} style={{ flex: 1, aspectRatio: "1 / 1", borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {c?.slug ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`https://blinkworld.xyz/floating/${c.slug}.png`} alt={c.name || ""} style={{ width: "78%", height: "78%", objectFit: "contain" }} />
                    ) : (
                      <span style={{ color: "rgba(255,255,255,0.18)", fontSize: 18, fontWeight: 900 }}>?</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* socials */}
          {(ig || x) ? (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {ig ? socialPill("IG", ig, accent) : null}
              {x ? socialPill("𝕏", x, accent2) : null}
            </div>
          ) : null}

          <div style={{ flex: 1 }} />

          {/* footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: 1, color: "rgba(255,255,255,0.45)" }}>BUDDY CODE</div>
              <div style={{ fontSize: 14, fontWeight: 900, fontFamily: "ui-monospace, Menlo, monospace" }}>{code || "—"}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: 1, color: "rgba(255,255,255,0.45)" }}>SINCE {year}</div>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: accent }}>blinkworld.xyz</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ width: "100%", maxWidth: 360, marginTop: 26 }}>
        <a
          href={APP_STORE_URL}
          style={{
            display: "block",
            textAlign: "center",
            padding: "16px 24px",
            borderRadius: 16,
            background: `linear-gradient(90deg, ${accent}, ${accent2})`,
            color: "#0a0a0f",
            fontSize: 16,
            fontWeight: 900,
            textDecoration: "none",
            boxShadow: `0 16px 40px ${hexA(accent, 0.3)}`,
          }}
        >
          Get BLINK & add {name}
        </a>
        {ig || x ? (
          <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "center" }}>
            {ig ? linkChip(`@${ig} on Instagram`, `https://instagram.com/${ig}`, accent) : null}
            {x ? linkChip(`@${x} on X`, `https://x.com/${x}`, accent2) : null}
          </div>
        ) : null}
        <p style={{ fontSize: 13, color: "#8a8a99", textAlign: "center", margin: "20px 0 0", lineHeight: 1.5 }}>
          {code
            ? `Install BLINK, then add buddy code ${code} to connect with ${name}.`
            : `Install BLINK to start catching creatures and battling friends anywhere.`}
        </p>
      </div>

      <div style={{ marginTop: 26, fontSize: 12, fontWeight: 800, letterSpacing: 1, color: accent }}>blinkworld.xyz</div>
    </main>
  );
}

// MARK: - small render helpers

function stat(value: string, label: string, tint: string) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: "center",
        padding: "10px 4px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.05)",
        border: `1px solid ${hexA(tint, 0.35)}`,
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 900 }}>{value}</div>
      <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 0.8, color: tint, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function socialPill(glyph: string, handle: string, tint: string) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 999, background: "rgba(255,255,255,0.05)", border: `1px solid ${hexA(tint, 0.35)}` }}>
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: 5, background: tint, color: "#0a0a0f", fontSize: 10, fontWeight: 900 }}>{glyph}</span>
      <span style={{ fontSize: 11, fontWeight: 800 }}>@{handle}</span>
    </div>
  );
}

function linkChip(label: string, href: string, tint: string) {
  return (
    <a href={href} style={{ fontSize: 13, fontWeight: 700, color: "#fff", textDecoration: "none", padding: "10px 14px", borderRadius: 12, border: `1px solid ${hexA(tint, 0.5)}`, background: "rgba(255,255,255,0.04)" }}>
      {label}
    </a>
  );
}

/** #RRGGBB + alpha → rgba() string. */
function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const KEYFRAMES = `
@keyframes blinkFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
@keyframes blinkSheen { 0% { transform: translateX(-60%) } 100% { transform: translateX(60%) } }
@keyframes blinkDrift1 { 0%,100% { transform: translate(-30px,-20px) } 50% { transform: translate(60px,40px) } }
@keyframes blinkDrift2 { 0%,100% { transform: translate(40px,50px) } 50% { transform: translate(-50px,-30px) } }
@keyframes blinkRise { 0% { transform: translateY(0); opacity: .9 } 100% { transform: translateY(-120px); opacity: 0 } }
.fx-holo { position:absolute; inset:0; mix-blend-mode:screen; animation: blinkSheen 4.2s ease-in-out infinite alternate; pointer-events:none; }
.fx-aurora { position:absolute; width:260px; height:260px; border-radius:50%; filter:blur(36px); mix-blend-mode:screen; opacity:.55; pointer-events:none; }
.fx-aurora.a1 { top:10%; left:5%; animation: blinkDrift1 6s ease-in-out infinite; }
.fx-aurora.a2 { bottom:5%; right:5%; animation: blinkDrift2 6s ease-in-out infinite; }
.fx-particles { position:absolute; inset:0; mix-blend-mode:screen; pointer-events:none; }
.fx-particles span { position:absolute; width:5px; height:5px; border-radius:50%; animation-name: blinkRise; animation-timing-function: ease-in; animation-iteration-count: infinite; }
@media (prefers-reduced-motion: reduce) {
  .fx-holo, .fx-aurora, .fx-particles span { animation: none !important; }
  main > div { animation: none !important; }
}
`;
