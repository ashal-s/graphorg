import { Heading, Text } from "react-email";

import { EmailLayout } from "./_components/layout";

export type MemberAddedEmailProps = {
  memberName: string;
  organizationName: string;
};

/**
 * Sent when an admin creates a member account. Does not include credentials —
 * the admin still shares the initial password out of band.
 */
export default function MemberAddedEmail({
  memberName,
  organizationName,
}: MemberAddedEmailProps) {
  return (
    <EmailLayout
      preview={`You've been added to ${organizationName} on GraphOrg`}
    >
      <Heading className="m-0 mb-4 text-xl font-semibold text-zinc-900">
        You&apos;ve been added
      </Heading>
      <Text className="m-0 mb-4 text-base leading-6 text-zinc-700">
        Hi {memberName},
      </Text>
      <Text className="m-0 mb-4 text-base leading-6 text-zinc-700">
        You&apos;ve been added as a member of{" "}
        <strong>{organizationName}</strong> on GraphOrg.
      </Text>
      <Text className="m-0 text-base leading-6 text-zinc-700">
        Your administrator will share sign-in details with you (there is no
        invite link yet).
      </Text>
    </EmailLayout>
  );
}

MemberAddedEmail.PreviewProps = {
  memberName: "Alex Chen",
  organizationName: "Acme Corp",
} satisfies MemberAddedEmailProps;
