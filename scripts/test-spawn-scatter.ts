// Standalone scatter-quality probe for the wild-spawn placement algorithm.
//
// Generates a fixed sample of spawns across enough buckets to model the
// active-window accumulation (~6 buckets, 30 min despawn / 5 min epoch) and
// reports nearest-neighbour distances, an angular histogram, a per-quadrant
// density, and a line-fit R². Run before & after a placement-algorithm
// change to verify the scatter actually looks like blue noise.
//
// Run: npx tsx scripts/test-spawn-scatter.ts
//
// The two algorithms below are duplicated from src/lib/wild-spawns.ts so
// the script needs no env (the production module pulls in supabase-admin
// via "server-only"). Keep `placementsNew` in sync with the production
// `generateCellSpawns` placement.

const CELL_DEG = 0.01;
const EPOCH_SECONDS = 300;
const DESPAWN_MS = 30 * 60_000;
const MIN_PER_CELL = 5;
const MAX_PER_CELL = 12;
const LAT_METERS_PER_DEG = 111_320;

type Pos = { lat: number; lng: number };

function hash32(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function rng(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseCellId(cellId: string): { latIdx: number; lngIdx: number } {
  const [a, b] = cellId.split(":");
  return { latIdx: Number(a), lngIdx: Number(b) };
}

function cellOrigin(cellId: string): { lat: number; lng: number } {
  const { latIdx, lngIdx } = parseCellId(cellId);
  return { lat: latIdx * CELL_DEG, lng: lngIdx * CELL_DEG };
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const p = Math.PI / 180;
  const a =
    0.5 -
    Math.cos((lat2 - lat1) * p) / 2 +
    (Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lng2 - lng1) * p))) / 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function cellGeometry(cellId: string) {
  const origin = cellOrigin(cellId);
  const centerLat = origin.lat + CELL_DEG / 2;
  const centerLng = origin.lng + CELL_DEG / 2;
  const lngMetersPerDeg = LAT_METERS_PER_DEG * Math.cos((centerLat * Math.PI) / 180);
  const halfCellLatM = (CELL_DEG * LAT_METERS_PER_DEG) / 2;
  const halfCellLngM = (CELL_DEG * lngMetersPerDeg) / 2;
  const maxRadiusM = Math.max(50, Math.min(halfCellLatM, halfCellLngM) - 20);
  return { origin, centerLat, centerLng, lngMetersPerDeg, maxRadiusM };
}

function countFor(cellId: string, bucket: number): number {
  const rng = mulberry32(hash32(`${cellId}|${bucket}|count`));
  return MIN_PER_CELL + Math.floor(rng() * (MAX_PER_CELL - MIN_PER_CELL + 1));
}

// ─────────────────────────────────────────────────────────────────────────────
// OLD algorithm — mirrors the current src/lib/wild-spawns.ts:generateCellSpawns
// ─────────────────────────────────────────────────────────────────────────────

const OLD_MITCHELL_K = 10;
const OLD_MIN_SEPARATION_M = 60;

function placementsOld(cellId: string, bucket: number): Pos[] {
  const { centerLat, centerLng, lngMetersPerDeg, maxRadiusM } = cellGeometry(cellId);
  const count = countFor(cellId, bucket);
  const axisRng = mulberry32(hash32(`${cellId}|${bucket}|axis`));
  const cellAxis = axisRng() * Math.PI * 2;

  function candidate(rng: () => number): Pos {
    const angle = rng() * Math.PI * 2;
    const radiusM = Math.sqrt(rng()) * maxRadiusM;
    const perp = cellAxis + Math.PI / 2;
    const nudge = (rng() - 0.5) * 18;
    const dN = Math.cos(angle) * radiusM + Math.cos(perp) * nudge;
    const dE = Math.sin(angle) * radiusM + Math.sin(perp) * nudge;
    return {
      lat: centerLat + dN / LAT_METERS_PER_DEG,
      lng: centerLng + dE / lngMetersPerDeg,
    };
  }

  const placed: Pos[] = [];
  for (let idx = 0; idx < count; idx++) {
    const seed = hash32(`${cellId}|${bucket}|${idx}`);
    const rng = mulberry32(seed);
    rng(); // burn a tick for pickTier
    let best: Pos | null = null;
    let bestDist = -1;
    for (let k = 0; k < OLD_MITCHELL_K; k++) {
      const cand = candidate(rng);
      let nearest = placed.length === 0 ? maxRadiusM : Infinity;
      for (const p of placed) {
        const d = haversineMeters(cand.lat, cand.lng, p.lat, p.lng);
        if (d < nearest) nearest = d;
      }
      if (nearest > bestDist) {
        best = cand;
        bestDist = nearest;
      }
      if (bestDist > OLD_MIN_SEPARATION_M * 1.5) break;
    }
    placed.push(best ?? candidate(rng));
  }
  return placed;
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW algorithm — mirrors the proposed fix.
// ─────────────────────────────────────────────────────────────────────────────

const NEW_MITCHELL_K = 96;
const NEW_MIN_SEPARATION_M = 70;
const ACTIVE_PRIOR_BUCKETS = Math.floor(DESPAWN_MS / 1000 / EPOCH_SECONDS) - 1;

function placeNewIntra(cellId: string, bucket: number, priorConstraints: Pos[]): Pos[] {
  const { centerLat, centerLng, lngMetersPerDeg, maxRadiusM } = cellGeometry(cellId);
  const count = countFor(cellId, bucket);

  function candidate(rng: () => number): Pos {
    const angle = rng() * Math.PI * 2;
    const radiusM = Math.sqrt(rng()) * maxRadiusM;
    return {
      lat: centerLat + (Math.cos(angle) * radiusM) / LAT_METERS_PER_DEG,
      lng: centerLng + (Math.sin(angle) * radiusM) / lngMetersPerDeg,
    };
  }

  const placed: Pos[] = [...priorConstraints];
  const out: Pos[] = [];
  for (let idx = 0; idx < count; idx++) {
    const seed = hash32(`${cellId}|${bucket}|pos|${idx}`);
    const rng = mulberry32(seed);
    let best: Pos | null = null;
    let bestDist = -1;
    // True Poisson-disc dart-throwing: accept the first candidate that beats
    // the separation target; if none in K attempts, keep the best-of-K so we
    // still emit a position. This converges much closer to ideal blue-noise
    // than Mitchell's best-candidate-of-K alone when the disc is saturated
    // with prior-bucket constraints.
    for (let k = 0; k < NEW_MITCHELL_K; k++) {
      const cand = candidate(rng);
      let nearest = placed.length === 0 ? maxRadiusM : Infinity;
      for (const p of placed) {
        const d = haversineMeters(cand.lat, cand.lng, p.lat, p.lng);
        if (d < nearest) nearest = d;
      }
      if (nearest > bestDist) {
        best = cand;
        bestDist = nearest;
      }
      if (bestDist >= NEW_MIN_SEPARATION_M) break;
    }
    const pos = best ?? candidate(rng);
    placed.push(pos);
    out.push(pos);
  }
  return out;
}

function placementsNew(cellId: string, bucket: number): Pos[] {
  // Cross-bucket constraints: raw intra-bucket placements for the prior
  // buckets whose spawns are still active. Raw (no further lookback) so this
  // terminates in one step and stays deterministic.
  const priorConstraints: Pos[] = [];
  for (let k = 1; k <= ACTIVE_PRIOR_BUCKETS; k++) {
    priorConstraints.push(...placeNewIntra(cellId, bucket - k, []));
  }
  return placeNewIntra(cellId, bucket, priorConstraints);
}

// ─────────────────────────────────────────────────────────────────────────────
// Analysis helpers
// ─────────────────────────────────────────────────────────────────────────────

function nearestDists(points: Pos[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < points.length; i++) {
    let nearest = Infinity;
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const d = haversineMeters(points[i].lat, points[i].lng, points[j].lat, points[j].lng);
      if (d < nearest) nearest = d;
    }
    out.push(nearest);
  }
  return out;
}

function pairwiseStats(points: Pos[]) {
  const dists = nearestDists(points).sort((a, b) => a - b);
  const mean = dists.reduce((s, v) => s + v, 0) / dists.length;
  const q = (p: number) => dists[Math.min(dists.length - 1, Math.floor(dists.length * p))];
  return {
    min: dists[0],
    mean,
    max: dists[dists.length - 1],
    p25: q(0.25),
    p50: q(0.5),
    p75: q(0.75),
  };
}

function angularHistogram(points: Pos[], cellId: string, bins = 12): number[] {
  const { centerLat, centerLng, lngMetersPerDeg } = cellGeometry(cellId);
  const hist = new Array(bins).fill(0);
  for (const p of points) {
    const dN = (p.lat - centerLat) * LAT_METERS_PER_DEG;
    const dE = (p.lng - centerLng) * lngMetersPerDeg;
    const angle = Math.atan2(dE, dN);
    const norm = (angle + Math.PI * 2) % (Math.PI * 2);
    const bin = Math.min(bins - 1, Math.floor((norm / (Math.PI * 2)) * bins));
    hist[bin]++;
  }
  return hist;
}

function renderHist(hist: number[]): string {
  const max = Math.max(1, ...hist);
  const labels = ["N", "NNE", "ENE", "E", "ESE", "SSE", "S", "SSW", "WSW", "W", "WNW", "NNW"];
  return hist
    .map((v, i) => {
      const bar = "█".repeat(Math.round((v / max) * 24));
      const lab = (labels[i] ?? `b${i}`).padStart(4, " ");
      return `    ${lab} | ${bar} ${v}`;
    })
    .join("\n");
}

function fitLineRSquared(points: Pos[]): number {
  const n = points.length;
  const xs = points.map((p) => p.lng);
  const ys = points.map((p) => p.lat);
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX === 0 || denY === 0) return 1;
  const r = num / Math.sqrt(denX * denY);
  return r * r;
}

function report(label: string, points: Pos[], cellId: string, target: number) {
  const stats = pairwiseStats(points);
  const dists = nearestDists(points);
  const violations = dists.filter((d) => d < target).length;
  const hist = angularHistogram(points, cellId);
  const expected = points.length / hist.length;
  const chiSq = hist.reduce((s, v) => s + (v - expected) ** 2 / expected, 0);
  const r2 = fitLineRSquared(points);

  console.log(`── ${label} ──`);
  console.log(`  spawns=${points.length}`);
  console.log(
    `  NN distance (m): min=${stats.min.toFixed(1)}  p25=${stats.p25.toFixed(1)}  p50=${stats.p50.toFixed(1)}  p75=${stats.p75.toFixed(1)}  max=${stats.max.toFixed(1)}  mean=${stats.mean.toFixed(1)}`,
  );
  console.log(`  separation target=${target} m, violations=${violations} (${((violations / points.length) * 100).toFixed(1)}%)`);
  console.log("  angular distribution from cell centre:");
  console.log(renderHist(hist));
  console.log(`  chi² vs uniform: ${chiSq.toFixed(2)}  (df=11, p=0.05 critical=19.7)`);
  console.log(`  line-fit R² (lat~lng): ${r2.toFixed(3)}  (0 = scattered, 1 = co-linear)`);
  console.log("");
}

// ─────────────────────────────────────────────────────────────────────────────
// Run probe
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_CELL = "3325:-11178"; // the cell flagged in production
const START_BUCKET = 5_000_000;

function gather(placement: (c: string, b: number) => Pos[], cellId: string, target = 100): Pos[] {
  const out: Pos[] = [];
  let b = 0;
  while (out.length < target) {
    out.push(...placement(cellId, START_BUCKET + b));
    b++;
  }
  return out;
}

console.log(`Sample cell: ${SAMPLE_CELL}`);
console.log(`Bucket window: ${ACTIVE_PRIOR_BUCKETS + 1} buckets simultaneously active (30 min despawn / 5 min epoch)`);
console.log("");

function placementsNewIntraOnly(cellId: string, bucket: number): Pos[] {
  return placeNewIntra(cellId, bucket, []);
}

report("OLD algorithm (Mitchell K=10, no cross-bucket lookback, ±9 m axial nudge)", gather(placementsOld, SAMPLE_CELL), SAMPLE_CELL, OLD_MIN_SEPARATION_M);
report(`NEW intra-only (Poisson-disc K=${NEW_MITCHELL_K}, no cross-bucket lookback)`, gather(placementsNewIntraOnly, SAMPLE_CELL), SAMPLE_CELL, NEW_MIN_SEPARATION_M);
report(`NEW algorithm (Poisson-disc K=${NEW_MITCHELL_K}, cross-bucket lookback against raw prior buckets)`, gather(placementsNew, SAMPLE_CELL), SAMPLE_CELL, NEW_MIN_SEPARATION_M);

// Determinism spot-check: same (cell, bucket) → same set of positions.
const a = placementsNew(SAMPLE_CELL, START_BUCKET);
const b = placementsNew(SAMPLE_CELL, START_BUCKET);
const matches = a.length === b.length && a.every((p, i) => p.lat === b[i].lat && p.lng === b[i].lng);
console.log(`determinism check (same cellId+bucket → same positions): ${matches ? "PASS" : "FAIL"}`);
