import { and, eq, inArray } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { getDb } from "@/db";

/**
 * IDs from `ids` that do NOT exist in `idColumn`'s table scoped to
 * `organizationId` (via `organizationIdColumn`). Empty array means every id
 * is a valid, in-tenant reference. Used to reject a create/update body that
 * points a foreign key (e.g. a service's `systemId`) at a row from another
 * organization, since the database's own FK constraint has no idea about
 * tenant boundaries.
 */
export async function findMissingInOrg(
  idColumn: AnyPgColumn,
  organizationIdColumn: AnyPgColumn,
  organizationId: string,
  ids: string[],
): Promise<string[]> {
  if (ids.length === 0) return [];
  const unique = [...new Set(ids)];
  const rows = await getDb()
    .select({ id: idColumn })
    .from(idColumn.table)
    .where(
      and(eq(organizationIdColumn, organizationId), inArray(idColumn, unique)),
    );
  const found = new Set(rows.map((row) => row.id as string));
  return unique.filter((id) => !found.has(id));
}
