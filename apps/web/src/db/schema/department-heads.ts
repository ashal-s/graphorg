import { relations } from "drizzle-orm";
import { index, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

import { departments } from "./departments";
import { people } from "./people";

/**
 * Who heads a department. A department can have several heads, or none, and
 * a head needn't be one of its people. No `organization_id`: scoped via
 * `department_id`/`person_id`, like the other join tables.
 */
export const departmentHeads = pgTable(
  "department_heads",
  {
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.departmentId, table.personId] }),
    index("department_heads_person_id_idx").on(table.personId),
  ],
);

export const departmentHeadsRelations = relations(
  departmentHeads,
  ({ one }) => ({
    department: one(departments, {
      fields: [departmentHeads.departmentId],
      references: [departments.id],
    }),
    person: one(people, {
      fields: [departmentHeads.personId],
      references: [people.id],
    }),
  }),
);
