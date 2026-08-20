import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { id, organizationId, timestamps } from "./_columns";
import { organizations } from "./organizations";
import { people } from "./people";
import { workflowAssignees } from "./workflow-assignees";
import { workflowSteps } from "./workflow-steps";

/**
 * A trigger plus an ordered chain of conditions/actions (`workflow_steps`),
 * modeled on Jira's automation rule builder. Building and storing workflows
 * is in scope for the MVP; actually firing a trigger and running its steps
 * is not (see ADR-9 in the GraphOrg Architecture document).
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
    ownerPersonId: uuid("owner_person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    createdByPersonId: uuid("created_by_person_id").references(
      () => people.id,
      { onDelete: "set null" },
    ),
    status: text("status", { enum: ["draft", "active", "archived"] })
      .notNull()
      .default("draft"),
    ...timestamps(),
  },
  (table) => [
    unique().on(table.organizationId, table.name),
    index("workflows_organization_id_idx").on(table.organizationId),
    index("workflows_owner_person_id_idx").on(table.ownerPersonId),
    index("workflows_created_by_person_id_idx").on(table.createdByPersonId),
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
  ownerPerson: one(people, {
    fields: [workflows.ownerPersonId],
    references: [people.id],
    relationName: "ownerPerson",
  }),
  createdByPerson: one(people, {
    fields: [workflows.createdByPersonId],
    references: [people.id],
    relationName: "createdByPerson",
  }),
  steps: many(workflowSteps),
  assignees: many(workflowAssignees),
}));
