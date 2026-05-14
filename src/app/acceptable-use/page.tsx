"use client";
import LegalLayout, { Section, P } from "../legal-layout";

export default function AcceptableUsePage() {
  return (
    <LegalLayout title="Acceptable Use Policy" lastUpdated="February 20, 2026">
      <Section title="1. Purpose">
        <P>This Acceptable Use Policy (&ldquo;AUP&rdquo;) governs your use of BLINK and is incorporated into our Terms of Service. By using the Platform, you agree to comply with this AUP. We reserve the right to suspend or terminate accounts that violate this policy.</P>
      </Section>

      <Section title="2. Prohibited Activities">
        <P>You may not use BLINK to:</P>
        <P>(a) Engage in fraud, money laundering, terrorist financing, or any illegal activity.</P>
        <P>(b) Manipulate markets, engage in wash trading, or artificially inflate trading volumes.</P>
        <P>(c) Exploit bugs, vulnerabilities, or errors in the Platform or its smart contracts for personal gain.</P>
        <P>(d) Create multiple accounts to circumvent usage limits or referral systems.</P>
        <P>(e) Impersonate another person or entity, or misrepresent your identity or affiliations.</P>
        <P>(f) Harvest, scrape, or collect data from other users without their consent.</P>
        <P>(g) Interfere with or disrupt the Platform's infrastructure, including denial-of-service attacks.</P>
        <P>(h) Reverse-engineer, decompile, or attempt to extract source code from the Platform.</P>
        <P>(i) Use automated tools (bots, scripts) to interact with the Platform in unauthorized ways.</P>
        <P>(j) Transmit malicious code, viruses, or harmful content through the Platform.</P>
        <P>(k) Harass, threaten, or abuse other users.</P>
        <P>(l) Use the Platform in any jurisdiction where its use is prohibited by local law.</P>
      </Section>

      <Section title="3. AI Agent Conduct">
        <P>You are responsible for the behavior of your AI agent. You may not configure your agent to produce content that is hateful, discriminatory, sexually explicit, violent, or otherwise objectionable. Agent conversations that violate community standards may result in account suspension.</P>
      </Section>

      <Section title="4. API Key Usage">
        <P>You must only use API keys that you are authorized to use. Sharing, selling, or trading API keys through the Platform is prohibited. You are responsible for any costs incurred through your API key, regardless of whether the usage was initiated by your agent or by unauthorized access to your account.</P>
      </Section>

      <Section title="5. Reporting Violations">
        <P>If you become aware of any violation of this AUP, please report it to abuse@mishmesh.ai. We take all reports seriously and will investigate promptly.</P>
      </Section>

      <Section title="6. Enforcement">
        <P>Violations of this AUP may result in: a warning, temporary suspension of your account, permanent termination of your account, or referral to law enforcement authorities. We may take action at our sole discretion and without prior notice in cases of severe violations.</P>
      </Section>
    </LegalLayout>
  );
}
