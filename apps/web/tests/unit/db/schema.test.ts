import { getTableConfig } from "drizzle-orm/pg-core";

import * as schema from "@/db/schema";

/**
 * Structural checks only: table/column names, and that every FK we expect
 * exists. No database connection. Constraint *behavior* (uniqueness, checks,
 * cascades, the updated_at trigger) is verified against a real Postgres
 * instance manually, documented in the WEB-130 Linear comment; a live-DB
 * integration suite is WEB-135's job (it owns test database isolation).
 */

const expectedTables: Record<
  string,
  ReturnType<typeof getTableConfig>["name"]
> = {
  organizations: "organizations",
  users: "users",
  teams: "teams",
  people: "people",
  technologies: "technologies",
  tools: "tools",
  systems: "systems",
  repositories: "repositories",
  services: "services",
  serviceTechnologies: "service_technologies",
  serviceDependencies: "service_dependencies",
  documents: "documents",
};

describe("schema", () => {
  it.each(Object.entries(expectedTables))(
    "exports %s mapped to the %s table",
    (exportName, expectedTableName) => {
      const table = schema[exportName as keyof typeof schema];
      expect(table).toBeDefined();
      expect(getTableConfig(table as never).name).toBe(expectedTableName);
    },
  );

  it("gives every tenant-scoped table an organization_id foreign key to organizations", () => {
    const tenantTables = [
      "users",
      "teams",
      "people",
      "technologies",
      "tools",
      "systems",
      "repositories",
      "services",
      "documents",
    ] as const;

    for (const tableName of tenantTables) {
      const { columns } = getTableConfig(schema[tableName]);
      const organizationIdColumn = columns.find(
        (c) => c.name === "organization_id",
      );
      expect(organizationIdColumn).toBeDefined();
      expect(organizationIdColumn?.notNull).toBe(true);
    }
  });

  it("prevents a service from depending on itself at the schema level", () => {
    const { checks } = getTableConfig(schema.serviceDependencies);
    expect(
      checks.some((c) => c.name === "service_dependencies_no_self_reference"),
    ).toBe(true);
  });
});
