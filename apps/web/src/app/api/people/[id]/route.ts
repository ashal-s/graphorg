import { and, eq, sql } from "drizzle-orm";
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
  requireUuidParam,
} from "@/lib/api/http";
import {
  CircularManagerError,
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
  const idError = requireUuidParam(id);
  if (idError) return idError;

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
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const db = getDb();
  const existing = await db.query.people.findFirst({
    where: and(
      eq(people.id, id),
      eq(people.organizationId, session.organizationId),
    ),
    columns: { id: true, teamId: true },
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
  }

  const patch: Partial<typeof people.$inferInsert> = {
    ...values,
    teamId,
    managerId,
    userId,
  };
  // Moving to another team (or leaving one) starts over as a plain member,
  // unless the same request sets a level explicitly.
  if (
    teamId !== undefined &&
    teamId !== existing.teamId &&
    values.teamRole === undefined
  ) {
    patch.teamRole = "member";
  }

  try {
    const person = await db.transaction(async (tx) => {
      if (managerId) {
        // Serializes concurrent managerId updates within this
        // organization: without this, two concurrent requests (e.g. "set
        // A's manager to B" and, at the same time, "set B's manager to A")
        // could each load an acyclic snapshot via loadManagerChain, both
        // pass wouldCreateManagerCycle, and commit a cycle between them.
        // pg_advisory_xact_lock blocks until it can acquire the lock and
        // releases it automatically at commit or rollback, so this only
        // serializes other managerId-changing PATCHes on this org, not
        // reads or unrelated field updates.
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${session.organizationId}))`,
        );
        const chain = await loadManagerChain(tx, session.organizationId);
        if (wouldCreateManagerCycle(chain, id, managerId)) {
          throw new CircularManagerError();
        }
      }

      const [row] = await tx
        .update(people)
        .set(patch)
        .where(eq(people.id, id))
        .returning();
      return row;
    });
    return NextResponse.json({ person });
  } catch (error) {
    if (error instanceof CircularManagerError) {
      return jsonError(
        400,
        "managerId would create a circular reporting chain (this person is already this manager's manager, directly or transitively)",
      );
    }
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
  const idError = requireUuidParam(id);
  if (idError) return idError;

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
