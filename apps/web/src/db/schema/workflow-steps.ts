import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { id, timestamps } from "./_columns";
import { workflows } from "./workflows";

/**
 * One step in a workflow's ordered chain: a condition (does the workflow
 * continue?) or an action (what happens?). `type` and `config` are
 * deliberately loose (a plain string and jsonb) rather than an enum/wide
 * table, since the fields a given condition or action needs vary a lot by
 * type (e.g. "field equals" needs a field/value, "notify" needs a message).
 * No `organization_id`: scoped indirectly via `workflow_id`, same as
 * `service_technologies`/`service_dependencies` are scoped via `service_id`.
 */
export const workflowSteps = pgTable(
  "workflow_steps",
  {
    id: id(),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    stepOrder: integer("step_order").notNull(),
    kind: text("kind", { enum: ["condition", "action"] }).notNull(),
    type: text("type").notNull(),
    config: jsonb("config").notNull().default({}),
    ...timestamps(),
  },
  (table) => [
    unique().on(table.workflowId, table.stepOrder),
    index("workflow_steps_workflow_id_idx").on(table.workflowId),
    check(
      "workflow_steps_kind_check",
      sql`${table.kind} in ('condition', 'action')`,
    ),
  ],
);

export const workflowStepsRelations = relations(workflowSteps, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowSteps.workflowId],
    references: [workflows.id],
  }),
}));
