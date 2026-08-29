import { and, eq, ilike } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { technologies } from "@/db/schema";
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

import { createTechnologySchema, technologyCategorySchema } from "./schema";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const page = parsePageParams(request.nextUrl.searchParams);
  if (page instanceof NextResponse) return page;

  const q = request.nextUrl.searchParams.get("q");
  const categoryRaw = request.nextUrl.searchParams.get("category");
  const category = categoryRaw
    ? technologyCategorySchema.safeParse(categoryRaw)
    : null;
  if (category && !category.success) {
    return jsonError(400, "category is not a valid technology category");
  }

  const db = getDb();
  const rows = await db.query.technologies.findMany({
    where: and(
      eq(technologies.organizationId, session.organizationId),
      q ? ilike(technologies.name, `%${q}%`) : undefined,
      category ? eq(technologies.category, category.data) : undefined,
      afterCursorPredicate(technologies.name, technologies.id, page),
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

  const parsed = createTechnologySchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);

  const db = getDb();
  try {
    const [row] = await db
      .insert(technologies)
      .values({ ...parsed.data, organizationId: session.organizationId })
      .returning();
    return NextResponse.json({ technology: row }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "A technology with this name already exists");
    }
    throw error;
  }
}
