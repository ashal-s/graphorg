import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { repositories, teams } from "@/db/schema";
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

import { createRepositorySchema } from "../schema";

const updateRepositorySchema = createRepositorySchema.partial();

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
  const row = await db.query.repositories.findFirst({
    where: and(
      eq(repositories.id, id),
      eq(repositories.organizationId, session.organizationId),
    ),
    with: { ownerTeam: { columns: { id: true, name: true } } },
  });
  if (!row) return jsonError(404, "Repository not found");

  return NextResponse.json({ repository: row });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const db = getDb();
  const existing = await db.query.repositories.findFirst({
    where: and(
      eq(repositories.id, id),
      eq(repositories.organizationId, session.organizationId),
    ),
    columns: { id: true },
  });
  if (!existing) return jsonError(404, "Repository not found");

  const parsed = updateRepositorySchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const emptyPatchError = requireNonEmptyPatch(parsed.data);
  if (emptyPatchError) return emptyPatchError;

  if (parsed.data.ownerTeamId) {
    const missing = await findMissingInOrg(
      teams.id,
      teams.organizationId,
      session.organizationId,
      [parsed.data.ownerTeamId],
    );
    if (missing.length > 0) {
      return jsonError(
        400,
        "ownerTeamId does not reference a team in this organization",
      );
    }
  }

  try {
    const [row] = await db
      .update(repositories)
      .set(parsed.data)
      .where(eq(repositories.id, id))
      .returning();
    return NextResponse.json({ repository: row });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "A repository with this name already exists");
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
  const existing = await db.query.repositories.findFirst({
    where: and(
      eq(repositories.id, id),
      eq(repositories.organizationId, session.organizationId),
    ),
    columns: { id: true },
  });
  if (!existing) return jsonError(404, "Repository not found");

  await db.delete(repositories).where(eq(repositories.id, id));
  return new NextResponse(null, { status: 204 });
}
