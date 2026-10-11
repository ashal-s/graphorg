import { and, eq, ne } from "drizzle-orm";

import { getDb } from "@/db";
import { organizations, users } from "@/db/schema";

export interface Workspace {
  name: string;
  slug: string;
  logoUrl: string | null;
}

/**
 * The current workspace, plus any other workspaces where the same email
 * address has an account (accounts belong to one organization each, so
 * those are the ones this person could sign in to next).
 */
export async function loadWorkspaces(
  organizationId: string,
  email: string,
): Promise<{ current: Workspace | null; others: Workspace[] }> {
  const db = getDb();
  const [current, others] = await Promise.all([
    db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
      columns: { name: true, slug: true, logoUrl: true },
    }),
    db
      .select({
        name: organizations.name,
        slug: organizations.slug,
        logoUrl: organizations.logoUrl,
      })
      .from(users)
      .innerJoin(organizations, eq(users.organizationId, organizations.id))
      .where(
        and(eq(users.email, email), ne(users.organizationId, organizationId)),
      ),
  ]);

  return {
    current: current ?? null,
    others: others.sort((a, b) => a.name.localeCompare(b.name)),
  };
}
