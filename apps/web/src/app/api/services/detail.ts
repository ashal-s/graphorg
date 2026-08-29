import { and, eq } from "drizzle-orm";
import type { NextResponse } from "next/server";

import { getDb } from "@/db";
import {
  repositories,
  services,
  systems,
  teams,
  technologies,
} from "@/db/schema";
import { jsonError } from "@/lib/api/http";
import { findMissingInOrg } from "@/lib/api/org-refs";

/** A service with its owner, system, repository, tech stack and direct dependencies resolved. */
export async function fetchServiceDetail(organizationId: string, id: string) {
  const row = await getDb().query.services.findFirst({
    where: and(
      eq(services.id, id),
      eq(services.organizationId, organizationId),
    ),
    with: {
      system: { columns: { id: true, name: true } },
      repository: { columns: { id: true, name: true, url: true } },
      ownerTeam: { columns: { id: true, name: true } },
      technologies: {
        with: {
          technology: { columns: { id: true, name: true, category: true } },
        },
      },
      dependencies: {
        with: { dependsOnService: { columns: { id: true, name: true } } },
      },
    },
  });
  if (!row) return null;

  const {
    technologies: techLinks,
    dependencies: dependencyLinks,
    ...service
  } = row;
  return {
    ...service,
    technologies: techLinks.map((link) => link.technology),
    dependencies: dependencyLinks.map((link) => link.dependsOnService),
  };
}

interface ServiceRefs {
  systemId?: string | null;
  repositoryId?: string | null;
  ownerTeamId?: string | null;
  technologyIds: string[];
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
  if (refs.systemId) {
    const missing = await findMissingInOrg(
      systems.id,
      systems.organizationId,
      organizationId,
      [refs.systemId],
    );
    if (missing.length > 0) {
      return jsonError(
        400,
        "systemId does not reference a system in this organization",
      );
    }
  }

  if (refs.repositoryId) {
    const missing = await findMissingInOrg(
      repositories.id,
      repositories.organizationId,
      organizationId,
      [refs.repositoryId],
    );
    if (missing.length > 0) {
      return jsonError(
        400,
        "repositoryId does not reference a repository in this organization",
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

  if (refs.technologyIds.length > 0) {
    const missing = await findMissingInOrg(
      technologies.id,
      technologies.organizationId,
      organizationId,
      refs.technologyIds,
    );
    if (missing.length > 0) {
      return jsonError(
        400,
        "technologyIds contains an id that does not reference a technology in this organization",
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
