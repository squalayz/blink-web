"use client";

// First-run walkthrough — the web mirror of the iOS app's funnel
// (RootView.swift): sign-in → cinematic 4-slide walkthrough → map.
// New accounts land here from the homepage's "Continue"; the homepage's
// "How it works" link replays it for anyone, signed in or not.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import OnboardingWalkthrough, { ONBOARDING_STORAGE_KEY } from "@/components/OnboardingWalkthrough";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [phase, setPhase] = useState<"loading" | "show">("loading");

  // Display is decided from localStorage alone — never blocked on the auth
  // session resolving. Auth state only influences where "Enter the World"
  // lands (below).
  useEffect(() => {
    const replay = new URLSearchParams(window.location.search).has("replay");
    if (!replay && localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true") {
      router.replace("/map");
    } else {
      setPhase("show");
    }
  }, [router]);

  if (phase === "loading") {
    return <div style={{ position: "fixed", inset: 0, background: "#0a0a0f" }} />;
  }

  // Signed-in (or unknown) → the map; definitely logged-out explorers → back
  // to the homepage to join.
  const done = () => router.replace(!loading && !user ? "/" : "/map");
  return <OnboardingWalkthrough onComplete={done} />;
}
