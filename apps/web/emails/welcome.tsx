import { Button, Heading, Section, Text } from "react-email";

import { EmailLayout } from "./_components/layout";

export type WelcomeEmailProps = {
  ownerName: string;
  organizationName: string;
  signInUrl: string;
};

/** Scaffold for post-signup welcome when a new workspace is created. */
export default function WelcomeEmail({
  ownerName,
  organizationName,
  signInUrl,
}: WelcomeEmailProps) {
  return (
    <EmailLayout preview={`Welcome to GraphOrg — ${organizationName} is ready`}>
      <Heading className="m-0 mb-4 text-xl font-semibold text-zinc-900">
        Welcome to GraphOrg
      </Heading>
      <Text className="m-0 mb-4 text-base leading-6 text-zinc-700">
        Hi {ownerName},
      </Text>
      <Text className="m-0 mb-4 text-base leading-6 text-zinc-700">
        Your workspace <strong>{organizationName}</strong> is set up. Start by
        adding people, teams, and the services they own.
      </Text>
      <Section className="my-6">
        <Button
          href={signInUrl}
          className="rounded-md bg-zinc-900 px-5 py-3 text-sm font-medium text-white"
        >
          Open GraphOrg
        </Button>
      </Section>
      <Text className="m-0 text-sm leading-5 text-zinc-500">
        If the button doesn&apos;t work, open: {signInUrl}
      </Text>
    </EmailLayout>
  );
}

WelcomeEmail.PreviewProps = {
  ownerName: "Jordan Lee",
  organizationName: "Acme Corp",
  signInUrl: "https://graphorg.com/login",
} satisfies WelcomeEmailProps;
