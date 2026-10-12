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
import { setDepartmentHeads } from "@/lib/api/department-heads";
import {
  addDepartmentPeople,
  replaceDepartmentMembers,
} from "@/lib/api/primary-links";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";

import { validateDepartmentRefs } from "../refs";
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
      heads: { columns: { personId: true } },
      teams: { columns: { teamId: true, isPrimary: true } },
      people: { columns: { personId: true, isPrimary: true } },
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

  const { teams, people, heads, ...rest } = department;
  return NextResponse.json({
    department: {
      ...rest,
      headPersonIds: heads.map((h) => h.personId),
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
  const { teamIds, personIds, headPersonIds, ...values } = parsed.data;

  const refsError = await validateDepartmentRefs(
    session.organizationId,
    { ...values, headPersonIds, teamIds, personIds },
    id,
  );
  if (refsError) return refsError;

  try {
    const row = await getDb().transaction(async (tx) => {
      const [updated] =
        Object.keys(values).length > 0
          ? await tx
              .update(departments)
              .set(values)
              .where(eq(departments.id, id))
              .returning()
          : await tx.select().from(departments).where(eq(departments.id, id));
      if (headPersonIds) await setDepartmentHeads(tx, id, headPersonIds);
      if (teamIds) {
        await replaceDepartmentMembers(tx, "team-departments", id, teamIds);
      }
      if (personIds) {
        await replaceDepartmentMembers(tx, "person-departments", id, personIds);
      }
      // Heads are always among the department's people. Done last so a
      // people list that left a head out doesn't drop them.
      if (headPersonIds) await addDepartmentPeople(tx, id, headPersonIds);
      return updated;
    });
    return NextResponse.json({ department: row });
  } catch (error) {
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
