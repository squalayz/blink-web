"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import SoundToggle from "./SoundToggle";
import { sounds } from "@/lib/sounds";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sounds.init();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Telegram WebApp safe-area: TG's chrome (back button, title) overlaps web
  // content. We need a minimum top inset regardless of what the WebApp SDK
  // reports — some TG client versions return 0/undefined for safeAreaInset.
  useEffect(() => {
    function detectTg(): boolean {
      // Strict detection: require a real Telegram WebApp signal, not just a
      // mention of the word "Telegram" in some other context. Non-TG mobile
      // browsers (Instagram IAB, Safari) must NOT get the 90px top-padding.
      const w = window as any;
      const tg = w?.Telegram?.WebApp;
      // initData is only populated when actually launched as a TG WebApp.
      if (tg && typeof tg.initData === "string" && tg.initData.length > 0) return true;
      if (w?.TelegramWebviewProxy) return true;
      if (w?.TelegramWebview) return true;
      try {
        const hash = window.location.hash || "";
        const search = window.location.search || "";
        // tgWebAppData / tgWebAppPlatform are TG-specific URL params.
        if (hash.includes("tgWebAppData") || search.includes("tgWebAppData")) return true;
        if (hash.includes("tgWebAppPlatform") || search.includes("tgWebAppPlatform")) return true;
      } catch { /* noop */ }
      return false;
    }

    function applyTgInset() {
      const w = window as any;
      const tg = w?.Telegram?.WebApp;
      const isTg = detectTg();

      if (isTg) {
        document.body.setAttribute("data-tg-webapp", "1");
      } else {
        document.body.removeAttribute("data-tg-webapp");
      }

      let inset = 0;
      if (tg) {
        try { tg.ready?.(); tg.expand?.(); } catch { /* noop */ }
        const safeTop = tg.safeAreaInset?.top ?? 0;
        const contentTop = tg.contentSafeAreaInset?.top ?? 0;
        inset = safeTop + contentTop;
      }
      // Floor at 90 whenever we have any TG signal. iOS Telegram's status bar +
      // native title bar totals ~80-90px and many TG client versions report 0
      // for safeAreaInset even though that chrome is drawn over the viewport.
      if (isTg) inset = Math.max(inset, 90);
      document.documentElement.style.setProperty("--blink-top-inset", `${inset}px`);
    }

    applyTgInset();
    // The TG script can load after this effect runs (e.g. <Script strategy="afterInteractive">),
    // so re-check a couple of times and on window load.
    const t1 = window.setTimeout(applyTgInset, 250);
    const t2 = window.setTimeout(applyTgInset, 1500);
    window.addEventListener("load", applyTgInset);

    const tg = (window as any)?.Telegram?.WebApp;
    if (tg?.onEvent) {
      tg.onEvent("safeAreaChanged", applyTgInset);
      tg.onEvent("contentSafeAreaChanged", applyTgInset);
      tg.onEvent("viewportChanged", applyTgInset);
    }
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("load", applyTgInset);
      const tgCleanup = (window as any)?.Telegram?.WebApp;
      if (tgCleanup?.offEvent) {
        tgCleanup.offEvent("safeAreaChanged", applyTgInset);
        tgCleanup.offEvent("contentSafeAreaChanged", applyTgInset);
        tgCleanup.offEvent("viewportChanged", applyTgInset);
      }
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      <SoundToggle />
      {children}
    </AuthContext.Provider>
  );
}
