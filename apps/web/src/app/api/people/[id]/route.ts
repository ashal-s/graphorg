import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { people, teams, users } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { isUniqueViolation, pgConstraintName } from "@/lib/api/db-errors";
import {
  jsonError,
  jsonValidationError,
  readJsonBody,
  requireNonEmptyPatch,
} from "@/lib/api/http";
import {
  loadManagerChain,
  wouldCreateManagerCycle,
} from "@/lib/api/manager-chain";
import { findMissingInOrg } from "@/lib/api/org-refs";

import { createPersonSchema } from "../schema";

const updatePersonSchema = createPersonSchema.partial();

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const { id } = await params;
  const db = getDb();
  const person = await db.query.people.findFirst({
    where: and(
      eq(people.id, id),
      eq(people.organizationId, session.organizationId),
    ),
    with: {
      team: { columns: { id: true, name: true } },
      manager: { columns: { id: true, name: true } },
    },
  });
  if (!person) return jsonError(404, "Person not found");

  return NextResponse.json({ person });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const db = getDb();
  const existing = await db.query.people.findFirst({
    where: and(
      eq(people.id, id),
      eq(people.organizationId, session.organizationId),
    ),
    columns: { id: true },
  });
  if (!existing) return jsonError(404, "Person not found");

  const parsed = updatePersonSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const emptyPatchError = requireNonEmptyPatch(parsed.data);
  if (emptyPatchError) return emptyPatchError;
  const { teamId, managerId, userId, ...values } = parsed.data;

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

  if (managerId) {
    if (managerId === id) {
      return jsonError(400, "a person cannot manage themselves");
    }
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
    const chain = await loadManagerChain(session.organizationId);
    if (wouldCreateManagerCycle(chain, id, managerId)) {
      return jsonError(
        400,
        "managerId would create a circular reporting chain (this person is already this manager's manager, directly or transitively)",
      );
    }
  }

  const patch = { ...values, teamId, managerId, userId };

  try {
    const [person] = await db
      .update(people)
      .set(patch)
      .where(eq(people.id, id))
      .returning();
    return NextResponse.json({ person });
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

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const db = getDb();
  const existing = await db.query.people.findFirst({
    where: and(
      eq(people.id, id),
      eq(people.organizationId, session.organizationId),
    ),
    columns: { id: true },
  });
  if (!existing) return jsonError(404, "Person not found");

  await db.delete(people).where(eq(people.id, id));
  return new NextResponse(null, { status: 204 });
}
