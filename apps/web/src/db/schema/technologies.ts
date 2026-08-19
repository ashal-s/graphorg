import { relations, sql } from "drizzle-orm";
import { check, index, pgTable, text, unique } from "drizzle-orm/pg-core";

import { id, organizationId, timestamps } from "./_columns";
import { organizations } from "./organizations";

export const technologies = pgTable(
  "technologies",
  {
    id: id(),
    organizationId: organizationId(),
    name: text("name").notNull(),
    category: text("category", {
      enum: ["language", "framework", "database", "infrastructure", "other"],
    })
      .notNull()
      .default("other"),
    description: text("description"),
    ...timestamps(),
  },
  (table) => [
    unique().on(table.organizationId, table.name),
    index("technologies_organization_id_idx").on(table.organizationId),
    check(
      "technologies_category_check",
      sql`${table.category} in ('language', 'framework', 'database', 'infrastructure', 'other')`,
    ),
  ],
);

export const technologiesRelations = relations(technologies, ({ one }) => ({
  organization: one(organizations, {
    fields: [technologies.organizationId],
    references: [organizations.id],
  }),
}));
