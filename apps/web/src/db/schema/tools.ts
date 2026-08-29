import { relations, sql } from "drizzle-orm";
import { check, index, pgTable, text, unique } from "drizzle-orm/pg-core";

import { id, organizationId, timestamps } from "./_columns";
import { organizations } from "./organizations";

export const tools = pgTable(
  "tools",
  {
    id: id(),
    organizationId: organizationId(),
    name: text("name").notNull(),
    category: text("category", {
      enum: [
        "source_control",
        "ci_cd",
        "issue_tracking",
        "documentation",
        "feature_flags",
        "cloud",
        "observability",
        "other",
      ],
    })
      .notNull()
      .default("other"),
    vendor: text("vendor"),
    url: text("url"),
    ...timestamps(),
  },
  (table) => [
    unique().on(table.organizationId, table.name),
    index("tools_organization_id_idx").on(table.organizationId),
    check(
      "tools_category_check",
      sql`${table.category} in ('source_control', 'ci_cd', 'issue_tracking', 'documentation', 'feature_flags', 'cloud', 'observability', 'other')`,
    ),
  ],
);

export const toolsRelations = relations(tools, ({ one }) => ({
  organization: one(organizations, {
    fields: [tools.organizationId],
    references: [organizations.id],
  }),
}));
