"use client";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const C = {
  bg:"#0a0a0f", surface:"#0d0d14", indigo:"#6366f1", cyan:"#06b6d4",
  match:"#30d158", text:"#e8e8f0", muted:"#6b6b80", dim:"#2a2a3a", hot:"#ff2d55",
};

interface TabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadMatches?: number;
  unreadMessages?: number;
  lowBalance?: boolean;
}

export default function MobileTabBar({ activeTab, onTabChange, unreadMatches = 0, unreadMessages = 0, lowBalance = false }: TabBarProps) {
  const [visible, setVisible] = useState(true);
  const [lastY, setLastY] = useState(0);

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    const fn = () => {
      const y = window.scrollY;
      setVisible(y < lastY || y < 50);
      setLastY(y);
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [lastY]);

  const tabs = [
    { id: "mesh", label: "Mesh", icon: MeshIcon, badge: 0 },
    { id: "matches", label: "Matches", icon: MatchesIcon, badge: unreadMatches },
    { id: "chat", label: "Chat", icon: ChatIcon, badge: unreadMessages },
    { id: "wallet", label: "Wallet", icon: WalletIcon, badge: 0, alert: lowBalance },
    { id: "profile", label: "Profile", icon: ProfileIcon, badge: 0 },
  ];

  return (
    <>
      {/* Spacer to prevent content from hiding behind tab bar */}
      <div style={{ height: 72 }} className="mm-tab-spacer" />

      <div className="mm-mobile-tab-bar" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 400,
        background: C.surface, borderTop: `1px solid ${C.dim}`,
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        display: "flex", justifyContent: "space-around", alignItems: "center",
        padding: "6px 0 env(safe-area-inset-bottom, 8px) 0",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => onTabChange(tab.id)} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              background: "none", border: "none", cursor: "pointer", padding: "6px 0",
              position: "relative", fontFamily: "inherit",
            }}>
              {/* Active indicator dot */}
              {active && (
                <div style={{
                  position: "absolute", top: -1, width: 20, height: 3, borderRadius: 2,
                  background: C.indigo, boxShadow: `0 0 8px ${C.indigo}60`,
                }} />
              )}
              {/* Icon */}
              <div style={{ position: "relative" }}>
                <tab.icon active={active} />
                {/* Badge */}
                {tab.badge > 0 && (
                  <div style={{
                    position: "absolute", top: -4, right: -8,
                    minWidth: 16, height: 16, borderRadius: 8,
                    background: C.hot, color: "white", fontSize: 9, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 4px",
                  }}>{tab.badge > 99 ? "99+" : tab.badge}</div>
                )}
                {/* Alert dot (low balance) */}
                {tab.alert && (
                  <div style={{
                    position: "absolute", top: -2, right: -4,
                    width: 8, height: 8, borderRadius: "50%",
                    background: C.hot, animation: "tab-alert 1s infinite",
                  }} />
                )}
              </div>
              {/* Label */}
              <span style={{
                fontSize: 10, fontWeight: active ? 700 : 500,
                color: active ? C.indigo : C.muted,
                transition: "color 0.2s",
              }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes tab-alert{0%,100%{opacity:0.5;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
        @media(min-width:641px){
          .mm-mobile-tab-bar{display:none!important}
          .mm-tab-spacer{display:none!important}
        }
      `}</style>
    </>
  );
}

// ── Tab Icons ──
function MeshIcon({ active }: { active: boolean }) {
  const c = active ? C.indigo : C.muted;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" fill={c} opacity={active ? 1 : 0.5} />
      <circle cx="5" cy="7" r="2" fill={c} opacity={0.4} />
      <circle cx="19" cy="7" r="2" fill={c} opacity={0.4} />
      <circle cx="5" cy="17" r="2" fill={c} opacity={0.4} />
      <circle cx="19" cy="17" r="2" fill={c} opacity={0.4} />
      <line x1="12" y1="12" x2="5" y2="7" stroke={c} strokeWidth="1" opacity={0.3} />
      <line x1="12" y1="12" x2="19" y2="7" stroke={c} strokeWidth="1" opacity={0.3} />
      <line x1="12" y1="12" x2="5" y2="17" stroke={c} strokeWidth="1" opacity={0.3} />
      <line x1="12" y1="12" x2="19" y2="17" stroke={c} strokeWidth="1" opacity={0.3} />
    </svg>
  );
}

function MatchesIcon({ active }: { active: boolean }) {
  const c = active ? C.indigo : C.muted;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="12" r="4" stroke={c} strokeWidth="2" />
      <circle cx="16" cy="12" r="4" stroke={c} strokeWidth="2" />
      {active && <line x1="11" y1="12" x2="13" y2="12" stroke={C.match} strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  const c = active ? C.indigo : C.muted;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      {active && <>
        <circle cx="8" cy="10" r="1" fill={c} stroke="none" />
        <circle cx="12" cy="10" r="1" fill={c} stroke="none" />
        <circle cx="16" cy="10" r="1" fill={c} stroke="none" />
      </>}
    </svg>
  );
}

function WalletIcon({ active }: { active: boolean }) {
  const c = active ? C.indigo : C.muted;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <circle cx="17" cy="14" r="1.5" fill={active ? C.match : "none"} stroke={c} />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  const c = active ? C.indigo : C.muted;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
