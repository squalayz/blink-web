import type { Metadata } from "next";
import MarketingShell, { Section, P, UL, Strong, GreenLink } from "../marketing-shell";

export const metadata: Metadata = {
  title: "Terms of Use — BlinkWorld",
  description:
    "The terms that apply when you play BlinkWorld: eligibility, in-game items, community conduct, and real-world safety.",
};

export default function TermsPage() {
  return (
    <MarketingShell
      title="Terms of Use"
      updated="Effective date: July 5, 2026"
      intro='These terms are an agreement between you and BlinkWorld ("we," "us," "our") that applies whenever you use the BlinkWorld app or website. By playing, you agree to them. We have kept them as readable as we can.'
    >
      <Section title="1. Who can play">
        <P>
          You must be at least 13 years old to create a BlinkWorld account. If
          you are under 18, you should have a parent or guardian&rsquo;s
          permission to play. By using BlinkWorld, you confirm that you meet
          these requirements.
        </P>
      </Section>

      <Section title="2. The game">
        <P>
          BlinkWorld turns real streets, parks, and sidewalks into a living
          treasure map. You walk around the real world to collect Blink Orbs,
          open treasure chests, dig up geodes, catch creatures through the AR
          camera, build walk streaks, battle friends, and share moments on the
          Live World Feed. BlinkWorld is free to download and free to play.
        </P>
      </Section>

      <Section title="3. Virtual items">
        <P>
          <Strong>
            Blink Orbs are in-game virtual rewards for fun only, with no
            monetary value.
          </Strong>{" "}
          The same is true of every in-game item: creatures, chests, geodes,
          cosmetics, and anything else you collect are a limited game license,
          cannot be redeemed for cash, and cannot be sold, traded, or
          transferred. They exist only inside BlinkWorld, only for fun, and may
          be adjusted, rebalanced, or reset as part of running the game.
        </P>
      </Section>

      <Section title="4. Community conduct">
        <P>BlinkWorld is a friendly place, and we intend to keep it that way. You agree not to:</P>
        <UL
          items={[
            "Harass, threaten, bully, or abuse other players.",
            "Post content that is hateful, sexually explicit, violent, or otherwise inappropriate for a game people of many ages play.",
            "Impersonate other people or misrepresent who you are.",
            "Cheat — including GPS spoofing, location falsification, automation, bots, or exploiting bugs.",
            "Attempt to interfere with, reverse-engineer, or compromise the service.",
          ]}
        />
        <P>
          You can block or report any player from anywhere in the app. We review
          reports and act on them.
        </P>
      </Section>

      <Section title="5. Real-world safety">
        <P>
          BlinkWorld is played in the real world, and the real world comes
          first. Stay aware of your surroundings at all times.{" "}
          <Strong>Never play while driving</Strong> or riding anything that
          needs your attention. Do not trespass on private property, and do not
          enter unsafe areas to reach something in the game — nothing in
          BlinkWorld is ever worth a risk to you or anyone else. You are
          responsible for playing safely and following local laws.
        </P>
      </Section>

      <Section title="6. Your account">
        <P>
          You are responsible for keeping your account credentials private. You
          can delete your account at any time in the app, from Settings. See our{" "}
          <GreenLink href="/privacy">Privacy Policy</GreenLink> for how we handle
          your data.
        </P>
      </Section>

      <Section title="7. Suspension and termination">
        <P>
          We may suspend or terminate accounts that break these terms, harm
          other players, or abuse the service. We may also modify or discontinue
          features as the game evolves. If your account is terminated, your
          license to in-game items ends with it.
        </P>
      </Section>

      <Section title="8. Disclaimers">
        <P>
          BlinkWorld is provided &ldquo;as is.&rdquo; We work hard to keep it
          running smoothly, but we cannot promise it will always be available,
          error-free, or that any particular creature or item will appear at any
          particular time or place. To the maximum extent permitted by law, we
          are not liable for indirect or consequential damages arising from your
          use of the game.
        </P>
      </Section>

      <Section title="9. Changes to these terms">
        <P>
          If we make meaningful changes to these terms, we will update the date
          at the top and let you know in the app before they take effect.
          Continuing to play after that means you accept the updated terms.
        </P>
      </Section>

      <Section title="10. Contact">
        <P>
          Questions about these terms? Reach us at{" "}
          <GreenLink href="mailto:support@blinkworld.xyz">
            support@blinkworld.xyz
          </GreenLink>{" "}
          or visit our <GreenLink href="/support">support page</GreenLink>.
        </P>
      </Section>
    </MarketingShell>
  );
}
