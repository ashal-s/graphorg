"use client";

export interface WorkflowStepDraft {
  /** Client-only React key; never sent to the API. */
  key: string;
  /**
   * step_order is intentionally non-unique in this schema (ties and gaps
   * are valid, documented input, not legacy noise), so it's preserved as
   * loaded rather than re-derived from array position on every save. Only
   * `moveStep` below changes it, by swapping it between the two moved slots.
   */
  stepOrder: number;
  kind: "condition" | "action";
  type: string;
  /**
   * Raw JSON text for the step's `config` object, edited as-is rather than
   * through a fixed set of fields: `config`'s shape varies by `type` (a
   * condition might need `field`/`days`, an action might need
   * `channel`/`message`), and a UI that only understood one shape would
   * silently drop whatever else was already there on every save.
   */
  configText: string;
}

export const TYPE_SUGGESTIONS: Record<"condition" | "action", string[]> = {
  condition: [
    "field_equals",
    "field_not_equals",
    "status_is",
    "entity_type_is",
  ],
  action: ["notify", "assign_owner", "create_task", "update_field"],
};

export function updateStep(
  steps: WorkflowStepDraft[],
  index: number,
  patch: Partial<WorkflowStepDraft>,
): WorkflowStepDraft[] {
  return steps.map((step, i) => (i === index ? { ...step, ...patch } : step));
}

export function removeStep(
  steps: WorkflowStepDraft[],
  index: number,
): WorkflowStepDraft[] {
  return steps.filter((_, i) => i !== index);
}

export function moveStep(
  steps: WorkflowStepDraft[],
  index: number,
  direction: -1 | 1,
): WorkflowStepDraft[] {
  const target = index + direction;
  if (target < 0 || target >= steps.length) return steps;
  const a = steps[index]!;
  const b = steps[target]!;
  // Swaps content between the two positions while each position keeps its
  // own stepOrder: this is the one edit allowed to change stepOrder, and
  // only for the two steps actually being moved, not a renumbering of the
  // whole list. For two tied steps (equal stepOrder), this still moves
  // them locally but is a no-op on save, since there's no order between
  // ties to persist in the first place.
  const next = [...steps];
  next[index] = { ...b, stepOrder: a.stepOrder, key: a.key };
  next[target] = { ...a, stepOrder: b.stepOrder, key: b.key };
  return next;
}

export function addStep(
  steps: WorkflowStepDraft[],
  kind: "condition" | "action",
  atIndex?: number,
): WorkflowStepDraft[] {
  const maxOrder = steps.reduce(
    (max, step) => Math.max(max, step.stepOrder),
    -1,
  );
  const step: WorkflowStepDraft = {
    key: crypto.randomUUID(),
    stepOrder: maxOrder + 1,
    kind,
    type: "",
    configText: "{}",
  };
  if (atIndex === undefined || atIndex >= steps.length) {
    return [...steps, step];
  }
  const next = [...steps];
  next.splice(atIndex, 0, step);
  return next;
}
