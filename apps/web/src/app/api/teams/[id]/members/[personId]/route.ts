import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getDb } from "@/db";
import { people, teamMembers, teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { settlePrimary } from "@/lib/api/primary-links";
import {
  jsonError,
  jsonValidationError,
  readJsonBody,
  requireUuidParam,
} from "@/lib/api/http";

const memberSchema = z.object({
  teamRole: z.enum(["lead", "member", "trainee"]),
});

interface RouteParams {
  params: Promise<{ id: string; personId: string }>;
}

/** Both ends must belong to the caller's organization. */
async function loadEnds(
  organizationId: string,
  teamId: string,
  personId: string,
) {
  const db = getDb();
  const [team, person] = await Promise.all([
    db.query.teams.findFirst({
      where: and(
        eq(teams.id, teamId),
        eq(teams.organizationId, organizationId),
      ),
      columns: { id: true },
    }),
    db.query.people.findFirst({
      where: and(
        eq(people.id, personId),
        eq(people.organizationId, organizationId),
      ),
      columns: { id: true },
    }),
  ]);
  return { team, person };
}

/** Adds the person to the team, or changes their level if already on it. */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id, personId } = await params;
  const idError =
    requireUuidParam(id) ?? requireUuidParam(personId, "personId");
  if (idError) return idError;

  const parsed = memberSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);

  const { team, person } = await loadEnds(session.organizationId, id, personId);
  if (!team) return jsonError(404, "Team not found");
  if (!person) return jsonError(404, "Person not found");

  // The membership and their primary team change together or not at all.
  const membership = await getDb().transaction(async (tx) => {
    const [row] = await tx
      .insert(teamMembers)
      .values({ teamId: id, personId, teamRole: parsed.data.teamRole })
      .onConflictDoUpdate({
        target: [teamMembers.teamId, teamMembers.personId],
        set: { teamRole: parsed.data.teamRole },
      })
      .returning();
    // Their first team becomes their primary one.
    await settlePrimary(tx, "person-teams", personId);
    return row;
  });

  return NextResponse.json({ membership });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id, personId } = await params;
  const idError =
    requireUuidParam(id) ?? requireUuidParam(personId, "personId");
  if (idError) return idError;

  const { team, person } = await loadEnds(session.organizationId, id, personId);
  if (!team) return jsonError(404, "Team not found");
  if (!person) return jsonError(404, "Person not found");

  await getDb().transaction(async (tx) => {
    await tx
      .delete(teamMembers)
      .where(
        and(eq(teamMembers.teamId, id), eq(teamMembers.personId, personId)),
      );
    // If that was their primary team, another one takes over.
    await settlePrimary(tx, "person-teams", personId);
  });
  return new NextResponse(null, { status: 204 });
}
