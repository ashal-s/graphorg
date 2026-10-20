import { Resend } from "resend";

import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

const DEFAULT_FROM = "GraphOrg <onboarding@resend.dev>";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  tags?: Array<{ name: string; value: string }>;
  idempotencyKey?: string;
};

export type SendEmailResult =
  | { status: "skipped"; reason: "not_configured" }
  | { status: "sent"; id: string }
  | { status: "failed"; error: string };

/** True when `RESEND_API_KEY` is set (EMAIL_FROM optional). */
export function isEmailConfigured(): boolean {
  return Boolean(getEnv().RESEND_API_KEY);
}

/**
 * Transactional send via Resend. No-ops when `RESEND_API_KEY` is unset so
 * local/dev boots without a mailbox. Does not throw on API failure — returns
 * `{ status: "failed" }` and logs.
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const env = getEnv();
  if (!env.RESEND_API_KEY) {
    logger.debug(
      { subject: input.subject },
      "email skipped: RESEND_API_KEY not set",
    );
    return { status: "skipped", reason: "not_configured" };
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const to = Array.isArray(input.to) ? input.to : [input.to];
  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM ?? DEFAULT_FROM,
    to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    tags: input.tags,
    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
  });

  if (error) {
    logger.error(
      { err: error.message, name: error.name },
      "resend send failed",
    );
    return { status: "failed", error: error.message };
  }

  const id = data?.id;
  if (!id) {
    logger.error("resend send returned no id");
    return { status: "failed", error: "Resend returned no email id" };
  }

  logger.info({ emailId: id }, "email sent");
  return { status: "sent", id };
}

/**
 * Scaffold “member added” notice. Does **not** include the password — admin
 * still shares credentials out of band until invite email exists.
 */
export async function notifyMemberAdded(opts: {
  to: string;
  memberName: string;
  organizationName: string;
  userId: string;
}): Promise<SendEmailResult> {
  const subject = `You've been added to ${opts.organizationName} on GraphOrg`;
  const text = [
    `Hi ${opts.memberName},`,
    "",
    `You've been added as a member of ${opts.organizationName} on GraphOrg.`,
    "Your administrator will share sign-in details with you (there is no invite link yet).",
    "",
    "— GraphOrg",
  ].join("\n");
  const safeName = escapeHtml(opts.memberName);
  const safeOrg = escapeHtml(opts.organizationName);
  const html = [
    `<p>Hi ${safeName},</p>`,
    `<p>You've been added as a member of <strong>${safeOrg}</strong> on GraphOrg.</p>`,
    `<p>Your administrator will share sign-in details with you (there is no invite link yet).</p>`,
    `<p>— GraphOrg</p>`,
  ].join("\n");

  return sendEmail({
    to: opts.to,
    subject,
    text,
    html,
    tags: [{ name: "kind", value: "member_added" }],
    idempotencyKey: `member-added/${opts.userId}`,
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
