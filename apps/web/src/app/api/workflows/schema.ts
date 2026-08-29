import { z } from "zod";

const triggerTypeEnum = z.enum([
  "manual",
  "entity_created",
  "entity_updated",
  "scheduled",
]);
const statusEnum = z.enum(["draft", "active", "archived"]);
const stepKindEnum = z.enum(["condition", "action"]);
const personRoleEnum = z.enum(["owner", "creator", "worker"]);

const workflowStepSchema = z.object({
  stepOrder: z.number().int().min(0),
  kind: stepKindEnum,
  type: z.string().trim().min(1).max(100),
  config: z.record(z.unknown()).optional(),
});

const workflowPersonSchema = z.object({
  personId: z.string().uuid(),
  role: personRoleEnum,
});

export const createWorkflowSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000).nullable().optional(),
  triggerType: triggerTypeEnum,
  triggerConfig: z.record(z.unknown()).optional(),
  status: statusEnum.optional(),
  /** Full replacement set for the workflow's ordered steps (workflow_steps). */
  steps: z.array(workflowStepSchema).optional(),
  /**
   * Full replacement set for who's assigned to the workflow
   * (workflow_people); a person may appear more than once with a different
   * role.
   */
  people: z.array(workflowPersonSchema).optional(),
});
