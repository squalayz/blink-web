"use client";

// Fallback rendered when the map subtree throws (e.g. Mapbox/Leaflet token
// missing, tile load explosion). Brand-styled and intentionally minimal —
// the user just needs an obvious recovery path that doesn't leave them on
// a white screen.

import { C } from "@/lib/theme";

export default function MapDownState() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: C.bg,
        zIndex: 5,
      }}
    >
      <div
        style={{
          maxWidth: 360,
          width: "100%",
          textAlign: "center",
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${C.primary}33`,
          borderRadius: 16,
          padding: 24,
          color: C.text,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.24em",
            color: C.primary,
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Map unavailable
        </div>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, margin: "0 0 18px" }}>
          The map couldn&apos;t load. Refresh to retry.
        </p>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") window.location.reload();
          }}
          style={{
            padding: "10px 22px",
            borderRadius: 10,
            border: "none",
            background: C.primary,
            color: "#000",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
