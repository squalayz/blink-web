"use client";
import LegalLayout, { Section, P } from "../legal-layout";

export default function SupportPage() {
  return (
    <LegalLayout title="Support" lastUpdated="April 1, 2026">
      <Section title="Contact Us">
        <P>Need help? We&apos;re here for you. Reach out and we&apos;ll get back to you as soon as possible.</P>
        <P><strong style={{ color: "#FFFFFF" }}>Email:</strong> support@blinkworld.com</P>
        <P><strong style={{ color: "#FFFFFF" }}>Response Time:</strong> We typically respond within 24&ndash;48 hours.</P>
      </Section>

      <Section title="Common Issues">
        <P><strong style={{ color: "#FFFFFF" }}>Can&apos;t witness a Creature?</strong> Make sure your GPS is enabled and you&apos;re physically within range of the spawn point. Indoor GPS can be inaccurate &mdash; try stepping outside.</P>
        <P><strong style={{ color: "#FFFFFF" }}>Catch not recorded?</strong> Catches sync to The Eye within a few seconds. If your trail still hasn&apos;t updated after a few minutes, email us with your Watcher handle and the approximate spawn time.</P>
        <P><strong style={{ color: "#FFFFFF" }}>The Eye Map looks empty?</strong> Creatures spawn in waves at real coordinates. Walk a few blocks, refresh, and check your location permissions for BLINK.</P>
        <P><strong style={{ color: "#FFFFFF" }}>Wallet connection issues?</strong> Try disconnecting and reconnecting your wallet. $BLINK token rewards are coming &mdash; your wallet links your trail to future rewards.</P>
        <P><strong style={{ color: "#FFFFFF" }}>Account or login issues?</strong> Email us at support@blinkworld.com with your registered email address and we&apos;ll sort it out.</P>
      </Section>

      <Section title="App Store & Privacy">
        <P>To review our Privacy Policy, visit <strong style={{ color: "#00FF88" }}>blinkworld.com/privacy</strong>.</P>
        <P>To review our Terms of Service, visit <strong style={{ color: "#00FF88" }}>blinkworld.com/terms</strong>.</P>
        <P>To request deletion of your account and associated data, email <strong style={{ color: "#FFFFFF" }}>legal@blinkworld.com</strong> with the subject line &ldquo;Account Deletion Request.&rdquo;</P>
      </Section>

      <Section title="About BLINK">
        <P>BLINK is a location-based catching game. Creatures spawn at real-world GPS coordinates. Watchers approach, witness and catch them through The Eye, building trails and earning standing in The Council. $BLINK token rewards are coming.</P>
        <P>Don&apos;t blink. The Eye is open.</P>
      </Section>
    </LegalLayout>
  );
}
