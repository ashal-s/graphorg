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

/**
 * Valid bcrypt hash of a fixed string. Used so unknown emails still pay one
 * comparison and cannot be enumerated by response timing alone.
 */
const DUMMY_PASSWORD_HASH =
  "$2b$10$aXgB0zEOcV5cWbukwuoUQuUztemZWE8MS9lxbJ5OkH3oTRyPp5IYq";

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
 * the email, throws {@link TooManyLoginCandidatesError} so the login form can
 * ask for a workspace slug instead of silently dropping newer rows. Callers
 * that already know the workspace should skip this helper.
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

  if (rows.length === 0) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    return [];
  }

  const matches: LoginWorkspace[] = [];
  for (const row of rows) {
    if (await bcrypt.compare(password, row.passwordHash)) {
      matches.push({ slug: row.slug, name: row.name });
    }
  }

  return matches.sort((a, b) => a.name.localeCompare(b.name));
}

/** How many product accounts already use this email across organizations. */
export async function countAccountsForEmail(email: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  return rows.length;
}
