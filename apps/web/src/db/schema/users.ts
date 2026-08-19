import { relations, sql } from "drizzle-orm";
import { check, index, pgTable, text, unique } from "drizzle-orm/pg-core";

import { id, organizationId, timestamps } from "./_columns";
import { organizations } from "./organizations";

/**
 * Product accounts. WEB-133 adds Auth.js sessions and enforces `role` on top
 * of this table; this is just the schema and tenant boundary.
 */
export const users = pgTable(
  "users",
  {
    id: id(),
    organizationId: organizationId(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: text("role", { enum: ["owner", "admin", "editor", "viewer"] })
      .notNull()
      .default("viewer"),
    ...timestamps(),
  },
  (table) => [
    unique().on(table.organizationId, table.email),
    index("users_organization_id_idx").on(table.organizationId),
    check(
      "users_role_check",
      sql`${table.role} in ('owner', 'admin', 'editor', 'viewer')`,
    ),
  ],
);

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
}));
