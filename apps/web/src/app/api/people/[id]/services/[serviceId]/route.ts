import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { people, servicePeople, services } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { jsonError, requireUuidParam } from "@/lib/api/http";

interface RouteParams {
  params: Promise<{ id: string; serviceId: string }>;
}

async function loadEnds(
  organizationId: string,
  personId: string,
  serviceId: string,
) {
  const db = getDb();
  const [person, service] = await Promise.all([
    db.query.people.findFirst({
      where: and(
        eq(people.id, personId),
        eq(people.organizationId, organizationId),
      ),
      columns: { id: true },
    }),
    db.query.services.findFirst({
      where: and(
        eq(services.id, serviceId),
        eq(services.organizationId, organizationId),
      ),
      columns: { id: true },
    }),
  ]);
  return { person, service };
}

/** Assigns the person to the service (idempotent). */
export async function PUT(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id, serviceId } = await params;
  const idError =
    requireUuidParam(id) ?? requireUuidParam(serviceId, "serviceId");
  if (idError) return idError;

  const { person, service } = await loadEnds(
    session.organizationId,
    id,
    serviceId,
  );
  if (!person) return jsonError(404, "Person not found");
  if (!service) return jsonError(404, "Service not found");

  await getDb()
    .insert(servicePeople)
    .values({ serviceId, personId: id })
    .onConflictDoNothing();
  return NextResponse.json({ assigned: true });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id, serviceId } = await params;
  const idError =
    requireUuidParam(id) ?? requireUuidParam(serviceId, "serviceId");
  if (idError) return idError;

  const { person, service } = await loadEnds(
    session.organizationId,
    id,
    serviceId,
  );
  if (!person) return jsonError(404, "Person not found");
  if (!service) return jsonError(404, "Service not found");

  await getDb()
    .delete(servicePeople)
    .where(
      and(
        eq(servicePeople.serviceId, serviceId),
        eq(servicePeople.personId, id),
      ),
    );
  return new NextResponse(null, { status: 204 });
}
