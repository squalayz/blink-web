import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, mainnet, polygon, arbitrum } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "MishMesh.ai",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "mishmesh-default",
  chains: [mainnet, base, polygon, arbitrum],
  ssr: true,
});
