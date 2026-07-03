"use client";

export type BlinkSound =
  | "awaken"
  | "reveal"
  | "spotted"
  | "nearby"
  | "catchCommon"
  | "catchRare"
  | "catchMythic"
  | "tick";

const STORAGE_KEY = "blink:sound:enabled";

// Broadcast on window whenever the enabled flag flips, so listeners outside
// this module (e.g. the background-music hook) can react to SoundToggle.
export const SOUND_ENABLED_EVENT = "blink:sound:enabled-changed";

const SOUND_FILES: Record<BlinkSound, string> = {
  awaken: "/sounds/awaken.mp3",
  reveal: "/sounds/reveal.mp3",
  spotted: "/sounds/spotted.mp3",
  nearby: "/sounds/nearby.mp3",
  catchCommon: "/sounds/catchCommon.mp3",
  catchRare: "/sounds/catchRare.mp3",
  catchMythic: "/sounds/catchMythic.mp3",
  tick: "/sounds/tick.mp3",
};

const FALLBACK_VOLUME: Record<BlinkSound, number> = {
  awaken: 0.55,
  reveal: 0.45,
  spotted: 0.4,
  nearby: 0.35,
  catchCommon: 0.55,
  catchRare: 0.6,
  catchMythic: 0.75,
  tick: 0.25,
};

type ApproachRarity = "common" | "uncommon" | "rare" | "legendary" | "mythic";

type ApproachNodes = {
  base: OscillatorNode;
  fifth: OscillatorNode;
  shimmer: OscillatorNode;
  master: GainNode;
  baseGain: GainNode;
  fifthGain: GainNode;
  shimmerGain: GainNode;
  filter: BiquadFilterNode;
  intensity: number;
  rarity: ApproachRarity;
  rampTimer: ReturnType<typeof setTimeout> | null;
};

type RuntimeState = {
  enabled: boolean;
  ctx: AudioContext | null;
  buffers: Map<BlinkSound, AudioBuffer | null>;
  loaded: Set<BlinkSound>;
  reducedMotion: boolean;
  approach: ApproachNodes | null;
};

const state: RuntimeState = {
  enabled: true,
  ctx: null,
  buffers: new Map(),
  loaded: new Set(),
  reducedMotion: false,
  approach: null,
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readEnabled(): boolean {
  if (!isBrowser()) return true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return true;
    return stored === "1";
  } catch {
    return true;
  }
}

function writeEnabled(v: boolean): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  } catch {
    /* no-op */
  }
}

function reducedMotionMatches(): boolean {
  if (!isBrowser() || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function ensureContext(): AudioContext | null {
  if (!isBrowser()) return null;
  if (state.ctx) return state.ctx;
  const AnyWindow = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = AnyWindow.AudioContext ?? AnyWindow.webkitAudioContext;
  if (!Ctor) return null;
  try {
    state.ctx = new Ctor();
  } catch {
    state.ctx = null;
  }
  return state.ctx;
}

async function loadSound(name: BlinkSound): Promise<void> {
  if (!isBrowser() || state.loaded.has(name)) return;
  state.loaded.add(name);
  const ctx = ensureContext();
  if (!ctx) return;
  try {
    const res = await fetch(SOUND_FILES[name]);
    if (!res.ok) {
      state.buffers.set(name, null);
      return;
    }
    const arr = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(arr);
    state.buffers.set(name, buf);
  } catch {
    state.buffers.set(name, null);
  }
}

function playBuffer(name: BlinkSound, volume: number): boolean {
  const ctx = state.ctx;
  const buf = state.buffers.get(name);
  if (!ctx || !buf) return false;
  try {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(ctx.destination);
    src.start();
    return true;
  } catch {
    return false;
  }
}

function playSynthetic(name: BlinkSound, volume: number): void {
  const ctx = ensureContext();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* no-op */
  }
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);

  const tone = (
    freq: number,
    start: number,
    dur: number,
    type: OscillatorType = "sine",
    gain = 1,
  ) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + start);
    g.gain.setValueAtTime(0, now + start);
    g.gain.linearRampToValueAtTime(gain, now + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    osc.connect(g).connect(master);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.05);
  };

  switch (name) {
    case "awaken":
      tone(196.0, 0.0, 1.2, "sine", 0.9);
      tone(392.0, 0.1, 1.4, "triangle", 0.6);
      tone(587.33, 0.55, 1.0, "sine", 0.55);
      tone(783.99, 0.9, 0.9, "sine", 0.4);
      break;
    case "reveal":
      tone(659.25, 0.0, 0.4, "triangle", 0.55);
      tone(987.77, 0.08, 0.5, "sine", 0.45);
      tone(1318.51, 0.18, 0.55, "sine", 0.35);
      break;
    case "spotted":
      tone(1244.51, 0.0, 0.18, "sine", 0.55);
      tone(1864.66, 0.06, 0.2, "triangle", 0.3);
      break;
    case "nearby":
      // heart-beat: two soft thumps
      tone(110.0, 0.0, 0.12, "sine", 0.9);
      tone(73.42, 0.0, 0.16, "triangle", 0.55);
      tone(110.0, 0.22, 0.1, "sine", 0.7);
      tone(73.42, 0.22, 0.14, "triangle", 0.45);
      break;
    case "catchCommon":
      tone(523.25, 0.0, 0.25, "sine", 0.6);
      tone(659.25, 0.1, 0.3, "sine", 0.5);
      tone(783.99, 0.2, 0.4, "sine", 0.4);
      break;
    case "catchRare":
      tone(587.33, 0.0, 0.5, "triangle", 0.55);
      tone(880.0, 0.12, 0.55, "sine", 0.5);
      tone(1174.66, 0.24, 0.55, "sine", 0.4);
      tone(1760.0, 0.4, 0.5, "sine", 0.3);
      break;
    case "catchMythic":
      tone(110.0, 0.0, 1.6, "sawtooth", 0.35);
      tone(220.0, 0.05, 1.6, "triangle", 0.4);
      tone(440.0, 0.2, 1.4, "sine", 0.5);
      tone(880.0, 0.4, 1.2, "sine", 0.45);
      tone(1318.51, 0.7, 1.0, "sine", 0.35);
      tone(1760.0, 0.95, 0.9, "sine", 0.3);
      break;
    case "tick":
      tone(2093.0, 0.0, 0.06, "square", 0.4);
      break;
  }
}

function preloadAll(): void {
  if (!isBrowser()) return;
  const names = Object.keys(SOUND_FILES) as BlinkSound[];
  const run = () => {
    void Promise.all(names.map((n) => loadSound(n)));
  };
  const ric = (
    window as unknown as {
      requestIdleCallback?: (cb: () => void) => number;
    }
  ).requestIdleCallback;
  if (typeof ric === "function") ric(run);
  else window.setTimeout(run, 1200);
}

/* ── Approach hum (continuous, intensity-driven) ───────────────────── */

// Rarity-tinted base frequencies. Lower & dirtier = common; higher & purer = mythic.
const APPROACH_PROFILE: Record<
  ApproachRarity,
  { base: number; fifthRatio: number; shimmerRatio: number; maxGain: number; filterMax: number }
> = {
  common: { base: 92, fifthRatio: 1.5, shimmerRatio: 2.0, maxGain: 0.22, filterMax: 900 },
  uncommon: { base: 104, fifthRatio: 1.5, shimmerRatio: 2.01, maxGain: 0.26, filterMax: 1100 },
  rare: { base: 118, fifthRatio: 1.5, shimmerRatio: 2.0, maxGain: 0.3, filterMax: 1500 },
  legendary: { base: 138, fifthRatio: 1.5, shimmerRatio: 2.005, maxGain: 0.34, filterMax: 2000 },
  mythic: { base: 156, fifthRatio: 1.5, shimmerRatio: 2.01, maxGain: 0.38, filterMax: 2600 },
};

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function applyApproachIntensity(): void {
  const a = state.approach;
  const ctx = state.ctx;
  if (!a || !ctx) return;
  const i = clamp01(a.intensity);
  const profile = APPROACH_PROFILE[a.rarity];
  const now = ctx.currentTime;
  const target = i * profile.maxGain;
  // Smooth ramp ~250ms — short enough to feel responsive, long enough to avoid clicks.
  const t = now + 0.25;
  a.master.gain.cancelScheduledValues(now);
  a.master.gain.setValueAtTime(a.master.gain.value, now);
  a.master.gain.linearRampToValueAtTime(target, t);

  // Filter opens as intensity rises; the shimmer/fifth come up later.
  a.filter.frequency.cancelScheduledValues(now);
  a.filter.frequency.setValueAtTime(a.filter.frequency.value, now);
  a.filter.frequency.linearRampToValueAtTime(
    360 + (profile.filterMax - 360) * i,
    t,
  );

  // Shimmer kicks in past ~0.5 intensity, fifth past ~0.3.
  const shimmerAmt = Math.max(0, (i - 0.5) * 2);
  const fifthAmt = Math.max(0, (i - 0.3) * 1.4);
  a.shimmerGain.gain.cancelScheduledValues(now);
  a.shimmerGain.gain.setValueAtTime(a.shimmerGain.gain.value, now);
  a.shimmerGain.gain.linearRampToValueAtTime(0.35 * shimmerAmt, t);
  a.fifthGain.gain.cancelScheduledValues(now);
  a.fifthGain.gain.setValueAtTime(a.fifthGain.gain.value, now);
  a.fifthGain.gain.linearRampToValueAtTime(0.55 * fifthAmt, t);
}

function startApproachHum(rarity: ApproachRarity, intensity: number): void {
  if (!isBrowser()) return;
  initOnce();
  if (!state.enabled || state.reducedMotion) return;
  const ctx = ensureContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      void ctx.resume();
    } catch {
      /* no-op */
    }
  }

  // If already humming with the same rarity, just update intensity.
  if (state.approach && state.approach.rarity === rarity) {
    state.approach.intensity = clamp01(intensity);
    applyApproachIntensity();
    return;
  }

  // Different rarity (or no hum yet): tear down + rebuild so the timbre changes.
  if (state.approach) stopApproachHumImmediate();

  const profile = APPROACH_PROFILE[rarity];
  try {
    const master = ctx.createGain();
    master.gain.value = 0; // we'll ramp up
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 360;
    filter.Q.value = 0.7;
    master.connect(filter).connect(ctx.destination);

    const base = ctx.createOscillator();
    base.type = "sine";
    base.frequency.value = profile.base;
    const baseGain = ctx.createGain();
    baseGain.gain.value = 0.85;
    base.connect(baseGain).connect(master);

    const fifth = ctx.createOscillator();
    fifth.type = "triangle";
    fifth.frequency.value = profile.base * profile.fifthRatio;
    // tiny detune so it shimmers rather than beats hard
    fifth.detune.value = -6;
    const fifthGain = ctx.createGain();
    fifthGain.gain.value = 0;
    fifth.connect(fifthGain).connect(master);

    const shimmer = ctx.createOscillator();
    shimmer.type = "sine";
    shimmer.frequency.value = profile.base * profile.shimmerRatio;
    shimmer.detune.value = 8;
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0;
    shimmer.connect(shimmerGain).connect(master);

    base.start();
    fifth.start();
    shimmer.start();

    state.approach = {
      base,
      fifth,
      shimmer,
      master,
      baseGain,
      fifthGain,
      shimmerGain,
      filter,
      intensity: clamp01(intensity),
      rarity,
      rampTimer: null,
    };
    applyApproachIntensity();
  } catch {
    state.approach = null;
  }
}

function stopApproachHumImmediate(): void {
  const a = state.approach;
  const ctx = state.ctx;
  if (!a || !ctx) {
    state.approach = null;
    return;
  }
  try {
    const now = ctx.currentTime;
    a.master.gain.cancelScheduledValues(now);
    a.master.gain.setValueAtTime(a.master.gain.value, now);
    a.master.gain.linearRampToValueAtTime(0.0001, now + 0.4);
    const stopAt = now + 0.45;
    a.base.stop(stopAt);
    a.fifth.stop(stopAt);
    a.shimmer.stop(stopAt);
  } catch {
    /* no-op */
  }
  if (a.rampTimer) clearTimeout(a.rampTimer);
  state.approach = null;
}

let initialised = false;
function initOnce(): void {
  if (initialised || !isBrowser()) return;
  initialised = true;
  state.enabled = readEnabled();
  state.reducedMotion = reducedMotionMatches();
  if (typeof window.matchMedia === "function") {
    try {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      const listener = (e: MediaQueryListEvent) => {
        state.reducedMotion = e.matches;
      };
      if (typeof mq.addEventListener === "function") {
        mq.addEventListener("change", listener);
      }
    } catch {
      /* no-op */
    }
  }
  const resume = () => {
    const ctx = ensureContext();
    if (ctx && ctx.state === "suspended") void ctx.resume();
  };
  window.addEventListener("pointerdown", resume, { once: true });
  window.addEventListener("keydown", resume, { once: true });
  preloadAll();
}

export const sounds = {
  play(name: BlinkSound, volume?: number): void {
    if (!isBrowser()) return;
    initOnce();
    if (!state.enabled || state.reducedMotion) return;
    const v = typeof volume === "number" ? volume : FALLBACK_VOLUME[name];
    const ctx = ensureContext();
    if (ctx && ctx.state === "suspended") {
      try {
        void ctx.resume();
      } catch {
        /* no-op */
      }
    }
    if (!playBuffer(name, v)) {
      playSynthetic(name, v);
    }
  },
  setEnabled(enabled: boolean): void {
    if (!isBrowser()) return;
    initOnce();
    state.enabled = enabled;
    writeEnabled(enabled);
    try {
      window.dispatchEvent(new CustomEvent(SOUND_ENABLED_EVENT, { detail: { enabled } }));
    } catch {
      /* no-op */
    }
  },
  get enabled(): boolean {
    if (!isBrowser()) return true;
    initOnce();
    return state.enabled;
  },
  init(): void {
    initOnce();
  },
  /**
   * Set the continuous approach-hum intensity in [0,1]. Starts the hum on
   * first call, smoothly ramps thereafter. Pass a `rarity` to retint the
   * timbre (which forces a brief restart). No-op if sound is disabled.
   */
  setApproachIntensity(intensity: number, rarity: ApproachRarity = "common"): void {
    if (!isBrowser()) return;
    initOnce();
    if (!state.enabled || state.reducedMotion) {
      // If the user disabled sound after we started, make sure we stop.
      if (state.approach) stopApproachHumImmediate();
      return;
    }
    if (!state.approach || state.approach.rarity !== rarity) {
      startApproachHum(rarity, intensity);
      return;
    }
    state.approach.intensity = Math.max(0, Math.min(1, intensity));
    applyApproachIntensity();
  },
  stopApproachHum(): void {
    if (!isBrowser()) return;
    stopApproachHumImmediate();
  },
};

export type { ApproachRarity };
