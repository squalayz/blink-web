// app/b/[code]/page.tsx
//
// BLINK battle-invite landing page (https://blinkworld.xyz/b/<CODE>).
//
// iPhones that already have BLINK installed never reach this page — iOS
// intercepts the universal link and opens the app straight into the duel.
// This is the graceful fallback for everyone else (friends without the app,
// Android, desktop): it shows the battle code and sends them to the App Store.
//
// Server Component, no client JS. Written for Next.js 15 (async `params`).

import type { Metadata } from "next";

const APP_STORE_URL = "https://apps.apple.com/app/id6774225621";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Keep only valid code glyphs (mirrors the app's code alphabet). */
function cleanCode(raw: string): string {
  return Array.from(decodeURIComponent(raw ?? "").toUpperCase())
    .filter((ch) => CODE_ALPHABET.includes(ch))
    .join("")
    .slice(0, 8);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const c = cleanCode(code);
  const title = c ? `Battle me on BLINK — code ${c}` : "Battle me on BLINK";
  const description = "Tap to join the duel. Don't blink. The Eye is open.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://blinkworld.xyz/b/${c}`,
      siteName: "BLINK",
      images: ["https://blinkworld.xyz/og-battle.jpg"],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://blinkworld.xyz/og-battle.jpg"],
    },
  };
}

export default async function BattleInvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const c = cleanCode(code);
  const schemeUrl = `blink://battle/${c}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(120% 80% at 50% 0%, rgba(0,255,136,0.16) 0%, rgba(0,255,136,0) 55%), #0a0a0f",
        color: "#FFFFFF",
        fontFamily: "'Outfit', system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(0,255,136,0.22)",
          borderRadius: 28,
          padding: "36px 24px",
          boxShadow: "0 24px 80px rgba(0,255,136,0.10)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 14,
            filter: "drop-shadow(0 0 14px rgba(0,255,136,0.55))",
          }}
        >
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
            <path d="m13 19 6-6" />
            <path d="m16 16 4 4" />
            <path d="m19 21 2-2" />
            <path d="M9.5 17.5 21 6V3h-3L6.5 14.5" />
            <path d="m5 13 6 6" />
            <path d="m8 16-4 4" />
            <path d="m3 19 2 2" />
          </svg>
        </div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 3,
            color: "#00FF88",
            marginBottom: 10,
          }}
        >
          BATTLE INVITE
        </div>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 900,
            margin: "0 0 22px",
            lineHeight: 1.2,
          }}
        >
          A trainer challenged you to a duel on BLINK
        </h1>

        {c ? (
          <div
            style={{
              fontSize: 40,
              fontWeight: 900,
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, monospace",
              letterSpacing: 8,
              padding: "16px 12px",
              borderRadius: 16,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.10)",
              marginBottom: 24,
            }}
          >
            {c}
          </div>
        ) : null}

        <a
          href={APP_STORE_URL}
          style={{
            display: "block",
            padding: "16px 24px",
            borderRadius: 14,
            background: "#00FF88",
            color: "#0a0a0f",
            fontSize: 16,
            fontWeight: 800,
            textDecoration: "none",
            marginBottom: 12,
          }}
        >
          Get BLINK free
        </a>

        <a
          href={schemeUrl}
          style={{
            display: "block",
            padding: "14px 24px",
            borderRadius: 14,
            background: "transparent",
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: 700,
            textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          Already have it? Open in BLINK
        </a>

        <p
          style={{
            fontSize: 13,
            color: "#8a8a99",
            margin: "22px 0 0",
            lineHeight: 1.5,
          }}
        >
          {c
            ? `Install BLINK, then go to Battles → “Enter a friend’s code” → ${c}`
            : "Install BLINK to start catching creatures and battling friends anywhere."}
        </p>
      </div>

      <div
        style={{
          marginTop: 24,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: 1,
          color: "#00FF88",
        }}
      >
        blinkworld.xyz
      </div>
    </main>
  );
}
