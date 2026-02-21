import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "MishMesh.ai",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "mishmesh-default",
  chains: [base],
  ssr: true,
});
