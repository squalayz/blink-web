"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, QrCode, X } from "lucide-react";
import WalletCard from "@/components/WalletCard";
import ChainSelector from "@/components/ChainSelector";

const C = {
  bg: "#0A0A0F",
  surface: "#111118",
  card: "#1C1C28",
  primary: "#9945FF",
  accent: "#14F195",
  gold: "#F59E0B",
  text: "#F9FAFB",
  textMuted: "#9CA3AF",
  border: "#1F2028",
} as const;

type Chain = "solana" | "ethereum" | "bitcoin";

const CHAIN_LABELS: Record<Chain, { name: string; symbol: string; color: string }> = {
  solana: { name: "Solana", symbol: "\u25CE", color: "#9945FF" },
  ethereum: { name: "Ethereum", symbol: "\u2B21", color: "#627EEA" },
  bitcoin: { name: "Bitcoin", symbol: "\u20BF", color: "#F7931A" },
};

interface WalletData {
  sol_address: string | null;
  eth_address: string | null;
  btc_address: string | null;
  preferred_chain: Chain | null;
}

export default function WalletPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [wallets, setWallets] = useState<WalletData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [txFilter, setTxFilter] = useState<Chain>("solana");
  const [showQR, setShowQR] = useState<Chain | null>(null);
  const [addingChain, setAddingChain] = useState<Chain | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [addError, setAddError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/signin");
    }
  }, [authLoading, user, router]);

  const fetchWallets = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    const { data } = await supabase
      .from("profiles")
      .select("sol_address, eth_address, btc_address, preferred_chain")
      .eq("id", user.id)
      .single();
    if (data) setWallets(data as WalletData);
    setLoadingData(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchWallets();
  }, [user, fetchWallets]);

  if (authLoading || !user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: `3px solid ${C.border}`,
            borderTopColor: C.primary,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const connectedChains: { chain: Chain; address: string }[] = [];
  const unconnectedChains: Chain[] = [];

  if (wallets) {
    if (wallets.sol_address) connectedChains.push({ chain: "solana", address: wallets.sol_address });
    else unconnectedChains.push("solana");
    if (wallets.eth_address) connectedChains.push({ chain: "ethereum", address: wallets.eth_address });
    else unconnectedChains.push("ethereum");
    if (wallets.btc_address) connectedChains.push({ chain: "bitcoin", address: wallets.btc_address });
    else unconnectedChains.push("bitcoin");
  }

  const handleAddFunds = (chain: Chain) => {
    // In production: open MoonPay for SOL/ETH, show deposit QR for BTC
    setShowQR(chain);
  };

  const openAddChain = (chain: Chain) => {
    setAddingChain(chain);
    setAddressInput("");
    setAddError("");
  };

  const submitAddChain = async () => {
    if (!user || !addingChain) return;
    const addr = addressInput.trim();
    if (!addr) {
      setAddError("Please enter a wallet address.");
      return;
    }

    const res = await fetch("/api/wallet/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, chain: addingChain, address: addr }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      setAddError(data.error || "Invalid address.");
      return;
    }
    setAddingChain(null);
    setAddressInput("");
    fetchWallets();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: C.bg,
        color: C.text,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "rgba(10,10,15,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 640,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={() => router.push("/map")}
            style={{
              background: "none",
              border: "none",
              color: C.text,
              cursor: "pointer",
              padding: 6,
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
          <span style={{ fontSize: 17, fontWeight: 600 }}>Your Wallets</span>
          <div style={{ width: 34 }} />
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 80px" }}>
        {loadingData ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div
              style={{
                width: 28,
                height: 28,
                border: `3px solid ${C.border}`,
                borderTopColor: C.primary,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto",
              }}
            />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            {/* Connected wallet cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
              {connectedChains.map(({ chain, address }, i) => (
                <motion.div
                  key={chain}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <WalletCard
                    chain={chain}
                    address={address}
                    isPreferred={wallets?.preferred_chain === chain}
                    onAddFunds={() => handleAddFunds(chain)}
                  />
                </motion.div>
              ))}
            </div>

            {/* QR overlay for Receive */}
            {showQR && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.8)",
                  zIndex: 100,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 24,
                }}
                onClick={() => setShowQR(null)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: C.surface,
                    borderRadius: 16,
                    padding: 32,
                    textAlign: "center",
                    maxWidth: 360,
                    width: "100%",
                  }}
                >
                  <QrCode size={120} style={{ color: CHAIN_LABELS[showQR].color, margin: "0 auto 16px" }} />
                  <p style={{ color: C.text, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                    Receive {CHAIN_LABELS[showQR].name}
                  </p>
                  <div
                    style={{
                      background: C.card,
                      borderRadius: 8,
                      padding: "10px 14px",
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: C.textMuted,
                      wordBreak: "break-all",
                      marginBottom: 16,
                    }}
                  >
                    {connectedChains.find((w) => w.chain === showQR)?.address || ""}
                  </div>
                  <button
                    onClick={() => setShowQR(null)}
                    style={{
                      padding: "10px 28px",
                      borderRadius: 10,
                      border: `1px solid ${C.border}`,
                      background: "transparent",
                      color: C.text,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Add wallet address modal */}
            {addingChain && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.85)",
                  zIndex: 100,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 24,
                }}
                onClick={() => setAddingChain(null)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: C.surface,
                    borderRadius: 16,
                    padding: 28,
                    maxWidth: 400,
                    width: "100%",
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>
                      Add {CHAIN_LABELS[addingChain].name} Wallet
                    </span>
                    <button
                      onClick={() => setAddingChain(null)}
                      style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 4 }}
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>
                    Paste your {CHAIN_LABELS[addingChain].name} wallet address below.
                  </p>
                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => { setAddressInput(e.target.value); setAddError(""); }}
                    placeholder={
                      addingChain === "bitcoin"
                        ? "bc1q... or 1... or 3..."
                        : addingChain === "ethereum"
                        ? "0x..."
                        : "Solana address"
                    }
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: `1px solid ${addError ? "#ef4444" : C.border}`,
                      background: C.card,
                      color: C.text,
                      fontSize: 13,
                      fontFamily: "monospace",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  {addError && (
                    <p style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>{addError}</p>
                  )}
                  <button
                    onClick={submitAddChain}
                    style={{
                      width: "100%",
                      marginTop: 16,
                      padding: "12px 0",
                      borderRadius: 10,
                      border: "none",
                      background: CHAIN_LABELS[addingChain].color,
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Save Wallet
                  </button>
                </div>
              </div>
            )}

            {/* Add more wallets */}
            {unconnectedChains.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: C.textMuted }}>
                  Connect another wallet
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {unconnectedChains.map((chain) => {
                    const info = CHAIN_LABELS[chain];
                    return (
                      <button
                        key={chain}
                        onClick={() => openAddChain(chain)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "14px 18px",
                          borderRadius: 12,
                          border: `1px solid ${C.border}`,
                          background: C.surface,
                          color: C.text,
                          fontSize: 15,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          textAlign: "left",
                          width: "100%",
                        }}
                      >
                        <span style={{ fontSize: 22, color: info.color }}>{info.symbol}</span>
                        <span style={{ flex: 1 }}>Add {info.name} Wallet</span>
                        <Plus size={18} style={{ color: C.textMuted }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Transaction history placeholder */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                  Transaction History
                </h3>
                <ChainSelector
                  selectedChain={txFilter}
                  onChange={setTxFilter}
                />
              </div>
              <div
                style={{
                  backgroundColor: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "32px 20px",
                  textAlign: "center",
                }}
              >
                <p style={{ color: C.textMuted, fontSize: 14 }}>
                  No transactions yet for {CHAIN_LABELS[txFilter].name}.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
