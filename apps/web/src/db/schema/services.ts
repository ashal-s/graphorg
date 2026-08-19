import { relations } from "drizzle-orm";
import { index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { id, organizationId, timestamps } from "./_columns";
import { organizations } from "./organizations";
import { repositories } from "./repositories";
import { serviceDependencies } from "./service-dependencies";
import { serviceTechnologies } from "./service-technologies";
import { systems } from "./systems";
import { teams } from "./teams";

export const services = pgTable(
  "services",
  {
    id: id(),
    organizationId: organizationId(),
    systemId: uuid("system_id").references(() => systems.id, {
      onDelete: "set null",
    }),
    repositoryId: uuid("repository_id").references(() => repositories.id, {
      onDelete: "set null",
    }),
    ownerTeamId: uuid("owner_team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    ...timestamps(),
  },
  (table) => [
    unique().on(table.organizationId, table.name),
    index("services_organization_id_idx").on(table.organizationId),
    index("services_system_id_idx").on(table.systemId),
    index("services_repository_id_idx").on(table.repositoryId),
    index("services_owner_team_id_idx").on(table.ownerTeamId),
  ],
);

export const servicesRelations = relations(services, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [services.organizationId],
    references: [organizations.id],
  }),
  system: one(systems, {
    fields: [services.systemId],
    references: [systems.id],
  }),
  repository: one(repositories, {
    fields: [services.repositoryId],
    references: [repositories.id],
  }),
  ownerTeam: one(teams, {
    fields: [services.ownerTeamId],
    references: [teams.id],
  }),
  technologies: many(serviceTechnologies),
  dependencies: many(serviceDependencies, { relationName: "service" }),
  dependents: many(serviceDependencies, { relationName: "dependsOnService" }),
}));
