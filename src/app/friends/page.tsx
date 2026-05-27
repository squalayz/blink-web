"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import FriendsList from "@/components/FriendsList";
import PrivacyToggle from "@/components/PrivacyToggle";

const C = {
  bg: "#0a0a0f",
  surface: "#0d0d14",
  primary: "#00FF88",
  text: "#FFFFFF",
  muted: "#8a8a99",
  border: "rgba(255,255,255,0.06)",
};

export default function FriendsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/signin");
  }, [loading, user, router]);

  if (loading || !user || !mounted) return null;

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100dvh",
        color: C.text,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(10,10,15,0.85)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: `1px solid ${C.border}`,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Link
          href="/map"
          aria-label="Back to map"
          style={{
            color: C.muted,
            textDecoration: "none",
            fontSize: 20,
            lineHeight: 1,
            padding: 4,
          }}
        >
          ‹
        </Link>
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
          Friends
        </h1>
        <div style={{ marginLeft: "auto" }}>
          <a
            href="#privacy"
            style={{ color: C.primary, fontSize: 12, fontWeight: 700, textDecoration: "none" }}
          >
            Privacy
          </a>
        </div>
      </header>

      <main style={{ padding: "16px 14px 80px", maxWidth: 540, margin: "0 auto" }}>
        <div style={{ marginBottom: 18 }}>
          <PrivacyToggle />
        </div>
        <FriendsList
          onOpenChat={(uid, handle) => {
            router.push(`/messages?user=${uid}${handle ? `&handle=${encodeURIComponent(handle)}` : ""}`);
          }}
        />
      </main>
    </div>
  );
}
