/**
 * One-off Resend smoke send to verify free-tier API key + from-address.
 *
 * Requires `RESEND_API_KEY` in apps/web/.env.local (and the usual DB/Redis/
 * AUTH_SECRET so getEnv() validates). Until you verify a domain, Resend only
 * delivers from `onboarding@resend.dev` to the email on your Resend account.
 *
 *   npm run email:test -- you@example.com
 */
import { isEmailConfigured, sendEmail } from "../src/lib/email/resend";

async function main() {
  const to = process.argv[2]?.trim();
  if (!to) {
    console.error("Usage: npm run email:test -- recipient@example.com");
    process.exit(1);
  }

  if (!isEmailConfigured()) {
    console.error(
      "RESEND_API_KEY is not set. Add it to apps/web/.env.local and retry.",
    );
    process.exit(1);
  }

  const result = await sendEmail({
    to,
    subject: "GraphOrg Resend test",
    text: "If you received this, Resend is wired correctly for GraphOrg.",
    html: "<p>If you received this, Resend is wired correctly for GraphOrg.</p>",
    tags: [{ name: "kind", value: "test" }],
  });

  if (result.status === "sent") {
    console.log(`Sent. Resend id: ${result.id}`);
    return;
  }
  if (result.status === "skipped") {
    console.error("Skipped (not configured).");
    process.exit(1);
  }
  console.error(`Failed: ${result.error}`);
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
