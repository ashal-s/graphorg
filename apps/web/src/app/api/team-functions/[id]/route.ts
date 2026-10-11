import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { teamFunctions } from "@/db/schema";
import { jsonError, requireUuidParam } from "@/lib/api/http";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** People who had this function are left with none (the FK sets it null). */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "admin")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const deleted = await getDb()
    .delete(teamFunctions)
    .where(
      and(
        eq(teamFunctions.id, id),
        eq(teamFunctions.organizationId, session.organizationId),
      ),
    )
    .returning({ id: teamFunctions.id });
  if (deleted.length === 0) return jsonError(404, "Function not found");

  return new NextResponse(null, { status: 204 });
}
