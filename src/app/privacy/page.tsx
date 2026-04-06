"use client";
import LegalLayout, { Section, P } from "../legal-layout";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="March 30, 2026">
      <Section title="1. Introduction">
        <P>MishMesh ("we," "us," "our") is committed to protecting your privacy. This Privacy Policy explains what data we collect, how we use it, and your rights regarding your personal information. By using the Platform, you consent to the practices described herein.</P>
      </Section>

      <Section title="2. Data We Collect">
        <P><strong style={{color:"#e8e6e3"}}>Account Information:</strong> Name, email address, username, profile photo, and any profile information you choose to provide (bio, social handles).</P>
        <P><strong style={{color:"#e8e6e3"}}>Wallet Addresses:</strong> Your connected cryptocurrency wallet addresses (Solana, Ethereum, Bitcoin). Wallet addresses are public on their respective blockchains. We store your wallet address to associate it with your account.</P>
        <P><strong style={{color:"#e8e6e3"}}>Location Data:</strong> Precise GPS coordinates from your device. Location data is required for core Platform functionality, including placing and discovering Orbs, verifying proximity for Orb cracking and task completion, and displaying nearby Orbs and tasks on the map. Location data is stored in association with Orbs you create, tasks you post or complete, and stories you share.</P>
        <P><strong style={{color:"#e8e6e3"}}>Camera and Photos:</strong> Photos and images you capture or upload for task proof submission and Stories. Photos may include embedded metadata (EXIF data including location and timestamp).</P>
        <P><strong style={{color:"#e8e6e3"}}>Orb and Task Data:</strong> Details of Orbs you create or crack, tasks you post or complete, transaction amounts, timestamps, and completion status.</P>
        <P><strong style={{color:"#e8e6e3"}}>Social and Crew Data:</strong> Crew memberships, Stories you post, Arena participation, and interactions with other users.</P>
        <P><strong style={{color:"#e8e6e3"}}>Activity History:</strong> Your activity on the Platform, including Orbs cracked, tasks completed, NFTs earned, and reputation data.</P>
        <P><strong style={{color:"#e8e6e3"}}>Technical Data:</strong> IP address, browser type, device information, operating system, and access times, collected automatically for security and analytics purposes.</P>
      </Section>

      <Section title="3. Data We Do NOT Collect or Store">
        <P><strong style={{color:"#e8e6e3"}}>Private Keys:</strong> MishMesh is fully non-custodial. We never have access to, store, or transmit your wallet private keys, seed phrases, or recovery phrases.</P>
        <P><strong style={{color:"#e8e6e3"}}>Payment Card Data:</strong> We do not collect or store credit card numbers, bank account details, or any traditional payment information. All transactions occur on-chain through your connected wallet.</P>
      </Section>

      <Section title="4. How We Use Your Data">
        <P>Your data is used to: operate and improve the Platform; display Orbs and tasks on the map based on your location; verify your physical proximity to Orbs and task locations; process and record on-chain transactions; facilitate task proof submission and dispute resolution; deliver social features (Crews, Stories, Arena); mint and deliver NFT rewards; send push notifications (with your consent); comply with legal obligations; and detect and prevent fraud, GPS spoofing, and other prohibited conduct.</P>
      </Section>

      <Section title="5. Third-Party Data Processors">
        <P>We use the following third-party services to operate the Platform:</P>
        <P><strong style={{color:"#e8e6e3"}}>Supabase</strong> — Database hosting, authentication, and file storage (including task proof photos and story media).</P>
        <P><strong style={{color:"#e8e6e3"}}>Vercel</strong> — Application hosting and serverless functions.</P>
        <P><strong style={{color:"#e8e6e3"}}>Pinata</strong> — IPFS pinning service for NFT metadata and decentralized content storage.</P>
        <P>Blockchain transactions are recorded on public networks (Solana, Ethereum, Bitcoin). Wallet addresses and transaction details are publicly visible on the respective blockchains. We do not control blockchain data once a transaction is broadcast.</P>
      </Section>

      <Section title="6. Data Sharing">
        <P>We do not sell, rent, or trade your personal information to third parties for marketing or advertising purposes. We may share data with law enforcement if required by valid legal process, or to protect the safety and security of our users and the Platform.</P>
      </Section>

      <Section title="7. Analytics">
        <P>We collect anonymous, aggregated usage analytics to understand how the Platform is used and to improve our services. Analytics data does not include personally identifiable information. We do not use tracking cookies for advertising purposes.</P>
      </Section>

      <Section title="8. Push Notifications">
        <P>MishMesh may send push notifications to your device for events such as: an Orb you dropped being cracked, task acceptance or completion updates, dispute outcomes, Crew activity, and Arena events. Push notifications are opt-in. You may enable or disable them at any time through your device settings or in-app preferences.</P>
      </Section>

      <Section title="9. Data Retention">
        <P><strong style={{color:"#e8e6e3"}}>Stories:</strong> Stories are automatically deleted 24 hours after posting.</P>
        <P><strong style={{color:"#e8e6e3"}}>Account Data:</strong> We retain your personal data for as long as your account is active. Upon account deletion request, we will delete your personal data within 30 days, except where retention is required by law or for legitimate business purposes (e.g., transaction records for tax compliance).</P>
        <P><strong style={{color:"#e8e6e3"}}>Blockchain Data:</strong> On-chain transactions (including wallet addresses and transfer amounts) are permanent and cannot be deleted by MishMesh or any party.</P>
        <P><strong style={{color:"#e8e6e3"}}>Task Proof Photos:</strong> Retained for 90 days after task completion for dispute resolution purposes, then deleted.</P>
      </Section>

      <Section title="10. Data Security">
        <P>We implement industry-standard security measures including: HTTPS encryption for all data in transit, encryption at rest for stored data, row-level security policies in our database, and access controls limiting data access to authorized services only.</P>
        <P>However, no method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security of your data.</P>
      </Section>

      <Section title="11. Your Rights (GDPR)">
        <P>If you are located in the European Economic Area (EEA), United Kingdom, or other jurisdiction with similar data protection laws, you have the following rights:</P>
        <P><strong style={{color:"#e8e6e3"}}>Access:</strong> You may request a copy of all personal data we hold about you.</P>
        <P><strong style={{color:"#e8e6e3"}}>Correction:</strong> You may update or correct your personal data through your account settings or by contacting us.</P>
        <P><strong style={{color:"#e8e6e3"}}>Deletion:</strong> You may request complete deletion of your account and associated data.</P>
        <P><strong style={{color:"#e8e6e3"}}>Portability:</strong> You may request a full export of your data in a machine-readable format.</P>
        <P><strong style={{color:"#e8e6e3"}}>Restriction:</strong> You may request that we restrict processing of your personal data in certain circumstances.</P>
        <P><strong style={{color:"#e8e6e3"}}>Objection:</strong> You may object to the processing of your personal data for certain purposes.</P>
        <P>For EU/EEA residents: You have the right to lodge a complaint with your local data protection authority.</P>
      </Section>

      <Section title="12. Your Rights (CCPA)">
        <P>If you are a California resident, you have the following rights under the California Consumer Privacy Act:</P>
        <P><strong style={{color:"#e8e6e3"}}>Right to Know:</strong> You may request disclosure of the categories and specific pieces of personal information we have collected about you.</P>
        <P><strong style={{color:"#e8e6e3"}}>Right to Delete:</strong> You may request deletion of your personal information, subject to certain exceptions.</P>
        <P><strong style={{color:"#e8e6e3"}}>Right to Opt-Out:</strong> We do not sell personal information. As such, this right is automatically satisfied.</P>
        <P><strong style={{color:"#e8e6e3"}}>Non-Discrimination:</strong> We will not discriminate against you for exercising any of your CCPA rights.</P>
      </Section>

      <Section title="13. International Data Transfers">
        <P>Your data may be processed in the United States and other jurisdictions where our service providers operate. By using the Platform, you consent to such transfers. We ensure appropriate safeguards are in place for international data transfers in compliance with applicable data protection laws.</P>
      </Section>

      <Section title="14. Children's Privacy">
        <P>The Platform is not intended for users under 18 years of age. We do not knowingly collect personal data from minors. If you believe a minor has provided us with personal data, please contact us and we will delete such data promptly.</P>
      </Section>

      <Section title="15. Changes to This Policy">
        <P>We may update this Privacy Policy from time to time. We will notify active users of material changes via email or in-app notification at least 14 days before the changes take effect. Continued use of the Platform after changes constitutes acceptance of the updated policy.</P>
      </Section>

      <Section title="16. Contact">
        <P>For privacy-related inquiries, data requests, or complaints, please contact: legal@mishmesh.ai.</P>
      </Section>
    </LegalLayout>
  );
}
