import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { departments, teams } from "@/db/schema";
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

import { findMissingInOrg } from "@/lib/api/org-refs";
import {
  PrimaryNotLinkedError,
  replaceLinks,
  settlePrimary,
} from "@/lib/api/primary-links";

import { createTeamSchema } from "../schema";

const updateTeamSchema = createTeamSchema.partial();

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const db = getDb();
  const team = await db.query.teams.findFirst({
    where: and(
      eq(teams.id, id),
      eq(teams.organizationId, session.organizationId),
    ),
  });
  if (!team) return jsonError(404, "Team not found");

  return NextResponse.json({ team });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const db = getDb();
  const existing = await db.query.teams.findFirst({
    where: and(
      eq(teams.id, id),
      eq(teams.organizationId, session.organizationId),
    ),
    columns: { id: true },
  });
  if (!existing) return jsonError(404, "Team not found");

  const parsed = updateTeamSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const emptyPatchError = requireNonEmptyPatch(parsed.data);
  if (emptyPatchError) return emptyPatchError;

  const { departmentIds, primaryDepartmentId, ...values } = parsed.data;
  if (departmentIds) {
    const missing = await findMissingInOrg(
      departments.id,
      departments.organizationId,
      session.organizationId,
      departmentIds,
    );
    if (missing.length > 0) {
      return jsonError(
        400,
        "departmentIds contains an id that does not reference a department in this organization",
      );
    }
  } else if (primaryDepartmentId) {
    const missing = await findMissingInOrg(
      departments.id,
      departments.organizationId,
      session.organizationId,
      [primaryDepartmentId],
    );
    if (missing.length > 0) {
      return jsonError(
        400,
        "primaryDepartmentId does not reference a department in this organization",
      );
    }
  }

  try {
    const team = await db.transaction(async (tx) => {
      const [row] =
        Object.keys(values).length > 0
          ? await tx
              .update(teams)
              .set(values)
              .where(eq(teams.id, id))
              .returning()
          : await tx.select().from(teams).where(eq(teams.id, id));
      if (departmentIds) {
        await replaceLinks(
          tx,
          "team-departments",
          id,
          departmentIds,
          primaryDepartmentId,
        );
      } else if (primaryDepartmentId !== undefined) {
        await settlePrimary(tx, "team-departments", id, primaryDepartmentId);
      }
      return row;
    });
    return NextResponse.json({ team });
  } catch (error) {
    if (error instanceof PrimaryNotLinkedError) {
      return jsonError(
        400,
        "primaryDepartmentId must be one of the team's departments",
      );
    }
    if (isUniqueViolation(error)) {
      return jsonError(409, "A team with this name already exists");
    }
    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const db = getDb();
  const existing = await db.query.teams.findFirst({
    where: and(
      eq(teams.id, id),
      eq(teams.organizationId, session.organizationId),
    ),
    columns: { id: true },
  });
  if (!existing) return jsonError(404, "Team not found");

  await db.delete(teams).where(eq(teams.id, id));
  return new NextResponse(null, { status: 204 });
}
