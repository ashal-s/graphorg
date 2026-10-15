import bcrypt from "bcryptjs";
import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { organizations, users } from "@/db/schema";

export interface LoginWorkspace {
  slug: string;
  name: string;
}

/**
 * Hard cap on bcrypt comparisons per email-only login. Public signup can create
 * many orgs under the same email; without a bound, each sign-in would pay one
 * expensive hash check per row (a targeted CPU DoS). Ten is well above normal
 * multi-workspace use.
 */
export const MAX_LOGIN_PASSWORD_CHECKS = 10;

/** Thrown when email-only login would need more than {@link MAX_LOGIN_PASSWORD_CHECKS} candidates. */
export class TooManyLoginCandidatesError extends Error {
  constructor() {
    super("Too many login candidates for email");
    this.name = "TooManyLoginCandidatesError";
  }
}

/**
 * Accounts that share this email and whose password matches. Same email can
 * exist in more than one organization as separate rows; only rows the
 * password unlocks are returned.
 *
 * Caps work at {@link MAX_LOGIN_PASSWORD_CHECKS}. If more accounts exist for
 * the email, throws {@link TooManyLoginCandidatesError} instead of silently
 * ignoring newer rows (which would lock out a real account after an email
 * flood). Callers that already know the workspace should skip this helper.
 */
export async function resolveLoginWorkspaces(
  email: string,
  password: string,
): Promise<LoginWorkspace[]> {
  const db = getDb();
  const rows = await db
    .select({
      passwordHash: users.passwordHash,
      slug: organizations.slug,
      name: organizations.name,
    })
    .from(users)
    .innerJoin(organizations, eq(users.organizationId, organizations.id))
    .where(eq(users.email, email))
    .orderBy(asc(users.createdAt))
    .limit(MAX_LOGIN_PASSWORD_CHECKS + 1);

  if (rows.length > MAX_LOGIN_PASSWORD_CHECKS) {
    throw new TooManyLoginCandidatesError();
  }

  const matches: LoginWorkspace[] = [];
  for (const row of rows) {
    if (await bcrypt.compare(password, row.passwordHash)) {
      matches.push({ slug: row.slug, name: row.name });
    }
  }

  return matches.sort((a, b) => a.name.localeCompare(b.name));
}
