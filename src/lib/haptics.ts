"use client";

const STORAGE_KEY = "blink:haptics:enabled";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

function supportsVibrate(): boolean {
  if (!isBrowser()) return false;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  return typeof nav.vibrate === "function";
}

function enabled(): boolean {
  if (!isBrowser()) return true;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

function fire(pattern: number | number[]): void {
  if (!supportsVibrate() || !enabled()) return;
  try {
    (navigator as Navigator & { vibrate: (p: number | number[]) => boolean }).vibrate(pattern);
  } catch {
    /* iOS Safari + locked-down browsers: silent no-op */
  }
}

export function pulseSoft(): void {
  fire(18);
}

export function pulseSharp(): void {
  fire([24, 40, 60]);
}

export function pulsePattern(pattern: number[]): void {
  fire(pattern);
}

export function setHapticsEnabled(v: boolean): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  } catch {
    /* no-op */
  }
}

export function hapticsAvailable(): boolean {
  return supportsVibrate();
}
