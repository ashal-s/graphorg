import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  primaryKey,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { departments } from "./departments";
import { people } from "./people";

/**
 * Which departments a person is directly in, apart from the ones their teams
 * are in. A person can be in several, or none; at most one of their rows is
 * the primary department. No `organization_id`: scoped via
 * `department_id`/`person_id`.
 */
export const departmentPeople = pgTable(
  "department_people",
  {
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.departmentId, table.personId] }),
    index("department_people_person_id_idx").on(table.personId),
    uniqueIndex("department_people_one_primary_per_person")
      .on(table.personId)
      .where(sql`${table.isPrimary}`),
  ],
);

export const departmentPeopleRelations = relations(
  departmentPeople,
  ({ one }) => ({
    department: one(departments, {
      fields: [departmentPeople.departmentId],
      references: [departments.id],
    }),
    person: one(people, {
      fields: [departmentPeople.personId],
      references: [people.id],
    }),
  }),
);
