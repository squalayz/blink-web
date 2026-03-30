"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import UserAvatar from "@/components/UserAvatar";
import { X } from "lucide-react";

const C = {
  bg: "#0A0A0F",
  surface: "#111118",
  card: "#1C1C28",
  primary: "#9945FF",
  accent: "#14F195",
  text: "#F9FAFB",
  textMuted: "#9CA3AF",
  border: "#1F2028",
} as const;

interface ProfileData {
  id: string;
  handle: string | null;
  username: string | null;
  bio: string | null;
  profile_pic_url: string | null;
  wallet_address: string | null;
  orbs_found: number;
  orbs_dropped: number;
  reputation: number;
  is_verified: boolean;
}

interface UserProfileCardProps {
  userId: string;
  onClose: () => void;
}

export default function UserProfileCard({
  userId,
  onClose,
}: UserProfileCardProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select(
          "id, handle, username, bio, profile_pic_url, wallet_address, orbs_found, orbs_dropped, reputation, is_verified"
        )
        .eq("id", userId)
        .single();
      if (data) setProfile(data as ProfileData);
      setLoading(false);
    }
    load();
  }, [userId]);

  const truncateWallet = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const copyWallet = async () => {
    if (!profile?.wallet_address) return;
    await navigator.clipboard.writeText(profile.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const displayHandle = profile?.handle || profile?.username || "user";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 100,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 480,
            background: C.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: "24px 24px 32px",
            position: "relative",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: C.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} color={C.textMuted} />
          </button>

          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: 40,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  border: `3px solid ${C.border}`,
                  borderTopColor: C.primary,
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : profile ? (
            <>
              {/* Avatar + handle */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <UserAvatar
                  profilePicUrl={profile.profile_pic_url}
                  handle={displayHandle}
                  size={80}
                />
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: C.text,
                    marginTop: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  @{displayHandle}
                  {profile.is_verified && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <circle cx="8" cy="8" r="8" fill={C.primary} />
                      <path
                        d="M5 8.5L7 10.5L11 6"
                        stroke="#fff"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p
                  style={{
                    color: C.textMuted,
                    fontSize: 14,
                    textAlign: "center",
                    margin: "0 0 12px",
                    lineHeight: 1.5,
                  }}
                >
                  {profile.bio}
                </p>
              )}

              {/* Wallet address */}
              {profile.wallet_address && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <button
                    onClick={copyWallet}
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "6px 12px",
                      color: C.textMuted,
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "monospace",
                    }}
                  >
                    {copied
                      ? "Copied!"
                      : truncateWallet(profile.wallet_address)}
                  </button>
                </div>
              )}

              {/* Stats row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-around",
                  marginBottom: 20,
                  padding: "14px 0",
                  background: C.surface,
                  borderRadius: 12,
                }}
              >
                {[
                  { label: "Dropped", value: profile.orbs_dropped },
                  { label: "Found", value: profile.orbs_found },
                  { label: "Reputation", value: profile.reputation },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{ textAlign: "center", flex: 1 }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: C.text,
                      }}
                    >
                      {s.value}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: C.textMuted,
                        marginTop: 2,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* View Profile button */}
              <button
                onClick={() => {
                  onClose();
                  router.push(`/profile/${displayHandle}`);
                }}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  borderRadius: 12,
                  border: "none",
                  background: C.primary,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                View Profile
              </button>
            </>
          ) : (
            <p
              style={{
                color: C.textMuted,
                textAlign: "center",
                padding: 24,
                fontSize: 14,
              }}
            >
              Profile not found.
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
