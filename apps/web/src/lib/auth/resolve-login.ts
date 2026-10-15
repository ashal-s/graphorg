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
 * Valid bcrypt hash of a fixed string. Used to pad comparisons so unknown and
 * multi-workspace emails pay the same work and cannot be told apart by timing.
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
 * Always runs exactly {@link MAX_LOGIN_PASSWORD_CHECKS} bcrypt compares
 * (padding with a dummy hash) so latency does not reveal how many accounts
 * share the email. If more accounts exist than the cap, throws
 * {@link TooManyLoginCandidatesError} so the login form can ask for a
 * workspace slug. Callers that already know the workspace should skip this.
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
  for (let i = 0; i < MAX_LOGIN_PASSWORD_CHECKS; i++) {
    const row = rows[i];
    const ok = await bcrypt.compare(
      password,
      row?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (row && ok) {
      matches.push({ slug: row.slug, name: row.name });
    }
  }

  return matches.sort((a, b) => a.name.localeCompare(b.name));
}
