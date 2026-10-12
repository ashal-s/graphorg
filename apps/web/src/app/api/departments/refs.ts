import { eq } from "drizzle-orm";
import type { NextResponse } from "next/server";

import { getDb } from "@/db";
import { departments, people, teams } from "@/db/schema";
import { jsonError } from "@/lib/api/http";
import { findMissingInOrg } from "@/lib/api/org-refs";
import { wouldCreateParentCycle } from "@/lib/api/service-hierarchy";

interface DepartmentRefs {
  parentId?: string | null;
  headPersonIds?: string[];
  teamIds?: string[];
  personIds?: string[];
}

/**
 * Checks every id a department create/update body points at belongs to the
 * caller's organization, and that a new parent wouldn't put the department
 * under itself or one of its own sub-departments. `selfId` is the department
 * being edited; omit it when creating. Returns a 400 or null when all is well.
 */
export async function validateDepartmentRefs(
  organizationId: string,
  refs: DepartmentRefs,
  selfId?: string,
): Promise<NextResponse | null> {
  const { parentId, headPersonIds, teamIds, personIds } = refs;

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
    if (selfId) {
      const rows = await getDb()
        .select({ id: departments.id, parentId: departments.parentId })
        .from(departments)
        .where(eq(departments.organizationId, organizationId));
      const parents = new Map<string, string>();
      for (const row of rows)
        if (row.parentId) parents.set(row.id, row.parentId);
      if (wouldCreateParentCycle(parents, selfId, parentId)) {
        return jsonError(
          400,
          "parentId would put the department inside one of its own sub-departments",
        );
      }
    }
  }

  const checks: Array<[string, string[], Parameters<typeof findMissingInOrg>]> =
    [];
  if (headPersonIds?.length) {
    checks.push([
      "headPersonIds contains an id that does not reference a person in this organization",
      headPersonIds,
      [people.id, people.organizationId, organizationId, headPersonIds],
    ]);
  }
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
