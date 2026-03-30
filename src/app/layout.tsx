import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const dynamic = "force-dynamic";
import Providers from "@/components/providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#9945FF",
};

export const metadata: Metadata = {
  title: "MishMesh — Drop. Hunt. Crack.",
  description:
    "Drop crypto into the world. Hunt it down. Crack it open. MishMesh hides real SOL, tokens, and NFTs at GPS locations on Solana.",
  metadataBase: new URL("https://mishmesh.ai"),
  openGraph: {
    title: "MishMesh — Drop. Hunt. Crack.",
    description:
      "Drop crypto into the world. Hunt it down. Crack it open. Real crypto hidden at GPS locations worldwide.",
    url: "https://mishmesh.ai",
    siteName: "MishMesh",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MishMesh — Drop. Hunt. Crack.",
    description:
      "Drop crypto into the world. Hunt it down. Crack it open.",
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
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
