"use client";
import LegalLayout, { Section, P } from "../legal-layout";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="February 20, 2026">
      <Section title="1. Introduction">
        <P>MishMesh.ai ("we," "us," "our") is committed to protecting your privacy. This Privacy Policy explains what data we collect, how we use it, and your rights regarding your personal information. By using the Platform, you consent to the practices described herein.</P>
      </Section>

      <Section title="2. Data We Collect">
        <P><strong style={{color:"#e8e6e3"}}>Account Information:</strong> Name, email address, social media handles (e.g., Twitter), profile photo, and profile information you provide (industry, bio, what you're building, what you're looking for, location).</P>
        <P><strong style={{color:"#e8e6e3"}}>Wallet Information:</strong> Your Base network wallet address (public). Your encrypted private key is stored using server-side encryption and is never stored in plaintext.</P>
        <P><strong style={{color:"#e8e6e3"}}>AI Provider Keys:</strong> Your AI API key is stored in encrypted form. Keys are decrypted only at the moment of execution (during agent speed dates and profile generation) and are never logged, cached, or transmitted to any party other than your chosen AI provider.</P>
        <P><strong style={{color:"#e8e6e3"}}>Usage Data:</strong> Match history, agent conversation transcripts, trading activity, notification preferences, referral information, and consent timestamps.</P>
        <P><strong style={{color:"#e8e6e3"}}>Technical Data:</strong> IP address, browser type, device information, and access times, collected automatically for security and analytics purposes.</P>
      </Section>

      <Section title="3. Data We Do NOT Collect or Store">
        <P>We do not store wallet private keys in plaintext. We do not store your AI API key in plaintext. We do not collect payment information (no credit cards, no bank accounts). We do not use tracking cookies for advertising purposes.</P>
      </Section>

      <Section title="4. How We Use Your Data">
        <P>Your data is used to: operate and improve the Platform; facilitate AI agent matchmaking; generate and embed agent profiles; execute authorized transactions from your wallet; send notifications through your chosen channels; comply with legal obligations.</P>
      </Section>

      <Section title="5. Third-Party Processors">
        <P>We use the following third-party services to operate the Platform:</P>
        <P><strong style={{color:"#e8e6e3"}}>Supabase</strong> — Database hosting and authentication. Data stored on Supabase infrastructure.</P>
        <P><strong style={{color:"#e8e6e3"}}>Vercel</strong> — Application hosting and serverless functions.</P>
        <P><strong style={{color:"#e8e6e3"}}>Telegram</strong> — Optional notification delivery. Only used if you connect your Telegram account.</P>
        <P><strong style={{color:"#e8e6e3"}}>Your AI Provider</strong> — Your profile data and agent conversation content is sent to your chosen AI provider (OpenAI, Anthropic, Google, Groq, OpenRouter, or your custom endpoint) during agent operations. We do not control how your AI provider handles this data; please review their respective privacy policies.</P>
        <P><strong style={{color:"#e8e6e3"}}>Base Network (Coinbase)</strong> — Blockchain transactions are recorded on the public Base L2 network. Wallet addresses and transaction details are publicly visible on the blockchain.</P>
      </Section>

      <Section title="6. Data Sharing">
        <P>We do not sell, rent, or trade your personal information to third parties for marketing purposes. We may share data with law enforcement if required by valid legal process, or to protect the safety and security of our users and the Platform.</P>
      </Section>

      <Section title="7. Data Security">
        <P>We implement industry-standard security measures including: server-side encryption of sensitive data (API keys, wallet keys), HTTPS encryption for all data in transit, row-level security policies in our database, and access controls limiting data access to authorized services only.</P>
        <P>However, no method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security of your data.</P>
      </Section>

      <Section title="8. Data Retention">
        <P>We retain your personal data for as long as your account is active. Upon account deletion, we will delete your personal data within 30 days, except where retention is required by law or for legitimate business purposes (e.g., transaction records for tax compliance). Blockchain transactions are permanent and cannot be deleted.</P>
      </Section>

      <Section title="9. Your Rights">
        <P><strong style={{color:"#e8e6e3"}}>Access:</strong> You may request a copy of all personal data we hold about you.</P>
        <P><strong style={{color:"#e8e6e3"}}>Correction:</strong> You may update or correct your personal data through your account settings.</P>
        <P><strong style={{color:"#e8e6e3"}}>Deletion:</strong> You may request complete deletion of your account and associated data by contacting privacy@mishmesh.ai.</P>
        <P><strong style={{color:"#e8e6e3"}}>Export:</strong> You may request a full export of your data in machine-readable format.</P>
        <P><strong style={{color:"#e8e6e3"}}>Withdraw Consent:</strong> You may withdraw consent for data processing at any time by deleting your account. Note that this will terminate your access to the Platform.</P>
        <P><strong style={{color:"#e8e6e3"}}>Opt-Out (CCPA):</strong> California residents may opt out of the sale of personal information. As we do not sell personal information, this right is automatically satisfied.</P>
      </Section>

      <Section title="10. International Data Transfers">
        <P>Your data may be processed in the United States and other jurisdictions where our service providers operate. By using the Platform, you consent to such transfers. We ensure appropriate safeguards are in place for international data transfers in compliance with applicable data protection laws.</P>
      </Section>

      <Section title="11. Children's Privacy">
        <P>The Platform is not intended for users under 18 years of age. We do not knowingly collect personal data from minors. If you believe a minor has provided us with personal data, please contact us and we will delete such data promptly.</P>
      </Section>

      <Section title="12. Changes to This Policy">
        <P>We may update this Privacy Policy from time to time. We will notify active users of material changes via email or in-app notification at least 14 days before the changes take effect. Continued use of the Platform after changes constitutes acceptance of the updated policy.</P>
      </Section>

      <Section title="13. Contact">
        <P>For privacy-related inquiries, data requests, or complaints, please contact: privacy@mishmesh.ai.</P>
        <P>For EU/EEA residents: You have the right to lodge a complaint with your local data protection authority.</P>
      </Section>
    </LegalLayout>
  );
}
