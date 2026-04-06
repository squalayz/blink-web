"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { C } from "@/lib/theme";

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? C.primary : "none"} stroke={active ? C.primary : C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  );
}

function LiveIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? C.primary : C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4" />
      <circle cx="12" cy="12" r="2" fill={active ? C.primary : C.muted} />
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4" />
      <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
    </svg>
  );
}

function DropIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C12 2 8 7 8 12c0 2.21 1.79 4 4 4s4-1.79 4-4C16 9 14 5 12 2Z" fill="rgba(255,255,255,0.2)" />
      <circle cx="12" cy="20" r="2" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? C.primary : "none"} stroke={active ? C.primary : C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function PersonIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? C.primary : "none"} stroke={active ? C.primary : C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  );
}

interface TabDef {
  id: string;
  label: string;
  href: string;
  isCenter?: boolean;
  icon: (active: boolean) => React.ReactNode;
}

const TABS: TabDef[] = [
  { id: "hunt", label: "Hunt", href: "/hunt", icon: (a) => <MapIcon active={a} /> },
  { id: "live", label: "Live Feed", href: "/live", icon: (a) => <LiveIcon active={a} /> },
  { id: "drop", label: "Drop", href: "/drop", isCenter: true, icon: () => <DropIcon /> },
  { id: "messages", label: "Messages", href: "/messages", icon: (a) => <ChatIcon active={a} /> },
  { id: "profile", label: "Profile", href: "/profile", icon: (a) => <PersonIcon active={a} /> },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => {
    if (href === "/hunt") return pathname === "/hunt" || pathname === "/map";
    return pathname.startsWith(href);
  };

  return (
    <nav
      style={{
        position: "fixed",
        bottom: "max(env(safe-area-inset-bottom, 12px), 12px)",
        left: 16,
        right: 16,
        zIndex: 900,
        background: "rgba(13,13,20,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 32,
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "6px 4px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {TABS.map((tab) => {
        const active = isActive(tab.href);

        if (tab.isCenter) {
          return (
            <Link
              key={tab.id}
              href={tab.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                textDecoration: "none",
                flex: 1,
                position: "relative",
                top: -14,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C.primary}, #8B5CF6)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 4px 20px ${C.primary}50, 0 0 40px ${C.primary}20`,
                  border: "2px solid rgba(255,255,255,0.1)",
                  animation: "btnGlow 3s ease-in-out infinite",
                }}
              >
                {tab.icon(active)}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: C.primary, marginTop: 2 }}>
                {tab.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={tab.id}
            href={tab.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "8px 4px 6px",
              textDecoration: "none",
              flex: 1,
              position: "relative",
            }}
          >
            {active && (
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: C.primary,
                  boxShadow: `0 0 6px ${C.primary}`,
                }}
              />
            )}
            {tab.icon(active)}
            <span
              style={{
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                color: active ? C.text : C.muted,
                letterSpacing: "0.01em",
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
