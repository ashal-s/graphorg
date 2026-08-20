import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { people } from "./people";
import { workflows } from "./workflows";

/**
 * A person's role on a workflow: `owner` (accountable for it), `creator`
 * (who made it), or `worker` (assigned to carry it out or be notified by
 * it). One table for all three, rather than three near-identical join
 * tables, since a workflow can have more than one owner, more than one
 * creator, and more than one worker, and one person can hold more than one
 * role on the same workflow (e.g. its creator is also an owner).
 */
export const workflowPeople = pgTable(
  "workflow_people",
  {
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "creator", "worker"] }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workflowId, table.personId, table.role] }),
    index("workflow_people_person_id_idx").on(table.personId),
    check(
      "workflow_people_role_check",
      sql`${table.role} in ('owner', 'creator', 'worker')`,
    ),
  ],
);

export const workflowPeopleRelations = relations(workflowPeople, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowPeople.workflowId],
    references: [workflows.id],
  }),
  person: one(people, {
    fields: [workflowPeople.personId],
    references: [people.id],
  }),
}));
