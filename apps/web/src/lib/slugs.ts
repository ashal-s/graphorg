import { and, eq } from "drizzle-orm";

import { getDb, type Database } from "@/db";
import { people, teams } from "@/db/schema";

/**
 * People and teams live at the top level of the site (`/jordan-lee`,
 * `/payments`), so their slugs share one namespace with each other and with
 * the app's own pages. These can never be used as a slug.
 */
export const RESERVED_SLUGS = new Set([
  "api",
  "login",
  "signup",
  "directory",
  "org-chart",
  "catalog",
  "documents",
  "workflows",
  "settings",
  "new",
  "forbidden",
  "unauthorized",
  "not-found",
  "error",
  "loading",
  "admin",
]);

/** A URL-safe version of a name: lowercase, accents dropped, hyphenated. */
export function toSlug(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "item";
}

/** The first of `base`, `base-2`, `base-3`, ... that `isTaken` doesn't claim. */
export async function firstFreeSlug(
  base: string,
  isTaken: (slug: string) => Promise<boolean> | boolean,
): Promise<string> {
  let candidate = base;
  for (
    let n = 2;
    RESERVED_SLUGS.has(candidate) || (await isTaken(candidate));
    n++
  ) {
    candidate = `${base}-${n}`;
  }
  return candidate;
}

type Queryable = Pick<Database, "query">;

/** A slug for a new person or team that no person, team or page already uses. */
export async function uniqueSlug(
  organizationId: string,
  name: string,
  db: Queryable = getDb(),
): Promise<string> {
  return firstFreeSlug(toSlug(name), async (slug) => {
    const [person, team] = await Promise.all([
      db.query.people.findFirst({
        where: and(
          eq(people.organizationId, organizationId),
          eq(people.slug, slug),
        ),
        columns: { id: true },
      }),
      db.query.teams.findFirst({
        where: and(
          eq(teams.organizationId, organizationId),
          eq(teams.slug, slug),
        ),
        columns: { id: true },
      }),
    ]);
    return Boolean(person || team);
  });
}
