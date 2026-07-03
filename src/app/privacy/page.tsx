import { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - BlinkWorld",
  description:
    "BlinkWorld privacy policy - How we handle your data in our location-based AR creature-catching game",
};

const GREEN = "#00FF88";
const BG = "#0a0a0f";
const WHITE = "#FFFFFF";
const MUTED = "#8a8a99";
const BORDER = "rgba(0,255,136,0.14)";

const h2Style: CSSProperties = {
  fontFamily: "Space Grotesk, Inter, sans-serif",
  fontSize: 20,
  fontWeight: 700,
  color: WHITE,
  margin: "36px 0 12px",
};

const h3Style: CSSProperties = {
  fontFamily: "Space Grotesk, Inter, sans-serif",
  fontSize: 16,
  fontWeight: 700,
  color: WHITE,
  margin: "20px 0 6px",
};

const pStyle: CSSProperties = {
  color: MUTED,
  fontSize: 15,
  lineHeight: 1.7,
  margin: "0 0 12px",
};

const ulStyle: CSSProperties = {
  color: MUTED,
  fontSize: 15,
  lineHeight: 1.7,
  margin: "0 0 12px",
  paddingLeft: 22,
};

function Strong({ children }: { children: ReactNode }) {
  return <strong style={{ color: WHITE, fontWeight: 700 }}>{children}</strong>;
}

export default function PrivacyPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: BG,
        color: WHITE,
        fontFamily: "Inter, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: "clamp(32px, 6vw, 64px) clamp(20px, 5vw, 32px) 64px",
        }}
      >
        <h1
          style={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontSize: "clamp(28px, 5vw, 38px)",
            fontWeight: 900,
            letterSpacing: "-0.02em",
            margin: "0 0 8px",
            textShadow: "0 0 32px rgba(0,255,136,0.25)",
          }}
        >
          BlinkWorld Privacy Policy
        </h1>
        <p style={{ color: MUTED, fontSize: 14, margin: "0 0 32px" }}>
          Effective Date: May 30, 2026 &middot; Last updated: July 2, 2026
        </p>

        <p style={pStyle}>
          Welcome to BlinkWorld! We respect your privacy and want you to
          understand how we handle your information. This policy explains what
          data we collect, why we need it, and how we protect it.
        </p>

        <section>
          <h2 style={h2Style}>What Information We Collect</h2>

          <h3 style={h3Style}>1. Your Location (While Playing)</h3>
          <p style={pStyle}>
            We access your precise location only when the app is open and
            you&rsquo;re playing. We use this to show creatures, Power Spots,
            and other players near you on the game map. We do NOT sell your
            location data, use it for ads, or keep a history of where
            you&rsquo;ve been.
          </p>

          <h3 style={h3Style}>2. Device Identifier</h3>
          <p style={pStyle}>
            We use a unique identifier for your device to save your game
            progress (creatures, candy, points, trophy rating) and sync social
            features. We do NOT use this for advertising or to track you across
            other apps.
          </p>

          <h3 style={h3Style}>3. Camera (During AR Duels)</h3>
          <p style={pStyle}>
            When you battle in AR mode, we access your camera to place
            creatures in the real world. The camera feed is processed live on
            your device. We do NOT store, save, or upload any camera images.
          </p>

          <h3 style={h3Style}>4. Game Account Information</h3>
          <p style={pStyle}>If you use social features, we store:</p>
          <ul style={ulStyle}>
            <li>Your in-game username</li>
            <li>Trainer code</li>
            <li>Trophy rating</li>
            <li>Friends list</li>
            <li>Battle results</li>
          </ul>
          <p style={pStyle}>
            This lets us show leaderboards and allows friends to challenge you.
          </p>

          <h3 style={h3Style}>5. Gameplay Data</h3>
          <p style={pStyle}>
            We save your game progress including creatures caught, items
            collected, points earned, and battle history. This is essential to
            running the game.
          </p>

          <h3 style={h3Style}>6. Crash Reports (TestFlight Only)</h3>
          <p style={pStyle}>
            If you&rsquo;re testing via Apple TestFlight, Apple may share crash
            logs with us to help fix bugs.
          </p>
        </section>

        <section>
          <h2 style={h2Style}>What We DON&rsquo;T Do</h2>
          <ul style={ulStyle}>
            <li>We do NOT use advertising tracking or collect your Ad ID</li>
            <li>We do NOT track you across other apps or websites</li>
            <li>We do NOT sell your personal data to anyone</li>
            <li>
              We do NOT access your photos or microphone. Contacts and Apple
              Health data are only read with your explicit permission &mdash;
              contacts are matched using scrambled one-way fingerprints (your
              raw contact list never leaves your device), and Health data is
              described below.
            </li>
          </ul>
        </section>

        <section>
          <h2 style={h2Style}>Contacts (Friend Matching)</h2>
          <p style={pStyle}>
            Friend matching is optional. If you grant Contacts permission, the
            BLINK iOS app helps you find friends who already play &mdash;
            without your contact list ever leaving your device.
          </p>
          <ul style={ulStyle}>
            <li>
              Contacts access is only requested with your explicit permission
            </li>
            <li>
              Phone numbers and emails are converted to scrambled one-way
              fingerprints (hashes) on your device &mdash; your raw contact
              list never leaves your phone
            </li>
            <li>
              These fingerprints are used only to show you which of your
              friends already play BLINK
            </li>
            <li>
              Contact fingerprints are never sold and never used for
              advertising
            </li>
          </ul>
          <p style={pStyle}>
            You can revoke this permission at any time in iOS Settings &rarr;
            Privacy &amp; Security &rarr; Contacts.
          </p>
        </section>

        <section>
          <h2 style={h2Style}>Apple Health (HealthKit)</h2>
          <p style={pStyle}>
            The BLINK iOS app reads step counts and workout data from Apple
            Health, and only with your explicit permission. We use this data
            solely to calculate your activity-based BLINK rewards.
          </p>
          <ul style={ulStyle}>
            <li>HealthKit data is processed on your device</li>
            <li>We never write data back to Apple Health</li>
            <li>
              HealthKit data is never shared with or sold to third parties
            </li>
            <li>
              HealthKit data is never used for advertising or marketing
            </li>
          </ul>
          <p style={pStyle}>
            You can revoke this permission at any time in iOS Settings &rarr;
            Health &rarr; Data Access.
          </p>
        </section>

        <section>
          <h2 style={h2Style}>Blockchain &amp; Wallet Data</h2>
          <p style={pStyle}>
            You may connect or generate a crypto wallet to use BLINK rewards.
            If you do, we store the public wallet address linked to your
            account.
          </p>
          <ul style={ulStyle}>
            <li>
              Blockchain transactions (catches, claims, and rewards in $BLINK)
              are recorded on public blockchains such as Ethereum. These
              records are permanent, publicly visible, and outside our
              deletion control.
            </li>
            <li>We never have access to your private keys</li>
            <li>Wallet addresses are not used for advertising</li>
          </ul>
        </section>

        <section>
          <h2 style={h2Style}>Who We Share With (Third-Party Services)</h2>
          <p style={pStyle}>
            We only share your data with service providers who help run the
            game:
          </p>
          <ul style={ulStyle}>
            <li>
              <Strong>Supabase:</Strong> Our database and authentication
              provider that stores your account and game data
            </li>
            <li>
              <Strong>Mapbox:</Strong> Provides the game map; receives location
              data needed to render the map around you
            </li>
            <li>
              <Strong>Vercel:</Strong> Hosts our website and services
            </li>
            <li>
              <Strong>Apple:</Strong> For Sign in with Apple and Apple Health
              (HealthKit) where applicable, plus app distribution through the
              App Store and TestFlight crash reports
            </li>
          </ul>
          <p style={pStyle}>
            Each service receives only the data needed to provide its
            function. We do not sell your personal data.
          </p>
        </section>

        <section>
          <h2 style={h2Style}>How Long We Keep Your Data</h2>
          <p style={pStyle}>
            We keep your account and game data as long as you play BlinkWorld.
            If you want to delete your account and all associated data, email
            us at diamondautob@gmail.com from the email associated with your
            account.
          </p>
        </section>

        <section>
          <h2 style={h2Style}>Your Privacy Rights</h2>
          <p style={pStyle}>You have the right to:</p>
          <ul style={ulStyle}>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your data</li>
            <li>Opt out of data sales (though we don&rsquo;t sell your data)</li>
          </ul>
          <p style={pStyle}>
            To exercise these rights, contact us at diamondautob@gmail.com.
          </p>
        </section>

        <section>
          <h2 style={h2Style}>Children&rsquo;s Privacy</h2>
          <p style={pStyle}>
            BlinkWorld is not intended for children under 13. We do not
            knowingly collect personal information from children under 13. If
            we discover we&rsquo;ve collected data from a child under 13, we
            will delete it immediately.
          </p>
        </section>

        <section>
          <h2 style={h2Style}>Data Security</h2>
          <p style={pStyle}>
            We use industry-standard security measures to protect your data,
            including encryption for data transmission and secure servers for
            storage. However, no system is 100% secure, and we cannot guarantee
            absolute security.
          </p>
        </section>

        <section>
          <h2 style={h2Style}>Changes to This Policy</h2>
          <p style={pStyle}>
            We may update this privacy policy from time to time. When we do,
            we&rsquo;ll change the date at the top. Continued use of BlinkWorld
            after changes means you accept the updated policy.
          </p>
        </section>

        <section>
          <h2 style={h2Style}>Contact Us</h2>
          <p style={pStyle}>
            If you have questions about this privacy policy or how we handle
            your data, please contact us:
          </p>
          <p style={{ ...pStyle, marginBottom: 0 }}>
            <Strong>Pasquale Celi</Strong>
            <br />
            Email: diamondautob@gmail.com
            <br />
            Governing Law: United States
          </p>
        </section>

        <div
          style={{
            marginTop: 48,
            paddingTop: 32,
            borderTop: `1px solid ${BORDER}`,
          }}
        >
          <Link
            href="/"
            style={{
              color: GREEN,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            &larr; Back to Game
          </Link>
        </div>
      </div>
    </main>
  );
}
