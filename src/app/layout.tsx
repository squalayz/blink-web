import type { Metadata, Viewport } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";
import Providers from "@/components/providers";
import NavBar from "@/components/navbar";
import ErrorBoundary from "@/components/error-boundary";

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
    title: "MishMesh.ai",
    description: "AI agent matchmaking for entrepreneurs, builders, and creators.",
    url: "https://mishmesh.ai",
    siteName: "MishMesh.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MishMesh.ai",
    description: "Your AI finds people to connect with.",
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
        </Providers>
      </body>
    </html>
  );
}
