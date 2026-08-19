import { relations, sql } from "drizzle-orm";
import { check, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

import { services } from "./services";

/** Direct service-to-service dependencies: self-referential many-to-many. */
export const serviceDependencies = pgTable(
  "service_dependencies",
  {
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    dependsOnServiceId: uuid("depends_on_service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.serviceId, table.dependsOnServiceId] }),
    check(
      "service_dependencies_no_self_reference",
      sql`${table.serviceId} <> ${table.dependsOnServiceId}`,
    ),
  ],
);

export const serviceDependenciesRelations = relations(
  serviceDependencies,
  ({ one }) => ({
    service: one(services, {
      fields: [serviceDependencies.serviceId],
      references: [services.id],
      relationName: "service",
    }),
    dependsOnService: one(services, {
      fields: [serviceDependencies.dependsOnServiceId],
      references: [services.id],
      relationName: "dependsOnService",
    }),
  }),
);
