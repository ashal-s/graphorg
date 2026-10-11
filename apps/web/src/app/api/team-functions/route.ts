import { asc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { teamFunctions } from "@/db/schema";
import { isUniqueViolation } from "@/lib/api/db-errors";
import { jsonError, jsonValidationError, readJsonBody } from "@/lib/api/http";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";

import { createTeamFunctionSchema } from "./schema";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const rows = await getDb()
    .select({ id: teamFunctions.id, name: teamFunctions.name })
    .from(teamFunctions)
    .where(eq(teamFunctions.organizationId, session.organizationId))
    .orderBy(asc(teamFunctions.name));

  return NextResponse.json({ functions: rows });
}

/** Admin-only: the function list is shared by every team in the workspace. */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "admin")) return jsonError(403, "Forbidden");

  const parsed = createTeamFunctionSchema.safeParse(
    await readJsonBody(request),
  );
  if (!parsed.success) return jsonValidationError(parsed.error);

  try {
    const [row] = await getDb()
      .insert(teamFunctions)
      .values({
        name: parsed.data.name,
        organizationId: session.organizationId,
      })
      .returning({ id: teamFunctions.id, name: teamFunctions.name });
    return NextResponse.json({ function: row }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "A function with this name already exists");
    }
    throw error;
  }
}
