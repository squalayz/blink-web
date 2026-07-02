"use client";

// ════════════════════════════════════════════════════════════════════════════
// /claim — the Orb Bank. Points earned walking + catching convert to real
// $BLINK (ERC-20, Ethereum mainnet). Mirrors the iOS app's OrbBankCard:
// glass card, caps-tracking labels, hero counter with shine sweep, pulsing
// claim CTA. Logged-in players claim straight from their session; players
// arriving from the iOS app use their claim code + password.
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import {
  ClaimProviders,
  WalletClaim,
  type ClaimSuccess,
} from "@/components/ClaimWalletPanel";
import {
  C,
  RARITY_COLOR,
  glassCard,
  capsLabel,
  counterFont,
  primaryCta,
  FONT_DISPLAY,
} from "@/lib/theme";

const TOKEN_CONTRACT =
  process.env.NEXT_PUBLIC_BLINK_TOKEN_CONTRACT ||
  "0xe7BF94959b0bfa8CB9e61149de5BFb387B40761B";

type LedgerRow = {
  points_redeemed: number;
  tokens_sent: number;
  eth_address: string;
  tx_hash: string | null;
  status: string;
  created_at: string;
};

type MeClaim = {
  username: string | null;
  display_name: string | null;
  claimable_points: number;
  tokens_available: number;
  total_claimed_tokens: number;
  last_claim_at: string | null;
  eth_address: string | null;
  history: LedgerRow[];
};

type MeStats = {
  totalCatches: number;
  catchesToday: number;
  streakDays: number;
};

type LookupResult = {
  profile_id: string;
  username: string | null;
  display_name: string | null;
  claimable_points: number;
  tokens_available: number;
};

export default function ClaimPage() {
  const { user, loading } = useAuth();

  return (
    <ClaimProviders>
      <ClaimShell user={user} loading={loading} />
    </ClaimProviders>
  );
}

function ClaimShell({
  user,
  loading,
}: {
  user: { id: string } | null;
  loading: boolean;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: FONT_DISPLAY,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 16px 96px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(0,255,136,0.10) 0%, rgba(10,10,15,0) 60%)",
          pointerEvents: "none",
        }}
      />

      {/* Wordmark */}
      <Link
        href="/"
        style={{
          textDecoration: "none",
          fontFamily: FONT_DISPLAY,
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: "0.32em",
          color: C.text,
          marginBottom: 6,
          position: "relative",
          zIndex: 1,
        }}
      >
        BL<span style={{ color: C.primary }}>I</span>NK
      </Link>
      <div style={{ ...capsLabel(10, C.textTertiary), marginBottom: 24, position: "relative", zIndex: 1 }}>
        Daily airdrop — walk, catch, claim
      </div>

      {loading ? (
        <div style={{ ...glassCard(24), width: "100%", maxWidth: 520, padding: 40, textAlign: "center", position: "relative", zIndex: 1 }}>
          <Spinner dark={false} />
        </div>
      ) : user ? (
        <AuthedClaim />
      ) : (
        <CodeClaim />
      )}

      <style>{KEYFRAMES}</style>
    </div>
  );
}

/* ════════════════════════════════ Logged-in: Orb Bank ═══════════════════ */

function AuthedClaim() {
  const [me, setMe] = useState<MeClaim | null>(null);
  const [stats, setStats] = useState<MeStats | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [result, setResult] = useState<ClaimSuccess | null>(null);

  const load = useCallback(async () => {
    setLoadErr("");
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        setLoadErr("Session expired — sign in again.");
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const [meRes, statsRes] = await Promise.all([
        fetch("/api/claim/me", { headers }),
        fetch("/api/me/stats", { headers }).catch(() => null),
      ]);
      if (!meRes.ok) {
        const d = await meRes.json().catch(() => null);
        setLoadErr(d?.error || "Could not load your balance.");
        return;
      }
      const meData = (await meRes.json()) as MeClaim;
      setMe(meData);
      if (statsRes && statsRes.ok) {
        setStats((await statsRes.json()) as MeStats);
      }
    } catch {
      setLoadErr("Network error. Pull to retry.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const points = me?.claimable_points ?? 0;
  const tokens = me?.tokens_available ?? 0;
  const canClaim = points >= 1000;

  if (result) {
    return (
      <div style={{ width: "100%", maxWidth: 520, position: "relative", zIndex: 1 }}>
        <div style={{ ...glassCard(24), padding: "36px 24px", textAlign: "center" }}>
          <SuccessCheck />
          <h1 style={{ margin: "20px 0 8px", fontSize: 26, fontWeight: 900, fontFamily: FONT_DISPLAY }}>
            Claimed
          </h1>
          <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            <span style={{ color: C.primary, fontWeight: 800 }}>
              {result.tokens_sent.toLocaleString()} $BLINK
            </span>{" "}
            {result.onchain ? "claimed on-chain to" : "sent to"}
            <br />
            <span style={{ color: C.text, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
              {`${result.eth_address.slice(0, 6)}...${result.eth_address.slice(-4)}`}
            </span>
          </p>
          {result.tx_hash && (
            <a
              href={`https://etherscan.io/tx/${result.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                marginTop: 16,
                padding: "10px 16px",
                borderRadius: 999,
                border: "1px solid rgba(0,255,136,0.25)",
                background: "rgba(0,255,136,0.06)",
                color: C.primary,
                textDecoration: "none",
                ...capsLabel(11, C.primary),
              }}
            >
              View on Etherscan
            </a>
          )}
          <p style={{ color: C.textTertiary, fontSize: 12, marginTop: 18, lineHeight: 1.5 }}>
            Keep walking — points start stacking again immediately.
          </p>
          <Link
            href="/map"
            style={{
              ...primaryCta(),
              display: "block",
              marginTop: 24,
              padding: "15px 20px",
              textDecoration: "none",
              fontSize: 13,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            Back to the Map
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: 520, position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Orb Bank card ── */}
      <div style={{ ...glassCard(24), padding: "20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ ...capsLabel(12), color: C.primary, textShadow: "0 0 12px rgba(0,255,136,0.5)" }}>
            BLINK Points
          </div>
          <div
            style={{
              ...capsLabel(9, C.textTertiary),
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            Only you
          </div>
        </div>

        {/* Hero balance with shine sweep */}
        <div
          style={{
            marginTop: 14,
            padding: "20px 16px",
            borderRadius: 18,
            background: "linear-gradient(135deg, rgba(0,255,136,0.12), rgba(255,255,255,0.03))",
            border: "1px solid rgba(255,255,255,0.07)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 90,
              background: "linear-gradient(105deg, transparent, rgba(255,255,255,0.10), transparent)",
              transform: "rotate(16deg)",
              animation: "blinkShine 3.6s linear infinite",
              pointerEvents: "none",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-orb-transparent.png"
              alt=""
              style={{ width: 44, height: 44, borderRadius: "50%", filter: "drop-shadow(0 0 10px rgba(0,255,136,0.6))" }}
            />
            <div style={counterFont(44)}>
              {me ? points.toLocaleString() : "—"}
            </div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textTertiary, marginTop: 8, lineHeight: 1.5 }}>
            Earned walking the world and catching creatures. Claims convert points to real $BLINK on Ethereum mainnet.
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px dashed rgba(0,255,136,0.18)",
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: FONT_DISPLAY }}>
              = {tokens.toLocaleString()} $BLINK
            </span>
            <span style={{ fontSize: 11, color: C.textTertiary }}>1,000 points = 1 $BLINK</span>
          </div>
        </div>

        {/* Quick stats — Today / Streak / Lifetime */}
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <QuickStat label="Today" value={stats ? `+${stats.catchesToday}` : "—"} sub="catches" />
          <QuickStat label="Streak" value={stats ? `${stats.streakDays}d` : "—"} sub="days active" />
          <QuickStat
            label="Claimed"
            value={me ? me.total_claimed_tokens.toLocaleString() : "—"}
            sub="$BLINK lifetime"
          />
        </div>

        {loadErr && <ErrorMsg>{loadErr}</ErrorMsg>}
      </div>

      {/* ── Claim to wallet — MetaMask / Coinbase Wallet / manual ── */}
      <div style={{ ...glassCard(24), padding: "20px 16px" }}>
        <div style={capsLabel(11)}>Claim to wallet</div>

        {!canClaim ? (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 14,
              background: "rgba(255,209,102,0.06)",
              border: `1px solid ${RARITY_COLOR.legendary}40`,
              color: RARITY_COLOR.legendary,
              fontSize: 13,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            {me ? `${(1000 - points).toLocaleString()} more points to your first claim. Minimum 1,000.` : "Loading balance..."}
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            <WalletClaim
              auth={{ mode: "session" }}
              tokens={tokens}
              canClaim={canClaim}
              initialManualAddress={me?.eth_address}
              onSuccess={(r) => {
                setResult(r);
                load();
              }}
            />
          </div>
        )}

        <div style={{ fontSize: 10, color: C.textTertiary, textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
          $BLINK token:{" "}
          <a
            href={`https://etherscan.io/token/${TOKEN_CONTRACT}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: C.textSecondary, fontFamily: "ui-monospace, monospace" }}
          >
            {`${TOKEN_CONTRACT.slice(0, 6)}...${TOKEN_CONTRACT.slice(-4)}`}
          </a>{" "}
          · one claim per address per 24h
        </div>
      </div>

      {/* ── How earning works ── */}
      <div style={{ ...glassCard(20), padding: "16px" }}>
        <div style={capsLabel(10, C.textSecondary)}>How the airdrop works</div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {[
            ["Walk", "Creatures spawn around you in the real world"],
            ["Catch", "Get within 50m and catch them on the map"],
            ["Stack", "Every catch banks BLINK points daily"],
            ["Claim", "Convert points to $BLINK, straight to your wallet"],
          ].map(([t, d]) => (
            <div key={t} style={{ flex: 1, padding: "10px 8px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: C.primary, fontFamily: FONT_DISPLAY }}>{t}</div>
              <div style={{ fontSize: 9.5, color: C.textTertiary, marginTop: 4, lineHeight: 1.45 }}>{d}</div>
            </div>
          ))}
        </div>
        <Link
          href="/map"
          style={{
            display: "block",
            marginTop: 12,
            padding: "12px",
            borderRadius: 999,
            border: "1px solid rgba(0,255,136,0.25)",
            background: "rgba(0,255,136,0.05)",
            color: C.primary,
            textDecoration: "none",
            textAlign: "center",
            ...capsLabel(11, C.primary),
          }}
        >
          Open the map and earn
        </Link>
      </div>

      {/* ── Recent claims ── */}
      {me && me.history.length > 0 && (
        <div style={{ ...glassCard(20), padding: "16px" }}>
          <div style={capsLabel(10, C.textSecondary)}>Recent claims</div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {me.history.map((row, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, fontFamily: FONT_DISPLAY, color: row.status === "sent" ? C.text : "#ff5572" }}>
                    {row.status === "sent" ? `+${row.tokens_sent.toLocaleString()} $BLINK` : "Failed"}
                  </div>
                  <div style={{ fontSize: 10, color: C.textTertiary, marginTop: 2 }}>
                    {new Date(row.created_at).toLocaleDateString()} ·{" "}
                    {`${row.eth_address.slice(0, 6)}...${row.eth_address.slice(-4)}`}
                  </div>
                </div>
                {row.tx_hash && (
                  <a
                    href={`https://etherscan.io/tx/${row.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...capsLabel(9, C.primary), textDecoration: "none" }}
                  >
                    Tx
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: "center" }}>
        <button
          onClick={() => {
            const el = document.getElementById("code-claim-fallback");
            if (el) el.style.display = el.style.display === "none" ? "block" : "none";
          }}
          style={{ background: "none", border: "none", color: C.textTertiary, fontSize: 11, cursor: "pointer", textDecoration: "underline", fontFamily: FONT_DISPLAY }}
        >
          Have a claim code from the BLINK app instead?
        </button>
        <div id="code-claim-fallback" style={{ display: "none", marginTop: 16, textAlign: "left" }}>
          <CodeClaim embedded />
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div
      style={{
        flex: 1,
        padding: "12px 10px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        textAlign: "center",
      }}
    >
      <div style={capsLabel(9, C.textTertiary)}>{label}</div>
      <div style={{ ...counterFont(20), color: C.primary, marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 9, color: C.textTertiary, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

/* ═══════════════════════ Logged-out: claim-code flow ═════════════════════ */

function CodeClaim({ embedded }: { embedded?: boolean }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ClaimSuccess | null>(null);

  const tokensToClaim = useMemo(
    () => (lookup ? Math.floor(lookup.claimable_points / 1000) : 0),
    [lookup],
  );

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!code.trim() || !password) {
      setError("Enter both code and password.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/claim/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_code: code.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Lookup failed");
        return;
      }
      setLookup(data as LookupResult);
      setStep(2);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 520, position: "relative", zIndex: 1 }}>
      {!embedded && <StepIndicator current={step} />}

      <div style={{ ...glassCard(24), marginTop: embedded ? 0 : 24, padding: "28px 20px" }}>
        {step === 1 && (
          <form onSubmit={handleLookup}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, textAlign: "center", fontFamily: FONT_DISPLAY }}>
              Claim Your $BLINK
            </h1>
            <p style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.6, textAlign: "center", margin: "10px 0 22px" }}>
              Enter your Claim Code and Password from the BLINK app.
            </p>

            <Label>Claim code</Label>
            <Input
              value={code}
              onChange={(v) => setCode(v.toUpperCase().slice(0, 10))}
              placeholder="BL-7K9X"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={10}
              uppercase
            />
            <div style={{ height: 14 }} />
            <Label>Password</Label>
            <Input value={password} onChange={setPassword} placeholder="••••••••" type="password" />

            {error && <ErrorMsg>{error}</ErrorMsg>}

            <button
              type="submit"
              disabled={busy}
              style={{
                ...primaryCta(),
                width: "100%",
                marginTop: 20,
                padding: "16px 22px",
                fontSize: 13,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? <Spinner dark /> : "Look Up My Rewards"}
            </button>

            {!embedded && (
              <p style={{ color: C.textTertiary, fontSize: 12, textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>
                Playing on the web? <Link href="/" style={{ color: C.primary }}>Sign in</Link> to see your balance
                instantly — no code needed.
              </p>
            )}
          </form>
        )}

        {step === 2 && lookup && (
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, textAlign: "center", fontFamily: FONT_DISPLAY }}>
              Welcome back, {lookup.display_name || lookup.username || "Trainer"}
            </h1>

            <div
              style={{
                marginTop: 18,
                padding: "22px 16px",
                borderRadius: 18,
                background: "linear-gradient(160deg, rgba(0,255,136,0.10), rgba(0,255,136,0.02))",
                border: "1px solid rgba(0,255,136,0.20)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  ...counterFont(60),
                  background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {lookup.claimable_points.toLocaleString()}
              </div>
              <div style={{ ...capsLabel(11, C.textTertiary), marginTop: 4 }}>BLINK Points</div>
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: "1px dashed rgba(0,255,136,0.18)",
                  fontSize: 16,
                  fontWeight: 800,
                  fontFamily: FONT_DISPLAY,
                }}
              >
                = {tokensToClaim.toLocaleString()} $BLINK
              </div>
              <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 4 }}>1,000 points = 1 $BLINK</div>
            </div>

            {lookup.claimable_points < 1000 ? (
              <div
                style={{
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 12,
                  background: "rgba(255,209,102,0.06)",
                  border: `1px solid ${RARITY_COLOR.legendary}40`,
                  color: RARITY_COLOR.legendary,
                  fontSize: 13,
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                Keep playing to earn more. Minimum 1,000 points to claim.
              </div>
            ) : (
              <div style={{ marginTop: 20 }}>
                <WalletClaim
                  auth={{ mode: "code", code, password }}
                  tokens={tokensToClaim}
                  canClaim={lookup.claimable_points >= 1000}
                  onSuccess={(r) => {
                    setResult(r);
                    setStep(3);
                  }}
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError("");
              }}
              style={{
                display: "block",
                margin: "16px auto 0",
                padding: "12px 22px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                color: C.text,
                ...capsLabel(11, C.text),
                cursor: "pointer",
              }}
            >
              Back
            </button>
          </div>
        )}

        {step === 3 && result && (
          <div style={{ textAlign: "center" }}>
            <SuccessCheck />
            <h1 style={{ margin: "20px 0 8px", fontSize: 24, fontWeight: 900, fontFamily: FONT_DISPLAY }}>
              Claimed
            </h1>
            <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              <span style={{ color: C.primary, fontWeight: 800 }}>
                {result.tokens_sent.toLocaleString()} $BLINK
              </span>{" "}
              {result.onchain ? "claimed on-chain to" : "sent to"}
              <br />
              <span style={{ color: C.text, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                {`${result.eth_address.slice(0, 6)}...${result.eth_address.slice(-4)}`}
              </span>
            </p>
            {result.tx_hash && (
              <a
                href={`https://etherscan.io/tx/${result.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: 16,
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(0,255,136,0.25)",
                  background: "rgba(0,255,136,0.05)",
                  color: C.primary,
                  textDecoration: "none",
                  ...capsLabel(11, C.primary),
                }}
              >
                View on Etherscan
              </a>
            )}
            <p style={{ color: C.textTertiary, fontSize: 12, marginTop: 18, lineHeight: 1.5 }}>
              Points balance reset to 0.
            </p>
            <Link
              href="/"
              style={{
                ...primaryCta(),
                display: "block",
                marginTop: 24,
                padding: "14px 20px",
                textDecoration: "none",
                fontSize: 13,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              Back to BLINK World
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════ Shared bits ════════════════════════════ */

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps: Array<{ n: 1 | 2 | 3; label: string }> = [
    { n: 1, label: "Verify" },
    { n: 2, label: "Wallet" },
    { n: 3, label: "Done" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative", zIndex: 1, justifyContent: "center" }}>
      {steps.map((s, i) => {
        const active = current === s.n;
        const done = current > s.n;
        return (
          <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${active || done ? C.primary : "rgba(255,255,255,0.12)"}`,
                  background: done ? C.primary : active ? "rgba(0,255,136,0.12)" : "transparent",
                  color: done ? C.bg : active ? C.primary : C.textTertiary,
                  fontSize: 12,
                  fontWeight: 900,
                  transition: "all 240ms ease",
                  boxShadow: active ? "0 0 14px rgba(0,255,136,0.45)" : "none",
                }}
              >
                {done ? <CheckGlyph size={12} /> : s.n}
              </div>
              <div style={{ ...capsLabel(9, active || done ? C.text : C.textTertiary) }}>{s.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  width: 36,
                  height: 1,
                  background: current > s.n ? C.primary : "rgba(255,255,255,0.12)",
                  marginBottom: 18,
                  transition: "background 240ms ease",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ ...capsLabel(10, C.textTertiary), marginBottom: 8 }}>{children}</div>;
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  autoCapitalize,
  spellCheck,
  uppercase,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  autoCapitalize?: string;
  spellCheck?: boolean;
  uppercase?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      maxLength={maxLength}
      autoCapitalize={autoCapitalize}
      spellCheck={spellCheck}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: "100%",
        padding: "15px 16px",
        borderRadius: 16,
        background: "rgba(255,255,255,0.05)",
        border: focused ? `1.5px solid rgba(0,255,136,0.7)` : "1px solid rgba(255,255,255,0.12)",
        color: C.text,
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: uppercase ? "0.08em" : "normal",
        textTransform: uppercase ? "uppercase" : "none",
        outline: "none",
        boxSizing: "border-box",
        fontFamily: "inherit",
        transition: "border-color 160ms ease, box-shadow 160ms ease",
        boxShadow: focused ? "0 0 0 3px rgba(0,255,136,0.12)" : "none",
      }}
    />
  );
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: "10px 14px",
        borderRadius: 10,
        background: "rgba(255,85,114,0.08)",
        border: "1px solid rgba(255,85,114,0.3)",
        color: "#ff5572",
        fontSize: 13,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

function Spinner({ dark }: { dark?: boolean }) {
  return (
    <span
      aria-label="loading"
      style={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        border: `2px solid ${dark ? "rgba(10,10,15,0.3)" : "rgba(255,255,255,0.25)"}`,
        borderTopColor: dark ? C.bg : C.primary,
        display: "inline-block",
        animation: "blinkClaimSpin 0.8s linear infinite",
      }}
    />
  );
}

function CheckGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 12.5l5 5L20 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SuccessCheck() {
  return (
    <div
      style={{
        width: 86,
        height: 86,
        borderRadius: "50%",
        background: "rgba(0,255,136,0.10)",
        border: `2px solid ${C.primary}`,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 40px rgba(0,255,136,0.45)",
        animation: "blinkClaimPop 480ms cubic-bezier(.2,1.4,.4,1) both",
      }}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 12.5l5 5L20 6"
          stroke={C.primary}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 30,
            strokeDashoffset: 30,
            animation: "blinkClaimDraw 600ms 200ms ease-out forwards",
          }}
        />
      </svg>
    </div>
  );
}

const KEYFRAMES = `
@keyframes blinkClaimSpin {
  to { transform: rotate(360deg); }
}
@keyframes blinkClaimPop {
  0% { transform: scale(0.4); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes blinkClaimDraw {
  to { stroke-dashoffset: 0; }
}
@keyframes blinkShine {
  0% { left: -30%; }
  100% { left: 130%; }
}
@keyframes blinkClaimPulse {
  from { box-shadow: 0 6px 18px rgba(0,255,136,0.35); transform: scale(1); }
  to { box-shadow: 0 6px 28px rgba(0,255,136,0.65); transform: scale(1.015); }
}
`;
