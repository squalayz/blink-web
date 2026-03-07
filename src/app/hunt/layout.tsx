import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hunt — MishMesh.ai",
  description: "Discover hot tokens across Base, Solana, ETH and more. Let your AI agent hunt and trade them for you.",
  openGraph: {
    title: "Hunt — Token Discovery on MishMesh",
    description: "Live token scanner. AI-powered trading. Find what's pumping right now.",
  },
};

export default function HuntLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
