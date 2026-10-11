import { and, eq } from "drizzle-orm";
import type { NextResponse } from "next/server";

import { getDb } from "@/db";
import { services, teams, tools } from "@/db/schema";
import { jsonError } from "@/lib/api/http";
import { findMissingInOrg } from "@/lib/api/org-refs";

/** A service with its owner, parent, children, tools and direct dependencies resolved. */
export async function fetchServiceDetail(organizationId: string, id: string) {
  const row = await getDb().query.services.findFirst({
    where: and(
      eq(services.id, id),
      eq(services.organizationId, organizationId),
    ),
    with: {
      parent: { columns: { id: true, name: true } },
      children: { columns: { id: true, name: true } },
      ownerTeam: { columns: { id: true, name: true } },
      tools: {
        with: {
          tool: { columns: { id: true, name: true, category: true } },
        },
      },
      dependencies: {
        with: { dependsOnService: { columns: { id: true, name: true } } },
      },
    },
  });
  if (!row) return null;

  const { tools: toolLinks, dependencies: dependencyLinks, ...service } = row;
  return {
    ...service,
    tools: toolLinks.map((link) => link.tool),
    dependencies: dependencyLinks.map((link) => link.dependsOnService),
  };
}

interface ServiceRefs {
  parentId?: string | null;
  ownerTeamId?: string | null;
  toolIds: string[];
  dependsOnServiceIds: string[];
}

/**
 * Checks every foreign key a service create/update body can carry actually
 * belongs to the caller's own organization. Returns a 400 `NextResponse` for
 * the first invalid reference found, or `null` if every reference is valid.
 */
export async function validateServiceRefs(
  organizationId: string,
  refs: ServiceRefs,
): Promise<NextResponse | null> {
  if (refs.parentId) {
    const missing = await findMissingInOrg(
      services.id,
      services.organizationId,
      organizationId,
      [refs.parentId],
    );
    if (missing.length > 0) {
      return jsonError(
        400,
        "parentId does not reference a service in this organization",
      );
    }
  }

  if (refs.ownerTeamId) {
    const missing = await findMissingInOrg(
      teams.id,
      teams.organizationId,
      organizationId,
      [refs.ownerTeamId],
    );
    if (missing.length > 0) {
      return jsonError(
        400,
        "ownerTeamId does not reference a team in this organization",
      );
    }
  }

  if (refs.toolIds.length > 0) {
    const missing = await findMissingInOrg(
      tools.id,
      tools.organizationId,
      organizationId,
      refs.toolIds,
    );
    if (missing.length > 0) {
      return jsonError(
        400,
        "toolIds contains an id that does not reference a tool in this organization",
      );
    }
  }

  if (refs.dependsOnServiceIds.length > 0) {
    const missing = await findMissingInOrg(
      services.id,
      services.organizationId,
      organizationId,
      refs.dependsOnServiceIds,
    );
    if (missing.length > 0) {
      return jsonError(
        400,
        "dependsOnServiceIds contains an id that does not reference a service in this organization",
      );
    }
  }

  return null;
}
