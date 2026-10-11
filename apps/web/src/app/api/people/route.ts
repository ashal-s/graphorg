import { and, eq, ilike, or } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getDb } from "@/db";
import { people, teamFunctions, teams, users } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { isUniqueViolation, pgConstraintName } from "@/lib/api/db-errors";
import { jsonError, jsonValidationError, readJsonBody } from "@/lib/api/http";
import { findMissingInOrg } from "@/lib/api/org-refs";
import {
  afterCursorPredicate,
  orderByNameThenId,
  parsePageParams,
  toPage,
} from "@/lib/api/pagination";

import { createPersonSchema } from "./schema";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const page = parsePageParams(request.nextUrl.searchParams);
  if (page instanceof NextResponse) return page;

  const q = request.nextUrl.searchParams.get("q");

  const teamIdRaw = request.nextUrl.searchParams.get("teamId");
  const teamId = teamIdRaw ? z.string().uuid().safeParse(teamIdRaw) : null;
  if (teamId && !teamId.success)
    return jsonError(400, "teamId is not a valid id");

  const managerIdRaw = request.nextUrl.searchParams.get("managerId");
  const managerId = managerIdRaw
    ? z.string().uuid().safeParse(managerIdRaw)
    : null;
  if (managerId && !managerId.success) {
    return jsonError(400, "managerId is not a valid id");
  }

  const db = getDb();
  const rows = await db.query.people.findMany({
    where: and(
      eq(people.organizationId, session.organizationId),
      q
        ? or(ilike(people.name, `%${q}%`), ilike(people.email, `%${q}%`))
        : undefined,
      teamId ? eq(people.teamId, teamId.data) : undefined,
      managerId ? eq(people.managerId, managerId.data) : undefined,
      afterCursorPredicate(people.name, people.id, page),
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

  const parsed = createPersonSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const { teamId, managerId, userId, functionId, ...values } = parsed.data;

  if (functionId) {
    const missing = await findMissingInOrg(
      teamFunctions.id,
      teamFunctions.organizationId,
      session.organizationId,
      [functionId],
    );
    if (missing.length > 0) {
      return jsonError(
        400,
        "functionId does not reference a function in this organization",
      );
    }
  }
  if (teamId) {
    const missing = await findMissingInOrg(
      teams.id,
      teams.organizationId,
      session.organizationId,
      [teamId],
    );
    if (missing.length > 0) {
      return jsonError(
        400,
        "teamId does not reference a team in this organization",
      );
    }
  }
  if (managerId) {
    const missing = await findMissingInOrg(
      people.id,
      people.organizationId,
      session.organizationId,
      [managerId],
    );
    if (missing.length > 0) {
      return jsonError(
        400,
        "managerId does not reference a person in this organization",
      );
    }
  }
  if (userId) {
    const missing = await findMissingInOrg(
      users.id,
      users.organizationId,
      session.organizationId,
      [userId],
    );
    if (missing.length > 0) {
      return jsonError(
        400,
        "userId does not reference a user in this organization",
      );
    }
  }

  const db = getDb();
  try {
    const [row] = await db
      .insert(people)
      .values({
        ...values,
        teamId,
        managerId,
        userId,
        functionId,
        organizationId: session.organizationId,
      })
      .returning();
    return NextResponse.json({ person: row }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const constraint = pgConstraintName(error);
      if (constraint?.includes("user_id")) {
        return jsonError(409, "This user is already linked to another person");
      }
      return jsonError(409, "A person with this email already exists");
    }
    throw error;
  }
}
