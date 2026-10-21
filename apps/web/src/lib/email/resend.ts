import { createElement } from "react";
import { Resend } from "resend";
import { render, toPlainText } from "react-email";

import MemberAddedEmail from "../../../emails/member-added";
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
  const { data, error } = await resend.emails.send(
    {
      from: env.EMAIL_FROM ?? DEFAULT_FROM,
      to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      tags: input.tags,
    },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
  );

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
  let html: string;
  let text: string;
  try {
    html = await render(
      createElement(MemberAddedEmail, {
        memberName: opts.memberName,
        organizationName: opts.organizationName,
      }),
    );
    text = toPlainText(html);
  } catch (error) {
    const message = error instanceof Error ? error.message : "render failed";
    logger.error({ err: message }, "member-added email render failed");
    return { status: "failed", error: message };
  }

  return sendEmail({
    to: opts.to,
    subject,
    text,
    html,
    tags: [{ name: "kind", value: "member_added" }],
    idempotencyKey: `member-added/${opts.userId}`,
  });
}
