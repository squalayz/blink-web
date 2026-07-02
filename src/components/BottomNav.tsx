"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { C } from "@/lib/theme";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { useIsDesktop } from "@/hooks/useIsDesktop";

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? C.primary : "none"} stroke={active ? C.primary : C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  );
}

function LiveFeedIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? C.primary : C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4" />
      <circle cx="12" cy="12" r="2" fill={active ? C.primary : C.muted} />
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4" />
      <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
    </svg>
  );
}

// "Claim" center button — the BLINK orb rendered the way the app's
// BlinkOrbBadge does: circle-clipped mark + green ring + breathing halo.
function ClaimIcon({ size = 44 }: { size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px solid rgba(0,255,136,0.45)",
        background: "#0a0a0f",
        boxShadow: `0 0 18px ${C.primary}59, 0 0 40px ${C.primary}26`,
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-orb-transparent.png"
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%", display: "block" }}
      />
    </span>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  const stroke = active ? C.primary : C.muted;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "rgba(0,255,136,0.18)" : "none"} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  );
}

function WalletIcon({ active }: { active: boolean }) {
  const stroke = active ? C.primary : C.muted;
  const fill = active ? C.primary : "none";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5V8H5a1 1 0 0 0 0 2h16v8.5A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5z" fill={fill === "none" ? "none" : "rgba(0,255,136,0.18)"} />
      <circle cx="17" cy="14.5" r="1.4" fill={stroke} stroke="none" />
    </svg>
  );
}

interface TabDef {
  id: string;
  label: string;
  href: string;
  isCenter?: boolean;
  icon: (active: boolean) => React.ReactNode;
  showBadge?: boolean;
}

// Mirrors the iOS app's MainTabView order: Map first, Profile last, with the
// claim CTA on the center disc (the web's centerpiece — points → $BLINK).
const TABS: TabDef[] = [
  { id: "watch", label: "Map", href: "/map", icon: (a) => <MapIcon active={a} /> },
  { id: "live", label: "Feed", href: "/live", icon: (a) => <LiveFeedIcon active={a} /> },
  { id: "claim", label: "Claim", href: "/claim", isCenter: true, icon: () => <ClaimIcon /> },
  { id: "wallet", label: "Wallet", href: "/wallet", icon: (a) => <WalletIcon active={a} />, showBadge: true },
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

  // Count of unclaimed received gifts (badge on Wallet tab)
  const fetchUnreadGifts = useCallback(async () => {
    if (!user) return;
    try {
      const { count } = await supabase
        .from("gifts")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("status", "pending");
      if (typeof count === "number") setWalletBadge(count);
    } catch {
      /* badge is best-effort */
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadGifts();
    const t = setInterval(fetchUnreadGifts, 45_000);
    return () => clearInterval(t);
  }, [fetchUnreadGifts]);

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
          {/* BLINK logo mark at top */}
          <Link
            href="/"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 28,
              flexShrink: 0,
              background: "rgba(0,255,136,0.06)",
              border: `1px solid ${C.primary}30`,
              textDecoration: "none",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-orb-transparent.png" alt="BLINK" style={{ width: 26, height: 26, objectFit: "cover", borderRadius: "50%", filter: "drop-shadow(0 0 8px rgba(0,255,136,0.6))" }} />
          </Link>

          {/* Tab items */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
            {TABS.map((tab) => {
              const active = isActive(tab.href);
              const isHovered = hoveredTab === tab.id;

              if (tab.isCenter) {
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
                      textDecoration: "none",
                      margin: "12px 0",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        transform: isHovered ? "scale(1.08)" : "scale(1)",
                        transition: "transform 0.2s ease",
                        display: "flex",
                      }}
                    >
                      <ClaimIcon size={44} />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 600, color: C.primary, letterSpacing: "0.01em" }}>
                      {tab.label}
                    </span>
                  </Link>
                );
              }

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

          if (tab.isCenter) {
            return (
              <Link
                key={tab.id}
                href={tab.href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  textDecoration: "none",
                  flex: 1,
                  position: "relative",
                  top: -10,
                }}
              >
                <ClaimIcon size={46} />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: C.primary,
                    letterSpacing: "0.01em",
                  }}
                >
                  {tab.label}
                </span>
              </Link>
            );
          }

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
