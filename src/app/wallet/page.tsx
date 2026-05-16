"use client";

// BLINK Phantom-tier wallet page.
// Hero card with total USD + 24h change + Send/Receive/Buy/Swap actions.
// Address chip, asset list (ETH + BLINK + other ERC-20s if available), tabbed
// switch between Assets / Activity / NFTs, plus a prominent Spirit Gift CTA.

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { C, truncateAddress } from "@/lib/theme";
import { usePrices } from "@/hooks/usePrices";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ProfileData {
  display_name: string | null;
  handle: string | null;
  eth_address: string | null;
  avatar_url: string | null;
}

interface ActivityRow {
  id: string;
  type: string;
  title: string | null;
  subtitle: string | null;
  amount_text: string | null;
  created_at: string;
  tx_hash: string | null;
}

interface ERC20Token {
  symbol: string;
  name: string;
  balance: number;
  usd?: number;
  change24h?: number;
}

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */
function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtETH(n: number): string {
  if (n === 0) return "0";
  if (n < 0.0001) return n.toFixed(8);
  if (n < 1) return n.toFixed(6);
  return n.toFixed(4);
}

function isValidEthAddress(s: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(s.trim());
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Animated USD counter                                               */
/* ------------------------------------------------------------------ */
function useAnimatedNumber(target: number, duration = 800): number {
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
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(startRef.current + (target - startRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                                */
/* ------------------------------------------------------------------ */
type TabKey = "assets" | "activity" | "nfts";

/* ------------------------------------------------------------------ */
/*  Wallet Page                                                         */
/* ------------------------------------------------------------------ */
export default function WalletPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const prices = usePrices();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [ethBalance, setEthBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState("");
  const [change24h, setChange24h] = useState<number | null>(null);

  const [blinkBalance, setBlinkBalance] = useState<number>(0);
  const [otherTokens] = useState<ERC20Token[]>([]);

  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const [pendingGiftsCount, setPendingGiftsCount] = useState<number>(0);

  const [tab, setTab] = useState<TabKey>("assets");

  const [copied, setCopied] = useState(false);

  // Send modal
  const [showSend, setShowSend] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendPassword, setSendPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendTxHash, setSendTxHash] = useState("");

  // Receive modal
  const [showReceive, setShowReceive] = useState(false);

  // Export key modal
  const [showExport, setShowExport] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exportedKey, setExportedKey] = useState("");

  /* ---- redirect if unauthenticated ---- */
  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  /* ---- fetch profile ---- */
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoadingProfile(true);
    const { data } = await supabase
      .from("profiles")
      .select("display_name, handle, eth_address, avatar_url")
      .eq("id", user.id)
      .single();
    if (data) setProfile(data as ProfileData);
    setLoadingProfile(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /* ---- fetch ETH balance ---- */
  const refreshBalance = useCallback(async () => {
    const addr = profile?.eth_address;
    if (!addr) return;
    setLoadingBalance(true);
    setBalanceError("");
    try {
      const res = await fetch(
        `/api/wallet/balance?address=${encodeURIComponent(addr)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch balance");
      setEthBalance(typeof data.eth === "number" ? data.eth : 0);
      if (typeof data.blink === "number") setBlinkBalance(data.blink);
    } catch (err: unknown) {
      setBalanceError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoadingBalance(false);
    }
  }, [profile?.eth_address]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  /* ---- 24h change ---- */
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

  /* ---- fetch activity ---- */
  const fetchActivity = useCallback(async () => {
    if (!user) return;
    setLoadingActivity(true);
    try {
      const res = await fetch(`/api/activity?user_id=${user.id}`);
      const data = await res.json();
      if (Array.isArray(data.activities)) setActivities(data.activities);
    } catch {
      /* ignore */
    } finally {
      setLoadingActivity(false);
    }
  }, [user]);

  useEffect(() => {
    if (tab === "activity") fetchActivity();
  }, [tab, fetchActivity]);

  /* ---- pending received gifts count ---- */
  useEffect(() => {
    if (!user) return;
    supabase
      .from("gifts")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("status", "pending")
      .then(({ count }) => {
        if (typeof count === "number") setPendingGiftsCount(count);
      });
  }, [user]);

  /* ---- copy helper ---- */
  const copyAddress = async () => {
    if (!profile?.eth_address) return;
    try {
      await navigator.clipboard.writeText(profile.eth_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  /* ---- send ETH ---- */
  const submitSend = async () => {
    if (!user) return;
    const to = sendTo.trim();
    const amt = parseFloat(sendAmount);
    if (!isValidEthAddress(to)) {
      setSendError("Enter a valid 0x address");
      return;
    }
    if (!amt || amt <= 0) {
      setSendError("Enter an amount greater than 0");
      return;
    }
    if (amt > ethBalance) {
      setSendError(`Insufficient balance — ${fmtETH(ethBalance)} ETH available`);
      return;
    }
    if (!sendPassword) {
      setSendError("Enter your password to confirm");
      return;
    }
    setSending(true);
    setSendError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");
      const res = await fetch("/api/wallet/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          to_address: to,
          amount: amt,
          password: sendPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setSendTxHash(data.txHash || "");
      setSendPassword("");
      setSendAmount("");
      setSendTo("");
      setTimeout(refreshBalance, 3000);
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  /* ---- export key ---- */
  const submitExport = async () => {
    if (!exportPassword) {
      setExportError("Enter your password");
      return;
    }
    setExportLoading(true);
    setExportError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");
      const res = await fetch("/api/wallet/export-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ password: exportPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed");
      setExportedKey(data.private_key || "");
      setExportPassword("");
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportLoading(false);
    }
  };

  const closeSend = () => {
    setShowSend(false);
    setSendError("");
    setSendTxHash("");
    setSendPassword("");
  };

  const closeExport = () => {
    setShowExport(false);
    setExportError("");
    setExportedKey("");
    setExportPassword("");
  };

  const ethAddress = profile?.eth_address || "";
  const ethUSD = ethBalance * prices.eth;
  const totalUSD = ethUSD; // BLINK = ETH-only — could add blinkBalance * blinkPrice when listed
  const animatedTotal = useAnimatedNumber(totalUSD);
  const qrUrl = ethAddress
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&bgcolor=0d0d14&color=ffffff&data=${encodeURIComponent(ethAddress)}`
    : "";

  const changeColor =
    change24h === null ? C.muted : change24h >= 0 ? C.primary : C.danger;
  const changeSign = change24h !== null && change24h >= 0 ? "+" : "";

  if (authLoading || !user) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ padding: "8px 16px 120px", maxWidth: 560, margin: "0 auto" }}>
      {/* ============ HERO ============ */}
      <div
        style={{
          position: "relative",
          marginTop: 8,
          marginBottom: 18,
          background:
            "linear-gradient(160deg, rgba(0,255,136,0.10) 0%, rgba(13,13,20,0.6) 60%)",
          border: `1px solid ${C.primary}22`,
          borderRadius: 22,
          padding: "26px 22px 22px",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        }}
      >
        {/* subtle blurred orb behind */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,255,136,0.18), transparent 70%)",
            filter: "blur(6px)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.muted,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
            }}
          >
            Total Balance
          </span>
          <button
            type="button"
            onClick={refreshBalance}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${C.glassBorder}`,
              borderRadius: 8,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
            }}
            aria-label="Refresh"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.muted}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: loadingBalance ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.6s",
              }}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 38,
              fontWeight: 800,
              color: C.text,
              letterSpacing: "-1.2px",
              lineHeight: 1.05,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ${fmtUSD(animatedTotal)}
          </span>
        </div>

        {change24h !== null && (
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background:
                change24h >= 0
                  ? "rgba(0,255,136,0.12)"
                  : "rgba(239,68,68,0.12)",
              border: `1px solid ${
                change24h >= 0
                  ? "rgba(0,255,136,0.3)"
                  : "rgba(239,68,68,0.3)"
              }`,
              padding: "4px 10px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              color: changeColor,
              marginBottom: 18,
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke={changeColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform:
                  change24h >= 0 ? "rotate(0deg)" : "rotate(180deg)",
              }}
            >
              <polyline points="6 15 12 9 18 15" />
            </svg>
            {changeSign}
            {change24h.toFixed(2)}% · 24h
          </div>
        )}

        {/* Address chip */}
        {ethAddress && (
          <div
            onClick={copyAddress}
            style={{
              position: "relative",
              zIndex: 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(0,0,0,0.35)",
              border: `1px solid ${C.glassBorder}`,
              borderRadius: 999,
              padding: "6px 12px",
              cursor: "pointer",
              marginBottom: 22,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: C.primary,
                boxShadow: `0 0 6px ${C.primary}`,
              }}
            />
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                color: C.text,
                letterSpacing: "0.02em",
              }}
            >
              {truncateAddress(ethAddress)}
            </span>
            <span
              style={{
                fontSize: 11,
                color: copied ? C.primary : C.muted,
                fontWeight: 600,
              }}
            >
              {copied ? "Copied" : "Copy"}
            </span>
          </div>
        )}

        {/* Action buttons row */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 8,
          }}
        >
          <ActionButton
            label="Send"
            onClick={() => setShowSend(true)}
            disabled={!ethAddress}
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.primary}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            }
          />
          <ActionButton
            label="Receive"
            onClick={() => setShowReceive(true)}
            disabled={!ethAddress}
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.primary}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            }
          />
        </div>
      </div>

      {/* ============ SPIRIT GIFT CTA — primary discovery affordance ============ */}
      <Link
        href="/gift/new"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 22px",
          marginBottom: 22,
          background:
            "linear-gradient(120deg, rgba(0,255,136,0.22) 0%, rgba(136,255,0,0.10) 60%, rgba(0,255,136,0.16) 100%)",
          border: `1px solid ${C.primary}66`,
          borderRadius: 18,
          textDecoration: "none",
          color: C.text,
          cursor: "pointer",
          boxShadow: `0 8px 28px ${C.primary}25, inset 0 1px 0 rgba(255,255,255,0.06)`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,255,136,0.28), transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 14,
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "rgba(0,255,136,0.22)",
              border: `1px solid ${C.primary}80`,
              boxShadow: `0 0 16px ${C.primary}50`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.primary}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 12 20 22 4 22 4 12" />
              <rect x="2" y="7" width="20" height="5" />
              <line x1="12" y1="22" x2="12" y2="7" />
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: C.text,
                letterSpacing: "-0.3px",
              }}
            >
              Send a Spirit Gift
            </span>
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>
              {pendingGiftsCount > 0
                ? `${pendingGiftsCount} unclaimed gift${pendingGiftsCount === 1 ? "" : "s"} waiting`
                : "Share crypto as a discoverable spirit"}
            </span>
          </div>
        </div>
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: C.primary,
            color: "#0a0a0f",
            fontSize: 12,
            fontWeight: 800,
            padding: "8px 14px",
            borderRadius: 999,
            letterSpacing: "0.02em",
            boxShadow: `0 4px 14px ${C.primary}50`,
            flexShrink: 0,
          }}
        >
          New
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0a0a0f"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </Link>

      {/* ============ TABS ============ */}
      <div
        style={{
          display: "flex",
          gap: 4,
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${C.glassBorder}`,
          borderRadius: 12,
          padding: 4,
          marginBottom: 12,
        }}
      >
        {(["assets", "activity", "nfts"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 8,
              border: "none",
              background: tab === k ? "rgba(0,255,136,0.14)" : "transparent",
              color: tab === k ? C.text : C.muted,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.02em",
              textTransform: "capitalize",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.2s, color 0.2s",
            }}
          >
            {k === "nfts" ? "NFTs" : k}
          </button>
        ))}
      </div>

      {/* ============ TAB CONTENT ============ */}
      {tab === "assets" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <AssetRow
            symbol="ETH"
            name="Ethereum"
            balance={ethBalance}
            balanceText={`${fmtETH(ethBalance)} ETH`}
            usd={ethUSD}
            change24h={change24h}
            badge={null}
          />
          {blinkBalance > 0 && (
            <AssetRow
              symbol="BLINK"
              name="BLINK Token"
              balance={blinkBalance}
              balanceText={`${blinkBalance.toLocaleString("en-US", { maximumFractionDigits: 2 })} BLINK`}
              usd={undefined}
              change24h={null}
              badge="Native"
            />
          )}
          {otherTokens.map((t) => (
            <AssetRow
              key={t.symbol}
              symbol={t.symbol}
              name={t.name}
              balance={t.balance}
              balanceText={`${t.balance.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${t.symbol}`}
              usd={t.usd}
              change24h={t.change24h ?? null}
              badge={null}
            />
          ))}

          {/* Account section: export key */}
          <button
            type="button"
            onClick={() => setShowExport(true)}
            disabled={!ethAddress}
            style={{
              marginTop: 12,
              width: "100%",
              background: C.surface,
              border: `1px solid ${C.glassBorder}`,
              borderRadius: 14,
              padding: "14px 16px",
              color: ethAddress ? C.text : C.muted,
              fontSize: 13,
              fontWeight: 600,
              cursor: ethAddress ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.muted}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Export private key</span>
            </span>
            <span style={{ fontSize: 11, color: C.muted }}>Password required</span>
          </button>
        </div>
      )}

      {tab === "activity" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {loadingActivity && activities.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: C.muted,
                fontSize: 13,
              }}
            >
              Loading activity…
            </div>
          )}
          {!loadingActivity && activities.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: C.muted,
                fontSize: 13,
                border: `1px dashed ${C.glassBorder}`,
                borderRadius: 14,
              }}
            >
              No activity yet.
            </div>
          )}
          {activities.map((a) => (
            <ActivityCard key={a.id} row={a} />
          ))}
        </div>
      )}

      {tab === "nfts" && (
        <div
          style={{
            padding: 32,
            textAlign: "center",
            color: C.muted,
            fontSize: 13,
            border: `1px dashed ${C.glassBorder}`,
            borderRadius: 14,
          }}
        >
          {ethAddress
            ? "No NFTs detected yet. BLINK Genesis & Mythics will appear here."
            : "Connect your wallet to view NFTs."}
        </div>
      )}

      {balanceError && (
        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 10,
            color: C.danger,
            fontSize: 12,
          }}
        >
          {balanceError}
        </div>
      )}

      {/* ============ SEND MODAL ============ */}
      {showSend && (
        <Modal title={sendTxHash ? "Sent" : "Send ETH"} onClose={closeSend}>
          {sendTxHash ? (
            <SendSuccess txHash={sendTxHash} onDone={closeSend} />
          ) : (
            <>
              <Field label="To">
                <input
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                  placeholder="0x..."
                  style={inputStyle}
                  autoComplete="off"
                />
              </Field>
              <Field label="Amount (ETH)">
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    placeholder="0.00"
                    style={{
                      ...inputStyle,
                      paddingRight: 70,
                      fontSize: 20,
                      fontWeight: 700,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setSendAmount(fmtETH(ethBalance))}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "rgba(0,255,136,0.15)",
                      border: `1px solid ${C.primary}40`,
                      borderRadius: 8,
                      color: C.primary,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    MAX
                  </button>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: C.muted,
                    marginTop: 6,
                  }}
                >
                  Available: {fmtETH(ethBalance)} ETH (${fmtUSD(ethUSD)})
                </div>
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  value={sendPassword}
                  onChange={(e) => setSendPassword(e.target.value)}
                  placeholder="Confirm with your password"
                  style={inputStyle}
                  autoComplete="current-password"
                />
                <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                  Required to sign. Never stored.
                </div>
              </Field>
              {sendError && <ErrorBox>{sendError}</ErrorBox>}
              <PrimaryButton onClick={submitSend} disabled={sending}>
                {sending ? "Sending…" : "Confirm Send"}
              </PrimaryButton>
            </>
          )}
        </Modal>
      )}

      {/* ============ RECEIVE MODAL ============ */}
      {showReceive && ethAddress && (
        <Modal title="Receive ETH" onClose={() => setShowReceive(false)}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                padding: 16,
                background: C.surface,
                borderRadius: 20,
                border: `1px solid ${C.primary}30`,
                marginBottom: 16,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="ETH address QR"
                width={220}
                height={220}
                style={{ borderRadius: 8, display: "block" }}
              />
            </div>
            <div
              style={{
                fontSize: 11,
                color: C.muted,
                fontWeight: 600,
                letterSpacing: "0.4px",
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              ETH Address
            </div>
            <div
              style={{
                width: "100%",
                background: C.surface,
                border: `1px solid ${C.glassBorder}`,
                borderRadius: 12,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontFamily: "monospace",
                  color: C.text,
                  wordBreak: "break-all",
                }}
              >
                {ethAddress}
              </span>
              <button
                type="button"
                onClick={copyAddress}
                style={{
                  background: copied
                    ? "rgba(0,255,136,0.15)"
                    : "rgba(255,255,255,0.06)",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: copied ? C.primary : C.muted,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#d97706",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: 10,
                padding: "10px 14px",
                textAlign: "center",
              }}
            >
              Only send ETH to this address. Other assets may be lost.
            </div>
          </div>
        </Modal>
      )}

      {/* ============ EXPORT KEY MODAL ============ */}
      {showExport && (
        <Modal title="Export Private Key" onClose={closeExport}>
          {exportedKey ? (
            <>
              <div
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  color: "#d97706",
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontSize: 12,
                  marginBottom: 16,
                }}
              >
                Anyone with this key controls your funds. Copy once and store
                securely.
              </div>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.glassBorder}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: C.muted,
                    fontWeight: 600,
                    letterSpacing: "0.4px",
                    marginBottom: 6,
                    textTransform: "uppercase",
                  }}
                >
                  ETH Private Key
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: "monospace",
                    color: C.text,
                    wordBreak: "break-all",
                  }}
                >
                  {exportedKey}
                </div>
              </div>
              <PrimaryButton
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(exportedKey);
                  } catch {
                    /* ignore */
                  }
                }}
              >
                Copy key
              </PrimaryButton>
              <button
                type="button"
                onClick={closeExport}
                style={{
                  width: "100%",
                  marginTop: 8,
                  height: 50,
                  borderRadius: 25,
                  background: "transparent",
                  border: `2px solid ${C.primary}`,
                  color: C.primary,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Done
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
                Re-enter your password to reveal your private key. Shown once,
                never stored in plaintext.
              </div>
              <Field label="Password">
                <input
                  type="password"
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                  placeholder="Your password"
                  style={inputStyle}
                  autoComplete="current-password"
                />
              </Field>
              {exportError && <ErrorBox>{exportError}</ErrorBox>}
              <PrimaryButton onClick={submitExport} disabled={exportLoading}>
                {exportLoading ? "Verifying…" : "Reveal Private Key"}
              </PrimaryButton>
            </>
          )}
        </Modal>
      )}

      {/* Hidden — for visual consistency reference */}
      {loadingProfile && null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                       */
/* ------------------------------------------------------------------ */
function ActionButton({
  label,
  onClick,
  icon,
  disabled,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.4)",
        border: `1px solid ${disabled ? C.glassBorder : C.primary + "33"}`,
        borderRadius: 14,
        padding: "10px 6px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.2s, transform 0.1s",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "rgba(0,255,136,0.12)",
          border: `1px solid ${C.primary}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: C.text,
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </span>
    </button>
  );
}

function AssetRow({
  symbol,
  name,
  balanceText,
  usd,
  change24h,
  badge,
}: {
  symbol: string;
  name: string;
  balance: number;
  balanceText: string;
  usd?: number;
  change24h: number | null;
  badge?: string | null;
}) {
  const changeColor =
    change24h === null ? C.muted : change24h >= 0 ? C.primary : C.danger;

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, rgba(0,255,136,0.20), rgba(136,255,0,0.06))",
            border: `1px solid ${C.primary}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: C.primary,
              letterSpacing: "-0.4px",
            }}
          >
            {symbol.slice(0, 3)}
          </span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
              {name}
            </span>
            {badge && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: C.primary,
                  background: "rgba(0,255,136,0.12)",
                  border: `1px solid ${C.primary}40`,
                  padding: "1px 6px",
                  borderRadius: 4,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {badge}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>{balanceText}</div>
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {typeof usd === "number" ? (
          <>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: C.text,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ${fmtUSD(usd)}
            </div>
            {change24h !== null && (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: changeColor,
                  marginTop: 2,
                }}
              >
                {change24h >= 0 ? "+" : ""}
                {change24h.toFixed(2)}%
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 11, color: C.muted }}>—</div>
        )}
      </div>
    </div>
  );
}

function ActivityCard({ row }: { row: ActivityRow }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 14,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "rgba(0,255,136,0.10)",
          border: `1px solid ${C.primary}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
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
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: C.text,
            marginBottom: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {row.title || row.type}
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>
          {row.subtitle || ""} · {timeAgo(row.created_at)}
        </div>
      </div>
      {row.amount_text && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: C.text,
            flexShrink: 0,
          }}
        >
          {row.amount_text}
        </div>
      )}
      {row.tx_hash && (
        <a
          href={`https://etherscan.io/tx/${row.tx_hash}`}
          target="_blank"
          rel="noreferrer"
          style={{
            color: C.muted,
            display: "flex",
            alignItems: "center",
            padding: 4,
          }}
          aria-label="Open on Etherscan"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal scaffolding                                                  */
/* ------------------------------------------------------------------ */
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          maxHeight: "90vh",
          background: C.bg,
          border: `1px solid ${C.primary}25`,
          borderRadius: 20,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: `1px solid ${C.glassBorder}`,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              padding: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Close"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.muted}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          color: C.muted,
          fontWeight: 700,
          letterSpacing: "0.5px",
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(239,68,68,0.1)",
        border: "1px solid rgba(239,68,68,0.3)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
        color: C.danger,
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        height: 50,
        borderRadius: 25,
        background: disabled ? "#374151" : C.primary,
        border: "none",
        color: disabled ? C.muted : "#0a0a0f",
        fontSize: 15,
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        boxShadow: disabled ? "none" : `0 4px 20px ${C.primary}40`,
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </button>
  );
}

function SendSuccess({
  txHash,
  onDone,
}: {
  txHash: string;
  onDone: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px 0",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "rgba(0,255,136,0.15)",
          border: `2px solid ${C.primary}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke={C.primary}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: C.text,
          marginBottom: 8,
        }}
      >
        Transaction sent
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
        TX hash
      </div>
      <a
        href={`https://etherscan.io/tx/${txHash}`}
        target="_blank"
        rel="noreferrer"
        style={{
          fontSize: 12,
          fontFamily: "monospace",
          color: C.primary,
          wordBreak: "break-all",
          padding: "0 16px",
          marginBottom: 24,
          textDecoration: "none",
        }}
      >
        {txHash}
      </a>
      <PrimaryButton onClick={onDone}>Done</PrimaryButton>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared inline style                                                 */
/* ------------------------------------------------------------------ */
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: C.surface,
  border: `1px solid ${C.glassBorder}`,
  borderRadius: 12,
  color: C.text,
  padding: "12px 14px",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};
