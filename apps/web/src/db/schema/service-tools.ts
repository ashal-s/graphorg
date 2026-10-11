import { relations } from "drizzle-orm";
import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

import { services } from "./services";
import { tools } from "./tools";

/** The tools a service uses: many-to-many between services and tools. */
export const serviceTools = pgTable(
  "service_tools",
  {
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    toolId: uuid("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.serviceId, table.toolId] })],
);

export const serviceToolsRelations = relations(serviceTools, ({ one }) => ({
  service: one(services, {
    fields: [serviceTools.serviceId],
    references: [services.id],
  }),
  tool: one(tools, {
    fields: [serviceTools.toolId],
    references: [tools.id],
  }),
}));
