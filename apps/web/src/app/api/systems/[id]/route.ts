import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { systems, teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { isUniqueViolation } from "@/lib/api/db-errors";
import { jsonError, jsonValidationError, readJsonBody } from "@/lib/api/http";
import { findMissingInOrg } from "@/lib/api/org-refs";

import { createSystemSchema } from "../schema";

const updateSystemSchema = createSystemSchema.partial();

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const { id } = await params;
  const db = getDb();
  const row = await db.query.systems.findFirst({
    where: and(eq(systems.id, id), eq(systems.organizationId, session.organizationId)),
    with: { ownerTeam: { columns: { id: true, name: true } } },
  });
  if (!row) return jsonError(404, "System not found");

  return NextResponse.json({ system: row });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const db = getDb();
  const existing = await db.query.systems.findFirst({
    where: and(eq(systems.id, id), eq(systems.organizationId, session.organizationId)),
    columns: { id: true },
  });
  if (!existing) return jsonError(404, "System not found");

  const parsed = updateSystemSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);

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
      .update(systems)
      .set(parsed.data)
      .where(eq(systems.id, id))
      .returning();
    return NextResponse.json({ system: row });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "A system with this name already exists");
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
  const existing = await db.query.systems.findFirst({
    where: and(eq(systems.id, id), eq(systems.organizationId, session.organizationId)),
    columns: { id: true },
  });
  if (!existing) return jsonError(404, "System not found");

  await db.delete(systems).where(eq(systems.id, id));
  return new NextResponse(null, { status: 204 });
}
