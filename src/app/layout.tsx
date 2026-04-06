import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const dynamic = "force-dynamic";
import Providers from "@/components/providers";
import AppShell from "@/components/AppShell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#6366f1",
};

export const metadata: Metadata = {
  title: "MishMesh — Drop. Hunt. Crack.",
  description:
    "Real crypto hidden at GPS locations worldwide. Drop SOL, ETH, BTC & NFTs as Orbs anywhere on Earth. Walk to them. Crack them. Keep what's inside.",
  metadataBase: new URL("https://mishmesh.ai"),
  openGraph: {
    title: "MishMesh — Drop. Hunt. Crack.",
    description:
      "Real crypto hidden at GPS locations worldwide. Drop SOL, ETH, BTC & NFTs as Orbs anywhere on Earth. Walk to them. Crack them. Keep what's inside.",
    url: "https://mishmesh.ai",
    siteName: "MishMesh",
    type: "website",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "MishMesh — Drop. Hunt. Crack. Real crypto hidden at GPS locations worldwide.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MishMesh — Drop. Hunt. Crack.",
    description:
      "Real crypto hidden at GPS locations worldwide. Drop SOL, ETH, BTC & NFTs. Walk to them. Crack them. Keep what's inside.",
    images: ["/api/og"],
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
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Providers><AppShell>{children}</AppShell></Providers>
        <Analytics />
      </body>
    </html>
  );
}
