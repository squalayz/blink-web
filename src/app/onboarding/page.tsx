"use client";

// First-run walkthrough — the web mirror of the iOS app's funnel
// (RootView.swift): sign-in → cinematic 4-slide walkthrough → map.
// Completion is tracked PER ACCOUNT on this device (exactly like the
// app's blink.walkthrough.v2.completedUserIds), so every new trainer
// who signs up sees the intro once — even on a device where someone
// else already finished it. "How it works" (?replay) shows it to
// anyone without marking anything.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import OnboardingWalkthrough, {
  hasCompletedWalkthrough,
  markWalkthroughComplete,
} from "@/components/OnboardingWalkthrough";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [phase, setPhase] = useState<"loading" | "firstRun" | "replay">("loading");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("replay")) {
      setPhase("replay");
      return;
    }
    // First-run gating needs to know WHO is signed in (per-account flag),
    // so wait for the session to resolve.
    if (loading) return;
    if (!user) {
      // The app only shows the walkthrough after sign-in — send explorers
      // back to the homepage to join first.
      router.replace("/");
      return;
    }
    if (hasCompletedWalkthrough(user.id)) {
      router.replace("/map");
    } else {
      setPhase("firstRun");
    }
  }, [router, user, loading]);

  if (phase === "loading") {
    return <div style={{ position: "fixed", inset: 0, background: "#0a0a0f" }} />;
  }

  if (phase === "replay") {
    // Replay never marks completion (the app's .replay mode). Signed-in
    // (or unknown) → the map; definitely logged-out → the homepage.
    return (
      <OnboardingWalkthrough
        mode="replay"
        onComplete={() => router.replace(!loading && !user ? "/" : "/map")}
      />
    );
  }

  return (
    <OnboardingWalkthrough
      mode="firstRun"
      onComplete={() => {
        if (user) markWalkthroughComplete(user.id);
        router.replace("/map");
      }}
    />
  );
}
