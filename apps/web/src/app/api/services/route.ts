import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { serviceDependencies, serviceTechnologies, services } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { isUniqueViolation } from "@/lib/api/db-errors";
import { jsonError, jsonValidationError, readJsonBody } from "@/lib/api/http";

import { fetchServiceDetail, validateServiceRefs } from "./detail";
import { createServiceSchema } from "./schema";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const db = getDb();
  const rows = await db.query.services.findMany({
    where: eq(services.organizationId, session.organizationId),
    orderBy: (row, { asc }) => asc(row.name),
  });

  return NextResponse.json({ services: rows });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const parsed = createServiceSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const { technologyIds = [], dependsOnServiceIds = [], ...values } = parsed.data;

  const refError = await validateServiceRefs(session.organizationId, {
    systemId: values.systemId,
    repositoryId: values.repositoryId,
    ownerTeamId: values.ownerTeamId,
    technologyIds,
    dependsOnServiceIds,
  });
  if (refError) return refError;

  // A brand-new service has no incoming edges yet, so depending on other
  // services can never close a cycle back to itself: no cycle check needed
  // here, unlike the update path.
  const db = getDb();
  let insertedId: string;
  try {
    insertedId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(services)
        .values({ ...values, organizationId: session.organizationId })
        .returning({ id: services.id });
      if (!row) throw new Error("Failed to insert service");

      if (technologyIds.length > 0) {
        await tx
          .insert(serviceTechnologies)
          .values(technologyIds.map((technologyId) => ({ serviceId: row.id, technologyId })));
      }
      if (dependsOnServiceIds.length > 0) {
        await tx.insert(serviceDependencies).values(
          dependsOnServiceIds.map((dependsOnServiceId) => ({
            serviceId: row.id,
            dependsOnServiceId,
          })),
        );
      }
      return row.id;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "A service with this name already exists");
    }
    throw error;
  }

  const detail = await fetchServiceDetail(session.organizationId, insertedId);
  return NextResponse.json({ service: detail }, { status: 201 });
}
