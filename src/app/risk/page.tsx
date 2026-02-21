"use client";
import LegalLayout, { Section, P } from "../legal-layout";

export default function RiskPage() {
  return (
    <LegalLayout title="Risk Disclaimer" lastUpdated="February 20, 2026">
      <div style={{background:"#ff444420",border:"1px solid #ff444444",borderRadius:12,padding:20,marginBottom:28}}>
        <P><strong style={{color:"#ff6b6b",fontSize:15}}>IMPORTANT: Please read this entire disclaimer carefully before enabling autonomous trading or depositing funds.</strong></P>
      </div>

      <Section title="1. General Risk Warning">
        <P>Cryptocurrency trading involves substantial risk of loss and is not suitable for every individual. The value of cryptocurrencies and digital assets can fluctuate significantly and may result in the loss of some or all of your deposited funds. You should carefully consider whether trading or holding digital assets is appropriate for you in light of your financial condition.</P>
      </Section>

      <Section title="2. Autonomous AI Trading Risk">
        <P>MishMesh.ai offers optional autonomous AI trading functionality. This feature is experimental technology. By enabling autonomous trading, you acknowledge and agree to the following:</P>
        <P>(a) AI trading algorithms make decisions without human oversight or intervention. These algorithms may make poor decisions that result in financial losses.</P>
        <P>(b) Past performance of AI trading algorithms does not indicate or guarantee future results.</P>
        <P>(c) The AI may execute trades at unfavorable prices, in illiquid markets, or based on incomplete or inaccurate information.</P>
        <P>(d) Technical failures, bugs, or unexpected behavior in the AI system may result in unintended trades or losses.</P>
        <P>(e) You may lose some or all of the funds in your agent wallet through autonomous trading.</P>
      </Section>

      <Section title="3. Market Risks">
        <P>Cryptocurrency markets are highly volatile and operate 24 hours a day, 7 days a week. Market conditions can change rapidly and without warning. Specific risks include but are not limited to: extreme price volatility, low liquidity causing slippage, market manipulation, flash crashes, and regulatory changes that may affect the value or legality of certain digital assets.</P>
      </Section>

      <Section title="4. Technology Risks">
        <P>The Platform relies on multiple technology systems that may fail or behave unexpectedly. Risks include: smart contract bugs or vulnerabilities, blockchain network congestion or outages, Base L2 network issues, bridge failures, oracle manipulation, API provider outages (affecting your AI agent), server downtime, and cybersecurity threats including hacking, phishing, and exploits.</P>
      </Section>

      <Section title="5. Non-Custodial Wallet Risks">
        <P>Your funds are held in a non-custodial wallet on the Base network. While this means you retain control of your private keys, it also means that if your private key is lost, stolen, or compromised, your funds may be permanently unrecoverable. MishMesh.ai cannot recover lost private keys or reverse unauthorized transactions.</P>
      </Section>

      <Section title="6. No Financial Advice">
        <P>Nothing on the Platform constitutes financial advice, investment advice, trading advice, or any other form of professional advice. The Platform does not recommend any particular cryptocurrency, token, or trading strategy. You should consult with a qualified financial advisor before making any investment decisions.</P>
        <P>MishMesh.ai is a technology platform that provides tools. How you use those tools is entirely your responsibility.</P>
      </Section>

      <Section title="7. Regulatory Risk">
        <P>The regulatory environment for cryptocurrencies and AI-powered financial tools is evolving and uncertain. Changes in laws or regulations may adversely affect the use, transfer, or value of digital assets. You are responsible for understanding and complying with all applicable laws in your jurisdiction.</P>
      </Section>

      <Section title="8. Only Risk What You Can Afford to Lose">
        <P><strong style={{color:"#ff6b6b"}}>You should only deposit funds that you can afford to lose entirely.</strong> Do not deposit funds that are needed for essential living expenses, debt payments, or other financial obligations. If you cannot afford to lose the funds you are considering depositing, do not deposit them.</P>
      </Section>

      <Section title="9. Platform Limitation of Liability">
        <P>MishMesh.ai is not responsible for any trading decisions made by AI agents, whether those decisions result in profit or loss. The Platform provides the technology infrastructure; all trading outcomes are the sole responsibility of the user who enabled the trading feature.</P>
        <P>By enabling autonomous trading, you explicitly waive any claims against MishMesh.ai related to trading losses, missed opportunities, or any other financial outcomes resulting from AI agent activity.</P>
      </Section>

      <Section title="10. Acknowledgment">
        <P>By enabling autonomous trading on MishMesh.ai, you confirm that you have read and understood this Risk Disclaimer in its entirety, that you understand the risks involved, and that you accept full responsibility for any financial outcomes resulting from the use of the Platform's trading features.</P>
      </Section>
    </LegalLayout>
  );
}
