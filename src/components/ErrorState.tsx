"use client";

import { C } from "@/lib/theme";

export default function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
        textAlign: "center",
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke={C.muted}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ marginBottom: 16, opacity: 0.6 }}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: C.text,
          marginBottom: 6,
        }}
      >
        Something went wrong
      </div>
      <div
        style={{
          fontSize: 14,
          color: C.muted,
          lineHeight: 1.5,
          maxWidth: 300,
          marginBottom: onRetry ? 20 : 0,
        }}
      >
        {message}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: C.primary,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "10px 24px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}
