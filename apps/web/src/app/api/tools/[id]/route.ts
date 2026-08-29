import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { tools } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { isUniqueViolation } from "@/lib/api/db-errors";
import {
  jsonError,
  jsonValidationError,
  readJsonBody,
  requireNonEmptyPatch,
} from "@/lib/api/http";

import { createToolSchema } from "../schema";

const updateToolSchema = createToolSchema.partial();

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const { id } = await params;
  const db = getDb();
  const tool = await db.query.tools.findFirst({
    where: and(
      eq(tools.id, id),
      eq(tools.organizationId, session.organizationId),
    ),
  });
  if (!tool) return jsonError(404, "Tool not found");

  return NextResponse.json({ tool });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const db = getDb();
  const existing = await db.query.tools.findFirst({
    where: and(
      eq(tools.id, id),
      eq(tools.organizationId, session.organizationId),
    ),
    columns: { id: true },
  });
  if (!existing) return jsonError(404, "Tool not found");

  const parsed = updateToolSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const emptyPatchError = requireNonEmptyPatch(parsed.data);
  if (emptyPatchError) return emptyPatchError;

  try {
    const [tool] = await db
      .update(tools)
      .set(parsed.data)
      .where(eq(tools.id, id))
      .returning();
    return NextResponse.json({ tool });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "A tool with this name already exists");
    }
    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const db = getDb();
  const existing = await db.query.tools.findFirst({
    where: and(
      eq(tools.id, id),
      eq(tools.organizationId, session.organizationId),
    ),
    columns: { id: true },
  });
  if (!existing) return jsonError(404, "Tool not found");

  await db.delete(tools).where(eq(tools.id, id));
  return new NextResponse(null, { status: 204 });
}
