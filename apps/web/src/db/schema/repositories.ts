import { relations } from "drizzle-orm";
import { index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { id, organizationId, timestamps } from "./_columns";
import { organizations } from "./organizations";
import { teams } from "./teams";

export const repositories = pgTable(
  "repositories",
  {
    id: id(),
    organizationId: organizationId(),
    ownerTeamId: uuid("owner_team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    url: text("url"),
    ...timestamps(),
  },
  (table) => [
    unique().on(table.organizationId, table.name),
    index("repositories_organization_id_idx").on(table.organizationId),
    index("repositories_owner_team_id_idx").on(table.ownerTeamId),
  ],
);

export const repositoriesRelations = relations(repositories, ({ one }) => ({
  organization: one(organizations, {
    fields: [repositories.organizationId],
    references: [organizations.id],
  }),
  ownerTeam: one(teams, {
    fields: [repositories.ownerTeamId],
    references: [teams.id],
  }),
}));
