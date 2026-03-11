"use client";

import HuntTabView from "@/components/HuntTabView";
import MobileTabBar from "@/components/mobile-tab-bar";

export default function HuntPage() {
  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f", color: "#e8e8f0",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Outfit', sans-serif",
      paddingTop: 64, overflowX: "hidden", isolation: "isolate",
    }}>
      <HuntTabView />
      <div style={{ height: 96 }} />
      <MobileTabBar
        activeTab="hunt"
        onTabChange={(tab) => {
          if (tab === "hunt") return;
          const routes: Record<string, string> = {
            mesh: "/dashboard?tab=mesh",
            feed: "/dashboard?tab=feed",
            discover: "/dashboard?tab=discover",
            wallet: "/dashboard?tab=wallet",
            agent: "/dashboard?tab=agent",
          };
          window.location.href = routes[tab] || "/dashboard";
        }}
        hotCount={0}
      />
    </div>
  );
}
