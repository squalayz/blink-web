"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { supabase } from "@/lib/supabase";
import UserAvatar from "@/components/UserAvatar";
import { ArrowLeft } from "lucide-react";
import { C } from "@/lib/theme";
import { useIsDesktop } from "@/hooks/useIsDesktop";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [handleError, setHandleError] = useState("");
  const [toast, setToast] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  // Focus states for inputs
  const [handleFocused, setHandleFocused] = useState(false);
  const [bioFocused, setBioFocused] = useState(false);

  // Avatar hover state
  const [avatarHover, setAvatarHover] = useState(false);
  // Change Photo hover state
  const [photoLabelHover, setPhotoLabelHover] = useState(false);

  // Save button states
  const [savePressed, setSavePressed] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { isDesktop } = useIsDesktop();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/signin");
    }
  }, [authLoading, user, router]);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setHandle(data.handle || "");
      setBio(data.bio || "");
      setProfilePicUrl(data.profile_pic_url || null);
      setWalletAddress(data.wallet_address || "");
    }
    setLoadingData(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user, fetchProfile]);

  const checkHandleUniqueness = async () => {
    if (!handle.trim() || !user) return;
    setHandleError("");
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("handle", handle.trim().toLowerCase())
      .neq("id", user.id)
      .single();

    if (data) {
      setHandleError("This handle is already taken.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Preview
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    setProfilePicUrl(publicUrl);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    if (handleError) return;
    setSaving(true);

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      handle: handle.trim().toLowerCase() || null,
      bio: bio.trim() || null,
      profile_pic_url: profilePicUrl,
    });

    setSaving(false);

    if (error) {
      setToast("Failed to save. Please try again.");
    } else {
      setToast("Profile saved successfully!");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1200);
    }
    setTimeout(() => setToast(""), 2500);
  };

  if (authLoading || !user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: `3px solid ${C.border}`,
            borderTopColor: C.primary,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const displayPic = previewUrl || profilePicUrl;

  const focusBoxShadow = "0 0 0 3px rgba(0,255,136,0.15)";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: C.bg,
        color: C.text,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "rgba(10,10,15,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 560,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            onClick={() => router.back()}
            style={{
              background: "none",
              border: "none",
              color: C.text,
              cursor: "pointer",
              padding: 6,
              display: "flex",
              alignItems: "center",
            }}
          >
            <ArrowLeft size={22} />
          </button>
          <span style={{ fontSize: 17, fontWeight: 600 }}>Edit Profile</span>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: isDesktop ? "40px 40px 80px" : "32px 24px 80px",
        }}
      >
        {loadingData ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div
              style={{
                width: 28,
                height: 28,
                border: `3px solid ${C.border}`,
                borderTopColor: C.primary,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto",
              }}
            />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={
              isDesktop
                ? {
                    background: C.glass,
                    border: `1px solid ${C.glassBorder}`,
                    borderRadius: 20,
                    padding: 40,
                  }
                : undefined
            }
          >
            {/* Avatar upload */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: 32,
              }}
            >
              <div
                style={{ position: "relative", marginBottom: 12, cursor: "pointer" }}
                onMouseEnter={() => setAvatarHover(true)}
                onMouseLeave={() => setAvatarHover(false)}
              >
                <UserAvatar
                  profilePicUrl={displayPic}
                  handle={handle || user.email || "user"}
                  size={100}
                />
                {/* Hover overlay with camera icon */}
                {(avatarHover && !uploading) && (
                  <label
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />
                  </label>
                )}
                {uploading && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        border: `3px solid ${C.border}`,
                        borderTopColor: C.primary,
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                  </div>
                )}
              </div>
              <label
                onMouseEnter={() => setPhotoLabelHover(true)}
                onMouseLeave={() => setPhotoLabelHover(false)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 10,
                  border: `1px solid ${photoLabelHover ? C.primary : C.border}`,
                  background: photoLabelHover ? C.s2 : C.surface,
                  color: C.text,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "border-color 0.2s ease, background 0.2s ease",
                }}
              >
                Change Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            {/* Handle input */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.muted,
                  marginBottom: 8,
                  letterSpacing: "0.02em",
                }}
              >
                Handle
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: C.s2,
                  border: `1px solid ${
                    handleError
                      ? C.danger
                      : handleFocused
                      ? C.primary
                      : C.border
                  }`,
                  borderRadius: 12,
                  padding: "0 16px",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  boxShadow: handleFocused && !handleError ? focusBoxShadow : "none",
                }}
              >
                <span style={{ color: C.muted, fontSize: 15 }}>@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => {
                    setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""));
                    setHandleError("");
                  }}
                  onFocus={() => setHandleFocused(true)}
                  onBlur={() => {
                    setHandleFocused(false);
                    checkHandleUniqueness();
                  }}
                  placeholder="username"
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    color: C.text,
                    fontSize: 15,
                    padding: "14px 8px",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              {handleError && (
                <p
                  style={{
                    color: C.danger,
                    fontSize: 12,
                    marginTop: 6,
                  }}
                >
                  {handleError}
                </p>
              )}
            </div>

            {/* Bio textarea */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.muted,
                  marginBottom: 8,
                  letterSpacing: "0.02em",
                }}
              >
                Bio
              </label>
              <div style={{ position: "relative" }}>
                <textarea
                  value={bio}
                  onChange={(e) => {
                    if (e.target.value.length <= 160) setBio(e.target.value);
                  }}
                  onFocus={() => setBioFocused(true)}
                  onBlur={() => setBioFocused(false)}
                  placeholder="Tell the world about yourself..."
                  rows={3}
                  style={{
                    width: "100%",
                    background: C.s2,
                    border: `1px solid ${bioFocused ? C.primary : C.border}`,
                    borderRadius: 12,
                    color: C.text,
                    fontSize: 15,
                    padding: 16,
                    resize: "none",
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    boxShadow: bioFocused ? focusBoxShadow : "none",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    bottom: 10,
                    right: 14,
                    fontSize: 12,
                    transition: "color 0.2s ease",
                    color:
                      bio.length >= 150
                        ? bio.length >= 160
                          ? C.danger
                          : C.gold
                        : C.muted,
                  }}
                >
                  {bio.length}/160
                </span>
              </div>
            </div>

            {/* Wallet (read-only) */}
            <div style={{ marginBottom: 32 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.muted,
                  marginBottom: 8,
                  letterSpacing: "0.02em",
                }}
              >
                Wallet Address
              </label>
              <div
                style={{
                  background: C.s2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  color: C.muted,
                  fontSize: 14,
                  fontFamily: "monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {walletAddress || "No wallet connected"}
              </div>
            </div>

            {/* Save button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              onPointerDown={() => setSavePressed(true)}
              onPointerUp={() => setSavePressed(false)}
              onPointerLeave={() => setSavePressed(false)}
              disabled={saving || !!handleError}
              style={{
                width: "100%",
                padding: "16px 0",
                borderRadius: 14,
                border: "none",
                background:
                  saving || handleError
                    ? C.border
                    : saveSuccess
                    ? C.accent
                    : savePressed
                    ? "rgba(0,255,136,0.8)"
                    : C.primary,
                color:
                  saving || handleError
                    ? C.muted
                    : saveSuccess
                    ? C.bg
                    : "#fff",
                fontSize: 16,
                fontWeight: 700,
                cursor:
                  saving || handleError ? "not-allowed" : "pointer",
                outline: "none",
                transition: "background 0.25s ease, color 0.25s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {saving && (
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
              )}
              {saving ? "Saving..." : saveSuccess ? "Saved" : "Save Profile"}
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          style={{
            position: "fixed",
            top: 80,
            left: "50%",
            transform: "translateX(-50%)",
            background: toast.includes("Failed") ? C.danger : C.accent,
            color: toast.includes("Failed") ? "#fff" : C.bg,
            padding: "12px 24px",
            borderRadius: 14,
            fontSize: 14,
            fontWeight: 700,
            zIndex: 100,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            maxWidth: isDesktop ? 400 : "calc(100vw - 32px)",
            width: isDesktop ? 400 : "auto",
            textAlign: "center",
            border: `1px solid ${
              toast.includes("Failed")
                ? "rgba(239,68,68,0.3)"
                : "rgba(0,255,136,0.3)"
            }`,
          }}
        >
          {toast}
        </motion.div>
      )}
    </div>
  );
}
