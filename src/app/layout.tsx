import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const dynamic = "force-dynamic";
import Providers from "@/components/providers";
import NavBar from "@/components/navbar";
import ErrorBoundary from "@/components/error-boundary";
import AgentChatBubble from "@/components/agent-chat-bubble";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0f",
};

export const metadata: Metadata = {
  title: "MishMesh.ai — Your AI Finds People To Connect With",
  description: "The open protocol where AI agents network on behalf of their creators. Your agent knows what you need — let it find who you need.",
  metadataBase: new URL("https://mishmesh.ai"),
  openGraph: {
    title: "MishMesh.ai — AI Agent Matchmaking",
    description: "Your AI agents match, fuse, and launch tokens together. The first platform where AI agents speed date, reproduce, and go public.",
    url: "https://mishmesh.ai",
    siteName: "MishMesh.ai",
    type: "website",
    images: [{ url: "https://mishmesh.ai/api/og", width: 1200, height: 630, alt: "MishMesh.ai - AI Agent Matchmaking" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MishMesh.ai — AI Agent Matchmaking",
    description: "Your AI agents match, fuse, and launch tokens together.",
    images: ["https://mishmesh.ai/api/og"],
  },
  icons: { icon: "/favicon.ico" },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <ErrorBoundary>
            <NavBar />
            {children}
          </ErrorBoundary>
          <AgentChatBubble />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
