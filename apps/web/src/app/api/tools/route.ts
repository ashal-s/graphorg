import { and, eq, ilike } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { tools } from "@/db/schema";
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

import { createToolSchema } from "./schema";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const page = parsePageParams(request.nextUrl.searchParams);
  if (page instanceof NextResponse) return page;

  const q = request.nextUrl.searchParams.get("q");
  const category = request.nextUrl.searchParams.get("category");

  const db = getDb();
  const rows = await db.query.tools.findMany({
    where: and(
      eq(tools.organizationId, session.organizationId),
      q ? ilike(tools.name, `%${q}%`) : undefined,
      category ? eq(tools.category, category) : undefined,
      afterCursorPredicate(tools.name, tools.id, page),
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

  const parsed = createToolSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);

  const db = getDb();
  try {
    const [row] = await db
      .insert(tools)
      .values({ ...parsed.data, organizationId: session.organizationId })
      .returning();
    return NextResponse.json({ tool: row }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "A tool with this name already exists");
    }
    throw error;
  }
}
