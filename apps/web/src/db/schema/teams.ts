import { relations } from "drizzle-orm";
import { index, pgTable, text, unique } from "drizzle-orm/pg-core";

import { id, organizationId, timestamps } from "./_columns";
import { organizations } from "./organizations";
import { departmentTeams } from "./department-teams";
import { teamMembers } from "./team-members";

export const teams = pgTable(
  "teams",
  {
    id: id(),
    organizationId: organizationId(),
    name: text("name").notNull(),
    /** The address of the team page: `/<slug>`. Unique among people and teams. */
    slug: text("slug").notNull(),
    description: text("description"),
    ...timestamps(),
  },
  (table) => [
    unique().on(table.organizationId, table.name),
    unique().on(table.organizationId, table.slug),
    index("teams_organization_id_idx").on(table.organizationId),
  ],
);

export const teamsRelations = relations(teams, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [teams.organizationId],
    references: [organizations.id],
  }),
  memberships: many(teamMembers),
  /** The departments this team is in (a team can be in several, or none). */
  departmentLinks: many(departmentTeams),
}));
