"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";
import { C } from "@/lib/theme";
import { useBalances } from "@/hooks/useBalances";
import { usePrices } from "@/hooks/usePrices";

/* ------------------------------------------------------------------ */
/*  Animated counter — smoothly tweens between USD values              */
/* ------------------------------------------------------------------ */
function useAnimatedNumber(target: number, duration = 700): number {
  const [value, setValue] = useState(target);
  const startRef = useRef(target);
  const startTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === value) return;
    startRef.current = value;
    startTsRef.current = null;

    const tick = (ts: number) => {
      if (startTsRef.current === null) startTsRef.current = ts;
      const elapsed = ts - startTsRef.current;
      const t = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = startRef.current + (target - startRef.current) * eased;
      setValue(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}

function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ------------------------------------------------------------------ */
/*  Portfolio bar — Phantom-style persistent header                    */
/* ------------------------------------------------------------------ */
export default function PortfolioBar() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [isWide, setIsWide] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<{
    eth_address: string | null;
    avatar_url: string | null;
    display_name: string | null;
    handle: string | null;
  }>({ eth_address: null, avatar_url: null, display_name: null, handle: null });

  // 24h change %: cached snapshot in localStorage to derive direction
  const [change24h, setChange24h] = useState<number | null>(null);

  useEffect(() => {
    function checkWidth() {
      setIsWide(window.innerWidth >= 1024);
    }
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  // Click-outside to close avatar menu
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("eth_address, avatar_url, display_name, handle")
      .eq("id", user.id)
      .single();
    if (data) setProfile(data);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const { eth } = useBalances({ eth_address: profile.eth_address });
  const prices = usePrices();
  const totalUSD = eth * prices.eth;
  const animated = useAnimatedNumber(totalUSD);

  // Track 24h: try CoinGecko market-data, fall back to local snapshot
  useEffect(() => {
    let cancelled = false;
    async function fetchChange() {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ethereum",
          { signal: AbortSignal.timeout(5000) },
        );
        const data = await res.json();
        const pct = data?.[0]?.price_change_percentage_24h;
        if (!cancelled && typeof pct === "number") setChange24h(pct);
      } catch {
        /* ignore */
      }
    }
    fetchChange();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;

  const initial =
    (profile.display_name || profile.handle || user.email || "?")
      .trim()
      .charAt(0)
      .toUpperCase();

  const changeColor =
    change24h === null ? C.muted : change24h >= 0 ? C.primary : C.danger;
  const changeSign = change24h !== null && change24h >= 0 ? "+" : "";

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background:
            "linear-gradient(180deg, rgba(13,13,20,0.96) 0%, rgba(10,10,15,0.92) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid rgba(0,255,136,0.08)`,
          boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
          minHeight: "calc(60px + max(env(safe-area-inset-top, 0px), var(--blink-top-inset, 0px)))",
          paddingTop: "max(env(safe-area-inset-top, 0px), var(--blink-top-inset, 0px))",
          userSelect: "none",
        }}
      >
        <div
          style={{
            maxWidth: isWide ? 1200 : 560,
            margin: "0 auto",
            width: "100%",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            gap: 12,
          }}
        >
          {/* LEFT: tappable balance area → /wallet */}
          <div
            onClick={() => router.push("/wallet")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background:
                  "linear-gradient(135deg, rgba(0,255,136,0.18), rgba(136,255,0,0.06))",
                border: `1px solid ${C.primary}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.primary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5V8H5a1 1 0 0 0 0 2h16v8.5A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5z" />
                <circle cx="17" cy="14.5" r="1.4" fill={C.primary} stroke="none" />
              </svg>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
                gap: 2,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    color: C.text,
                    fontSize: 19,
                    fontWeight: 800,
                    letterSpacing: "-0.4px",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  ${fmtUSD(animated)}
                </span>
                {change24h !== null && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: changeColor,
                      background:
                        change24h >= 0
                          ? "rgba(0,255,136,0.10)"
                          : "rgba(239,68,68,0.10)",
                      border: `1px solid ${
                        change24h >= 0
                          ? "rgba(0,255,136,0.25)"
                          : "rgba(239,68,68,0.25)"
                      }`,
                      borderRadius: 6,
                      padding: "2px 6px",
                      lineHeight: 1,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {changeSign}
                    {change24h.toFixed(2)}%
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: C.muted,
                  fontWeight: 600,
                  letterSpacing: "0.4px",
                  textTransform: "uppercase",
                }}
              >
                {eth.toLocaleString("en-US", { maximumFractionDigits: 4 })} ETH
              </div>
            </div>
          </div>

          {/* RIGHT: gift quick-action + avatar with dropdown */}
          <style>{`@keyframes mishGiftPulse {
            0% { box-shadow: 0 0 0 0 rgba(0,255,136,0.55), 0 0 8px rgba(0,255,136,0.35); }
            70% { box-shadow: 0 0 0 8px rgba(0,255,136,0), 0 0 8px rgba(0,255,136,0.35); }
            100% { box-shadow: 0 0 0 0 rgba(0,255,136,0), 0 0 8px rgba(0,255,136,0.35); }
          }`}</style>
          <Link
            href="/gift/new"
            aria-label="Send a Spirit Gift"
            title="Send a Spirit Gift"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: `2px solid ${C.primary}`,
              background: "rgba(0,255,136,0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              textDecoration: "none",
              cursor: "pointer",
              animation: "mishGiftPulse 2.2s ease-out infinite",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.primary}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 12 20 22 4 22 4 12" />
              <rect x="2" y="7" width="20" height="5" />
              <line x1="12" y1="22" x2="12" y2="7" />
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
          </Link>
          <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Account menu"
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                border: `2px solid ${menuOpen ? C.primary : "transparent"}`,
                background: menuOpen
                  ? "rgba(0,255,136,0.12)"
                  : "rgba(255,255,255,0.04)",
                cursor: "pointer",
                padding: 0,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "border-color 0.2s, background 0.2s",
              }}
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt="You"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span
                  style={{
                    color: C.primary,
                    fontSize: 15,
                    fontWeight: 800,
                    letterSpacing: "-0.5px",
                  }}
                >
                  {initial}
                </span>
              )}
            </button>

            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  minWidth: 200,
                  background: "rgba(13,13,20,0.98)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  border: `1px solid ${C.primary}25`,
                  borderRadius: 14,
                  boxShadow: "0 12px 36px rgba(0,0,0,0.5)",
                  padding: 6,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  zIndex: 200,
                }}
              >
                <div
                  style={{
                    padding: "10px 12px 8px",
                    borderBottom: `1px solid ${C.glassBorder}`,
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: C.text,
                      letterSpacing: "-0.2px",
                    }}
                  >
                    {profile.display_name || profile.handle || "You"}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: C.muted,
                      marginTop: 2,
                    }}
                  >
                    {profile.handle ? `@${profile.handle}` : user.email}
                  </div>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  style={menuItemStyle}
                >
                  <ProfileIconSm />
                  <span>View Profile</span>
                </Link>
                <Link
                  href="/friends"
                  onClick={() => setMenuOpen(false)}
                  style={menuItemStyle}
                >
                  <FriendsIconSm />
                  <span>Friends</span>
                </Link>
                <Link
                  href="/gift/new"
                  onClick={() => setMenuOpen(false)}
                  style={menuItemStyle}
                >
                  <GiftIconSm />
                  <span>Send a Gift</span>
                </Link>
                <Link
                  href="/gifts"
                  onClick={() => setMenuOpen(false)}
                  style={menuItemStyle}
                >
                  <GiftIconSm />
                  <span>My Gifts</span>
                </Link>
                <Link
                  href="/profile?tab=settings"
                  onClick={() => setMenuOpen(false)}
                  style={menuItemStyle}
                >
                  <SettingsIconSm />
                  <span>Settings</span>
                </Link>
                <div
                  style={{
                    height: 1,
                    background: C.glassBorder,
                    margin: "4px 6px",
                  }}
                />
                <button
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false);
                    await signOut();
                    router.replace("/");
                  }}
                  style={{
                    ...menuItemStyle,
                    color: C.danger,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <SignOutIconSm />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Menu item style + tiny SVGs                                        */
/* ------------------------------------------------------------------ */
const menuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 8,
  textDecoration: "none",
  color: C.text,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "-0.1px",
};

function ProfileIconSm() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  );
}
function FriendsIconSm() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function GiftIconSm() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}
function SettingsIconSm() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function SignOutIconSm() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
