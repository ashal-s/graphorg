import { and, eq, ilike } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { isUniqueViolation } from "@/lib/api/db-errors";
import { jsonError, jsonValidationError, readJsonBody } from "@/lib/api/http";
import {
  afterCursorPredicate,
  orderByNameThenId,
  parsePageParams,
  toPage,
} from "@/lib/api/pagination";

import { createTeamSchema } from "./schema";

/**
 * Tenant-scoped, paginated Route Handler for `teams`, the pattern every
 * other WEB-136 entity (people, tools, services) follows: cursor
 * pagination via `parsePageParams`/`toPage` (see src/lib/api/pagination.ts),
 * an optional `q` substring filter on name, and the same auth/tenancy shape
 * WEB-133 established on this exact route (`GET /api/teams`) and WEB-132
 * repeated for the catalog entities.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const page = parsePageParams(request.nextUrl.searchParams);
  if (page instanceof NextResponse) return page;

  const q = request.nextUrl.searchParams.get("q");

  const db = getDb();
  const rows = await db.query.teams.findMany({
    where: and(
      eq(teams.organizationId, session.organizationId),
      q ? ilike(teams.name, `%${q}%`) : undefined,
      afterCursorPredicate(teams.name, teams.id, page),
    ),
    orderBy: (row) => orderByNameThenId(row.name, row.id),
    limit: page.limit + 1,
  });

  return NextResponse.json(toPage(rows, page.limit));
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const parsed = createTeamSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);

  const db = getDb();
  try {
    const [row] = await db
      .insert(teams)
      .values({ ...parsed.data, organizationId: session.organizationId })
      .returning();
    return NextResponse.json({ team: row }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "A team with this name already exists");
    }
    throw error;
  }
}
