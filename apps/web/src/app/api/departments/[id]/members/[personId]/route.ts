import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getDb } from "@/db";
import { departmentPeople, departments, people } from "@/db/schema";
import {
  jsonError,
  jsonValidationError,
  readJsonBody,
  requireUuidParam,
} from "@/lib/api/http";
import { lockPrimaries, settlePrimary } from "@/lib/api/primary-links";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";

const memberSchema = z.object({
  role: z.enum(["lead", "member", "trainee"]),
});

interface RouteParams {
  params: Promise<{ id: string; personId: string }>;
}

/** Both ends must belong to the caller's organization. */
async function loadEnds(
  organizationId: string,
  departmentId: string,
  personId: string,
) {
  const db = getDb();
  const [department, person] = await Promise.all([
    db.query.departments.findFirst({
      where: and(
        eq(departments.id, departmentId),
        eq(departments.organizationId, organizationId),
      ),
      columns: { id: true },
    }),
    db.query.people.findFirst({
      where: and(
        eq(people.id, personId),
        eq(people.organizationId, organizationId),
      ),
      columns: { id: true },
    }),
  ]);
  return { department, person };
}

/** Adds the person to the department, or changes their level if already in it. */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id, personId } = await params;
  const idError =
    requireUuidParam(id) ?? requireUuidParam(personId, "personId");
  if (idError) return idError;

  const parsed = memberSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);

  const { department, person } = await loadEnds(
    session.organizationId,
    id,
    personId,
  );
  if (!department) return jsonError(404, "Department not found");
  if (!person) return jsonError(404, "Person not found");

  // The membership and their primary department change together or not at all.
  const membership = await getDb().transaction(async (tx) => {
    // Lock before changing their rows, so settling can't deadlock.
    await lockPrimaries(tx, "person-departments", [personId]);
    const [row] = await tx
      .insert(departmentPeople)
      .values({ departmentId: id, personId, role: parsed.data.role })
      .onConflictDoUpdate({
        target: [departmentPeople.departmentId, departmentPeople.personId],
        set: { role: parsed.data.role },
      })
      .returning();
    // Their first department becomes their primary one.
    await settlePrimary(tx, "person-departments", personId);
    return row;
  });

  return NextResponse.json({ membership });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id, personId } = await params;
  const idError =
    requireUuidParam(id) ?? requireUuidParam(personId, "personId");
  if (idError) return idError;

  const { department, person } = await loadEnds(
    session.organizationId,
    id,
    personId,
  );
  if (!department) return jsonError(404, "Department not found");
  if (!person) return jsonError(404, "Person not found");

  await getDb().transaction(async (tx) => {
    // Lock before deleting, so settling can't deadlock with another removal.
    await lockPrimaries(tx, "person-departments", [personId]);
    await tx
      .delete(departmentPeople)
      .where(
        and(
          eq(departmentPeople.departmentId, id),
          eq(departmentPeople.personId, personId),
        ),
      );
    // If that was their primary department, another one takes over.
    await settlePrimary(tx, "person-departments", personId);
  });
  return new NextResponse(null, { status: 204 });
}
