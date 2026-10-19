import { and, eq, ilike } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { uniqueSlug } from "@/lib/slugs";
import { departments, teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { isUniqueViolation, pgConstraintName } from "@/lib/api/db-errors";
import { jsonError, jsonValidationError, readJsonBody } from "@/lib/api/http";
import {
  afterCursorPredicate,
  orderByNameThenId,
  parsePageParams,
  toPage,
} from "@/lib/api/pagination";

import { findMissingInOrg } from "@/lib/api/org-refs";
import { PrimaryNotLinkedError, replaceLinks } from "@/lib/api/primary-links";

import { createTeamSchema } from "./schema";

/**
 * Tenant-scoped, paginated Route Handler for `teams`: cursor pagination via
 * `parsePageParams`/`toPage` (see src/lib/api/pagination.ts), an optional `q`
 * substring filter on name, and the auth/tenancy shape shared with people,
 * tools, and departments. `GET /api/services` still returns a full list
 * (not cursor-paginated).
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

  const { departmentIds = [], primaryDepartmentId, ...values } = parsed.data;

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

  const db = getDb();
  for (let attempt = 0; ; attempt++) {
    try {
      const row = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(teams)
          .values({
            ...values,
            slug: await uniqueSlug(session.organizationId, values.name, tx),
            organizationId: session.organizationId,
          })
          .returning();
        if (!created) throw new Error("Failed to insert team");
        await replaceLinks(
          tx,
          "team-departments",
          created.id,
          departmentIds,
          primaryDepartmentId,
        );
        return created;
      });
      return NextResponse.json({ team: row }, { status: 201 });
    } catch (error) {
      if (error instanceof PrimaryNotLinkedError) {
        return jsonError(
          400,
          "primaryDepartmentId must be one of departmentIds",
        );
      }
      if (isUniqueViolation(error)) {
        // Someone took the slug between picking and inserting: pick again.
        if (pgConstraintName(error)?.includes("slug") && attempt < 2) continue;
        return jsonError(409, "A team with this name already exists");
      }
      throw error;
    }
  }
}
