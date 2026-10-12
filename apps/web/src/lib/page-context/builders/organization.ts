import { count, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  documents,
  organizations,
  people,
  services,
  teams,
  tools,
  workflows,
} from "@/db/schema";

import type { PageContext } from "../types";

/** Home: the organization's name and how much of each thing it holds. */
export async function buildOverview(orgId: string): Promise<PageContext> {
  const db = getDb();
  const total = async (
    table: typeof people | typeof teams | typeof services | typeof tools,
  ) => {
    const [row] = await db
      .select({ n: count() })
      .from(table)
      .where(eq(table.organizationId, orgId));
    return row?.n ?? 0;
  };
  const [organization, peopleN, teamsN, servicesN, toolsN, workflowsN, docsN] =
    await Promise.all([
      db.query.organizations.findFirst({
        where: eq(organizations.id, orgId),
        columns: { name: true, description: true },
      }),
      total(people),
      total(teams),
      total(services),
      total(tools),
      db
        .select({ n: count() })
        .from(workflows)
        .where(eq(workflows.organizationId, orgId))
        .then((r) => r[0]?.n ?? 0),
      db
        .select({ n: count() })
        .from(documents)
        .where(eq(documents.organizationId, orgId))
        .then((r) => r[0]?.n ?? 0),
    ]);

  return {
    page: "Overview",
    path: "/",
    data: {
      name: organization?.name,
      description: organization?.description ?? null,
      counts: {
        people: peopleN,
        teams: teamsN,
        services: servicesN,
        tools: toolsN,
        workflows: workflowsN,
        documents: docsN,
      },
    },
  };
}

/** Settings > Organization. Members and sign-in details are never included. */
export async function buildOrganizationSettings(
  orgId: string,
): Promise<PageContext | null> {
  const organization = await getDb().query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { name: true, slug: true, description: true, emailDomain: true },
  });
  if (!organization) return null;

  return {
    page: "Settings: Organization",
    path: "/settings",
    data: organization,
  };
}
