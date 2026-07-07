// Shared shell for the BlinkWorld marketing utility pages
// (/privacy, /terms, /support). Server-safe: no hooks, inline styles only.

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

const BG = "#05060C";
const CARD = "#0E1017";
const GREEN = "#4AE88A";
const WHITE = "#FFFFFF";
const TEXT70 = "rgba(255,255,255,0.7)";
const TEXT50 = "rgba(255,255,255,0.5)";

const FONT_DISPLAY = "'Space Grotesk', 'Inter', -apple-system, sans-serif";
const FONT_BODY = "'Inter', -apple-system, system-ui, sans-serif";

export default function MarketingShell({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(1100px 520px at 50% -180px, rgba(74,232,138,0.09), transparent 70%), ${BG}`,
        color: WHITE,
        fontFamily: FONT_BODY,
      }}
    >
      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(5,6,12,0.72)",
        }}
      >
        <nav
          aria-label="Main"
          style={{
            maxWidth: 860,
            margin: "0 auto",
            padding: "0 20px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: WHITE,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/marketing/blink-logo.webp"
              alt=""
              aria-hidden
              width={28}
              height={28}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                objectFit: "cover",
                filter: "drop-shadow(0 0 8px rgba(74,232,138,0.5))",
              }}
            />
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: "0.08em",
              }}
            >
              BLINKWORLD
            </span>
          </Link>
          <Link
            href="/"
            style={{
              color: TEXT70,
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            Back to home
          </Link>
        </nav>
      </header>

      <main
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "clamp(36px, 6vw, 64px) 20px 72px",
        }}
      >
        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: "clamp(30px, 5vw, 42px)",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            margin: 0,
            textShadow: "0 0 32px rgba(74,232,138,0.22)",
          }}
        >
          {title}
        </h1>
        {updated && (
          <p style={{ margin: "12px 0 0", color: TEXT50, fontSize: 13.5 }}>{updated}</p>
        )}
        {intro && (
          <p
            style={{
              margin: "20px 0 0",
              color: TEXT70,
              fontSize: 16,
              lineHeight: 1.7,
              maxWidth: 680,
            }}
          >
            {intro}
          </p>
        )}
        <div style={{ marginTop: 8 }}>{children}</div>
      </main>

      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "28px 20px 40px",
        }}
      >
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
            {[
              { href: "/privacy", label: "Privacy Policy" },
              { href: "/terms", label: "Terms of Use" },
              { href: "/support", label: "Support" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  color: TEXT70,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <p style={{ margin: 0, color: TEXT50, fontSize: 12 }}>
            &copy; 2026 BlinkWorld. All rights reserved.
          </p>
        </div>
        <p
          style={{
            maxWidth: 860,
            margin: "16px auto 0",
            color: "rgba(255,255,255,0.32)",
            fontSize: 11.5,
          }}
        >
          Music: &ldquo;Adventure Meme&rdquo; by Kevin MacLeod (
          <a
            href="https://incompetech.com"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            incompetech.com
          </a>
          ), licensed under CC BY 4.0
        </p>
      </footer>
    </div>
  );
}

/* Shared content primitives */

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 36 }}>
      <h2
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 20,
          fontWeight: 700,
          color: WHITE,
          margin: "0 0 12px",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export function P({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p
      style={{
        color: TEXT70,
        fontSize: 15,
        lineHeight: 1.75,
        margin: "0 0 12px",
        ...style,
      }}
    >
      {children}
    </p>
  );
}

export function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul
      style={{
        color: TEXT70,
        fontSize: 15,
        lineHeight: 1.75,
        margin: "0 0 12px",
        paddingLeft: 22,
      }}
    >
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: 6 }}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function Strong({ children }: { children: ReactNode }) {
  return <strong style={{ color: WHITE, fontWeight: 700 }}>{children}</strong>;
}

export function GlassPanel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: CARD,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        padding: "22px 24px",
        marginTop: 24,
      }}
    >
      {children}
    </div>
  );
}

export function GreenLink({ href, children }: { href: string; children: ReactNode }) {
  const external = !href.startsWith("/");
  const style: CSSProperties = {
    color: GREEN,
    fontWeight: 700,
    textDecoration: "none",
  };
  if (external) {
    return (
      <a href={href} style={style}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} style={style}>
      {children}
    </Link>
  );
}
