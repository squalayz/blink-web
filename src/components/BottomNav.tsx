"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { C } from "@/lib/theme";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { useIsDesktop } from "@/hooks/useIsDesktop";

// The app's REAL tab bar artwork (Assets.xcassets tab_*.imageset, template
// rendering) recreated on web: the alpha PNG becomes a CSS mask so the glyph
// is tinted exactly like UITabBar does — BLINK green selected, gray idle.
function AppTabIcon({ src, active, size = 24 }: { src: string; active: boolean; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        display: "block",
        backgroundColor: active ? C.primary : C.muted,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

function MapIcon({ active }: { active: boolean }) {
  return <AppTabIcon src="/brand/app/tabs/tab_map.png" active={active} />;
}

// The app's Feed tab uses SF "bubble.left.and.bubble.right.fill" — matched
// here as two filled chat bubbles.
function LiveFeedIcon({ active }: { active: boolean }) {
  const fill = active ? C.primary : C.muted;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 8.4C2 6 4 4.2 6.5 4.2h5C14 4.2 16 6 16 8.4c0 2.4-2 4.2-4.5 4.2H8l-3.4 2.6c-.5.4-1.1 0-1.1-.6v-2.8C2.6 11 2 9.8 2 8.4Z"
        fill={fill}
      />
      <path
        d="M17.2 9.1c2.7.3 4.8 2.2 4.8 4.6 0 1.4-.7 2.6-1.7 3.4v2.4c0 .6-.7 1-1.2.6L16.4 18h-2c-1.9 0-3.6-1-4.3-2.5h1.4c3.2 0 5.8-2.3 5.8-5.3 0-.4 0-.8-.1-1.1Z"
        fill={fill}
      />
    </svg>
  );
}

function BattlesIcon({ active }: { active: boolean }) {
  return <AppTabIcon src="/brand/app/tabs/tab_battles.png" active={active} />;
}

function CreaturesIcon({ active }: { active: boolean }) {
  return <AppTabIcon src="/brand/app/tabs/tab_creatures.png" active={active} />;
}

function ProfileIcon({ active }: { active: boolean }) {
  return <AppTabIcon src="/brand/app/tabs/tab_profile.png" active={active} />;
}

interface TabDef {
  id: string;
  label: string;
  href: string;
  isCenter?: boolean;
  icon: (active: boolean) => React.ReactNode;
  showBadge?: boolean;
}

// The iOS app's MainTabView, exactly: Map · Feed · Battles (badged with the
// social count) · Creatures · Profile — same order, same tab_* artwork.
const TABS: TabDef[] = [
  { id: "watch", label: "Map", href: "/map", icon: (a) => <MapIcon active={a} /> },
  { id: "live", label: "Feed", href: "/live", icon: (a) => <LiveFeedIcon active={a} /> },
  { id: "battles", label: "Battles", href: "/battles", icon: (a) => <BattlesIcon active={a} />, showBadge: true },
  { id: "creatures", label: "Creatures", href: "/creatures", icon: (a) => <CreaturesIcon active={a} /> },
  { id: "profile", label: "Profile", href: "/profile", icon: (a) => <ProfileIcon active={a} /> },
];

const SIDEBAR_WIDTH = 72;

export { SIDEBAR_WIDTH };

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isDesktop, isTablet } = useIsDesktop();
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [walletBadge, setWalletBadge] = useState(0);

  // The app's socialBadgeCount on the Battles tab: waiting gifts + incoming
  // friend requests.
  const fetchSocialBadge = useCallback(async () => {
    if (!user) return;
    try {
      const [{ count: giftCount }, { count: requestCount }] = await Promise.all([
        supabase
          .from("gifts")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .eq("status", "pending"),
        supabase
          .from("friendships")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .eq("status", "pending"),
      ]);
      setWalletBadge((giftCount ?? 0) + (requestCount ?? 0));
    } catch {
      /* badge is best-effort */
    }
  }, [user]);

  useEffect(() => {
    fetchSocialBadge();
    const t = setInterval(fetchSocialBadge, 45_000);
    return () => clearInterval(t);
  }, [fetchSocialBadge]);

  const isActive = (href: string) => {
    if (href === "/map") return pathname === "/map" || pathname === "/watch";
    return pathname.startsWith(href);
  };

  /* ===== DESKTOP: Vertical left sidebar ===== */
  if (isDesktop) {
    return (
      <>
        <nav
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: SIDEBAR_WIDTH,
            zIndex: 900,
            background: "#0a0a0f",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 20,
            paddingBottom: 20,
            gap: 0,
            boxShadow: "4px 0 32px rgba(0,0,0,0.3)",
          }}
        >
          {/* BLINK logo mark at top — the orb sits flush on the bar, exactly
              like the app's BlinkLogoMark: true-alpha glow art, no box. */}
          <Link
            href="/"
            aria-label="BLINK home"
            style={{
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              flexShrink: 0,
              textDecoration: "none",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-orb-glow.png"
              alt=""
              style={{ width: 40, height: 40, objectFit: "contain", display: "block" }}
            />
          </Link>

          {/* Tab items */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
            {TABS.map((tab) => {
              const active = isActive(tab.href);
              const isHovered = hoveredTab === tab.id;

              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  onMouseEnter={() => setHoveredTab(tab.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    padding: "10px 0",
                    textDecoration: "none",
                    width: "100%",
                    position: "relative",
                    background: isHovered && !active ? "rgba(0,255,136,0.04)" : "transparent",
                    transition: "background 0.2s ease",
                  }}
                >
                  {active && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 3,
                        height: 28,
                        borderRadius: "0 3px 3px 0",
                        background: C.primary,
                        boxShadow: `0 0 8px ${C.primary}`,
                      }}
                    />
                  )}
                  <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {tab.icon(active)}
                    {tab.showBadge && walletBadge > 0 && (
                      <span
                        style={{
                          position: "absolute",
                          top: -4,
                          right: -8,
                          minWidth: 16,
                          height: 16,
                          padding: "0 4px",
                          borderRadius: 8,
                          background: "#FF3B30",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1,
                        }}
                      >
                        {walletBadge > 9 ? "9+" : walletBadge}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: active ? 600 : 500,
                      color: active ? C.primary : C.muted,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        <style>{`
          @keyframes btnGlow {
            0%, 100% { box-shadow: 0 4px 20px ${C.primary}50, 0 0 40px ${C.primary}30; }
            50% { box-shadow: 0 4px 28px ${C.primary}80, 0 0 56px ${C.primary}50; }
          }
        `}</style>
      </>
    );
  }

  /* ===== MOBILE / TABLET: opaque full-width tab bar (mirrors iOS UITabBar:
     #0A0A0F opaque, 1px white@0.06 hairline top, green selected / gray idle) ===== */
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 900,
        background: "#0a0a0f",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          maxWidth: isTablet ? 600 : 480,
          margin: "0 auto",
          padding: "5px 4px 4px",
          minHeight: 49,
        }}
      >
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          const isHovered = hoveredTab === tab.id;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "6px 4px 4px",
                textDecoration: "none",
                flex: 1,
                position: "relative",
                opacity: isHovered && !active ? 0.85 : 1,
                transition: "opacity 0.15s",
              }}
            >
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {tab.icon(active)}
                {tab.showBadge && walletBadge > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -5,
                      right: -9,
                      minWidth: 16,
                      height: 16,
                      padding: "0 4px",
                      borderRadius: 8,
                      background: "#FF3B30",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1,
                    }}
                  >
                    {walletBadge > 9 ? "9+" : walletBadge}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: active ? 600 : 500,
                  color: active ? C.primary : C.muted,
                  letterSpacing: "0.01em",
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
