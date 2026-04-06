"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */
const BG = "#0d0d14";
const ROW_BG = "#111118";
const BORDER = "rgba(255,255,255,0.05)";
const MUTED = "#9CA3AF";
const PURPLE = "#9945FF";
const TOGGLE_OFF = "#2a2a3a";
const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const TRANSITION = "0.35s cubic-bezier(0.32, 0.72, 0, 1)";

/* ------------------------------------------------------------------ */
/*  Icons                                                               */
/* ------------------------------------------------------------------ */
function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* 20px icons for rows */
function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function VibrateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="20" rx="2" />
      <path d="M2 8v8" />
      <path d="M22 8v8" />
      <path d="M5 6v12" />
      <path d="M19 6v12" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0z" />
      <path d="m14.5 12.5 2-2" />
      <path d="m11.5 9.5 2-2" />
      <path d="m8.5 6.5 2-2" />
      <path d="m17.5 15.5 2-2" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Toggle                                                              */
/* ------------------------------------------------------------------ */
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        border: "none",
        background: on ? PURPLE : TOGGLE_OFF,
        position: "relative",
        cursor: "pointer",
        transition: "background 0.2s",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#fff",
          position: "absolute",
          top: 2,
          left: on ? 20 : 2,
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Icon Container                                                      */
/* ------------------------------------------------------------------ */
function IconBox({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: `${color}18`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row components                                                      */
/* ------------------------------------------------------------------ */
function NavRow({
  icon,
  iconColor,
  title,
  subtitle,
  href,
  isLast,
  onClick,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  subtitle?: string;
  href?: string;
  isLast?: boolean;
  onClick?: () => void;
}) {
  const router = useRouter();
  return (
    <button
      onClick={onClick || (href ? () => router.push(href) : undefined)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 56,
        padding: "0 20px",
        background: ROW_BG,
        border: "none",
        borderBottom: isLast ? "none" : `1px solid ${BORDER}`,
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        fontFamily: FONT,
      }}
    >
      <IconBox color={iconColor}>{icon}</IconBox>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#F9FAFB" }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{subtitle}</div>
        )}
      </div>
      <ChevronRight />
    </button>
  );
}

function ToggleRow({
  icon,
  iconColor,
  title,
  on,
  onChange,
  isLast,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  on: boolean;
  onChange: () => void;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 56,
        padding: "0 20px",
        background: ROW_BG,
        borderBottom: isLast ? "none" : `1px solid ${BORDER}`,
      }}
    >
      <IconBox color={iconColor}>{icon}</IconBox>
      <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "#F9FAFB" }}>
        {title}
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

function InfoRow({
  icon,
  iconColor,
  title,
  subtitle,
  rightValue,
  isLast,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  subtitle?: string;
  rightValue?: string;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 56,
        padding: "0 20px",
        background: ROW_BG,
        borderBottom: isLast ? "none" : `1px solid ${BORDER}`,
      }}
    >
      <IconBox color={iconColor}>{icon}</IconBox>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#F9FAFB" }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{subtitle}</div>
        )}
      </div>
      {rightValue && (
        <span style={{ fontSize: 14, color: MUTED }}>{rightValue}</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section header                                                      */
/* ------------------------------------------------------------------ */
function SectionHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        textTransform: "uppercase" as const,
        color: MUTED,
        letterSpacing: "0.08em",
        fontWeight: 600,
        padding: "16px 20px 8px",
      }}
    >
      {label}
    </div>
  );
}

function SectionContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: ROW_BG,
        borderRadius: 16,
        overflow: "hidden",
        margin: "0 16px",
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */
export default function SettingsSheet({ isOpen, onClose }: SettingsSheetProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();

  /* Toggle states */
  const [messageRequests, setMessageRequests] = useState(true);
  const [readReceipts, setReadReceipts] = useState(false);
  const [openDMs, setOpenDMs] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [distanceMiles, setDistanceMiles] = useState(false);

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "??";

  const handleLogOut = async () => {
    await signOut();
    router.replace("/");
  };

  const handleNav = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: `opacity ${TRANSITION}`,
          zIndex: 9998,
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          top: 0,
          background: BG,
          transform: isOpen ? "translateY(0)" : "translateY(100%)",
          transition: `transform ${TRANSITION}`,
          zIndex: 9999,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          fontFamily: FONT,
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            background: BG,
            zIndex: 1,
            paddingTop: 10,
            paddingBottom: 12,
          }}
        >
          {/* Drag handle */}
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "rgba(255,255,255,0.2)",
              margin: "0 auto 12px",
            }}
          />
          {/* Title + close */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              padding: "0 16px",
            }}
          >
            <span
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#F9FAFB",
              }}
            >
              Settings
            </span>
            <button
              onClick={onClose}
              style={{
                position: "absolute",
                right: 16,
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <XIcon />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/*  WALLET                                                       */}
        {/* ============================================================ */}
        <SectionHeader label="Wallet" />
        <SectionContainer>
          <NavRow
            icon={<WalletIcon />}
            iconColor={PURPLE}
            title="Your Wallet"
            subtitle="3 chains · active"
            onClick={() => handleNav("/wallet")}
            isLast
          />
        </SectionContainer>

        {/* ============================================================ */}
        {/*  PRIVACY                                                      */}
        {/* ============================================================ */}
        <div style={{ height: 8 }} />
        <SectionHeader label="Privacy" />
        <SectionContainer>
          <NavRow
            icon={<ShieldIcon />}
            iconColor="#3B82F6"
            title="Privacy Center"
            subtitle="Ghost Mode · 85/100"
            onClick={() => handleNav("/privacy")}
            isLast
          />
        </SectionContainer>

        {/* ============================================================ */}
        {/*  MESSAGES                                                      */}
        {/* ============================================================ */}
        <div style={{ height: 8 }} />
        <SectionHeader label="Messages" />
        <SectionContainer>
          <ToggleRow
            icon={<MessageIcon />}
            iconColor="#6366F1"
            title="Message Requests"
            on={messageRequests}
            onChange={() => setMessageRequests((p) => !p)}
          />
          <ToggleRow
            icon={<EyeIcon />}
            iconColor="#6366F1"
            title="Read Receipts"
            on={readReceipts}
            onChange={() => setReadReceipts((p) => !p)}
          />
          <ToggleRow
            icon={<UnlockIcon />}
            iconColor="#6366F1"
            title="Open DMs"
            on={openDMs}
            onChange={() => setOpenDMs((p) => !p)}
          />
          <NavRow
            icon={<BlockIcon />}
            iconColor="#6366F1"
            title="Blocked Users"
            isLast
          />
        </SectionContainer>

        {/* ============================================================ */}
        {/*  SOUNDS & HAPTICS                                              */}
        {/* ============================================================ */}
        <div style={{ height: 8 }} />
        <SectionHeader label="Sounds & Haptics" />
        <SectionContainer>
          <ToggleRow
            icon={<SpeakerIcon />}
            iconColor="#F97316"
            title="Sound Effects"
            on={soundEffects}
            onChange={() => setSoundEffects((p) => !p)}
          />
          <ToggleRow
            icon={<VibrateIcon />}
            iconColor="#F97316"
            title="Haptic Feedback"
            on={hapticFeedback}
            onChange={() => setHapticFeedback((p) => !p)}
            isLast
          />
        </SectionContainer>

        {/* ============================================================ */}
        {/*  GENERAL                                                       */}
        {/* ============================================================ */}
        <div style={{ height: 8 }} />
        <SectionHeader label="General" />
        <SectionContainer>
          <ToggleRow
            icon={<BellIcon />}
            iconColor="#22C55E"
            title="Push Notifications"
            on={pushNotifications}
            onChange={() => setPushNotifications((p) => !p)}
          />
          <ToggleRow
            icon={<RulerIcon />}
            iconColor="#22C55E"
            title="Distance in Miles"
            on={distanceMiles}
            onChange={() => setDistanceMiles((p) => !p)}
            isLast
          />
        </SectionContainer>

        {/* ============================================================ */}
        {/*  SECURITY                                                      */}
        {/* ============================================================ */}
        <div style={{ height: 8 }} />
        <SectionHeader label="Security" />
        <SectionContainer>
          <InfoRow
            icon={<LockIcon />}
            iconColor="#EF4444"
            title="Passcode"
            subtitle="Required to reveal private key"
          />
          <NavRow
            icon={<KeyIcon />}
            iconColor="#EF4444"
            title="Reveal Private Keys"
            subtitle="Handle with extreme care · Encrypted on-device"
            onClick={() => handleNav("/security")}
            isLast
          />
        </SectionContainer>

        {/* ============================================================ */}
        {/*  ABOUT                                                         */}
        {/* ============================================================ */}
        <div style={{ height: 8 }} />
        <SectionHeader label="About" />
        <SectionContainer>
          <InfoRow
            icon={<span style={{ fontSize: 14, color: MUTED }}>v</span>}
            iconColor={MUTED}
            title="Version"
            rightValue="1.0.0"
          />
          <NavRow
            icon={<span style={{ fontSize: 14, color: MUTED }}>T</span>}
            iconColor={MUTED}
            title="Terms of Service"
            onClick={() => handleNav("/terms")}
          />
          <NavRow
            icon={<span style={{ fontSize: 14, color: MUTED }}>P</span>}
            iconColor={MUTED}
            title="Privacy Policy"
            onClick={() => handleNav("/privacy")}
          />
          <NavRow
            icon={<span style={{ fontSize: 14, color: MUTED }}>S</span>}
            iconColor={MUTED}
            title="Support"
            onClick={() => handleNav("/support")}
            isLast
          />
        </SectionContainer>

        {/* ============================================================ */}
        {/*  LOG OUT                                                       */}
        {/* ============================================================ */}
        <div style={{ padding: "24px 16px 48px" }}>
          <button
            onClick={handleLogOut}
            style={{
              width: "100%",
              height: 52,
              borderRadius: 14,
              border: "none",
              background: "rgba(239,68,68,0.12)",
              color: "#EF4444",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: FONT,
            }}
          >
            <LogOutIcon />
            Log Out
          </button>
        </div>
      </div>
    </>
  );
}
