import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { departments } from "@/db/schema";
import { isUniqueViolation } from "@/lib/api/db-errors";
import {
  jsonError,
  jsonValidationError,
  readJsonBody,
  requireNonEmptyPatch,
  requireUuidParam,
} from "@/lib/api/http";
import { replaceDepartmentMembers } from "@/lib/api/primary-links";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";

import { lockOrganization } from "@/lib/api/locks";
import {
  ParentCycleError,
  wouldCreateParentCycle,
} from "@/lib/api/service-hierarchy";

import { loadDepartmentParents, validateDepartmentRefs } from "../refs";
import { createDepartmentSchema } from "../schema";

const updateDepartmentSchema = createDepartmentSchema.partial();

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function loadDepartment(organizationId: string, id: string) {
  return getDb().query.departments.findFirst({
    where: and(
      eq(departments.id, id),
      eq(departments.organizationId, organizationId),
    ),
    with: {
      teams: { columns: { teamId: true, isPrimary: true } },
      people: { columns: { personId: true, isPrimary: true, role: true } },
    },
  });
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const department = await loadDepartment(session.organizationId, id);
  if (!department) return jsonError(404, "Department not found");

  const { teams, people, ...rest } = department;
  return NextResponse.json({
    department: {
      ...rest,
      teamIds: teams.map((t) => t.teamId),
      personIds: people.map((p) => p.personId),
    },
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const existing = await loadDepartment(session.organizationId, id);
  if (!existing) return jsonError(404, "Department not found");

  const parsed = updateDepartmentSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const emptyPatchError = requireNonEmptyPatch(parsed.data);
  if (emptyPatchError) return emptyPatchError;
  const { teamIds, personIds, ...values } = parsed.data;

  const refsError = await validateDepartmentRefs(
    session.organizationId,
    { ...values, teamIds, personIds },
    id,
  );
  if (refsError) return refsError;

  try {
    const row = await getDb().transaction(async (tx) => {
      if (values.parentId) {
        // The loop check reads every department, so it runs here, under a
        // lock with the write: two moves that each look fine against the old
        // tree could otherwise commit a loop between them.
        await lockOrganization(
          tx,
          session.organizationId,
          "department-parents",
        );
        const parents = await loadDepartmentParents(tx, session.organizationId);
        if (wouldCreateParentCycle(parents, id, values.parentId)) {
          throw new ParentCycleError();
        }
      }
      const [updated] =
        Object.keys(values).length > 0
          ? await tx
              .update(departments)
              .set(values)
              .where(eq(departments.id, id))
              .returning()
          : await tx.select().from(departments).where(eq(departments.id, id));
      if (teamIds) {
        await replaceDepartmentMembers(tx, "team-departments", id, teamIds);
      }
      if (personIds) {
        await replaceDepartmentMembers(tx, "person-departments", id, personIds);
      }
      return updated;
    });
    return NextResponse.json({ department: row });
  } catch (error) {
    if (error instanceof ParentCycleError) {
      return jsonError(
        400,
        "parentId would put the department inside one of its own sub-departments",
      );
    }
    if (isUniqueViolation(error)) {
      return jsonError(409, "A department with this name already exists");
    }
    throw error;
  }
}

/**
 * Deletes the department only. Its sub-departments become top-level, and its
 * teams and people just lose this membership (someone whose primary it was
 * is given another, if they have one).
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const existing = await loadDepartment(session.organizationId, id);
  if (!existing) return jsonError(404, "Department not found");

  await getDb().transaction(async (tx) => {
    // Emptying the sets first lets primaries move to another department.
    await replaceDepartmentMembers(tx, "team-departments", id, []);
    await replaceDepartmentMembers(tx, "person-departments", id, []);
    await tx.delete(departments).where(eq(departments.id, id));
  });

  return new NextResponse(null, { status: 204 });
}
