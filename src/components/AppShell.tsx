"use client";

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";
import PortfolioBar from "./PortfolioBar";

const SHOW_SHELL_PATHS = ["/hunt", "/live", "/drop", "/messages", "/profile", "/leaderboard", "/wallet", "/missions", "/tasks", "/squads"];
const HIDE_SHELL_PREFIXES = ["/onboarding", "/auth", "/crack", "/orb"];

function shouldShowShell(pathname: string): boolean {
  if (HIDE_SHELL_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  if (SHOW_SHELL_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  return false;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showShell = shouldShowShell(pathname);

  if (!showShell) {
    return <>{children}</>;
  }

  // Hunt is full-screen map — no padding, just overlay the nav
  const isHunt = pathname === "/hunt" || pathname.startsWith("/hunt/");

  if (isHunt) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#0A0A0F" } as React.CSSProperties}>
        {children}
        <BottomNav />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", minHeight: "100dvh", background: "#0A0A0F", display: "flex", flexDirection: "column" } as React.CSSProperties}>
      <PortfolioBar />
      <div style={{ flex: 1, paddingTop: 52, paddingBottom: 88, overflow: "auto", WebkitOverflowScrolling: "touch" }}>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
