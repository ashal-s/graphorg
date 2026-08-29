import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { workflowPeople, workflowSteps, workflows } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { isUniqueViolation } from "@/lib/api/db-errors";
import { jsonError, jsonValidationError, readJsonBody } from "@/lib/api/http";

import { fetchWorkflowDetail, validateWorkflowPeopleRefs } from "./detail";
import { createWorkflowSchema } from "./schema";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const db = getDb();
  const rows = await db.query.workflows.findMany({
    where: eq(workflows.organizationId, session.organizationId),
    with: {
      people: { with: { person: { columns: { id: true, name: true } } } },
    },
    orderBy: (row, { asc }) => asc(row.name),
  });

  const items = rows.map(({ people: peopleLinks, ...workflow }) => ({
    ...workflow,
    people: peopleLinks.map((link) => ({
      role: link.role,
      person: link.person,
    })),
  }));

  return NextResponse.json({ workflows: items });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const parsed = createWorkflowSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const { steps = [], people: peopleAssignments = [], ...values } = parsed.data;

  const refError = await validateWorkflowPeopleRefs(
    session.organizationId,
    peopleAssignments.map((assignment) => assignment.personId),
  );
  if (refError) return refError;

  // A person can be assigned to the same workflow under more than one role,
  // but not the same (personId, role) pair twice: that's workflow_people's
  // primary key, so a duplicate in the request body would otherwise surface
  // as an unhandled unique-violation 500 rather than being silently merged.
  const uniquePeople = Array.from(
    new Map(
      peopleAssignments.map((assignment) => [
        `${assignment.personId}:${assignment.role}`,
        assignment,
      ]),
    ).values(),
  );

  const db = getDb();
  let insertedId: string;
  try {
    insertedId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(workflows)
        .values({ ...values, organizationId: session.organizationId })
        .returning({ id: workflows.id });
      if (!row) throw new Error("Failed to insert workflow");

      if (steps.length > 0) {
        await tx.insert(workflowSteps).values(
          steps.map((step) => ({
            workflowId: row.id,
            stepOrder: step.stepOrder,
            kind: step.kind,
            type: step.type,
            config: step.config ?? {},
          })),
        );
      }
      if (uniquePeople.length > 0) {
        await tx.insert(workflowPeople).values(
          uniquePeople.map((assignment) => ({
            workflowId: row.id,
            personId: assignment.personId,
            role: assignment.role,
          })),
        );
      }
      return row.id;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "A workflow with this name already exists");
    }
    throw error;
  }

  const detail = await fetchWorkflowDetail(session.organizationId, insertedId);
  return NextResponse.json({ workflow: detail }, { status: 201 });
}
