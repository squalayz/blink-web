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
        url: "/og-battle.jpg",
        width: 1200,
        height: 630,
        alt: "BLINK — Don't blink. The Eye is open.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BLINK — Don't blink. The Eye is open.",
    description:
      "Catch what others can't see. Mystical creatures spawn on a real-world map every minute.",
    images: ["/og-battle.jpg"],
  },
  icons: { icon: "/blink-logo.webp" },
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
          href="/blink-logo.webp"
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
