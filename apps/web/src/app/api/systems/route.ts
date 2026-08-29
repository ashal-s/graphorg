import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { systems, teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { isUniqueViolation } from "@/lib/api/db-errors";
import { jsonError, jsonValidationError, readJsonBody } from "@/lib/api/http";
import { findMissingInOrg } from "@/lib/api/org-refs";

import { createSystemSchema } from "./schema";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const db = getDb();
  const rows = await db.query.systems.findMany({
    where: eq(systems.organizationId, session.organizationId),
    with: { ownerTeam: { columns: { id: true, name: true } } },
    orderBy: (row, { asc }) => asc(row.name),
  });

  return NextResponse.json({ systems: rows });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const parsed = createSystemSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const { ownerTeamId, ...values } = parsed.data;

  if (ownerTeamId) {
    const missing = await findMissingInOrg(
      teams.id,
      teams.organizationId,
      session.organizationId,
      [ownerTeamId],
    );
    if (missing.length > 0) {
      return jsonError(
        400,
        "ownerTeamId does not reference a team in this organization",
      );
    }
  }

  const db = getDb();
  try {
    const [row] = await db
      .insert(systems)
      .values({ ...values, ownerTeamId, organizationId: session.organizationId })
      .returning();
    return NextResponse.json({ system: row }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "A system with this name already exists");
    }
    throw error;
  }
}
