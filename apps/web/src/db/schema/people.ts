import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  index,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { id, organizationId, timestamps } from "./_columns";
import { organizations } from "./organizations";
import { teams } from "./teams";
import { users } from "./users";

/**
 * The org-directory entry for a person. Distinct from `users`: not everyone
 * in the directory has product access, so `userId` is optional.
 */
export const people = pgTable(
  "people",
  {
    id: id(),
    organizationId: organizationId(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "set null" })
      .unique(),
    teamId: uuid("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    managerId: uuid("manager_id").references((): AnyPgColumn => people.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    title: text("title"),
    ...timestamps(),
  },
  (table) => [
    unique().on(table.organizationId, table.email),
    index("people_organization_id_idx").on(table.organizationId),
    index("people_team_id_idx").on(table.teamId),
    index("people_manager_id_idx").on(table.managerId),
  ],
);

export const peopleRelations = relations(people, ({ one }) => ({
  organization: one(organizations, {
    fields: [people.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [people.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [people.teamId],
    references: [teams.id],
  }),
  manager: one(people, {
    fields: [people.managerId],
    references: [people.id],
    relationName: "manager",
  }),
}));
