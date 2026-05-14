"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import { useIsDesktop } from "@/hooks/useIsDesktop";

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
const ROW_BG = "#0d0d14";
const BORDER = "rgba(255,255,255,0.05)";
const MUTED = "#8a8a99";
const PURPLE = "#00FF88";
const TOGGLE_OFF = "#1a1a24";
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
          transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
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
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick || (href ? () => router.push(href) : undefined)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 56,
        padding: "0 20px",
        background: pressed ? "rgba(255,255,255,0.06)" : ROW_BG,
        border: "none",
        borderBottom: isLast ? "none" : `1px solid ${BORDER}`,
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        fontFamily: FONT,
        transition: "background 0.15s ease",
      }}
    >
      <IconBox color={iconColor}>{icon}</IconBox>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#FFFFFF" }}>{title}</div>
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
      <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "#FFFFFF" }}>
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
        <div style={{ fontSize: 15, fontWeight: 600, color: "#FFFFFF" }}>{title}</div>
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

function SectionContainer({ isDesktop, children }: { isDesktop?: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: ROW_BG,
        borderRadius: isDesktop ? 18 : 16,
        overflow: "hidden",
        margin: "0 16px",
        border: isDesktop ? "1px solid rgba(255,255,255,0.06)" : "none",
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

  const { isDesktop } = useIsDesktop();

  /* Close button hover */
  const [closeBtnHover, setCloseBtnHover] = useState(false);

  /* Log out press state */
  const [logoutPressed, setLogoutPressed] = useState(false);

  /* Toggle states -- persisted to localStorage */
  const [messageRequests, setMessageRequests] = useState(true);
  const [readReceipts, setReadReceipts] = useState(false);
  const [openDMs, setOpenDMs] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [distanceMiles, setDistanceMiles] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mm_settings");
      if (saved) {
        const s = JSON.parse(saved);
        if (typeof s.messageRequests === "boolean") setMessageRequests(s.messageRequests);
        if (typeof s.readReceipts === "boolean") setReadReceipts(s.readReceipts);
        if (typeof s.openDMs === "boolean") setOpenDMs(s.openDMs);
        if (typeof s.soundEffects === "boolean") setSoundEffects(s.soundEffects);
        if (typeof s.hapticFeedback === "boolean") setHapticFeedback(s.hapticFeedback);
        if (typeof s.pushNotifications === "boolean") setPushNotifications(s.pushNotifications);
        if (typeof s.distanceMiles === "boolean") setDistanceMiles(s.distanceMiles);
      }
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("mm_settings", JSON.stringify({
        messageRequests, readReceipts, openDMs, soundEffects, hapticFeedback, pushNotifications, distanceMiles,
      }));
    } catch { /* noop */ }
  }, [messageRequests, readReceipts, openDMs, soundEffects, hapticFeedback, pushNotifications, distanceMiles]);

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

  /* Close button size based on desktop */
  const closeBtnSize = isDesktop ? 40 : 32;

  /* Scrollable content -- shared between mobile and desktop */
  const settingsContent = (
    <>
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          background: BG,
          zIndex: 1,
          paddingTop: isDesktop ? 4 : 10,
          paddingBottom: 12,
        }}
      >
        {/* Drag handle -- mobile only */}
        {!isDesktop && (
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "rgba(255,255,255,0.2)",
              margin: "0 auto 12px",
            }}
          />
        )}
        {/* Title + close */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            padding: isDesktop ? "12px 20px 0" : "0 16px",
          }}
        >
          <span
            style={{
              fontSize: isDesktop ? 19 : 17,
              fontWeight: 700,
              color: "#FFFFFF",
            }}
          >
            Settings
          </span>
          <button
            onClick={onClose}
            onPointerEnter={() => setCloseBtnHover(true)}
            onPointerLeave={() => setCloseBtnHover(false)}
            style={{
              position: "absolute",
              right: isDesktop ? 20 : 16,
              width: closeBtnSize,
              height: closeBtnSize,
              borderRadius: "50%",
              background: closeBtnHover
                ? "rgba(255,255,255,0.14)"
                : "rgba(255,255,255,0.08)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s ease",
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
      <SectionContainer isDesktop={isDesktop}>
        <NavRow
          icon={<WalletIcon />}
          iconColor={PURPLE}
          title="Your Wallet"
          subtitle="Integrated on Profile"
          onClick={() => handleNav("/wallet")}
          isLast
        />
      </SectionContainer>

      {/* ============================================================ */}
      {/*  PRIVACY                                                      */}
      {/* ============================================================ */}
      <div style={{ height: 8 }} />
      <SectionHeader label="Privacy" />
      <SectionContainer isDesktop={isDesktop}>
        <NavRow
          icon={<ShieldIcon />}
          iconColor="#88FF00"
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
      <SectionContainer isDesktop={isDesktop}>
        <ToggleRow
          icon={<MessageIcon />}
          iconColor="#00FF88"
          title="Message Requests"
          on={messageRequests}
          onChange={() => setMessageRequests((p) => !p)}
        />
        <ToggleRow
          icon={<EyeIcon />}
          iconColor="#00FF88"
          title="Read Receipts"
          on={readReceipts}
          onChange={() => setReadReceipts((p) => !p)}
        />
        <ToggleRow
          icon={<UnlockIcon />}
          iconColor="#00FF88"
          title="Open DMs"
          on={openDMs}
          onChange={() => setOpenDMs((p) => !p)}
        />
        <NavRow
          icon={<BlockIcon />}
          iconColor="#00FF88"
          title="Blocked Users"
          subtitle="Coming soon"
          isLast
        />
      </SectionContainer>

      {/* ============================================================ */}
      {/*  SOUNDS & HAPTICS                                              */}
      {/* ============================================================ */}
      <div style={{ height: 8 }} />
      <SectionHeader label="Sounds & Haptics" />
      <SectionContainer isDesktop={isDesktop}>
        <ToggleRow
          icon={<SpeakerIcon />}
          iconColor="#88FF00"
          title="Sound Effects"
          on={soundEffects}
          onChange={() => setSoundEffects((p) => !p)}
        />
        <ToggleRow
          icon={<VibrateIcon />}
          iconColor="#88FF00"
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
      <SectionContainer isDesktop={isDesktop}>
        <ToggleRow
          icon={<BellIcon />}
          iconColor="#00FF88"
          title="Push Notifications"
          on={pushNotifications}
          onChange={() => setPushNotifications((p) => !p)}
        />
        <ToggleRow
          icon={<RulerIcon />}
          iconColor="#00FF88"
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
      <SectionContainer isDesktop={isDesktop}>
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
      <SectionContainer isDesktop={isDesktop}>
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
          onPointerDown={() => setLogoutPressed(true)}
          onPointerUp={() => setLogoutPressed(false)}
          onPointerLeave={() => setLogoutPressed(false)}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 14,
            border: "1px solid rgba(239,68,68,0.2)",
            background: logoutPressed
              ? "rgba(239,68,68,0.2)"
              : "rgba(239,68,68,0.12)",
            color: "#EF4444",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontFamily: FONT,
            transform: logoutPressed ? "scale(0.98)" : "scale(1)",
            transition: "background 0.15s ease, transform 0.15s ease",
          }}
        >
          <LogOutIcon />
          Log Out
        </button>
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
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: `opacity ${TRANSITION}`,
          zIndex: 9998,
        }}
      />

      {/* Sheet / Modal */}
      <div
        style={
          isDesktop
            ? {
                /* Desktop: centered modal */
                position: "fixed",
                top: "50%",
                left: "calc(50% + 36px)" /* offset for 72px AppShell sidebar */,
                maxWidth: 480,
                width: "calc(100% - 120px)",
                maxHeight: "85vh",
                background: BG,
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
                transform: isOpen
                  ? "translate(-50%, -50%) scale(1)"
                  : "translate(-50%, -50%) scale(0.92)",
                opacity: isOpen ? 1 : 0,
                transition: `transform ${TRANSITION}, opacity ${TRANSITION}`,
                zIndex: 9999,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                fontFamily: FONT,
                pointerEvents: isOpen ? "auto" : "none",
              }
            : {
                /* Mobile: full-screen slide-up */
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
              }
        }
      >
        {settingsContent}
      </div>
    </>
  );
}
