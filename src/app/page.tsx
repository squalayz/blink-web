import type { Metadata } from "next";
import LandingPage from "./landing-page";

const TITLE = "BlinkWorld — Walk. Catch. Explore. Battle.";
const DESCRIPTION =
  "Turn every walk into an adventure. Catch fantastic creatures in AR, crack open hidden treasure chests, and explore a living map of your real neighborhood. Coming soon to iPhone and Android.";

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
