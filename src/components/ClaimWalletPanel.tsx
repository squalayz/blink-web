"use client";

// ════════════════════════════════════════════════════════════════════════════
// ClaimWalletPanel — the wallet half of the /claim experience.
//
// Real wallet connections only (no mocks): MetaMask / injected browsers and
// the Coinbase Wallet SDK via wagmi. Claims prefer the EIP-712 BlinkRewards
// voucher path (user submits the mint tx from their own wallet); when the
// deployment doesn't have the signer configured the server returns 501 and
// we fall back to the custodial /api/claim/execute transfer. A pasted
// address can't sign a tx, so manual mode is always custodial.
//
// Used by both claim entries: the logged-in session flow and the iOS
// claim-code flow — pass the matching `auth`.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import {
  WagmiProvider,
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
} from "wagmi";
import type { Connector } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi-config";
import { supabase } from "@/lib/supabase";
import { C, capsLabel, primaryCta, FONT_DISPLAY } from "@/lib/theme";

const ETH_RE = /^0x[0-9a-fA-F]{40}$/;
const RED = "#FF8099";
const BORDER = "rgba(0,255,136,0.20)";
const SOFT_BORDER = "rgba(255,255,255,0.10)";

// Focus ring for the manual-address field — inline styles can't express
// :focus, so this one rule rides along with the panel (style-only).
const FIELD_FOCUS_CSS = `
.blinkClaimField:focus {
  border-color: rgba(0,255,136,0.7) !important;
  box-shadow: 0 0 0 3px rgba(0,255,136,0.12) !important;
}
`;

const REWARDS_ABI = [
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "deadline", type: "uint256" },
      { name: "ref", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

export type ClaimAuth =
  | { mode: "session" }
  | { mode: "code"; code: string; password: string };

export type ClaimSuccess = {
  tx_hash: string | null;
  tokens_sent: number;
  eth_address: string;
  onchain: boolean;
};

type TxPhase =
  | "idle"
  | "voucher" // requesting the signed voucher
  | "wallet" // waiting for wallet confirmation
  | "mining" // tx submitted, waiting for receipt
  | "confirming" // receipt in, syncing the ledger
  | "custodial"; // server-side transfer in flight

const queryClient = new QueryClient();

export function ClaimProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

async function authPayload(auth: ClaimAuth): Promise<{
  headers: Record<string, string>;
  body: Record<string, string>;
}> {
  if (auth.mode === "code") {
    return {
      headers: { "Content-Type": "application/json" },
      body: { claim_code: auth.code.trim(), password: auth.password },
    };
  }
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  return {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: {},
  };
}

export function WalletClaim({
  auth,
  tokens,
  canClaim,
  initialManualAddress,
  onSuccess,
}: {
  auth: ClaimAuth;
  tokens: number;
  canClaim: boolean;
  initialManualAddress?: string | null;
  onSuccess: (result: ClaimSuccess) => void;
}) {
  const [manualMode, setManualMode] = useState(false);
  const [manualAddress, setManualAddress] = useState(initialManualAddress || "");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { address: connectedAddress, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();

  const manualValid = ETH_RE.test(manualAddress.trim());
  const targetAddress = manualMode ? manualAddress.trim() : connectedAddress || "";
  const addressReady = manualMode ? manualValid : isConnected && !!connectedAddress;

  async function custodialClaim(ethAddress: string) {
    setPhase("custodial");
    const { headers, body } = await authPayload(auth);
    const res = await fetch("/api/claim/execute", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, eth_address: ethAddress }),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || "Claim failed. Please try again.");
    }
    onSuccess({
      tx_hash: data.tx_hash || null,
      tokens_sent: Number(data.tokens_sent || 0),
      eth_address: data.eth_address,
      onchain: false,
    });
  }

  async function voucherClaim(ethAddress: string) {
    setPhase("voucher");
    const { headers, body } = await authPayload(auth);
    const vres = await fetch("/api/claim/voucher", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, eth_address: ethAddress }),
    });

    if (vres.status === 501) {
      // On-chain vouchers not enabled on this deployment — custodial path.
      await custodialClaim(ethAddress);
      return;
    }
    const voucher = await vres.json();
    if (!vres.ok) {
      throw new Error(voucher?.error || "Could not prepare your claim.");
    }

    setPhase("wallet");
    const hash = await writeContractAsync({
      address: voucher.rewardsContract as `0x${string}`,
      abi: REWARDS_ABI,
      functionName: "claim",
      args: [
        BigInt(voucher.amount),
        voucher.nonce as `0x${string}`,
        BigInt(voucher.deadline),
        voucher.ref as `0x${string}`,
        voucher.signature as `0x${string}`,
      ],
    });

    setTxHash(hash);
    setPhase("mining");
    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
    if (receipt.status !== "success") {
      throw new Error("Transaction reverted. Your voucher stays valid — try again.");
    }

    setPhase("confirming");
    for (let attempt = 0; attempt < 6; attempt++) {
      const cres = await fetch("/api/claim/confirm", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...body, ledger_id: voucher.ledger_id, tx_hash: hash }),
      });
      if (cres.status === 202) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      const cdata = await cres.json();
      if (!cres.ok) throw new Error(cdata?.error || "Could not record your claim.");
      break;
    }

    onSuccess({
      tx_hash: hash,
      tokens_sent: Number(voucher.tokens || tokens),
      eth_address: ethAddress,
      onchain: true,
    });
  }

  async function handleClaim() {
    setError("");
    if (!addressReady || !targetAddress) {
      setError(manualMode ? "Enter a valid Ethereum address." : "Connect a wallet first.");
      return;
    }
    if (!confirmed) {
      setError("Confirm your wallet address first.");
      return;
    }
    setBusy(true);
    setTxHash(null);
    try {
      if (manualMode) {
        await custodialClaim(targetAddress);
      } else {
        await voucherClaim(targetAddress);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Claim failed. Please try again.";
      setError(
        /rejected|denied|cancel/i.test(raw)
          ? "Transaction was cancelled in your wallet. Your points are safe — try again when ready."
          : raw,
      );
    } finally {
      setBusy(false);
      setPhase("idle");
    }
  }

  const claimDisabled = busy || !canClaim || !addressReady || !confirmed;

  return (
    <div>
      <style>{FIELD_FOCUS_CSS}</style>
      <div style={{ ...capsLabel(10, C.textTertiary), marginBottom: 8 }}>Your wallet</div>

      {!manualMode ? (
        <ConnectSection
          connectedAddress={connectedAddress}
          isConnected={isConnected}
          onDisconnect={() => {
            disconnect();
            setConfirmed(false);
          }}
        />
      ) : (
        <>
          <input
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            placeholder="0x..."
            spellCheck={false}
            className="blinkClaimField"
            style={{
              width: "100%",
              padding: "15px 16px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: C.text,
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "ui-monospace, monospace",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 160ms ease, box-shadow 160ms ease",
            }}
          />
          {manualAddress && !manualValid && (
            <div style={{ color: RED, fontSize: 12, marginTop: 6 }}>
              That doesn&apos;t look like a valid 0x address.
            </div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => {
          setManualMode((m) => !m);
          setConfirmed(false);
          setError("");
        }}
        style={{
          display: "block",
          margin: "12px auto 0",
          background: "none",
          border: "none",
          color: C.textTertiary,
          fontSize: 11,
          textDecoration: "underline",
          cursor: "pointer",
          fontFamily: FONT_DISPLAY,
        }}
      >
        {manualMode
          ? "Connect MetaMask or Coinbase Wallet instead"
          : "Or paste a wallet address manually"}
      </button>

      {addressReady && (
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginTop: 16,
            cursor: "pointer",
            color: C.textSecondary,
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ marginTop: 3, accentColor: C.primary, width: 16, height: 16, flexShrink: 0 }}
          />
          <span>
            I confirm{" "}
            <span style={{ color: C.text, fontFamily: "ui-monospace, monospace" }}>
              {truncate(targetAddress)}
            </span>{" "}
            is my wallet and understand this is irreversible.
          </span>
        </label>
      )}

      {busy && phase !== "idle" && <TxStatus phase={phase} txHash={txHash} />}

      {error && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(255,128,153,0.12)",
            border: "1px solid rgba(255,128,153,0.35)",
            color: RED,
            fontSize: 13,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleClaim}
        disabled={claimDisabled}
        style={{
          ...primaryCta(),
          width: "100%",
          marginTop: 20,
          padding: "16px 22px",
          fontSize: 14,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          opacity: claimDisabled ? 0.5 : 1,
          cursor: claimDisabled ? "not-allowed" : "pointer",
          animation: !claimDisabled ? "blinkClaimPulse 0.9s ease-in-out infinite alternate" : "none",
        }}
      >
        {busy ? <Spinner dark /> : `Claim ${tokens.toLocaleString()} $BLINK`}
      </button>
    </div>
  );
}

/* ── Connect UI ─────────────────────────────────────────────────────────── */

function ConnectSection({
  connectedAddress,
  isConnected,
  onDisconnect,
}: {
  connectedAddress?: `0x${string}`;
  isConnected: boolean;
  onDisconnect: () => void;
}) {
  const { connectors, connectAsync, isPending } = useConnect();
  const [connectError, setConnectError] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  // EIP-6963 discovery can prepend announced wallets; resolve by name/type.
  const metaMask =
    connectors.find((c) => /metamask/i.test(c.name)) ||
    connectors.find((c) => c.type === "injected");
  const coinbase = connectors.find(
    (c) => /coinbase/i.test(c.name) || /coinbase/i.test(c.id),
  );

  async function handleConnect(connector?: Connector) {
    setConnectError("");
    if (!connector) {
      setConnectError("Wallet not detected. Install MetaMask or use Coinbase Wallet.");
      return;
    }
    setPendingId(connector.id);
    try {
      await connectAsync({ connector });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Connection failed";
      setConnectError(/rejected|denied/i.test(raw) ? "Connection request was declined." : raw);
    } finally {
      setPendingId(null);
    }
  }

  if (isConnected && connectedAddress) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "14px 16px",
          borderRadius: 16,
          background: "rgba(0,255,136,0.06)",
          border: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span
            aria-hidden
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: C.primary,
              boxShadow: `0 0 10px ${C.primary}`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 14,
              color: C.text,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {truncate(connectedAddress)}
          </span>
        </div>
        <button
          type="button"
          onClick={onDisconnect}
          style={{
            background: "transparent",
            border: `1px solid ${SOFT_BORDER}`,
            color: C.textTertiary,
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: FONT_DISPLAY,
            flexShrink: 0,
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "grid", gap: 10 }}>
        <WalletButton
          label="MetaMask"
          sub="Browser extension or mobile app"
          busy={isPending && pendingId === metaMask?.id}
          onClick={() => handleConnect(metaMask)}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 4l7 5-1.5 4L3 4z" />
              <path d="M21 4l-7 5 1.5 4L21 4z" />
              <path d="M8.5 13h7L17 18l-5 3-5-3 1.5-5z" />
            </svg>
          }
        />
        <WalletButton
          label="Coinbase Wallet"
          sub="Coinbase Wallet app or extension"
          busy={isPending && pendingId === coinbase?.id}
          onClick={() => handleConnect(coinbase)}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke={C.primary} strokeWidth="1.8" />
              <rect x="9" y="9" width="6" height="6" rx="1.2" fill={C.primary} />
            </svg>
          }
        />
      </div>
      {connectError && (
        <div style={{ color: RED, fontSize: 12, marginTop: 10, textAlign: "center" }}>
          {connectError}
        </div>
      )}
    </div>
  );
}

function WalletButton({
  label,
  sub,
  icon,
  busy,
  onClick,
}: {
  label: string;
  sub: string;
  icon: React.ReactNode;
  busy?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: 14,
        borderRadius: 16,
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: C.text,
        cursor: busy ? "wait" : "pointer",
        fontFamily: "inherit",
        textAlign: "left",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "rgba(0,255,136,0.10)",
          border: "1px solid rgba(0,255,136,0.35)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 800, fontFamily: FONT_DISPLAY }}>{label}</span>
        <span style={{ fontSize: 11, color: C.textTertiary }}>{sub}</span>
      </span>
      <span
        style={{
          marginLeft: "auto",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 10,
          color: C.primary,
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontFamily: FONT_DISPLAY,
          flexShrink: 0,
        }}
      >
        {busy ? (
          <Spinner />
        ) : (
          <>
            Connect
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </>
        )}
      </span>
    </button>
  );
}

/* ── Tx progress ────────────────────────────────────────────────────────── */

function TxStatus({ phase, txHash }: { phase: TxPhase; txHash: string | null }) {
  if (phase === "idle") return null;
  const message: Record<Exclude<TxPhase, "idle">, string> = {
    voucher: "Preparing your signed claim voucher...",
    wallet: "Confirm the claim in your wallet...",
    mining: "Claim submitted — waiting for Ethereum confirmation...",
    confirming: "Confirmed on-chain — updating your points balance...",
    custodial: "Sending $BLINK to your wallet...",
  };
  return (
    <div
      style={{
        marginTop: 16,
        padding: "12px 14px",
        borderRadius: 14,
        background: "rgba(0,255,136,0.05)",
        border: `1px solid ${BORDER}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 13,
        color: C.text,
        lineHeight: 1.4,
      }}
    >
      <Spinner />
      <span>
        {message[phase]}
        {txHash && (phase === "mining" || phase === "confirming") && (
          <>
            {" "}
            <a
              href={`https://etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: C.primary, fontWeight: 700 }}
            >
              View tx
            </a>
          </>
        )}
      </span>
    </div>
  );
}

/* ── Bits ───────────────────────────────────────────────────────────────── */

function truncate(addr: string): string {
  if (!addr || addr.length <= 12) return addr || "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function Spinner({ dark }: { dark?: boolean }) {
  return (
    <span
      aria-label="loading"
      style={{
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: `2px solid ${dark ? "rgba(10,10,15,0.3)" : "rgba(255,255,255,0.25)"}`,
        borderTopColor: dark ? C.bg : C.primary,
        display: "inline-block",
        animation: "blinkClaimSpin 0.8s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}
