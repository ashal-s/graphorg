import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { technologies } from "@/db/schema";
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

import { createTechnologySchema } from "../schema";

const updateTechnologySchema = createTechnologySchema.partial();

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
  const technology = await db.query.technologies.findFirst({
    where: and(
      eq(technologies.id, id),
      eq(technologies.organizationId, session.organizationId),
    ),
  });
  if (!technology) return jsonError(404, "Technology not found");

  return NextResponse.json({ technology });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const db = getDb();
  const existing = await db.query.technologies.findFirst({
    where: and(
      eq(technologies.id, id),
      eq(technologies.organizationId, session.organizationId),
    ),
    columns: { id: true },
  });
  if (!existing) return jsonError(404, "Technology not found");

  const parsed = updateTechnologySchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const emptyPatchError = requireNonEmptyPatch(parsed.data);
  if (emptyPatchError) return emptyPatchError;

  try {
    const [technology] = await db
      .update(technologies)
      .set(parsed.data)
      .where(eq(technologies.id, id))
      .returning();
    return NextResponse.json({ technology });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "A technology with this name already exists");
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
  const existing = await db.query.technologies.findFirst({
    where: and(
      eq(technologies.id, id),
      eq(technologies.organizationId, session.organizationId),
    ),
    columns: { id: true },
  });
  if (!existing) return jsonError(404, "Technology not found");

  await db.delete(technologies).where(eq(technologies.id, id));
  return new NextResponse(null, { status: 204 });
}
