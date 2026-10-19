/**
 * Shared workflow trigger / status copy. Workflows are documentation in the
 * MVP — nothing executes — so labels describe the recorded process, not a
 * live automation engine.
 */

export const WORKFLOW_TRIGGER_TYPES = [
  "manual",
  "entity_created",
  "entity_updated",
  "scheduled",
] as const;

export type WorkflowTriggerType = (typeof WORKFLOW_TRIGGER_TYPES)[number];

export const WORKFLOW_STATUSES = ["draft", "active", "archived"] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

/** Short labels for list badges and builder summaries. */
export const WORKFLOW_TRIGGER_LABELS: Record<WorkflowTriggerType, string> = {
  manual: "Manual",
  entity_created: "On entity created",
  entity_updated: "On entity updated",
  scheduled: "Scheduled",
};

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

export const WORKFLOW_STATUS_OPTIONS = WORKFLOW_STATUSES.map((value) => ({
  value,
  label: WORKFLOW_STATUS_LABELS[value],
}));

export const WORKFLOW_STATUS_VARIANT: Record<
  WorkflowStatus,
  "default" | "secondary" | "outline"
> = {
  draft: "outline",
  active: "default",
  archived: "secondary",
};
