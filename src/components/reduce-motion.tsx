"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const C = { dim:"#2a2a3a", muted:"#6b6b80", warn:"#f59e0b", match:"#30d158" };

// ═══ REDUCE MOTION CONTEXT ═══
interface MotionContextType {
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
  animDuration: string;   // "0.3s" or "0s"
  transition: string;     // Full transition string
}

const MotionContext = createContext<MotionContextType>({
  reduceMotion: false, setReduceMotion: () => {},
  animDuration: "0.3s", transition: "all 0.3s ease",
});

export function useMotion() { return useContext(MotionContext); }

export function MotionProvider({ children }: { children: ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  // Respect OS preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) setReduceMotion(true);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Persist preference
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("mm-reduce-motion");
      if (saved) setReduceMotion(saved === "true");
    } catch {}
  }, []);

  const setAndSave = useCallback((v: boolean) => {
    setReduceMotion(v);
    try { sessionStorage.setItem("mm-reduce-motion", String(v)); } catch {}
  }, []);

  // Inject global CSS override
  useEffect(() => {
    const id = "mm-reduce-motion-style";
    let el = document.getElementById(id);
    if (reduceMotion) {
      if (!el) {
        el = document.createElement("style");
        el.id = id;
        document.head.appendChild(el);
      }
      el.textContent = `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `;
    } else {
      el?.remove();
    }
  }, [reduceMotion]);

  return (
    <MotionContext.Provider value={{
      reduceMotion,
      setReduceMotion: setAndSave,
      animDuration: reduceMotion ? "0s" : "0.3s",
      transition: reduceMotion ? "none" : "all 0.3s ease",
    }}>
      {children}
    </MotionContext.Provider>
  );
}

// ── Settings Toggle ──
export function ReduceMotionToggle() {
  const { reduceMotion, setReduceMotion } = useMotion();
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 0", borderBottom: `1px solid ${C.dim}`,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8f0" }}>♿ Reduce Motion</div>
        <div style={{ fontSize: 11, color: C.muted }}>Replace animations with simple fades</div>
      </div>
      <button onClick={() => setReduceMotion(!reduceMotion)} style={{
        width: 40, height: 22, borderRadius: 11, border: "none",
        cursor: "pointer", background: reduceMotion ? "#6366f1" : C.dim,
        position: "relative", transition: "background 0.2s",
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: "50%", background: "white",
          position: "absolute", top: 2, left: reduceMotion ? 20 : 2,
          transition: "left 0.2s",
        }} />
      </button>
    </div>
  );
}

// ═══ OFFLINE BANNER ═══
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    if (!navigator.onLine) setOffline(true);
    return () => { window.removeEventListener("offline", goOffline); window.removeEventListener("online", goOnline); };
  }, []);

  if (!offline) return null;
  return (
    <div style={{
      position: "fixed", top: 56, left: 0, right: 0, zIndex: 500,
      padding: "6px 16px", background: `${C.warn}15`, borderBottom: `1px solid ${C.warn}33`,
      textAlign: "center", fontSize: 12, color: C.warn, fontWeight: 600,
    }}>
      📡 You're offline. Showing last known data. Updating when reconnected...
    </div>
  );
}

// ═══ SCROLL POSITION MEMORY ═══
export function useScrollMemory(key: string) {
  useEffect(() => {
    // Restore
    try {
      const saved = sessionStorage.getItem(`mm-scroll-${key}`);
      if (saved) window.scrollTo(0, parseInt(saved));
    } catch {}

    // Save on scroll
    let timer: NodeJS.Timeout;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try { sessionStorage.setItem(`mm-scroll-${key}`, String(window.scrollY)); } catch {}
      }, 200);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => { window.removeEventListener("scroll", handler); clearTimeout(timer); };
  }, [key]);
}

// ═══ PREFETCH ON HOVER ═══
export function usePrefetch() {
  const prefetched = new Set<string>();

  return useCallback((url: string) => {
    if (prefetched.has(url)) return;
    prefetched.add(url);
    // Prefetch data
    fetch(url, { method: "GET", headers: { "X-Prefetch": "1" } }).catch(() => {});
  }, []);
}
