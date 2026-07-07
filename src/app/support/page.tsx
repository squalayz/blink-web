import type { Metadata } from "next";
import MarketingShell, { Section, P, GlassPanel, GreenLink } from "../marketing-shell";

export const metadata: Metadata = {
  title: "Support — BlinkWorld",
  description:
    "Need a hand with BlinkWorld? Email our support team and browse quick answers to common questions.",
};

const GREEN = "#4AE88A";
const GREEN_LIGHT = "#7DF5AE";

const FAQS = [
  {
    q: "When does BlinkWorld launch?",
    a: "We're polishing the final beta now. iPhone launches first on the App Store, with Google Play close behind.",
  },
  {
    q: "Is it free?",
    a: "Yes — free to download and free to play.",
  },
  {
    q: "What are Blink Orbs?",
    a: "Blink Orbs are in-game collectible points you gather by exploring. They're just for fun inside BlinkWorld — they are not money, have no monetary value, and can't be traded or sold.",
  },
  {
    q: "Does BlinkWorld track my location?",
    a: "Your location powers the map only while you play. Anything shared publicly is always blurred to a wide area.",
  },
  {
    q: "How do I delete my account?",
    a: "Right in the app: open your profile, go to Settings, and choose Delete Account. It's permanent and takes effect immediately.",
  },
];

export default function SupportPage() {
  return (
    <MarketingShell
      title="Help & Contact"
      intro="Stuck, curious, or found something odd on your adventure? We're real people and we'd love to help."
    >
      <GlassPanel>
        <div style={{ textAlign: "center", padding: "10px 0 14px" }}>
          <P style={{ fontSize: 16, marginBottom: 20 }}>
            The fastest way to reach us is email. We reply within 1&ndash;2
            business days — usually sooner.
          </P>
          <a
            href="mailto:support@blinkworld.xyz"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 34px",
              height: 54,
              borderRadius: 999,
              background: `linear-gradient(92deg, ${GREEN_LIGHT}, ${GREEN})`,
              color: "#05060C",
              fontFamily: "'Space Grotesk', 'Inter', sans-serif",
              fontSize: 16,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 4px 28px rgba(74,232,138,0.45)",
            }}
          >
            Email us
          </a>
          <P style={{ marginTop: 16, marginBottom: 0, fontSize: 14 }}>
            support@blinkworld.xyz
          </P>
        </div>
      </GlassPanel>

      <Section title="Quick answers">
        {FAQS.map((f) => (
          <div key={f.q} style={{ marginBottom: 18 }}>
            <h3
              style={{
                fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                fontSize: 16,
                fontWeight: 700,
                color: "#FFFFFF",
                margin: "0 0 6px",
              }}
            >
              {f.q}
            </h3>
            <P style={{ marginBottom: 0 }}>{f.a}</P>
          </div>
        ))}
      </Section>

      <Section title="When you write in">
        <P>
          Include your username and, if it helps, what you were doing when
          something went sideways — it lets us fix things much faster. For
          anything about your data, see our{" "}
          <GreenLink href="/privacy">Privacy Policy</GreenLink>; for the rules of
          the road, see our <GreenLink href="/terms">Terms of Use</GreenLink>.
        </P>
      </Section>
    </MarketingShell>
  );
}
