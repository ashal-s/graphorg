import { index, pgTable, text, unique } from "drizzle-orm/pg-core";

import { id, organizationId, timestamps } from "./_columns";

/**
 * What someone does on their team (Developer, Designer, Product Owner...),
 * as an organization-managed list. Separate from `people.team_role`, which
 * is how much responsibility they carry (lead, member, trainee): a Product
 * Owner can be a lead, a Developer can be a trainee.
 */
export const teamFunctions = pgTable(
  "team_functions",
  {
    id: id(),
    organizationId: organizationId(),
    name: text("name").notNull(),
    ...timestamps(),
  },
  (table) => [
    unique().on(table.organizationId, table.name),
    index("team_functions_organization_id_idx").on(table.organizationId),
  ],
);

/** What every new organization starts with; admins can add or remove from here. */
export const STARTER_TEAM_FUNCTIONS = [
  "Developer",
  "Designer",
  "Tester",
  "Product Owner",
  "Scrum Master",
  "Engineering Manager",
  "Analyst",
] as const;
