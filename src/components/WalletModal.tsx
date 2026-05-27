"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";
import {
  C,
  truncateAddress,
  withdrawalBreakdown,
  type OrbCurrency,
  type ActivityRow,
} from "@/lib/theme";
import { useBalances } from "@/hooks/useBalances";
import { usePrices } from "@/hooks/usePrices";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface ChainBalance {
  chain: OrbCurrency;
  native: number;
  usd: number;
  change24h: number;
  address: string;
}

interface WalletLock {
  id: string;
  currency: OrbCurrency;
  amount: number;
  locked_at: string;
  reason: string;
}

interface SendState {
  chain: OrbCurrency;
  recipient: string;
  amount: string;
  password: string;
  sending: boolean;
  error: string;
  success: string;
}

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  QR Code (canvas-based simple renderer)                             */
/* ------------------------------------------------------------------ */
function QRCanvas({ value, size = 160 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Simple QR-like visual using deterministic hash pattern
    const cell = Math.floor(size / 25);
    const cols = 25;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#000000";

    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }

    for (let r = 0; r < cols; r++) {
      for (let c = 0; c < cols; c++) {
        const seed = ((hash ^ (r * 397 + c * 7919)) >>> 0) % 2;
        // Force finder patterns (corners)
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= cols - 8;
        const inBottomLeft = r >= cols - 8 && c < 8;
        let fill = seed === 1;
        if (inTopLeft || inTopRight || inBottomLeft) {
          const lr = inTopLeft ? r : inBottomLeft ? r - (cols - 8) : r;
          const lc = inTopLeft ? c : inTopRight ? c - (cols - 8) : c;
          const outer = lr === 0 || lr === 6 || lc === 0 || lc === 6;
          const inner = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
          fill = outer || inner;
        }
        if (fill) {
          ctx.fillRect(c * cell, r * cell, cell, cell);
        }
      }
    }
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ borderRadius: 8, display: "block" }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Chain icon SVG components                                          */
/* ------------------------------------------------------------------ */
function SolIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M20.83 14.55L19.02 16.36C18.88 16.5 18.69 16.58 18.49 16.58H3.5C3.22 16.58 3.08 16.24 3.28 16.04L5.09 14.23C5.23 14.09 5.42 14.01 5.62 14.01H20.61C20.89 14.01 21.03 14.35 20.83 14.55Z" fill={C.primary} />
      <path d="M20.83 9.42L19.02 7.61C18.88 7.47 18.69 7.39 18.49 7.39H3.5C3.22 7.39 3.08 7.73 3.28 7.93L5.09 9.74C5.23 9.88 5.42 9.96 5.62 9.96H20.61C20.89 9.96 21.03 9.62 20.83 9.42Z" fill={C.primary} />
      <path d="M5.09 11.85C5.23 11.71 5.42 11.63 5.62 11.63H20.61C20.89 11.63 21.03 11.97 20.83 12.17L19.02 13.98C18.88 14.12 18.69 14.2 18.49 14.2H3.5C3.22 14.2 3.08 13.86 3.28 13.66L5.09 11.85Z" fill={C.primary} />
    </svg>
  );
}

function EthIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L5 12.5L12 16L19 12.5L12 2Z" fill={C.ethBlue} opacity="0.7" />
      <path d="M12 16L5 12.5L12 22L19 12.5L12 16Z" fill={C.ethBlue} />
      <path d="M12 2L12 16L19 12.5L12 2Z" fill={C.ethBlue} opacity="0.5" />
      <path d="M12 16L12 22L19 12.5L12 16Z" fill={C.ethBlue} opacity="0.7" />
    </svg>
  );
}

function BtcIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M17.06 10.06C17.49 8.75 16.66 7.5 15 7.13V5H13.5V7H12V5H10.5V7H8V8.5H9.5V15.5H8V17H10.5V19H12V17H13.5V19H15V17C16.93 16.5 18 15.25 17.63 13.5C17.36 12.3 16.36 11.36 17.06 10.06ZM11 9H14C14.83 9 15.5 9.67 15.5 10.5C15.5 11.33 14.83 12 14 12H11V9ZM14.5 15.5H11V13H14.5C15.33 13 16 13.67 16 14.5C16 15.33 15.33 16 14.5 15.5Z" fill={C.btcOrange} />
    </svg>
  );
}

function ChainIconComponent({ chain, size = 20 }: { chain: OrbCurrency; size?: number }) {
  if (chain === "SOL") return <SolIcon size={size} />;
  if (chain === "ETH") return <EthIcon size={size} />;
  return <BtcIcon size={size} />;
}

function chainColor(chain: OrbCurrency): string {
  if (chain === "SOL") return C.primary;
  if (chain === "ETH") return C.ethBlue;
  return C.btcOrange;
}

// BLINK: ETH-only — visible chain list. Underlying SOL/BTC types preserved but never shown.
const VISIBLE_CHAINS: OrbCurrency[] = ["ETH"];

/* ------------------------------------------------------------------ */
/*  Balance fetching (now via useBalances hook)                         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Main WalletModal component                                         */
/* ------------------------------------------------------------------ */
export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"balance" | "activity">("balance");
  const [view, setView] = useState<"main" | "send" | "receive">("main");
  const [locks, setLocks] = useState<WalletLock[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [receiveChain, setReceiveChain] = useState<OrbCurrency>("ETH");
  const [copied, setCopied] = useState(false);
  const [send, setSend] = useState<SendState>({
    chain: "ETH",
    recipient: "",
    amount: "",
    password: "",
    sending: false,
    error: "",
    success: "",
  });

  const [addresses, setAddresses] = useState<{
    sol_address?: string | null;
    eth_address?: string | null;
    btc_address?: string | null;
  }>({});

  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("sol_address, eth_address, btc_address")
      .eq("id", user.id)
      .single();
    if (profile) setAddresses(profile);
  }, [user]);

  const { sol: solBal, eth: ethBal, btc: btcBal, loading: loadingBalances, refresh: refreshBalances } = useBalances(addresses);
  const prices = usePrices();

  // BLINK: ETH-only — SOL/BTC balance rows hidden from UI (underlying data still fetched).
  void solBal; void btcBal;
  const balances: ChainBalance[] = [
    // ...(addresses.sol_address ? [{ chain: "SOL" as OrbCurrency, native: solBal, usd: solBal * prices.sol, change24h: 0, address: addresses.sol_address }] : []), // BLINK: ETH-only — disabled
    ...(addresses.eth_address ? [{ chain: "ETH" as OrbCurrency, native: ethBal, usd: ethBal * prices.eth, change24h: 0, address: addresses.eth_address }] : []),
    // ...(addresses.btc_address ? [{ chain: "BTC" as OrbCurrency, native: btcBal, usd: btcBal * prices.btc, change24h: 0, address: addresses.btc_address }] : []), // BLINK: ETH-only — disabled
  ];

  const fetchLocks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("wallet_locks")
      .select("*")
      .eq("user_id", user.id)
      .order("locked_at", { ascending: false })
      .limit(10);
    setLocks((data as WalletLock[]) ?? []);
  }, [user]);

  const fetchActivity = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("activity")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setActivity((data as ActivityRow[]) ?? []);
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      fetchAddresses();
      refreshBalances();
      fetchLocks();
      fetchActivity();
    }
  }, [isOpen, user, fetchAddresses, refreshBalances, fetchLocks, fetchActivity]);

  const totalUSD = balances.reduce((s, b) => s + b.usd, 0);

  const getAddress = (chain: OrbCurrency) =>
    balances.find((b) => b.chain === chain)?.address ?? "";

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!send.recipient || !send.amount || parseFloat(send.amount) <= 0) {
      setSend((s) => ({ ...s, error: "Please enter a valid recipient and amount." }));
      return;
    }
    if (!send.password) {
      setSend((s) => ({ ...s, error: "Password required to confirm send." }));
      return;
    }
    setSend((s) => ({ ...s, sending: true, error: "", success: "" }));
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Not signed in.");

      const res = await fetch("/api/wallet/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          to_address: send.recipient,
          amount: parseFloat(send.amount),
          password: send.password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Send failed");
      setSend((s) => ({
        ...s,
        success: `Sent! Tx: ${data.txHash?.slice(0, 10)}…`,
        amount: "",
        recipient: "",
        password: "",
      }));
      // Refresh balances + activity once tx is broadcast.
      refreshBalances();
      fetchActivity();
    } catch (err: unknown) {
      setSend((s) => ({
        ...s,
        error: err instanceof Error ? err.message : "Transaction failed",
      }));
    } finally {
      setSend((s) => ({ ...s, sending: false }));
    }
  };

  const sendBreakdown = send.amount
    ? withdrawalBreakdown(parseFloat(send.amount) || 0)
    : null;

  /* ---- render: not open ---- */
  if (!isOpen) return null;

  /* ---- inner views ---- */
  const renderReceive = () => {
    const addr = getAddress(receiveChain);
    return (
      <div style={{ padding: "0 20px 32px" }}>
        <button
          onClick={() => setView("main")}
          style={{
            background: "none",
            border: "none",
            color: C.muted,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 0 16px",
            fontFamily: "inherit",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>
        <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: "0 0 20px" }}>
          Receive
        </h3>

        {/* Chain tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {VISIBLE_CHAINS.map((ch) => (
            <button
              key={ch}
              onClick={() => setReceiveChain(ch)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 8,
                border: `1px solid ${receiveChain === ch ? chainColor(ch) : C.card}`,
                background: receiveChain === ch ? `${chainColor(ch)}20` : C.card,
                color: receiveChain === ch ? chainColor(ch) : C.muted,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {ch}
            </button>
          ))}
        </div>

        {/* QR */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: 16,
            background: "#fff",
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          <QRCanvas value={addr || "blink"} size={160} />
        </div>

        {/* Address */}
        <div
          style={{
            background: C.card,
            border: `1px solid #2a2a3a`,
            borderRadius: 10,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{
              flex: 1,
              fontFamily: "monospace",
              fontSize: 12,
              color: C.muted,
              wordBreak: "break-all",
            }}
          >
            {addr || "No address found"}
          </span>
          <button
            onClick={() => handleCopy(addr)}
            style={{
              background: copied ? `${C.accent}20` : C.surface,
              border: `1px solid ${copied ? C.accent : "#2a2a3a"}`,
              borderRadius: 6,
              padding: "6px 12px",
              color: copied ? C.accent : C.muted,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    );
  };

  const renderSend = () => (
    <div style={{ padding: "0 20px 32px" }}>
      <button
        onClick={() => setView("main")}
        style={{
          background: "none",
          border: "none",
          color: C.muted,
          fontSize: 14,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 0 16px",
          fontFamily: "inherit",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>
      <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: "0 0 20px" }}>
        Send
      </h3>

      {/* Chain selector */}
      <label style={labelStyle}>Chain</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {VISIBLE_CHAINS.map((ch) => (
          <button
            key={ch}
            onClick={() => setSend((s) => ({ ...s, chain: ch }))}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 8,
              border: `1px solid ${send.chain === ch ? chainColor(ch) : C.card}`,
              background: send.chain === ch ? `${chainColor(ch)}20` : C.card,
              color: send.chain === ch ? chainColor(ch) : C.muted,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            {ch}
          </button>
        ))}
      </div>

      {/* Recipient */}
      <label style={labelStyle}>Recipient address</label>
      <input
        value={send.recipient}
        onChange={(e) => setSend((s) => ({ ...s, recipient: e.target.value }))}
        placeholder="Paste wallet address..."
        style={inputStyle}
      />

      {/* Amount */}
      <label style={{ ...labelStyle, marginTop: 14 }}>Amount</label>
      <input
        value={send.amount}
        type="number"
        min="0"
        step="any"
        onChange={(e) => setSend((s) => ({ ...s, amount: e.target.value }))}
        placeholder="0.00"
        style={inputStyle}
      />

      {/* Password (required by /api/wallet/send) */}
      <label style={{ ...labelStyle, marginTop: 14 }}>Password</label>
      <input
        value={send.password}
        type="password"
        autoComplete="current-password"
        onChange={(e) => setSend((s) => ({ ...s, password: e.target.value }))}
        placeholder="Re-enter your password"
        style={inputStyle}
      />

      {/* Fee breakdown */}
      {sendBreakdown && parseFloat(send.amount) > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: "12px 14px",
            background: C.card,
            borderRadius: 10,
            border: `1px solid #2a2a3a`,
          }}
        >
          <div style={feeRowStyle}>
            <span style={{ color: C.muted, fontSize: 13 }}>Amount</span>
            <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>
              {parseFloat(send.amount).toFixed(6)} {send.chain}
            </span>
          </div>
          <div style={feeRowStyle}>
            <span style={{ color: C.muted, fontSize: 13 }}>Platform fee (5%)</span>
            <span style={{ color: C.danger, fontSize: 13 }}>
              -{sendBreakdown.platformFee.toFixed(6)} {send.chain}
            </span>
          </div>
          <div
            style={{
              ...feeRowStyle,
              borderTop: `1px solid #2a2a3a`,
              paddingTop: 8,
              marginTop: 8,
            }}
          >
            <span style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>Recipient receives</span>
            <span style={{ color: C.accent, fontSize: 13, fontWeight: 700 }}>
              {sendBreakdown.userReceives.toFixed(6)} {send.chain}
            </span>
          </div>
        </div>
      )}

      {send.error && (
        <div style={errorBannerStyle}>{send.error}</div>
      )}
      {send.success && (
        <div style={successBannerStyle}>{send.success}</div>
      )}

      <button
        onClick={handleSend}
        disabled={send.sending || !send.recipient || !send.amount || !send.password}
        style={{
          ...actionBtnStyle,
          marginTop: 20,
          background:
            send.sending || !send.recipient || !send.amount || !send.password
              ? `${C.primary}55`
              : C.primary,
          cursor:
            send.sending || !send.recipient || !send.amount || !send.password ? "not-allowed" : "pointer",
          opacity: send.sending || !send.recipient || !send.amount || !send.password ? 0.6 : 1,
        }}
      >
        {send.sending ? (
          <SpinnerInline color="#fff" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        )}
        {send.sending ? "Sending..." : "Confirm Send"}
      </button>
    </div>
  );

  const renderMain = () => (
    <>
      {/* Portfolio total */}
      <div
        style={{
          padding: "8px 20px 24px",
          textAlign: "center",
          borderBottom: `1px solid #2a2a3a`,
        }}
      >
        <p style={{ color: C.muted, fontSize: 13, margin: "0 0 4px" }}>Total Portfolio</p>
        {loadingBalances ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
            <SpinnerInline color={C.primary} />
          </div>
        ) : (
          <p
            style={{
              color: C.text,
              fontSize: 36,
              fontWeight: 800,
              margin: "0 0 16px",
              letterSpacing: "-1px",
            }}
          >
            ${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}

        {/* Chain pills */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {VISIBLE_CHAINS.map((ch) => {
            const bal = balances.find((b) => b.chain === ch);
            return (
              <div
                key={ch}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  borderRadius: 20,
                  background: `${chainColor(ch)}15`,
                  border: `1px solid ${chainColor(ch)}40`,
                }}
              >
                <ChainIconComponent chain={ch} size={14} />
                <span style={{ color: chainColor(ch), fontSize: 12, fontWeight: 700 }}>
                  {bal ? bal.native.toFixed(4) : "—"}
                </span>
                <span style={{ color: C.muted, fontSize: 11 }}>{ch}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "16px 20px",
          borderBottom: `1px solid #2a2a3a`,
        }}
      >
        {[
          {
            label: "Send",
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            ),
            action: () => setView("send"),
            color: C.primary,
          },
          {
            label: "Receive",
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="8 17 12 21 16 17" />
                <line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
              </svg>
            ),
            action: () => setView("receive"),
            color: C.accent,
          },
          {
            label: "Buy",
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            ),
            action: () => window.open("https://jup.ag", "_blank"),
            color: C.gold,
          },
        ].map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: "12px 8px",
              borderRadius: 12,
              background: `${item.color}12`,
              border: `1px solid ${item.color}30`,
              color: item.color,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}
          >
            {item.icon}
            <span style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Tab selector */}
      <div
        style={{
          display: "flex",
          padding: "12px 20px 0",
          gap: 4,
          borderBottom: `1px solid #2a2a3a`,
        }}
      >
        {(["balance", "activity"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "10px 0",
              background: "none",
              border: "none",
              borderBottom: tab === t ? `2px solid ${C.primary}` : "2px solid transparent",
              color: tab === t ? C.text : C.muted,
              fontSize: 14,
              fontWeight: tab === t ? 700 : 500,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "color 0.15s",
              textTransform: "capitalize",
            }}
          >
            {t === "balance" ? "Balance" : "Activity"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 32px" }}>
        {tab === "balance" ? (
          <>
            {/* Asset list */}
            <div style={{ marginTop: 16 }}>
              {loadingBalances ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                  <SpinnerInline color={C.primary} />
                </div>
              ) : balances.length === 0 ? (
                <p style={{ color: C.muted, textAlign: "center", padding: "32px 0", fontSize: 14 }}>
                  No wallets connected. Complete onboarding to create wallets.
                </p>
              ) : (
                balances.map((bal) => (
                  <div
                    key={bal.chain}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 0",
                      borderBottom: `1px solid #2a2a3a`,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: `${chainColor(bal.chain)}15`,
                        border: `1px solid ${chainColor(bal.chain)}30`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <ChainIconComponent chain={bal.chain} size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, color: C.text, fontSize: 14, fontWeight: 700 }}>
                        {bal.chain}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          color: C.muted,
                          fontSize: 11,
                          fontFamily: "monospace",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {truncateAddress(bal.address)}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, color: C.text, fontSize: 14, fontWeight: 700 }}>
                        ${bal.usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          color: bal.change24h >= 0 ? C.accent : C.danger,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {bal.change24h >= 0 ? "+" : ""}{bal.change24h.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Orb locks */}
            {locks.length > 0 && (
              <>
                <p
                  style={{
                    color: C.muted,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    margin: "20px 0 10px",
                  }}
                >
                  Creature Locks
                </p>
                {locks.map((lock) => (
                  <div
                    key={lock.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: `1px solid #2a2a3a`,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: C.gold,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, color: C.text, fontSize: 13, fontWeight: 600 }}>
                        {lock.amount} {lock.currency}
                      </p>
                      <p style={{ margin: 0, color: C.muted, fontSize: 11 }}>{lock.reason}</p>
                    </div>
                    <span style={{ color: C.gold, fontSize: 11, fontWeight: 600 }}>Locked</span>
                  </div>
                ))}
              </>
            )}
          </>
        ) : (
          <div style={{ marginTop: 16 }}>
            {activity.length === 0 ? (
              <p style={{ color: C.muted, textAlign: "center", padding: "32px 0", fontSize: 14 }}>
                No activity yet.
              </p>
            ) : (
              activity.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom: `1px solid #2a2a3a`,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: `${C.primary}18`,
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
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, color: C.text, fontSize: 13, fontWeight: 600 }}>
                      {item.title}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        color: C.muted,
                        fontSize: 11,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.subtitle}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        color: C.accent,
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {item.amount_text}
                    </p>
                    <p style={{ margin: 0, color: C.muted, fontSize: 11 }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 999,
          animation: "mmFadeIn 0.2s ease",
        }}
      />

      {/* Modal panel */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: 480,
          margin: "0 auto",
          background: C.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          overflow: "hidden",
          animation: "mmSlideUp 0.3s cubic-bezier(0.32,0.72,0,1)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
        }}
      >
        {/* Handle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "12px 0 4px",
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "#2a2a3a",
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 20px 12px",
          }}
        >
          <h2 style={{ margin: 0, color: C.text, fontSize: 20, fontWeight: 800 }}>
            Wallet
          </h2>
          <button
            onClick={onClose}
            style={{
              background: C.card,
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: C.muted,
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {view === "receive" && renderReceive()}
          {view === "send" && renderSend()}
          {view === "main" && renderMain()}
        </div>

        {/* Safe area spacer */}
        <div style={{ height: "env(safe-area-inset-bottom, 16px)" }} />
      </div>

      <style>{`
        @keyframes mmFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes mmSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>
  );
}

/* ---- Shared styles ---- */
const labelStyle: React.CSSProperties = {
  display: "block",
  color: C.muted,
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: C.card,
  border: `1px solid #2a2a3a`,
  borderRadius: 10,
  color: C.text,
  fontSize: 15,
  fontFamily: "inherit",
  boxSizing: "border-box",
  outline: "none",
};

const feeRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 0",
};

const actionBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 0",
  borderRadius: 12,
  border: "none",
  background: C.primary,
  color: "#fff",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "opacity 0.15s",
};

const errorBannerStyle: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 14px",
  background: `${C.danger}15`,
  border: `1px solid ${C.danger}40`,
  borderRadius: 10,
  color: C.danger,
  fontSize: 13,
};

const successBannerStyle: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 14px",
  background: `${C.accent}15`,
  border: `1px solid ${C.accent}40`,
  borderRadius: 10,
  color: C.accent,
  fontSize: 13,
};

function SpinnerInline({ color = C.primary }: { color?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: `2px solid ${color}33`,
        borderTopColor: color,
        animation: "mmSpin 0.7s linear infinite",
      }}
    />
  );
}
