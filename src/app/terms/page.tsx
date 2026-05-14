"use client";
import LegalLayout, { Section, P } from "../legal-layout";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="March 30, 2026">
      <Section title="1. Agreement to Terms">
        <P>By accessing or using BLINK (&ldquo;Platform,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, you may not use the Platform. These Terms constitute a legally binding agreement between you and BLINK.</P>
      </Section>

      <Section title="2. Eligibility">
        <P>You must be at least 18 years of age to use the Platform. By using BLINK, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into these Terms. If you are using the Platform on behalf of a business or organization, you represent that you have authority to bind that entity to these Terms.</P>
      </Section>

      <Section title="3. Description of Service">
        <P>BLINK is a location-based Creature catching and task marketplace platform. The Platform enables users to:</P>
        <P>(a) <strong style={{color:"#FFFFFF"}}>Spawn Creatures:</strong> Create and place cryptocurrency-loaded Creatures at real-world GPS locations. Creatures contain ETH on Ethereum mainnet that other users can discover and catch.</P>
        <P>(b) <strong style={{color:"#FFFFFF"}}>Witness Creatures:</strong> Discover Creatures on The Eye Map, physically travel to their GPS location, and witness them to catch the cryptocurrency inside.</P>
        <P>(c) <strong style={{color:"#FFFFFF"}}>Task Marketplace:</strong> Post and accept location-based tasks (deliveries, errands, event help, and other jobs). Task posters fund Creatures with crypto as payment; workers travel to the location, complete the task, submit proof, and receive payment.</P>
        <P>(d) <strong style={{color:"#FFFFFF"}}>Social Features:</strong> Create and join Squads, share Stories, participate in Council events, and interact with the BLINK community.</P>
        <P>The Platform is not a financial services provider, broker, investment advisor, or money transmitter. BLINK facilitates peer-to-peer crypto transfers through on-chain transactions only.</P>
      </Section>

      <Section title="4. User Accounts">
        <P>To use BLINK, you must create an account. You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. You may not create multiple accounts, impersonate another person, or use another user&apos;s account.</P>
      </Section>

      <Section title="5. Wallet and Cryptocurrency">
        <P>BLINK is fully non-custodial. You connect your own Ethereum wallet to the Platform. We never have access to your private keys, seed phrases, or the ability to move your funds without your explicit authorization.</P>
        <P>All transactions on BLINK are executed via pre-signed transactions that you authorize through your connected wallet. When you spawn a Creature or fund a Task Creature, you sign a transaction that transfers crypto from your wallet into the on-chain Creature. When another user witnesses the Creature, the crypto is released to their wallet on-chain.</P>
        <P>Supported chain: Ethereum mainnet (ETH). You are solely responsible for ensuring you are connected to the correct network and that your wallet has sufficient funds, including gas/transaction fees.</P>
        <P>You are solely responsible for safeguarding your private keys and wallet credentials. Lost keys cannot be recovered by BLINK.</P>
      </Section>

      <Section title="6. Platform Fees">
        <P>BLINK charges a 10% platform fee on all Creature transactions. This fee is deducted automatically at the time the Creature is witnessed or the task payment is released. The fee is sent to the following platform wallets:</P>
        <P><strong style={{color:"#FFFFFF"}}>Ethereum:</strong> 0x00468c1B22451ed9Fabc9DA32E6aEa28DC03a216</P>
        {/* BLINK: ETH-only — Solana/Bitcoin fee wallet addresses hidden from UI. Underlying constants preserved in src/lib/theme.ts. */}
        <P>Fee structures may change with 30 days&apos; notice to active users. No additional fees are charged on wallet connections or withdrawals.</P>
      </Section>

      <Section title="7. Task Marketplace Rules">
        <P><strong style={{color:"#FFFFFF"}}>Posting Tasks:</strong> When you post a Task Creature, the full payment amount (plus the 10% platform fee) is locked in an on-chain escrow at the time of creation. You must provide a clear description of the task, the GPS location, and any specific requirements.</P>
        <P><strong style={{color:"#FFFFFF"}}>Accepting Tasks:</strong> When you accept a task, you agree to travel to the specified location and complete the work as described. You must submit proof of completion (photo, confirmation, or other evidence as required by the task poster).</P>
        <P><strong style={{color:"#FFFFFF"}}>Proof and Release:</strong> Upon proof submission, the task poster has 48 hours to approve or dispute the completion. If approved (or if no action is taken within 48 hours), payment is automatically released to the worker. If disputed, the matter enters our dispute resolution process.</P>
        <P><strong style={{color:"#FFFFFF"}}>Disputes:</strong> Either party may initiate a dispute within 48 hours of proof submission. Disputes are reviewed by BLINK based on the submitted proof, task description, and any additional evidence provided by both parties. BLINK&apos;s decision on disputes is final. Funds may be returned to the poster, released to the worker, or split, at BLINK&apos;s sole discretion.</P>
        <P><strong style={{color:"#FFFFFF"}}>Cancellation:</strong> Task posters may cancel an unfulfilled task and reclaim escrowed funds (minus gas fees). Once a worker has accepted and begun a task, cancellation requires mutual agreement or dispute resolution.</P>
      </Section>

      <Section title="8. NFT Rewards">
        <P>Users may earn NFT rewards for completing tasks, witnessing Legendary Creatures, and achieving other milestones on the Platform. NFTs are minted on-chain to your connected wallet. NFTs are provided as rewards and recognition only. BLINK makes no representations regarding the value, transferability, or future utility of any NFT. NFT availability, criteria, and design are subject to change at our discretion.</P>
      </Section>

      <Section title="9. Location Data">
        <P>BLINK requires access to your precise GPS location to provide core Platform functionality, including displaying Creatures on The Eye Map, verifying your proximity to Creatures and Task locations, and enabling location-based features. By using the Platform, you consent to the collection and use of your location data as described in our Privacy Policy. You may revoke location access at any time through your device settings, but this will prevent you from using core features of the Platform.</P>
      </Section>

      <Section title="10. Prohibited Conduct">
        <P>You agree not to engage in any of the following:</P>
        <P>(a) GPS spoofing, location falsification, or using any tool or technique to fake your geographic position to catch Creatures or complete tasks without being physically present.</P>
        <P>(b) Submitting fake, manipulated, or misleading proof photos or evidence for task completion.</P>
        <P>(c) Scamming, defrauding, or deceiving other users, whether as a task poster or worker.</P>
        <P>(d) Impersonating another person, business, or entity.</P>
        <P>(e) Creating Creatures or tasks for the purpose of money laundering, fraud, or any illegal activity.</P>
        <P>(f) Using bots, scripts, or automated tools to catch Creatures or complete tasks.</P>
        <P>(g) Harassing, threatening, or abusing other users through the Platform&apos;s social features.</P>
        <P>(h) Posting tasks that involve illegal activities, dangerous work, or that violate any applicable law.</P>
        <P>(i) Attempting to reverse-engineer, exploit, or compromise the Platform&apos;s systems or smart contracts.</P>
        <P>Violation of these rules may result in immediate account suspension or permanent ban, forfeiture of any pending Creature rewards or task payments, and reporting to law enforcement where applicable.</P>
      </Section>

      <Section title="11. Disclaimer of Warranties">
        <P>The Platform is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Platform will be uninterrupted, error-free, or secure. We do not warrant the accuracy of GPS data, map data, or location services. We do not guarantee that any Creature will be available or catchable at any given time. Blockchain transactions are subject to network conditions, congestion, and fees outside our control.</P>
      </Section>

      <Section title="12. Limitation of Liability">
        <P>To the maximum extent permitted by applicable law, BLINK and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, funds, cryptocurrency, or business opportunities, arising from your use of the Platform.</P>
        <P>In no event shall our total liability to you exceed the amount of platform fees you have paid to BLINK in the twelve (12) months preceding the claim.</P>
        <P>The Platform is not liable for: cryptocurrency losses or value fluctuations, failed or delayed blockchain transactions, GPS inaccuracies, disputes between task posters and workers, lost or stolen wallet credentials, smart contract vulnerabilities, network congestion, or any third-party service failures.</P>
      </Section>

      <Section title="13. Modification and Termination">
        <P>We reserve the right to modify, suspend, or discontinue the Platform or any part thereof at any time, with or without notice. We may terminate or suspend your account at our sole discretion if we believe you have violated these Terms. Upon termination, your right to use the Platform ceases immediately. Any crypto held in your connected wallet remains yours, as BLINK is non-custodial. Pending task escrows will be resolved according to the dispute process.</P>
      </Section>

      <Section title="14. Governing Law">
        <P>These Terms shall be governed by and construed in accordance with the laws of the State of Arizona, United States of America, without regard to its conflict of law provisions.</P>
      </Section>

      <Section title="15. Dispute Resolution and Arbitration">
        <P>Any dispute arising from or relating to these Terms or the Platform shall be resolved by binding arbitration administered by the American Arbitration Association in accordance with its Commercial Arbitration Rules. The arbitration shall take place in Maricopa County, Arizona.</P>
        <P>You agree that any claims shall be brought in your individual capacity and not as a plaintiff or class member in any purported class or representative proceeding. You waive any right to participate in a class action lawsuit or class-wide arbitration against BLINK.</P>
        <P>Notwithstanding the above, either party may seek injunctive relief in any court of competent jurisdiction for matters involving intellectual property or unauthorized access to the Platform.</P>
      </Section>

      <Section title="16. Contact">
        <P>For questions regarding these Terms, please contact us at legal@blinkworld.com.</P>
      </Section>
    </LegalLayout>
  );
}
