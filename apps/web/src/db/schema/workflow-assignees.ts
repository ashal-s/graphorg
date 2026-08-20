import { relations } from "drizzle-orm";
import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

import { people } from "./people";
import { workflows } from "./workflows";

/** The "workers" assigned to a workflow: many-to-many between workflows and people. */
export const workflowAssignees = pgTable(
  "workflow_assignees",
  {
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.workflowId, table.personId] })],
);

export const workflowAssigneesRelations = relations(
  workflowAssignees,
  ({ one }) => ({
    workflow: one(workflows, {
      fields: [workflowAssignees.workflowId],
      references: [workflows.id],
    }),
    person: one(people, {
      fields: [workflowAssignees.personId],
      references: [people.id],
    }),
  }),
);
