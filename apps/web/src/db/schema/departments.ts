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
import { departmentHeads } from "./department-heads";
import { departmentPeople } from "./department-people";
import { departmentTeams } from "./department-teams";
import { organizations } from "./organizations";

/**
 * A department: a group of teams and people that can nest under a parent
 * department. Its teams and people are in `department_teams` and
 * `department_people`, where each can be in several departments. Deleting a
 * department leaves its children as top-level departments (the database
 * clears the link) and drops only the memberships, never the teams or people.
 */
export const departments = pgTable(
  "departments",
  {
    id: id(),
    organizationId: organizationId(),
    parentId: uuid("parent_id").references((): AnyPgColumn => departments.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    ...timestamps(),
  },
  (table) => [
    unique().on(table.organizationId, table.name),
    index("departments_organization_id_idx").on(table.organizationId),
    index("departments_parent_id_idx").on(table.parentId),
  ],
);

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [departments.organizationId],
    references: [organizations.id],
  }),
  parent: one(departments, {
    fields: [departments.parentId],
    references: [departments.id],
    relationName: "parent",
  }),
  children: many(departments, { relationName: "parent" }),
  /** Who heads it: any number of people, none required. */
  heads: many(departmentHeads),
  teams: many(departmentTeams),
  people: many(departmentPeople),
}));
