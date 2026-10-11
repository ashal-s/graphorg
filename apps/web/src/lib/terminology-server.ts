import { eq } from "drizzle-orm";
import { cache } from "react";

import { getDb } from "@/db";
import { organizations } from "@/db/schema";

import { resolveTerminology, type Terminology } from "./terminology";

/**
 * The organization's wording for services and tools. `cache` dedupes the
 * lookup when a layout and a page both ask for it in the same request.
 */
export const getTerminology = cache(
  async (organizationId: string): Promise<Terminology> => {
    const row = await getDb().query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
      columns: {
        servicesLabelSingular: true,
        servicesLabelPlural: true,
        servicesDescription: true,
        toolsLabelSingular: true,
        toolsLabelPlural: true,
        toolsDescription: true,
      },
    });
    return resolveTerminology(row);
  },
);
