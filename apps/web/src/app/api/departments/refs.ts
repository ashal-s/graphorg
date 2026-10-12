import { eq } from "drizzle-orm";
import type { NextResponse } from "next/server";

import type { Database } from "@/db";
import { departments, people, teams } from "@/db/schema";
import { jsonError } from "@/lib/api/http";
import { findMissingInOrg } from "@/lib/api/org-refs";

interface DepartmentRefs {
  parentId?: string | null;
  teamIds?: string[];
  personIds?: string[];
}

/**
 * `departmentId -> parentId` for every department that has a parent, read in
 * `db` (pass the transaction, after `lockOrganization`, to check for loops).
 */
export async function loadDepartmentParents(
  db: Pick<Database, "select">,
  organizationId: string,
): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: departments.id, parentId: departments.parentId })
    .from(departments)
    .where(eq(departments.organizationId, organizationId));
  const parents = new Map<string, string>();
  for (const row of rows) if (row.parentId) parents.set(row.id, row.parentId);
  return parents;
}

/**
 * Checks every id a department create/update body points at belongs to the
 * caller's organization, and that a department isn't made its own parent.
 * Longer loops are checked by the route inside its transaction, under a lock
 * (see `loadDepartmentParents`). `selfId` is the department being edited;
 * omit it when creating. Returns a 400 or null when all is well.
 */
export async function validateDepartmentRefs(
  organizationId: string,
  refs: DepartmentRefs,
  selfId?: string,
): Promise<NextResponse | null> {
  const { parentId, teamIds, personIds } = refs;

  if (parentId) {
    if (parentId === selfId) {
      return jsonError(400, "a department cannot be inside itself");
    }
    const missing = await findMissingInOrg(
      departments.id,
      departments.organizationId,
      organizationId,
      [parentId],
    );
    if (missing.length > 0) {
      return jsonError(
        400,
        "parentId does not reference a department in this organization",
      );
    }
  }

  const checks: Array<[string, string[], Parameters<typeof findMissingInOrg>]> =
    [];
  if (personIds?.length) {
    checks.push([
      "personIds contains an id that does not reference a person in this organization",
      personIds,
      [people.id, people.organizationId, organizationId, personIds],
    ]);
  }
  if (teamIds?.length) {
    checks.push([
      "teamIds contains an id that does not reference a team in this organization",
      teamIds,
      [teams.id, teams.organizationId, organizationId, teamIds],
    ]);
  }
  for (const [message, , args] of checks) {
    if ((await findMissingInOrg(...args)).length > 0) {
      return jsonError(400, message);
    }
  }
  return null;
}
