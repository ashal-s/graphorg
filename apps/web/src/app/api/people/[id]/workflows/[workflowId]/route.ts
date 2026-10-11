import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getDb } from "@/db";
import { people, workflowPeople, workflows } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import {
  jsonError,
  jsonValidationError,
  readJsonBody,
  requireUuidParam,
} from "@/lib/api/http";

const assignmentSchema = z.object({
  roles: z
    .array(z.enum(["owner", "creator", "worker"]))
    .min(1)
    .max(3),
});

interface RouteParams {
  params: Promise<{ id: string; workflowId: string }>;
}

async function loadEnds(
  organizationId: string,
  personId: string,
  workflowId: string,
) {
  const db = getDb();
  const [person, workflow] = await Promise.all([
    db.query.people.findFirst({
      where: and(
        eq(people.id, personId),
        eq(people.organizationId, organizationId),
      ),
      columns: { id: true },
    }),
    db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, workflowId),
        eq(workflows.organizationId, organizationId),
      ),
      columns: { id: true },
    }),
  ]);
  return { person, workflow };
}

/** Sets the roles this person holds on the workflow (replacing any before). */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id, workflowId } = await params;
  const idError =
    requireUuidParam(id) ?? requireUuidParam(workflowId, "workflowId");
  if (idError) return idError;

  const parsed = assignmentSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);

  const { person, workflow } = await loadEnds(
    session.organizationId,
    id,
    workflowId,
  );
  if (!person) return jsonError(404, "Person not found");
  if (!workflow) return jsonError(404, "Workflow not found");

  const roles = [...new Set(parsed.data.roles)];
  await getDb().transaction(async (tx) => {
    await tx
      .delete(workflowPeople)
      .where(
        and(
          eq(workflowPeople.workflowId, workflowId),
          eq(workflowPeople.personId, id),
        ),
      );
    await tx
      .insert(workflowPeople)
      .values(roles.map((role) => ({ workflowId, personId: id, role })));
  });

  return NextResponse.json({ roles });
}

/** Takes the person off the workflow entirely (every role). */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id, workflowId } = await params;
  const idError =
    requireUuidParam(id) ?? requireUuidParam(workflowId, "workflowId");
  if (idError) return idError;

  const { person, workflow } = await loadEnds(
    session.organizationId,
    id,
    workflowId,
  );
  if (!person) return jsonError(404, "Person not found");
  if (!workflow) return jsonError(404, "Workflow not found");

  await getDb()
    .delete(workflowPeople)
    .where(
      and(
        eq(workflowPeople.workflowId, workflowId),
        eq(workflowPeople.personId, id),
      ),
    );
  return new NextResponse(null, { status: 204 });
}
