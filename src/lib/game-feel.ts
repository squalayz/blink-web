"use client";

const STORAGE_KEY = "blink:sound:enabled";

export const HAPTIC = {
  TAP: 25,
  PROXIMITY: 50,
  WIND_UP: [40, 80, 40] as number[],
  CATCH_SUCCESS: [80, 60, 80, 120, 200] as number[],
  MYTHIC_CATCH: [100, 80, 100, 80, 100, 80, 300] as number[],
  ERROR: [120, 60, 120] as number[],
};

export type GameFeelSound = "ping" | "catch" | "mythic" | "approach";

type Ctx = {
  ctx: AudioContext | null;
  master: GainNode | null;
  approachLoop: ApproachLoopHandle | null;
  muted: boolean;
  inited: boolean;
};

const state: Ctx = {
  ctx: null,
  master: null,
  approachLoop: null,
  muted: false,
  inited: false,
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readMuted(): boolean {
  if (!isBrowser()) return false;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === null) return false;
    return v === "0";
  } catch {
    return false;
  }
}

function writeMuted(muted: boolean): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? "0" : "1");
  } catch {
    /* no-op */
  }
}

function ensureCtx(): AudioContext | null {
  if (!isBrowser()) return null;
  if (state.ctx) return state.ctx;
  const W = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = W.AudioContext ?? W.webkitAudioContext;
  if (!Ctor) return null;
  try {
    state.ctx = new Ctor();
    state.master = state.ctx.createGain();
    state.master.gain.value = 1;
    state.master.connect(state.ctx.destination);
  } catch {
    state.ctx = null;
    state.master = null;
  }
  return state.ctx;
}

function initOnce(): void {
  if (state.inited || !isBrowser()) return;
  state.inited = true;
  state.muted = readMuted();
  const resume = () => {
    const c = ensureCtx();
    if (c && c.state === "suspended") {
      try {
        void c.resume();
      } catch {
        /* no-op */
      }
    }
  };
  window.addEventListener("pointerdown", resume, { once: true });
  window.addEventListener("keydown", resume, { once: true });
  window.addEventListener("touchstart", resume, { once: true });
}

export function haptic(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate !== "function") return;
  try {
    nav.vibrate(pattern);
  } catch {
    /* no-op */
  }
}

function tone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  gain: number,
): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now + start);
  g.gain.setValueAtTime(0, now + start);
  g.gain.linearRampToValueAtTime(gain, now + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
  osc.connect(g).connect(dest);
  osc.start(now + start);
  osc.stop(now + start + dur + 0.05);
}

function playOneShot(name: GameFeelSound, volume: number): void {
  const ctx = ensureCtx();
  if (!ctx || !state.master) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* no-op */
  }
  const out = ctx.createGain();
  out.gain.value = volume;
  out.connect(state.master);

  switch (name) {
    case "ping":
      tone(ctx, out, 800, 0, 0.08, "sine", 0.8);
      tone(ctx, out, 1200, 0.02, 0.08, "triangle", 0.4);
      break;
    case "catch":
      tone(ctx, out, 1200, 0.0, 0.18, "sine", 0.65);
      tone(ctx, out, 1500, 0.12, 0.18, "sine", 0.55);
      tone(ctx, out, 1800, 0.24, 0.32, "sine", 0.5);
      break;
    case "mythic":
      tone(ctx, out, 220, 0.0, 1.5, "triangle", 0.45);
      tone(ctx, out, 440, 0.05, 1.5, "sine", 0.5);
      tone(ctx, out, 880, 0.2, 1.4, "sine", 0.45);
      tone(ctx, out, 1320, 0.45, 1.2, "sine", 0.4);
      tone(ctx, out, 1800, 0.7, 1.0, "sine", 0.32);
      break;
    case "approach":
      tone(ctx, out, 200, 0.0, 0.25, "sine", 0.7);
      tone(ctx, out, 140, 0.16, 0.25, "triangle", 0.5);
      break;
  }
}

export function playSound(name: GameFeelSound, volume = 0.5): void {
  if (!isBrowser()) return;
  initOnce();
  if (state.muted) return;
  try {
    playOneShot(name, volume);
  } catch {
    /* no-op */
  }
}

export function setSoundMuted(muted: boolean): void {
  if (!isBrowser()) return;
  initOnce();
  state.muted = muted;
  writeMuted(muted);
  if (muted) {
    stopApproachLoop();
  }
}

export function isSoundMuted(): boolean {
  if (!isBrowser()) return false;
  initOnce();
  return state.muted;
}

type ApproachLoopHandle = {
  gain: GainNode;
  intervalId: ReturnType<typeof setInterval>;
  stopped: boolean;
};

function stopApproachLoop(): void {
  if (!state.approachLoop) return;
  const h = state.approachLoop;
  h.stopped = true;
  clearInterval(h.intervalId);
  try {
    const ctx = state.ctx;
    if (ctx) {
      const now = ctx.currentTime;
      h.gain.gain.cancelScheduledValues(now);
      h.gain.gain.setValueAtTime(h.gain.gain.value, now);
      h.gain.gain.linearRampToValueAtTime(0, now + 0.25);
      window.setTimeout(() => {
        try {
          h.gain.disconnect();
        } catch {
          /* no-op */
        }
      }, 400);
    } else {
      h.gain.disconnect();
    }
  } catch {
    /* no-op */
  }
  state.approachLoop = null;
}

/**
 * Start a looping low-volume heartbeat. Volume is the target after fade-in.
 * Safe to call repeatedly — already-running loops have their target volume updated.
 */
export function startApproachLoop(volume: number): void {
  if (!isBrowser()) return;
  initOnce();
  if (state.muted) return;
  const ctx = ensureCtx();
  if (!ctx || !state.master) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* no-op */
  }
  const clamped = Math.max(0, Math.min(1, volume));
  if (state.approachLoop && !state.approachLoop.stopped) {
    const now = ctx.currentTime;
    state.approachLoop.gain.gain.cancelScheduledValues(now);
    state.approachLoop.gain.gain.setValueAtTime(state.approachLoop.gain.gain.value, now);
    state.approachLoop.gain.gain.linearRampToValueAtTime(clamped, now + 0.6);
    return;
  }
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(state.master);
  const now0 = ctx.currentTime;
  gain.gain.linearRampToValueAtTime(clamped, now0 + 0.8);

  const tick = () => {
    if (!state.approachLoop || state.approachLoop.stopped) return;
    try {
      tone(ctx, gain, 200, 0.0, 0.22, "sine", 0.8);
      tone(ctx, gain, 140, 0.14, 0.22, "triangle", 0.55);
    } catch {
      /* no-op */
    }
  };
  tick();
  const intervalId = setInterval(tick, 900);
  state.approachLoop = { gain, intervalId, stopped: false };
}

export function setApproachVolume(volume: number): void {
  if (!state.approachLoop || state.approachLoop.stopped) return;
  const ctx = state.ctx;
  if (!ctx) return;
  const clamped = Math.max(0, Math.min(1, volume));
  const now = ctx.currentTime;
  try {
    state.approachLoop.gain.gain.cancelScheduledValues(now);
    state.approachLoop.gain.gain.setValueAtTime(state.approachLoop.gain.gain.value, now);
    state.approachLoop.gain.gain.linearRampToValueAtTime(clamped, now + 0.6);
  } catch {
    /* no-op */
  }
}

export function stopApproach(): void {
  stopApproachLoop();
}

export function isApproachRunning(): boolean {
  return !!(state.approachLoop && !state.approachLoop.stopped);
}

export function prefersReducedMotion(): boolean {
  if (!isBrowser() || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
