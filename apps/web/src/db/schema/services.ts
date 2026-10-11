import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { id, organizationId, timestamps } from "./_columns";
import { organizations } from "./organizations";
import { serviceDependencies } from "./service-dependencies";
import { servicePeople } from "./service-people";
import { serviceTools } from "./service-tools";
import { teams } from "./teams";

/**
 * What the organization delivers or runs. A service can sit under a parent
 * service (`parent_id`), so a "system" is just a service that has children.
 */
export const services = pgTable(
  "services",
  {
    id: id(),
    organizationId: organizationId(),
    parentId: uuid("parent_id").references((): AnyPgColumn => services.id, {
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
    index("services_parent_id_idx").on(table.parentId),
    index("services_owner_team_id_idx").on(table.ownerTeamId),
  ],
);

export const servicesRelations = relations(services, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [services.organizationId],
    references: [organizations.id],
  }),
  parent: one(services, {
    fields: [services.parentId],
    references: [services.id],
    relationName: "parent",
  }),
  children: many(services, { relationName: "parent" }),
  ownerTeam: one(teams, {
    fields: [services.ownerTeamId],
    references: [teams.id],
  }),
  tools: many(serviceTools),
  /** People assigned directly, in addition to the owner team. */
  assignees: many(servicePeople),
  dependencies: many(serviceDependencies, { relationName: "service" }),
  dependents: many(serviceDependencies, { relationName: "dependsOnService" }),
}));
