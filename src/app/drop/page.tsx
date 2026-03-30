"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import OrbAnimation from "@/components/OrbAnimation";
import UserAvatar from "@/components/UserAvatar";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Navigation,
  Shuffle,
  Check,
} from "lucide-react";
import ChainSelector from "@/components/ChainSelector";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const TOTAL_STEPS = 7;

const COLORS = {
  bg: "#0A0A0F",
  surface: "#111118",
  card: "#1C1C28",
  primary: "#9945FF",
  accent: "#14F195",
  gold: "#F59E0B",
  text: "#F9FAFB",
  textMuted: "#9CA3AF",
  border: "#1F2028",
};

const RATES: Record<string, number> = {
  SOL: 170,
  ETH: 3400,
  BTC: 85000,
};

const CURRENCIES = ["SOL", "ETH", "BTC"] as const;
type Currency = (typeof CURRENCIES)[number];
type Rarity = "common" | "rare" | "legendary";

const RARITY_COLORS: Record<Rarity, string> = {
  common: "#C0C0C0",
  rare: "#3B82F6",
  legendary: "#F59E0B",
};

const RARITY_LABELS: Record<Rarity, string> = {
  common: "Common",
  rare: "Rare",
  legendary: "Legendary",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getRarity(usd: number): Rarity {
  if (usd >= 100) return "legendary";
  if (usd >= 10) return "rare";
  return "common";
}

function randomNearby(lat: number, lng: number, radiusKm: number) {
  const r = radiusKm / 111.32;
  const u = Math.random();
  const v = Math.random();
  const w = r * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const newLat = lat + w * Math.cos(t);
  const newLng = lng + (w * Math.sin(t)) / Math.cos(lat * (Math.PI / 180));
  return { lat: +newLat.toFixed(6), lng: +newLng.toFixed(6) };
}

/* ------------------------------------------------------------------ */
/*  Slide animation variants                                          */
/* ------------------------------------------------------------------ */

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function DropOrbPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  /* form state */
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  const [selectedChain, setSelectedChain] = useState<"solana" | "ethereum" | "bitcoin">("solana");
  const [currency, setCurrency] = useState<Currency>("SOL");
  const [amount, setAmount] = useState("");
  const [claimFee, setClaimFee] = useState(1);
  const [message, setMessage] = useState("");
  const [chainBalance, setChainBalance] = useState<number | null>(null);
  const [chainBalanceUsd, setChainBalanceUsd] = useState<number | null>(null);

  const [locationMode, setLocationMode] = useState<"gps" | "random" | null>(
    null
  );
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [dropperHandle, setDropperHandle] = useState<string | null>(null);
  const [dropperPic, setDropperPic] = useState<string | null>(null);
  const [dropperWallet, setDropperWallet] = useState<string | null>(null);

  /* derived */
  const amountNum = parseFloat(amount) || 0;
  const amountUsd = amountNum * (RATES[currency] ?? 0);
  const rarity = getRarity(amountUsd);

  /* auth guard */
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/signin");
    }
  }, [loading, user, router]);

  /* fetch dropper profile */
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("handle, profile_pic_url, wallet_address")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDropperHandle(data.handle);
          setDropperPic(data.profile_pic_url);
          setDropperWallet(data.wallet_address);
        }
      });
  }, [user]);

  /* fetch balance when chain changes */
  useEffect(() => {
    if (!dropperWallet) return;
    setChainBalance(null);
    setChainBalanceUsd(null);
    fetch(`/api/wallet/balance?address=${encodeURIComponent(dropperWallet)}&chain=${selectedChain}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.balance !== undefined) {
          setChainBalance(data.balance);
          setChainBalanceUsd(data.balanceUsd);
        }
      })
      .catch(() => {});
  }, [selectedChain, dropperWallet]);

  /* sync currency when chain changes */
  useEffect(() => {
    const chainCurrency: Record<string, Currency> = { solana: "SOL", ethereum: "ETH", bitcoin: "BTC" };
    setCurrency(chainCurrency[selectedChain]);
  }, [selectedChain]);

  /* navigation */
  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step === 1) {
      router.push("/map");
    } else {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }, [step, router]);

  /* can advance? */
  const canAdvance = (() => {
    switch (step) {
      case 1:
        return !!currency;
      case 2:
        return amountNum > 0 && amountUsd >= 0.01;
      case 3:
        return claimFee >= 0.1 && claimFee <= 100;
      case 4:
        return true; // display only
      case 5:
        return true; // message is optional
      case 6:
        return lat !== null && lng !== null;
      default:
        return false;
    }
  })();

  /* GPS helpers */
  const getGPS = useCallback(() => {
    setGpsLoading(true);
    setGpsError("");
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(+pos.coords.latitude.toFixed(6));
        setLng(+pos.coords.longitude.toFixed(6));
        setLocationMode("gps");
        setGpsLoading(false);
      },
      () => {
        setGpsError("Unable to get your location. Please try again.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const getRandomLocation = useCallback(() => {
    const baseLat = lat ?? 40.7128;
    const baseLng = lng ?? -74.006;
    const nearby = randomNearby(baseLat, baseLng, 50);
    setLat(nearby.lat);
    setLng(nearby.lng);
    setLocationMode("random");
  }, [lat, lng]);

  /* submit */
  const handleSubmit = useCallback(async () => {
    if (!user) return;
    setSubmitting(true);
    setSubmitError("");

    const { error } = await supabase.from("orbs").insert({
      type: "crypto",
      currency,
      chain: selectedChain,
      amount: amountNum,
      amount_usd: +amountUsd.toFixed(2),
      claim_fee_usd: +claimFee.toFixed(2),
      message: message.trim() || null,
      lat,
      lng,
      dropper_id: user.id,
      dropper_name: user.email,
      rarity,
      status: "active",
    });

    if (error) {
      setSubmitError(error.message || "Something went wrong. Please retry.");
      setSubmitting(false);
      return;
    }

    setShowSuccess(true);
    setTimeout(() => router.push("/map"), 1500);
  }, [user, currency, amountNum, amountUsd, claimFee, message, lat, lng, rarity, router]);

  /* loading / auth guard */
  if (loading || !user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: COLORS.textMuted,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Loading...
      </div>
    );
  }

  /* success overlay */
  if (showSuccess) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.bg,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ scale: 1, y: 0, opacity: 1 }}
          animate={{ scale: 2.5, y: -600, opacity: 0 }}
          transition={{ duration: 1.3, ease: "easeIn" }}
        >
          <OrbAnimation rarity={rarity} size={160} pulsing />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            color: COLORS.accent,
            fontSize: 22,
            fontWeight: 700,
            marginTop: 32,
          }}
        >
          Orb Dropped!
        </motion.p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Step renderers                                                  */
  /* ---------------------------------------------------------------- */

  const renderStep1 = () => {
    const CHAIN_COLORS: Record<string, string> = { solana: "#9945FF", ethereum: "#627EEA", bitcoin: "#F7931A" };
    const comingSoon: Record<string, string[]> = {
      solana: ["SPL Tokens (coming soon)"],
      ethereum: ["ERC-20 Tokens (coming soon)", "NFTs (coming soon)"],
      bitcoin: [],
    };
    return (
      <div>
        <h2
          style={{
            color: COLORS.text,
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Choose Chain & Currency
        </h2>
        <p style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 24 }}>
          Select the blockchain for your orb.
        </p>

        <div style={{ marginBottom: 24 }}>
          <ChainSelector selectedChain={selectedChain} onChange={setSelectedChain} showLabels />
        </div>

        {/* Active currency */}
        <div
          style={{
            textAlign: "center",
            padding: "16px 0",
            background: `${CHAIN_COLORS[selectedChain]}12`,
            border: `1px solid ${CHAIN_COLORS[selectedChain]}33`,
            borderRadius: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: CHAIN_COLORS[selectedChain] }}>
            {currency}
          </div>
          {chainBalance !== null && (
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
              Balance: {chainBalance.toFixed(chainBalance < 1 ? 6 : 4)} {currency}
              {chainBalanceUsd !== null && ` ($${chainBalanceUsd.toFixed(2)})`}
            </div>
          )}
          {dropperWallet && (
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4, fontFamily: "monospace" }}>
              {dropperWallet.slice(0, 6)}...{dropperWallet.slice(-4)}
            </div>
          )}
        </div>

        {/* Coming soon sub-currencies */}
        {comingSoon[selectedChain]?.map((label) => (
          <div
            key={label}
            style={{
              fontSize: 13,
              color: COLORS.textMuted,
              textAlign: "center",
              padding: "8px 0",
              opacity: 0.6,
            }}
          >
            {label}
          </div>
        ))}
      </div>
    );
  };

  const renderStep2 = () => (
    <div style={{ textAlign: "center" }}>
      <h2
        style={{
          color: COLORS.text,
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        Enter Amount
      </h2>
      <p style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 32 }}>
        How much {currency} will this orb contain?
      </p>

      <div style={{ position: "relative", display: "inline-block" }}>
        <input
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 280,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            background: "transparent",
            border: "none",
            borderBottom: `2px solid ${COLORS.border}`,
            textAlign: "center",
            outline: "none",
            padding: "8px 0",
            fontFamily: "system-ui, sans-serif",
          }}
        />
      </div>

      <p
        style={{
          color: COLORS.textMuted,
          fontSize: 16,
          marginTop: 16,
        }}
      >
        = ${amountUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
      </p>

      {amountNum > 0 && amountUsd < 0.01 && (
        <p style={{ color: "#EF4444", fontSize: 13, marginTop: 8 }}>
          Minimum value is $0.01 USD.
        </p>
      )}
    </div>
  );

  const renderStep3 = () => {
    const youEarn = +(claimFee * 0.8).toFixed(2);
    const platformFee = +(claimFee * 0.2).toFixed(2);

    return (
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            color: COLORS.text,
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Set Claim Fee
        </h2>
        <p style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 32 }}>
          Hunters pay this fee to claim your orb.
        </p>

        <p
          style={{
            color: COLORS.text,
            fontSize: 40,
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          ${claimFee.toFixed(2)}
        </p>

        <div style={{ padding: "0 8px", marginBottom: 28 }}>
          <input
            type="range"
            min={0.1}
            max={100}
            step={0.1}
            value={claimFee}
            onChange={(e) => setClaimFee(parseFloat(e.target.value))}
            style={{
              width: "100%",
              height: 6,
              borderRadius: 3,
              appearance: "none",
              WebkitAppearance: "none",
              background: `linear-gradient(to right, ${COLORS.primary} ${((claimFee - 0.1) / 99.9) * 100}%, ${COLORS.border} ${((claimFee - 0.1) / 99.9) * 100}%)`,
              outline: "none",
              cursor: "pointer",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
            }}
          >
            <span style={{ color: COLORS.textMuted, fontSize: 12 }}>$0.10</span>
            <span style={{ color: COLORS.textMuted, fontSize: 12 }}>$100</span>
          </div>
        </div>

        <p style={{ color: COLORS.accent, fontSize: 15, fontWeight: 600 }}>
          You earn: ${youEarn.toFixed(2)} (80%) per claim
        </p>
        <p style={{ color: COLORS.textMuted, fontSize: 14, marginTop: 4 }}>
          MishMesh takes: ${platformFee.toFixed(2)} (20%)
        </p>
      </div>
    );
  };

  const renderStep4 = () => (
    <div style={{ textAlign: "center" }}>
      <h2
        style={{
          color: COLORS.text,
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        Orb Rarity
      </h2>
      <p style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 32 }}>
        Based on your orb value of $
        {amountUsd.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{" "}
        USD.
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <OrbAnimation rarity={rarity} size={160} pulsing />
      </div>

      <p
        style={{
          color: RARITY_COLORS[rarity],
          fontSize: 26,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {RARITY_LABELS[rarity]}
      </p>
      <p style={{ color: COLORS.textMuted, fontSize: 14 }}>
        Your orb will glow {RARITY_LABELS[rarity].toLowerCase()} on the map.
      </p>
    </div>
  );

  const renderStep5 = () => (
    <div>
      <h2
        style={{
          color: COLORS.text,
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        Write a Message
      </h2>
      <p style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 24 }}>
        Optional. Attach a note to your orb.
      </p>

      <div style={{ position: "relative" }}>
        <textarea
          value={message}
          onChange={(e) => {
            if (e.target.value.length <= 280) setMessage(e.target.value);
          }}
          placeholder="Leave a message for the hunter..."
          rows={5}
          style={{
            width: "100%",
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            color: COLORS.text,
            fontSize: 15,
            padding: 16,
            resize: "none",
            outline: "none",
            fontFamily: "system-ui, sans-serif",
            boxSizing: "border-box",
          }}
        />
        <span
          style={{
            position: "absolute",
            bottom: 12,
            right: 14,
            fontSize: 12,
            color:
              message.length >= 260
                ? message.length >= 280
                  ? "#EF4444"
                  : COLORS.gold
                : COLORS.textMuted,
          }}
        >
          {message.length}/280
        </span>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div>
      <h2
        style={{
          color: COLORS.text,
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        Choose Location
      </h2>
      <p style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 24 }}>
        Where should this orb appear?
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* GPS option */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={getGPS}
          disabled={gpsLoading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "18px 20px",
            borderRadius: 14,
            border: `2px solid ${locationMode === "gps" ? COLORS.accent : COLORS.border}`,
            background:
              locationMode === "gps"
                ? "rgba(20, 241, 149, 0.08)"
                : COLORS.card,
            color: COLORS.text,
            fontSize: 16,
            fontWeight: 600,
            cursor: gpsLoading ? "wait" : "pointer",
            outline: "none",
            textAlign: "left",
            width: "100%",
          }}
        >
          <Navigation size={22} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>
            {gpsLoading ? "Getting location..." : "Use My Location"}
          </span>
          {locationMode === "gps" && (
            <Check size={20} style={{ color: COLORS.accent }} />
          )}
        </motion.button>

        {/* Random option */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={getRandomLocation}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "18px 20px",
            borderRadius: 14,
            border: `2px solid ${locationMode === "random" ? COLORS.accent : COLORS.border}`,
            background:
              locationMode === "random"
                ? "rgba(20, 241, 149, 0.08)"
                : COLORS.card,
            color: COLORS.text,
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            outline: "none",
            textAlign: "left",
            width: "100%",
          }}
        >
          <Shuffle size={22} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>Random Nearby Location</span>
          {locationMode === "random" && (
            <Check size={20} style={{ color: COLORS.accent }} />
          )}
        </motion.button>
      </div>

      {gpsError && (
        <p style={{ color: "#EF4444", fontSize: 13, marginTop: 12 }}>
          {gpsError}
        </p>
      )}

      {lat !== null && lng !== null && (
        <p
          style={{
            color: COLORS.textMuted,
            fontSize: 13,
            marginTop: 16,
            textAlign: "center",
          }}
        >
          <MapPin
            size={14}
            style={{
              display: "inline",
              verticalAlign: "middle",
              marginRight: 4,
            }}
          />
          {lat}, {lng}
        </p>
      )}
    </div>
  );

  const renderStep7 = () => (
    <div>
      <h2
        style={{
          color: COLORS.text,
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 24,
        }}
      >
        Review & Confirm
      </h2>

      <div
        style={{
          background: COLORS.surface,
          borderRadius: 16,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <SummaryRow label="Currency" value={currency} />
        <SummaryRow
          label="Amount"
          value={`${amountNum} ${currency}  ($${amountUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
        />
        <SummaryRow label="Claim Fee" value={`$${claimFee.toFixed(2)}`} />
        <SummaryRow
          label="Rarity"
          value={RARITY_LABELS[rarity]}
          valueColor={RARITY_COLORS[rarity]}
        />
        <SummaryRow
          label="Message"
          value={message.trim() || "(none)"}
        />
        <SummaryRow
          label="Location"
          value={lat !== null && lng !== null ? `${lat}, ${lng}` : "--"}
        />
      </div>

      {submitError && (
        <p
          style={{
            color: "#EF4444",
            fontSize: 14,
            marginTop: 16,
            textAlign: "center",
          }}
        >
          {submitError}
        </p>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: "100%",
          marginTop: 28,
          padding: "18px 0",
          borderRadius: 14,
          border: "none",
          background: submitting ? COLORS.border : COLORS.primary,
          color: COLORS.text,
          fontSize: 18,
          fontWeight: 700,
          cursor: submitting ? "wait" : "pointer",
          outline: "none",
          transition: "background 0.2s",
        }}
      >
        {submitting ? "Dropping..." : "Drop This Orb"}
      </motion.button>
    </div>
  );

  const STEP_RENDERERS: Record<number, () => React.ReactNode> = {
    1: renderStep1,
    2: renderStep2,
    3: renderStep3,
    4: renderStep4,
    5: renderStep5,
    6: renderStep6,
    7: renderStep7,
  };

  /* ---------------------------------------------------------------- */
  /*  Main render                                                     */
  /* ---------------------------------------------------------------- */

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ---- Top bar ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "16px 20px 0",
        }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={goBack}
          style={{
            background: "none",
            border: "none",
            color: COLORS.text,
            cursor: "pointer",
            padding: 4,
            outline: "none",
          }}
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </motion.button>

        <span
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.textMuted,
          }}
        >
          Step {step} of {TOTAL_STEPS}
        </span>

        {/* invisible spacer */}
        <div style={{ width: 32 }} />
      </div>

      {/* ---- Step dots ---- */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          padding: "16px 20px 24px",
        }}
      >
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const s = i + 1;
          const isCurrent = s === step;
          const isCompleted = s < step;
          return (
            <div
              key={s}
              style={{
                width: isCurrent ? 28 : 8,
                height: 8,
                borderRadius: 4,
                background: isCurrent
                  ? COLORS.primary
                  : isCompleted
                    ? "rgba(153, 69, 255, 0.4)"
                    : COLORS.border,
                transition: "all 0.3s",
              }}
            />
          );
        })}
      </div>

      {/* ---- Step content ---- */}
      <div
        style={{
          flex: 1,
          padding: "0 24px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {STEP_RENDERERS[step]?.()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ---- Bottom nav ---- */}
      {step < TOTAL_STEPS && (
        <div style={{ padding: "20px 24px 32px" }}>
          <motion.button
            whileTap={canAdvance ? { scale: 0.97 } : undefined}
            onClick={goNext}
            disabled={!canAdvance}
            style={{
              width: "100%",
              padding: "16px 0",
              borderRadius: 14,
              border: "none",
              background: canAdvance ? COLORS.primary : COLORS.border,
              color: canAdvance ? COLORS.text : COLORS.textMuted,
              fontSize: 16,
              fontWeight: 700,
              cursor: canAdvance ? "pointer" : "not-allowed",
              outline: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.2s, color 0.2s",
            }}
          >
            Next <ArrowRight size={18} />
          </motion.button>
        </div>
      )}

      {/* ---- Range thumb style (injected once) ---- */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: ${COLORS.primary};
          border: 2px solid ${COLORS.text};
          cursor: pointer;
          margin-top: -8px;
        }
        input[type="range"]::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: ${COLORS.primary};
          border: 2px solid ${COLORS.text};
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small helper component                                            */
/* ------------------------------------------------------------------ */

function SummaryRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <span style={{ color: COLORS.textMuted, fontSize: 14, flexShrink: 0 }}>
        {label}
      </span>
      <span
        style={{
          color: valueColor ?? COLORS.text,
          fontSize: 14,
          fontWeight: 600,
          textAlign: "right",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}
