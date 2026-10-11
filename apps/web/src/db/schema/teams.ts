import { relations } from "drizzle-orm";
import { index, pgTable, text, unique } from "drizzle-orm/pg-core";

import { id, organizationId, timestamps } from "./_columns";
import { organizations } from "./organizations";
import { teamMembers } from "./team-members";

export const teams = pgTable(
  "teams",
  {
    id: id(),
    organizationId: organizationId(),
    name: text("name").notNull(),
    description: text("description"),
    ...timestamps(),
  },
  (table) => [
    unique().on(table.organizationId, table.name),
    index("teams_organization_id_idx").on(table.organizationId),
  ],
);

export const teamsRelations = relations(teams, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [teams.organizationId],
    references: [organizations.id],
  }),
  memberships: many(teamMembers),
}));
