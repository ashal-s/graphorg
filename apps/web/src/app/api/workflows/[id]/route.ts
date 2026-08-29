import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { workflowPeople, workflowSteps, workflows } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { isUniqueViolation } from "@/lib/api/db-errors";
import {
  jsonError,
  jsonValidationError,
  readJsonBody,
  requireNonEmptyPatch,
  requireUuidParam,
} from "@/lib/api/http";

import { fetchWorkflowDetail, validateWorkflowPeopleRefs } from "../detail";
import { createWorkflowSchema } from "../schema";

const updateWorkflowSchema = createWorkflowSchema.partial();

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const detail = await fetchWorkflowDetail(session.organizationId, id);
  if (!detail) return jsonError(404, "Workflow not found");

  return NextResponse.json({ workflow: detail });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const db = getDb();
  const existing = await db.query.workflows.findFirst({
    where: and(
      eq(workflows.id, id),
      eq(workflows.organizationId, session.organizationId),
    ),
    columns: { id: true },
  });
  if (!existing) return jsonError(404, "Workflow not found");

  const parsed = updateWorkflowSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const emptyPatchError = requireNonEmptyPatch(parsed.data);
  if (emptyPatchError) return emptyPatchError;
  const { steps, people: peopleAssignments, ...values } = parsed.data;

  if (peopleAssignments) {
    const refError = await validateWorkflowPeopleRefs(
      session.organizationId,
      peopleAssignments.map((assignment) => assignment.personId),
    );
    if (refError) return refError;
  }

  try {
    await db.transaction(async (tx) => {
      if (Object.keys(values).length > 0) {
        await tx.update(workflows).set(values).where(eq(workflows.id, id));
      }

      if (steps) {
        await tx.delete(workflowSteps).where(eq(workflowSteps.workflowId, id));
        if (steps.length > 0) {
          await tx.insert(workflowSteps).values(
            steps.map((step) => ({
              workflowId: id,
              stepOrder: step.stepOrder,
              kind: step.kind,
              type: step.type,
              config: step.config ?? {},
            })),
          );
        }
      }

      if (peopleAssignments) {
        await tx
          .delete(workflowPeople)
          .where(eq(workflowPeople.workflowId, id));
        if (peopleAssignments.length > 0) {
          const uniquePeople = Array.from(
            new Map(
              peopleAssignments.map((assignment) => [
                `${assignment.personId}:${assignment.role}`,
                assignment,
              ]),
            ).values(),
          );
          await tx.insert(workflowPeople).values(
            uniquePeople.map((assignment) => ({
              workflowId: id,
              personId: assignment.personId,
              role: assignment.role,
            })),
          );
        }
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "A workflow with this name already exists");
    }
    throw error;
  }

  const detail = await fetchWorkflowDetail(session.organizationId, id);
  return NextResponse.json({ workflow: detail });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const db = getDb();
  const existing = await db.query.workflows.findFirst({
    where: and(
      eq(workflows.id, id),
      eq(workflows.organizationId, session.organizationId),
    ),
    columns: { id: true },
  });
  if (!existing) return jsonError(404, "Workflow not found");

  await db.delete(workflows).where(eq(workflows.id, id));
  return new NextResponse(null, { status: 204 });
}
