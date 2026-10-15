import { relations, sql } from "drizzle-orm";
import { check, index, pgTable, text, unique } from "drizzle-orm/pg-core";

import { id, organizationId, timestamps } from "./_columns";
import { organizations } from "./organizations";

/**
 * Product accounts. `(organization_id, email)` is the natural key: the same
 * email can exist in more than one organization as separate rows (each with
 * its own password), the same way the same person could have separate
 * accounts on separate Slack workspaces, there's no single cross-org
 * identity. Auth.js (WEB-133) authenticates against `password_hash` with a
 * Credentials provider and issues a JWT carrying this row's id, role and
 * organization_id.
 */
export const users = pgTable(
  "users",
  {
    id: id(),
    organizationId: organizationId(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["owner", "admin", "editor", "viewer"] })
      .notNull()
      .default("viewer"),
    ...timestamps(),
  },
  (table) => [
    unique().on(table.organizationId, table.email),
    index("users_organization_id_idx").on(table.organizationId),
    // Email-only sign-in looks up every account for an address (see
    // resolveLoginWorkspaces); the composite unique key does not help that path.
    index("users_email_idx").on(table.email),
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
