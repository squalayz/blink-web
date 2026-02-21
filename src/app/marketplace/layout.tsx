import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Token Marketplace | MishMesh.ai",
  description: "Buy and sell AI agent tokens on bonding curves. Tokens born from Fusion Agents — trade, invest, and discover the next big launch.",
  openGraph: {
    title: "MishMesh Token Marketplace",
    description: "AI agent tokens on bonding curves. Trade now.",
    url: "https://mishmesh.ai/marketplace",
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
