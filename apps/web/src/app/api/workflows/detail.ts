import { and, eq } from "drizzle-orm";
import type { NextResponse } from "next/server";

import { getDb } from "@/db";
import { people, workflows } from "@/db/schema";
import { jsonError } from "@/lib/api/http";
import { findMissingInOrg } from "@/lib/api/org-refs";

/** A workflow with its ordered steps and assigned people (owner/creator/worker) resolved. */
export async function fetchWorkflowDetail(organizationId: string, id: string) {
  const row = await getDb().query.workflows.findFirst({
    where: and(
      eq(workflows.id, id),
      eq(workflows.organizationId, organizationId),
    ),
    with: {
      steps: { orderBy: (step, { asc }) => asc(step.stepOrder) },
      people: {
        with: {
          person: { columns: { id: true, name: true, email: true, title: true } },
        },
      },
    },
  });
  if (!row) return null;

  const { people: peopleLinks, ...workflow } = row;
  return {
    ...workflow,
    people: peopleLinks.map((link) => ({
      role: link.role,
      person: link.person,
    })),
  };
}

/**
 * Checks every `personId` a workflow create/update body references belongs
 * to the caller's own organization. Returns a 400 `NextResponse` if any
 * don't, or `null` if every reference is valid.
 */
export async function validateWorkflowPeopleRefs(
  organizationId: string,
  personIds: string[],
): Promise<NextResponse | null> {
  if (personIds.length === 0) return null;
  const missing = await findMissingInOrg(
    people.id,
    people.organizationId,
    organizationId,
    personIds,
  );
  if (missing.length > 0) {
    return jsonError(
      400,
      "people contains a personId that does not reference a person in this organization",
    );
  }
  return null;
}
