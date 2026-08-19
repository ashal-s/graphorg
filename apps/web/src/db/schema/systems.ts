import { relations } from "drizzle-orm";
import { index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { id, organizationId, timestamps } from "./_columns";
import { organizations } from "./organizations";
import { services } from "./services";
import { teams } from "./teams";

export const systems = pgTable(
  "systems",
  {
    id: id(),
    organizationId: organizationId(),
    ownerTeamId: uuid("owner_team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    ...timestamps(),
  },
  (table) => [
    unique().on(table.organizationId, table.name),
    index("systems_organization_id_idx").on(table.organizationId),
    index("systems_owner_team_id_idx").on(table.ownerTeamId),
  ],
);

export const systemsRelations = relations(systems, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [systems.organizationId],
    references: [organizations.id],
  }),
  ownerTeam: one(teams, {
    fields: [systems.ownerTeamId],
    references: [teams.id],
  }),
  services: many(services),
}));
