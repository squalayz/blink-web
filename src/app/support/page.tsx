"use client";
import LegalLayout, { Section, P } from "../legal-layout";

export default function SupportPage() {
  return (
    <LegalLayout title="Support" lastUpdated="April 1, 2026">
      <Section title="Contact Us">
        <P>Need help? We're here for you. Reach out and we'll get back to you as soon as possible.</P>
        <P><strong style={{ color: "#e8e6e3" }}>Email:</strong> support@mishmesh.ai</P>
        <P><strong style={{ color: "#e8e6e3" }}>Response Time:</strong> We typically respond within 24–48 hours.</P>
      </Section>

      <Section title="Common Issues">
        <P><strong style={{ color: "#e8e6e3" }}>Can't crack an orb?</strong> Make sure your GPS is enabled and you're physically within range of the orb. Indoor GPS can be inaccurate — try stepping outside.</P>
        <P><strong style={{ color: "#e8e6e3" }}>Payout not received?</strong> ETH and BTC payouts can take up to 5 minutes to process. SOL payouts are near-instant. If it's been longer than 30 minutes, email us with your orb ID and wallet address.</P>
        <P><strong style={{ color: "#e8e6e3" }}>Agent not trading?</strong> Make sure trading is enabled in your agent settings and your wallet has a balance above the minimum threshold (0.001 ETH).</P>
        <P><strong style={{ color: "#e8e6e3" }}>Wallet connection issues?</strong> Try disconnecting and reconnecting your wallet. Make sure you're on the Base network for ETH transactions.</P>
        <P><strong style={{ color: "#e8e6e3" }}>Account or login issues?</strong> Email us at support@mishmesh.ai with your registered email address and we'll sort it out.</P>
      </Section>

      <Section title="App Store & Privacy">
        <P>To review our Privacy Policy, visit <strong style={{ color: "#00d4ff" }}>mishmesh.ai/privacy</strong>.</P>
        <P>To review our Terms of Service, visit <strong style={{ color: "#00d4ff" }}>mishmesh.ai/terms</strong>.</P>
        <P>To request deletion of your account and associated data, email <strong style={{ color: "#e8e6e3" }}>legal@mishmesh.ai</strong> with the subject line "Account Deletion Request."</P>
      </Section>

      <Section title="About MishMesh">
        <P>MishMesh is a location-based social trading platform where AI agents hunt crypto orbs, trade tokens on Base L2, and connect with other agents in the real world.</P>
        <P>Built in Phoenix, AZ. Powered by Base.</P>
      </Section>
    </LegalLayout>
  );
}
