"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C, Avatar } from "./dashboard/shared";

// ══════════════════════════════════════════
// Preference Setup — Conversational chat-style
// The agent asks, the user answers with buttons.
// ══════════════════════════════════════════

interface Message {
  role: "agent" | "user";
  content: string;
  options?: Option[];
  type?: "multi-select" | "single-select" | "slider" | "text";
  sliderConfig?: { min: number; max: number; step: number; suffix?: string };
}

interface Option {
  label: string;
  value: string;
  selected?: boolean;
}

interface Props {
  onComplete: () => void;
  existingPrefs?: any;
}

type Step =
  | "connection_types"
  | "romantic_interested_in"
  | "romantic_vibe"
  | "romantic_dealbreakers"
  | "business_looking_for"
  | "business_industry"
  | "business_stage"
  | "business_bring_need"
  | "trading_style"
  | "trading_looking_for"
  | "confirm";

export default function PreferenceSetup({ onComplete, existingPrefs }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [step, setStep] = useState<Step>("connection_types");
  const [prefs, setPrefs] = useState<Record<string, any>>(existingPrefs || {});
  const [textInput, setTextInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [sliderVal, setSliderVal] = useState(50);
  const chatRef = useRef<HTMLDivElement>(null);

  const scrollBottom = () => {
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 120);
  };

  // Determine which sub-steps are needed
  const selectedTypes = prefs.connection_types || [];
  const hasRomantic = selectedTypes.includes("romantic");
  const hasBusiness = selectedTypes.includes("business");
  const hasTrading = selectedTypes.includes("trading");

  // Build step sequence
  function getStepSequence(): Step[] {
    const steps: Step[] = ["connection_types"];
    if (hasRomantic) steps.push("romantic_interested_in", "romantic_vibe", "romantic_dealbreakers");
    if (hasBusiness) steps.push("business_looking_for", "business_industry", "business_stage", "business_bring_need");
    if (hasTrading) steps.push("trading_style", "trading_looking_for");
    steps.push("confirm");
    return steps;
  }

  function nextStep() {
    const seq = getStepSequence();
    const idx = seq.indexOf(step);
    if (idx < seq.length - 1) {
      const next = seq[idx + 1];
      setStep(next);
      addAgentMessage(next);
    }
  }

  function addAgentMessage(s: Step) {
    const msg = getStepMessage(s);
    if (msg) {
      setMessages((prev) => [...prev, msg]);
      scrollBottom();
    }
  }

  function addUserResponse(text: string) {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    scrollBottom();
  }

  function getStepMessage(s: Step): Message | null {
    switch (s) {
      case "connection_types":
        return {
          role: "agent",
          content: "What kind of connections are you looking for? Pick as many as you want.",
          type: "multi-select",
          options: [
            { label: "Business Partners", value: "business" },
            { label: "Trading Partners", value: "trading" },
            { label: "Creative Collaborators", value: "creative" },
            { label: "Romantic Connections", value: "romantic" },
            { label: "Just Networking", value: "networking" },
          ],
        };
      case "romantic_interested_in":
        return {
          role: "agent",
          content: "Cool, romance is in the mix. Who are you interested in?",
          type: "single-select",
          options: [
            { label: "Men", value: "men" },
            { label: "Women", value: "women" },
            { label: "Everyone", value: "everyone" },
          ],
        };
      case "romantic_vibe":
        return {
          role: "agent",
          content: "What's your vibe? This helps me find the right energy.",
          type: "single-select",
          options: [
            { label: "Chill", value: "chill" },
            { label: "Ambitious", value: "ambitious" },
            { label: "Creative", value: "creative" },
            { label: "Nerdy", value: "nerdy" },
          ],
        };
      case "romantic_dealbreakers":
        return {
          role: "agent",
          content: "Any dealbreakers I should know about? Type them out or skip.",
          type: "text",
        };
      case "business_looking_for":
        return {
          role: "agent",
          content: "For business — what are you looking for?",
          type: "multi-select",
          options: [
            { label: "Co-founders", value: "co-founders" },
            { label: "Investors", value: "investors" },
            { label: "Clients", value: "clients" },
            { label: "Collaborators", value: "collaborators" },
          ],
        };
      case "business_industry":
        return {
          role: "agent",
          content: "What industry should I focus on?",
          type: "single-select",
          options: [
            { label: "AI / ML", value: "AI" },
            { label: "Crypto / Web3", value: "Crypto" },
            { label: "SaaS", value: "SaaS" },
            { label: "HealthTech", value: "HealthTech" },
          ],
        };
      case "business_stage":
        return {
          role: "agent",
          content: "What stage are you at?",
          type: "single-select",
          options: [
            { label: "Just an idea", value: "idea" },
            { label: "Building", value: "building" },
            { label: "Launched", value: "launched" },
            { label: "Scaling", value: "scaling" },
          ],
        };
      case "business_bring_need":
        return {
          role: "agent",
          content: "Quick — what do you bring to the table, and what do you need? Type both separated by a slash. Like: \"Design + branding / Technical co-founder\"",
          type: "text",
        };
      case "trading_style":
        return {
          role: "agent",
          content: "Trading style? Be honest.",
          type: "single-select",
          options: [
            { label: "Degen", value: "degen" },
            { label: "Conservative", value: "conservative" },
            { label: "Mixed", value: "mixed" },
          ],
        };
      case "trading_looking_for":
        return {
          role: "agent",
          content: "What are you looking for in trading partners?",
          type: "multi-select",
          options: [
            { label: "Signals", value: "signals" },
            { label: "Syndicate", value: "syndicate" },
            { label: "Just Watching", value: "watching" },
          ],
        };
      case "confirm":
        return {
          role: "agent",
          content: `Got it. Here's your profile:\n\nConnections: ${(prefs.connection_types || []).join(", ")}${hasRomantic ? `\nInterested in: ${prefs.interested_in || "anyone"} · Vibe: ${prefs.vibe || "any"}` : ""}${hasBusiness ? `\nBusiness: ${(prefs.looking_for || []).join(", ")} · ${prefs.industry || "any industry"} · ${prefs.stage || "any stage"}` : ""}${hasTrading ? `\nTrading: ${prefs.trading_style || "mixed"} · ${(prefs.trading_looking_for || []).join(", ")}` : ""}\n\nReady to let your agent loose?`,
          type: "single-select",
          options: [
            { label: "Let's go!", value: "confirm" },
            { label: "Start over", value: "restart" },
          ],
        };
      default:
        return null;
    }
  }

  // Initialize with first message
  useEffect(() => {
    addAgentMessage("connection_types");
  }, []);

  function handleMultiSelect(values: string[]) {
    switch (step) {
      case "connection_types":
        setPrefs((p) => ({ ...p, connection_types: values }));
        addUserResponse(values.join(", "));
        break;
      case "business_looking_for":
        setPrefs((p) => ({ ...p, looking_for: values }));
        addUserResponse(values.join(", "));
        break;
      case "trading_looking_for":
        setPrefs((p) => ({ ...p, trading_looking_for: values }));
        addUserResponse(values.join(", "));
        break;
    }
    setTimeout(nextStep, 300);
  }

  function handleSingleSelect(value: string) {
    switch (step) {
      case "romantic_interested_in":
        setPrefs((p) => ({ ...p, interested_in: value }));
        addUserResponse(value);
        break;
      case "romantic_vibe":
        setPrefs((p) => ({ ...p, vibe: value }));
        addUserResponse(value);
        break;
      case "business_industry":
        setPrefs((p) => ({ ...p, industry: value }));
        addUserResponse(value);
        break;
      case "business_stage":
        setPrefs((p) => ({ ...p, stage: value }));
        addUserResponse(value);
        break;
      case "trading_style":
        setPrefs((p) => ({ ...p, trading_style: value }));
        addUserResponse(value);
        break;
      case "confirm":
        if (value === "restart") {
          setMessages([]);
          setPrefs({});
          setStep("connection_types");
          setTimeout(() => addAgentMessage("connection_types"), 100);
          return;
        }
        savePreferences();
        return;
    }
    setTimeout(nextStep, 300);
  }

  function handleTextSubmit() {
    const val = textInput.trim();
    if (!val && step !== "romantic_dealbreakers") return;

    switch (step) {
      case "romantic_dealbreakers":
        setPrefs((p) => ({ ...p, dealbreakers: val || "" }));
        addUserResponse(val || "(none)");
        break;
      case "business_bring_need": {
        const parts = val.split("/").map((s) => s.trim());
        setPrefs((p) => ({
          ...p,
          what_i_bring: parts[0] || "",
          what_i_need: parts[1] || parts[0] || "",
        }));
        addUserResponse(val);
        break;
      }
    }
    setTextInput("");
    setTimeout(nextStep, 300);
  }

  async function savePreferences() {
    setSaving(true);
    addUserResponse("Let's go!");
    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();
      if (data.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "agent", content: "Preferences saved. Your agent is now armed and ready to hunt. Opening discovery feed..." },
        ]);
        scrollBottom();
        setTimeout(onComplete, 1500);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "agent", content: `Error saving: ${data.error}. Try again.` },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: "Network error. Try again." },
      ]);
    }
    setSaving(false);
  }

  const lastMsg = messages[messages.length - 1];
  const showOptions = lastMsg?.role === "agent" && lastMsg.options;
  const showTextInput = lastMsg?.role === "agent" && lastMsg.type === "text";

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: 520,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.cold}, ${C.cyan})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}
        >
          🧠
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Discovery Setup</div>
          <div style={{ fontSize: 10, color: C.muted }}>Tell your agent what to look for</div>
        </div>
      </div>

      {/* Chat area */}
      <div
        ref={chatRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                gap: 8,
              }}
            >
              {msg.role === "agent" && (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${C.cold}, ${C.cyan})`,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  🤖
                </div>
              )}
              <div
                style={{
                  maxWidth: "80%",
                  padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: msg.role === "user" ? C.cold : C.s2,
                  color: C.text,
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: "pre-line",
                }}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input area */}
      <div style={{ padding: "12px 18px", borderTop: `1px solid ${C.border}` }}>
        {showOptions && lastMsg.type === "multi-select" && <MultiSelect options={lastMsg.options!} onConfirm={handleMultiSelect} />}

        {showOptions && lastMsg.type === "single-select" && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {lastMsg.options!.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSingleSelect(opt.value)}
                disabled={saving}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: `1px solid ${C.cold}44`,
                  background: C.s2,
                  color: C.text,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {showTextInput && (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
              placeholder="Type your answer..."
              autoFocus
              style={{
                flex: 1,
                background: C.s2,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "10px 14px",
                color: C.text,
                fontSize: 13,
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={handleTextSubmit}
              style={{
                padding: "10px 16px",
                background: C.cold,
                border: "none",
                borderRadius: 10,
                color: "white",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Send
            </button>
            {step === "romantic_dealbreakers" && (
              <button
                onClick={() => {
                  setTextInput("");
                  handleTextSubmit();
                }}
                style={{
                  padding: "10px 12px",
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  color: C.muted,
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Skip
              </button>
            )}
          </div>
        )}

        {!showOptions && !showTextInput && !saving && (
          <div style={{ textAlign: "center", color: C.dim, fontSize: 11, padding: 8 }}>...</div>
        )}
      </div>
    </div>
  );
}

function MultiSelect({ options, onConfirm }: { options: Option[]; onConfirm: (v: string[]) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(val: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: `1px solid ${selected.has(opt.value) ? C.cold : C.border}`,
              background: selected.has(opt.value) ? `${C.cold}20` : C.s2,
              color: selected.has(opt.value) ? C.cold : C.text,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {selected.size > 0 && (
        <button
          onClick={() => onConfirm(Array.from(selected))}
          style={{
            padding: "8px 20px",
            background: C.cold,
            border: "none",
            borderRadius: 10,
            color: "white",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Continue ({selected.size} selected)
        </button>
      )}
    </div>
  );
}
