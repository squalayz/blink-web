// ════════════════════════════════════════════════════════════════════════════
// BLINK — wagmi config for the on-chain claim flow.
// Two real connectors, no mocks: injected (MetaMask & other browser wallets)
// and the Coinbase Wallet SDK. Mainnet only — $BLINK lives on Ethereum.
// ════════════════════════════════════════════════════════════════════════════

import { createConfig, http, injected } from "wagmi";
import { mainnet } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";

const RPC_URL =
  process.env.NEXT_PUBLIC_ETH_RPC_URL || "https://ethereum-rpc.publicnode.com";

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "BLINK" }),
  ],
  transports: {
    [mainnet.id]: http(RPC_URL),
  },
  ssr: true,
});
