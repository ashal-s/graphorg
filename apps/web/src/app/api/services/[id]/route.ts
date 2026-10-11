import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { serviceDependencies, serviceTools, services } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { isUniqueViolation } from "@/lib/api/db-errors";
import {
  jsonError,
  jsonValidationError,
  readJsonBody,
  requireNonEmptyPatch,
  requireUuidParam,
} from "@/lib/api/http";
import {
  findCyclicDependencies,
  loadDependencyGraph,
} from "@/lib/api/service-dependency-graph";
import {
  loadParentMap,
  wouldCreateParentCycle,
} from "@/lib/api/service-hierarchy";

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
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const detail = await fetchServiceDetail(session.organizationId, id);
  if (!detail) return jsonError(404, "Service not found");

  return NextResponse.json({ service: detail });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

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
  const { toolIds, dependsOnServiceIds, ...values } = parsed.data;

  const refError = await validateServiceRefs(session.organizationId, {
    parentId: values.parentId,
    repositoryId: values.repositoryId,
    ownerTeamId: values.ownerTeamId,
    toolIds: toolIds ?? [],
    dependsOnServiceIds: dependsOnServiceIds ?? [],
  });
  if (refError) return refError;

  if (values.parentId) {
    if (values.parentId === id) {
      return jsonError(400, "a service cannot be its own parent");
    }
    const parents = await loadParentMap(session.organizationId);
    if (wouldCreateParentCycle(parents, id, values.parentId)) {
      return jsonError(
        400,
        "parentId would create a loop (the chosen parent already sits under this service)",
      );
    }
  }

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

      if (toolIds) {
        await tx.delete(serviceTools).where(eq(serviceTools.serviceId, id));
        if (toolIds.length > 0) {
          await tx
            .insert(serviceTools)
            .values(toolIds.map((toolId) => ({ serviceId: id, toolId })));
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
  const idError = requireUuidParam(id);
  if (idError) return idError;

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
