import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { organizations, users } from "@/db/schema";

export interface LoginWorkspace {
  slug: string;
  name: string;
}

/**
 * Accounts that share this email and whose password matches. Same email can
 * exist in more than one organization as separate rows; only rows the
 * password unlocks are returned.
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
    .where(eq(users.email, email));

  const matches: LoginWorkspace[] = [];
  for (const row of rows) {
    if (await bcrypt.compare(password, row.passwordHash)) {
      matches.push({ slug: row.slug, name: row.name });
    }
  }

  return matches.sort((a, b) => a.name.localeCompare(b.name));
}
