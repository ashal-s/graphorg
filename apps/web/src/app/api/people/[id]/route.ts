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
import { setPersonTeams } from "@/lib/api/team-membership";

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
      memberships: {
        columns: { teamRole: true },
        with: { team: { columns: { id: true, name: true } } },
      },
      manager: { columns: { id: true, name: true } },
    },
  });
  if (!person) return jsonError(404, "Person not found");

  const { memberships, ...rest } = person;
  return NextResponse.json({
    person: {
      ...rest,
      teams: memberships
        .map((m) => ({ ...m.team, teamRole: m.teamRole }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    },
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  // Editing someone's profile details is an owner/admin action; editors can
  // still manage team membership via the team endpoints.
  if (!hasRole(session.role, "admin")) return jsonError(403, "Forbidden");

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

  const parsed = updatePersonSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const emptyPatchError = requireNonEmptyPatch(parsed.data);
  if (emptyPatchError) return emptyPatchError;
  const { teamIds, managerId, userId, ...values } = parsed.data;

  if (teamIds && teamIds.length > 0) {
    const missing = await findMissingInOrg(
      teams.id,
      teams.organizationId,
      session.organizationId,
      teamIds,
    );
    if (missing.length > 0) {
      return jsonError(
        400,
        "teamIds contains an id that does not reference a team in this organization",
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
    managerId,
    userId,
  };
  if (values.photoUrl !== undefined) patch.photoUrl = values.photoUrl || null;
  // `set()` rejects an empty object, so drop keys the request didn't send.
  for (const key of Object.keys(patch) as Array<keyof typeof patch>) {
    if (patch[key] === undefined) delete patch[key];
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

      const [row] =
        Object.keys(patch).length > 0
          ? await tx
              .update(people)
              .set(patch)
              .where(eq(people.id, id))
              .returning()
          : await tx.select().from(people).where(eq(people.id, id));

      if (teamIds) await setPersonTeams(tx, id, teamIds);
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
