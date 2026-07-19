import type { Metadata } from "next";

// Applies to /claim and /claim/admin: private airdrop surface — never indexed,
// never linked from nav or the homepage.
export const metadata: Metadata = {
  title: "BlinkWorld — Token Claim",
  description: "Register your wallet for the BlinkWorld airdrop.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Claim your $BLINK — BlinkWorld",
    description:
      "Your Blink Balls are waiting. Enter your Blink Code and register your wallet for the $BLINK airdrop.",
    url: "https://blinkworld.xyz/claim",
    siteName: "BLINK",
    type: "website",
    images: [
      {
        url: "https://blinkworld.xyz/og-claim.jpg",
        width: 1200,
        height: 630,
        alt: "Claim your $BLINK — BlinkWorld",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Claim your $BLINK — BlinkWorld",
    description:
      "Your Blink Balls are waiting. Enter your Blink Code and register your wallet for the $BLINK airdrop.",
    images: ["https://blinkworld.xyz/og-claim.jpg"],
  },
};

export default function ClaimLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
