import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

import Providers from "@/components/providers";
import AppShell from "@/components/AppShell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#00FF88",
};

export const metadata: Metadata = {
  title: "BLINK — Don't blink. The Eye is open.",
  description:
    "Catch what others can't see. Mystical BLINK creatures spawn on a real-world map every minute. Watch. Approach. Witness. The Eye sees you. Now see back.",
  metadataBase: new URL("https://blinkworld.xyz"),
  openGraph: {
    title: "BLINK — Don't blink. The Eye is open.",
    description:
      "Catch what others can't see. Mystical creatures spawn on a real-world map every minute. The Eye sees you. Now see back.",
    url: "https://blinkworld.xyz",
    siteName: "BLINK",
    type: "website",
    images: [
      {
        url: "https://blinkworld.xyz/og-image.jpg",
        width: 1280,
        height: 720,
        alt: "BLINK — Catch glowing B orbs in the real world",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BLINK — Don't blink. The Eye is open.",
    description:
      "Catch what others can't see. Mystical creatures spawn on a real-world map every minute.",
    images: ["https://blinkworld.xyz/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/logo-orb-glow.png", sizes: "784x800", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
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
        <link
          rel="preload"
          as="image"
          href="/brand/logo-orb-glow.png"
          fetchPriority="high"
        />
      </head>
      <body>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <Providers><AppShell>{children}</AppShell></Providers>
        <Analytics />
      </body>
    </html>
  );
}
