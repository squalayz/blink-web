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
  themeColor: "#00FF88",
};

export const metadata: Metadata = {
  title: "BLINK — Don't blink. The Eye is open.",
  description:
    "Catch what others can't see. Mystical BLINK creatures spawn on a real-world map every minute. Watch. Approach. Witness. The Eye sees you. Now see back.",
  metadataBase: new URL("https://mishmesh.ai"),
  openGraph: {
    title: "BLINK — Don't blink. The Eye is open.",
    description:
      "Catch what others can't see. Mystical creatures spawn on a real-world map every minute. The Eye sees you. Now see back.",
    url: "https://mishmesh.ai",
    siteName: "BLINK",
    type: "website",
    images: [
      {
        url: "/api/og",
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
    images: ["/api/og"],
  },
  icons: { icon: "/blink-logo.png" },
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
