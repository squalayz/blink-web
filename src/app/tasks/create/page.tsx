"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers";
import { C } from "@/lib/theme";
import { useRouter } from "next/navigation";

type ProofType = "photo" | "video" | "checkin" | "text";
type RewardCurrency = "SOL" | "ETH";

interface TaskDraft {
  title: string;
  category: string;
  description: string;
  duration_minutes: number;
  total_slots: number;
  proof_required: ProofType[];
  id_required: boolean;
  latitude: number | null;
  longitude: number | null;
  is_remote: boolean;
  reward_amount: string;
  reward_currency: RewardCurrency;
}

const CATEGORIES = ["delivery", "photo", "survey", "errand", "digital"];
const DURATIONS = [15, 30, 45, 60, 90, 120];
const PROOF_OPTIONS: { key: ProofType; label: string }[] = [
  { key: "photo", label: "Photo" },
  { key: "video", label: "Video" },
  { key: "checkin", label: "Check-in" },
  { key: "text", label: "Text Report" },
];

const CATEGORY_LABELS: Record<string, string> = {
  delivery: "Delivery",
  photo: "Photo",
  survey: "Survey",
  errand: "Errand",
  digital: "Digital",
};

export default function CreateTaskPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<TaskDraft>({
    title: "",
    category: "delivery",
    description: "",
    duration_minutes: 30,
    total_slots: 1,
    proof_required: [],
    id_required: false,
    latitude: null,
    longitude: null,
    is_remote: true,
    reward_amount: "",
    reward_currency: "SOL",
  });

  const update = (partial: Partial<TaskDraft>) => setDraft((p) => ({ ...p, ...partial }));

  const toggleProof = (p: ProofType) => {
    const has = draft.proof_required.includes(p);
    update({
      proof_required: has
        ? draft.proof_required.filter((x) => x !== p)
        : [...draft.proof_required, p],
    });
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case 1:
        return draft.title.trim().length >= 3 && draft.description.trim().length >= 10;
      case 2:
        return draft.duration_minutes > 0 && draft.total_slots > 0;
      case 3:
        return draft.proof_required.length > 0;
      case 4:
        return draft.is_remote || (draft.latitude !== null && draft.longitude !== null);
      case 5:
        return parseFloat(draft.reward_amount) > 0;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      setError("You must be signed in to create a task");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const { error: insertErr } = await supabase.from("tasks").insert({
        title: draft.title.trim(),
        category: draft.category,
        description: draft.description.trim(),
        duration_minutes: draft.duration_minutes,
        total_slots: draft.total_slots,
        slots_remaining: draft.total_slots,
        proof_required: draft.proof_required,
        id_required: draft.id_required,
        latitude: draft.is_remote ? null : draft.latitude,
        longitude: draft.is_remote ? null : draft.longitude,
        is_remote: draft.is_remote,
        reward_amount: parseFloat(draft.reward_amount),
        reward_currency: draft.reward_currency,
        poster_id: user.id,
        status: "open",
      });

      if (insertErr) {
        if (insertErr.code === "42P01" || insertErr.message?.includes("does not exist")) {
          setError("Tasks table not yet created. Contact admin to set up the database.");
        } else {
          setError(insertErr.message);
        }
      } else {
        setSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const rewardNum = parseFloat(draft.reward_amount) || 0;
  const workerEarns = rewardNum * 0.9;
  const platformFee = rewardNum * 0.1;

  // Shared styles
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: C.s2,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: "14px 16px",
    fontSize: 15,
    color: C.text,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: C.muted,
    marginBottom: 8,
    display: "block",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  };

  if (success) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          color: C.text,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: `${C.cyan}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke={C.cyan} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Task Created</div>
        <div style={{ fontSize: 15, color: C.muted, marginBottom: 32, maxWidth: 280 }}>
          Your task is now live and visible to workers
        </div>
        <button
          onClick={() => router.push("/tasks")}
          style={{
            background: C.primary,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "14px 32px",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          View Tasks
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: `${C.bg}ee`,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${C.border}`,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : router.back())}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Create Task</div>
          <div style={{ fontSize: 12, color: C.muted }}>Step {step} of 6</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: "0 20px", marginTop: 16, marginBottom: 24 }}>
        <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${(step / 6) * 100}%`,
              background: `linear-gradient(90deg, ${C.primary}, ${C.cyan})`,
              borderRadius: 2,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Step content */}
      <div style={{ padding: "0 20px 120px" }}>
        {/* Step 1: Title + Category + Description */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>What needs to be done?</div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>
              Describe the task clearly so workers know what to expect
            </div>

            <label style={labelStyle}>Title</label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="e.g. Deliver lunch downtown"
              maxLength={80}
              style={{ ...inputStyle, marginBottom: 20 }}
            />

            <label style={labelStyle}>Category</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => update({ category: cat })}
                  style={{
                    background: draft.category === cat ? `${C.primary}22` : C.s2,
                    color: draft.category === cat ? C.primary : C.muted,
                    border: `1px solid ${draft.category === cat ? C.primary : C.border}`,
                    borderRadius: 10,
                    padding: "9px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            <label style={labelStyle}>Description</label>
            <textarea
              value={draft.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Detailed description of what the worker needs to do..."
              maxLength={500}
              rows={5}
              style={{
                ...inputStyle,
                resize: "vertical",
                lineHeight: 1.5,
              }}
            />
            <div style={{ fontSize: 12, color: C.muted, textAlign: "right", marginTop: 4 }}>
              {draft.description.length}/500
            </div>
          </div>
        )}

        {/* Step 2: Duration + Slots */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Time and capacity</div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>
              How long should the task take and how many workers can do it?
            </div>

            <label style={labelStyle}>Duration (minutes)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => update({ duration_minutes: d })}
                  style={{
                    background: draft.duration_minutes === d ? `${C.cyan}22` : C.s2,
                    color: draft.duration_minutes === d ? C.cyan : C.muted,
                    border: `1px solid ${draft.duration_minutes === d ? C.cyan : C.border}`,
                    borderRadius: 10,
                    padding: "10px 18px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    minWidth: 60,
                    textAlign: "center",
                  }}
                >
                  {d}m
                </button>
              ))}
            </div>

            <label style={labelStyle}>Worker Slots (1-10)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                onClick={() => update({ total_slots: Math.max(1, draft.total_slots - 1) })}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: C.s2,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  fontSize: 20,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                -
              </button>
              <span style={{ fontSize: 28, fontWeight: 800, minWidth: 40, textAlign: "center" }}>
                {draft.total_slots}
              </span>
              <button
                onClick={() => update({ total_slots: Math.min(10, draft.total_slots + 1) })}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: C.s2,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  fontSize: 20,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Proof Required + ID */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Proof of completion</div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>
              What proof must the worker submit?
            </div>

            <label style={labelStyle}>Proof Type (select at least one)</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {PROOF_OPTIONS.map((opt) => {
                const active = draft.proof_required.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    onClick={() => toggleProof(opt.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: active ? `${C.primary}15` : C.s2,
                      border: `1px solid ${active ? C.primary : C.border}`,
                      borderRadius: 12,
                      padding: "14px 16px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: `2px solid ${active ? C.primary : C.muted}`,
                        background: active ? C.primary : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {active && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 600, color: active ? C.text : C.muted }}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <label style={labelStyle}>Identity Verification</label>
            <button
              onClick={() => update({ id_required: !draft.id_required })}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                background: C.s2,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "14px 16px",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Require ID Verification</span>
              <div
                style={{
                  width: 48,
                  height: 28,
                  borderRadius: 14,
                  background: draft.id_required ? C.primary : C.border,
                  position: "relative",
                  transition: "background 0.2s",
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 3,
                    left: draft.id_required ? 23 : 3,
                    transition: "left 0.2s",
                  }}
                />
              </div>
            </button>
          </div>
        )}

        {/* Step 4: Location */}
        {step === 4 && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Location</div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>
              Is this task location-based or can it be done remotely?
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
              <button
                onClick={() => update({ is_remote: true, latitude: null, longitude: null })}
                style={{
                  flex: 1,
                  background: draft.is_remote ? `${C.cyan}22` : C.s2,
                  color: draft.is_remote ? C.cyan : C.muted,
                  border: `1px solid ${draft.is_remote ? C.cyan : C.border}`,
                  borderRadius: 12,
                  padding: "16px",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ display: "block", margin: "0 auto 8px" }}
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" stroke={draft.is_remote ? C.cyan : C.muted} strokeWidth="1.5" />
                  <path d="M8 21h8M12 17v4" stroke={draft.is_remote ? C.cyan : C.muted} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Remote
              </button>
              <button
                onClick={() => update({ is_remote: false })}
                style={{
                  flex: 1,
                  background: !draft.is_remote ? `${C.primary}22` : C.s2,
                  color: !draft.is_remote ? C.primary : C.muted,
                  border: `1px solid ${!draft.is_remote ? C.primary : C.border}`,
                  borderRadius: 12,
                  padding: "16px",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ display: "block", margin: "0 auto 8px" }}
                >
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                    stroke={!draft.is_remote ? C.primary : C.muted}
                    strokeWidth="1.5"
                  />
                  <circle cx="12" cy="9" r="2" stroke={!draft.is_remote ? C.primary : C.muted} strokeWidth="1.5" />
                </svg>
                On Location
              </button>
            </div>

            {!draft.is_remote && (
              <div>
                <button
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) =>
                          update({
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                          }),
                        () => setError("Could not get your location")
                      );
                    }
                  }}
                  style={{
                    width: "100%",
                    background: C.s2,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.cyan,
                    cursor: "pointer",
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3" stroke={C.cyan} strokeWidth="1.5" />
                    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke={C.cyan} strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Use My Current Location
                </button>

                {draft.latitude !== null && draft.longitude !== null && (
                  <div
                    style={{
                      background: C.s2,
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      padding: 14,
                      fontSize: 13,
                      color: C.muted,
                    }}
                  >
                    <div>Lat: {draft.latitude.toFixed(6)}</div>
                    <div>Lon: {draft.longitude.toFixed(6)}</div>
                  </div>
                )}

                <div style={{ marginTop: 16 }}>
                  <label style={labelStyle}>Or enter coordinates manually</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      type="number"
                      step="any"
                      placeholder="Latitude"
                      value={draft.latitude ?? ""}
                      onChange={(e) =>
                        update({ latitude: e.target.value ? parseFloat(e.target.value) : null })
                      }
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="Longitude"
                      value={draft.longitude ?? ""}
                      onChange={(e) =>
                        update({ longitude: e.target.value ? parseFloat(e.target.value) : null })
                      }
                      style={{ ...inputStyle, flex: 1 }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Reward */}
        {step === 5 && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Set the reward</div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>
              How much will workers earn for completing this task?
            </div>

            <label style={labelStyle}>Currency</label>
            <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
              {(["SOL", "ETH"] as RewardCurrency[]).map((cur) => {
                const active = draft.reward_currency === cur;
                const color = cur === "ETH" ? C.ethBlue : C.solPurple;
                return (
                  <button
                    key={cur}
                    onClick={() => update({ reward_currency: cur })}
                    style={{
                      flex: 1,
                      background: active ? `${color}22` : C.s2,
                      color: active ? color : C.muted,
                      border: `1px solid ${active ? color : C.border}`,
                      borderRadius: 12,
                      padding: "14px",
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    {cur}
                  </button>
                );
              })}
            </div>

            <label style={labelStyle}>Amount</label>
            <input
              type="number"
              step="any"
              min="0"
              value={draft.reward_amount}
              onChange={(e) => update({ reward_amount: e.target.value })}
              placeholder="0.00"
              style={{
                ...inputStyle,
                fontSize: 28,
                fontWeight: 800,
                textAlign: "center",
                marginBottom: 24,
              }}
            />

            {rewardNum > 0 && (
              <div
                style={{
                  background: C.s2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Fee Breakdown
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, color: C.muted }}>Worker receives (90%)</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.cyan }}>
                    {workerEarns.toFixed(4)} {draft.reward_currency}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, color: C.muted }}>Platform fee (10%)</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>
                    {platformFee.toFixed(4)} {draft.reward_currency}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 6: Review */}
        {step === 6 && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Review your task</div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>
              Make sure everything looks right before posting
            </div>

            {[
              { label: "Title", value: draft.title },
              { label: "Category", value: CATEGORY_LABELS[draft.category] || draft.category },
              { label: "Description", value: draft.description },
              { label: "Duration", value: `${draft.duration_minutes} minutes` },
              { label: "Worker Slots", value: String(draft.total_slots) },
              { label: "Proof Required", value: draft.proof_required.join(", ") },
              { label: "ID Required", value: draft.id_required ? "Yes" : "No" },
              { label: "Location", value: draft.is_remote ? "Remote" : `${draft.latitude?.toFixed(4)}, ${draft.longitude?.toFixed(4)}` },
              {
                label: "Reward",
                value: `${draft.reward_amount} ${draft.reward_currency}`,
              },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "14px 0",
                  borderBottom: `1px solid ${C.border}`,
                  gap: 16,
                }}
              >
                <span style={{ fontSize: 13, color: C.muted, fontWeight: 600, flexShrink: 0 }}>
                  {row.label}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.text,
                    textAlign: "right",
                    wordBreak: "break-word",
                    maxWidth: "65%",
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}

            {rewardNum > 0 && (
              <div
                style={{
                  background: `${C.gold}11`,
                  border: `1px solid ${C.gold}33`,
                  borderRadius: 12,
                  padding: 14,
                  marginTop: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke={C.gold} strokeWidth="1.5" />
                  <path d="M12 8v4M12 16h.01" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span style={{ fontSize: 13, color: C.gold }}>
                  Total cost: {rewardNum.toFixed(4)} {draft.reward_currency} (includes 10% platform fee)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              background: `${C.danger}15`,
              border: `1px solid ${C.danger}44`,
              borderRadius: 12,
              padding: "12px 16px",
              marginTop: 20,
              fontSize: 13,
              color: C.danger,
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: `${C.bg}ee`,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: `1px solid ${C.border}`,
          padding: "16px 20px",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          zIndex: 50,
        }}
      >
        {step < 6 ? (
          <button
            onClick={() => canAdvance() && setStep(step + 1)}
            disabled={!canAdvance()}
            style={{
              width: "100%",
              background: canAdvance()
                ? `linear-gradient(135deg, ${C.primary}, ${C.cyan})`
                : C.border,
              color: canAdvance() ? "#fff" : C.muted,
              border: "none",
              borderRadius: 14,
              padding: "16px",
              fontSize: 16,
              fontWeight: 700,
              cursor: canAdvance() ? "pointer" : "default",
              opacity: canAdvance() ? 1 : 0.5,
            }}
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: "100%",
              background: submitting
                ? C.border
                : `linear-gradient(135deg, ${C.primary}, ${C.cyan})`,
              color: "#fff",
              border: "none",
              borderRadius: 14,
              padding: "16px",
              fontSize: 16,
              fontWeight: 700,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Posting..." : "Post Task"}
          </button>
        )}
      </div>
    </div>
  );
}
