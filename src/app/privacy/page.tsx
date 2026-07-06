import type { Metadata } from "next";
import MarketingShell, { Section, P, UL, Strong, GreenLink } from "../marketing-shell";

export const metadata: Metadata = {
  title: "Privacy Policy — BlinkWorld",
  description:
    "How BlinkWorld handles your information: what we collect, how it powers the game, and what we never do with your data.",
};

export default function PrivacyPage() {
  return (
    <MarketingShell
      title="Privacy Policy"
      updated="Effective date: July 5, 2026"
      intro="BlinkWorld is a real-world adventure game, and your trust matters more to us than anything you could ever catch in it. This policy explains, in plain English, what information we collect, why we need it, and what we will never do with it."
    >
      <Section title="What we collect">
        <UL
          items={[
            <>
              <Strong>Account information.</Strong> Your email address, the
              username you choose, and the look you pick for your explorer and
              companion pet. We need these to create and save your account.
            </>,
            <>
              <Strong>Location while you play.</Strong> Your device location
              powers the game map — it places Blink Orbs, treasure chests,
              supply drops, geodes, and creatures around you. We use it only
              while the app is open and you are playing. We do not build a
              history of everywhere you have been.
            </>,
            <>
              <Strong>Steps and workouts (optional).</Strong> If you opt in to
              Apple Health, we read your step count and workout activity so
              daily walks can unlock bonus Blink Orbs, with fair daily caps.
              This is entirely optional, and you can turn it off at any time in
              your device settings.
            </>,
            <>
              <Strong>Photos and camera (optional).</Strong> The AR camera is
              used to show creatures in your world during catches and in AR
              Studio. The live camera feed is processed on your device. An AR
              photo is only saved when you choose to take one.
            </>,
            <>
              <Strong>Gameplay data.</Strong> The creatures you catch, your
              collection, your walk streaks, and your battle results — the
              things that make your game yours.
            </>,
          ]}
        />
      </Section>

      <Section title="How we use it">
        <P>
          We use your information for one purpose: running the game. That means
          drawing the map around you, spawning things for you to find, keeping
          your collection and streaks safe, and powering the social features you
          choose to use, like the Live World Feed, Cheers, and battles with
          friends.
        </P>
      </Section>

      <Section title="What we never do">
        <UL
          items={[
            "We never sell your personal data. Not to advertisers, not to data brokers, not to anyone.",
            "We never use your location for advertising or share your precise location with other players.",
            "We never read Apple Health data without your explicit opt-in, and we never share it with third parties.",
            "We never access your photo library — AR photos are saved only when you take them.",
          ]}
        />
      </Section>

      <Section title="Public locations are always blurred">
        <P>
          When a catch or milestone appears on the Live World Feed, the location
          shown is always blurred to a wide area. Other players can celebrate
          your Legendary catch — they can never see the street you were standing
          on.
        </P>
      </Section>

      <Section title="How long we keep your data">
        <P>
          We keep your account and gameplay data for as long as you have an
          account, so your collection is waiting for you whenever you come back.
          When you delete your account, your personal data is removed from our
          systems within 30 days, except where a law requires us to keep a
          specific record for longer.
        </P>
      </Section>

      <Section title="Deleting your account">
        <P>
          You can delete your account at any time, right in the app: open your
          profile, go to Settings, and choose Delete Account. This permanently
          removes your account and the personal data associated with it. No
          email required, no waiting on us.
        </P>
      </Section>

      <Section title="Children">
        <P>
          BlinkWorld is not for children under 13, and we do not allow accounts
          for children under 13. We do not knowingly collect personal
          information from children under 13 — if we learn that we have, we
          delete it immediately.
        </P>
      </Section>

      <Section title="Changes to this policy">
        <P>
          If we update this policy, we will change the date at the top and, for
          meaningful changes, let you know in the app before they take effect.
        </P>
      </Section>

      <Section title="Contact us">
        <P>
          Questions about your privacy? We are happy to help:{" "}
          <GreenLink href="mailto:support@blinkworld.xyz">
            support@blinkworld.xyz
          </GreenLink>
          . You can also visit our <GreenLink href="/support">support page</GreenLink>.
        </P>
      </Section>
    </MarketingShell>
  );
}
