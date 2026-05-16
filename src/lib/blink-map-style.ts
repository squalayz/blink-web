// BLINK Mapbox theming — "The Eye is Open".
//
// Akira-meets-Pokémon: black-on-black streets with neon green outline glows,
// dark green water, bioluminescent parks, hidden POI/highway noise. Applied
// at runtime over `mapbox://styles/mapbox/dark-v11` so we never have to ship a
// Studio style. Idempotent — safe to call on every style.load.
//
// On the Standard style (`mapbox://styles/mapbox/standard`) most layers are
// internal/sealed so paint properties can't be overridden directly — for that
// case we fall back to config-property tweaks (light preset, label hiding).

import mapboxgl from "mapbox-gl";

export type BlinkMapPhase = "day" | "dusk" | "night";

export function phaseFromHour(hour: number): BlinkMapPhase {
  if (hour >= 6 && hour < 18) return "day";
  if (hour >= 18 && hour < 20) return "dusk";
  return "night";
}

export interface BlinkMapStyleOpts {
  hour?: number;
  phase?: BlinkMapPhase;
}

// Paint snapshots for the three time-of-day phases.
const PHASE_PAINT = {
  day: {
    roadOpacity: 0.30,
    parkOpacity: 0.10,
    waterColor: "#001a14",
    bgColor: "#08080d",
  },
  dusk: {
    roadOpacity: 0.45,
    parkOpacity: 0.15,
    waterColor: "#001a14",
    bgColor: "#04040a",
  },
  night: {
    roadOpacity: 0.60,
    parkOpacity: 0.20,
    waterColor: "#001f17",
    bgColor: "#000000",
  },
} as const;

const NEON = "#00FF88";
const NEON2 = "#88FF00";

const ROAD_LAYER_PREFIXES = [
  "road-motorway",
  "road-trunk",
  "road-primary",
  "road-secondary",
  "road-street",
  "road-minor",
  "road-major-link",
  "road-path",
  "road-pedestrian",
  "road-service",
  "bridge-motorway",
  "bridge-trunk",
  "bridge-primary",
  "bridge-secondary",
  "bridge-street",
  "bridge-minor",
  "tunnel-motorway",
  "tunnel-trunk",
  "tunnel-primary",
  "tunnel-secondary",
  "tunnel-street",
  "tunnel-minor",
];

const ROAD_CASING_PREFIXES = ROAD_LAYER_PREFIXES.map((p) => `${p}-case`);

// Labels we want to keep (parks, neighborhoods, water bodies). Everything else
// is hidden for clarity.
const LABEL_KEEP_PREFIXES = [
  "settlement-major-label",
  "settlement-minor-label",
  "natural-point-label",
  "natural-line-label",
  "poi-label",
];

const LABEL_HIDE_PREFIXES = [
  "road-label",
  "road-number-shield",
  "road-exit-shield",
  "country-label",
  "state-label",
  "continent-label",
  "transit-label",
  "airport-label",
  "settlement-subdivision-label",
  "waterway-label",
];

// Heuristic: which POIs to keep visible vs hide. We keep parks/landmarks only.
const POI_KEEP_MAKI_RE =
  /park|playground|monument|statue|attraction|garden|landmark|stadium|tree/i;

function safeSet<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

export function applyBlinkMapStyle(
  map: mapboxgl.Map,
  opts: BlinkMapStyleOpts = {},
): void {
  if (!map || !map.isStyleLoaded()) return;
  const phase: BlinkMapPhase = opts.phase ?? phaseFromHour(opts.hour ?? new Date().getHours());
  const paint = PHASE_PAINT[phase];

  // ── Standard-style basemap config (cheap, idempotent) ────────────────
  safeSet(() => map.setConfigProperty("basemap", "lightPreset", phase === "day" ? "day" : "night"));
  safeSet(() => map.setConfigProperty("basemap", "showPointOfInterestLabels", false));
  safeSet(() => map.setConfigProperty("basemap", "showTransitLabels", false));
  safeSet(() => map.setConfigProperty("basemap", "showRoadLabels", false));
  safeSet(() => map.setConfigProperty("basemap", "show3dObjects", true));
  safeSet(() => map.setConfigProperty("basemap", "showPlaceLabels", true));

  // ── Atmospheric green fog (works on both Standard and classic styles) ──
  safeSet(() =>
    map.setFog({
      color: phase === "night" ? "rgb(0, 24, 16)" : "rgb(4, 32, 22)",
      "high-color": phase === "night" ? "rgb(0, 10, 6)" : "rgb(4, 18, 12)",
      "horizon-blend": phase === "night" ? 0.18 : 0.12,
      "space-color": "rgb(0, 4, 2)",
      "star-intensity": phase === "night" ? 0.7 : 0.15,
    } as never),
  );

  // ── Per-layer paint overrides (classic styles like dark-v11) ──────────
  const style = safeSet(() => map.getStyle());
  if (!style || !Array.isArray(style.layers)) return;

  for (const layer of style.layers) {
    if (!layer || typeof layer.id !== "string") continue;
    const id = layer.id;

    // Background (deep black)
    if (id === "background" || id === "land") {
      safeSet(() => map.setPaintProperty(id, "background-color", paint.bgColor));
      safeSet(() => map.setPaintProperty(id, "fill-color", "#08080d"));
      continue;
    }

    // Water — dark green tint
    if (id === "water" || id === "water-shadow" || id.startsWith("water-")) {
      if (layer.type === "fill") {
        safeSet(() => map.setPaintProperty(id, "fill-color", paint.waterColor));
        safeSet(() => map.setPaintProperty(id, "fill-outline-color", `${NEON}33`));
      }
      if (layer.type === "line") {
        safeSet(() => map.setPaintProperty(id, "line-color", `${NEON}55`));
      }
      continue;
    }

    // Land use — parks and green spaces glow softly
    if (
      id === "landuse" ||
      id === "national-park" ||
      id === "landcover" ||
      id.startsWith("landuse") ||
      id.startsWith("landcover") ||
      id.includes("park") ||
      id === "pitch" ||
      id === "pitch-line"
    ) {
      if (layer.type === "fill") {
        safeSet(() => map.setPaintProperty(id, "fill-color", NEON));
        safeSet(() => map.setPaintProperty(id, "fill-opacity", paint.parkOpacity));
      }
      continue;
    }

    // Buildings — green-tinted dark grey with edge glow
    if (id === "building" || id === "building-extrusion" || id.startsWith("building")) {
      if (layer.type === "fill" || layer.type === "fill-extrusion") {
        safeSet(() =>
          map.setPaintProperty(
            id,
            layer.type === "fill-extrusion" ? "fill-extrusion-color" : "fill-color",
            "#0c1a14",
          ),
        );
        safeSet(() =>
          map.setPaintProperty(
            id,
            layer.type === "fill-extrusion" ? "fill-extrusion-opacity" : "fill-opacity",
            0.85,
          ),
        );
      }
      continue;
    }

    // Country/state borders → hide
    if (
      id === "admin-0-boundary" ||
      id === "admin-1-boundary" ||
      id.startsWith("admin-0") ||
      id.startsWith("admin-1") ||
      id === "country-label" ||
      id === "state-label"
    ) {
      safeSet(() => map.setLayoutProperty(id, "visibility", "none"));
      continue;
    }

    // Road casings — make them dark so the neon line floats above
    if (ROAD_CASING_PREFIXES.some((p) => id.startsWith(p))) {
      safeSet(() => map.setPaintProperty(id, "line-color", "#02060a"));
      safeSet(() => map.setPaintProperty(id, "line-opacity", 0.65));
      continue;
    }

    // Road bodies — neon green at phase-appropriate opacity
    if (ROAD_LAYER_PREFIXES.some((p) => id === p || id.startsWith(`${p}-`))) {
      if (layer.type === "line") {
        const isMotorway = id.includes("motorway") || id.includes("trunk");
        safeSet(() =>
          map.setPaintProperty(id, "line-color", isMotorway ? NEON2 : NEON),
        );
        safeSet(() =>
          map.setPaintProperty(
            id,
            "line-opacity",
            isMotorway ? Math.min(0.85, paint.roadOpacity + 0.15) : paint.roadOpacity,
          ),
        );
        safeSet(() => map.setPaintProperty(id, "line-blur", 0.3));
      }
      continue;
    }

    // Labels we want to hide
    if (LABEL_HIDE_PREFIXES.some((p) => id.startsWith(p))) {
      safeSet(() => map.setLayoutProperty(id, "visibility", "none"));
      continue;
    }

    // POI label heuristic: keep parks/landmarks, hide everything else.
    if (id.startsWith("poi-label")) {
      safeSet(() => {
        const filter = layer.filter as unknown[] | undefined;
        const f = JSON.stringify(filter || []);
        if (POI_KEEP_MAKI_RE.test(f)) {
          map.setPaintProperty(id, "text-color", NEON);
          map.setPaintProperty(id, "text-halo-color", "#000000");
          map.setPaintProperty(id, "text-halo-width", 1.2);
        } else {
          map.setLayoutProperty(id, "visibility", "none");
        }
      });
      continue;
    }

    // Labels we want to keep — tint neon green, low opacity
    if (LABEL_KEEP_PREFIXES.some((p) => id.startsWith(p))) {
      safeSet(() => map.setPaintProperty(id, "text-color", NEON));
      safeSet(() => map.setPaintProperty(id, "text-halo-color", "#000000"));
      safeSet(() => map.setPaintProperty(id, "text-halo-width", 1.0));
      continue;
    }
  }
}
