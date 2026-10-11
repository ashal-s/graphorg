import { relations } from "drizzle-orm";
import { index, pgTable, text, unique } from "drizzle-orm/pg-core";

import { id, organizationId, timestamps } from "./_columns";
import { organizations } from "./organizations";

/**
 * What the organization uses to do its work: software, platforms, equipment.
 * `category` is free text so each organization can group tools its own way.
 */
export const tools = pgTable(
  "tools",
  {
    id: id(),
    organizationId: organizationId(),
    name: text("name").notNull(),
    category: text("category").notNull().default("other"),
    description: text("description"),
    vendor: text("vendor"),
    url: text("url"),
    ...timestamps(),
  },
  (table) => [
    unique().on(table.organizationId, table.name),
    index("tools_organization_id_idx").on(table.organizationId),
  ],
);

export const toolsRelations = relations(tools, ({ one }) => ({
  organization: one(organizations, {
    fields: [tools.organizationId],
    references: [organizations.id],
  }),
}));
