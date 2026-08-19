import { relations } from "drizzle-orm";
import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

import { services } from "./services";
import { technologies } from "./technologies";

/** A service's tech stack: many-to-many between services and technologies. */
export const serviceTechnologies = pgTable(
  "service_technologies",
  {
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    technologyId: uuid("technology_id")
      .notNull()
      .references(() => technologies.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.serviceId, table.technologyId] })],
);

export const serviceTechnologiesRelations = relations(
  serviceTechnologies,
  ({ one }) => ({
    service: one(services, {
      fields: [serviceTechnologies.serviceId],
      references: [services.id],
    }),
    technology: one(technologies, {
      fields: [serviceTechnologies.technologyId],
      references: [technologies.id],
    }),
  }),
);
