"use client";

// BLINK Spirit Gift — recipient landing page.
// Magic flow: hero, asset preview, privacy assurance, sign-in if needed,
// location prompt, then redirect to /map?gift=[code] where the spawn lives.

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";
import WalkThereButton from "@/components/WalkThereButton";

const IN_APP_WEBVIEW_HINTS = ["Telegram", "FBAN", "FBAV", "Instagram", "Twitter", "Line"];

type GeoStep =
  | { kind: "checking" }
  | { kind: "ready" }
  | { kind: "denied-precheck" }
  | { kind: "requesting" }
  | { kind: "denied" }
  | { kind: "timeout" }
  | { kind: "unavailable" }
  | { kind: "unsupported" }
  | { kind: "navigating" };

interface GiftPreview {
  short_code: string;
  asset_type: "eth" | "blink" | "nft";
  asset_payload: {
    amount?: number;
    contract?: string;
    token_id?: string;
    preview_image?: string;
    preview_name?: string;
  };
  mode: "direct" | "public";
  anonymous: boolean;
  message: string | null;
  status: "pending" | "spawned" | "claimed" | "expired" | "refunded" | "failed";
  expires_at: string;
  claimed_at: string | null;
  recipient_username: string | null;
  sender: { handle: string | null; display_name: string | null } | null;
  winner_handle: string | null;
}

export default function GiftLandingClient() {
  const params = useParams<{ short_code: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const code = String(params.short_code || "").toLowerCase();

  const [gift, setGift] = useState<GiftPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState("");

  const [geoStep, setGeoStep] = useState<GeoStep>({ kind: "checking" });
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInAppWebView, setIsInAppWebView] = useState(false);
  const [copyHint, setCopyHint] = useState("");

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/gifts/${code}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gift not found");
      setGift(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (code) fetchPreview();
  }, [code, fetchPreview]);

  async function handleAuth(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setAuthErr("");
    setAuthBusy(true);
    try {
      const u = username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,30}$/.test(u)) {
        throw new Error("Username: 3–30 chars, letters/numbers/_ only.");
      }
      if (password.length < 8) throw new Error("Password must be at least 8 characters.");
      const endpoint = authMode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign-in failed");
      if (!data.access_token || !data.refresh_token) throw new Error("No session returned");
      const { error: setErr } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (setErr) throw setErr;
      setUsername("");
      setPassword("");
    } catch (err) {
      setAuthErr(err instanceof Error ? err.message : "Failed");
    } finally {
      setAuthBusy(false);
    }
  }

  // UA sniff — runs once on mount.
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent || "";
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsAndroid(/Android/.test(ua));
    setIsInAppWebView(IN_APP_WEBVIEW_HINTS.some((hint) => ua.includes(hint)));
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStep({ kind: "unsupported" });
      return;
    }
    setGeoStep({ kind: "requesting" });
    navigator.geolocation.getCurrentPosition(
      () => {
        setGeoStep({ kind: "navigating" });
        router.push(`/gift/${code}/hunt?geo_ok=1`);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGeoStep({ kind: "denied" });
        else if (err.code === err.TIMEOUT) setGeoStep({ kind: "timeout" });
        else if (err.code === err.POSITION_UNAVAILABLE) setGeoStep({ kind: "unavailable" });
        else setGeoStep({ kind: "denied" });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }, [code, router]);

  // Pre-check permission state once auth is settled.
  useEffect(() => {
    if (!user) return;
    if (typeof navigator === "undefined") return;

    let cancelled = false;

    async function check() {
      const perms = (navigator as Navigator & { permissions?: { query: (q: { name: PermissionName }) => Promise<PermissionStatus> } }).permissions;
      if (!perms || typeof perms.query !== "function") {
        if (!cancelled) setGeoStep({ kind: "ready" });
        return;
      }
      try {
        const status = await perms.query({ name: "geolocation" as PermissionName });
        if (cancelled) return;
        if (status.state === "denied") {
          setGeoStep({ kind: "denied-precheck" });
        } else {
          setGeoStep({ kind: "ready" });
        }
      } catch {
        if (!cancelled) setGeoStep({ kind: "ready" });
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const copyLinkToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyHint("Link copied — paste it in Safari or Chrome.");
    } catch {
      setCopyHint("Couldn't copy. Long-press the address bar to copy this URL.");
    }
  }, []);

  if (loading || authLoading) {
    return (
      <div style={pageStyle}>
        <div style={{ padding: 60, textAlign: "center", color: C.muted }}>Unwrapping…</div>
      </div>
    );
  }

  if (error || !gift) {
    return (
      <div style={pageStyle}>
        <div style={centerCol}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Gift not found</h1>
          <div style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>{error || "This link doesn't lead anywhere."}</div>
          <Link href="/gift/new" style={primaryAnchor}>Send your own Spirit Gift</Link>
        </div>
      </div>
    );
  }

  const senderLabel = gift.anonymous
    ? "A mystery hunter"
    : gift.sender?.display_name || (gift.sender?.handle ? `@${gift.sender.handle}` : "Someone");

  // ──── Claimed ────
  if (gift.status === "claimed") {
    return (
      <div style={pageStyle}>
        <div style={centerCol}>
          <Glyph muted />
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, textAlign: "center" }}>
            Already captured
          </h1>
          <div style={{ color: C.muted, fontSize: 14, marginBottom: 6, textAlign: "center" }}>
            {gift.winner_handle ? `@${gift.winner_handle}` : "Another hunter"} caught this Spirit Gift
          </div>
          {gift.claimed_at && (
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 24, textAlign: "center" }}>
              {new Date(gift.claimed_at).toLocaleString()}
            </div>
          )}
          <Link href="/gift/new" style={primaryAnchor}>Send your own Spirit Gift</Link>
        </div>
      </div>
    );
  }

  // ──── Expired / refunded ────
  if (gift.status === "expired" || gift.status === "refunded") {
    return (
      <div style={pageStyle}>
        <div style={centerCol}>
          <Glyph muted />
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, textAlign: "center" }}>
            This gift has returned to its sender
          </h1>
          <div style={{ color: C.muted, fontSize: 14, marginBottom: 24, textAlign: "center" }}>
            Spirit Gifts only stay open for 24 hours.
          </div>
          <Link href="/gift/new" style={primaryAnchor}>Send your own Spirit Gift</Link>
        </div>
      </div>
    );
  }

  // ──── Pending / spawned ────
  const showAuthPanel = !user;

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "40px 22px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <Glyph />
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.32em",
              color: C.primary,
              textTransform: "uppercase",
              marginTop: 16,
              marginBottom: 6,
              textShadow: "0 0 12px rgba(0,255,136,0.45)",
            }}
          >
            Spirit Gift
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: C.text, margin: "4px 0 6px", letterSpacing: "-0.5px" }}>
            A Spirit Gift Awaits
          </h1>
          <div style={{ fontSize: 15, color: C.muted }}>
            {senderLabel} sent you a gift.
            {gift.recipient_username && gift.mode === "direct" && (
              <>
                {" "}
                <span style={{ color: C.text }}>(for @{gift.recipient_username})</span>
              </>
            )}
          </div>
        </div>

        <AssetCard gift={gift} />

        {gift.message && (
          <div
            style={{
              marginTop: 14,
              padding: "12px 14px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontSize: 14,
              color: C.text,
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted, marginBottom: 4 }}>
              Note
            </div>
            {gift.message}
          </div>
        )}

        {/* Privacy notice — CRITICAL, above location prompt */}
        <div
          style={{
            marginTop: 22,
            padding: "16px 16px",
            border: `1px solid ${C.primary}33`,
            background: "rgba(0,255,136,0.05)",
            borderRadius: 14,
            color: C.text,
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.2em",
              color: C.primary,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Your Location Is Private
          </div>
          No one — not even the sender — will know where you are. We just use it
          once to spawn your gift somewhere nearby for you to find.
        </div>

        {showAuthPanel ? (
          <form onSubmit={handleAuth} style={{ marginTop: 22 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {(["signup", "signin"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAuthMode(m)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 8,
                    border: "none",
                    background: authMode === m ? `${C.primary}22` : "transparent",
                    color: authMode === m ? C.primary : C.muted,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {m === "signup" ? "Create Account" : "Sign In"}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="password (8+ chars)"
              autoComplete={authMode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, marginTop: 10 }}
            />
            {authErr && (
              <div style={{ color: C.danger, fontSize: 13, marginTop: 10 }}>{authErr}</div>
            )}
            <button
              type="submit"
              disabled={authBusy}
              style={{ ...primaryBtn, width: "100%", marginTop: 12, opacity: authBusy ? 0.6 : 1 }}
            >
              {authBusy ? "…" : authMode === "signup" ? "Create Account & Continue" : "Sign In & Continue"}
            </button>
            <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 10 }}>
              Creating an account also creates your wallet (about 10 seconds).
            </div>
          </form>
        ) : (
          <GeoStepPanel
            step={geoStep}
            isIOS={isIOS}
            isAndroid={isAndroid}
            isInAppWebView={isInAppWebView}
            copyHint={copyHint}
            onRequestLocation={requestLocation}
            onCopyLink={copyLinkToClipboard}
            onReload={() => window.location.reload()}
            onPickOnMap={() => router.push(`/gift/${code}/walk`)}
          />
        )}
      </div>
    </div>
  );
}

function AssetCard({ gift }: { gift: GiftPreview }) {
  const isNft = gift.asset_type === "nft";
  const isEth = gift.asset_type === "eth";
  const symbol = isEth ? "ETH" : "BLINK";

  return (
    <div
      style={{
        marginTop: 6,
        padding: 22,
        borderRadius: 20,
        background: "radial-gradient(circle at 50% 0%, rgba(0,255,136,0.16), rgba(0,255,136,0.03) 60%, transparent), rgba(255,255,255,0.03)",
        border: `1px solid ${C.primary}44`,
        textAlign: "center",
        boxShadow: "0 8px 36px rgba(0,255,136,0.10)",
      }}
    >
      {isNft ? (
        <>
          {gift.asset_payload.preview_image ? (
            <img
              src={gift.asset_payload.preview_image}
              alt={gift.asset_payload.preview_name || `Token #${gift.asset_payload.token_id ?? "?"}`}
              style={{
                width: 140,
                height: 140,
                margin: "0 auto 14px",
                display: "block",
                borderRadius: 16,
                objectFit: "cover",
                border: "1px solid rgba(0,255,136,0.2)",
                boxShadow: "0 0 0 1px rgba(0,255,136,0.15), 0 6px 24px rgba(0,255,136,0.18)",
              }}
            />
          ) : (
            <div
              style={{
                width: 140,
                height: 140,
                margin: "0 auto 14px",
                borderRadius: 16,
                background: "rgba(0,255,136,0.08)",
                border: "1px solid rgba(0,255,136,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.primary,
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              NFT
            </div>
          )}
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
            {gift.asset_payload.preview_name || `Token #${gift.asset_payload.token_id ?? "?"}`}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4, fontFamily: "monospace" }}>
            {(gift.asset_payload.contract || "").slice(0, 10)}…
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: C.text,
              lineHeight: 1.1,
              letterSpacing: "-1px",
            }}
          >
            {gift.asset_payload.amount}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.24em",
              color: C.primary,
              textTransform: "uppercase",
              marginTop: 6,
            }}
          >
            {symbol}
          </div>
        </>
      )}
    </div>
  );
}

function GeoStepPanel({
  step,
  isIOS,
  isAndroid,
  isInAppWebView,
  copyHint,
  onRequestLocation,
  onCopyLink,
  onReload,
  onPickOnMap,
}: {
  step: GeoStep;
  isIOS: boolean;
  isAndroid: boolean;
  isInAppWebView: boolean;
  copyHint: string;
  onRequestLocation: () => void;
  onCopyLink: () => void;
  onReload: () => void;
  onPickOnMap: () => void;
}) {
  const pickOnMapBlock = (
    <div style={{ marginTop: 10 }}>
      <WalkThereButton onClick={onPickOnMap} />
      <div style={geoTertiaryHint}>
        Walk to your gift on the map. Real human pace — under 5 minutes.
      </div>
    </div>
  );
  if (step.kind === "checking" || step.kind === "navigating") {
    return (
      <div style={{ marginTop: 22, textAlign: "center", color: C.muted, fontSize: 13 }}>
        {step.kind === "navigating" ? "Finding your gift…" : "Checking location access…"}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 22 }}>
      {isInAppWebView && (
        <div style={geoWebviewBanner}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            Tip: open this in your browser
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.45 }}>
            Chat-app browsers often block location. Tap the menu (top right) and choose
            &ldquo;Open in Browser&rdquo; — Safari on iPhone, Chrome on Android.
          </div>
          <button type="button" onClick={onCopyLink} style={geoSecondaryBtn}>
            Copy Link
          </button>
          {copyHint && (
            <div style={{ fontSize: 11, color: C.primary, marginTop: 8 }}>{copyHint}</div>
          )}
        </div>
      )}

      {step.kind === "ready" && (
        <>
          <div style={geoHeading}>Two ways to find it</div>
          <div style={geoSubheading}>Walk to your gift</div>
          <p style={geoBody}>
            Hunt it in the real world with GPS, or pin a starting point and walk to it on the map.
          </p>
          <button
            type="button"
            onClick={onRequestLocation}
            style={geoBigBtn}
          >
            Allow Location & Walk to It
          </button>
          <div style={{ marginTop: 12 }}>
            <WalkThereButton onClick={onPickOnMap} />
          </div>
          <div style={geoDualHint}>
            Both paths claim the same gift. Real-world walking is instant on arrival — virtually walking takes real human pace.
          </div>
        </>
      )}

      {step.kind === "denied-precheck" && (
        <>
          <div style={geoHeading}>Two ways to find it</div>
          <div style={geoSubheading}>Walk to your gift</div>
          <p style={geoBody}>
            Hunt it in the real world with GPS, or pin a starting point and walk to it on the map.
          </p>
          <button
            type="button"
            onClick={onRequestLocation}
            style={geoBigBtnMuted}
          >
            Allow Location & Walk to It
          </button>
          <div style={geoMutedSubtext}>Already blocked — tap to retry</div>
          <div style={{ marginTop: 12 }}>
            <WalkThereButton onClick={onPickOnMap} />
          </div>
          <div style={geoDualHint}>
            Both paths claim the same gift. Real-world walking is instant on arrival — virtually walking takes real human pace.
          </div>
        </>
      )}

      {step.kind === "requesting" && (
        <>
          <div style={geoHeading}>One more step</div>
          <div style={geoSubheading}>We need your location</div>
          <p style={geoBody}>
            Approve the location prompt to find your gift.
          </p>
          <button
            type="button"
            disabled
            style={{ ...geoBigBtn, opacity: 0.7, cursor: "wait" }}
          >
            Waiting for permission…
          </button>
        </>
      )}

      {step.kind === "denied" && (
        <div style={geoRecoveryCard}>
          <div style={geoRecoveryEyebrow}>Action needed</div>
          <div style={geoRecoveryTitle}>Location is blocked for this site</div>
          <p style={geoRecoveryBody}>
            {isIOS
              ? "Safari has blocked location access for blinkworld.xyz. To unlock your gift:"
              : isAndroid
              ? "Chrome has blocked location access for blinkworld.xyz. To unlock your gift:"
              : "Your browser has blocked location access for blinkworld.xyz. To unlock your gift:"}
          </p>
          <ol style={geoStepsList}>
            {isAndroid ? (
              <>
                <li style={geoStepItem}>
                  Tap the <strong style={geoStrong}>lock icon</strong> in the address bar
                </li>
                <li style={geoStepItem}>
                  Tap <strong style={geoStrong}>Permissions</strong>
                </li>
                <li style={geoStepItem}>
                  Set <strong style={geoStrong}>Location</strong> to <strong style={geoStrong}>Allow</strong>
                </li>
              </>
            ) : (
              <>
                <li style={geoStepItem}>
                  Tap <strong style={geoStrong}>AA</strong> in the Safari address bar (top-left)
                </li>
                <li style={geoStepItem}>
                  Tap <strong style={geoStrong}>Website Settings</strong>
                </li>
                <li style={geoStepItem}>
                  Set <strong style={geoStrong}>Location</strong> to <strong style={geoStrong}>Allow</strong>
                </li>
              </>
            )}
          </ol>
          <button type="button" onClick={onRequestLocation} style={geoBigBtn}>
            Try Again
          </button>
          <button
            type="button"
            onClick={onReload}
            style={{ ...geoSecondaryBtn, width: "100%", marginTop: 10 }}
          >
            Reload Page
          </button>
          {pickOnMapBlock}
        </div>
      )}

      {step.kind === "timeout" && (
        <div style={geoRecoveryCard}>
          <div style={geoRecoveryEyebrow}>Action needed</div>
          <div style={geoRecoveryTitle}>Couldn&rsquo;t lock onto your location</div>
          <p style={geoRecoveryBody}>Step outside or near a window and try again.</p>
          <button type="button" onClick={onRequestLocation} style={geoBigBtn}>
            Try Again
          </button>
        </div>
      )}

      {step.kind === "unavailable" && (
        <div style={geoRecoveryCard}>
          <div style={geoRecoveryEyebrow}>Action needed</div>
          <div style={geoRecoveryTitle}>Your phone can&rsquo;t determine your location</div>
          <p style={geoRecoveryBody}>
            Check Settings → Privacy → Location Services and make sure it&rsquo;s on.
          </p>
          <button type="button" onClick={onRequestLocation} style={geoBigBtn}>
            Try Again
          </button>
          {pickOnMapBlock}
        </div>
      )}

      {step.kind === "unsupported" && (
        <div style={geoRecoveryCard}>
          <div style={geoRecoveryEyebrow}>Action needed</div>
          <div style={geoRecoveryTitle}>Location not supported</div>
          <p style={geoRecoveryBody}>
            This browser doesn&rsquo;t support location. Open the link in Safari or Chrome.
          </p>
          <button type="button" onClick={onCopyLink} style={{ ...geoSecondaryBtn, width: "100%" }}>
            Copy Link
          </button>
          {copyHint && (
            <div style={{ fontSize: 12, color: C.primary, marginTop: 10, textAlign: "center" }}>
              {copyHint}
            </div>
          )}
          {pickOnMapBlock}
        </div>
      )}
    </div>
  );
}

function Glyph({ muted = false }: { muted?: boolean }) {
  const color = muted ? C.muted : C.primary;
  return (
    <svg
      width="60"
      height="60"
      viewBox="0 0 60 60"
      style={{ display: "block", margin: "0 auto", filter: muted ? "none" : `drop-shadow(0 0 18px ${color})` }}
    >
      <circle cx="30" cy="30" r="22" fill="none" stroke={color} strokeWidth="1.5" opacity={muted ? 0.4 : 0.7} />
      <circle cx="30" cy="30" r="10" fill={color} opacity={muted ? 0.25 : 0.55} />
      <circle cx="30" cy="30" r="4" fill={color} />
    </svg>
  );
}

// ───────────── Styles ─────────────

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: `radial-gradient(circle at 50% -10%, rgba(0,255,136,0.10), transparent 50%), ${C.bg}`,
  color: C.text,
  fontFamily: "'Inter', system-ui, sans-serif",
};

const centerCol: React.CSSProperties = {
  maxWidth: 440,
  margin: "0 auto",
  padding: "70px 22px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 46,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: "0 14px",
  color: C.text,
  fontSize: 15,
  fontFamily: "inherit",
  outline: "none",
};

const primaryBtn: React.CSSProperties = {
  height: 48,
  borderRadius: 24,
  background: C.primary,
  color: "#0a0a0f",
  border: "none",
  fontWeight: 800,
  fontSize: 14,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
  boxShadow: "0 4px 18px rgba(0,255,136,0.25)",
};

const primaryAnchor: React.CSSProperties = {
  ...primaryBtn,
  padding: "0 22px",
  display: "inline-flex",
  alignItems: "center",
  textDecoration: "none",
  height: 46,
};

const geoHeading: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.28em",
  color: C.primary,
  textTransform: "uppercase",
  textShadow: "0 0 12px rgba(0,255,136,0.45)",
  marginBottom: 6,
};

const geoSubheading: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  color: C.text,
  letterSpacing: "-0.3px",
  marginBottom: 6,
  lineHeight: 1.2,
};

const geoBody: React.CSSProperties = {
  fontSize: 14,
  color: C.muted,
  lineHeight: 1.55,
  margin: "0 0 18px",
};

const geoBigBtn: React.CSSProperties = {
  width: "100%",
  height: 56,
  borderRadius: 28,
  border: "none",
  background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primary2} 100%)`,
  color: "#0a0a0f",
  fontWeight: 800,
  fontSize: 15,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
  boxShadow: "0 6px 24px rgba(0,255,136,0.35)",
};

const geoBigBtnMuted: React.CSSProperties = {
  width: "100%",
  height: 56,
  borderRadius: 28,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: C.muted,
  fontWeight: 800,
  fontSize: 15,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};

const geoMutedSubtext: React.CSSProperties = {
  fontSize: 11,
  color: C.muted,
  textAlign: "center",
  marginTop: 6,
  letterSpacing: "0.04em",
};

const geoDualHint: React.CSSProperties = {
  fontSize: 11,
  color: C.muted,
  textAlign: "center",
  marginTop: 14,
  lineHeight: 1.55,
  fontStyle: "italic",
};

const geoSecondaryBtn: React.CSSProperties = {
  height: 42,
  borderRadius: 21,
  background: "transparent",
  color: C.primary,
  border: `1px solid ${C.primary}66`,
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
  padding: "0 16px",
};

const geoTertiaryHint: React.CSSProperties = {
  fontSize: 11,
  color: C.muted,
  marginTop: 8,
  textAlign: "center",
  lineHeight: 1.5,
};

const geoRecoveryCard: React.CSSProperties = {
  padding: "18px 16px",
  borderRadius: 16,
  background: C.surface,
  border: `1px solid ${C.danger}55`,
  boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
};

const geoRecoveryEyebrow: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.28em",
  color: C.danger,
  textTransform: "uppercase",
  marginBottom: 8,
};

const geoRecoveryTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: C.text,
  letterSpacing: "-0.3px",
  marginBottom: 8,
  lineHeight: 1.25,
};

const geoRecoveryBody: React.CSSProperties = {
  fontSize: 13,
  color: C.muted,
  lineHeight: 1.55,
  margin: "0 0 12px",
};

const geoStepsList: React.CSSProperties = {
  listStyle: "decimal",
  paddingLeft: 22,
  margin: "0 0 16px",
  color: C.text,
  fontSize: 13,
  lineHeight: 1.6,
};

const geoStepItem: React.CSSProperties = {
  marginBottom: 4,
};

const geoStrong: React.CSSProperties = {
  color: C.primary,
  fontWeight: 800,
};

const geoWebviewBanner: React.CSSProperties = {
  padding: "14px 14px 16px",
  border: `1px solid ${C.primary}44`,
  borderRadius: 14,
  background: "rgba(0,255,136,0.05)",
  marginBottom: 16,
};
