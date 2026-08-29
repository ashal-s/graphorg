import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  unique,
} from "drizzle-orm/pg-core";

import { id, organizationId, timestamps } from "./_columns";
import { organizations } from "./organizations";
import { workflowPeople } from "./workflow-people";
import { workflowSteps } from "./workflow-steps";

/**
 * A trigger plus an ordered chain of conditions/actions (`workflow_steps`),
 * modeled on Jira's automation rule builder. This is a documentation record
 * of what a workflow is and who's responsible for it, not an execution
 * engine: nothing in the MVP fires a trigger or runs a step. Who owns,
 * created, and works a workflow is `workflow_people`, not columns here,
 * since any of those roles can have more than one person.
 */
export const workflows = pgTable(
  "workflows",
  {
    id: id(),
    organizationId: organizationId(),
    name: text("name").notNull(),
    description: text("description"),
    triggerType: text("trigger_type", {
      enum: ["manual", "entity_created", "entity_updated", "scheduled"],
    }).notNull(),
    triggerConfig: jsonb("trigger_config").notNull().default({}),
    status: text("status", { enum: ["draft", "active", "archived"] })
      .notNull()
      .default("draft"),
    ...timestamps(),
  },
  (table) => [
    unique().on(table.organizationId, table.name),
    index("workflows_organization_id_idx").on(table.organizationId),
    check(
      "workflows_trigger_type_check",
      sql`${table.triggerType} in ('manual', 'entity_created', 'entity_updated', 'scheduled')`,
    ),
    check(
      "workflows_status_check",
      sql`${table.status} in ('draft', 'active', 'archived')`,
    ),
  ],
);

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [workflows.organizationId],
    references: [organizations.id],
  }),
  steps: many(workflowSteps),
  people: many(workflowPeople),
}));
