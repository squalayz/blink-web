"use client";

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

interface UserAvatarProps {
  profilePicUrl: string | null;
  handle: string;
  size?: number;
  showHandle?: boolean;
}

export default function UserAvatar({
  profilePicUrl,
  handle,
  size = 40,
  showHandle = false,
}: UserAvatarProps) {
  const letter = (handle || "?").charAt(0).toUpperCase();
  const bgColor = hashColor(handle || "default");

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
      }}
    >
      {profilePicUrl ? (
        <img
          src={profilePicUrl}
          alt={handle + " avatar"}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            backgroundColor: bgColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.42,
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {letter}
        </div>
      )}
      {showHandle && (
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#FFFFFF",
          }}
        >
          @{handle}
        </span>
      )}
    </div>
  );
}
