import type { Metadata } from "next";
import LandingPage from "./landing-page";

const TITLE = "BlinkWorld — Turn Every Walk Into an Adventure";
const DESCRIPTION =
  "Hunt glowing orbs, catch 60+ creatures in AR, open treasure chests, and battle friends — all powered by your real steps. Coming soon to the App Store.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://blinkworld.xyz",
    siteName: "BlinkWorld",
    type: "website",
    images: [
      {
        url: "https://blinkworld.xyz/og-image.jpg",
        width: 1280,
        height: 720,
        alt: "BlinkWorld — a glowing night map of your neighborhood with floating creatures",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://blinkworld.xyz/og-image.jpg"],
  },
};

export default function Page() {
  return <LandingPage />;
}
