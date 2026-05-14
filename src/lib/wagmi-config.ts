import { getDefaultConfig, type Theme } from "@rainbow-me/rainbowkit";
import { base, mainnet, polygon, arbitrum } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "BLINK",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "blink-default",
  chains: [mainnet, base, polygon, arbitrum],
  ssr: true,
});

// BLINK-branded RainbowKit theme: deep black panels, neon-green accents.
// Replaces the default white modal so it matches the cinematic signin.
export const blinkRainbowTheme: Theme = {
  blurs: {
    modalOverlay: "blur(16px)",
  },
  colors: {
    accentColor: "#00FF88",
    accentColorForeground: "#0a0a0f",
    actionButtonBorder: "rgba(0,255,136,0.18)",
    actionButtonBorderMobile: "rgba(0,255,136,0.18)",
    actionButtonSecondaryBackground: "rgba(0,255,136,0.08)",
    closeButton: "#FFFFFF",
    closeButtonBackground: "rgba(255,255,255,0.06)",
    connectButtonBackground: "#0d0d14",
    connectButtonBackgroundError: "#EF4444",
    connectButtonInnerBackground: "#1a1a24",
    connectButtonText: "#FFFFFF",
    connectButtonTextError: "#FFFFFF",
    connectionIndicator: "#00FF88",
    downloadBottomCardBackground: "#0d0d14",
    downloadTopCardBackground: "#1a1a24",
    error: "#EF4444",
    generalBorder: "rgba(0,255,136,0.18)",
    generalBorderDim: "rgba(0,255,136,0.10)",
    menuItemBackground: "rgba(0,255,136,0.06)",
    modalBackdrop: "rgba(5,5,9,0.82)",
    modalBackground: "#0a0a0f",
    modalBorder: "rgba(0,255,136,0.22)",
    modalText: "#FFFFFF",
    modalTextDim: "#8a8a99",
    modalTextSecondary: "#FFFFFF",
    profileAction: "rgba(0,255,136,0.10)",
    profileActionHover: "rgba(0,255,136,0.18)",
    profileForeground: "#0d0d14",
    selectedOptionBorder: "#00FF88",
    standby: "#88FF00",
  },
  fonts: {
    body: "'Inter', system-ui, sans-serif",
  },
  radii: {
    actionButton: "12px",
    connectButton: "12px",
    menuButton: "12px",
    modal: "20px",
    modalMobile: "20px",
  },
  shadows: {
    connectButton: "0 0 24px rgba(0,255,136,0.25)",
    dialog: "0 30px 90px rgba(0,0,0,0.6), 0 0 80px rgba(0,255,136,0.22)",
    profileDetailsAction: "0 0 12px rgba(0,255,136,0.18)",
    selectedOption: "0 0 12px rgba(0,255,136,0.45)",
    selectedWallet: "0 0 16px rgba(0,255,136,0.45)",
    walletLogo: "0 0 12px rgba(0,255,136,0.30)",
  },
};
