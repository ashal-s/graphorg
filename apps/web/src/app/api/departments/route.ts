import { and, eq, ilike } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { departments } from "@/db/schema";
import { isUniqueViolation } from "@/lib/api/db-errors";
import { jsonError, jsonValidationError, readJsonBody } from "@/lib/api/http";
import {
  afterCursorPredicate,
  orderByNameThenId,
  parsePageParams,
  toPage,
} from "@/lib/api/pagination";
import { replaceDepartmentMembers } from "@/lib/api/primary-links";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";

import { validateDepartmentRefs } from "./refs";
import { createDepartmentSchema } from "./schema";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const page = parsePageParams(request.nextUrl.searchParams);
  if (page instanceof NextResponse) return page;
  const q = request.nextUrl.searchParams.get("q");

  const rows = await getDb().query.departments.findMany({
    where: and(
      eq(departments.organizationId, session.organizationId),
      q ? ilike(departments.name, `%${q}%`) : undefined,
      afterCursorPredicate(departments.name, departments.id, page),
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

  const parsed = createDepartmentSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const { teamIds = [], personIds = [], ...values } = parsed.data;

  const refsError = await validateDepartmentRefs(session.organizationId, {
    ...values,
    teamIds,
    personIds,
  });
  if (refsError) return refsError;

  try {
    const row = await getDb().transaction(async (tx) => {
      const [created] = await tx
        .insert(departments)
        .values({ ...values, organizationId: session.organizationId })
        .returning();
      if (!created) throw new Error("Failed to insert department");
      await replaceDepartmentMembers(
        tx,
        "team-departments",
        created.id,
        teamIds,
      );
      await replaceDepartmentMembers(
        tx,
        "person-departments",
        created.id,
        personIds,
      );
      return created;
    });
    return NextResponse.json({ department: row }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "A department with this name already exists");
    }
    throw error;
  }
}
