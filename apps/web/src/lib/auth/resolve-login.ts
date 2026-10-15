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
 * Accounts that share this email and whose password matches. Same email can
 * exist in more than one organization as separate rows; only rows the
 * password unlocks are returned. At most {@link MAX_LOGIN_PASSWORD_CHECKS}
 * candidates are considered (oldest first).
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
    .limit(MAX_LOGIN_PASSWORD_CHECKS);

  const matches: LoginWorkspace[] = [];
  for (const row of rows) {
    if (await bcrypt.compare(password, row.passwordHash)) {
      matches.push({ slug: row.slug, name: row.name });
    }
  }

  return matches.sort((a, b) => a.name.localeCompare(b.name));
}
