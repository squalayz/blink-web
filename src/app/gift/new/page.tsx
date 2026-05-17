"use client";

// BLINK Spirit Gift — sender creation flow.
// 3 steps: pick asset → mode/recipient/message → confirm.

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";

type AssetType = "eth" | "blink" | "nft";
type Mode = "direct" | "public";

interface OwnedNFT {
  contract: string;
  token_id: string;
  name: string;
  image: string | null;
  collection: "genesis" | "mythics";
}

export default function GiftNewPage() {
  // useSearchParams forces the inner client tree to bail out of prerender;
  // a Suspense boundary lets Next.js still build the static shell.
  return (
    <Suspense fallback={null}>
      <GiftNewInner />
    </Suspense>
  );
}

function GiftNewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const initialAsset =
    (searchParams.get("asset") as AssetType | null) ?? "blink";
  const initialContract = searchParams.get("contract") ?? "";
  const initialTokenId = searchParams.get("tokenId") ?? "";

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [assetType, setAssetType] = useState<AssetType>(
    initialAsset === "eth" || initialAsset === "blink" || initialAsset === "nft"
      ? initialAsset
      : "blink",
  );
  const [amount, setAmount] = useState("");
  const [nftContract, setNftContract] = useState(initialContract);
  const [nftTokenId, setNftTokenId] = useState(initialTokenId);
  const [nftPreviewImage, setNftPreviewImage] = useState<string | null>(null);
  const [nftPreviewName, setNftPreviewName] = useState<string>("");
  const [ownedNfts, setOwnedNfts] = useState<OwnedNFT[]>([]);
  const [loadingNfts, setLoadingNfts] = useState(false);

  const [mode, setMode] = useState<Mode>("direct");
  const [anonymous, setAnonymous] = useState(false);
  const [recipientUsername, setRecipientUsername] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resultLink, setResultLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  // Fetch owned BLINK NFTs from the authenticated server route. The route is
  // the only source of truth for which contracts are giftable; the client no
  // longer maintains its own allow-list (server validates again at create).
  const fetchOwnedNfts = useCallback(async () => {
    if (!user) return;
    setLoadingNfts(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setOwnedNfts([]);
        return;
      }
      const res = await fetch("/api/wallet/blink-nfts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setOwnedNfts([]);
        return;
      }
      const data = await res.json();
      const nfts = (data.nfts || []) as Array<{
        contract: string;
        tokenId: string;
        name: string;
        image: string | null;
        collection: "genesis" | "mythics";
      }>;
      setOwnedNfts(
        nfts.map((n) => ({
          contract: n.contract,
          token_id: n.tokenId,
          name: n.name,
          image: n.image,
          collection: n.collection,
        }))
      );
    } catch {
      setOwnedNfts([]);
    } finally {
      setLoadingNfts(false);
    }
  }, [user]);

  useEffect(() => {
    if (step === 1 && assetType === "nft") fetchOwnedNfts();
  }, [step, assetType, fetchOwnedNfts]);

  // When deep-linked with ?asset=nft&contract=...&tokenId=..., backfill the
  // preview image + name from the owned-NFTs list so Step 3 (confirm) shows
  // the artwork without a second click.
  useEffect(() => {
    if (assetType !== "nft" || !initialContract || !initialTokenId) return;
    const match = ownedNfts.find(
      (n) =>
        n.contract.toLowerCase() === initialContract.toLowerCase() &&
        n.token_id === initialTokenId,
    );
    if (match) {
      setNftPreviewImage(match.image);
      setNftPreviewName(match.name);
    }
  }, [ownedNfts, initialContract, initialTokenId, assetType]);

  const canContinue = (() => {
    if (step === 1) {
      if (assetType === "eth" || assetType === "blink") {
        const n = Number(amount);
        return isFinite(n) && n > 0;
      }
      if (assetType === "nft") return !!nftContract && !!nftTokenId;
    }
    if (step === 2) {
      if (mode === "direct" && recipientUsername) {
        return /^[a-z0-9_]{3,30}$/i.test(recipientUsername.trim().replace(/^@/, ""));
      }
      return true;
    }
    return true;
  })();

  async function submit() {
    if (!user) return;
    setSubmitting(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sign in first");

      const asset_payload: Record<string, unknown> = {};
      if (assetType === "eth" || assetType === "blink") {
        asset_payload.amount = Number(amount);
      } else {
        asset_payload.contract = nftContract;
        asset_payload.token_id = nftTokenId;
        // Persist the picked NFT's image + name so the recipient landing page
        // can render the artwork without a second on-chain lookup.
        if (nftPreviewImage) asset_payload.preview_image = nftPreviewImage;
        if (nftPreviewName) asset_payload.preview_name = nftPreviewName;
      }

      const res = await fetch("/api/gifts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          asset_type: assetType,
          asset_payload,
          mode,
          anonymous,
          message: message || undefined,
          recipient_username: mode === "direct" ? recipientUsername || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResultLink(data.link);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(resultLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  function share(target: "telegram" | "x" | "sms" | "native") {
    const text = `A Spirit Gift awaits — open it: ${resultLink}`;
    if (target === "telegram") {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(resultLink)}&text=${encodeURIComponent("A Spirit Gift awaits")}`);
    } else if (target === "x") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`);
    } else if (target === "sms") {
      window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
    } else if (target === "native" && typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ url: resultLink, text: "A Spirit Gift awaits", title: "Spirit Gift" }).catch(() => {});
    }
  }

  if (authLoading || !user) {
    return (
      <div style={pageStyle}>
        <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 20px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <button onClick={() => router.back()} style={backBtn} aria-label="Back">‹</button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Spirit Gift</h1>
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 22 }}>
          Wrap an asset in a link. They open it, walk to where it spawns, catch it.
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: step >= n ? C.primary : "rgba(255,255,255,0.08)",
                boxShadow: step >= n ? "0 0 12px rgba(0,255,136,0.4)" : "none",
              }}
            />
          ))}
        </div>

        {step === 1 && (
          <Step1
            assetType={assetType}
            setAssetType={setAssetType}
            amount={amount}
            setAmount={setAmount}
            ownedNfts={ownedNfts}
            loadingNfts={loadingNfts}
            nftContract={nftContract}
            nftTokenId={nftTokenId}
            setNftSelection={(c, t, image, name) => {
              setNftContract(c);
              setNftTokenId(t);
              setNftPreviewImage(image);
              setNftPreviewName(name);
            }}
          />
        )}

        {step === 2 && (
          <Step2
            mode={mode}
            setMode={setMode}
            anonymous={anonymous}
            setAnonymous={setAnonymous}
            recipientUsername={recipientUsername}
            setRecipientUsername={setRecipientUsername}
            message={message}
            setMessage={setMessage}
          />
        )}

        {step === 3 && (
          <Step3
            assetType={assetType}
            amount={amount}
            nftContract={nftContract}
            nftTokenId={nftTokenId}
            mode={mode}
            anonymous={anonymous}
            recipientUsername={recipientUsername}
            message={message}
            submitting={submitting}
            error={error}
          />
        )}

        {step === 4 && resultLink && (
          <Step4
            link={resultLink}
            copied={copied}
            onCopy={copyLink}
            onShare={share}
            onViewGifts={() => router.push("/gifts")}
          />
        )}

        {/* Nav buttons */}
        {step < 4 && (
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))}
                style={{ ...secondaryBtn }}
              >
                Back
              </button>
            )}
            {step < 3 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3 | 4) : s))}
                disabled={!canContinue}
                style={{ ...primaryBtn, opacity: canContinue ? 1 : 0.5, cursor: canContinue ? "pointer" : "not-allowed" }}
              >
                Continue
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                style={{ ...primaryBtn, opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? "Creating…" : "Create Gift Link"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────── Sub-components ─────────────

function Step1({
  assetType,
  setAssetType,
  amount,
  setAmount,
  ownedNfts,
  loadingNfts,
  nftContract,
  nftTokenId,
  setNftSelection,
}: {
  assetType: AssetType;
  setAssetType: (a: AssetType) => void;
  amount: string;
  setAmount: (s: string) => void;
  ownedNfts: OwnedNFT[];
  loadingNfts: boolean;
  nftContract: string;
  nftTokenId: string;
  setNftSelection: (c: string, t: string, image: string | null, name: string) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>What are you gifting?</label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 18 }}>
        {(["eth", "blink", "nft"] as AssetType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setAssetType(t)}
            style={{
              padding: "14px 8px",
              borderRadius: 12,
              border: `1px solid ${assetType === t ? C.primary : "rgba(255,255,255,0.08)"}`,
              background: assetType === t ? "rgba(0,255,136,0.10)" : "rgba(255,255,255,0.03)",
              color: assetType === t ? C.primary : C.text,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {(assetType === "eth" || assetType === "blink") && (
        <>
          <label style={labelStyle}>Amount</label>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            placeholder={assetType === "eth" ? "0.01" : "100"}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={inputStyle}
          />
          <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
            {assetType === "eth"
              ? "We'll reserve gas from your wallet. Gift returns to you if unclaimed in 24h."
              : "Sent from your custodial wallet. Returns if unclaimed in 24h."}
          </div>
        </>
      )}

      {assetType === "nft" && (
        <>
          <label style={labelStyle}>Pick a BLINK NFT you own</label>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.4 }}>
            Only BLINK Bestiary Genesis and Mythics are giftable in v1.
          </div>
          {loadingNfts ? (
            <div style={{ color: C.muted, fontSize: 13, padding: 16 }}>Loading your BLINK NFTs…</div>
          ) : ownedNfts.length === 0 ? (
            <div
              style={{
                padding: 18,
                border: "1px dashed rgba(255,255,255,0.14)",
                borderRadius: 12,
                background: "rgba(255,255,255,0.02)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 6 }}>
                You don&rsquo;t own any BLINK NFTs yet.
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
                Mint a Bestiary creature to unlock NFT gifting.
              </div>
              <a
                href="https://mintmyblink.com"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  padding: "10px 18px",
                  borderRadius: 20,
                  background: C.primary,
                  color: "#0a0a0f",
                  fontWeight: 800,
                  fontSize: 12,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                }}
              >
                Mint at mintmyblink.com
              </a>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
              {ownedNfts.map((n) => {
                const selected =
                  n.contract.toLowerCase() === nftContract.toLowerCase() && n.token_id === nftTokenId;
                return (
                  <button
                    key={`${n.contract}-${n.token_id}`}
                    type="button"
                    onClick={() => setNftSelection(n.contract, n.token_id, n.image, n.name)}
                    style={{
                      border: `1px solid ${selected ? C.primary : "rgba(255,255,255,0.08)"}`,
                      background: selected ? "rgba(0,255,136,0.08)" : "rgba(255,255,255,0.03)",
                      padding: 10,
                      borderRadius: 12,
                      cursor: "pointer",
                      textAlign: "left",
                      color: C.text,
                      fontFamily: "inherit",
                      position: "relative",
                    }}
                  >
                    {n.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={n.image}
                        alt={n.name}
                        style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 8 }}
                      />
                    )}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.name}
                      </div>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: n.collection === "mythics" ? "rgba(255,165,0,0.18)" : "rgba(0,255,136,0.14)",
                          color: n.collection === "mythics" ? "#ffb547" : C.primary,
                          flexShrink: 0,
                        }}
                      >
                        {n.collection === "mythics" ? "Mythic" : "Genesis"}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>#{n.token_id}</div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Step2({
  mode,
  setMode,
  anonymous,
  setAnonymous,
  recipientUsername,
  setRecipientUsername,
  message,
  setMessage,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  anonymous: boolean;
  setAnonymous: (a: boolean) => void;
  recipientUsername: string;
  setRecipientUsername: (s: string) => void;
  message: string;
  setMessage: (s: string) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>Gift mode</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
        {(["direct", "public"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              padding: "14px 10px",
              borderRadius: 12,
              border: `1px solid ${mode === m ? C.primary : "rgba(255,255,255,0.08)"}`,
              background: mode === m ? "rgba(0,255,136,0.10)" : "rgba(255,255,255,0.03)",
              color: mode === m ? C.primary : C.text,
              fontFamily: "inherit",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {m === "direct" ? "Direct" : "Public Hunt"}
            </div>
            <div style={{ fontSize: 11, color: mode === m ? C.primary : C.muted, lineHeight: 1.4 }}>
              {m === "direct" ? "Send to a person. First opener wins." : "Paste anywhere. First catcher wins."}
            </div>
          </button>
        ))}
      </div>

      {mode === "direct" && (
        <>
          <label style={labelStyle}>Recipient (optional)</label>
          <input
            type="text"
            placeholder="@username"
            value={recipientUsername}
            onChange={(e) => setRecipientUsername(e.target.value.replace(/\s+/g, ""))}
            style={inputStyle}
          />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6, marginBottom: 14 }}>
            For display only. First opener still wins regardless of username.
          </div>
        </>
      )}

      <label style={labelStyle}>Message (optional)</label>
      <textarea
        placeholder="Say something nice…"
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, 280))}
        rows={3}
        style={{ ...inputStyle, resize: "vertical", minHeight: 70, fontFamily: "inherit" }}
      />

      <label style={{ ...labelStyle, marginTop: 18 }}>Identity</label>
      <button
        type="button"
        onClick={() => setAnonymous(!anonymous)}
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 12,
          border: `1px solid ${anonymous ? C.primary : "rgba(255,255,255,0.08)"}`,
          background: anonymous ? "rgba(0,255,136,0.08)" : "rgba(255,255,255,0.03)",
          color: C.text,
          textAlign: "left",
          fontFamily: "inherit",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Send anonymously</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            Recipient sees "A mystery hunter" instead of your handle.
          </div>
        </div>
        <div
          style={{
            width: 36,
            height: 22,
            borderRadius: 11,
            background: anonymous ? C.primary : "rgba(255,255,255,0.12)",
            position: "relative",
            transition: "background 0.15s",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 2,
              left: anonymous ? 16 : 2,
              width: 18,
              height: 18,
              borderRadius: 9,
              background: "#fff",
              transition: "left 0.15s",
            }}
          />
        </div>
      </button>
    </div>
  );
}

function Step3({
  assetType,
  amount,
  nftContract,
  nftTokenId,
  mode,
  anonymous,
  recipientUsername,
  message,
  submitting,
  error,
}: {
  assetType: AssetType;
  amount: string;
  nftContract: string;
  nftTokenId: string;
  mode: Mode;
  anonymous: boolean;
  recipientUsername: string;
  message: string;
  submitting: boolean;
  error: string;
}) {
  return (
    <div>
      <div style={{ ...summaryRow }}>
        <span style={summaryKey}>Asset</span>
        <span style={summaryVal}>
          {assetType === "nft" ? `NFT ${nftContract.slice(0, 8)}…/${nftTokenId}` : `${amount} ${assetType.toUpperCase()}`}
        </span>
      </div>
      <div style={summaryRow}>
        <span style={summaryKey}>Mode</span>
        <span style={summaryVal}>{mode === "direct" ? "Direct" : "Public Hunt"}</span>
      </div>
      {mode === "direct" && recipientUsername && (
        <div style={summaryRow}>
          <span style={summaryKey}>To</span>
          <span style={summaryVal}>@{recipientUsername.replace(/^@/, "")}</span>
        </div>
      )}
      <div style={summaryRow}>
        <span style={summaryKey}>Identity</span>
        <span style={summaryVal}>{anonymous ? "Mystery hunter" : "You"}</span>
      </div>
      <div style={summaryRow}>
        <span style={summaryKey}>Expires</span>
        <span style={summaryVal}>In 24 hours</span>
      </div>
      {message && (
        <div style={{ ...summaryRow, alignItems: "flex-start" }}>
          <span style={summaryKey}>Message</span>
          <span style={{ ...summaryVal, textAlign: "right", maxWidth: "60%" }}>{message}</span>
        </div>
      )}
      {error && (
        <div style={{ marginTop: 14, color: C.danger, fontSize: 13, fontWeight: 600 }}>{error}</div>
      )}
      {submitting && (
        <div style={{ marginTop: 14, color: C.muted, fontSize: 13 }}>
          Verifying ownership + balance on-chain…
        </div>
      )}
    </div>
  );
}

function Step4({
  link,
  copied,
  onCopy,
  onShare,
  onViewGifts,
}: {
  link: string;
  copied: boolean;
  onCopy: () => void;
  onShare: (target: "telegram" | "x" | "sms" | "native") => void;
  onViewGifts: () => void;
}) {
  return (
    <div>
      <div
        style={{
          padding: 28,
          background: "radial-gradient(circle at 50% 30%, rgba(0,255,136,0.18), rgba(0,255,136,0.04) 60%, transparent)",
          border: `1px solid ${C.primary}55`,
          borderRadius: 18,
          textAlign: "center",
          marginBottom: 22,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.32em",
            color: C.primary,
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Gift Sealed
        </div>
        <div style={{ fontSize: 14, color: C.text }}>Share this link anywhere.</div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          padding: "12px 14px",
          fontFamily: "monospace",
          fontSize: 13,
          color: C.text,
          marginBottom: 14,
          wordBreak: "break-all",
        }}
      >
        {link}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <button type="button" onClick={onCopy} style={primaryBtn}>
          {copied ? "Copied" : "Copy Link"}
        </button>
        <button type="button" onClick={() => onShare("native")} style={secondaryBtn}>
          Share
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 20 }}>
        <button type="button" onClick={() => onShare("telegram")} style={miniBtn}>Telegram</button>
        <button type="button" onClick={() => onShare("x")} style={miniBtn}>X / Twitter</button>
        <button type="button" onClick={() => onShare("sms")} style={miniBtn}>SMS</button>
      </div>
      <button type="button" onClick={onViewGifts} style={{ ...secondaryBtn, width: "100%" }}>
        View My Gifts
      </button>
    </div>
  );
}

// ───────────── Styles ─────────────

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: C.bg,
  color: C.text,
  fontFamily: "'Inter', system-ui, sans-serif",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: C.muted,
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 46,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: "0 14px",
  color: C.text,
  fontSize: 15,
  fontFamily: "inherit",
  outline: "none",
};

const primaryBtn: React.CSSProperties = {
  flex: 1,
  height: 48,
  borderRadius: 24,
  background: C.primary,
  color: "#0a0a0f",
  border: "none",
  fontWeight: 800,
  fontSize: 14,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
  boxShadow: "0 4px 18px rgba(0,255,136,0.25)",
};

const secondaryBtn: React.CSSProperties = {
  flex: 1,
  height: 48,
  borderRadius: 24,
  background: "transparent",
  color: C.text,
  border: "1px solid rgba(255,255,255,0.14)",
  fontWeight: 700,
  fontSize: 14,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};

const miniBtn: React.CSSProperties = {
  padding: "10px 8px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: C.text,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const backBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 16,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: C.text,
  fontSize: 22,
  lineHeight: "30px",
  cursor: "pointer",
  fontFamily: "inherit",
};

const summaryRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 0",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const summaryKey: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: C.muted,
  fontWeight: 700,
};

const summaryVal: React.CSSProperties = {
  fontSize: 14,
  color: C.text,
  fontWeight: 600,
};
