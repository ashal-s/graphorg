import { Button, Heading, Section, Text } from "react-email";

import { EmailLayout } from "./_components/layout";

export type InviteEmailProps = {
  inviteeName: string;
  organizationName: string;
  inviterName: string;
  inviteUrl: string;
  role: string;
};

/**
 * Scaffold for future invite-link flow. Not wired to send yet — preview only
 * until product supports tokenized invites.
 */
export default function InviteEmail({
  inviteeName,
  organizationName,
  inviterName,
  inviteUrl,
  role,
}: InviteEmailProps) {
  return (
    <EmailLayout
      preview={`${inviterName} invited you to ${organizationName} on GraphOrg`}
    >
      <Heading className="m-0 mb-4 text-xl font-semibold text-zinc-900">
        You&apos;re invited
      </Heading>
      <Text className="m-0 mb-4 text-base leading-6 text-zinc-700">
        Hi {inviteeName},
      </Text>
      <Text className="m-0 mb-4 text-base leading-6 text-zinc-700">
        <strong>{inviterName}</strong> invited you to join{" "}
        <strong>{organizationName}</strong> on GraphOrg as a{" "}
        <strong>{role}</strong>.
      </Text>
      <Section className="my-6">
        <Button
          href={inviteUrl}
          className="rounded-md bg-zinc-900 px-5 py-3 text-sm font-medium text-white"
        >
          Accept invite
        </Button>
      </Section>
      <Text className="m-0 text-sm leading-5 text-zinc-500">
        This link expires after a few days. If you weren&apos;t expecting this,
        you can ignore the email.
      </Text>
    </EmailLayout>
  );
}

InviteEmail.PreviewProps = {
  inviteeName: "Sam Rivera",
  organizationName: "Acme Corp",
  inviterName: "Alex Chen",
  inviteUrl: "https://graphorg.com/invite/preview-token",
  role: "editor",
} satisfies InviteEmailProps;
