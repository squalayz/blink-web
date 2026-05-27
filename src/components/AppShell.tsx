"use client";

import { usePathname } from "next/navigation";
import BottomNav, { SIDEBAR_WIDTH } from "./BottomNav";
import PortfolioBar from "./PortfolioBar";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { C } from "@/lib/theme";

const SHOW_SHELL_PATHS = ["/watch", "/live", "/spawn", "/messages", "/profile", "/council", "/wallet", "/missions", "/tasks", "/squads", "/market", "/trails", "/travel", "/map", "/friends", "/gifts"];
const HIDE_SHELL_PREFIXES = ["/onboarding", "/auth", "/catch", "/orb"];

function shouldShowShell(pathname: string): boolean {
  if (HIDE_SHELL_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  if (SHOW_SHELL_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  return false;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showShell = shouldShowShell(pathname);
  const { isDesktop, isTablet } = useIsDesktop();

  if (!showShell) {
    return <>{children}</>;
  }

  // Watch & Map are full-screen — no padding, just overlay the nav
  const isWatch = pathname === "/watch" || pathname.startsWith("/watch/");
  const isMap = pathname === "/map" || pathname.startsWith("/map/");

  if (isWatch || isMap) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: C.bg,
          ...(isDesktop ? { paddingLeft: SIDEBAR_WIDTH } : {}),
        } as React.CSSProperties}
      >
        {children}
        <BottomNav />
      </div>
    );
  }

  const contentMaxWidth = isDesktop ? 1200 : isTablet ? 640 : 480;

  /* ===== DESKTOP: Sidebar left, content right ===== */
  if (isDesktop) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex" } as React.CSSProperties}>
        <BottomNav />
        {/* Content area: offset by sidebar width */}
        <div style={{ flex: 1, marginLeft: SIDEBAR_WIDTH, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <PortfolioBar />
          <div style={{ flex: 1, paddingTop: "calc(60px + max(env(safe-area-inset-top, 0px), var(--blink-top-inset, 0px)))", overflow: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            <div style={{ maxWidth: contentMaxWidth, margin: "0 auto", width: "100%", padding: "0 24px" }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== MOBILE / TABLET: Top bar + bottom nav ===== */
  return (
    <div style={{ minHeight: "100vh", minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column" } as React.CSSProperties}>
      <PortfolioBar />
      <div style={{ flex: 1, paddingTop: "calc(60px + max(env(safe-area-inset-top, 0px), var(--blink-top-inset, 0px)))", paddingBottom: 88, overflow: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
        <div style={{ maxWidth: contentMaxWidth, margin: "0 auto", width: "100%" }}>
          {children}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
