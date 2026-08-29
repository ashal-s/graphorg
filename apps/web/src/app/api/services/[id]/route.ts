import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import {
  serviceDependencies,
  serviceTechnologies,
  services,
} from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { isUniqueViolation } from "@/lib/api/db-errors";
import {
  jsonError,
  jsonValidationError,
  readJsonBody,
  requireNonEmptyPatch,
} from "@/lib/api/http";
import {
  findCyclicDependencies,
  loadDependencyGraph,
} from "@/lib/api/service-dependency-graph";

import { fetchServiceDetail, validateServiceRefs } from "../detail";
import { createServiceSchema } from "../schema";

const updateServiceSchema = createServiceSchema.partial();

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const { id } = await params;
  const detail = await fetchServiceDetail(session.organizationId, id);
  if (!detail) return jsonError(404, "Service not found");

  return NextResponse.json({ service: detail });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const db = getDb();
  const existing = await db.query.services.findFirst({
    where: and(
      eq(services.id, id),
      eq(services.organizationId, session.organizationId),
    ),
    columns: { id: true },
  });
  if (!existing) return jsonError(404, "Service not found");

  const parsed = updateServiceSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const emptyPatchError = requireNonEmptyPatch(parsed.data);
  if (emptyPatchError) return emptyPatchError;
  const { technologyIds, dependsOnServiceIds, ...values } = parsed.data;

  const refError = await validateServiceRefs(session.organizationId, {
    systemId: values.systemId,
    repositoryId: values.repositoryId,
    ownerTeamId: values.ownerTeamId,
    technologyIds: technologyIds ?? [],
    dependsOnServiceIds: dependsOnServiceIds ?? [],
  });
  if (refError) return refError;

  if (dependsOnServiceIds) {
    if (dependsOnServiceIds.includes(id)) {
      return jsonError(400, "a service cannot depend on itself");
    }
    const graph = await loadDependencyGraph(session.organizationId, id);
    const cyclic = findCyclicDependencies(graph, id, dependsOnServiceIds);
    if (cyclic.length > 0) {
      return jsonError(
        400,
        `dependsOnServiceIds would create a circular dependency (already depends on this service, directly or transitively): ${cyclic.join(", ")}`,
      );
    }
  }

  try {
    await db.transaction(async (tx) => {
      if (Object.keys(values).length > 0) {
        await tx.update(services).set(values).where(eq(services.id, id));
      }

      if (technologyIds) {
        await tx
          .delete(serviceTechnologies)
          .where(eq(serviceTechnologies.serviceId, id));
        if (technologyIds.length > 0) {
          await tx.insert(serviceTechnologies).values(
            technologyIds.map((technologyId) => ({
              serviceId: id,
              technologyId,
            })),
          );
        }
      }

      if (dependsOnServiceIds) {
        await tx
          .delete(serviceDependencies)
          .where(eq(serviceDependencies.serviceId, id));
        if (dependsOnServiceIds.length > 0) {
          await tx.insert(serviceDependencies).values(
            dependsOnServiceIds.map((dependsOnServiceId) => ({
              serviceId: id,
              dependsOnServiceId,
            })),
          );
        }
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "A service with this name already exists");
    }
    throw error;
  }

  const detail = await fetchServiceDetail(session.organizationId, id);
  return NextResponse.json({ service: detail });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const db = getDb();
  const existing = await db.query.services.findFirst({
    where: and(
      eq(services.id, id),
      eq(services.organizationId, session.organizationId),
    ),
    columns: { id: true },
  });
  if (!existing) return jsonError(404, "Service not found");

  await db.delete(services).where(eq(services.id, id));
  return new NextResponse(null, { status: 204 });
}
